/**
 * js/dashboard.js — Renderer for pages/dashboard.html
 * ─────────────────────────────────────────────────────────────────
 * REBUILD (blue-teal mockup alignment pass) — replaces the old
 * "Continue Your Mission" hero-row / journey-rail layout with the
 * mockup's four-block Dashboard: greeting header, a "Today's
 * Mission" banner, a "Your Progress" ring card, a "Learning Path"
 * icon-tile grid, and a "Recommended for You" quick-link grid.
 *
 * Same data-source discipline as before: reads only
 * window.LWMissions (js/missions.js). No hardcoded names/
 * percentages — every number here is computed from the real
 * Missions progress store (`lw_missions_progress_v1`), same one
 * pages/learn.html and pages/progress.html already read. The old
 * markup this file used to fill (#continue-card / #summary-card /
 * #journey-rail) is gone from pages/dashboard.html — see that
 * file's header comment for the new element ids this now targets.
 *
 * "Recommended for You" is the one section with copy that isn't a
 * live number (icons/labels/blurbs are static, like the homepage's
 * feature cards) — but every link it produces is a real, working
 * destination built from the learner's actual current mission, not
 * a placeholder href.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function pickCurrentMission(missions) {
  // "Today's Mission" / "Continue Your Mission" = first not-yet-complete,
  // UNLOCKED mission (chapter gating means the first incomplete mission
  // in list order could theoretically sit in a not-yet-unlocked chapter;
  // never point at a mission the learner can't open yet).
  const reachable = missions.filter((m) => window.LWMissions.getMissionStatus(m, missions) !== 'locked');
  return reachable.find((m) => window.LWMissions.getMissionProgress(m) < 1)
    || reachable[reachable.length - 1]
    || missions[0]
    || null;
}

function currentSignInProgress(mission) {
  if (!mission) return null;
  for (const item of mission.items) {
    if (!item.signId) continue;
    if (window.LWMissions.getLessonProgress(mission, item.signId) < 1) return item.signId;
  }
  return null;
}

// Item-level roll-up (same shape as js/progress-page.js's tallyItems())
// so "Overall Progress" here and on pages/progress.html always agree —
// both are counting the exact same underlying items.
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

// Same done/current/locked/available -> label/badge mapping used on
// pages/learn.html and pages/mission-overview.html — kept as its own
// small copy per this repo's established "re-derive small pieces of
// logic per file" convention (see js/mission-overview.js's own note).
function statusMeta(status) {
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

/* ── Greeting ──────────────────────────────────────────────────────
 * Real local time, not a fabricated "Good morning" shown at 9pm —
 * js/main.js already hydrates [data-user-name] from the real
 * session, this just fills the time-of-day word beside it. */
function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  return 'Good Evening,';
}

function renderGreeting() {
  const el = document.getElementById('dash-greeting-word');
  if (el) el.textContent = greetingWord();
}

/* ── Today's Mission banner ──────────────────────────────────────── */
function renderMissionBanner(missions) {
  const el = document.getElementById('mission-banner');
  const mission = pickCurrentMission(missions);

  if (!mission) {
    el.innerHTML = `<p class="text-muted">No live missions found — is <code>js/data.js</code> loaded?</p>`;
    return;
  }

  const pct = Math.round(window.LWMissions.getMissionProgress(mission) * 100);
  const started = pct > 0;

  el.innerHTML = `
    <div class="mission-banner__text">
      <p class="mission-banner__eyebrow">${started ? "Continue your mission" : "Today's mission"}</p>
      <h2 class="mission-banner__title">${escapeHtml(mission.title)}</h2>
      <p class="mission-banner__desc">${escapeHtml(mission.goal)}</p>
      <a href="mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--primary btn--lg mission-banner__cta">
        ${window.LWIcons.markup('continue_mission', { size: 'sm' })}<span class="lw-icon-label">${started ? 'Continue Mission' : 'Start Mission'}</span>
      </a>
    </div>
    <div class="mission-banner__art" aria-hidden="true">
      <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="160" cy="160" r="150" fill="rgba(255,255,255,.14)" />
        <path d="M110 220c-6-40-14-70-14-100 0-14 10-24 22-24s20 10 20 24v50" stroke="#fff" stroke-opacity=".9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M138 170V90c0-13 9-23 21-23s21 10 21 23v80" stroke="#fff" stroke-opacity=".9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M180 170V100c0-13 9-23 21-23s21 10 21 23v90" stroke="#fff" stroke-opacity=".9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M222 190v-60c0-12 8-21 19-21s19 9 19 21v70c0 44-30 80-74 80h-14c-38 0-58-20-70-50l-16-40c-5-13 1-24 12-28 9-3 18 1 23 12l14 28" stroke="#fff" stroke-opacity=".9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255,255,255,.12)"/>
        <path d="M90 250c22 20 46 30 72 30" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".5"/>
      </svg>
    </div>
  `;
}

/* ── Your Progress card (ring + level + 3 real stats) ─────────────
 * Ring % is the SAME "overall items done / items total" formula
 * pages/progress.html's ring uses — the two numbers agree by
 * construction, not by coincidence. The "Chapter N" line beside it
 * is whichever chapter getCurrentChapterId() says the learner is
 * actively working through right now. */
function renderProgressCard(missions) {
  const el = document.getElementById('progress-card');
  const items = tallyItems(missions);
  const chapters = window.LWMissions.getCategoryGroups();
  const currentChId = window.LWMissions.getCurrentChapterId(missions);
  const chapter = chapters.find((c) => c.id === currentChId) || null;
  const missionsCompleted = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
  const streak = window.LWMissions.getStreakSummary();
  const hearts = window.LWMissions.getHeartsState();

  el.innerHTML = `
    <div class="progress-card__top">
      <div class="progress-ring" id="dash-progress-ring">
        <span class="progress-ring__pct">${items.pct}%</span>
      </div>
      <div class="progress-card__level">
        <span class="progress-card__level-eyebrow">${chapter ? `Chapter ${chapter.order}` : 'Your Progress'}</span>
        <span class="progress-card__level-title">${chapter ? escapeHtml(chapter.title) : 'Overall Progress'}</span>
      </div>
    </div>
    <div class="progress-card__stats">
      <div class="progress-card__stat">
        <span class="progress-card__stat-value">${missionsCompleted}/${missions.length}</span>
        <span class="progress-card__stat-label">Missions Complete</span>
      </div>
      <div class="progress-card__stat">
        <span class="progress-card__stat-value">${streak.currentStreak}d</span>
        <span class="progress-card__stat-label">Day Streak</span>
      </div>
      <div class="progress-card__stat">
        <span class="progress-card__stat-value">${hearts.hearts}/${hearts.maxHearts}</span>
        <span class="progress-card__stat-label">Mastery Hearts</span>
      </div>
    </div>
  `;
  const ring = document.getElementById('dash-progress-ring');
  if (ring) ring.style.setProperty('--pct', items.pct);
}

/* ── Learning Path tile grid ────────────────────────────────────────
 * Starts at the learner's CURRENT chapter (getCurrentChapterId) and
 * walks forward through the 12 chapters in order, collecting real
 * missions until it has enough tiles for a grid — never a fixed
 * "first N missions overall" slice, so the grid always centers on
 * wherever the learner actually is. "View All" links to the full
 * pages/learn.html trail for everything this grid doesn't show. */
const LEARNING_PATH_TILE_COUNT = 6;

function collectLearningPathMissions(missions) {
  const chapters = window.LWMissions.getCategoryGroups();
  const currentChId = window.LWMissions.getCurrentChapterId(missions);
  const startIdx = Math.max(0, chapters.findIndex((c) => c.id === currentChId));
  const ordered = chapters.slice(startIdx).concat(chapters.slice(0, startIdx));

  const out = [];
  for (const ch of ordered) {
    const inChapter = missions.filter((m) => m.categoryGroup === ch.id);
    for (const m of inChapter) {
      out.push(m);
      if (out.length >= LEARNING_PATH_TILE_COUNT) return out;
    }
  }
  return out;
}

function renderLearningPath(missions) {
  const el = document.getElementById('learning-path-grid');
  const picked = collectLearningPathMissions(missions);

  if (!picked.length) {
    el.innerHTML = `<p class="text-muted">No live missions found.</p>`;
    return;
  }

  el.innerHTML = picked.map((m) => {
    const status = window.LWMissions.getMissionStatus(m, missions);
    const meta = statusMeta(status);
    const missionItems = tallyItems([m]);
    const locked = status === 'locked';
    const tag = locked ? 'div' : 'a';
    const hrefAttr = locked ? '' : `href="mission-overview.html?mission=${encodeURIComponent(m.category)}"`;
    return `
      <${tag} class="path-tile path-tile--${status}" ${hrefAttr}>
        <span class="path-tile__icon">${window.LWIcons.markup(m.category, { size: 'md' })}</span>
        <span class="path-tile__title">${escapeHtml(m.title)}</span>
        <span class="path-tile__count">${missionItems.done} / ${missionItems.total}</span>
        <span class="badge ${meta.badge} path-tile__badge">${meta.label}</span>
      </${tag}>
    `;
  }).join('');
}

/* ── Recommended for You ────────────────────────────────────────────
 * Four quick-link cards. Copy/icons are static (same "feature card"
 * treatment index.html's own why-row already uses) but every href
 * is built from the learner's real current mission — never a bare
 * placeholder "#" link. */
function renderRecommended(missions) {
  const el = document.getElementById('recommended-grid');
  const mission = pickCurrentMission(missions);
  const signId = currentSignInProgress(mission);

  const practiceHref = mission
    ? `camera-practice.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}${signId ? `&sign=${encodeURIComponent(signId)}` : ''}`
    : 'camera-practice.html';
  const quizHref = mission ? `mastery-quiz.html?mission=${encodeURIComponent(mission.category)}` : 'mastery-quiz.html';
  const missionHref = mission ? `mission-overview.html?mission=${encodeURIComponent(mission.category)}` : 'learn.html';

  // CHANGED (light-mode UX pass) — all four CTAs are btn--secondary now. They
  // were two teal-outline + two solid-blue with no rule behind the split, and
  // the solid blue competed with the Continue Mission banner, which is the one
  // thing this page wants the learner to click first.
  const cards = [
    {
      icon: 'camera', tone: 'teal',
      title: 'Practice Check',
      desc: 'Record your sign and get instant feedback.',
      cta: 'Start Practice', href: practiceHref, btn: 'btn--secondary',
    },
    {
      icon: 'asking_questions', tone: 'violet',
      title: 'Quick Quiz',
      desc: 'Test your knowledge in a short mastery quiz.',
      cta: 'Take Quiz', href: quizHref, btn: 'btn--secondary',
    },
    {
      icon: 'celebration', tone: 'orange',
      title: 'Daily Challenge',
      desc: mission ? `Keep your streak alive with &ldquo;${escapeHtml(mission.title)}.&rdquo;` : 'Keep your streak alive.',
      cta: 'Start Challenge', href: missionHref, btn: 'btn--secondary',
    },
    {
      icon: 'phrasebook', tone: 'success',
      title: 'Explore Dictionary',
      desc: 'Browse every chapter and sign at your own pace.',
      cta: 'Open Dictionary', href: 'learn.html', btn: 'btn--secondary',
    },
  ];

  el.innerHTML = cards.map((c) => `
    <div class="card rec-card">
      <span class="rec-card__icon rec-card__icon--${c.tone}">${window.LWIcons.markup(c.icon, { size: 'md' })}</span>
      <p class="rec-card__title">${c.title}</p>
      <p class="rec-card__desc">${c.desc}</p>
      <a href="${c.href}" class="btn ${c.btn} btn--sm rec-card__cta">${c.cta}</a>
    </div>
  `).join('');
}

function renderDashboard() {
  const missions = window.LWMissions.getAllMissions();
  renderGreeting();
  renderMissionBanner(missions);
  renderProgressCard(missions);
  renderLearningPath(missions);
  renderRecommended(missions);
}

function initPage() {
  if (!window.LWMissions) {
    document.getElementById('mission-banner').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  // Render immediately from local state — getAllMissions() reads
  // straight off localStorage, so first paint never waits on a
  // network round-trip. Reconcile with Firestore in the background
  // and re-render only if that reconcile changes anything (e.g. a
  // completed item merged in from another device).
  renderDashboard();
  window.LWMissions.whenMissionsSyncReady().then(renderDashboard);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}