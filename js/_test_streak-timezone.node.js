'use strict';
/**
 * Tests for the Day Streak rules and timezone handling (js/missions.js).
 *
 * RULES UNDER TEST (see the "Day Streak" block in missions.js):
 *   - calendar days in the learner's LOCAL timezone, never 24h windows / UTC
 *   - only recordActivity(<qualifying type>) counts; markItemComplete() alone does not
 *   - 2nd activity the same day changes nothing; yesterday -> +1
 *   - GRACE: ONE missed day is forgiven (counts as a restored streak), TWO missed
 *     days in a row reset it; the streak counts active days, not calendar days
 *   - state = { current, longest, lastActivityDate, lastRestoredDate, recentDays }
 *   - legacy `{ days }` saves are migrated from real completion timestamps
 *
 * HISTORY: the old streak keyed days by UTC (`toISOString().slice(0,10)`), which
 * broke anyone ahead of UTC (e.g. the Philippines, UTC+8). That is why every
 * scenario runs in several timezones.
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
    sandbox,
    store,
    setNow: (y, m, d, hh = 12, mm = 0) => { nowMs = new RealDate(y, m - 1, d, hh, mm).getTime(); },
  };
}

const key = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const act = (L, type = 'lesson') => L.recordActivity(type);
const raw = (store) => JSON.parse(store.lw_missions_streak_v1);

// 1. Consecutive days, activity in the EARLY MORNING local time (06:07) -
//    the exact window that broke UTC+ zones. 5 days in a row -> streak 5.
{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 6, 7); act(L); }
  const s = L.getStreakSummary();
  assert(s.currentStreak === 5 && s.longestStreak === 5, `5 consecutive early-morning days -> streak 5 (got ${s.currentStreak}/${s.longestStreak})`);
}

// 2. Late-night activity (23:50) on consecutive days - the mirror case.
{
  const { L, setNow } = makeEnv();
  for (let d = 25; d <= 29; d++) { setNow(2026, 9, d, 23, 50); act(L); }
  assert(L.getStreakSummary().currentStreak === 5, '5 consecutive late-night days -> streak 5');
}

// 3. CALENDAR days, not 24h periods: 23:50 on the 1st then 00:10 on the 2nd is
//    only 20 minutes apart but is a NEW day -> 2. And 00:10 -> 23:50 the SAME
//    day (23h40m apart) must stay 1.
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

// 4. Several activities on the same day count as ONE streak day, and the
//    first one reports counted:true while the rest report counted:false.
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

// 5. Every qualifying type works; unknown / non-learning types are ignored.
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

// 5b. A day with ONLY a counted game run extends the streak (Sat lesson, Sun lesson, Mon game-only -> 3), and it
//     appears in recentDays so the Progress strip and the Profile heatmap can show it.
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

// 6. markItemComplete() by itself (replays, bridge, bulk mission marking) must
//    NOT touch the streak any more.
{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0);
  const m = L.getPilotMission();
  L.markItemComplete(m, 0, m.items[0]);
  L.markMissionComplete(m);
  assert(L.getStreakSummary().currentStreak === 0, 'markItemComplete / markMissionComplete alone do not extend the streak');
}

// 7. TWO missed days in a row reset: current -> 1 on return, longest kept.
{
  const { L, setNow } = makeEnv();
  [21, 22, 23].forEach((d) => { setNow(2026, 9, d, 8, 0); act(L); });
  setNow(2026, 9, 26, 8, 0); // the 24th AND 25th were missed
  assert(L.getStreakSummary().currentStreak === 0, 'after two missed days in a row the streak reads 0');
  assert(L.getStreakSummary().longestStreak === 3, 'longest streak is kept after the reset');
  const r = act(L);
  const s2 = L.getStreakSummary();
  assert(r.restored === false && s2.currentStreak === 1 && s2.longestStreak === 3, `returning after 2 missed days restarts at 1, not restored (got ${s2.currentStreak}/${s2.longestStreak})`);
}

// 7b. ONE missed day is forgiven: the next activity restores the streak and
//     keeps counting (the screenshot rule).
{
  const { L, setNow } = makeEnv();
  [21, 22, 23].forEach((d) => { setNow(2026, 9, d, 8, 0); act(L); });
  setNow(2026, 9, 25, 8, 0); // only the 24th was missed
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

// 7c. THE SCREENSHOT EXAMPLE: Mon no, Tue yes, Wed no, Thu yes, Fri yes -> 3.
{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 29, 9, 0); act(L);            // Tue (Mon 28th: nothing)
  setNow(2026, 9, 30, 9, 0);                    // Wed: nothing
  assert(L.getStreakSummary().currentStreak === 1, 'Wed (no activity yet): Tue streak still live');
  setNow(2026, 10, 1, 9, 0);  act(L);           // Thu
  assert(L.getStreakSummary().currentStreak === 2, 'Thu after a missed Wed: restored, 2');
  setNow(2026, 10, 2, 9, 0);  act(L);           // Fri
  const s2 = L.getStreakSummary();
  assert(s2.currentStreak === 3 && s2.longestStreak === 3, `Tue, Thu, Fri -> streak 3 (got ${s2.currentStreak}/${s2.longestStreak})`);
}

// 7d. Alternating pattern forever survives (every other day); a 2-day hole kills it.
{
  const { L, setNow } = makeEnv();
  [1, 3, 5, 7, 9].forEach((d) => { setNow(2026, 9, d, 9, 0); act(L); });
  assert(L.getStreakSummary().currentStreak === 5, 'every-other-day practice keeps a streak of 5 active days');
  setNow(2026, 9, 12, 9, 0); // 10th and 11th missed
  assert(L.getStreakSummary().currentStreak === 0, 'two missed days after that: reset');
}

// 8. Liveness window: last active the 28th. 29th and 30th still live (the 30th is
//    "at risk"), the 1st (two full days missed) is not.
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

// 9. Stored shape: exactly current / longest / lastActivityDate (+ recentDays).
{
  const { L, setNow, store } = makeEnv();
  setNow(2026, 9, 10, 9, 0); act(L);
  setNow(2026, 9, 11, 9, 0); act(L);
  const r = raw(store);
  assert(r.current === 2 && r.longest === 2 && r.lastActivityDate === key(2026, 9, 11) && r.v === 3 && r.lastRestoredDate === null,
    `saved state has current/longest/lastActivityDate (got ${JSON.stringify(r)})`);
  assert(JSON.stringify(r.recentDays) === JSON.stringify([key(2026, 9, 10), key(2026, 9, 11)]), 'recentDays lists the active local dates');
}

// 10. Clock reads EARLIER than lastActivityDate (travel west / clock change):
//     no reset, no double count.
{
  const { L, setNow } = makeEnv();
  setNow(2026, 9, 10, 9, 0); act(L);
  setNow(2026, 9, 11, 9, 0); act(L);
  setNow(2026, 9, 10, 20, 0); // clock went back a day
  const r = act(L);
  const s = L.getStreakSummary();
  assert(r.counted === false && s.currentStreak === 2, 'clock earlier than lastActivityDate: not counted again, streak intact');
}

// 11. DST boundaries (spring-forward, fall-back, EU + US): consecutive
//     calendar days must still chain, even though a "day" is 23 or 25 hours.
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

// 12. LEGACY MIGRATION: old `{ days }` state. The old code also recorded a
//     "streak day" when an ALREADY-COMPLETE item was replayed, so `days` can hold
//     days with no real learning. Real first-time completions have completedAt,
//     so the migrated streak is rebuilt from those (local days).
//     Here: real learning Mon + Tue, plus a bogus Wed from a replay.
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

// 12b. v2 -> v3 migration (the strict, no-grace version). The state from the
//      screenshot: Tue, Thu, Fri active, v2 said current 2. Under the grace rule it is 3,
//      and a long v2 streak is never lowered.
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

// 12c. A v3 save that was written short (Tue, Thu, Fri active but current stored as 2,
//      e.g. merged from another device) heals itself; a legitimately reset streak does not.
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

// 13. Legacy data with NO timestamps at all keeps the old days as they are.
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

// 14. onLocalDayChange fires once when the local date rolls over - this is
//     what stops a page left open past midnight from showing yesterday as
//     "today" - and not before. Timers are faked and captured.
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