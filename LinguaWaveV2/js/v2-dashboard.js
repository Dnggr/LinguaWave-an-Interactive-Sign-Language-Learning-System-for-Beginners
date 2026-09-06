/**
 * js/v2-dashboard.js — Renderer for pages/v2-dashboard.html
 * ─────────────────────────────────────────────────────────────────
 * Reads only from window.LWDataV2 (js/data-v2.js) — the real,
 * already-built mission schema — and window.LWData (js/data.js) for
 * sign/category lookups. Neither js/dashboard.js, js/engine/progress.js,
 * nor pages/dashboard.html's own localStorage keys are touched or
 * read here; this is a parallel V2 read of the SAME underlying
 * dataV2 progress store the preview/compare tools already use
 * (`lw_datav2_progress_v1`), so completing items here is consistent
 * with what pages/datav2-preview.html shows.
 *
 * Continue Learning / journey cards now link to
 * v2-mission-overview.html?mission=<categoryId> (guide §6) instead of
 * v2-learn.html — see DataV2_LinguaWave_Progress_Tracker.md session
 * log for the Mission Overview + Hearts module entry.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

function pickCurrentMission(missions) {
  // "Continue Your Mission" = first not-yet-complete mission, in the
  // same live-category order data-v2.js already returns them in.
  return missions.find((m) => window.LWDataV2.getMissionProgress(m) < 1) || missions[0] || null;
}

function currentSignInProgress(mission) {
  for (const item of mission.items) {
    if (!item.signId) continue;
    if (window.LWDataV2.getLessonProgress(mission, item.signId) < 1) return item.signId;
  }
  return null;
}

function renderContinueCard(missions) {
  const el = document.getElementById('v2-continue-card');
  const mission = pickCurrentMission(missions);

  if (!mission) {
    el.innerHTML = `<p class="text-muted">No live missions found — is <code>js/data.js</code> loaded?</p>`;
    return;
  }

  const progress = window.LWDataV2.getMissionProgress(mission);
  const currentSign = currentSignInProgress(mission);
  const pct = Math.round(progress * 100);

  el.innerHTML = `
    <div class="v2-continue-card__main" style="display:flex; align-items:center; gap: var(--space-4);">
      <span class="v2-continue-card__icon" aria-hidden="true">🎯</span>
      <div>
        <p class="v2-continue-card__eyebrow">Continue Your Mission</p>
        <p class="v2-continue-card__title">${mission.title}</p>
        <div class="v2-continue-card__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
          <span class="v2-continue-card__progress-label">${pct}%${currentSign ? ` · on "${currentSign}"` : ''}</span>
        </div>
      </div>
    </div>
    <a href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--primary btn--lg">▶ Continue Learning</a>
  `;
}

function renderSummaryCard(missions) {
  const el = document.getElementById('v2-summary-card');
  const completed = missions.filter((m) => window.LWDataV2.getMissionProgress(m) >= 1).length;

  // "Reviews Due" has no dataV2-native concept yet (§12 Review System
  // is not built) — showing "—" rather than a fabricated number, per
  // the guide's own "do not show hardcoded values" rule.
  el.innerHTML = `
    <p class="v2-summary-card__title">Today's Summary</p>
    <div class="v2-summary-row">
      <span class="v2-summary-row__label">🏁 Missions Completed</span>
      <span class="v2-summary-row__value">${completed}/${missions.length}</span>
    </div>
    <div class="v2-summary-row">
      <span class="v2-summary-row__label">🔥 Streak</span>
      <span class="v2-summary-row__value">${window.LWDataV2.getStreakSummary().currentStreak}d</span>
    </div>
    <div class="v2-summary-row">
      <span class="v2-summary-row__label">📋 Reviews Due</span>
      <span class="v2-summary-row__value text-muted">—</span>
    </div>
  `;
}

// FIX (this session) — this used to only return 'done' / 'current' /
// 'available' (no concept of "locked" at all — every not-yet-reached
// mission showed as plain "Available"), and separately, the color
// picked for each status in renderJourneyRail() below was WRONG:
// 'current' got the blue badge and 'available' got the orange one —
// backwards from what those tokens mean everywhere else in this app.
// Now mirrors js/v2-learn.js's own statusFor() exactly (same 4
// states, same rule for what counts as "locked" — anything more than
// one mission ahead of the current one), so the dashboard's mini-rail
// and the full Learning Path list always agree on a mission's status.
function statusForMission(mission, index, currentIndex) {
  const progress = window.LWDataV2.getMissionProgress(mission);
  if (progress >= 1) return 'done';
  if (index === currentIndex) return 'current';
  if (index < currentIndex) return 'available'; // completed-adjacent, still open
  return index === currentIndex + 1 ? 'available' : 'locked';
}

function statusMeta(status) {
  // done -> green, current ("In Progress") -> orange, available ->
  // blue, locked -> red. Matches css/style.css's badge--*/.v2-journey-
  // card--* tokens 1:1 — see v2-app.css's own comment on this block
  // for why 'current' and 'available' were swapped before.
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

function renderJourneyRail(missions) {
  const el = document.getElementById('v2-journey-rail');
  const current = pickCurrentMission(missions);
  const currentIndex = current ? missions.indexOf(current) : -1;

  el.innerHTML = missions.map((m, i) => {
    const status = statusForMission(m, i, currentIndex);
    const meta = statusMeta(status);
    const locked = status === 'locked';
    const tag = locked ? 'div' : 'a';
    const hrefAttr = locked ? '' : `href="v2-mission-overview.html?mission=${encodeURIComponent(m.category)}"`;
    return `
      <${tag} class="card v2-journey-card v2-journey-card--${status}" ${hrefAttr}>
        <span class="v2-journey-card__num">${String(i + 1).padStart(2, '0')}</span>
        <p class="v2-journey-card__title">${m.title}</p>
        <span class="badge ${meta.badge}">${meta.label}</span>
      </${tag}>
    `;
  }).join('');
}

function initPage() {
  if (!window.LWData || !window.LWDataV2) {
    document.getElementById('v2-continue-card').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/data.js and js/data-v2.js both loaded.</p>`;
    return;
  }
  const missions = window.LWDataV2.getAllMissions();
  renderContinueCard(missions);
  renderSummaryCard(missions);
  renderJourneyRail(missions);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}