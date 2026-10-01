/**
 * js/profile-page.js — pages/profile.html
 * ─────────────────────────────────────────────────────────────────
 * Four things on this page:
 *   1. Profile picture picker — the learner picks ONE of the pictures in
 *      js/avatars.js (no uploads). It opens from the round button on the big
 *      picture. Saving stores only the ID, via window.LWAuth.updateAvatar()
 *      (js/auth.js), which also updates their leaderboard row.
 *   2. Learning Activity   (#profile-activity)   — GitHub-style grid: one box
 *      per day for the last year, month names across the top, weekday names
 *      down the side, darker box = more activity that day.
 *   3. Your Highlights     (#profile-highlights) — personal bests.
 *   4. Recent Activity     (#profile-recent)     — per-day list ("+N signs
 *      learned"). Same code js/progress-page.js's renderActivity() had.
 * (2), (3) and (4) MOVED here from the Progress page. Same data source
 * (window.LWMissions only), nothing fabricated. The helpers
 * are re-derived per file on purpose — this repo's convention (see the note
 * above tallyItems() in js/progress-page.js).
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const HEATMAP_WEEKS = 53;            // a full year of week columns, like GitHub
const RECENT_ACTIVITY_MAX_DAYS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function todayKey() {
  return localDateKey(new Date().toISOString());
}

/* Shade 0..4 for a day with n completed items (lessons, boosters, practice, quizzes). */
function activityLevel(n) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

/* One box per day for the last year. Columns are weeks (Sunday first), rows are
 * Sun..Sat. Every month is named above the column where it starts and every
 * weekday is named down the side. Boxes after today stay empty placeholders. */
function renderConsistency(missions) {
  const el = document.getElementById('profile-activity');
  const countByDay = new Map();
  collectAllCompletions(missions).forEach((c) => {
    const k = localDateKey(c.completedAt);
    countByDay.set(k, (countByDay.get(k) || 0) + 1);
  });
  const streak = window.LWMissions.getStreakSummary();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - now.getDay() - (HEATMAP_WEEKS - 1) * 7); // the Sunday that starts the oldest column

  let total = 0;
  const cells = [];
  let marks = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    let monthStartsHere = null;
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date.getDate() === 1) monthStartsHere = date.getMonth();
      const pos = `grid-column:${w + 2};grid-row:${d + 2}`;
      if (date > now) {
        cells.push(`<span class="gh-cell gh-cell--future" style="${pos}"></span>`);
        continue;
      }
      const n = countByDay.get(localDateKey(date.toISOString())) || 0;
      total += n;
      const when = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const what = n === 0 ? 'No activity' : `${n} ${n === 1 ? 'activity' : 'activities'}`;
      const isToday = date.getTime() === now.getTime();
      cells.push(`<span class="gh-cell gh-cell--l${activityLevel(n)}${isToday ? ' gh-cell--today' : ''}" style="${pos}" title="${what} on ${when}"></span>`);
    }
    if (w === 0) marks.push({ w, m: monthStartsHere !== null ? monthStartsHere : start.getMonth() });
    else if (monthStartsHere !== null) marks.push({ w, m: monthStartsHere });
  }
  // Drop a label that would sit on top of the next one (only the first can).
  marks = marks.filter((mk, i) => i === marks.length - 1 || marks[i + 1].w - mk.w >= 3);

  const months = marks.map((mk) => `<span class="gh-month" style="grid-column:${mk.w + 2}">${MONTH_NAMES[mk.m]}</span>`).join('');
  const days = WEEKDAY_NAMES.map((name, d) => `<span class="gh-day" style="grid-row:${d + 2}">${name}</span>`).join('');
  const legend = [0, 1, 2, 3, 4].map((l) => `<span class="gh-cell gh-cell--l${l}"></span>`).join('');

  el.innerHTML = `
    <div class="gh-head">
      <h2>Learning Activity</h2>
      <p class="gh-head__total">${total} ${total === 1 ? 'activity' : 'activities'} in the last year</p>
    </div>
    <div class="gh-scroll">
      <div class="gh-heatmap" role="img" aria-label="${total} activities in the last year. Each box is one day; darker boxes mean more activity.">
        ${months}${days}${cells.join('')}
      </div>
    </div>
    <div class="gh-foot">
      <p class="gh-foot__streak">${streak.currentStreak} day${streak.currentStreak === 1 ? '' : 's'} current streak</p>
      <div class="gh-legend" aria-hidden="true"><span>Less</span>${legend}<span>More</span></div>
    </div>
  `;
  // Start scrolled to today on narrow screens.
  const scroller = el.querySelector('.gh-scroll');
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}

/* Recent Activity — moved from js/progress-page.js (renderActivity). Groups
 * every completed item by the real calendar day it was completed on:
 * "+N signs learned" (LESSON items) and "Completed <mission>" (a mission whose
 * LAST item finished that day). A day with only booster/practice/quiz work
 * shows "Practiced existing signs" so real activity never renders as empty. */
function renderRecentActivity(missions) {
  const el = document.getElementById('profile-recent');
  if (!el) return;
  const completions = collectAllCompletions(missions);

  if (completions.length === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Recent Activity</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">
        Your practice history will show up here once you complete your first lesson.
      </p>
    `;
    return;
  }

  const byDay = new Map(); // dateKey -> { signs, missionTitles: Set }
  const dayOf = (iso) => {
    const k = localDateKey(iso);
    if (!byDay.has(k)) byDay.set(k, { signs: 0, missionTitles: new Set() });
    return byDay.get(k);
  };
  completions.forEach((c) => {
    const bucket = dayOf(c.completedAt);
    if (c.item.kind === 'LESSON') bucket.signs++;
  });

  // Mission-completed lines attach to the day the mission's LAST item finished.
  missions.forEach((m) => {
    if (window.LWMissions.getMissionProgress(m) < 1 || !m.items.length) return;
    let latest = null;
    m.items.forEach((item, i) => {
      const at = window.LWMissions.getItemCompletedAt(m, i, item);
      if (at && (!latest || new Date(at) > new Date(latest))) latest = at;
    });
    if (latest) dayOf(latest).missionTitles.add(m.title);
  });

  const today = todayKey();
  const yesterday = localDateKey(new Date(Date.now() - MS_PER_DAY).toISOString());
  const dayLabel = (key) => {
    if (key === today) return 'Today';
    if (key === yesterday) return 'Yesterday';
    const [y, mo, d] = key.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const days = Array.from(byDay.keys()).sort().reverse().slice(0, RECENT_ACTIVITY_MAX_DAYS);
  const rowsHtml = days.map((key) => {
    const b = byDay.get(key);
    const lines = [];
    b.missionTitles.forEach((title) => lines.push(`Completed “${escapeHtml(title)}”`));
    if (b.signs > 0) lines.push(`+${b.signs} sign${b.signs === 1 ? '' : 's'} learned`);
    if (!lines.length) lines.push('Practiced existing signs');
    return `
      <div class="activity-day">
        <p class="activity-day__label">${dayLabel(key)}</p>
        <ul class="activity-day__list">
          ${lines.map((l) => `<li>✓ ${l}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  el.innerHTML = `<h2 class="mb-3">Recent Activity</h2><div class="activity-list">${rowsHtml}</div>`;
}

const HIGHLIGHT_ICON_SVG = (inner) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
const HIGHLIGHT_ICONS = {
  flame: HIGHLIGHT_ICON_SVG('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  hand: HIGHLIGHT_ICON_SVG('<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
  check: HIGHLIGHT_ICON_SVG('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  award: HIGHLIGHT_ICON_SVG('<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>'),
};

function renderHighlights(missions, learnedSigns) {
  const el = document.getElementById('profile-highlights');
  const streak = window.LWMissions.getStreakSummary();
  const missionsCompleted = missions.filter((m) => window.LWMissions.getMissionProgress(m) >= 1).length;
  const signs = tallySigns(missions);

  let mostPracticed = null;
  missions.forEach((m) => {
    const done = tallyItems([m]).done;
    if (done > 0 && (!mostPracticed || done > mostPracticed.done)) mostPracticed = { title: m.title, done };
  });

  if (learnedSigns.length === 0 && streak.longestStreak === 0) {
    el.innerHTML = `
      <h2 class="mb-2">Your Highlights</h2>
      <p class="text-muted" style="font-size: var(--fs-sm);">Keep learning — your personal bests will show up here.</p>
    `;
    return;
  }

  const rows = [
    { icon: 'flame', tone: 'orange', label: 'Longest streak', value: `${streak.longestStreak} day${streak.longestStreak === 1 ? '' : 's'}` },
    mostPracticed ? { icon: 'hand', tone: 'accent', label: 'Most practiced', value: mostPracticed.title } : null,
    { icon: 'check', tone: 'success', label: 'Missions completed', value: String(missionsCompleted) },
    { icon: 'award', tone: 'violet', label: 'Signs mastered', value: String(signs.mastered) },
  ].filter(Boolean);

  el.innerHTML = `
    <h2 class="mb-3">Your Highlights</h2>
    <ul class="highlights-list">
      ${rows.map((r) => `
        <li class="highlights-row">
          <span class="highlights-row__icon highlights-row__icon--${r.tone}" aria-hidden="true">${HIGHLIGHT_ICONS[r.icon]}</span>
          <span class="highlights-row__body">
            <span class="highlights-row__label">${escapeHtml(r.label)}</span>
            <span class="highlights-row__value">${escapeHtml(r.value)}</span>
          </span>
        </li>
      `).join('')}
    </ul>
  `;
}

/* ── PROFILE PICTURE ──────────────────────────────────────────────── */
let savedAvatarId = null;      // what is stored on the account
let selectedAvatarId = null;   // what is currently highlighted in the picker

function toast(msg, type) {
  if (window.LinguaWave && typeof window.LinguaWave.showToast === 'function') window.LinguaWave.showToast(msg, type);
}

function currentName() {
  const u = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
  return (u && u.name) || 'Learner';
}

function paintHeaderAvatar() {
  const slot = document.getElementById('profile-avatar');
  if (slot) slot.innerHTML = window.LWAvatars.markup(selectedAvatarId, { size: 'hero', name: currentName() });
}

function syncSaveButton() {
  const btn = document.getElementById('btn-save-avatar');
  if (btn) btn.disabled = !selectedAvatarId || selectedAvatarId === savedAvatarId;
}

function renderPicker() {
  const el = document.getElementById('avatar-picker');
  if (!el || !window.LWAvatars) return;
  el.innerHTML = window.LWAvatars.LIST.map((a) => `
    <label class="avatar-option">
      <input type="radio" name="avatar" value="${escapeHtml(a.id)}" aria-label="${escapeHtml(a.label)}"${a.id === selectedAvatarId ? ' checked' : ''}>
      ${window.LWAvatars.markup(a.id)}
    </label>`).join('');
}

function setPickerOpen(open) {
  const panel = document.getElementById('avatar-panel');
  const toggle = document.getElementById('btn-change-avatar');
  if (!panel || !toggle) return;
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (!open && selectedAvatarId !== savedAvatarId) {
    // Closing without saving puts the picture back to what is saved.
    selectedAvatarId = savedAvatarId;
    renderPicker(); paintHeaderAvatar(); syncSaveButton();
  }
}

async function saveAvatar() {
  const btn = document.getElementById('btn-save-avatar');
  if (!selectedAvatarId || selectedAvatarId === savedAvatarId) return;
  if (!window.LWAuth || typeof window.LWAuth.updateAvatar !== 'function') {
    toast('Saving your picture is not available right now.', 'error');
    return;
  }
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await window.LWAuth.updateAvatar(selectedAvatarId);
    savedAvatarId = selectedAvatarId;
    toast('Profile picture updated.', 'success');
    setPickerOpen(false);
  } catch (e) {
    console.warn('[profile-page.js] could not save picture:', e);
    toast('Could not save your picture. Please try again.', 'error');
  } finally {
    btn.textContent = 'Save picture';
    syncSaveButton();
  }
}

async function initAvatar() {
  if (!window.LWAvatars) return;
  const cached = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
  savedAvatarId = (cached && window.LWAvatars.find(cached.avatar)) ? cached.avatar : null;
  selectedAvatarId = savedAvatarId;
  renderPicker(); paintHeaderAvatar(); syncSaveButton();

  document.getElementById('avatar-picker').addEventListener('change', (e) => {
    if (!e.target || e.target.name !== 'avatar') return;
    selectedAvatarId = e.target.value;
    paintHeaderAvatar(); syncSaveButton();
  });
  document.getElementById('btn-save-avatar').addEventListener('click', saveAvatar);
  document.getElementById('btn-change-avatar').addEventListener('click', () => {
    const open = document.getElementById('avatar-panel').hidden;
    setPickerOpen(open);
  });
  document.getElementById('btn-cancel-avatar').addEventListener('click', () => setPickerOpen(false));

  // The session cache can be stale (picture changed on another device), so
  // confirm against the account once auth is ready — unless the learner has
  // already started choosing something else.
  try {
    await window.LWAuth.whenAuthReady();
    const stored = await window.LWAuth.getAvatar();
    const untouched = selectedAvatarId === savedAvatarId;
    savedAvatarId = stored;
    if (untouched) { selectedAvatarId = stored; renderPicker(); }
    paintHeaderAvatar(); syncSaveButton();
  } catch (e) {
    console.warn('[profile-page.js] could not read saved picture:', e);
  }
}

/* ── LEARNING ACTIVITY + HIGHLIGHTS ───────────────────────────────── */
function renderStats() {
  try {
    const missions = window.LWMissions.getAllMissions();
    renderConsistency(missions);
    renderHighlights(missions, collectLearnedSigns(missions));
    renderRecentActivity(missions);
  } catch (e) {
    console.error('[profile-page.js] rendering failed:', e);
    showStatsUnavailable();
  }
}

function showStatsUnavailable() {
  ['profile-activity', 'profile-highlights', 'profile-recent'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<p class="text-muted">We couldn\'t load this right now.</p>';
  });
}

function initPage() {
  initAvatar();
  if (!window.LWMissions) { showStatsUnavailable(); return; }
  // Same approach as the Progress page: paint from local state straight
  // away, then re-render once cross-device progress has synced.
  renderStats();
  window.LWMissions.whenMissionsSyncReady().then(renderStats);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}