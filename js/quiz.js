/**
 * js/quiz.js — Category & Level Assessment Engine
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Runs the GRADED assessment that now sits at the end of
 *            every category ("End-of-category assessment"). Three
 *            interactive rounds:
 *              1. Multiple Choice   — read a description, pick the sign
 *              2. Identification    — see the sign, pick its name
 *              3. Camera Check      — OPTIONAL live motion/gesture
 *                                      detection (MediaPipe), including
 *                                      a sign-ordering/fingerspelling
 *                                      challenge for phrase-type signs
 *                                      (REV 4 PHASE 6, see below). Never
 *                                      counted toward pass/fail —
 *                                      webcam accuracy has real limits,
 *                                      so this is bonus practice only.
 *            Passing threshold: 80% across rounds 1+2 combined.
 *
 * CONNECTS : pages/quiz.html
 *            js/data.js            (window.LWData — signs/categories)
 *            js/engine/progress.js (window.LWProgress — record + locks)
 *            js/camera/*, js/tracking/mediapipe.js, js/engine/classifier.js,
 *            js/engine/renderer.js, js/engine/dictionary.js (round 3 only)
 *
 * URL PARAMS:
 *   ?level=basic&category=alphabet   → category assessment
 *   ?level=basic&final=1             → level-final assessment. LEGACY
 *                                        as of REV 4 PHASE 6 — the
 *                                        route/scoring still work (see
 *                                        buildScope()/finishAssessment()
 *                                        below, both untouched), but
 *                                        nothing links to it anymore.
 *                                        See the block comment above
 *                                        buildActionButtons() for why.
 *
 * ══════════════════════════════════════════════════════════════════
 * REV 4 PIVOT — PHASE 6 (js/quiz.js assessment format changes)
 * ══════════════════════════════════════════════════════════════════
 * Per PIVOT_CHECKLIST.md Phase 6 / SYSTEM_ARCHITECTURE.md's matching
 * section:
 *  1. Lightweight non-blocking mini-checks after each sign/cluster —
 *     implemented in js/lesson.js (this file is the GRADED assessment,
 *     out of scope for that item) — see lesson.js's Phase 6 header.
 *  2. NEW — sign-ordering/fingerspelling-challenge question type for
 *     phrase-type signs (any SIGNS entry with a `sequence` array —
 *     today that's Unit 6 / category:'sequence_demo', see data.js).
 *     The existing optional camera round now detects each component
 *     of the sequence in order (reusing the exact phraseSteps/
 *     phraseStepIdx pattern js/lesson.js already uses for graded
 *     per-sign phrase assessment — see getCameraPhraseSequence() and
 *     the cameraPhraseSteps branch inside startCameraLoop()'s loop()
 *     below) instead of a single atomic classifyMotion/classifyGesture
 *     call, which would never have matched a phrase signId in the
 *     first place (phrase ids like 'CAR_SPELL' have no
 *     SIGN_DICTIONARY entry of their own — only their components do).
 *  3. Confirmed optional/bonus: the ordering challenge lives INSIDE
 *     the existing optional camera round and writes only into
 *     `cameraRoundData` (same object the plain atomic-sign path
 *     already used) — computeGradedScore() only ever sums the MC +
 *     Identification `rounds`, never `cameraRoundData`, so this can't
 *     affect pass/fail no matter what happens in it. See
 *     finishAssessment() below.
 *  4. Level Final Assessment — DECIDED (see the block comment above
 *     buildActionButtons()): the CTA into it is retired, the
 *     mechanism itself is not.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

import { startCamera, stopCamera }                         from '../js/camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady }        from '../js/tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }                        from '../js/engine/renderer.js';
import { getDetectionType }                                 from '../js/engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer,
         loadModels, getMotionModelError,
         getAllowedLabelsForSign }                          from '../js/engine/classifier.js';

/* ── URL params / scope ─────────────────────────────────────────── */
const params    = new URLSearchParams(window.location.search);
const level     = params.get('level') || 'basic';
const isFinal   = params.get('final') === '1';
const categoryId = params.get('category') || null;

const MAX_PER_ROUND  = 5;
const PASS_THRESHOLD = window.LWProgress?.PASS_THRESHOLD ?? 0.80;

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ── DOM refs ───────────────────────────────────────────────────── */
const titleEl        = document.getElementById('assessment-title');
const subtitleEl     = document.getElementById('assessment-subtitle');
const roundBadgeEl   = document.getElementById('round-badge');
const progressFillEl = document.getElementById('quiz-progress');
const qCounterEl     = document.getElementById('q-counter');

const questionCardEl = document.getElementById('question-card');
const qPromptEl      = document.getElementById('q-prompt');
const qImageWrapEl   = document.getElementById('q-image-wrap');
const qImageEl       = document.getElementById('q-image');
const qImageFallbackEl = document.getElementById('q-image-fallback');
const qOptionsEl     = document.getElementById('q-options');
const qFeedbackEl    = document.getElementById('q-feedback');

const gateCardEl     = document.getElementById('camera-gate-card');
const gateScoreSoFarEl = document.getElementById('gate-score-so-far');

const cameraCardEl   = document.getElementById('camera-round-card');
const videoEl        = document.getElementById('quiz-webcam');
const canvasEl       = document.getElementById('quiz-canvas');
const ctx            = canvasEl?.getContext('2d');
const cameraStatusEl = document.getElementById('quiz-camera-status');
const cameraPromptEl = document.getElementById('quiz-camera-prompt');
const cameraFeedbackEl = document.getElementById('quiz-camera-feedback');
const cameraScoreEl  = document.getElementById('quiz-camera-score');

const resultsCardEl  = document.getElementById('results-card');
const resultsScoreEl = document.getElementById('results-score');
const resultsTitleEl = document.getElementById('results-title');
const resultsMsgEl   = document.getElementById('results-message');
const resultsBreakdownEl = document.getElementById('results-breakdown');
const resultsActionsEl   = document.getElementById('results-actions');

/* ── Helpers ────────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function allSignIdsPool() {
  return Array.from(new Set((window.LWData?.SIGNS ?? []).map(s => s.signId)));
}
function buildDistractors(correct, count) {
  const pool = allSignIdsPool().filter(s => s !== correct);
  return sample(pool, count);
}
function truncate(str, n) { return str && str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str; }
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Build assessment scope ────────────────────────────────────── */
function buildScope() {
  if (isFinal) {
    const live  = window.LWProgress?.liveCategoriesFor?.(level) ?? [];
    const signs = [];
    live.forEach(c => window.LWData.getCategorySigns(level, c.id).forEach(s => {
      if (!signs.includes(s)) signs.push(s);
    }));
    return {
      signs, categories: live,
      title: `${cap(level)} Level — Final Assessment`,
      subtitle: `Covers every category in the ${cap(level)} level`,
    };
  }
  const cat   = window.LWData?.getCategory?.(level, categoryId) ?? null;
  const signs = window.LWData?.getCategorySigns?.(level, categoryId) ?? [];
  return {
    signs, categories: cat ? [cat] : [],
    title: `${cat?.title ?? categoryId} — Category Assessment`,
    subtitle: `${cap(level)} Level · ${cat?.title ?? categoryId}`,
  };
}

const scope = buildScope();

/* ── Question builders ─────────────────────────────────────────── */
function buildMCRound(signs) {
  return sample(signs, Math.min(MAX_PER_ROUND, signs.length)).map(signId => {
    const data   = window.LWData.getSign(level, signId);
    const desc   = data?.description ? truncate(data.description, 150) : `the sign "${signId}"`;
    const options = shuffle([signId, ...buildDistractors(signId, 3)]);
    return {
      type: 'mc', signId, options,
      prompt: `Which sign matches this description?\n"${desc}"`,
      imageUrl: null,
    };
  });
}

function buildIdRound(signs) {
  return sample(signs, Math.min(MAX_PER_ROUND, signs.length)).map(signId => {
    const data    = window.LWData.getSign(level, signId);
    const options = shuffle([signId, ...buildDistractors(signId, 3)]);
    return {
      type: 'id', signId, options,
      prompt: 'Which sign is shown here?',
      imageUrl: data?.imageUrl ?? null,
      fallbackText: data?.tips?.[0] ?? `Recall the sign for "${signId}" from its lesson.`,
    };
  });
}

function buildPhotoMCRound(signs) {
  return sample(signs, Math.min(MAX_PER_ROUND, signs.length)).map(signId => {
    const options = shuffle([signId, ...buildDistractors(signId, 3)]);
    return {
      type: 'photoMc', signId, options,
      prompt: `Which shows the sign for "${signId}"?`,
      imageUrl: null, // no prompt image — each OPTION has its own image
    };
  });
}

/* ── Runner state ───────────────────────────────────────────────── */
const rounds = [
  { key: 'multipleChoice', label: 'Multiple Choice', questions: [] },
  { key: 'identification',  label: 'Identification',  questions: [] },
  { key: 'photoMultipleChoice', label: 'Photo Multiple Choice', questions: [] },
];
let roundIdx = 0;
let qIdx     = 0;
const roundResults = {}; // key -> {correct, total}
let answered = false;

let cameraRoundData = { attempted: false, correct: 0, total: 0, skipped: true };
let rafId = null, cameraPromptTimer = null, cameraGetReadyTimer = null;
let cameraCooldown = false, debounceCount = 0;

function totalQuestions() { return rounds.reduce((n, r) => n + r.questions.length, 0); }
function questionsAnsweredSoFar() {
  let n = 0;
  for (let i = 0; i < roundIdx; i++) n += rounds[i].questions.length;
  return n + qIdx;
}

// Design pass, 2026-08-23 (later, seventh session) — see
// PIVOT_CHECKLIST.md's "Design pass" item, css/quiz.css's matching
// comment, and pages/quiz.html's #question-card. Mirrors js/learn.js's
// showLearnUnavailable()/js/lesson.js's showSidebarUnavailable(): a
// real "couldn't load" state, distinct from showEmptyState() below
// (which means something different — a genuinely untrained/comingSoon
// category, not a load failure). Narrower than either of those two
// functions on purpose, same reasoning as their own comments: this
// only guards window.LWData (the one hard dependency buildScope() has
// no fallback for) and an unexpected throw inside boot() itself —
// window.LWProgress calls reached from THIS path (PASS_THRESHOLD,
// liveCategoriesFor()) already degrade via `?.`. The later,
// results-only window.LWProgress calls inside buildActionButtons()
// (LEVEL_ORDER, getOrderedLiveCategories()) do NOT have the same `?.`
// guard, but those only run after a completed, passed assessment —
// well outside this design pass's boot-time scope. Flagged, not fixed
// here.
function showQuizUnavailable(reason) {
  console.error('[quiz.js] cannot render — window.LWData unavailable or a render call threw. Reason:', reason);
  if (questionCardEl) {
    questionCardEl.innerHTML = `<div class="alert alert--error quiz-fallback-alert">` +
      `We couldn't load this assessment right now. ` +
      `<a href="learn.html?level=${encodeURIComponent(level)}">Back to Lessons</a>, or reload this page to try again.` +
      `</div>`;
  }
  if (gateCardEl)   gateCardEl.style.display   = 'none';
  if (cameraCardEl) cameraCardEl.style.display = 'none';
}

function boot() {
  // Design pass, 2026-08-23 (later, seventh session): previously no
  // guard at all — a missing window.LWData silently produced
  // scope.signs === [] (buildScope()'s optional chaining) and fell
  // into showEmptyState() below with a misleading "no trained content"
  // message. Same failure mode + same fix as js/learn.js's/
  // js/lesson.js's matching guards this design pass ported here.
  if (!window.LWData) {
    showQuizUnavailable('window.LWData did not load');
    return;
  }

  // Design pass, 2026-08-23 (later, seventh session): belt-and-
  // suspenders try/catch, same reasoning as js/learn.js's own around
  // its boot(). Nothing inside is expected to throw (the guard above
  // already covers the one case that would make buildMCRound/
  // buildIdRound/showQuestion fail at once), but an unexpected data
  // shape shouldn't leave the learner stuck on a blank/stale "Loading…"
  // card with nothing but a silent console error.
  try {
    if (titleEl)    titleEl.textContent    = scope.title;
    if (subtitleEl) subtitleEl.textContent = scope.subtitle;

    if (scope.signs.length === 0) {
      showEmptyState();
      return;
    }

    rounds[0].questions = buildMCRound(scope.signs);
    rounds[1].questions = buildIdRound(scope.signs);
    rounds[2].questions = buildPhotoMCRound(scope.signs);
    showQuestion();
  } catch (e) {
    console.error('[quiz.js] rendering failed partway through:', e);
    showQuizUnavailable('render threw: ' + (e && e.message));
  }
}

function showEmptyState() {
  if (questionCardEl) {
    questionCardEl.innerHTML = `
      <p class="quiz-question__prompt">This ${isFinal ? 'level' : 'category'} doesn't have trained sign
      content yet — check back once more lessons are added.</p>
      <a href="learn.html?level=${level}" class="btn btn--secondary btn--full mt-4">← Back to Lessons</a>
    `;
  }
}

// BUGFIX (found this session, design pass — not part of the design pass
// itself): this used to be
//   document.addEventListener('DOMContentLoaded', boot);
//   if (document.readyState !== 'loading') boot();
// which — unlike js/lesson.js's already-fixed "BUG 3" version of this
// exact idiom — calls boot() TWICE in the common case. A `type="module"`
// script (this file) runs after the document is parsed but before
// DOMContentLoaded fires, so `document.readyState` is normally
// `'interactive'`, not `'loading'`, by the time this line runs: the
// `if` on the second line fires immediately, AND the listener registered
// on the first line still fires again moments later when DOMContentLoaded
// actually happens. In practice this silently rebuilt both rounds and
// re-rendered the first question a second time (a fresh shuffle,
// harmless-looking) — invisible unless a learner somehow answers inside
// that first instant, but a real double-execution of everything boot()
// does, including now showQuizUnavailable()'s console.error firing twice
// on a genuine load failure. Switched to the same mutually-exclusive
// if/else js/lesson.js already uses.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ── Rendering a question (shared by MC + Identification) ───────── */
function showQuestion() {
  if (roundIdx >= rounds.length) {
    showCameraGate();
    return;
  }
  const round = rounds[roundIdx];
  if (qIdx >= round.questions.length) {
    roundIdx++;
    qIdx = 0;
    showQuestion();
    return;
  }

  answered = false;
  const q = round.questions[qIdx];

  if (roundBadgeEl) roundBadgeEl.textContent = `Round ${roundIdx + 1} of ${rounds.length}: ${round.label}`;
  if (qCounterEl)   qCounterEl.textContent   = `${questionsAnsweredSoFar() + 1} / ${totalQuestions()}`;
  if (progressFillEl) {
    const pct = Math.round((questionsAnsweredSoFar() / Math.max(1, totalQuestions())) * 100);
    progressFillEl.dataset.progress = pct;
    progressFillEl.style.width = `${pct}%`;
  }

  if (qPromptEl) qPromptEl.textContent = q.prompt;
  if (qFeedbackEl) { qFeedbackEl.style.display = 'none'; qFeedbackEl.textContent = ''; }

  if (q.type === 'id' && q.imageUrl) {
    if (qImageWrapEl) qImageWrapEl.style.display = '';
    if (qImageEl) {
      qImageEl.src = q.imageUrl;
      qImageEl.style.display = '';
      qImageEl.onerror = () => {
        qImageEl.style.display = 'none';
        if (qImageFallbackEl) {
          qImageFallbackEl.style.display = '';
          qImageFallbackEl.textContent = q.fallbackText;
        }
      };
    }
    if (qImageFallbackEl) qImageFallbackEl.style.display = 'none';
  } else if (q.type === 'id') {
    if (qImageWrapEl) qImageWrapEl.style.display = '';
    if (qImageEl) qImageEl.style.display = 'none';
    if (qImageFallbackEl) { qImageFallbackEl.style.display = ''; qImageFallbackEl.textContent = q.fallbackText; }
  } else {
    if (qImageWrapEl) qImageWrapEl.style.display = 'none';
  }

  if (qOptionsEl) {
    if (q.type === 'photoMc') {
      qOptionsEl.innerHTML = q.options.map(opt => {
        const imgUrl = window.LWData?.getSign?.(level, opt)?.imageUrl ?? null;
        // TODO: swap in real per-sign photos — falls back to a
        // labeled placeholder box when missing or broken.
        return `
          <button class="quiz-option quiz-option--photo" data-option="${escapeHtml(opt)}">
            ${imgUrl ? `<img class="quiz-option__img" src="${imgUrl}" alt="${escapeHtml(opt)}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
            <div class="quiz-option__img-placeholder" style="display:${imgUrl ? 'none' : 'flex'};">📷 ${escapeHtml(opt)}</div>
            <span class="quiz-option__label">${escapeHtml(opt)}</span>
          </button>`;
      }).join('');
    } else {
      qOptionsEl.innerHTML = q.options.map(opt => `
        <button class="quiz-option" data-option="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
      `).join('');
    }
    qOptionsEl.querySelectorAll('.quiz-option').forEach(btn => {
      btn.onclick = () => selectAnswer(btn, q);
    });
  }
}

function selectAnswer(btn, q) {
  if (answered) return;
  answered = true;

  const round = rounds[roundIdx];
  roundResults[round.key] = roundResults[round.key] || { correct: 0, total: 0 };
  roundResults[round.key].total++;

  const correct = btn.dataset.option === q.signId;
  if (correct) roundResults[round.key].correct++;

  qOptionsEl.querySelectorAll('.quiz-option').forEach(b => {
    b.disabled = true;
    if (b.dataset.option === q.signId) b.classList.add('quiz-option--correct');
    else if (b === btn) b.classList.add('quiz-option--wrong');
  });

  if (qFeedbackEl) {
    qFeedbackEl.style.display = '';
    qFeedbackEl.textContent = correct ? '✅ Correct!' : `❌ Not quite — it was "${q.signId}".`;
    qFeedbackEl.className = `quiz-feedback quiz-feedback--${correct ? 'success' : 'error'}`;
  }

  setTimeout(() => { qIdx++; showQuestion(); }, 1100);
}

/* ── Camera round gate (optional) ────────────────────────────────── */
// CONFIRMED — REV 4 PHASE 6, PIVOT_CHECKLIST.md Phase 6 item 3:
// computeGradedScore() below only ever sums `rounds` (Multiple Choice
// + Identification) — it never reads `cameraRoundData`. The new
// sign-ordering/fingerspelling-challenge phrase branch in
// startCameraLoop() only ever writes into `cameraRoundData`, the same
// object the plain atomic-sign camera path already used. So the new
// question type is structurally incapable of affecting pass/fail,
// same as the existing Camera Check — both stay optional/bonus.
function computeGradedScore() {
  let correct = 0, total = 0;
  rounds.forEach(r => {
    const res = roundResults[r.key] ?? { correct: 0, total: 0 };
    correct += res.correct;
    total   += res.total;
  });
  return total > 0 ? correct / total : 0;
}

function showCameraGate() {
  if (questionCardEl) questionCardEl.style.display = 'none';
  if (roundBadgeEl)   roundBadgeEl.textContent = 'Optional Round: Camera Check';
  if (gateCardEl) {
    gateCardEl.style.display = '';
    if (gateScoreSoFarEl) {
      gateScoreSoFarEl.textContent = `${Math.round(computeGradedScore() * 100)}%`;
    }
    // NEW — REV 4 PHASE 6: surface the ordering-challenge note only
    // when this category actually has a phrase-type sign in scope.
    const orderingNoteEl = document.getElementById('gate-ordering-note');
    if (orderingNoteEl) {
      const hasPhraseItems = scope.signs.some(s => getCameraPhraseSequence(s) !== null);
      orderingNoteEl.style.display = hasPhraseItems ? '' : 'none';
    }
  }
}

window.startCameraRound = function () {
  if (gateCardEl) gateCardEl.style.display = 'none';
  if (cameraCardEl) cameraCardEl.style.display = '';
  runCameraRound();
};

window.skipCameraRound = function () {
  cameraRoundData = { attempted: false, correct: 0, total: 0, skipped: true };
  if (gateCardEl) gateCardEl.style.display = 'none';
  finishAssessment();
};

/* ── Camera round (optional, ungraded toward pass/fail) ──────────── */
let cameraSignQueue = [], cameraQIdx = 0, cameraScore = 0;

// NEW — REV 4 PHASE 6: sign-ordering/fingerspelling-challenge state.
// Mirrors js/lesson.js's phraseSteps/phraseStepIdx (see that file's
// block comment near phraseSteps for the original mechanism this was
// ported from) — same idea, reused here for this optional bonus round
// instead of a graded per-sign assessment.
let cameraPhraseSteps   = null;
let cameraPhraseStepIdx = 0;

/**
 * Returns a phrase's component signId sequence for the camera round's
 * CURRENT queue item, or null if it's a plain atomic sign. Same
 * lookup js/lesson.js's getPhraseSequence() does (data.js's
 * SIGNS.sequence field) — not imported from there since lesson.js's
 * version also special-cases the Unit 2 name drill, which is
 * irrelevant here (the name drill has no CATEGORIES entry and is
 * never reachable through quiz.js's buildScope()).
 */
function getCameraPhraseSequence(signId) {
  const data = window.LWData?.getSign?.(level, signId);
  return (data && Array.isArray(data.sequence) && data.sequence.length > 0) ? data.sequence : null;
}

async function runCameraRound() {
  cameraRoundData = { attempted: true, correct: 0, total: 0, skipped: false };
  cameraSignQueue = sample(scope.signs, Math.min(6, scope.signs.length));
  cameraQIdx = 0;
  cameraScore = 0;
  cameraPhraseSteps   = null;
  cameraPhraseStepIdx = 0;

  if (cameraStatusEl) { cameraStatusEl.style.display = 'flex'; cameraStatusEl.textContent = '⏳ Starting camera…'; }

  try {
    await initMediaPipe();
    await startCamera(videoEl, canvasEl);
    await loadModels().catch(() => {}); // classifier issues are non-fatal here
  } catch (err) {
    console.warn('[quiz.js] Camera round unavailable:', err);
    if (cameraStatusEl) { cameraStatusEl.style.display = 'flex'; cameraStatusEl.textContent = '⚠️ Camera unavailable — skipping this optional round.'; }
    setTimeout(() => finishAssessment(), 1500);
    return;
  }

  if (cameraStatusEl) cameraStatusEl.style.display = 'none';
  startCameraLoop();
  nextCameraPrompt();
}

function startCameraLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!videoEl || videoEl.readyState < 2) return;

    const { leftHandLandmarks, rightHandLandmarks, faceLandmarks, anyHandPresent } = processFrame(videoEl);
    const hands = [leftHandLandmarks, rightHandLandmarks].filter(Boolean);
    if (hands.length > 0) drawSkeleton(ctx, hands, canvasEl.width, canvasEl.height);
    else clearCanvas(ctx, canvasEl.width, canvasEl.height);

    if (!anyHandPresent || cameraCooldown || cameraQIdx >= cameraSignQueue.length) return;

    const currentSign = cameraSignQueue[cameraQIdx];

    // NEW — REV 4 PHASE 6: sign-ordering/fingerspelling-challenge
    // branch. currentSign is a phrase (e.g. Unit 6's 'CAR_SPELL') —
    // check against the CURRENT STEP's expected component instead of
    // a single atomic detection. Same per-step mechanics as
    // js/lesson.js's handleAssessmentFrame() phrase branch (strict:
    // any wrong step ends THIS item's attempt immediately), reused
    // here for this optional bonus round — see that file for the
    // pattern this was ported from.
    if (cameraPhraseSteps) {
      const expectedStep  = cameraPhraseSteps[cameraPhraseStepIdx];
      const stepIsMotion   = getDetectionType(expectedStep) === 'motion';
      const allowedLabels = getAllowedLabelsForSign(expectedStep);
      const result = stepIsMotion
        ? classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks, allowedLabels)
        : classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks, allowedLabels);

      if (!result.matched || !result.label) return;
      if (!stepIsMotion) {
        debounceCount++;
        if (debounceCount < 25) return;
      }
      debounceCount = 0;

      if (result.label !== expectedStep) {
        // Wrong step — ends this queue item's attempt (counts as one
        // miss toward the bonus tally, same as a wrong atomic-sign
        // guess would) but never blocks the quiz — moves straight on
        // to the next item exactly like the plain path below does.
        cameraCooldown = true;
        clearTimeout(cameraPromptTimer);
        resetMotionBuffer();
        cameraPhraseSteps = null;
        cameraRoundData.total++;
        if (cameraFeedbackEl) {
          cameraFeedbackEl.textContent = `❌ Detected "${result.label}" — expected "${expectedStep}" (step ${cameraPhraseStepIdx + 1}/${cameraPhraseSteps?.length ?? '?'})`;
          cameraFeedbackEl.className   = 'assessment-feedback assessment-feedback--error';
          cameraFeedbackEl.style.display = '';
        }
        if (cameraScoreEl) cameraScoreEl.textContent = `Bonus score: ${cameraScore} / ${cameraSignQueue.length}`;
        setTimeout(() => { cameraQIdx++; nextCameraPrompt(); }, 2000);
        return;
      }

      resetMotionBuffer();
      if (cameraPhraseStepIdx < cameraPhraseSteps.length - 1) {
        // Step correct, more steps to go — brief pause, then arm the
        // next step (same short-pause spirit as lesson.js's
        // PHRASE_STEP_DELAY).
        cameraCooldown = true;
        cameraPhraseStepIdx++;
        const nextStep = cameraPhraseSteps[cameraPhraseStepIdx];
        if (cameraPromptEl) {
          cameraPromptEl.textContent = `Sign in order: ${cameraPhraseSteps.join(' → ')}  (step ${cameraPhraseStepIdx + 1}/${cameraPhraseSteps.length}: "${nextStep}")`;
        }
        if (cameraFeedbackEl) {
          cameraFeedbackEl.textContent = `✅ Got it — next: "${nextStep}"`;
          cameraFeedbackEl.className   = 'assessment-feedback assessment-feedback--success';
          cameraFeedbackEl.style.display = '';
        }
        setTimeout(() => { cameraCooldown = false; }, 700);
        return;
      }

      // Final step correct — whole phrase succeeded.
      cameraCooldown = true;
      clearTimeout(cameraPromptTimer);
      cameraPhraseSteps = null;
      cameraScore++;
      cameraRoundData.total++;
      cameraRoundData.correct++;
      if (cameraFeedbackEl) {
        cameraFeedbackEl.textContent = `✅ Correct order! (${result.confidence}%)`;
        cameraFeedbackEl.className   = 'assessment-feedback assessment-feedback--success';
        cameraFeedbackEl.style.display = '';
      }
      if (cameraScoreEl) cameraScoreEl.textContent = `Bonus score: ${cameraScore} / ${cameraSignQueue.length}`;
      setTimeout(() => { cameraQIdx++; nextCameraPrompt(); }, 2000);
      return;
    }

    // ── existing atomic-sign logic, unchanged below ──
    const isMotion = getDetectionType(currentSign) === 'motion';
    // NEW: scope candidates to currentSign's category (e.g. 'numbers')
    // so a correctly-signed '6' can't lose to 'W' on the raw argmax —
    // see classifier.js's getAllowedLabelsForSign(). Fixes a real
    // scoring bug: without this, a correct '6' could get marked wrong
    // here (line below: result.label === currentSign) purely because
    // 6 and W are visually identical handshapes.
    const allowedLabels = getAllowedLabelsForSign(currentSign);
    const result = isMotion
      ? classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks, allowedLabels)
      : classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks, allowedLabels);

    if (!result.matched || !result.label) return;

    if (!isMotion) {
      debounceCount++;
      if (debounceCount < 25) return;
    }
    debounceCount = 0;

    cameraCooldown = true;
    clearTimeout(cameraPromptTimer);
    resetMotionBuffer();

    cameraRoundData.total++;
    if (result.label === currentSign) {
      cameraScore++;
      cameraRoundData.correct++;
      if (cameraFeedbackEl) { cameraFeedbackEl.textContent = `✅ Correct! (${result.confidence}%)`; cameraFeedbackEl.className = 'assessment-feedback assessment-feedback--success'; cameraFeedbackEl.style.display=''; }
    } else {
      if (cameraFeedbackEl) { cameraFeedbackEl.textContent = `❌ Detected ${result.label} — expected ${currentSign}`; cameraFeedbackEl.className = 'assessment-feedback assessment-feedback--error'; cameraFeedbackEl.style.display=''; }
    }
    if (cameraScoreEl) cameraScoreEl.textContent = `Bonus score: ${cameraScore} / ${cameraSignQueue.length}`;

    setTimeout(() => { cameraQIdx++; nextCameraPrompt(); }, 2000);
  }
  loop();
}

function nextCameraPrompt() {
  if (cameraQIdx >= cameraSignQueue.length) {
    endCameraRound();
    return;
  }
  const currentSign = cameraSignQueue[cameraQIdx];
  debounceCount = 0;
  cameraCooldown = true;
  resetMotionBuffer();
  // NEW — REV 4 PHASE 6: reset/detect phrase state for THIS queue item
  // before setting up its prompt, so a completed (or abandoned, on
  // timeout) phrase from a previous item never bleeds into the next.
  cameraPhraseSteps   = getCameraPhraseSequence(currentSign);
  cameraPhraseStepIdx = 0;
  if (cameraFeedbackEl) cameraFeedbackEl.style.display = 'none';
  if (cameraScoreEl) cameraScoreEl.textContent = `Bonus score: ${cameraScore} / ${cameraSignQueue.length}`;

  clearTimeout(cameraGetReadyTimer);
  if (cameraPromptEl) cameraPromptEl.textContent = 'Get ready…';

  cameraGetReadyTimer = setTimeout(() => {
    cameraCooldown = false;
    if (cameraPromptEl) {
      cameraPromptEl.textContent = cameraPhraseSteps
        ? `Sign in order: ${cameraPhraseSteps.join(' → ')}  (step 1/${cameraPhraseSteps.length}: "${cameraPhraseSteps[0]}")`
        : `Try signing: "${currentSign}"`;
    }
    cameraPromptTimer = setTimeout(() => {
      cameraRoundData.total++;
      cameraPhraseSteps = null;
      setTimeout(() => { cameraQIdx++; nextCameraPrompt(); }, 1500);
    }, 12000);
  }, 1200);
}

function endCameraRound() {
  cancelAnimationFrame(rafId);
  stopCamera(videoEl);
  clearTimeout(cameraPromptTimer);
  clearTimeout(cameraGetReadyTimer);
  if (cameraCardEl) cameraCardEl.style.display = 'none';
  finishAssessment();
}

window.addEventListener('beforeunload', () => { if (rafId) cancelAnimationFrame(rafId); stopCamera(videoEl); });

// BUGFIX (PIVOT_CHECKLIST.md Phase C) — js/lesson.js already stops the
// camera when the tab is backgrounded (visibilitychange → document.hidden);
// quiz.js only had the beforeunload handler above, so tabbing away mid
// camera-round assessment left the webcam indicator light on until the
// learner came back or left the page entirely. Mirrors lesson.js's handler
// exactly (see that file's own `document.addEventListener('visibilitychange', ...)`
// near its shutdown()). stopCamera() is a safe no-op when no stream is
// active (checks videoElement.srcObject internally — see cameraUtils.js),
// so this doesn't need to check whether the camera round is actually
// running before calling it.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera(videoEl);
});

/* ── Finish + results ─────────────────────────────────────────────── */
function finishAssessment() {
  const score  = computeGradedScore();
  const passed = score >= PASS_THRESHOLD;

  const breakdown = {
    multipleChoice: roundResults.multipleChoice ?? { correct: 0, total: 0 },
    identification: roundResults.identification ?? { correct: 0, total: 0 },
    photoMultipleChoice: roundResults.photoMultipleChoice ?? { correct: 0, total: 0 },
    motion: cameraRoundData,
  };

  let record;
  if (isFinal) {
    record = window.LWProgress?.recordLevelAssessment?.(level, { score, passed, breakdown });
  } else {
    record = window.LWProgress?.recordCategoryAssessment?.(level, categoryId, { score, passed, breakdown });
  }

  renderResults(score, passed, breakdown, record);
}

function renderResults(score, passed, breakdown) {
  if (questionCardEl) questionCardEl.style.display = 'none';
  if (gateCardEl) gateCardEl.style.display = 'none';
  if (cameraCardEl) cameraCardEl.style.display = 'none';
  if (resultsCardEl) resultsCardEl.style.display = '';

  if (resultsScoreEl) resultsScoreEl.textContent = `${Math.round(score * 100)}%`;
  if (resultsTitleEl) resultsTitleEl.textContent = passed ? '🎉 Assessment Passed!' : 'Not quite — review & retry';
  if (resultsMsgEl) {
    resultsMsgEl.textContent = passed
      ? `You scored ${Math.round(score * 100)}% (need 80%). Your progress has been saved.`
      : `You scored ${Math.round(score * 100)}%. You need 80% to pass. Review the lesson and try again.`;
  }

  if (resultsBreakdownEl) {
    const mcPct    = breakdown.multipleChoice.total ? Math.round(100 * breakdown.multipleChoice.correct / breakdown.multipleChoice.total) : 0;
    const idPct    = breakdown.identification.total ? Math.round(100 * breakdown.identification.correct / breakdown.identification.total) : 0;
    const photoPct = breakdown.photoMultipleChoice.total ? Math.round(100 * breakdown.photoMultipleChoice.correct / breakdown.photoMultipleChoice.total) : 0; // ← new
    const motionLine = breakdown.motion.skipped
      ? '<li>🎥 Camera check — skipped (optional)</li>'
      : `<li>🎥 Camera check (bonus, not counted) — ${breakdown.motion.correct} / ${breakdown.motion.total}</li>`;
    resultsBreakdownEl.innerHTML = `
      <li>📝 Multiple choice — ${breakdown.multipleChoice.correct} / ${breakdown.multipleChoice.total} (${mcPct}%)</li>
      <li>🔎 Identification — ${breakdown.identification.correct} / ${breakdown.identification.total} (${idPct}%)</li>
      <li>🖼️ Photo Multiple Choice — ${breakdown.photoMultipleChoice.correct} / ${breakdown.photoMultipleChoice.total} (${photoPct}%)</li>
      ${motionLine}
    `;
  }

  if (resultsActionsEl) resultsActionsEl.innerHTML = buildActionButtons(passed);
}

// ══════════════════════════════════════════════════════════════════
// REV 4 PHASE 6 — LEVEL FINAL ASSESSMENT: DECIDED
// ══════════════════════════════════════════════════════════════════
// This was flagged as an open question since Phase 3 ("whether 'level
// final' still makes sense once the trail is one continuous path is a
// call for [Phase 6], not Phase 3") and made more visible by Phase 4
// ("learn.js's trail no longer has any UI entry point into a
// level-final assessment... This phase needs to actually decide: keep
// level-finals as-is (and maybe add a trail entry point back),
// redesign as a trail-wide review, or retire the concept.")
//
// DECISION: retire the CTA, keep the mechanism. Concretely:
//   - buildActionButtons() below no longer offers "🏁 Take Level Final
//     Assessment" after a category pass (that was the one remaining
//     entry point into it anywhere in the app).
//   - Nothing else was touched: `isFinal`/buildScope()'s level-final
//     branch above, finishAssessment()'s recordLevelAssessment() call,
//     and every function progress.js exports for this
//     (recordLevelAssessment/getLevelAssessment/isLevelFinalUnlocked/
//     LEVEL_ORDER) are all still there and still work — a bookmarked
//     `quiz.html?level=X&final=1` link still runs a real level-final
//     assessment and records a real result. This is a "stop pointing
//     people at it" change, not a "rip it out" change.
//
// REASONING: "keep as-is + add a trail entry point back" would mean
// resurfacing the three-level (basic/medium/intermediate) framing in
// learn.js's UI — exactly what Rev 4 is deliberately moving away from
// (a category can belong to a "level" that has nothing to do with
// where it sits on the trail; Unit 4's `requests` is level:'medium'
// but comes right after Unit 3's basic-level `numbers`, see
// SYSTEM_ARCHITECTURE.md's Unit Map). There's no honest place left to
// put "you finished Basic, now do the Basic-level final" that wouldn't
// contradict the trail it would sit next to. "Redesign as a
// trail-wide review" is a real, reasonable alternative — but it's a
// new feature (what would it cover, when would it trigger, does it
// reuse quiz.js's rounds or need new ones) that's out of a reasonable
// scope for this phase's diff, not a small follow-on to what's already
// here. Retiring the CTA is the smallest change that resolves the
// actual inconsistency (a dead-end feature with no way to reach it
// honestly) without either silently keeping a confusing gap or
// committing to a bigger redesign no one has actually asked for.
//
// FLAGGING (same spirit as Phase 4's category-locking reversal flag —
// see AI_MEMORY.md §0): this is a real product decision made by this
// session, not something Joshua explicitly confirmed. If level finals
// should come back, the fastest revert is restoring the `finalUnlocked`
// branch removed from the `passed` case below — nothing in
// progress.js needs to change either way.
// ══════════════════════════════════════════════════════════════════
function buildActionButtons(passed) {
  if (isFinal) {
    if (passed) {
      const idx = window.LWProgress.LEVEL_ORDER.indexOf(level);
      const nextLevel = window.LWProgress.LEVEL_ORDER[idx + 1];
      const nextLine = nextLevel
        ? `<a href="learn.html?level=${nextLevel}" class="btn btn--primary btn--lg">Next Level: ${cap(nextLevel)} →</a>`
        : `<span class="badge badge--basic">🏆 All levels complete!</span>`;
      return `
        <a href="feedback.html?level=${level}" class="btn btn--secondary btn--lg">Give Feedback →</a>
        ${nextLine}
        <a href="dashboard.html" class="btn btn--ghost">Back to Dashboard</a>
      `;
    }
    return `
      <button class="btn btn--primary btn--lg" onclick="location.reload()">Retry Level Assessment</button>
      <a href="learn.html?level=${level}" class="btn btn--ghost">Review Categories</a>
    `;
  }

  if (passed) {
    // BUGFIX — REV 4 PHASE 6: "next category" used to be computed from
    // window.LWProgress.liveCategoriesFor(level) — the OLD per-level
    // walk, sorted by each category's in-level `order`, not by true
    // trail position. Phase 4 already found and fixed this exact class
    // of bug in js/dashboard.js's renderContinueButton() (see that
    // file's BUGFIX comment for the root cause: Phase 1 never
    // renumbered `order` when it added `unit`, so in-level order and
    // trail order can disagree) but quiz.js was untouched at the time —
    // SYSTEM_ARCHITECTURE.md's Progress/unlock model changes section
    // explicitly notes "quiz.js/lesson.js remain fully untouched"
    // through Phase 4. Same bug, same fix: walk the flat cross-unit
    // chain instead. Concretely, this used to mean finishing the LAST
    // basic-level category (Numbers) would look for a next category
    // only among OTHER basic-level categories, find none, and silently
    // fall back to "Back to Lessons" instead of correctly pointing at
    // Unit 4's first category — even though that next category was
    // already unlocked and waiting.
    const chain = window.LWProgress.getOrderedLiveCategories();
    const idx   = chain.findIndex(c => c.id === categoryId);
    const next  = chain[idx + 1];

    let cta = `<a href="learn.html?level=${level}" class="btn btn--secondary btn--lg">Back to Lessons</a>`;
    // REMOVED — see the REV 4 PHASE 6 — LEVEL FINAL ASSESSMENT: DECIDED
    // block comment above buildActionButtons(): this branch used to
    // insert a "🏁 Take Level Final Assessment" CTA here whenever
    // window.LWProgress.isLevelFinalUnlocked(level) was true.
    if (next) {
      cta = `<a href="lesson.html?level=${next.level}&category=${next.id}" class="btn btn--primary btn--lg">Next: ${next.title} →</a> ` + cta;
    }
    return `${cta} <a href="dashboard.html" class="btn btn--ghost">Dashboard</a>`;
  }
  return `
    <button class="btn btn--primary btn--lg" onclick="location.reload()">Retry Assessment</button>
    <a href="lesson.html?level=${level}&category=${categoryId}" class="btn btn--ghost">Review Lesson</a>
  `;
}