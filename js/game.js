import { startCamera, stopCamera } from './camera/cameraUtils.js';
const reportScore = (game, difficulty, result) => import('./game-scores.js').then((m) => m.submitScore(game, difficulty, result)).catch((error) => console.warn('[game-scores] unavailable:', error));
import { initMediaPipe, processFrame, isModelReady } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas } from './engine/renderer.js';
import { getDetectionType, getSignData } from './engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer, finalizeMotionWindow,
         loadModels, loadModelLabels, isClassifierReady, isMotionModelReady,
         getAllowedLabelsForSign, getSignGroup, getMotionBufferStatus,
         getClassifiableSigns, isSignClassifiable, isTrainedLabel } from './engine/classifier.js';

const $ = (id) => document.getElementById(id);
const videoEl = $('lw-webcam'), canvasEl = $('lw-canvas'), ctx = canvasEl.getContext('2d');

const HOLD_MS = 500;
const HOLD_GRACE_MS = 220;
const WRONG_HOLD_MS = 700;
const MISS_COOLDOWN_MS = 1500;
const COUNTDOWN = ['3', '2', '1', 'GO!'], COUNT_STEP_MS = 600;
const WAIT_HAND_MS = 6000;
const HAND_LOST_MS = 1200;
const AFTER_MOTION_MS = 800;
const ROWS = 3, STORE = 'lw_game_v2';

let bricks = [], running = false, rafId = null, timers = new Set();
let stats = { correct: 0, wrong: 0, size: 0 }, startedAt = 0, tickId = null, engineReady = false, booting = false;
let phase = 'static';
let heldBrick = null, holdSince = 0, lastGoodAt = 0, ignoreGroup = null;
let wrongLabel = null, wrongSince = 0, lastMissAt = 0;
let xpSessionP = Promise.resolve(null), brokenLog = [];
let waitStart = 0, handLostAt = null, motionMs = 2500;
let allowedStatic = { active: false, set: null }, allowedMotion = { active: false, set: null };

const dev = (name, ...args) => { try { return window.LWGameDev?.[name]?.(...args); } catch (e) { console.warn('[dev-test]', e); } };

const emptyGameData = () => ({ gems: 0, walls: 0, badges: [], best: {} });
let activeGameUid = null, gameData = emptyGameData(), gameSaveQueue = Promise.resolve();
let gameProgressReady = Promise.resolve();
function gameStoreKey() { return `${STORE}:${activeGameUid || 'guest'}`; }
function normalizeGameData(value) {
  const input = value && typeof value === 'object' ? value : {};
  return { gems: Math.max(0, Number(input.gems) || 0), walls: Math.max(0, Number(input.walls) || 0),
    badges: Array.isArray(input.badges) ? input.badges.filter((x) => typeof x === 'string').slice(0, 50) : [],
    best: input.best && typeof input.best === 'object' && !Array.isArray(input.best) ? input.best : {} };
}
function mergeGameData(local, cloud) {
  const a = normalizeGameData(local), b = normalizeGameData(cloud), best = { ...a.best };
  Object.entries(b.best).forEach(([size, run]) => {
    const old = best[size];
    if (!old || Number(run?.stars) > Number(old.stars) || (Number(run?.stars) === Number(old.stars) && Number(run?.ms) < Number(old.ms))) best[size] = run;
  });
  return { gems: Math.max(a.gems, b.gems), walls: Math.max(a.walls, b.walls), badges: [...new Set([...a.badges, ...b.badges])].slice(0, 50), best };
}
function load() { return gameData; }
function save(value) {
  if (dev('blockSave')) return;
  gameData = normalizeGameData(value);
  const snapshot = JSON.stringify(gameData);
  try { localStorage.setItem(gameStoreKey(), snapshot); } catch {  }
  if (activeGameUid && window.LWAuth?.writeProgressDoc) {
    gameSaveQueue = gameSaveQueue.catch(() => {}).then(() => window.LWAuth.writeProgressDoc('userGame', gameData, { merge: false }))
      .catch((error) => console.warn('[game] Wall Breaker progress sync failed:', error));
  }
}
async function initializeGameProgress() {
  try { await window.LWAuth?.whenAuthReady?.(); } catch {  }
  activeGameUid = window.LWAuth?.getAuthUid?.() || null;
  let local = null;
  try { local = JSON.parse(localStorage.getItem(gameStoreKey()) || 'null'); } catch {  }
  gameData = normalizeGameData(local);
  if (activeGameUid && window.LWAuth?.readProgressDoc) {
    try {
      const cloud = await window.LWAuth.readProgressDoc('userGame');
      gameData = mergeGameData(gameData, cloud?.data);
      save(gameData);
    } catch (error) { console.warn('[game] could not load Wall Breaker progress:', error); }
  }
  const gems = $('gm-gems'); if (gems) gems.textContent = gameData.gems;
  showBest();
}
gameProgressReady = initializeGameProgress();

const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const setStatus = (msg) => { const el = $('camera-status'); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; };
const remaining = (type) => bricks.filter(b => !b.broken && (!type || b.type === type));
const secs = (ms) => (ms / 1000).toFixed(1) + 's';

const lwIcon = (id, o) => (window.LWIcons ? window.LWIcons.markup(id, o) : '');
const starsHtml = (n) => { n = Math.max(0, Math.min(3, Number(n) || 0)); return [1, 2, 3].map((i) => `<span class="gm-star${i <= n ? ' is-on' : ''}">${lwIcon('star')}</span>`).join(''); };

function log(text, cls) {
  const ul = $('gm-log'), li = document.createElement('li');
  li.className = cls;
  if (window.LWIcons) window.LWIcons.setLabel(li, cls === 'ok' ? 'check' : 'x', text, { size: 'sm' }); else li.textContent = text;
  ul.prepend(li);
  while (ul.children.length > 30) ul.lastChild.remove();
}

const setPill = (text) => { $('gm-status').textContent = text; };
const setCamMode = (mode) => { $('gm-cam').dataset.mode = mode; };
function setTimer(kind, frac, text, active) {
  $(`gm-t-${kind}`).classList.toggle('is-active', !!active);
  $(`gm-t-${kind}-fill`).style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
  $(`gm-t-${kind}-val`).textContent = text;
}
function resetTimers() {
  setTimer('static', 0, secs(HOLD_MS), false);
  setTimer('motion', 0, secs(motionMs), false);
}
function refreshIdleUi() {
  const hasS = allowedStatic.active, hasM = allowedMotion.active;
  $('gm-btn-motion').disabled = !(running && hasM && phase === 'static');
  $('gm-t-static').hidden = bricks.length > 0 && !hasS;
  $('gm-t-motion').hidden = bricks.length > 0 && !hasM;
  setCamMode('idle');
  if (!running) return;
  setPill(hasS && hasM ? 'Sign any brick — motion signs: press Space'
        : hasM ? 'Press Space to record a motion sign'
        : 'Sign any brick');
}
function miss(text) {
  lastMissAt = Date.now(); stats.wrong++;
  dev('onMiss', text);
  $('gm-miss').textContent = stats.wrong;
  log(text, 'bad');
  for (const el of [$('gm-cam'), $('gm-wall')]) { el.classList.remove('is-miss'); void el.offsetWidth; el.classList.add('is-miss'); }
  dropHold();
}
function dropHold() {
  heldBrick?.el?.classList.remove('is-held');
  heldBrick = null; holdSince = 0; wrongLabel = null; wrongSince = 0;
}

const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((res) => setTimeout(res, ms))]);

async function getLearnedSignIds() {
  try {
    await withTimeout(window.LWAuth?.whenAuthReady?.(), 4000);
    await withTimeout(window.LWMissions?.whenMissionsSyncReady?.(), 4000);
    return new Set(await withTimeout(window.LWXP?.getLearnedSigns?.() || [], 4000));
  } catch (e) {
    console.warn('[game] could not read learned signs:', e);
    return new Set();
  }
}

function getCurriculumSignIds() {
  try {
    const M = window.LWMissions;
    const all = M?.getAllMissions?.();
    if (!all?.length) return null;
    const ids = new Set();
    all.forEach((m) => m.items.forEach((it) => { if (it.kind === 'LESSON' && it.signId) ids.add(it.signId); }));
    return ids.size ? ids : null;
  } catch { return null; }
}

function playableFilter({ requireModels = false } = {}) {
  const curriculum = getCurriculumSignIds();
  return (s) => {
    if (!isSignClassifiable(s)) return false;
    if (curriculum && !curriculum.has(s)) return false;
    if (!requireModels) return true;
    return getDetectionType(s) === 'motion' ? isMotionModelReady() : isClassifierReady();
  };
}

const playablePool = (opts) => getClassifiableSigns().filter(playableFilter(opts));

function dedupeTwins(signs) {
  const keyOf = (s) => { const g = getSignGroup(s); return g.length === 1 ? null : g.slice().sort().join('|'); };
  const best = new Map();
  for (const s of signs) {
    const k = keyOf(s);
    if (k && (!best.has(k) || (!isTrainedLabel(best.get(k)) && isTrainedLabel(s)))) best.set(k, s);
  }
  return signs.filter((s) => { const k = keyOf(s); return !k || best.get(k) === s; });
}

async function buildPool(size, source, ready) {
  const [learnedAll, booted] = await Promise.all([getLearnedSignIds(), ready, loadModelLabels()]);
  if (!booted) return null;
  const usable = playableFilter({ requireModels: true });
  const finalize = (list) => dedupeTwins(list).filter(usable);

  const devPool = dev('getPool');
  if (devPool) return { ...devPool, signs: finalize(devPool.signs || []) };

  const everything = playablePool({ requireModels: true });
  const learned = dedupeTwins(shuffle([...learnedAll].filter(usable)));
  const others = () => dedupeTwins(shuffle(everything.filter((s) => !learnedAll.has(s))))
    .filter((s) => !learned.some((l) => getSignGroup(l).includes(s)));
  let signs, note = '';

  if (source === 'all') {
    signs = dedupeTwins(shuffle(everything)).slice(0, size);
  } else if (source === 'mixed') {
    signs = learned.slice(0, size);
    signs = signs.concat(others().slice(0, size - signs.length));
    if (learned.length < size) note = `${learned.length} finished sign${learned.length === 1 ? '' : 's'} + ${signs.length - Math.min(learned.length, size)} new ones (click a brick for a hint).`;
  } else {
    signs = learned.slice(0, size);
    if (signs.length < size) note = `Your wall has ${signs.length} brick${signs.length === 1 ? '' : 's'} because you've finished ${signs.length} sign${signs.length === 1 ? '' : 's'}. Finish more lessons to grow it.`;
  }
  signs = finalize(signs);
  return { signs: shuffle(signs), learnedSet: new Set(learned), note };
}

async function refreshPoolNote() {
  try {
    const [learned] = await Promise.all([getLearnedSignIds(), loadModelLabels()]);
    const usable = playableFilter();
    const n = dedupeTwins([...learned].filter(usable)).length;
    $('gm-pool-note').textContent = n
      ? `${n} finished sign${n === 1 ? '' : 's'} can appear on the wall.`
      : "You haven't finished any signs yet. Complete a lesson first, or switch to 'learned + new signs' in Setup.";
  } catch { $('gm-pool-note').textContent = ''; }
}

function renderWall() {
  const wall = $('gm-wall'); wall.innerHTML = '';
  const rows = Math.max(ROWS, Math.ceil(bricks.length / 5)), base = Math.floor(bricks.length / rows), extra = bricks.length % rows;
  let from = 0;
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'gm-row' + (r % 2 ? ' is-odd' : '');
    const count = base + (r < extra ? 1 : 0);
    bricks.slice(from, from + count).forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `gm-brick gm-brick--${b.type}` + (b.sign.length > 2 ? ' gm-brick--word' : '');
      el.innerHTML = `<span class="gm-brick__tag">${b.type === 'motion' ? 'MOVE' : 'HOLD'}</span><span class="gm-brick__sign"></span>`;
      el.querySelector('.gm-brick__sign').textContent = b.sign;
      el.title = 'Click for a hint';
      el.addEventListener('click', () => showHint(b));
      b.el = el; row.appendChild(el);
    });
    from += count;
    wall.appendChild(row);
  }
  updateProgress();
}

function showHint(b) {
  const d = getSignData(b.sign)?.description;
  const tag = b.learned === false ? ' (new sign — not in your lessons yet)' : '';
  $('gm-hint').textContent = d ? `${b.sign}${tag}: ${d}` : `${b.sign}${tag}: open Learn to review this sign.`;
}

function updateProgress() {
  const done = bricks.filter(b => b.broken).length, total = bricks.length || 1;
  $('gm-count').textContent = `${done}/${bricks.length}`;
  $('gm-progress').style.setProperty('--p', String(done / total));
}

function computeAllowed() {
  const build = (type) => {
    const rem = remaining(type);
    if (!rem.length) return { active: false, set: null };
    let set = new Set();
    for (const b of rem) {
      const cat = getAllowedLabelsForSign(b.sign);
      if (!cat) { set = null; break; }
      cat.forEach(l => set.add(l));
      getSignGroup(b.sign).forEach(l => set.add(l));
    }
    return { active: true, set };
  };
  allowedStatic = build('static'); allowedMotion = build('motion');
}

function findBrick(label, type) {
  if (!label) return null;
  const group = getSignGroup(label);
  return bricks.find(b => !b.broken && b.type === type && group.includes(b.sign)) || null;
}

function smash(b, viaMotion) {
  if (!b || b.broken) return;
  b.broken = true; stats.correct++;
  brokenLog.push({ s: b.sign, t: Date.now() - startedAt, m: b.type === 'motion' });
  dev('onSmash', b.sign, viaMotion);
  b.el.classList.remove('is-held'); b.el.classList.add('is-broken'); b.el.disabled = true;
  log(b.sign, 'ok');
  dropHold();
  if (!viaMotion) ignoreGroup = getSignGroup(b.sign);
  updateProgress(); computeAllowed();
  if (!remaining().length) { running = false; setPill('Wall cleared!'); later(finish, 800); return; }
  if (!viaMotion) {
    setTimer('static', 1, 'Broken!', true);
    later(() => { if (running && phase === 'static') { resetTimers(); refreshIdleUi(); } }, 500);
  }
}

function stepStatic(L, R, F, P, anyHandPresent, now) {
  if (!allowedStatic.active) return;
  const release = () => {
    dropHold(); setTimer('static', 0, secs(HOLD_MS), false);
    if (running && phase === 'static') refreshIdleUi();
  };
  if (!anyHandPresent) {
    ignoreGroup = null; wrongSince = 0;
    if (heldBrick && now - lastGoodAt > HOLD_GRACE_MS) release();
    return;
  }

  const r = classifyGesture(L, R, F, allowedStatic.set, P, null);
  dev('onStatic', r);
  if (ignoreGroup && !(r.matched && ignoreGroup.includes(r.label))) ignoreGroup = null;
  const b = r.matched ? findBrick(r.label, 'static') : null;

  if (b) {
    lastGoodAt = now; wrongLabel = null; wrongSince = 0;
    if (heldBrick !== b) {
      heldBrick?.el?.classList.remove('is-held');
      heldBrick = b; holdSince = now; b.el.classList.add('is-held');
    }
    const t = now - holdSince;
    setTimer('static', t / HOLD_MS, secs(Math.min(t, HOLD_MS)), true);
    setCamMode('static'); setPill(`Holding ${b.sign}…`);
    if (t >= HOLD_MS) smash(b, false);
    return;
  }

  if (heldBrick && now - lastGoodAt > HOLD_GRACE_MS) release();
  if (r.matched && r.label && !heldBrick && !ignoreGroup) {
    if (r.label !== wrongLabel) { wrongLabel = r.label; wrongSince = now; }
    if (now - wrongSince >= WRONG_HOLD_MS && now - lastMissAt > MISS_COOLDOWN_MS) miss(`${r.label} isn't on the wall`);
  } else if (!r.matched) { wrongLabel = null; wrongSince = 0; }
}

function startMotion() {
  if (!running || phase !== 'static' || !allowedMotion.active) return;
  phase = 'countdown';
  dropHold(); setTimer('static', 0, secs(HOLD_MS), false);
  $('gm-btn-motion').disabled = true;
  setCamMode('motion'); resetMotionBuffer();
  countdown(0);
}
function countdown(i) {
  if (!running || phase !== 'countdown') return;
  if (i >= COUNTDOWN.length) {
    phase = 'waiting'; waitStart = Date.now(); handLostAt = null; resetMotionBuffer();
    setPill('Sign now!'); setTimer('motion', 0, 'Show your hand', true);
    return;
  }
  setPill(COUNTDOWN[i]);
  setTimer('motion', i / COUNTDOWN.length, `Get ready ${COUNTDOWN[i]}`, true);
  later(() => countdown(i + 1), COUNT_STEP_MS);
}
function endMotion(text) {
  phase = 'cooldown'; handLostAt = null; resetMotionBuffer();
  if (text) setPill(text);
  later(() => { phase = 'static'; resetTimers(); if (running) refreshIdleUi(); }, AFTER_MOTION_MS);
}
function motionResult(r) {
  dev('onMotion', r);
  const b = r && r.matched ? findBrick(r.label, 'motion') : null;
  if (b) { setTimer('motion', 1, 'Done', true); smash(b, true); return endMotion(`Matched ${b.sign}`); }
  setTimer('motion', 1, 'Done', true);
  miss(`Motion not recognised (${r?.label ? `${r.label} ${r.confidence}%` : 'no clear sign'})`);
  endMotion('Not recognised — press Space to try again');
}
function stepMotion(L, R, F, P, anyHandPresent, now) {
  if (phase !== 'waiting' && phase !== 'recording') return;
  if (!anyHandPresent) {
    if (phase === 'recording') {
      handLostAt ??= now;
      if (now - handLostAt > HAND_LOST_MS) {
        const r = finalizeMotionWindow(allowedMotion.set, null);
        if (r) return motionResult(r);
        setTimer('motion', 0, 'Too short', false);
        return endMotion('Not enough motion captured — try again');
      }
    } else if (now - waitStart > WAIT_HAND_MS) {
      setTimer('motion', 0, secs(motionMs), false);
      return endMotion('No hand seen — press Space to try again');
    }
    return;
  }
  handLostAt = null;
  const r = classifyMotion(L, R, F, allowedMotion.set, P, null);
  if (r.buffering) {
    phase = 'recording';
    const st = getMotionBufferStatus(); motionMs = st.durationMs || motionMs;
    setTimer('motion', st.progress, `${secs(st.elapsedMs)} / ${secs(motionMs)}`, true);
    setPill('Recording…');
  } else if (phase === 'recording') {
    motionResult(r);
  }
}

function loop() {
  rafId = requestAnimationFrame(loop);
  if (!videoEl || videoEl.readyState < 2) return;
  const { leftHandLandmarks: L, rightHandLandmarks: R, faceLandmarks: F, poseLandmarks: P, anyHandPresent } = processFrame(videoEl);
  const hands = [L, R].filter(Boolean);
  if (hands.length) drawSkeleton(ctx, hands, canvasEl.width, canvasEl.height); else clearCanvas(ctx, canvasEl.width, canvasEl.height);
  if (!running) return;
  const now = Date.now();
  try {
    if (phase === 'static') stepStatic(L, R, F, P, anyHandPresent, now);
    else stepMotion(L, R, F, P, anyHandPresent, now);
  } catch (e) {
    console.error('[game] detection step failed:', e);
  }
}

async function bootEngine() {
  if (engineReady || booting) return engineReady;
  booting = true;
  try {
    setStatus('Loading hand tracking, camera and sign models…');
    await Promise.all([
      initMediaPipe(),
      startCamera(videoEl, canvasEl),
      loadModels(),
    ]);
    if (!isModelReady()) throw new Error('Hand tracking model failed to load');
    setStatus(''); engineReady = true;
  } catch (e) {
    console.error('[game] boot failed:', e);
    stopCamera(videoEl);
    setStatus(`Could not start: ${e.message}`);
    $('gm-pool-note').textContent = `Could not start: ${e.message}`;
  }
  booting = false;
  return engineReady;
}

async function startGame() {
  const size = +$('gm-size').value, btn = $('gm-btn-start');
  btn.disabled = true; btn.textContent = 'Loading…';
  $('gm-pool-note').textContent = 'Loading hand tracking, camera and sign models…';
  let ok = false, pool = null;
  try {
    await gameProgressReady;
    const bootP = bootEngine();
    [ok, pool] = await Promise.all([bootP, buildPool(size, $('gm-source').value, bootP)]);
  } catch (e) {
    console.error('[game] start failed:', e);
    $('gm-pool-note').textContent = `Could not start: ${e.message}`;
  }
  btn.textContent = 'Start';
  if (!ok || !pool) { btn.disabled = false; return; }
  clearTimers();
  const { signs, learnedSet, note } = pool;
  if (!signs.length) {
    setStatus('');
    $('gm-hint').textContent = '';
    $('gm-pool-note').textContent = "No finished signs to play with yet. Complete a lesson first, or pick 'learned + new signs'.";
    btn.disabled = false; return;
  }
  bricks = signs.map(sign => ({ sign, type: getDetectionType(sign) === 'motion' ? 'motion' : 'static', learned: learnedSet.has(sign), el: null, broken: false }));
  stats = { correct: 0, wrong: 0, size: signs.length };
  phase = 'static'; heldBrick = null; holdSince = 0; ignoreGroup = null; wrongLabel = null; wrongSince = 0; lastMissAt = 0; handLostAt = null;
  resetMotionBuffer();
  renderWall(); computeAllowed();
  $('gm-start').hidden = true; $('gm-result').hidden = true; $('gm-quit').hidden = false;
  $('gm-log').innerHTML = ''; $('gm-hint').textContent = note || 'Tip: click any brick to see how to sign it.';
  $('gm-miss').textContent = '0'; $('gm-gems').textContent = load().gems; $('gm-time').textContent = '0:00';
  running = true; startedAt = Date.now();
  brokenLog = [];
  xpSessionP = window.LWXP ? window.LWXP.startGame(signs.slice()) : Promise.resolve(null);
  xpSessionP.then((s) => {
    if (s && !s.xpEligible) $('gm-hint').textContent = `XP & badges count when ${s.minLearned}+ bricks are signs you've learned - this wall has ${s.learnedBricks}.`;
  });
  clearInterval(tickId); tickId = setInterval(() => { $('gm-time').textContent = fmt(Date.now() - startedAt); }, 500);
  resetTimers(); refreshIdleUi();
  if (!rafId) loop();
}

function finish() {
  running = false; clearInterval(tickId); clearTimers(); phase = 'static';
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  clearCanvas(ctx, canvasEl.width, canvasEl.height);
  const ms = Date.now() - startedAt, total = stats.correct + stats.wrong;
  const acc = total ? stats.correct / total : 1;
  const stars = acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
  const gems = stats.size + stars * 5;
  const d = load(), earned = [];
  d.gems += gems; d.walls++;
  const prev = d.best[stats.size];
  if (!prev || stars > prev.stars || (stars === prev.stars && ms < prev.ms)) d.best[stats.size] = { stars, ms };
  save(d);

  $('gm-gems').textContent = d.gems;
  $('gm-stars').innerHTML = starsHtml(stars); $('gm-stars').setAttribute('role', 'img'); $('gm-stars').setAttribute('aria-label', `${stars} out of 3 stars`);
  $('gm-result-title').textContent = 'Wall cleared!';
  $('gm-result-text').textContent = `${fmt(ms)} · ${Math.round(acc * 100)}% accuracy · +${gems} gems`;
  $('gm-badges').innerHTML = ''; earned.forEach(t => { const s = document.createElement('span'); s.textContent = t; $('gm-badges').appendChild(s); });
  $('gm-chest').classList.remove('is-open'); void $('gm-chest').offsetWidth;
  $('gm-chest').innerHTML = lwIcon('party_popper'); $('gm-chest').classList.add('is-open');
  $('gm-progress').classList.add('is-done');
  $('gm-result').hidden = false; $('gm-btn-start').disabled = false;
  $('gm-start').hidden = false; $('gm-quit').hidden = true;
  setCamMode('idle'); $('gm-btn-motion').disabled = true;
  showBest();
  reportWall();
  void reportScore('wall', String(stats.size), { timeMs: ms, misses: stats.wrong });
}

async function reportWall() {
  const box = $('gm-xp'), badges = $('gm-badges');
  if (!box) return;
  box.textContent = 'Counting XP...'; box.className = 'gm-result__xp';
  const sess = await xpSessionP;
  const r = sess && window.LWXP ? await window.LWXP.finishGame(sess.sessionId, brokenLog, stats.wrong) : null;
  if (!r || !r.ok) {
    const why = r && r.reason;
    box.textContent = !sess ? 'XP unavailable right now (offline or signed out).'
      : why === 'too_fast' || why === 'clock_mismatch' ? "That run couldn't be verified, so no XP this time."
      : 'XP could not be counted for this wall.';
    return;
  }
  const B = (window.LWXP && window.LWXP.badgeInfo) || (() => ({}));
  (r.newBadges || []).forEach((id) => {
    const b = B(id), s = document.createElement('span'), name = document.createElement('span');
    s.innerHTML = lwIcon(window.LWXP.badgeIconId ? window.LWXP.badgeIconId(id) : 'medal', { size: 'sm' });
    name.textContent = b.name || id; s.appendChild(name); badges.appendChild(s);
  });
  if (!r.counted) {
    box.textContent = r.reason === 'not_enough_learned' ? `No XP: a wall needs ${window.LW_XP_CONFIG ? window.LW_XP_CONFIG.GAME.MIN_LEARNED_BRICKS : 6}+ signs you've learned.` : 'No XP for this wall.';
  } else if (r.xpGained > 0) {
    box.textContent = `+${r.xpGained} XP` + (r.multiplier < 1 ? ' (reduced - lots of walls today)' : '') + (r.levelUps && r.levelUps.length ? ` · Level ${r.level}!` : '');
    box.classList.add('is-gain');
  } else {
    box.textContent = r.reason === 'daily_cap' ? `Daily game XP limit reached (${r.dailyGameCap}). Lessons still earn XP.` : 'No more XP from walls today. Lessons still earn XP.';
  }
}

function showBest() {
  const b = load().best[$('gm-size').value];
  $('gm-best').innerHTML = b ? `Best: <span class="gm-best__stars" role="img" aria-label="${Math.max(0, Math.min(3, Number(b.stars) || 0))} out of 3 stars">${starsHtml(b.stars)}</span> in ${fmt(b.ms)}` : '';
}

function shutdown() {
  running = false; clearTimers(); clearInterval(tickId);
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  stopCamera(videoEl); engineReady = false; phase = 'static';
  resetMotionBuffer();
  const q = $('gm-quit'); if (q) q.hidden = true;
}

function quitRun() {
  if (!running) return;
  shutdown();
  $('gm-start').hidden = false; $('gm-btn-start').disabled = false;
  $('gm-hint').textContent = ''; setPill('—'); setCamMode('idle'); resetTimers();
  setStatus('Wall abandoned. Press Start to try again.');
}

const clearDone = () => $('gm-progress').classList.remove('is-done');
$('gm-btn-start').addEventListener('click', () => { clearDone(); startGame(); });
$('gm-btn-again').addEventListener('click', () => { $('gm-result').hidden = true; clearDone(); startGame(); });
$('gm-btn-motion').addEventListener('click', startMotion);
$('gm-quit').addEventListener('click', quitRun);
$('gm-size').addEventListener('change', showBest);
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || !running) return;
  if (/^(SELECT|INPUT|TEXTAREA|BUTTON|A)$/.test(e.target?.tagName || '')) return;
  e.preventDefault(); startMotion();
});
window.addEventListener('pagehide', shutdown);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) { shutdown(); $('gm-start').hidden = false; $('gm-btn-start').disabled = false; setStatus('Camera paused. Press Start to resume.'); }
});
$('gm-gems').textContent = load().gems;
resetTimers();
showBest();
refreshPoolNote();
window.addEventListener('pageshow', (e) => { if (e.persisted) refreshPoolNote(); });
dev('attach', {
  isRunning: () => running,
  bricks: () => bricks.map((b) => ({ sign: b.sign, type: b.type, broken: b.broken })),
  smashSign: (sign) => { const b = bricks.find((x) => !x.broken && x.sign === sign); if (b) smash(b, true); return !!b; },
});
