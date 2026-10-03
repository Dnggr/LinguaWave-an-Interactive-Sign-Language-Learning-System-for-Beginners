#!/usr/bin/env node
import * as E from './xp-engine.mjs';

let passed = 0;
let failed = 0;
function check(condition, label) {
  if (condition) passed++;
  else { failed++; console.error(`FAIL: ${label}`); }
}

// Level thresholds are checked at and immediately below every boundary.
for (let level = 1; level <= E.CONFIG.MAX_LEVEL; level++) {
  const threshold = E.xpForLevel(level);
  check(E.LEVEL_XP[level - 1] === threshold, `level table ${level}`);
  check(E.levelFromXp(threshold) === level, `level reached at threshold ${level}`);
  check(level === 1 || E.levelFromXp(threshold - 1) === level - 1, `previous level below threshold ${level}`);
}
check(E.xpForLevel(2) - E.xpForLevel(1) === 100, 'first level costs 100 XP');
check(E.xpForLevel(3) - E.xpForLevel(2) === 125, 'second level costs 125 XP');
check(E.levelFromXp(1e9) === 30, 'level is capped at 30');
check(E.levelProgress(E.xpForLevel(30)).maxed, 'level 30 progress is maxed');
check(Object.keys(E.BADGES).length === 73, 'badge catalogue count');

const mission = {
  id: 'sample', category: 'sample_category',
  items: [
    { kind: 'LESSON', signId: 'A' },
    { kind: 'BOOSTER', signId: 'A' },
    { kind: 'PRACTICE', signId: 'B', bonusXP: 5 },
    { kind: 'LESSON', signId: 'B' },
    { kind: 'QUIZ' },
  ],
};
const baseTime = Date.UTC(2026, 9, 3, 12);
const state = E.newState(baseTime);
state.tz = 'UTC';
const today = E.rollover(state, baseTime);
let out = E.applyLessonItem(state, mission, 0, { now: baseTime, today });
check(out.ok && out.xpGained === 6 && state.xp === 6, 'lesson pays 6 XP');
check(state.lessonItems.sample.includes(0), 'lesson item recorded once');
check(state.learnedSigns.includes('A'), 'lesson sign added to learned signs');
check(state.streak.current === 1, 'first lesson starts streak');
out = E.applyLessonItem(state, mission, 0, { now: baseTime + 1000, today });
check(out.duplicate && out.xpGained === 0 && state.xp === 6, 'replayed item pays zero');
out = E.applyLessonItem(state, mission, 1, { now: baseTime + 1500, today });
check(out.reason === 'too_fast' && out.retryAfterMs === 500, 'lesson cooldown blocks burst claim');
out = E.applyLessonItem(state, mission, 1, { now: baseTime + 2000, today });
check(out.xpGained === 3 && state.xp === 9, 'booster pays 3 XP');
out = E.applyLessonItem(state, mission, 2, { now: baseTime + 4000, today });
check(out.xpGained === 10, 'practice bonus is added');
out = E.applyLessonItem(state, mission, 3, { now: baseTime + 6000, today });
check(out.xpGained === 6 && state.learnedSigns.includes('B'), 'second sign lesson pays and is learned');
out = E.applyMissionComplete(state, mission, { now: baseTime + 8000, today });
check(out.path === 'full' && out.xpGained === E.missionBonus(2), 'full mission pays once-only bonus');
check(out.newBadges.includes('missions_1') && out.newBadges.includes('lesson_L1'), 'mission catch-up badges granted');
const afterFull = state.xp;
out = E.applyMissionComplete(state, mission, { now: baseTime + 9000, today });
check(out.duplicate && state.xp === afterFull, 'mission replay pays zero');
check(state.totals.missions === 1, 'mission total increments once');

check(E.lessonItemXp('PRACTICE', 5) === 10, 'practice base and bonus');
check(E.lessonItemXp('QUIZ') === 0, 'quiz cannot be claimed as an item');
check(E.applyLessonSoftCap(10, 0) === 10, 'soft cap below threshold');
check(E.applyLessonSoftCap(10, 800) === 5, 'soft cap halves after daily allowance');
check(E.applyLessonSoftCap(10, 795) === 7, 'soft cap straddle rounds down');
check(E.missionBonus(0) === 25 && E.missionBonus(100) === 80, 'mission bonus floor and ceiling');

const skipState = E.newState(baseTime);
skipState.tz = 'UTC';
const skipToday = E.rollover(skipState, baseTime);
out = E.applyMissionComplete(skipState, mission, { now: baseTime, today: skipToday });
check(out.path === 'skip' && out.xpGained === Math.round(E.missionBonus(2) * 0.4), 'skip path pays 40 percent');
check(skipState.missionsDone.sample === 'skip', 'skip path recorded');
check(skipState.learnedSigns.includes('A') && skipState.learnedSigns.includes('B'), 'mission completion derives learned signs');
const secondSkip = { ...mission, id: 'second' };
out = E.applyMissionComplete(skipState, secondSkip, { now: baseTime + 1000, today: skipToday });
check(out.reason === 'too_fast', 'skip-path mission cooldown enforced');
out = E.applyMissionComplete(skipState, secondSkip, { now: baseTime + E.CONFIG.MIN_SKIP_CLAIM_GAP_MS, today: skipToday });
check(out.ok && out.path === 'skip', 'skip path works after cooldown');

check(E.gameWallXp({ bricks: Array(15).fill({ learned: true, motion: false }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).xp === 21, 'clean static wall payout');
check(E.gameWallXp({ bricks: Array(21).fill({ learned: true, motion: true }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).xp <= 48, 'largest single wall stays below 48 XP');
check(E.gameWallXp({ bricks: Array(15).fill({ learned: false, motion: false }), wrong: 0, wallsToday: 0, gameXpToday: 0 }).reason === 'not_enough_learned', 'unlearned wall is ineligible');
check(E.gameWallXp({ bricks: Array(15).fill({ learned: true, motion: false }), wrong: 0, wallsToday: 3, gameXpToday: 0 }).xp === 11, 'fourth wall decays to half');
check(E.gameWallXp({ bricks: Array(15).fill({ learned: true, motion: false }), wrong: 0, wallsToday: 7, gameXpToday: 0 }).xp === 0, 'eighth wall is fully decayed');
check(E.gameWallXp({ bricks: Array(15).fill({ learned: true, motion: false }), wrong: 0, wallsToday: 0, gameXpToday: 85 }).xp === 5, 'game XP shared daily cap clamps payout');
let totalGameXp = 0;
let wallIndex = 0;
while (true) {
  const wall = E.gameWallXp({ bricks: Array(21).fill({ learned: true, motion: true }), wrong: 0, wallsToday: wallIndex, gameXpToday: totalGameXp });
  if (!wall.xp) break;
  totalGameXp += wall.xp;
  wallIndex++;
}
check(totalGameXp <= E.CONFIG.GAME.DAILY_XP_CAP, 'repeated walls never exceed daily cap');

const timingSigns = ['A', 'B', 'C'];
const validBreaks = [{ s: 'A', t: 1000 }, { s: 'B', t: 2000 }, { s: 'C', t: 3000 }];
check(E.validateGameTiming({ sessionSigns: timingSigns, broken: validBreaks, elapsedMs: 3500 }) === null, 'honest static timing accepted');
check(E.validateGameTiming({ sessionSigns: timingSigns, broken: validBreaks.map((brick) => ({ ...brick, t: 10 })), elapsedMs: 3500 }) === 'too_fast', 'instant timing rejected');
check(E.validateGameTiming({ sessionSigns: timingSigns, broken: validBreaks.slice(0, 2), elapsedMs: 3500 }) === 'incomplete_wall', 'incomplete wall rejected');
check(E.validateGameTiming({ sessionSigns: timingSigns, broken: [validBreaks[0], validBreaks[0], validBreaks[2]], elapsedMs: 3500 }) === 'bad_bricks', 'duplicate sign rejected');
check(E.validateGameTiming({ sessionSigns: timingSigns, broken: [{ s: 'Z', t: 1000 }, ...validBreaks.slice(1)], elapsedMs: 3500 }) === 'bad_bricks', 'foreign sign rejected');
check(E.validateGameTiming({ sessionSigns: ['A'], broken: [{ s: 'A', t: 1000, m: true }], elapsedMs: 1500 }) === 'too_fast', 'motion minimum timing enforced');
check(E.validateGameTiming({ sessionSigns: ['A'], broken: [{ s: 'A', t: 6000 }], elapsedMs: 1000 }) === 'clock_mismatch', 'claimed time beyond session rejected');
check(E.validateGameSigns(['A'], 'timeAttack', { A: 'static' }), 'known game sign accepted');
check(!E.validateGameSigns(['NOT_A_SIGN'], 'wall', { A: 'static' }), 'unknown game sign rejected');
check(!E.validateGameSigns(['A', 'A'], 'wall', { A: 'static' }), 'duplicate game targets rejected');
check(!E.validateGameSigns(Array(22).fill('A'), 'wall', { A: 'static' }), 'oversized game wall rejected');

const taState = E.newState(baseTime);
taState.tz = 'UTC';
const taToday = E.rollover(taState, baseTime);
const ta = E.applyGameFinish(taState, { id: 'ta', startedAt: baseTime, signs: ['A'], mode: 'timeAttack' },
  [{ s: 'A', t: 500, m: false }], 0, ['A'], { A: 'static' }, { now: baseTime + 1000, today: taToday });
check(ta.ok && ta.counted && ta.xpGained === 7, 'one-sign Time Attack receives target and flawless bonus');
check(taState.daily.timeAttacks === 1 && taState.daily.walls === 0, 'Time Attack does not increment wall totals');
check(!ta.newBadges?.includes('game_first') && !ta.newBadges?.includes('game_L1'), 'Time Attack earns no Wall Breaker badges');
const unlearnedTa = E.applyGameFinish(E.newState(baseTime), { id: 'ta2', startedAt: baseTime, signs: ['A'], mode: 'timeAttack' },
  [{ s: 'A', t: 500, m: false }], 0, [], { A: 'static' }, { now: baseTime + 1000, today: taToday });
check(unlearnedTa.reason === 'not_enough_learned', 'Time Attack requires a learned target');
const typeMismatch = E.applyGameFinish(E.newState(baseTime), { id: 'ta3', startedAt: baseTime, signs: ['A'], mode: 'timeAttack' },
  [{ s: 'A', t: 3100, m: true }], 0, ['A'], { A: 'static' }, { now: baseTime + 4000, today: taToday });
check(typeMismatch.reason === 'sign_type_mismatch', 'static/motion mismatch rejected');
const expired = E.applyGameFinish(E.newState(baseTime), { id: 'old', startedAt: baseTime, signs: ['A'], mode: 'timeAttack' },
  [{ s: 'A', t: 1000, m: false }], 0, ['A'], { A: 'static' }, { now: baseTime + E.CONFIG.GAME.SESSION_TTL_MS + 1, today: taToday });
check(expired.reason === 'expired', 'game session expires');

check(E.applyStreak(null, '2026-10-03').current === 1, 'streak begins at one');
check(E.applyStreak({ current: 3, longest: 3, lastDay: '2026-10-02' }, '2026-10-03').current === 4, 'streak grows on consecutive day');
check(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-10-01' }, '2026-10-03').current === 1, 'streak resets after missed day');
check(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-10-01' }, '2026-10-03').longest === 9, 'streak reset preserves longest');
check(E.effectiveStreak({ current: 4, lastDay: '2026-10-03' }, '2026-10-04') === 4, 'yesterday streak remains live');
check(E.effectiveStreak({ current: 4, lastDay: '2026-10-02' }, '2026-10-04') === 0, 'stale streak displays zero');
check(E.dayKey(Date.UTC(2026, 9, 3, 16, 0), 'Asia/Manila') === '2026-10-04', 'Manila day rollover');
check(E.shiftDayKey('2026-03-01', -1) === '2026-02-28', 'day shift crosses month boundary');
check(E.isValidTz('Asia/Manila') && !E.isValidTz('not-a-zone'), 'timezone validation');
const timezoneState = E.newState(baseTime);
E.resolveTimezone(timezoneState, 'Asia/Manila', baseTime);
E.resolveTimezone(timezoneState, 'Pacific/Kiritimati', baseTime + 2 * 86400000);
check(timezoneState.tz === 'Asia/Manila', 'timezone-change cooldown holds for 14 days');
E.resolveTimezone(timezoneState, 'Pacific/Kiritimati', baseTime + 14 * 86400000);
check(timezoneState.tz === 'Pacific/Kiritimati', 'timezone may change after cooldown');

const backfillMission = { id: 'legacy', category: 'legacy', items: mission.items };
const backfillIds = mission.items.map((item, index) => `legacy_${index}_${item.kind}_${item.signId || 'legacy'}`);
const backfillState = E.newState(baseTime);
out = E.applyBackfill(backfillState, [backfillMission], backfillIds, { now: baseTime });
check(out.backfilled && out.xpGained === Math.round((6 + 3 + 10 + 6 + E.missionBonus(2)) * 0.5), 'legacy backfill pays half rate');
check(backfillState.learnedSigns.includes('A') && backfillState.learnedSigns.includes('B'), 'backfill restores learned lesson signs');
const repeatedBackfill = E.applyBackfill(backfillState, [backfillMission], backfillIds, { now: baseTime + 1000 });
check(repeatedBackfill.duplicate && repeatedBackfill.xpGained === 0, 'legacy backfill runs once');
const largeMission = { id: 'large', category: 'large', items: Array.from({ length: 500 }, (_, index) => ({ kind: 'LESSON', signId: `S${index}` })) };
const largeIds = largeMission.items.map((item, index) => `large_${index}_${item.kind}_${item.signId}`);
const cappedBackfill = E.applyBackfill(E.newState(baseTime), [largeMission], largeIds, { now: baseTime });
check(cappedBackfill.xpGained === E.CONFIG.BACKFILL_MAX_XP, 'backfill has a 1,500 XP ceiling');
check(E.profileData(state, 'Ana', baseTime).xp === state.xp, 'public profile copies state XP');
check(E.profileData(state, 'Ana', baseTime).badgeCount === Object.keys(state.badges).length, 'public profile copies badge count');
check(E.normalizeState(null, baseTime).daily.gameXp === 0, 'new state initializes daily game counter');

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
