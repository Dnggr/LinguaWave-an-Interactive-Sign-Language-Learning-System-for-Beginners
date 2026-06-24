/**
 * js/lesson.js — Lesson Page Orchestrator (Motion Detection Edition)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Wires the camera, MediaPipe tracking, TF.js classifier,
 *            skeleton renderer, and feedback UI together for the
 *            lesson-and-assessment experience on lesson.html.
 *
 * CONNECTS : pages/lesson.html (loaded as <script type="module">)
 *            js/camera/cameraUtils.js
 *            js/tracking/mediapipe.js
 *            js/engine/classifier.js
 *            js/engine/renderer.js
 *            js/engine/dictionary.js
 *
 * URL PARAMS:
 *   ?level=basic&sign=A   — loads the lesson for letter A
 *
 * TWO MODES:
 *   PRACTICE  — camera live, detections shown, no scoring.
 *               User clicks "Start Assessment" to switch.
 *   ASSESSMENT — system prompts a sign, scores correct/wrong,
 *               passes at ≥80%, saves progress to localStorage.
 *
 * DESIGN DECISIONS (matches migration doc):
 *   - Confidence threshold: 75% static / 70% motion
 *   - Debounce: sign must be detected consistently for ~1.5s
 *   - Timeout per assessment prompt: 10 seconds
 *   - Per-prompt retry: 1 attempt per prompt, review at end
 *   - Camera released on page unload / tab hide
 * ─────────────────────────────────────────────────────────────────
 */

import { startCamera, stopCamera }            from './camera/cameraUtils.js';
import { initMediaPipe, processFrame }         from './tracking/mediapipe.js';
import { loadModels, classifyGesture, classifyMotion, resetMotionBuffer, isClassifierReady } from './engine/classifier.js';
import { drawSkeleton, clearCanvas }           from './engine/renderer.js';
import { getDetectionType }                    from './engine/dictionary.js';

// ── DOM refs ───────────────────────────────────────────────────────
const videoEl      = document.getElementById('lw-webcam');
const canvasEl     = document.getElementById('lw-canvas');
const ctx          = canvasEl?.getContext('2d');
const statusEl     = document.getElementById('camera-status');
const detectedEl   = document.getElementById('detected-sign');
const confidenceEl = document.getElementById('confidence-bar-fill');
const confTextEl   = document.getElementById('confidence-text');
const modeBarEl    = document.getElementById('mode-bar');
const promptEl     = document.getElementById('assessment-prompt');
const feedbackEl   = document.getElementById('assessment-feedback');
const scoreEl      = document.getElementById('score-display');
const startBtnEl   = document.getElementById('btn-start-assessment');
const overlayEl    = document.getElementById('completion-overlay');
const finalScoreEl = document.getElementById('final-score');
const motionBufEl  = document.getElementById('motion-buffer-bar');
const motionBufWrapEl = document.getElementById('motion-buffer-wrap');
const handStatusEl = document.getElementById('hand-status-pill');

// Content panel refs (populated per-letter from data.js)
const lessonImageEl       = document.getElementById('lesson-image');
const lessonImgHintEl     = document.getElementById('lesson-img-placeholder-hint');
const lessonDescriptionEl = document.getElementById('lesson-description');
const lessonTipsEl        = document.getElementById('lesson-tips');
const lessonVideoEl       = document.getElementById('lesson-video');
const lessonSubtitleEl    = document.getElementById('lesson-subtitle');

// ── URL params ─────────────────────────────────────────────────────
const params     = new URLSearchParams(window.location.search);
const level      = params.get('level') || 'basic';
const sign       = (params.get('sign') || 'A').toUpperCase();

// ── Lesson sign order per level ────────────────────────────────────
const SIGN_ORDER = {
  basic:        'ABCDEFGHIKLMNOPQRSTUVWXY'.split(''),  // J/Z are motion; included at end
  medium:       ['HELLO','THANK YOU'],
  intermediate: [],
};
// Add J and Z at end of basic (motion signs)
if (!SIGN_ORDER.basic.includes('J'))  SIGN_ORDER.basic.push('J');
if (!SIGN_ORDER.basic.includes('Z'))  SIGN_ORDER.basic.push('Z');

const signOrder  = SIGN_ORDER[level] || SIGN_ORDER.basic;
const signIdx    = Math.max(signOrder.indexOf(sign), 0);   // unknown sign falls back to index 0 instead of -1
const totalSigns = signOrder.length;

// ── Assessment state ───────────────────────────────────────────────
const PASS_THRESHOLD  = 0.80;    // 80%
const PROMPT_TIMEOUT  = 10000;   // 10 seconds per prompt

let mode           = 'practice'; // 'practice' | 'assessment'
let quizSigns      = [];         // signs to test in this assessment
let quizIdx        = 0;
let score          = 0;
let promptTimer    = null;
let rafId          = null;

// Debounce: sign must be detected for ~1.5s (at ~30fps ≈ 45 matching frames)
const DEBOUNCE_FRAMES = 45;
let debounceCount  = 0;
let lastDetected   = null;
let cooldown       = false;

// ── Page boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  updateLessonMeta();
  setupNavButtons();
  await bootDetectionEngine();
});

// ── Update lesson meta (header, counter, progress bar) ────────────

function updateLessonMeta() {
  const counter = document.getElementById('lesson-counter');
  const fill    = document.getElementById('lesson-progress-fill');
  const letter  = document.getElementById('lesson-letter');
  const title   = document.getElementById('lesson-title');

  if (counter) counter.textContent = `Sign ${signIdx + 1} of ${totalSigns}`;
  if (fill)    fill.dataset.progress = Math.round(((signIdx + 1) / totalSigns) * 100);
  if (letter)  letter.textContent   = sign;
  if (title)   title.textContent    = sign.length === 1 ? `Letter ${sign}` : sign;
  if (lessonSubtitleEl) lessonSubtitleEl.textContent = `ASL Alphabet · ${level[0].toUpperCase()}${level.slice(1)} Level`;

  // Motion signs (J, Z, HELLO, THANK YOU) show the "collecting frames"
  // buffer bar; static letters don't need it since classification is
  // instant per-frame.
  if (motionBufWrapEl) {
    motionBufWrapEl.style.display = getDetectionType(sign) === 'motion' ? '' : 'none';
  }

  // Pull per-letter content (description, tips, image, video) from data.js.
  // Falls back gracefully if a sign's content hasn't been written yet.
  const signData = window.LWData?.getSign?.(level, sign) ?? null;

  if (signData) {
    if (lessonDescriptionEl) lessonDescriptionEl.textContent = signData.description;

    if (lessonTipsEl && Array.isArray(signData.tips)) {
      lessonTipsEl.innerHTML = signData.tips.map(t => `<li>✦ ${escapeHtml(t)}</li>`).join('');
    }

    if (lessonImageEl) {
      lessonImageEl.src = signData.imageUrl;
      lessonImageEl.style.display = '';
      const placeholder = document.getElementById('lesson-img-placeholder');
      if (placeholder) placeholder.style.display = 'none';
    }
    if (lessonImgHintEl) lessonImgHintEl.textContent = `Add image to assets/images/basic/${sign}.png`;

    if (lessonVideoEl) {
      const source = lessonVideoEl.querySelector('source');
      if (source) source.src = signData.videoUrl;
      lessonVideoEl.load();
    }
  } else {
    // No content authored yet for this sign — keep the camera/detection
    // fully working, just show a neutral placeholder instead of stale text.
    if (lessonDescriptionEl) lessonDescriptionEl.textContent =
      `Lesson content for "${sign}" hasn't been written yet. The camera detection still works — try practicing the sign below.`;
    if (lessonTipsEl) lessonTipsEl.innerHTML = '';
    if (lessonImageEl) lessonImageEl.style.display = 'none';
    const placeholder = document.getElementById('lesson-img-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    if (lessonImgHintEl) lessonImgHintEl.textContent = `Add image to assets/images/basic/${sign}.png`;
  }

  // Wire "Start Assessment" button
  if (startBtnEl) startBtnEl.addEventListener('click', startAssessment);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Prev / Next navigation ─────────────────────────────────────────

function setupNavButtons() {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (btnPrev) {
    if (signIdx <= 0) {
      btnPrev.setAttribute('disabled', '');
    } else {
      btnPrev.onclick = () => {
        shutdown();
        window.location = `lesson.html?level=${level}&sign=${signOrder[signIdx - 1]}`;
      };
    }
  }

  if (btnNext) {
    const isLast = signIdx >= totalSigns - 1;
    if (isLast) {
      btnNext.textContent = 'Go to Assessment →';
      btnNext.onclick = () => {
        shutdown();
        startAssessment();
      };
    } else {
      btnNext.textContent = 'Next Sign →';
      btnNext.onclick = () => {
        shutdown();
        window.location = `lesson.html?level=${level}&sign=${signOrder[signIdx + 1]}`;
      };
    }
  }
}

// ── Boot camera + models ───────────────────────────────────────────

async function bootDetectionEngine() {
  setStatus('Loading hand-tracking model…', 'loading');

  try {
    await initMediaPipe();
    setStatus('Starting camera…', 'loading');
    await startCamera(videoEl, canvasEl);
    setStatus('Loading sign classifier…', 'loading');
    await loadModels();
    setStatus('', 'ready');   // hide status — camera is live
    startRenderLoop();
  } catch (err) {
    console.error('[lesson.js] Boot failed:', err);
    setStatus(`Failed to start: ${err.message}`, 'error');
  }
}

// ── Main detection render loop ─────────────────────────────────────

function startRenderLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);

    if (!videoEl || videoEl.readyState < 2) return;

    const { landmarks, dominantLandmarks } = processFrame(videoEl);

    // Draw skeleton
    if (landmarks.length > 0) {
      drawSkeleton(ctx, landmarks, canvasEl.width, canvasEl.height);
      setHandStatus(landmarks.length);
    } else {
      clearCanvas(ctx, canvasEl.width, canvasEl.height);
      setHandStatus(0);
      debounceCount = 0;
      lastDetected  = null;
    }

    if (!dominantLandmarks) return;

    // Classify — pick model based on sign type
    const detType = getDetectionType(sign);
    let result;

    if (detType === 'motion') {
      result = classifyMotion(dominantLandmarks);
      // BUG FIX: previously passed (motionBuffer_progress ?? 0) or the
      // literal number 1 into a function that treats its argument as a
      // boolean. Since 1 is truthy, the bar looked like it was still
      // "buffering" even right after a motion sign was classified, and
      // never visibly reset. Pass the real boolean instead.
      updateMotionBuffer(result.buffering);
    } else {
      result = classifyGesture(dominantLandmarks);
    }

    // Update live confidence display
    updateConfidenceUI(result);

    // Mode-specific handling
    if (mode === 'practice') {
      handlePracticeFrame(result);
    } else if (mode === 'assessment') {
      handleAssessmentFrame(result);
    }
  }
  loop();
}

// Track motion buffer fill progress (0–1)
let motionBuffer_progress = 0;

function updateMotionBuffer(buffering) {
  if (!motionBufEl) return;
  if (buffering) {
    motionBuffer_progress = Math.min(motionBuffer_progress + (1 / 30), 1);
    motionBufEl.style.width = `${motionBuffer_progress * 100}%`;
  } else {
    motionBuffer_progress = 0;
    motionBufEl.style.width = '0%';
  }
}

// ── Practice mode ──────────────────────────────────────────────────

function handlePracticeFrame(result) {
  if (result.matched && !cooldown) {
    debounceCount++;

    if (debounceCount >= DEBOUNCE_FRAMES && lastDetected === result.label) {
      // Sign held steady for ~1.5s — flash success
      showFeedback(`✅ Nice! Detected: ${result.label}`, 'success');
      enterCooldown(1200);
      debounceCount = 0;
    }
    lastDetected = result.label;
  } else if (!result.matched) {
    debounceCount = 0;
    lastDetected  = null;
  }
}

// ── Assessment mode ────────────────────────────────────────────────

function startAssessment() {
  // Build quiz from the current sign (and neighbours if it's a lesson group)
  // For now: quiz only the current sign (single-sign lesson).
  // To quiz multiple signs, change quizSigns to signOrder slice.
  quizSigns = [sign];
  quizIdx   = 0;
  score     = 0;
  mode      = 'assessment';
  debounceCount = 0;
  lastDetected  = null;

  if (startBtnEl) startBtnEl.style.display = 'none';
  if (modeBarEl)  {
    modeBarEl.textContent  = '🎯 Assessment Mode';
    modeBarEl.className    = 'mode-bar mode-bar--assessment';
  }

  showNextPrompt();
}

function showNextPrompt() {
  if (quizIdx >= quizSigns.length) {
    endAssessment();
    return;
  }

  const currentSign = quizSigns[quizIdx];
  debounceCount     = 0;
  lastDetected      = null;
  cooldown          = false;
  resetMotionBuffer();

  if (promptEl) promptEl.textContent = `Sign: "${currentSign}"`;
  if (scoreEl)  scoreEl.textContent  = `${score} / ${quizSigns.length}`;
  showFeedback('', '');

  // Timeout: if no correct sign within 10 seconds, move on
  clearTimeout(promptTimer);
  promptTimer = setTimeout(() => {
    showFeedback('⏱ Time up — moving on', 'error');
    setTimeout(() => {
      quizIdx++;
      showNextPrompt();
    }, 1200);
  }, PROMPT_TIMEOUT);
}

function handleAssessmentFrame(result) {
  if (cooldown || quizIdx >= quizSigns.length) return;

  const currentSign = quizSigns[quizIdx];
  if (!result.matched || !result.label) return;

  debounceCount++;
  if (debounceCount < DEBOUNCE_FRAMES) return;   // require ~1.5s hold

  // Sign held long enough — check if it matches
  debounceCount = 0;
  enterCooldown(1500);
  clearTimeout(promptTimer);

  if (result.label === currentSign) {
    score++;
    showFeedback(`✅ Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `${score} / ${quizSigns.length}`;
  } else {
    showFeedback(`❌ Detected ${result.label} — expected ${currentSign}`, 'error');
  }

  setTimeout(() => {
    quizIdx++;
    showNextPrompt();
  }, 1500);
}

function endAssessment() {
  mode = 'practice';
  clearTimeout(promptTimer);

  const pct   = quizSigns.length > 0 ? score / quizSigns.length : 0;
  const passed = pct >= PASS_THRESHOLD;

  if (promptEl)  promptEl.textContent = '';
  if (feedbackEl) feedbackEl.textContent = '';
  if (modeBarEl) {
    modeBarEl.textContent = '📖 Practice Mode';
    modeBarEl.className   = 'mode-bar mode-bar--practice';
  }

  // Show completion overlay
  if (overlayEl && finalScoreEl) {
    finalScoreEl.textContent = `${Math.round(pct * 100)}%`;
    document.getElementById('overlay-result-title').textContent =
      passed ? '🎉 Lesson Passed!' : 'Not quite — keep practicing!';
    document.getElementById('overlay-result-msg').textContent =
      passed
        ? 'Great work! Your progress has been saved. The next lesson is now unlocked.'
        : `You scored ${Math.round(pct * 100)}%. You need 80% to pass. Review the sign and try again.`;

    const continueBtn = document.getElementById('btn-overlay-continue');
    const retryBtn    = document.getElementById('btn-overlay-retry');
    if (continueBtn) continueBtn.style.display = passed ? '' : 'none';
    if (retryBtn)    retryBtn.style.display    = passed ? 'none' : '';

    overlayEl.style.display = 'flex';

    if (passed) {
      saveProgress(sign, pct);
    }
  }

  if (startBtnEl) {
    startBtnEl.style.display = '';
    startBtnEl.textContent   = 'Retry Assessment';
  }
}

// ── Progress persistence (localStorage → TODO: Firestore) ─────────

function saveProgress(signId, pct) {
  try {
    const key    = 'lw_progress';
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    if (!stored[level]) stored[level] = {};
    const prev = stored[level][signId]?.score ?? 0;
    stored[level][signId] = { score: Math.max(prev, pct), completedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(stored));
    console.log(`[lesson.js] Progress saved: ${level}/${signId} = ${Math.round(pct * 100)}%`);
  } catch (e) {
    console.warn('[lesson.js] Could not save progress:', e);
  }
}

// ── UI helpers ─────────────────────────────────────────────────────

function updateConfidenceUI(result) {
  if (!detectedEl || !confidenceEl || !confTextEl) return;

  if (result.label) {
    detectedEl.textContent        = result.label;
    detectedEl.style.color        = result.matched ? 'var(--clr-accent)' : 'var(--clr-text-muted)';
    confidenceEl.style.width      = `${result.confidence}%`;
    confidenceEl.style.background = result.matched ? 'var(--clr-accent)' : 'var(--clr-yellow)';
    confTextEl.textContent        = `${result.confidence}%`;
  } else {
    detectedEl.textContent    = '–';
    detectedEl.style.color    = 'var(--clr-text-muted)';
    confidenceEl.style.width  = '0%';
    confTextEl.textContent    = '0%';
  }
}

function showFeedback(message, type) {
  if (!feedbackEl) return;
  feedbackEl.textContent  = message;
  feedbackEl.className    = `assessment-feedback assessment-feedback--${type}`;
  feedbackEl.style.display = message ? '' : 'none';
}

function setStatus(message, type) {
  if (!statusEl) return;
  if (!message) { statusEl.style.display = 'none'; return; }
  statusEl.style.display   = 'flex';
  statusEl.textContent     = message;
  statusEl.className       = `camera-status camera-status--${type}`;
}

function setHandStatus(count) {
  if (!handStatusEl) return;
  if (count === 0) {
    handStatusEl.textContent  = 'No hand detected';
    handStatusEl.className    = 'hand-status-pill hand-status-pill--none';
  } else {
    handStatusEl.textContent  = count === 1 ? '✋ Hand detected' : '🤲 Both hands';
    handStatusEl.className    = 'hand-status-pill hand-status-pill--ok';
  }
}

function enterCooldown(ms) {
  cooldown = true;
  setTimeout(() => { cooldown = false; }, ms);
}

// ── Cleanup on page leave ──────────────────────────────────────────

function shutdown() {
  if (rafId) cancelAnimationFrame(rafId);
  stopCamera(videoEl);
  clearTimeout(promptTimer);
}

window.addEventListener('beforeunload', shutdown);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera(videoEl);
});

// ── Overlay button wiring (called from HTML onclick) ───────────────

window.closeOverlay = function() {
  if (overlayEl) overlayEl.style.display = 'none';
};

window.retryLesson = function() {
  closeOverlay();
  // Reset assessment
  if (startBtnEl) {
    startBtnEl.textContent = 'Start Assessment';
    startBtnEl.style.display = '';
  }
  if (modeBarEl) {
    modeBarEl.textContent = '📖 Practice Mode';
    modeBarEl.className   = 'mode-bar mode-bar--practice';
  }
  mode = 'practice';
};

window.continueToNext = function() {
  shutdown();
  const nextIdx = signIdx + 1;
  if (nextIdx < totalSigns) {
    window.location = `lesson.html?level=${level}&sign=${signOrder[nextIdx]}`;
  } else {
    window.location = `dashboard.html`;
  }
};