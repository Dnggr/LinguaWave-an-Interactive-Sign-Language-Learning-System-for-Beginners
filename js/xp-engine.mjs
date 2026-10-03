/**
 * Pure LinguaWave XP engine for Spark/browser and Node.
 *
 * There is no Firebase, DOM, local storage, or window access in this module.
 * These limits make the engine easy to import in Node and keep game/lesson
 * calculations in one place. Since a browser owns the writes on Spark, the
 * client rules are best-effort guardrails: a determined learner can forge
 * claims inside the Firestore caps.
 */

export const CONFIG = Object.freeze({
  VERSION: 1,
  MAX_LEVEL: 30,
  LEVEL_BASE: 100,
  LEVEL_STEP: 25,
  LESSON_ITEM_XP: Object.freeze({ LESSON: 6, BOOSTER: 3, PRACTICE: 5 }),
  MISSION_BONUS: Object.freeze({ base: 25, perSign: 3, max: 80 }),
  MISSION_SKIP_FACTOR: 0.4,
  MISSION_FULL_LESSON_RATIO: 0.8,
  LESSON_DAILY_SOFT_CAP: 800,
  LESSON_OVER_CAP_FACTOR: 0.5,
  MIN_CLAIM_GAP_MS: 2000,
  MIN_SKIP_CLAIM_GAP_MS: 90000,
  BACKFILL_FACTOR: 0.5,
  BACKFILL_MAX_XP: 1500,
  BACKFILL_WINDOW_DAYS: 14,
  LAUNCH_AT_ISO: '2026-10-01T00:00:00Z',
  TZ_CHANGE_COOLDOWN_DAYS: 14,
  GAME: Object.freeze({
    MIN_LEARNED_BRICKS: 6,
    BRICK_XP: Object.freeze({ static: 1, motion: 2 }),
    CLEAR_BONUS: 3,
    FLAWLESS_BONUS: 3,
    ACC_TIERS: Object.freeze([{ min: 0.85, mult: 1 }, { min: 0.60, mult: 0.8 }, { min: 0, mult: 0.5 }]),
    WALL_DECAY: Object.freeze([{ upTo: 3, mult: 1 }, { upTo: 5, mult: 0.5 }, { upTo: 7, mult: 0.25 }, { upTo: 999, mult: 0 }]),
    DAILY_XP_CAP: 90,
    MAX_BRICKS: 21,
    MIN_GAP_MS: Object.freeze({ static: 400, motion: 3000 }),
    CLOCK_SLACK_MS: 3000,
    SESSION_TTL_MS: 30 * 60 * 1000,
    SPEED_BADGE_MS_PER_BRICK: 6000,
    VETERAN_WALLS: 5,
  }),
});

export const TIERS = Object.freeze([
  { from: 1, name: 'Ripple', icon: '💧', color: '#38bdf8' },
  { from: 5, name: 'Current', icon: '🌊', color: '#22d3ee' },
  { from: 10, name: 'Tide', icon: '🐚', color: '#2dd4bf' },
  { from: 15, name: 'Swell', icon: '🏄', color: '#818cf8' },
  { from: 20, name: 'Crest', icon: '🔱', color: '#c084fc' },
  { from: 25, name: 'Tsunami', icon: '🌋', color: '#f59e0b' },
]);

function tierForLevel(level) {
  let tier = TIERS[0];
  for (const candidate of TIERS) if (level >= candidate.from) tier = candidate;
  return tier;
}

export function xpForLevel(level) {
  const n = Math.max(1, Math.min(CONFIG.MAX_LEVEL, Number(level) | 0)) - 1;
  return n * CONFIG.LEVEL_BASE + CONFIG.LEVEL_STEP * n * (n - 1) / 2;
}

export const LEVEL_XP = Object.freeze(Array.from({ length: CONFIG.MAX_LEVEL }, (_, i) => xpForLevel(i + 1)));

export function buildBadgeCatalog() {
  const badges = {};
  for (let level = 1; level <= CONFIG.MAX_LEVEL; level++) {
    const tier = tierForLevel(level);
    badges[`lesson_L${level}`] = { id: `lesson_L${level}`, group: 'lesson', level, icon: '📘', color: tier.color,
      name: `${tier.name} Scholar · Lv ${level}`, desc: `Finish a lesson once you have reached level ${level}.` };
    badges[`game_L${level}`] = { id: `game_L${level}`, group: 'game', level, icon: '🧱', color: tier.color,
      name: `${tier.name} Wall Breaker · Lv ${level}`, desc: `Clear a Wall Breaker wall once you have reached level ${level}.` };
  }
  for (const days of [3, 7, 14, 30, 60, 100]) badges[`streak_${days}`] = {
    id: `streak_${days}`, group: 'streak', icon: '🔥', color: '#f97316', name: `${days}-Day Streak`, desc: `Learn on ${days} days in a row.`,
  };
  badges.game_first = { id: 'game_first', group: 'game', icon: '🧱', color: '#38bdf8', name: 'First Wall', desc: 'Clear your first counted wall.' };
  badges.game_flawless = { id: 'game_flawless', group: 'game', icon: '💎', color: '#22d3ee', name: 'Flawless', desc: 'Clear a counted wall with no misses.' };
  badges.game_speed = { id: 'game_speed', group: 'game', icon: '⚡', color: '#facc15', name: 'Speed Breaker', desc: 'Clear a counted wall at 6 seconds a brick or faster.' };
  badges.game_veteran = { id: 'game_veteran', group: 'game', icon: '🏗️', color: '#f59e0b', name: 'Wall Veteran', desc: `Clear ${CONFIG.GAME.VETERAN_WALLS} counted walls.` };
  for (const [count, id, name, icon, color] of [
    [1, 'missions_1', 'First Lesson', '🎓', '#38bdf8'],
    [10, 'missions_10', 'Ten Lessons', '📚', '#2dd4bf'],
    [25, 'missions_25', 'Twenty-Five Lessons', '🏅', '#c084fc'],
  ]) badges[id] = { id, group: 'lesson', icon, color, name, desc: `Complete ${count === 1 ? 'your first lesson' : `${count} lessons`}.` };
  return badges;
}

export const BADGES = Object.freeze(buildBadgeCatalog());
export const STREAK_BADGE_DAYS = Object.freeze([3, 7, 14, 30, 60, 100]);
export const MISSION_COUNT_BADGES = Object.freeze([[1, 'missions_1'], [10, 'missions_10'], [25, 'missions_25']]);

export function levelFromXp(xp) {
  let level = 1;
  while (level < CONFIG.MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= CONFIG.MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const lo = xpForLevel(level), hi = xpForLevel(level + 1);
  return { level, into: xp - lo, need: hi - lo, pct: Math.floor((xp - lo) * 100 / (hi - lo)), maxed: false };
}

export function isValidTz(tz) {
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

export function dayKey(ms, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

export function shiftDayKey(key, delta) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function tzOffsetMs(ms, tz) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).forEach((part) => { parts[part.type] = part.value; });
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - Math.floor(ms / 1000) * 1000;
}

export function startOfDayMs(key, tz) {
  const [year, month, day] = key.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess, tz), tz);
}

export function weekKeyUtc(ms) {
  const date = new Date(ms);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function applyStreak(streak, today) {
  const current = streak || { current: 0, longest: 0, lastDay: null };
  if (current.lastDay === today) return { ...current };
  const next = current.lastDay === shiftDayKey(today, -1) ? current.current + 1 : 1;
  return { current: next, longest: Math.max(current.longest || 0, next), lastDay: today };
}

export function effectiveStreak(streak, today) {
  if (!streak?.lastDay) return 0;
  return (streak.lastDay === today || streak.lastDay === shiftDayKey(today, -1)) ? streak.current : 0;
}

export function lessonItemXp(kind, bonusXP = 0) {
  const base = CONFIG.LESSON_ITEM_XP[kind];
  if (!base) return 0;
  return base + (kind === 'PRACTICE' && Number(bonusXP) ? Number(bonusXP) : 0);
}

export function missionBonus(signCount) {
  return Math.min(CONFIG.MISSION_BONUS.max, CONFIG.MISSION_BONUS.base + CONFIG.MISSION_BONUS.perSign * signCount);
}

export function applyLessonSoftCap(rawXp, lessonXpToday) {
  const room = Math.max(0, CONFIG.LESSON_DAILY_SOFT_CAP - lessonXpToday);
  if (rawXp <= room) return rawXp;
  return room + Math.floor((rawXp - room) * CONFIG.LESSON_OVER_CAP_FACTOR);
}

export function wallDecayMult(wallsAlreadyToday) {
  return CONFIG.GAME.WALL_DECAY.find((tier) => wallsAlreadyToday < tier.upTo)?.mult || 0;
}

export function gameWallXp({ bricks, wrong, wallsToday, gameXpToday }) {
  const game = CONFIG.GAME;
  const learnedBricks = bricks.filter((brick) => brick.learned);
  if (learnedBricks.length < game.MIN_LEARNED_BRICKS) return { eligible: false, xp: 0, raw: 0, reason: 'not_enough_learned' };
  const accuracy = bricks.length / Math.max(1, bricks.length + wrong);
  const accMult = (game.ACC_TIERS.find((tier) => accuracy >= tier.min) || game.ACC_TIERS.at(-1)).mult;
  const base = learnedBricks.reduce((sum, brick) => sum + (brick.motion ? game.BRICK_XP.motion : game.BRICK_XP.static), 0);
  const flawless = wrong === 0;
  const raw = base * accMult + game.CLEAR_BONUS + (flawless ? game.FLAWLESS_BONUS : 0);
  const decay = wallDecayMult(wallsToday);
  const room = Math.max(0, game.DAILY_XP_CAP - gameXpToday);
  const xp = Math.min(Math.round(raw * decay), room);
  return { eligible: true, xp, raw: Math.round(raw), accuracy, flawless, decay,
    capped: xp < Math.round(raw * decay) || (decay > 0 && room === 0),
    reason: xp === 0 ? (decay === 0 ? 'diminished' : 'daily_cap') : null };
}

export function validateGameTiming({ sessionSigns, broken, elapsedMs }) {
  const game = CONFIG.GAME;
  if (!Array.isArray(broken) || broken.length !== sessionSigns.length) return 'incomplete_wall';
  const seen = new Set();
  const expected = new Set(sessionSigns);
  let previous = 0;
  let minTotal = 0;
  for (const brick of broken) {
    if (!brick || typeof brick.s !== 'string' || !expected.has(brick.s) || seen.has(brick.s)) return 'bad_bricks';
    seen.add(brick.s);
    if (typeof brick.t !== 'number' || !Number.isFinite(brick.t) || brick.t < previous) return 'bad_timing';
    const minGap = game.MIN_GAP_MS[brick.m ? 'motion' : 'static'];
    if (brick.t - previous < minGap) return 'too_fast';
    minTotal += minGap;
    previous = brick.t;
  }
  if (previous > elapsedMs + game.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (elapsedMs < minTotal) return 'too_fast';
  return null;
}

export function nextLevelBadge(group, level, owned) {
  for (let current = 1; current <= Math.min(level, CONFIG.MAX_LEVEL); current++) {
    const id = `${group}_L${current}`;
    if (!owned[id]) return id;
  }
  return null;
}

export const streakBadgesFor = (current) => STREAK_BADGE_DAYS.filter((days) => current >= days).map((days) => `streak_${days}`);
export const missionCountBadgesFor = (count) => MISSION_COUNT_BADGES.filter(([required]) => count >= required).map(([, id]) => id);

export function newState(now) {
  return {
    v: 1, xp: 0, level: 1, weeklyXp: 0, weekKey: weekKeyUtc(now), tz: null, tzChangedAt: 0,
    streak: { current: 0, longest: 0, lastDay: null }, badges: {}, lessonItems: {}, missionsDone: {}, learnedSigns: [],
    daily: { day: null, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 },
    totals: { lessonXp: 0, gameXp: 0, walls: 0, countedWalls: 0, timeAttacks: 0, missions: 0 },
    lastClaimAt: 0, lastSkipAt: 0, backfilled: false, hidden: false, createdAt: now,
  };
}

export function normalizeState(raw, now) {
  const empty = newState(now);
  const state = { ...empty, ...(raw || {}) };
  state.streak = { ...empty.streak, ...(state.streak || {}) };
  state.daily = { ...empty.daily, ...(state.daily || {}) };
  state.totals = { ...empty.totals, ...(state.totals || {}) };
  state.badges ||= {};
  state.lessonItems ||= {};
  state.missionsDone ||= {};
  state.learnedSigns ||= [];
  return state;
}

export function resolveTimezone(state, hint, now) {
  if (!state.tz) {
    state.tz = isValidTz(hint) ? hint : 'UTC';
    state.tzChangedAt = now;
  } else if (isValidTz(hint) && hint !== state.tz && now - (state.tzChangedAt || 0) >= CONFIG.TZ_CHANGE_COOLDOWN_DAYS * 86400000) {
    // This cooldown limits accidental timezone flips; changing the device clock can still cheat day boundaries.
    state.tz = hint;
    state.tzChangedAt = now;
  }
}

export function rollover(state, now) {
  const today = dayKey(now, state.tz || 'UTC');
  if (state.daily.day !== today) state.daily = { day: today, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 };
  const week = weekKeyUtc(now);
  if (state.weekKey !== week) {
    state.weekKey = week;
    state.weeklyXp = 0;
  }
  return today;
}

export function addXp(state, value, out) {
  if (value <= 0) return;
  const before = state.level;
  state.xp += value;
  state.weeklyXp += value;
  state.level = levelFromXp(state.xp);
  for (let level = before + 1; level <= state.level; level++) (out.levelUps ||= []).push(level);
}

export function grantBadge(state, id, out, now) {
  if (!BADGES[id] || state.badges[id]) return;
  state.badges[id] = now;
  (out.newBadges ||= []).push(id);
}

export function applyActivityStreak(state, today, out, now) {
  state.streak = applyStreak(state.streak, today);
  streakBadgesFor(state.streak.current).forEach((id) => grantBadge(state, id, out, now));
}

export function applyLessonItem(state, mission, itemIndex, { now, today }) {
  const item = mission.items[itemIndex];
  if (!item || !CONFIG.LESSON_ITEM_XP[item.kind]) return { ok: false, reason: 'invalid_item' };
  const claimed = state.lessonItems[mission.id] || [];
  if (claimed.includes(itemIndex)) return { ok: true, duplicate: true, xpGained: 0, skipStateWrite: true };
  if (state.lastClaimAt && now - state.lastClaimAt < CONFIG.MIN_CLAIM_GAP_MS) {
    return { ok: false, reason: 'too_fast', retryAfterMs: CONFIG.MIN_CLAIM_GAP_MS - (now - state.lastClaimAt), skipStateWrite: true };
  }
  const xp = applyLessonSoftCap(lessonItemXp(item.kind, item.bonusXP), state.daily.lessonXp);
  const out = { ok: true, xpGained: xp };
  state.lessonItems[mission.id] = claimed.concat(itemIndex).sort((a, b) => a - b);
  state.lastClaimAt = now;
  if (item.kind === 'LESSON' && item.signId && !state.learnedSigns.includes(item.signId)) state.learnedSigns.push(item.signId);
  state.daily.lessonXp += xp;
  state.totals.lessonXp += xp;
  addXp(state, xp, out);
  applyActivityStreak(state, today, out, now);
  return out;
}

export function applyMissionComplete(state, mission, { now, today }) {
  if (state.missionsDone[mission.id]) return { ok: true, duplicate: true, xpGained: 0, skipStateWrite: true };
  const lessonIndexes = mission.items.map((item, index) => item.kind === 'LESSON' ? index : -1).filter((index) => index >= 0);
  const claimed = new Set(state.lessonItems[mission.id] || []);
  const done = lessonIndexes.filter((index) => claimed.has(index)).length;
  const full = !lessonIndexes.length || done / lessonIndexes.length >= CONFIG.MISSION_FULL_LESSON_RATIO;
  if (!full && state.lastSkipAt && now - state.lastSkipAt < CONFIG.MIN_SKIP_CLAIM_GAP_MS) {
    return { ok: false, reason: 'too_fast', retryAfterMs: CONFIG.MIN_SKIP_CLAIM_GAP_MS - (now - state.lastSkipAt), skipStateWrite: true };
  }
  const out = { ok: true, path: full ? 'full' : 'skip' };
  const raw = Math.round(missionBonus(lessonIndexes.length) * (full ? 1 : CONFIG.MISSION_SKIP_FACTOR));
  const xp = applyLessonSoftCap(raw, state.daily.lessonXp);
  state.missionsDone[mission.id] = full ? 'full' : 'skip';
  lessonIndexes.forEach((index) => {
    const signId = mission.items[index].signId;
    if (signId && !state.learnedSigns.includes(signId)) state.learnedSigns.push(signId);
  });
  state.daily.lessonXp += xp;
  state.totals.lessonXp += xp;
  state.totals.missions += 1;
  state.lastClaimAt = now;
  if (!full) state.lastSkipAt = now;
  addXp(state, xp, out);
  applyActivityStreak(state, today, out, now);
  missionCountBadgesFor(state.totals.missions).forEach((id) => grantBadge(state, id, out, now));
  const badge = nextLevelBadge('lesson', state.level, state.badges);
  if (badge) grantBadge(state, badge, out, now);
  out.xpGained = xp;
  return out;
}

export function applyBackfill(state, missions, completedItemIds, { now }) {
  if (state.backfilled) return { ok: true, duplicate: true, backfilled: true, xpGained: 0, skipStateWrite: true };
  const completed = new Set(completedItemIds || []);
  let raw = 0;
  for (const mission of missions) {
    const have = new Set(state.lessonItems[mission.id] || []);
    mission.items.forEach((item, index) => {
      const itemKey = `${mission.id}_${index}_${item.kind}_${item.signId || mission.category || ''}`;
      if (!completed.has(itemKey) || have.has(index)) return;
      if (item.kind === 'QUIZ') {
        if (!state.missionsDone[mission.id]) {
          state.missionsDone[mission.id] = 'backfill';
          state.totals.missions += 1;
          raw += missionBonus(mission.items.filter((candidate) => candidate.kind === 'LESSON').length);
        }
        return;
      }
      if (!CONFIG.LESSON_ITEM_XP[item.kind]) return;
      have.add(index);
      if (item.kind === 'LESSON' && item.signId && !state.learnedSigns.includes(item.signId)) state.learnedSigns.push(item.signId);
      raw += lessonItemXp(item.kind, item.bonusXP);
    });
    if (have.size) state.lessonItems[mission.id] = [...have].sort((a, b) => a - b);
  }
  const xp = Math.min(CONFIG.BACKFILL_MAX_XP, Math.round(raw * CONFIG.BACKFILL_FACTOR));
  state.backfilled = true;
  state.totals.lessonXp += xp;
  state.daily.lessonXp += xp;
  const out = { ok: true, backfilled: true, xpGained: xp };
  addXp(state, xp, out);
  missionCountBadgesFor(state.totals.missions).forEach((id) => grantBadge(state, id, out, now));
  return out;
}

export function validateGameSigns(signs, mode, signTypes) {
  const max = mode === 'timeAttack' ? 10 : CONFIG.GAME.MAX_BRICKS;
  if (!['wall', 'timeAttack'].includes(mode) || !Array.isArray(signs) || !signs.length || signs.length > max ||
      signs.some((sign) => typeof sign !== 'string' || !signTypes[sign]) || new Set(signs).size !== signs.length) return false;
  return true;
}

export function applyGameFinish(state, session, broken, wrong, learnedSigns, signTypes, { now, today }) {
  const elapsed = now - session.startedAt;
  if (elapsed > CONFIG.GAME.SESSION_TTL_MS) return { ok: false, reason: 'expired' };
  const timingIssue = validateGameTiming({ sessionSigns: session.signs, broken, elapsedMs: elapsed });
  if (timingIssue) return { ok: false, reason: timingIssue };
  if (broken.some((brick) => (brick.m === true) !== (signTypes[brick.s] === 'motion'))) return { ok: false, reason: 'sign_type_mismatch' };

  const learned = new Set(learnedSigns);
  const out = { ok: true, counted: false };
  if (session.mode === 'timeAttack') {
    const targets = broken.map((brick) => ({ learned: learned.has(brick.s), motion: brick.m === true }));
    if (targets.length !== session.signs.length || targets.some((target) => !target.learned)) {
      return { ok: true, reason: 'not_enough_learned', xpGained: 0, counted: false, skipStateWrite: true };
    }
    const accuracy = targets.length / Math.max(1, targets.length + wrong);
    const multiplier = (CONFIG.GAME.ACC_TIERS.find((tier) => accuracy >= tier.min) || CONFIG.GAME.ACC_TIERS.at(-1)).mult;
    const rawBase = targets.reduce((sum, target) => sum + (target.motion ? CONFIG.GAME.BRICK_XP.motion : CONFIG.GAME.BRICK_XP.static), 0);
    const flawless = wrong === 0;
    const raw = Math.round(rawBase * multiplier + CONFIG.GAME.CLEAR_BONUS + (flawless ? CONFIG.GAME.FLAWLESS_BONUS : 0));
    const xp = Math.min(raw, Math.max(0, CONFIG.GAME.DAILY_XP_CAP - state.daily.gameXp));
    state.daily.gameXp += xp;
    state.daily.timeAttacks += 1;
    state.totals.gameXp += xp;
    state.totals.timeAttacks += 1;
    addXp(state, xp, out);
    if (xp > 0) applyActivityStreak(state, today, out, now);
    Object.assign(out, { counted: xp > 0, xpGained: xp, accuracy, flawless, targetCount: targets.length,
      reason: xp ? null : (state.daily.gameXp >= CONFIG.GAME.DAILY_XP_CAP ? 'daily_cap' : 'no_xp') });
    return out;
  }

  const bricks = broken.map((brick) => ({ learned: learned.has(brick.s), motion: brick.m === true }));
  const result = gameWallXp({ bricks, wrong, wallsToday: state.daily.walls, gameXpToday: state.daily.gameXp });
  if (!result.eligible) return { ok: true, counted: false, xpGained: 0, reason: result.reason, skipStateWrite: true };
  state.daily.walls += 1;
  state.totals.walls += 1;
  Object.assign(out, { accuracy: result.accuracy, flawless: result.flawless, multiplier: result.decay, capped: !!result.capped });
  if (result.xp > 0) {
    state.daily.gameXp += result.xp;
    state.totals.gameXp += result.xp;
    state.totals.countedWalls += 1;
    addXp(state, result.xp, out);
    applyActivityStreak(state, today, out, now);
    grantBadge(state, 'game_first', out, now);
    if (result.flawless) grantBadge(state, 'game_flawless', out, now);
    if (elapsed / session.signs.length <= CONFIG.GAME.SPEED_BADGE_MS_PER_BRICK) grantBadge(state, 'game_speed', out, now);
    if (state.totals.countedWalls >= CONFIG.GAME.VETERAN_WALLS) grantBadge(state, 'game_veteran', out, now);
    const badge = nextLevelBadge('game', state.level, state.badges);
    if (badge) grantBadge(state, badge, out, now);
    out.counted = true;
  }
  out.xpGained = result.xp;
  if (!result.xp) out.reason = result.reason;
  return out;
}

export function profileData(state, name, now, avatar) {
  const tz = state.tz || 'UTC';
  const streak = state.streak.current;
  const recentBadges = Object.entries(state.badges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return {
    name: (String(name || 'Learner').trim().slice(0, 30) || 'Learner'),
    xp: state.xp,
    level: state.level,
    weeklyXp: state.weeklyXp,
    weekKey: state.weekKey,
    streak,
    longestStreak: state.streak.longest,
    streakExpiresAt: streak ? startOfDayMs(shiftDayKey(state.streak.lastDay, 2), tz) : null,
    badgeCount: Object.keys(state.badges).length,
    recentBadges,
    ...(avatar && /^avatar-\d{2}$/.test(avatar) ? { avatar } : {}),
  };
}

export function summary(state, now, out = {}) {
  return {
    ok: true, ...out, xp: state.xp, level: state.level, weeklyXp: state.weeklyXp,
    streak: effectiveStreak(state.streak, dayKey(now, state.tz || 'UTC')),
    longestStreak: state.streak.longest,
    dailyLessonXp: state.daily.lessonXp,
    dailyGameXp: state.daily.gameXp,
    dailyGameCap: CONFIG.GAME.DAILY_XP_CAP,
  };
}
