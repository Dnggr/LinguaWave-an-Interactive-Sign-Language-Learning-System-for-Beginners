/**
 * js/v2-lesson.js — Renderer/controller for pages/v2-lesson.html (NEW)
 * ─────────────────────────────────────────────────────────────────
 * Walks a mission's existing items (js/data-v2.js's own LESSON/
 * BOOSTER/PRACTICE/QUIZ shape, unchanged) using the stage plan
 * js/v2-lesson-loop.js computes for each one. This file only renders
 * + wires DOM events and calls the EXISTING progress functions
 * (window.LWDataV2.markItemComplete / getDropOffIndex / getRecap /
 * getHeartsState/consumeHeartForMastery) — it has no progress logic
 * of its own.
 *
 * QUIZ HANDOFF (this revision, consistency fix) : mirrors
 * v2-mission-overview.js's own SAMPLE_MASTERY_QUIZ_CHAPTERS split —
 * Chapters 1–2 (asl_foundations/introduce_yourself) now hand off to
 * the real v2-mastery-quiz.html (which spends a heart per wrong
 * answer, not on entry) instead of always going to V1's
 * pages/quiz.html. Every other chapter is unchanged. Without this,
 * the SAME mission's Mastery Quiz button would launch a completely
 * different quiz experience depending on whether the learner clicked
 * it from Mission Overview or from here — see that file's own header
 * for the full scope note.
 *
 * Same data-source discipline as every other v2-*.js file: reads only
 * window.LWData / window.LWDataV2 / window.LWDataV2Loop.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// Mirrors v2-mission-overview.js's own const of the same name — kept
// as a small local re-derivation, same as this file's own existing
// pattern (see its file-header note above).
const SAMPLE_MASTERY_QUIZ_CHAPTERS = ['asl_foundations', 'introduce_yourself'];

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
 * Mirrors js/lesson.js's own defensive pattern for the same not-yet-
 * populated asset paths (see that file's "Add image to ..." hint) —
 * not a new convention invented for this page. */
function mediaBlockHtml(sign) {
  if (!sign) {
    return `<div class="v2-lesson-media v2-lesson-media--missing">Sign data not found.</div>`;
  }
  const safeVideo = escapeHtml(sign.videoUrl || '');
  const safeImage = escapeHtml(sign.imageUrl || '');
  const safeTitle = escapeHtml(sign.title || sign.signId);
  // NOTE: the fallback trigger lives on the <source> tag's own
  // onerror, not the <video> tag's — Chromium dispatches the media
  // 'error' event to the failing <source> child, not the parent
  // <video>, when a nested source 404s (it does NOT bubble like a
  // normal DOM event). Verified with a real Chromium run during this
  // build: attaching onerror to <video> alone silently never fires.
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
          Video/image not available yet in this preview build (${safeVideo || 'no path'}) — using the written description below instead.
        </p>
      </div>
    </div>
  `;
}

function descriptionHtml(sign) {
  if (!sign) return '';
  const tips = (sign.tips || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `
    <p class="v2-lesson-desc">${escapeHtml(sign.description || '')}</p>
    ${tips ? `<ul class="v2-lesson-tips">${tips}</ul>` : ''}
  `;
}

function cameraPracticeLinkHtml(mission) {
  const url = `../../pages/lesson.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  return `
    <a class="v2-lesson-camera-link" href="${url}" target="_blank" rel="noopener">
      🎥 Practice with your camera <span class="text-muted">(opens in LinguaWave V1, new tab)</span>
    </a>
  `;
}

/* ── stage renderers — each fills #v2-lesson-content and wires its
 * own "continue" action, which always ends by calling completeAndAdvance() */

function renderLessonWatch(mission, index, item, plan, ctx) {
  const sign = window.LWDataV2.getSign(mission.level, item.signId);
  const el = document.getElementById('v2-lesson-content');
  el.innerHTML = `
    <div class="v2-lesson-stage-label">Watch &amp; Learn</div>
    <h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>
    ${mediaBlockHtml(sign)}
    ${descriptionHtml(sign)}
    ${cameraPracticeLinkHtml(mission)}
    <div class="v2-lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="v2-lesson-continue">Got it — continue</button>
    </div>
  `;
  document.getElementById('v2-lesson-continue').addEventListener('click', () => {
    celebrateInline(`You just learned "${(sign && sign.title) || item.signId}"!`);
    completeAndAdvance(mission, index, item);
  });
}

function renderLessonLighter(mission, index, item, plan, ctx) {
  const sign = window.LWDataV2.getSign(mission.level, item.signId);
  const el = document.getElementById('v2-lesson-content');
  const reg = plan.registerPrompt;
  el.innerHTML = `
    <div class="v2-lesson-stage-label">Already in your hands</div>
    <h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>
    <div class="v2-lesson-callout">
      <strong>You already know this sign.</strong> ${escapeHtml(plan.reason)}.
    </div>
    ${reg ? `
      <p class="v2-lesson-prompt">${escapeHtml(reg.prompt)}</p>
      <div class="v2-lesson-options" id="v2-lesson-register-options">
        ${reg.options.map((opt) => `<button type="button" class="v2-lesson-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
      </div>
      <p class="v2-lesson-feedback" id="v2-lesson-feedback" hidden></p>
    ` : `
      <p class="v2-lesson-prompt">${escapeHtml(plan.contextPrompt)}</p>
      <div class="v2-lesson-actions">
        <button type="button" class="btn btn--primary btn--lg" id="v2-lesson-continue">Continue</button>
      </div>
    `}
  `;

  if (reg) {
    const feedback = document.getElementById('v2-lesson-feedback');
    document.querySelectorAll('#v2-lesson-register-options .v2-lesson-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('#v2-lesson-register-options .v2-lesson-option').forEach((b) => { b.disabled = true; });
        const correct = btn.dataset.value === reg.answer;
        btn.classList.add(correct ? 'v2-lesson-option--correct' : 'v2-lesson-option--incorrect');
        feedback.hidden = false;
        feedback.textContent = (correct ? '✓ Right — ' : `Not quite — ${reg.answer} fits best here. `) + reg.note;
        feedback.className = 'v2-lesson-feedback ' + (correct ? 'v2-lesson-feedback--correct' : 'v2-lesson-feedback--incorrect');
        setTimeout(() => completeAndAdvance(mission, index, item), 1400);
      });
    });
  } else {
    document.getElementById('v2-lesson-continue').addEventListener('click', () => {
      completeAndAdvance(mission, index, item);
    });
  }
}

function renderRecognizeQuestion(container, mission, index, item, sign, opts, onDone) {
  container.innerHTML += `
    <p class="v2-lesson-prompt">Which word is this?</p>
    ${mediaBlockHtml(sign)}
    <div class="v2-lesson-options" id="v2-lesson-recognize-options">
      ${opts.options.map((id) => {
        const s = window.LWDataV2.getSign(mission.level, id);
        return `<button type="button" class="v2-lesson-option" data-value="${escapeHtml(id)}">${escapeHtml((s && s.title) || id)}</button>`;
      }).join('')}
    </div>
    <p class="v2-lesson-feedback" id="v2-lesson-feedback" hidden></p>
  `;
  const feedback = container.querySelector('#v2-lesson-feedback');
  container.querySelectorAll('#v2-lesson-recognize-options .v2-lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      container.querySelectorAll('#v2-lesson-recognize-options .v2-lesson-option').forEach((b) => { b.disabled = true; });
      const correct = btn.dataset.value === opts.correct;
      btn.classList.add(correct ? 'v2-lesson-option--correct' : 'v2-lesson-option--incorrect');
      feedback.hidden = false;
      feedback.textContent = correct ? '✓ Correct!' : `Not quite — that was "${(sign && sign.title) || item.signId}".`;
      feedback.className = 'v2-lesson-feedback ' + (correct ? 'v2-lesson-feedback--correct' : 'v2-lesson-feedback--incorrect');
      setTimeout(onDone, 1100);
    });
  });
}

function renderBoosterRecognize(mission, index, item, plan) {
  const sign = window.LWDataV2.getSign(mission.level, item.signId);
  const el = document.getElementById('v2-lesson-content');
  el.innerHTML = `<div class="v2-lesson-stage-label">Quick Check</div><h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>`;
  renderRecognizeQuestion(el, mission, index, item, sign, plan.options, () => completeAndAdvance(mission, index, item));
}

function renderBoosterRegister(mission, index, item, plan) {
  const sign = window.LWDataV2.getSign(mission.level, item.signId);
  const reg = plan.registerPrompt;
  const el = document.getElementById('v2-lesson-content');
  el.innerHTML = `
    <div class="v2-lesson-stage-label">Quick Check</div>
    <h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>
    <p class="v2-lesson-prompt">${escapeHtml(reg.prompt)}</p>
    <div class="v2-lesson-options" id="v2-lesson-register-options">
      ${reg.options.map((opt) => `<button type="button" class="v2-lesson-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
    </div>
    <p class="v2-lesson-feedback" id="v2-lesson-feedback" hidden></p>
  `;
  const feedback = document.getElementById('v2-lesson-feedback');
  document.querySelectorAll('#v2-lesson-register-options .v2-lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('#v2-lesson-register-options .v2-lesson-option').forEach((b) => { b.disabled = true; });
      const correct = btn.dataset.value === reg.answer;
      btn.classList.add(correct ? 'v2-lesson-option--correct' : 'v2-lesson-option--incorrect');
      feedback.hidden = false;
      feedback.textContent = (correct ? '✓ Right — ' : `Not quite — ${reg.answer} fits best. `) + reg.note;
      feedback.className = 'v2-lesson-feedback ' + (correct ? 'v2-lesson-feedback--correct' : 'v2-lesson-feedback--incorrect');
      setTimeout(() => completeAndAdvance(mission, index, item), 1400);
    });
  });
}

function renderPracticeScenario(mission, index, item, plan) {
  const sign = window.LWDataV2.getSign(mission.level, item.signId);
  const el = document.getElementById('v2-lesson-content');
  const bonus = item.bonusXP ? `<span class="badge badge--basic">+${item.bonusXP} bonus XP</span>` : '';

  el.innerHTML = `
    <div class="v2-lesson-stage-label">Practice</div>
    <h1>${escapeHtml(item.scenarioTitle || 'Practice')} ${bonus}</h1>
  `;

  if (plan.discriminatePair) {
    const targetSign = window.LWDataV2.getSign(mission.level, plan.discriminatePair.targetSignId);
    const neighborSign = window.LWDataV2.getSign(mission.level, plan.discriminatePair.neighborSignId);
    const pairs = Math.random() < 0.5
      ? [{ sign: targetSign, correct: true }, { sign: neighborSign, correct: false }]
      : [{ sign: neighborSign, correct: false }, { sign: targetSign, correct: true }];
    el.innerHTML += `
      <p class="v2-lesson-prompt">Which one shows "${escapeHtml((targetSign && targetSign.title) || item.signId)}"?</p>
      <div class="v2-lesson-pair" id="v2-lesson-pair">
        ${pairs.map((p, i) => `
          <button type="button" class="v2-lesson-pair__card" data-correct="${p.correct}" data-index="${i}">
            ${mediaBlockHtml(p.sign)}
            <span class="v2-lesson-pair__label">Option ${i === 0 ? 'A' : 'B'}</span>
          </button>
        `).join('')}
      </div>
      <p class="v2-lesson-feedback" id="v2-lesson-feedback" hidden></p>
    `;
    const feedback = document.getElementById('v2-lesson-feedback');
    document.querySelectorAll('#v2-lesson-pair .v2-lesson-pair__card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('#v2-lesson-pair .v2-lesson-pair__card').forEach((b) => { b.disabled = true; });
        const correct = btn.dataset.correct === 'true';
        btn.classList.add(correct ? 'v2-lesson-option--correct' : 'v2-lesson-option--incorrect');
        feedback.hidden = false;
        feedback.textContent = correct ? '✓ Correct!' : 'Not quite — take another look next time you see these two.';
        feedback.className = 'v2-lesson-feedback ' + (correct ? 'v2-lesson-feedback--correct' : 'v2-lesson-feedback--incorrect');
        setTimeout(() => showContextStep(mission, index, item, plan), 1100);
      });
    });
  } else if (plan.recognizeOptions) {
    renderRecognizeQuestion(el, mission, index, item, sign, plan.recognizeOptions, () => showContextStep(mission, index, item, plan));
  } else {
    showContextStep(mission, index, item, plan);
  }
}

function showContextStep(mission, index, item, plan) {
  const el = document.getElementById('v2-lesson-content');
  // Append (rather than replace) so the learner still sees what they
  // just answered above the Contextualize prompt, per §8E stage 4
  // following directly after stage 3 in the same screen.
  const wrap = document.createElement('div');
  wrap.className = 'v2-lesson-context';
  wrap.innerHTML = `
    <p class="v2-lesson-stage-label">Use it in context</p>
    <p class="v2-lesson-prompt">${escapeHtml(plan.contextPrompt || '')}</p>
    <div class="v2-lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="v2-lesson-continue">Continue</button>
    </div>
  `;
  el.appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
  document.getElementById('v2-lesson-continue').addEventListener('click', () => {
    completeAndAdvance(mission, index, item);
  });
}

function renderQuizHandoff(mission) {
  const el = document.getElementById('v2-lesson-content');
  const recap = window.LWDataV2.getRecap(mission);
  const heartsState = window.LWDataV2.getHeartsState();
  const outOfHearts = heartsState.hearts <= 0;
  // Consistency fix (this revision) — same split as
  // v2-mission-overview.js's usesV2Quiz: Chapters 1–2 go to the real
  // V2-native Mastery Quiz; every other chapter is unchanged.
  const usesV2Quiz = SAMPLE_MASTERY_QUIZ_CHAPTERS.indexOf(mission.categoryGroup) !== -1;
  const quizUrl = usesV2Quiz
    ? `v2-mastery-quiz.html?mission=${encodeURIComponent(mission.category)}`
    : `../../pages/quiz.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;

  el.innerHTML = `
    <div class="v2-lesson-stage-label">Mission recap</div>
    <h1>Nice work — here's what you can do now</h1>
    <ul class="v2-lesson-recap">
      ${recap.length ? recap.map((line) => `<li>✓ ${escapeHtml(line)}</li>`).join('') : '<li class="text-muted">Complete a few more items to build your recap.</li>'}
    </ul>
    <p class="text-muted">One more step: pass the Mastery Quiz (80%+) to fully complete this mission.</p>
    <div class="v2-lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="v2-lesson-start-quiz" ${outOfHearts ? 'disabled' : ''}>
        🎯 Start Mastery Quiz
      </button>
      <a href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">
        Back to Mission Overview
      </a>
    </div>
    ${outOfHearts ? '<p class="v2-lesson-callout">Out of Mastery Quiz hearts for now — check Mission Overview for the refill countdown.</p>' : ''}
  `;
  const quizBtn = document.getElementById('v2-lesson-start-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      if (usesV2Quiz) {
        // Task 2 — entering v2-mastery-quiz.html costs nothing; it
        // spends a heart per wrong answer instead (see
        // js/v2-mastery-quiz.js), not once here.
        window.location.href = quizUrl;
        return;
      }
      // UNCHANGED, non-sampled chapters only (still V1's pages/quiz.js,
      // deliberately left untouched this revision — see
      // js/data-v2.js's file header "HEART TIMING FIX, V2-NATIVE QUIZ
      // ONLY"): this still spends the heart on attempt START.
      window.LWDataV2.consumeHeartForMastery();
      window.location.href = quizUrl;
    });
  }
}

function renderUnknown(mission, index, item) {
  const el = document.getElementById('v2-lesson-content');
  el.innerHTML = `
    <p class="text-muted">This item type isn't recognized yet (${escapeHtml(item.kind)}).</p>
    <div class="v2-lesson-actions">
      <button type="button" class="btn btn--secondary btn--lg" id="v2-lesson-continue">Skip</button>
    </div>
  `;
  document.getElementById('v2-lesson-continue').addEventListener('click', () => completeAndAdvance(mission, index, item));
}

/* ── small inline "Celebrate" confirmation — per the analysis docs'
 * own recommendation ("small in-lesson confirmation, not a full
 * mascot interstitial" — the bigger celebration is the mission-end
 * recap in renderQuizHandoff above). */
function celebrateInline(message) {
  const el = document.getElementById('v2-lesson-content');
  const toast = document.createElement('div');
  toast.className = 'v2-lesson-toast';
  toast.textContent = message;
  el.appendChild(toast);
}

/* ── sequencing ────────────────────────────────────────────────── */

function updateTrack(mission, index) {
  const total = mission.items.length;
  const pct = Math.round((index / total) * 100);
  document.getElementById('v2-lesson-track-fill').style.width = `${pct}%`;
  document.getElementById('v2-lesson-track-label').textContent = `Item ${Math.min(index + 1, total)} of ${total}`;
}

function renderItem(mission, index) {
  if (index >= mission.items.length) {
    // Defensive only — QUIZ is always the last item, and its own
    // renderer doesn't call completeAndAdvance, so this should be
    // unreachable in practice.
    index = mission.items.length - 1;
  }
  updateTrack(mission, index);
  // Priority 2, item 5/6 — recomputed fresh on every render (cheap;
  // same "nothing cached" convention js/data-v2.js's own
  // getMissionStatus() documents) rather than threaded through as a
  // parameter, since renderItem() is the one place every navigation in
  // this file already passes through (initial load, completeAndAdvance,
  // the quiz handoff, and the prev/next buttons below), so the bar
  // always reflects the CURRENT item, not just where the page started.
  const isMissionComplete = window.LWDataV2.getMissionProgress(mission) >= 1;
  updateReviewNav(mission, index, isMissionComplete);
  const item = mission.items[index];
  const plan = window.LWDataV2Loop.planForItem(mission, index, item);

  switch (plan.render) {
    case 'lesson-watch': return renderLessonWatch(mission, index, item, plan);
    case 'lesson-lighter': return renderLessonLighter(mission, index, item, plan);
    case 'booster-recognize': return renderBoosterRecognize(mission, index, item, plan);
    case 'booster-register': return renderBoosterRegister(mission, index, item, plan);
    case 'practice-scenario': return renderPracticeScenario(mission, index, item, plan);
    case 'quiz-handoff': return renderQuizHandoff(mission);
    default: return renderUnknown(mission, index, item);
  }
}

function completeAndAdvance(mission, index, item) {
  window.LWDataV2.markItemComplete(mission, index, item);
  const next = index + 1;
  if (next < mission.items.length) {
    renderItem(mission, next);
  } else {
    renderItem(mission, index); // shouldn't happen — QUIZ is last
  }
}

// Priority 2, item 5 — "Navigation for Completed Missions," per
// explicit follow-up: step one item at a time (‹ Previous / Next ›)
// instead of jumping straight to the very first/last item, so a
// learner reviewing a finished mission can move back and forth through
// it freely. Only wired/unhidden when the mission is already 100%
// complete (getMissionProgress(mission) >= 1, the same definition
// js/data-v2.js's own getMissionStatus() uses for its 'done' state) —
// every in-progress/locked mission never sees this bar at all, so it
// can't be used to bypass required progression there. Called from
// renderItem() itself (not just once from initPage()) so the buttons'
// disabled state and destination index always track whatever item is
// CURRENTLY on screen, not just wherever the learner started.
//
// Priority 2, item 6 — "Review Completed Missions Safely." Both
// buttons call renderItem() directly (a pure re-render of whatever
// index is passed) rather than completeAndAdvance(), so stepping
// through never itself calls markItemComplete(); nothing is written to
// progress just by looking at an item. If the learner clicks a stage's
// own "Continue"/answer button while reviewing, completeAndAdvance()
// does run markItemComplete() as normal — but that function is already
// idempotent (it only pushes an id / sets a completedAt timestamp the
// first time), so re-completing an already-complete item is a safe
// no-op: it can't un-complete, re-order, or change the timestamp of
// anything, so mission completion / chapter unlocks / progress % are
// unaffected by review.
function updateReviewNav(mission, index, isMissionComplete) {
  const bar = document.getElementById('v2-lesson-review-nav');
  if (!bar) return;
  if (!isMissionComplete) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const prevBtn = document.getElementById('v2-lesson-nav-prev');
  const nextBtn = document.getElementById('v2-lesson-nav-next');
  if (prevBtn) {
    prevBtn.disabled = index <= 0;
    prevBtn.onclick = () => renderItem(mission, index - 1);
  }
  if (nextBtn) {
    nextBtn.disabled = index >= mission.items.length - 1;
    nextBtn.onclick = () => renderItem(mission, index + 1);
  }
}

function initPage() {
  const el = document.getElementById('v2-lesson-content');
  if (!window.LWData || !window.LWDataV2 || !window.LWDataV2Loop) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/data.js, js/data-v2.js, and js/v2-lesson-loop.js all loaded.</p>`;
    return;
  }

  const categoryId = getMissionParam();
  const mission = categoryId ? window.LWDataV2.getMissionForCategory(categoryId) : null;

  if (!mission || !mission.items.length) {
    el.innerHTML = `<p class="text-muted">No lesson found for "${escapeHtml(categoryId || '')}" — <a href="v2-learn.html">back to all missions</a>.</p>`;
    return;
  }

  document.getElementById('v2-lesson-exit').href = `v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}`;
  document.title = `${mission.title} — LinguaWave V2 (preview)`;

  // Resume support — getDropOffIndex already exists in js/data-v2.js
  // specifically for "how far did the learner get", just unused by
  // any UI until now.
  let startIndex = window.LWDataV2.getDropOffIndex(mission);
  if (startIndex >= mission.items.length) startIndex = mission.items.length - 1;

  renderItem(mission, startIndex);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
