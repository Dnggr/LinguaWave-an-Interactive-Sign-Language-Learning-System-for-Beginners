/**
 * js/xp.js — client bridge for server-authoritative XP and progression.
 * PURPOSE  : Reports lesson/game claims through allow-listed Cloud Functions and reads XP results.
 * CONNECTS : auth.js callable bridge, xpState, publicProfiles, lessons, both games and leaderboards.
 * XP values and badges are never computed or written authoritatively in the browser.
 */
import { auth, db, doc, getDoc, collection, getDocs, query, orderBy } from './auth.js';
import { limit, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CFG = window.LW_XP_CONFIG || { MAX_LEVEL: 30, LEVEL_XP: [0], TIERS: [], BADGES: {}, GAME: { DAILY_XP_CAP: 90 } };
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const listeners = new Set();
let latest = null, flushing = null, lastError = null, retryTimer = null;
let pageActive = true;
const waitTimers = new Map();
function delay(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => { waitTimers.delete(id); resolve(); }, ms);
    waitTimers.set(id, resolve);
  });
}

function levelFromXp(xp) {
  let level = 1;
  while (level < CFG.MAX_LEVEL && xp >= (CFG.LEVEL_XP[level] || Infinity)) level++;
  return level;
}
function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= CFG.MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const lo = CFG.LEVEL_XP[level - 1] || 0, hi = CFG.LEVEL_XP[level] || lo;
  return { level, into: xp - lo, need: hi - lo, pct: hi > lo ? Math.floor((xp - lo) * 100 / (hi - lo)) : 0, maxed: false };
}
function tierOf(level) {
  let tier = CFG.TIERS[0] || { name: '', icon: '', color: '#38bdf8' };
  for (const item of CFG.TIERS) if (level >= item.from) tier = item;
  return tier;
}
const badgeInfo = (id) => CFG.BADGES[id] || { id, name: id, icon: '🏅', desc: '' };
const tierIconId = (level) => ({ Ripple: 'droplet', Current: 'waves', Tide: 'shell', Swell: 'sailboat', Crest: 'anchor', Tsunami: 'crown' }[tierOf(level).name] || 'droplet');
function badgeIconId(id) {
  const special = { game_first: 'brick_wall', game_flawless: 'gem', game_speed: 'zap', game_veteran: 'hard_hat',
    missions_1: 'graduation_cap', missions_10: 'library', missions_25: 'award' };
  if (special[id]) return special[id];
  if (/^lesson_L\d+$/.test(id)) return 'book_open';
  if (/^game_L\d+$/.test(id)) return 'brick_wall';
  if (/^streak_\d+$/.test(id)) return 'flame';
  return 'medal';
}
const iconSvg = (id, options) => window.LWIcons?.markup(id, options) || '';
function publish(result) {
  if (!result) return;
  latest = { ...(latest || {}), ...result };
  listeners.forEach((fn) => { try { fn(result, latest); } catch (e) { console.warn('[xp] update listener failed', e); } });
  notify(result);
}
const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function reportError(error) {
  lastError = { code: error?.code || null, message: error?.message || String(error), at: new Date().toISOString() };
  console.warn('[xp] server request failed:', lastError.code || '', lastError.message);
  const toast = window.LinguaWave?.showToast || window.showToast;
  if (typeof toast === 'function') toast('XP could not be saved. Check your connection and try again.', 'error');
}
async function call(name, data) {
  const bridge = window.LWAuth?.callXpFunction;
  if (typeof bridge !== 'function') throw new Error('XP callable bridge is unavailable.');
  return bridge(name, { ...data, tz: data?.tz || TZ });
}
function currentUid() { return auth.currentUser?.uid || ''; }
function queueKey() { return `lw_xp_pending_v2:${currentUid()}`; }
function readQueue() {
  try {
    const current = localStorage.getItem(queueKey());
    if (current !== null) return JSON.parse(current);
    const legacyKey = `lw_xp_pending_v1:${currentUid()}`, legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    const migrated = legacy.map((item) => item?.t === 'item'
      ? { type: 'item', missionId: item.m, itemIndex: item.i }
      : item?.t === 'mission' ? { type: 'mission', missionId: item.m } : null).filter(Boolean);
    if (migrated.length) localStorage.setItem(queueKey(), JSON.stringify(migrated));
    localStorage.removeItem(legacyKey);
    return migrated;
  } catch { return []; }
}
function writeQueue(value) { try { localStorage.setItem(queueKey(), JSON.stringify(value.slice(-300))); } catch { /* storage may be disabled */ } }
function enqueue(job) {
  if (!currentUid()) return;
  const queue = readQueue();
  if (!queue.some((item) => item.type === job.type && item.missionId === job.missionId && item.itemIndex === job.itemIndex)) {
    queue.push(job); writeQueue(queue);
  }
}
async function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    await window.LWAuth?.whenAuthReady?.();
    while (currentUid()) {
      const queue = readQueue(), item = queue[0];
      if (!item) return;
      try {
        const result = item.type === 'item'
          ? await call('claimLessonItem', { missionId: item.missionId, itemIndex: item.itemIndex })
          : await call('claimMissionComplete', { missionId: item.missionId });
        // Server-side cooldown rejections are temporary: keep the item for a later flush.
        if (result?.reason === 'too_fast') {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => { retryTimer = null; void flush(); }, Math.max(1000, result.retryAfterMs || 2000));
          return;
        }
        writeQueue(readQueue().slice(1));
        if (result?.ok) publish(result);
      } catch (error) { reportError(error); return; }
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
function claimItem(mission, index) {
  const item = mission?.items?.[index];
  if (!mission?.id || !item || !['LESSON', 'BOOSTER', 'PRACTICE'].includes(item.kind)) return;
  enqueue({ type: 'item', missionId: mission.id, itemIndex: index }); void flush();
}
function claimMission(mission) {
  if (!mission?.id) return;
  enqueue({ type: 'mission', missionId: mission.id }); void flush();
}

async function startGame(signs, mode = 'wall') {
  try {
    if (!Array.isArray(signs) || !signs.length) return null;
    return await call('startGameSession', { signs: signs.slice(), mode });
  } catch (error) { reportError(error); return null; }
}
async function finishGame(sessionId, broken, wrong) {
  try {
    if (!sessionId) return { ok: false, reason: 'no_session' };
    const result = await call('finishGameSession', { sessionId, broken, wrong });
    if (result?.ok) publish(result);
    return result;
  } catch (error) { reportError(error); return null; }
}
async function getMyState() {
  await window.LWAuth?.whenAuthReady?.();
  const uid = currentUid(); if (!uid) return null;
  try { const snap = await getDoc(doc(db, 'xpState', uid)); return snap.exists() ? snap.data() : null; }
  catch (error) { console.warn('[xp] could not read XP state:', error); return null; }
}
const BOARDS = {
  xp: { label: 'All-time XP', build: (ref) => query(ref, orderBy('xp', 'desc'), limit(50)) },
  weekly: { label: 'This week', build: (ref, week) => query(ref, where('weekKey', '==', week), orderBy('weeklyXp', 'desc'), limit(50)) },
  streak: { label: 'Streaks', build: (ref) => query(ref, orderBy('streak', 'desc'), limit(50)) },
  badges: { label: 'Badges', build: (ref) => query(ref, orderBy('badgeCount', 'desc'), limit(50)) },
};
function weekKeyUtc(ms) {
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
async function loadBoard(kind) {
  await window.LWAuth?.whenAuthReady?.();
  const board = BOARDS[kind] || BOARDS.xp;
  const snap = await getDocs(board.build(collection(db, 'publicProfiles'), weekKeyUtc(Date.now())));
  const rows = snap.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
  rows.forEach((row) => { if (row.streakExpiresAt && row.streakExpiresAt <= Date.now()) row.streak = 0; });
  const key = { streak: 'streak', badges: 'badgeCount', weekly: 'weeklyXp', xp: 'xp' }[kind] || 'xp';
  rows.sort((a, b) => ((b[key] || 0) - (a[key] || 0)) || ((b.xp || 0) - (a.xp || 0)));
  return rows;
}
async function setVisibility(visible) {
  const result = await call('setLeaderboardVisibility', { visible: !!visible });
  if (result?.ok) publish(result);
  return result;
}
async function backfillOnce() {
  await window.LWAuth?.whenAuthReady?.();
  const uid = currentUid(); if (!uid) return null;
  for (let attempt = 0; attempt < 80 && pageActive && !window.LWMissions; attempt++) await delay(100);
  if (!window.LWMissions) return null;
  const flag = `lw_xp_backfilled_v2:${uid}`;
  try { if (localStorage.getItem(flag)) return null; } catch { /* continue */ }
  try { await window.LWMissions.whenMissionsSyncReady?.(); } catch { /* local progress is still reportable */ }
  const completedItemIds = [];
  (window.LWMissions.getAllMissions?.() || []).forEach((mission) => mission.items.forEach((item, index) => {
    if (window.LWMissions.isItemComplete(mission, index, item)) {
      completedItemIds.push(`${mission.id}_${index}_${item.kind}_${item.signId || item.category || ''}`);
    }
  }));
  try {
    const result = await call('backfillLegacyProgress', { completedItemIds });
    if (result?.ok || result?.reason === 'not_eligible' || result?.reason === 'window_closed') {
      try { localStorage.setItem(flag, '1'); } catch { /* ignore */ }
    }
    if (result?.ok && result.xpGained) publish(result);
    return result;
  } catch (error) { reportError(error); return null; }
}
let popTimer = null, popRemovalTimer = null;
function notify(result) {
  try {
    if (!result?.ok) return;
    const gained = Number(result.xpGained) || 0, ups = result.levelUps || [], badges = result.newBadges || [];
    if (!gained && !ups.length && !badges.length) return;
    const toast = window.LinguaWave?.showToast || window.showToast;
    if (!ups.length && !badges.length) { if (typeof toast === 'function') toast(`+${gained} XP`, 'success'); return; }
    const top = ups.length ? ups[ups.length - 1] : null, tier = tierOf(top || result.level || 1);
    const el = document.createElement('div');
    el.className = 'xp-pop'; el.setAttribute('role', 'status');
    el.innerHTML = `
      ${top ? `<div class="xp-pop__level" style="--tier:${String(tier.color).replace(/[<>"']/g, '')}"><span class="xp-pop__tier" aria-hidden="true">${iconSvg(tierIconId(top))}</span> Level ${top}<small>${tier.name}</small></div>` : ''}
      ${gained ? `<div class="xp-pop__xp">+${gained} XP</div>` : ''}
      ${badges.length ? `<ul class="xp-pop__badges">${badges.map((id) => { const badge = badgeInfo(id); return `<li><span class="xp-pop__badge" aria-hidden="true">${iconSvg(badgeIconId(id), { size: 'sm' })}</span><b>${String(badge.name).replace(/[<>"']/g, '')}</b></li>`; }).join('')}</ul>` : ''}`;
    document.querySelectorAll('.xp-pop').forEach((node) => node.remove()); document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('xp-pop--in'));
    clearTimeout(popTimer); clearTimeout(popRemovalTimer);
    popTimer = setTimeout(() => {
      el.classList.remove('xp-pop--in'); popRemovalTimer = setTimeout(() => el.remove(), 400);
    }, 4500);
  } catch (error) { console.warn('[xp] reward notification failed:', error); }
}

window.addEventListener('online', () => { void flush(); });
window.addEventListener('pageshow', (event) => {
  pageActive = true;
  if (event.persisted) { void flush(); void backfillOnce(); }
});
window.addEventListener('pagehide', () => {
  pageActive = false; clearTimeout(retryTimer); retryTimer = null;
  clearTimeout(popTimer); clearTimeout(popRemovalTimer); popTimer = popRemovalTimer = null;
  waitTimers.forEach((resolve, id) => { clearTimeout(id); resolve(); }); waitTimers.clear();
});
window.addEventListener('storage', (event) => { if (event.key === queueKey()) void flush(); });
window.LWXP = {
  claimItem, claimMission, startGame, finishGame, flush, backfillOnce,
  getMyState, loadBoard, BOARDS, setVisibility, onUpdate, notify,
  levelFromXp, levelProgress, tierOf, badgeInfo, tierIconId, badgeIconId,
  config: CFG, timezone: TZ, getLatest: () => latest,
  debug: () => ({ uid: currentUid(), pending: readQueue(), lastError, latest }),
};
document.dispatchEvent(new CustomEvent('lwxp-ready'));
void window.LWAuth?.whenAuthReady?.().then(() => { void flush(); void backfillOnce(); });
