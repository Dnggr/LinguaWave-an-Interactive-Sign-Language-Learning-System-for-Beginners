/**
 * LEGACY: functions/xp-config.js — former XP economy source for the Functions implementation.
 * ─────────────────────────────────────────────────────────────────
 * The active Spark economy lives in js/xp-engine.mjs. This file remains for reference;
 * do not generate browser economy values from it.
 *
 * NAMING: "account level" here is the XP level (Lv 1..30). It is NOT the
 * curriculum difficulty `users.level` ('basic' | 'medium' | 'intermediate'),
 * which is untouched. In code/Firestore the XP one is always `level` inside
 * xpState / publicProfiles, and never written to users/{uid}.
 *
 * BALANCE (see XP_SYSTEM.md for the derivation):
 *   full curriculum lesson XP  = 11,670 (one-time, finite, not farmable; measured from missions.js)
 *   Wall Breaker + Time Attack ≤ 90 game XP/day combined
 *   XP to reach Lv 30          = 13,050
 * So lessons alone carry a learner to Lv 28; Lv 29-30 need ~1.4k XP from the game, i.e. at least
 * ~16 days of capped play. A median lesson (mission) is worth 163 XP, about 8x a typical wall (21).
 */
'use strict';

const CONFIG = {
  VERSION: 1,

  // Accounts created BEFORE this instant may run the one-time legacy backfill.
  // SET THIS to the moment you deploy. Uses Firebase Auth's creationTime (server
  // truth), not anything the browser writes.
  LAUNCH_AT_ISO: '2026-10-01T00:00:00Z',

  // ── Levels ──
  MAX_LEVEL: 30,
  LEVEL_BASE: 100,   // XP to go from Lv1 -> Lv2
  LEVEL_STEP: 25,    // each next level costs 25 more than the previous one

  // ── Lessons (one-time per item, so never farmable) ──
  LESSON_ITEM_XP: { LESSON: 6, BOOSTER: 3, PRACTICE: 5 },
  // PRACTICE items that carry `bonusXP` in missions.js add that on top (5).
  MISSION_BONUS: { base: 25, perSign: 3, max: 80 },  // paid once, when the Mastery Quiz is passed
  MISSION_SKIP_FACTOR: 0.4,        // quiz passed but < 80% of LESSON items done in-app (skip path)
  MISSION_FULL_LESSON_RATIO: 0.8,  // share of LESSON items that must be server-claimed for the full bonus
  LESSON_DAILY_SOFT_CAP: 800,      // lesson XP/day at full rate; beyond it XP is halved (never lost)
  LESSON_OVER_CAP_FACTOR: 0.5,
  MIN_CLAIM_GAP_MS: 2000,          // min time between two lesson claims (no scripted burst)
  MIN_SKIP_CLAIM_GAP_MS: 90000,    // min time between two skip-path mission claims
  BACKFILL_FACTOR: 0.5,            // legacy progress is paid at half rate
  // Old progress lives in client-writable docs, so it CANNOT be verified. These two limits cap the
  // damage of a forged list: a hard XP ceiling (~Lv 8) and a window that closes 14 days after launch.
  BACKFILL_MAX_XP: 1500,
  BACKFILL_WINDOW_DAYS: 14,

  // ── Game XP (Wall Breaker and Time Attack share the daily cap) ──
  GAME: {
    MIN_LEARNED_BRICKS: 6,       // Wall Breaker threshold; Time Attack requires at least one learned target
    BRICK_XP: { static: 1, motion: 2 },
    CLEAR_BONUS: 3,
    FLAWLESS_BONUS: 3,
    ACC_TIERS: [ { min: 0.85, mult: 1 }, { min: 0.60, mult: 0.8 }, { min: 0, mult: 0.5 } ],
    // by how many XP-eligible walls you already cleared today (local day)
    WALL_DECAY: [ { upTo: 3, mult: 1 }, { upTo: 5, mult: 0.5 }, { upTo: 7, mult: 0.25 }, { upTo: 999, mult: 0 } ],
    DAILY_XP_CAP: 90,
    MAX_BRICKS: 21,
    MIN_GAP_MS: { static: 400, motion: 3000 },  // fastest physically possible gap between two breaks
    CLOCK_SLACK_MS: 3000,   // covers slow mobile round-trips between the client start call and the server stamp
    SESSION_TTL_MS: 30 * 60 * 1000,
    MIN_START_GAP_MS: 3000,
    SPEED_BADGE_MS_PER_BRICK: 6000,
    VETERAN_WALLS: 5,
  },

  // ── Streak ──
  TZ_CHANGE_COOLDOWN_DAYS: 14,
};

// Tiers group levels for names/colours only.
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

/** Full badge catalogue: id -> { id, group, name, desc, icon, color, level? }. */
function buildBadgeCatalog() {
  const b = {};
  const add = (o) => { b[o.id] = o; };

  // Per-level badges: earn one by finishing a lesson (mission) and one by clearing a wall,
  // while at (or above) that level. Catch-up rule: each finish awards the LOWEST unearned
  // one you are eligible for, so nothing is ever permanently missable.
  for (let L = 1; L <= CONFIG.MAX_LEVEL; L++) {
    const t = tierForLevel(L);
    add({ id: `lesson_L${L}`, group: 'lesson', level: L, icon: '📘', color: t.color,
          name: `${t.name} Scholar · Lv ${L}`, desc: `Finish a lesson once you have reached level ${L}.` });
    add({ id: `game_L${L}`, group: 'game', level: L, icon: '🧱', color: t.color,
          name: `${t.name} Wall Breaker · Lv ${L}`, desc: `Clear a Wall Breaker wall once you have reached level ${L}.` });
  }
  // Streak
  [3, 7, 14, 30, 60, 100].forEach((n) => add({ id: `streak_${n}`, group: 'streak', icon: '🔥', color: '#f97316',
    name: `${n}-Day Streak`, desc: `Learn on ${n} days in a row.` }));
  // Game specials (these replace the four local-only badges game.js used to hand out)
  add({ id: 'game_first',    group: 'game', icon: '🧱', color: '#38bdf8', name: 'First Wall',      desc: 'Clear your first counted wall.' });
  add({ id: 'game_flawless', group: 'game', icon: '💎', color: '#22d3ee', name: 'Flawless',        desc: 'Clear a counted wall with no misses.' });
  add({ id: 'game_speed',    group: 'game', icon: '⚡', color: '#facc15', name: 'Speed Breaker',   desc: 'Clear a counted wall at 6 seconds a brick or faster.' });
  add({ id: 'game_veteran',  group: 'game', icon: '🏗️', color: '#f59e0b', name: 'Wall Veteran',    desc: `Clear ${CONFIG.GAME.VETERAN_WALLS} counted walls.` });
  // Lessons
  add({ id: 'missions_1',  group: 'lesson', icon: '🎓', color: '#38bdf8', name: 'First Lesson',     desc: 'Complete your first lesson.' });
  add({ id: 'missions_10', group: 'lesson', icon: '📚', color: '#2dd4bf', name: 'Ten Lessons',      desc: 'Complete 10 lessons.' });
  add({ id: 'missions_25', group: 'lesson', icon: '🏅', color: '#c084fc', name: 'Twenty-Five Lessons', desc: 'Complete 25 lessons.' });
  return b;
}

const STREAK_BADGE_DAYS = [3, 7, 14, 30, 60, 100];
const MISSION_COUNT_BADGES = [[1, 'missions_1'], [10, 'missions_10'], [25, 'missions_25']];

module.exports = { CONFIG, TIERS, tierForLevel, buildBadgeCatalog, STREAK_BADGE_DAYS, MISSION_COUNT_BADGES };
