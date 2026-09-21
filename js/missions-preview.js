/**
 * js/missions-preview.js — Renderer for pages/missions-preview.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Dev-only preview of window.LWMissions's pilot mission
 *            (see js/missions.js). Demonstrates the patterns from
 *            "LinguaWave_SoloLearn_Learning_Psychology_Missions_
 *            Integration_Plan" §3 actually rendering against real
 *            content, so Phase 2's comparison (§7) has something to
 *            look at. This file is only ever loaded by
 *            missions-preview.html — no other page includes it.
 *
 * NOT REAL UI : clicking a LESSON/BOOSTER/PRACTICE/QUIZ row here just
 *            marks it "done" for demo purposes — it does not launch
 *            the camera, run the classifier, or grade anything. The
 *            actual lesson/quiz *engines* are untouched (js/camera-practice.js,
 *            js/quiz.js) — this page only visualizes sequencing,
 *            labels, and the two progress bars.
 *
 * PHASE 3  : added a mission picker (#dev-mission-select), populated
 *            from window.LWMissions.getLiveCategoryList() — every live
 *            category now has a buildable mission, not just the
 *            Phase 1 pilot. Defaults to 'essentials_greetings' so a
 *            dev opening this page with no selection sees the exact
 *            same thing Phase 1 always showed.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

let currentCategoryId = 'essentials_greetings';

function populateMissionPicker() {
  const select = document.getElementById('dev-mission-select');
  const categories = (window.LWMissions && window.LWData) ? window.LWMissions.getLiveCategoryList() : [];

  if (!categories.length) {
    select.innerHTML = `<option value="">No categories found</option>`;
    return;
  }

  select.innerHTML = categories
    .map((c) => `<option value="${c.id}">${c.title} (${c.id})</option>`)
    .join('');

  const defaultId = categories.some((c) => c.id === currentCategoryId)
    ? currentCategoryId
    : categories[0].id;
  select.value = defaultId;
  currentCategoryId = defaultId;

  select.addEventListener('change', () => {
    currentCategoryId = select.value;
    renderAll();
  });
}

function currentSignInProgress(mission) {
  // First sign with at least one incomplete item — "what the learner
  // is on right now", for the lessonProgress bar (§3.4).
  for (const item of mission.items) {
    if (!item.signId) continue;
    if (window.LWMissions.getLessonProgress(mission, item.signId) < 1) return item.signId;
  }
  return null;
}

function bonusXPEarned(mission) {
  let total = 0;
  mission.items.forEach((item, i) => {
    if (item.bonusXP && window.LWMissions.isItemComplete(mission, i, item)) total += item.bonusXP;
  });
  return total;
}

function renderFlagbar() {
  const el = document.getElementById('dev-flagbar');
  const enabled = window.LWMissions.isEnabled();
  el.innerHTML = `
    <div class="dev-flagbar__row">
      <div>
        <strong>Missions feature flag:</strong>
        <span class="badge ${enabled ? 'badge--done' : 'badge--locked'}">${enabled ? 'ON' : 'OFF'}</span>
      </div>
      <button class="btn ${enabled ? 'btn--ghost' : 'btn--primary'} btn--sm" id="dev-toggle-flag">
        ${enabled ? 'Turn off' : 'Turn on'}
      </button>
    </div>
    <p class="text-muted dev-flagbar__note">
      Same flag as the toggle in Settings → Developer (?dev=1) — this page and
      that toggle read/write the same <code>lw-missions-enabled</code> key.
    </p>
  `;
  document.getElementById('dev-toggle-flag').addEventListener('click', () => {
    window.LWMissions.setEnabled(!enabled);
    renderAll();
  });
}

function renderItem(mission, item, index) {
  const done = window.LWMissions.isItemComplete(mission, index, item);
  const kindClass = `dev-item--${item.kind.toLowerCase()}`;
  const label = item.kind === 'QUIZ'
    ? 'Mastery Quiz'
    : `${item.kind[0]}${item.kind.slice(1).toLowerCase()} \u2014 ${item.signId}`;

  const scenario = item.scenarioTitle
    ? `<div class="dev-item__scenario">"${item.scenarioTitle}"</div>`
    : '';

  const chips = [];
  if (item.bonusXP) chips.push(`<span class="dev-chip dev-chip--bonus">+${item.bonusXP} XP</span>`);
  if (item.difficultyRamp) chips.push(`<span class="dev-chip">${item.difficultyRamp.join(' \u2192 ')}</span>`);

  // §3.9 — widened hint availability; illustrative mapping onto this
  // pilot's item kinds (PRACTICE/QUIZ stand in for Apply/Quick Check).
  const showHint = item.kind === 'PRACTICE' || item.kind === 'QUIZ';

  return `
    <li class="dev-item ${kindClass} ${done ? 'dev-item--done' : ''}" data-index="${index}">
      <button class="dev-item__check" aria-label="${done ? 'Mark not done' : 'Mark done'}">
        ${done ? '\u2713' : ''}
      </button>
      <div class="dev-item__body">
        <div class="dev-item__label">${label}</div>
        ${scenario}
        ${chips.length ? `<div class="dev-item__chips">${chips.join('')}</div>` : ''}
        ${showHint ? '<div class="dev-item__hint">Need a hint?</div>' : ''}
      </div>
    </li>
  `;
}

function renderMission(mission) {
  const missionProgress = window.LWMissions.getMissionProgress(mission);
  const currentSign = currentSignInProgress(mission);
  const lessonProgress = currentSign ? window.LWMissions.getLessonProgress(mission, currentSign) : 1;
  const streak = window.LWMissions.getStreakSummary();
  const xp = bonusXPEarned(mission);
  const recap = window.LWMissions.getRecap(mission);
  const missionDone = missionProgress >= 1;

  return `
    <div class="card dev-intro">
      <div class="dev-intro__illustration" aria-hidden="true">\u{1F44B}</div>
      <div>
        <h1 class="dev-intro__title">${mission.title}</h1>
        <p class="text-muted">${mission.goal}</p>
        <p class="dev-intro__pitch">${mission.introMoment.pitch}</p>
      </div>
    </div>

    <div class="dev-statrow">
      <span class="dev-stat">\u2764 5</span>
      <span class="dev-stat">XP ${xp}</span>
      <span class="dev-stat" title="Longest streak stays visible even after a break">
        \u{1F525} ${streak.currentStreak}-day streak (best: ${streak.longestStreak})
      </span>
      <span class="dev-stat" title="Simple weekly allowance, not a purchasable item">
        Streak saver: ${streak.streakForgivenessRemaining}
      </span>
    </div>

    <div class="card dev-progress-card">
      <div class="dev-progress-row">
        <span class="dev-progress-row__label">Mission progress</span>
        <span>${Math.round(missionProgress * 100)}%</span>
      </div>
      <div class="progress-bar"><div class="progress-bar__fill" style="--p:${missionProgress * 100}"></div></div>

      <div class="dev-progress-row dev-progress-row--sub">
        <span class="dev-progress-row__label">${currentSign ? `Current lesson (${currentSign})` : 'Lesson'}</span>
        <span>${Math.round(lessonProgress * 100)}%</span>
      </div>
      <div class="progress-bar progress-bar--sm"><div class="progress-bar__fill" style="--p:${lessonProgress * 100}"></div></div>
    </div>

    <ul class="dev-item-list">
      ${mission.items.map((item, i) => renderItem(mission, item, i)).join('')}
    </ul>

    ${missionDone ? `
      <div class="card dev-results">
        <h2>Mission complete \u{1F389}</h2>
        <ul class="dev-results__recap">
          ${recap.map((line) => `<li>${line}</li>`).join('')}
        </ul>
        <p class="dev-results__teaser">${mission.results.nextTeaser}</p>
      </div>
    ` : ''}
  `;
}

function renderAll() {
  renderFlagbar();
  const root = document.getElementById('dev-root');

  if (!window.LWMissions.isEnabled()) {
    root.innerHTML = `
      <div class="card dev-off-notice">
        <p>Missions is currently <strong>OFF</strong>. Turn it on above to preview the pilot mission.</p>
        <p class="text-muted">The real learning path is unaffected either way — this flag only controls this preview and window.LWMissions's own behavior.</p>
      </div>
    `;
    return;
  }

  if (!window.LWData || typeof window.LWData.getCategorySigns !== 'function') {
    root.innerHTML = `<div class="card dev-off-notice"><p>js/data.js did not load — cannot build the pilot mission.</p></div>`;
    return;
  }

  const mission = window.LWMissions.getMissionForCategory(currentCategoryId) || window.LWMissions.getPilotMission();
  root.innerHTML = renderMission(mission);

  root.querySelectorAll('.dev-item').forEach((li) => {
    li.querySelector('.dev-item__check').addEventListener('click', () => {
      const index = Number(li.dataset.index);
      const item = mission.items[index];
      const wasDone = window.LWMissions.isItemComplete(mission, index, item);
      if (!wasDone) {
        window.LWMissions.markItemComplete(mission, index, item);
      } else {
        // Preview-only "undo" so the demo is easy to replay — not
        // part of the real schema (there's no un-complete concept in
        // the plan; this only exists so a dev can reset one row
        // without clearing all of localStorage).
        const state = JSON.parse(localStorage.getItem('lw_missions_progress_v1') || '{"completedItemIds":[]}');
        const id = `${mission.id}_${index}_${item.kind}_${item.signId || item.category || ''}`;
        state.completedItemIds = state.completedItemIds.filter((x) => x !== id);
        localStorage.setItem('lw_missions_progress_v1', JSON.stringify(state));
      }
      renderAll();
    });
  });
}

function initPage() {
  populateMissionPicker(); // Phase 3 — no-op-safe if LWData/LWMissions aren't ready yet
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}