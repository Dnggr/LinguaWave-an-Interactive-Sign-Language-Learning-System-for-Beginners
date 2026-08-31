/**
 * js/dashboard.js — Dashboard Rendering
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Fills pages/dashboard.html with real values from
 *            window.LWProgress/window.LWData: the "Continue Learning"
 *            hero card, Overall Progress, the 4-tile Progress
 *            Snapshot, the Learning Path unit list, the "Signs You've
 *            Learned" recap grid, and Review shortcuts.
 * CONNECTS : pages/dashboard.html, loaded after js/data.js and
 *            js/engine/progress.js.
 *
 * SHARED WALKS — read this before adding a new render function:
 *   - getCurrentDestination() is the ONE walk of the learner's
 *     progress chain ("what's the next unlocked-but-not-passed
 *     category"). renderContinueButton(), renderContinueCard(),
 *     renderCurrentUnit(), renderStatsSnapshot(), and renderUnitList()
 *     all take its result as a parameter rather than re-walking the
 *     chain themselves — if you need "where is the learner" for a new
 *     tile, pass `destination` in, don't recompute it.
 *   - computeOverallStats() and getCurrentUnitLabel() are the same
 *     pattern for their own smaller pieces of state (each has exactly
 *     2 call sites). Keep it that way — a third copy of either walk is
 *     a sign something should take the existing helper as a param
 *     instead.
 *
 * LOADING / FAILURE HANDLING: window.LWProgress.whenProgressReady()
 * can hang indefinitely if js/auth.js's Firebase import fails to load
 * (confirmed with a real Playwright run — root cause lives in
 * js/auth.js / js/engine/progress.js, neither of which this file
 * touches). The DOMContentLoaded handler below races that promise
 * against PROGRESS_READY_TIMEOUT_MS and renders from whatever's
 * already in localStorage on timeout — every render function reads
 * synchronously from local storage regardless, so this is safe for
 * the common case. showProgressUnavailable() is the true empty-state
 * fallback: window.LWProgress/LWData never loaded, or a render
 * function threw. No window.LWAuth call, login/logout/redirect, or
 * session logic exists anywhere in this file — auth stays out of this
 * page's job on purpose.
 *
 * ACCESSIBILITY: unit rows carry real `aria-label`s (built in
 * unitRowHtml(), not a generic linearized string), there's a skip
 * link straight to the Continue Learning CTA at the top of
 * pages/dashboard.html, and interactive rows show a visible
 * keyboard-focus ring (css/dashboard.css). Not yet verified with an
 * actual screen reader — flag this for a real accessibility pass.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// Same map js/learn.js uses for its trail nodes, kept in sync
// manually — two small copies were judged simpler and lower-risk than
// a shared module just for an icon lookup. Also reused by the
// Continue Learning hero card below.
const UNIT_ICONS = {
  alphabet: '🔤', fingerspell_name: '🖊️', numbers: '🔢',
  greetings: '👋', polite_words: '🙌', people: '🧑‍🤝‍🧑', feelings: '😊',
  needs: '🥤', actions: '🏃', hand_actions: '🤲', communication: '🗣️',
  body: '🧍', personal_information: '🪪', colors_unit: '🎨', shapes: '🔺',
  size: '📏', appearance: '✨', touch: '🌡️', taste: '👅', sound: '🔊',
  descriptions: '📝', family_unit: '👪', home: '🏠', furniture: '🛋️',
  household: '🪟', bathroom: '🚿', kitchen: '🍳', school: '🏫',
  school_supplies: '✏️', classroom: '📋', classroom_actions: '🙋',
  subjects: '📚', food_unit: '🍽️', fruits: '🍎', vegetables: '🥕',
  snacks: '🍪', drinks: '🥤', animals_unit: '🐾', wild_animals: '🦁',
  insects: '🐝', clothes_unit: '👕', dressing: '🧺', personal_items: '🎒',
  nature: '🌳', plants: '🌱', weather: '⛅', seasons: '🍂',
  places_unit: '🗺️', vehicles: '🚗', transportation: '🚶',
  professions: '👷', community: '🏙️', time_unit: '⏰', daytime: '🌅',
  days: '📅', months: '🗓️', sequence: '🔢', frequency: '🔁',
  location: '📍', distance: '📐', directions: '🧭', social: '🤝',
  manners: '🙇', turn_taking: '🔄', responses: '💬', questions: '❓',
  conversation: '💭', requests_unit: '🙋', answers: '✅',
  basic_phrases: '💬', phrasebook: '📖',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Aggregate stats for the whole flat live-category chain — one
 * percentage instead of three separate per-level ones. Factored out
 * of renderOverallProgress() so renderStatsSnapshot() below can read
 * the same numbers without a second walk of
 * window.LWProgress.getOrderedLiveCategories().
 *
 * @returns {null | {
 *   chain: object[],
 *   totalSigns: number,
 *   practicedSigns: number,
 *   passedCategories: number,
 *   pct: number,
 * }}
 */
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

function renderOverallProgress() {
  const stats = computeOverallStats();
  if (!stats) return;
  const { chain, totalSigns, practicedSigns, passedCategories, pct } = stats;

  const pctEl    = document.querySelector('[data-overall-pct]');
  const barEl    = document.querySelector('[data-overall-progress]');
  const countEl  = document.querySelector('[data-overall-count]');
  const statusEl = document.querySelector('[data-overall-status]');

  // Mockup alignment pass (2026-08-31): the new "Your Progress" hero
  // card (pages/dashboard.html) has its own ring + pct label, separate
  // DOM nodes from the ones above — same computeOverallStats() call,
  // so the two can never disagree. Guarded independently of `pctEl`
  // below so this still runs on pages that only have one of the two
  // (there are none today, but keeps this function safe if that
  // changes later).
  const heroRingEl = document.querySelector('[data-hero-ring]');
  const heroPctEl  = document.querySelector('[data-hero-pct]');
  if (heroRingEl) heroRingEl.style.setProperty('--pct', pct);
  if (heroPctEl)  heroPctEl.textContent = `${pct}%`;

  if (!pctEl) return;

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
 * Finds the learner's current destination: the first category in the
 * flat cross-unit chain that's unlocked but not yet passed, plus
 * everything the UI needs to describe it (unit, live signs, practiced
 * count, next unpracticed sign). The single shared "where is the
 * learner" computation — see this file's header comment.
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
      // A category can be fully practiced (progress bar full) but
      // still unpassed if the assessment itself hasn't been taken —
      // `readyForAssessment` flags that so callers don't send the
      // learner back to sign #1 at 26/26 practiced.
      const readyForAssessment = signs.length > 0 && practicedCount === signs.length;
      return { chain, cat, unit, signs, prog, practicedCount, nextSign, readyForAssessment };
    }
  }
  // Every live category in the chain is already passed (or the chain
  // itself is empty — e.g. pre-launch with everything still comingSoon).
  return { chain, cat: null, unit: null, signs: [], prog: null, practicedCount: 0, nextSign: null, readyForAssessment: false };
}

/**
 * Three-state label for "where the learner currently is": nothing
 * started / everything complete / "Unit N · Title". Shared by the
 * "Your Account" card (renderCurrentUnit()) and the "Current Unit"
 * stat tile (renderStatsSnapshot()) so they can never disagree.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 * @returns {string}
 */
function getCurrentUnitLabel(destination) {
  if (!destination || destination.chain.length === 0) return 'Not started yet';
  if (!destination.cat) return 'All units complete';
  const { cat, unit } = destination;
  return unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
}

function renderCurrentUnit(destination) {
  const el = document.querySelector('[data-user-unit]');
  if (!el || !destination) return;
  el.textContent = getCurrentUnitLabel(destination);
}

/**
 * Fills the 4-tile "Progress Snapshot" grid: Practice Progress,
 * Assessments Passed, Signs Practiced, Current Unit. Reuses
 * computeOverallStats() and getCurrentUnitLabel() rather than
 * re-deriving any of these numbers a second way, so this grid can
 * never drift out of sync with the Overall Progress card or the Your
 * Account card, which read the same two functions.
 *
 * "Signs Practiced" uses computeOverallStats()'s chain-scoped count —
 * NOT window.LWProgress.getAllLearnedSigns().length, the broader
 * number renderRecap() shows. The two differ in principle
 * (getAllLearnedSigns() includes signs outside the live grading chain)
 * but serve different jobs: this row is "progress through the current
 * curriculum," renderRecap() is "everything you've ever practiced."
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderStatsSnapshot(destination) {
  const stats = computeOverallStats();
  if (!stats) return;

  const pctEl    = document.querySelector('[data-stat-practice-pct]');
  const assessEl = document.querySelector('[data-stat-assessments]');
  const signsEl  = document.querySelector('[data-stat-signs]');
  const unitEl   = document.querySelector('[data-stat-unit]');

  // Mockup alignment pass (2026-08-31): "Your Progress" hero card's
  // Signs Learned / Quizzes Completed tiles — same numbers as
  // data-stat-signs/data-stat-assessments above, written to their own
  // elements so both the compact hero card and the detailed stats
  // grid further down the page stay in sync from one computation.
  const heroSignsEl = document.querySelector('[data-hero-signs]');
  const heroAssessEl = document.querySelector('[data-hero-assessments]');
  if (heroSignsEl)  heroSignsEl.textContent = `${stats.practicedSigns}`;
  if (heroAssessEl) heroAssessEl.textContent = `${stats.passedCategories}`;

  if (!pctEl && !assessEl && !signsEl && !unitEl) return;

  if (pctEl)    pctEl.textContent = `${stats.pct}%`;
  if (assessEl) assessEl.textContent = `${stats.passedCategories}/${stats.chain.length}`;
  if (signsEl)  signsEl.textContent = `${stats.practicedSigns}`;
  if (unitEl)   unitEl.textContent = getCurrentUnitLabel(destination);
}

/**
 * Short, generic nudge above the Continue Learning hero card.
 * Deliberately does NOT name the specific unit/category — the hero
 * card (renderContinueCard()) is the one canonical place that does,
 * so this banner isn't a second copy of the same sentence.
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

/** One compact row per unit, aggregating existing unit/category
 *  progress APIs — deliberately lighter-weight than js/learn.js's own
 *  course cards, since this is a secondary summary, not the primary
 *  navigation surface (that's still pages/learn.html itself). */
function renderUnitRow(unit, destination) {
  const icon = UNIT_ICONS[unit.id] ?? '🔖';
  const isCurrentUnit = !!destination?.unit && destination.unit.order === unit.order;
  // Short suffix appended to a row's aria-label when it's the
  // learner's current unit, shared across the branches below so
  // "you are here" isn't spelled three different ways.
  const hereSuffix = isCurrentUnit ? ', you are here' : '';

  if (unit.kind === 'interactive') {
    return unitRowHtml(icon, unit, 'Practice drill · always open',
      'lesson.html?level=basic&category=fingerspell_name',
      isCurrentUnit ? 'current' : null, {
        current: isCurrentUnit,
        ariaLabel: `Open Unit ${unit.order}: ${unit.title} — practice drill, always open${hereSuffix}`,
      });
  }

  if (unit.kind === 'reference') {
    return unitRowHtml(icon, unit, 'Browse only, no assessment yet',
      'learn.html?unit=phrasebook', null, {
        reference: true,
        ariaLabel: `Open Unit ${unit.order}: ${unit.title} — reference, browse only, no assessment yet`,
      });
  }

  const allCats  = window.LWData.getCategoriesForUnit(unit.order);
  const liveCats = allCats.filter(
    c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0
  );

  if (liveCats.length === 0) {
    return unitRowHtml(icon, unit, 'Coming soon', null, 'locked');
  }

  const unlocked = window.LWProgress.isCategoryUnlocked(liveCats[0].level, liveCats[0].id);
  if (!unlocked) {
    return unitRowHtml(icon, unit, 'Locked · finish the previous unit first', null, 'locked');
  }

  let totalSigns = 0;
  let practicedSigns = 0;
  let passedCount = 0;

  liveCats.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns += signs.length;
    practicedSigns += signs.filter(sign => !!prog.signs?.[sign]).length;
    if (prog.assessment?.passed) passedCount++;
  });

  const assessmentTotal = liveCats.length;
  const practicePct = totalSigns > 0
    ? Math.round((practicedSigns / totalSigns) * 100)
    : 0;
  const done = passedCount === assessmentTotal;
  const state = done ? 'done' : (isCurrentUnit ? 'current' : null);
  const href = `learn.html?unit=${encodeURIComponent(unit.id)}`;

  // Reuses destination.cat / destination.nextSign — the same fields
  // renderContinueCard() reads for the hero card's "{category} →
  // {sign}" line — instead of a second walk. isCurrentUnit guarantees
  // destination.cat belongs to THIS unit, so no extra matching needed.
  // readyForAssessment mirrors getCurrentDestination()'s own flag —
  // without it, a fully-practiced-but-unassessed unit's "Next: …"
  // detail would misleadingly point back at sign #1, even though the
  // hero card above it correctly says "Take the assessment."
  const currentSignLabel = isCurrentUnit && destination.cat
    ? (destination.readyForAssessment
        ? `${destination.cat.title} → Take the assessment`
        : `${destination.cat.title} → ${window.LWData.getSign?.(destination.cat.level, destination.nextSign)?.title ?? destination.nextSign}`)
    : null;

  // aria-label for the graded case, built from the exact numbers the
  // visible row already renders: "completed" once
  // passedCount===assessmentTotal (matches doneBadge below), otherwise
  // the practiced/passed fractions, plus the "you are here"/"next"
  // suffix on the current row.
  const assessmentWord = `category assessment${assessmentTotal === 1 ? '' : 's'}`;
  const ariaStatus = done
    ? `completed, ${passedCount} of ${assessmentTotal} ${assessmentWord} passed`
    : `${practicedSigns} of ${totalSigns} signs practiced, ${passedCount} of ${assessmentTotal} ${assessmentWord} passed`;
  const ariaLabel = `Open Unit ${unit.order}: ${unit.title} — ${ariaStatus}${hereSuffix}` +
    (isCurrentUnit && currentSignLabel ? `, next: ${currentSignLabel}` : '');

  return unitRowHtml(icon, unit, '', href, state, {
    current: isCurrentUnit,
    done,
    currentDetail: currentSignLabel,
    practicePct,
    practicedSigns,
    totalSigns,
    passedCount,
    assessmentTotal,
    ariaLabel,
  });
}

function unitRowHtml(icon, unit, statusText, href, state, metrics = {}) {
  const stateClass = state ? ` unit-progress-row--${state}` : '';
  const currentBadge = metrics.current
    ? '<span class="unit-progress-row__current-badge">You are here</span>'
    : '';
  const referenceBadge = metrics.reference
    ? '<span class="unit-progress-row__reference-badge">Reference</span>'
    : '';
  // A fully-done row (passedCount === assessmentTotal) has no
  // non-color "finished" signal otherwise — only the left
  // border/background flips to --clr-success. Same badge shape as
  // currentBadge/referenceBadge, see css/dashboard.css.
  const doneBadge = metrics.done
    ? '<span class="unit-progress-row__done-badge">✓ Completed</span>'
    : '';
  // Set alongside currentBadge only — see renderUnitRow() for where
  // this string comes from.
  const currentDetailMarkup = metrics.currentDetail
    ? `<span class="unit-progress-row__current-detail">Next: ${escapeHtml(metrics.currentDetail)}</span>`
    : '';

  const practiceMarkup = Number.isFinite(metrics.practicePct)
    ? `
        <div class="unit-progress-row__progress" aria-label="${metrics.practicePct}% practice progress">
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-bar__fill" style="width:${metrics.practicePct}%"></div>
          </div>
          <span class="unit-progress-row__metric">${metrics.practicedSigns}/${metrics.totalSigns} signs practiced</span>
        </div>
        <span class="unit-progress-row__assessment">
          ${metrics.passedCount}/${metrics.assessmentTotal} category assessment${metrics.assessmentTotal === 1 ? '' : 's'} passed
        </span>
      `
    : `<span class="unit-progress-row__status">${escapeHtml(statusText)}</span>`;

  const inner = `
    <span class="unit-progress-row__icon" aria-hidden="true">${icon}</span>
    <span class="unit-progress-row__body">
      <span class="unit-progress-row__head">
        <span class="unit-progress-row__title">Unit ${unit.order} · ${escapeHtml(unit.title)}</span>
        ${currentBadge}${doneBadge}${referenceBadge}
      </span>
      ${currentDetailMarkup}
      ${practiceMarkup}
    </span>
  `;

  // Every linked row gets an explicit aria-label ("Open Unit N:
  // {title} — …") so a screen reader doesn't linearize the row's
  // visible text into one run-on string with no verb. Only applied
  // when `href` exists — locked/"coming soon" rows render as plain
  // <div>s and were never focusable.
  const ariaAttr = href && metrics.ariaLabel
    ? ` aria-label="${escapeHtml(metrics.ariaLabel)}"`
    : '';

  return href
    ? `<a class="unit-progress-row${stateClass}" href="${href}"${ariaAttr}>${inner}</a>`
    : `<div class="unit-progress-row${stateClass}">${inner}</div>`;
}

/** Which of the 3 broad levels a unit belongs to — same grouping
 *  js/learn.js's trail uses, kept as its own small copy here rather
 *  than a shared import (same call already made for UNIT_ICONS). */
const LEVEL_GROUPS = [
  { level: 'basic', label: 'Alphabet & Numbers' },
  { level: 'medium', label: 'Words & Topics' },
  { level: 'intermediate', label: 'Phrases & Conversations' },
];
function getUnitLevel(unit) {
  if (unit.kind === 'interactive') return 'basic';
  const cats = window.LWData.getCategoriesForUnit(unit.order);
  return cats[0]?.level ?? 'medium';
}

/** Cheap "is this whole unit finished" check for a group's summary
 *  count — mirrors renderUnitRow()'s own done logic without
 *  duplicating its full markup-building work. */
function isUnitDone(unit) {
  if (unit.kind === 'interactive') return !!window.LWProgress.getUnitAssessment?.(unit.id)?.passed;
  if (unit.kind === 'reference') return false;
  const liveCats = window.LWData.getCategoriesForUnit(unit.order)
    .filter(c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0);
  if (liveCats.length === 0) return false;
  return liveCats.every(c => !!window.LWProgress.getCategoryProgress(c.level, c.id)?.assessment?.passed);
}

/**
 * BUG FIX (this pass): this list is 71 units rendered flat — the
 * literal "dashboard is so long because of the Learning Path"
 * complaint. Grouped into the same 3 collapsible <details> sections
 * learn.js's trail now uses (LEVEL_GROUPS above), opened to whichever
 * section contains the learner's current unit. renderUnitRow()/
 * unitRowHtml() are completely unchanged — this only changes how
 * their output is grouped and wrapped.
 */
function renderUnitList(destination) {
  const container = document.getElementById('unit-progress-list');
  if (!container || !window.LWData || !window.LWProgress) return;

  const units = window.LWData.getUnits();
  const openLevel = destination?.unit ? getUnitLevel(destination.unit) : 'basic';

  container.innerHTML = LEVEL_GROUPS.map(({ level, label }) => {
    const groupUnits = units.filter(u => getUnitLevel(u) === level);
    if (groupUnits.length === 0) return '';
    const doneCount = groupUnits.filter(isUnitDone).length;
    const isOpen = level === openLevel;
    return `
      <details class="unit-progress-group"${isOpen ? ' open' : ''}>
        <summary class="unit-progress-group__summary">
          <span class="unit-progress-group__label">${escapeHtml(label)}</span>
          <span class="unit-progress-group__meta">${doneCount}/${groupUnits.length} complete</span>
        </summary>
        <div class="unit-progress-group__rows">
          ${groupUnits.map(unit => renderUnitRow(unit, destination)).join('')}
        </div>
      </details>
    `;
  }).join('');
}

/**
 * Renders the "Signs You've Learned" recap grid from
 * window.LWProgress.getAllLearnedSigns(). Each chip shows the raw
 * signId only (no title/category lookup) by design — kept lightweight
 * rather than a second lesson browser. [data-recap-count] shows a
 * running total; [data-recap-foot]/[data-recap-toggle] only appear
 * once there are more than RECAP_COLLAPSED_LIMIT signs to reveal, and
 * "View all" expands the same grid in place rather than navigating
 * anywhere.
 */
const RECAP_COLLAPSED_LIMIT = 24;

// Toggle state for the "View all" control. Module-level (not a
// closure-local) because the click handler and renderRecap() both need
// to read/flip it, and renderRecap() is the one function that already
// owns re-rendering the grid — simplest to have the toggle just flip
// this and call the same render function again, rather than duplicating
// the chip-building markup in a second place.
let recapExpanded = false;

function renderRecap() {
  const grid     = document.getElementById('recap-grid');
  const empty    = document.getElementById('recap-empty');
  const countEl  = document.querySelector('[data-recap-count]');
  const footEl   = document.querySelector('[data-recap-foot]');
  const toggleEl = document.querySelector('[data-recap-toggle]');
  if (!grid || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();

  if (learned.length === 0) {
    // #recap-empty starts as a neutral "Loading…" placeholder (see
    // pages/dashboard.html) so it can't be mistaken for the genuine
    // "nothing practiced yet" state while progress is still loading —
    // overwrite it with the real empty-state copy here, explicitly.
    if (empty) {
      empty.textContent = 'Nothing practiced yet — open a lesson to get started!';
      empty.classList.remove('dash-loading-pulse');
      empty.style.display = '';
    }
    if (countEl) countEl.textContent = '';
    if (footEl) footEl.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';

  if (countEl) {
    countEl.textContent = `${learned.length} sign${learned.length === 1 ? '' : 's'} practiced`;
  }

  // Most-recently-practiced first — same insertion-order assumption
  // the old `.slice(-24).reverse()` already relied on (see
  // renderReviewEntry()'s doc comment for why that assumption holds).
  const ordered = learned.slice().reverse();
  const visible = recapExpanded ? ordered : ordered.slice(0, RECAP_COLLAPSED_LIMIT);

  grid.innerHTML = visible.map(({ signId }) => `
    <div class="recap-card">
      <div class="recap-card__img" aria-label="ASL sign for ${signId}">${signId}</div>
    </div>
  `).join('');

  const canToggle = ordered.length > RECAP_COLLAPSED_LIMIT;
  if (footEl && toggleEl) {
    footEl.style.display = canToggle ? '' : 'none';
    if (canToggle) {
      toggleEl.textContent = recapExpanded ? 'Show fewer' : `View all ${ordered.length}`;
    }
  }
}

/** Click handler for [data-recap-toggle] — flips recapExpanded and
 *  re-renders the SAME grid (see renderRecap()'s doc comment for why
 *  this expands in place rather than navigating anywhere). Bound
 *  once in DOMContentLoaded, not inside renderRecap() itself, so it
 *  doesn't get re-attached (and double-fire) on every re-render. */
function handleRecapToggle() {
  recapExpanded = !recapExpanded;
  renderRecap();
}

/**
 * "Review" shortcuts: up to REVIEW_ENTRY_LIMIT most-recently-practiced
 * signs, each linking straight back to that sign in lesson.html. Not a
 * spaced-repetition trainer — just the last few signs practiced.
 * window.LWProgress.getAllLearnedSigns() has no timestamp, but JS
 * preserves object-key insertion order, so reading from the END of the
 * array gives most-recent-first. Renders a disabled placeholder
 * instead of a button when nothing's been practiced yet — same
 * `href ? <a> : <div>` "never link to something broken" pattern
 * unitRowHtml() uses for locked units.
 */
const REVIEW_ENTRY_LIMIT = 3;

function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();

  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    const entry = learned[i];
    if (entry && entry.level) recent.push(entry);
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

/** Sets the Continue Learning hero button's href: the first unlocked
 *  but not-yet-passed category, or the assessment once every sign in
 *  it is practiced.
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

  const { cat, nextSign, readyForAssessment } = destination;
  // Once every sign in the category is practiced, the real next step
  // is the assessment (same quiz.html URL learn.js/lesson.js use),
  // not another pass at signs[0].
  btn.href = readyForAssessment
    ? `quiz.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}`
    : `lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(nextSign)}`;
}

/**
 * Fills in the Continue Learning hero card: exact destination (Unit +
 * category + next sign), progress WITHIN that destination (the
 * separate "Overall Progress" card lower on the page owns the global
 * aggregate %), and a primary CTA whose label changes with state
 * (Start Lesson / Continue / Take Assessment / Review Your Path).
 * Does NOT set the primary button's `href` — renderContinueButton()
 * owns that, so the two functions don't race on the same attribute.
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

  // The static pre-JS markup carries `dash-loading-pulse` on the
  // eyebrow so it visibly animates while this card is waiting (see
  // pages/dashboard.html) — strip it once here rather than in all 3
  // branches below.
  if (eyebrowEl) eyebrowEl.classList.remove('dash-loading-pulse');

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
  const { cat, unit, signs, practicedCount, nextSign, readyForAssessment } = destination;
  const icon = UNIT_ICONS[unit?.id] ?? '🔖';

  // A fully-practiced-but-unassessed category gets its own state
  // rather than falling into the generic branch below (which would
  // read nextSign as signs[0] and misleadingly show "Alphabet →
  // Letter A" at 26/26 practiced). Progress bar stays full instead of
  // hiding, so that context isn't lost.
  if (readyForAssessment) {
    if (iconEl) iconEl.textContent = '📝';
    if (eyebrowEl) eyebrowEl.textContent = unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
    if (titleEl) titleEl.textContent = `${cat.title} → Take the assessment`;
    if (progWrapEl && progFillEl && progLabelEl) {
      progWrapEl.style.display = '';
      progFillEl.style.width = '100%';
      progLabelEl.textContent = `${practicedCount}/${signs.length} signs practiced — ready for assessment`;
    }
    if (primaryBtn) primaryBtn.textContent = '📝 Take Assessment';
    if (secondaryBtn) {
      secondaryBtn.href = unit ? `learn.html?unit=${encodeURIComponent(unit.id)}` : 'learn.html';
      secondaryBtn.textContent = unit ? `Open Unit ${unit.order} Path` : 'Open Path';
      secondaryBtn.style.display = '';
    }
    return;
  }

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
    // Names the specific unit rather than a generic "Open Path", same
    // `unit` field the eyebrow line already shows. The plain "Open
    // Path" fallback is unreachable today (both no-`unit` branches
    // above already hide this button) — kept only for defensiveness.
    secondaryBtn.textContent = unit ? `Open Unit ${unit.order} Path` : 'Open Path';
    secondaryBtn.style.display = '';
  }
}

// whenProgressReady() has no rejection path and can hang forever if
// js/auth.js's Firebase import fails to load (confirmed with a real
// Playwright run — see this file's header). This bounds how long the
// DOMContentLoaded handler below waits before giving up and rendering
// from whatever's already in localStorage instead.
const PROGRESS_READY_TIMEOUT_MS = 6000;

/**
 * The true "nothing to render" fallback: window.LWProgress/LWData
 * never loaded at all, or a render function threw partway through.
 * NOT called just because whenProgressReady() was slow — see the
 * DOMContentLoaded handler for why a slow-but-unresolved hydration
 * instead falls through to rendering from localStorage.
 *
 * Reuses css/style.css's existing `.alert`/`.alert--error` component
 * (same pattern toast.css/quiz.css use) rather than inventing new
 * error styling. Every message keeps the learner able to move — a
 * working Reload action, a Go to Learn link — instead of a dead end.
 * Touches only this page's own presentational state: no
 * window.LWAuth call, no login/logout/redirect/session logic.
 *
 * @param {string} reason - console-only diagnostic; never shown to the learner.
 */
function showProgressUnavailable(reason) {
  console.error('[dashboard.js] progress data unavailable, showing fallback UI. Reason:', reason);

  const FALLBACK_MSG = "We couldn't load your progress right now.";

  // Continue Learning hero card — the page's primary action, so it
  // gets the most complete treatment: a clear message, a Reload button
  // that actually works (a fresh load re-runs hydration from scratch,
  // the one thing guaranteed to help), and a Learn link that doesn't
  // depend on progress data loading at all.
  const eyebrowEl     = document.querySelector('[data-continue-eyebrow]');
  const titleEl       = document.querySelector('[data-continue-title]');
  const progWrapEl    = document.querySelector('[data-continue-progress-wrap]');
  const primaryBtn    = document.querySelector('[data-continue-learning]');
  const secondaryBtn  = document.querySelector('[data-continue-secondary]');
  if (eyebrowEl) { eyebrowEl.textContent = "Couldn't load"; eyebrowEl.classList.remove('dash-loading-pulse'); }
  if (titleEl)   titleEl.textContent = `${FALLBACK_MSG} Reload the page to try again.`;
  if (progWrapEl) progWrapEl.style.display = 'none';
  if (primaryBtn) {
    primaryBtn.textContent = '↻ Reload';
    primaryBtn.href = '#';
    primaryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      location.reload();
    });
  }
  if (secondaryBtn) {
    secondaryBtn.textContent = 'Go to Learn';
    secondaryBtn.href = 'learn.html';
    secondaryBtn.style.display = '';
  }

  // Overall Progress + Progress Snapshot tiles: deliberately left as
  // their static "–" placeholders rather than adding a second alert box
  // directly beneath the hero card's own message — a dash never claims
  // a specific number the way a stale/wrong one would, so it's already
  // a safe fallback, not a blank one.

  // Learning Path (unit list) — was completely blank pre-JS before
  // this fallback existed; gets an explicit message instead of staying
  // empty with no explanation.
  const listEl = document.getElementById('unit-progress-list');
  if (listEl) {
    listEl.innerHTML = `<div class="alert alert--error dash-fallback-alert">${FALLBACK_MSG} <a href="learn.html">Go to Learn</a> to keep going, or reload this page to try again.</div>`;
  }

  // Distinct wording from the genuine "nothing practiced yet" empty
  // state — telling a learner who HAS practiced signs that they have
  // nothing would be actively wrong, not just unhelpful.
  const recapGrid   = document.getElementById('recap-grid');
  const recapCountEl = document.querySelector('[data-recap-count]');
  const recapFootEl  = document.querySelector('[data-recap-foot]');
  if (recapGrid) {
    recapGrid.innerHTML = `<p class="text-muted">${FALLBACK_MSG} Your practiced signs are saved locally — reload the page to see them.</p>`;
  }
  if (recapCountEl) recapCountEl.textContent = '';
  if (recapFootEl) recapFootEl.style.display = 'none';

  // Review recent signs
  const reviewActionsEl = document.querySelector('[data-review-actions]');
  if (reviewActionsEl) {
    reviewActionsEl.innerHTML = '<a class="btn btn--ghost" href="learn.html">Go to Learn</a>';
  }

  // Your Account → Current Unit: left as its static "–", same reasoning
  // as Overall Progress above — no guess is safer than a wrong guess.
}

document.addEventListener('DOMContentLoaded', () => {
  // FIX (this session): this used to `await Promise.race([readyPromise,
  // timeout])` BEFORE calling any render*() function below — so even
  // in the fast, common case where whenProgressReady() resolves
  // almost immediately, every render was pushed at least one tick
  // past the browser's first paint of the static fallback markup
  // (dashboard.html's "Let's continue your ASL journey.", the
  // Overall Progress bar sitting at an unset/full width, etc). That
  // paint-then-immediately-overwrite was the flicker: the fallback
  // text and full-width bar were visible for a real, user-noticeable
  // instant before snapping to the actual values.
  //
  // Per this file's own LOADING/FAILURE HANDLING doc comment above,
  // every render function already reads synchronously from
  // localStorage regardless of whether whenProgressReady() has
  // resolved — hydration only matters for pulling in a DIFFERENT
  // device's saved progress, not for the common single-device case
  // this render pass covers. So there's nothing to actually wait for
  // before rendering: do the real render immediately, synchronously,
  // in the same tick as DOMContentLoaded, and run the
  // whenProgressReady()-vs-timeout race afterward purely as a
  // background diagnostic (existing console logging), no longer
  // gating the paint on it.
  console.log('[dashboard.js] rendering from local cache immediately');

  if (!window.LWProgress || !window.LWData) {
    showProgressUnavailable('window.LWProgress/window.LWData did not load');
    return;
  }

  try {
    // Computed once, consumed by all three "where's the learner" renders
    // below — see getCurrentDestination()'s doc comment for why this
    // replaced two separate copies of the same walk.
    const destination = getCurrentDestination();

    renderOverallProgress();
    renderCurrentUnit(destination);
    renderStatsSnapshot(destination);
    renderWelcomeBanner(destination);
    renderUnitList(destination);
    renderRecap();
    renderReviewEntry();
    renderContinueButton(destination);
    renderContinueCard(destination);

    // Bound once here, not inside renderRecap() itself, so re-renders
    // (e.g. from the toggle click) never re-attach and double-fire.
    document.querySelector('[data-recap-toggle]')?.addEventListener('click', handleRecapToggle);
  } catch (e) {
    // Belt-and-suspenders: no render function above is expected to
    // throw, but if a future data.js shape change or a corrupt
    // localStorage record ever makes one throw partway through, this
    // stops the learner being stuck on a half-rendered page with
    // nothing but a silent console error.
    console.error('[dashboard.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
    return;
  }

  // Background-only from here down: purely diagnostic logging for a
  // slow/hung whenProgressReady(), same PROGRESS_READY_TIMEOUT_MS
  // reasoning as before. Deliberately NOT re-running the render
  // functions on 'ready' — doing so would just reintroduce the exact
  // flicker this fix removes, snapping already-correct values to...
  // the same already-correct values, in the common case. If real
  // cross-device hydration lands later (see this file's TODO about
  // replacing MOCK_PROGRESS with Firestore), that's the point to
  // revisit whether a second, quieter render pass is worth it.
  const readyPromise = window.LWProgress?.whenProgressReady?.();
  if (readyPromise && typeof readyPromise.then === 'function') {
    Promise.race([
      readyPromise.then(() => 'ready'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), PROGRESS_READY_TIMEOUT_MS)),
    ]).then((outcome) => {
      if (outcome === 'timeout') {
        console.warn(`[dashboard.js] whenProgressReady() did not resolve within ${PROGRESS_READY_TIMEOUT_MS}ms — already rendered from local cache, nothing further to do.`);
      } else {
        console.log('[dashboard.js] progress hydration confirmed ready (page was already rendered from local cache).');
      }
    });
  } else {
    console.warn('[dashboard.js] window.LWProgress.whenProgressReady() is unavailable.');
  }
});