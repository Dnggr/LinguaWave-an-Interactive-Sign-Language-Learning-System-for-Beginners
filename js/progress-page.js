/**
 * js/progress-page.js — Data wiring for pages/progress.html
 * ─────────────────────────────────────────────────────────────────
 * Same data-source discipline as dashboard.js / mission-
 * overview.js: reads only window.LWMissions (missions, item progress,
 * streak, hearts, chapters, and — as of the migration-analysis pass —
 * sign titles too, via SIGNS_V2's own title field; V1's window.LWData
 * is no longer read here). Nothing here touches
 * js/engine/progress.js's real progress store — this is
 * a parallel read of the same Missions store the rest of already
 * uses (`lw_missions_progress_v1` / `lw_missions_streak_v1` /
 * `lw_missions_hearts_v1`).
 *
 * "Needs Review" due rule (see progress.html's header comment for
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
  // FIX (migration-analysis pass) — same fix as mission-overview.js's
  // signTitle(): read the title straight off window.LWMissions instead of
  // falling back to V1's window.LWData, since missions.js's SIGNS_V2
  // already carries its own `title` field.
  const sign = (window.LWMissions && typeof window.LWMissions.getSign === 'function')
    ? window.LWMissions.getSign(mission.level, signId)
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
      if (window.LWMissions.isItemComplete(m, i, item)) done++;
    });
  });
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/* Every LESSON item that's actually complete, across every mission —
 * this is "a sign has genuinely been taught," the same moment
 * js/missions.js's own getRecap() uses. One entry per sign per
 * mission (categories don't currently share signIds). */
function collectLearnedSigns(missions) {
  const out = [];
  missions.forEach((m) => {
    m.items.forEach((item, i) => {
      if (item.kind === 'LESSON' && window.LWMissions.isItemComplete(m, i, item)) {
        out.push({
          mission: m,
          signId: item.signId,
          completedAt: window.LWMissions.getItemCompletedAt(m, i, item),
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
  const el = document.getElementById('progress-hero');
  const items = tallyItems(missions);
  const missionsCompleted = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
  const streak = window.LWMissions.getStreakSummary();
  const hearts = window.LWMissions.getHeartsState();

  // Grid layout (see css/app.css's .progress-hero-row) — ring
  // and its label are two independent grid children stacked in
  // column 1, the stats tile spans both rows in column 2.
  // #progress-hero itself IS the grid (the class lives on it in
  // the HTML now, not on a wrapper here), so this innerHTML is just
  // its 3 direct children. Only the stats tile gets the shared
  // `.card` class — the ring stays uncarded/separated on purpose, per
  // the reference mockup, instead of both sharing one big card.
  el.innerHTML = `
    <div class="progress-hero__ring" id="progress-ring">
      <span class="progress-hero__ring-pct">${items.pct}%</span>
    </div>
    <span class="progress-ring-label">Overall Progress</span>
    <div class="card progress-stats-card" id="progress-stats-card">
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
  const ring = document.getElementById('progress-ring');
  if (ring) ring.style.setProperty('--pct', items.pct);
  syncRingSizeToStatsCard();
}

/* Only the ring reacts to the stats card's height — not the other
 * way around (css/app.css's .progress-hero__ring comment). The
 * card's own height is whatever its 5 stat tiles naturally need; this
 * just measures that after render and sizes the ring to match, so the
 * two never look mismatched at a random viewport width. Re-run on
 * resize (debounced) since the stats-grid's own auto-fit can reflow
 * the card's height as the window narrows. */
function syncRingSizeToStatsCard() {
  const ring = document.getElementById('progress-ring');
  const card = document.getElementById('progress-stats-card');
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

/* Below this width css/app.css's own .progress-grid breakpoint
 * stacks the two columns, so Needs Review sits BELOW the hero row
 * instead of beside it — nothing to cap its height against there. */
const GRID_STACK_BREAKPOINT_PX = 900;

/* Caps the Needs Review card's height to match the hero row beside
 * it (ring + stats tile — now the ONLY thing in `.progress-grid__
 * main`, since "Progress by Chapter" was moved below the grid in
 * progress.html so its own 70%/centered sizing resolves against
 * the full page instead of that narrow column), instead of letting a
 * long due-list push the card taller than its neighbor. The card
 * itself has `overflow: hidden` and its list has `overflow-y: auto`/
 * `min-height: 0` (css/app.css) — this just supplies the actual
 * max-height those rules need to have anything to clip against; a
 * long list scrolls internally rather than growing the card. */
function syncReviewCardHeight() {
  const hero = document.getElementById('progress-hero');
  const review = document.getElementById('needs-review');
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
// urgency — see progress.html's header comment. Gives the list the
// same at-a-glance visual variety the reference mockup has.
const REVIEW_ICON_TONES = ['review-row__icon--a', 'review-row__icon--b', 'review-row__icon--c'];

function renderNeedsReview(learnedSigns) {
  const el = document.getElementById('needs-review');
  const due = dueEntries(learnedSigns).slice(0, NEEDS_REVIEW_LIMIT);

  if (due.length === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Needs Review</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        Nothing's due yet. Signs show up here once it's been a couple of days since you first learned them.
      </p>
    `;
    return;
  }

  const rows = due.map((entry, i) => {
    const title = signTitleFor(entry.mission, entry.signId);
    const days = daysSince(entry.completedAt);
    const tone = REVIEW_ICON_TONES[i % REVIEW_ICON_TONES.length];
    const href = `camera-practice.html?level=${encodeURIComponent(entry.mission.level)}&category=${encodeURIComponent(entry.mission.category)}&sign=${encodeURIComponent(entry.signId)}`;
    return `
      <a class="review-row" href="${href}">
        <span class="review-row__icon ${tone}" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </span>
        <span class="review-row__body">
          <span class="review-row__title">${escapeHtml(title)}</span>
          <span class="review-row__meta">Last practiced ${days} day${days === 1 ? '' : 's'} ago</span>
        </span>
      </a>
    `;
  }).join('');

  const startHref = `camera-practice.html?level=${encodeURIComponent(due[0].mission.level)}&category=${encodeURIComponent(due[0].mission.category)}&sign=${encodeURIComponent(due[0].signId)}`;

  el.innerHTML = `
    <h2 class="mb-2">Needs Review (${due.length})</h2>
    <div class="review-list">${rows}</div>
    <a class="btn btn--primary review-cta" href="${startHref}">Start Review →</a>
  `;
}

function renderChapters(missions) {
  const el = document.getElementById('progress-chapters');
  const chapters = window.LWMissions.getCategoryGroups();

  const rowsHtml = chapters.map((chapter) => {
    const chapterMissions = missions.filter((m) => m.categoryGroup === chapter.id);
    if (chapterMissions.length === 0) return ''; // no live missions in this chapter yet
    const items = tallyItems(chapterMissions);
    return `
      <div class="unit-progress-group" style="padding: var(--space-4) var(--space-2);">
        <div class="flex" style="justify-content: space-between; margin-bottom: var(--space-2);">
          <span class="unit-progress-group__label">Chapter ${chapter.order} · ${escapeHtml(chapter.title)}</span>
          <span class="unit-progress-group__meta">${items.pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="--p:${items.pct};" data-progress="${items.pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = rowsHtml || '<p class="text-muted" style="padding: var(--space-4);">No live chapters found.</p>';
}

function showProgressUnavailable(reason) {
  console.error('[progress-page.js] Missions unavailable, showing fallback UI. Reason:', reason);
  const FALLBACK_MSG = "We couldn't load your progress right now.";
  document.getElementById('progress-hero').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('progress-chapters').innerHTML = `<p class="text-muted" style="padding: var(--space-4);">${FALLBACK_MSG}</p>`;
  document.getElementById('needs-review').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
}

function renderProgressPage() {
  try {
    const missions = window.LWMissions.getAllMissions();
    const learnedSigns = collectLearnedSigns(missions);
    renderHero(missions, learnedSigns);
    renderNeedsReview(learnedSigns);
    renderChapters(missions);
    syncReviewCardHeight();
  } catch (e) {
    console.error('[progress-page.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
  }
}

function initPage() {
  if (!window.LWMissions) {
    // FIX (migration-analysis pass) — was also requiring window.LWData
    // (js/data.js), which this page no longer reads (see signTitleFor()).
    showProgressUnavailable('window.LWMissions did not load');
    return;
  }

  // Render immediately from local state (getAllMissions() reads
  // straight off localStorage) rather than blocking first paint on a
  // Firestore round-trip. Reconcile cross-device progress in the
  // background and re-render once it resolves.
  renderProgressPage();
  window.LWMissions.whenMissionsSyncReady().then(renderProgressPage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}