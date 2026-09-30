/*
  js/game.js — Wall Breaker (standalone game tab)
  Reuses: cameraUtils, mediapipe, classifier, dictionary, renderer.
  Only engine change: classifier.js gained logNearMiss() (was undefined -> threw every
  frame, which is what broke detection) and getSignGroup() (twin signs like BRING/CARRY).

  Rules (FREE ORDER — there is no fixed "next" brick):
   - Every brick on the wall is live at once. Sign any of them, in any order.
   - STATIC bricks (blue): hold the sign steady ~0.5s            -> blue "hold" timer.
   - MOTION bricks (orange): press "Record motion sign" (or Space). 3-2-1-GO, then a
     2.5s recording window                                       -> orange "record" timer.
     The motion you perform is matched against every motion brick still on the wall.
   - A confident sign that is NOT on the wall, or a failed motion attempt, is a miss.
   - Clear the wall -> reward (stars + gems + badges, saved in localStorage 'lw_game_v1').
  Lifecycle: stopCamera + cancelAnimationFrame + all timers cleared on pagehide/hidden.
*/
import { startCamera, stopCamera } from './camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas } from './engine/renderer.js';
import { getDetectionType, getActiveSigns, getSignData } from './engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer, finalizeMotionWindow,
         loadModels, isMotionModelReady, getAllowedLabelsForSign, getSignGroup,
         getMotionBufferStatus } from './engine/classifier.js';

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
const ROWS = 3, STORE = 'lw_game_v1';

let bricks = [], running = false, rafId = null, timers = new Set();
let stats = { correct: 0, wrong: 0, size: 0 }, startedAt = 0, tickId = null, engineReady = false, booting = false;
let phase = 'static';             // 'static' | 'countdown' | 'waiting' | 'recording' | 'cooldown'
let heldBrick = null, holdSince = 0, lastGoodAt = 0, ignoreGroup = null;
let wrongLabel = null, wrongSince = 0, lastMissAt = 0;
let waitStart = 0, handLostAt = null, motionMs = 2500;
let allowedStatic = { active: false, set: null }, allowedMotion = { active: false, set: null };

// ── storage ───────────────────────────────────────────────────────
function load() {
  try { return Object.assign({ gems: 0, walls: 0, badges: [], best: {} }, JSON.parse(localStorage.getItem(STORE) || '{}')); }
  catch { return { gems: 0, walls: 0, badges: [], best: {} }; }
}
function save(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* private mode */ } }

// ── helpers ───────────────────────────────────────────────────────
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const setStatus = (msg) => { const el = $('camera-status'); el.textContent = msg; el.style.display = msg ? 'flex' : 'none'; };
const remaining = (type) => bricks.filter(b => !b.broken && (!type || b.type === type));
const secs = (ms) => (ms / 1000).toFixed(1) + 's';

function log(text, cls) {
  const ul = $('gm-log'), li = document.createElement('li');
  li.className = cls; li.textContent = text;
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
  $('gm-miss').textContent = stats.wrong;
  log(text, 'bad');
  for (const el of [$('gm-cam'), $('gm-wall')]) { el.classList.remove('is-miss'); void el.offsetWidth; el.classList.add('is-miss'); }
  dropHold();
}
function dropHold() {
  heldBrick?.el?.classList.remove('is-held');
  heldBrick = null; holdSince = 0; wrongLabel = null; wrongSince = 0;
}

// ── sign pool: learned signs first, topped up with UNIQUE enabled signs ──
async function buildPool(size) {
  let learned = [];
  try {
    await window.LWProgress?.whenProgressReady?.();
    learned = (window.LWProgress?.getAllLearnedSigns?.() || []).map(s => s.signId);
  } catch { /* progress not ready — fall back below */ }
  const active = new Set(getActiveSigns());
  const motionOk = isMotionModelReady();
  const usable = (s) => active.has(s) && (getDetectionType(s) !== 'motion' || motionOk);
  let pool = shuffle([...new Set(learned)].filter(usable));
  if (pool.length < size) {
    const extra = shuffle(getActiveSigns().filter(usable).filter(s => !pool.includes(s)));
    pool = pool.concat(extra.slice(0, size - pool.length));
  }
  const out = pool.slice(0, size);
  while (out.length < size && pool.length) out.push(...shuffle([...pool]).slice(0, size - out.length));
  return shuffle(out);
}

// ── wall ──────────────────────────────────────────────────────────
function renderWall() {
  const wall = $('gm-wall'); wall.innerHTML = '';
  const perRow = Math.ceil(bricks.length / ROWS);
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'gm-row' + (r % 2 ? ' is-odd' : '');
    bricks.slice(r * perRow, (r + 1) * perRow).forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `gm-brick gm-brick--${b.type}`;
      el.innerHTML = `<span class="gm-brick__tag">${b.type === 'motion' ? 'MOVE' : 'HOLD'}</span><span class="gm-brick__sign"></span>`;
      el.querySelector('.gm-brick__sign').textContent = b.sign;
      el.title = 'Click for a hint';
      el.addEventListener('click', () => showHint(b));
      b.el = el; row.appendChild(el);
    });
    wall.appendChild(row);
  }
  updateProgress();
}

function showHint(b) {
  const d = getSignData(b.sign)?.description;
  $('gm-hint').textContent = d ? `${b.sign}: ${d}` : `${b.sign}: open Learn to review this sign.`;
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
  b.el.classList.remove('is-held'); b.el.classList.add('is-broken'); b.el.disabled = true;
  log(`✓ ${b.sign}`, 'ok');
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
    if (now - wrongSince >= WRONG_HOLD_MS && now - lastMissAt > MISS_COOLDOWN_MS) miss(`✗ ${r.label} isn't on the wall`);
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
  const b = r && r.matched ? findBrick(r.label, 'motion') : null;
  if (b) { setTimer('motion', 1, 'Done', true); smash(b, true); return endMotion(`✓ ${b.sign}`); }
  setTimer('motion', 1, 'Done', true);
  miss(`✗ Motion not recognised (${r?.label ? `${r.label} ${r.confidence}%` : 'no clear sign'})`);
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
    setStatus('Loading hand tracking…'); await initMediaPipe();
    setStatus('Starting camera…');       await startCamera(videoEl, canvasEl);
    setStatus('Loading sign models…');   await loadModels();
    if (!isModelReady()) throw new Error('Hand tracking model failed to load');
    setStatus(''); engineReady = true;
  } catch (e) {
    console.error('[game] boot failed:', e);
    setStatus(`Could not start: ${e.message}`);
  }
  booting = false;
  return engineReady;
}

async function startGame() {
  const size = +$('gm-size').value;
  $('gm-btn-start').disabled = true;
  if (!(await bootEngine())) { $('gm-btn-start').disabled = false; return; }
  clearTimers();
  const signs = await buildPool(size);
  bricks = signs.map(sign => ({ sign, type: getDetectionType(sign) === 'motion' ? 'motion' : 'static', el: null, broken: false }));
  stats = { correct: 0, wrong: 0, size };
  phase = 'static'; heldBrick = null; holdSince = 0; ignoreGroup = null; wrongLabel = null; wrongSince = 0; lastMissAt = 0; handLostAt = null;
  resetMotionBuffer();
  renderWall(); computeAllowed();
  $('gm-start').hidden = true; $('gm-result').hidden = true;
  $('gm-log').innerHTML = ''; $('gm-hint').textContent = 'Tip: click any brick to see how to sign it.';
  $('gm-miss').textContent = '0'; $('gm-gems').textContent = load().gems; $('gm-time').textContent = '0:00';
  running = true; startedAt = Date.now();
  clearInterval(tickId); tickId = setInterval(() => { $('gm-time').textContent = fmt(Date.now() - startedAt); }, 500);
  resetTimers(); refreshIdleUi();
  if (!rafId) loop();
}

function finish() {
  running = false; clearInterval(tickId); clearTimers(); phase = 'static';
  const ms = Date.now() - startedAt, total = stats.correct + stats.wrong;
  const acc = total ? stats.correct / total : 1;
  const stars = acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
  const gems = stats.size + stars * 5;
  const d = load(), earned = [];
  const add = (id, label) => { if (!d.badges.includes(id)) { d.badges.push(id); earned.push(label); } };
  d.gems += gems; d.walls++;
  add('first', '🧱 First Wall');
  if (stats.wrong === 0) add('flawless', '💎 Flawless');
  if (ms / stats.size <= 6000) add('speed', '⚡ Speed Breaker');
  if (d.walls >= 5) add('veteran', '🏗️ Wall Veteran');
  const prev = d.best[stats.size];
  if (!prev || stars > prev.stars || (stars === prev.stars && ms < prev.ms)) d.best[stats.size] = { stars, ms };
  save(d);

  $('gm-gems').textContent = d.gems;
  $('gm-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('gm-result-title').textContent = 'Wall cleared!';
  $('gm-result-text').textContent = `${fmt(ms)} · ${Math.round(acc * 100)}% accuracy · +${gems} gems`;
  $('gm-badges').innerHTML = ''; earned.forEach(t => { const s = document.createElement('span'); s.textContent = t; $('gm-badges').appendChild(s); });
  $('gm-chest').classList.remove('is-open'); void $('gm-chest').offsetWidth;
  $('gm-chest').textContent = '🎉'; $('gm-chest').classList.add('is-open');
  $('gm-progress').classList.add('is-done');
  $('gm-result').hidden = false; $('gm-btn-start').disabled = false;
  setCamMode('idle'); $('gm-btn-motion').disabled = true;
  showBest();
}

function showBest() {
  const b = load().best[$('gm-size').value];
  $('gm-best').textContent = b ? `Best: ${'★'.repeat(b.stars)} in ${fmt(b.ms)}` : '';
}

function shutdown() {
  running = false; clearTimers(); clearInterval(tickId);
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  stopCamera(videoEl); engineReady = false; phase = 'static';
  resetMotionBuffer();
}

// ── wire up ───────────────────────────────────────────────────────
const clearDone = () => $('gm-progress').classList.remove('is-done');
$('gm-btn-start').addEventListener('click', () => { clearDone(); startGame(); });
$('gm-btn-again').addEventListener('click', () => { $('gm-result').hidden = true; clearDone(); startGame(); });
$('gm-btn-motion').addEventListener('click', startMotion);
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
