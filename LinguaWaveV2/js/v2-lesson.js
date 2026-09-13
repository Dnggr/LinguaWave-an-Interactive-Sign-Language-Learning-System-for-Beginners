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
 * QUIZ HANDOFF (consistency fix, widened this session) : mirrors
 * v2-mission-overview.js's own SAMPLE_MASTERY_QUIZ_CHAPTERS split —
 * ALL 12 chapters (asl_foundations/introduce_yourself/
 * express_feelings/daily_actions/describing_things/home_family/
 * school_life/food_nature/clothing_belongings/people_places_time/
 * having_a_conversation/putting_it_together) now hand off to the real
 * v2-mastery-quiz.html (which spends a heart per wrong answer, not on
 * entry) instead of always going to V1's pages/quiz.html. With every
 * chapter now sampled, the V1 pages/quiz.html fallback path is
 * currently unreachable from a real mission link — it stays in place
 * as a defensive fallback only (e.g. a stale/typed URL for a
 * mission outside this list). Without this, the SAME mission's
 * Mastery Quiz button would launch a completely different quiz
 * experience depending on whether the learner clicked it from Mission
 * Overview or from here — see that file's own header for the full
 * scope note. WIDENED this revision (merged from three parallel
 * widenings — was Chapters 1-2, then +3-5, +6-8, and +9-12
 * separately) — keep this array in sync with
 * v2-mission-overview.js's SAMPLE_MASTERY_QUIZ_CHAPTERS and
 * v2-mastery-quiz.js's SAMPLE_CATEGORY_GROUPS.
 *
 * Same data-source discipline as every other v2-*.js file: reads only
 * window.LWData / window.LWDataV2 / window.LWDataV2Loop.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// Mirrors v2-mission-overview.js's own const of the same name — kept
// as a small local re-derivation, same as this file's own existing
// pattern (see its file-header note above).
const SAMPLE_MASTERY_QUIZ_CHAPTERS = [
  'asl_foundations', 'introduce_yourself',
  'express_feelings', 'daily_actions', 'describing_things',
  'home_family', 'school_life', 'food_nature',
  'clothing_belongings', 'people_places_time', 'having_a_conversation', 'putting_it_together',
];

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
  // lesson.html now lives at LinguaWaveV2/pages/lesson.html (moved from
  // V1's pages/ this pass) — same directory as this page, so no more
  // ../../pages/ hop.
  const url = `lesson.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  return `
    <a class="v2-lesson-camera-link" href="${url}" target="_blank" rel="noopener">
      🎥 Practice with your camera <span class="text-muted">(new tab)</span>
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
  // v2-mission-overview.js's usesV2Quiz: ALL 12 chapters go to the
  // real V2-native Mastery Quiz now.
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

/* ── Task 1 — mission intro slide ─────────────────────────────────
 * Duolingo-style "here's what this mission teaches" screen, shown
 * ONCE before a mission's real first item. NOT a mission.items entry
 * — it never calls markItemComplete()/getDropOffIndex(), so it can't
 * affect progress, chapter unlocks, or the recap either way.
 *
 * Content is real, not invented for this screen: mission.goal (what
 * you'll learn) and mission.introMoment.pitch (where/why it's used)
 * are both already built by every buildMissionForCategory() call in
 * js/data-v2.js (§3.7) — they just had no renderer anywhere in the UI
 * until now. Only the curated Greetings pilot has a hand-written
 * pitch; every other mission falls back to data-v2.js's own generic
 * one-liner ("A focused set of N signs, one mission at a time."), so
 * this never shows blank text.
 *
 * mission.introMoment.illustration is a per-mission asset id (only
 * set for Greetings) but no illustration files exist anywhere in this
 * repo yet — rather than pointing an <img> at a path guaranteed to
 * 404, this always shows the same generic decorative icon, same
 * "honest, no invented assets" convention as mediaBlockHtml()'s own
 * fallback above.
 *
 * Called only from initPage() when the learner is about to land on
 * item 0 (see that function) — a genuinely fresh mission, or a review
 * that resets to the start. Resuming mid-mission (getDropOffIndex > 0)
 * skips straight to renderItem(), since "here's what this mission
 * teaches" doesn't make sense to repeat once already underway. */
function renderMissionIntro(mission, startIndex) {
  // Task 3 fix — this screen is a real, counted slide now ("Item 1 of
  // N+1", see updateTrack()'s own header note), and Review Mission's
  // "always looks fully progressed" rule (Task 2) applies here too —
  // a learner reviewing a finished mission should see the bar already
  // full on the intro card, not just once they reach a real item.
  // Review nav (per later follow-up) is no longer forced hidden here
  // either — index -1 identifies this as the intro slide to
  // updateReviewNav()/renderSlide(), so Review Mission's ‹/› buttons
  // (and the arrow-key listener that delegates to them) can step onto
  // and off of the intro slide the same way they already step between
  // real items.
  const isMissionComplete = window.LWDataV2.getMissionProgress(mission) >= 1;
  updateTrack(mission, -1, isMissionComplete);
  updateReviewNav(mission, -1, isMissionComplete);

  const el = document.getElementById('v2-lesson-content');
  const introMoment = mission.introMoment || {};
  el.innerHTML = `
    <div class="v2-lesson-intro">
      <div class="v2-lesson-intro__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 11.5V6a2 2 0 0 0-4 0v5.5"/>
          <path d="M14 10.5V4a2 2 0 0 0-4 0v6.5"/>
          <path d="M10 10.5V6a2 2 0 0 0-4 0v9"/>
          <path d="M6 12.5v-2a2 2 0 0 0-4 0v3.5a8 8 0 0 0 8 8h1.5c2.7 0 4.3-.8 5.8-2.6l3.1-3.7a1.7 1.7 0 0 0-2.4-2.4L15 15.5"/>
        </svg>
      </div>
      <div class="v2-lesson-stage-label">Mission intro</div>
      <h1>${escapeHtml(mission.title)}</h1>
      <p class="v2-lesson-intro__goal">${escapeHtml(mission.goal || '')}</p>
      <div class="v2-lesson-callout v2-lesson-intro__pitch">
        <strong>Where you'll use it:</strong> ${escapeHtml(introMoment.pitch || '')}
      </div>
      <div class="v2-lesson-actions">
        <button type="button" class="btn btn--primary btn--lg" id="v2-lesson-intro-continue">Continue</button>
      </div>
    </div>
  `;
  document.getElementById('v2-lesson-intro-continue').addEventListener('click', () => {
    renderItem(mission, startIndex);
  });
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

// Task 2 — dot marker + Review-Mission "always looks fully progressed"
// behavior, applied to Start Mission too per explicit follow-up.
//
// Task 3 fix — the intro slide (Task 1) now counts as a real, numbered
// slide instead of being invisible to the counter: "Item 1 of N+1" for
// an N-item mission, not "Item 1 of N" (which silently reused item 0's
// own slot/number). `index` is the underlying mission.items index
// (0-based), with -1 meaning the intro slide. displayTotal adds 1 for
// the intro; displayPos is `index + 2` uniformly for every index — it
// happens to map -1 → 1 (intro, "Item 1"), 0 → 2 (first real item,
// "Item 2"), ... last real item → displayTotal ("Item N+1 of N+1",
// i.e. the last slide), with no separate intro-vs-item branch needed.
//
// dotPct is always (displayPos / displayTotal) — this is what moves,
// on EVERY render (including the intro slide itself now), marking
// where the learner currently is. fillPct is the two different
// behaviors: for an in-progress mission (Start Mission) it's the SAME
// value as dotPct, so the bar fills up incrementally — a small sliver
// on the intro slide, growing item by item, reaching 100% (full)
// exactly on the last item. For an already-complete mission (Review
// Mission), fillPct is pinned to 100 regardless of index — including
// the intro slide, per explicit follow-up ("that attached picture is
// from Review Mission, the progress should be full at that intro
// too") — only the dot moves to show the CURRENTLY-viewed slide.
function updateTrack(mission, index, isMissionComplete) {
  const total = mission.items.length;
  const displayTotal = total + 1;
  const displayPos = Math.min(index + 2, displayTotal);
  const dotPct = Math.round((displayPos / displayTotal) * 100);
  const fillPct = isMissionComplete ? 100 : dotPct;
  document.getElementById('v2-lesson-track-fill').style.width = `${fillPct}%`;
  const dot = document.getElementById('v2-lesson-track-dot');
  if (dot) dot.style.left = `${dotPct}%`;
  document.getElementById('v2-lesson-track-label').textContent = `Item ${displayPos} of ${displayTotal}`;
}

function renderItem(mission, index) {
  if (index >= mission.items.length) {
    // Defensive only — QUIZ is always the last item, and its own
    // renderer doesn't call completeAndAdvance, so this should be
    // unreachable in practice.
    index = mission.items.length - 1;
  }
  // Priority 2, item 5/6 — recomputed fresh on every render (cheap;
  // same "nothing cached" convention js/data-v2.js's own
  // getMissionStatus() documents) rather than threaded through as a
  // parameter, since renderItem() is the one place every navigation in
  // this file already passes through (initial load, completeAndAdvance,
  // the quiz handoff, and the prev/next buttons below), so the bar
  // always reflects the CURRENT item, not just where the page started.
  // Task 2's updateTrack() also needs this same flag now (Review
  // Mission's always-full bar vs Start Mission's incremental one).
  const isMissionComplete = window.LWDataV2.getMissionProgress(mission) >= 1;
  updateTrack(mission, index, isMissionComplete);
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

// Per explicit follow-up — "treat [the intro slide] the same as other
// slides, where a user can use Right & Left button": Review Mission's
// ‹/› nav (and the arrow-key listener that delegates to it, below)
// needs one shared way to render "whichever slide is at this position"
// that includes the intro slide, not just real mission.items entries.
// index === -1 is the intro slide; anything >= 0 is a real item index
// — same convention updateTrack()/renderMissionIntro() already use.
function renderSlide(mission, index) {
  if (index < 0) {
    renderMissionIntro(mission, 0);
  } else {
    renderItem(mission, index);
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
// buttons call renderSlide() (a pure re-render of whatever position is
// passed, intro included) rather than completeAndAdvance(), so
// stepping through never itself calls markItemComplete(); nothing is
// written to progress just by looking at a slide. If the learner
// clicks a stage's own "Continue"/answer button while reviewing,
// completeAndAdvance() does run markItemComplete() as normal — but
// that function is already idempotent (it only pushes an id / sets a
// completedAt timestamp the first time), so re-completing an
// already-complete item is a safe no-op: it can't un-complete,
// re-order, or change the timestamp of anything, so mission
// completion / chapter unlocks / progress % are unaffected by review.
//
// Follow-up (intro slide included in the sequence) — index can now be
// -1 (the intro slide, called from renderMissionIntro() itself, not
// just from renderItem()). Previous disables at -1 (nothing before
// the intro); Next still disables at the mission's last item. From
// the intro, Next steps to item 0; from item 0, Previous steps back
// to the intro — the same one-position-at-a-time stepping the rest of
// this bar already does, just extended to cover the intro slide too.
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
    prevBtn.disabled = index <= -1;
    prevBtn.onclick = () => renderSlide(mission, index - 1);
  }
  if (nextBtn) {
    nextBtn.disabled = index >= mission.items.length - 1;
    nextBtn.onclick = () => renderSlide(mission, index + 1);
  }
}

async function initPage() {
  const el = document.getElementById('v2-lesson-content');
  if (!window.LWData || !window.LWDataV2 || !window.LWDataV2Loop) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/data.js, js/data-v2.js, and js/v2-lesson-loop.js all loaded.</p>`;
    return;
  }

  // Reconcile cross-device Firestore progress before computing resume
  // position (getDropOffIndex) — otherwise a lesson could resume from
  // stale pre-sync local progress.
  await window.LWDataV2.whenDataV2SyncReady();

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
  //
  // Review-from-the-start (explicit follow-up) — a learner entering a
  // FINISHED mission (getMissionProgress(mission) >= 1, same 'done'
  // definition used everywhere else in this file) always starts back
  // at item 0, not wherever getDropOffIndex() last left off. Resume
  // (getDropOffIndex) still applies to an in-progress mission, since
  // that's a genuinely different use case ("pick up where I left
  // off," not "review what I already finished").
  const isMissionComplete = window.LWDataV2.getMissionProgress(mission) >= 1;
  let startIndex = isMissionComplete ? 0 : window.LWDataV2.getDropOffIndex(mission);
  if (startIndex >= mission.items.length) startIndex = mission.items.length - 1;

  // Task 1 — the intro slide only makes sense right before item 0
  // (a genuinely fresh mission, or a review that resets to the
  // start per the fix above); resuming mid-mission skips straight to
  // the real item, same as before this task existed.
  if (startIndex === 0) {
    renderMissionIntro(mission, startIndex);
  } else {
    renderItem(mission, startIndex);
  }
}

// Review-nav keyboard support (explicit follow-up) — ArrowLeft/
// ArrowRight step through a completed mission the same as clicking
// the ‹ Previous / Next › buttons themselves. Delegates to the real
// buttons' own .click() (not a duplicate renderItem() call) so a
// disabled button (first/last item) is a no-op here too, same as a
// mouse click on it would be, with zero extra boundary logic to keep
// in sync. Bound once at load, not re-bound per render — updateReviewNav()
// already keeps the buttons' onclick/disabled state current on every
// renderItem() call, so this only needs to find whichever button
// exists right now. Safe to leave listening even when the bar is
// hidden (in-progress mission): bar.hidden short-circuits every key
// press to a no-op.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const bar = document.getElementById('v2-lesson-review-nav');
  if (!bar || bar.hidden) return;
  const btn = document.getElementById(e.key === 'ArrowLeft' ? 'v2-lesson-nav-prev' : 'v2-lesson-nav-next');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  btn.click();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}