'use strict';
/**
 * Harness for LinguaWaveV2/js/data-v2.js's new cross-device Firestore
 * sync. No real browser/Firestore is available in this environment,
 * so this mocks:
 *   - localStorage (plain in-memory object store)
 *   - window.LWAuth (db/doc/getDoc/setDoc/getCurrentUser/whenAuthReady)
 *   - a fake Firestore "backend" (a Map keyed by `${collection}/${uid}`)
 *
 * It loads the real, unmodified data-v2.js source into a fresh vm
 * context per scenario (so hydration's one-shot IIFE call re-runs
 * cleanly each time) and exercises:
 *   1. No user logged in -> Firestore never touched, local-only.
 *   2. Logged-in user, no remote doc yet, real local data exists ->
 *      migration pushes local data UP to Firestore.
 *   3. Logged-in user, remote doc exists with additional completions
 *      from another device -> union-merge reconciliation.
 *   4. Streak forgivenessUsedThisWeek / hearts lostAt -> remote wins.
 *   5. save*State() write-through -> Firestore doc field updated.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE_PATH = path.join(__dirname, 'data-v2.js');

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

// Fake Firestore backend: Map<"collection/uid", docData>
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

function loadDataV2InFreshContext({ localStorageInitial = {}, loggedInUid = null, backend = null }) {
  const localStorage = makeLocalStorage(localStorageInitial);
  const fs2 = backend || makeFakeFirestoreBackend();

  const LWAuth = loggedInUid
    ? {
        db: fs2.db,
        doc: fs2.doc,
        getDoc: fs2.getDoc,
        setDoc: fs2.setDoc,
        getCurrentUser: () => ({ uid: loggedInUid }),
        whenAuthReady: async () => {},
      }
    : {
        // LWAuth present but nobody logged in
        db: fs2.db,
        doc: fs2.doc,
        getDoc: fs2.getDoc,
        setDoc: fs2.setDoc,
        getCurrentUser: () => null,
        whenAuthReady: async () => {},
      };

  const windowMock = {
    localStorage,
    LWAuth,
    LWData: undefined, // not needed for the stores under test
  };
  windowMock.window = windowMock; // some code paths might reference window.window; harmless

  const sandbox = {
    window: windowMock,
    localStorage, // data-v2.js calls bare localStorage.getItem/setItem, not window.localStorage
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
  vm.runInContext(SOURCE, sandbox, { filename: 'data-v2.js' });

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
  const { sandbox, backend } = loadDataV2InFreshContext({ loggedInUid: null });
  const LWDataV2 = sandbox.window.LWDataV2;
  await LWDataV2.whenDataV2SyncReady();

  assert(backend.docs.size === 0, 'no Firestore doc created when nobody is logged in');

  // Exercise a save while logged out -> still local-only, no throw.
  LWDataV2.recordActivityToday();
  assert(backend.docs.size === 0, 'saving while logged out never touches Firestore');
}

async function scenario2_migration_pushesLocalUp() {
  console.log('\n--- Scenario 2: returning user, local data, no remote doc -> migration ---');
  const uid = 'user-abc';
  const localInitial = {
    lw_datav2_progress_v1: JSON.stringify({
      uid,
      completedItemIds: ['m1_0_LESSON_HELLO'],
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T00:00:00.000Z' },
    }),
    lw_datav2_streak_v1: JSON.stringify({ uid, days: ['2026-09-01', '2026-09-02'], forgivenessUsedThisWeek: 0 }),
    lw_datav2_hearts_v1: JSON.stringify({ uid, lostAt: [] }),
  };
  const { sandbox, backend } = loadDataV2InFreshContext({ localStorageInitial: localInitial, loggedInUid: uid });
  const LWDataV2 = sandbox.window.LWDataV2;
  await LWDataV2.whenDataV2SyncReady();

  const remote = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote, 'a remote doc was created for the returning user');
  assert(
    remote && JSON.stringify(remote.progress.completedItemIds) === JSON.stringify(['m1_0_LESSON_HELLO']),
    'migration pushed the existing local progress up, not discarded'
  );
  assert(
    remote && JSON.stringify(remote.streak.days) === JSON.stringify(['2026-09-01', '2026-09-02']),
    'migration pushed the existing local streak days up'
  );
}

async function scenario3_reconcile_unionMergesProgressAndStreakDays() {
  console.log('\n--- Scenario 3: remote has extra completions from another device -> union merge ---');
  const uid = 'user-def';
  const backend = makeFakeFirestoreBackend();
  backend.docs.set(`userProgressV2/${uid}`, {
    progress: {
      completedItemIds: ['m1_0_LESSON_HELLO', 'm1_1_LESSON_HI'],
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T00:00:00.000Z', m1_1_LESSON_HI: '2026-09-02T00:00:00.000Z' },
    },
    streak: { days: ['2026-09-01', '2026-09-03'], forgivenessUsedThisWeek: 1 },
    hearts: { lostAt: ['2026-09-05T10:00:00.000Z'] },
  });

  const localInitial = {
    lw_datav2_progress_v1: JSON.stringify({
      uid,
      completedItemIds: ['m1_0_LESSON_HELLO', 'm1_2_LESSON_MORNING'], // one overlapping, one local-only
      completedAt: { m1_0_LESSON_HELLO: '2026-09-01T00:00:00.000Z', m1_2_LESSON_MORNING: '2026-09-04T00:00:00.000Z' },
    }),
    lw_datav2_streak_v1: JSON.stringify({ uid, days: ['2026-09-01', '2026-09-02'], forgivenessUsedThisWeek: 0 }),
    lw_datav2_hearts_v1: JSON.stringify({ uid, lostAt: ['2026-09-06T00:00:00.000Z'] }), // stale local-only loss
  };

  const { sandbox } = loadDataV2InFreshContext({ localStorageInitial: localInitial, loggedInUid: uid, backend });
  const LWDataV2 = sandbox.window.LWDataV2;
  await LWDataV2.whenDataV2SyncReady();

  const localProgressRaw = JSON.parse(sandbox.localStorage.getItem('lw_datav2_progress_v1'));
  const localStreakRaw = JSON.parse(sandbox.localStorage.getItem('lw_datav2_streak_v1'));
  const localHeartsRaw = JSON.parse(sandbox.localStorage.getItem('lw_datav2_hearts_v1'));

  const mergedIds = new Set(localProgressRaw.completedItemIds);
  assert(
    mergedIds.has('m1_0_LESSON_HELLO') && mergedIds.has('m1_1_LESSON_HI') && mergedIds.has('m1_2_LESSON_MORNING'),
    'progress completedItemIds is the union of local and remote'
  );
  const mergedDays = new Set(localStreakRaw.days);
  assert(
    mergedDays.has('2026-09-01') && mergedDays.has('2026-09-02') && mergedDays.has('2026-09-03'),
    'streak days is the union of local and remote'
  );
  assert(
    localStreakRaw.forgivenessUsedThisWeek === 1,
    'forgivenessUsedThisWeek takes the REMOTE value (authoritative), not local\'s stale 0'
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
  const { sandbox, backend } = loadDataV2InFreshContext({ loggedInUid: uid });
  const LWDataV2 = sandbox.window.LWDataV2;
  await LWDataV2.whenDataV2SyncReady();

  // getPilotMission's items include LESSON items for essentials_greetings.
  const mission = LWDataV2.getPilotMission();
  assert(mission && mission.items && mission.items.length > 0, 'pilot mission has items to complete (sanity check)');
  LWDataV2.markItemComplete(mission, 0, mission.items[0]);

  // markItemComplete -> saveProgressState -> pushFieldToFirestoreV2 is
  // fire-and-forget (a Promise not awaited internally); give the
  // microtask queue a tick to flush it before asserting.
  await sleep(10);

  const remote = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote && !!remote.progress, 'saving progress locally also wrote through to the Firestore doc');
  assert(!!remote && !!remote.hearts === false || true, 'sanity no-op'); // placeholder to keep structure consistent

  LWDataV2.recordActivityToday();
  await sleep(10);
  const remote2 = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote2.streak, 'recordActivityToday -> saveStreakState wrote through to the Firestore doc');

  LWDataV2.consumeHeartForMastery();
  await sleep(10);
  const remote3 = backend.docs.get(`userProgressV2/${uid}`);
  assert(!!remote3.hearts && remote3.hearts.lostAt.length === 1, 'consumeHeartForMastery -> saveHeartsState wrote through to the Firestore doc');
}

async function scenario5_devPreview_noLWAuthAtAll() {
  console.log('\n--- Scenario 5: js/auth.js not loaded at all (dev preview page) ---');
  const localStorage = makeLocalStorage({});
  const windowMock = { localStorage }; // no LWAuth property whatsoever
  const sandbox = {
    window: windowMock,
    localStorage,
    console, Promise, Date, Math, JSON, Array, Set, Object, setTimeout, clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'data-v2.js' });
  const LWDataV2 = sandbox.window.LWDataV2;
  await LWDataV2.whenDataV2SyncReady();
  // Should not throw, and local save should still work fine.
  LWDataV2.recordActivityToday();
  const raw = localStorage.getItem('lw_datav2_streak_v1');
  assert(!!raw, 'local save still works with no window.LWAuth at all (dev preview pages)');
}

(async () => {
  await scenario1_noUser_localOnly();
  await scenario2_migration_pushesLocalUp();
  await scenario3_reconcile_unionMergesProgressAndStreakDays();
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
