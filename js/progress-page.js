/**
 * js/progress-page.js — Data wiring for pages/progress.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Fills the static placeholders in pages/progress.html
 *            with real values from window.LWProgress/window.LWData.
 *
 * REUSES THE SAME WALKS js/dashboard.js ALREADY ESTABLISHED:
 *   - computeOverallStats() below is a duplicate of dashboard.js's own
 *     function (same body) — dashboard.js doesn't expose it on
 *     `window`, and this repo's own precedent (UNIT_ICONS/LEVEL_GROUPS
 *     being copied into js/learn.js rather than shared) is "a second
 *     small copy is lower-risk than a shared module," so this follows
 *     that same call rather than editing dashboard.js to export one.
 *   - renderReviewEntry() below targets the exact same
 *     [data-review-actions] hook dashboard.js's own renderReviewEntry()
 *     does — pages/progress.html reuses that markup verbatim, so this
 *     is the same function, not a reimplementation of new behavior.
 *
 * HONEST DEVIATIONS FROM THE REFERENCE MOCKUP (flagging on purpose
 * rather than fabricating data that doesn't exist):
 *   - "Review Items Due": the mockup implies a spaced-repetition due
 *     count. This app has no due-date/spaced-repetition data
 *     (window.LWProgress.getAllLearnedSigns() has no timestamp — see
 *     dashboard.js's own renderReviewEntry() comment). Shown instead
 *     as "signs available to review" (up to REVIEW_ENTRY_LIMIT), same
 *     number dashboard.html's Review section already offers.
 *   - "Recent Activity" timestamps ("Today", "Yesterday"): no
 *     timestamps exist in the data, for the same reason above. Shown
 *     as a plain most-recent-first list without invented relative
 *     dates, rather than fabricating "Today"/"2 days ago" labels.
 *
 * LOADING / FAILURE HANDLING: same whenProgressReady() race +
 * timeout + showProgressUnavailable() fallback pattern as
 * js/dashboard.js — see that file's header comment for why the race
 * exists (whenProgressReady() can hang forever if js/auth.js's
 * Firebase import fails to load).
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const PROGRESS_READY_TIMEOUT_MS = 6000;
const REVIEW_ENTRY_LIMIT = 3;
const RECENT_ACTIVITY_LIMIT = 5;

const LEVEL_GROUPS = [
  { level: 'basic', label: 'Level 1 — Alphabet & Numbers' },
  { level: 'medium', label: 'Level 2 — Words & Topics' },
  { level: 'intermediate', label: 'Level 3 — Phrases & Conversations' },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getUnitLevel(unit) {
  if (unit.kind === 'interactive') return 'basic';
  const cats = window.LWData.getCategoriesForUnit(unit.order);
  return cats[0]?.level ?? 'medium';
}

function isUnitDone(unit) {
  if (unit.kind === 'interactive') return !!window.LWProgress.getUnitAssessment?.(unit.id)?.passed;
  if (unit.kind === 'reference') return false;
  const liveCats = window.LWData.getCategoriesForUnit(unit.order)
    .filter(c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0);
  if (liveCats.length === 0) return false;
  return liveCats.every(c => !!window.LWProgress.getCategoryProgress(c.level, c.id)?.assessment?.passed);
}

/** Same body as js/dashboard.js's computeOverallStats() — see this
 *  file's header comment for why it's duplicated rather than shared. */
function computeOverallStats() {
  if (!window.LWProgress || !window.LWData) return null;
  const chain = window.LWProgress.getOrderedLiveCategories();

  let totalSigns = 0, practicedSigns = 0, passedCategories = 0;
  chain.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog  = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns     += signs.length;
    practicedSigns += signs.filter(s => !!prog.signs[s]).length;
    if (prog.assessment?.passed) passedCategories++;
  });

  const pct = totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0;
  return { chain, totalSigns, practicedSigns, passedCategories, pct };
}

function renderHero() {
  const stats = computeOverallStats();
  if (!stats) return;
  const ring = document.getElementById('progress-hero-pct');
  if (ring) {
    ring.style.setProperty('--pct', stats.pct);
    const label = ring.querySelector('.progress-hero-ring__pct');
    if (label) label.textContent = `${stats.pct}%`;
  }

  const learned = window.LWProgress.getAllLearnedSigns();
  const signsEl = document.getElementById('progress-signs-learned');
  if (signsEl) signsEl.textContent = learned.length;

  const quizzesEl = document.getElementById('progress-quizzes-done');
  if (quizzesEl) quizzesEl.textContent = stats.passedCategories;

  // See header comment — no real "due" concept exists in the data;
  // this is "how many review shortcuts are currently available."
  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    if (learned[i]?.level) recent.push(learned[i]);
  }
  const reviewEl = document.getElementById('progress-review-due');
  if (reviewEl) reviewEl.textContent = recent.length;
}

/** Same [data-review-actions] hook + logic as js/dashboard.js's own
 *  renderReviewEntry() — pages/progress.html's "Review Today" card
 *  reuses that exact markup. */
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();
  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    if (learned[i]?.level) recent.push(learned[i]);
  }

  if (recent.length === 0) {
    actionsEl.innerHTML = '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>';
    return;
  }

  actionsEl.innerHTML = recent.map(entry => {
    const signTitle = window.LWData?.getSign?.(entry.level, entry.signId)?.title ?? entry.signId;
    const href = `lesson.html?level=${encodeURIComponent(entry.level)}&category=${encodeURIComponent(entry.category)}&sign=${encodeURIComponent(entry.signId)}`;
    return `<a class="btn btn--secondary btn--sm" href="${href}" data-review-link>↺ ${escapeHtml(signTitle)}</a>`;
  }).join('');
}

function renderProgressByLevel() {
  const container = document.getElementById('progress-by-level-list');
  if (!container || !window.LWData || !window.LWProgress) return;

  const units = window.LWData.getUnits();

  container.innerHTML = LEVEL_GROUPS.map(({ level, label }) => {
    const groupUnits = units.filter(u => getUnitLevel(u) === level);
    if (groupUnits.length === 0) return '';
    const doneCount = groupUnits.filter(isUnitDone).length;
    const pct = groupUnits.length > 0 ? Math.round((doneCount / groupUnits.length) * 100) : 0;
    return `
      <div class="unit-progress-group" style="padding: var(--space-4) var(--space-2);">
        <div class="flex" style="justify-content: space-between; margin-bottom: var(--space-2);">
          <span class="unit-progress-group__label">${escapeHtml(label)}</span>
          <span class="unit-progress-group__meta">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%;" data-progress="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentActivity() {
  const container = document.getElementById('progress-recent-activity');
  if (!container || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();
  if (learned.length === 0) {
    container.innerHTML = '<p class="text-muted">Nothing practiced yet — open a lesson to get started!</p>';
    return;
  }

  // Most-recent-first (see file header — no real timestamps exist).
  const ordered = learned.slice().reverse().slice(0, RECENT_ACTIVITY_LIMIT);
  container.innerHTML = `
    <ul style="list-style:none; display:flex; flex-direction:column; gap: var(--space-3);">
      ${ordered.map(entry => {
        const signTitle = window.LWData?.getSign?.(entry.level, entry.signId)?.title ?? entry.signId;
        return `<li class="flex" style="justify-content:space-between; gap: var(--space-4);">
          <span>Practiced <strong>${escapeHtml(signTitle)}</strong></span>
        </li>`;
      }).join('')}
    </ul>
  `;
}

function showProgressUnavailable(reason) {
  console.error('[progress-page.js] progress data unavailable, showing fallback UI. Reason:', reason);
  const FALLBACK_MSG = "We couldn't load your progress right now.";

  document.getElementById('progress-by-level-list')?.insertAdjacentHTML('beforeend',
    `<div class="alert alert--error">${FALLBACK_MSG} <a href="learn.html">Go to Learn</a> or reload to try again.</div>`);

  const recentEl = document.getElementById('progress-recent-activity');
  if (recentEl) recentEl.innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;

  const reviewActionsEl = document.querySelector('[data-review-actions]');
  if (reviewActionsEl) reviewActionsEl.innerHTML = '<a class="btn btn--ghost" href="learn.html">Go to Learn</a>';
}

// BUGFIX (this session) — same class of bug as dashboard.js's
// initDashboard() fix (see its own comment for the full reasoning):
// a bare `document.addEventListener('DOMContentLoaded', ...)` can be
// registered after that event already fired in some edge cases, which
// leaves this page stuck on its static loading placeholders forever
// with neither the real render below nor showProgressUnavailable()'s
// fallback ever appearing — matching what was reported on this exact
// page. Same readyState guard js/lesson.js/js/quiz.js already use.
async function initProgressPage() {
  const readyPromise = window.LWProgress?.whenProgressReady?.();
  if (readyPromise && typeof readyPromise.then === 'function') {
    await Promise.race([
      readyPromise,
      new Promise((resolve) => setTimeout(resolve, PROGRESS_READY_TIMEOUT_MS)),
    ]);
  }

  if (!window.LWProgress || !window.LWData) {
    showProgressUnavailable('window.LWProgress/window.LWData did not load');
    return;
  }

  try {
    renderHero();
    renderReviewEntry();
    renderProgressByLevel();
    renderRecentActivity();
  } catch (e) {
    console.error('[progress-page.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProgressPage);
} else {
  initProgressPage();
}