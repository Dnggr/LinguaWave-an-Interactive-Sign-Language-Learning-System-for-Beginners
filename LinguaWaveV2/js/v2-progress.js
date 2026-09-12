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

/* Ring size, in px, is clamped to this range by syncRingSizeToStatsCard()
 * below — a floor so it never shrinks illegibly small next to a short
 * stats card, and a ceiling so it never dwarfs a tall one. */
const RING_MIN_PX = 160;
const RING_MAX_PX = 280;

function renderHero(missions, learnedSigns) {
  const el = document.getElementById('v2-progress-hero');
  const items = tallyItems(missions);
  const missionsCompleted = missions.filter((m) => window.LWDataV2.getMissionProgress(m) >= 1).length;
  const streak = window.LWDataV2.getStreakSummary();
  const hearts = window.LWDataV2.getHeartsState();

  // Grid layout (see css/v2-app.css's .v2-progress-hero-row) — ring
  // and its label are two independent grid children stacked in
  // column 1, the stats tile spans both rows in column 2.
  // #v2-progress-hero itself IS the grid (the class lives on it in
  // the HTML now, not on a wrapper here), so this innerHTML is just
  // its 3 direct children. Only the stats tile gets the shared
  // `.card` class — the ring stays uncarded/separated on purpose, per
  // the reference mockup, instead of both sharing one big card.
  el.innerHTML = `
    <div class="v2-progress-hero__ring" id="v2-progress-ring">
      <span class="v2-progress-hero__ring-pct">${items.pct}%</span>
    </div>
    <span class="v2-progress-ring-label">Overall Progress</span>
    <div class="card v2-progress-stats-card" id="v2-progress-stats-card">
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

/* Only the ring reacts to the stats card's height — not the other
 * way around (css/v2-app.css's .v2-progress-hero__ring comment). The
 * card's own height is whatever its 5 stat tiles naturally need; this
 * just measures that after render and sizes the ring to match, so the
 * two never look mismatched at a random viewport width. Re-run on
 * resize (debounced) since the stats-grid's own auto-fit can reflow
 * the card's height as the window narrows. */
function syncRingSizeToStatsCard() {
  const ring = document.getElementById('v2-progress-ring');
  const card = document.getElementById('v2-progress-stats-card');
  if (!ring || !card) return;
  const target = Math.max(RING_MIN_PX, Math.min(RING_MAX_PX, card.offsetHeight));
  ring.style.width = `${target}px`;
  ring.style.height = `${target}px`;
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    syncRingSizeToStatsCard();
    syncReviewCardHeight();
  }, 120);
});

/* Below this width css/v2-app.css's own .v2-progress-grid breakpoint
 * stacks the two columns, so Needs Review sits BELOW the hero row
 * instead of beside it — nothing to cap its height against there. */
const GRID_STACK_BREAKPOINT_PX = 900;

/* Caps the Needs Review card's height to match the hero row beside
 * it (ring + stats tile — now the ONLY thing in `.v2-progress-grid__
 * main`, since "Progress by Chapter" was moved below the grid in
 * v2-progress.html so its own 70%/centered sizing resolves against
 * the full page instead of that narrow column), instead of letting a
 * long due-list push the card taller than its neighbor. The card
 * itself has `overflow: hidden` and its list has `overflow-y: auto`/
 * `min-height: 0` (css/v2-app.css) — this just supplies the actual
 * max-height those rules need to have anything to clip against; a
 * long list scrolls internally rather than growing the card. */
function syncReviewCardHeight() {
  const hero = document.getElementById('v2-progress-hero');
  const review = document.getElementById('v2-needs-review');
  if (!hero || !review) return;
  if (window.innerWidth <= GRID_STACK_BREAKPOINT_PX) {
    review.style.maxHeight = '';
    return;
  }
  review.style.maxHeight = `${hero.offsetHeight}px`;
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
    const href = `lesson.html?level=${encodeURIComponent(entry.mission.level)}&category=${encodeURIComponent(entry.mission.category)}&sign=${encodeURIComponent(entry.signId)}`;
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

  const startHref = `lesson.html?level=${encodeURIComponent(due[0].mission.level)}&category=${encodeURIComponent(due[0].mission.category)}&sign=${encodeURIComponent(due[0].signId)}`;

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

async function initPage() {
  if (!window.LWData || !window.LWDataV2) {
    showProgressUnavailable('window.LWData/window.LWDataV2 did not load');
    return;
  }
  try {
    // Reconcile cross-device Firestore progress before rendering.
    await window.LWDataV2.whenDataV2SyncReady();
    const missions = window.LWDataV2.getAllMissions();
    const learnedSigns = collectLearnedSigns(missions);
    renderHero(missions, learnedSigns);
    renderNeedsReview(learnedSigns);
    renderChapters(missions);
    syncReviewCardHeight();
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