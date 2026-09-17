/**
 * js/learn.js — Renderer for pages/learn.html
 * ─────────────────────────────────────────────────────────────────
 * Same data source as js/dashboard.js: window.LWMissions only —
 * js/data.js is not loaded on this page and isn't needed.
 *
 * CHAPTER GATING (Task 1, this revision) : "Locked" now means "this
 * mission's chapter isn't unlocked yet" — a chapter only unlocks once
 * every mission in the PREVIOUS chapter is 100% complete. Once a
 * chapter is unlocked, every mission inside it is available at once;
 * there's no forced order within a chapter anymore. See
 * window.LWMissions.getMissionStatus()/isChapterUnlocked() in
 * js/missions.js — this file no longer computes lock status itself
 * (the old position-based statusFor() here, and its near-duplicates in
 * dashboard.js/mission-overview.js, are gone in favor of that
 * single shared rule).
 *
 * ROW CLICK (updated) : unlocked rows now open mission-overview.html
 * (guide §6) instead of handing off straight to pages/quiz.html — see
 * Missions_LinguaWave_Progress_Tracker.md session log for the Mission
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
  const pct = Math.round(window.LWMissions.getMissionProgress(mission) * 100);
  const locked = status === 'locked';
  const tag = locked ? 'div' : 'a';
  const hrefAttr = locked ? '' : `href="mission-overview.html?mission=${encodeURIComponent(mission.category)}"`;
  // 'available' (not started, 0%) and 'done' (finished, 100%) rows: the
  // badge already says everything the bar would — skip the redundant
  // bar for those. 'locked' rows also hide it — a 0% bar on content the
  // user can't open yet is misleading, not informative. Only 'current'
  // (actually in progress) still shows it.
  const hideBar = status === 'available' || status === 'done' || locked;

  return `
    <${tag} class="card path-row path-row--${status}" ${hrefAttr} data-index="${index}">
      <span class="path-row__num">${String(index + 1).padStart(2, '0')}</span>
      <div class="path-row__body">
        <p class="path-row__title">${mission.title}</p>
        <p class="path-row__goal">${mission.goal}</p>
      </div>
      <div class="path-row__meta">
        <span class="badge ${meta.badge}${locked ? ' path-row__lock-badge' : ''}">${meta.label}</span>
        ${!hideBar ? `<div class="path-row__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        </div>` : ''}
        ${!locked ? `<svg class="path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>` : ''}
      </div>
    </${tag}>
  `;
}

// CHAPTERS (this session) — groups the flat mission list into the
// same 12 named curriculum chapters js/learn.js's trail now uses
// (window.LWMissions.getCategoryGroups(), each mission's .categoryGroup
// set in missions.js's buildMissionForCategory()). Reuses .trail-group
// / .trail-group__summary etc. from ../css/learn.css, already
// linked on this page, rather than inventing parallel-only
// collapsible-section CSS. A mission with no categoryGroup (data gap,
// see missions.js comment) still renders — just outside any chapter,
// appended flat at the end — so nothing silently disappears.
// ORIENTATION ROW (this session) — a fixed card above the chapter
// list, always visible regardless of search/filter state (rendered
// once into its own slot, not part of renderList()'s innerHTML swap).
// Not a mission: no lock state, no progress bar, just a link to
// pages/orientation.html. See missions.js's getOrientation() for
// why this exists as a real row instead of landing-page-only content.
function renderOrientationCard() {
  if (!window.LWMissions || !window.LWMissions.getOrientation) return '';
  const o = window.LWMissions.getOrientation();
  return `
    <a href="${o.href}" class="card path-row path-row--orientation">
      <span class="path-row__num" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </span>
      <div class="path-row__body">
        <p class="path-row__title">${o.title}</p>
        <p class="path-row__goal">${o.goal}</p>
      </div>
      <div class="path-row__meta">
        <span class="badge badge--basic">Start here</span>
        <svg class="path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
  `;
}

function renderList(filterText) {
  const listEl = document.getElementById('path-list');

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
      const status = window.LWMissions.getMissionStatus(m, allMissions);
      return renderRow(m, realIndex, status);
    }).join('');
  }

  // FIX (earlier session) — this used to read window.LWData.getCategoryGroups(),
  // but CATEGORY_GROUPS/getCategoryGroups() only ever got added to
  // js/missions.js's own independent content fork (see missions.js's
  // "CONTENT MODEL" header note) — js/data.js (V1) intentionally
  // never gained this function, so that lookup was always empty and
  // every mission fell through to "ungrouped" with no chapter headers
  // rendering at all. Chapters live on window.LWMissions now.
  const chapters = (window.LWMissions && window.LWMissions.getCategoryGroups) ? window.LWMissions.getCategoryGroups() : [];
  // CHAPTER GATING (Task 1) — "current" chapter (the one auto-opened)
  // is the first chapter, in order, that isn't 100% complete yet; see
  // getCurrentChapterId() in js/missions.js.
  const currentChapterId = window.LWMissions.getCurrentChapterId(allMissions);
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
      const doneCount = missionsInChapter.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
      const isOpen = isFiltering || ch.id === currentChapterId;
      // Task 1 — a chapter is locked as a whole until the previous
      // chapter is 100% complete. The row-level UI already carries that
      // (each mission inside renders 'locked' via getMissionStatus()
      // above, with its badge and no progress bar) — the chapter header
      // now uses the same existing badge language instead of adding a
      // parallel lock glyph next to the title.
      const chapterLocked = !window.LWMissions.isChapterUnlocked(ch.id, allMissions);
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
          <div class="path-list__group">
            ${rowsFor(missionsInChapter)}
          </div>
        </details>
      `;
    });

  listEl.innerHTML = chapterSections.join('') + rowsFor(ungrouped);
}

function initPage() {
  if (!window.LWMissions) {
    document.getElementById('path-list').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  const searchInput = document.getElementById('path-search-input');

  // Render immediately from local state (getAllMissions() reads
  // straight off localStorage) instead of blocking first paint on a
  // Firestore round-trip. Reconcile cross-device progress in the
  // background and re-render — preserving whatever's currently typed
  // in search — once it resolves, so a returning user on a new
  // device still ends up seeing their real merged progress.
  allMissions = window.LWMissions.getAllMissions();
  const orientationSlot = document.getElementById('orientation-slot');
  if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
  renderList('');

  // Interactive Locked-State Feedback (this revision) — locked rows
  // render as a plain, non-navigable <div> (renderRow() above), so a
  // click here never had anything to do. Delegated on #path-list (not
  // per-row) since renderList() replaces the row markup wholesale on
  // every search keystroke and every sync reconcile — a listener on
  // the container survives all of that without being re-attached.
  document.getElementById('path-list').addEventListener('click', (e) => {
    const lockedRow = e.target.closest('.path-row--locked');
    if (!lockedRow) return;
    e.preventDefault();
    window.LinguaWave?.triggerLockedFeedback?.(lockedRow);
  });

  searchInput.addEventListener('input', () => renderList(searchInput.value));

  window.LWMissions.whenMissionsSyncReady().then(() => {
    allMissions = window.LWMissions.getAllMissions();
    if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
    renderList(searchInput.value);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}