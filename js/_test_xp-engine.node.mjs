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
check(Object.keys(E.BADGES).length === 107, 'badge catalogue count');
check(Object.keys(E.BADGES).filter((id) => E.BADGES[id].group === 'sentence').length === 34, 'sentence badge count');

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
check(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-10-01' }, '2026-10-03').current === 4, 'one missed day is forgiven');
check(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-09-30' }, '2026-10-03').current === 1, 'streak resets after two missed days in a row');
check(E.applyStreak({ current: 3, longest: 9, lastDay: '2026-09-30' }, '2026-10-03').longest === 9, 'streak reset preserves longest');
check(E.effectiveStreak({ current: 4, lastDay: '2026-10-03' }, '2026-10-04') === 4, 'yesterday streak remains live');
check(E.effectiveStreak({ current: 4, lastDay: '2026-10-02' }, '2026-10-04') === 4, 'one missed day still displays the streak');
check(E.effectiveStreak({ current: 4, lastDay: '2026-10-01' }, '2026-10-04') === 0, 'stale streak displays zero');
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


// ---- Construct a Sentence ----
{
  const known = () => true;
  const words = [['YOU', 'MY', 'FRIEND'], ['PLEASE', 'HELP', 'ME'], ['ME', 'EAT', 'FOOD'], ['ME', 'DRINK', 'WATER'], ['MOM', 'DRINK', 'MILK']];
  const signs = [...new Set(words.flat())];
  const session = (difficulty, startedAt) => ({ id: 's', startedAt, signs, mode: 'sentence', rounds: words, difficulty });
  const goodLog = words.map((w, i) => ({ i, t: (i + 1) * 4000 }));
  check(E.validateSentenceSession(session('medium', 0), known), 'sentence session valid');
  check(!E.validateSentenceSession({ ...session('medium', 0), difficulty: 'insane' }, known), 'bad difficulty rejected');
  check(!E.validateSentenceSession({ ...session('medium', 0), rounds: [['A', 'A', 'B']] }, known), 'repeated word rejected');
  check(!E.validateSentenceSession({ ...session('medium', 0), signs: ['YOU'] }, known), 'signs must match rounds');
  check(!E.validateSentenceSession(session('medium', 0), (w) => w !== 'ME'), 'unknown sign rejected');

  const run = (difficulty, wrong, learned, log = goodLog, st = E.newState(baseTime)) => {
    st.tz = 'UTC';
    const day = E.rollover(st, baseTime + 25000);
    return { st, out: E.applyGameFinish(st, session(difficulty, baseTime), log, wrong, learned, {}, { now: baseTime + 25000, today: day }) };
  };
  let r = run('medium', 0, signs);
  check(r.out.ok && r.out.counted && r.out.xpGained === 25, `flawless medium pays 25 (got ${r.out.xpGained})`);
  check(r.st.badges.sentence_first && r.st.badges.sentence_flawless && r.st.badges.sentence_L1 && !r.st.badges.sentence_hard, 'medium run badges');
  check(r.st.totals.sentences === 1 && r.st.daily.gameXp === 25, 'sentence totals and daily cap tracked');
  r = run('hard', 0, signs);
  check(r.out.xpGained === 29 && r.st.badges.sentence_hard, 'flawless hard pays 29 and gives Memory Master');
  r = run('easy', 0, signs);
  check(r.out.xpGained === 21, 'flawless easy pays 21');
  r = run('medium', 5, signs);
  check(r.out.counted && r.out.xpGained < 25 && !r.st.badges.sentence_flawless, 'misses lower XP and skip flawless');
  r = run('medium', 0, []);
  check(r.out.ok && r.out.counted && r.out.xpGained === 25 && r.st.badges.sentence_first, 'a learner with no learned signs still earns sentence XP and badges');
  r = run('medium', 0, signs, goodLog.slice(0, 4));
  check(!r.out.ok && r.out.reason === 'incomplete_run', 'incomplete run rejected');
  r = run('medium', 0, signs, goodLog.map((e, i) => ({ ...e, i: 4 - i })));
  check(!r.out.ok, 'out of order run rejected');
  r = run('medium', 0, signs, words.map((w, i) => ({ i, t: (i + 1) * 100 })));
  check(!r.out.ok && r.out.reason === 'too_fast', 'too fast run rejected');
  const capped = E.newState(baseTime); capped.tz = 'UTC'; capped.daily = { day: '2026-10-03', lessonXp: 0, gameXp: 90, walls: 0, timeAttacks: 0 };
  r = run('medium', 0, signs, goodLog, capped);
  check(r.out.ok && !r.out.counted && r.out.xpGained === 0 && r.out.reason === 'daily_cap', 'daily cap blocks sentence XP');
  const vet = E.newState(baseTime); vet.tz = 'UTC';
  for (let n = 0; n < 5; n++) { vet.daily.gameXp = 0; run('medium', 0, signs, goodLog, vet); }
  check(vet.badges.sentence_veteran && vet.totals.sentences === 5, 'Sentence Veteran after 5 runs');
  check(vet.totals.sentenceXp === 125 && vet.totals.sentenceXp === vet.totals.gameXp, 'sentence XP tracked per game');
  check(E.profileData(vet, 'Ana', baseTime).sentenceXp === 125 && E.profileData(vet, 'Ana', baseTime).wallXp === 0, 'public profile carries per-game XP');
}

// ---- Time Attack (fingerspelling) ----
{
  const F = E.CONFIG.FINGERSPELL;
  const word = (id) => E.fingerspellWordById(id);
  check(['car', 'ak47', 'america', 'hamburger'].map((id) => E.fingerspellWordXp(word(id).symbols.length)).join() === '3,4,7,9', 'word XP is its length: car 3, ak 47 4, america 7, hamburger 9');
  check(E.fingerspellWordXp(9) > E.fingerspellWordXp(7) && E.fingerspellWordXp(7) > E.fingerspellWordXp(4) && E.fingerspellWordXp(4) > E.fingerspellWordXp(3), 'longer words pay more');

  const types = {};
  for (const w of F.WORDS) for (const sym of w.symbols) types[sym] = 'static';
  const ids = ['car', 'america', 'ak47', 'hamburger'];
  const uniq = [...new Set(ids.flatMap((id) => word(id).symbols))];   // the letters of THIS run (the bank has 1,300+ words)
  check(E.validateFingerspellSession({ signs: uniq, words: ids }, types), 'full fingerspell session is valid');
  check(!E.validateFingerspellSession({ signs: uniq, words: ['car', 'car'] }, types), 'duplicate word rejected');
  check(!E.validateFingerspellSession({ signs: uniq, words: ['car', 'not-a-word'] }, types), 'unknown word rejected');
  check(!E.validateFingerspellSession({ signs: ['C', 'A'], words: ['car'] }, types), 'signs must match the words (missing R)');
  check(!E.validateFingerspellSession({ signs: ['C', 'A', 'R'], words: ['car'] }, { ...types, R: 'motion' }), 'motion letters rejected');
  check(!E.validateFingerspellSession({ signs: [...uniq, 'Z'], words: ids }, { ...types, Z: 'static' }), 'extra sign rejected');

  // Word bank + run picker
  const bank = F.WORDS, tiers = F.RUN_LENGTHS;
  check(bank.length >= 500, `word bank has 500+ words (${bank.length})`);
  check(new Set(bank.map((w) => w.id)).size === bank.length, 'word ids are unique');
  check(bank.every((w) => w.symbols.every((ch) => /^[A-Y0-9]$/.test(ch) && ch !== 'J' && ch !== '6' && ch !== '9')), 'no motion signs (J, Z, 6, 9) in any word');
  check(bank.every((w) => tiers.includes(w.symbols.length)), 'every word has a tier length');
  check(tiers.every((n) => bank.filter((w) => w.symbols.length === n).length >= 100), 'every length tier has 100+ words');
  for (let i = 0; i < 200; i++) {
    const run = E.pickFingerspellRun();
    if (run.map((w) => w.symbols.length).join() !== tiers.join() || new Set(run.map((w) => w.id)).size !== run.length) { check(false, 'run shape'); break; }
  }
  check(E.pickFingerspellRun().reduce((n, w) => n + w.symbols.length, 0) === E.FINGERSPELL_RUN_LETTERS && E.FINGERSPELL_RUN_LETTERS === 23, 'every run is exactly 23 letters');
  const prev = E.pickFingerspellRun();
  check(Array.from({ length: 50 }, () => E.pickFingerspellRun(() => true, { avoid: prev.map((w) => w.id) })).every((r) => r.every((w) => !prev.some((p) => p.id === w.id))), 'avoid list keeps the next run fresh');
  check(E.pickFingerspellRun((w) => w.symbols.length !== 9).length === 3, 'a tier with no usable word is left out');
  const longRun = bank.filter((w) => w.symbols.length === 9).slice(0, 3).map((w) => w.id);
  check(!E.validateFingerspellSession({ signs: [...new Set(longRun.flatMap((id) => word(id).symbols))], words: longRun }, types), 'a run longer than 23 letters is rejected');
  const drawn = E.pickFingerspellRun();
  check(E.validateFingerspellSession({ signs: [...new Set(drawn.flatMap((w) => w.symbols))], words: drawn.map((w) => w.id) }, types), 'a randomly drawn run is a valid session');

  const learnedAll = uniq.slice();
  const mk = () => { const st = E.newState(baseTime); st.tz = 'UTC'; return st; };
  const day = '2026-10-03';
  const session = { id: 'fs', startedAt: baseTime, mode: 'fingerspell', signs: uniq, words: ids };
  const goodLog = [{ w: 0, t: 2000 }, { w: 1, t: 6000 }, { w: 2, t: 8500 }, { w: 3, t: 13000 }];
  const fin = (st, log, wrong, learned, sess = session) => E.applyGameFinish(st, sess, log, wrong, learned, types, { now: baseTime + 14000, today: day });

  let st = mk(); let r = fin(st, goodLog, 0, learnedAll);
  check(r.ok && r.counted && r.xpGained === 29, `flawless full run pays 23 + 3 clear + 3 flawless = 29 (${r.xpGained})`);
  check(r.words.map((w) => w.xp).join() === '3,7,4,9', 'per-word XP is reported in run order');
  check(r.xpGained <= 30, 'a full run stays in the same range as a Construct a Sentence run (~25 XP)');
  check(st.xp === 29 && st.daily.gameXp === 29 && st.totals.timeAttackXp === 29 && st.totals.gameXp === 29, 'XP lands in xp, daily.gameXp, timeAttackXp, gameXp');
  check(st.totals.wallXp + st.totals.timeAttackXp + st.totals.sentenceXp <= st.totals.gameXp, 'per-game XP never exceeds gameXp (firestore rules invariant)');
  check(st.totals.timeAttacks === 1 && st.daily.timeAttacks === 1, 'run counters increase');
  check(!('fingerXp' in st.daily), 'no separate fingerspell daily counter: it shares the game cap');

  st = mk(); r = fin(st, goodLog, 100, learnedAll);
  check(r.xpGained === Math.round(3 * 0.5) + Math.round(7 * 0.5) + Math.round(4 * 0.5) + Math.round(9 * 0.5) + 3, 'low accuracy halves the word XP and drops the flawless bonus');

  st = mk(); st.daily = { ...st.daily, day, gameXp: 80 };
  r = fin(st, goodLog, 0, learnedAll);
  check(r.counted && r.xpGained === 10 && st.daily.gameXp === 90, 'XP is trimmed to what is left of the 90 XP/day game cap');
  r = fin(st, goodLog, 0, learnedAll);
  check(r.ok && !r.counted && r.xpGained === 0 && r.reason === 'daily_cap', 'once the shared daily game cap is spent, Time Attack pays nothing');
  check(st.daily.gameXp <= E.CONFIG.GAME.DAILY_XP_CAP, 'daily game XP never passes the cap');

  const sentenceFirst = mk(); sentenceFirst.daily = { ...sentenceFirst.daily, day, gameXp: 90 };
  r = fin(sentenceFirst, goodLog, 0, learnedAll);
  check(r.reason === 'daily_cap', 'Wall Breaker / Sentence XP already at the cap also blocks Time Attack (one shared cap)');

  st = mk(); r = fin(st, goodLog, 0, learnedAll.filter((sign) => sign !== '4'));
  check(r.xpGained === 3 + 7 + 9 + 3 + 3 && r.words.find((w) => w.id === 'ak47').eligible === false, 'a word with an unlearned letter pays nothing, the rest still pays');
  st = mk(); r = fin(st, goodLog, 0, []);
  check(r.reason === 'not_enough_learned' && r.xpGained === 0 && st.xp === 0, 'nothing learned: no XP and no state write');

  st = mk(); r = fin(st, [{ w: 0, t: 100 }, { w: 1, t: 6000 }, { w: 2, t: 8500 }, { w: 3, t: 13000 }], 0, learnedAll);
  check(r.reason === 'too_fast', 'spelling a word faster than 450 ms per letter is rejected');
  r = fin(mk(), goodLog.slice(0, 3), 0, learnedAll);
  check(r.reason === 'incomplete_run', 'a run missing a word is rejected');
  r = fin(mk(), [{ w: 0, t: 2000 }, { w: 2, t: 6000 }, { w: 1, t: 8500 }, { w: 3, t: 13000 }], 0, learnedAll);
  check(r.reason === 'bad_bricks', 'words logged out of order are rejected');
  r = E.applyGameFinish(mk(), session, goodLog, 0, learnedAll, types, { now: baseTime + 3000, today: day });
  check(r.reason === 'clock_mismatch', 'log longer than the session clock is rejected');
  r = E.applyGameFinish(mk(), session, goodLog, 0, learnedAll, types, { now: baseTime + E.CONFIG.GAME.SESSION_TTL_MS + 1, today: day });
  check(r.reason === 'expired', 'fingerspell session expires');
  check(E.profileData(st, 'Ana', baseTime).timeAttackXp === st.totals.timeAttackXp, 'public profile carries Time Attack XP');
}

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
