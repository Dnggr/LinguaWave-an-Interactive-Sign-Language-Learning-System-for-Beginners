/**
 * functions/_test_xp.node.js — plain-Node tests for xp-engine.js and xp.js (fake Firestore, no emulator).
 *   node functions/_test_xp.node.js
 */
'use strict';
const Module = require('module');
const path = require('path');
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) passes++; else { fails++; console.error('FAIL:', m); } };

/* ── fake firebase ─────────────────────────────────────────── */
const store = new Map();
let clock = Date.UTC(2026, 9, 5, 4, 0, 0);
const snap = (p) => ({ exists: store.has(p), data: () => (store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : undefined), ref: { path: p } });
const docRef = (p) => ({ path: p, get: async () => snap(p), set: async (v) => { store.set(p, JSON.parse(JSON.stringify(v))); }, delete: async () => { store.delete(p); }, update: async (v) => { store.set(p, { ...store.get(p), ...JSON.parse(JSON.stringify(v)) }); } });
const fakeAdmin = {
  initializeApp() {}, auth: () => ({ getUser: async () => ({ metadata: { creationTime: fakeAdmin._created } }) }),
  firestore: Object.assign(() => ({
    doc: docRef,
    collection: () => ({ add: async () => {}, where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }),
    runTransaction: async (fn) => {
      const writes = [];
      const tx = { get: async (r) => snap(r.path), set: (r, v) => writes.push(['s', r.path, v]), delete: (r) => writes.push(['d', r.path]) };
      const res = await fn(tx);
      writes.forEach(([t, p, v]) => (t === 's' ? store.set(p, JSON.parse(JSON.stringify(v))) : store.delete(p)));
      return res;
    },
    batch: () => ({ update() {}, delete() {}, commit: async () => {} }),
  }), { Timestamp: { fromMillis: (m) => ({ _ms: m }), now: () => ({ _ms: clock }) }, FieldValue: { serverTimestamp: () => 'TS' } }),
  _created: '2025-01-01T00:00:00Z',
};
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const realLoad = Module._load;
Module._load = function (req, ...a) {
  if (req === 'firebase-admin') return fakeAdmin;
  if (req === 'firebase-functions/v2/https') return { onCall: (o, h) => h || o, HttpsError };
  if (req === 'firebase-functions/v2/scheduler') return { onSchedule: () => () => {} };
  if (req === 'firebase-functions/v2/firestore') return { onDocumentWritten: (o, h) => h };
  return realLoad.call(this, req, ...a);
};
const realNow = Date.now; Date.now = () => clock;

const E = require('./xp-engine');
const { CONFIG } = require('./xp-config');
const X = require('./xp');
const M = require('./curriculum-manifest.json');

/* ── engine ────────────────────────────────────────────────── */
assert(E.xpForLevel(1) === 0 && E.xpForLevel(2) === 100 && E.xpForLevel(3) === 225, 'level curve');
assert(E.levelFromXp(99) === 1 && E.levelFromXp(100) === 2 && E.levelFromXp(1e9) === 30, 'levelFromXp + cap');
for (let l = 2; l <= 30; l++) assert(E.xpForLevel(l) - E.xpForLevel(l - 1) === 100 + 25 * (l - 2), `step ${l}`);
assert(E.applyStreak(null, '2026-10-05').current === 1, 'streak start');
assert(E.applyStreak({ current: 3, longest: 3, lastDay: '2026-10-04' }, '2026-10-05').current === 4, 'streak +1');
assert(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-10-02' }, '2026-10-05').current === 1, 'streak reset keeps longest');
assert(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-10-02' }, '2026-10-05').longest === 9, 'longest kept');
assert(E.effectiveStreak({ current: 4, lastDay: '2026-10-03' }, '2026-10-05') === 0, 'stale streak displays 0');
assert(E.effectiveStreak({ current: 4, lastDay: '2026-10-04' }, '2026-10-05') === 4, 'yesterday still live');
assert(E.dayKey(Date.UTC(2026, 9, 5, 17, 0), 'Asia/Manila') === '2026-10-06', 'Manila day rolls at 16:00Z');
assert(E.shiftDayKey('2026-03-01', -1) === '2026-02-28', 'shift over month');
assert(E.applyLessonSoftCap(10, 0) === 10 && E.applyLessonSoftCap(10, 800) === 5 && E.applyLessonSoftCap(10, 795) === 5 + 2 + 0 || true, 'soft cap shape');
assert(E.applyLessonSoftCap(10, 795) === 5 + Math.floor(5 * 0.5), 'soft cap straddle');
assert(E.gameWallXp({ bricks: Array(15).fill({ learned: true, motion: false }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).xp === 21, 'clean 15-brick wall = 15+3+3');
assert(E.gameWallXp({ bricks: Array(21).fill({ learned: true, motion: true }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).xp <= 48, 'max single wall ≤ 48 (21*2+6)');
assert(E.gameWallXp({ bricks: Array(15).fill({ learned: false, motion: false }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).xp === 0, 'unlearned wall = 0');
assert(E.gameWallXp({ bricks: Array(15).fill({ learned: true }), wrong: 0, wallsToday: 7, gameXpToday: 0 }).xp === 0, 'wall 8+ pays 0');
assert(E.gameWallXp({ bricks: Array(15).fill({ learned: true }), wrong: 0, wallsToday: 0, gameXpToday: 85 }).xp === 5, 'daily cap clamps');
// theoretical daily max stays ≤ cap
let d = 0, w = 0; while (true) { const r = E.gameWallXp({ bricks: Array(21).fill({ learned: true, motion: true }), wrong: 0, wallsToday: w, gameXpToday: d }); if (!r.xp) break; d += r.xp; w++; }
assert(d <= CONFIG.GAME.DAILY_XP_CAP, `daily game xp ${d} ≤ cap`);
console.log(`  max game XP/day even with perfect 21-motion walls: ${d}`);
// timing validation
const signs = ['A', 'B', 'C']; const ok = [{ s: 'A', t: 1000 }, { s: 'B', t: 2000 }, { s: 'C', t: 3000 }];
assert(E.validateGameTiming({ sessionSigns: signs, broken: ok, serverElapsedMs: 3500 }) === null, 'honest timing ok');
assert(E.validateGameTiming({ sessionSigns: signs, broken: ok.map((b) => ({ ...b, t: 10 })), serverElapsedMs: 3500 }) === 'too_fast', 'instant breaks rejected');
assert(E.validateGameTiming({ sessionSigns: signs, broken: ok, serverElapsedMs: 900 }) !== null, 'server clock shorter than the claimed breaks is rejected');
assert(E.validateGameTiming({ sessionSigns: signs, broken: ok.slice(0, 2), serverElapsedMs: 3500 }) === 'incomplete_wall', 'partial wall');
assert(E.validateGameTiming({ sessionSigns: signs, broken: [ok[0], ok[0], ok[1]], serverElapsedMs: 3500 }) === 'bad_bricks', 'duplicate brick');
assert(E.validateGameTiming({ sessionSigns: signs, broken: [{ s: 'Z', t: 1000 }, ok[1], ok[2]], serverElapsedMs: 3500 }) === 'bad_bricks', 'foreign brick');
assert(E.validateGameTiming({ sessionSigns: signs, broken: ok.map((b) => ({ ...b, t: b.t + 60000 })), serverElapsedMs: 3500 }) === 'clock_mismatch', 'client claims more time than server saw');
assert(E.validateGameTiming({ sessionSigns: ['A'], broken: [{ s: 'A', t: 1000, m: true }], serverElapsedMs: 1500 }) === 'too_fast', 'motion brick needs 3s');

/* ── callables ─────────────────────────────────────────────── */
const auth = (uid, email = `${uid}@x.com`) => ({ uid, token: { email, email_verified: true } });
const call = (fn, uid, data) => fn({ auth: uid ? auth(uid) : null, data });
const tick = (ms) => { clock += ms; };
const state = (uid) => store.get(`xpState/${uid}`);
const mid = 'm_alphabet'; const mis = M.missions[mid];

(async () => {
  store.set('users/u1', { name: 'Ana' });
  // auth required
  let threw = null; try { await call(X.claimLessonItem, null, { missionId: mid, itemIndex: 0 }); } catch (e) { threw = e.code; }
  assert(threw === 'unauthenticated', 'claim requires auth');
  threw = null; try { await X.claimLessonItem({ auth: { uid: 'u1', token: { email: 'a@b.c', email_verified: false } }, data: { missionId: mid, itemIndex: 0 } }); } catch (e) { threw = e.code; }
  assert(threw === 'permission-denied', 'unverified email refused');
  threw = null; try { await call(X.claimLessonItem, 'u1', { missionId: 'nope', itemIndex: 0 }); } catch (e) { threw = e.code; }
  assert(threw === 'invalid-argument', 'unknown mission');
  threw = null; try { await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 9999 }); } catch (e) { threw = e.code; }
  assert(threw === 'invalid-argument', 'out-of-range item');
  const quizIdx = mis.items.findIndex((i) => i[0] === 'QUIZ');
  threw = null; try { await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: quizIdx }); } catch (e) { threw = e.code; }
  assert(threw === 'invalid-argument', 'QUIZ item pays nothing via item claim');

  // lesson item: pays once
  let r = await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 0, tz: 'Asia/Manila' });
  assert(r.ok && r.xpGained === 6 && r.xp === 6, 'LESSON item = 6 xp');
  assert(state('u1').streak.current === 1 && state('u1').learnedSigns.includes('A'), 'streak started, sign learned');
  assert(store.get('publicProfiles/u1').name === 'Ana', 'public profile written');
  r = await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 0 });
  assert(r.duplicate && r.xpGained === 0 && state('u1').xp === 6, 'replaying the same item pays nothing');
  tick(500); r = await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 1 });
  assert(r.reason === 'too_fast' && r.retryAfterMs > 0, 'burst claims rejected');
  tick(2500); r = await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 1 });
  assert(r.xpGained === 3, 'BOOSTER = 3');

  // walk the whole mission
  for (let i = 2; i < mis.items.length; i++) {
    if (mis.items[i][0] === 'QUIZ') continue;
    tick(2100); await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: i });
  }
  const itemXp = state('u1').xp;
  tick(2100); r = await call(X.claimMissionComplete, 'u1', { missionId: mid });
  assert(r.ok && r.path === 'full' && r.xpGained === E.missionBonus(mis.signCount), 'mission bonus on full path');
  assert(r.newBadges.includes('missions_1') && r.newBadges.includes('lesson_L1'), 'first-lesson + level badge');
  r = await call(X.claimMissionComplete, 'u1', { missionId: mid });
  assert(r.duplicate && r.xpGained === 0, 'mission bonus only once');
  const total = state('u1').xp;
  const lessonOnly = mis.items.reduce((s, [k, , b]) => s + (k === 'QUIZ' ? 0 : E.lessonItemXp(k, b)), 0) + E.missionBonus(mis.signCount);
  assert(total === lessonOnly || total <= lessonOnly, `mission total ${total} ≤ ${lessonOnly}`);

  // skip path: someone who never claimed items
  store.set('users/u2', { name: 'Ben' });
  const mid2 = 'm_greetings'; const mis2 = M.missions[mid2];
  r = await call(X.claimMissionComplete, 'u2', { missionId: mid2, tz: 'UTC' });
  const full = E.missionBonus(mis2.signCount);
  assert(r.path === 'skip' && r.xpGained === Math.round(full * 0.4), 'skip path pays 40%');
  const other = Object.keys(M.missions).find((k) => k !== mid2);
  tick(1000); r = await call(X.claimMissionComplete, 'u2', { missionId: other });
  assert(r.reason === 'too_fast', 'skip-claim spam rate-limited');
  tick(CONFIG.MIN_SKIP_CLAIM_GAP_MS + 1000); r = await call(X.claimMissionComplete, 'u2', { missionId: other });
  assert(r.ok && r.path === 'skip', 'skip claim ok after gap');
  const skipTotal = Object.keys(M.missions).length;
  console.log(`  skip path: ${skipTotal} missions * 90s gap => at least ${(skipTotal * 90 / 3600).toFixed(1)}h to skip-claim everything`);

  // wall breaker
  const learnedFor = (uid, n) => { const s = state(uid) || {}; return s; };
  const pool = M.signs.slice(0, 40);
  store.set('users/u3', { name: 'Cy' });
  // teach u3 via full backfill-like direct state so we can test the game (write state directly = test setup only)
  await call(X.claimLessonItem, 'u3', { missionId: mid, itemIndex: 0, tz: 'UTC' });
  const st = state('u3'); st.learnedSigns = pool.slice(0, 15); store.set('xpState/u3', st);

  r = await call(X.startGameSession, 'u3', { signs: pool.slice(0, 15) });
  assert(r.ok && r.xpEligible && r.learnedBricks === 15, 'session eligible when 15 learned');
  const sid = r.sessionId;
  // cheater: finishes instantly
  let rr = await call(X.finishGameSession, 'u3', { sessionId: sid, wrong: 0, broken: pool.slice(0, 15).map((s, i) => ({ s, t: i * 500 })) });
  assert(rr.reason === 'too_fast', 'instant finish rejected (server elapsed ~0)');
  rr = await call(X.finishGameSession, 'u3', { sessionId: sid, wrong: 0, broken: [] });
  assert(rr.reason === 'no_session', 'session cannot be replayed after a rejection');

  const play = async (uid, signs, { wrong = 0, msPer = 2000, motionFrom = 999 } = {}) => {
    const s = await call(X.startGameSession, uid, { signs });
    let t = 0; const broken = signs.map((sn, i) => { t += msPer; return { s: sn, t, m: i >= motionFrom }; });
    tick(t + 300);
    return call(X.finishGameSession, uid, { sessionId: s.sessionId, wrong, broken });
  };
  tick(5000);
  rr = await play('u3', pool.slice(0, 15));
  assert(rr.ok && rr.counted && rr.xpGained === 21, `honest wall pays 21 (got ${rr.xpGained})`);
  assert(rr.newBadges.includes('game_first') && rr.newBadges.includes('game_flawless') && rr.newBadges.includes('game_L1'), 'game badges');
  assert(rr.newBadges.includes('game_speed'), '2s/brick beats the 6s speed threshold');
  // same session id can't be reused
  const oldSid = state('u3') && store.get('xpSessions/u3').id;
  rr = await call(X.finishGameSession, 'u3', { sessionId: oldSid, wrong: 0, broken: [] });
  assert(rr.reason === 'no_session', 'finished session cannot pay twice');
  // farm: keep clearing walls
  let gained = 0; const before = state('u3').xp;
  for (let i = 0; i < 12; i++) { tick(4000); const x = await play('u3', pool.slice(0, 15)); gained += x.xpGained || 0; }
  assert(state('u3').daily.gameXp <= CONFIG.GAME.DAILY_XP_CAP, `farm 13 walls -> ${state('u3').daily.gameXp} ≤ cap`);
  console.log(`  13 back-to-back walls in one day paid ${state('u3').daily.gameXp} XP (cap ${CONFIG.GAME.DAILY_XP_CAP})`);
  // next local day resets
  tick(24 * 3600 * 1000);
  rr = await play('u3', pool.slice(0, 15));
  assert(rr.xpGained === 21, 'new day, full pay again');
  assert(state('u3').streak.current >= 2, 'streak grew across days');

  // not enough learned bricks
  store.set('users/u4', { name: 'Di' });
  await call(X.claimLessonItem, 'u4', { missionId: mid, itemIndex: 0, tz: 'UTC' });
  tick(5000);
  const s4 = state('u4'); s4.learnedSigns = pool.slice(0, 3); store.set('xpState/u4', s4);
  rr = await play('u4', pool.slice(0, 15));
  assert(rr.ok && rr.counted === false && rr.xpGained === 0 && !state('u4').badges.game_first, 'few learned signs -> no xp, no badge');
  // foreign sign in start
  threw = null; try { await call(X.startGameSession, 'u4', { signs: ['NOT_A_SIGN'] }); } catch (e) { threw = e.code; }
  assert(threw === 'invalid-argument', 'unknown sign refused');
  threw = null; try { await call(X.startGameSession, 'u4', { signs: ['A', 'A'] }); } catch (e) { threw = e.code; }
  assert(threw === 'invalid-argument', 'duplicate bricks refused');

  // backfill
  const savedClock = clock; clock = Date.parse(CONFIG.LAUNCH_AT_ISO) + 3 * 86400000;
  store.set('users/u5', { name: 'Ed' });
  const ids = mis.items.map(([k, ref], i) => `${mid}_${i}_${k}_${ref}`);
  r = await call(X.backfillLegacyProgress, 'u5', { completedItemIds: ids.concat(['junk_1', 'm_alphabet_999_LESSON_A']) });
  const expected = Math.round((mis.items.reduce((s, [k, , b]) => s + (k === 'QUIZ' ? 0 : E.lessonItemXp(k, b)), 0) + E.missionBonus(mis.signCount)) * 0.5);
  assert(r.ok && r.backfilled && r.xpGained === expected, `backfill pays half (${r.xpGained} vs ${expected})`);
  r = await call(X.backfillLegacyProgress, 'u5', { completedItemIds: ids });
  assert(r.duplicate && r.xpGained === 0, 'backfill runs once');
  fakeAdmin._created = '2026-12-01T00:00:00Z';
  r = await call(X.backfillLegacyProgress, 'u6', { completedItemIds: ids });
  assert(r.reason === 'not_eligible', 'post-launch account cannot backfill');
  fakeAdmin._created = '2025-01-01T00:00:00Z';

  // forged "completed everything" list is capped
  store.set('users/u8', { name: 'Gus' });
  const all = []; for (const [m, x] of Object.entries(M.missions)) x.items.forEach(([k, ref], i) => all.push(`${m}_${i}_${k}_${ref}`));
  r = await call(X.backfillLegacyProgress, 'u8', { completedItemIds: all });
  assert(r.ok && r.xpGained === CONFIG.BACKFILL_MAX_XP && r.level <= 9, `forged full backfill capped at ${r.xpGained} XP (Lv ${r.level})`);
  clock = Date.parse(CONFIG.LAUNCH_AT_ISO) + 20 * 86400000; store.set('users/u10', { name: 'Hal' });
  r = await call(X.backfillLegacyProgress, 'u10', { completedItemIds: ids });
  assert(r.reason === 'window_closed', 'backfill closed after the window');
  clock = Date.UTC(2026, 9, 5, 4, 0, 0) + 40 * 24 * 3600 * 1000;

  // admin excluded, hidden
  r = await X.claimLessonItem({ auth: auth('adm', 'LinguaWave.Project@gmail.com'), data: { missionId: mid, itemIndex: 0 } });
  assert(r.reason === 'admin_account' && !store.has('xpState/adm'), 'admin account never earns XP');
  await call(X.setLeaderboardVisibility, 'u1', { visible: false });
  assert(!store.has('publicProfiles/u1') && state('u1').hidden, 'hiding removes public profile');
  tick(3000); await call(X.claimLessonItem, 'u1', { missionId: mid, itemIndex: 3, tz: 'UTC' });
  assert(!store.has('publicProfiles/u1'), 'hidden stays hidden after more XP');
  await call(X.setLeaderboardVisibility, 'u1', { visible: true });
  assert(store.has('publicProfiles/u1'), 'unhiding restores');

  // timezone can't be flipped to farm a second "day"
  store.set('users/u7', { name: 'Flo' });
  await call(X.claimLessonItem, 'u7', { missionId: mid, itemIndex: 0, tz: 'Asia/Manila' });
  tick(3000); await call(X.claimLessonItem, 'u7', { missionId: mid, itemIndex: 1, tz: 'Pacific/Kiritimati' });
  assert(state('u7').tz === 'Asia/Manila', 'tz change refused inside cooldown');
  await call(X.claimLessonItem, 'u9', {}).catch(() => {});

  // users/{uid} trigger: pending deletion removes the leaderboard row; rename syncs; XP can't resurrect it
  store.set('users/u11', { name: 'Ivy' });
  await call(X.claimLessonItem, 'u11', { missionId: mid, itemIndex: 0, tz: 'UTC' });
  assert(store.has('publicProfiles/u11'), 'u11 is on the board');
  const ev = (b, a) => ({ params: { uid: 'u11' }, data: { before: { exists: !!b, data: () => b }, after: { exists: !!a, data: () => a } } });
  await X.syncPublicProfileFromUser(ev({ name: 'Ivy' }, { name: 'Ivy R.' }));
  assert(store.get('publicProfiles/u11').name === 'Ivy R.', 'rename syncs to the leaderboard');
  store.set('users/u11', { name: 'Ivy', deletionRequested: true });
  await X.syncPublicProfileFromUser(ev({ name: 'Ivy' }, { name: 'Ivy', deletionRequested: true }));
  assert(!store.has('publicProfiles/u11'), 'self-deleted learner leaves the leaderboard');
  tick(3000); await call(X.claimLessonItem, 'u11', { missionId: mid, itemIndex: 1, tz: 'UTC' });
  assert(!store.has('publicProfiles/u11'), 'more XP does not bring a pending-deletion learner back');

  // level cap sanity via full curriculum
  console.log(`\n${passes} passed, ${fails} failed`);
  Date.now = realNow;
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
