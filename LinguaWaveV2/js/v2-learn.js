/**
 * js/v2-learn.js — Renderer for pages/v2-learn.html
 * ─────────────────────────────────────────────────────────────────
 * Same data source as js/v2-dashboard.js: window.LWDataV2 /
 * window.LWData only.
 *
 * CHAPTER GATING (Task 1, this revision) : "Locked" now means "this
 * mission's chapter isn't unlocked yet" — a chapter only unlocks once
 * every mission in the PREVIOUS chapter is 100% complete. Once a
 * chapter is unlocked, every mission inside it is available at once;
 * there's no forced order within a chapter anymore. See
 * window.LWDataV2.getMissionStatus()/isChapterUnlocked() in
 * js/data-v2.js — this file no longer computes lock status itself
 * (the old position-based statusFor() here, and its near-duplicates in
 * v2-dashboard.js/v2-mission-overview.js, are gone in favor of that
 * single shared rule).
 *
 * ROW CLICK (updated) : unlocked rows now open v2-mission-overview.html
 * (guide §6) instead of handing off straight to pages/quiz.html — see
 * DataV2_LinguaWave_Progress_Tracker.md session log for the Mission
 * Overview + Hearts module entry.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

let allMissions = [];

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
  // 'available' (not started, 0%) and 'done' (finished, 100%) rows: the
  // badge already says everything the bar would — skip the redundant
  // bar for those. 'locked' rows also hide it — a 0% bar on content the
  // user can't open yet is misleading, not informative. Only 'current'
  // (actually in progress) still shows it.
  const hideBar = status === 'available' || status === 'done' || locked;

  return `
    <${tag} class="card v2-path-row v2-path-row--${status}" ${hrefAttr} data-index="${index}">
      <span class="v2-path-row__num">${String(index + 1).padStart(2, '0')}</span>
      <div class="v2-path-row__body">
        <p class="v2-path-row__title">${mission.title}</p>
        <p class="v2-path-row__goal">${mission.goal}</p>
      </div>
      <div class="v2-path-row__meta">
        <span class="badge ${meta.badge}${locked ? ' v2-path-row__lock-badge' : ''}">${meta.label}</span>
        ${!hideBar ? `<div class="v2-path-row__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        </div>` : ''}
        ${!locked ? `<svg class="v2-path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>` : ''}
      </div>
    </${tag}>
  `;
}

// CHAPTERS (this session) — groups the flat mission list into the
// same 12 named curriculum chapters js/learn.js's trail now uses
// (window.LWDataV2.getCategoryGroups(), each mission's .categoryGroup
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
      const status = window.LWDataV2.getMissionStatus(m, allMissions);
      return renderRow(m, realIndex, status);
    }).join('');
  }

  // FIX (earlier session) — this used to read window.LWData.getCategoryGroups(),
  // but CATEGORY_GROUPS/getCategoryGroups() only ever got added to
  // js/data-v2.js's own independent content fork (see data-v2.js's
  // "V2 CONTENT MODEL" header note) — js/data.js (V1) intentionally
  // never gained this function, so that lookup was always empty and
  // every mission fell through to "ungrouped" with no chapter headers
  // rendering at all. Chapters live on window.LWDataV2 now.
  const chapters = (window.LWDataV2 && window.LWDataV2.getCategoryGroups) ? window.LWDataV2.getCategoryGroups() : [];
  // CHAPTER GATING (Task 1) — "current" chapter (the one auto-opened)
  // is the first chapter, in order, that isn't 100% complete yet; see
  // getCurrentChapterId() in js/data-v2.js.
  const currentChapterId = window.LWDataV2.getCurrentChapterId(allMissions);
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
      // Task 1 — a chapter is locked as a whole until the previous
      // chapter is 100% complete. The row-level UI already carries that
      // (each mission inside renders 'locked' via getMissionStatus()
      // above, with its badge and no progress bar) — the chapter header
      // now uses the same existing badge language instead of adding a
      // parallel lock glyph next to the title.
      const chapterLocked = !window.LWDataV2.isChapterUnlocked(ch.id, allMissions);
      // Chapter fully finished — flags .trail-group--complete so
      // css/learn.css can swap the border and the "x/x complete" pill
      // to the success color instead of the neutral default.
      const chapterComplete = doneCount === missionsInChapter.length;
      const chapterMeta = chapterLocked
        ? `<span class="badge badge--locked trail-group__lock-badge">Locked</span>`
        : `<span class="trail-group__meta">${doneCount}/${missionsInChapter.length} complete</span>`;
      return `
        <details class="trail-group${chapterComplete ? ' trail-group--complete' : ''}"${isOpen ? ' open' : ''}>
          <summary class="trail-group__summary">
            <span class="trail-group__label">
              <span class="trail-group__title">Chapter ${ch.order} · ${ch.title}</span>
              <span class="trail-group__blurb">${ch.blurb}</span>
            </span>
            ${chapterMeta}
          </summary>
          <div class="v2-path-list__group">
            ${rowsFor(missionsInChapter)}
          </div>
        </details>
      `;
    });

  listEl.innerHTML = chapterSections.join('') + rowsFor(ungrouped);
}

async function initPage() {
  if (!window.LWData || !window.LWDataV2) {
    document.getElementById('v2-path-list').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/data.js and js/data-v2.js both loaded.</p>`;
    return;
  }

  // Reconcile cross-device Firestore progress before rendering, so a
  // returning user on a new device sees their real merged progress,
  // not a fresh/empty local state. No-ops for a logged-out visitor.
  await window.LWDataV2.whenDataV2SyncReady();

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
