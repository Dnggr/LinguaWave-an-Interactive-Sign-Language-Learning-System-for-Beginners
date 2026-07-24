/**
 * learn.js — Lesson Selector Logic
 * ─────────────────────────────────────────────────────────────────
 * CONNECTS : pages/learn.html (reads window.LWData from js/data.js)
 * PURPOSE  : Reads ?level= URL param (or the clicked tab), activates
 *            the matching tab, and renders the lesson grid for that
 *            level straight from LWData:
 *              level=basic        → LETTERS  (26-letter alphabet grid)
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
  alphabet: '🔤',
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

  /** Basic level: the existing 26-letter alphabet grid, now with real
   *  practiced state + a category-assessment CTA once every letter's
   *  been viewed at least once. */
  function renderAlphabet() {
    grid.classList.remove('lesson-grid--categories');
    const letters = window.LWData.getCategorySigns('basic', 'alphabet');
    const progress = window.LWProgress?.getCategoryProgress?.('basic', 'alphabet') ?? { signs: {}, assessment: null };

    grid.innerHTML = letters.map(letter => {
      const done = !!progress.signs[letter];
      return `
        <a href="lesson.html?level=basic&sign=${encodeURIComponent(letter)}" class="lesson-card${done ? ' lesson-card--done' : ''}">
          <div class="lesson-card__letter">${letter}${done ? ' ✔' : ''}</div>
          <span class="lesson-card__title">Letter ${letter}</span>
        </a>
      `;
    }).join('') + renderCategoryAssessmentCTA('basic', 'alphabet', letters, progress);
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

    const cards = categories.map(cat => {
      const icon = CATEGORY_ICONS[cat.id] ?? '🔖';

      if (!cat.comingSoon) {
        const signs = window.LWData.getCategorySigns(level, cat.id);
        const hasContent = signs.length > 0;
        if (!hasContent) {
          // Safety net only — every shipped category now has real
          // SIGNS content, so this stays a plain (non-clickable)
          // preview instead of linking into an empty lesson.
          return `
            <div class="lesson-card category-card lesson-card--locked">
              <div class="category-card__icon">${icon}</div>
              <span class="category-card__title">${escapeHtml(cat.title)}</span>
              <span class="badge badge--${level}">Content coming soon</span>
            </div>
          `;
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
        return `
          <button type="button" class="lesson-card category-card${passed ? ' lesson-card--done' : ''}" data-open-category="${escapeHtml(cat.id)}">
            <div class="category-card__icon">${icon}</div>
            <span class="category-card__title">${escapeHtml(cat.title)}</span>
            ${statusBadge}
          </button>
        `;
      }
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${escapeHtml(cat.title)}</span>
          <span class="badge badge--locked">Coming Soon</span>
        </div>
      `;
    }).join('');

    grid.innerHTML = cards + renderLevelFinalCTA(level);

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
      renderAlphabet();
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