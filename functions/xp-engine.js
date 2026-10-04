/**
 * functions/xp-engine.js — pure XP rules (no Firebase, no I/O), so they can be unit-tested in
 * plain Node (functions/_test_xp-engine.node.js). xp.js wires these into Firestore.
 */
'use strict';
const { CONFIG, buildBadgeCatalog, STREAK_BADGE_DAYS, MISSION_COUNT_BADGES } = require('./xp-config');

const BADGES = buildBadgeCatalog();

/* ── levels ─────────────────────────────────────────────────── */
/** Total XP needed to REACH `level` (Lv1 = 0). */
function xpForLevel(level) {
  const n = Math.max(1, Math.min(CONFIG.MAX_LEVEL, level | 0)) - 1;
  return n * CONFIG.LEVEL_BASE + CONFIG.LEVEL_STEP * (n * (n - 1)) / 2;
}
function levelFromXp(xp) {
  let lv = 1;
  while (lv < CONFIG.MAX_LEVEL && xp >= xpForLevel(lv + 1)) lv++;
  return lv;
}
function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= CONFIG.MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const lo = xpForLevel(level), hi = xpForLevel(level + 1);
  return { level, into: xp - lo, need: hi - lo, pct: Math.floor(((xp - lo) / (hi - lo)) * 100), maxed: false };
}

/* ── dates / timezone ───────────────────────────────────────── */
function isValidTz(tz) {
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
/** 'YYYY-MM-DD' of `ms` in the given IANA zone. */
function dayKey(ms, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
function shiftDayKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
function tzOffsetMs(ms, tz) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
/** The instant local midnight STARTS on day `key` in `tz`. */
function startOfDayMs(key, tz) {
  const [y, m, d] = key.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess, tz), tz);
}
/** ISO week key in UTC, e.g. '2026-W40' (leaderboard "this week" resets Monday 00:00 UTC). */
function weekKeyUtc(ms) {
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const wk = Math.ceil(((d - yStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

/* ── streak ─────────────────────────────────────────────────── */
/** Streak after activity on local day `today`. */
function applyStreak(s, today) {
  const cur = s || { current: 0, longest: 0, lastDay: null };
  if (cur.lastDay === today) return { ...cur };
  const next = cur.lastDay === shiftDayKey(today, -1) ? cur.current + 1 : 1;
  return { current: next, longest: Math.max(cur.longest || 0, next), lastDay: today };
}
/** What to DISPLAY: a streak is live through the end of the day after the last activity. */
function effectiveStreak(s, today) {
  if (!s || !s.lastDay) return 0;
  return (s.lastDay === today || s.lastDay === shiftDayKey(today, -1)) ? s.current : 0;
}

/* ── lesson XP ──────────────────────────────────────────────── */
function lessonItemXp(kind, bonusXP) {
  const base = CONFIG.LESSON_ITEM_XP[kind];
  if (!base) return 0;
  return base + (kind === 'PRACTICE' && bonusXP ? bonusXP : 0);
}
function missionBonus(signCount) {
  const m = CONFIG.MISSION_BONUS;
  return Math.min(m.max, m.base + m.perSign * signCount);
}
/** Halve (never drop) lesson XP once today's soft cap is spent. */
function applyLessonSoftCap(rawXp, lessonXpToday) {
  const room = Math.max(0, CONFIG.LESSON_DAILY_SOFT_CAP - lessonXpToday);
  if (rawXp <= room) return rawXp;
  return room + Math.floor((rawXp - room) * CONFIG.LESSON_OVER_CAP_FACTOR);
}

/* ── game XP ────────────────────────────────────────────────── */
function wallDecayMult(wallsAlreadyToday) {
  for (const t of CONFIG.GAME.WALL_DECAY) if (wallsAlreadyToday < t.upTo) return t.mult;
  return 0;
}
/**
 * bricks: [{ learned:boolean, motion:boolean }] (all bricks of a fully cleared wall)
 * returns { eligible, xp, raw, mult, ... }. `xp` already respects decay and the daily cap.
 */
function gameWallXp({ bricks, wrong, wallsToday, gameXpToday }) {
  const G = CONFIG.GAME;
  const learnedBricks = bricks.filter((b) => b.learned);
  const eligible = learnedBricks.length >= G.MIN_LEARNED_BRICKS;
  if (!eligible) return { eligible: false, xp: 0, raw: 0, reason: 'not_enough_learned' };
  const correct = bricks.length;
  const acc = correct / Math.max(1, correct + wrong);
  const accMult = (G.ACC_TIERS.find((t) => acc >= t.min) || G.ACC_TIERS[G.ACC_TIERS.length - 1]).mult;
  const base = learnedBricks.reduce((s, b) => s + (b.motion ? G.BRICK_XP.motion : G.BRICK_XP.static), 0);
  const flawless = wrong === 0;
  const raw = base * accMult + G.CLEAR_BONUS + (flawless ? G.FLAWLESS_BONUS : 0);
  const decay = wallDecayMult(wallsToday);
  const room = Math.max(0, G.DAILY_XP_CAP - gameXpToday);
  const xp = Math.min(Math.round(raw * decay), room);
  return { eligible: true, xp, raw: Math.round(raw), accuracy: acc, flawless, decay, capped: xp < Math.round(raw * decay) || (decay > 0 && room === 0), reason: xp === 0 ? (decay === 0 ? 'diminished' : 'daily_cap') : null };
}
/**
 * Plausibility check of a finished session. broken: [{ s, t, m }] (sign, ms since start, motion?).
 * Returns null if fine, else a reason string. Honest play always passes; a script that
 * fires the "wall cleared" call has to also fake believable timing.
 */
function validateGameTiming({ sessionSigns, broken, serverElapsedMs }) {
  const G = CONFIG.GAME;
  if (!Array.isArray(broken) || broken.length !== sessionSigns.length) return 'incomplete_wall';
  const seen = new Set(); const want = new Set(sessionSigns);
  let prev = 0, minTotal = 0;
  for (const b of broken) {
    if (!b || typeof b.s !== 'string' || !want.has(b.s) || seen.has(b.s)) return 'bad_bricks';
    seen.add(b.s);
    if (typeof b.t !== 'number' || !isFinite(b.t) || b.t < prev) return 'bad_timing';
    const gap = G.MIN_GAP_MS[b.m ? 'motion' : 'static'];
    if (b.t - prev < gap) return 'too_fast';
    minTotal += gap; prev = b.t;
  }
  if (prev > serverElapsedMs + G.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (serverElapsedMs < minTotal) return 'too_fast';
  return null;
}

/* ── badges ─────────────────────────────────────────────────── */
/** Lowest unearned `${group}_L{n}` badge with n <= level, or null. */
function nextLevelBadge(group, level, owned) {
  for (let n = 1; n <= Math.min(level, CONFIG.MAX_LEVEL); n++) {
    const id = `${group}_L${n}`;
    if (!owned[id]) return id;
  }
  return null;
}
function streakBadgesFor(current) { return STREAK_BADGE_DAYS.filter((d) => current >= d).map((d) => `streak_${d}`); }
function missionCountBadgesFor(count) { return MISSION_COUNT_BADGES.filter(([n]) => count >= n).map(([, id]) => id); }

module.exports = {
  BADGES, xpForLevel, levelFromXp, levelProgress,
  isValidTz, dayKey, shiftDayKey, startOfDayMs, weekKeyUtc,
  applyStreak, effectiveStreak,
  lessonItemXp, missionBonus, applyLessonSoftCap,
  wallDecayMult, gameWallXp, validateGameTiming,
  nextLevelBadge, streakBadgesFor, missionCountBadgesFor,
};
