'use strict';
/**
 * Tests for the XP-side Day Streak rules in js/xp.js (the number on the Profile "N-day streak"
 * chip, the leaderboard and the streak badges). xp.js is an ES module that imports Firebase from
 * a CDN, so it can't be loaded in Node; this file pulls out the pure streak functions by name and
 * runs them. Run:  node js/_test_xp-streak.node.js
 *
 * RULE (must match js/missions.js): ONE missed day is forgiven, TWO in a row reset the streak.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'xp.js'), 'utf8');
function grab(re, what) { const m = src.match(re); if (!m) throw new Error('xp.js: could not find ' + what); return m[0]; }
const code = [
  grab(/const STREAK_MAX_MISSED_DAYS = \d+;/, 'STREAK_MAX_MISSED_DAYS'),
  grab(/function shiftDayKey[\s\S]*?\n}\r?\n/, 'shiftDayKey'),
  grab(/function dayGap[\s\S]*?\n}\r?\n/, 'dayGap'),
  grab(/function applyStreak[\s\S]*?\n}\r?\n/, 'applyStreak'),
  grab(/function effectiveStreak[\s\S]*?\n}\r?\n/, 'effectiveStreak'),
  grab(/const STREAK_BADGE_DAYS = \[[^\]]*\];/, 'STREAK_BADGE_DAYS'),
  grab(/const streakBadgesFor = [^\n]*\n/, 'streakBadgesFor'),
  grab(/function grant[\s\S]*?\n}\r?\n/, 'grant'),
  grab(/function healStreakFromMissions[\s\S]*?\n}\r?\n/, 'healStreakFromMissions'),
  'this.applyStreak = applyStreak; this.effectiveStreak = effectiveStreak; this.heal = healStreakFromMissions;',
].join('\n');
const ctx = { CFG: { BADGES: { streak_3: {}, streak_7: {} } }, window: {} }; vm.createContext(ctx); vm.runInContext(code, ctx);
const { applyStreak, effectiveStreak, heal } = ctx;

let failures = 0;
const assert = (c, m) => { if (!c) { failures++; console.error('FAIL: ' + m); } else console.log('ok: ' + m); };
const k = (d) => `2026-10-${String(d).padStart(2, '0')}`;
const run = (days) => days.reduce((s, d) => applyStreak(s, k(d)), null);

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

// CATCH-UP for a streak saved under the old strict rule: xp says 2, missions (which keeps the days) says 3.
{
  const mk = (cur, last) => ({ streak: { current: cur, longest: cur, lastDay: last }, badges: {} });
  ctx.window.LWMissions = { getStreakSummary: () => ({ currentStreak: 3, lastActivityDate: k(2) }) };
  let st = mk(2, k(2)), out = {};
  assert(heal(st, k(2), out, 1) === true && st.streak.current === 3 && st.streak.longest === 3 && st.streak.lastDay === k(2), 'heal: stored 2 raised to 3 (the screenshot account)');
  assert(st.badges.streak_3 === 1 && (out.newBadges || []).includes('streak_3'), 'heal: the 3-day streak badge is granted');
  assert(heal(st, k(2), {}, 2) === false && st.streak.current === 3, 'heal: idempotent');
  st = mk(5, k(2));
  assert(heal(st, k(2), {}, 1) === false && st.streak.current === 5, 'heal: never lowers a higher xp streak');
  st = mk(2, k(1));
  assert(heal(st, k(2), {}, 1) === false && st.streak.current === 2, 'heal: skipped when the last active day differs');
  ctx.window.LWMissions = { getStreakSummary: () => ({ currentStreak: 3, lastActivityDate: k(2) }) };
  st = mk(2, k(2));
  assert(heal(st, k(9), {}, 1) === false && st.streak.current === 2, 'heal: skipped when the xp streak has already ended');
  ctx.window.LWMissions = undefined;
  assert(heal(mk(2, k(2)), k(2), {}, 1) === false, 'heal: no-op when missions.js is not loaded');
}

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('all xp streak tests passed');
