/*
  js/time-attack.js — Time Attack page controller
  PURPOSE  : Presents one learned ASL sign demo and checks the learner's live camera signing.
  CONNECTS : Reuses cameraUtils, MediaPipe, renderer, classifier, dictionary, LWMissions media and LWXP game sessions.
*/
import { startCamera, stopCamera } from './camera/cameraUtils.js';
// Game Leaderboards: loaded on demand, so a problem in that module can never stop this game from loading.
const reportScore = (game, difficulty, result) => import('./game-scores.js').then((m) => m.submitScore(game, difficulty, result)).catch((error) => console.warn('[game-scores] unavailable:', error));
import { initMediaPipe, processFrame, isModelReady, resetTracking } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas } from './engine/renderer.js';
import { getDetectionType, getSignData } from './engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer, loadModels, loadModelLabels,
  isClassifierReady, isMotionModelReady, getClassifiableSigns, isSignClassifiable,
  getMotionBufferStatus, finalizeMotionWindow, getSignGroup, getAllowedLabelsForSign } from './engine/classifier.js';

const $ = (id) => document.getElementById(id);
const videoEl = $('ta-video'), canvasEl = $('ta-canvas'), ctx = canvasEl.getContext('2d');
let ready = false, running = false, finishing = false, rafId = null, tickId = null, phase = 'static', timers = new Set();
let bootPromise = null, bootGeneration = 0, trackingPromise = null, modelsPromise = null, labelsPromise = null;
let targets = [], targetIndex = 0, misses = 0, heldSince = 0, wrongSince = 0, wrongLabel = '', lastMissAt = 0;
let startedAt = 0, brokenLog = [], xpSessionP = Promise.resolve(null), motionWaitAt = 0, handLostAt = null;
const currentTarget = () => targets[targetIndex] || null;
// Per-run caches. The dictionary scans below are O(number of signs) and used to run on EVERY animation frame.
let lastFrame = null, motionAllowedCache = null;
const getMotionAllowed = () => (motionAllowedCache ??= new Set(getClassifiableSigns().filter((sign) => isSignClassifiable(sign) && getDetectionType(sign) === 'motion')));
const formatTime = (ms) => `${(ms / 1000).toFixed(1)}s`;
const setStatus = (message) => { $('ta-status').textContent = message; };
// Overlays are shown/hidden with an inline display as well as [hidden]: a CSS rule that sets display on them overrides the
// hidden attribute, which left the 'Still loading...' message stuck on top of a working camera.
const toggle = (el, visible) => {
  if (!el) return;
  el.hidden = !visible;
  if (!visible) { el.style.display = 'none'; return; }
  el.style.display = '';                                            // let the stylesheet decide first...
  if (getComputedStyle(el).display === 'none') el.style.display = 'flex';   // ...and only force it on if the CSS default is hidden
};
function setLoadingMessage(message) {
  $('camera-status').textContent = message;
  const detail = $('ta-loading').querySelector('p');
  if (detail) detail.textContent = message;
}
function setMode(mode) { $('ta-cam').dataset.mode = mode; $('ta-right').dataset.mode = mode; }
function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); }
function clearTimers() { timers.forEach(clearTimeout); timers.clear(); }

function withTimeout(promise, ms, label) {
  let timeoutId;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)), ms); })
  ]).finally(() => clearTimeout(timeoutId));
}

async function getLearnedSignIds() {
  if (typeof window.LWXP?.getLearnedSigns !== 'function') {
    throw new Error('The learned-sign service is unavailable. Reload Time Attack and try again.');
  }
  return new Set(await withTimeout(window.LWXP.getLearnedSigns(), 12000, 'Loading learned signs'));
}

function signContentFor(signId) {
  const M = window.LWMissions, signs = M?.content?.SIGNS || [];
  // Some signs appear in several lessons; use an existing lesson media entry, preferring one with a demo.
  const entry = signs.find((sign) => sign.signId === signId && (sign.videoUrl || sign.imageUrl)) ||
    signs.find((sign) => sign.signId === signId) || null;
  return entry ? (M?.getSign?.(entry.level, signId, entry.category) || entry) : null;
}

function makeTarget(signId) {
  const type = getDetectionType(signId) === 'motion' ? 'motion' : 'static';
  const content = signContentFor(signId);
  const videos = content && window.LWMissions?.getSignVideoUrls
    ? window.LWMissions.getSignVideoUrls(signId, content.videoUrl)
    : [content?.videoUrl].filter(Boolean);
  return { signId, type, content, videos: [...new Set(videos)], imageUrl: content?.imageUrl || '' };
}

function youtubeEmbed(url) {
  const match = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{6,})(\?[^\s#]*)?$/i.exec(String(url || '').trim());
  if (!match) return null;
  const parsed = new URL(url);
  [['autoplay', '1'], ['mute', '1'], ['loop', '1'], ['playlist', match[3]], ['rel', '0'], ['playsinline', '1'], ['controls', '0']]
    .forEach(([key, value]) => parsed.searchParams.set(key, value));
  return parsed.href;
}

function showDemoFallback(target, message) {
  const host = $('ta-demo'), empty = $('ta-demo-empty');
  host.querySelectorAll('.ta-demo__video,.ta-demo__frame,.ta-demo__image').forEach((node) => node.remove());
  empty.hidden = false;
  empty.replaceChildren();
  if (target.imageUrl) {
    const img = document.createElement('img');
    img.className = 'ta-demo__image'; img.alt = `ASL sign ${target.signId}`; img.src = target.imageUrl;
    img.addEventListener('error', () => { img.remove(); empty.textContent = target.content?.description || `Demo media is unavailable for ${target.signId}.`; }, { once: true });
    empty.append(img);
    const caption = document.createElement('p'); caption.textContent = message || `ASL sign ${target.signId}`; empty.append(caption);
  } else {
    empty.textContent = target.content?.description || message || `Demo media is unavailable for ${target.signId}.`;
  }
}

function renderTargetDemo(target) {
  const host = $('ta-demo'), empty = $('ta-demo-empty');
  host.querySelectorAll('.ta-demo__video,.ta-demo__frame,.ta-demo__image').forEach((node) => node.remove());
  empty.hidden = true;
  const yt = target.videos.map(youtubeEmbed).find(Boolean);
  if (yt) {
    const frame = document.createElement('iframe');
    frame.className = 'ta-demo__frame'; frame.src = yt; frame.title = `ASL sign ${target.signId}`;
    frame.allow = 'autoplay; encrypted-media'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('error', () => showDemoFallback(target, `ASL sign ${target.signId}`), { once: true });
    host.append(frame); return;
  }
  const sources = target.videos.filter((url) => !youtubeEmbed(url));
  if (sources.length) {
    const player = document.createElement('video');
    player.className = 'ta-demo__video'; player.autoplay = true; player.muted = true; player.loop = true; player.playsInline = true;
    player.addEventListener('error', () => showDemoFallback(target, `ASL sign ${target.signId}`), { once: true });
    sources.forEach((url, index) => {
      const source = document.createElement('source'); source.src = url; source.type = 'video/mp4';
      source.addEventListener('error', () => {
        if (index === sources.length - 1) showDemoFallback(target, `ASL sign ${target.signId}`);
      });
      player.append(source);
    });
    host.append(player);
    player.load(); player.play().catch(() => { /* muted inline playback may await a browser gesture */ });
    return;
  }
  showDemoFallback(target, `ASL sign ${target.signId}`);
}

function setTarget() {
  clearTimers();
  const target = currentTarget();
  $('ta-count').textContent = `${Math.min(targetIndex + 1, targets.length)}/${targets.length}`;
  $('ta-target').textContent = target?.signId || 'Complete';
  $('ta-sign-type').textContent = target?.type === 'motion' ? 'MOTION SIGN' : 'STATIC SIGN';
  $('ta-sign-type').dataset.type = target?.type || 'static';
  $('ta-sign-type').hidden = !target;
  $('ta-hint').textContent = target ? (target.content?.description || getSignData(target.signId)?.description || '') : '';
  document.querySelector('.ta-progress')?.style.setProperty('--p', targets.length ? targetIndex / targets.length : 0);
  heldSince = 0; wrongSince = 0; wrongLabel = ''; resetMotionBuffer(); phase = 'static';
  setMode(target ? target.type : 'idle');
  $('ta-motion').disabled = !target || target.type !== 'motion';
  if (target) renderTargetDemo(target);
}

async function boot() {
  if (ready) return true;
  if (bootPromise) return bootPromise;
  const generation = ++bootGeneration;
  bootPromise = (async () => {
    const status = $('camera-status');
    toggle(status, true);
    status.textContent = 'Requesting camera access…';
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error(window.isSecureContext
          ? 'This browser does not support camera access. Try an up-to-date browser.'
          : 'Camera access requires HTTPS or localhost. Open LinguaWave from a secure local server.');
        error.name = window.isSecureContext ? 'NotSupportedError' : 'SecurityError';
        throw error;
      }
      // Start the camera first so browser permission/device errors are reported directly,
      // then load the same tracking and classifier stack used by Wall Breaker.
      await withTimeout(startCamera(videoEl, canvasEl), 12000, 'Starting camera');
      if (generation !== bootGeneration) { stopCamera(videoEl); return false; }
      const stream = videoEl.srcObject;
      if (videoEl.readyState < 2 || !stream?.getVideoTracks?.().some((track) => track.readyState === 'live')) {
        throw new Error('The camera did not produce a live video stream. Check camera permission and try again.');
      }
      setLoadingMessage('Loading MediaPipe hand tracking and sign models…');
      if (!trackingPromise) trackingPromise = initMediaPipe().catch((error) => { trackingPromise = null; throw error; });
      if (!modelsPromise) modelsPromise = loadModels().catch((error) => { modelsPromise = null; throw error; });
      if (!labelsPromise) labelsPromise = loadModelLabels().catch((error) => { labelsPromise = null; throw error; });
      const remaining = new Set(['MediaPipe hand tracking', 'ASL recognition models', 'model labels']);
      const markReady = (stage) => {
        remaining.delete(stage);
        if (remaining.size) setLoadingMessage(`Loaded ${stage}. Still loading ${[...remaining].join(' and ')}…`);
      };
      await Promise.all([
        withTimeout(trackingPromise, 45000, 'Loading MediaPipe hand tracking').then(() => markReady('MediaPipe hand tracking')),
        withTimeout(modelsPromise, 45000, 'Loading ASL recognition models').then(() => markReady('ASL recognition models')),
        withTimeout(labelsPromise, 20000, 'Loading sign model labels').then(() => markReady('model labels'))
      ]);
      if (generation !== bootGeneration) { stopCamera(videoEl); return false; }
      if (!isModelReady()) throw new Error('Hand tracking could not start. Refresh the page and try again.');
      ready = true;
      toggle(status, false); status.textContent = '';
      return true;
    } catch (error) {
      console.error('[time-attack] camera/model startup failed:', error);
      stopCamera(videoEl);
      toggle(status, true);
      const messages = {
        NotAllowedError: 'Camera access was blocked. Allow camera access for this site in your browser settings, then try again.',
        PermissionDeniedError: 'Camera access was blocked. Allow camera access for this site in your browser settings, then try again.',
        NotFoundError: 'No camera was found. Connect a camera and try again.',
        NotReadableError: 'The camera is already in use or unavailable. Close other camera apps and try again.',
        OverconstrainedError: 'The camera could not use the requested video settings. Try another camera.',
        NotSupportedError: 'This browser does not support camera access. Try an up-to-date browser.',
        SecurityError: 'Camera access requires HTTPS or localhost. Open LinguaWave from a secure local server.'
      };
      const details = messages[error?.name] || error?.message || 'Check your connection and try again.';
      status.textContent = error?.name === 'CameraTimeoutError'
        ? details
        : `Startup failed: ${details}`;
      $('ta-error-message').textContent = status.textContent;
      $('ta-error').hidden = false;
      return false;
    } finally {
      bootPromise = null;
    }
  })();
  return bootPromise;
}

function recordMiss(label) {
  const now = Date.now();
  if (now - lastMissAt < 900) return;
  lastMissAt = now; misses++; $('ta-misses').textContent = misses;
  setStatus(`${label} was not the target. Try ${currentTarget()?.signId || 'the target'}.`);
}

function acceptTarget() {
  const target = currentTarget();
  if (!target) return;
  brokenLog.push({ s: target.signId, t: Date.now() - startedAt, m: target.type === 'motion' });
  targetIndex++;
  if (targetIndex >= targets.length) finish();
  else { setStatus('Correct! Next target.'); setTarget(); }
}

function detectStatic(left, right, face, pose, anyHandPresent, now, fresh = true) {
  const target = currentTarget();
  if (!target || target.type !== 'static') return;
  if (!anyHandPresent) { heldSince = 0; wrongSince = 0; wrongLabel = ''; return; }
  if (!fresh) return;   // same landmarks as the last tick: nothing new to classify (the hold timer is wall-clock, so it keeps counting)
  target.allowedLabels ??= getAllowedLabelsForSign(target.signId);
  const result = classifyGesture(left, right, face, target.allowedLabels, pose, target.signId);
  if (result?.matched && result.label === target.signId) {
    if (!heldSince) heldSince = now;
    if (now - heldSince >= 500) acceptTarget();
    return;
  }
  heldSince = 0;
  if (result?.matched && result.label && result.label !== target.signId) {
    if (wrongLabel !== result.label) { wrongLabel = result.label; wrongSince = now; }
    if (now - wrongSince >= 700) { recordMiss(result.label); wrongSince = now; }
  } else { wrongSince = 0; wrongLabel = ''; }
}

function recordMotion() {
  const target = currentTarget();
  if (!running || phase !== 'static' || !target || target.type !== 'motion') return;
  phase = 'countdown'; handLostAt = null; resetMotionBuffer(); setMode('motion');
  $('ta-motion').disabled = true;
  countdown(0);
}

function countdown(step) {
  if (!running || phase !== 'countdown') return;
  const steps = ['3', '2', '1', 'GO!'];
  if (step >= steps.length) {
    phase = 'waiting'; motionWaitAt = Date.now(); handLostAt = null; resetMotionBuffer();
    setStatus('Sign now!'); return;
  }
  setStatus(`Get ready: ${steps[step]}`);
  later(() => countdown(step + 1), 600);
}

function handleMotion(left, right, face, pose, anyHandPresent, now, fresh = true) {
  if (phase !== 'waiting' && phase !== 'recording') return;
  if (!anyHandPresent) {
    if (phase === 'waiting' && now - motionWaitAt > 6000) { phase = 'static'; setMode('motion'); setStatus('No hand detected. Press Record motion sign to try again.'); }
    if (phase === 'recording') {
      handLostAt ??= now;
      if (now - handLostAt > 1200) {
        const target = currentTarget(), allowed = getMotionAllowed();
        const result = finalizeMotionWindow(allowed, target?.signId || null);
        if (result) return finishMotionAttempt(result);
        phase = 'static'; resetMotionBuffer(); setMode('motion'); setStatus('Not enough motion captured. Press Record motion sign to try again.');
      }
    }
    return;
  }
  handLostAt = null;
  if (!fresh) return;   // do not feed the same detection into the motion buffer more than once
  const allowed = getMotionAllowed();
  const result = classifyMotion(left, right, face, allowed, pose, currentTarget()?.signId || null);
  if (result?.buffering) { phase = 'recording'; setStatus(`Recording… ${formatTime(getMotionBufferStatus().elapsedMs || 0)}`); return; }
  if (!result) return;
  if (phase === 'recording') finishMotionAttempt(result);
}

function finishMotionAttempt(result) {
  phase = 'static'; setMode('motion'); $('ta-motion').disabled = false;
  const target = currentTarget();
  if (result.matched && target?.type === 'motion' && result.label === target.signId) acceptTarget();
  else { recordMiss(result.label || 'Unrecognized sign'); setStatus('That was not the target. Press Record motion sign to try again.'); }
}

function loop() {
  rafId = requestAnimationFrame(loop);
  if (!videoEl || videoEl.readyState < 2) return;
  try {
    const frame = processFrame(videoEl);
    const { leftHandLandmarks:left, rightHandLandmarks:right, faceLandmarks:face, poseLandmarks:pose, anyHandPresent } = frame;
    // processFrame() hands back the SAME object until a new detection runs (~20/s), while this loop ticks at the display rate.
    const fresh = frame !== lastFrame; lastFrame = frame;
    const hands = [left, right].filter(Boolean);
    if (hands.length) drawSkeleton(ctx, hands, canvasEl.width, canvasEl.height);
    else clearCanvas(ctx, canvasEl.width, canvasEl.height);
    if (!running) return;
    const now = Date.now();
    if (currentTarget()?.type === 'static') detectStatic(left, right, face, pose, anyHandPresent, now, fresh);
    else if (currentTarget()?.type === 'motion') handleMotion(left, right, face, pose, anyHandPresent, now, fresh);
  } catch (error) {
    console.error('[time-attack] frame processing failed:', error);
    shutdown();
    $('ta-error-message').textContent = 'Hand tracking stopped unexpectedly. Check camera access and try again.';
    $('ta-error').hidden = false;
    $('ta-start').hidden = false; $('ta-start').disabled = false;
    toggle($('camera-status'), true);
    $('camera-status').textContent = $('ta-error-message').textContent;
  }
}

async function start() {
  if (running || finishing || $('ta-start').disabled) return;
  $('ta-start').disabled = true; toggle($('ta-loading'), true); setStatus('Preparing your learned signs…');
  if (!await boot()) { toggle($('ta-loading'), false); $('ta-start').disabled = false; return; }
  toggle($('ta-loading'), false);
  try {
  const startGeneration = bootGeneration;
  const learned = await getLearnedSignIds();
  if (startGeneration !== bootGeneration || document.hidden) return;
  const playableIds = getClassifiableSigns().filter((signId) => learned.has(signId) && isSignClassifiable(signId) &&
    (getDetectionType(signId) === 'motion' ? isMotionModelReady() : isClassifierReady()));
  // Keep only one member of each classifier twin group; both labels describe the same recognized gesture.
  const seenGroups = new Set();
  const pool = playableIds.filter((signId) => {
    const group = getSignGroup(signId) || [signId];
    const key = group.length > 1 ? [...group].sort().join('|') : signId;
    if (seenGroups.has(key)) return false;
    seenGroups.add(key); return true;
  });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  targets = pool.map(makeTarget).filter((target) => target.videos.length || target.imageUrl).slice(0, 10);
  if (!targets.length) { setStatus('No learned signs with playable model demos are available yet. Complete a lesson first.'); $('ta-start').disabled = false; return; }
  targetIndex = 0; misses = 0; brokenLog = []; lastFrame = null; motionAllowedCache = null; $('ta-misses').textContent = '0'; $('ta-time').textContent = '0.0s';
  $('ta-result').hidden = true; $('ta-start').hidden = true; $('ta-quit').disabled = false;
  running = true; startedAt = Date.now(); lastMissAt = 0;
  xpSessionP = Promise.resolve(window.LWXP?.startGame(targets.map((target) => target.signId), 'timeAttack') || null)
    .catch((error) => { console.warn('[time-attack] XP session could not start:', error); return null; });
  clearInterval(tickId); tickId = setInterval(() => { $('ta-time').textContent = formatTime(Date.now() - startedAt); }, 100);
  setStatus('Follow the demo and sign the displayed target.'); setTarget();
  if (!rafId) loop();
  } catch (error) {
    console.error('[time-attack] could not prepare run:', error);
    $('ta-start').disabled = false;
    $('ta-error-message').textContent = error?.message || 'Time Attack could not prepare your learned signs. Try again.';
    $('ta-error').hidden = false;
  } finally {
    toggle($('ta-loading'), false);
  }
}

async function finish() {
  if (finishing || !running) return;
  finishing = true; running = false; phase = 'completed'; clearInterval(tickId); tickId = null; clearTimers();
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  clearCanvas(ctx, canvasEl.width, canvasEl.height);
  const elapsed = Date.now() - startedAt;
  $('ta-time').textContent = formatTime(elapsed); document.querySelector('.ta-progress')?.style.setProperty('--p', 1);
  $('ta-start').hidden = false; $('ta-start').disabled = true; $('ta-quit').disabled = true; setStatus('Sequence complete.');
  $('ta-summary').textContent = `Completion time: ${formatTime(elapsed)} · Correct: ${targets.length} · Misses: ${misses} · Accuracy: ${Math.round(targets.length / (targets.length + misses) * 100)}%`;
  $('ta-result').hidden = false; $('ta-xp').textContent = 'Counting XP…'; $('ta-badges').replaceChildren();
  // Leaderboard: only a FULL run (10 targets) is ranked. Shorter runs happen when a learner knows fewer than 10 signs,
  // and their time is not comparable. finish() runs only after the last target, never on Quit.
  if (targets.length === 10) void reportScore('timeAttack', 'standard', { timeMs: elapsed, misses });
  try {
    const session = await withTimeout(xpSessionP, 12000, 'Starting the XP session');
    const result = session?.sessionId && window.LWXP ? await withTimeout(window.LWXP.finishGame(session.sessionId, brokenLog, misses), 15000, 'Saving the result') : null;
    if (!result?.ok) $('ta-xp').textContent = `XP not counted: ${session?.sessionId ? (window.LWXP?.reasonText?.(result?.reason) || 'unknown reason') : 'no XP session (sign in with a verified account and complete the lessons first)'}`;
    else {
      $('ta-xp').textContent = result.counted ? `+${result.xpGained} XP${result.levelUps?.length ? ` · Level ${result.level}` : ''}` : `No XP: ${window.LWXP?.reasonText?.(result.reason) || result.reason || 'daily game limit reached'}`;
      for (const id of result.newBadges || []) {
        const info = window.LWXP.badgeInfo?.(id), badge = document.createElement('span');
        badge.textContent = info?.name || id; $('ta-badges').append(badge);
      }
    }
  } catch (error) {
    console.warn('[time-attack] result submission failed:', error);
    $('ta-xp').textContent = 'The run completed, but its XP result could not be saved.';
  } finally { finishing = false; $('ta-start').disabled = false; }
}

function shutdown() {
  const wasRunning = running;
  bootGeneration++;
  running = false; clearInterval(tickId); tickId = null; clearTimers();
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  stopCamera(videoEl); ready = false; resetMotionBuffer(); resetTracking(); lastFrame = null; motionAllowedCache = null;
  if (wasRunning) phase = 'cancelled';
  $('ta-motion').disabled = true;
  $('ta-start').hidden = false; $('ta-start').disabled = false;
  $('ta-quit').disabled = true;
}

$('ta-start').addEventListener('click', start);
$('ta-again').addEventListener('click', start);
$('ta-motion').addEventListener('click', recordMotion);
$('ta-quit').addEventListener('click', () => { $('ta-quit-modal').hidden = false; $('ta-quit-cancel').focus(); });
$('ta-quit-cancel').addEventListener('click', () => { $('ta-quit-modal').hidden = true; $('ta-quit').focus(); });
$('ta-quit-confirm').addEventListener('click', () => {
  $('ta-quit-modal').hidden = true; shutdown(); finishing = false; xpSessionP = Promise.resolve(null); brokenLog = []; targets = []; targetIndex = 0; setMode('idle');
  $('ta-start').hidden = false; $('ta-start').disabled = false; setStatus('Run abandoned.');
});
$('ta-error-close').addEventListener('click', () => { $('ta-error').hidden = true; });
$('ta-error-retry').addEventListener('click', () => { $('ta-error').hidden = true; start(); });
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || !running || /^(BUTTON|A|INPUT|SELECT)$/.test(event.target?.tagName || '')) return;
  event.preventDefault(); recordMotion();
});
window.addEventListener('pagehide', shutdown);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const wasActive = running || $('ta-start').disabled || !!videoEl.srcObject;
    shutdown();
    toggle($('ta-loading'), false);
    if (wasActive) {
      finishing = false;
      toggle($('camera-status'), true);
      $('camera-status').textContent = 'Camera paused. Press Start to resume.';
      setMode('idle'); setStatus('Camera paused. Press Start to resume.');
    }
  }
});