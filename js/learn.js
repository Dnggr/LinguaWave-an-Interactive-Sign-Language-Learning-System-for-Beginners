'use strict';

let allMissions = [];

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function scrollToOpenChapter() {
  const chapter = document.querySelector('#path-list .trail-group[open]');
  if (chapter) chapter.scrollIntoView({ block: 'start', behavior: 'instant' });
}

let userTookOverScroll = false;

function orientationPending() {
  const m = window.LWMissions;
  return !!(m && typeof m.isOrientationComplete === 'function' && !m.isOrientationComplete());
}

function statusMeta(status) {
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

const COLLAPSE_OTHERS_ON_JUMP = true;

const CHAPTER_ICONS = {
  asl_foundations: 'chapter_blocks',
  introduce_yourself: 'chapter_hand',
  express_feelings: 'chapter_smile',
  daily_actions: 'chapter_person_standing',
  describing_things: 'chapter_palette',
  home_family: 'chapter_house',
  school_life: 'chapter_school',
  food_nature: 'chapter_apple',
  clothing_belongings: 'chapter_shirt',
  people_places_time: 'chapter_map_pin',
  having_a_conversation: 'chapter_messages_square'
};

let activeQuery = '';
let railItems = [];
let railPinnedKey = null;
let railBound = false;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('lw-force-reduced-motion');
}

function setRailActive(key) {
  railItems.forEach((it) => {
    const on = it.key === key;
    it.btn.classList.toggle('is-active', on);
    if (on) it.btn.setAttribute('aria-current', 'location');
    else it.btn.removeAttribute('aria-current');
  });
}

function updateRailActive() {
  if (!railItems.length || railPinnedKey) return;
  const line = window.innerHeight * 0.5;
  let active = railItems[0];
  for (const it of railItems) {
    if (it.el.getBoundingClientRect().top <= line) active = it;
  }
  setRailActive(active.key);
}

function hideRailTip() {
  const tip = document.getElementById('chapter-rail-tip');
  if (tip) tip.classList.remove('is-visible');
}

function showRailTip(item) {
  const tip = document.getElementById('chapter-rail-tip');
  if (!tip) return;
  document.getElementById('chapter-rail-tip-title').textContent = item.label;
  const sub = document.getElementById('chapter-rail-tip-sub');
  sub.textContent = item.sub || '';
  sub.hidden = !item.sub;
  const r = item.btn.getBoundingClientRect();
  tip.style.top = (r.top + r.height / 2) + 'px';
  tip.style.right = (document.documentElement.clientWidth - r.left + 12) + 'px';
  tip.classList.add('is-visible');
}

function goToRailItem(item) {
  railPinnedKey = item.key;
  setRailActive(item.key);
  hideRailTip();

  if (item.key !== 'orientation') {
    if (COLLAPSE_OTHERS_ON_JUMP && !activeQuery) {
      document.querySelectorAll('#path-list .trail-group[open]').forEach((d) => {
        if (d !== item.el) d.open = false;
      });
    }
    item.el.open = true;
  }

  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  if (item.key === 'orientation') {
    window.scrollTo({ top: 0, behavior });
  } else {
    const fits = item.el.getBoundingClientRect().height <= window.innerHeight - 48;
    item.el.scrollIntoView({ block: fits ? 'center' : 'start', behavior });
  }
  userTookOverScroll = true;
}

function renderChapterRail(model) {
  const rail = document.getElementById('chapter-rail');
  if (!rail || !window.LWIcons) return;

  railItems = [];
  rail.textContent = '';
  hideRailTip();

  const orientationEl = document.getElementById('orientation-slot');
  if (orientationEl && orientationEl.firstElementChild) {
    railItems.push({ key: 'orientation', el: orientationEl, label: 'Orientation', sub: orientationPending() ? 'Start here' : 'Completed', icon: 'chapter_compass' });
  }
  model.forEach((m) => {
    const el = document.querySelector(`#path-list .trail-group[data-chapter="${m.id}"]`);
    if (!el) return;
    railItems.push({
      key: m.id,
      el,
      label: `Chapter ${m.order} · ${m.title}`,
      sub: m.locked ? 'Locked' : `${m.done}/${m.total} complete`,
      icon: CHAPTER_ICONS[m.id] || 'book_open',
      locked: m.locked,
      complete: m.complete
    });
  });

  railItems.forEach((it) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chapter-rail__btn' + (it.locked ? ' is-locked' : '');
    btn.setAttribute('aria-label', it.sub ? `${it.label} — ${it.sub}` : it.label);
    btn.appendChild(window.LWIcons.node(it.icon));
    if (it.locked) {
      const badge = document.createElement('span');
      badge.className = 'chapter-rail__badge';
      badge.appendChild(window.LWIcons.node('chapter_lock', { size: 'status' }));
      btn.appendChild(badge);
    }
    btn.addEventListener('click', () => goToRailItem(it));
    btn.addEventListener('mouseenter', () => showRailTip(it));
    btn.addEventListener('focus', () => showRailTip(it));
    btn.addEventListener('mouseleave', hideRailTip);
    btn.addEventListener('blur', hideRailTip);
    it.btn = btn;
    rail.appendChild(btn);
  });

  rail.hidden = railItems.length === 0;
  railPinnedKey = null;
  updateRailActive();

  if (!railBound) {
    railBound = true;
    let ticking = false;
    window.addEventListener('scroll', () => {
      hideRailTip();
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; updateRailActive(); });
    }, { passive: true });
    window.addEventListener('resize', () => { hideRailTip(); updateRailActive(); }, { passive: true });
    ['wheel', 'touchmove', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => { if (railPinnedKey) { railPinnedKey = null; updateRailActive(); } }, { passive: true });
    });
  }
}

function renderRow(mission, index, status, displayNumber) {
  const meta = statusMeta(status);
  const pct = Math.round(window.LWMissions.getMissionProgress(mission) * 100);
  const locked = status === 'locked';
  const tag = locked ? 'div' : 'a';
  const hrefAttr = locked ? '' : `href="mission-overview.html?mission=${encodeURIComponent(mission.category)}"`;
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

function renderOrientationCard() {
  if (!window.LWMissions || !window.LWMissions.getOrientation) return '';
  const o = window.LWMissions.getOrientation();
  const done = !!o.complete;
  const numIcon = done
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
  const lockIcon = window.LWIcons && window.LWIcons.markup ? window.LWIcons.markup('chapter_lock', { size: 'sm' }) : '';
  return `
    <a href="${o.href}" class="card path-row path-row--orientation${done ? ' path-row--done' : ''}">
      <span class="path-row__num" aria-hidden="true">${numIcon}</span>
      <div class="path-row__body">
        <p class="path-row__title">${o.title}</p>
        <p class="path-row__goal">${o.goal}</p>
      </div>
      <div class="path-row__meta">
        <span class="badge ${done ? 'badge--done' : 'badge--basic'}">${done ? 'Completed' : 'Start here'}</span>
        <svg class="path-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </a>
    ${done ? '' : `
    <p class="orientation-gate-note" role="note">
      ${lockIcon}
      <span>Finish Orientation first. Chapter 1, and every chapter after it, stays locked until you reach the end of the Orientation page or press Continue.</span>
    </p>`}
  `;
}

function renderList(filterText) {
  const listEl = document.getElementById('path-list');

  const query = (filterText || '').trim().toLowerCase();
  activeQuery = query;
  const filtered = query
    ? allMissions.filter((m) => m.title.toLowerCase().includes(query) || m.goal.toLowerCase().includes(query))
    : allMissions;

  if (!filtered.length) {
    listEl.innerHTML = `<p class="text-muted">No missions match "${filterText}".</p>`;
    renderChapterRail([]);
    return;
  }

  function rowsFor(missions) {
    return missions.map((m) => {
      const realIndex = allMissions.indexOf(m);
      const status = window.LWMissions.getMissionStatus(m, allMissions);
      return renderRow(m, realIndex, status, trailNumber.get(m.category));
    }).join('');
  }

  const chapters = (window.LWMissions && window.LWMissions.getCategoryGroups) ? window.LWMissions.getCategoryGroups() : [];
  const trailNumber = window.LWMissions.getTrailNumbers ? window.LWMissions.getTrailNumbers(allMissions) : new Map();
  const currentChapterId = window.LWMissions.getCurrentChapterId(allMissions);
  const isFiltering = query !== '';
  const pendingOrientation = orientationPending();

  const byChapter = new Map();
  const ungrouped = [];
  filtered.forEach((m) => {
    if (!m.categoryGroup) { ungrouped.push(m); return; }
    if (!byChapter.has(m.categoryGroup)) byChapter.set(m.categoryGroup, []);
    byChapter.get(m.categoryGroup).push(m);
  });

  const railModel = [];
  const chapterSections = chapters
    .filter((ch) => byChapter.has(ch.id))
    .map((ch) => {
      const missionsInChapter = byChapter.get(ch.id);
      const doneCount = missionsInChapter.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
      const isOpen = isFiltering || (!pendingOrientation && ch.id === currentChapterId);
      const chapterLocked = !window.LWMissions.isChapterUnlocked(ch.id, allMissions);
      const chapterComplete = doneCount === missionsInChapter.length;
      const chapterMeta = chapterLocked
        ? `<span class="badge badge--locked trail-group__lock-badge"${pendingOrientation ? ' title="Finish Orientation to unlock"' : ''}>Locked</span>`
        : `<span class="trail-group__meta">${doneCount}/${missionsInChapter.length} complete</span>`;
      railModel.push({ id: ch.id, order: ch.order, title: ch.title, locked: chapterLocked, complete: chapterComplete, done: doneCount, total: missionsInChapter.length });
      return `
        <details class="trail-group${chapterComplete ? ' trail-group--complete' : ''}" data-chapter="${ch.id}"${isOpen ? ' open' : ''}>
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
  renderChapterRail(railModel);
}

function celebrateNewUnlocks() {
  try {
    const fx = window.LWUnlockFx;
    const M = window.LWMissions;
    if (!fx || !M || typeof M.isChapterUnlocked !== 'function') return;
    const groups = Array.from(document.querySelectorAll('#path-list .trail-group[data-chapter]'));
    const states = {};
    groups.forEach((el) => { states[el.dataset.chapter] = M.isChapterUnlocked(el.dataset.chapter, allMissions); });
    const fired = fx.observe('chapters', states);
    if (fired.length) fx.play(groups.filter((el) => fired.includes(el.dataset.chapter)), { group: 'chapters', ids: fired });
  } catch (e) {  }
}

function initPage() {
  if (!window.LWMissions) {
    document.getElementById('path-list').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  const searchInput = document.getElementById('path-search-input');

  allMissions = window.LWMissions.getAllMissions();
  const orientationSlot = document.getElementById('orientation-slot');
  if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
  renderList('');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, () => { userTookOverScroll = true; }, { once: true, passive: true });
  });
  scrollToOpenChapter();

  document.getElementById('path-list').addEventListener('click', (e) => {
    const lockedRow = e.target.closest('.path-row--locked');
    if (!lockedRow) return;
    e.preventDefault();
    window.LinguaWave?.triggerLockedFeedback?.(lockedRow);
    if (orientationPending()) {
      window.LinguaWave?.showToast?.('Finish Orientation first. It unlocks Chapter 1.', 'info');
    }
  });

  searchInput.addEventListener('input', debounce(() => {
    renderList(searchInput.value);
    if (!searchInput.value.trim()) scrollToOpenChapter();
  }, 150));

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    allMissions = window.LWMissions.getAllMissions();
    if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
    renderList(searchInput.value);
    celebrateNewUnlocks();
  });

  window.LWMissions.whenMissionsSyncReady().then(() => {
    allMissions = window.LWMissions.getAllMissions();
    if (orientationSlot) orientationSlot.innerHTML = renderOrientationCard();
    renderList(searchInput.value);
    if (!userTookOverScroll && !searchInput.value.trim()) scrollToOpenChapter();
    celebrateNewUnlocks();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
