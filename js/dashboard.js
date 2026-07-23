/**
 * js/dashboard.js — Live Progress Rendering
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Replaces the hardcoded numbers in pages/dashboard.html
 *            with real values from window.LWProgress: per-level
 *            percentage complete, signs practiced, category-assessment
 *            status, and the "Signs You've Learned" recap grid.
 * CONNECTS : pages/dashboard.html (after js/data.js + js/engine/progress.js)
 * TODO     : Once Firestore is live, LWProgress itself swaps its
 *            storage backend — this file doesn't need to change.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const LEVELS = ['basic', 'medium', 'intermediate'];

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function renderLevelCard(level) {
  const card = document.querySelector(`[data-level-card="${level}"]`);
  if (!card || !window.LWProgress) return;

  const stats = window.LWProgress.getLevelStats(level);
  const pctEl    = card.querySelector('[data-pct]');
  const barEl    = card.querySelector('.progress-bar__fill');
  const countEl  = card.querySelector('[data-count]');
  const statusEl = card.querySelector('[data-assessment-status]');
  const ctaEl    = card.querySelector('[data-cta]');

  if (!stats.unlocked) {
    if (pctEl) pctEl.textContent = '🔒';
    if (countEl) countEl.textContent = `Locked — pass the previous level's final assessment first`;
    if (statusEl) statusEl.textContent = '';
    if (ctaEl) { ctaEl.textContent = 'Locked'; ctaEl.classList.add('btn--ghost'); ctaEl.removeAttribute('href'); }
    if (barEl) { barEl.dataset.progress = 0; barEl.style.width = '0%'; }
    return;
  }

  if (pctEl) pctEl.textContent = `${stats.pct}%`;
  if (barEl) { barEl.dataset.progress = stats.pct; barEl.style.width = `${stats.pct}%`; }
  if (countEl) countEl.textContent = `${stats.practicedSigns} / ${stats.totalSigns || '—'} signs practiced`;

  if (statusEl) {
    if (stats.liveCategories === 0) {
      statusEl.textContent = 'No lessons trained yet for this level.';
    } else if (stats.levelAssessment?.passed) {
      statusEl.textContent = `✔ Level assessment passed (${Math.round((stats.levelAssessment.bestScore || 0) * 100)}%)`;
    } else if (stats.levelFinalUnlocked) {
      statusEl.textContent = `🏁 Ready for the level final assessment!`;
    } else {
      statusEl.textContent = `${stats.passedCategories} / ${stats.liveCategories} category assessments passed`;
    }
  }
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

  grid.innerHTML = learned.slice(-24).reverse().map(({ signId }) => `
    <div class="recap-card">
      <div class="recap-card__img" aria-label="ASL sign for ${signId}">${signId}</div>
      <span>${signId}</span>
    </div>
  `).join('');
}

function renderContinueButton() {
  const btn = document.querySelector('[data-continue-learning]');
  if (!btn || !window.LWProgress) return;

  for (const level of LEVELS) {
    if (!window.LWProgress.isLevelUnlocked(level)) continue;
    const live = window.LWProgress.liveCategoriesFor(level);
    for (const cat of live) {
      const prog = window.LWProgress.getCategoryProgress(level, cat.id);
      if (!prog.assessment?.passed && window.LWProgress.isCategoryUnlocked(level, cat.id)) {
        const signs = window.LWData.getCategorySigns(level, cat.id);
        const nextSign = signs.find(s => !prog.signs[s]) || signs[0];
        btn.href = `learn.html?level=${level}&category=${cat.id}` +
          (nextSign ? '' : '') ;
        btn.href = `lesson.html?level=${level}&category=${cat.id}&sign=${nextSign}`;
        return;
      }
    }
  }
  btn.href = 'learn.html';
}

document.addEventListener('DOMContentLoaded', () => {
  LEVELS.forEach(renderLevelCard);
  renderRecap();
  renderContinueButton();
});
