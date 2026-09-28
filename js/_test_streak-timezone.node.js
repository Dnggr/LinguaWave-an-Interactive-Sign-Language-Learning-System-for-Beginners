'use strict';
/**
 * Regression test for the Day Streak timezone bug (js/missions.js).
 *
 * THE BUG: streak day keys were UTC dates (`toISOString().slice(0,10)`)
 * and the day-stepping helpers also went through toISOString(). For
 * anyone ahead of UTC (e.g. the Philippines, UTC+8):
 *   - activity before 8 AM local was filed under the PREVIOUS day, so
 *     two real days could collapse into one, and
 *   - dayBefore()/"next day" never matched, so a streak could not grow
 *     past 1 day.
 *
 * Node fixes the process timezone at startup, so this file re-runs
 * itself once per timezone in a child process (TZ=...), and each child
 * runs the same TZ-independent scenarios. Run:  node js/_test_streak-timezone.node.js
 *
 * Time is faked with a Date subclass whose no-arg constructor returns a
 * controllable "now"; explicit-argument construction is untouched.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ZONES = [
  'UTC',
  'Asia/Manila',              // UTC+8 — the reported bug
  'Pacific/Kiritimati',       // UTC+14 — the extreme
  'America/Los_Angeles',      // behind UTC, has DST
  'Pacific/Pago_Pago',        // UTC-11 — the other extreme
  'Europe/London',            // DST around the same UTC offset
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

// ───────────────────────── child: one timezone ─────────────────────────
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
  const windowMock = { localStorage };          // no LWAuth: local-only, uid = null
  windowMock.window = windowMock;
  const sandbox = { window: windowMock, localStorage, console, Promise, Date: FakeDate, Math, JSON, Array, Set, Object, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'missions.js' });
  return {
    L: sandbox.window.LWMissions,
    store,
    setNow: (y, m, d, hh = 12, mm = 0) => { nowMs = new RealDate(y, m - 1, d, hh, mm).getTime(); },
  };
}

const key = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// 1. Consecutive days, activity in the EARLY MORNING local time (06:07) —
//    the exact window that broke UTC+ zones. 5 days in a row -> streak 5.
{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 6, 7); L.recordActivityToday(); }
  const s = L.getStreakSummary();
  assert(s.currentStreak === 5 && s.longestStreak === 5, `5 consecutive early-morning days -> streak 5 (got ${s.currentStreak}/${s.longestStreak})`);
}

// 2. Late-night activity (23:50) on consecutive days — the mirror case
//    for zones behind UTC.
{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 23, 50); L.recordActivityToday(); }
  const s = L.getStreakSummary();
  assert(s.currentStreak === 5, `5 consecutive late-night days -> streak 5 (got ${s.currentStreak})`);
}

// 3. A gap breaks the current streak but not the longest one.
{
  const { L, setNow } = makeEnv();
  [21, 22, 23, 25, 26].forEach((d) => { setNow(2026, 9, d, 8, 0); L.recordActivityToday(); });
  setNow(2026, 9, 26, 20, 0);
  const s = L.getStreakSummary();
  assert(s.currentStreak === 2 && s.longestStreak === 3, `gap on the 24th -> current 2, longest 3 (got ${s.currentStreak}/${s.longestStreak})`);
}

// 4. Yesterday still counts as "live" until today ends; two days ago does not.
{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 27, 6, 7); L.recordActivityToday();
  setNow(2026, 9, 28, 6, 7); L.recordActivityToday();
  setNow(2026, 9, 29, 6, 7);
  assert(L.getStreakSummary().currentStreak === 2, 'streak from yesterday is still live this morning');
  setNow(2026, 9, 30, 6, 7);
  assert(L.getStreakSummary().currentStreak === 0, 'streak is 0 once a full day has been missed');
}

// 5. DST boundaries (spring-forward, fall-back, EU + US): consecutive
//    calendar days must still chain, even though a "day" is 23 or 25 hours.
[[2026, 3, 6, 5], [2026, 3, 27, 4], [2026, 10, 30, 4], [2026, 11, 1, 3]].forEach(([y, m, d0, n]) => {
  const { L, setNow } = makeEnv();
  // walk n consecutive calendar days starting at d0 (Date rolls over month ends itself)
  for (let i = 0; i < n; i++) {
    const dt = new RealDate(y, m - 1, d0 + i);
    setNow(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), 12, 0);
    L.recordActivityToday();
  }
  const s = L.getStreakSummary();
  assert(s.currentStreak === n, `${n} consecutive days from ${key(y, m, d0)} chain across DST (got ${s.currentStreak})`);
});

// 6. THE REPORTED CASE: legacy saved data. Monday 10:00 and Tuesday 06:07
//    local, both stored under UTC keys (in UTC+8 they collapsed into one
//    day -> "1d"). After migration the streak must be 2 and the saved
//    days must be the LOCAL days.
{
  const mon = new RealDate(2026, 8, 28, 10, 0).toISOString();
  const tue = new RealDate(2026, 8, 29, 6, 7).toISOString();
  const legacyDays = Array.from(new Set([mon.slice(0, 10), tue.slice(0, 10)])).sort();
  const { L, store, setNow } = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: ['a', 'b'], completedAt: { a: mon, b: tue } }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, days: legacyDays, forgivenessUsedThisWeek: 0 }), // no dayKeys marker = legacy
    },
  });
  setNow(2026, 9, 29, 6, 30);
  const s = L.getStreakSummary();
  assert(s.currentStreak === 2 && s.longestStreak === 2, `legacy UTC-keyed data migrates: Mon+Tue -> streak 2 (got ${s.currentStreak}/${s.longestStreak})`);
  const saved = JSON.parse(store.lw_missions_streak_v1);
  assert(JSON.stringify(saved.days) === JSON.stringify(['2026-09-28', '2026-09-29']) && saved.dayKeys === 'local-v2',
    `migration persisted local day keys + marker (got ${JSON.stringify(saved.days)}, ${saved.dayKeys})`);
  // Migration is idempotent.
  L.getStreakSummary();
  assert(JSON.stringify(JSON.parse(store.lw_missions_streak_v1).days) === JSON.stringify(['2026-09-28', '2026-09-29']), 'migration is idempotent');
}

// 7. Legacy days that NO timestamp explains (activity from before
//    completedAt existed) are kept, not thrown away.
{
  const { L, setNow } = makeEnv({
    localStorageInitial: {
      lw_missions_progress_v1: JSON.stringify({ uid: null, completedItemIds: [], completedAt: {} }),
      lw_missions_streak_v1: JSON.stringify({ uid: null, days: ['2026-09-27', '2026-09-28'], forgivenessUsedThisWeek: 0 }),
    },
  });
  setNow(2026, 9, 28, 12, 0);
  assert(L.getStreakSummary().currentStreak === 2, 'unexplained legacy days are preserved as-is');
}

if (failures) { console.error(`${failures} failure(s) in ${TZ}`); process.exit(1); }
console.log(`all passed in ${TZ}`);
