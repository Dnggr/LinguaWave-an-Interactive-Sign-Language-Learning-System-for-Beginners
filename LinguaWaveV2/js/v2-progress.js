/**
 * js/v2-progress.js — Data wiring for pages/v2-progress.html
 * ─────────────────────────────────────────────────────────────────
 * Same data-source discipline as v2-dashboard.js / v2-mission-
 * overview.js: reads only window.LWDataV2 (missions, item progress,
 * streak, hearts, chapters) and window.LWData (sign titles). Nothing
 * here touches js/engine/progress.js's real progress store — this is
 * a parallel read of the same dataV2 store the rest of V2 already
 * uses (`lw_datav2_progress_v1` / `lw_datav2_streak_v1` /
 * `lw_datav2_hearts_v1`).
 *
 * "Needs Review" due rule (see v2-progress.html's header comment for
 * why this is honest, not fabricated): a sign counts as due once its
 * LESSON item's real getItemCompletedAt() timestamp is at least
 * DUE_AFTER_DAYS old. This is a simple SRS-lite, not a claim of real
 * spaced-repetition scheduling — labeled as such in the UI copy.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const DUE_AFTER_DAYS = 2;
const NEEDS_REVIEW_LIMIT = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_DAY));
}

function signTitleFor(mission, signId) {
  const sign = (window.LWData && typeof window.LWData.getSign === 'function')
    ? window.LWData.getSign(mission.level, signId)
    : null;
  return (sign && sign.title) || signId;
}

/* ── Item-level roll-up, shared by the hero stats and the chapter
 * breakdown so "65% overall" and the sum of the chapter bars are
 * always counting the exact same underlying items. ─────────────── */
function tallyItems(missions) {
  let total = 0, done = 0;
  missions.forEach((m) => {
    m.items.forEach((item, i) => {
      total++;
      if (window.LWDataV2.isItemComplete(m, i, item)) done++;
    });
  });
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/* Every LESSON item that's actually complete, across every mission —
 * this is "a sign has genuinely been taught," the same moment
 * js/data-v2.js's own getRecap() uses. One entry per sign per
 * mission (categories don't currently share signIds). */
function collectLearnedSigns(missions) {
  const out = [];
  missions.forEach((m) => {
    m.items.forEach((item, i) => {
      if (item.kind === 'LESSON' && window.LWDataV2.isItemComplete(m, i, item)) {
        out.push({
          mission: m,
          signId: item.signId,
          completedAt: window.LWDataV2.getItemCompletedAt(m, i, item),
        });
      }
    });
  });
  return out;
}

function renderHero(missions, learnedSigns) {
  const el = document.getElementById('v2-progress-hero');
  const items = tallyItems(missions);
  const missionsCompleted = missions.filter((m) => window.LWDataV2.getMissionProgress(m) >= 1).length;
  const streak = window.LWDataV2.getStreakSummary();
  const hearts = window.LWDataV2.getHeartsState();

  el.innerHTML = `
    <div class="v2-progress-hero__ring" id="v2-progress-ring">
      <span class="v2-progress-hero__ring-pct">${items.pct}%</span>
    </div>
    <p class="v2-progress-ring-label">Overall Progress</p>
    <div class="card v2-progress-stats-card">
      <div class="stats-grid">
        <div class="stat-tile">
          <span class="stat-tile__value">${learnedSigns.length}</span>
          <span class="stat-tile__label">Signs Learned</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${missionsCompleted}/${missions.length}</span>
          <span class="stat-tile__label">Missions Completed</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${countDue(learnedSigns)}</span>
          <span class="stat-tile__label">Signs to Review</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${streak.currentStreak}d</span>
          <span class="stat-tile__label">Day Streak</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">${hearts.hearts}/${hearts.maxHearts}</span>
          <span class="stat-tile__label">Mastery Hearts</span>
        </div>
      </div>
    </div>
  `;
  const ring = document.getElementById('v2-progress-ring');
  if (ring) ring.style.setProperty('--pct', items.pct);
  syncRingSizeToStatsCard();
}

/* ── Ring sizing: measured, not guessed (this session) ─────────────
 * Per explicit correction: only `.v2-progress-hero__ring` itself
 * should be sized proportionate to the stats card beside it — and
 * the `.v2-progress-ring-card` wrapper div that used to group the
 * ring+label has been REMOVED entirely (see css/v2-app.css's
 * `.v2-progress-hero-row` — now a CSS Grid placing the ring/label/
 * stats-card directly, no container div needed to keep the ring
 * stacked above its label). Measures the REAL rendered height of
 * `.v2-progress-stats-card` and sets the ring's width/height (a
 * circle, so both together) to that height minus the label's own
 * rendered height and the grid's row-gap between them — i.e. the
 * ring circle's diameter is exactly the space left over for it, not
 * a static breakpoint-driven number. Re-run on window resize
 * (debounced) since the row can reflow/stack under 640px, where the
 * two are no longer side-by-side and this sizing isn't meaningful —
 * the CSS fallback size below handles that stacked case instead.
 *
 * BUG FIXED THIS ROUND (minimizing the browser window): the
 * height-based calculation above had no corresponding WIDTH check.
 * css/dashboard.css's `.stats-grid` reflows its 5 tiles into more
 * rows as the window narrows, which makes `.v2-progress-stats-card`
 * TALLER — and this function was feeding that larger height straight
 * into the ring's size with nothing capping it against how much
 * WIDTH the ring's own grid column actually had left at that
 * narrower size, so the ring grew past its column and visibly
 * overlapped the sidebar "Needs Review" card (reported: 314px ring
 * at a narrowed window). Fixed by also computing a width-based cap
 * from the row's own rendered width and using the SMALLER of the two
 * — the ring now can't outgrow its column just because its sibling
 * got taller from wrapping. */
let ringSyncTimer = null;
function syncRingSizeToStatsCard() {
  const ring = document.getElementById('v2-progress-ring');
  const row = ring && ring.closest('.v2-progress-hero-row');
  const label = row && row.querySelector('.v2-progress-ring-label');
  const statsCard = document.querySelector('.v2-progress-stats-card');
  if (!ring || !row || !label || !statsCard) return;

  // Side-by-side only below the row's own stacking breakpoint —
  // matches css/v2-app.css's `.v2-progress-hero-row` 640px rule
  // exactly, so this never fights the CSS fallback size on mobile.
  if (window.innerWidth <= 640) {
    ring.style.removeProperty('width');
    ring.style.removeProperty('height');
    return;
  }

  const cardHeight = statsCard.getBoundingClientRect().height;
  const labelHeight = label.getBoundingClientRect().height;
  const gap = parseFloat(getComputedStyle(row).rowGap || '0') || 0;
  const availableByHeight = cardHeight - labelHeight - gap;

  // Width cap: the ring's own grid column is `auto`-sized (it sizes
  // to whatever the ring ends up being — see css/v2-app.css), so
  // there's no pre-existing "column width" to read back. Instead cap
  // the ring to a fraction of the ROW's total rendered width, leaving
  // room for the column-gap + stats card next to it, so a taller
  // (narrower-reflowed) stats card can never force the ring wider
  // than the row can actually fit beside it.
  const rowWidth = row.getBoundingClientRect().width;
  const availableByWidth = rowWidth * 0.4;

  const available = Math.round(Math.min(availableByHeight, availableByWidth));
  // Sanity floor/ceiling so a not-yet-laid-out measurement (0/negative
  // on first paint) or an unusually short stats card never produces a
  // collapsed or absurdly huge circle — the CSS rule's own 240px stays
  // the fallback outside this range.
  if (available >= 140 && available <= 480) {
    ring.style.width = `${available}px`;
    ring.style.height = `${available}px`;
  }
}

function dueEntries(learnedSigns) {
  return learnedSigns
    .filter((e) => e.completedAt && daysSince(e.completedAt) >= DUE_AFTER_DAYS)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt)); // oldest (most overdue) first
}

function countDue(learnedSigns) {
  return dueEntries(learnedSigns).length;
}

// Purely decorative rotation (red/orange/green), not a claim about
// urgency — see v2-progress.html's header comment. Gives the list the
// same at-a-glance visual variety the reference mockup has.
const REVIEW_ICON_TONES = ['v2-review-row__icon--a', 'v2-review-row__icon--b', 'v2-review-row__icon--c'];

function renderNeedsReview(learnedSigns) {
  const el = document.getElementById('v2-needs-review');
  const due = dueEntries(learnedSigns).slice(0, NEEDS_REVIEW_LIMIT);

  if (due.length === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Needs Review</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        Nothing's due yet — signs show up here once it's been a couple of days since you first learned them.
      </p>
    `;
    return;
  }

  const rows = due.map((entry, i) => {
    const title = signTitleFor(entry.mission, entry.signId);
    const days = daysSince(entry.completedAt);
    const tone = REVIEW_ICON_TONES[i % REVIEW_ICON_TONES.length];
    const href = `../../pages/lesson.html?level=${encodeURIComponent(entry.mission.level)}&category=${encodeURIComponent(entry.mission.category)}&sign=${encodeURIComponent(entry.signId)}`;
    return `
      <a class="v2-review-row" href="${href}">
        <span class="v2-review-row__icon ${tone}" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </span>
        <span class="v2-review-row__body">
          <span class="v2-review-row__title">${escapeHtml(title)}</span>
          <span class="v2-review-row__meta">Last practiced ${days} day${days === 1 ? '' : 's'} ago</span>
        </span>
      </a>
    `;
  }).join('');

  const startHref = `../../pages/lesson.html?level=${encodeURIComponent(due[0].mission.level)}&category=${encodeURIComponent(due[0].mission.category)}&sign=${encodeURIComponent(due[0].signId)}`;

  el.innerHTML = `
    <h2 class="mb-2">Needs Review (${due.length})</h2>
    <div class="v2-review-list">${rows}</div>
    <a class="btn btn--primary v2-review-cta" href="${startHref}">Start Review →</a>
  `;
}

function renderChapters(missions) {
  const el = document.getElementById('v2-progress-chapters');
  const chapters = window.LWDataV2.getCategoryGroups();

  const rowsHtml = chapters.map((chapter) => {
    const chapterMissions = missions.filter((m) => m.categoryGroup === chapter.id);
    if (chapterMissions.length === 0) return ''; // no live missions in this chapter yet
    const items = tallyItems(chapterMissions);
    return `
      <div class="unit-progress-group" style="padding: var(--space-4) var(--space-2);">
        <div class="flex" style="justify-content: space-between; margin-bottom: var(--space-2);">
          <span class="unit-progress-group__label">Chapter ${chapter.order} — ${escapeHtml(chapter.title)}</span>
          <span class="unit-progress-group__meta">${items.pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${items.pct}%;" data-progress="${items.pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = rowsHtml || '<p class="text-muted" style="padding: var(--space-4);">No live chapters found.</p>';
}

function showProgressUnavailable(reason) {
  console.error('[v2-progress.js] dataV2 unavailable, showing fallback UI. Reason:', reason);
  const FALLBACK_MSG = "We couldn't load your V2 progress right now.";
  document.getElementById('v2-progress-hero').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('v2-progress-chapters').innerHTML = `<p class="text-muted" style="padding: var(--space-4);">${FALLBACK_MSG}</p>`;
  document.getElementById('v2-needs-review').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
}

/* ── Cap "Needs Review"'s growth to match the left column (this
 * session) — per explicit report: the review list can grow taller
 * than the hero-row card beside it (more due signs = taller card,
 * even though NEEDS_REVIEW_LIMIT already caps it at 3 rows — long
 * sign titles wrapping, or that limit changing later, could still
 * make it taller than intended). Measures `.v2-progress-hero-row`'s
 * real rendered height and applies it as `max-height` on the whole
 * `#v2-needs-review` card — the "Needs Review (N)" heading and
 * "Start Review" button stay fully visible (fixed flex items,
 * `.v2-review-list` is the only flexible/scrollable piece, per its
 * `flex:1 1 auto; min-height:0; overflow-y:auto` in css/v2-app.css),
 * so a longer list scrolls internally instead of pushing the card
 * taller than its sibling. Re-run on resize (shares the same
 * debounce timer as the ring sizing below — both need to react to
 * the same layout changes). */
function syncNeedsReviewHeightToHero() {
  const hero = document.querySelector('.v2-progress-hero-row');
  const reviewCard = document.getElementById('v2-needs-review');
  if (!hero || !reviewCard) return;
  // Two columns only side-by-side above 900px (css/v2-app.css's
  // `.v2-progress-grid` breakpoint) — below that they stack, and
  // matching heights isn't meaningful once they're not beside each
  // other.
  if (window.innerWidth <= 900) {
    reviewCard.style.removeProperty('max-height');
    return;
  }
  const heroHeight = hero.getBoundingClientRect().height;
  if (heroHeight > 0) reviewCard.style.maxHeight = `${Math.round(heroHeight)}px`;
}

function initPage() {
  if (!window.LWData || !window.LWDataV2) {
    showProgressUnavailable('window.LWData/window.LWDataV2 did not load');
    return;
  }
  try {
    const missions = window.LWDataV2.getAllMissions();
    const learnedSigns = collectLearnedSigns(missions);
    renderHero(missions, learnedSigns);
    renderNeedsReview(learnedSigns);
    renderChapters(missions);
    syncNeedsReviewHeightToHero();
  } catch (e) {
    console.error('[v2-progress.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

window.addEventListener('resize', () => {
  clearTimeout(ringSyncTimer);
  ringSyncTimer = setTimeout(() => {
    syncRingSizeToStatsCard();
    syncNeedsReviewHeightToHero();
  }, 150);
});