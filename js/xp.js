/**
 * js/xp.js — XP / level / badge / streak system, CLIENT-SIDE VERSION (works on the free Spark plan)
 * ─────────────────────────────────────────────────────────────────
 * No Cloud Functions needed. The browser computes XP with the same rules the server version used
 * and saves the result to Firestore:
 *     xpState/{uid}        private (owner read/write)  -> full state, ledger, badges
 *     publicProfiles/{uid} leaderboard row             -> small public copy (written together, one transaction)
 *
 * HONEST LIMIT: because the browser writes the score, a technical user can edit their own XP in
 * DevTools. firestore.rules only caps the damage (own docs only, field whitelist, XP never goes down,
 * max 20,000). Fine for a capstone demo; NOT cheat-proof. To get real anti-cheat later: upgrade to
 * Blaze, deploy functions/xp.js, and restore the server version of this file (see XP_SYSTEM.md).
 *
 * Same public API as before (window.LWXP), so lesson.js / missions.js / mastery-quiz.js / game.js /
 * leaderboard.js / xp-ui.js need NO changes.
 *
 * RELIABILITY: lesson claims go through a small queue persisted in localStorage
 * (`lw_xp_pending_v1:<uid>`). If a save fails (offline, rules not published) it stays queued and is
 * retried; the ledger in xpState makes a retry impossible to double-pay.
 *
 * Needs on the page: <script src="../js/xp-config.js"> (display data) and js/auth.js (module).
 * ─────────────────────────────────────────────────────────────────
 */
import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { limit, where, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CFG = window.LW_XP_CONFIG || { MAX_LEVEL: 30, LEVEL_XP: [0], TIERS: [], BADGES: {}, GAME: { MIN_LEARNED_BRICKS: 6, DAILY_XP_CAP: 90 } };
const ADMIN_EMAIL = 'linguawave.project@gmail.com';

/* ── economy (copy of functions/xp-config.js — keep in sync if you change numbers) ── */
const ECON = {
  LESSON_ITEM_XP: { LESSON: 6, BOOSTER: 3, PRACTICE: 5 },
  MISSION_BONUS: { base: 25, perSign: 3, max: 80 },
  MISSION_SKIP_FACTOR: 0.4,
  MISSION_FULL_LESSON_RATIO: 0.8,
  LESSON_DAILY_SOFT_CAP: 800,
  LESSON_OVER_CAP_FACTOR: 0.5,
  BACKFILL_FACTOR: 0.5,
  BACKFILL_MAX_XP: 1500,
  TZ_CHANGE_COOLDOWN_DAYS: 14,
  GAME: {
    BRICK_XP: { static: 1, motion: 2 }, CLEAR_BONUS: 3, FLAWLESS_BONUS: 3,
    ACC_TIERS: [{ min: 0.85, mult: 1 }, { min: 0.60, mult: 0.8 }, { min: 0, mult: 0.5 }],
    WALL_DECAY: [{ upTo: 3, mult: 1 }, { upTo: 5, mult: 0.5 }, { upTo: 7, mult: 0.25 }, { upTo: 999, mult: 0 }],
    DAILY_XP_CAP: 90, MAX_BRICKS: 21, MIN_GAP_MS: { static: 400, motion: 3000 }, CLOCK_SLACK_MS: 3000,
    SESSION_TTL_MS: 30 * 60 * 1000, SPEED_BADGE_MS_PER_BRICK: 6000, VETERAN_WALLS: 5,
  },
};
const STREAK_BADGE_DAYS = [3, 7, 14, 30, 60, 100];
const MISSION_COUNT_BADGES = [[1, 'missions_1'], [10, 'missions_10'], [25, 'missions_25']];

const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const listeners = new Set();
let latest = null;
let flushing = null;
let lastError = null;
let warnedOnce = false;
let nameCache = null;           // { uid, name, deletion }
let session = null;             // current Wall Breaker session (memory only)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => auth.currentUser && auth.currentUser.uid;

/* ══════════════ pure rules (ported from functions/xp-engine.js) ══════════════ */
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

/* Lucide icon ids (registered in js/icons.js) for tiers and badges. The emoji in CFG stay as the data of record
 * (dashboard chips etc. still read them); the Leaderboard, Wall Breaker and the level/badge pop-up draw these instead. */
const TIER_ICON = { Ripple: 'droplet', Current: 'waves', Tide: 'shell', Swell: 'sailboat', Crest: 'anchor', Tsunami: 'crown' };
const SPECIAL_BADGE_ICON = { game_first: 'brick_wall', game_flawless: 'gem', game_speed: 'zap', game_veteran: 'hard_hat',
  missions_1: 'graduation_cap', missions_10: 'library', missions_25: 'award' };
function tierIconId(levelOrTier) {
  const t = typeof levelOrTier === 'object' && levelOrTier ? levelOrTier : tierOf(levelOrTier || 1);
  return TIER_ICON[t.name] || 'droplet';
}
function badgeIconId(id) {
  if (SPECIAL_BADGE_ICON[id]) return SPECIAL_BADGE_ICON[id];
  if (/^lesson_L\d+$/.test(id)) return 'book_open';
  if (/^game_L\d+$/.test(id)) return 'brick_wall';
  if (/^streak_\d+$/.test(id)) return 'flame';
  return 'medal';
}
/** Inline <svg> markup for an icon id; '' if js/icons.js is not on the page (the text beside it still reads fine). */
const iconSvg = (iconId, opts) => (window.LWIcons ? window.LWIcons.markup(iconId, opts) : '');

function isValidTz(tz) {
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
function dayKey(ms, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
function shiftDayKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
function tzOffsetMs(ms, tz) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
function startOfDayMs(key, tz) {
  const [y, m, d] = key.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess, tz), tz);
}
function weekKeyUtc(ms) {                       // must match the key leaderboards query with
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
function applyStreak(s, today) {
  const cur = s || { current: 0, longest: 0, lastDay: null };
  if (cur.lastDay === today) return { ...cur };
  const next = cur.lastDay === shiftDayKey(today, -1) ? cur.current + 1 : 1;
  return { current: next, longest: Math.max(cur.longest || 0, next), lastDay: today };
}
function effectiveStreak(s, today) {
  if (!s || !s.lastDay) return 0;
  return (s.lastDay === today || s.lastDay === shiftDayKey(today, -1)) ? s.current : 0;
}
function lessonItemXp(kind, bonusXP) {
  const base = ECON.LESSON_ITEM_XP[kind];
  if (!base) return 0;
  return base + (kind === 'PRACTICE' && bonusXP ? bonusXP : 0);
}
function missionBonus(signCount) { const m = ECON.MISSION_BONUS; return Math.min(m.max, m.base + m.perSign * signCount); }
function applyLessonSoftCap(rawXp, lessonXpToday) {
  const room = Math.max(0, ECON.LESSON_DAILY_SOFT_CAP - lessonXpToday);
  if (rawXp <= room) return rawXp;
  return room + Math.floor((rawXp - room) * ECON.LESSON_OVER_CAP_FACTOR);
}
function wallDecayMult(n) { for (const t of ECON.GAME.WALL_DECAY) if (n < t.upTo) return t.mult; return 0; }
function gameWallXp({ bricks, wrong, wallsToday, gameXpToday }) {
  const G = ECON.GAME, minLearned = (CFG.GAME && CFG.GAME.MIN_LEARNED_BRICKS) || 6;
  const learnedBricks = bricks.filter((b) => b.learned);
  if (learnedBricks.length < minLearned) return { eligible: false, xp: 0, raw: 0, reason: 'not_enough_learned' };
  const correct = bricks.length, acc = correct / Math.max(1, correct + wrong);
  const accMult = (G.ACC_TIERS.find((t) => acc >= t.min) || G.ACC_TIERS[G.ACC_TIERS.length - 1]).mult;
  const base = learnedBricks.reduce((s, b) => s + (b.motion ? G.BRICK_XP.motion : G.BRICK_XP.static), 0);
  const flawless = wrong === 0;
  const raw = base * accMult + G.CLEAR_BONUS + (flawless ? G.FLAWLESS_BONUS : 0);
  const decay = wallDecayMult(wallsToday), room = Math.max(0, G.DAILY_XP_CAP - gameXpToday);
  const xp = Math.min(Math.round(raw * decay), room);
  return { eligible: true, xp, raw: Math.round(raw), accuracy: acc, flawless, decay,
    capped: xp < Math.round(raw * decay) || (decay > 0 && room === 0), reason: xp === 0 ? (decay === 0 ? 'diminished' : 'daily_cap') : null };
}
function validateGameTiming({ sessionSigns, broken, elapsedMs }) {
  const G = ECON.GAME;
  if (!Array.isArray(broken) || broken.length !== sessionSigns.length) return 'incomplete_wall';
  const seen = new Set(), want = new Set(sessionSigns);
  let prev = 0, minTotal = 0;
  for (const b of broken) {
    if (!b || typeof b.s !== 'string' || !want.has(b.s) || seen.has(b.s)) return 'bad_bricks';
    seen.add(b.s);
    if (typeof b.t !== 'number' || !isFinite(b.t) || b.t < prev) return 'bad_timing';
    const gap = G.MIN_GAP_MS[b.m ? 'motion' : 'static'];
    if (b.t - prev < gap) return 'too_fast';
    minTotal += gap; prev = b.t;
  }
  if (prev > elapsedMs + G.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (elapsedMs < minTotal) return 'too_fast';
  return null;
}
function nextLevelBadge(group, level, owned) {
  for (let n = 1; n <= Math.min(level, CFG.MAX_LEVEL); n++) { const id = `${group}_L${n}`; if (!owned[id]) return id; }
  return null;
}
const streakBadgesFor = (cur) => STREAK_BADGE_DAYS.filter((d) => cur >= d).map((d) => `streak_${d}`);
const missionCountBadgesFor = (n) => MISSION_COUNT_BADGES.filter(([c]) => n >= c).map(([, id]) => id);

/* ══════════════ state ══════════════ */
function newState(now) {
  return {
    v: 1, xp: 0, level: 1, weeklyXp: 0, weekKey: weekKeyUtc(now),
    tz: null, tzChangedAt: 0,
    streak: { current: 0, longest: 0, lastDay: null },
    badges: {}, lessonItems: {}, missionsDone: {}, learnedSigns: [],
    daily: { day: null, lessonXp: 0, gameXp: 0, walls: 0 },
    totals: { lessonXp: 0, gameXp: 0, walls: 0, countedWalls: 0, missions: 0 },
    lastClaimAt: 0, lastSkipAt: 0, backfilled: false, hidden: false, createdAt: now,
  };
}
function resolveTz(state, hint, now) {
  const cooldown = ECON.TZ_CHANGE_COOLDOWN_DAYS * 86400000;
  if (!state.tz) { state.tz = isValidTz(hint) ? hint : 'UTC'; state.tzChangedAt = now; }
  else if (isValidTz(hint) && hint !== state.tz && now - (state.tzChangedAt || 0) >= cooldown) { state.tz = hint; state.tzChangedAt = now; }
}
function rollover(state, now) {
  const today = dayKey(now, state.tz);
  if (state.daily.day !== today) state.daily = { day: today, lessonXp: 0, gameXp: 0, walls: 0 };
  const wk = weekKeyUtc(now);
  if (state.weekKey !== wk) { state.weekKey = wk; state.weeklyXp = 0; }
  return today;
}
function addXp(state, xp, out) {
  if (xp <= 0) return;
  const before = state.level;
  state.xp += xp; state.weeklyXp += xp;
  state.level = levelFromXp(state.xp);
  for (let l = before + 1; l <= state.level; l++) (out.levelUps = out.levelUps || []).push(l);
}
function grant(state, id, out, now) {
  if (!CFG.BADGES[id] || state.badges[id]) return;
  state.badges[id] = now;
  (out.newBadges = out.newBadges || []).push(id);
}
function touchStreak(state, today, out, now) {
  state.streak = applyStreak(state.streak, today);
  streakBadgesFor(state.streak.current).forEach((id) => grant(state, id, out, now));
}
function summary(state, now, out) {
  const today = dayKey(now, state.tz || 'UTC');
  return { ok: true, ...out, xp: state.xp, level: state.level, weeklyXp: state.weeklyXp,
    streak: effectiveStreak(state.streak, today), longestStreak: state.streak.longest,
    dailyLessonXp: state.daily.lessonXp, dailyGameXp: state.daily.gameXp, dailyGameCap: ECON.GAME.DAILY_XP_CAP };
}
function publicProfile(state, name, now) {
  const today = dayKey(now, state.tz || 'UTC'), live = effectiveStreak(state.streak, today);
  const recent = Object.entries(state.badges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return {
    name, xp: state.xp, level: state.level, weeklyXp: state.weeklyXp, weekKey: state.weekKey,
    streak: live, longestStreak: state.streak.longest,
    streakExpiresAt: live > 0 ? startOfDayMs(shiftDayKey(state.streak.lastDay, 2), state.tz || 'UTC') : null,   // ms; loadBoard zeroes expired streaks
    badgeCount: Object.keys(state.badges).length, recentBadges: recent, updatedAt: serverTimestamp(),
  };
}

/* ══════════════ problems are never silent ══════════════ */
const toastFn = () => (window.LinguaWave && window.LinguaWave.showToast) || window.showToast;
function reportProblem(kind, e) {
  lastError = { kind, code: (e && e.code) || null, message: (e && e.message) || String(e || ''), at: new Date().toISOString() };
  console.warn('[xp]', kind, lastError.code || '', lastError.message);
  if (warnedOnce) return;
  const text = kind === 'rules' ? 'XP could not be saved: database rules are not published yet.'
    : kind === 'unreachable' ? 'XP could not be saved right now. It will sync later.' : null;
  if (text && typeof toastFn() === 'function') { warnedOnce = true; toastFn()(text, 'error'); }
}

/* ══════════════ the one writer: transaction on xpState + publicProfiles ══════════════ */
async function whenReady() {
  try { await window.LWAuth?.whenAuthReady?.(); } catch { /* guest */ }
}
async function nameInfo() {
  const id = uid();
  if (nameCache && nameCache.uid === id) return nameCache;
  let name = '', deletion = false;
  try {
    const snap = await getDoc(doc(db, 'users', id));
    if (snap.exists()) { const d = snap.data(); name = typeof d.name === 'string' ? d.name : ''; deletion = d.deletionRequested === true; }
  } catch { /* fall through */ }
  if (!name) { try { name = (window.LWAuth?.getCurrentUser?.() || {}).name || ''; } catch { /* ignore */ } }
  nameCache = { uid: id, name: (name || '').trim().slice(0, 30) || 'Learner', deletion };
  return nameCache;
}

/** fn(state, {now, today}) mutates state and returns `out`. out.reject / out.skipStateWrite as in the server version. */
async function withState(fn) {
  await whenReady();
  const u = auth.currentUser;
  if (!u) return { ok: false, reason: 'signed_out' };
  if ((u.email || '').toLowerCase() === ADMIN_EMAIL) return { ok: false, reason: 'admin_account' };
  const info = await nameInfo();
  const stateRef = doc(db, 'xpState', u.uid), pubRef = doc(db, 'publicProfiles', u.uid);
  const now = Date.now();
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(stateRef);
    const state = snap.exists() ? { ...newState(now), ...snap.data() } : newState(now);
    resolveTz(state, TZ, now);
    const today = rollover(state, now);
    const out = (await fn(state, { now, today })) || {};
    if (out.reject) return { ok: false, reason: out.reject };
    if (out.skipStateWrite) return summary(state, now, out);
    tx.set(stateRef, state);
    if (state.hidden || info.deletion) tx.delete(pubRef); else tx.set(pubRef, publicProfile(state, info.name, now));
    return summary(state, now, out);
  });
}

/* ══════════════ events ══════════════ */
function publish(res) {
  latest = { ...(latest || {}), ...res };
  listeners.forEach((fn) => { try { fn(res, latest); } catch (e) { console.warn('[xp] listener failed', e); } });
  notify(res);
}
const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

async function getMyState() {
  await whenReady();
  if (!uid()) return null;
  try {
    const snap = await getDoc(doc(db, 'xpState', uid()));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('[xp] could not read state', e); return null; }
}

/* ══════════════ lessons ══════════════ */
const qKey = () => `lw_xp_pending_v1:${uid()}`;
function readQ() { try { return JSON.parse(localStorage.getItem(qKey()) || '[]'); } catch { return []; } }
function writeQ(q) { try { localStorage.setItem(qKey(), JSON.stringify(q.slice(-300))); } catch { /* private mode */ } }
function enqueue(job) {
  if (!uid()) return;
  const q = readQ();
  if (!q.some((j) => j.t === job.t && j.m === job.m && j.i === job.i)) { q.push(job); writeQ(q); }
}
async function findMission(id) {
  for (let i = 0; i < 80 && !window.LWMissions; i++) await sleep(100);       // missions.js is a deferred classic script
  const all = (window.LWMissions && window.LWMissions.getAllMissions && window.LWMissions.getAllMissions()) || [];
  return all.find((m) => m.id === id) || null;
}

async function runJob(job) {
  const mission = await findMission(job.m);
  if (!mission) return { ok: false, reason: 'unknown_mission' };
  const lessonIdx = mission.items.map((it, i) => (it.kind === 'LESSON' ? i : -1)).filter((i) => i >= 0);

  if (job.t === 'item') {
    const item = mission.items[job.i];
    if (!item || !ECON.LESSON_ITEM_XP[item.kind]) return { ok: false, reason: 'not_rewarding' };
    return withState((state, { now, today }) => {
      const claimed = state.lessonItems[mission.id] || [];
      if (claimed.includes(job.i)) return { duplicate: true, xpGained: 0, skipStateWrite: true };
      const out = {};
      const xp = applyLessonSoftCap(lessonItemXp(item.kind, item.bonusXP), state.daily.lessonXp);
      state.lessonItems[mission.id] = claimed.concat(job.i).sort((a, b) => a - b);
      state.lastClaimAt = now;
      if (item.kind === 'LESSON' && item.signId && !state.learnedSigns.includes(item.signId)) state.learnedSigns.push(item.signId);
      state.daily.lessonXp += xp; state.totals.lessonXp += xp;
      addXp(state, xp, out);
      touchStreak(state, today, out, now);
      out.xpGained = xp;
      return out;
    });
  }

  // mission (Mastery Quiz passed)
  return withState((state, { now, today }) => {
    if (state.missionsDone[mission.id]) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    const claimed = new Set(state.lessonItems[mission.id] || []);
    const done = lessonIdx.filter((i) => claimed.has(i)).length;
    const full = lessonIdx.length === 0 || done / lessonIdx.length >= ECON.MISSION_FULL_LESSON_RATIO;
    const out = { path: full ? 'full' : 'skip' };
    const raw = Math.round(missionBonus(lessonIdx.length) * (full ? 1 : ECON.MISSION_SKIP_FACTOR));
    const xp = applyLessonSoftCap(raw, state.daily.lessonXp);
    state.missionsDone[mission.id] = full ? 'full' : 'skip';
    lessonIdx.forEach((i) => { const s = mission.items[i].signId; if (s && !state.learnedSigns.includes(s)) state.learnedSigns.push(s); });
    state.daily.lessonXp += xp; state.totals.lessonXp += xp; state.totals.missions += 1;
    state.lastClaimAt = now;
    addXp(state, xp, out);
    touchStreak(state, today, out, now);
    missionCountBadgesFor(state.totals.missions).forEach((id) => grant(state, id, out, now));
    const lb = nextLevelBadge('lesson', state.level, state.badges);
    if (lb) grant(state, lb, out, now);
    out.xpGained = xp;
    return out;
  });
}

/** Drain the queue in order. Resolves when it's empty or saving keeps failing. */
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      await whenReady();
      if (!uid()) return;
      for (;;) {
        const q = readQ();
        if (!q.length) return;
        let res;
        try { res = await runJob(q[0]); }
        catch (e) {
          reportProblem(e && e.code === 'permission-denied' ? 'rules' : 'unreachable', e);
          return;                                                   // keep the job queued, retry next time
        }
        if (res && res.ok === false) console.info('[xp] claim not paid:', res.reason);
        writeQ(readQ().slice(1));                                   // paid, duplicate, or permanently refused
        if (res && res.ok) publish(res);
      }
    } finally { flushing = null; }
  })();
  return flushing;
}

const REWARDING = { LESSON: 1, BOOSTER: 1, PRACTICE: 1 };
function claimItem(mission, index) {
  try {
    const item = mission && mission.items && mission.items[index];
    if (!item || !REWARDING[item.kind]) return;
    enqueue({ t: 'item', m: mission.id, i: index });
    flush();
  } catch (e) { console.warn('[xp] claimItem failed', e); }
}
function claimMission(mission) {
  try {
    if (!mission || !mission.id) return;
    enqueue({ t: 'mission', m: mission.id });
    flush();
  } catch (e) { console.warn('[xp] claimMission failed', e); }
}

/* ══════════════ Wall Breaker ══════════════ */
async function startGame(signs) {
  try {
    await whenReady();
    if (!uid() || !Array.isArray(signs) || !signs.length || signs.length > ECON.GAME.MAX_BRICKS) return null;
    const st = await getMyState();
    const learned = new Set((st && st.learnedSigns) || []);
    const learnedBricks = signs.filter((s) => learned.has(s)).length;
    const minLearned = (CFG.GAME && CFG.GAME.MIN_LEARNED_BRICKS) || 6;
    session = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, startedAt: Date.now(), signs: signs.slice(), done: false };
    return { ok: true, sessionId: session.id, learnedBricks, xpEligible: learnedBricks >= minLearned, minLearned };
  } catch (e) { console.warn('[xp] startGame failed', e); return null; }
}
/** broken: [{ s: sign, t: msSinceStart, m: isMotion }]. Returns the summary or null. */
async function finishGame(sessionId, broken, wrong) {
  try {
    if (!sessionId || !session || session.id !== sessionId || session.done) return { ok: false, reason: 'no_session' };
    const sess = session; sess.done = true;                                  // a session pays out at most once
    if (!Number.isInteger(wrong) || wrong < 0 || wrong > 500) return { ok: false, reason: 'bad_input' };
    const G = ECON.GAME, elapsed = Date.now() - sess.startedAt;
    if (elapsed > G.SESSION_TTL_MS) return { ok: false, reason: 'expired' };
    const problem = validateGameTiming({ sessionSigns: sess.signs, broken, elapsedMs: elapsed });
    if (problem) return { ok: false, reason: problem };

    const r = await withState((state, { now, today }) => {
      const learned = new Set(state.learnedSigns);
      const bricks = broken.map((b) => ({ learned: learned.has(b.s), motion: !!b.m }));
      const res = gameWallXp({ bricks, wrong, wallsToday: state.daily.walls, gameXpToday: state.daily.gameXp });
      if (!res.eligible) return { counted: false, xpGained: 0, reason: res.reason, skipStateWrite: true };
      const out = { counted: false, accuracy: res.accuracy, flawless: res.flawless, multiplier: res.decay, capped: !!res.capped };
      state.daily.walls += 1; state.totals.walls += 1;
      const xp = res.xp;
      if (xp > 0) {
        state.daily.gameXp += xp; state.totals.gameXp += xp; state.totals.countedWalls += 1;
        addXp(state, xp, out);
        touchStreak(state, today, out, now);
        grant(state, 'game_first', out, now);
        if (res.flawless) grant(state, 'game_flawless', out, now);
        if (elapsed / sess.signs.length <= G.SPEED_BADGE_MS_PER_BRICK) grant(state, 'game_speed', out, now);
        if (state.totals.countedWalls >= G.VETERAN_WALLS) grant(state, 'game_veteran', out, now);
        const gb = nextLevelBadge('game', state.level, state.badges);
        if (gb) grant(state, gb, out, now);
        out.counted = true;
      } else out.reason = res.reason;
      out.xpGained = xp;
      return out;
    });
    if (r && r.ok) publish(r);
    return r;
  } catch (e) { reportProblem(e && e.code === 'permission-denied' ? 'rules' : 'unreachable', e); return null; }
}

/* ══════════════ one-time backfill of progress done before XP existed ══════════════ */
async function backfillOnce() {
  try {
    await whenReady();
    for (let i = 0; i < 60 && !window.LWMissions; i++) await sleep(100);
    if (!uid() || !window.LWMissions) return;
    const flag = `lw_xp_backfilled_v1:${uid()}`;
    if (localStorage.getItem(flag)) return;
    try { await window.LWMissions.whenMissionsSyncReady?.(); } catch { /* local only */ }
    const st = await getMyState();
    if (st && st.backfilled) { localStorage.setItem(flag, '1'); return; }
    const M = window.LWMissions, missions = M.getAllMissions?.() || [];
    if (!missions.length) return;
    const r = await withState((state, { now }) => {
      if (state.backfilled) return { duplicate: true, xpGained: 0, skipStateWrite: true };
      const out = {}; let raw = 0;
      for (const m of missions) {
        const have = new Set(state.lessonItems[m.id] || []);
        m.items.forEach((it, i) => {
          if (!M.isItemComplete(m, i, it) || have.has(i)) return;
          if (it.kind === 'QUIZ') {
            if (!state.missionsDone[m.id]) {
              state.missionsDone[m.id] = 'backfill'; state.totals.missions += 1;
              raw += missionBonus(m.items.filter((x) => x.kind === 'LESSON').length);
            }
            return;
          }
          if (!ECON.LESSON_ITEM_XP[it.kind]) return;
          have.add(i);
          if (it.kind === 'LESSON' && it.signId && !state.learnedSigns.includes(it.signId)) state.learnedSigns.push(it.signId);
          raw += lessonItemXp(it.kind, it.bonusXP);
        });
        if (have.size) state.lessonItems[m.id] = [...have].sort((a, b) => a - b);
      }
      const xp = Math.min(ECON.BACKFILL_MAX_XP, Math.round(raw * ECON.BACKFILL_FACTOR));
      state.backfilled = true; state.totals.lessonXp += xp;
      addXp(state, xp, out);
      missionCountBadgesFor(state.totals.missions).forEach((id) => grant(state, id, out, now));
      out.xpGained = xp; out.backfilled = true;
      return out;
    });
    if (r && (r.ok || r.duplicate)) localStorage.setItem(flag, '1');
    if (r && r.ok && r.xpGained > 0) publish(r);
  } catch (e) { reportProblem(e && e.code === 'permission-denied' ? 'rules' : 'unreachable', e); }
}

/* ══════════════ leaderboards ══════════════ */
const BOARDS = {
  xp:      { label: 'All-time XP', build: (c) => query(c, orderBy('xp', 'desc'), limit(50)) },
  weekly:  { label: 'This week',   build: (c, wk) => query(c, where('weekKey', '==', wk), orderBy('weeklyXp', 'desc'), limit(50)) },
  streak:  { label: 'Streaks',     build: (c) => query(c, orderBy('streak', 'desc'), limit(50)) },
  badges:  { label: 'Badges',      build: (c) => query(c, orderBy('badgeCount', 'desc'), limit(50)) },
};
async function loadBoard(kind) {
  await whenReady();
  const b = BOARDS[kind] || BOARDS.xp, now = Date.now();
  const snap = await getDocs(b.build(collection(db, 'publicProfiles'), weekKeyUtc(now)));
  const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  rows.forEach((r) => { if (r.streakExpiresAt && r.streakExpiresAt <= now) r.streak = 0; });   // nothing sweeps expired streaks now, so hide them here
  const tie = { streak: 'streak', badges: 'badgeCount', weekly: 'weeklyXp', xp: 'xp' }[kind] || 'xp';
  rows.sort((a, c) => ((c[tie] || 0) - (a[tie] || 0)) || ((c.xp || 0) - (a.xp || 0)));
  return rows;
}
async function setVisibility(visible) {
  try { return await withState((state) => { state.hidden = !visible; return { hidden: state.hidden }; }); }
  catch (e) { reportProblem(e && e.code === 'permission-denied' ? 'rules' : 'unreachable', e); throw e; }
}

/* ══════════════ pop-ups (level up / new badges / +XP) ══════════════ */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
let popTimer = null;
function notify(res) {
  try {
    if (!res || !res.ok) return;
    const gained = res.xpGained || 0, ups = res.levelUps || [], badges = res.newBadges || [];
    if (!gained && !ups.length && !badges.length) return;
    if (!ups.length && !badges.length) {
      const toast = toastFn();
      if (typeof toast === 'function') toast(`+${gained} XP`, 'success');
      return;
    }
    const top = ups.length ? ups[ups.length - 1] : null;
    const tier = tierOf(top || res.level || 1);
    const el = document.createElement('div');
    el.className = 'xp-pop'; el.setAttribute('role', 'status');
    el.innerHTML = `
      ${top ? `<div class="xp-pop__level" style="--tier:${esc(tier.color)}"><span class="xp-pop__tier" aria-hidden="true">${iconSvg(tierIconId(tier))}</span> Level ${top}<small>${esc(tier.name)}</small></div>` : ''}
      ${gained ? `<div class="xp-pop__xp">+${gained} XP</div>` : ''}
      ${badges.length ? `<ul class="xp-pop__badges">${badges.map((id) => { const b = badgeInfo(id); return `<li><span class="xp-pop__badge" aria-hidden="true">${iconSvg(badgeIconId(id), { size: 'sm' })}</span><b>${esc(b.name)}</b></li>`; }).join('')}</ul>` : ''}`;
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
  levelFromXp, levelProgress, tierOf, badgeInfo, tierIconId, badgeIconId, config: CFG, timezone: TZ,
  getLatest: () => latest,
  debug: () => ({ uid: uid(), pending: readQ(), lastError, latest }),   // run LWXP.debug() in the console
};
document.dispatchEvent(new CustomEvent('lwxp-ready'));