/*
  js/lesson.js — Sign Lesson Orchestrator
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Wires together camera, MediaPipe, classifier, and renderer
             for the lesson page. Manages practice / assessment modes.
  CONNECTS : pages/lesson.html  (type="module" script)
             js/camera/cameraUtils.js
             js/tracking/mediapipe.js
             js/engine/classifier.js
             js/engine/renderer.js
             js/engine/dictionary.js
  ─────────────────────────────────────────────────────────────────

  ══════════════════════════════════════════════════════════════════
  BUG LOG — what was broken and what was fixed (so we stop going in circles)
  ══════════════════════════════════════════════════════════════════

  BUG 1 — Camera feed hidden by status overlay when classifier fails
  ─────────────────────────────────────────────────────────────────
  WHERE:   bootDetectionEngine() — the classifier-failure catch block
  SYMPTOM: Camera starts, skeleton runs, but you only see "⚠️ Camera is
           live…" text — the actual camera video never appears.
  CAUSE:   setStatus() sets display:none only when message === ''. When
           the classifier fails we pass a non-empty error string, so the
           status overlay stays display:flex and sits on top of the <video>
           + <canvas>, covering them permanently. The camera IS running —
           you just can't see it.
  FIX:     On classifier failure, hide the full-screen status overlay
           (display:none) so the camera feed shows through, then display
           the error as a smaller non-blocking warning badge below the
           camera panel (id="classifier-warn") instead of as a full overlay.
           See setClassifierWarn() below.

  BUG 2 — setStatus keeps overlay visible even after camera is fully ready
  ─────────────────────────────────────────────────────────────────
  WHERE:   bootDetectionEngine() — the success path
  SYMPTOM: On a slow machine the "Loading sign classifier…" message
           flickers because setStatus is called three times in sequence
           (loading → starting camera → loading classifier → ready).
           On classifier failure the last setStatus never hides.
  FIX:     Already partly fixed by BUG 1. Additionally, the overlay is
           now hidden (display:none) immediately after camera starts,
           regardless of classifier outcome. Classifier state is shown
           in the separate non-blocking badge.

  BUG 3 — DOMContentLoaded timing race (pre-existing fix, preserved)
  ─────────────────────────────────────────────────────────────────
  WHERE:   Module-level boot logic at the bottom of this file
  SYMPTOM: lesson.js is type="module" (deferred). On fast/cached loads
           DOMContentLoaded fires before the module finishes loading, so
           the listener is registered too late and boot() never runs.
           Camera stays on "Starting camera…" forever with no console output.
  FIX:     Check document.readyState — if already 'interactive' or
           'complete', call boot() immediately instead of adding the listener.
           (This fix was in place before; preserved here.)

  BUG 4 — Score display element never shown during assessment
  ─────────────────────────────────────────────────────────────────
  WHERE:   startAssessment() — score-display div wiring
  SYMPTOM: The score badge (id="score-display") stays hidden throughout
           assessment because startAssessment() never sets display to ''.
  FIX:     Show score-display and assessment-prompt-box in startAssessment(),
           hide them again in endAssessment() / retryLesson().

  BUG 5 — btn-start-assessment wired via addEventListener AND onclick
  ─────────────────────────────────────────────────────────────────
  WHERE:   updateLessonMeta() adds addEventListener('click', startAssessment)
           every time it runs. If updateLessonMeta is ever called twice
           (e.g. on a hot reload), startAssessment fires twice per click.
  FIX:     Use startBtnEl.onclick = startAssessment (idempotent assignment)
           instead of addEventListener.

  ══════════════════════════════════════════════════════════════════
*/

import { startCamera, stopCamera }             from '../js/camera/cameraUtils.js';
import { initMediaPipe, processFrame }         from '../js/tracking/mediapipe.js';
import { loadModels, classifyGesture,
         classifyMotion, resetMotionBuffer }   from '../js/engine/classifier.js';
import { drawSkeleton, clearCanvas }           from '../js/engine/renderer.js';
import { getDetectionType }                    from '../js/engine/dictionary.js';

// ── DOM references ─────────────────────────────────────────────────

const videoEl         = document.getElementById('lw-webcam');
const canvasEl        = document.getElementById('lw-canvas');
const ctx             = canvasEl?.getContext('2d');
const statusEl        = document.getElementById('camera-status');
const handStatusEl    = document.getElementById('hand-status-pill');
const detectedEl      = document.getElementById('detected-sign');
const confidenceEl    = document.getElementById('confidence-bar-fill');
const confTextEl      = document.getElementById('confidence-text');
const modeBarEl       = document.getElementById('mode-bar');
const startBtnEl      = document.getElementById('btn-start-assessment');
const promptEl        = document.getElementById('assessment-prompt');
const promptBoxEl     = document.getElementById('assessment-prompt-box');
const feedbackEl      = document.getElementById('assessment-feedback');
const scoreEl         = document.getElementById('score-display');
const overlayEl       = document.getElementById('completion-overlay');
const finalScoreEl    = document.getElementById('final-score');
const motionBufEl     = document.getElementById('motion-buffer-bar');
const motionBufWrapEl = document.getElementById('motion-buffer-wrap');

// BUG 1 FIX: separate non-blocking classifier warning element.
// This is injected into the DOM below the camera panel so it doesn't
// cover the camera feed. See setClassifierWarn() and lesson.html comment.
let classifierWarnEl  = null;

// Lesson content refs
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
  basic:        'ABCDEFGHIKLMNOPQRSTUVWXY'.split(''),
  medium:       ['HELLO','THANK YOU'],
  intermediate: [],
};
if (!SIGN_ORDER.basic.includes('J'))  SIGN_ORDER.basic.push('J');
if (!SIGN_ORDER.basic.includes('Z'))  SIGN_ORDER.basic.push('Z');

const signOrder  = SIGN_ORDER[level] || SIGN_ORDER.basic;
const signIdx    = Math.max(signOrder.indexOf(sign), 0);
const totalSigns = signOrder.length;

// ── Assessment state ───────────────────────────────────────────────
const PASS_THRESHOLD  = 0.80;
const PROMPT_TIMEOUT  = 10000;

let mode           = 'practice';
let quizSigns      = [];
let quizIdx        = 0;
let score          = 0;
let promptTimer    = null;
let rafId          = null;

const DEBOUNCE_FRAMES = 45;
let debounceCount  = 0;
let lastDetected   = null;
let cooldown       = false;

// ── Page boot ──────────────────────────────────────────────────────
// BUG 3 FIX (preserved): check readyState so we don't miss DOMContentLoaded
// when lesson.js (type="module") loads after the event already fired.

async function boot() {
  updateLessonMeta();
  setupNavButtons();
  await bootDetectionEngine();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

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

  if (motionBufWrapEl) {
    motionBufWrapEl.style.display = getDetectionType(sign) === 'motion' ? '' : 'none';
  }

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
    if (lessonDescriptionEl) lessonDescriptionEl.textContent =
      `Lesson content for "${sign}" hasn't been written yet. The camera detection still works — try practicing the sign below.`;
    if (lessonTipsEl) lessonTipsEl.innerHTML = '';
    if (lessonImageEl) lessonImageEl.style.display = 'none';
    const placeholder = document.getElementById('lesson-img-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    if (lessonImgHintEl) lessonImgHintEl.textContent = `Add image to assets/images/basic/${sign}.png`;
  }

  // BUG 5 FIX: use .onclick assignment (idempotent) instead of
  // addEventListener, which stacks duplicate listeners if called twice.
  if (startBtnEl) startBtnEl.onclick = startAssessment;
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
  } catch (err) {
    // Camera or hand-tracking failed — real blocking error.
    console.error('[lesson.js] Boot failed:', err);
    setStatus(`Failed to start: ${err.message}`, 'error');
    return;
  }

  // BUG 1 + 2 FIX: camera is now live — hide the full-screen status
  // overlay immediately so the video is visible. Classifier errors are
  // shown in a small non-blocking badge (setClassifierWarn) instead of
  // as a full overlay that covers the camera feed.
  setStatus('', 'ready');   // hides the overlay — camera feed now visible

  try {
    await loadModels();
    // Models loaded fine — no warning needed.
  } catch (err) {
    console.error('[lesson.js] Classifier failed to load — camera still running:', err);
    // Show a small non-blocking warning under the camera panel.
    // Do NOT call setStatus() here — that would re-show the overlay
    // and hide the camera feed again (that was the original bug).
    setClassifierWarn('⚠️ Sign classifier failed to load — camera is live but detection is disabled. Check the console for details (likely a Keras 3 / TF.js model export issue).');
  }

  startRenderLoop();
}

// ── Main detection render loop ─────────────────────────────────────

function startRenderLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);

    if (!videoEl || videoEl.readyState < 2) return;

    const { landmarks, dominantLandmarks } = processFrame(videoEl);

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

    const detType = getDetectionType(sign);
    let result;

    if (detType === 'motion') {
      result = classifyMotion(dominantLandmarks);
      updateMotionBuffer(result.buffering);
    } else {
      result = classifyGesture(dominantLandmarks);
    }

    updateConfidenceUI(result);

    if (mode === 'practice') {
      handlePracticeFrame(result);
    } else if (mode === 'assessment') {
      handleAssessmentFrame(result);
    }
  }
  loop();
}

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
  quizSigns = [sign];
  quizIdx   = 0;
  score     = 0;
  mode      = 'assessment';
  debounceCount = 0;
  lastDetected  = null;

  if (startBtnEl) startBtnEl.style.display = 'none';

  // BUG 4 FIX: show the prompt box and score display that were permanently
  // hidden (style="display:none" in HTML) and never toggled on.
  if (promptBoxEl) promptBoxEl.style.display = '';
  if (scoreEl)     scoreEl.style.display     = '';

  if (modeBarEl) {
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
  if (scoreEl)  scoreEl.textContent  = `Score: ${score} / ${quizSigns.length}`;
  showFeedback('', '');

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
  if (debounceCount < DEBOUNCE_FRAMES) return;

  debounceCount = 0;
  enterCooldown(1500);
  clearTimeout(promptTimer);

  if (result.label === currentSign) {
    score++;
    showFeedback(`✅ Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
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

  // BUG 4 FIX: hide prompt box and score display when assessment ends
  if (promptBoxEl) promptBoxEl.style.display = 'none';
  if (scoreEl)     scoreEl.style.display     = 'none';

  if (modeBarEl) {
    modeBarEl.textContent = '📖 Practice Mode';
    modeBarEl.className   = 'mode-bar mode-bar--practice';
  }

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

// BUG 1+2 FIX: setStatus controls only the full-screen camera-status
// overlay. It is called to show loading/error states BEFORE the camera
// is live. Once the camera is running, call setStatus('', 'ready') to
// hide this overlay and reveal the video. After that point, DO NOT call
// setStatus with a non-empty message — use setClassifierWarn() instead
// for non-blocking notifications that appear below the camera panel.
function setStatus(message, type) {
  if (!statusEl) return;
  if (!message) { statusEl.style.display = 'none'; return; }
  statusEl.style.display   = 'flex';
  statusEl.textContent     = message;
  statusEl.className       = `camera-status camera-status--${type}`;
}

// BUG 1 FIX: non-blocking classifier warning that does NOT cover the camera.
// Injected once into the DOM below the detection panel. Calling it again
// updates the message in place.
// lesson.html needs to have a <div id="classifier-warn"></div> after
// the detection-panel — see lesson.html for the matching change.
function setClassifierWarn(message) {
  if (!classifierWarnEl) {
    classifierWarnEl = document.getElementById('classifier-warn');
  }
  if (!classifierWarnEl) return;
  classifierWarnEl.textContent = message;
  classifierWarnEl.style.display = message ? '' : 'none';
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
  if (startBtnEl) {
    startBtnEl.textContent = 'Start Assessment';
    startBtnEl.style.display = '';
  }
  // BUG 4 FIX: also hide prompt/score when retrying
  if (promptBoxEl) promptBoxEl.style.display = 'none';
  if (scoreEl)     scoreEl.style.display     = 'none';
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