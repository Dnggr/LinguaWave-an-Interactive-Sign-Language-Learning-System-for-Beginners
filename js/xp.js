/**
 * js/xp.js — client side of the XP / level / badge / streak system (window.LWXP)
 * ─────────────────────────────────────────────────────────────────
 * THE BROWSER NEVER COMPUTES OR STORES XP. It only *reports* things that happened ("lesson item 4
 * done", "wall cleared") to Cloud Functions (functions/xp.js), which validate, award and store
 * them, and it *reads* the result back. Firestore rules forbid every client write to XP data, so
 * editing anything here in DevTools can't change a score — worst case it gets a rejected call.
 *
 * ES module (imports ./auth.js exactly like js/admin-firebase.js does) that also sets
 * window.LWXP, so the plain-script pages (lesson.js, missions.js, mastery-quiz.js) can call it
 * with `window.LWXP?.…` and keep working if this file failed to load (offline, blocked, etc).
 *
 * RELIABILITY: lesson claims go through a small queue persisted in localStorage
 * (`lw_xp_pending_v1:<uid>`). If a call fails (offline, cold start) it is retried later; the
 * server ledger is idempotent, so a retry can never double-pay.
 *
 * Needs on the page: <script src="../js/xp-config.js"> (display data) and js/auth.js (module).
 * Optional: css/xp.css for the level-up / badge pop-ups.
 * ─────────────────────────────────────────────────────────────────
 */
import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';
import { limit, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CFG = window.LW_XP_CONFIG || { MAX_LEVEL: 30, LEVEL_XP: [0], TIERS: [], BADGES: {} };
const fns = getFunctions(auth.app);
const call = (name) => httpsCallable(fns, name);
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const LAST_CLAIM_GAP = 2100;             // a hair over the server's MIN_CLAIM_GAP_MS

const listeners = new Set();
let latest = null;                        // last server summary seen this page
let lastClaimAt = 0;
let flushing = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => auth.currentUser && auth.currentUser.uid;

/* ── levels (display only; same table the server generated) ── */
function levelFromXp(xp) {
  let lv = 1;
  while (lv < CFG.MAX_LEVEL && xp >= CFG.LEVEL_XP[lv]) lv++;
  return lv;
}
function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= CFG.MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const lo = CFG.LEVEL_XP[level - 1], hi = CFG.LEVEL_XP[level];
  return { level, into: xp - lo, need: hi - lo, pct: Math.floor(((xp - lo) / (hi - lo)) * 100), maxed: false };
}
function tierOf(level) {
  let t = CFG.TIERS[0] || { name: '', icon: '', color: '#38bdf8' };
  for (const x of CFG.TIERS) if (level >= x.from) t = x;
  return t;
}
const badgeInfo = (id) => CFG.BADGES[id] || { id, name: id, icon: '🏅', desc: '' };

/* ── pending queue (localStorage) ──────────────────────────── */
const qKey = () => `lw_xp_pending_v1:${uid()}`;
function readQ() { try { return JSON.parse(localStorage.getItem(qKey()) || '[]'); } catch { return []; } }
function writeQ(q) { try { localStorage.setItem(qKey(), JSON.stringify(q.slice(-300))); } catch { /* private mode */ } }
function enqueue(job) {
  if (!uid()) return;
  const q = readQ();
  if (!q.some((j) => j.t === job.t && j.m === job.m && j.i === job.i)) { q.push(job); writeQ(q); }
}

async function runJob(job) {
  const data = job.t === 'item' ? { missionId: job.m, itemIndex: job.i, tz: TZ } : { missionId: job.m, tz: TZ };
  const gap = LAST_CLAIM_GAP - (Date.now() - lastClaimAt);
  if (gap > 0) await sleep(gap);
  lastClaimAt = Date.now();
  const res = (await call(job.t === 'item' ? 'claimLessonItem' : 'claimMissionComplete')(data)).data;
  return res;
}

/** Drain the queue in order. Resolves when it's empty or the network is failing. */
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      await whenReady();
      if (!uid()) return;
      for (;;) {
        const q = readQ();
        if (!q.length) return;
        const job = q[0];
        let res;
        try { res = await runJob(job); }
        catch (e) {
          if (e && (e.code === 'functions/invalid-argument' || e.code === 'functions/permission-denied')) { writeQ(readQ().slice(1)); continue; } // permanent: drop
          return;                                                   // transient: keep, retry next time
        }
        if (res && res.ok === false && res.reason === 'too_fast') { await sleep(Math.min(res.retryAfterMs || 2500, 15000)); continue; }
        writeQ(readQ().slice(1));                                   // paid, duplicate, or permanently refused
        if (res && res.ok) publish(res);
      }
    } finally { flushing = null; }
  })();
  return flushing;
}

/* ── events / state ────────────────────────────────────────── */
function publish(res) {
  latest = { ...(latest || {}), ...res };
  listeners.forEach((fn) => { try { fn(res, latest); } catch (e) { console.warn('[xp] listener failed', e); } });
  notify(res);
}
const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let readyP = null;
function whenReady() {
  if (readyP) return readyP;
  readyP = (async () => {
    try { await window.LWAuth?.whenAuthReady?.(); } catch { /* guest */ }
  })();
  return readyP;
}

/** The learner's own full state (private doc). null if none yet. */
async function getMyState() {
  await whenReady();
  if (!uid()) return null;
  try {
    const snap = await getDoc(doc(db, 'xpState', uid()));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('[xp] could not read state', e); return null; }
}

/* ── reporting lessons ─────────────────────────────────────── */
const REWARDING = { LESSON: 1, BOOSTER: 1, PRACTICE: 1 };
/** Call right after LWMissions.markItemComplete(). No-op for QUIZ/unknown items. */
function claimItem(mission, index) {
  try {
    const item = mission && mission.items && mission.items[index];
    if (!item || !REWARDING[item.kind]) return;
    enqueue({ t: 'item', m: mission.id, i: index });
    flush();
  } catch (e) { console.warn('[xp] claimItem failed', e); }
}
/** Call when the Mastery Quiz is passed (js/mastery-quiz.js). Queued AFTER any item claims. */
function claimMission(mission) {
  try {
    if (!mission || !mission.id) return;
    enqueue({ t: 'mission', m: mission.id });
    flush();
  } catch (e) { console.warn('[xp] claimMission failed', e); }
}

/* ── Wall Breaker ──────────────────────────────────────────── */
/** Returns { sessionId, xpEligible, learnedBricks, minLearned } or null (never throws). */
async function startGame(signs) {
  try {
    await whenReady();
    if (!uid()) return null;
    const r = (await call('startGameSession')({ signs, tz: TZ })).data;
    return r && r.ok ? r : null;
  } catch (e) { console.warn('[xp] startGame failed', e); return null; }
}
/** broken: [{ s: sign, t: msSinceStart, m: isMotion }]. Returns the server summary or null. */
async function finishGame(sessionId, broken, wrong) {
  try {
    if (!sessionId) return null;
    const r = (await call('finishGameSession')({ sessionId, broken, wrong, tz: TZ })).data;
    if (r && r.ok) publish(r);
    return r || null;
  } catch (e) { console.warn('[xp] finishGame failed', e); return null; }
}

/* ── one-time backfill of pre-launch progress ──────────────── */
async function backfillOnce() {
  try {
    await whenReady();
    for (let i = 0; i < 60 && !window.LWMissions; i++) await sleep(100);   // missions.js is a deferred classic script
    if (!uid() || !window.LWMissions) return;
    const flag = `lw_xp_backfilled_v1:${uid()}`;
    if (localStorage.getItem(flag)) return;
    try { await window.LWMissions.whenMissionsSyncReady?.(); } catch { /* local only */ }
    const st = await getMyState();
    if (st && st.backfilled) { localStorage.setItem(flag, '1'); return; }
    const ids = (window.LWMissions.getAllMissions?.() || []).flatMap((m) => m.items
      .map((it, i) => (window.LWMissions.isItemComplete(m, i, it) ? `${m.id}_${i}_${it.kind}_${it.signId || it.category || ''}` : null))
      .filter(Boolean));
    if (!ids.length) { localStorage.setItem(flag, '1'); return; }
    const r = (await call('backfillLegacyProgress')({ completedItemIds: ids })).data;
    if (r && (r.ok || r.duplicate || ['not_eligible', 'window_closed'].includes(r.reason))) localStorage.setItem(flag, '1');
    if (r && r.ok && r.xpGained > 0) publish(r);
  } catch (e) { console.warn('[xp] backfill skipped', e); }
}

/* ── leaderboards ──────────────────────────────────────────── */
const BOARDS = {
  xp:      { label: 'All-time XP', build: (c) => query(c, orderBy('xp', 'desc'), limit(50)) },
  weekly:  { label: 'This week',   build: (c, wk) => query(c, where('weekKey', '==', wk), orderBy('weeklyXp', 'desc'), limit(50)) },
  streak:  { label: 'Streaks',     build: (c) => query(c, orderBy('streak', 'desc'), limit(50)) },
  badges:  { label: 'Badges',      build: (c) => query(c, orderBy('badgeCount', 'desc'), limit(50)) },
};
function currentWeekKeyUtc() {                       // must match functions/xp-engine.js weekKeyUtc()
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
async function loadBoard(kind) {
  await whenReady();
  const b = BOARDS[kind] || BOARDS.xp;
  const snap = await getDocs(b.build(collection(db, 'publicProfiles'), currentWeekKeyUtc()));
  const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  // streak/badge boards: break ties by XP so the order is stable and meaningful
  const tie = { streak: 'streak', badges: 'badgeCount', weekly: 'weeklyXp', xp: 'xp' }[kind] || 'xp';
  rows.sort((a, c) => (c[tie] - a[tie]) || (c.xp - a.xp));
  return rows;
}
const setVisibility = async (visible) => (await call('setLeaderboardVisibility')({ visible })).data;

/* ── pop-ups (level up / new badges / +XP) ─────────────────── */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
let popTimer = null;
function notify(res) {
  try {
    if (!res || !res.ok) return;
    const gained = res.xpGained || 0;
    const ups = res.levelUps || [], badges = res.newBadges || [];
    if (!gained && !ups.length && !badges.length) return;
    if (!ups.length && !badges.length) {
      const toast = (window.LinguaWave && window.LinguaWave.showToast) || window.showToast;
      if (typeof toast === 'function') toast(`+${gained} XP`, 'success');
      return;
    }
    const top = ups.length ? ups[ups.length - 1] : null;
    const tier = tierOf(top || res.level || 1);
    const el = document.createElement('div');
    el.className = 'xp-pop'; el.setAttribute('role', 'status');
    el.innerHTML = `
      ${top ? `<div class="xp-pop__level" style="--tier:${esc(tier.color)}"><span>${esc(tier.icon)}</span> Level ${top}<small>${esc(tier.name)}</small></div>` : ''}
      ${gained ? `<div class="xp-pop__xp">+${gained} XP</div>` : ''}
      ${badges.length ? `<ul class="xp-pop__badges">${badges.map((id) => { const b = badgeInfo(id); return `<li><span aria-hidden="true">${esc(b.icon)}</span><b>${esc(b.name)}</b></li>`; }).join('')}</ul>` : ''}`;
    document.querySelectorAll('.xp-pop').forEach((n) => n.remove());
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('xp-pop--in'));
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { el.classList.remove('xp-pop--in'); setTimeout(() => el.remove(), 400); }, 4500);
  } catch (e) { console.warn('[xp] notify failed', e); }
}

window.addEventListener('online', () => flush());
whenReady().then(() => { flush(); backfillOnce(); });

window.LWXP = {
  claimItem, claimMission, startGame, finishGame, flush, backfillOnce,
  getMyState, loadBoard, BOARDS, setVisibility, onUpdate, notify,
  levelFromXp, levelProgress, tierOf, badgeInfo, config: CFG, timezone: TZ,
  getLatest: () => latest,
};
document.dispatchEvent(new CustomEvent('lwxp-ready'));
