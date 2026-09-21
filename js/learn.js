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

// PERF FIX (this revision) — the search input had no debounce, so
// every keystroke fired a full renderList() (re-filter every mission,
// recompute status for every visible one, replace #path-list's entire
// innerHTML). That's the "typing in search feels janky" symptom.
// Small, generic debounce: delays calling `fn` until `wait`ms have
// passed with no further calls, restarting the timer on each call
// (the standard trailing-edge debounce) — used only for the search
// listener below; every other call site (initial render, the
// post-Firestore-sync repaint) still renders immediately/synchronously,
// unaffected by this.
function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// AUTO-SCROLL TO THE OPEN CHAPTER (this session) — reported: every time
// the learner came back to Learn they had to scroll down to the chapter
// they're actually on (Chapter 5 is far below the fold once earlier
// chapters are done). renderList() already opens exactly one chapter when
// not searching — the first not-100%-complete one, LWMissions.
// getCurrentChapterId() — so that <details open> IS the place to land.
//   - Instant, not smooth: css/style.css sets html{scroll-behavior:smooth},
//     which would animate a page-load jump down past every earlier chapter.
//   - block:'start' (not 'center'): an open chapter is usually taller than
//     the viewport, so centring would cut its header off. The breathing
//     room above it comes from `.trail-group { scroll-margin-top }` in
//     css/learn.css.
//   - Never while searching (renderList() opens EVERY matching chapter
//     then, there's no single "open chapter" to go to).
// Only the window scrolls here (no inner scroll box), so scrollIntoView()
// is safe on this page — unlike camera-practice.js's sidebar, where it isn't.
function scrollToOpenChapter() {
  const chapter = document.querySelector('#path-list .trail-group[open]');
  if (chapter) chapter.scrollIntoView({ block: 'start', behavior: 'instant' });
}

// Flips to true on the learner's first wheel/touch/key/click, so the
// post-Firestore-sync repaint below can re-aim the scroll (the open
// chapter can change once merged progress arrives) without yanking the
// page out from under someone who has already started scrolling.
let userTookOverScroll = false;

function statusMeta(status) {
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

function renderRow(mission, index, status, displayNumber) {
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
      <span class="path-row__num">${String((displayNumber || index + 1)).padStart(2, '0')}</span>
      <div class="path-row__body">
        <p class="path-row__title">${mission.title}</p>
        <p class="path-row__goal">${mission.goal}</p>
      </div>
      <div class="path-row__meta">
        <span class="badge ${meta.badge}${locked ? ' path-row__lock-badge' : ''}">${meta.label}</span>
        ${!hideBar ? `<div class="path-row__progress">
          <div class="progress-bar"><div class="progress-bar__fill" style="--p:${pct}"></div></div>
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
      return renderRow(m, realIndex, status, trailNumber.get(m.category));
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
  // BUGFIX (light-mode UX pass) — row numbers used to be each mission's index in
  // allMissions, but chapters regroup that array, so Chapter 5 read 11, 13, 14…
  // Number by trail position via the shared LWMissions.getTrailNumbers() (see its
  // comment in js/missions.js). Built from the full list, not `filtered`, so
  // numbers stay stable while the learner types in the search box.
  const trailNumber = window.LWMissions.getTrailNumbers ? window.LWMissions.getTrailNumbers(allMissions) : new Map();
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

  // This page positions itself (see scrollToOpenChapter()), so opt out of
  // the browser's own scroll restoration — on Back from a mission it would
  // otherwise race us and drop the learner wherever they happened to be
  // scrolled last time instead of on their current chapter.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, () => { userTookOverScroll = true; }, { once: true, passive: true });
  });
  scrollToOpenChapter();

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

  // Debounced (150ms) — see debounce()'s comment above. A learner
  // typing a multi-character query no longer triggers a full
  // filter+status-recompute+innerHTML-rebuild on every single
  // keystroke, only once they pause briefly.
  // Clearing the box collapses the list back to the single open chapter,
  // which can strand the page mid-nowhere — land on that chapter again.
  searchInput.addEventListener('input', debounce(() => {
    renderList(searchInput.value);
    if (!searchInput.value.trim()) scrollToOpenChapter();
  }, 150));

  window.LWMissions.whenMissionsSyncReady().then(() => {
    allMissions = window.LWMissions.getAllMissions();
    if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
    renderList(searchInput.value);
    if (!userTookOverScroll && !searchInput.value.trim()) scrollToOpenChapter();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}