/**
 * js/game-scores.js — Game Leaderboards: write a learner's best completed result, read a ranking.
 * Exposes window.LWGameScores and fires `lwgamescores-ready` (same pattern as window.LWXP / 'lwxp-ready').
 *
 * DATA MODEL  (new; no game stored per-attempt time/misses in a readable place before this)
 *   gameScores/{board}/entries/{uid}      board = "<game>__<difficulty>", e.g. construct__medium, wall__15, timeAttack__fingerspell
 *     { uid, game, difficulty, timeMs, misses, completed: true, achievedAt: serverTimestamp, gameVersion }
 *   ONE document per learner per board = their personal best, so there is nothing to de-duplicate and a board never
 *   holds more rows than there are players. Display name + avatar are NOT copied here: they are read from
 *   `publicProfiles` at display time. That keeps a single source of truth (no duplicated user records), keeps names
 *   fresh, and means "Hide me from leaderboards" (which deletes the publicProfiles row) hides the learner here too.
 *   Rules: firestore.rules -> match /gameScores/{board}/entries/{uid}.
 *
 * RANKING
 *   Firestore can only order by one field without a composite index, and ties need up to 4 keys, so: read the
 *   fastest CAP entries (single-field order, no index to deploy), then validate + rank in JavaScript with the pure
 *   rules in js/game-scores-core.mjs. The cap is far larger than the 50 rows shown, so a tie group would have to
 *   straddle row ~60 to be affected, which is outside the visible board.
 *
 * Not touched: XP, streaks, missions, progress, auth, firebase config. submitScore() is fire-and-forget safe: it
 * never throws and a failure never affects the game's own result or XP.
 */
import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { limit, where, setDoc, documentId, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import * as C from './game-scores-core.mjs';

const ADMIN_EMAIL = 'linguawave.project@gmail.com';   // the admin account is never ranked (mirrors firestore.rules)
const FETCH_CAP = 60;                                  // fastest entries read per board
const SHOW_MAX = 50;                                   // rows displayed
const PROFILE_CHUNK = 30;                              // Firestore `in` limit

const entriesRef = (game, difficulty) => collection(db, 'gameScores', C.boardId(game, difficulty), 'entries');

async function currentUser() {
  try { await window.LWAuth?.whenAuthReady?.(); } catch { /* fall through to auth.currentUser */ }
  return auth.currentUser || null;
}

/**
 * Record a COMPLETED run. Only stored when it beats the learner's previous best on that board.
 * Returns { ok, improved?, reason? }. Never throws.
 */
export async function submitScore(game, difficulty, { timeMs, misses = 0 } = {}) {
  try {
    difficulty = String(difficulty);
    if (!C.boardOf(game, difficulty)) return { ok: false, reason: 'no_board' };            // e.g. a 12-brick wall: not a ranked size
    const t = Math.round(Number(timeMs)), m = Math.round(Number(misses));
    if (!Number.isFinite(t) || t < C.MIN_TIME_MS || t > C.MAX_TIME_MS) return { ok: false, reason: 'invalid_time' };
    if (!Number.isFinite(m) || m < 0 || m > C.MAX_MISSES) return { ok: false, reason: 'invalid_misses' };
    const user = await currentUser();
    if (!user || !user.emailVerified || (user.email || '').toLowerCase() === ADMIN_EMAIL) return { ok: false, reason: 'not_eligible' };
    const ref = doc(db, 'gameScores', C.boardId(game, difficulty), 'entries', user.uid);
    const prevSnap = await getDoc(ref);
    const prev = prevSnap.exists() ? prevSnap.data() : null;
    const next = { timeMs: t, misses: m };
    if (prev && Number.isInteger(prev.timeMs) && Number.isInteger(prev.misses) && !C.isImprovement(game, prev, next)) return { ok: true, improved: false };
    await setDoc(ref, { uid: user.uid, game, difficulty, timeMs: t, misses: m, completed: true, achievedAt: serverTimestamp(), gameVersion: C.GAME_VERSION });
    return { ok: true, improved: true };
  } catch (error) {
    console.warn('[game-scores] could not save the result:', error?.code || '', error?.message || error);
    return { ok: false, reason: error?.code || 'error' };
  }
}

/** publicProfiles rows for these uids (hidden / deleted learners simply have no row). Map uid -> { name, avatar }. */
async function loadProfiles(uids) {
  const out = new Map();
  const unique = [...new Set(uids)];
  for (let i = 0; i < unique.length; i += PROFILE_CHUNK) {
    const chunk = unique.slice(i, i + PROFILE_CHUNK);
    const snap = await getDocs(query(collection(db, 'publicProfiles'), where(documentId(), 'in', chunk), limit(PROFILE_CHUNK)));
    snap.docs.forEach((d) => out.set(d.id, { name: d.data().name, avatar: d.data().avatar }));
  }
  return out;
}

/**
 * One ranking, ready to draw.
 * Resolves { rows, mine, capped }:
 *   rows   best-first, max 50, each { rank, uid, name, avatar, timeMs, misses }   (only learners with a public profile)
 *   mine   null when the signed-in learner has no valid result here; otherwise
 *          { timeMs, misses, rank } where rank is a number only when they are on the board (never guessed), plus
 *          hidden:true when they chose to hide from leaderboards, or outside:true when they rank below the rows read.
 * Rejects on Firestore errors so the page can show its error state + Retry.
 */
export async function loadBoard(game, difficulty) {
  difficulty = String(difficulty);
  if (!C.boardOf(game, difficulty)) throw Object.assign(new Error('unknown board'), { code: 'invalid-argument' });
  const user = await currentUser();
  const snap = await getDocs(query(entriesRef(game, difficulty), orderBy('timeMs', 'asc'), limit(FETCH_CAP)));
  const ranked = C.rankResults(game, difficulty, snap.docs.map((d) => ({ ...d.data(), _id: d.id })));
  const profiles = await loadProfiles(ranked.map((r) => r.uid));
  const visible = ranked.filter((r) => profiles.has(r.uid))
    .map((r, i) => ({ rank: i + 1, uid: r.uid, name: profiles.get(r.uid).name, avatar: profiles.get(r.uid).avatar, timeMs: r.timeMs, misses: r.misses }));
  let mine = null;
  if (user) {
    const row = visible.find((r) => r.uid === user.uid);
    if (row) mine = { timeMs: row.timeMs, misses: row.misses, rank: row.rank };
    else {
      const own = ranked.find((r) => r.uid === user.uid);
      if (own) mine = { timeMs: own.timeMs, misses: own.misses, rank: null, hidden: true };
      else {
        // Not among the fastest rows read: it is either slower than all of them (outside) or absent.
        const ownSnap = await getDoc(doc(db, 'gameScores', C.boardId(game, difficulty), 'entries', user.uid));
        const d = ownSnap.exists() ? { ...ownSnap.data(), _id: ownSnap.id } : null;
        if (d && C.isValidResult(d, game, difficulty, ownSnap.id)) mine = { timeMs: d.timeMs, misses: d.misses, rank: null, outside: true };
      }
    }
  }
  return { rows: visible.slice(0, SHOW_MAX), mine, capped: snap.size >= FETCH_CAP };
}

window.LWGameScores = { GAMES: C.GAMES, GAME_KEYS: C.GAME_KEYS, boardOf: C.boardOf, formatTime: C.formatTime, submitScore, loadBoard };
document.dispatchEvent(new CustomEvent('lwgamescores-ready'));
