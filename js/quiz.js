/**
 * js/quiz.js — Category & Level Assessment Engine
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Runs the GRADED assessment that now sits at the end of
 *            every category ("End-of-category assessment") and once
 *            more at the end of a level ("End-of-level assessment"),
 *            per the flowchart. Three interactive rounds:
 *              1. Multiple Choice   — read a description, pick the sign
 *              2. Identification    — see the sign, pick its name
 *              3. Camera Check      — OPTIONAL live motion/gesture
 *                                      detection (MediaPipe). Never
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
 *   ?level=basic&final=1             → level-final assessment (all
 *                                        live categories in the level)
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

import { startCamera, stopCamera }                         from '../js/camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady }        from '../js/tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }                        from '../js/engine/renderer.js';
import { getDetectionType }                                 from '../js/engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer,
         loadModels, getMotionModelError }                  from '../js/engine/classifier.js';

/* ── URL params / scope ─────────────────────────────────────────── */
const params    = new URLSearchParams(window.location.search);
const level     = params.get('level') || 'basic';
const isFinal   = params.get('final') === '1';
const categoryId = params.get('category') || null;

const MAX_PER_ROUND  = 10;
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

/* ── Runner state ───────────────────────────────────────────────── */
const rounds = [
  { key: 'multipleChoice', label: 'Multiple Choice', questions: [] },
  { key: 'identification',  label: 'Identification',  questions: [] },
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

function boot() {
  if (titleEl)    titleEl.textContent    = scope.title;
  if (subtitleEl) subtitleEl.textContent = scope.subtitle;

  if (scope.signs.length === 0) {
    showEmptyState();
    return;
  }

  rounds[0].questions = buildMCRound(scope.signs);
  rounds[1].questions = buildIdRound(scope.signs);
  showQuestion();
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

document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();

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
    qOptionsEl.innerHTML = q.options.map(opt => `
      <button class="quiz-option" data-option="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
    `).join('');
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

async function runCameraRound() {
  cameraRoundData = { attempted: true, correct: 0, total: 0, skipped: false };
  cameraSignQueue = sample(scope.signs, Math.min(6, scope.signs.length));
  cameraQIdx = 0;
  cameraScore = 0;

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
    const isMotion = getDetectionType(currentSign) === 'motion';
    const result = isMotion
      ? classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks)
      : classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks);

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
  if (cameraFeedbackEl) cameraFeedbackEl.style.display = 'none';
  if (cameraScoreEl) cameraScoreEl.textContent = `Bonus score: ${cameraScore} / ${cameraSignQueue.length}`;

  clearTimeout(cameraGetReadyTimer);
  if (cameraPromptEl) cameraPromptEl.textContent = 'Get ready…';

  cameraGetReadyTimer = setTimeout(() => {
    cameraCooldown = false;
    if (cameraPromptEl) cameraPromptEl.textContent = `Try signing: "${currentSign}"`;
    cameraPromptTimer = setTimeout(() => {
      cameraRoundData.total++;
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

/* ── Finish + results ─────────────────────────────────────────────── */
function finishAssessment() {
  const score  = computeGradedScore();
  const passed = score >= PASS_THRESHOLD;

  const breakdown = {
    multipleChoice: roundResults.multipleChoice ?? { correct: 0, total: 0 },
    identification: roundResults.identification ?? { correct: 0, total: 0 },
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
    const mcPct = breakdown.multipleChoice.total ? Math.round(100 * breakdown.multipleChoice.correct / breakdown.multipleChoice.total) : 0;
    const idPct = breakdown.identification.total ? Math.round(100 * breakdown.identification.correct / breakdown.identification.total) : 0;
    const motionLine = breakdown.motion.skipped
      ? '<li>🎥 Camera check — skipped (optional)</li>'
      : `<li>🎥 Camera check (bonus, not counted) — ${breakdown.motion.correct} / ${breakdown.motion.total}</li>`;
    resultsBreakdownEl.innerHTML = `
      <li>📝 Multiple choice — ${breakdown.multipleChoice.correct} / ${breakdown.multipleChoice.total} (${mcPct}%)</li>
      <li>🔎 Identification — ${breakdown.identification.correct} / ${breakdown.identification.total} (${idPct}%)</li>
      ${motionLine}
    `;
  }

  if (resultsActionsEl) resultsActionsEl.innerHTML = buildActionButtons(passed);
}

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
    const live = window.LWProgress.liveCategoriesFor(level);
    const idx  = live.findIndex(c => c.id === categoryId);
    const next = live[idx + 1];
    const finalUnlocked = window.LWProgress.isLevelFinalUnlocked(level);
    let cta = `<a href="learn.html?level=${level}" class="btn btn--secondary btn--lg">Back to Lessons</a>`;
    if (finalUnlocked) {
      cta = `<a href="quiz.html?level=${level}&final=1" class="btn btn--primary btn--lg">🏁 Take Level Final Assessment</a> ` + cta;
    } else if (next) {
      cta = `<a href="lesson.html?level=${level}&category=${next.id}" class="btn btn--primary btn--lg">Next Category: ${next.title} →</a> ` + cta;
    }
    return `${cta} <a href="dashboard.html" class="btn btn--ghost">Dashboard</a>`;
  }
  return `
    <button class="btn btn--primary btn--lg" onclick="location.reload()">Retry Assessment</button>
    <a href="lesson.html?level=${level}&category=${categoryId}" class="btn btn--ghost">Review Lesson</a>
  `;
}