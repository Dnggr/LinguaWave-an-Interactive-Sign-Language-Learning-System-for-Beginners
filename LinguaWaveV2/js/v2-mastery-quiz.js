/**
 * js/v2-mastery-quiz.js — Renderer/controller for pages/v2-mastery-quiz.html (NEW)
 * ─────────────────────────────────────────────────────────────────
 * A real V2-native Mastery Quiz: multiple-choice, one question per
 * sign in the mission, immediate per-question feedback, then a single
 * end-of-quiz pass/fail summary — resolving the mockup-audit gap
 * where V1's quiz.js conflated "per-question Correct! card" (mockup
 * screen 9) with "end-of-quiz summary" into one results-title string.
 *
 * ENDING SCREEN (Priority 3 task 7, "option 2" follow-up) : the old
 * per-sign "You can now sign..." <ul> (one <li> per getRecap() line)
 * read as clutter and was flagged for removal. Rather than deleting
 * the accomplishment info outright, it's now one summary sentence —
 * "You've mastered all N signs in <Mission>." — using
 * result.recap.length for the count. getRecap() itself is unchanged
 * and still used as-is by v2-lesson.js's own recap step.
 *
 * HEARTS (Task 2, prior revision) : entering this quiz costs nothing.
 * A heart is spent per WRONG graded answer instead (1 incorrect
 * answer = 1 heart), via window.LWDataV2.consumeHeartForIncorrectAnswer()
 * in handleAnswer() below — not once at the end in finishQuiz() like
 * the previous revision did. That's a NEW, ADDITIVE function in
 * js/data-v2.js; it does not touch or replace consumeHeartForMastery(),
 * which v2-mission-overview.js/v2-lesson.js still use for every
 * chapter that falls back to V1's pages/quiz.html.
 *
 * ANSWER FLOW + OUT OF HEARTS (Priority 1, Tasks 3 & 4, this revision):
 *   - Correct answer: feedback shown, Continue button NOT rendered,
 *     auto-advances to the next question after AUTO_ADVANCE_DELAY_MS.
 *   - Incorrect answer: feedback shown WITH a manual Continue button;
 *     no auto-advance/cooldown is started for it.
 *   - If the heart spent for that incorrect answer empties the pool
 *     (hearts <= 0), the quiz stops immediately instead of showing the
 *     normal incorrect-feedback card — renderOutOfHearts() (already
 *     used as the pre-quiz gate in initPage()) takes over the whole
 *     content area, so no quiz option/button remains interactive.
 * See handleAnswer() below for all three.
 *
 * SAMPLE SCOPE (widened this revision — merged from three parallel
 * widenings) : ALL 12 chapters are now served here — 'asl_foundations'
 * (Ch.1), 'introduce_yourself' (Ch.2), 'express_feelings' (Ch.3),
 * 'daily_actions' (Ch.4), 'describing_things' (Ch.5), 'home_family'
 * (Ch.6), 'school_life' (Ch.7), 'food_nature' (Ch.8),
 * 'clothing_belongings' (Ch.9), 'people_places_time' (Ch.10),
 * 'having_a_conversation' (Ch.11), and 'putting_it_together' (Ch.12)
 * — see SAMPLE_CATEGORY_GROUPS below, originally just Chapters 1-2.
 * Chapters 3-12 have no hand-curated NEAR_NEIGHBORS/SAME_SIGN_AS
 * entries in js/v2-lesson-loop.js (same as every other uncurated
 * chapter) — they run on that file's existing generic (non-curated)
 * distractor fallback, the same "degrade, don't throw" path the
 * lesson flow already uses for those chapters. Verified via a Node
 * harness against every real mission in the newly sampled chapters:
 * buildQuizQuestions() produces a valid option set (2+ options,
 * correct answer included) with zero throws for every one of them.
 * With every chapter now in SAMPLE_CATEGORY_GROUPS, the V1
 * pages/quiz.html fallback below (v2-mission-overview.js /
 * v2-lesson.js) is currently unreachable for any real mission — it
 * stays in place only as a defensive fallback for an unsampled
 * mission (typed URL, stale link, or a future new chapter not yet
 * added here), in which case this page still says so and offers the
 * V1 quiz rather than silently failing. To widen the sample further
 * (e.g. a future 13th chapter), add the new chapter's id to
 * SAMPLE_CATEGORY_GROUPS — nothing else here is chapter-specific.
 * SAMPLE_CATEGORY_GROUPS must stay in sync with
 * v2-mission-overview.js's SAMPLE_MASTERY_QUIZ_CHAPTERS and
 * v2-lesson.js's own copy of that same const.
 *
 * Same data-source discipline as every other v2-*.js file: reads only
 * window.LWData / window.LWDataV2 / window.LWDataV2Loop. Does not
 * touch js/engine/progress.js or pages/quiz.js.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const SAMPLE_CATEGORY_GROUPS = [
  'asl_foundations', 'introduce_yourself',
  'express_feelings', 'daily_actions', 'describing_things',
  'home_family', 'school_life', 'food_nature',
  'clothing_belongings', 'people_places_time', 'having_a_conversation', 'putting_it_together',
];
const MAX_QUESTIONS = 12;
const PASS_THRESHOLD = 0.8; // unchanged from V1's pages/quiz.js — same mastery bar, new screen
// Priority 1, Task 3 — "wait about 1-2 seconds" for the auto-continue
// after a correct answer. Sits inside that stated range.
const AUTO_ADVANCE_DELAY_MS = 1500;

function getMissionParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mission');
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ── media (video/image) with graceful, honest fallback ───────────
 * Identical to js/v2-lesson.js's own mediaBlockHtml() — copied, not
 * imported, per this repo's established convention of small page-
 * scoped helpers re-derived per file (see v2-mission-overview.js's
 * own file-header note on the same choice for statusFor()). The
 * fallback trigger lives on the <source> tag's own onerror, not the
 * <video> tag's — see v2-lesson.js's comment for why (Chromium
 * dispatches a failed nested <source>'s error event to the <source>
 * itself, confirmed with a real browser during that build). */
function mediaBlockHtml(sign) {
  if (!sign) {
    return `<div class="v2-lesson-media v2-lesson-media--missing">Sign data not found.</div>`;
  }
  const safeVideo = escapeHtml(sign.videoUrl || '');
  const safeImage = escapeHtml(sign.imageUrl || '');
  const safeTitle = escapeHtml(sign.title || sign.signId);
  return `
    <div class="v2-lesson-media">
      <video class="v2-lesson-media__video" muted loop playsinline>
        <source src="${safeVideo}" type="video/mp4"
                onerror="var m=this.closest('.v2-lesson-media'); if (!m) return; var v=m.querySelector('.v2-lesson-media__video'); var f=m.querySelector('.v2-lesson-media__fallback'); if (v) v.style.display='none'; if (f) f.style.display='flex';">
      </video>
      <div class="v2-lesson-media__fallback">
        <img class="v2-lesson-media__img" alt="${safeTitle}" src="${safeImage}"
             onerror="this.style.display='none'; this.parentElement.classList.add('v2-lesson-media__fallback--text-only');">
        <p class="v2-lesson-media__hint text-muted">
          Video/image not available yet in this preview build (${safeVideo || 'no path'}) — using the sign name below instead.
        </p>
      </div>
    </div>
  `;
}

/* Deterministic (seeded, not Math.random) shuffle — identical
 * algorithm to js/v2-lesson-loop.js's own shuffleDeterministic(), so
 * a mission's quiz question set/order stays stable across re-renders
 * within a session rather than reshuffling on every reload. */
function shuffleDeterministic(arr, seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

function letterFor(i) {
  return String.fromCharCode(65 + i); // A, B, C, D...
}

function formatCountdown(targetIso) {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return 'less than a minute';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function heartsRowHtml(heartsState) {
  const hearts = Array.from({ length: heartsState.maxHearts }, (_, i) =>
    `<span class="v2-heart ${i < heartsState.hearts ? 'v2-heart--full' : 'v2-heart--empty'}" aria-hidden="true">&#10084;</span>`
  ).join('');
  // Wording (Task 2) — "remaining", not "attempts available": a heart
  // is now spent per wrong answer, not once per whole attempt, so the
  // pool can outlast several attempts if the learner answers cleanly.
  return `<span class="v2-quiz-hearts-row" id="v2-mq-hearts-row" title="${heartsState.hearts} of ${heartsState.maxHearts} Mastery Hearts remaining">${hearts}</span>`;
}

function uniqueSignIds(mission) {
  const seen = new Set();
  const out = [];
  mission.items.forEach((item) => {
    if (item.signId && !seen.has(item.signId)) {
      seen.add(item.signId);
      out.push(item.signId);
    }
  });
  return out;
}

/* §3.6 difficultyRamp, wired into real rendered output for the first
 * time (previously schema-only everywhere — see
 * DataV2_LinguaWave_Progress_Tracker.md row 3.6). A sign that got a
 * real Practice-stage escalation (its own PRACTICE item's
 * difficultyRamp: ['2-option','3-option+distractor']) is quizzed at
 * that harder tier here — 3 options, buildRecognizeOptions()
 * preferring a curated near-neighbor distractor when one exists. A
 * sign that never got a PRACTICE item (every other sign in the
 * mission, per data-v2.js's own "every other sign" rule) defaults to
 * the mockup's flat 4-option A/B/C/D grid instead. */
function questionOptionCount(mission, signId) {
  const hasRamp = mission.items.some((it) => it.kind === 'PRACTICE' && it.signId === signId && !!it.difficultyRamp);
  return hasRamp ? 3 : 4;
}

function buildQuizQuestions(mission) {
  const allSignIds = uniqueSignIds(mission);
  const ordered = shuffleDeterministic(allSignIds, `${mission.id}_mastery_quiz`);
  const picked = ordered.slice(0, Math.min(MAX_QUESTIONS, ordered.length));
  const categorySignIds = window.LWDataV2.getCategorySigns(mission.level, mission.category);

  return picked.map((signId) => {
    const count = questionOptionCount(mission, signId);
    const built = (window.LWDataV2Loop && typeof window.LWDataV2Loop.buildRecognizeOptions === 'function')
      ? window.LWDataV2Loop.buildRecognizeOptions(mission.level, signId, categorySignIds, count)
      : { correct: signId, options: [signId] };
    return { signId, correct: built.correct, options: built.options };
  });
}

/* ── Gate screens ──────────────────────────────────────────────── */

function renderNotFound() {
  document.getElementById('v2-mq-content').innerHTML =
    `<p class="text-muted">No mission found for that link — <a href="v2-learn.html">back to all missions</a>.</p>`;
}

function renderNotSampledYet(mission) {
  const v1Url = `../../pages/quiz.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  document.getElementById('v2-mq-content').innerHTML = `
    <div class="v2-note-banner">
      This sample build of the V2 Mastery Quiz now covers all 12 chapters. "${escapeHtml(mission.title)}"
      isn't part of it — this can happen with a stale link, a typed URL, or a category not yet added to
      SAMPLE_CATEGORY_GROUPS.
    </div>
    <div class="v2-lesson-actions">
      <a href="${v1Url}" class="btn btn--primary btn--lg">Take the classic Mastery Quiz instead</a>
      <a href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">Back to Mission Overview</a>
    </div>
  `;
}

// Priority 1, Task 4 — reused both as the pre-quiz gate (initPage())
// AND as the mid-quiz "stop" screen (handleAnswer() below, when a
// wrong answer drops the pool to 0). Either way this fully replaces
// #v2-mq-content, so no quiz button/option from before it can still
// be interacted with — that's what "prevent further quiz interaction"
// means here, not a separate disabled state layered on top.
function renderOutOfHearts(mission, heartsState) {
  document.getElementById('v2-mq-content').innerHTML = `
    <div class="v2-note-banner">
      <strong>Out of Mastery Quiz hearts.</strong> The quiz has stopped here —
      come back and try again once your hearts have replenished
      (next heart in ${formatCountdown(heartsState.nextRefillAt)}).
    </div>
    <div class="v2-lesson-actions">
      <a href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">Back to Mission Overview</a>
    </div>
  `;
}

/* ── Question flow ────────────────────────────────────────────── */

function renderQuestion(state) {
  const el = document.getElementById('v2-mq-content');
  const q = state.questions[state.currentIndex];
  const sign = window.LWDataV2.getSign(state.mission.level, q.signId);
  const heartsState = window.LWDataV2.getHeartsState();
  const pct = Math.round((state.currentIndex / state.questions.length) * 100);

  el.innerHTML = `
    <div class="v2-quiz-progress">
      <span>Question ${state.currentIndex + 1} of ${state.questions.length} &middot; ${escapeHtml(state.mission.title)}</span>
      ${heartsRowHtml(heartsState)}
    </div>
    <div class="progress-bar v2-quiz-progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>

    <div class="v2-lesson-stage-label">Mastery Quiz</div>
    <h1 class="v2-lesson-prompt">What does this sign mean?</h1>
    ${mediaBlockHtml(sign)}

    <div class="v2-lesson-options" id="v2-mq-options">
      ${q.options.map((id, i) => {
        const s = window.LWDataV2.getSign(state.mission.level, id);
        return `<button type="button" class="v2-lesson-option" data-value="${escapeHtml(id)}">
          <span class="v2-quiz-option-letter">${letterFor(i)}</span>${escapeHtml((s && s.title) || id)}
        </button>`;
      }).join('')}
    </div>
    <div id="v2-mq-feedback"></div>
  `;

  document.querySelectorAll('#v2-mq-options .v2-lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, btn.dataset.value));
  });
}

// Immediate per-question feedback — a real "Correct!"/"Not quite" card
// shown right after each answer, distinct from the end-of-quiz pass/
// fail summary in renderSummary(). Resolves the gap
// LinguaWave_Mockup_Visual_Audit.md §9 flagged: V1's quiz.js only had
// an end-of-quiz "You passed!" string, not this per-question card the
// mockup's screens 7 & 9 both show.
//
// ANSWER FLOW (Priority 1, Task 3) : correct answers auto-continue —
// feedback shown, no Continue button, then move on by itself after
// AUTO_ADVANCE_DELAY_MS. Incorrect answers do NOT auto-continue at
// all — feedback shown with a manual Continue button, no cooldown
// timer started for them.
//
// OUT OF HEARTS (Priority 1, Task 4) : if the heart spent for a wrong
// answer drops the pool to 0, the quiz stops immediately right here —
// no incorrect-feedback card, no Continue, no next question — and
// the same out-of-hearts screen used by the pre-quiz gate takes over.
function handleAnswer(state, chosenSignId) {
  const q = state.questions[state.currentIndex];
  const correct = chosenSignId === q.correct;

  if (correct) {
    state.numCorrect += 1;
  } else {
    // Task 2 (prior revision) — 1 incorrect answer = 1 heart. Floors at 0
    // (see data-v2.js), so the quiz itself is never blocked mid-attempt by
    // running out — the "Start Mastery Quiz" button on Mission
    // Overview/Lesson is what disables at zero hearts before an attempt
    // even starts, not this.
    const heartsAfterMiss = window.LWDataV2.consumeHeartForIncorrectAnswer();

    // Task 4 — a wrong answer that empties the pool ends the quiz right
    // now, before any of the normal per-question UI (highlighted
    // options, feedback card, Continue button) gets rendered at all.
    if (heartsAfterMiss.hearts <= 0) {
      renderOutOfHearts(state.mission, heartsAfterMiss);
      return;
    }

    const heartsRow = document.getElementById('v2-mq-hearts-row');
    if (heartsRow) heartsRow.outerHTML = heartsRowHtml(heartsAfterMiss);
  }

  document.querySelectorAll('#v2-mq-options .v2-lesson-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.value === q.correct) btn.classList.add('v2-lesson-option--correct');
    else if (btn.dataset.value === chosenSignId) btn.classList.add('v2-lesson-option--incorrect');
  });

  const correctSign = window.LWDataV2.getSign(state.mission.level, q.correct);
  const isLast = state.currentIndex === state.questions.length - 1;

  function advance() {
    if (isLast) {
      finishQuiz(state);
    } else {
      state.currentIndex += 1;
      renderQuestion(state);
    }
  }

  if (correct) {
    // Task 3 — correct: feedback only, no Continue button, auto-move on.
    document.getElementById('v2-mq-feedback').innerHTML = `
      <div class="v2-lesson-feedback v2-lesson-feedback--correct">Correct! ✓</div>
    `;
    window.setTimeout(advance, AUTO_ADVANCE_DELAY_MS);
  } else {
    // Task 3 — incorrect: feedback + manual Continue, no auto-advance.
    document.getElementById('v2-mq-feedback').innerHTML = `
      <div class="v2-lesson-feedback v2-lesson-feedback--incorrect">
        Not quite — this sign means "${escapeHtml((correctSign && correctSign.title) || q.correct)}".
      </div>
      <div class="v2-lesson-actions">
        <button type="button" class="btn btn--primary btn--lg" id="v2-mq-continue">${isLast ? 'See results' : 'Continue'}</button>
      </div>
    `;
    document.getElementById('v2-mq-continue').addEventListener('click', advance);
  }
}

function finishQuiz(state) {
  const scoreFraction = state.numCorrect / state.questions.length;
  const passed = scoreFraction >= PASS_THRESHOLD;

  // Task 2 — hearts were already spent per wrong answer as they
  // happened (handleAnswer()); nothing is spent here on submit. Just
  // read the final state for the summary screen below.
  const heartsAfter = window.LWDataV2.getHeartsState();

  let recap = [];
  if (passed) {
    // Priority 1, Task 1 ("Mastery Quiz Completes the Mission") — a
    // pass marks the ENTIRE mission complete (every LESSON/BOOSTER/
    // PRACTICE item, not just this QUIZ item), via the new, additive
    // window.LWDataV2.markMissionComplete() (data-v2.js). Previously
    // this only marked the mission's own QUIZ item, which closed the
    // "recap/Missions Completed stat never reaches 100%" gap logged
    // when the QUIZ-only marking was first added, but left the actual
    // product requirement unmet: the Mastery Quiz is supposed to be a
    // full skip path for advanced users ("should not need to complete
    // every lesson after passing it"), so the mission itself — not
    // just its quiz — needs to read as 100% done, unlocking the next
    // chapter (isChapterUnlocked()) and every page's progress reflects
    // it (dashboard/learn/mission-overview/progress, all of which read
    // getMissionProgress()/getMissionStatus(), not this file).
    window.LWDataV2.markMissionComplete(state.mission);
    recap = window.LWDataV2.getRecap(state.mission);
  }

  renderSummary(state, { scoreFraction, passed, heartsAfter, recap });
}

function renderSummary(state, result) {
  const el = document.getElementById('v2-mq-content');
  const mission = state.mission;
  const pct = Math.round(result.scoreFraction * 100);

  // Option 2 (from the "better approach" discussion on Priority 3 task
  // 7) — collapse the old per-sign "You can now sign..." <ul> into one
  // sentence instead of deleting it outright. Keeps the sense of
  // accomplishment (and the real count, via result.recap — which
  // reflects the WHOLE mission now that a pass calls
  // markMissionComplete(), not just this attempt's quiz questions)
  // without the wall-of-checkmarks the original list produced.
  const recapLine = result.recap.length
    ? `<p class="v2-quiz-summary__recap">You've mastered all ${result.recap.length} sign${result.recap.length === 1 ? '' : 's'} in ${escapeHtml(mission.title)}.</p>`
    : '';

  const failNote = !result.passed ? `
    <p class="text-muted">You need ${Math.round(PASS_THRESHOLD * 100)}% to pass. Review the mission and try again.</p>
    ${result.heartsAfter.hearts <= 0
      ? `<p class="v2-lesson-callout">Out of Mastery Quiz hearts for now — next one in ${formatCountdown(result.heartsAfter.nextRefillAt)}.</p>`
      : `<p class="text-muted">${result.heartsAfter.hearts} of ${result.heartsAfter.maxHearts} Mastery Hearts left.</p>`}
  ` : '';

  el.innerHTML = `
    <div class="v2-quiz-summary">
      <div class="v2-quiz-summary__score ${result.passed ? 'v2-quiz-summary__score--pass' : 'v2-quiz-summary__score--fail'}">${pct}%</div>
      <h1>${result.passed ? 'Mission mastered! 🎉' : 'Not quite there yet'}</h1>
      <p class="text-muted">${state.numCorrect} of ${state.questions.length} correct.</p>
      ${result.passed ? recapLine : ''}
      ${failNote}
      <div class="v2-lesson-actions v2-quiz-summary__actions">
        ${result.passed
          ? `<a href="v2-learn.html" class="btn btn--primary btn--lg">Back to your missions</a>`
          : `<a href="v2-lesson.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--primary btn--lg">Review the mission</a>`}
        <a href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">Mission Overview</a>
      </div>
    </div>
  `;
}

/* ── Entry ─────────────────────────────────────────────────────── */

function initPage() {
  const el = document.getElementById('v2-mq-content');
  if (!window.LWData || !window.LWDataV2) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/data.js and js/data-v2.js both loaded.</p>`;
    return;
  }

  const categoryId = getMissionParam();
  const mission = categoryId ? window.LWDataV2.getMissionForCategory(categoryId) : null;
  if (!mission) {
    renderNotFound();
    return;
  }

  document.title = `Mastery Quiz — ${mission.title} — LinguaWave V2 (preview)`;

  if (SAMPLE_CATEGORY_GROUPS.indexOf(mission.categoryGroup) === -1) {
    renderNotSampledYet(mission);
    return;
  }

  const heartsState = window.LWDataV2.getHeartsState();
  if (heartsState.hearts <= 0) {
    renderOutOfHearts(mission, heartsState);
    return;
  }

  const questions = buildQuizQuestions(mission);
  if (!questions.length) {
    el.innerHTML = `<p class="text-muted">No signs found to quiz for this mission.</p>`;
    return;
  }

  renderQuestion({ mission, questions, currentIndex: 0, numCorrect: 0 });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}