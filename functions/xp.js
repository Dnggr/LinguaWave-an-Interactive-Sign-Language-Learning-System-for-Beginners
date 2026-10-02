/**
 * functions/xp.js — server-authoritative XP callables and leaderboard triggers.
 * All writes to xpState, publicProfiles, xpSessions and xpEvents happen here.
 */
'use strict';

const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const E = require('./xp-engine');
const { CONFIG: C } = require('./xp-config');
const M = require('./curriculum-manifest.json');

const ADMIN_EMAIL = 'linguawave.project@gmail.com';
const db = () => admin.firestore();
const nowMs = () => Date.now();
const refs = (uid) => ({
  state: db().doc(`xpState/${uid}`), profile: db().doc(`publicProfiles/${uid}`),
  user: db().doc(`users/${uid}`), session: db().doc(`xpSessions/${uid}`),
});

function requireLearner(request) {
  const auth = request && request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (auth.token && auth.token.email_verified === false) throw new HttpsError('permission-denied', 'Verify your email first.');
  if ((auth.token?.email || '').toLowerCase() === ADMIN_EMAIL) return { uid: auth.uid, admin: true };
  return { uid: auth.uid, admin: false };
}

function newState(now) {
  return {
    v: 1, xp: 0, level: 1, weeklyXp: 0, weekKey: E.weekKeyUtc(now), tz: null, tzChangedAt: 0,
    streak: { current: 0, longest: 0, lastDay: null }, badges: {}, lessonItems: {}, missionsDone: {}, learnedSigns: [],
    daily: { day: null, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 },
    totals: { lessonXp: 0, gameXp: 0, walls: 0, countedWalls: 0, timeAttacks: 0, missions: 0 },
    lastClaimAt: 0, lastSkipAt: 0, backfilled: false, hidden: false, createdAt: now,
  };
}
function normalizeState(raw, now) {
  const s = { ...newState(now), ...(raw || {}) };
  s.streak = { ...newState(now).streak, ...(s.streak || {}) };
  s.daily = { ...newState(now).daily, ...(s.daily || {}) };
  s.totals = { ...newState(now).totals, ...(s.totals || {}) };
  s.badges ||= {}; s.lessonItems ||= {}; s.missionsDone ||= {}; s.learnedSigns ||= [];
  return s;
}
function resolveTz(s, hint, now) {
  if (!s.tz) { s.tz = E.isValidTz(hint) ? hint : 'UTC'; s.tzChangedAt = now; }
  else if (E.isValidTz(hint) && hint !== s.tz && now - (s.tzChangedAt || 0) >= C.TZ_CHANGE_COOLDOWN_DAYS * 86400000) {
    s.tz = hint; s.tzChangedAt = now;
  }
}
function rollover(s, now) {
  const today = E.dayKey(now, s.tz || 'UTC');
  if (s.daily.day !== today) s.daily = { day: today, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 };
  const week = E.weekKeyUtc(now);
  if (s.weekKey !== week) { s.weekKey = week; s.weeklyXp = 0; }
  return today;
}
function addXp(s, value, out) {
  if (value <= 0) return;
  const before = s.level;
  s.xp += value; s.weeklyXp += value; s.level = E.levelFromXp(s.xp);
  for (let l = before + 1; l <= s.level; l++) (out.levelUps ||= []).push(l);
}
function grant(s, id, out, now) {
  if (!E.BADGES[id] || s.badges[id]) return;
  s.badges[id] = now; (out.newBadges ||= []).push(id);
}
function applyStreak(s, today, out, now) {
  s.streak = E.applyStreak(s.streak, today);
  E.streakBadgesFor(s.streak.current).forEach((id) => grant(s, id, out, now));
}
function safeName(userData, auth) {
  return (String(userData?.name || auth?.token?.name || auth?.token?.email?.split('@')[0] || 'Learner').trim().slice(0, 30) || 'Learner');
}
function profileData(s, name, now, avatar) {
  const tz = s.tz || 'UTC', live = E.effectiveStreak(s.streak, E.dayKey(now, tz));
  const recentBadges = Object.entries(s.badges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return {
    name, xp: s.xp, level: s.level, weeklyXp: s.weeklyXp, weekKey: s.weekKey,
    streak: live, longestStreak: s.streak.longest,
    streakExpiresAt: live ? E.startOfDayMs(E.shiftDayKey(s.streak.lastDay, 2), tz) : null,
    badgeCount: Object.keys(s.badges).length, recentBadges, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(avatar && /^avatar-\d{2}$/.test(avatar) ? { avatar } : {}),
  };
}
function summary(s, now, out = {}) {
  return { ok: true, ...out, xp: s.xp, level: s.level, weeklyXp: s.weeklyXp,
    streak: E.effectiveStreak(s.streak, E.dayKey(now, s.tz || 'UTC')), longestStreak: s.streak.longest,
    dailyLessonXp: s.daily.lessonXp, dailyGameXp: s.daily.gameXp, dailyGameCap: C.GAME.DAILY_XP_CAP };
}

async function updateLearner(uid, hint, mutate) {
  const r = refs(uid), now = nowMs();
  return db().runTransaction(async (tx) => {
    const [stateSnap, userSnap] = await Promise.all([tx.get(r.state), tx.get(r.user)]);
    const user = userSnap.exists ? userSnap.data() : {};
    const s = normalizeState(stateSnap.exists ? stateSnap.data() : null, now);
    resolveTz(s, hint, now); const today = rollover(s, now);
    const out = (await mutate(s, { now, today, user })) || {};
    if (out.skipStateWrite) return summary(s, now, out);
    if (out.reject) return { ok: false, reason: out.reject };
    tx.set(r.state, s);
    if (s.hidden || user.deletionRequested) tx.delete(r.profile);
    else tx.set(r.profile, profileData(s, safeName(user, null), now, user.avatar));
    return summary(s, now, out);
  });
}

function missionOrThrow(id) {
  const mission = M.missions[id];
  if (!mission) throw new HttpsError('invalid-argument', 'Unknown mission.');
  return mission;
}

exports.claimLessonItem = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  const { missionId, itemIndex, tz } = request.data || {}, mission = missionOrThrow(missionId);
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= mission.items.length) throw new HttpsError('invalid-argument', 'Invalid lesson item.');
  const [kind, signId, bonusXP] = mission.items[itemIndex];
  if (!C.LESSON_ITEM_XP[kind]) throw new HttpsError('invalid-argument', 'This item does not earn XP.');
  return updateLearner(who.uid, tz, (s, { now, today }) => {
    const claimed = s.lessonItems[missionId] || [];
    if (claimed.includes(itemIndex)) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    if (s.lastClaimAt && now - s.lastClaimAt < C.MIN_CLAIM_GAP_MS) return { reason: 'too_fast', retryAfterMs: C.MIN_CLAIM_GAP_MS - (now - s.lastClaimAt), skipStateWrite: true };
    const xp = E.applyLessonSoftCap(E.lessonItemXp(kind, bonusXP), s.daily.lessonXp), out = { xpGained: xp };
    s.lessonItems[missionId] = claimed.concat(itemIndex).sort((a, b) => a - b); s.lastClaimAt = now;
    if (kind === 'LESSON' && signId && !s.learnedSigns.includes(signId)) s.learnedSigns.push(signId);
    s.daily.lessonXp += xp; s.totals.lessonXp += xp; addXp(s, xp, out); applyStreak(s, today, out, now);
    return out;
  });
});

exports.claimMissionComplete = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  const { missionId, tz } = request.data || {}, mission = missionOrThrow(missionId);
  return updateLearner(who.uid, tz, (s, { now, today }) => {
    if (s.missionsDone[missionId]) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    const lessonIdx = mission.items.map((it, i) => it[0] === 'LESSON' ? i : -1).filter((i) => i >= 0);
    const claimed = new Set(s.lessonItems[missionId] || []), done = lessonIdx.filter((i) => claimed.has(i)).length;
    const full = !lessonIdx.length || done / lessonIdx.length >= C.MISSION_FULL_LESSON_RATIO;
    if (!full && s.lastSkipAt && now - s.lastSkipAt < C.MIN_SKIP_CLAIM_GAP_MS) {
      return { reason: 'too_fast', retryAfterMs: C.MIN_SKIP_CLAIM_GAP_MS - (now - s.lastSkipAt), skipStateWrite: true };
    }
    const out = { path: full ? 'full' : 'skip' };
    const raw = Math.round(E.missionBonus(lessonIdx.length) * (full ? 1 : C.MISSION_SKIP_FACTOR));
    const xp = E.applyLessonSoftCap(raw, s.daily.lessonXp);
    s.missionsDone[missionId] = full ? 'full' : 'skip';
    lessonIdx.forEach((i) => { const sign = mission.items[i][1]; if (sign && !s.learnedSigns.includes(sign)) s.learnedSigns.push(sign); });
    s.daily.lessonXp += xp; s.totals.lessonXp += xp; s.totals.missions += 1; s.lastClaimAt = now;
    if (!full) s.lastSkipAt = now;
    addXp(s, xp, out); applyStreak(s, today, out, now);
    E.missionCountBadgesFor(s.totals.missions).forEach((id) => grant(s, id, out, now));
    const badge = E.nextLevelBadge('lesson', s.level, s.badges); if (badge) grant(s, badge, out, now);
    out.xpGained = xp; return out;
  });
});

exports.startGameSession = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  const { signs, mode = 'wall', tz } = request.data || {};
  const max = mode === 'timeAttack' ? 10 : C.GAME.MAX_BRICKS;
  if (!['wall', 'timeAttack'].includes(mode) || !Array.isArray(signs) || !signs.length || signs.length > max ||
      signs.some((x) => typeof x !== 'string' || !M.signs.includes(x)) || new Set(signs).size !== signs.length) {
    throw new HttpsError('invalid-argument', 'Invalid game targets.');
  }
  const r = refs(who.uid), now = nowMs(), sessionId = `${now}-${Math.random().toString(36).slice(2)}`;
  return db().runTransaction(async (tx) => {
    const [stateSnap, userSnap] = await Promise.all([tx.get(r.state), tx.get(r.user)]);
    if (userSnap.exists && userSnap.data().deletionRequested) return { ok: false, reason: 'account_deletion_pending' };
    const s = normalizeState(stateSnap.exists ? stateSnap.data() : null, now); resolveTz(s, tz, now); rollover(s, now);
    const learned = new Set(s.learnedSigns), learnedBricks = signs.filter((x) => learned.has(x)).length;
    const record = { id: sessionId, startedAt: now, signs, mode, done: false };
    tx.set(r.session, record);
    return { ok: true, sessionId, learnedBricks,
      xpEligible: mode === 'timeAttack' ? learnedBricks === signs.length : learnedBricks >= C.GAME.MIN_LEARNED_BRICKS,
      minLearned: mode === 'timeAttack' ? signs.length : C.GAME.MIN_LEARNED_BRICKS };
  });
});

exports.finishGameSession = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  const { sessionId, broken, wrong = 0, tz } = request.data || {};
  if (typeof sessionId !== 'string' || !Number.isInteger(wrong) || wrong < 0 || wrong > 500) return { ok: false, reason: 'bad_input' };
  const r = refs(who.uid), now = nowMs();
  let outcome, rejectedMode = 'unknown';
  await db().runTransaction(async (tx) => {
    const [sessionSnap, stateSnap, userSnap] = await Promise.all([tx.get(r.session), tx.get(r.state), tx.get(r.user)]);
    if (!sessionSnap.exists || sessionSnap.data().id !== sessionId || sessionSnap.data().done) { outcome = { ok: false, reason: 'no_session' }; return; }
    const sess = sessionSnap.data(), elapsed = now - sess.startedAt;
    rejectedMode = sess.mode || 'wall';
    if (elapsed > C.GAME.SESSION_TTL_MS) { tx.delete(r.session); outcome = { ok: false, reason: 'expired' }; return; }
    const problem = E.validateGameTiming({ sessionSigns: sess.signs, broken, serverElapsedMs: elapsed });
    if (problem) { tx.delete(r.session); outcome = { ok: false, reason: problem }; return; }
    const wrongType = broken.some((b) => {
      const expected = M.detectionTypes?.[b.s];
      return expected && (b.m === true) !== (expected === 'motion');
    });
    if (wrongType) { tx.delete(r.session); outcome = { ok: false, reason: 'sign_type_mismatch' }; return; }
    const user = userSnap.exists ? userSnap.data() : {};
    const s = normalizeState(stateSnap.exists ? stateSnap.data() : null, now); resolveTz(s, tz, now); const today = rollover(s, now);
    const learned = new Set(s.learnedSigns), out = { counted: false };
    const mode = sess.mode || 'wall';
    if (mode === 'timeAttack') {
      const targets = broken.map((b) => ({ learned: learned.has(b.s), motion: !!b.m }));
      const eligible = targets.length === sess.signs.length && targets.every((b) => b.learned);
      if (!eligible) { tx.delete(r.session); outcome = summary(s, now, { counted: false, xpGained: 0, reason: 'not_enough_learned' }); return; }
      const accuracy = targets.length / Math.max(1, targets.length + wrong);
      const tier = (C.GAME.ACC_TIERS.find((x) => accuracy >= x.min) || C.GAME.ACC_TIERS[C.GAME.ACC_TIERS.length - 1]).mult;
      const rawBase = targets.reduce((n, b) => n + (b.learned ? (b.motion ? C.GAME.BRICK_XP.motion : C.GAME.BRICK_XP.static) : 0), 0);
      const flawless = wrong === 0, raw = Math.round(rawBase * tier + C.GAME.CLEAR_BONUS + (flawless ? C.GAME.FLAWLESS_BONUS : 0));
      const xp = Math.min(raw, Math.max(0, C.GAME.DAILY_XP_CAP - s.daily.gameXp));
      s.daily.gameXp += xp; s.daily.timeAttacks = (s.daily.timeAttacks || 0) + 1;
      s.totals.gameXp += xp; s.totals.timeAttacks = (s.totals.timeAttacks || 0) + 1;
      addXp(s, xp, out); if (xp > 0) applyStreak(s, today, out, now);
      Object.assign(out, { counted: xp > 0, xpGained: xp, accuracy, flawless, targetCount: targets.length,
        reason: xp ? null : (s.daily.gameXp >= C.GAME.DAILY_XP_CAP ? 'daily_cap' : 'no_xp') });
    } else {
      const bricks = broken.map((b) => ({ learned: learned.has(b.s), motion: !!b.m }));
      const res = E.gameWallXp({ bricks, wrong, wallsToday: s.daily.walls, gameXpToday: s.daily.gameXp });
      if (!res.eligible) { outcome = summary(s, now, { counted: false, xpGained: 0, reason: res.reason }); return; }
      s.daily.walls++; s.totals.walls++;
      const xp = res.xp; out.accuracy = res.accuracy; out.flawless = res.flawless; out.multiplier = res.decay; out.capped = !!res.capped;
      if (xp > 0) {
        s.daily.gameXp += xp; s.totals.gameXp += xp; s.totals.countedWalls++;
        addXp(s, xp, out); applyStreak(s, today, out, now);
        grant(s, 'game_first', out, now); if (res.flawless) grant(s, 'game_flawless', out, now);
        if (elapsed / sess.signs.length <= C.GAME.SPEED_BADGE_MS_PER_BRICK) grant(s, 'game_speed', out, now);
        if (s.totals.countedWalls >= C.GAME.VETERAN_WALLS) grant(s, 'game_veteran', out, now);
        const badge = E.nextLevelBadge('game', s.level, s.badges); if (badge) grant(s, badge, out, now);
        out.counted = true;
      }
      out.xpGained = xp; if (!xp) out.reason = res.reason;
    }
    tx.set(r.state, s);
    tx.set(r.session, { ...sess, done: true });
    if (s.hidden || user.deletionRequested) tx.delete(r.profile);
    else tx.set(r.profile, profileData(s, safeName(user, null), now, user.avatar));
    outcome = summary(s, now, out);
  });
  if (outcome && !outcome.ok && outcome.reason !== 'no_session') {
    await db().collection('xpEvents').add({ uid: who.uid, type: 'game_rejected', mode: rejectedMode, reason: outcome.reason,
      sessionId, at: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  }
  return outcome;
});

exports.backfillLegacyProgress = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  const r = refs(who.uid), now = nowMs(), completed = Array.isArray(request.data?.completedItemIds) ? request.data.completedItemIds : [];
  let created;
  try { created = Date.parse((await admin.auth().getUser(who.uid)).metadata.creationTime); } catch { created = now; }
  const launch = Date.parse(C.LAUNCH_AT_ISO), closedAt = launch + C.BACKFILL_WINDOW_DAYS * 86400000;
  if (created >= launch) return { ok: true, reason: 'not_eligible', xpGained: 0 };
  if (now > closedAt) return { ok: true, reason: 'window_closed', xpGained: 0 };
  return updateLearner(who.uid, request.data?.tz, (s, { today }) => {
    if (s.backfilled) return { duplicate: true, backfilled: true, xpGained: 0, skipStateWrite: true };
    const claimedIds = new Set(completed), out = {}; let raw = 0;
    for (const [missionId, mission] of Object.entries(M.missions)) {
      const have = new Set(s.lessonItems[missionId] || []);
      mission.items.forEach(([kind, signId, bonusXP], i) => {
        const key = `${missionId}_${i}_${kind}_${signId || mission.category || ''}`;
        if (!claimedIds.has(key) || have.has(i)) return;
        if (kind === 'QUIZ') {
          if (!s.missionsDone[missionId]) { s.missionsDone[missionId] = 'backfill'; s.totals.missions++; raw += E.missionBonus(mission.signCount); }
          return;
        }
        if (!C.LESSON_ITEM_XP[kind]) return;
        have.add(i); if (kind === 'LESSON' && signId && !s.learnedSigns.includes(signId)) s.learnedSigns.push(signId);
        raw += E.lessonItemXp(kind, bonusXP);
      });
      if (have.size) s.lessonItems[missionId] = [...have].sort((a, b) => a - b);
    }
    const xp = Math.min(C.BACKFILL_MAX_XP, Math.round(raw * C.BACKFILL_FACTOR));
    s.backfilled = true; s.totals.lessonXp += xp; s.daily.lessonXp += xp; addXp(s, xp, out);
    E.missionCountBadgesFor(s.totals.missions).forEach((id) => grant(s, id, out, nowMs()));
    out.xpGained = xp; out.backfilled = true; return out;
  });
});

exports.setLeaderboardVisibility = onCall(async (request) => {
  const who = requireLearner(request); if (who.admin) return { ok: false, reason: 'admin_account' };
  if (typeof request.data?.visible !== 'boolean') throw new HttpsError('invalid-argument', 'Choose whether to show your profile.');
  return updateLearner(who.uid, null, (s) => { s.hidden = !request.data.visible; return { hidden: s.hidden }; });
});

exports.expireStaleStreaks = onSchedule('every 60 minutes', async () => {
  const now = nowMs(), snap = await db().collection('publicProfiles').where('streakExpiresAt', '<=', now).limit(400).get();
  if (snap.empty) return;
  const batch = db().batch(); snap.docs.forEach((d) => batch.update(d.ref, { streak: 0 })); await batch.commit();
});

exports.syncPublicProfileFromUser = onDocumentWritten('users/{uid}', async (event) => {
  const after = event.data?.after;
  const uid = event.params.uid, r = refs(uid);
  if (!after?.exists || after.data()?.deletionRequested) { await r.profile.delete().catch(() => {}); return; }
  const user = after.data(), state = await r.state.get();
  if (!state.exists || state.data().hidden) return;
  const s = normalizeState(state.data(), nowMs());
  await r.profile.set(profileData(s, safeName(user, null), nowMs(), user.avatar));
});
