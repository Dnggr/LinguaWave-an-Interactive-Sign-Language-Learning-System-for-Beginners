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
 *            "Coming Soon" tile. Cards show just the category name —
 *            not its word list — so the grid stays scannable.
 *
 * TODO     : Once Firestore is live, swap LWData for a real read from
 *            the "lessons"/"categories" collections — the render
 *            functions below can stay as-is, only the data source
 *            changes.
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

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('lesson-grid');
  const tabs = document.querySelectorAll('.level-tab');

  const params = new URLSearchParams(window.location.search);
  const initialLevel = params.get('level') || 'basic';

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
        <a href="lesson.html?level=basic&sign=${letter}" class="lesson-card${done ? ' lesson-card--done' : ''}">
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
        <a href="quiz.html?level=${level}&category=${categoryId}" class="lesson-card category-card" style="border-color: rgba(63,185,80,.4);">
          <div class="category-card__icon">🏆</div>
          <span class="category-card__title">Retake Assessment</span>
          <span class="badge badge--basic">Passed · ${Math.round((progress.assessment.bestScore||0)*100)}%</span>
        </a>
      `;
    }
    if (allPracticed) {
      return `
        <a href="quiz.html?level=${level}&category=${categoryId}" class="lesson-card category-card">
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
   *  named only — no word-list preview. Categories with real sign
   *  content now show practiced/assessment state and lock until the
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
          return `
            <a href="lesson.html?level=${level}&category=${cat.id}" class="lesson-card category-card">
              <div class="category-card__icon">${icon}</div>
              <span class="category-card__title">${cat.title}</span>
              <span class="badge badge--${level}">Preview</span>
            </a>
          `;
        }

        const unlocked = window.LWProgress?.isCategoryUnlocked?.(level, cat.id) ?? true;
        const progress = window.LWProgress?.getCategoryProgress?.(level, cat.id) ?? { signs: {}, assessment: null };
        const passed   = !!progress.assessment?.passed;

        if (!unlocked) {
          return `
            <div class="lesson-card category-card lesson-card--locked">
              <div class="category-card__icon">🔒</div>
              <span class="category-card__title">${cat.title}</span>
              <span class="badge badge--locked">Pass the previous category first</span>
            </div>
          `;
        }

        const signParam = `&sign=${signs[0]}`;
        const statusBadge = passed
          ? `<span class="badge badge--basic">✔ Passed · ${Math.round((progress.assessment.bestScore||0)*100)}%</span>`
          : `<span class="badge badge--${level}">Start →</span>`;

        return `
          <a href="lesson.html?level=${level}&category=${cat.id}${signParam}" class="lesson-card category-card${passed ? ' lesson-card--done' : ''}">
            <div class="category-card__icon">${icon}</div>
            <span class="category-card__title">${cat.title}</span>
            ${statusBadge}
          </a>
        `;
      }
      // Kept for any future comingSoon category.
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${cat.title}</span>
          <span class="badge badge--locked">Coming Soon</span>
        </div>
      `;
    }).join('');

    grid.innerHTML = cards + renderLevelFinalCTA(level);
  }

  /** Level-final assessment CTA — appears once every live category in
   *  the level has passed its own category assessment. */
  function renderLevelFinalCTA(level) {
    const stats = window.LWProgress?.getLevelStats?.(level);
    if (!stats || stats.liveCategories === 0) return '';

    if (stats.levelFinalUnlocked) {
      const passed = !!stats.levelAssessment?.passed;
      return `
        <a href="quiz.html?level=${level}&final=1" class="lesson-card category-card" style="border-color: var(--clr-accent);">
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

  function renderLevel(level) {
    if (level === 'basic') {
      renderAlphabet();
    } else {
      renderCategories(level);
    }
  }

  // Tab switching — every tab is enabled, so any click just re-renders.
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.level);
      renderLevel(tab.dataset.level);
      history.replaceState(null, '', `learn.html?level=${tab.dataset.level}`);
    });
  });

  activateTab(initialLevel);
  renderLevel(initialLevel);
});