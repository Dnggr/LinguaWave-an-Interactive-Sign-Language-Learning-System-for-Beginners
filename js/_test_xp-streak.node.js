'use strict';
/**
 * Tests for the XP-side Day Streak rules in js/xp-engine.mjs (the number on the Profile "N-day streak"
 * chip, the leaderboard and the streak badges). Pure functions only, so the module loads in plain Node.
 * Run:  node js/_test_xp-streak.node.js
 *
 * RULE (must match js/missions.js): ONE missed day is forgiven, TWO in a row reset the streak.
 */
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const E = await import(pathToFileURL(path.join(__dirname, 'xp-engine.mjs')).href);
  const { applyStreak, effectiveStreak, healStreakFromMissions: heal, dayGap, profileData, startOfDayMs, shiftDayKey } = E;

  let failures = 0;
  const assert = (c, m) => { if (!c) { failures++; console.error('FAIL: ' + m); } else console.log('ok: ' + m); };
  const k = (d) => `2026-10-${String(d).padStart(2, '0')}`;
  const run = (days) => days.reduce((s, d) => applyStreak(s, k(d)), null);

  assert(dayGap('2026-12-31', '2027-01-02') === 2 && dayGap('2026-10-05', '2026-10-05') === 0 && dayGap('2026-10-05', '2026-10-04') === -1, 'dayGap: month/year rollover, same day, backwards');

  // The screenshot: Mon(28 Sep) no, Tue(29) yes, Wed no, Thu(1 Oct) yes, Fri(2 Oct) yes -> 3
  {
    let s = applyStreak(null, '2026-09-29');
    s = applyStreak(s, '2026-10-01'); s = applyStreak(s, '2026-10-02');
    assert(s.current === 3 && s.longest === 3 && s.lastDay === '2026-10-02', `Tue, Thu, Fri -> 3 (got ${s.current}/${s.longest})`);
  }
  assert(run([1, 2, 3, 4, 5]).current === 5, 'plain consecutive days still count normally (5)');
  assert(run([1, 3, 5, 7, 9]).current === 5, 'every-other-day keeps counting active days (5)');
  assert(run([1, 2, 3, 6]).current === 1, 'two missed days in a row reset to 1 on return');
  assert(run([1, 2, 3, 6]).longest === 3, 'longest survives a reset');
  {
    const a = run([1, 2]), b = applyStreak(a, k(2));
    assert(b.current === 2 && b.lastDay === k(2), 'second activity the same day changes nothing');
    const c = applyStreak(a, k(1));
    assert(c.current === 2 && c.lastDay === k(2), 'clock earlier than lastDay: no reset, no double count');
  }
  // month / year rollovers and DST-free UTC day math
  assert(applyStreak({ current: 4, longest: 4, lastDay: '2026-09-29' }, '2026-10-01').current === 5, 'one missed day across a month boundary is forgiven');
  assert(applyStreak({ current: 4, longest: 4, lastDay: '2026-12-31' }, '2027-01-02').current === 5, 'one missed day across New Year is forgiven');
  assert(applyStreak({ current: 4, longest: 4, lastDay: '2026-12-30' }, '2027-01-02').current === 1, 'two missed days across New Year reset');

  // live (display) value
  const s3 = { current: 3, longest: 3, lastDay: k(10) };
  assert(effectiveStreak(s3, k(10)) === 3, 'live: practised today');
  assert(effectiveStreak(s3, k(11)) === 3, 'live: yesterday (nothing missed yet)');
  assert(effectiveStreak(s3, k(12)) === 3, 'live: one missed day, still alive');
  assert(effectiveStreak(s3, k(13)) === 0, 'live: two missed days in a row -> 0');
  assert(effectiveStreak(null, k(1)) === 0 && effectiveStreak({ current: 2, longest: 2, lastDay: null }, k(1)) === 0, 'live: no history -> 0');

  // leaderboard row expiry matches the display rule: gone at the START of lastDay + 3
  {
    const state = E.newState(Date.UTC(2026, 9, 10, 4));
    state.streak = { current: 3, longest: 3, lastDay: k(10) };
    const p = profileData(state, 'A', Date.UTC(2026, 9, 10, 4), null);
    assert(p.streakExpiresAt === startOfDayMs(k(13), 'UTC') && p.streakExpiresAt === startOfDayMs(shiftDayKey(k(10), 3), 'UTC'), 'profileData: streak row expires at the start of lastDay + 3');
  }

  // CATCH-UP for a streak saved under the old strict rule: xp says 2, missions (which keeps the days) says 3.
  {
    const mk = (cur, last) => ({ streak: { current: cur, longest: cur, lastDay: last }, badges: {} });
    const missions = (current, last) => ({ currentStreak: current, lastActivityDate: last });
    let st = mk(2, k(2)), out = {};
    assert(heal(st, k(2), out, 1, missions(3, k(2))) === true && st.streak.current === 3 && st.streak.longest === 3 && st.streak.lastDay === k(2), 'heal: stored 2 raised to 3 (the screenshot account)');
    assert(st.badges.streak_3 === 1 && (out.newBadges || []).includes('streak_3'), 'heal: the 3-day streak badge is granted');
    assert(heal(st, k(2), {}, 2, missions(3, k(2))) === false && st.streak.current === 3, 'heal: idempotent');
    st = mk(5, k(2));
    assert(heal(st, k(2), {}, 1, missions(3, k(2))) === false && st.streak.current === 5, 'heal: never lowers a higher xp streak');
    st = mk(2, k(1));
    assert(heal(st, k(2), {}, 1, missions(3, k(2))) === false && st.streak.current === 2, 'heal: skipped when the last active day differs');
    st = mk(2, k(2));
    assert(heal(st, k(9), {}, 1, missions(3, k(2))) === false && st.streak.current === 2, 'heal: skipped when the xp streak has already ended');
    assert(heal(mk(2, k(2)), k(2), {}, 1, undefined) === false && heal(mk(2, k(2)), k(2), {}, 1, null) === false, 'heal: no-op when there is no Missions summary');
    // firestore.rules allow streak.current <= previous + 1 per write, so a big gap is healed one step per call
    st = mk(2, k(2));
    assert(heal(st, k(2), {}, 1, missions(6, k(2))) === true && st.streak.current === 3, 'heal: moves ONE step per call (rules cap a write at +1)');
    let calls = 1; while (heal(st, k(2), {}, 1 + calls, missions(6, k(2)))) calls++;
    assert(st.streak.current === 6 && st.streak.longest === 6 && calls === 4, 'heal: repeated calls reach the Missions streak and stop');
    assert(st.badges.streak_3 && !st.badges.streak_7, 'heal: only the badges the healed streak has earned');
  }

  if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
  console.log('all xp streak tests passed');
})().catch((error) => { console.error(error); process.exit(1); });
