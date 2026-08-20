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
};

// NEW (Phase 4) — one icon per UNITS entry, for the trail nodes.
// Replaces MODULE_GROUPS, which grouped categories WITHIN a level for
// the old card-grid screen — UNITS is now itself the grouping/ordering
// layer, so MODULE_GROUPS (and the renderCategories() function that
// consumed it) is gone rather than kept alongside a second grouping
// mechanism that would just fight the trail for authority over order.
const UNIT_ICONS = {
  welcome: '👋', alphabet: '🔤', fingerspell_name: '🖊️', numbers: '🔢',
  everyday_essentials: '🙏', common_things_people: '🗂️',
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

document.addEventListener('DOMContentLoaded', () => {
  const grid       = document.getElementById('lesson-grid');
  const contextEl  = document.getElementById('learn-context');
  const backLinkEl = document.getElementById('learn-back-link');
  if (!grid) return;

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

  function setBack(fn, label) {
    backTarget = fn;
    if (!backLinkEl) return;
    if (!fn) { backLinkEl.style.display = 'none'; return; }
    backLinkEl.style.display = '';
    backLinkEl.textContent = label || '← Back to Trail';
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
    if (allPracticed) {
      return `
        <a href="quiz.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(categoryId)}" class="lesson-card category-card">
          <div class="category-card__icon">📝</div>
          <span class="category-card__title">Take Category Assessment</span>
          <span class="badge badge--${level}">Ready · ${practicedCount}/${signs.length} viewed</span>
        </a>
      `;
    }
    return `
      <div class="lesson-card category-card lesson-card--locked">
        <div class="category-card__icon">📝</div>
        <span class="category-card__title">Category Assessment</span>
        <span class="badge badge--locked">${practicedCount}/${signs.length} viewed</span>
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
    setBack(opts.backFn ?? renderTrail, opts.backLabel ?? '← Back to Trail');
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
    setBack(opts.backFn ?? renderTrail, opts.backLabel ?? '← Back to Trail');
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
          <span class="badge badge--locked">No quiz or camera check yet</span>
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
    setBack(renderTrail, '← Back to Trail');
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
    setBack(renderTrail, '← Back to Trail');
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
      renderCategoryView(allCats[0], { backFn: renderTrail, backLabel: '← Back to Trail' });
      return;
    }
    renderUnitCategoryList(unit);
  }

  /** Computes a trail node's lock/progress state.
   *  status: 'available' (info/interactive/reference — never gated) |
   *          'locked' | 'current' | 'done' (category-group units only). */
  function getUnitState(unit) {
    if (unit.kind === 'info')        return { status: 'available', label: 'Start here' };
    if (unit.kind === 'interactive') return { status: 'available', label: 'Practice drill · always open', href: 'lesson.html?level=basic&category=fingerspell_name' };
    if (unit.kind === 'reference')   return { status: 'available', label: 'Browse only, no quiz yet' };

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
    return {
      status: done ? 'done' : 'current',
      label: done ? `Complete · ${passedCount}/${liveCats.length}` : `${passedCount}/${liveCats.length} categories passed`,
    };
  }

  function badgeClassForStatus(status) {
    if (status === 'locked') return 'badge--locked';
    if (status === 'done')   return 'badge--done';
    return 'badge--basic';
  }

  function renderUnitNode(unit) {
    const state = getUnitState(unit);
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
    grid.innerHTML = units.map(renderUnitNode).join('');

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

  boot();
});