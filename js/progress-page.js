'use strict';

const DUE_AFTER_DAYS = 2;
const NEEDS_REVIEW_LIMIT = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SNAPSHOT_MAX_ROWS = 2;
const RECENTLY_DONE_MS = MS_PER_DAY;
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

function localDateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  return localDateKey(new Date().toISOString());
}

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

const RING_MIN_PX = 140;
const RING_MAX_PX = 200;

function getActiveDaySet(streak) {
  return new Set((streak && streak.recentDays) || []);
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function buildStreakWeek(activeDays) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeNames = [];
  const cols = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dow = (d.getDay() + 6) % 7;
    const key = localDateKey(d.toISOString());
    const active = activeDays.has(key);
    if (active) activeNames.push(i === 6 ? 'today' : WEEKDAY_SHORT[dow]);
    const state = active ? 'active' : 'inactive';
    const today = i === 6 ? ' streak-week__cell--today' : '';
    return `<span class="streak-week__day" aria-hidden="true">
        <span class="heatmap-cell heatmap-cell--${state} streak-week__cell${today}" title="${key}"></span>
        <span class="streak-week__letter">${WEEKDAY_LETTER[dow]}</span>
      </span>`;
  }).join('');

  const label = activeNames.length
    ? `In the last 7 days you practiced on ${activeNames.join(', ')}.`
    : 'No practice recorded in the last 7 days.';
  return `<span class="streak-week" role="img" aria-label="${label}">${cols}</span>`;
}

let heartsCountdownTimerId = null;
let heartsRenderedCount = null;
let stopLocalDayChange = null;

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
  tickHeartsCountdown();
  heartsCountdownTimerId = setInterval(tickHeartsCountdown, 15000);
}
window.addEventListener('pagehide', () => {
  if (heartsCountdownTimerId !== null) { clearInterval(heartsCountdownTimerId); heartsCountdownTimerId = null; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tickHeartsCountdown(); });

function renderHero(missions, learnedSigns) {
  const el = document.getElementById('progress-hero');
  const items = tallyItems(missions);
  const signs = tallySigns(missions);
  const missionsCompleted = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
  const streak = window.LWMissions.getStreakSummary();
  const hearts = window.LWMissions.getHeartsState();
  const due = countDue(learnedSigns);
  const remaining = Math.max(0, signs.total - learnedSigns.length);

  const reviewTile = due > 0
    ? `<a class="stat-tile" href="#needs-review">
         <span class="stat-tile__value">${due}</span>
         <span class="stat-tile__label">Signs to Review</span>
       </a>`
    : `<div class="stat-tile">
         <span class="stat-tile__value">${due}</span>
         <span class="stat-tile__label">Signs to Review</span>
       </div>`;

  const heartIcon = `<svg class="heart-icon${hearts.hearts > 0 ? '' : ' heart-icon--empty'}" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>`;
  heartsRenderedCount = hearts.hearts;
  const refillText = hearts.nextRefillAt ? formatHeartCountdown(hearts.nextRefillAt) : '';
  const tileHint = refillText
    ? `<span class="stat-tile__hint">Next heart in <span data-hearts-countdown>${refillText}</span></span>`
    : '';
  const explainerNext = refillText
  const streakWeek = buildStreakWeek(getActiveDaySet(streak));

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

const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STREAK_DIALOG_DAYS = 5;

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
  const streak = window.LWMissions.getStreakSummary();
  const activeDays = getActiveDaySet(streak);
  const n = streak.currentStreak;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let practicedToday = false;
  const items = [];
  for (let i = STREAK_DIALOG_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = (d.getDay() + 6) % 7;
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
    ? (streak.restoredToday
        ? 'Streak restored! You bridged a missed day. Come back tomorrow to keep it going!'
        : "You've practiced today. Come back tomorrow to keep your streak going!")
    : streak.atRisk
      ? 'You missed yesterday. Practice today to restore your streak. Missing today too will reset it.'
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
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg || ev.target.closest('.streak-dialog__close')) dlg.close();
    });
    dlg.addEventListener('close', () => {
      const tile = document.querySelector('.streak-open');
      if (tile) tile.focus();
    });
  }
  if (typeof dlg.showModal !== 'function') { window.location.href = 'dashboard.html'; return; }
  dlg.innerHTML = buildStreakDialogContent();
  if (!dlg.open) dlg.showModal();
}

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

function pickActiveMission(missions) {
  const reachable = missions.filter((m) => window.LWMissions.getMissionStatus(m, missions) !== 'locked');
  return reachable.find((m) => window.LWMissions.getMissionProgress(m) < 1) || null;
}

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
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

function countDue(learnedSigns) {
  return dueEntries(learnedSigns).length;
}

const REVIEW_ICON_TONES = ['review-row__icon--a', 'review-row__icon--b', 'review-row__icon--c'];

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
    const showBar = status === 'current';
    const rightSide = status === 'locked'
      ? '<span class="badge badge--locked">Locked</span>'
      : `<span class="chapter-timeline__pct">${items.pct}%</span>`;

    const lastDoneAt = status === 'done' ? chapterLastCompletedAt(chapterMissions) : null;
    const justCompleted = lastDoneAt && (Date.now() - new Date(lastDoneAt).getTime()) < RECENTLY_DONE_MS;
    const freshBadge = justCompleted
      ? '<span class="chapter-timeline__fresh"><span class="chapter-timeline__fresh-dot" aria-hidden="true"></span>Just completed</span>'
      : '';

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


function showProgressUnavailable(reason) {
  console.error('[progress-page.js] Missions unavailable, showing fallback UI. Reason:', reason);
  const FALLBACK_MSG = "We couldn't load your progress right now.";
  document.getElementById('progress-hero').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  const celebration = document.getElementById('progress-celebration');
  if (celebration) { celebration.hidden = true; celebration.innerHTML = ''; }
  document.getElementById('next-milestone').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('needs-review').innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
  document.getElementById('progress-chapters').innerHTML = `<p class="text-muted" style="padding: var(--space-4);">${FALLBACK_MSG}</p>`;
  const mastery = document.getElementById('sign-mastery');
  if (mastery) { mastery.hidden = true; mastery.innerHTML = ''; }
  const snapshot = document.getElementById('progress-snapshot');
  if (snapshot) snapshot.innerHTML = `<p class="text-muted">${FALLBACK_MSG}</p>`;
}

function renderProgressPage() {
  try {
    const missions = window.LWMissions.getAllMissions();
    const learnedSigns = collectLearnedSigns(missions);
    renderHero(missions, learnedSigns);
    renderCelebration(missions, learnedSigns);
    renderRecommendation(missions, learnedSigns);
    renderNeedsReview(learnedSigns);
    renderChapters(missions);
    renderSignMastery(missions);
    renderSnapshot(missions);
  } catch (e) {
    console.error('[progress-page.js] rendering failed partway through:', e);
    showProgressUnavailable('render threw: ' + (e && e.message));
  }
}

function watchLocalDayChange() {
  stopLocalDayChange?.();
  stopLocalDayChange = window.LWMissions?.onLocalDayChange?.(() => {
    renderProgressPage();
    const dlg = document.getElementById('streak-dialog');
    if (dlg && dlg.open) dlg.innerHTML = buildStreakDialogContent();
  }) || null;
}

function initPage() {
  if (!window.LWMissions) {
    showProgressUnavailable('window.LWMissions did not load');
    return;
  }

  const hero = document.getElementById('progress-hero');
  if (hero) hero.addEventListener('click', onHeroClick);

  renderProgressPage();
  window.LWMissions.whenMissionsSyncReady().then(renderProgressPage);
  startHeartsCountdown();

  watchLocalDayChange();
}

window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !window.LWMissions) return;
  renderProgressPage();
  startHeartsCountdown();
  watchLocalDayChange();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
