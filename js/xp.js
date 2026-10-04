/**
 * js/xp.js — Spark client bridge for XP and progression.
 *
 * The browser writes only its signed-in learner's xpState and publicProfiles
 * documents, together in a Firestore transaction. Firestore rules enforce
 * ownership and conservative caps, but cannot prove that browser-reported
 * lesson/game activity really happened. See XP_SYSTEM.md for those limits.
 */
import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { limit, where, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { SIGN_DICTIONARY } from './dictionary.js';
import * as E from './xp-engine.mjs';
const CFG = {
  MAX_LEVEL: E.CONFIG.MAX_LEVEL,
  LEVEL_XP: E.LEVEL_XP,
  TIERS: E.TIERS,
  BADGES: E.BADGES,
  GAME: { MIN_LEARNED_BRICKS: E.CONFIG.GAME.MIN_LEARNED_BRICKS, DAILY_XP_CAP: E.CONFIG.GAME.DAILY_XP_CAP },
};
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const ADMIN_EMAIL = 'linguawave.project@gmail.com';
const listeners = new Set();
const gameSessions = new Map();
const pendingResolvers = new Map();
const toastTimes = new Map();
let latest = null, flushing = null, lastError = null, retryTimer = null;
let pageActive = true;
const waitTimers = new Map();
function delay(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => { waitTimers.delete(id); resolve(); }, ms);
    waitTimers.set(id, resolve);
  });
}
const levelFromXp = E.levelFromXp;
const levelProgress = E.levelProgress;
function tierOf(level) {
  let tier = E.TIERS[0];
  for (const item of E.TIERS) if (level >= item.from) tier = item;
  return tier;
}
const badgeInfo = (id) => E.BADGES[id] || { id, name: id, icon: '🏅', desc: '' };
const tierIconId = (level) => ({ Ripple: 'droplet', Current: 'waves', Tide: 'shell', Swell: 'sailboat', Crest: 'anchor', Tsunami: 'crown' }[tierOf(level).name] || 'droplet');
function badgeIconId(id) {
  const special = { game_first: 'brick_wall', game_flawless: 'gem', game_speed: 'zap', game_veteran: 'hard_hat',
    missions_1: 'graduation_cap', missions_10: 'library', missions_25: 'award',
    sentence_first: 'lc_message_square_text', sentence_flawless: 'lc_sparkles', sentence_hard: 'lc_brain', sentence_veteran: 'lc_scroll_text' };
  if (special[id]) return special[id];
  if (/^lesson_L\d+$/.test(id)) return 'book_open';
  if (/^game_L\d+$/.test(id)) return 'brick_wall';
  if (/^sentence_L\d+$/.test(id)) return 'lc_puzzle';
  if (/^streak_\d+$/.test(id)) return 'flame';
  return 'medal';
}
/** Inline <svg> markup for an icon id; '' if js/icons.js is not on the page. */
const iconSvg = (id, options) => window.LWIcons?.markup(id, options) || '';
function currentUid() { return auth.currentUser?.uid || ''; }
function isAdmin() { return (auth.currentUser?.email || '').toLowerCase() === ADMIN_EMAIL; }
function queueKey(uid = currentUid()) { return `lw_xp_pending_v2:${uid}`; }
function randomId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}
/* Streak shown for a stored xpState doc, as of right now in that doc's own timezone.
 * Needs E.effectiveStreak and E.dayKey from xp-engine.mjs (the grace-rule logic from main). */
function liveStreakOf(state) {
  if (!state?.streak) return 0;
  try { return E.effectiveStreak(state.streak, E.dayKey(Date.now(), state.tz || 'UTC')); } catch { return 0; }
}
function publish(result) {
  if (!result) return;
  latest = { ...(latest || {}), ...result };
  listeners.forEach((fn) => { try { fn(result, latest); } catch (error) { console.warn('[xp] update listener failed', error); } });
  notify(result);
}
const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function errorMessage(error) {
  if (!auth.currentUser) return 'Sign in with a verified account to earn XP.';
  if (!auth.currentUser.emailVerified || error?.code === 'unauthenticated') return 'Verify your email to earn XP.';
  const code = String(error?.code || '').replace(/^firestore\//, '');
  if (code === 'permission-denied') return 'XP rules rejected this update. Tell the admin.';
  if (['unavailable', 'network-request-failed', 'deadline-exceeded'].includes(code)) return 'You appear to be offline. XP will retry.';
  if (code === 'failed-precondition') return 'XP could not be saved. Refresh the page and try again.';
  return 'XP could not be saved. Check your connection and try again.';
}
function reportError(error) {
  const code = error?.code || 'unknown';
  const message = error?.message || String(error);
  lastError = { code, message, at: new Date().toISOString() };
  console.warn('[xp] Firestore write failed:', code, message, error);
  const now = Date.now();
  if (now - (toastTimes.get(code) || 0) < 30000) return;
  toastTimes.set(code, now);
  const toast = window.LinguaWave?.showToast || window.showToast;
  if (typeof toast === 'function') toast(errorMessage(error), 'error');
}
function isOfflineError(error) {
  return ['unavailable', 'network-request-failed', 'deadline-exceeded'].includes(String(error?.code || '').replace(/^firestore\//, ''));
}
function readQueue(uid = currentUid()) {
  if (!uid) return [];
  try {
    const current = localStorage.getItem(queueKey(uid));
    if (current !== null) {
      const parsed = JSON.parse(current);
      return Array.isArray(parsed) ? parsed : [];
    }
    const legacyKey = `lw_xp_pending_v1:${uid}`;
    const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    const migrated = legacy.map((item) => item?.t === 'item'
      ? { type: 'item', missionId: item.m, itemIndex: item.i }
      : item?.t === 'mission' ? { type: 'mission', missionId: item.m } : null).filter(Boolean);
    if (migrated.length) localStorage.setItem(queueKey(uid), JSON.stringify(migrated));
    localStorage.removeItem(legacyKey);
    return migrated;
  } catch { return []; }
}
function writeQueue(value, uid = currentUid()) {
  if (!uid) return;
  try { localStorage.setItem(queueKey(uid), JSON.stringify(value.slice(-300))); } catch { /* storage may be disabled */ }
}
function sameJob(a, b) {
  if (a.type !== b.type) return false;
  if (a.type === 'item') return a.missionId === b.missionId && a.itemIndex === b.itemIndex;
  if (a.type === 'mission') return a.missionId === b.missionId;
  if (a.type === 'backfill') return true;
  if (a.type === 'visibility') return a.visible === b.visible;
  if (a.type === 'game') return a.session?.id === b.session?.id;
  if (a.type === 'profile') return true;
  if (a.type === 'streak') return true;
  return a.qid === b.qid;
}
function enqueue(job) {
  const uid = currentUid();
  if (!uid) return Promise.resolve({ ok: false, reason: 'unauthenticated' });
  const queue = readQueue(uid);
  const existing = queue.find((item) => sameJob(item, job));
  if (existing) return pendingResolvers.has(existing.qid)
    ? pendingResolvers.get(existing.qid).promise
    : Promise.resolve({ ok: true, duplicateQueued: true });
  const queued = { ...job, qid: randomId() };
  queue.push(queued);
  writeQueue(queue, uid);
  const promise = new Promise((resolve) => pendingResolvers.set(queued.qid, { resolve, promise: null }));
  const resolver = pendingResolvers.get(queued.qid);
  resolver.promise = promise;
  void flush();
  return promise;
}
function settleJob(job, result) {
  if (!job?.qid) return;
  const pending = pendingResolvers.get(job.qid);
  if (pending) pending.resolve(result);
  pendingResolvers.delete(job.qid);
}
function runtimeMissions() {
  try { return window.LWMissions?.getAllMissions?.() || []; } catch { return []; }
}
/** Every sign id the app knows: the detector dictionary plus the lesson content (Construct a Sentence uses lesson signs). */
function knownSignIds() {
  const known = new Set(Object.keys(SIGN_DICTIONARY));
  (window.LWMissions?.content?.SIGNS || []).forEach((sign) => { if (sign?.signId) known.add(sign.signId); });
  return known;
}
function missionForId(id) {
  const mission = runtimeMissions().find((item) => item?.id === id);
  if (!mission || !Array.isArray(mission.items)) return null;
  const known = knownSignIds();
  for (const item of mission.items) {
    if (item?.signId && !known.has(item.signId)) return null;
  }
  return {
    id: mission.id,
    category: mission.category,
    items: mission.items.map((item) => ({ ...item })),
  };
}
function signTypes() {
  const types = {};
  Object.entries(SIGN_DICTIONARY).forEach(([signId, definition]) => {
    if (!definition?.disabled) types[signId] = definition?.detectionType === 'motion' ? 'motion' : 'static';
  });
  return types;
}
function localLearnedSigns() {
  const learned = new Set();
  const missions = window.LWMissions;
  if (!missions?.getAllMissions || !missions?.isItemComplete) return learned;
  try {
    missions.getAllMissions().forEach((mission) => mission.items.forEach((item, index) => {
      if (item.kind === 'LESSON' && item.signId && missions.isItemComplete(mission, index, item)) learned.add(item.signId);
    }));
  } catch (error) { console.warn('[xp] could not read completed lesson signs:', error); }
  return learned;
}
function combinedLearnedSigns(state) {
  return [...new Set([...(state?.learnedSigns || []), ...localLearnedSigns()])].sort();
}
async function getLearnedSigns() {
  await window.LWAuth?.whenAuthReady?.();
  try { await window.LWMissions?.whenMissionsSyncReady?.(); } catch { /* local lesson progress still counts as best-effort */ }
  const state = await getMyState();
  return combinedLearnedSigns(state);
}
function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}
function displayName(userData, user) {
  return String(userData?.name || user?.displayName || user?.email?.split('@')[0] || 'Learner').trim().slice(0, 30) || 'Learner';
}
async function applyJob(job, uid) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    const error = new Error('Sign in with a verified account to earn XP.');
    error.code = 'unauthenticated';
    throw error;
  }
  if (!user.emailVerified) {
    const error = new Error('Verify your email to earn XP.');
    error.code = 'permission-denied';
    throw error;
  }
  if (isAdmin()) return { ok: false, reason: 'admin_account' };
  const stateRef = doc(db, 'xpState', uid);
  const profileRef = doc(db, 'publicProfiles', uid);
  const userRef = doc(db, 'users', uid);
  const missions = runtimeMissions().map((mission) => missionForId(mission.id)).filter(Boolean);
  const types = signTypes();
  const localLearned = localLearnedSigns();
  return runTransaction(db, async (transaction) => {
    if (auth.currentUser?.uid !== uid) return { ok: false, reason: 'unauthenticated' };
    const [stateSnap, userSnap] = await Promise.all([transaction.get(stateRef), transaction.get(userRef)]);
    const now = Date.now();
    // Profile gone = account deleted by the admin: never re-create xpState / publicProfiles for it.
    if (!userSnap.exists()) return { ok: false, reason: 'account_missing' };
    const userData = userSnap.data();
    if (userData.deletionRequested && job.type !== 'profile') return { ok: false, reason: 'account_deletion_pending' };
    const state = E.normalizeState(stateSnap.exists() ? stateSnap.data() : null, now);
    E.resolveTimezone(state, TZ, now);
    const today = E.rollover(state, now);
    let result;
    if (job.type === 'item' || job.type === 'mission') {
      const mission = missionForId(job.missionId);
      if (!mission) return { ok: false, reason: 'unknown_mission' };
      if (job.type === 'item') {
        if (!Number.isInteger(job.itemIndex) || job.itemIndex < 0 || job.itemIndex >= mission.items.length) return { ok: false, reason: 'invalid_item' };
        result = E.applyLessonItem(state, mission, job.itemIndex, { now, today });
      } else result = E.applyMissionComplete(state, mission, { now, today });
    } else if (job.type === 'backfill') {
      result = E.applyBackfill(state, missions, job.completedItemIds || [], { now });
    } else if (job.type === 'visibility') {
      state.hidden = !job.visible;
      result = { ok: true, hidden: state.hidden, xpGained: 0 };
    } else if (job.type === 'profile') {
      result = { ok: true, xpGained: 0 };
    } else if (job.type === 'streak') {
      // Catch-up for streaks stored before the grace rule; needs E.healStreakFromMissions in xp-engine.mjs.
      const healed = typeof E.healStreakFromMissions === 'function' && E.healStreakFromMissions(state, today, {}, now);
      if (!healed) return { ok: true, skipStateWrite: true, xpGained: 0 };
      result = { ok: true, xpGained: 0 };
    } else if (job.type === 'game') {
      const session = job.session;
      const knownSigns = session?.mode === 'sentence' ? knownSignIds() : null;
      const validSession = session && typeof session.id === 'string' && (knownSigns
        ? E.validateSentenceSession(session, (signId) => knownSigns.has(signId))
        : session.mode === 'fingerspell'
          ? E.validateFingerspellSession(session, types)
          : E.validateGameSigns(session.signs, session.mode, types));
      if (!validSession) return { ok: false, reason: 'no_session' };
      const learned = [...new Set([...state.learnedSigns, ...localLearned])];
      result = E.applyGameFinish(state, session, job.broken, job.wrong, learned, types, { now, today });
    } else return { ok: false, reason: 'bad_input' };
    if (result?.skipStateWrite) return E.summary(state, now, result);
    if (!result?.ok) return result || { ok: false, reason: 'bad_input' };
    // Rules require ~2 seconds between every XP-state write. The clock is
    // client-side, so rules also verify the server timestamp on commit.
    const lastWriteAt = timestampMs(state.lastWriteAt);
    if (lastWriteAt && now - lastWriteAt < E.CONFIG.MIN_CLAIM_GAP_MS) {
      return { ok: false, reason: 'too_fast', retryAfterMs: E.CONFIG.MIN_CLAIM_GAP_MS - (now - lastWriteAt) };
    }
    transaction.set(stateRef, { ...state, lastWriteAt: serverTimestamp() });
    if (state.hidden || userData.deletionRequested) {
      transaction.delete(profileRef);
    } else {
      transaction.set(profileRef, {
        ...E.profileData(state, displayName(userData, user), now, userData.avatar),
        updatedAt: serverTimestamp(),
      });
    }
    return E.summary(state, now, result);
  });
}
async function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    await window.LWAuth?.whenAuthReady?.();
    while (currentUid() && pageActive) {
      const uid = currentUid();
      const queue = readQueue(uid);
      const job = queue[0];
      if (!job) return;
      try {
        const result = await applyJob(job, uid);
        if (currentUid() !== uid) return;
        if (result?.reason === 'too_fast' && Number(result.retryAfterMs) > 0) {   // pacing gap only; a game-timing 'too_fast' has no retryAfterMs and must be dropped, not retried forever
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => { retryTimer = null; void flush(); }, Math.max(1000, result.retryAfterMs || E.CONFIG.MIN_CLAIM_GAP_MS));
          return;
        }
        writeQueue(readQueue(uid).slice(1), uid);
        if (result?.ok) publish(result);
        settleJob(job, result);
        if (job.type === 'backfill' && (result?.ok || ['not_eligible', 'window_closed'].includes(result?.reason))) {
          try { localStorage.setItem(`lw_xp_backfilled_v2:${uid}`, '1'); } catch { /* Firestore backfilled flag remains authoritative */ }
        }
      } catch (error) {
        reportError(error);
        if (isOfflineError(error)) return; // Retain the job for the online event/reload retry.
        writeQueue(readQueue(uid).slice(1), uid);
        settleJob(job, { ok: false, reason: error?.code || 'write_failed' });
      }
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
const REASON_TEXT = {
  unauthenticated: 'sign in with a verified account',
  admin_account: 'the admin account cannot earn XP',
  account_missing: 'this account no longer exists',
  account_deletion_pending: 'account deletion is pending',
  no_session: 'the game session was lost (reload and try again)',
  bad_input: 'the result was malformed',
  expired: 'the run took longer than 30 minutes',
  incomplete_wall: 'not every target was recorded',
  incomplete_run: 'not every sentence was recorded',
  bad_bricks: 'the recorded targets did not match the run',
  bad_timing: 'the recorded timing was invalid',
  too_fast: 'the run was faster than the anti-cheat minimum',
  clock_mismatch: 'the run clock did not match the session clock',
  sign_type_mismatch: 'a sign type did not match the dictionary',
  not_enough_learned: 'every target must be a sign you have already learned',
  daily_cap: 'daily game XP limit reached',
  diminished: 'no more XP from walls today',
  no_xp: 'no XP was earned',
  'permission-denied': 'Firestore rules rejected the write (verify your email, or the rules are out of date)',
  'failed-precondition': 'Firestore needs an index or a fresh page load',
  unavailable: 'offline - it will retry',
};
const reasonText = (reason) => REASON_TEXT[reason] || String(reason || 'unknown reason');
function claimItem(mission, index) {
  if (!mission?.id || !Number.isInteger(index)) return;
  void enqueue({ type: 'item', missionId: mission.id, itemIndex: index });
}
function claimMission(mission) {
  if (!mission?.id) return;
  void enqueue({ type: 'mission', missionId: mission.id });
}
async function startGame(signs, mode = 'wall', extra = {}) {
  // Stamp the session clock now, before any await. The page records brick times from its own start; if this stamp
  // were taken after the auth/Firestore waits below, the engine's elapsed time would be short by that delay and
  // validateGameTiming() would reject honest runs (clock_mismatch / too_fast).
  const startedAt = Date.now();
  await window.LWAuth?.whenAuthReady?.();
  const user = auth.currentUser;
  if (!user || !user.emailVerified || isAdmin()) return null;
  // Construct a Sentence: `extra` = { rounds: [[signId, ...], ...], difficulty }; `signs` is the unique ids across the rounds.
  const sentence = mode === 'sentence';
  const rounds = sentence && Array.isArray(extra?.rounds) ? extra.rounds.map((words) => (Array.isArray(words) ? words.slice() : words)) : null;
  // Time Attack (fingerspelling): `extra` = { words: [wordId, ...] }; `signs` is the unique letters/numbers across those words.
  const fingerspell = mode === 'fingerspell';
  const fsWords = fingerspell && Array.isArray(extra?.words) ? extra.words.slice() : null;
  if (sentence) {
    const known = knownSignIds();
    if (!Array.isArray(signs) || !E.validateSentenceSession({ signs, rounds, difficulty: extra?.difficulty }, (signId) => known.has(signId))) return null;
  } else if (fingerspell) {
    if (!Array.isArray(signs) || !E.validateFingerspellSession({ signs, words: fsWords }, signTypes())) return null;
  } else if (!Array.isArray(signs) || !E.validateGameSigns(signs, mode, signTypes())) return null;
  try {
    await window.LWMissions?.whenMissionsSyncReady?.();
    const [state, userSnap] = await Promise.all([
      getMyState(),
      getDoc(doc(db, 'users', user.uid)),
    ]);
    if (userSnap.exists() && userSnap.data()?.deletionRequested) return { ok: false, reason: 'account_deletion_pending' };
    const learned = combinedLearnedSigns(state);
    const learnedBricks = signs.filter((signId) => learned.includes(signId)).length;
    const id = randomId();
    const session = { id, startedAt, signs: signs.slice(), mode, ...(sentence ? { rounds, difficulty: extra.difficulty } : {}),
      ...(fingerspell ? { words: fsWords } : {}) };
    gameSessions.set(id, session);
    if (sentence) return { ok: true, sessionId: id, xpEligible: true };   // Construct a Sentence needs no learned signs
    if (fingerspell) {
      // A word pays XP only when every letter/number in it is learned; the run is playable either way.
      const payable = fsWords.filter((wordId) => E.fingerspellWordById(wordId).symbols.every((symbol) => learned.includes(symbol)));
      return { ok: true, sessionId: id, xpEligible: payable.length > 0, payableWords: payable, totalWords: fsWords.length };
    }
    const minLearned = mode === 'timeAttack' ? signs.length : E.CONFIG.GAME.MIN_LEARNED_BRICKS;
    return { ok: true, sessionId: id, learnedBricks,
      xpEligible: mode === 'timeAttack' ? learnedBricks === signs.length : learnedBricks >= minLearned,
      minLearned };
  } catch (error) {
    reportError(error);
    return null;
  }
}
async function finishGame(sessionId, broken, wrong = 0) {
  const session = gameSessions.get(sessionId);
  if (!session) return { ok: false, reason: 'no_session' };
  if (!Array.isArray(broken) || !Number.isInteger(wrong) || wrong < 0 || wrong > 500) return { ok: false, reason: 'bad_input' };
  const result = await enqueue({ type: 'game', session: { ...session }, broken: broken.map((brick) => ({ ...brick })), wrong });
  gameSessions.delete(sessionId);
  return result;
}
async function getMyState() {
  await window.LWAuth?.whenAuthReady?.();
  const uid = currentUid();
  if (!uid) return null;
  try {
    const snapshot = await getDoc(doc(db, 'xpState', uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn('[xp] could not read XP state:', error?.code || '', error?.message || error);
    return null;
  }
}
// Leaderboards, all read from `publicProfiles` with a single-field ordering (no composite index needed).
//  level: ranked by level; level only ever rises with XP, so ordering by xp gives the same order, with ties split by XP.
//  Game boards rank by XP earned in that game (wallXp / timeAttackXp / sentenceXp) and skip learners with none yet.
const BOARD_MAX = 50;
const BOARDS = {
  level:       { label: 'Level',             field: 'xp',           build: (ref, n) => query(ref, orderBy('xp', 'desc'), limit(n)) },
  streak:      { label: 'Streaks',           field: 'streak',       build: (ref, n) => query(ref, orderBy('streak', 'desc'), limit(n)) },
  badges:      { label: 'Badges',            field: 'badgeCount',   build: (ref, n) => query(ref, orderBy('badgeCount', 'desc'), limit(n)) },
  wall:        { label: 'Wall Breaker',      field: 'wallXp',       build: (ref, n) => query(ref, where('wallXp', '>', 0), orderBy('wallXp', 'desc'), limit(n)) },
  timeAttack:  { label: 'Time Attack',       field: 'timeAttackXp', build: (ref, n) => query(ref, where('timeAttackXp', '>', 0), orderBy('timeAttackXp', 'desc'), limit(n)) },
  sentence:    { label: 'Construct a Sentence', field: 'sentenceXp', build: (ref, n) => query(ref, where('sentenceXp', '>', 0), orderBy('sentenceXp', 'desc'), limit(n)) },
};
/** Top `max` learners (1..50) for a board. Only that many documents are read, so a short list is cheap. */
async function loadBoard(kind, max = 10) {
  await window.LWAuth?.whenAuthReady?.();
  const board = BOARDS[kind] || BOARDS.level;
  const n = Math.max(1, Math.min(BOARD_MAX, Math.floor(Number(max)) || 10));
  const snapshot = await getDocs(board.build(collection(db, 'publicProfiles'), n));
  let rows = snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
  rows.forEach((row) => { if (row.streakExpiresAt && row.streakExpiresAt <= Date.now()) row.streak = 0; });
  if (board === BOARDS.streak) rows = rows.filter((row) => (row.streak || 0) > 0);   // a lapsed streak is not a streak
  rows.sort((a, b) => ((b[board.field] || 0) - (a[board.field] || 0)) || ((b.xp || 0) - (a.xp || 0)));
  return rows;
}
/** Call on the Profile page: brings a pre-grace-rule streak up to date. Resolves with the summary. */
async function syncStreak() {
  for (let i = 0; i < 30 && pageActive && !window.LWMissions?.getStreakSummary; i++) await delay(100); // missions.js is a deferred classic script
  if (!window.LWMissions) return { ok: false, reason: 'no_missions' };
  return enqueue({ type: 'streak' });
}
async function setVisibility(visible) {
  return enqueue({ type: 'visibility', visible: !!visible });
}
async function syncPublicProfile() {
  return enqueue({ type: 'profile' });
}
async function backfillOnce() {
  await window.LWAuth?.whenAuthReady?.();
  const user = auth.currentUser;
  if (!user || !user.emailVerified || isAdmin()) return null;
  for (let attempt = 0; attempt < 80 && pageActive && !window.LWMissions; attempt++) await delay(100);
  if (!window.LWMissions) return null;
  const flag = `lw_xp_backfilled_v2:${user.uid}`;
  try { if (localStorage.getItem(flag)) return null; } catch { /* Firestore remains the once-per-account authority */ }
  try { await window.LWMissions.whenMissionsSyncReady?.(); } catch { /* local progress is still reportable */ }
  const created = Date.parse(user.metadata?.creationTime || '');
  const launch = Date.parse(E.CONFIG.LAUNCH_AT_ISO);
  const closedAt = launch + E.CONFIG.BACKFILL_WINDOW_DAYS * 86400000;
  if (!Number.isFinite(created) || created >= launch) {
    try { localStorage.setItem(flag, '1'); } catch { /* no-op */ }
    return { ok: true, reason: 'not_eligible', xpGained: 0 };
  }
  if (Date.now() > closedAt) {
    try { localStorage.setItem(flag, '1'); } catch { /* no-op */ }
    return { ok: true, reason: 'window_closed', xpGained: 0 };
  }
  const completedItemIds = [];
  runtimeMissions().forEach((mission) => mission.items.forEach((item, index) => {
    if (window.LWMissions.isItemComplete?.(mission, index, item)) {
      completedItemIds.push(`${mission.id}_${index}_${item.kind}_${item.signId || mission.category || ''}`);
    }
  }));
  return enqueue({ type: 'backfill', completedItemIds });
}
let popTimer = null, popRemovalTimer = null;
function notify(result) {
  try {
    if (!result?.ok) return;
    const gained = Number(result.xpGained) || 0;
    const levelUps = result.levelUps || [];
    const badges = result.newBadges || [];
    if (!gained && !levelUps.length && !badges.length) return;
    const toast = window.LinguaWave?.showToast || window.showToast;
    if (!levelUps.length && !badges.length) {
      if (typeof toast === 'function') toast(`+${gained} XP`, 'success');
      return;
    }
    const top = levelUps.length ? levelUps[levelUps.length - 1] : null;
    const tier = tierOf(top || result.level || 1);
    const element = document.createElement('div');
    element.className = 'xp-pop';
    element.setAttribute('role', 'status');
    element.innerHTML = `
      ${top ? `<div class="xp-pop__level" style="--tier:${String(tier.color).replace(/[<>"']/g, '')}"><span class="xp-pop__tier" aria-hidden="true">${iconSvg(tierIconId(top))}</span> Level ${top}<small>${tier.name}</small></div>` : ''}
      ${gained ? `<div class="xp-pop__xp">+${gained} XP</div>` : ''}
      ${badges.length ? `<ul class="xp-pop__badges">${badges.map((id) => { const badge = badgeInfo(id); return `<li><span class="xp-pop__badge" aria-hidden="true">${iconSvg(badgeIconId(id), { size: 'sm' })}</span><b>${String(badge.name).replace(/[<>"']/g, '')}</b></li>`; }).join('')}</ul>` : ''}`;
    document.querySelectorAll('.xp-pop').forEach((node) => node.remove());
    document.body.appendChild(element);
    requestAnimationFrame(() => element.classList.add('xp-pop--in'));
    clearTimeout(popTimer);
    clearTimeout(popRemovalTimer);
    popTimer = setTimeout(() => {
      element.classList.remove('xp-pop--in');
      popRemovalTimer = setTimeout(() => element.remove(), 400);
    }, 4500);
  } catch (error) { console.warn('[xp] reward notification failed:', error); }
}
window.addEventListener('online', () => { void flush(); });
window.addEventListener('pageshow', (event) => {
  pageActive = true;
  if (event.persisted) { void flush(); void backfillOnce(); }
});
window.addEventListener('pagehide', () => {
  pageActive = false;
  clearTimeout(retryTimer);
  retryTimer = null;
  clearTimeout(popTimer);
  clearTimeout(popRemovalTimer);
  popTimer = popRemovalTimer = null;
  gameSessions.clear();
  waitTimers.forEach((resolve, id) => { clearTimeout(id); resolve(); });
  waitTimers.clear();
});
window.addEventListener('storage', (event) => { if (event.key === queueKey()) void flush(); });
window.LWXP = {
  claimItem, claimMission, startGame, finishGame, flush, backfillOnce,
  getMyState, getLearnedSigns, loadBoard, BOARDS, setVisibility, syncPublicProfile, onUpdate, notify,
  liveStreakOf, syncStreak, reasonText,
  levelFromXp, levelProgress, tierOf, badgeInfo, tierIconId, badgeIconId,
  config: CFG, timezone: TZ, getLatest: () => latest,
  debug: () => ({ uid: currentUid(), pending: readQueue(), lastError, latest }), // run LWXP.debug() in the console
};
document.dispatchEvent(new CustomEvent('lwxp-ready'));
void window.LWAuth?.whenAuthReady?.().then(() => { void flush(); void backfillOnce(); }).catch((error) => {
  console.warn('[xp] auth initialization failed:', error?.code || '', error?.message || error);
});
