/**
 * js/missions-compare-page.js — Renderer for pages/missions-compare.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Dev-only Phase 2 comparison view. Populates the category
 *            picker from window.LWMissions.getLiveCategoryList() (every
 *            live category — Phase 3 makes all of them buildable, not
 *            just the Phase 1 pilot), defaults to the pilot's own
 *            'essentials_greetings', and renders
 *            window.LWMissionsCompare.getComparison()'s output as two
 *            side-by-side read-only columns. This file only ever
 *            reads state — it has no "mark complete" controls itself;
 *            use missions-preview.html and the real Learn/Lesson/Quiz
 *            pages to actually generate the data being compared.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderOldColumn(old) {
  if (!old.available) {
    return `
      <div class="devcmp-col card">
        <h2>Current system</h2>
        <p class="devcmp-unavailable">${old.reason}</p>
      </div>
    `;
  }

  const rows = old.signRows.map((r) => {
    const isDropOff = old.dropOffSignId === r.signId;
    const cls = r.practicedAt ? 'devcmp-row--done' : (isDropOff ? 'devcmp-row--dropoff' : '');
    return `
      <li class="devcmp-row ${cls}">
        <span>${r.signId}${isDropOff ? ' \u2190 drop-off' : ''}</span>
        <span class="devcmp-row__time">${r.practicedAt ? formatTime(r.practicedAt) : 'not practiced'}</span>
      </li>
    `;
  }).join('');

  const assessment = old.assessment
    ? `${old.assessment.passed ? 'Passed' : 'Not passed'} \u2014 best ${old.assessment.bestScore}%, ${old.assessment.attempts} attempt(s), last ${formatTime(old.assessment.lastAt)}`
    : 'Not attempted';

  return `
    <div class="devcmp-col card">
      <h2>Current system</h2>
      <div class="progress-bar"><div class="progress-bar__fill" style="--p:${old.percentComplete}"></div></div>
      <div class="devcmp-stat-line"><span>Signs practiced</span><span>${old.practicedCount} / ${old.totalSigns} (${old.percentComplete}%)</span></div>
      <div class="devcmp-stat-line"><span>Mastery quiz</span><span>${assessment}</span></div>
      <ul class="devcmp-rowlist" style="margin-top: var(--space-4);">${rows}</ul>
    </div>
  `;
}

function renderNewColumn(dv2) {
  if (!dv2.available) {
    return `
      <div class="devcmp-col card">
        <h2>Missions</h2>
        <p class="devcmp-unavailable">${dv2.reason}</p>
      </div>
    `;
  }

  const rows = dv2.itemRows.map((r) => {
    const isDropOff = dv2.dropOffItem && dv2.dropOffItem.index === r.index;
    const cls = r.complete ? 'devcmp-row--done' : (isDropOff ? 'devcmp-row--dropoff' : '');
    const label = r.kind === 'QUIZ' ? 'Mastery Quiz' : `${r.kind[0]}${r.kind.slice(1).toLowerCase()} \u2014 ${r.signId}`;
    return `
      <li class="devcmp-row ${cls}">
        <span>${label}${isDropOff ? ' \u2190 drop-off' : ''}</span>
        <span class="devcmp-row__time">${r.complete ? formatTime(r.completedAt) : 'not done'}</span>
      </li>
    `;
  }).join('');

  return `
    <div class="devcmp-col card">
      <h2>Missions pilot</h2>
      <div class="progress-bar"><div class="progress-bar__fill" style="--p:${dv2.percentComplete}"></div></div>
      <div class="devcmp-stat-line"><span>Items complete</span><span>${dv2.completedCount} / ${dv2.totalItems} (${dv2.percentComplete}%)</span></div>
      <div class="devcmp-stat-line"><span>Drop-off</span><span>${dv2.dropOffItem ? (dv2.dropOffItem.kind === 'QUIZ' ? 'Mastery Quiz' : `${dv2.dropOffItem.kind} \u2014 ${dv2.dropOffItem.signId}`) : 'None — mission complete'}</span></div>
      <ul class="devcmp-rowlist" style="margin-top: var(--space-4);">${rows}</ul>
    </div>
  `;
}

function renderComparison(categoryId) {
  const root = document.getElementById('devcmp-root');

  if (!window.LWMissions || typeof window.LWMissionsCompare === 'undefined') {
    root.innerHTML = `<p class="devcmp-unavailable">js/missions.js or js/missions-compare.js did not load.</p>`;
    return;
  }

  const mission = window.LWMissions.getMissionForCategory(categoryId);
  const cmp = window.LWMissionsCompare.getComparison(mission ? mission.level : 'medium', categoryId);

  root.innerHTML = `
    <h2 style="margin-top: var(--space-6);">${mission ? mission.title : categoryId}</h2>
    <div class="devcmp-columns">
      ${renderOldColumn(cmp.old)}
      ${renderNewColumn(cmp.Missions)}
    </div>
  `;
}

function populatePicker() {
  const select = document.getElementById('devcmp-category-select');
  const categories = window.LWMissions ? window.LWMissions.getLiveCategoryList() : [];

  if (!categories.length) {
    select.innerHTML = `<option value="">No live categories found — js/data.js loaded?</option>`;
    return;
  }

  select.innerHTML = categories
    .map((c) => `<option value="${c.id}">${c.title} (${c.id})</option>`)
    .join('');

  // Default to the Phase 1 pilot category if present, else the first one.
  const defaultId = categories.some((c) => c.id === 'essentials_greetings')
    ? 'essentials_greetings'
    : categories[0].id;
  select.value = defaultId;

  select.addEventListener('change', () => renderComparison(select.value));
  renderComparison(defaultId);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', populatePicker);
} else {
  populatePicker();
}