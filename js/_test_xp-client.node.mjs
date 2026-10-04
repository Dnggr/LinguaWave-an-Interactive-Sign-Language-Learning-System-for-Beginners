#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as E from './xp-engine.mjs';

const file = new URL('./xp.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8').replace(/^import .*;\s*$/gm, '');
const store = new Map();
const local = new Map();
const toasts = [];
const listeners = new Map();
let fakeNow = Date.UTC(2026, 9, 3, 12);
let activeTransactions = 0;
let maxActiveTransactions = 0;
let transactionCount = 0;
let failWith = null;
let assertPairedWrites = true;
const uid = 'learner-1';
const user = { uid, email: 'learner@example.test', emailVerified: true, displayName: 'Ana',
  metadata: { creationTime: '2026-10-02T00:00:00.000Z' } };
const auth = { currentUser: user };
const mission = {
  id: 'sample', category: 'sample',
  items: [
    { kind: 'LESSON', signId: 'A' },
    { kind: 'BOOSTER', signId: 'A' },
    { kind: 'PRACTICE', signId: 'B', bonusXP: 5 },
    { kind: 'LESSON', signId: 'B' },
    { kind: 'QUIZ' },
  ],
};
const completed = new Set();
let missionStreak = { currentStreak: 0, longestStreak: 0, lastActivityDate: null };   // what window.LWMissions.getStreakSummary() returns
store.set(`users/${uid}`, { name: 'Ana' });

function clone(value) { return value === undefined ? undefined : structuredClone(value); }
function refPath(ref) { return typeof ref === 'string' ? ref : ref.path; }
function snap(path) {
  const exists = store.has(path);
  const value = store.get(path);
  return { exists: () => exists, data: () => clone(value), id: path.split('/').at(-1), docs: [] };
}
function doc(_db, collection, id) { return { path: `${collection}/${id}` }; }
function timeoutStub(fn) { const id = Math.random(); listeners.set(`timeout:${id}`, fn); return id; }
function clearTimeoutStub(id) { listeners.delete(`timeout:${id}`); }
function makeElement() {
  return {
    className: '', innerHTML: '',
    classList: { add() {}, remove() {} },
    setAttribute() {}, remove() {},
  };
}

const sdk = {
  async runTransaction(_db, callback) {
    if (failWith) {
      const error = new Error(`simulated ${failWith}`);
      error.code = failWith;
      throw error;
    }
    transactionCount++;
    activeTransactions++;
    maxActiveTransactions = Math.max(maxActiveTransactions, activeTransactions);
    try {
      const writes = new Map();
      const transaction = {
        get: async (ref) => snap(refPath(ref)),
        set: (ref, data) => writes.set(refPath(ref), { type: 'set', data: clone(data) }),
        delete: (ref) => writes.set(refPath(ref), { type: 'delete' }),
      };
      const result = await callback(transaction);
      const stateWrite = writes.get(`xpState/${uid}`);
      const profileWrite = writes.get(`publicProfiles/${uid}`);
      if (assertPairedWrites && stateWrite) {
        assert.ok(stateWrite.type === 'set', 'XP state is written as a full document');
        const hidden = stateWrite.data.hidden || store.get(`users/${uid}`)?.deletionRequested;
        assert.ok(hidden ? profileWrite?.type === 'delete' : profileWrite?.type === 'set', 'XP state and public row are paired atomically');
        if (!hidden) {
          assert.equal(profileWrite.data.xp, stateWrite.data.xp, 'profile XP matches state');
          assert.equal(profileWrite.data.level, stateWrite.data.level, 'profile level matches state');
          assert.equal(profileWrite.data.weeklyXp, stateWrite.data.weeklyXp, 'profile weekly XP matches state');
          assert.equal(profileWrite.data.badgeCount, Object.keys(stateWrite.data.badges).length, 'profile badge count matches state');
          assert.equal(profileWrite.data.updatedAt.getTime(), stateWrite.data.lastWriteAt.getTime(), 'profile and state timestamps match');
        }
      }
      for (const [path, write] of writes) {
        if (write.type === 'delete') store.delete(path);
        else store.set(path, clone(write.data));
      }
      if (writes.size) fakeNow += 2500;
      return result;
    } finally { activeTransactions--; }
  },
  serverTimestamp: () => new Date(fakeNow),
  limit: (n) => ({ limit: n }),
  where: (...args) => ({ where: args }),
};

const window = {
  LWAuth: { whenAuthReady: async () => undefined },
  LWIcons: { markup: () => '' },
  LWProgress: {},
  LWMissions: {
    getAllMissions: () => [mission],
    getStreakSummary: () => missionStreak,
    whenMissionsSyncReady: async () => undefined,
    isItemComplete: (_mission, index) => completed.has(index),
    content: { SIGNS: [{ signId: 'A' }, { signId: 'B' }] },
  },
  LinguaWave: { showToast: (message, type) => toasts.push({ message, type }) },
  addEventListener: (name, fn) => listeners.set(name, fn),
};
const document = {
  dispatchEvent() {},
  createElement: makeElement,
  querySelectorAll: () => [],
  body: { appendChild() {} },
};
const context = {
  auth,
  db: {},
  doc,
  getDoc: async (ref) => snap(ref.path),
  collection: (_db, name) => ({ path: name }),
  getDocs: async () => ({ docs: [] }),
  query: (...args) => ({ args }),
  orderBy: (...args) => ({ orderBy: args }),
  limit: sdk.limit,
  where: sdk.where,
  runTransaction: sdk.runTransaction,
  serverTimestamp: sdk.serverTimestamp,
  SIGN_DICTIONARY: { A: {}, B: {}, C: {}, E: {}, G: {}, H: {}, I: {}, K: {}, M: {}, R: {}, U: {}, '4': {}, '7': {} },   // letters/numbers used by the Time Attack words
  E,
  window,
  document,
  localStorage: {
    getItem: (key) => local.has(key) ? local.get(key) : null,
    setItem: (key, value) => local.set(key, String(value)),
    removeItem: (key) => local.delete(key),
  },
  CustomEvent: class { constructor(name) { this.type = name; } },
  console: { warn() {}, error: console.error, log() {} },
  Date: class extends Date { static now() { return fakeNow; } },
  setTimeout: timeoutStub,
  clearTimeout: clearTimeoutStub,
  requestAnimationFrame: (fn) => fn(),
  crypto: { randomUUID: (() => { let id = 0; return () => `id-${++id}`; })() },
};
vm.runInNewContext(source, context, { filename: 'js/xp.js' });
await new Promise((resolve) => setImmediate(resolve));
const X = window.LWXP;
assert.ok(X, 'LWXP bridge initialized');

// A lesson claim updates both documents atomically, with server timestamps.
X.claimItem(mission, 0);
await X.flush();
assert.equal(store.get(`xpState/${uid}`).xp, 6);
assert.equal(store.get(`publicProfiles/${uid}`).xp, 6);
assert.ok(store.get(`xpState/${uid}`).lastWriteAt instanceof Date);

// A replay is idempotent, and queued updates are serialized.
const beforeReplay = transactionCount;
X.claimItem(mission, 0);
await X.flush();
assert.equal(store.get(`xpState/${uid}`).xp, 6);
assert.equal(transactionCount, beforeReplay + 1, 'a replay checks the ledger in a transaction but does not write');
X.claimItem(mission, 1);
X.claimItem(mission, 2);
await X.flush();
assert.equal(maxActiveTransactions, 1, 'writes are serialized by one page queue');
assert.equal(store.get(`publicProfiles/${uid}`).xp, store.get(`xpState/${uid}`).xp);

// Visibility hides and restores the public row with the private state update.
let result = await X.setVisibility(false);
assert.ok(result.ok && store.get(`xpState/${uid}`).hidden);
assert.equal(store.has(`publicProfiles/${uid}`), false);
result = await X.setVisibility(true);
assert.ok(result.ok && !store.get(`xpState/${uid}`).hidden);
assert.equal(store.get(`publicProfiles/${uid}`).xp, store.get(`xpState/${uid}`).xp);

// A game session is held by the page and its result uses the same transaction.
completed.add(0);
const session = await X.startGame(['A'], 'timeAttack');
assert.ok(session.ok && session.xpEligible && session.sessionId);
fakeNow += 3000;
result = await X.finishGame(session.sessionId, [{ s: 'A', t: 500, m: false }], 0);
assert.ok(result.ok && result.xpGained === 7);
assert.equal(store.get(`xpState/${uid}`).daily.gameXp, 7);
assert.equal(store.get(`publicProfiles/${uid}`).xp, store.get(`xpState/${uid}`).xp);

// Time Attack (fingerspelling): letters repeat inside a word, so the session carries word ids plus the unique letters.
{
  const letters = ['C', 'A', 'R', 'M', 'E', 'I', 'K', '4', '7', 'H', 'B', 'U', 'G'];
  const fsWords = ['car', 'america', 'ak47', 'hamburger'];
  assert.equal(await X.startGame(letters, 'fingerspell', { words: ['car', 'car'] }), null, 'duplicate words are refused');
  assert.equal(await X.startGame(['C', 'A'], 'fingerspell', { words: ['car'] }), null, 'letters must match the words');
  store.set(`xpState/${uid}`, { ...store.get(`xpState/${uid}`), learnedSigns: [...new Set([...(store.get(`xpState/${uid}`).learnedSigns || []), ...letters])] });
  const fs = await X.startGame(letters, 'fingerspell', { words: fsWords });
  assert.ok(fs.ok && fs.xpEligible && fs.payableWords.length === 4 && fs.sessionId, 'fingerspell session starts with every word payable');
  const beforeXp = store.get(`xpState/${uid}`).xp, beforeGame = store.get(`xpState/${uid}`).daily.gameXp;
  fakeNow += 14000;
  result = await X.finishGame(fs.sessionId, [{ w: 0, t: 2000 }, { w: 1, t: 6000 }, { w: 2, t: 8500 }, { w: 3, t: 13000 }], 0);
  assert.ok(result.ok && result.counted && result.xpGained === 29, `fingerspell run pays 29 XP (${result.xpGained})`);
  const after = store.get(`xpState/${uid}`);
  assert.equal(after.xp, beforeXp + 29);
  assert.equal(after.daily.gameXp, beforeGame + 29, 'fingerspell XP counts toward the shared 90 XP/day game cap');
  assert.equal(after.totals.timeAttackXp >= 29, true);
  assert.equal(store.get(`publicProfiles/${uid}`).xp, after.xp);
  assert.equal(store.get(`publicProfiles/${uid}`).timeAttackXp, after.totals.timeAttackXp);
}

// Offline jobs stay queued and retry after the connection comes back.
failWith = 'unavailable';
X.claimItem(mission, 3);
await X.flush();
assert.equal(X.debug().pending.length, 1, 'offline item remains queued');
assert.ok(toasts.some((toast) => toast.message === 'You appear to be offline. XP will retry.'));
failWith = null;
await X.flush();
assert.equal(X.debug().pending.length, 0, 'queued item flushes after reconnect');
assert.ok(store.get(`xpState/${uid}`).lessonItems.sample.includes(3));

// Permission errors are specific and throttled by code for 30 seconds.
failWith = 'permission-denied';
await X.syncPublicProfile();
await X.syncPublicProfile();
const permissionToasts = toasts.filter((toast) => toast.message === 'XP rules rejected this update. Tell the admin.');
assert.equal(permissionToasts.length, 1, 'same error toast is throttled for 30 seconds');
assert.equal(X.debug().lastError.code, 'permission-denied');
failWith = null;

// Streak catch-up (syncStreak). REGRESSION: with nothing to heal it used to publish a bare { ok: true } with no xp / level /
// streak, and the Profile "Level" card redrew itself as Level 1, 0 XP, 0-day streak. Every published result must now be a full summary.
{
  const published = [];
  const stop = X.onUpdate((res) => published.push(res));
  const before = clone(store.get(`xpState/${uid}`));
  const todayKey = E.dayKey(fakeNow, before.tz || 'UTC');
  missionStreak = { currentStreak: before.streak.current, longestStreak: before.streak.current, lastActivityDate: before.streak.lastDay };
  let res = await X.syncStreak();
  assert.ok(res.ok && !res.streakHealed, 'nothing to heal: ok, not healed');
  assert.equal(typeof res.xp, 'number'); assert.equal(typeof res.level, 'number'); assert.equal(typeof res.streak, 'number');
  assert.equal(res.xp, before.xp, 'nothing to heal: the summary carries the real XP');
  assert.equal(store.get(`xpState/${uid}`).xp, before.xp, 'nothing to heal: no state write');
  assert.deepEqual(store.get(`xpState/${uid}`).streak, before.streak, 'nothing to heal: streak untouched');

  // A streak saved under the old strict rule (1) while Missions, which keeps the real days, says 3: healed one step per write.
  store.set(`xpState/${uid}`, { ...before, streak: { current: 1, longest: 1, lastDay: before.streak.lastDay }, badges: {} });
  missionStreak = { currentStreak: 3, longestStreak: 3, lastActivityDate: before.streak.lastDay };
  published.length = 0;
  res = await X.syncStreak();
  const healed = store.get(`xpState/${uid}`);
  assert.equal(healed.streak.current, 3, 'heal: streak raised to the Missions streak');
  assert.equal(healed.streak.longest, 3, 'heal: longest follows');
  assert.ok(healed.badges.streak_3, 'heal: the 3-day badge is granted');
  assert.equal(store.get(`publicProfiles/${uid}`).streak, 3, 'heal: leaderboard row matches');
  assert.equal(res.xp, healed.xp, 'heal: the final summary carries the real XP');
  assert.ok(published.length >= 2 && published.every((r) => typeof r.xp === 'number' && typeof r.streak === 'number'), 'every published streak result is a full summary');
  assert.equal(published.flatMap((r) => r.newBadges || []).filter((id) => id === 'streak_3').length, 1, 'the new badge is reported exactly once');
  stop();
  missionStreak = { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
}

// Every successful XP write was asserted above to have a consistent profile row.
assert.ok(transactionCount >= 8, 'transaction path exercised repeatedly');
console.log('client transaction harness: passed');
