/**
 * js/progress-page.js — Data wiring for pages/progress.html
 * ─────────────────────────────────────────────────────────────────
 * PHASE 1 PROGRESS CENTER REDESIGN — same data-source discipline as
 * before (window.LWMissions only; nothing here touches
 * js/engine/progress.js's real progress store), restructured around
 * three questions: Where am I? What needs my attention? What should I
 * do next? No new storage, no new routes — every link below reuses an
 * existing page (mission-overview.html, learn.html, camera-
 * practice.html) or scrolls to another section of this same page.
 *
 * PHASE 2 "MAKE PROGRESS FEEL PERSONAL" — four sections rendered after
 * the chapter timeline / sign mastery grid. Same rules as Phase 1:
 * window.LWMissions only, nothing fabricated. All four are built from
 * data the app already records per item — getItemCompletedAt(mission,
 * i, item), which exists for EVERY item kind (LESSON/BOOSTER/PRACTICE/
 * QUIZ), not just lessons — plus getStreakSummary()'s longestStreak.
 *   #progress-snapshot    → renderSnapshot()    Strengths & Focus Areas,
 *                           one row per started mission (real % done),
 *                           NOT the mockup's per-sign-category grouping
 *                           — this app's missions ARE the categories
 *                           (Greetings, Numbers, ...), so ranking
 *                           missions by % is the real equivalent.
 *   (Recent Activity, the Learning Activity heatmap and Your Highlights used to be
 *   here — they now live on pages/profile.html, rendered by js/profile-page.js.)
 * Every one of these handles its own "nothing yet" copy inline, the
 * same convention #next-milestone/#needs-review/#progress-chapters
 * already use, rather than one all-or-nothing empty overlay.
 *
 * PHASE 3 — "make it feel distinctly LinguaWave," per
 * progressUI_guidelines.docx. Adds renderCelebration() (§11, full-
 * course-complete banner) and renderSignMastery()/
 * renderSignMasteryGrid() (per-chapter sign mastery grid), reworks
 * renderChapters()'s connector into an animated wavy SVG path with a
 * real-timestamp "Just completed" badge, and turns renderMilestone()
 * into renderRecommendation() — same card, but pickRecommendation()
 * now checks review urgency and mission drop-off position first and
 * only falls back to the original "next chapter milestone" framing
 * when neither applies.
 *
 * Render order (renderProgressPage()) mirrors the page's visual
 * hierarchy: hero (ring + stats) → celebration banner → contextual
 * recommendation → needs review → chapter timeline → sign mastery →
 * snapshot.
 * Every renderer reads off the same `missions`/`learnedSigns` arrays
 * computed once per pass, so numbers agree with each other by
 * construction (same rule the original file used for the ring vs.
 * the chapter bars).
 *
 * "Needs Review" due rule (unchanged): a sign counts as due once its
 * LESSON item's real getItemCompletedAt() timestamp is at least
 * DUE_AFTER_DAYS old — a simple SRS-lite, not real spaced-repetition
 * scheduling, labeled as such in the UI copy.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const DUE_AFTER_DAYS = 2;
const NEEDS_REVIEW_LIMIT = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Phase 2
const SNAPSHOT_MAX_ROWS = 2;       // strengths shown, and focus areas shown
// Phase 3 — a chapter's "Just completed" badge (renderChapters()) only
// shows while its most recent real completedAt is within this window.
// Not a spec'd number anywhere; 24h reads as "you just did this" without
// needing its own settings toggle.
const RECENTLY_DONE_MS = MS_PER_DAY;
// The Learning Journey lists every chapter the learner can open plus this many
// locked ones ("up next"); the rest sit behind a "Show N more" button so the
// page isn't a wall of Locked rows. The choice survives re-renders.
const LOCKED_PREVIEW = 1;
let showAllLockedChapters = false;

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
  const sign = (window.LWMissions && typeof window.LWMissions.getSign === 'function')
    ? window.LWMissions.getSign(mission.level, signId)
    : null;
  return (sign && sign.title) || signId;
}

function missionHref(mission) {
  return `mission-overview.html?mission=${encodeURIComponent(mission.category)}`;
}

/* ── Item-level roll-up, shared by the hero stats and the chapter
 * timeline so "65% overall" and every chapter's own % are always
 * counting the exact same underlying items. Unchanged from before —
 * dashboard.js's tallyItems() is a separate copy of this same shape,
 * on purpose (this repo's "re-derive small pieces of logic per file"
 * convention), so the two pages' numbers still agree by construction. */
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
 * "a sign has genuinely been taught," the same moment js/missions.js's
 * own getRecap() uses. One entry per sign per mission (categories
 * don't currently share signIds). This is what the "Signs Learned"
 * stat tile has always counted — kept as-is for continuity with the
 * rest of the app; see tallySigns() below for the more granular
 * mastered/practicing/not-started split used only in the ring's
 * expandable breakdown. */
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

/* PHASE 2 — every completed item, across every mission and every item
 * kind (LESSON/BOOSTER/PRACTICE/QUIZ), with its real completedAt. This
 * is the shared source for Recent Activity and the consistency heatmap
 * — both need "which real calendar days had activity," and this is the
 * same underlying signal missions.js's own recordActivityToday() uses
 * to build the streak (any item completing counts as that day's
 * activity), so the two pages' notions of "active day" never disagree.
 * Kept separate from collectLearnedSigns() (LESSON-only, used by Needs
 * Review) since Recent Activity/the heatmap should reflect ALL practice,
 * not just first-time teaching moments. */
function collectAllCompletions(missions) {
  const out = [];
  missions.forEach((m) => {
    m.items.forEach((item, i) => {
      const completedAt = window.LWMissions.getItemCompletedAt(m, i, item);
      if (completedAt) out.push({ mission: m, item, index: i, completedAt });
    });
  });
  return out;
}

/* Local calendar day (not UTC) for a stored ISO timestamp — grouping
 * activity by the learner's own day, not by UTC's. */
function localDateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  return localDateKey(new Date().toISOString());
}

/* NEW — per-sign breakdown (distinct from tallyItems(), which counts
 * every ITEM: LESSON+BOOSTER+PRACTICE+QUIZ). Each sign is one of:
 *   mastered   — every item for that sign (LESSON, and BOOSTER/
 *                 PRACTICE where they exist) is complete
 *   practicing — the LESSON is complete but a BOOSTER/PRACTICE for
 *                 the same sign isn't yet (i.e. "taught" but not
 *                 fully drilled)
 *   remaining  — the LESSON itself hasn't been completed yet
 * Reuses getLessonProgress() (already computes done/total per signId)
 * rather than re-deriving item completion a second way. */
function tallySigns(missions) {
  let total = 0, mastered = 0, practicing = 0;
  missions.forEach((m) => {
    const signIds = new Set();
    m.items.forEach((item) => { if (item.kind === 'LESSON' && item.signId) signIds.add(item.signId); });
    signIds.forEach((signId) => {
      total++;
      const lp = window.LWMissions.getLessonProgress(m, signId);
      if (lp >= 1) mastered++;
      else if (lp > 0) practicing++;
    });
  });
  return { total, mastered, practicing, remaining: total - mastered - practicing };
}

/* Ring size, in px, is clamped to this range by syncRingSizeToStatsCard()
 * below — a floor so it never shrinks illegibly small next to a short
 * stats card, and a ceiling so it never dwarfs a tall one. */
const RING_MIN_PX = 140;
const RING_MAX_PX = 200;

/* Set of local-day keys (YYYY-MM-DD) on which the learner completed at
 * least one item — the ONE "was this day active?" signal shared by the
 * Learning Activity heatmap (renderConsistency, now in js/profile-page.js) and the Day Streak
 * tile's week strip (buildStreakWeek), so the two can never disagree
 * about which days count. */
function getActiveDaySet(missions) {
  return new Set(collectAllCompletions(missions).map((c) => localDateKey(c.completedAt)));
}

/* Day Streak tile's visual: this calendar week (Mon–Sun), one cell per
 * day, using the SAME .heatmap-cell states as the Learning Activity
 * card below (active = green, inactive = track grey, future = dashed)
 * so the tile reads as a "zoomed-in" slice of that heatmap rather than
 * a second, different visual language. Today gets a ring so a learner
 * can see at a glance whether today has counted yet. The strip is
 * exposed to assistive tech as ONE image with a sentence label — the
 * individual cells/letters are aria-hidden, since seven unlabeled
 * squares would just be noise in a screen reader. */
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function buildStreakWeek(activeDays) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayDow = (now.getDay() + 6) % 7; // Mon=0..Sun=6, same as profile-page.js's renderConsistency()
  const monday = new Date(now);
  monday.setDate(monday.getDate() - todayDow);

  const activeNames = [];
  const cols = WEEKDAY_LETTER.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDateKey(d.toISOString());
    const isFuture = d > now;
    const active = !isFuture && activeDays.has(key);
    if (active) activeNames.push(WEEKDAY_SHORT[i]);
    const state = isFuture ? 'future' : active ? 'active' : 'inactive';
    const today = i === todayDow ? ' streak-week__cell--today' : '';
    return `<span class="streak-week__day" aria-hidden="true">
        <span class="heatmap-cell heatmap-cell--${state} streak-week__cell${today}" title="${key}"></span>
        <span class="streak-week__letter">${letter}</span>
      </span>`;
  }).join('');

  const label = activeNames.length
    ? `This week you practiced on ${activeNames.join(', ')}.`
    : 'No practice recorded yet this week.';
  return `<span class="streak-week" role="img" aria-label="${label}">${cols}</span>`;
}

/* ── Mastery Hearts refill countdown ────────────────────────────
 * Shows "Next heart in 42m" on the Mastery Hearts tile and inside its
 * explainer while the pool isn't full. Same wording/format as the
 * Mastery Quiz's out-of-hearts popup (h + m, rounded up). One interval at
 * most (AGENTS.md timer rule): it is cleared on pagehide, and it only
 * touches the text nodes, except when a heart actually comes back, when
 * it re-renders the hero so the count and icon are right. */
let heartsCountdownTimerId = null;
let heartsRenderedCount = null;

function formatHeartCountdown(targetIso) {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return 'less than a minute';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function tickHeartsCountdown() {
  if (!window.LWMissions) return;
  const now = window.LWMissions.getHeartsState();
  if (heartsRenderedCount !== null && now.hearts !== heartsRenderedCount) {
    // A heart came back: redraw the tile, keeping the explainer open if it was.
    const panel = document.getElementById('hearts-explainer');
    const wasOpen = !!(panel && !panel.hidden);
    const missions = window.LWMissions.getAllMissions();
    renderHero(missions, collectLearnedSigns(missions));
    if (wasOpen) {
      const p = document.getElementById('hearts-explainer');
      const b = document.querySelector('.hearts-toggle');
      if (p) p.hidden = false;
      if (b) b.setAttribute('aria-expanded', 'true');
    }
    return;
  }
  if (!now.nextRefillAt) return;
  const text = formatHeartCountdown(now.nextRefillAt);
  document.querySelectorAll('[data-hearts-countdown]').forEach((el) => { el.textContent = text; });
}

function startHeartsCountdown() {
  if (heartsCountdownTimerId !== null) clearInterval(heartsCountdownTimerId);
  heartsCountdownTimerId = setInterval(tickHeartsCountdown, 15000);
}
window.addEventListener('pagehide', () => {
  if (heartsCountdownTimerId !== null) { clearInterval(heartsCountdownTimerId); heartsCountdownTimerId = null; }
});
// Background tabs throttle timers; catch up as soon as the tab is back.
document.addEventListener('visibilitychange', () => { if (!document.hidden) tickHeartsCountdown(); });

/* ── §02 Overall Progress + §03 Progress Statistics ─────────────────
 * The ring's own % is still tallyItems() — the SAME formula
 * dashboard.js's ring uses, so the two pages never disagree. Under
 * the ring, an always-visible line now says what that % actually
 * represents (signs learned / remaining, §02's explicit ask), and a
 * small toggle reveals the more granular mastered/practicing/not-
 * started split (tallySigns()) without crowding the main view.
 *
 * §03: "Signs Learned" and "Missions Completed" link to learn.html
 * (the closest existing "browse everything" destination — there is
 * no separate sign-library page to point at); "Signs to Review"
 * scrolls to this same page's #needs-review section, and only when
 * there's actually something due there — a stat tile should never
 * promise a destination that has nothing behind it. */
function renderHero(missions, learnedSigns) {
  const el = document.getElementById('progress-hero');
  const items = tallyItems(missions);
  const signs = tallySigns(missions);
  const missionsCompleted = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
  const streak = window.LWMissions.getStreakSummary();
  const hearts = window.LWMissions.getHeartsState();
  const due = countDue(learnedSigns);
  const remaining = Math.max(0, signs.total - learnedSigns.length);

  // "Signs to Review" only links out when there's actually something
  // due — an empty stat shouldn't promise a destination with nothing
  // behind it. Built as plain strings (not a dynamic tag name) to
  // keep the template legible.
  const reviewTile = due > 0
    ? `<a class="stat-tile" href="#needs-review">
         <span class="stat-tile__value">${due}</span>
         <span class="stat-tile__label">Signs to Review</span>
       </a>`
    : `<div class="stat-tile">
         <span class="stat-tile__value">${due}</span>
         <span class="stat-tile__label">Signs to Review</span>
       </div>`;

  // Mastery Hearts tile: a real heart glyph + the count ("❤ 3") instead
  // of the old "3/3" text. The max isn't repeated here — the tile's
  // popover already explains the pool size, and a lone number next to
  // the icon reads faster at a glance. Filled while the learner has at
  // least one heart; drawn as an outline at 0 so an empty pool looks
  // empty. Same Feather-style heart path as the rest of the app's icons.
  const heartIcon = `<svg class="heart-icon${hearts.hearts > 0 ? '' : ' heart-icon--empty'}" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>`;
  // Refill countdown (only while the pool isn't full). Kept in sync by
  // tickHeartsCountdown(); the same text shows on the tile and in the explainer.
  heartsRenderedCount = hearts.hearts;
  const refillText = hearts.nextRefillAt ? formatHeartCountdown(hearts.nextRefillAt) : '';
  const tileHint = refillText
    ? `<span class="stat-tile__hint">Next heart in <span data-hearts-countdown>${refillText}</span></span>`
    : '';
  const explainerNext = refillText
  // Day Streak tile: number + this-week strip (see buildStreakWeek()).
  const streakWeek = buildStreakWeek(getActiveDaySet(missions));

  el.innerHTML = `
    <div class="progress-hero__ring" id="progress-ring">
      <span class="progress-hero__ring-pct">${items.pct}%</span>
    </div>
    <div class="progress-ring-label-group">
      <span class="progress-ring-label">Overall Progress</span>
      <span class="progress-ring-sub">${learnedSigns.length} / ${signs.total} signs learned · ${remaining} remaining</span>
      <button type="button" class="progress-ring-detail-toggle" aria-expanded="false" aria-controls="progress-ring-detail">
        <span>Sign breakdown</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="progress-ring-detail" id="progress-ring-detail" hidden>
        <div class="progress-ring-detail__row"><span>Total signs</span><span>${signs.total}</span></div>
        <div class="progress-ring-detail__row"><span>Mastered</span><span>${signs.mastered}</span></div>
        <div class="progress-ring-detail__row"><span>Still practicing</span><span>${signs.practicing}</span></div>
        <div class="progress-ring-detail__row"><span>Not started yet</span><span>${signs.remaining}</span></div>
      </div>
    </div>
    <div class="card progress-stats-card" id="progress-stats-card">
      <div class="stats-grid">
        <a class="stat-tile" href="learn.html">
          <span class="stat-tile__value">${learnedSigns.length}</span>
          <span class="stat-tile__label">Signs Learned</span>
        </a>
        <a class="stat-tile" href="learn.html">
          <span class="stat-tile__value">${missionsCompleted}/${missions.length}</span>
          <span class="stat-tile__label">Missions Completed</span>
        </a>
        ${reviewTile}
        <div class="stat-tile-wrap">
          <button type="button" class="stat-tile hearts-toggle" aria-expanded="false" aria-controls="hearts-explainer">
            <span class="stat-tile__value stat-tile__value--icon">${heartIcon}<span>${hearts.hearts}</span></span>
            <span class="stat-tile__label">Mastery Hearts</span>
            ${tileHint}
          </button>
          <div class="hearts-explainer" id="hearts-explainer" hidden>
            <strong>How Mastery Hearts work</strong>
            <p>You have ${hearts.maxHearts} hearts for Mastery Quizzes. A mistake in a quiz costs a heart, and each lost heart comes back after 1 hour.</p>
          </div>
        </div>
        <button type="button" class="stat-tile stat-tile--streak streak-open" aria-haspopup="dialog">
          <span class="stat-tile__streak-text">
            <span class="stat-tile__value">${streak.currentStreak}d</span>
            <span class="stat-tile__label">Day Streak</span>
          </span>
          ${streakWeek}
        </button>
      </div>
    </div>
  `;
  const ring = document.getElementById('progress-ring');
  if (ring) ring.style.setProperty('--pct', items.pct);
  syncRingSizeToStatsCard();
}

/* ── Day Streak dialog ───────────────────────────────────────────────
 * Opened by the Day Streak tile (a <button> now, not a link to the
 * dashboard). Layout: flame, "N Day Streak", the last 5 days ending
 * today as check boxes, then one line saying what to do next.
 *
 * Built ONCE, lazily, and appended to <body> — NOT inside #progress-hero,
 * because renderHero() replaces that element's innerHTML on every render
 * (including the background Firestore-sync re-render), which would
 * destroy an open dialog. Its content is refreshed each time it opens.
 * Native <dialog>.showModal() gives focus trapping, Esc-to-close and the
 * top layer for free; backdrop click and the X button are wired below.
 *
 * Data is the same as the tile: getStreakSummary() for the number and
 * getActiveDaySet() (per-item completedAt, local days) for the boxes, so
 * the two can't disagree. The old tile's tooltip ("Longest streak: N
 * days") is now a visible line here — a hover-only title was invisible
 * on touch screens. The dashboard link the tile used to be is kept as
 * the dialog's action button. */
const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STREAK_DIALOG_DAYS = 5;

/* Teardrop flame drawn in the app's own tokens (orange while a streak is
 * alive, muted grey via .streak-flame--idle at 0). Lighter inner flame
 * and a soft base glow echo the reference; white overlays are
 * translucent so they read on both themes. A live flame also gets three
 * ember circles; the motion itself is pure CSS (see .streak-flame in
 * app.css), and an idle (0-day) flame stays still and has no embers. */
function streakFlameSvg(idle) {
  return `<svg class="streak-flame${idle ? ' streak-flame--idle' : ''}" viewBox="0 0 96 112" aria-hidden="true">
    <path class="streak-flame__outer" d="M50 4C54 22 84 38 84 72c0 22-16 38-36 38S12 94 12 72c0-16 8-26 16-34 2 8 6 12 12 14C38 34 40 16 50 4z"/>
    <path class="streak-flame__inner" d="M48 44c3 12 22 20 22 40 0 12-10 22-22 22S26 96 26 84c0-10 6-16 10-22 2 5 5 7 8 7-1-9 0-18 4-25z"/>
    <ellipse class="streak-flame__glow" cx="48" cy="100" rx="24" ry="9"/>
    ${idle ? '' : `<circle class="streak-flame__spark streak-flame__spark--1" cx="30" cy="40" r="3.4"/>
    <circle class="streak-flame__spark streak-flame__spark--2" cx="66" cy="46" r="2.8"/>
    <circle class="streak-flame__spark streak-flame__spark--3" cx="50" cy="30" r="2.2"/>`}
  </svg>`;
}

function buildStreakDialogContent() {
  const missions = window.LWMissions.getAllMissions();
  const activeDays = getActiveDaySet(missions);
  const streak = window.LWMissions.getStreakSummary();
  const n = streak.currentStreak;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let practicedToday = false;
  const items = [];
  for (let i = STREAK_DIALOG_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    const isToday = i === 0;
    const done = activeDays.has(localDateKey(d.toISOString()));
    if (isToday) practicedToday = done;
    const state = done ? 'done' : isToday ? 'today' : 'missed';
    const status = done ? 'practiced' : isToday ? 'not practiced yet' : 'no practice';
    items.push(`<li class="streak-days__item streak-days__item--${state}">
        <span class="streak-days__letter" aria-hidden="true">${WEEKDAY_LETTER[dow]}</span>
        <span class="streak-days__box" aria-hidden="true">${done
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : ''}</span>
        <span class="sr-only">${isToday ? 'Today' : WEEKDAY_FULL[dow]}: ${status}</span>
      </li>`);
  }

  const message = practicedToday
    ? "You've practiced today. Come back tomorrow to keep your streak going!"
    : n > 0
      ? 'Finish a lesson or practice a sign today to keep your streak going!'
      : 'Finish a lesson or practice a sign to start your streak!';
  const best = streak.longestStreak;

  return `
    <button type="button" class="streak-dialog__close" aria-label="Close streak details">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="streak-dialog__body">
      ${streakFlameSvg(n === 0)}
      <h2 class="streak-dialog__title" id="streak-dialog-title">${n} Day Streak</h2>
      <ol class="streak-days" aria-label="Your last ${STREAK_DIALOG_DAYS} days">${items.join('')}</ol>
      <p class="streak-dialog__msg">${message}</p>
      <p class="streak-dialog__best">Longest streak: ${best} day${best === 1 ? '' : 's'}</p>
      <a class="btn btn--primary streak-dialog__cta" href="dashboard.html">Go to dashboard</a>
    </div>`;
}

function openStreakDialog() {
  let dlg = document.getElementById('streak-dialog');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'streak-dialog';
    dlg.className = 'streak-dialog';
    dlg.setAttribute('aria-labelledby', 'streak-dialog-title');
    document.body.appendChild(dlg);
    // Backdrop click: the dialog has zero padding and its body fills it,
    // so a click that lands on the <dialog> itself can only be the backdrop.
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg || ev.target.closest('.streak-dialog__close')) dlg.close();
    });
    // The tile is re-created by every renderHero(), so hand focus back to
    // whichever tile exists now rather than the (possibly detached) opener.
    dlg.addEventListener('close', () => {
      const tile = document.querySelector('.streak-open');
      if (tile) tile.focus();
    });
  }
  // No <dialog> support: fall back to what the tile did before.
  if (typeof dlg.showModal !== 'function') { window.location.href = 'dashboard.html'; return; }
  dlg.innerHTML = buildStreakDialogContent();
  if (!dlg.open) dlg.showModal();
}

/* Delegated once in initPage() — #progress-hero itself is never
 * replaced (only its innerHTML is, on every render), so a single
 * listener here survives every re-render, same pattern learn.js's
 * locked-row click handler already uses on #path-list. */
function closeHeartsExplainer() {
  const panel = document.getElementById('hearts-explainer');
  const btn = document.querySelector('.hearts-toggle');
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.stat-tile-wrap')) closeHeartsExplainer();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHeartsExplainer(); });

function onHeroClick(e) {
  if (e.target.closest('.streak-open')) { openStreakDialog(); return; }
  const hb = e.target.closest('.hearts-toggle');
  if (hb) {
    const hp = document.getElementById('hearts-explainer');
    if (hp) { const open = hp.hidden; hp.hidden = !open; hb.setAttribute('aria-expanded', String(open)); }
    return;
  }
  const toggle = e.target.closest('.progress-ring-detail-toggle');
  if (!toggle) return;
  const panel = document.getElementById('progress-ring-detail');
  if (!panel) return;
  const open = panel.hidden;
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
}

/* Popover dismissal: click anywhere outside it, or press Escape. */
function closeRingDetail() {
  const panel = document.getElementById('progress-ring-detail');
  const toggle = document.querySelector('.progress-ring-detail-toggle');
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.progress-ring-label-group')) closeRingDetail();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRingDetail(); });

/* Only the ring reacts to the stats card's height — not the other
 * way around (css/app.css's .progress-hero__ring comment). */
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
  }, 120);
});

/* ── Phase 3 — Completion celebration (§11) ──────────────────────────
 * Full-width banner, hidden by default in pages/progress.html and only
 * ever populated once EVERY reachable mission is actually done — same
 * `missions.every(...)` rule pickActiveMission()'s absence already
 * implies elsewhere on this page, checked directly here so this
 * function doesn't depend on renderRecommendation() having run first.
 * A course with zero missions (LWMissions still loading/misconfigured)
 * intentionally does NOT celebrate — `missions.length > 0` guards that,
 * same "don't show a triumphant banner over nothing" reasoning as the
 * chapter timeline's own "no live chapters" fallback below. */
function renderCelebration(missions, learnedSigns) {
  const el = document.getElementById('progress-celebration');
  if (!el) return;
  const allDone = missions.length > 0 && missions.every((m) => window.LWMissions.getMissionProgress(m) >= 1);
  if (!allDone) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <span class="progress-celebration__sparkle">${window.LWIcons.markup('hero_sparkle', { className: 'progress-celebration__sparkle-icon' })}</span>
    <h2 class="progress-celebration__title">You did it!</h2>
    <p class="progress-celebration__sub">You've completed every LinguaWave mission — ${learnedSigns.length} sign${learnedSigns.length === 1 ? '' : 's'} learned.</p>
    <div class="progress-celebration__actions">
      <a class="btn btn--primary btn--sm" href="camera-practice.html">Practice All Signs</a>
      <a class="btn btn--secondary btn--sm" href="#progress-chapters">Review Your Journey</a>
    </div>
  `;
}

/* ── §04 Next Milestone → Phase 3 "contextual recommendation" ───────
 * The nearest reachable, unfinished mission — same "first not-done,
 * unlocked mission" rule dashboard.js's pickCurrentMission() uses, so
 * this always names the same mission the Dashboard would point at.
 * Wording and remaining-step count come straight from the mission's
 * own item list — nothing hardcoded, nothing invented. */
function pickActiveMission(missions) {
  const reachable = missions.filter((m) => window.LWMissions.getMissionStatus(m, missions) !== 'locked');
  return reachable.find((m) => window.LWMissions.getMissionProgress(m) < 1) || null;
}

/* One line describing a specific mission item, for the "continue where
 * you left off" recommendation — reused nowhere else, so it can afford
 * to be item-kind-specific rather than the generic "N steps left"
 * phrasing the rest of this card uses. */
function describeItem(mission, item) {
  const title = item.signId ? signTitleFor(mission, item.signId) : mission.title;
  switch (item.kind) {
    case 'LESSON': return `Learn “${title}”`;
    case 'BOOSTER': return `Quick booster: “${title}”`;
    case 'PRACTICE': return item.scenarioTitle || `Practice “${title}”`;
    case 'QUIZ': return 'Take the Mastery Quiz';
    default: return title;
  }
}

/* Phase 3 — picks WHICH thing is most worth recommending right now,
 * in priority order, from real state only (no new storage, nothing
 * invented):
 *   1. 'review'      — the Needs Review list is already full (§ same
 *                       NEEDS_REVIEW_LIMIT the card itself caps at) —
 *                       reviewing is more urgent than learning more.
 *   2. 'continue'     — the active mission has already been started
 *                       (getDropOffIndex() > 0) — name the exact next
 *                       item instead of the mission-level framing.
 *   3. 'almost-done'  — some OTHER unlocked, not-yet-done chapter is
 *                       further along (≥60%) than every other live
 *                       chapter — a near-finish-line nudge.
 *   4. 'start'        — the original Phase 1 framing: the active
 *                       mission hasn't been started at all yet.
 *   5. null           — nothing reachable is unfinished; the
 *                       celebration banner (renderCelebration()) covers
 *                       this state, so the card just shows a short
 *                       congratulations instead of repeating it.
 */
function pickRecommendation(missions, learnedSigns) {
  const due = countDue(learnedSigns);
  if (due >= NEEDS_REVIEW_LIMIT) return { kind: 'review', due };

  const active = pickActiveMission(missions);
  if (active) {
    const dropOff = window.LWMissions.getDropOffIndex(active);
    if (dropOff > 0 && dropOff < active.items.length) {
      return { kind: 'continue', mission: active, item: active.items[dropOff] };
    }
  }

  let almost = null;
  window.LWMissions.getCategoryGroups().forEach((chapter) => {
    const chapterMissions = missions.filter((m) => m.categoryGroup === chapter.id);
    if (!chapterMissions.length) return;
    if (chapterStatus(chapter, chapterMissions, missions) !== 'current') return;
    const items = tallyItems(chapterMissions);
    if (items.pct >= 60 && items.pct < 100 && (!almost || items.pct > almost.pct)) {
      almost = { chapter, pct: items.pct };
    }
  });
  if (almost) return { kind: 'almost-done', chapter: almost.chapter, pct: almost.pct };

  if (active) return { kind: 'start', mission: active };
  return null;
}

function renderRecommendation(missions, learnedSigns) {
  const el = document.getElementById('next-milestone');
  const rec = pickRecommendation(missions, learnedSigns);

  // §11 Fully completed learner — every reachable mission is done.
  // Short congratulations + one action, rather than repeating the
  // full action set the celebration banner above already offers.
  if (!rec) {
    el.innerHTML = `
      <h2 class="mb-2">Next Milestone</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        You've completed every mission — nice work! Keep your signs sharp with a practice round any time.
      </p>
      <a class="btn btn--secondary btn--sm mt-3" href="camera-practice.html">Practice Again →</a>
      <a class="btn btn--ghost btn--sm mt-3" href="learn.html">Explore Signs</a>
    `;
    return;
  }

  if (rec.kind === 'review') {
    el.innerHTML = `
      <h2 class="mb-2">Review First</h2>
      <p class="next-milestone__title">${rec.due} sign${rec.due === 1 ? ' is' : 's are'} waiting for review</p>
      <p class="text-muted next-milestone__sub">A quick review round keeps them from fading before you learn more.</p>
      <a class="btn btn--primary btn--sm mt-3" href="#needs-review">Review Now →</a>
    `;
    return;
  }

  if (rec.kind === 'continue') {
    el.innerHTML = `
      <h2 class="mb-2">Keep Going</h2>
      <p class="next-milestone__title">${describeItem(rec.mission, rec.item)}</p>
      <p class="text-muted next-milestone__sub">Pick up right where you left off in “${escapeHtml(rec.mission.title)}”.</p>
      <a class="btn btn--primary btn--sm mt-3" href="${missionHref(rec.mission)}">Continue Learning →</a>
    `;
    return;
  }

  if (rec.kind === 'almost-done') {
    el.innerHTML = `
      <h2 class="mb-2">Almost There!</h2>
      <p class="next-milestone__title">Chapter ${rec.chapter.order} · ${escapeHtml(rec.chapter.title)} is ${rec.pct}% done</p>
      <p class="text-muted next-milestone__sub">You're closer to finishing this chapter than any other — a great place to focus next.</p>
      <a class="btn btn--primary btn--sm mt-3" href="#progress-chapters">See Chapter →</a>
    `;
    return;
  }

  // rec.kind === 'start' — original Phase 1 framing, unchanged.
  const mission = rec.mission;
  const info = tallyItems([mission]);
  const remaining = info.total - info.done;
  const started = info.done > 0;
  const chapter = window.LWMissions.getCategoryGroups().find((c) => c.id === mission.categoryGroup) || null;
  const scope = chapter ? missions.filter((m) => m.categoryGroup === chapter.id) : [mission];
  let signsLeft = 0;
  scope.forEach((m) => m.items.forEach((item, i) => {
    if (item.kind === 'LESSON' && !window.LWMissions.isItemComplete(m, i, item)) signsLeft++;
  }));
  const where = chapter ? `Chapter ${chapter.order} · ${escapeHtml(chapter.title)}` : escapeHtml(mission.title);
  const title = signsLeft > 0
    ? `Learn ${signsLeft} more sign${signsLeft === 1 ? '' : 's'}`
    : `Finish “${escapeHtml(mission.title)}”`;
  const sub = signsLeft > 0
    ? `Keep going in ${where}. Next up: “${escapeHtml(mission.title)}”.`
    : `${remaining} step${remaining === 1 ? '' : 's'} left in this mission`;

  el.innerHTML = `
    <h2 class="mb-2">Next Milestone</h2>
    <p class="next-milestone__title">${title}</p>
    <p class="text-muted next-milestone__sub">${sub}</p>
    <a class="btn btn--primary btn--sm mt-3" href="${missionHref(mission)}">${started ? 'Continue Learning →' : 'Start Learning →'}</a>
  `;
}

function dueEntries(learnedSigns) {
  return learnedSigns
    .filter((e) => e.completedAt && daysSince(e.completedAt) >= DUE_AFTER_DAYS)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt)); // oldest (most overdue) first
}

function countDue(learnedSigns) {
  return dueEntries(learnedSigns).length;
}

/* Purely decorative rotation, not a claim about urgency — see the
 * file header. Gives the list a little visual variety. */
const REVIEW_ICON_TONES = ['review-row__icon--a', 'review-row__icon--b', 'review-row__icon--c'];

/* ── §05 Needs Review + §06 Review All Action ───────────────────── */
function renderNeedsReview(learnedSigns) {
  const el = document.getElementById('needs-review');
  const allDue = dueEntries(learnedSigns);
  const due = allDue.slice(0, NEEDS_REVIEW_LIMIT);

  if (due.length === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Needs Review</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        You're all caught up! Signs show up here once it's been a couple of days since you first learned them — keep practicing to maintain your progress.
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
    <h2 class="mb-1">Needs Review</h2>
    <p class="text-muted mb-3" style="font-size: var(--fs-sm);">${allDue.length} sign${allDue.length === 1 ? ' is' : 's are'} ready for practice</p>
    <div class="review-list">${rows}</div>
    ${allDue.length > due.length ? `<p class="text-muted mt-2" style="font-size: var(--fs-sm);">+ ${allDue.length - due.length} more due</p>` : ''}
    <a class="btn btn--primary review-cta mt-3" href="${startHref}">Review All ${allDue.length} →</a>
  `;
}

/* ── §07 Progress by Chapter + §08 Chapter Journey Visualization ────
 * One vertical timeline, not two separate widgets — each chapter's
 * status icon connects to the next via a rail, so the "stronger sense
 * of progression" §08 asks for lives inside the same per-chapter list
 * §07 already had, instead of duplicating all 12 chapters a second
 * time in a parallel strip. Status per chapter reuses the exact same
 * chapter-gating rules missions.js already exposes
 * (isChapterUnlocked()) — nothing re-derived here that isn't already
 * computed once by the shared getMissionStatus() story for missions. */
function chapterStatus(chapter, chapterMissions, allMissions) {
  const done = chapterMissions.every((m) => window.LWMissions.getMissionProgress(m) >= 1);
  if (done) return 'done';
  if (!window.LWMissions.isChapterUnlocked(chapter.id, allMissions)) return 'locked';
  return 'current';
}

const CHAPTER_ICON = {
  done: 'complete',
  current: 'current',
  locked: 'locked',
};

/* Phase 3 — real timestamp behind the chapter timeline's "Just
 * completed" badge: the latest getItemCompletedAt() across every item
 * in the chapter, or null if (somehow) a 'done' chapter has no
 * completedAt on record at all (e.g. progress imported/seeded some
 * other way) — in which case the badge simply doesn't render, rather
 * than guessing a time. */
function chapterLastCompletedAt(chapterMissions) {
  let latest = null;
  chapterMissions.forEach((m) => m.items.forEach((item, i) => {
    if (!window.LWMissions.isItemComplete(m, i, item)) return;
    const at = window.LWMissions.getItemCompletedAt(m, i, item);
    if (at && (!latest || new Date(at) > new Date(latest))) latest = at;
  }));
  return latest;
}

function renderChapters(missions) {
  const el = document.getElementById('progress-chapters');
  const chapters = window.LWMissions.getCategoryGroups();

  const liveChapters = chapters
    .map((chapter) => ({ chapter, chapterMissions: missions.filter((m) => m.categoryGroup === chapter.id) }))
    .filter(({ chapterMissions }) => chapterMissions.length > 0);

  if (!liveChapters.length) {
    el.innerHTML = '<p class="text-muted" style="padding: var(--space-4);">No live chapters found.</p>';
    return;
  }

  const withStatus = liveChapters.map((entry) => ({ ...entry, status: chapterStatus(entry.chapter, entry.chapterMissions, missions) }));
  const lockedCount = withStatus.filter((e) => e.status === 'locked').length;
  let lockedSeen = 0;
  const visibleChapters = showAllLockedChapters
    ? withStatus
    : withStatus.filter((e) => e.status !== 'locked' || ++lockedSeen <= LOCKED_PREVIEW);

  const rowsHtml = visibleChapters.map(({ chapter, chapterMissions, status }, i) => {
    const items = tallyItems(chapterMissions);
    const isLast = i === visibleChapters.length - 1;
    // Only the currently-open chapter shows a live bar — a 100% bar
    // on a done chapter or a 0% bar on one the learner can't open yet
    // is redundant/misleading (same rule js/learn.js's renderRow()
    // already applies to individual mission rows).
    const showBar = status === 'current';
    const rightSide = status === 'locked'
      ? '<span class="badge badge--locked">Locked</span>'
      : `<span class="chapter-timeline__pct">${items.pct}%</span>`;

    // Phase 3 — "Just completed": only for a chapter that's actually
    // 'done' AND whose real last-completed timestamp falls inside
    // RECENTLY_DONE_MS. Never shown for 'current'/'locked' — there is
    // no fabricated in-between "almost just completed" state.
    const lastDoneAt = status === 'done' ? chapterLastCompletedAt(chapterMissions) : null;
    const justCompleted = lastDoneAt && (Date.now() - new Date(lastDoneAt).getTime()) < RECENTLY_DONE_MS;
    const freshBadge = justCompleted
      ? '<span class="chapter-timeline__fresh"><span class="chapter-timeline__fresh-dot" aria-hidden="true"></span>Just completed</span>'
      : '';

    // Phase 3 — the old plain <span> rail line is now a wavy SVG path
    // that draws itself in on load (css/app.css's lw-wave-draw
    // keyframes). The "d" is identical on every row (only the row's
    // rendered HEIGHT differs, via preserveAspectRatio="none"), so one
    // fixed stroke-dasharray/length works for every row regardless of
    // how tall that particular chapter's card ends up. Colour comes
    // from the SAME status class the icon beside it already uses —
    // the connector reads as "how far the path has been walked," not
    // a separate signal. --wave-delay staggers the draw-in top to
    // bottom, which is what actually reads as an animated journey
    // rather than every segment popping in at once.
    const waveSvg = !isLast
      ? `<svg class="chapter-timeline__wave chapter-timeline__wave--${status}" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true" style="--wave-delay:${i * 120}ms">
           <path d="M12,0 C20,17 4,33 12,50 C20,67 4,83 12,100" />
         </svg>`
      : '';

    return `
      <div class="chapter-timeline__row chapter-timeline__row--${status}">
        <div class="chapter-timeline__rail" aria-hidden="true">
          <span class="chapter-timeline__icon chapter-timeline__icon--${status}">${window.LWIcons.markup(CHAPTER_ICON[status], { size: 'sm' })}</span>
          ${waveSvg}
        </div>
        <div class="chapter-timeline__body">
          <div class="chapter-timeline__top">
            <span class="chapter-timeline__title">Chapter ${chapter.order} · ${escapeHtml(chapter.title)}</span>
            ${rightSide}
          </div>
          ${freshBadge}
          ${showBar ? `<div class="progress-bar"><div class="progress-bar__fill" style="--p:${items.pct};" data-progress="${items.pct}"></div></div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const hiddenCount = lockedCount - LOCKED_PREVIEW;
  const toggleHtml = hiddenCount > 0
    ? `<button type="button" class="chapter-timeline__toggle" id="chapter-toggle" aria-expanded="${showAllLockedChapters}" aria-controls="progress-chapters">
         <span>${showAllLockedChapters ? 'Hide locked chapters' : `Show ${hiddenCount} more locked chapter${hiddenCount === 1 ? '' : 's'}`}</span>
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
       </button>`
    : '';

  el.innerHTML = `<div class="chapter-timeline">${rowsHtml}</div>${toggleHtml}`;

  const toggle = document.getElementById('chapter-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      showAllLockedChapters = !showAllLockedChapters;
      renderChapters(missions);
      const again = document.getElementById('chapter-toggle');
      if (again) again.focus();
    });
  }
}

/* ── Phase 3 — Sign Mastery ───────────────────────────────────────────
 * Per-chapter grid, not one 599-sign grid for the whole trail (that's
 * every live sign across all 12 chapters — see the session notes;
 * nowhere near legible or useful as one grid). Defaults to whichever
 * chapter getCurrentChapterId() says is "the one you're working on";
 * the <select> lets the learner switch to any OTHER unlocked chapter
 * (done or current — never locked, since a locked chapter has no
 * attempted signs to show mastery of at all, same "don't show
 * meaningless empty stats" rule as the rest of this page). */
function renderSignMastery(missions) {
  const el = document.getElementById('sign-mastery');
  const chapters = window.LWMissions.getCategoryGroups();

  const liveChapters = chapters
    .map((chapter) => ({ chapter, chapterMissions: missions.filter((m) => m.categoryGroup === chapter.id) }))
    .filter(({ chapterMissions }) => chapterMissions.length > 0)
    .filter(({ chapter, chapterMissions }) => chapterStatus(chapter, chapterMissions, missions) !== 'locked');

  if (!liveChapters.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;

  const currentId = window.LWMissions.getCurrentChapterId(missions);
  const initial = liveChapters.find(({ chapter }) => chapter.id === currentId) || liveChapters[0];

  const options = liveChapters.map(({ chapter }) =>
    `<option value="${chapter.id}"${chapter.id === initial.chapter.id ? ' selected' : ''}>Chapter ${chapter.order} · ${escapeHtml(chapter.title)}</option>`
  ).join('');

  el.innerHTML = `
    <div class="sign-mastery__head">
      <h2 class="mb-0">Sign Mastery</h2>
      <label class="sign-mastery__select-wrap">
        <span class="sr-only">Chapter</span>
        <select class="sign-mastery__select" id="sign-mastery-select">${options}</select>
      </label>
    </div>
    <p class="text-muted mb-3" style="font-size: var(--fs-sm);" id="sign-mastery-sub"></p>
    <div class="sign-mastery__grid" id="sign-mastery-grid"></div>
    <div class="sign-mastery__legend">
      <span><i class="sign-mastery__dot sign-mastery__dot--mastered" aria-hidden="true"></i>Mastered</span>
      <span><i class="sign-mastery__dot sign-mastery__dot--practicing" aria-hidden="true"></i>Practicing</span>
      <span><i class="sign-mastery__dot sign-mastery__dot--remaining" aria-hidden="true"></i>Not started</span>
    </div>
  `;

  const select = document.getElementById('sign-mastery-select');
  select.addEventListener('change', () => {
    const found = liveChapters.find(({ chapter }) => chapter.id === select.value);
    if (found) renderSignMasteryGrid(found.chapter, found.chapterMissions);
  });

  renderSignMasteryGrid(initial.chapter, initial.chapterMissions);
}

/* One chip per unique signId across every mission in the chapter (a
 * sign can only belong to one mission per chapter in practice, but
 * de-duping via `seen` guards the rare case of a data overlap rather
 * than assuming it can't happen). Mastery state reuses
 * getLessonProgress() — the exact same mastered/practicing/remaining
 * split the ring's own expandable breakdown (renderHero()) already
 * uses, just scoped to one chapter instead of the whole trail, so the
 * two never disagree about what "mastered" means. */
function renderSignMasteryGrid(chapter, chapterMissions) {
  const sub = document.getElementById('sign-mastery-sub');
  const grid = document.getElementById('sign-mastery-grid');
  if (!sub || !grid) return;

  const entries = [];
  const seen = new Set();
  chapterMissions.forEach((m) => {
    m.items.forEach((item) => {
      const key = `${m.id}_${item.signId}`;
      if (item.kind !== 'LESSON' || !item.signId || seen.has(key)) return;
      seen.add(key);
      const lp = window.LWMissions.getLessonProgress(m, item.signId);
      const state = lp >= 1 ? 'mastered' : lp > 0 ? 'practicing' : 'remaining';
      entries.push({ mission: m, signId: item.signId, title: signTitleFor(m, item.signId), state });
    });
  });

  const mastered = entries.filter((e) => e.state === 'mastered').length;
  sub.textContent = entries.length
    ? `${mastered} / ${entries.length} signs mastered in Chapter ${chapter.order} · ${chapter.title}`
    : 'No signs in this chapter yet.';

  grid.innerHTML = entries.map((e) => {
    const href = `camera-practice.html?level=${encodeURIComponent(e.mission.level)}&category=${encodeURIComponent(e.mission.category)}&sign=${encodeURIComponent(e.signId)}`;
    return `<a class="sign-mastery__chip sign-mastery__chip--${e.state}" href="${href}" title="${escapeHtml(e.title)}">
      <span class="sr-only">${escapeHtml(e.title)} — ${e.state}</span>
    </a>`;
  }).join('');
}

/* ── PHASE 2 §1 Strengths & Focus Areas ──────────────────────────────
 * Ranks every STARTED mission (progress > 0) by its real tallyItems()
 * %, same formula the chapter timeline's own bars use. Top performers
 * become Strengths; the weakest ones that aren't already mastered
 * become Focus Areas — a mission sitting at 100% has nothing left to
 * focus on, so it's excluded from that side even if it would otherwise
 * rank low (it can't, but the filter documents the intent). Missions
 * never started at all aren't "weak," they're just not reached yet —
 * excluded from both sides rather than padding Focus Areas with 0%s. */
function renderSnapshot(missions) {
  const el = document.getElementById('progress-snapshot');
  const started = missions
    .map((m) => ({ title: m.title, pct: tallyItems([m]).pct }))
    .filter((m) => m.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  if (started.length === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Your Learning Snapshot</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        Once you've started a few missions, this is where you'll see which topics you're strongest in and which could use more practice.
      </p>
    `;
    return;
  }

  const strengths = started.slice(0, SNAPSHOT_MAX_ROWS);
  const strengthTitles = new Set(strengths.map((m) => m.title));
  // Weakest-first, excluding anything already shown as a Strength above
  // (relevant when very few missions have been started — the same
  // single mission shouldn't be both "your strength" and "your focus").
  const focusPool = started
    .filter((m) => m.pct < 100 && !strengthTitles.has(m.title))
    .slice()
    .reverse()
    .slice(0, SNAPSHOT_MAX_ROWS);

  const barRow = (m, tone) => `
    <div class="snapshot-row">
      <div class="snapshot-row__top">
        <span class="snapshot-row__title">${escapeHtml(m.title)}</span>
        <span class="snapshot-row__pct">${m.pct}%</span>
      </div>
      <div class="progress-bar snapshot-bar snapshot-bar--${tone}"><div class="progress-bar__fill" style="--p:${m.pct};" data-progress="${m.pct}"></div></div>
    </div>
  `;

  const allMastered = started.every((m) => m.pct >= 100);
  const focusHtml = focusPool.length
    ? focusPool.map((m) => barRow(m, 'focus')).join('')
    : allMastered
      ? `<p class="text-muted" style="font-size: var(--fs-sm);">Everything you've started is fully mastered — nice work!</p>`
      : `<p class="text-muted" style="font-size: var(--fs-sm);">Start another mission or two to see your focus areas here.</p>`;

  el.innerHTML = `
    <h2 class="mb-4">Your Learning Snapshot</h2>
    <div class="snapshot-grid">
      <div class="snapshot-col">
        <p class="snapshot-col__label">Strengths</p>
        ${strengths.map((m) => barRow(m, 'strength')).join('')}
      </div>
      <div class="snapshot-col">
        <p class="snapshot-col__label">Focus Areas</p>
        ${focusHtml}
      </div>
    </div>
  `;
}

/* Recent Activity (renderActivity), Learning Activity heatmap (renderConsistency) and Your Highlights (renderHighlights)
 * MOVED to js/profile-page.js / pages/profile.html. Nothing else on this page used them;
 * getActiveDaySet() above stays because the Day Streak tile's week strip still needs it. */

function showProgressUnavailable(reason) {
  console.error('[progress-page.js] Missions unavailable, showing fallback UI. Reason:', reason);
  const FALLBACK_MSG = "We couldn't load your progress right now.";
  document.getElementById('progress-hero').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  // Phase 3 — hidden-by-default containers: keep them hidden rather than
  // showing an empty card with a failure message in it.
  const celebration = document.getElementById('progress-celebration');
  if (celebration) { celebration.hidden = true; celebration.innerHTML = ''; }
  document.getElementById('next-milestone').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('needs-review').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('progress-chapters').innerHTML = `<p class="text-muted" style="padding: var(--space-4);">${FALLBACK_MSG}</p>`;
  const mastery = document.getElementById('sign-mastery');
  if (mastery) { mastery.hidden = true; mastery.innerHTML = ''; }
  // Phase 2 sections
  const snapshot = document.getElementById('progress-snapshot');
  if (snapshot) snapshot.innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
}

function renderProgressPage() {
  try {
    const missions = window.LWMissions.getAllMissions();
    const learnedSigns = collectLearnedSigns(missions);
    renderHero(missions, learnedSigns);
    // Phase 3
    renderCelebration(missions, learnedSigns);
    renderRecommendation(missions, learnedSigns);
    renderNeedsReview(learnedSigns);
    renderChapters(missions);
    renderSignMastery(missions);
    // Phase 2 — "make progress feel personal"
    renderSnapshot(missions);
  } catch (e) {
    console.error('[progress-page.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
  }
}

function initPage() {
  if (!window.LWMissions) {
    showProgressUnavailable('window.LWMissions did not load');
    return;
  }

  const hero = document.getElementById('progress-hero');
  if (hero) hero.addEventListener('click', onHeroClick);

  // Render immediately from local state (getAllMissions() reads
  // straight off localStorage) rather than blocking first paint on a
  // Firestore round-trip. Reconcile cross-device progress in the
  // background and re-render once it resolves.
  renderProgressPage();
  window.LWMissions.whenMissionsSyncReady().then(renderProgressPage);
  startHeartsCountdown();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}