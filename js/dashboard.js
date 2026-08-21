/**
 * js/dashboard.js — Live Progress Rendering
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Replaces the hardcoded numbers in pages/dashboard.html
 *            with real values from window.LWProgress: overall percent
 *            complete, signs practiced, per-unit status, the
 *            "Continue Learning" hero destination, and the
 *            "Signs You've Learned" recap grid.
 * CONNECTS : pages/dashboard.html (after js/data.js + js/engine/progress.js)
 * TODO     : Once Firestore is live, LWProgress itself swaps its
 *            storage backend — this file doesn't need to change.
 *
 * REV 4 — PHASE 4: `LEVELS` + `renderLevelCard(level)` + the hardcoded
 * `[data-level-card]` markup in dashboard.html are gone. Progress is
 * rendered from window.LWProgress.getOrderedLiveCategories() (the
 * same flat cross-unit chain js/learn.js's trail view walks) and
 * window.LWData.getUnits() — one aggregate card plus one row per
 * unit, both fully data-driven (no unit hardcoded here), matching
 * SYSTEM_ARCHITECTURE.md Rev 4's "Progress / unlock model changes"
 * section. See PIVOT_CHECKLIST.md Phase 4's last item.
 *
 * DASHBOARD UX REVIEW — PRIORITY 0 #1 (2026-08-21, code session):
 * added the "Continue Learning" hero card (renderContinueCard()) per
 * PIVOT_CHECKLIST.md's "Dashboard UX Review Checklist" → Priority 0
 * item #1 ("Make 'Continue Learning' the primary action").
 *
 * Factored the "find the learner's current unlocked-but-unpassed
 * category" walk out of renderWelcomeBanner() and renderContinueButton()
 * (previously two separate, nearly-identical copies of the same walk)
 * into one shared getCurrentDestination() helper, now also consumed by
 * renderContinueCard(). This keeps the checklist's own "do not create a
 * second progress/unlock algorithm" rule true for the dashboard's OWN
 * code, too, not just the app-wide progress engine.
 *
 * DASHBOARD UX REVIEW — PRIORITY 0 #2 (2026-08-21, same day, code
 * session): "Replace the dashboard's current 'report' feeling." Three
 * of the four checklist sub-items were pure HTML/CSS (moving/demoting
 * the aggregate section — see pages/dashboard.html and
 * css/dashboard.css). The one JS-level change is here:
 * renderWelcomeBanner() used to restate the exact unit/category name
 * the new hero card (Priority 0 #1) already shows one section below it
 * — two places naming the same destination at effectively equal
 * visual weight, which is precisely the checklist's own "avoid showing
 * the same information...three different ways" rule. Simplified below
 * to a short, generic nudge with no destination-specific text; the
 * hero card is now the single canonical place that names where the
 * learner is. `getCurrentDestination()`'s shape and every other
 * function's behavior are UNCHANGED by this — only
 * renderWelcomeBanner()'s own output text changed.
 *
 * NOT part of Priority 0 #2: renderOverallProgress() itself. Its
 * output (a bare "%") is intentionally untouched — relabeling what
 * that number means (vs. mastery) is Priority 0 item #3, still open.
 *
 * BUGFIX (carried over, unrelated to either session above): the OLD
 * renderContinueButton() looped `LEVELS` in a fixed basic→medium→
 * intermediate order, and *within* a level used `liveCategoriesFor(level)`
 * — sorted by that category's own in-level `order` field, NOT by unit.
 * Phase 1 didn't renumber `order` when it introduced `unit` (see
 * AI_MEMORY.md's Phase 1 session log — the `requests` category still
 * has order:9 even though it's unit:4, ahead of unit:5's `family`/
 * `places`/etc, which have order:1-4). Fixed by walking
 * window.LWProgress.getOrderedLiveCategories() directly — already in
 * the correct flat order and doesn't take a level at all. Still true
 * of getCurrentDestination() below, since it's the same walk.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per UNITS entry — same map js/learn.js uses for its trail
// nodes, kept in sync manually (two small copies were judged simpler
// and lower-risk than introducing a shared module/global just for an
// icon lookup — see the Phase 4 session log for the reasoning). Also
// reused by the Continue Learning hero card below.
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

/** Aggregate card in "Overall Progress" — the whole flat chain
 *  combined into one percentage, replacing what used to be three
 *  separate per-level percentages.
 *
 *  NOTE (2026-08-21): this is the "practice progress" number
 *  PIVOT_CHECKLIST.md's Priority 0 item #3 wants explicitly relabeled
 *  (not "mastery"). NOT changed by either the Priority 0 #1 or #2
 *  sessions — item #3 is a separate, still-open item. Flagging here so
 *  it isn't assumed done just because #2 touched this card's CSS
 *  class / position (see pages/dashboard.html and css/dashboard.css). */
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

/**
 * PIVOT_CHECKLIST.md Priority 0 #1 (2026-08-21).
 *
 * Finds the learner's current destination: the first category in the
 * flat cross-unit chain that's unlocked but not yet passed, plus
 * everything the UI needs to describe it (unit, live signs, practiced
 * count, next unpracticed sign).
 *
 * This is the SAME walk that used to be duplicated between
 * renderWelcomeBanner() and renderContinueButton() — factored out here
 * so there's exactly one place that answers "where is the learner /
 * what's next," consumed by three render functions below. No new
 * unlock/ordering rule was introduced; `getOrderedLiveCategories()` /
 * `getCategoryProgress()` / `isCategoryUnlocked()` are the same
 * window.LWProgress calls both prior functions already made.
 *
 * UNCHANGED by the Priority 0 #2 session — only renderWelcomeBanner()'s
 * own output text changed, not what this helper returns.
 *
 * @returns {null | {
 *   chain: object[],
 *   cat: object|null,        // null means every live category is passed (or chain is empty)
 *   unit: object|null,
 *   signs: string[],
 *   prog: object|null,
 *   practicedCount: number,
 *   nextSign: string|null,
 * }}
 */
function getCurrentDestination() {
  if (!window.LWProgress || !window.LWData) return null;
  const chain = window.LWProgress.getOrderedLiveCategories();

  for (const cat of chain) {
    const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    if (!prog.assessment?.passed && window.LWProgress.isCategoryUnlocked(cat.level, cat.id)) {
      const unit = window.LWData.getUnits().find(u => u.order === cat.unit) ?? null;
      const signs = window.LWData.getCategorySigns(cat.level, cat.id);
      const practicedCount = signs.filter(s => !!prog.signs[s]).length;
      const nextSign = signs.find(s => !prog.signs[s]) || signs[0] || null;
      return { chain, cat, unit, signs, prog, practicedCount, nextSign };
    }
  }
  // Every live category in the chain is already passed (or the chain
  // itself is empty — e.g. pre-launch with everything still comingSoon).
  return { chain, cat: null, unit: null, signs: [], prog: null, practicedCount: 0, nextSign: null };
}

/**
 * CHANGED (Priority 0 #2, 2026-08-21, same day as Priority 0 #1).
 * Previously restated the exact unit/category name here too
 * ("You're making great progress on {unit}"), which duplicated the
 * Continue Learning hero card immediately below at effectively equal
 * visual weight — the checklist's own "avoid showing the same
 * information...three different ways" rule. The hero card
 * (renderContinueCard()) is now the single canonical place that names
 * the destination; this banner stays a short, generic nudge instead of
 * a second copy of the same sentence. Still three states, since a flat
 * "Ready to pick up where you left off?" doesn't honestly cover either
 * end of the chain:
 *   - nothing trained at all (chain.length === 0) — generic opener,
 *     no unit name to reference. (Unchanged from before this session —
 *     this branch never named a specific unit to begin with.)
 *   - a real current category exists — one short, non-specific line,
 *     varied only by whether anything's been practiced yet.
 *   - every trained category passed — says so, instead of repeating
 *     the last unit's name forever. (Unchanged from before this
 *     session — also never unit-specific.)
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderWelcomeBanner(destination) {
  const el = document.querySelector('[data-welcome-banner]');
  if (!el || !destination) return;

  if (destination.chain.length === 0) {
    el.textContent = "Let's get you started on your ASL journey!";
    return;
  }

  if (!destination.cat) {
    el.textContent = "You've completed every unit that's trained so far — nice work!";
    return;
  }

  el.textContent = destination.practicedCount > 0
    ? 'Ready to pick up where you left off?'
    : 'Your next lesson is ready when you are.';
}

/** One compact row per unit — the "no more three level cards"
 *  replacement. Deliberately lighter-weight than js/learn.js's own
 *  trail nodes (no full lesson-card treatment, no separate CSS
 *  component reused from there) since this is a secondary summary,
 *  not the primary navigation surface — that's still the trail on
 *  pages/learn.html itself. Already satisfied Priority 0 #2's "keep
 *  the unit list as a compact summary, not the main feature" item
 *  as-is; no change needed here for that session. */
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

/** "Continue Learning" button — points at the first category that's
 *  unlocked but not yet passed. Behavior is UNCHANGED by either
 *  Priority 0 session (same href construction); it just reads the
 *  shared `destination` object instead of re-walking the chain itself.
 *  See the BUGFIX note in the file header for why this doesn't loop
 *  LEVELS.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderContinueButton(destination) {
  const btn = document.querySelector('[data-continue-learning]');
  if (!btn || !destination) return;

  if (!destination.cat) {
    btn.href = 'learn.html';
    return;
  }

  const { cat, nextSign } = destination;
  btn.href = `lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(nextSign)}`;
}

/**
 * PIVOT_CHECKLIST.md Dashboard UX Review Checklist → Priority 0 item #1
 * ("Make 'Continue Learning' the primary action", 2026-08-21).
 *
 * Fills in the hero card: exact destination (Unit + category + next
 * sign), progress WITHIN that destination (not the global aggregate
 * % — that's the separate "Overall Progress" card lower on the page;
 * relabeling that one is Priority 0 item #3, out of scope here), a
 * primary CTA whose LABEL changes with state (Start Lesson / Continue
 * / Review Your Path), and a secondary "Open Path" CTA shown only when
 * there's a specific unit worth linking to (checklist: "secondary CTA
 * only when useful").
 *
 * Does NOT set the primary button's `href` — renderContinueButton()
 * above already owns that, so the two functions don't race to set the
 * same attribute from two different code paths.
 *
 * UNCHANGED by the Priority 0 #2 session.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderContinueCard(destination) {
  const iconEl      = document.querySelector('[data-continue-icon]');
  const eyebrowEl   = document.querySelector('[data-continue-eyebrow]');
  const titleEl     = document.querySelector('[data-continue-title]');
  const progWrapEl  = document.querySelector('[data-continue-progress-wrap]');
  const progFillEl  = document.querySelector('[data-continue-progress-fill]');
  const progLabelEl = document.querySelector('[data-continue-progress-label]');
  const primaryBtn  = document.querySelector('[data-continue-learning]');
  const secondaryBtn = document.querySelector('[data-continue-secondary]');
  if (!destination) return;

  // State: nothing live in the chain at all (defensive — e.g. a
  // fresh Rev 4 install pre-Phase-7 where a whole unit is still
  // comingSoon end-to-end). Shouldn't happen post-launch but costs
  // nothing to handle explicitly rather than showing a blank card.
  if (destination.chain.length === 0) {
    if (iconEl) iconEl.textContent = '👋';
    if (eyebrowEl) eyebrowEl.textContent = 'Get started';
    if (titleEl) titleEl.textContent = "Let's get you started on your ASL journey!";
    if (progWrapEl) progWrapEl.style.display = 'none';
    if (primaryBtn) primaryBtn.textContent = '▶ Start Learning';
    if (secondaryBtn) secondaryBtn.style.display = 'none';
    return;
  }

  // State: every live category in the chain is already passed.
  if (!destination.cat) {
    if (iconEl) iconEl.textContent = '🏆';
    if (eyebrowEl) eyebrowEl.textContent = 'All caught up';
    if (titleEl) titleEl.textContent = "You've completed every unit that's trained so far!";
    if (progWrapEl) progWrapEl.style.display = 'none';
    if (primaryBtn) primaryBtn.textContent = '↺ Review Your Path';
    if (secondaryBtn) secondaryBtn.style.display = 'none';
    return;
  }

  // State: a real next destination exists.
  const { cat, unit, signs, practicedCount, nextSign } = destination;
  const icon = UNIT_ICONS[unit?.id] ?? '🔖';
  const signTitle = window.LWData.getSign?.(cat.level, nextSign)?.title ?? nextSign;

  if (iconEl) iconEl.textContent = icon;
  if (eyebrowEl) eyebrowEl.textContent = unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
  if (titleEl) titleEl.textContent = `${cat.title} → ${signTitle}`;

  if (progWrapEl && progFillEl && progLabelEl && signs.length > 0) {
    const pct = Math.round((practicedCount / signs.length) * 100);
    progWrapEl.style.display = '';
    progFillEl.style.width = `${pct}%`;
    progLabelEl.textContent = `${practicedCount}/${signs.length} signs practiced in ${cat.title}`;
  } else if (progWrapEl) {
    progWrapEl.style.display = 'none';
  }

  if (primaryBtn) primaryBtn.textContent = practicedCount > 0 ? '▶ Continue' : '▶ Start Lesson';

  if (secondaryBtn) {
    secondaryBtn.href = unit ? `learn.html?unit=${encodeURIComponent(unit.id)}` : 'learn.html';
    secondaryBtn.textContent = 'Open Path';
    secondaryBtn.style.display = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[dashboard.js] waiting for progress...');
  await window.LWProgress?.whenProgressReady?.();
  console.log('[dashboard.js] progress ready, rendering now');

  // Computed once, consumed by all three "where's the learner" renders
  // below — see getCurrentDestination()'s doc comment for why this
  // replaced two separate copies of the same walk.
  const destination = getCurrentDestination();

  renderOverallProgress();
  renderWelcomeBanner(destination);
  renderUnitList();
  renderRecap();
  renderContinueButton(destination);
  renderContinueCard(destination);
});