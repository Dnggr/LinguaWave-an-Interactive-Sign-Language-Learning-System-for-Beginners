/**
 * js/dashboard.js — Live Progress Rendering
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Replaces the hardcoded numbers in pages/dashboard.html
 *            with real values from window.LWProgress: overall percent
 *            complete, signs practiced, per-unit status, and the
 *            "Signs You've Learned" recap grid.
 * CONNECTS : pages/dashboard.html (after js/data.js + js/engine/progress.js)
 * TODO     : Once Firestore is live, LWProgress itself swaps its
 *            storage backend — this file doesn't need to change.
 *
 * REV 4 — PHASE 4 (this revision): `LEVELS` + `renderLevelCard(level)`
 * + the hardcoded `[data-level-card]` markup in dashboard.html are
 * gone. Progress is now rendered from
 * window.LWProgress.getOrderedLiveCategories() (the same flat
 * cross-unit chain js/learn.js's trail view walks) and
 * window.LWData.getUnits() — one aggregate card plus one row per
 * unit, both fully data-driven (no unit hardcoded here), matching
 * SYSTEM_ARCHITECTURE.md Rev 4's "Progress / unlock model changes"
 * section. See PIVOT_CHECKLIST.md Phase 4's last item.
 *
 * BUGFIX (found while doing the above, not carried over from an
 * earlier phase): the OLD renderContinueButton() looped `LEVELS` in a
 * fixed basic→medium→intermediate order, and *within* a level used
 * `liveCategoriesFor(level)` — sorted by that category's own in-level
 * `order` field, NOT by unit. Phase 1 didn't renumber `order` when it
 * introduced `unit` (see AI_MEMORY.md's Phase 1 session log — the
 * `requests` category still has order:9 even though it's unit:4,
 * ahead of unit:5's `family`/`places`/etc, which have order:1-4). So
 * that loop's in-level order visited `family` (order 1, unit 5)
 * BEFORE `requests` (order 9, unit 4) — backwards from the real
 * trail, where Unit 4 (Everyday Essentials) comes before Unit 5
 * (Common Things & People). On a fresh account this meant "Continue
 * Learning" could point at a category that isn't even unlocked yet
 * while skipping over one that genuinely is. Fixed below by walking
 * window.LWProgress.getOrderedLiveCategories() directly — it's
 * already in the correct flat order and doesn't take a level at all.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per UNITS entry — same map js/learn.js uses for its trail
// nodes, kept in sync manually (two small copies were judged simpler
// and lower-risk than introducing a shared module/global just for an
// icon lookup — see the Phase 4 session log for the reasoning).
const UNIT_ICONS = {
  welcome: '👋', alphabet: '🔤', fingerspell_name: '🖊️', numbers: '🔢',
  everyday_essentials: '🙏', common_things_people: '🗂️',
  basic_phrases: '💬', phrasebook: '📖',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Aggregate card at the top of "Overall Progress" — the whole flat
 *  chain combined into one percentage, replacing what used to be
 *  three separate per-level percentages. */
function renderOverallProgress() {
  if (!window.LWProgress || !window.LWData) return;
  const chain = window.LWProgress.getOrderedLiveCategories();

  const pctEl    = document.querySelector('[data-overall-pct]');
  const barEl    = document.querySelector('[data-overall-progress]');
  const countEl  = document.querySelector('[data-overall-count]');
  const statusEl = document.querySelector('[data-overall-status]');
  if (!pctEl) return;

  let totalSigns = 0, practicedSigns = 0, passedCategories = 0;
  chain.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog  = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns     += signs.length;
    practicedSigns += signs.filter(s => !!prog.signs[s]).length;
    if (prog.assessment?.passed) passedCategories++;
  });

  const pct = totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0;
  pctEl.textContent = `${pct}%`;
  if (barEl) { barEl.dataset.progress = pct; barEl.style.width = `${pct}%`; }
  if (countEl) countEl.textContent = `${practicedSigns} / ${totalSigns || '—'} signs practiced`;
  if (statusEl) {
    statusEl.textContent = chain.length === 0
      ? 'No lessons trained yet.'
      : `${passedCategories} / ${chain.length} category assessments passed`;
  }
}

/** One compact row per unit — the "no more three level cards"
 *  replacement. Deliberately lighter-weight than js/learn.js's own
 *  trail nodes (no full lesson-card treatment, no separate CSS
 *  component reused from there) since this is a secondary summary,
 *  not the primary navigation surface — that's still the trail on
 *  pages/learn.html itself. */
function renderUnitRow(unit) {
  const icon = UNIT_ICONS[unit.id] ?? '🔖';

  if (unit.kind === 'info') {
    return unitRowHtml(icon, unit, 'Welcome & how practice works', 'learn.html?unit=welcome');
  }
  if (unit.kind === 'interactive') {
    return unitRowHtml(icon, unit, 'Practice drill · always open', 'lesson.html?level=basic&category=fingerspell_name');
  }
  if (unit.kind === 'reference') {
    return unitRowHtml(icon, unit, 'Browse only, no quiz yet', 'learn.html?unit=phrasebook');
  }

  // kind: 'category-group'
  const allCats  = window.LWData.getCategoriesForUnit(unit.order);
  const liveCats = allCats.filter(c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0);

  if (liveCats.length === 0) {
    return unitRowHtml(icon, unit, 'Coming soon', null, 'locked');
  }

  const unlocked = window.LWProgress.isCategoryUnlocked(liveCats[0].level, liveCats[0].id);
  if (!unlocked) {
    return unitRowHtml(icon, unit, 'Locked — finish the previous unit first', null, 'locked');
  }

  const passedCount = liveCats.filter(c => !!window.LWProgress.getCategoryProgress(c.level, c.id).assessment?.passed).length;
  const done = passedCount === liveCats.length;
  const href = `learn.html?unit=${encodeURIComponent(unit.id)}`;
  return unitRowHtml(icon, unit, `${passedCount}/${liveCats.length} categories passed`, href, done ? 'done' : 'current');
}

function unitRowHtml(icon, unit, statusText, href, state) {
  const stateClass = state ? ` unit-progress-row--${state}` : '';
  const inner = `
    <span class="unit-progress-row__icon">${icon}</span>
    <span class="unit-progress-row__body">
      <span class="unit-progress-row__title">Unit ${unit.order} · ${escapeHtml(unit.title)}</span>
      <span class="unit-progress-row__status">${escapeHtml(statusText)}</span>
    </span>
  `;
  return href
    ? `<a class="unit-progress-row${stateClass}" href="${href}">${inner}</a>`
    : `<div class="unit-progress-row${stateClass}">${inner}</div>`;
}

function renderUnitList() {
  const container = document.getElementById('unit-progress-list');
  if (!container || !window.LWData || !window.LWProgress) return;
  container.innerHTML = window.LWData.getUnits().map(renderUnitRow).join('');
}

function renderRecap() {
  const grid  = document.getElementById('recap-grid');
  const empty = document.getElementById('recap-empty');
  if (!grid || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();
  if (learned.length === 0) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  // BUG FIX (2026-08-20, review session): this used to render signId
  // twice per card — once inside .recap-card__img's pill and again in
  // a sibling <span> — showing as "A A" / "Y Y" / "Z Z" etc. The pill
  // was redesigned (see css/dashboard.css's own BUG FIX comment above
  // .recap-card__img) specifically to be a self-contained chip that
  // already shows the full sign text, including multi-word entries
  // like "I AM FINE" — the extra <span> was a leftover from before
  // that redesign. Removed rather than kept-but-hidden, since nothing
  // else in css/dashboard.css targets a bare <span> inside .recap-card.
  grid.innerHTML = learned.slice(-24).reverse().map(({ signId }) => `
    <div class="recap-card">
      <div class="recap-card__img" aria-label="ASL sign for ${signId}">${signId}</div>
    </div>
  `).join('');
}

/** "Continue Learning" button — walks the flat chain and points at the
 *  first category that's unlocked but not yet passed. See the BUGFIX
 *  note in the file header for why this no longer loops LEVELS. */
function renderContinueButton() {
  const btn = document.querySelector('[data-continue-learning]');
  if (!btn || !window.LWProgress) return;

  const chain = window.LWProgress.getOrderedLiveCategories();
  for (const cat of chain) {
    const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    if (!prog.assessment?.passed && window.LWProgress.isCategoryUnlocked(cat.level, cat.id)) {
      const signs = window.LWData.getCategorySigns(cat.level, cat.id);
      const nextSign = signs.find(s => !prog.signs[s]) || signs[0];
      btn.href = `lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(nextSign)}`;
      return;
    }
  }
  btn.href = 'learn.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[dashboard.js] waiting for progress...');
  await window.LWProgress?.whenProgressReady?.();
  console.log('[dashboard.js] progress ready, rendering now');

  renderOverallProgress();
  renderUnitList();
  renderRecap();
  renderContinueButton();
});