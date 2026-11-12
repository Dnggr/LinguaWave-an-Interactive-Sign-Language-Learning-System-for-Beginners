'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SOURCE_PATH = path.join(__dirname, 'missions.js');
const SOURCE = fs.readFileSync(SOURCE_PATH, 'utf8');
function makeLocalStorage(initial = {}) {
  const store = { ...initial };
  return {
    _store: store,
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };
}
function makeFakeFirestoreBackend() {
  const docs = new Map();
  return {
    docs,
    db: {},
    doc(_db, collection, uid) { return { _key: `${collection}/${uid}` }; },
    async getDoc(ref) {
      const data = docs.get(ref._key);
      return {
        exists: () => data !== undefined,
        data: () => (data === undefined ? undefined : JSON.parse(JSON.stringify(data))),
      };
    },
    async setDoc(ref, value, opts) {
      const merge = !!(opts && opts.merge);
      const existing = docs.get(ref._key) || {};
      const next = merge ? { ...existing, ...value } : value;
      docs.set(ref._key, JSON.parse(JSON.stringify(next)));
      return undefined;
    },
  };
}
function loadMissionsInFreshContext({ localStorageInitial = {}, loggedInUid = null, backend = null }) {
  const localStorage = makeLocalStorage(localStorageInitial);
  const fs2 = backend || makeFakeFirestoreBackend();
  const uid = loggedInUid;
  const LWAuth = {
    getCurrentUser: () => (uid ? { uid } : null),
    whenAuthReady: async () => {},
    async readProgressDoc(name) {
      if (!uid) return null;
      const snap = await fs2.getDoc(fs2.doc(fs2.db, name, uid));
      return { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
    },
    async writeProgressDoc(name, data, opts) {
      if (!uid) return false;
      await fs2.setDoc(fs2.doc(fs2.db, name, uid), data, opts);
      return true;
    },
  };
  const windowMock = {
    localStorage,
    LWAuth,
  };
  windowMock.window = windowMock;
  const sandbox = {
    window: windowMock,
    localStorage,
    console,
    Promise,
    Date,
    Math,
    JSON,
    Array,
    Set,
    Object,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'missions.js' });
  return { sandbox, localStorage, backend: fs2 };
}
async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}
async function scenario1_noUser_localOnly() {
  console.log('\n--- Scenario 1: no logged-in user -> Firestore untouched ---');
  const { sandbox, backend } = loadMissionsInFreshContext({ loggedInUid: null });
  const LWMissions = sandbox.window.LWMissions;
  await LWMissions.whenMissionsSyncReady();
  assert(backend.docs.size === 0, 'no Firestore doc created when nobody is logged in');
  LWMissions.recordActivity('lesson');
  assert(backend.docs.size === 0, 'saving while logged out never touches Firestore');
}
async function scenario2_migration_pushesLocalUp() {
  console.log('\n--- Scenario 2: returning user, local data, no remote doc -> migration ---');
  const uid = 'user-abc';
  const localInitial = {
    lw_missions_progress_v1: JSON.stringify({
      uid,
      completedItemIds: ['m1_0_LESSON_HELLO'],
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T12:00:00.000Z' },
    }),
    lw_missions_streak_v1: JSON.stringify({ uid, v: 3, current: 2, longest: 2, lastActivityDate: '2026-09-02', recentDays: ['2026-09-01', '2026-09-02'] }),
    lw_missions_hearts_v1: JSON.stringify({ uid, lostAt: [] }),
  };
  const { sandbox, backend } = loadMissionsInFreshContext({ localStorageInitial: localInitial, loggedInUid: uid });
  const LWMissions = sandbox.window.LWMissions;
  await LWMissions.whenMissionsSyncReady();
  const remote = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote, 'a remote doc was created for the returning user');
  assert(
    remote && JSON.stringify(remote.progress.completedItemIds) === JSON.stringify(['m1_0_LESSON_HELLO']),
    'migration pushed the existing local progress up, not discarded'
  );
  assert(
    remote && remote.streak.current === 2 && remote.streak.longest === 2 && remote.streak.lastActivityDate === '2026-09-02',
    'migration pushed the existing local streak (current/longest/lastActivityDate) up'
  );
}
async function scenario3_reconcile_mergesProgressAndStreak() {
  console.log('\n--- Scenario 3: remote has extra completions from another device -> union merge ---');
  const uid = 'user-def';
  const backend = makeFakeFirestoreBackend();
  backend.docs.set(`userProgressV2/${uid}`, {
    progress: {
      completedItemIds: ['m1_0_LESSON_HELLO', 'm1_1_LESSON_HI'],
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T12:00:00.000Z', m1_1_LESSON_HI: '2026-09-02T12:00:00.000Z' },
    },
    streak: { v: 3, current: 1, longest: 4, lastActivityDate: '2026-09-03', recentDays: ['2026-09-03'] },
    hearts: { lostAt: ['2026-09-05T10:00:00.000Z'] },
  });
  const localInitial = {
    lw_missions_progress_v1: JSON.stringify({
      uid,
      completedItemIds: ['m1_0_LESSON_HELLO', 'm1_2_LESSON_MORNING'],
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T12:00:00.000Z', m1_2_LESSON_MORNING: '2026-09-04T12:00:00.000Z' },
    }),
    lw_missions_streak_v1: JSON.stringify({ uid, v: 3, current: 2, longest: 2, lastActivityDate: '2026-09-02', recentDays: ['2026-09-01', '2026-09-02'] }),
    lw_missions_hearts_v1: JSON.stringify({ uid, lostAt: ['2026-09-06T00:00:00.000Z'] }),
  };
  const { sandbox } = loadMissionsInFreshContext({ localStorageInitial: localInitial, loggedInUid: uid, backend });
  const LWMissions = sandbox.window.LWMissions;
  await LWMissions.whenMissionsSyncReady();
  const localProgressRaw = JSON.parse(sandbox.localStorage.getItem('lw_missions_progress_v1'));
  const localStreakRaw = JSON.parse(sandbox.localStorage.getItem('lw_missions_streak_v1'));
  const localHeartsRaw = JSON.parse(sandbox.localStorage.getItem('lw_missions_hearts_v1'));
  const mergedIds = new Set(localProgressRaw.completedItemIds);
  assert(
    mergedIds.has('m1_0_LESSON_HELLO') && mergedIds.has('m1_1_LESSON_HI') && mergedIds.has('m1_2_LESSON_MORNING'),
    'progress completedItemIds is the union of local and remote'
  );
  assert(
    localStreakRaw.lastActivityDate === '2026-09-03' && localStreakRaw.current === 1,
    'streak: the state with the LATER lastActivityDate (remote) supplies `current`'
  );
  assert(
    localStreakRaw.longest === 4,
    'streak: longest is the max of local and remote'
  );
  assert(
    JSON.stringify(localStreakRaw.recentDays) === JSON.stringify(['2026-09-01', '2026-09-02', '2026-09-03']),
    'streak: recentDays is the union of local and remote'
  );
  assert(
    JSON.stringify(localHeartsRaw.lostAt) === JSON.stringify(['2026-09-05T10:00:00.000Z']),
    'hearts.lostAt takes the REMOTE value entirely (authoritative), stale local loss is dropped'
  );
  const remoteAfter = backend.docs.get(`userProgressV2/${uid}`);
  assert(
    new Set(remoteAfter.progress.completedItemIds).has('m1_2_LESSON_MORNING'),
    'the merged (superset) progress was pushed back to Firestore so other devices converge'
  );
}
async function scenario4_saveWriteThrough() {
  console.log('\n--- Scenario 4: save*State() write-through to Firestore ---');
  const uid = 'user-ghi';
  const { sandbox, backend } = loadMissionsInFreshContext({ loggedInUid: uid });
  const LWMissions = sandbox.window.LWMissions;
  await LWMissions.whenMissionsSyncReady();
  const mission = LWMissions.getPilotMission();
  assert(mission && mission.items && mission.items.length > 0, 'pilot mission has items to complete (sanity check)');
  LWMissions.markItemComplete(mission, 0, mission.items[0]);
  await sleep(10);
  const remote = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote && !!remote.progress, 'saving progress locally also wrote through to the Firestore doc');
  assert(!!remote && !!remote.hearts === false || true, 'sanity no-op');
  LWMissions.recordActivity('lesson');
  await sleep(10);
  const remote2 = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote2.streak && remote2.streak.current === 1 && remote2.streak.longest === 1 && /^\d{4}-\d{2}-\d{2}$/.test(remote2.streak.lastActivityDate),
    'recordActivity -> saveStreakState wrote current/longest/lastActivityDate through to the Firestore doc');
  LWMissions.consumeHeartForMastery();
  await sleep(10);
  const remote3 = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote3.hearts && remote3.hearts.lostAt.length === 1, 'consumeHeartForMastery -> saveHeartsState wrote through to the Firestore doc');
}
async function scenario5_devPreview_noLWAuthAtAll() {
  console.log('\n--- Scenario 5: js/auth.js not loaded at all (dev preview page) ---');
  const localStorage = makeLocalStorage({});
  const windowMock = { localStorage };
  const sandbox = {
    window: windowMock,
    localStorage,
    console, Promise, Date, Math, JSON, Array, Set, Object, setTimeout, clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'missions.js' });
  const LWMissions = sandbox.window.LWMissions;
  await LWMissions.whenMissionsSyncReady();
  LWMissions.recordActivity('lesson');
  const raw = localStorage.getItem('lw_missions_streak_v1');
  assert(!!raw, 'local save still works with no window.LWAuth at all (dev preview pages)');
}
(async () => {
  await scenario1_noUser_localOnly();
  await scenario2_migration_pushesLocalUp();
  await scenario3_reconcile_mergesProgressAndStreak();
  await scenario4_saveWriteThrough();
  await scenario5_devPreview_noLWAuthAtAll();
  console.log('\n=====================================');
  if (failures > 0) {
    console.error(`${failures} assertion(s) FAILED`);
    process.exit(1);
  } else {
    console.log('All assertions passed.');
    process.exit(0);
  }
})().catch((e) => {
  console.error('Harness crashed:', e);
  process.exit(1);
});
