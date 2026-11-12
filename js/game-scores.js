import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { limit, where, setDoc, documentId, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import * as C from './game-scores-core.mjs';

const ADMIN_EMAIL = 'linguawave.project@gmail.com';
const FETCH_CAP = 60;
const SHOW_MAX = 50;
const PROFILE_CHUNK = 30;

const entriesRef = (game, difficulty) => collection(db, 'gameScores', C.boardId(game, difficulty), 'entries');

async function currentUser() {
  try { await window.LWAuth?.whenAuthReady?.(); } catch {  }
  return auth.currentUser || null;
}

export async function submitScore(game, difficulty, { timeMs, misses = 0 } = {}) {
  try {
    difficulty = String(difficulty);
    if (!C.boardOf(game, difficulty)) return { ok: false, reason: 'no_board' };
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
