/**
 * learn.js — Lesson Selector Logic
 * ─────────────────────────────────────────────────────────────────
 * CONNECTS : pages/learn.html (reads window.LWData from js/data.js,
 *            window.LWProgress from js/engine/progress.js)
 *
 * REV 4 — PHASE 4 (this revision): the three-tab (basic/medium/
 * intermediate) switcher + level card-grid + word-picker structure is
 * GONE. Replaced with a single scrollable TRAIL that walks
 * window.LWData.getUnits() in order — one node per UNITS entry,
 * shown locked / current / done. This is the "single continuous path"
 * SYSTEM_ARCHITECTURE.md Rev 4 asks for; see PIVOT_CHECKLIST.md
 * Phase 4 and AI_MEMORY.md's matching session log entry for the full
 * reasoning/decisions made while building this.
 *
 * View states this file renders into #lesson-grid:
 *   1. TRAIL          — default view. One node per unit (renderTrail).
 *   2. UNIT INFO       — Unit 0 (kind:'info'), static UNIT0_CONTENT text
 *                        (renderUnitInfo). First screen to ever render
 *                        that content — it existed in data.js since
 *                        Phase 1 with nothing displaying it until now.
 *   3. UNIT CATEGORIES — a kind:'category-group' or kind:'reference'
 *                        unit with MORE than one category (today: Unit
 *                        5 Common Things & People, Unit 7 Phrasebook) —
 *                        a "pick a category" screen scoped to that unit
 *                        (renderUnitCategoryList). Units with exactly
 *                        one category (Alphabet, Numbers, Everyday
 *                        Essentials, Basic Phrases) skip this screen
 *                        entirely and open the category directly.
 *   4. CATEGORY VIEW   — either the flat single-character grid
 *                        (renderBasicCategoryGrid — alphabet/numbers)
 *                        or the word/phrase picker (renderWordPicker —
 *                        everything else). Both link out to
 *                        lesson.html?level=X&category=Y&sign=Z, EXACTLY
 *                        the same URL shape as before this revision —
 *                        js/lesson.js and js/quiz.js are untouched this
 *                        phase and still build/expect that shape.
 *   kind:'interactive' (Unit 2, Fingerspell Your Name) has NO learn.js
 *   screen of its own — its trail node is a plain <a> straight into
 *   lesson.html?level=basic&category=fingerspell_name (see
 *   PIVOT_CHECKLIST.md Phase 2's last item — this is the "real nav
 *   entry point instead of a hand-typed URL" that item was waiting on).
 *
 * URL SCHEME (own scheme, only learn.js itself parses its own
 * `?unit=`/`?category=` links — see the boot() comment below for why
 * the OLD `?level=`/`?level=&category=` shape from other pages is
 * still accepted on load):
 *   learn.html                     → trail
 *   learn.html?unit=<unitId>       → that unit's screen (info /
 *                                     category list / direct category,
 *                                     whichever applies)
 *   learn.html?category=<catId>    → that category's grid/picker
 *                                     directly (category ids are
 *                                     unique app-wide — confirmed via
 *                                     data.js CATEGORIES, same fact
 *                                     Phase 3's progress.js rewrite
 *                                     already relied on)
 *
 * BACKWARD COMPAT — IMPORTANT: js/lesson.js and js/quiz.js (both out
 * of scope this phase — lesson.js isn't assigned to any remaining
 * phase, quiz.js is Phase 6) still build links INTO this page as
 * `learn.html?level=X` and `learn.html?level=X&category=Y` (their own
 * old scheme). Since there's no more per-level screen to send
 * `?level=X` alone to, boot() now falls back to rendering the trail
 * and best-effort-scrolling to a representative unit for that level
 * (scrollToLevel) instead of erroring or dropping the learner at a
 * dead end. `?level=X&category=Y` links (e.g. js/lesson.js's back
 * button) still work exactly as before because `category` alone is
 * enough to resolve the right screen — `level` is read but not
 * actually needed for that lookup.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per category id, purely decorative. Falls back to a
// generic bookmark icon for anything not listed here. UNCHANGED from
// before this revision.
// CHANGED (this session — new lesson-plan pivot) — every pre-existing
// entry here is UNCHANGED (all those CATEGORIES ids still exist,
// several just moved to a different unit/title — see data.js). Added
// one icon per brand-new CATEGORIES id the new lesson plan introduced.
const CATEGORY_ICONS = {
  alphabet: '🔤', numbers: '🔢',
  family: '👪', places: '🏠', time: '⏰', temperature: '🌡️', food: '🍎',
  clothes: '👕', health: '🩹', feelings: '😊', requests: '🙏', amounts: '📏',
  colors: '🎨', money: '💵', animals: '🐾', sequence_demo: '💬',
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

// NEW (Phase 4) — one icon per UNITS entry, for the trail nodes.
// Replaces MODULE_GROUPS, which grouped categories WITHIN a level for
// the old card-grid screen — UNITS is now itself the grouping/ordering
// layer, so MODULE_GROUPS (and the renderCategories() function that
// consumed it) is gone rather than kept alongside a second grouping
// mechanism that would just fight the trail for authority over order.
// CHANGED (this session — new lesson-plan pivot) — rebuilt for the new
// 72-unit UNITS array (see data.js's UNITS header comment). The old
// 11-entry map only covered the Rev 6 unit set; 'everyday_essentials'/
// 'common_things_people' no longer exist as UNITS ids (their content
// is now spread across the new topic units below), so those two keys
// were dropped rather than left as dead entries.
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
// grid. UNCHANGED from before this revision — still the lookup
// AI_MEMORY.md §3 says to extend if a third flat-grid category shows
// up (it now also needs an entry in FLAT_GRID_CATEGORIES below).
const BASIC_LABEL_PREFIX = { alphabet: 'Letter', numbers: 'Number' };

// NEW (Phase 4) — which category ids use the flat single-character
// grid (renderBasicCategoryGrid) instead of the word/phrase picker
// (renderWordPicker). Previously this was implicit in `level ===
// 'basic'`; the trail no longer renders by level, so it needs its own
// explicit list. Kept as a small Set (not a length check) for the
// exact reason AI_MEMORY.md §3 already documents for this codebase:
// single-character signIds aren't a synonym for "is a letter."
const FLAT_GRID_CATEGORIES = new Set(['alphabet', 'numbers']);

// Escapes text dropped into innerHTML (category/unit titles are all
// hardcoded in data.js, but this keeps the render helpers safe if
// that ever changes). UNCHANGED from before this revision.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Fallback UI (Design pass, 2026-08-23) ──────────────────────────
// PIVOT_CHECKLIST.md "Design pass — learn.html/lesson.html sidebar not
// yet matching dashboard", gap #4: js/dashboard.js has a real fallback
// (showProgressUnavailable()) if window.LWData fails to load or a
// render call throws; this file had neither — a failure here would
// have silently left the static "Loading your learning path…"
// placeholder (pages/learn.html) up forever with no explanation.
//
// Deliberately narrower than dashboard.js's version: only
// window.LWData is a hard requirement here (every window.LWProgress
// call in this file already goes through `?.` + a `?? default`, so a
// missing LWProgress degrades to "nothing unlocked shows as done" on
// its own, not a blank/broken page — see AI_MEMORY.md §2's note on
// this file). Reuses css/style.css's `.alert`/`.alert--error`
// component, same as dashboard.js, via the small `.learn-fallback-alert`
// nesting tweak in css/learn.css — not a new error style.
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

document.addEventListener('DOMContentLoaded', () => {
  const grid       = document.getElementById('lesson-grid');
  const contextEl  = document.getElementById('learn-context');
  const backLinkEl = document.getElementById('learn-back-link');
  if (!grid) return;

  // Design pass, 2026-08-23: the one case no render function below can
  // gracefully no-op past — window.LWData never loaded at all (its
  // <script> tag failed, or threw before reaching `window.LWData = `).
  // Every render function in this file calls straight into
  // `window.LWData.getUnits()`/`.getCategoriesForUnit()`/etc. with no
  // guard, by design (AI_MEMORY.md's "data-driven over hardcoded"
  // convention treats LWData as a hard dependency, unlike the optional
  // LWProgress calls) — without this check, a missing LWData would
  // throw partway into whichever render* function boot() picks and
  // leave the static loading placeholder up with no explanation, the
  // exact failure this checklist item exists to prevent.
  if (!window.LWData) {
    showLearnUnavailable('window.LWData did not load');
    return;
  }

  // Which function "back" calls right now — null on the trail root
  // (nothing to go back to). Set by every render* function below via
  // setBack() so the ONE back link in the page header (not an in-grid
  // card anymore — see the Phase 4 session log for why that changed)
  // always does the right contextual thing: a category opened from a
  // multi-category unit list goes back to THAT list, not all the way
  // to the trail root.
  let backTarget = null;

  function setContext(text) {
    if (!contextEl) return;
    if (!text) { contextEl.style.display = 'none'; contextEl.textContent = ''; return; }
    contextEl.style.display = '';
    contextEl.textContent = text;
  }

  // CHANGED (PIVOT_CHECKLIST.md "Bugs observed" #2, 2026-08-22 screenshot
  // review): was "← Back to Trail" everywhere in this file — leftover
  // internal naming (renderTrail()/.trail) that never matched what a
  // learner actually sees. This page's own H1 says "Your ASL Learning
  // Path" and the dashboard's matching section is headed "LEARNING
  // PATH" — every default/override string below (and pages/learn.html's
  // static pre-JS fallback) now says "Learning Path" to match both.
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

  /** Category-assessment CTA tile, appended after a category's signs.
   *  UNCHANGED from before this revision (still reads `level` — it's
   *  a call-site-compatible param on LWProgress, see progress.js). */
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
    // TERMINOLOGY FIX (2026-08-21, this session — was PIVOT_CHECKLIST.md's
    // "'X/26 viewed' vs 'X/91 signs practiced'" item): both badges here
    // read the exact same underlying number as `practicedCount` above
    // (LWProgress's getCategoryProgress().signs — written by
    // recordSignPracticed(), see js/lesson.js's updateLessonMeta()) as
    // js/dashboard.js's aggregate card, which already calls it "signs
    // practiced". "practiced" was the term already used everywhere
    // else that touches this number — the variable name on the very
    // next line down (`practicedCount`), the LWProgress function name,
    // even this same file's own JSDoc two lines up — "viewed" in the
    // rendered string was the one outlier. Picked "practiced" to match
    // the majority, not a new third term.
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

  /** Flat single-character grid — alphabet / numbers. Mostly the old
   *  renderBasicCategory(), minus the Alphabet/Numbers sub-tab
   *  switcher: those are two separate trail UNITS now (order 1 and 3,
   *  with Unit 2's name drill in between), not two sub-views of one
   *  "basic" level, so switching between them via the unified back
   *  link + trail is the more honest affordance now. Also drops the
   *  "Module 1 · Introduction to ASL" banner that used to sit above
   *  this grid — Unit 0 (renderUnitInfo below) is the real intro
   *  entry point in the trail now, sequenced BEFORE this unit, and
   *  links to pages/intro-to-asl.html itself (see renderUnitInfo) —
   *  repeating that link again here would be a second entry point to
   *  the same page for no reason. */
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

  /** Word/phrase picker for a single category — mostly the old
   *  renderWordPicker(), now taking a resolved category OBJECT
   *  instead of (level, categoryId) (the trail always has the object
   *  in hand already), and with a new `isReference` mode for
   *  Phrasebook categories: no assessment CTA, no lock state — per
   *  Rev 4's "Suggested removals" #2, these are browse-only. Also
   *  drops the in-grid "← Back to Categories" card in favor of the
   *  page-level back link (setBack) every other screen in this file
   *  now uses, so there's one consistent back affordance instead of
   *  two different ones depending which screen you're on. */
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

    // WORDING FIX (PIVOT_CHECKLIST.md §12 "status vocabulary" session):
    // was "No quiz or camera check yet". Every other surface (quiz.js's
    // own results screen, dashboard.js's unit rows, this checklist's
    // §3/§7/§12 vocabulary) calls this concept "assessment", not
    // "quiz" — "quiz" only survives as the literal filename
    // (quiz.html/quiz.js), never as learner-facing copy. This was
    // flagged as a cross-file mismatch back in the §10 dashboard
    // session (see dashboard.js's own header comment) but left
    // unfixed because learn.js wasn't in that session's scope.
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
   *  handling) goes through the same logic instead of each
   *  re-implementing the FLAT_GRID_CATEGORIES check.
   *
   *  BUGFIX (found by this session's own smoke test, not carried over
   *  from an earlier phase): this is also the ONE place that enforces
   *  that a category is actually reachable before rendering it. Two
   *  gaps existed without this:
   *   1. comingSoon categories — the picker-card UI never wires a
   *      click handler onto a comingSoon card, but a hand-typed or
   *      bookmarked `learn.html?category=food` URL went straight
   *      through boot() into here with no comingSoon check at all.
   *      Pre-existing, not new — the old renderWordPicker() had the
   *      exact same gap (only guarded against an unknown categoryId,
   *      not a comingSoon one). Left unfixed before because Rev 3's
   *      "categories are never locked" stance made "reachable" and
   *      "has content" the same question; now that Rev 4 distinguishes
   *      them, it's worth closing here since it's a one-line guard in
   *      a function this session is already rewriting.
   *   2. Locked categories — genuinely NEW this phase. Trail nodes and
   *      unit-category cards only skip rendering a click handler for a
   *      locked category; they never stopped a direct URL from
   *      reaching renderBasicCategoryGrid/renderWordPicker. Since Rev
   *      4 (unlike Rev 3) wants real locking, a deep link needs to
   *      respect it too. Reference-mode (Phrasebook) categories are
   *      exempt from this check — never locked, by design. */
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
   *  category" screen (renderUnitCategoryList). Same visual states as
   *  before this revision (Coming Soon / no content yet / normal) PLUS
   *  a genuinely new one: an actual 🔒 locked state.
   *
   *  BEHAVIOR CHANGE, flagged deliberately: the OLD renderCategories()
   *  had a "BUGFIX" comment saying categories should NEVER be locked
   *  ("every category with content is always open to browse/
   *  practice"), by explicit product decision at the time. Rev 4's
   *  Unit Map / trail explicitly asks for locked/current/done NODES
   *  (PIVOT_CHECKLIST.md Phase 4, item 2) — which only means something
   *  if categories themselves can actually be locked. This revision
   *  reintroduces per-category locking via LWProgress.isCategoryUnlocked
   *  (already implemented, cross-unit, in Phase 3 — see progress.js)
   *  specifically BECAUSE Rev 4 asks for it, reversing that earlier
   *  Rev 3 decision. Flagging this in case that reversal wasn't what
   *  was intended — it's a real, visible behavior change for anyone
   *  who could previously skip ahead into medium/intermediate content
   *  freely. */
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
      // Safety net only — every shipped category has real SIGNS
      // content today (same note as pre-Phase-4 renderCategories()).
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--${cat.level}">Content coming soon</span>
        </div>
      `;
    }

    if (isReference) {
      // Phrasebook — never gated, no assessment concept (Rev 4
      // "Suggested removals" #2).
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

  /** "Pick a category" screen for a unit with more than one category
   *  (today: Unit 5 Common Things & People — 4 live + 8 comingSoon;
   *  Unit 7 Phrasebook — 18, all live, all reference-mode). Replaces
   *  the old level-scoped renderCategories()/MODULE_GROUPS pair with
   *  a unit-scoped equivalent. */
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

  /** Unit 0 — "Welcome to ASL". First screen that actually renders
   *  UNIT0_CONTENT (added in Phase 1, unrendered until now — see the
   *  header comment). Also links out to the existing, more complete
   *  pages/intro-to-asl.html (Rev 3 content: ASL history, Stokoe's
   *  parameters, learning tips) rather than duplicating it — see the
   *  Phase 4 session log for why both now coexist instead of one
   *  replacing the other; that overlap is flagged there for Joshua,
   *  not resolved unilaterally here. */
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
        <a href="intro-to-asl.html" class="lesson-card category-card lesson-card--intro">
          <div class="category-card__icon">📖</div>
          <span class="category-card__title">Want more? Read the full Introduction to ASL</span>
          <span class="badge badge--basic">History, Deaf culture &amp; etiquette, learning tips</span>
        </a>
        <button type="button" class="btn btn--primary mt-4" data-continue-to-alphabet>Continue to the Alphabet →</button>
      </div>
    `;

    grid.querySelector('[data-continue-to-alphabet]')?.addEventListener('click', () => {
      const alphabetUnit = window.LWData.getUnits().find(u => u.id === 'alphabet');
      if (alphabetUnit) renderUnitView(alphabetUnit);
    });
  }

  /** Opens whatever screen a given unit resolves to: the info screen
   *  (kind:'info'), straight into its one category (any
   *  category-group/reference unit with exactly one CATEGORIES entry
   *  — Alphabet, Numbers, Everyday Essentials, Basic Phrases today),
   *  or the multi-category picker (Common Things & People, Phrasebook).
   *  kind:'interactive' isn't handled here — its trail node is a
   *  direct <a> into lesson.html (see renderUnitNode), so clicking it
   *  never calls this function; the branch below is only a safety net
   *  if something else ever calls renderUnitView('fingerspell_name'). */
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

  // BUGFIX (PIVOT_CHECKLIST.md "Bugs observed" #1, 2026-08-22 screenshot
  // review, root-caused this session): getUnitState() used to mark EVERY
  // unlocked-but-not-fully-passed category-group unit 'current'
  // independently. Under normal sequential unlocking that's usually only
  // one unit at a time so the bug was invisible — but with
  // DEBUG_UNLOCK_ALL true (see AI_MEMORY.md §0 — Joshua's own flag,
  // intentionally on while he tests) EVERY category-group unit is
  // simultaneously "unlocked", so all of them computed to 'current' and
  // rendered with the identical accent-border/shadow style. That reads
  // as "no current highlight at all" (nothing stands out when everything
  // is highlighted the same way) — exactly what the screenshot review
  // reported, and why dashboard.js's own "You are here" badge (driven by
  // its getCurrentDestination(), which walks the chain and stops at the
  // FIRST unlocked+unpassed category) disagreed with this page on the
  // same underlying data. This mirrors that same "stop at the first one"
  // rule so both surfaces agree regardless of the debug flag.
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
   *  status: 'available' (info/interactive/reference — never gated, and
   *          also used for a category-group unit that's unlocked+
   *          incomplete but ISN'T the one 'current' unit — see BUGFIX
   *          above) | 'locked' | 'current' | 'done' (category-group only).
   *  @param {string|null} currentUnitId - from findCurrentUnitId(), the
   *         one unit id (if any) allowed to render as 'current'. */
  function getUnitState(unit, currentUnitId) {
    if (unit.kind === 'info')        return { status: 'available', label: 'Start here' };
    // CHANGED (this session) — was unconditionally "Practice drill ·
    // always open". Fingerspell Your Name is now a gated assessment
    // (see data.js's fingerspell_name UNITS entry, `gated: true`,
    // confirmed 2026-08-23) — label now reflects pass state instead of
    // always implying it's optional. Generalized on unit.gated/unit.id
    // rather than hardcoding 'fingerspell_name' a second time (the href
    // below already did, kept as-is — same convention already in use
    // here before this session).
    if (unit.kind === 'interactive') {
      const href = 'lesson.html?level=basic&category=fingerspell_name';
      if (!unit.gated) return { status: 'available', label: 'Practice drill · always open', href };
      const passed = !!window.LWProgress?.getUnitAssessment?.(unit.id)?.passed;
      return passed
        ? { status: 'done', label: 'Assessment passed', href }
        : { status: 'available', label: 'Assessment · required to continue', href };
    }
    // WORDING FIX (PIVOT_CHECKLIST.md §12, same session as the
    // renderWordPicker() tailHtml fix above): was "Browse only, no quiz
    // yet". §12's own checklist text says this phrase can be kept for
    // Unit 7 "if desired", but dashboard.js's equivalent unit-row
    // string already reads "Browse only, no assessment yet" for this
    // exact same unit/concept (see its unitRowHtml() call for
    // kind:'reference') — matching that verbatim was picked over
    // keeping "quiz", since the whole point of this checklist item is
    // one word per concept across dashboard/learn/lesson, and
    // "assessment" is the term every other surface already converged
    // on (see dashboard.js's header comment, flagged there but not
    // fixed since learn.js wasn't in that session's scope).
    if (unit.kind === 'reference')   return { status: 'available', label: 'Browse only, no assessment yet' };

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
    // CHANGED: only the ONE unit findCurrentUnitId() picked gets the
    // 'current' highlight now; every other unlocked-but-incomplete unit
    // (only reachable today via DEBUG_UNLOCK_ALL) falls back to
    // 'available' — same as info/interactive/reference — so it renders
    // with no special border, same label text as before.
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
    const stateClass = state.status === 'locked' ? ' lesson-card--locked'
      : state.status === 'done' ? ' lesson-card--done'
      : state.status === 'current' ? ' lesson-card--current' : '';

    const inner = `
      <div class="trail-node__num">${icon}</div>
      <div class="trail-node__body">
        <span class="trail-node__title">Unit ${unit.order} · ${escapeHtml(unit.title)}</span>
        <span class="badge ${badgeClassForStatus(state.status)}">${escapeHtml(state.label)}</span>
      </div>
    `;

    if (state.href) {
      return `<a href="${state.href}" class="trail-node${stateClass}">${inner}</a>`;
    }
    if (state.clickable === false) {
      return `<div class="trail-node${stateClass}">${inner}</div>`;
    }
    return `<button type="button" class="trail-node${stateClass}" data-open-unit="${escapeHtml(unit.id)}">${inner}</button>`;
  }

  /** Default / root view — the trail itself. */
  function renderTrail() {
    history.replaceState(null, '', 'learn.html');
    setContext('');
    setBack(null);
    grid.classList.remove('lesson-grid--categories');
    grid.classList.add('trail');

    const units = window.LWData.getUnits();
    const currentUnitId = findCurrentUnitId(units);
    grid.innerHTML = units.map(u => renderUnitNode(u, currentUnitId)).join('');

    grid.querySelectorAll('[data-open-unit]').forEach(el => {
      el.addEventListener('click', () => {
        const unit = units.find(u => u.id === el.dataset.openUnit);
        if (unit) renderUnitView(unit);
      });
    });
  }

  /** Best-effort continuity for old `?level=X` links now that there's
   *  no more per-level screen to send them to (js/quiz.js and
   *  pages/dashboard.html/intro-to-asl.html still build these — see
   *  the file header). Scrolls the trail to a representative unit for
   *  that level instead of just always dropping the learner at the
   *  very top. Not a perfect mapping (medium/intermediate span
   *  multiple units) — picks the FIRST unit that level's content
   *  starts appearing in. */
  function scrollToLevel(level) {
    const unitIdByLevel = { basic: 'alphabet', medium: 'everyday_essentials', intermediate: 'phrasebook' };
    const targetId = unitIdByLevel[level];
    if (!targetId) return;
    const el = grid.querySelector(`[data-open-unit="${targetId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      if (cat) { renderCategoryView(cat); return; }
    }
    if (unitParam) {
      const unit = window.LWData.getUnits().find(u => u.id === unitParam);
      if (unit) { renderUnitView(unit); return; }
    }

    renderTrail();
    if (legacyLevel) scrollToLevel(legacyLevel);
  }

  // Design pass, 2026-08-23: belt-and-suspenders, same reasoning as
  // js/dashboard.js's matching try/catch around its own render calls.
  // None of the render* functions above are expected to throw (the
  // window.LWData guard right above already covers the one case that
  // would make ALL of them fail at once), but a future data.js shape
  // change or an unexpected URL param combo making one function throw
  // partway through shouldn't leave the learner stuck on a half-
  // rendered or blank grid with nothing but a silent console error.
  try {
    boot();
  } catch (e) {
    console.error('[learn.js] rendering failed partway through:', e);
    showLearnUnavailable('render threw: ' + (e && e.message));
  }
});