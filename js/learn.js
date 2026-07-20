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

  /** Basic level: the existing 26-letter alphabet grid. */
  function renderAlphabet() {
    grid.classList.remove('lesson-grid--categories');
    const letters = window.LWData.getCategorySigns('basic', 'alphabet');
    grid.innerHTML = letters.map(letter => `
      <a href="lesson.html?level=basic&sign=${letter}" class="lesson-card">
        <div class="lesson-card__letter">${letter}</div>
        <span class="lesson-card__title">Letter ${letter}</span>
      </a>
    `).join('');
  }

  /** Medium (words) / Intermediate (phrases): one card per category,
   *  named only — no word-list preview. */
  function renderCategories(level) {
    grid.classList.add('lesson-grid--categories');
    const categories = window.LWData.getCategoriesForLevel(level);

    grid.innerHTML = categories.map(cat => {
      const icon = CATEGORY_ICONS[cat.id] ?? '🔖';

      if (!cat.comingSoon) {
        // Functional category — has real SIGNS entries, link straight
        // into the first sign's camera lesson.
        const firstSign = window.LWData.getCategorySigns(level, cat.id)[0];
        return `
          <a href="lesson.html?level=${level}&sign=${firstSign}" class="lesson-card category-card">
            <div class="category-card__icon">${icon}</div>
            <span class="category-card__title">${cat.title}</span>
            <span class="badge badge--${level}">Start →</span>
          </a>
        `;
      }
      // Coming-soon category — name only, not clickable yet.
      return `
        <div class="lesson-card category-card lesson-card--locked">
          <div class="category-card__icon">${icon}</div>
          <span class="category-card__title">${cat.title}</span>
          <span class="badge badge--locked">Coming Soon</span>
        </div>
      `;
    }).join('');
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