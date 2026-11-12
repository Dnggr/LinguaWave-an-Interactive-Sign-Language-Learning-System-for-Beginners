'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ZONES = [
  'UTC',
  'Asia/Manila',
  'Pacific/Kiritimati',
  'America/Los_Angeles',
  'Pacific/Pago_Pago',
  'Europe/London',
];

if (!process.env.__STREAK_TZ_CHILD) {
  let failed = false;
  for (const tz of ZONES) {
    const r = spawnSync(process.execPath, [__filename], {
      env: { ...process.env, TZ: tz, __STREAK_TZ_CHILD: '1' },
      encoding: 'utf8',
    });
    process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0) failed = true;
  }
  console.log(failed ? '\nSTREAK TIMEZONE TESTS FAILED' : '\nAll streak timezone tests passed in every zone.');
  process.exit(failed ? 1 : 0);
}

const TZ = process.env.TZ;
const SOURCE = fs.readFileSync(path.join(__dirname, 'missions.js'), 'utf8');
const RealDate = Date;

let failures = 0;
function assert(cond, msg) {
  if (!cond) { failures++; console.error(`FAIL [${TZ}]: ${msg}`); }
  else console.log(`ok [${TZ}]: ${msg}`);
}

function makeEnv({ localStorageInitial = {} } = {}) {
  let nowMs = RealDate.now();
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(nowMs); else super(...a); }
    static now() { return nowMs; }
  }
  const store = { ...localStorageInitial };
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const windowMock = { localStorage };
  windowMock.window = windowMock;
  const sandbox = { window: windowMock, localStorage, console, Promise, Date: FakeDate, Math, JSON, Array, Set, Object, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'missions.js' });
  return {
    L: sandbox.window.LWMissions,
    sandbox,
    store,
    setNow: (y, m, d, hh = 12, mm = 0) => { nowMs = new RealDate(y, m - 1, d, hh, mm).getTime(); },
  };
}

const key = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const act = (L, type = 'lesson') => L.recordActivity(type);
const raw = (store) => JSON.parse(store.lw_missions_streak_v1);

{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 6, 7); act(L); }
  const s = L.getStreakSummary();
  assert(s.currentStreak === 5 && s.longestStreak === 5, `5 consecutive early-morning days -> streak 5 (got ${s.currentStreak}/${s.longestStreak})`);
}

{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 23, 50); act(L); }
  assert(L.getStreakSummary().currentStreak === 5, '5 consecutive late-night days -> streak 5');
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 1, 23, 50); act(L);
  setNow(2026, 9, 2, 0, 10);  act(L);
  assert(L.getStreakSummary().currentStreak === 2, '20 minutes apart across midnight -> new calendar day -> streak 2');
  const e2 = makeEnv();
  e2.setNow(2026, 9, 2, 0, 10);  act(e2.L);
  e2.setNow(2026, 9, 2, 23, 50); act(e2.L);
  assert(e2.L.getStreakSummary().currentStreak === 1, '23h40m apart on the SAME calendar day -> still streak 1');
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0);
  const r1 = act(L, 'lesson'), r2 = act(L, 'recall'), r3 = act(L, 'practice'), r4 = act(L, 'camera_practice');
  assert(r1.counted === true && r2.counted === false && r3.counted === false && r4.counted === false, 'only the first activity of a day is "counted"');
  const s = L.getStreakSummary();
  assert(s.currentStreak === 1 && s.longestStreak === 1, 'four activities the same day -> streak 1');
  setNow(2026, 9, 11, 9, 0); act(L); act(L); act(L);
  assert(L.getStreakSummary().currentStreak === 2, 'next day, three activities -> streak 2 (not 5)');
}

['lesson', 'mission', 'mastery_quiz', 'practice', 'recall', 'review', 'camera_practice', 'game'].forEach((t) => {
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0);
  assert(act(L, t).counted === true && L.getStreakSummary().currentStreak === 1, `qualifying type "${t}" starts a streak`);
});
['login', 'page_view', 'dictionary', 'browse', '', undefined, null].forEach((t) => {
  const { L, setNow, store } = makeEnv();
  setNow(2026, 9, 10, 9, 0);
  const r = L.recordActivity(t);
  assert(r.counted === false && L.getStreakSummary().currentStreak === 0 && !store.lw_missions_streak_v1, `non-qualifying type ${JSON.stringify(t)} never counts`);
});

{
  const { L, setNow } = makeEnv();
  setNow(2026, 10, 3, 10, 0); act(L, 'lesson');
  setNow(2026, 10, 4, 10, 0); act(L, 'review');
  setNow(2026, 10, 5, 10, 0);
  assert(L.getStreakSummary().currentStreak === 2 && L.getStreakSummary().practicedToday === false, 'before the game: 2, not practiced today');
  assert(act(L, 'game').counted === true, 'a counted game run is the first activity of the day');
  const s = L.getStreakSummary();
  assert(s.currentStreak === 3 && s.practicedToday === true && s.recentDays.includes('2026-10-05'), `game-only day -> streak 3 and today in recentDays (got ${s.currentStreak})`);
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0);
  const m = L.getPilotMission();
  L.markItemComplete(m, 0, m.items[0]);
  L.markMissionComplete(m);
  assert(L.getStreakSummary().currentStreak === 0, 'markItemComplete / markMissionComplete alone do not extend the streak');
}

{
  const { L, setNow } = makeEnv();
  [21, 22, 23].forEach((d) => { setNow(2026, 9, d, 8, 0); act(L); });
  setNow(2026, 9, 26, 8, 0);
  assert(L.getStreakSummary().currentStreak === 0, 'after two missed days in a row the streak reads 0');
  assert(L.getStreakSummary().longestStreak === 3, 'longest streak is kept after the reset');
  const r = act(L);
  const s2 = L.getStreakSummary();
  assert(r.restored === false && s2.currentStreak === 1 && s2.longestStreak === 3, `returning after 2 missed days restarts at 1, not restored (got ${s2.currentStreak}/${s2.longestStreak})`);
}

{
  const { L, setNow } = makeEnv();
  [21, 22, 23].forEach((d) => { setNow(2026, 9, d, 8, 0); act(L); });
  setNow(2026, 9, 25, 8, 0);
  let s2 = L.getStreakSummary();
  assert(s2.currentStreak === 3 && s2.atRisk === true && s2.practicedToday === false, 'one missed day: streak still alive (3) and flagged atRisk');
  const r = act(L);
  s2 = L.getStreakSummary();
  assert(r.counted === true && r.restored === true && s2.currentStreak === 4 && s2.restoredToday === true, `activity after one missed day restores and counts: 3 -> 4 (got ${s2.currentStreak})`);
  assert(act(L).counted === false && L.getStreakSummary().currentStreak === 4, 'a second activity the same day does not increase it again');
  setNow(2026, 9, 26, 8, 0);
  s2 = L.getStreakSummary();
  assert(s2.restoredToday === false && s2.atRisk === false && s2.currentStreak === 4, 'next day: no longer "restored today", streak intact');
  act(L);
  assert(L.getStreakSummary().currentStreak === 5, 'streak keeps growing normally after a restore');
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 29, 9, 0); act(L);
  setNow(2026, 9, 30, 9, 0);
  assert(L.getStreakSummary().currentStreak === 1, 'Wed (no activity yet): Tue streak still live');
  setNow(2026, 10, 1, 9, 0);  act(L);
  assert(L.getStreakSummary().currentStreak === 2, 'Thu after a missed Wed: restored, 2');
  setNow(2026, 10, 2, 9, 0);  act(L);
  const s2 = L.getStreakSummary();
  assert(s2.currentStreak === 3 && s2.longestStreak === 3, `Tue, Thu, Fri -> streak 3 (got ${s2.currentStreak}/${s2.longestStreak})`);
}

{
  const { L, setNow } = makeEnv();
  [1, 3, 5, 7, 9].forEach((d) => { setNow(2026, 9, d, 9, 0); act(L); });
  assert(L.getStreakSummary().currentStreak === 5, 'every-other-day practice keeps a streak of 5 active days');
  setNow(2026, 9, 12, 9, 0);
  assert(L.getStreakSummary().currentStreak === 0, 'two missed days after that: reset');
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 27, 6, 7); act(L);
  setNow(2026, 9, 28, 6, 7); act(L);
  setNow(2026, 9, 29, 6, 7);
  let s2 = L.getStreakSummary();
  assert(s2.currentStreak === 2 && s2.practicedToday === false && s2.atRisk === false, 'streak from yesterday is live this morning, practicedToday false, not at risk');
  setNow(2026, 9, 30, 6, 7);
  s2 = L.getStreakSummary();
  assert(s2.currentStreak === 2 && s2.atRisk === true, 'one missed day: still 2, flagged atRisk');
  setNow(2026, 10, 1, 6, 7);
  assert(L.getStreakSummary().currentStreak === 0, 'two missed days in a row: streak is 0');
}

{
  const { L, setNow, store } = makeEnv();
  setNow(2026, 9, 10, 9, 0); act(L);
  setNow(2026, 9, 11, 9, 0); act(L);
  const r = raw(store);
  assert(r.current === 2 && r.longest === 2 && r.lastActivityDate === key(2026, 9, 11) && r.v === 3 && r.lastRestoredDate === null,
    `saved state has current/longest/lastActivityDate (got ${JSON.stringify(r)})`);
  assert(JSON.stringify(r.recentDays) === JSON.stringify([key(2026, 9, 10), key(2026, 9, 11)]), 'recentDays lists the active local dates');
}

{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0); act(L);
  setNow(2026, 9, 11, 9, 0); act(L);
  setNow(2026, 9, 10, 20, 0);
  const r = act(L);
  const s = L.getStreakSummary();
  assert(r.counted === false && s.currentStreak === 2, 'clock earlier than lastActivityDate: not counted again, streak intact');
}

[[2026, 3, 6, 5], [2026, 3, 27, 4], [2026, 10, 30, 4], [2026, 11, 1, 3]].forEach(([y, m, d0, n]) => {
  const { L, setNow } = makeEnv();
  for (let i = 0; i < n; i++) {
    const dt = new RealDate(y, m - 1, d0 + i);
    setNow(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), 12, 0);
    act(L);
  }
  const s = L.getStreakSummary();
  assert(s.currentStreak === n, `${n} consecutive days from ${key(y, m, d0)} chain across DST (got ${s.currentStreak})`);
});

{
  const mon = new RealDate(2026, 8, 28, 10, 0).toISOString();
  const tue = new RealDate(2026, 8, 29, 6, 7).toISOString();
  const legacyDays = [key(2026, 9, 28), key(2026, 9, 29), key(2026, 9, 30)];
  const { L, store, setNow } = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: ['a', 'b'], completedAt: { a: mon, b: tue } }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, days: legacyDays, dayKeys: 'local-v2', forgivenessUsedThisWeek: 0 }),
    },
  });
  setNow(2026, 9, 29, 12, 0);
  const s = L.getStreakSummary();
  assert(s.currentStreak === 2 && s.longestStreak === 2 && s.lastActivityDate === key(2026, 9, 29),
    `legacy data is rebuilt from real completions: Mon+Tue -> 2, the replay-only Wed is dropped (got ${s.currentStreak}/${s.longestStreak}/${s.lastActivityDate})`);
  const r = raw(store);
  assert(r.v === 3 && r.current === 2 && r.lastActivityDate === key(2026, 9, 29) && !('days' in r), 'migration persisted the new shape');
  L.getStreakSummary();
  assert(raw(store).current === 2, 'migration is idempotent');
}

{
  const { L, store, setNow } = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: [], completedAt: {} }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, v: 2, current: 2, longest: 2, lastActivityDate: key(2026, 10, 2), recentDays: [key(2026, 9, 29), key(2026, 10, 1), key(2026, 10, 2)] }),
    },
  });
  setNow(2026, 10, 2, 22, 37);
  const s2 = L.getStreakSummary();
  assert(s2.currentStreak === 3 && s2.longestStreak === 3 && s2.practicedToday === true, `v2 state Tue/Thu/Fri is re-counted to 3 (got ${s2.currentStreak}/${s2.longestStreak})`);
  assert(raw(store).v === 3 && raw(store).current === 3, 'migration persisted as v3');
  const e2 = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: [], completedAt: {} }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, v: 2, current: 40, longest: 40, lastActivityDate: key(2026, 10, 2), recentDays: [key(2026, 10, 1), key(2026, 10, 2)] }),
    },
  });
  e2.setNow(2026, 10, 2, 12, 0);
  assert(e2.L.getStreakSummary().currentStreak === 40, 'a long v2 streak is never lowered by the migration');
}

{
  const mk = (state) => makeEnv({ localStorageInitial: {
    lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: [], completedAt: {} }),
    lw_missions_streak_v1: JSON.stringify({ uid: null, ...state }) } });
  const a = mk({ v: 3, current: 2, longest: 2, lastActivityDate: key(2026, 10, 2), lastRestoredDate: null, recentDays: [key(2026, 9, 29), key(2026, 10, 1), key(2026, 10, 2)] });
  a.setNow(2026, 10, 2, 22, 37);
  assert(a.L.getStreakSummary().currentStreak === 3, 'v3 save stored short (2) with Tue/Thu/Fri heals to 3');
  const b = mk({ v: 3, current: 1, longest: 3, lastActivityDate: key(2026, 10, 2), lastRestoredDate: null, recentDays: [key(2026, 9, 25), key(2026, 9, 26), key(2026, 9, 27), key(2026, 10, 2)] });
  b.setNow(2026, 10, 2, 22, 37);
  assert(b.L.getStreakSummary().currentStreak === 1, 'a real reset (gap of 4 days) stays at 1 - not "healed"');
}

{
  const { L, setNow } = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: [], completedAt: {} }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, days: [key(2026, 9, 27), key(2026, 9, 28)], forgivenessUsedThisWeek: 0 }),
    },
  });
  setNow(2026, 9, 28, 12, 0);
  assert(L.getStreakSummary().currentStreak === 2, 'timestamp-less legacy days are preserved');
}

{
  const { L, setNow, sandbox } = makeEnv();
  const timers = [];
  sandbox.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  sandbox.clearTimeout = () => {};
  let visHandler = null;
  sandbox.document = { hidden: false, addEventListener: (ev, fn) => { if (ev === 'visibilitychange') visHandler = fn; }, removeEventListener() {} };
  sandbox.window.addEventListener = () => {};
  const calls = [];
  setNow(2026, 9, 10, 23, 59);
  const stop = L.onLocalDayChange((d) => calls.push(d));
  assert(timers.length === 1 && timers[0].ms > 0 && timers[0].ms <= 61 * 1000, `timer is armed for just past local midnight (got ${timers[0] && timers[0].ms}ms)`);
  visHandler();
  assert(calls.length === 0, 'tab becoming visible on the same date does not fire the callback');
  setNow(2026, 9, 11, 0, 0);
  timers[0].fn();
  assert(calls.length === 1 && calls[0] === key(2026, 9, 11), 'callback fires once with the new local date after midnight');
  visHandler();
  assert(calls.length === 1, 'no repeat firing for the same date');
  stop();
}

if (failures) { console.error(`${failures} failure(s) in ${TZ}`); process.exit(1); }
console.log(`all passed in ${TZ}`);
