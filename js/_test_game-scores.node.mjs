#!/usr/bin/env node
// Run: node js/_test_game-scores.node.mjs
// Covers the pure Game Leaderboard rules in js/game-scores-core.mjs (ranking order, tie-breaks, validity, improvement, time format).
import * as C from './game-scores-core.mjs';

let passed = 0, failed = 0;
function check(condition, label) { if (condition) passed++; else { failed++; console.error(`FAIL: ${label}`); } }
const eq = (a, b, label) => check(JSON.stringify(a) === JSON.stringify(b), `${label}\n   got      ${JSON.stringify(a)}\n   expected ${JSON.stringify(b)}`);

const at = (ms) => ({ toMillis: () => ms });                       // stands in for a Firestore Timestamp
const e = (uid, game, difficulty, timeMs, misses, achieved, over = {}) =>
  ({ uid, game, difficulty, timeMs, misses, completed: true, achievedAt: at(achieved), gameVersion: 1, ...over });
const order = (game, difficulty, rows) => C.rankResults(game, difficulty, rows).map((r) => r.uid);

// ---- boards use the games' own difficulty values
eq(C.GAMES.construct.boards.map((b) => b.id), ['easy', 'medium', 'hard'], 'construct boards = its existing difficulties');
eq(C.GAMES.wall.boards.map((b) => b.id), ['9', '15', '21'], 'wall boards = the existing wall sizes');
eq(C.GAMES.timeAttack.boards.map((b) => b.id), ['standard'], 'time attack has a single board (no difficulty setting exists)');
check(C.boardId('construct', 'medium') === 'construct__medium', 'board id format');
check(C.boardOf('wall', 15) && C.boardOf('wall', '15'), 'numeric 15 resolves to the "15" board');
check(!C.boardOf('wall', '12') && !C.boardOf('nope', 'easy'), 'unknown wall size / game has no board');
eq(C.allBoardIds(), ['construct__easy', 'construct__medium', 'construct__hard', 'timeAttack__standard', 'wall__9', 'wall__15', 'wall__21'],
   'board id list (must match firestore.rules validBoard)');

// ---- Construct: time only, then earliest, then uid. Misses are NOT a ranking key.
eq(order('construct', 'medium', [
  e('c', 'construct', 'medium', 51000, 0, 3), e('a', 'construct', 'medium', 42000, 5, 2), e('b', 'construct', 'medium', 48000, 0, 1),
]), ['a', 'b', 'c'], 'construct: lowest time first');
eq(order('construct', 'medium', [
  e('late', 'construct', 'medium', 40000, 0, 200), e('early', 'construct', 'medium', 40000, 9, 100),
]), ['early', 'late'], 'construct: equal time -> earliest achieved wins even with MORE misses (misses are not a key)');
eq(order('construct', 'medium', [
  e('zed', 'construct', 'medium', 40000, 0, 100), e('abe', 'construct', 'medium', 40000, 0, 100),
]), ['abe', 'zed'], 'construct: identical time + moment -> uid keeps the order stable');

// ---- Time Attack / Wall Breaker: time, then misses, then earliest, then uid
for (const [game, diff] of [['timeAttack', 'standard'], ['wall', '15']]) {
  eq(order(game, diff, [
    e('c', game, diff, 51000, 0, 3), e('a', game, diff, 42000, 4, 2), e('b', game, diff, 48000, 0, 1),
  ]), ['a', 'b', 'c'], `${game}: faster beats fewer misses (time is primary)`);
  eq(order(game, diff, [
    e('two', game, diff, 42000, 2, 1), e('zero', game, diff, 42000, 0, 9), e('one', game, diff, 42000, 1, 5),
  ]), ['zero', 'one', 'two'], `${game}: equal time -> fewer misses first`);
  eq(order(game, diff, [
    e('late', game, diff, 42000, 1, 90), e('early', game, diff, 42000, 1, 10),
  ]), ['early', 'late'], `${game}: equal time + misses -> earliest achieved`);
  eq(order(game, diff, [
    e('b', game, diff, 42000, 1, 10), e('a', game, diff, 42000, 1, 10),
  ]), ['a', 'b'], `${game}: fully identical -> uid`);
}
// time differing by 1 ms must beat any miss advantage
eq(order('wall', '21', [e('slow0', 'wall', '21', 30001, 0, 1), e('fast9', 'wall', '21', 30000, 9, 2)]), ['fast9', 'slow0'], '1 ms faster outranks 9 fewer misses');

// ---- ranks are 1..n, ties get distinct consecutive ranks (deterministic), input is not mutated
{
  const input = [e('b', 'wall', '9', 5000, 0, 2), e('a', 'wall', '9', 4000, 0, 1)];
  const copy = JSON.stringify(input.map((x) => ({ ...x, achievedAt: undefined })));
  const ranked = C.rankResults('wall', '9', input);
  eq(ranked.map((r) => [r.uid, r.rank]), [['a', 1], ['b', 2]], 'ranks numbered 1..n');
  eq(JSON.stringify(input.map((x) => ({ ...x, achievedAt: undefined }))), copy, 'rankResults does not mutate its input');
  eq(input.map((x) => x.uid), ['b', 'a'], 'input order untouched');
}

// ---- validity: only completed, complete, sane results rank
const good = e('u', 'construct', 'easy', 20000, 1, 1);
check(C.isValidResult(good, 'construct', 'easy', 'u'), 'a completed result is valid');
const bad = {
  'abandoned (completed false)': { ...good, completed: false },
  'completed missing': (() => { const x = { ...good }; delete x.completed; return x; })(),
  'completed as string': { ...good, completed: 'true' },
  'no completion time': (() => { const x = { ...good }; delete x.timeMs; return x; })(),
  'null time': { ...good, timeMs: null },
  'string time': { ...good, timeMs: '20000' },
  'NaN time': { ...good, timeMs: NaN },
  'zero time': { ...good, timeMs: 0 },
  'below minimum time': { ...good, timeMs: 999 },
  'above maximum time': { ...good, timeMs: C.MAX_TIME_MS + 1 },
  'fractional time': { ...good, timeMs: 20000.5 },
  'no misses': (() => { const x = { ...good }; delete x.misses; return x; })(),
  'negative misses': { ...good, misses: -1 },
  'absurd misses': { ...good, misses: C.MAX_MISSES + 1 },
  'no timestamp': (() => { const x = { ...good }; delete x.achievedAt; return x; })(),
  'wrong game': { ...good, game: 'wall' },
  'wrong difficulty': { ...good, difficulty: 'hard' },
};
for (const [name, doc] of Object.entries(bad)) check(!C.isValidResult(doc, 'construct', 'easy', 'u'), `invalid: ${name}`);
check(!C.isValidResult(good, 'construct', 'easy', 'someone-else'), 'stored uid must equal the document id');
check(!C.isValidResult(null, 'construct', 'easy', 'u') && !C.isValidResult(undefined, 'construct', 'easy', 'u'), 'null / undefined result is invalid');
check(!C.isValidResult(good, 'construct', 'nightmare', 'u'), 'unknown difficulty is invalid');
eq(order('construct', 'easy', [good, ...Object.values(bad).map((d, i) => ({ ...d, uid: `x${i}` })), e('ok2', 'construct', 'easy', 30000, 0, 2)]),
   ['u', 'ok2'], 'rankResults drops every invalid row and keeps the valid ones');
// _id (Firestore document id) wins over a forged stored uid
check(C.rankResults('construct', 'easy', [{ ...good, _id: 'other' }]).length === 0, 'doc id that differs from stored uid is dropped');
check(C.rankResults('construct', 'easy', [{ ...good, _id: 'u' }]).length === 1, 'doc id that matches stored uid is kept');

// ---- timestamps in other shapes still order correctly
eq(order('construct', 'easy', [
  { ...good, uid: 'later', achievedAt: { seconds: 200, nanoseconds: 0 } }, { ...good, uid: 'sooner', achievedAt: { seconds: 100, nanoseconds: 0 } },
]), ['sooner', 'later'], '{seconds} timestamps order by time');

// ---- improvement rule (what a learner's stored best may be replaced by)
const prev = { timeMs: 42000, misses: 2 };
check(C.isImprovement('wall', null, { timeMs: 99999, misses: 9 }), 'first result always counts');
check(C.isImprovement('wall', prev, { timeMs: 41999, misses: 9 }), 'wall: faster time replaces, even with more misses');
check(!C.isImprovement('wall', prev, { timeMs: 42001, misses: 0 }), 'wall: slower time never replaces, even with fewer misses');
check(C.isImprovement('wall', prev, { timeMs: 42000, misses: 1 }), 'wall: equal time + fewer misses replaces');
check(!C.isImprovement('wall', prev, { timeMs: 42000, misses: 2 }) && !C.isImprovement('wall', prev, { timeMs: 42000, misses: 3 }), 'wall: equal time + same/more misses does not replace');
check(C.isImprovement('timeAttack', prev, { timeMs: 42000, misses: 0 }), 'time attack: equal time + fewer misses replaces');
check(C.isImprovement('construct', prev, { timeMs: 41999, misses: 9 }), 'construct: faster replaces');
check(!C.isImprovement('construct', prev, { timeMs: 42000, misses: 0 }), 'construct: equal time never replaces (would only lose its earliest-achieved tie-break)');

// ---- time formatting
eq(['0', 999, 1000, 42300, 59999, 60000, 3725000].map((n) => C.formatTime(n)),
   ['00:00.0', '00:00.9', '00:01.0', '00:42.3', '00:59.9', '01:00.0', '62:05.0'], 'formatTime');
check(C.formatTime(-5) === '00:00.0' && C.formatTime(NaN) === '00:00.0', 'formatTime clamps junk to zero');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
