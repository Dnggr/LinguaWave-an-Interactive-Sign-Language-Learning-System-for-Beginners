/**
 * functions/xp.js — server-authoritative XP / levels / badges / streaks / Wall Breaker sessions
 * ─────────────────────────────────────────────────────────────────
 * WHY SERVER-SIDE: LinguaWave is a static site — the browser talks to Firestore directly, so
 * anything the browser is allowed to write, a user can write from DevTools. XP, levels, badges
 * and streaks feed a PUBLIC leaderboard, so none of them may be client-writable. Firestore rules
 * (see firestore.rules) deny every client write to xpState / publicProfiles / xpSessions /
 * xpEvents; ONLY these callables (Admin SDK) write them, after validating the request.
 *
 * WHAT THE SERVER CAN AND CANNOT PROVE: sign recognition (TensorFlow.js) and quiz grading still
 * run in the browser, so the server can't watch a lesson happen. What it enforces instead:
 *   - lesson XP is ONE-TIME per item (ledger in xpState.lessonItems) -> not farmable;
 *   - only items that exist in the curriculum manifest count;
 *   - a minimum gap between claims and a soft daily cap on lesson XP (bulk scripting is slow);
 *   - the Mastery-Quiz skip path pays 40% and is rate-limited harder;
 *   - Wall Breaker (the ONLY repeatable XP) runs as a server-timed SESSION: the server stamps the
 *     start, the client reports break times, and the server rejects anything physically
 *     impossible; XP has diminishing returns per day plus a hard daily cap;
 *   - game XP/badges only count bricks of signs the server knows you learned.
 * Residual risk (documented in XP_SYSTEM.md): a determined user can script the finite, one-time
 * lesson XP slowly. Closing that fully means grading quizzes on the server.
 *
 * Callables (all need a signed-in, email-verified user):
 *   claimLessonItem({missionId,itemIndex,tz})     claimMissionComplete({missionId,tz})
 *   startGameSession({signs,tz})                  finishGameSession({sessionId,broken,wrong,tz})
 *   backfillLegacyProgress({completedItemIds})    setLeaderboardVisibility({visible})
 * Scheduled: expireStaleStreaks (hourly) keeps the streak leaderboard honest.
 * Trigger:   syncPublicProfileFromUser (users/{uid} writes) — removes a self-"deleted" learner from
 *            the leaderboards (js/auth.js deleteAccount only sets deletionRequested) and keeps the
 *            public name in step with Settings / Edit Profile.
 *            REGION: triggers must run in the Firestore database's region. Everything here uses the
 *            default (us-central1); if your database lives elsewhere, add `region` to that one call.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const crypto = require('crypto');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

const { CONFIG } = require('./xp-config');
const E = require('./xp-engine');
const MANIFEST = require('./curriculum-manifest.json');

const ADMIN_EMAIL = 'linguawave.project@gmail.com';
const OPTS = { maxInstances: 20 };
const SIGN_SET = new Set(MANIFEST.signs);

// itemId -> [missionId, index], mirrors missions.js itemId() for the legacy backfill.
const ITEM_INDEX = new Map();
for (const [mid, m] of Object.entries(MANIFEST.missions)) {
  m.items.forEach(([kind, ref], i) => ITEM_INDEX.set(`${mid}_${i}_${kind}_${ref}`, [mid, i]));
}
const lessonSignsOf = (mid) => MANIFEST.missions[mid].items.filter((it) => it[0] === 'LESSON').map((it) => it[1]);

const db = () => admin.firestore();

/* ── state ──────────────────────────────────────────────────── */
function newState(now) {
  return {
    v: CONFIG.VERSION, xp: 0, level: 1, weeklyXp: 0, weekKey: E.weekKeyUtc(now),
    tz: null, tzChangedAt: 0,
    streak: { current: 0, longest: 0, lastDay: null },
    badges: {},                 // id -> earnedAt (ms)
    lessonItems: {},            // missionId -> [claimed item indices]
    missionsDone: {},           // missionId -> 'full' | 'skip' | 'backfill'
    learnedSigns: [],
    daily: { day: null, lessonXp: 0, gameXp: 0, walls: 0 },
    totals: { lessonXp: 0, gameXp: 0, walls: 0, countedWalls: 0, missions: 0 },
    lastClaimAt: 0, lastSkipAt: 0, backfilled: false, hidden: false, createdAt: now,
  };
}

function resolveTz(state, hint, now) {
  const cooldown = CONFIG.TZ_CHANGE_COOLDOWN_DAYS * 86400000;
  if (!state.tz) { state.tz = E.isValidTz(hint) ? hint : 'UTC'; state.tzChangedAt = now; }
  else if (E.isValidTz(hint) && hint !== state.tz && now - (state.tzChangedAt || 0) >= cooldown) {
    state.tz = hint; state.tzChangedAt = now;
  }
}
/** Roll the per-day and per-week counters. Returns today's local day key. */
function rollover(state, now) {
  const today = E.dayKey(now, state.tz);
  if (state.daily.day !== today) state.daily = { day: today, lessonXp: 0, gameXp: 0, walls: 0 };
  const wk = E.weekKeyUtc(now);
  if (state.weekKey !== wk) { state.weekKey = wk; state.weeklyXp = 0; }
  return today;
}
function addXp(state, xp, out) {
  if (xp <= 0) return;
  const before = state.level;
  state.xp += xp; state.weeklyXp += xp;
  state.level = E.levelFromXp(state.xp);
  for (let l = before + 1; l <= state.level; l++) (out.levelUps = out.levelUps || []).push(l);
}
function grant(state, id, out, now) {
  if (!E.BADGES[id] || state.badges[id]) return;
  state.badges[id] = now;
  (out.newBadges = out.newBadges || []).push(id);
}
function touchStreak(state, today, out, now) {
  state.streak = E.applyStreak(state.streak, today);
  E.streakBadgesFor(state.streak.current).forEach((id) => grant(state, id, out, now));
}
function summary(state, now, out) {
  const today = E.dayKey(now, state.tz || 'UTC');
  return {
    ok: true, ...out,
    xp: state.xp, level: state.level, weeklyXp: state.weeklyXp,
    streak: E.effectiveStreak(state.streak, today), longestStreak: state.streak.longest,
    dailyLessonXp: state.daily.lessonXp, dailyGameXp: state.daily.gameXp, dailyGameCap: CONFIG.GAME.DAILY_XP_CAP,
  };
}

function publicProfile(state, name, now) {
  const { Timestamp, FieldValue } = admin.firestore;
  const today = E.dayKey(now, state.tz || 'UTC');
  const live = E.effectiveStreak(state.streak, today);
  const recent = Object.entries(state.badges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return {
    name, xp: state.xp, level: state.level, weeklyXp: state.weeklyXp, weekKey: state.weekKey,
    streak: live, longestStreak: state.streak.longest,
    streakExpiresAt: live > 0 ? Timestamp.fromMillis(E.startOfDayMs(E.shiftDayKey(state.streak.lastDay, 2), state.tz || 'UTC')) : null,
    badgeCount: Object.keys(state.badges).length, recentBadges: recent,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/* ── shared runner ──────────────────────────────────────────── */
function requireLearner(request) {
  const a = request.auth;
  if (!a) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (a.token.email_verified === false) throw new HttpsError('permission-denied', 'Verify your email first.');
  return a;
}

/**
 * Runs `fn(state, ctx, tx)` inside a transaction on xpState/{uid}. fn mutates `state` and returns
 * an `out` object; it may do its own reads FIRST (tx.get) and tx writes to other docs.
 * `out.reject` => respond with { ok:false, reason } and leave xpState/publicProfiles untouched.
 * `out.skipStateWrite` => same but the response is still ok:true.
 */
async function withXp(auth, tzHint, fn) {
  const uid = auth.uid;
  if ((auth.token.email || '').toLowerCase() === ADMIN_EMAIL) return { ok: false, reason: 'admin_account' };
  const now = Date.now();
  const stateRef = db().doc(`xpState/${uid}`);
  const userRef = db().doc(`users/${uid}`);
  const pubRef = db().doc(`publicProfiles/${uid}`);
  return db().runTransaction(async (tx) => {
    const [stateSnap, userSnap] = await Promise.all([tx.get(stateRef), tx.get(userRef)]);
    const state = stateSnap.exists ? { ...newState(now), ...stateSnap.data() } : newState(now);
    resolveTz(state, tzHint, now);
    const today = rollover(state, now);
    const rawName = userSnap.exists && typeof userSnap.data().name === 'string' ? userSnap.data().name : 'Learner';
    const name = rawName.trim().slice(0, 30) || 'Learner';
    const pendingDeletion = userSnap.exists && userSnap.data().deletionRequested === true;

    const out = (await fn(state, { now, today, uid }, tx)) || {};
    if (out.reject) return { ok: false, reason: out.reject, retryAfterMs: out.retryAfterMs || 0 };
    if (out.skipStateWrite) return summary(state, now, out);

    tx.set(stateRef, state);
    if (state.hidden || pendingDeletion) tx.delete(pubRef); else tx.set(pubRef, publicProfile(state, name, now));
    return summary(state, now, out);
  });
}
const logEvent = (uid, type, data) => db().collection('xpEvents').add({ uid, type, ...data, at: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});

/* ══════════════ lessons ══════════════ */

exports.claimLessonItem = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const { missionId, itemIndex, tz } = request.data || {};
  const mission = typeof missionId === 'string' ? MANIFEST.missions[missionId] : null;
  if (!mission || !Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= mission.items.length) {
    throw new HttpsError('invalid-argument', 'Unknown lesson item.');
  }
  const [kind, ref, bonus] = mission.items[itemIndex];
  if (!(kind in CONFIG.LESSON_ITEM_XP)) throw new HttpsError('invalid-argument', 'This item does not award XP by itself.');

  return withXp(auth, tz, (state, { now, today }) => {
    const claimed = state.lessonItems[missionId] || [];
    if (claimed.includes(itemIndex)) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    if (now - state.lastClaimAt < CONFIG.MIN_CLAIM_GAP_MS) {
      return { reject: 'too_fast', retryAfterMs: CONFIG.MIN_CLAIM_GAP_MS - (now - state.lastClaimAt) + 50 };
    }
    const out = {};
    const xp = E.applyLessonSoftCap(E.lessonItemXp(kind, bonus), state.daily.lessonXp);
    state.lessonItems[missionId] = claimed.concat(itemIndex).sort((a, b) => a - b);
    state.lastClaimAt = now;
    if (kind === 'LESSON' && ref && !state.learnedSigns.includes(ref)) state.learnedSigns.push(ref);
    state.daily.lessonXp += xp; state.totals.lessonXp += xp;
    addXp(state, xp, out);
    touchStreak(state, today, out, now);
    out.xpGained = xp;
    return out;
  });
});

exports.claimMissionComplete = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const { missionId, tz } = request.data || {};
  const mission = typeof missionId === 'string' ? MANIFEST.missions[missionId] : null;
  if (!mission) throw new HttpsError('invalid-argument', 'Unknown lesson.');

  const result = await withXp(auth, tz, (state, { now, today }) => {
    if (state.missionsDone[missionId]) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    const lessonIdx = mission.items.map((it, i) => (it[0] === 'LESSON' ? i : -1)).filter((i) => i >= 0);
    const claimed = new Set(state.lessonItems[missionId] || []);
    const done = lessonIdx.filter((i) => claimed.has(i)).length;
    const full = lessonIdx.length === 0 || done / lessonIdx.length >= CONFIG.MISSION_FULL_LESSON_RATIO;

    if (!full) {
      const wait = CONFIG.MIN_SKIP_CLAIM_GAP_MS - (now - state.lastSkipAt);
      if (wait > 0) return { reject: 'too_fast', retryAfterMs: wait + 50 };
      state.lastSkipAt = now;
    }
    const out = { path: full ? 'full' : 'skip' };
    const raw = Math.round(E.missionBonus(mission.signCount) * (full ? 1 : CONFIG.MISSION_SKIP_FACTOR));
    const xp = E.applyLessonSoftCap(raw, state.daily.lessonXp);

    state.missionsDone[missionId] = full ? 'full' : 'skip';
    lessonSignsOf(missionId).forEach((s) => { if (!state.learnedSigns.includes(s)) state.learnedSigns.push(s); });
    state.daily.lessonXp += xp; state.totals.lessonXp += xp; state.totals.missions += 1;
    state.lastClaimAt = now;
    addXp(state, xp, out);
    touchStreak(state, today, out, now);
    E.missionCountBadgesFor(state.totals.missions).forEach((id) => grant(state, id, out, now));
    const lb = E.nextLevelBadge('lesson', state.level, state.badges);   // catch-up: lowest unearned <= level
    if (lb) grant(state, lb, out, now);
    out.xpGained = xp;
    return out;
  });
  if (result.ok && result.path) logEvent(auth.uid, 'mission', { missionId, path: result.path, xp: result.xpGained });
  return result;
});

/* ══════════════ Wall Breaker ══════════════ */

exports.startGameSession = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const { signs, tz } = request.data || {};
  const G = CONFIG.GAME;
  if (!Array.isArray(signs) || signs.length < 1 || signs.length > G.MAX_BRICKS
      || !signs.every((s) => typeof s === 'string' && SIGN_SET.has(s)) || new Set(signs).size !== signs.length) {
    throw new HttpsError('invalid-argument', 'Invalid wall.');
  }
  if ((auth.token.email || '').toLowerCase() === ADMIN_EMAIL) return { ok: false, reason: 'admin_account' };
  const now = Date.now();
  const [stateSnap, sessSnap] = await Promise.all([db().doc(`xpState/${auth.uid}`).get(), db().doc(`xpSessions/${auth.uid}`).get()]);
  const prev = sessSnap.exists ? sessSnap.data() : null;
  if (prev && !prev.done && now - prev.startedAt < G.MIN_START_GAP_MS) return { ok: false, reason: 'too_fast' };
  const learned = new Set(stateSnap.exists ? stateSnap.data().learnedSigns || [] : []);
  const learnedBricks = signs.filter((s) => learned.has(s)).length;
  const sessionId = crypto.randomUUID();
  await db().doc(`xpSessions/${auth.uid}`).set({ id: sessionId, startedAt: now, signs, done: false });
  return { ok: true, sessionId, learnedBricks, xpEligible: learnedBricks >= G.MIN_LEARNED_BRICKS, minLearned: G.MIN_LEARNED_BRICKS };
});

exports.finishGameSession = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const { sessionId, broken, wrong, tz } = request.data || {};
  if (typeof sessionId !== 'string' || !Array.isArray(broken) || broken.length > CONFIG.GAME.MAX_BRICKS
      || !Number.isInteger(wrong) || wrong < 0 || wrong > 500) {
    throw new HttpsError('invalid-argument', 'Invalid result.');
  }
  const G = CONFIG.GAME;
  const sessRef = db().doc(`xpSessions/${auth.uid}`);

  const result = await withXp(auth, tz, async (state, { now, today }, tx) => {
    const snap = await tx.get(sessRef);
    const sess = snap.exists ? snap.data() : null;
    if (!sess || sess.id !== sessionId || sess.done) return { reject: 'no_session' };
    tx.set(sessRef, { ...sess, done: true, finishedAt: now });          // a session pays out at most once

    const elapsed = now - sess.startedAt;
    if (elapsed > G.SESSION_TTL_MS) return { reject: 'expired' };
    const problem = E.validateGameTiming({ sessionSigns: sess.signs, broken, serverElapsedMs: elapsed });
    if (problem) { logEvent(auth.uid, 'game_rejected', { reason: problem, size: sess.signs.length, elapsed }); return { reject: problem }; }

    const learned = new Set(state.learnedSigns);
    const bricks = broken.map((b) => ({ learned: learned.has(b.s), motion: !!b.m }));
    const res = E.gameWallXp({ bricks, wrong, wallsToday: state.daily.walls, gameXpToday: state.daily.gameXp });
    if (!res.eligible) return { counted: false, xpGained: 0, reason: res.reason, skipStateWrite: true };

    const out = { counted: false, accuracy: res.accuracy, flawless: res.flawless, multiplier: res.decay, capped: !!res.capped };
    state.daily.walls += 1; state.totals.walls += 1;
    const xp = res.xp;
    if (xp > 0) {
      state.daily.gameXp += xp; state.totals.gameXp += xp; state.totals.countedWalls += 1;
      addXp(state, xp, out);
      touchStreak(state, today, out, now);
      grant(state, 'game_first', out, now);
      if (res.flawless) grant(state, 'game_flawless', out, now);
      if (elapsed / sess.signs.length <= G.SPEED_BADGE_MS_PER_BRICK) grant(state, 'game_speed', out, now);
      if (state.totals.countedWalls >= G.VETERAN_WALLS) grant(state, 'game_veteran', out, now);
      const gb = E.nextLevelBadge('game', state.level, state.badges);
      if (gb) grant(state, gb, out, now);
      out.counted = true;
    } else {
      out.reason = res.reason;
    }
    out.xpGained = xp;
    return out;
  });
  return result;
});

/* ══════════════ one-time legacy backfill ══════════════ */

exports.backfillLegacyProgress = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const ids = request.data && request.data.completedItemIds;
  if (!Array.isArray(ids) || ids.length > 3000 || !ids.every((x) => typeof x === 'string' && x.length < 120)) {
    throw new HttpsError('invalid-argument', 'Invalid progress list.');
  }
  // Only accounts that existed before launch, judged by Firebase Auth (not browser-writable data).
  const rec = await admin.auth().getUser(auth.uid);
  const launch = Date.parse(CONFIG.LAUNCH_AT_ISO);
  if (Date.parse(rec.metadata.creationTime) >= launch) return { ok: false, reason: 'not_eligible' };
  if (Date.now() > launch + CONFIG.BACKFILL_WINDOW_DAYS * 86400000) return { ok: false, reason: 'window_closed' };

  return withXp(auth, null, (state, { now }) => {
    if (state.backfilled) return { duplicate: true, xpGained: 0, skipStateWrite: true };
    const out = {}; let raw = 0; const quizDone = new Set();
    for (const id of new Set(ids)) {
      const hit = ITEM_INDEX.get(id);
      if (!hit) continue;
      const [mid, i] = hit;
      const [kind, ref, bonus] = MANIFEST.missions[mid].items[i];
      if (kind === 'QUIZ') { quizDone.add(mid); continue; }
      const have = state.lessonItems[mid] || [];
      if (have.includes(i)) continue;
      state.lessonItems[mid] = have.concat(i).sort((a, b) => a - b);
      if (kind === 'LESSON' && ref && !state.learnedSigns.includes(ref)) state.learnedSigns.push(ref);
      raw += E.lessonItemXp(kind, bonus);
    }
    for (const mid of quizDone) {
      if (state.missionsDone[mid]) continue;
      state.missionsDone[mid] = 'backfill'; state.totals.missions += 1;
      lessonSignsOf(mid).forEach((s) => { if (!state.learnedSigns.includes(s)) state.learnedSigns.push(s); });
      raw += E.missionBonus(MANIFEST.missions[mid].signCount);
    }
    const xp = Math.min(CONFIG.BACKFILL_MAX_XP, Math.round(raw * CONFIG.BACKFILL_FACTOR));
    state.backfilled = true; state.totals.lessonXp += xp;
    addXp(state, xp, out);
    E.missionCountBadgesFor(state.totals.missions).forEach((id) => grant(state, id, out, now));
    out.xpGained = xp; out.backfilled = true;
    return out;
  }).then((r) => { if (r.ok && r.backfilled) logEvent(auth.uid, 'backfill', { xp: r.xpGained, sent: ids.length }); return r; });
});

/* ══════════════ leaderboard visibility ══════════════ */

exports.setLeaderboardVisibility = onCall(OPTS, async (request) => {
  const auth = requireLearner(request);
  const visible = request.data && request.data.visible;
  if (typeof visible !== 'boolean') throw new HttpsError('invalid-argument', 'visible must be true or false.');
  return withXp(auth, null, (state) => { state.hidden = !visible; return { hidden: state.hidden }; });
});

/* ══════════════ maintenance ══════════════ */

/** A streak dies at the end of the day after the last activity; nothing "runs" then, so sweep hourly. */
exports.expireStaleStreaks = onSchedule('every 60 minutes', async () => {
  const { Timestamp } = admin.firestore;
  for (let round = 0; round < 10; round++) {
    const snap = await db().collection('publicProfiles').where('streakExpiresAt', '<=', Timestamp.now()).limit(400).get();
    if (snap.empty) return;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.update(d.ref, { streak: 0, streakExpiresAt: null }));
    await batch.commit();
    if (snap.size < 400) return;
  }
});

/* ══════════════ users/{uid} -> publicProfiles/{uid} sync ══════════════ */

exports.syncPublicProfileFromUser = onDocumentWritten({ document: 'users/{uid}', maxInstances: 5 }, async (event) => {
  const uid = event.params.uid;
  const after = event.data && event.data.after;
  const pubRef = db().doc(`publicProfiles/${uid}`);
  if (!after || !after.exists || after.data().deletionRequested === true) {    // gone or "deleted": off the boards
    await pubRef.delete().catch(() => {});
    return;
  }
  const before = event.data.before && event.data.before.exists ? event.data.before.data() : {};
  const d = after.data();
  if (d.name === before.name) return;
  const snap = await pubRef.get();
  if (snap.exists) await pubRef.update({ name: (typeof d.name === 'string' ? d.name.trim().slice(0, 30) : '') || 'Learner' });
});
