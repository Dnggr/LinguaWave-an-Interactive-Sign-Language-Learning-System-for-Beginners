/*
  js/time-attack.js — Time Attack page controller (fingerspelling)
  PURPOSE  : Shows a word, demos the current letter/number sign, and checks the learner's live camera fingerspelling
             one letter at a time. Longer words are worth more XP (see CONFIG.FINGERSPELL in xp-engine.mjs).
  CONNECTS : Reuses cameraUtils, MediaPipe, renderer, the static classifier, dictionary, LWMissions media and LWXP game sessions.
*/
import { startCamera, stopCamera } from './camera/cameraUtils.js';
import * as E from './xp-engine.mjs';
// Game Leaderboards: loaded on demand, so a problem in that module can never stop this game from loading.
const reportScore = (game, difficulty, result) => import('./game-scores.js').then((m) => m.submitScore(game, difficulty, result)).catch((error) => console.warn('[game-scores] unavailable:', error));
import { initMediaPipe, processFrame, isModelReady, resetTracking } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas } from './engine/renderer.js';
import { getDetectionType, getSignData } from './engine/dictionary.js';
import { classifyGesture, resetMotionBuffer, loadModels, loadModelLabels,
  isClassifierReady, isSignClassifiable, getAllowedLabelsForSign } from './engine/classifier.js';

const $ = (id) => document.getElementById(id);
const videoEl = $('ta-video'), canvasEl = $('ta-canvas'), ctx = canvasEl.getContext('2d');
const HOLD_MS = 500;                       // a letter must be held steady this long (also the engine's MIN_MS_PER_LETTER basis)
const WORD_DEFS = E.CONFIG.FINGERSPELL.WORDS;
let ready = false, running = false, finishing = false, rafId = null, tickId = null, timers = new Set();
let bootPromise = null, bootGeneration = 0, trackingPromise = null, modelsPromise = null, labelsPromise = null;
let words = [], targets = [], targetIndex = 0, misses = 0, heldSince = 0, wrongSince = 0, wrongLabel = '', lastMissAt = 0;
let startedAt = 0, wordLog = [], xpSessionP = Promise.resolve(null);
const currentTarget = () => targets[targetIndex] || null;
// Per-run cache: processFrame() hands back the SAME object until a new detection runs (~20/s).
let lastFrame = null;
const formatTime = (ms) => `${(ms / 1000).toFixed(1)}s`;
const setStatus = (message) => { $('ta-status').textContent = message; };
const wordXp = (word) => E.fingerspellWordXp(word.symbols.length);
const kindOf = (symbol) => (/^[0-9]$/.test(symbol) ? 'NUMBER' : 'LETTER');

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

function signContentFor(signId) {
  const M = window.LWMissions, signs = M?.content?.SIGNS || [];
  // Some signs appear in several lessons; use an existing lesson media entry, preferring one with a demo.
  const entry = signs.find((sign) => sign.signId === signId && (sign.videoUrl || sign.imageUrl)) ||
    signs.find((sign) => sign.signId === signId) || null;
  return entry ? (M?.getSign?.(entry.level, signId, entry.category) || entry) : null;
}


function makeTarget(signId, wordIndex, pos) {
  const content = signContentFor(signId);
  const videos = content && window.LWMissions?.getSignVideoUrls
    ? window.LWMissions.getSignVideoUrls(signId, content.videoUrl)
    : [content?.videoUrl].filter(Boolean);
  return { signId, type: 'static', wordIndex, pos, content, videos: [...new Set(videos)], imageUrl: content?.imageUrl || '' };
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

// ── Word / letter display ──────────────────────────────────────────────────────
function renderWordList() {
  const list = $('ta-words');
  list.replaceChildren();
  words.forEach((word, index) => {
    const li = document.createElement('li');
    li.className = 'ta-wordchip'; li.dataset.index = String(index);
    const name = document.createElement('span'); name.className = 'ta-wordchip__name'; name.textContent = word.label;
    const xp = document.createElement('span'); xp.className = 'ta-wordchip__xp'; xp.textContent = `+${wordXp(word)} XP`;
    li.append(name, xp); list.append(li);
  });
}
function renderLetters(wordIndex, doneCount) {
  const host = $('ta-letters'), word = words[wordIndex];
  host.replaceChildren();
  if (!word) return;
  word.symbols.forEach((symbol, i) => {
    const tile = document.createElement('span');
    tile.className = 'ta-letter'; tile.textContent = symbol;
    tile.dataset.state = i < doneCount ? 'done' : i === doneCount ? 'current' : 'todo';
    host.append(tile);
  });
  host.setAttribute('aria-label', `Spell ${word.label}: ${word.symbols.join(' ')}`);
}
function refreshWordChips(activeIndex) {
  $('ta-words').querySelectorAll('.ta-wordchip').forEach((chip) => {
    const index = Number(chip.dataset.index);
    chip.dataset.state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'todo';
  });
}

function setTarget() {
  clearTimers();
  const target = currentTarget();
  $('ta-count').textContent = `${Math.min(targetIndex + 1, targets.length)}/${targets.length}`;
  $('ta-target').textContent = target?.signId || 'Complete';
  $('ta-sign-type').textContent = target ? kindOf(target.signId) : '';
  $('ta-sign-type').dataset.type = 'static';
  $('ta-sign-type').hidden = !target;
  $('ta-hint').textContent = target ? (target.content?.description || getSignData(target.signId)?.description || '') : '';
  document.querySelector('.ta-progress')?.style.setProperty('--p', targets.length ? targetIndex / targets.length : 0);
  heldSince = 0; wrongSince = 0; wrongLabel = ''; resetMotionBuffer();
  setMode(target ? 'static' : 'idle');
  if (target) {
    const word = words[target.wordIndex];
    $('ta-word-name').textContent = word.label;
    $('ta-word-meta').textContent = `Word ${target.wordIndex + 1}/${words.length} · ${word.symbols.length} signs · +${wordXp(word)} XP`;
    renderLetters(target.wordIndex, target.pos);
    refreshWordChips(target.wordIndex);
    renderTargetDemo(target);
  }
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
  const word = words[target.wordIndex];
  const wordDone = target.pos === word.symbols.length - 1;
  // One log entry per finished WORD: the XP engine checks that the word took at least 450 ms per letter.
  if (wordDone) wordLog.push({ w: target.wordIndex, t: Date.now() - startedAt });
  targetIndex++;
  if (targetIndex >= targets.length) { finish(); return; }
  setStatus(wordDone ? `${word.label} complete! +${wordXp(word)} XP. Next word.` : 'Correct! Next letter.');
  setTarget();
}

function detectStatic(left, right, face, pose, anyHandPresent, now, fresh = true) {
  const target = currentTarget();
  if (!target) return;
  if (!anyHandPresent) { heldSince = 0; wrongSince = 0; wrongLabel = ''; return; }
  if (!fresh) return;   // same landmarks as the last tick: nothing new to classify (the hold timer is wall-clock, so it keeps counting)
  target.allowedLabels ??= getAllowedLabelsForSign(target.signId);
  const result = classifyGesture(left, right, face, target.allowedLabels, pose, target.signId);
  if (result?.matched && result.label === target.signId) {
    if (!heldSince) heldSince = now;
    if (now - heldSince >= HOLD_MS) acceptTarget();
    return;
  }
  heldSince = 0;
  if (result?.matched && result.label && result.label !== target.signId) {
    if (wrongLabel !== result.label) { wrongLabel = result.label; wrongSince = now; }
    if (now - wrongSince >= 700) { recordMiss(result.label); wrongSince = now; }
  } else { wrongSince = 0; wrongLabel = ''; }
}

function loop() {
  rafId = requestAnimationFrame(loop);
  if (!videoEl || videoEl.readyState < 2) return;
  try {
    const frame = processFrame(videoEl);
    const { leftHandLandmarks:left, rightHandLandmarks:right, faceLandmarks:face, poseLandmarks:pose, anyHandPresent } = frame;
    const fresh = frame !== lastFrame; lastFrame = frame;
    const hands = [left, right].filter(Boolean);
    if (hands.length) drawSkeleton(ctx, hands, canvasEl.width, canvasEl.height);
    else clearCanvas(ctx, canvasEl.width, canvasEl.height);
    if (!running) return;
    detectStatic(left, right, face, pose, anyHandPresent, Date.now(), fresh);
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
  $('ta-start').disabled = true; toggle($('ta-loading'), true); setStatus('Getting your words ready…');
  if (!await boot()) { toggle($('ta-loading'), false); $('ta-start').disabled = false; return; }
  toggle($('ta-loading'), false);
  try {
    const startGeneration = bootGeneration;
    if (startGeneration !== bootGeneration || document.hidden) return;
    // Every letter/number must be recognisable by the static classifier; a word that is not is left out of the run.
    words = WORD_DEFS.filter((word) => isClassifierReady() &&
      word.symbols.every((symbol) => isSignClassifiable(symbol) && getDetectionType(symbol) !== 'motion'));
    if (!words.length) { setStatus('Fingerspelling recognition is not available right now. Reload and try again.'); $('ta-start').disabled = false; return; }
    targets = words.flatMap((word, wordIndex) => word.symbols.map((symbol, pos) => makeTarget(symbol, wordIndex, pos)));
    targetIndex = 0; misses = 0; wordLog = []; lastFrame = null; $('ta-misses').textContent = '0'; $('ta-time').textContent = '0.0s';
    $('ta-result').hidden = true; $('ta-start').hidden = true; $('ta-quit').disabled = false;
    renderWordList();
    running = true; startedAt = Date.now(); lastMissAt = 0;
    const uniqueSigns = [...new Set(words.flatMap((word) => word.symbols))];
    xpSessionP = Promise.resolve(window.LWXP?.startGame(uniqueSigns, 'fingerspell', { words: words.map((word) => word.id) }) || null)
      .then((session) => {
        // Tell the learner up front which words will not pay XP yet (a letter in them has not been learned).
        if (session?.ok && Array.isArray(session.payableWords) && session.payableWords.length < words.length) {
          const unpaid = words.filter((word) => !session.payableWords.includes(word.id)).map((word) => word.label);
          setStatus(`Spell each word. No XP for ${unpaid.join(', ')} until you learn all of its letters.`);
        }
        return session;
      })
      .catch((error) => { console.warn('[time-attack] XP session could not start:', error); return null; });
    clearInterval(tickId); tickId = setInterval(() => { $('ta-time').textContent = formatTime(Date.now() - startedAt); }, 100);
    setStatus('Follow the demo and fingerspell the highlighted letter.'); setTarget();
    if (!rafId) loop();
  } catch (error) {
    console.error('[time-attack] could not prepare run:', error);
    $('ta-start').disabled = false;
    $('ta-error-message').textContent = error?.message || 'Time Attack could not get your words ready. Try again.';
    $('ta-error').hidden = false;
  } finally {
    toggle($('ta-loading'), false);
  }
}

function showBreakdown(result) {
  const host = $('ta-breakdown');
  host.replaceChildren();
  for (const word of result?.words || []) {
    const li = document.createElement('li');
    li.textContent = word.eligible ? `${word.label}: +${word.xp} XP` : `${word.label}: no XP yet (learn all of its letters first)`;
    host.append(li);
  }
  host.hidden = !host.children.length;
}

async function finish() {
  if (finishing || !running) return;
  finishing = true; running = false; clearInterval(tickId); tickId = null; clearTimers();
  if (rafId) cancelAnimationFrame(rafId); rafId = null;
  clearCanvas(ctx, canvasEl.width, canvasEl.height);
  const elapsed = Date.now() - startedAt;
  $('ta-time').textContent = formatTime(elapsed); document.querySelector('.ta-progress')?.style.setProperty('--p', 1);
  $('ta-start').hidden = false; $('ta-start').disabled = true; $('ta-quit').disabled = true; setStatus('All words spelled.');
  refreshWordChips(words.length);
  $('ta-summary').textContent = `Completion time: ${formatTime(elapsed)} · Letters: ${targets.length} · Misses: ${misses} · Accuracy: ${Math.round(targets.length / (targets.length + misses) * 100)}%`;
  $('ta-result').hidden = false; $('ta-xp').textContent = 'Counting XP…'; $('ta-badges').replaceChildren(); showBreakdown(null);
  // Leaderboard: only a run with EVERY word is ranked, so all times are comparable. finish() runs only after the last
  // letter, never on Quit.
  if (words.length === WORD_DEFS.length) void reportScore('timeAttack', 'fingerspell', { timeMs: elapsed, misses });
  try {
    const session = await withTimeout(xpSessionP, 12000, 'Starting the XP session');
    const result = session?.sessionId && window.LWXP ? await withTimeout(window.LWXP.finishGame(session.sessionId, wordLog, misses), 15000, 'Saving the result') : null;
    if (!result?.ok) $('ta-xp').textContent = `XP not counted: ${session?.sessionId ? (window.LWXP?.reasonText?.(result?.reason) || 'unknown reason') : 'no XP session (sign in with a verified account first)'}`;
    else {
      showBreakdown(result);
      if (result.reason === 'not_enough_learned') $('ta-xp').textContent = 'No XP: learn the letters and numbers in these words first (Letters and Numbers lessons).';
      else $('ta-xp').textContent = result.counted ? `+${result.xpGained} XP${result.levelUps?.length ? ` · Level ${result.level}` : ''}` : `No XP: ${window.LWXP?.reasonText?.(result.reason) || result.reason || 'daily game limit reached'}`;
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
  stopCamera(videoEl); ready = false; resetMotionBuffer(); resetTracking(); lastFrame = null;
  $('ta-start').hidden = false; $('ta-start').disabled = false;
  $('ta-quit').disabled = true;
  return wasRunning;
}

$('ta-start').addEventListener('click', start);
$('ta-again').addEventListener('click', start);
$('ta-quit').addEventListener('click', () => { $('ta-quit-modal').hidden = false; $('ta-quit-cancel').focus(); });
$('ta-quit-cancel').addEventListener('click', () => { $('ta-quit-modal').hidden = true; $('ta-quit').focus(); });
$('ta-quit-confirm').addEventListener('click', () => {
  $('ta-quit-modal').hidden = true; shutdown(); finishing = false; xpSessionP = Promise.resolve(null); wordLog = []; targets = []; words = []; targetIndex = 0; setMode('idle');
  $('ta-words').replaceChildren(); $('ta-letters').replaceChildren();
  $('ta-start').hidden = false; $('ta-start').disabled = false; setStatus('Run abandoned.');
});
$('ta-error-close').addEventListener('click', () => { $('ta-error').hidden = true; });
$('ta-error-retry').addEventListener('click', () => { $('ta-error').hidden = true; start(); });
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
