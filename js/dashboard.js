/**
 * js/dashboard.js — Renderer for pages/dashboard.html
 * ─────────────────────────────────────────────────────────────────
 * Reads only from window.LWMissions (js/missions.js) — the real,
 * already-built mission schema — and window.LWData (js/data.js) for
 * sign/category lookups. Neither js/dashboard.js, js/engine/progress.js,
 * nor pages/dashboard.html's own localStorage keys are touched or
 * read here; this is a parallel read of the SAME underlying
 * Missions progress store the preview/compare tools already use
 * (`lw_missions_progress_v1`), so completing items here is consistent
 * with what pages/missions-preview.html shows.
 *
 * Continue Learning / journey cards now link to
 * mission-overview.html?mission=<categoryId> (guide §6) instead of
 * learn.html — see Missions_LinguaWave_Progress_Tracker.md session
 * log for the Mission Overview + Hearts module entry.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

function pickCurrentMission(missions) {
  // "Continue Your Mission" = first not-yet-complete, UNLOCKED mission
  // (Task 1 — chapter gating means the first incomplete mission in
  // list order could theoretically sit in a not-yet-unlocked chapter;
  // never point "Continue" at a mission the learner can't open yet).
  const reachable = missions.filter((m) => window.LWMissions.getMissionStatus(m, missions) !== 'locked');
  return reachable.find((m) => window.LWMissions.getMissionProgress(m) < 1)
    || reachable[reachable.length - 1]
    || missions[0]
    || null;
}

function currentSignInProgress(mission) {
  for (const item of mission.items) {
    if (!item.signId) continue;
    if (window.LWMissions.getLessonProgress(mission, item.signId) < 1) return item.signId;
  }
  return null;
}

function renderContinueCard(missions) {
  const el = document.getElementById('continue-card');
  const mission = pickCurrentMission(missions);

  if (!mission) {
    el.innerHTML = `<p class="text-muted">No live missions found — is <code>js/data.js</code> loaded?</p>`;
    return;
  }

  const progress = window.LWMissions.getMissionProgress(mission);
  const currentSign = currentSignInProgress(mission);
  const pct = Math.round(progress * 100);

  el.innerHTML = `
    <div class="continue-card__main" style="display:flex; align-items:center; gap: var(--space-4);">
      <span class="continue-card__icon" aria-hidden="true">🎯</span>
      <div>
        <p class="continue-card__eyebrow">Continue Your Mission</p>
        <p class="continue-card__title">${mission.title}</p>
        <div class="continue-card__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
          <span class="continue-card__progress-label">${pct}%${currentSign ? ` · on "${currentSign}"` : ''}</span>
        </div>
      </div>
    </div>
    <a href="mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--primary btn--lg">▶ Continue Learning</a>
  `;
}

function renderSummaryCard(missions) {
  const el = document.getElementById('summary-card');
  const completed = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;

  // "Reviews Due" has no Missions-native concept yet (§12 Review System
  // is not built) — showing "—" rather than a fabricated number, per
  // the guide's own "do not show hardcoded values" rule.
  el.innerHTML = `
    <p class="summary-card__title">Today's Summary</p>
    <div class="summary-row">
      <span class="summary-row__label">🏁 Missions Completed</span>
      <span class="summary-row__value">${completed}/${missions.length}</span>
    </div>
    <div class="summary-row">
      <span class="summary-row__label">🔥 Streak</span>
      <span class="summary-row__value">${window.LWMissions.getStreakSummary().currentStreak}d</span>
    </div>
    <div class="summary-row">
      <span class="summary-row__label">📋 Reviews Due</span>
      <span class="summary-row__value text-muted">—</span>
    </div>
  `;
}

// CHAPTER GATING (Task 1, this revision) — status is no longer
// computed here at all. It now comes straight from the single shared
// window.LWMissions.getMissionStatus() in js/missions.js, so the
// dashboard's mini-rail, the full Learning Path list (learn.js),
// and Mission Overview (mission-overview.js) always agree: a
// mission is 'locked' only while its whole chapter is locked (the
// previous chapter isn't 100% complete yet), never because of its
// position relative to a single "current" mission.
function statusMeta(status) {
  // done -> green, current ("In Progress") -> orange, available ->
  // blue, locked -> red. Matches css/style.css's badge--*/.journey-
  // card--* tokens 1:1 — see app.css's own comment on this block
  // for why 'current' and 'available' were swapped before.
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

function renderJourneyRail(missions) {
  const el = document.getElementById('journey-rail');

  el.innerHTML = missions.map((m, i) => {
    const status = window.LWMissions.getMissionStatus(m, missions);
    const meta = statusMeta(status);
    const locked = status === 'locked';
    const tag = locked ? 'div' : 'a';
    const hrefAttr = locked ? '' : `href="mission-overview.html?mission=${encodeURIComponent(m.category)}"`;
    return `
      <${tag} class="card journey-card journey-card--${status}" ${hrefAttr}>
        <span class="journey-card__num">${String(i + 1).padStart(2, '0')}</span>
        <p class="journey-card__title">${m.title}</p>
        <span class="badge ${meta.badge}">${meta.label}</span>
      </${tag}>
    `;
  }).join('');
}

function renderDashboard() {
  const missions = window.LWMissions.getAllMissions();
  renderContinueCard(missions);
  renderSummaryCard(missions);
  renderJourneyRail(missions);
}

function initPage() {
  if (!window.LWData || !window.LWMissions) {
    document.getElementById('continue-card').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/data.js and js/missions.js both loaded.</p>`;
    return;
  }

  // Render immediately from local state — getAllMissions() reads
  // straight off localStorage, so first paint never waits on a
  // network round-trip. Reconcile with Firestore in the background
  // and re-render only if that reconcile changes anything (e.g. a
  // completed item merged in from another device).
  renderDashboard();
  window.LWMissions.whenMissionsSyncReady().then(renderDashboard);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}