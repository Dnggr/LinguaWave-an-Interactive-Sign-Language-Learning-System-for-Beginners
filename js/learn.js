/**
 * learn.js — Lesson Selector Logic
 * ─────────────────────────────────────────────────────────────────
 * CONNECTS : pages/learn.html (reads window.LWData from js/data.js)
 * PURPOSE  : Reads ?level= URL param (or the clicked tab), activates
 *            the matching tab, and renders the lesson grid for that
 *            level straight from LWData:
 *              level=basic        → LETTERS/NUMBERS (flat grid, one
 *                                    sub-tab per basic category —
 *                                    Alphabet A-Z, Numbers 0-9)
 *              level=medium        → WORDS     (one card per category)
 *              level=intermediate  → PHRASES   (one card per category)
 *            Basic, Medium, and Intermediate are all unlocked — every
 *            tab is clickable. A category card is only a clickable
 *            lesson link when it has an actual SIGNS entry
 *            (comingSoon: false); everything else renders as a
 *            "Coming Soon" tile.
 *
 * ─────────────────────────────────────────────────────────────────
 * BUGFIX (this revision) — "categories skip straight to the lesson,
 * I can't see/pick a word or phrase"
 * ─────────────────────────────────────────────────────────────────
 * WHAT WAS WRONG:
 *   1. Clicking a Medium/Intermediate category card linked straight
 *      into lesson.html?...&sign=<first word> — there was never a
 *      screen listing the words/phrases in that category, so there
 *      was nothing to "pick." That's BUG A below.
 *   2. Most Medium/Intermediate categories had a `words` preview
 *      list in data.js but NO matching SIGNS content entries, so
 *      getCategorySigns() returned [] for them. That made
 *      `hasContent` false and routed those categories into a plain
 *      "Preview" card with no ?sign= param at all — which is what
 *      caused lesson.js to fall back to the literal letter 'A' (see
 *      lesson.js BUG 11 for that half of the fix). CONTENT for every
 *      one of those categories has now been added in data.js, so
 *      this branch of renderCategories() below is effectively dead
 *      for the shipped categories (kept as a safe fallback only for
 *      any future category that's added without content yet).
 *   3. Category/sign links were built with raw template strings
 *      (`&sign=${signs[0]}`) with no URL-encoding. Intermediate
 *      "words" are full phrases with spaces, apostrophes, and
 *      question marks (e.g. "WHAT'S YOUR NAME?") — unencoded, those
 *      break the URL. Fixed by encodeURIComponent() everywhere a
 *      category id or sign/phrase goes into an href.
 *
 * THE FIX:
 *   - New renderWordPicker(level, categoryId) renders a "pick a
 *     word/phrase" screen: one card per SIGNS entry in that
 *     category, each linking to its own lesson.html?...&sign=X.
 *   - Category cards now call showPicker(level, cat.id) instead of
 *     being a direct <a> into lesson.html.
 *   - ?category= is now also read from the URL on load, so a picker
 *     can be deep-linked/refreshed/back-button'd directly.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per category id, purely decorative. Falls back to a
// generic bookmark icon for anything not listed here.
const CATEGORY_ICONS = {
  alphabet: '🔤', numbers: '🔢',
  family: '👪', places: '🏠', time: '⏰', temperature: '🌡️', food: '🍎',
  clothes: '👕', health: '🩹', feelings: '😊', requests: '🙏', amounts: '📏',
  colors: '🎨', money: '💵', animals: '🐾',
  greetings_intro: '👋', basic_responses: '💬', family_phrases: '👨‍👩‍👧',
  daily_needs: '🥤', asking_questions: '❓', polite_expressions: '🙌',
  affection_feelings: '❤️', describing_things: '🖍️', self_introduction: '🧑',
  daily_activities: '📅', family_conversations: '🗣️', talking_about_feelings: '💭',
  asking_for_help: '🆘', school_conversations: '🏫', shopping_ordering: '🛍️',
  social_conversations: '🎉', emergency_situations: '🚨', everyday_dialogues: '💡',
};

// NEW — pure presentation grouping for the "Cisco-academy-style structure"
// request. Doesn't touch data.js's CATEGORIES schema at all — categories
// stay exactly what they were (flat level -> category -> signs); this is
// only about how they're VISUALLY organized on the learn page. Any
// category not listed here (a brand new one added later and forgotten
// about here, or the sequence_demo proof-of-concept category) automatically
// falls into a trailing "More" group in renderCategories() below, rather
// than silently disappearing.
const MODULE_GROUPS = {
  medium: [
    { title: 'Module 1 · Family & People', categoryIds: ['family'] },
    { title: 'Module 2 · Places & Time', categoryIds: ['places', 'time'] },
    { title: 'Module 3 · Everyday Life', categoryIds: ['temperature', 'food', 'clothes', 'health'] },
    { title: 'Module 4 · Feelings & Requests', categoryIds: ['feelings', 'requests'] },
    { title: 'Module 5 · Colors, Money & Amounts', categoryIds: ['colors', 'money', 'amounts'] },
    { title: 'Module 6 · Animals', categoryIds: ['animals'] },
  ],
  intermediate: [
    // Matches the teammate's Level 2 (Basic phrases) vs Level 3
    // (Intermediate conversations) split, even though data.js keeps
    // both under one flat 'intermediate' level under the hood.
    { title: 'Module 1 · Everyday Phrases', categoryIds: [
      'greetings_intro', 'basic_responses', 'family_phrases', 'daily_needs',
      'asking_questions', 'polite_expressions', 'affection_feelings', 'describing_things',
    ] },
    { title: 'Module 2 · Conversations', categoryIds: [
      'self_introduction', 'daily_activities', 'family_conversations',
      'talking_about_feelings', 'asking_for_help', 'school_conversations',
      'shopping_ordering', 'social_conversations', 'emergency_situations',
      'everyday_dialogues',
    ] },
  ],
};

// Escapes text dropped into innerHTML (category titles/words are all
// hardcoded in data.js, but this keeps the render helpers safe if
// that ever changes).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('lesson-grid');
  const tabs = document.querySelectorAll('.level-tab');

  const params = new URLSearchParams(window.location.search);
  const initialLevel = params.get('level') || 'basic';
  const initialCategory = params.get('category') || null;

  function activateTab(level) {
    tabs.forEach(t => t.classList.toggle('level-tab--active', t.dataset.level === level));
  }

  // NEW — card-title prefix for each basic-level category's flat grid.
  // 'alphabet' -> 'Letter A', 'numbers' -> 'Number 3'. Any future basic
  // category not listed here just shows the raw signId as its title.
  const BASIC_LABEL_PREFIX = { alphabet: 'Letter', numbers: 'Number' };

  /** Basic level: a flat grid of single-character cards (was the
   *  26-letter-only "alphabet grid"; RENAMED + generalized to take a
   *  categoryId so the same function now also drives the 'numbers'
   *  category, 0–9, added alongside it). Real practiced state + a
   *  category-assessment CTA once every sign's been viewed at least
   *  once — unchanged from before.
   *
   *  When basic has more than one live category, a small sub-tab
   *  switcher (reusing the .level-tabs/.level-tab styles already used
   *  for the top-level Basic/Medium/Intermediate tabs) is shown above
   *  the grid so the learner can flip between Alphabet and Numbers
   *  without leaving level=basic. */
  function renderBasicCategory(categoryId) {
    grid.classList.remove('lesson-grid--categories');
    const basicCats = window.LWData.getCategoriesForLevel('basic').filter(c => !c.comingSoon);
    // Guard: if an unknown/comingSoon category id sneaks in via the URL,
    // fall back to 'alphabet' rather than rendering an empty grid.
    if (!basicCats.some(c => c.id === categoryId)) categoryId = 'alphabet';

    const signs = window.LWData.getCategorySigns('basic', categoryId);
    const progress = window.LWProgress?.getCategoryProgress?.('basic', categoryId) ?? { signs: {}, assessment: null };
    const labelPrefix = BASIC_LABEL_PREFIX[categoryId] ?? '';

    // Sub-tab switcher — only worth showing once there's more than one
    // live basic category (today: Alphabet + Numbers).
    const subTabsHtml = basicCats.length > 1 ? `
      <div class="level-tabs" style="grid-column: 1 / -1; margin-bottom: var(--space-6);">
        ${basicCats.map(c => `
          <button type="button" class="level-tab${c.id === categoryId ? ' level-tab--active' : ''}" data-basic-category="${escapeHtml(c.id)}">
            ${CATEGORY_ICONS[c.id] ?? '🔖'} ${escapeHtml(c.title)}
          </button>
        `).join('')}
      </div>
    ` : '';

    // NEW — Module 1: Introduction to ASL. Pure reading content (History
    // of ASL, Deaf Awareness, Deaf Culture, etc.) — no camera, no
    // detection model, so it's a standalone static page rather than
    // living inside lesson.js's camera-driven flow. Shown once, above
    // the alphabet grid, as the natural "start here" entry point.
    // Only shown on the Alphabet tab so it doesn't repeat on Numbers.
    const introBanner = categoryId === 'alphabet' ? `
      <a href="intro-to-asl.html" class="lesson-card category-card lesson-card--intro" style="grid-column: 1 / -1;">
        <div class="category-card__icon">📖</div>
        <span class="category-card__title">Module 1 · Introduction to ASL</span>
        <span class="badge badge--basic">What is ASL, Deaf culture & etiquette, learning tips</span>
      </a>
    ` : '';

    grid.innerHTML = subTabsHtml + introBanner + signs.map(signId => {
      const done = !!progress.signs[signId];
      return `
        <a href="lesson.html?level=basic&category=${encodeURIComponent(categoryId)}&sign=${encodeURIComponent(signId)}" class="lesson-card${done ? ' lesson-card--done' : ''}">
          <div class="lesson-card__letter">${escapeHtml(signId)}${done ? ' ✔' : ''}</div>
          <span class="lesson-card__title">${labelPrefix ? `${labelPrefix} ${escapeHtml(signId)}` : escapeHtml(signId)}</span>
        </a>
      `;
    }).join('') + renderCategoryAssessmentCTA('basic', categoryId, signs, progress);

    grid.querySelectorAll('[data-basic-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newCat = btn.dataset.basicCategory;
        history.replaceState(null, '', `learn.html?level=basic&category=${encodeURIComponent(newCat)}`);
        renderBasicCategory(newCat);
      });
    });
  }

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

  /** Medium (words) / Intermediate (phrases): one card per category,
   *  named only — no word-list preview on this screen (the picker
   *  screen below shows the words). Categories with real sign
   *  content show practiced/assessment state and lock until the
   *  PREVIOUS live category's assessment has been passed. */
  function renderCategories(level) {
    grid.classList.add('lesson-grid--categories');
    const categories = window.LWData.getCategoriesForLevel(level);

    // CHANGED: build each category's card HTML keyed by id first (same
    // card markup as before, unchanged), THEN decide how to arrange them
    // — this is what makes the module grouping below possible without
    // touching any of the actual card-building logic.
    const cardById = {};
    categories.forEach(cat => {
      const icon = CATEGORY_ICONS[cat.id] ?? '🔖';

      if (!cat.comingSoon) {
        const signs = window.LWData.getCategorySigns(level, cat.id);
        const hasContent = signs.length > 0;
        if (!hasContent) {
          // Safety net only — every shipped category now has real
          // SIGNS content, so this stays a plain (non-clickable)
          // preview instead of linking into an empty lesson.
          cardById[cat.id] = `
            <div class="lesson-card category-card lesson-card--locked">
              <div class="category-card__icon">${icon}</div>
              <span class="category-card__title">${escapeHtml(cat.title)}</span>
              <span class="badge badge--${level}">Content coming soon</span>
            </div>
          `;
          return;
        }

        // BUGFIX (this revision): categories were being locked behind
        // "pass the previous category first" via LWProgress.isCategoryUnlocked.
        // Per feedback, categories should never be locked — every
        // category with content is always open to browse/practice.
        const progress = window.LWProgress?.getCategoryProgress?.(level, cat.id) ?? { signs: {}, assessment: null };
        const passed   = !!progress.assessment?.passed;

        const statusBadge = passed
          ? `<span class="badge badge--basic">✔ Passed · ${Math.round((progress.assessment.bestScore||0)*100)}%</span>`
          : `<span class="badge badge--${level}">${signs.length} word${signs.length === 1 ? '' : 's'} · View →</span>`;

        // BUGFIX: this used to link straight into lesson.html with
        // &sign=${signs[0]}, skipping any chance to pick a word or
        // phrase. It now opens the word/phrase picker instead.
        cardById[cat.id] = `
          <button type="button" class="lesson-card category-card${passed ? ' lesson-card--done' : ''}" data-open-category="${escapeHtml(cat.id)}">
            <div class="category-card__icon">${icon}</div>
            <span class="category-card__title">${escapeHtml(cat.title)}</span>
            ${statusBadge}
          </button>
        `;
        return;
      }
      cardById[cat.id] = `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--locked">Coming Soon</span>
        </div>
      `;
    });

    // NEW: arrange the cards built above into module sections instead of
    // one flat grid. Any category id not claimed by a group (new
    // categories added later, or the sequence_demo proof-of-concept) ends
    // up in a trailing "More" section automatically — nothing silently
    // disappears just because MODULE_GROUPS wasn't updated for it.
    const groups = MODULE_GROUPS[level] ?? [];
    const claimedIds = new Set(groups.flatMap(g => g.categoryIds));
    const leftoverIds = categories.map(c => c.id).filter(id => !claimedIds.has(id));

    let sectionsHtml = groups.map(group => {
      const cardsHtml = group.categoryIds.filter(id => cardById[id]).map(id => cardById[id]).join('');
      if (!cardsHtml) return ''; // group has no matching categories in this data set — skip silently
      return `
        <h3 class="module-header">${escapeHtml(group.title)}</h3>
        <div class="lesson-grid lesson-grid--categories module-section">${cardsHtml}</div>
      `;
    }).join('');

    if (leftoverIds.length > 0) {
      const leftoverHtml = leftoverIds.map(id => cardById[id]).join('');
      const leftoverTitle = groups.length > 0 ? 'More' : null; // only label it if there WERE real groups above
      sectionsHtml += `
        ${leftoverTitle ? `<h3 class="module-header">${leftoverTitle}</h3>` : ''}
        <div class="lesson-grid lesson-grid--categories module-section">${leftoverHtml}</div>
      `;
    }

    grid.classList.remove('lesson-grid--categories'); // the outer grid is no longer itself the card grid — each module-section is
    // FIX: this card used to be appended directly to grid.innerHTML,
    // unwrapped — same bug as the module sections above (it got
    // auto-placed as a narrow grid cell squeezed next to the last
    // section's last card instead of appearing on its own row).
    const finalCtaHtml = renderLevelFinalCTA(level);
    grid.innerHTML = sectionsHtml
      + (finalCtaHtml ? `<div class="lesson-grid lesson-grid--categories module-section">${finalCtaHtml}</div>` : '');

    // Wire up the category cards rendered above to open the picker.
    grid.querySelectorAll('[data-open-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        showPicker(level, btn.dataset.openCategory);
      });
    });
  }

  /** NEW — word/phrase picker screen for a single category. Lists
   *  every word/phrase in the category as its own clickable card so
   *  the learner can choose exactly what to study, instead of being
   *  dropped straight into the first item's lesson. */
  function renderWordPicker(level, categoryId) {
    const cat = window.LWData.getCategory(level, categoryId);
    if (!cat) { renderCategories(level); return; }

    grid.classList.add('lesson-grid--categories');
    const signs = window.LWData.getCategorySigns(level, categoryId);
    const progress = window.LWProgress?.getCategoryProgress?.(level, categoryId) ?? { signs: {}, assessment: null };

    const backBtn = `
      <button type="button" class="lesson-card category-card lesson-card--back" data-back-to-categories>
        <div class="category-card__icon">←</div>
        <span class="category-card__title">Back to Categories</span>
      </button>
    `;

    const wordCards = signs.map(signId => {
      const signData = window.LWData.getSign(level, signId);
      const done = !!progress.signs[signId];
      const label = signData?.title ?? signId;
      return `
        <a href="lesson.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(categoryId)}&sign=${encodeURIComponent(signId)}"
           class="lesson-card word-picker-card${done ? ' lesson-card--done' : ''}">
          <span class="lesson-card__title">${escapeHtml(label)}${done ? ' ✔' : ''}</span>
          <span class="word-picker-card__subtitle">${escapeHtml(signId)}</span>
        </a>
      `;
    }).join('');

    grid.innerHTML = backBtn + wordCards + renderCategoryAssessmentCTA(level, categoryId, signs, progress);

    grid.querySelector('[data-back-to-categories]')?.addEventListener('click', () => {
      history.replaceState(null, '', `learn.html?level=${encodeURIComponent(level)}`);
      renderCategories(level);
    });
  }

  /** Opens the picker for a category and updates the URL so it can
   *  be bookmarked/shared/refreshed directly. */
  function showPicker(level, categoryId) {
    history.replaceState(null, '', `learn.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(categoryId)}`);
    renderWordPicker(level, categoryId);
  }

  /** Level-final assessment CTA — appears once every live category in
   *  the level has passed its own category assessment. */
  function renderLevelFinalCTA(level) {
    const stats = window.LWProgress?.getLevelStats?.(level);
    if (!stats || stats.liveCategories === 0) return '';

    if (stats.levelFinalUnlocked) {
      const passed = !!stats.levelAssessment?.passed;
      return `
        <a href="quiz.html?level=${encodeURIComponent(level)}&final=1" class="lesson-card category-card" style="border-color: var(--clr-accent);">
          <div class="category-card__icon">🏁</div>
          <span class="category-card__title">${passed ? 'Retake' : 'Take'} Level Final Assessment</span>
          <span class="badge badge--${level}">${passed ? `✔ Passed · ${Math.round((stats.levelAssessment.bestScore||0)*100)}%` : 'All categories passed!'}</span>
        </a>
      `;
    }
    return `
      <div class="lesson-card category-card lesson-card--locked">
        <div class="category-card__icon">🏁</div>
        <span class="category-card__title">Level Final Assessment</span>
        <span class="badge badge--locked">${stats.passedCategories}/${stats.liveCategories} categories passed</span>
      </div>
    `;
  }

  function renderLevel(level, categoryId) {
    if (level === 'basic') {
      // CHANGED — used to unconditionally call renderAlphabet() with no
      // regard for categoryId, so a `?level=basic&category=numbers` deep
      // link (e.g. from the sub-tab switcher, or a bookmark) silently
      // always showed the alphabet. renderBasicCategory() defaults to
      // 'alphabet' itself when categoryId is null, so this preserves the
      // exact old behavior for plain `?level=basic` links.
      renderBasicCategory(categoryId || 'alphabet');
    } else if (categoryId) {
      renderWordPicker(level, categoryId);
    } else {
      renderCategories(level);
    }
  }

  // Tab switching — every tab is enabled, so any click just re-renders
  // at the category-grid level (clears any open picker).
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.level);
      renderLevel(tab.dataset.level, null);
      history.replaceState(null, '', `learn.html?level=${encodeURIComponent(tab.dataset.level)}`);
    });
  });

  activateTab(initialLevel);
  renderLevel(initialLevel, initialCategory);
});