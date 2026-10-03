/*
  js/game.js — Wall Breaker (standalone game tab)
  Reuses: cameraUtils, mediapipe, classifier, dictionary, renderer.
  Progress: pages/game.html loads engine/progress.js + missions.js so the wall is built from signs
  the learner has finished (see getLearnedSignIds).
  Only engine change: classifier.js gained logNearMiss() (was undefined -> threw every
  frame, which is what broke detection) and getSignGroup() (twin signs like BRING/CARRY).

  Rules (FREE ORDER — there is no fixed "next" brick):
   - Every brick on the wall is live at once. Sign any of them, in any order.
   - STATIC bricks (blue): hold the sign steady ~0.5s            -> blue "hold" timer.
   - MOTION bricks (orange): press "Record motion sign" (or Space). 3-2-1-GO, then a
     2.5s recording window                                       -> orange "record" timer.
     The motion you perform is matched against every motion brick still on the wall.
   - A confident sign that is NOT on the wall, or a failed motion attempt, is a miss.
   - Clear the wall -> reward (stars + gems + best runs, cached per learner and synced to userGame).
  Sign pool: asl_static_model/labels.json + asl_motion_model/labels.json are the ONLY authority on which
   signs can appear (see playableFilter). dictionary.js `disabled` flags are never read, and NONE is never playable.
  Lifecycle: stopCamera + cancelAnimationFrame + all timers cleared on pagehide/hidden.
*/
import { startCamera, stopCamera } from './camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas } from './engine/renderer.js';
import { getDetectionType, getSignData } from './engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer, finalizeMotionWindow,
         loadModels, loadModelLabels, isClassifierReady, isMotionModelReady,
         getAllowedLabelsForSign, getSignGroup, getMotionBufferStatus,
         getClassifiableSigns, isSignClassifiable, isTrainedLabel } from './engine/classifier.js';

const $ = (id) => document.getElementById(id);
const videoEl = $('lw-webcam'), canvasEl = $('lw-canvas'), ctx = canvasEl.getContext('2d');

const HOLD_MS = 500;              // static: how long a sign must be held
const HOLD_GRACE_MS = 220;        // static: tolerated detection flicker before a hold resets
const WRONG_HOLD_MS = 700;        // static: a wrong sign must persist this long to count as a miss
const MISS_COOLDOWN_MS = 1500;
const COUNTDOWN = ['3', '2', '1', 'GO!'], COUNT_STEP_MS = 600;
const WAIT_HAND_MS = 6000;        // motion: give up if no hand appears after GO (no penalty)
const HAND_LOST_MS = 1200;        // motion: hand gone this long mid-recording -> finish early
const AFTER_MOTION_MS = 800;      // motion: pause before static detection resumes
const ROWS = 3, STORE = 'lw_game_v2';

let bricks = [], running = false, rafId = null, timers = new Set();
let stats = { correct: 0, wrong: 0, size: 0 }, startedAt = 0, tickId = null, engineReady = false, booting = false;
let phase = 'static';             // 'static' | 'countdown' | 'waiting' | 'recording' | 'cooldown'
let heldBrick = null, holdSince = 0, lastGoodAt = 0, ignoreGroup = null;
let wrongLabel = null, wrongSince = 0, lastMissAt = 0;
// XP (js/xp.js): the browser records each wall and calculates the reward; Firestore rules cap the write.
let xpSessionP = Promise.resolve(null), brokenLog = [];
let waitStart = 0, handLostAt = null, motionMs = 2500;
let allowedStatic = { active: false, set: null }, allowedMotion = { active: false, set: null };

// DEV-TEST ▼ TEMPORARY hooks for js/game-dev-test.js — delete every line containing "DEV-TEST" before the final defense.
// DEV-TEST   They are no-ops unless the dev panel is active (needs localStorage 'lw_game_dev'='1'); a throw in dev code never breaks the game.
const dev = (name, ...args) => { try { return window.LWGameDev?.[name]?.(...args); } catch (e) { console.warn('[dev-test]', e); } };   // DEV-TEST

// ── per-learner game progress ──────────────────────────────────────
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
  if (dev('blockSave')) return;   // DEV-TEST
  gameData = normalizeGameData(value);
  const snapshot = JSON.stringify(gameData);
  try { localStorage.setItem(gameStoreKey(), snapshot); } catch { /* private mode */ }
  if (activeGameUid && window.LWAuth?.writeProgressDoc) {
    gameSaveQueue = gameSaveQueue.catch(() => {}).then(() => window.LWAuth.writeProgressDoc('userGame', gameData, { merge: false }))
      .catch((error) => console.warn('[game] Wall Breaker progress sync failed:', error));
  }
}
async function initializeGameProgress() {
  try { await window.LWAuth?.whenAuthReady?.(); } catch { /* local cache remains available */ }
  activeGameUid = window.LWAuth?.getAuthUid?.() || null;
  let local = null;
  try { local = JSON.parse(localStorage.getItem(gameStoreKey()) || 'null'); } catch { /* corrupt cache */ }
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

// ── helpers ───────────────────────────────────────────────────────
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const setStatus = (msg) => { const el = $('camera-status'); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; };
const remaining = (type) => bricks.filter(b => !b.broken && (!type || b.type === type));
const secs = (ms) => (ms / 1000).toFixed(1) + 's';

// Lucide icons from the shared registry (js/icons.js). Returns '' if that script is missing, so text still renders.
const lwIcon = (id, o) => (window.LWIcons ? window.LWIcons.markup(id, o) : '');
// 3 star icons, `n` of them lit. Counts are clamped because the best-run record comes from localStorage.
const starsHtml = (n) => { n = Math.max(0, Math.min(3, Number(n) || 0)); return [1, 2, 3].map((i) => `<span class="gm-star${i <= n ? ' is-on' : ''}">${lwIcon('star')}</span>`).join(''); };

function log(text, cls) {
  const ul = $('gm-log'), li = document.createElement('li');
  li.className = cls;
  // check / x icon instead of a typed ✓ / ✗; setLabel puts the text in with textContent, so model labels are never parsed as HTML.
  if (window.LWIcons) window.LWIcons.setLabel(li, cls === 'ok' ? 'check' : 'x', text, { size: 'sm' }); else li.textContent = text;
  ul.prepend(li);
  while (ul.children.length > 30) ul.lastChild.remove();
}

// ── on-screen feedback: status pill, two timers, camera glow ─────
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
  dev('onMiss', text);   // DEV-TEST
  $('gm-miss').textContent = stats.wrong;
  log(text, 'bad');
  for (const el of [$('gm-cam'), $('gm-wall')]) { el.classList.remove('is-miss'); void el.offsetWidth; el.classList.add('is-miss'); }
  dropHold();
}
function dropHold() {
  heldBrick?.el?.classList.remove('is-held');
  heldBrick = null; holdSince = 0; wrongLabel = null; wrongSince = 0;
}

// ── sign pool: signs the learner has FINISHED, optionally topped up ──
// XP eligibility, Wall Breaker eligibility, and Time Attack all use the same
// learned-sign union supplied by LWXP: xpState plus completed LESSON items.
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

// Signs that exist in the curriculum (missions.js LESSON items). SIGN_DICTIONARY also holds detector-only
// entries that no lesson teaches (phrases like ILY, I AM LEARNING, WHERE IS...), so the game never draws
// from the raw dictionary. If missions.js isn't available, returns null = no curriculum filter.
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

// Playable = a model's labels.json can classify it AND a lesson teaches it.
// labels.json is the ONLY authority for "can be classified" (via classifier.js, which maps each sign to the
// model for its detection type and honours the classifier's own twin groups). dictionary.js `disabled`
// flags are NOT used, and NONE can never pass. `requireModels` = the model weights must also be loaded.
function playableFilter({ requireModels = false } = {}) {
  const curriculum = getCurriculumSignIds();
  return (s) => {
    if (!isSignClassifiable(s)) return false;
    if (curriculum && !curriculum.has(s)) return false;
    if (!requireModels) return true;
    return getDetectionType(s) === 'motion' ? isMotionModelReady() : isClassifierReady();
  };
}

// The full playable set, derived from the labels (not from the dictionary).
const playablePool = (opts) => getClassifiableSigns().filter(playableFilter(opts));

// Twin signs (BRING/CARRY, 0/O ...) are the same gesture to the classifier, so two of them on one wall would
// both ask for the identical sign. Keep one per group, preferring a sign that is itself a trained label.
function dedupeTwins(signs) {
  const keyOf = (s) => { const g = getSignGroup(s); return g.length === 1 ? null : g.slice().sort().join('|'); };
  const best = new Map();   // group key -> chosen sign
  for (const s of signs) {
    const k = keyOf(s);
    if (k && (!best.has(k) || (!isTrainedLabel(best.get(k)) && isTrainedLabel(s)))) best.set(k, s);
  }
  return signs.filter((s) => { const k = keyOf(s); return !k || best.get(k) === s; });
}

// source: 'learned' (default) = ONLY finished signs, wall shrinks if you have fewer than the wall size
//         'mixed'   = finished signs first, then unlearned lesson signs to fill the wall
//         'all'     = any lesson sign
// `ready` resolves true once the camera + models are loaded. Returns { signs, learnedSet, note }, or null if boot failed.
async function buildPool(size, source, ready) {
  // Labels first (cheap, independent of the camera), so the pool never depends on a boot race.
  const [learnedAll, booted] = await Promise.all([getLearnedSignIds(), ready, loadModelLabels()]);
  if (!booted) return null;
  const usable = playableFilter({ requireModels: true });
  const finalize = (list) => dedupeTwins(list).filter(usable);   // last gate: nothing unclassifiable reaches the wall

  const devPool = dev('getPool');   // DEV-TEST (letters/numbers test set) — still passes through the same labels.json gate
  if (devPool) return { ...devPool, signs: finalize(devPool.signs || []) };   // DEV-TEST

  const everything = playablePool({ requireModels: true });
  const learned = dedupeTwins(shuffle([...learnedAll].filter(usable)));
  const others = () => dedupeTwins(shuffle(everything.filter((s) => !learnedAll.has(s))))
    .filter((s) => !learned.some((l) => getSignGroup(l).includes(s)));   // don't re-add a twin of a learned sign
  let signs, note = '';

  if (source === 'all') {
    signs = dedupeTwins(shuffle(everything)).slice(0, size);
  } else if (source === 'mixed') {
    signs = learned.slice(0, size);
    signs = signs.concat(others().slice(0, size - signs.length));
    if (learned.length < size) note = `${learned.length} finished sign${learned.length === 1 ? '' : 's'} + ${signs.length - Math.min(learned.length, size)} new ones (click a brick for a hint).`;
  } else {
    signs = learned.slice(0, size);   // unique signs only: a smaller wall beats duplicate bricks
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

// ── wall ──────────────────────────────────────────────────────────
function renderWall() {
  const wall = $('gm-wall'); wall.innerHTML = '';
  // LAYOUT PASS: the wall now lives in the right-hand column next to the camera, so it is narrower than before.
  // Cap rows at 5 bricks (9 -> 3x3, 15 -> 3x5, 21 -> 5 rows of 5/4/4/4/4) so bricks stay wide enough to read,
  // and spread the remainder evenly instead of leaving one stretched brick on the last row.
  const rows = Math.max(ROWS, Math.ceil(bricks.length / 5)), base = Math.floor(bricks.length / rows), extra = bricks.length % rows;
  let from = 0;
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'gm-row' + (r % 2 ? ' is-odd' : '');
    const count = base + (r < extra ? 1 : 0);
    bricks.slice(from, from + count).forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `gm-brick gm-brick--${b.type}` + (b.sign.length > 2 ? ' gm-brick--word' : '');   // word signs get a smaller, wrapping label
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
      if (!cat) { set = null; break; }                // no category info -> unrestricted (engine default)
      cat.forEach(l => set.add(l));
      getSignGroup(b.sign).forEach(l => set.add(l));  // twins like BRING/CARRY stay eligible
    }
    return { active: true, set };
  };
  allowedStatic = build('static'); allowedMotion = build('motion');
}

// a detected label -> first unbroken brick of that type it satisfies (twins count)
function findBrick(label, type) {
  if (!label) return null;
  const group = getSignGroup(label);
  return bricks.find(b => !b.broken && b.type === type && group.includes(b.sign)) || null;
}

function smash(b, viaMotion) {
  if (!b || b.broken) return;
  b.broken = true; stats.correct++;
  brokenLog.push({ s: b.sign, t: Date.now() - startedAt, m: b.type === 'motion' });
  dev('onSmash', b.sign, viaMotion);   // DEV-TEST
  b.el.classList.remove('is-held'); b.el.classList.add('is-broken'); b.el.disabled = true;
  log(b.sign, 'ok');
  dropHold();
  if (!viaMotion) ignoreGroup = getSignGroup(b.sign);   // still holding it? don't count that as a miss
  updateProgress(); computeAllowed();
  if (!remaining().length) { running = false; setPill('Wall cleared!'); later(finish, 800); return; }
  if (!viaMotion) {
    setTimer('static', 1, 'Broken!', true);
    later(() => { if (running && phase === 'static') { resetTimers(); refreshIdleUi(); } }, 500);
  }
}

// ── static detection (free order) ────────────────────────────────
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
  dev('onStatic', r);   // DEV-TEST
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

// ── motion detection (button/Space -> 3-2-1-GO -> record) ────────
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
  dev('onMotion', r);   // DEV-TEST
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
    motionResult(r);                 // the 2.5s window completed
  }                                  // waiting + not buffering = frame had no usable features; keep waiting
}

// ── main loop ─────────────────────────────────────────────────────
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
    console.error('[game] detection step failed:', e);   // one bad frame must not kill the loop
  }
}

// ── game flow ─────────────────────────────────────────────────────
async function bootEngine() {
  if (engineReady || booting) return engineReady;
  booting = true;
  try {
    setStatus('Loading hand tracking, camera and sign models…');
    // PERF FIX — these three used to run one after another (sum of all three waits).
    // They don't depend on each other, so run them together (total = the slowest one).
    await Promise.all([
      initMediaPipe(),
      startCamera(videoEl, canvasEl),
      loadModels(),
    ]);
    if (!isModelReady()) throw new Error('Hand tracking model failed to load');
    setStatus(''); engineReady = true;
  } catch (e) {
    console.error('[game] boot failed:', e);
    stopCamera(videoEl);                       // don't leave the camera on after a failed boot
    setStatus(`Could not start: ${e.message}`);
    // the start overlay covers #camera-status, so show the reason where the player can see it
    $('gm-pool-note').textContent = `Could not start: ${e.message}`;
  }
  booting = false;
  return engineReady;
}

async function startGame() {
  const size = +$('gm-size').value, btn = $('gm-btn-start');
  // PERF/UX FIX — instant feedback. Before, the button just went dead for several seconds
  // (boot + up to 3x4s progress waits) with the only status text hidden under the overlay.
  btn.disabled = true; btn.textContent = 'Loading…';
  $('gm-pool-note').textContent = 'Loading hand tracking, camera and sign models…';
  let ok = false, pool = null;
  try {
    await gameProgressReady;
    // engine boot and the sign-pool lookup are independent -> run them in parallel
    // buildPool waits for the boot result itself, because the playable pool needs the models to be loaded.
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
  xpSessionP = window.LWXP ? window.LWXP.startGame(signs.slice()) : Promise.resolve(null);   // never throws
  xpSessionP.then((s) => {
    if (s && !s.xpEligible) $('gm-hint').textContent = `XP & badges count when ${s.minLearned}+ bricks are signs you've learned - this wall has ${s.learnedBricks}.`;
  });
  clearInterval(tickId); tickId = setInterval(() => { $('gm-time').textContent = fmt(Date.now() - startedAt); }, 500);
  resetTimers(); refreshIdleUi();
  if (!rafId) loop();
}

function finish() {
  running = false; clearInterval(tickId); clearTimers(); phase = 'static';
  // PERF FIX — the rAF loop kept running MediaPipe + skeleton drawing behind the result modal.
  // startGame() restarts it (`if (!rafId) loop()`), so it's safe to stop here.
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  clearCanvas(ctx, canvasEl.width, canvasEl.height);
  const ms = Date.now() - startedAt, total = stats.correct + stats.wrong;
  const acc = total ? stats.correct / total : 1;
  const stars = acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
  const gems = stats.size + stars * 5;
  const d = load(), earned = [];
  // XP badges are awarded by the shared browser engine and shown below via reportWall();
  // the old local-only badge list (lw_game_v1.badges) remains display-only.
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
  $('gm-start').hidden = false; $('gm-quit').hidden = true;   // setup panel returns so size/source can be changed
  setCamMode('idle'); $('gm-btn-motion').disabled = true;
  showBest();
  reportWall();
}

// Report the cleared wall and show the shared XP engine result. Gems/stars above stay local
// and cosmetic; XP and badges are persisted with the paired Firestore transaction.
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

// Abandon the current wall: stops the camera, nothing is paid, setup panel comes back.
function quitRun() {
  if (!running) return;
  shutdown();
  $('gm-start').hidden = false; $('gm-btn-start').disabled = false;
  $('gm-hint').textContent = ''; setPill('—'); setCamMode('idle'); resetTimers();
  setStatus('Wall abandoned. Press Start to try again.');
}

// ── wire up ───────────────────────────────────────────────────────
const clearDone = () => $('gm-progress').classList.remove('is-done');
$('gm-btn-start').addEventListener('click', () => { clearDone(); startGame(); });
$('gm-btn-again').addEventListener('click', () => { $('gm-result').hidden = true; clearDone(); startGame(); });
$('gm-btn-motion').addEventListener('click', startMotion);
$('gm-quit').addEventListener('click', quitRun);
$('gm-size').addEventListener('change', showBest);
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || !running) return;
  if (/^(SELECT|INPUT|TEXTAREA|BUTTON|A)$/.test(e.target?.tagName || '')) return;   // focused buttons handle Space natively
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
window.addEventListener('pageshow', (e) => { if (e.persisted) refreshPoolNote(); });   // back/forward cache: progress may have changed
dev('attach', {   // DEV-TEST — lets the dev panel read the wall and force-break bricks
  isRunning: () => running,   // DEV-TEST
  bricks: () => bricks.map((b) => ({ sign: b.sign, type: b.type, broken: b.broken })),   // DEV-TEST
  smashSign: (sign) => { const b = bricks.find((x) => !x.broken && x.sign === sign); if (b) smash(b, true); return !!b; },   // DEV-TEST
});   // DEV-TEST
