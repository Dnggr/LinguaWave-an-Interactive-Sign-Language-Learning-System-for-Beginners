/**
 * js/v2-learn.js — Renderer for pages/v2-learn.html
 * ─────────────────────────────────────────────────────────────────
 * Same data source as js/v2-dashboard.js: window.LWDataV2 /
 * window.LWData only. "Locked" here just means "comes after the
 * current mission" (position-based) — there is no real gating/hearts
 * logic yet (guide §10–11), so this is an honest placeholder, not a
 * simulation of the final unlock rule.
 *
 * ROW CLICK (updated) : unlocked rows now open v2-mission-overview.html
 * (guide §6) instead of handing off straight to pages/quiz.html — see
 * DataV2_LinguaWave_Progress_Tracker.md session log for the Mission
 * Overview + Hearts module entry.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

let allMissions = [];

function statusFor(mission, index, currentIndex) {
  const progress = window.LWDataV2.getMissionProgress(mission);
  if (progress >= 1) return 'done';
  if (index === currentIndex) return 'current';
  if (index < currentIndex) return 'available'; // completed-adjacent, still open
  return index === currentIndex + 1 ? 'available' : 'locked';
}

function statusMeta(status) {
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

function renderRow(mission, index, status) {
  const meta = statusMeta(status);
  const pct = Math.round(window.LWDataV2.getMissionProgress(mission) * 100);
  const locked = status === 'locked';
  const tag = locked ? 'div' : 'a';
  const hrefAttr = locked ? '' : `href="v2-mission-overview.html?mission=${encodeURIComponent(mission.category)}"`;

  return `
    <${tag} class="card v2-path-row v2-path-row--${status}" ${hrefAttr} data-index="${index}">
      <span class="v2-path-row__num">${String(index + 1).padStart(2, '0')}</span>
      <div class="v2-path-row__body">
        <p class="v2-path-row__title">${mission.title}</p>
        <p class="v2-path-row__goal">${mission.goal}</p>
      </div>
      <div class="v2-path-row__meta">
        <span class="badge ${meta.badge}">${meta.label}</span>
        <div class="v2-path-row__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        </div>
        ${!locked ? `<svg class="v2-path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>` : ''}
      </div>
    </${tag}>
  `;
}

// CHAPTERS (this session) — groups the flat mission list into the
// same 12 named curriculum chapters js/learn.js's trail now uses
// (window.LWData.getCategoryGroups(), each mission's .categoryGroup
// set in data-v2.js's buildMissionForCategory()). Reuses .trail-group
// / .trail-group__summary etc. from ../../css/learn.css, already
// linked on this page, rather than inventing parallel V2-only
// collapsible-section CSS. A mission with no categoryGroup (data gap,
// see data-v2.js comment) still renders — just outside any chapter,
// appended flat at the end — so nothing silently disappears.
// ORIENTATION ROW (this session) — a fixed card above the chapter
// list, always visible regardless of search/filter state (rendered
// once into its own slot, not part of renderList()'s innerHTML swap).
// Not a mission: no lock state, no progress bar, just a link to
// pages/v2-orientation.html. See data-v2.js's getOrientation() for
// why this exists as a real row instead of landing-page-only content.
function renderOrientationCard() {
  if (!window.LWDataV2 || !window.LWDataV2.getOrientation) return '';
  const o = window.LWDataV2.getOrientation();
  return `
    <a href="${o.href}" class="card v2-path-row v2-path-row--orientation">
      <span class="v2-path-row__num" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </span>
      <div class="v2-path-row__body">
        <p class="v2-path-row__title">${o.title}</p>
        <p class="v2-path-row__goal">${o.goal}</p>
      </div>
      <div class="v2-path-row__meta">
        <span class="badge badge--basic">Start here</span>
        <svg class="v2-path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
  `;
}

function renderList(filterText) {
  const listEl = document.getElementById('v2-path-list');
  const currentIndex = allMissions.findIndex((m) => window.LWDataV2.getMissionProgress(m) < 1);
  const effectiveCurrent = currentIndex === -1 ? allMissions.length - 1 : currentIndex;

  const query = (filterText || '').trim().toLowerCase();
  const filtered = query
    ? allMissions.filter((m) => m.title.toLowerCase().includes(query) || m.goal.toLowerCase().includes(query))
    : allMissions;

  if (!filtered.length) {
    listEl.innerHTML = `<p class="text-muted">No missions match "${filterText}".</p>`;
    return;
  }

  function rowsFor(missions) {
    return missions.map((m) => {
      const realIndex = allMissions.indexOf(m);
      const status = statusFor(m, realIndex, effectiveCurrent);
      return renderRow(m, realIndex, status);
    }).join('');
  }

  const chapters = (window.LWData && window.LWData.getCategoryGroups) ? window.LWData.getCategoryGroups() : [];
  const currentChapterId = allMissions[effectiveCurrent] ? allMissions[effectiveCurrent].categoryGroup : null;
  // While actively searching, open every chapter that still has a
  // match rather than only the "current" one — same reasoning as
  // js/learn.js's applySearchFilter for the V1 trail.
  const isFiltering = query !== '';

  const byChapter = new Map();
  const ungrouped = [];
  filtered.forEach((m) => {
    if (!m.categoryGroup) { ungrouped.push(m); return; }
    if (!byChapter.has(m.categoryGroup)) byChapter.set(m.categoryGroup, []);
    byChapter.get(m.categoryGroup).push(m);
  });

  const chapterSections = chapters
    .filter((ch) => byChapter.has(ch.id))
    .map((ch) => {
      const missionsInChapter = byChapter.get(ch.id);
      const doneCount = missionsInChapter.filter((m) => window.LWDataV2.getMissionProgress(m) >= 1).length;
      const isOpen = isFiltering || ch.id === currentChapterId;
      return `
        <details class="trail-group"${isOpen ? ' open' : ''}>
          <summary class="trail-group__summary">
            <span class="trail-group__label">
              <span class="trail-group__title">Chapter ${ch.order} · ${ch.title}</span>
              <span class="trail-group__blurb">${ch.blurb}</span>
            </span>
            <span class="trail-group__meta">${doneCount}/${missionsInChapter.length} complete</span>
          </summary>
          <div class="v2-path-list__group">
            ${rowsFor(missionsInChapter)}
          </div>
        </details>
      `;
    });

  listEl.innerHTML = chapterSections.join('') + rowsFor(ungrouped);
}

function initPage() {
  if (!window.LWData || !window.LWDataV2) {
    document.getElementById('v2-path-list').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/data.js and js/data-v2.js both loaded.</p>`;
    return;
  }

  allMissions = window.LWDataV2.getAllMissions();
  const orientationSlot = document.getElementById('v2-orientation-slot');
  if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
  renderList('');

  const searchInput = document.getElementById('v2-path-search-input');
  searchInput.addEventListener('input', () => renderList(searchInput.value));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
