/**
 * js/game-scores-core.mjs — pure rules for the Game Leaderboards (no Firebase, no DOM).
 *
 * Shared by js/game-scores.js (browser: read/write Firestore) and js/_test_game-scores.node.mjs (node tests).
 * Anything that decides WHO RANKS WHERE lives here, so the rules in the spec are written once and tested once.
 *
 * What a "board" is
 *   One ranking = one game + one difficulty value. Difficulty values are the ones the games ALREADY have:
 *     construct   easy | medium | hard           (DIFFICULTY in js/construct-sentence.js)
 *     wall        9 | 15 | 21                    (the wall-size <select id="gm-size"> in pages/wall-breaker.html;
 *                                                 shown as Small / Medium / Large)
 *     timeAttack  fingerspell                    (Time Attack has no difficulty setting, so it has ONE board; the old 'standard'
 *                                                 10-sign board is retired because its times are not comparable)
 *   Nothing here invents a second difficulty system.
 *
 * Ranking (lower is better everywhere)
 *   construct   : time  ->  earliest achieved  ->  uid
 *   wall / timeAttack : time  ->  misses  ->  earliest achieved  ->  uid
 *   "earliest achieved" = whoever set that exact result first keeps the higher spot; uid is only a last,
 *   arbitrary-but-stable tie-break so two renders of the same data can never disagree.
 */

export const GAME_VERSION = 1;               // bump if a game's scoring changes in a way old results can't be compared to
export const MIN_TIME_MS = 1000;             // firestore.rules enforces the same bounds
export const MAX_TIME_MS = 3600000;
export const MAX_MISSES = 500;
export const TIME_ATTACK_RUN_LENGTH = 4;     // Time Attack fingerspells 4 random words (one each of 3, 4, 7 and 9 letters = 23 letters); only runs with all 4 are ranked

export const GAMES = {
  construct: {
    label: 'Construct',
    blurb: 'Fastest completion time by difficulty.',
    icon: 'lc_puzzle',
    page: 'construct-sentence.html',
    ranksOnMisses: false,        // spec: Construct is time first, then a consistent tie-breaker (NOT misses)
    showMisses: false,
    difficultyLabel: 'Difficulty',
    boards: [
      { id: 'easy',   label: 'Easy',   icon: 'lc_sprout' },
      { id: 'medium', label: 'Medium', icon: 'flame' },
      { id: 'hard',   label: 'Hard',   icon: 'zap' },
    ],
    note: 'Each difficulty has its own ranking. Faster is better.',
  },
  timeAttack: {
    label: 'Time Attack',
    blurb: 'Fingerspell every word quickly while minimizing misses.',
    icon: 'zap',
    page: 'time-attack.html',
    ranksOnMisses: true,
    showMisses: true,
    difficultyLabel: '',
    boards: [{ id: 'fingerspell', label: 'Fingerspell' }],   // single board: no selector is drawn
    note: `Only runs that fingerspell all ${TIME_ATTACK_RUN_LENGTH} words are ranked. Every run draws new words but always 23 letters (3, 4, 7 and 9 letters long), so times are comparable. Faster wins; fewer misses break ties.`,
  },
  wall: {
    label: 'Wall Breaker',
    blurb: 'Break through the challenge quickly with as few misses as possible.',
    icon: 'brick_wall',
    page: 'wall-breaker.html',
    ranksOnMisses: true,
    showMisses: true,
    difficultyLabel: 'Wall size',
    boards: [
      { id: '9',  label: 'Small',  sub: '9 bricks' },
      { id: '15', label: 'Medium', sub: '15 bricks' },
      { id: '21', label: 'Large',  sub: '21 bricks' },
    ],
    note: 'Ranked per wall size. Faster wins; fewer misses break ties.',
  },
};
export const GAME_KEYS = Object.keys(GAMES);

export const boardOf = (game, difficulty) => {
  const g = GAMES[game];
  return g ? g.boards.find((b) => b.id === String(difficulty)) || null : null;
};
/** Firestore path segment for one ranking, e.g. "construct__medium". Matches the list in firestore.rules. */
export const boardId = (game, difficulty) => `${game}__${difficulty}`;
export const allBoardIds = () => GAME_KEYS.flatMap((g) => GAMES[g].boards.map((b) => boardId(g, b.id)));

const isInt = (n) => typeof n === 'number' && Number.isInteger(n);

/**
 * A result may be ranked only if it is a COMPLETED attempt with every ranking field present and sane.
 * `doc` is the plain data of a gameScores entry; `uid` its document id (must equal the stored uid).
 */
export function isValidResult(doc, game, difficulty, uid) {
  if (!doc || typeof doc !== 'object' || !boardOf(game, difficulty)) return false;
  if (doc.completed !== true) return false;                                       // abandoned / unfinished never ranks
  if (doc.game !== game || String(doc.difficulty) !== String(difficulty)) return false;
  if (uid != null && doc.uid !== uid) return false;
  if (!isInt(doc.timeMs) || doc.timeMs < MIN_TIME_MS || doc.timeMs > MAX_TIME_MS) return false;   // no time = no rank
  if (!isInt(doc.misses) || doc.misses < 0 || doc.misses > MAX_MISSES) return false;
  const at = achievedMs(doc);
  return Number.isFinite(at);
}

/** Firestore Timestamp | {seconds} | number | Date -> epoch ms (NaN when absent). */
export function achievedMs(doc) {
  const t = doc && doc.achievedAt;
  if (t == null) return NaN;
  if (typeof t === 'number') return t;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6);
  if (t instanceof Date) return t.getTime();
  return NaN;
}

/** Comparator for Array.sort: negative = a ranks higher (better) than b. */
export function compareResults(game) {
  const byMisses = !!(GAMES[game] && GAMES[game].ranksOnMisses);
  return (a, b) =>
    (a.timeMs - b.timeMs)
    || (byMisses ? (a.misses - b.misses) : 0)
    || (achievedMs(a) - achievedMs(b))
    || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
}

/** Drop invalid results, sort best-first, number them 1..n. Pure: returns new objects, never mutates the input. */
export function rankResults(game, difficulty, entries) {
  return entries
    .filter((e) => isValidResult(e, game, difficulty, e && e._id !== undefined ? e._id : e && e.uid))   // _id = Firestore document id, when the caller kept it
    .slice()
    .sort(compareResults(game))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Is `next` a better personal result than `prev` for this game? (prev null = first result.) */
export function isImprovement(game, prev, next) {
  if (!prev) return true;
  if (next.timeMs !== prev.timeMs) return next.timeMs < prev.timeMs;
  return !!(GAMES[game] && GAMES[game].ranksOnMisses) && next.misses < prev.misses;
}

/** 42300 -> "00:42.3"; 3_725_000 -> "62:05.0". Tenths are shown so two rows never look tied when they are not. */
export function formatTime(ms) {
  const n = Number(ms), t = Number.isFinite(n) ? Math.max(0, Math.floor(n / 100)) : 0;   // junk (NaN, undefined) shows as zero, never "NaN:NaN"
  const tenths = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}
