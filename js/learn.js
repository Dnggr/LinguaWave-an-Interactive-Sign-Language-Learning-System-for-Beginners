/**
 * learn.js — Lesson Selector Logic
 * ─────────────────────────────────────────────────────────────────
 * CONNECTS : pages/learn.html (reads window.LWData from js/data.js,
 *            window.LWProgress from js/engine/progress.js)
 *
 * Renders a single scrollable TRAIL of window.LWData.getUnits(), one
 * node per unit, shown locked / current / done — this is the "single
 * continuous path" SYSTEM_ARCHITECTURE.md Rev 4 calls for (see
 * PIVOT_CHECKLIST.md Phase 4 / AI_MEMORY.md for the full history;
 * neither file was in this session's export, so history beyond what's
 * written here should be cross-checked against them, not assumed).
 *
 * View states this file renders into #lesson-grid:
 *   1. TRAIL          — default view, one card per unit (renderTrail).
 *   2. UNIT INFO       — Unit 0 (kind:'info'), static UNIT0_CONTENT
 *                        prose (renderUnitInfo).
 *   3. UNIT CATEGORIES — a unit with more than one category — a "pick
 *                        a category" screen (renderUnitCategoryList).
 *                        Units with exactly one category skip straight
 *                        to it.
 *   4. CATEGORY VIEW   — the flat single-character grid
 *                        (renderBasicCategoryGrid — alphabet/numbers)
 *                        or the word/phrase picker (renderWordPicker —
 *                        everything else). Both link into
 *                        lesson.html?level=X&category=Y&sign=Z.
 *   kind:'interactive' (Fingerspell Your Name) has no screen of its
 *   own — its trail node is a plain link straight into lesson.html.
 *
 * URL SCHEME (only this file parses these):
 *   learn.html                     → trail
 *   learn.html?unit=<unitId>       → that unit's screen
 *   learn.html?category=<catId>    → that category's grid/picker
 *
 * BACKWARD COMPAT: js/lesson.js and js/quiz.js (out of scope here)
 * still build links as `learn.html?level=X` and
 * `learn.html?level=X&category=Y`. `category` alone is enough to
 * resolve the right screen (ids are unique app-wide), so those still
 * work; a bare `?level=X` falls back to the trail root and
 * best-effort-scrolls to a representative unit (scrollToLevel) instead
 * of erroring or dead-ending — there's no more per-level screen to
 * send it to.
 *
 * THIS PASS also: implemented the search box (`#learn-search-input`
 * was wired to nothing — see wireSearch()/applySearchFilter() below),
 * fixed the script-load order bug (js/engine/progress.js was the only
 * `defer`red tag among 4 non-deferred siblings in pages/learn.html —
 * harmless today only because everything in this file runs inside a
 * DOMContentLoaded handler, which always fires after deferred scripts;
 * fixed at the HTML level so the load order matches source order and
 * stops relying on that), and added a real completed-something
 * celebration (checkCompletion()/showCongrats() below) — previously
 * this page gave no positive feedback of its own when a category or
 * unit flipped to done; the learner just saw it silently re-render on
 * their next visit.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per category id, purely decorative. Falls back to a
// generic bookmark icon for anything not listed here.
const CATEGORY_ICONS = {
  alphabet: '🔤', numbers: '🔢',
  family: '👪', places: '🏠', time: '⏰', temperature: '🌡️', food: '🍎',
  clothes: '👕', health: '🩹', feelings: '😊', requests: '🙏', amounts: '📏',
  colors: '🎨', money: '💵', animals: '🐾', sequence_demo: '💬',
  essentials_greetings: '👋', essentials_polite_expressions: '🙏', essentials_basic_responses: '❓',
  greetings_intro: '👋', basic_responses: '💬', family_phrases: '👨‍👩‍👧',
  daily_needs: '🥤', asking_questions: '❓', polite_expressions: '🙌',
  affection_feelings: '❤️', describing_things: '🖍️', self_introduction: '🧑',
  daily_activities: '📅', family_conversations: '🗣️', talking_about_feelings: '💭',
  asking_for_help: '🆘', school_conversations: '🏫', shopping_ordering: '🛍️',
  social_conversations: '🎉', emergency_situations: '🚨', everyday_dialogues: '💡',
  people: '🧑‍🤝‍🧑', actions: '🏃', hand_actions: '🤲', communication: '🗣️',
  body: '🧍', personal_information: '🪪', shapes: '🔺', size: '📏',
  appearance: '✨', taste: '👅', sound: '🔊', descriptions: '📝',
  home: '🏠', furniture: '🛋️', household: '🪟', bathroom: '🚿',
  kitchen: '🍳', school: '🏫', school_supplies: '✏️', classroom: '📋',
  classroom_actions: '🙋', subjects: '📚', fruits: '🍎', vegetables: '🥕',
  snacks: '🍪', drinks: '🥤', wild_animals: '🦁', insects: '🐝',
  dressing: '🧺', personal_items: '🎒', nature: '🌳', plants: '🌱',
  weather: '⛅', seasons: '🍂', vehicles: '🚗', transportation: '🚶',
  professions: '👷', community: '🏙️', daytime: '🌅', days: '📅',
  months: '🗓️', sequence: '🔢', frequency: '🔁', location: '📍',
  distance: '📐', directions: '🧭', social: '🤝', manners: '🙇',
  turn_taking: '🔄', responses: '💬', conversation: '💭',
  making_requests: '🙋', answers: '✅',
};

// One icon per UNITS entry, for the trail nodes.
const UNIT_ICONS = {
  welcome: '👋', alphabet: '🔤', fingerspell_name: '🖊️', numbers: '🔢',
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

// Card-title prefix for each basic-level category's flat single-char
// grid. Extend this (and FLAT_GRID_CATEGORIES below) if a third flat-
// grid category is ever added.
const BASIC_LABEL_PREFIX = { alphabet: 'Letter', numbers: 'Number' };

// Which category ids use the flat single-character grid
// (renderBasicCategoryGrid) instead of the word/phrase picker
// (renderWordPicker). Kept as a Set rather than a length check —
// single-character signIds aren't a reliable synonym for "is a letter."
const FLAT_GRID_CATEGORIES = new Set(['alphabet', 'numbers']);

// Escapes text dropped into innerHTML (category/unit titles are all
// hardcoded in data.js, but this keeps the render helpers safe if
// that ever changes).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Fallback UI if window.LWData never loads, or a render call throws
// partway through — otherwise the static "Loading your learning
// path…" placeholder in pages/learn.html would just sit there forever
// with no explanation. Deliberately narrower than dashboard.js's
// equivalent: only window.LWData is a hard requirement here, since
// every window.LWProgress call in this file already goes through
// `?.` + a `?? default`, so a missing LWProgress degrades to "nothing
// unlocked shows as done" rather than a blank page.
function showLearnUnavailable(reason) {
  console.error('[learn.js] cannot render — window.LWData unavailable or a render call threw. Reason:', reason);
  const grid = document.getElementById('lesson-grid');
  if (!grid) return;
  grid.classList.remove('trail', 'lesson-grid--categories');
  grid.innerHTML = `<div class="alert alert--error learn-fallback-alert">` +
    `We couldn't load your learning path right now. ` +
    `<a href="dashboard.html">Go to Dashboard</a>, or reload this page to try again.` +
    `</div>`;
}

// BUGFIX (this session) — same class of bug as dashboard.js's
// initDashboard() fix; see its comment for the full reasoning. Same
// readyState guard applied here for consistency/safety (reported bug
// was "page to page", not isolated to one page).
function initLearnPage() {
  const grid           = document.getElementById('lesson-grid');
  const contextEl       = document.getElementById('learn-context');
  const backLinkEl      = document.getElementById('learn-back-link');
  const searchInput     = document.getElementById('learn-search-input');
  const searchClearBtn  = document.getElementById('learn-search-clear');
  const searchEmptyEl   = document.getElementById('learn-search-empty');
  if (!grid) return;

  // The one case no render function below can gracefully no-op past —
  // window.LWData never loaded at all. Every render function calls
  // straight into window.LWData.getUnits()/.getCategoriesForUnit()/etc.
  // with no guard of its own, by design (LWData is a hard dependency,
  // unlike the optional `?.`-guarded LWProgress calls) — without this
  // check, a missing LWData would throw partway into whichever
  // render* function boot() picks and leave the static loading
  // placeholder up with no explanation.
  if (!window.LWData) {
    showLearnUnavailable('window.LWData did not load');
    return;
  }

  // Which function "back" calls right now — null on the trail root
  // (nothing to go back to). Set by every render* function via
  // setBack() so the one back link in the page header always does the
  // right contextual thing: a category opened from a multi-category
  // unit list goes back to THAT list, not all the way to the trail root.
  let backTarget = null;

  // Every render* function calls this early — the one shared point
  // every view transition passes through, so it's also where a
  // leftover search from the PREVIOUS view gets cleared instead of
  // silently filtering a grid it was never typed against.
  function setContext(text) {
    if (searchInput && searchInput.value) {
      searchInput.value = '';
      applySearchFilter('');
    }
    if (!contextEl) return;
    if (!text) { contextEl.style.display = 'none'; contextEl.textContent = ''; return; }
    contextEl.style.display = '';
    contextEl.textContent = text;
  }

  function setBack(fn, label) {
    backTarget = fn;
    if (!backLinkEl) return;
    if (!fn) { backLinkEl.style.display = 'none'; return; }
    backLinkEl.style.display = '';
    backLinkEl.textContent = label || '← Back to Learning Path';
  }

  backLinkEl?.addEventListener('click', (e) => {
    e.preventDefault();
    backTarget?.();
  });

  // ── SEARCH ──────────────────────────────────────────────────────
  // Filters whatever's currently inside #lesson-grid by the card's
  // own title (+ subtitle, for the word/phrase picker's signId
  // subtitle) — client-side only, no re-render, so it works
  // identically on every view this file renders (trail, unit-category
  // list, flat grid, word picker) without each needing its own filter
  // logic.
  function applySearchFilter(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    if (searchClearBtn) searchClearBtn.hidden = query === '';

    const cards = grid.querySelectorAll('.course-card, .lesson-card');
    let anyVisible = false;

    cards.forEach(card => {
      const titleEl = card.querySelector('.course-card__title, .lesson-card__title, .category-card__title');
      const subtitleEl = card.querySelector('.word-picker-card__subtitle');
      const haystack = `${titleEl?.textContent ?? ''} ${subtitleEl?.textContent ?? ''}`.toLowerCase();
      const isMatch = query === '' || haystack.includes(query);
      card.classList.toggle('is-search-hidden', !isMatch);
      if (isMatch) anyVisible = true;
    });

    // Trail only: a collapsed <details> group hides its matches from
    // view just as effectively as filtering them out would, so open
    // any group that still has a match, and visually de-emphasize any
    // group left with none. Leaves groups exactly as the learner set
    // them once the search is cleared again, rather than snapping
    // every group open/closed on every keystroke.
    if (query !== '') {
      grid.querySelectorAll('details.trail-group').forEach(details => {
        const hasMatch = !!details.querySelector('.course-card:not(.is-search-hidden)');
        details.open = hasMatch;
        details.classList.toggle('is-search-hidden', !hasMatch);
      });
    } else {
      grid.querySelectorAll('details.trail-group').forEach(details => {
        details.classList.remove('is-search-hidden');
      });
    }

    if (searchEmptyEl) {
      searchEmptyEl.hidden = query === '' || anyVisible;
      if (!searchEmptyEl.hidden) searchEmptyEl.textContent = `No matches for "${rawQuery.trim()}" in this view.`;
    }
  }

  function wireSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', () => applySearchFilter(searchInput.value));
    searchClearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      applySearchFilter('');
      searchInput.focus();
    });
  }
  wireSearch();

  /** Category-assessment CTA tile, appended after a category's signs. */
  function renderCategoryAssessmentCTA(level, categoryId, signs, progress) {
    if (signs.length === 0) return '';
    const passed = !!progress.assessment?.passed;
    const practicedCount = signs.filter(s => !!progress.signs[s]).length;
    const allPracticed = practicedCount === signs.length;

    if (passed) {
      return `
        <a href="quiz.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(categoryId)}" class="lesson-card category-card" style="border-color: rgba(63,185,80,.4);">
          <div class="category-card__icon">🏆</div>
          <span class="category-card__title">Retake Assessment</span>
          <span class="badge badge--basic">Passed · ${Math.round((progress.assessment.bestScore||0)*100)}%</span>
        </a>
      `;
    }
    if (allPracticed) {
      return `
        <a href="quiz.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(categoryId)}" class="lesson-card category-card">
          <div class="category-card__icon">📝</div>
          <span class="category-card__title">Take Category Assessment</span>
          <span class="badge badge--${level}">Ready · ${practicedCount}/${signs.length} practiced</span>
        </a>
      `;
    }
    return `
      <div class="lesson-card category-card lesson-card--locked">
        <div class="category-card__icon">📝</div>
        <span class="category-card__title">Category Assessment</span>
        <span class="badge badge--locked">${practicedCount}/${signs.length} practiced</span>
      </div>
    `;
  }

  /** Flat single-character grid — alphabet / numbers. */
  function renderBasicCategoryGrid(cat, opts = {}) {
    history.replaceState(null, '', `learn.html?category=${encodeURIComponent(cat.id)}`);
    setContext(cat.title);
    setBack(opts.backFn ?? renderTrail, opts.backLabel ?? '← Back to Learning Path');
    grid.classList.remove('lesson-grid--categories');
    grid.classList.remove('trail');

    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const progress = window.LWProgress?.getCategoryProgress?.(cat.level, cat.id) ?? { signs: {}, assessment: null };
    const labelPrefix = BASIC_LABEL_PREFIX[cat.id] ?? '';

    grid.innerHTML = signs.map(signId => {
      const done = !!progress.signs[signId];
      return `
        <a href="lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(signId)}" class="lesson-card${done ? ' lesson-card--done' : ''}">
          <div class="lesson-card__letter">${escapeHtml(signId)}${done ? ' ✔' : ''}</div>
          <span class="lesson-card__title">${labelPrefix ? `${labelPrefix} ${escapeHtml(signId)}` : escapeHtml(signId)}</span>
        </a>
      `;
    }).join('') + renderCategoryAssessmentCTA(cat.level, cat.id, signs, progress);
  }

  /** Word/phrase picker for a single category. `isReference` (set by
   *  renderCategoryView) is browse-only: no assessment CTA, no lock
   *  state. */
  function renderWordPicker(cat, opts = {}) {
    history.replaceState(null, '', `learn.html?category=${encodeURIComponent(cat.id)}`);
    setContext(cat.title);
    setBack(opts.backFn ?? renderTrail, opts.backLabel ?? '← Back to Learning Path');
    grid.classList.add('lesson-grid--categories');
    grid.classList.remove('trail');

    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const progress = window.LWProgress?.getCategoryProgress?.(cat.level, cat.id) ?? { signs: {}, assessment: null };

    const wordCards = signs.map(signId => {
      const signData = window.LWData.getSign(cat.level, signId);
      const done = !!progress.signs[signId];
      const label = signData?.title ?? signId;
      return `
        <a href="lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(signId)}"
           class="lesson-card word-picker-card${done ? ' lesson-card--done' : ''}">
          <span class="lesson-card__title">${escapeHtml(label)}${done ? ' ✔' : ''}</span>
          <span class="word-picker-card__subtitle">${escapeHtml(signId)}</span>
        </a>
      `;
    }).join('');

    const tailHtml = opts.isReference
      ? `
        <div class="lesson-card category-card lesson-card--locked" style="max-width: 320px;">
          <div class="category-card__icon">📖</div>
          <span class="category-card__title">Reference only</span>
          <span class="badge badge--locked">No assessment or camera check yet</span>
        </div>
      `
      : renderCategoryAssessmentCTA(cat.level, cat.id, signs, progress);

    grid.innerHTML = wordCards + tailHtml;
  }

  /** Resolves a category object to the right screen (flat grid vs
   *  word picker) — the one place that decision is made, so every
   *  caller (trail nodes, unit-category cards, boot()'s deep-link
   *  handling) shares it instead of re-implementing the
   *  FLAT_GRID_CATEGORIES check. Also the one place that enforces a
   *  category is actually reachable before rendering it — a
   *  comingSoon or locked category has no click handler anywhere in
   *  this file, but a hand-typed/bookmarked `?category=` URL bypasses
   *  that, so it's re-checked here. Reference-mode (Phrasebook)
   *  categories are exempt — never locked, by design. */
  function renderCategoryView(cat, opts = {}) {
    const unit = window.LWData.getUnits().find(u => u.order === cat.unit);
    const isReference = unit?.kind === 'reference';

    if (cat.comingSoon) { renderTrail(); return; }

    if (!isReference) {
      const unlocked = window.LWProgress?.isCategoryUnlocked?.(cat.level, cat.id) ?? true;
      if (!unlocked) { renderTrail(); return; }
    }

    if (FLAT_GRID_CATEGORIES.has(cat.id)) {
      renderBasicCategoryGrid(cat, opts);
      return;
    }
    renderWordPicker(cat, { ...opts, isReference });
  }

  /** Single category-card tile inside a multi-category unit's "pick a
   *  category" screen. */
  function renderCategoryCard(cat, unit, isReference) {
    const icon = CATEGORY_ICONS[cat.id] ?? '🔖';

    if (cat.comingSoon) {
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--locked">Coming Soon</span>
        </div>
      `;
    }

    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    if (signs.length === 0) {
      // Safety net only — every shipped category has real content today.
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--${cat.level}">Content coming soon</span>
        </div>
      `;
    }

    if (isReference) {
      return `
        <button type="button" class="lesson-card category-card" data-open-category="${escapeHtml(cat.id)}">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--intermediate">${signs.length} phrase${signs.length === 1 ? '' : 's'} · Browse →</span>
        </button>
      `;
    }

    const unlocked = window.LWProgress?.isCategoryUnlocked?.(cat.level, cat.id) ?? true;
    if (!unlocked) {
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">🔒</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--locked">Finish the previous category first</span>
        </div>
      `;
    }

    const progress = window.LWProgress?.getCategoryProgress?.(cat.level, cat.id) ?? { signs: {}, assessment: null };
    const passed   = !!progress.assessment?.passed;
    const statusBadge = passed
      ? `<span class="badge badge--basic">✔ Passed · ${Math.round((progress.assessment.bestScore||0)*100)}%</span>`
      : `<span class="badge badge--${cat.level}">${signs.length} word${signs.length === 1 ? '' : 's'} · View →</span>`;

    return `
      <button type="button" class="lesson-card category-card${passed ? ' lesson-card--done' : ''}" data-open-category="${escapeHtml(cat.id)}">
        <div class="category-card__icon">${icon}</div>
        <span class="category-card__title">${escapeHtml(cat.title)}</span>
        ${statusBadge}
      </button>
    `;
  }

  /** "Pick a category" screen for a unit with more than one category. */
  function renderUnitCategoryList(unit) {
    history.replaceState(null, '', `learn.html?unit=${encodeURIComponent(unit.id)}`);
    setContext(unit.title);
    setBack(renderTrail, '← Back to Learning Path');
    grid.classList.add('lesson-grid--categories');
    grid.classList.remove('trail');

    const isReference = unit.kind === 'reference';
    const allCats = window.LWData.getCategoriesForUnit(unit.order);

    grid.innerHTML = allCats.map(cat => renderCategoryCard(cat, unit, isReference)).join('');

    grid.querySelectorAll('[data-open-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = allCats.find(c => c.id === btn.dataset.openCategory);
        if (cat) {
          renderCategoryView(cat, {
            backFn: () => renderUnitCategoryList(unit),
            backLabel: `← Back to ${unit.title}`,
          });
        }
      });
    });
  }

  /** Unit 0 — "Welcome to ASL". Shows UNIT0_CONTENT and a button into
   *  the alphabet; no longer links out anywhere (the standalone
   *  pages/intro-to-asl.html this used to open is superseded by
   *  index.html's "About American Sign Language" section — see that
   *  page and REMAINING WORK for its current on-disk status). */
  function renderUnitInfo(unit) {
    history.replaceState(null, '', `learn.html?unit=${encodeURIComponent(unit.id)}`);
    setContext(unit.title);
    setBack(renderTrail, '← Back to Learning Path');
    grid.classList.remove('lesson-grid--categories');
    grid.classList.remove('trail');

    const sections = (window.LWData.UNIT0_CONTENT ?? []).map(section => `
      <div class="unit-info__section">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.body)}</p>
      </div>
    `).join('');

    grid.innerHTML = `
      <div class="unit-info">
        ${sections}
        <button type="button" class="btn btn--primary mt-4" data-continue-to-alphabet>Continue to the Alphabet →</button>
      </div>
    `;

    grid.querySelector('[data-continue-to-alphabet]')?.addEventListener('click', () => {
      const alphabetUnit = window.LWData.getUnits().find(u => u.id === 'alphabet');
      if (alphabetUnit) renderUnitView(alphabetUnit);
    });
  }

  /** Opens whatever screen a given unit resolves to. kind:'interactive'
   *  isn't handled here — its trail node is a direct link into
   *  lesson.html (see renderUnitNode); the branch below is only a
   *  safety net if something else ever calls this with it. */
  function renderUnitView(unit) {
    if (unit.kind === 'info') { renderUnitInfo(unit); return; }
    if (unit.kind === 'interactive') { renderTrail(); return; }

    const allCats = window.LWData.getCategoriesForUnit(unit.order);
    if (allCats.length === 1) {
      renderCategoryView(allCats[0], { backFn: renderTrail, backLabel: '← Back to Learning Path' });
      return;
    }
    renderUnitCategoryList(unit);
  }

  /** The one 'current'-eligible unit: the first category-group unit,
   *  in trail order, that's unlocked but not yet fully passed. Every
   *  OTHER unlocked-but-incomplete unit (only reachable via
   *  DEBUG_UNLOCK_ALL) falls back to the plain 'available' state
   *  instead — otherwise, with every category-group unit unlocked at
   *  once, all of them would render with the identical 'current'
   *  highlight, which reads as no highlight at all. Mirrors
   *  dashboard.js's own getCurrentDestination() (same "stop at the
   *  first one" rule) so both pages agree on the same underlying data. */
  function findCurrentUnitId(units) {
    for (const unit of units) {
      if (unit.kind !== 'category-group') continue;
      const liveCats = window.LWData.getCategoriesForUnit(unit.order)
        .filter(c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0);
      if (liveCats.length === 0) continue;
      const first = liveCats[0];
      const unlocked = window.LWProgress?.isCategoryUnlocked?.(first.level, first.id) ?? true;
      if (!unlocked) continue;
      const passedCount = liveCats.filter(c => !!window.LWProgress?.getCategoryProgress?.(c.level, c.id)?.assessment?.passed).length;
      if (passedCount < liveCats.length) return unit.id;
    }
    return null;
  }

  /** Computes a trail node's lock/progress state.
   *  status: 'available' (info/interactive/reference, and any
   *          unlocked-but-incomplete category-group unit that isn't
   *          the one 'current' unit) | 'locked' | 'current' | 'done'
   *          (category-group only).
   *  @param {string|null} currentUnitId - from findCurrentUnitId(). */
  function getUnitState(unit, currentUnitId) {
    if (unit.kind === 'info') return { status: 'available', label: 'Start here' };

    if (unit.kind === 'interactive') {
      const href = 'lesson.html?level=basic&category=fingerspell_name';
      if (!unit.gated) return { status: 'available', label: 'Practice drill · always open', href };
      const passed = !!window.LWProgress?.getUnitAssessment?.(unit.id)?.passed;
      return passed
        ? { status: 'done', label: 'Assessment passed', href }
        : { status: 'available', label: 'Assessment · required to continue', href };
    }
    if (unit.kind === 'reference') return { status: 'available', label: 'Browse only, no assessment yet' };

    // kind: 'category-group'
    const allCats  = window.LWData.getCategoriesForUnit(unit.order);
    const liveCats = allCats.filter(c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0);

    if (liveCats.length === 0) {
      return { status: 'locked', label: 'Coming soon', clickable: false };
    }

    const first = liveCats[0];
    const unlocked = window.LWProgress?.isCategoryUnlocked?.(first.level, first.id) ?? true;
    if (!unlocked) {
      return { status: 'locked', label: 'Locked', clickable: false, lockIcon: true };
    }

    const passedCount = liveCats.filter(c => !!window.LWProgress?.getCategoryProgress?.(c.level, c.id)?.assessment?.passed).length;
    const done = passedCount === liveCats.length;
    if (done) {
      return { status: 'done', label: `Complete · ${passedCount}/${liveCats.length}` };
    }
    return {
      status: unit.id === currentUnitId ? 'current' : 'available',
      label: `${passedCount}/${liveCats.length} categories passed`,
    };
  }

  function badgeClassForStatus(status) {
    if (status === 'locked') return 'badge--locked';
    if (status === 'done')   return 'badge--done';
    return 'badge--basic';
  }

  function renderUnitNode(unit, currentUnitId) {
    const state = getUnitState(unit, currentUnitId);
    const icon = state.lockIcon ? '🔒' : (UNIT_ICONS[unit.id] ?? '🔖');
    const stateClass = state.status === 'locked' ? ' course-card--locked'
      : state.status === 'done' ? ' course-card--done'
      : state.status === 'current' ? ' course-card--current' : '';

    const inner = `
      <span class="course-card__thumb" aria-hidden="true">${icon}</span>
      <span class="course-card__body">
        <span class="course-card__eyebrow">Unit ${unit.order}</span>
        <span class="course-card__title">${escapeHtml(unit.title)}</span>
      </span>
      <span class="badge ${badgeClassForStatus(state.status)} course-card__badge">${escapeHtml(state.label)}</span>
    `;

    if (state.href) {
      return `<a href="${state.href}" class="course-card${stateClass}">${inner}</a>`;
    }
    if (state.clickable === false) {
      return `<div class="course-card${stateClass}">${inner}</div>`;
    }
    return `<button type="button" class="course-card${stateClass}" data-open-unit="${escapeHtml(unit.id)}">${inner}</button>`;
  }

  // Which of the 3 broad levels a unit belongs to, purely for grouping
  // the trail into collapsible sections. 'interactive' units have no
  // CATEGORIES entry of their own, so they're pinned to 'basic'.
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

  /** Default / root view — the trail itself, grouped into 3 native
   *  <details> sections by level (closed sections cost nothing to
   *  scroll past; native <details>/<summary> gets keyboard support
   *  and a no-JS fallback for free). The section containing the
   *  learner's current unit opens by default; the rest start collapsed. */
  function renderTrail() {
    history.replaceState(null, '', 'learn.html');
    setContext('');
    setBack(null);
    grid.classList.remove('lesson-grid--categories');
    grid.classList.add('trail');

    const units = window.LWData.getUnits();
    const currentUnitId = findCurrentUnitId(units);
    const currentUnit = units.find(u => u.id === currentUnitId);
    const openLevel = currentUnit ? getUnitLevel(currentUnit) : 'basic';

    grid.innerHTML = LEVEL_GROUPS.map(({ level, label }) => {
      const groupUnits = units.filter(u => getUnitLevel(u) === level);
      if (groupUnits.length === 0) return '';
      const doneCount = groupUnits.filter(u => getUnitState(u, currentUnitId).status === 'done').length;
      const isOpen = level === openLevel;
      return `
        <details class="trail-group"${isOpen ? ' open' : ''}>
          <summary class="trail-group__summary">
            <span class="trail-group__label">${escapeHtml(label)}</span>
            <span class="trail-group__meta">${doneCount}/${groupUnits.length} complete</span>
          </summary>
          <div class="course-grid trail-group__grid">
            ${groupUnits.map(u => renderUnitNode(u, currentUnitId)).join('')}
          </div>
        </details>
      `;
    }).join('');

    grid.querySelectorAll('[data-open-unit]').forEach(el => {
      el.addEventListener('click', () => {
        const unit = units.find(u => u.id === el.dataset.openUnit);
        if (unit) renderUnitView(unit);
      });
    });
  }

  /** Best-effort continuity for old `?level=X` links (js/quiz.js and
   *  pages/dashboard.html still build these). Scrolls the trail to a
   *  representative unit for that level instead of dropping the
   *  learner at the top — not a perfect mapping (medium/intermediate
   *  span multiple units), picks the first unit that level's content
   *  starts in. */
  function scrollToLevel(level) {
    const unitIdByLevel = { basic: 'alphabet', medium: 'greetings', intermediate: 'phrasebook' };
    const targetId = unitIdByLevel[level];
    if (!targetId) return;
    // The target unit's card may be inside a collapsed <details> group —
    // open it first, or scrollIntoView on a display:none subtree no-ops.
    const el = grid.querySelector(`[data-open-unit="${targetId}"]`);
    el?.closest('details.trail-group')?.setAttribute('open', '');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** Populates the two sidebar panels (#learn-sidebar-progress,
   *  #learn-sidebar-continue) — visible on every learn.html view, so
   *  this is called once from boot() after routing, regardless of
   *  which view boot() lands on, same as checkCompletion() below. */
  function renderSidebar() {
    const progressEl = document.getElementById('learn-sidebar-progress');
    const continueEl = document.getElementById('learn-sidebar-continue');
    if (!progressEl || !continueEl) return;
    if (!window.LWProgress || !window.LWData) return;

    const chain = window.LWProgress.getOrderedLiveCategories();
    let totalSigns = 0, practicedSigns = 0;
    let destCat = null, destUnit = null, destNextSign = null, destReady = false;
    let destPracticed = 0;
    let foundDestination = false;

    chain.forEach(cat => {
      const signs = window.LWData.getCategorySigns(cat.level, cat.id);
      const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
      totalSigns += signs.length;
      practicedSigns += signs.filter(s => !!prog.signs[s]).length;

      if (!foundDestination && !prog.assessment?.passed) {
        foundDestination = true;
        destCat = cat;
        destUnit = window.LWData.getUnits().find(u => u.order === cat.unit) ?? null;
        destPracticed = signs.filter(s => !!prog.signs[s]).length;
        destNextSign = signs.find(s => !prog.signs[s]) ?? signs[0] ?? null;
        destReady = signs.length > 0 && destPracticed === signs.length;
      }
    });

    const pct = totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0;
    // `--pct` drives css/learn.css's conic-gradient ring directly —
    // previously a flat, always-identical circle regardless of pct
    // (a "progress ring" that never actually showed any progress).
    progressEl.innerHTML = `
      <div class="sidebar-progress__ring" style="--pct: ${pct};">
        <span class="sidebar-progress__number">${pct}%</span>
        <span class="sidebar-progress__label">practiced</span>
      </div>
      <p class="sidebar-progress__count">${practicedSigns} / ${totalSigns || '—'} signs</p>
    `;

    if (!destCat) {
      continueEl.innerHTML = `<p class="sidebar-continue__empty">${chain.length === 0 ? 'Nothing unlocked yet — start with the alphabet!' : "You're caught up on everything unlocked so far!"}</p>`;
      return;
    }

    const icon = UNIT_ICONS[destUnit?.id] ?? '🔖';
    const nextTitle = window.LWData.getSign?.(destCat.level, destNextSign)?.title ?? destNextSign;
    const href = destReady
      ? `quiz.html?level=${encodeURIComponent(destCat.level)}&category=${encodeURIComponent(destCat.id)}`
      : `lesson.html?level=${encodeURIComponent(destCat.level)}&category=${encodeURIComponent(destCat.id)}&sign=${encodeURIComponent(destNextSign)}`;

    // Same icon-chip + text layout dashboard.css's .continue-card uses
    // (the surrounding .sidebar-panel--continue in pages/learn.html
    // supplies the matching accent border + gradient wash) — this
    // panel used to be plain text next to dashboard's more visually
    // weighted version of the same "what do I do next" card.
    continueEl.innerHTML = `
      <div class="sidebar-continue">
        <span class="sidebar-continue__icon" aria-hidden="true">${icon}</span>
        <div class="sidebar-continue__text">
          <p class="sidebar-continue__title">${escapeHtml(destUnit ? `Unit ${destUnit.order} · ${destUnit.title}` : destCat.title)}</p>
          <p class="sidebar-continue__detail">${destReady ? `${escapeHtml(destCat.title)} → Take the assessment` : `${escapeHtml(destCat.title)} → ${escapeHtml(nextTitle)}`}</p>
        </div>
      </div>
      <a href="${href}" class="btn btn--primary btn--sm btn--full mt-4">${destReady ? '📝 Take Assessment' : '▶ Continue'}</a>
    `;
  }

  // ── CONGRATS ────────────────────────────────────────────────────
  // Detects a category or unit that just flipped to "done" since the
  // last time this page ran, and shows a one-off celebration for it.
  // Entirely local to this file/page — reads the same
  // window.LWProgress/window.LWData calls the trail already renders
  // from, so it needs no changes to quiz.js, lesson.js, or
  // progress.js, and fires regardless of which view boot() lands the
  // learner on (they may return straight to a `?category=` URL, never
  // touching renderTrail() at all in that pageview).
  const CELEBRATE_KEY = 'lw-learn-celebrated-v1';

  function loadCelebrateSnapshot() {
    try { return JSON.parse(localStorage.getItem(CELEBRATE_KEY) ?? 'null'); }
    catch { return null; }
  }
  function saveCelebrateSnapshot(snap) {
    try { localStorage.setItem(CELEBRATE_KEY, JSON.stringify(snap)); } catch { /* ignore */ }
  }

  /** Compares this load's done-state against the last saved snapshot
   *  and returns the single most significant thing that just finished
   *  (a whole unit outranks one of its own categories) — or null if
   *  nothing new finished. The very first time this ever runs there's
   *  nothing to compare against, so it seeds the snapshot silently
   *  instead of "celebrating" progress the learner made before this
   *  feature existed. */
  function detectNewCompletion(units, currentUnitId) {
    const prevSnap = loadCelebrateSnapshot();
    const isFirstRun = prevSnap === null;
    const prevUnits = prevSnap?.units ?? {};
    const prevCats  = prevSnap?.cats ?? {};
    const nextUnits = {};
    const nextCats  = {};
    let newUnit = null;
    let newCat  = null;

    units.forEach(unit => {
      if (unit.kind !== 'category-group' && unit.kind !== 'interactive') return;
      const done = getUnitState(unit, currentUnitId).status === 'done';
      nextUnits[unit.id] = done;
      if (done && prevUnits[unit.id] === false) newUnit = unit;
    });

    (window.LWData.CATEGORIES ?? []).forEach(cat => {
      if (cat.comingSoon) return;
      const passed = !!window.LWProgress?.getCategoryProgress?.(cat.level, cat.id)?.assessment?.passed;
      nextCats[cat.id] = passed;
      if (passed && prevCats[cat.id] === false) newCat = cat;
    });

    saveCelebrateSnapshot({ units: nextUnits, cats: nextCats });
    if (isFirstRun) return null;
    if (newUnit) return { type: 'unit', title: newUnit.title };
    if (newCat)  return { type: 'category', title: newCat.title };
    return null;
  }

  function setBackgroundInert(hide) {
    document.querySelectorAll('body > nav, body > section, body > footer').forEach(el => {
      if (hide) el.setAttribute('aria-hidden', 'true');
      else el.removeAttribute('aria-hidden');
    });
  }

  function showCongrats(completion) {
    const modal      = document.getElementById('congrats-modal');
    const titleEl    = document.getElementById('congrats-modal-title');
    const bodyEl     = document.getElementById('congrats-modal-body');
    const iconEl     = document.getElementById('congrats-modal-icon');
    const dismissBtn = document.getElementById('congrats-modal-dismiss');
    if (!modal || !titleEl || !bodyEl || !iconEl || !dismissBtn) return;

    if (completion.type === 'unit') {
      iconEl.textContent = '🏆';
      titleEl.textContent = 'Unit complete!';
      bodyEl.textContent = `You finished every category in "${completion.title}." On to the next one.`;
    } else {
      iconEl.textContent = '🎉';
      titleEl.textContent = 'Category complete!';
      bodyEl.textContent = `You passed the "${completion.title}" assessment. Keep it going.`;
    }

    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    setBackgroundInert(true);
    modal.hidden = false;
    dismissBtn.focus();

    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      setBackgroundInert(false);
      modal.removeEventListener('keydown', onKeydown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    }
    // Minimal focus trap: today's modal has exactly one focusable
    // control (Keep Going), so Tab/Shift+Tab both just stay on it. If
    // a second focusable control is ever added here, trap between the
    // first/last focusable element instead of hardcoding one target.
    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') { e.preventDefault(); dismissBtn.focus(); }
    }
    modal.addEventListener('keydown', onKeydown);
    dismissBtn.addEventListener('click', close, { once: true });
    modal.querySelectorAll('[data-congrats-dismiss]').forEach(el => el.addEventListener('click', close, { once: true }));
  }

  function checkCompletion() {
    const units = window.LWData.getUnits();
    const currentUnitId = findCurrentUnitId(units);
    const completion = detectNewCompletion(units, currentUnitId);
    if (completion) showCongrats(completion);
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const unitParam = params.get('unit');
    const legacyLevel = params.get('level');

    // `category` wins regardless of scheme (new `?category=X`, or the
    // legacy `?level=X&category=Y` js/lesson.js still sends) — ids are
    // unique app-wide, `level` isn't needed to resolve it.
    if (categoryParam) {
      const cat = window.LWData.CATEGORIES.find(c => c.id === categoryParam);
      if (cat) { renderCategoryView(cat); renderSidebar(); checkCompletion(); return; }
    }
    if (unitParam) {
      const unit = window.LWData.getUnits().find(u => u.id === unitParam);
      if (unit) { renderUnitView(unit); renderSidebar(); checkCompletion(); return; }
    }

    renderTrail();
    renderSidebar();
    checkCompletion();
    if (legacyLevel) scrollToLevel(legacyLevel);
  }

  // Belt-and-suspenders, same reasoning as js/dashboard.js's matching
  // try/catch: none of the render* functions above are expected to
  // throw (the window.LWData guard above already covers the one case
  // that would make ALL of them fail at once), but a future data.js
  // shape change or an unexpected URL param combo shouldn't leave the
  // learner stuck on a half-rendered or blank grid with nothing but a
  // silent console error.
  try {
    boot();
  } catch (e) {
    console.error('[learn.js] rendering failed partway through:', e);
    showLearnUnavailable('render threw: ' + (e && e.message));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLearnPage);
} else {
  initLearnPage();
}