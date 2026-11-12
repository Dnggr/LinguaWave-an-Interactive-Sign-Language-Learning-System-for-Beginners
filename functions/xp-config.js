'use strict';

const CONFIG = {
  VERSION: 1,

  LAUNCH_AT_ISO: '2026-10-01T00:00:00Z',

  MAX_LEVEL: 30,
  LEVEL_BASE: 100,
  LEVEL_STEP: 25,

  LESSON_ITEM_XP: { LESSON: 6, BOOSTER: 3, PRACTICE: 5 },
  MISSION_BONUS: { base: 25, perSign: 3, max: 80 },
  MISSION_SKIP_FACTOR: 0.4,
  MISSION_FULL_LESSON_RATIO: 0.8,
  LESSON_DAILY_SOFT_CAP: 800,
  LESSON_OVER_CAP_FACTOR: 0.5,
  MIN_CLAIM_GAP_MS: 2000,
  MIN_SKIP_CLAIM_GAP_MS: 90000,
  BACKFILL_FACTOR: 0.5,
  BACKFILL_MAX_XP: 1500,
  BACKFILL_WINDOW_DAYS: 14,

  GAME: {
    MIN_LEARNED_BRICKS: 6,
    BRICK_XP: { static: 1, motion: 2 },
    CLEAR_BONUS: 3,
    FLAWLESS_BONUS: 3,
    ACC_TIERS: [ { min: 0.85, mult: 1 }, { min: 0.60, mult: 0.8 }, { min: 0, mult: 0.5 } ],
    WALL_DECAY: [ { upTo: 3, mult: 1 }, { upTo: 5, mult: 0.5 }, { upTo: 7, mult: 0.25 }, { upTo: 999, mult: 0 } ],
    DAILY_XP_CAP: 90,
    MAX_BRICKS: 21,
    MIN_GAP_MS: { static: 400, motion: 3000 },
    CLOCK_SLACK_MS: 3000,
    SESSION_TTL_MS: 30 * 60 * 1000,
    MIN_START_GAP_MS: 3000,
    SPEED_BADGE_MS_PER_BRICK: 6000,
    VETERAN_WALLS: 5,
  },

  TZ_CHANGE_COOLDOWN_DAYS: 14,
};

const TIERS = [
  { from: 1,  name: 'Ripple',  icon: '💧', color: '#38bdf8' },
  { from: 5,  name: 'Current', icon: '🌊', color: '#22d3ee' },
  { from: 10, name: 'Tide',    icon: '🐚', color: '#2dd4bf' },
  { from: 15, name: 'Swell',   icon: '🏄', color: '#818cf8' },
  { from: 20, name: 'Crest',   icon: '🔱', color: '#c084fc' },
  { from: 25, name: 'Tsunami', icon: '🌋', color: '#f59e0b' },
];

function tierForLevel(level) {
  let t = TIERS[0];
  for (const x of TIERS) if (level >= x.from) t = x;
  return t;
}

function buildBadgeCatalog() {
  const b = {};
  const add = (o) => { b[o.id] = o; };

  for (let L = 1; L <= CONFIG.MAX_LEVEL; L++) {
    const t = tierForLevel(L);
    add({ id: `lesson_L${L}`, group: 'lesson', level: L, icon: '📘', color: t.color,
          name: `${t.name} Scholar · Lv ${L}`, desc: `Finish a lesson once you have reached level ${L}.` });
    add({ id: `game_L${L}`, group: 'game', level: L, icon: '🧱', color: t.color,
          name: `${t.name} Wall Breaker · Lv ${L}`, desc: `Clear a Wall Breaker wall once you have reached level ${L}.` });
  }
  [3, 7, 14, 30, 60, 100].forEach((n) => add({ id: `streak_${n}`, group: 'streak', icon: '🔥', color: '#f97316',
    name: `${n}-Day Streak`, desc: `Learn on ${n} days in a row.` }));
  add({ id: 'game_first',    group: 'game', icon: '🧱', color: '#38bdf8', name: 'First Wall',      desc: 'Clear your first counted wall.' });
  add({ id: 'game_flawless', group: 'game', icon: '💎', color: '#22d3ee', name: 'Flawless',        desc: 'Clear a counted wall with no misses.' });
  add({ id: 'game_speed',    group: 'game', icon: '⚡', color: '#facc15', name: 'Speed Breaker',   desc: 'Clear a counted wall at 6 seconds a brick or faster.' });
  add({ id: 'game_veteran',  group: 'game', icon: '🏗️', color: '#f59e0b', name: 'Wall Veteran',    desc: `Clear ${CONFIG.GAME.VETERAN_WALLS} counted walls.` });
  add({ id: 'missions_1',  group: 'lesson', icon: '🎓', color: '#38bdf8', name: 'First Lesson',     desc: 'Complete your first lesson.' });
  add({ id: 'missions_10', group: 'lesson', icon: '📚', color: '#2dd4bf', name: 'Ten Lessons',      desc: 'Complete 10 lessons.' });
  add({ id: 'missions_25', group: 'lesson', icon: '🏅', color: '#c084fc', name: 'Twenty-Five Lessons', desc: 'Complete 25 lessons.' });
  return b;
}

const STREAK_BADGE_DAYS = [3, 7, 14, 30, 60, 100];
const MISSION_COUNT_BADGES = [[1, 'missions_1'], [10, 'missions_10'], [25, 'missions_25']];

module.exports = { CONFIG, TIERS, tierForLevel, buildBadgeCatalog, STREAK_BADGE_DAYS, MISSION_COUNT_BADGES };
