
export const GAME_VERSION = 1;
export const MIN_TIME_MS = 1000;
export const MAX_TIME_MS = 3600000;
export const MAX_MISSES = 500;
export const TIME_ATTACK_RUN_LENGTH = 4;

export const GAMES = {
  construct: {
    label: 'Construct',
    blurb: 'Fastest completion time by difficulty.',
    icon: 'lc_puzzle',
    page: 'construct-sentence.html',
    ranksOnMisses: false,
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
    boards: [{ id: 'fingerspell', label: 'Fingerspell' }],
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
export const boardId = (game, difficulty) => `${game}__${difficulty}`;
export const allBoardIds = () => GAME_KEYS.flatMap((g) => GAMES[g].boards.map((b) => boardId(g, b.id)));

const isInt = (n) => typeof n === 'number' && Number.isInteger(n);

export function isValidResult(doc, game, difficulty, uid) {
  if (!doc || typeof doc !== 'object' || !boardOf(game, difficulty)) return false;
  if (doc.completed !== true) return false;
  if (doc.game !== game || String(doc.difficulty) !== String(difficulty)) return false;
  if (uid != null && doc.uid !== uid) return false;
  if (!isInt(doc.timeMs) || doc.timeMs < MIN_TIME_MS || doc.timeMs > MAX_TIME_MS) return false;
  if (!isInt(doc.misses) || doc.misses < 0 || doc.misses > MAX_MISSES) return false;
  const at = achievedMs(doc);
  return Number.isFinite(at);
}

export function achievedMs(doc) {
  const t = doc && doc.achievedAt;
  if (t == null) return NaN;
  if (typeof t === 'number') return t;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000 + Math.floor((t.nanoseconds || 0) / 1e6);
  if (t instanceof Date) return t.getTime();
  return NaN;
}

export function compareResults(game) {
  const byMisses = !!(GAMES[game] && GAMES[game].ranksOnMisses);
  return (a, b) =>
    (a.timeMs - b.timeMs)
    || (byMisses ? (a.misses - b.misses) : 0)
    || (achievedMs(a) - achievedMs(b))
    || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
}

export function rankResults(game, difficulty, entries) {
  return entries
    .filter((e) => isValidResult(e, game, difficulty, e && e._id !== undefined ? e._id : e && e.uid))
    .slice()
    .sort(compareResults(game))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function isImprovement(game, prev, next) {
  if (!prev) return true;
  if (next.timeMs !== prev.timeMs) return next.timeMs < prev.timeMs;
  return !!(GAMES[game] && GAMES[game].ranksOnMisses) && next.misses < prev.misses;
}

export function formatTime(ms) {
  const n = Number(ms), t = Number.isFinite(n) ? Math.max(0, Math.floor(n / 100)) : 0;
  const tenths = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}
