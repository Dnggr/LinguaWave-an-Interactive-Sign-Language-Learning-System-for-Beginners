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
             js/data.js (window.LWData — categories + sign order)
  ─────────────────────────────────────────────────────────────────

  ══════════════════════════════════════════════════════════════════
  BUG LOG — what was broken and what was fixed (so we stop going in circles)
  ══════════════════════════════════════════════════════════════════

  BUG 1 — Camera feed hidden by status overlay when classifier fails
  BUG 2 — setStatus keeps overlay visible even after camera is fully ready
  BUG 3 — DOMContentLoaded timing race (pre-existing fix, preserved)
  BUG 4 — Score display element never shown during assessment
  BUG 5 — btn-start-assessment wired via addEventListener AND onclick
  (See previous version for full write-ups on BUG 1–5 — unchanged.)

  BUG 6 — Sign order was hardcoded per level, so word categories
          (family, places, ...) had nowhere to live
  ─────────────────────────────────────────────────────────────────
  WHERE:   module-level SIGN_ORDER constant
  FIX:     Sign order for a lesson is now pulled from window.LWData
           .getCategorySigns(level, category) — the alphabet's order
           is unchanged (same A→Y, J, Z sequence as before), but
           level=medium/intermediate now branch by ?category=.

  BUG 7 — Classifier now requires a face in frame (face-relative
          features), but there was no UI signal for "no face detected"
  ─────────────────────────────────────────────────────────────────
  WHERE:   startRenderLoop() classify calls
  FIX:     A non-blocking badge (#face-warn, same pattern as
           #classifier-warn) tells the user to step back so their
           whole head is visible.

  BUG 8 — Assessment only ever tested one sign, so category lessons
          (multiple words) had no way to test the whole lesson
  ─────────────────────────────────────────────────────────────────
  WHERE:   startAssessment() / handleAssessmentFrame() / endAssessment()
  FIX:     For category !== 'alphabet', quizSigns is now the FULL
           ordered sign list for that category (matches the flowchart:
           "More signs in lesson?" loop → single "End-of-lesson
           assessment" covering everything just viewed). Missed signs
           are tracked and shown in a "Review missed signs" list on
           fail, matching the flowchart's review step. Alphabet lessons
           are untouched — still one letter, one assessment, exactly
           like before.

  CAPTURE-FORMAT UPDATE — mediapipe.js now uses HolisticLandmarker and
  tracks BOTH hands (left/right) instead of a single "dominant" hand,
  to match capturesystem's new 130-value feature vector. processFrame()
  now returns leftHandLandmarks/rightHandLandmarks/anyHandPresent
  instead of dominantLandmarks, and isFaceModelReady()/getFaceModelError()
  were replaced by isModelReady()/getModelError() (one combined model
  now, not a separate hand + face model).

  REV 3 — Assessment moved out of the per-sign lesson page
  ─────────────────────────────────────────────────────────────────
  Per product decision: live camera/motion detection inside a single
  lesson is now an OPTIONAL "Practice Check" only — MediaPipe/webcam
  accuracy is too inconsistent to gate progress on one sign at a
  time. It no longer decides pass/fail or unlocks anything; it's just
  a formative confidence check the learner can try or skip.

  The REAL, graded assessment now happens once per CATEGORY (and once
  more per LEVEL) in pages/quiz.html, which mixes multiple choice,
  identification, and an optional camera round. See js/quiz.js and
  js/engine/progress.js.

  So here:
    - Viewing/opening a sign now calls LWProgress.recordSignPracticed()
      immediately (no camera needed) — this is what "Signs You've
      Learned" on the dashboard and the learn.js grid track.
    - The old "Start Assessment" button is now "🎥 Practice Check
      (optional)" and never blocks navigation.
    - "Next" on the last sign in a lesson now goes straight to
      pages/quiz.html?level=X&category=Y (the category assessment)
      instead of forcing the in-page camera quiz.
  ══════════════════════════════════════════════════════════════════
*/

import { startCamera, stopCamera }             from '../js/camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady, getModelError } from '../js/tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }           from '../js/engine/renderer.js';
import { getDetectionType }                    from '../js/engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer,
         isMotionModelReady, getMotionModelError, loadModels }  from '../js/engine/classifier.js';

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
const missedListEl    = document.getElementById('missed-signs-review'); // BUG 8 — optional, see lesson.html snippet

// BUG 1 FIX: separate non-blocking classifier warning element.
let classifierWarnEl  = null;
// BUG 7 FIX: separate non-blocking face warning element.
let faceWarnEl        = null;

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
// BUG 6 FIX: category defaults to 'alphabet' for the basic level
// (preserves every existing ?level=basic&sign=X link untouched).
// For other levels it defaults to the first non-comingSoon category.
const category   = params.get('category') || defaultCategoryFor(level);

function defaultCategoryFor(lvl) {
  if (lvl === 'basic') return 'alphabet';
  const cats = window.LWData?.getCategoriesForLevel?.(lvl) ?? [];
  const firstLive = cats.find(c => !c.comingSoon);
  return firstLive ? firstLive.id : (cats[0]?.id ?? 'general');
}

// BUG 6 FIX: sign order now comes from data.js instead of a hardcoded
// per-level array. Falls back to the old hardcoded alphabet order if
// data.js somehow isn't loaded yet, so the alphabet lesson never breaks.
const FALLBACK_ALPHABET_ORDER = 'ABCDEFGHIKLMNOPQRSTUVWXYJZ'.split('');

function computeSignOrder() {
  const fromData = window.LWData?.getCategorySigns?.(level, category) ?? [];
  if (fromData.length > 0) return fromData;
  if (category === 'alphabet') return FALLBACK_ALPHABET_ORDER;
  return [];
}

const signOrder  = computeSignOrder();
// BUG 11 FIX: this used to fall back to the literal letter 'A' any
// time signOrder was empty (i.e. a category with no SIGNS content),
// which is why clicking into Places/Food/phrase categories/etc. used
// to silently show "Letter A" instead of that category's own word.
// Every shipped category now has real content (see data.js), so
// signOrder should never actually be empty — but if it somehow is
// (a future category added without content yet), fall back to the
// requested ?sign= value as-is instead of inventing 'A', so the
// "content not written yet" branch in updateLessonMeta()/loadContent
// below can show an honest message instead of a wrong letter.
const requestedSign = params.get('sign');
const sign       = (requestedSign || signOrder[0] || '').toUpperCase();
const signIdx    = Math.max(signOrder.indexOf(sign), 0);
const totalSigns = signOrder.length;

// BUG 8 (reverted): category assessments used to test every sign in
// the category in one run. Per feedback, every lesson — letters,
// words, phrases — now assesses just the one sign on screen, same
// as the alphabet always has. quizSigns below always resolves to a
// single-item array.
const isCategoryAssessment = false;

// ── Assessment state ───────────────────────────────────────────────
const PASS_THRESHOLD  = 0.80;
// BUG 9 FIX: assessment used to slam straight into the next sign with
// only a 1.5s cooldown and a 10s countdown — no time to reposition
// for the next sign, especially motion signs (family category) which
// need a clear run-up. PROMPT_TIMEOUT is now longer, and a short
// "Get ready" pause (GETREADY_DELAY) runs before each prompt's timer
// starts, so the countdown only begins once the user can actually see
// what's being asked of them.
const PROMPT_TIMEOUT   = 15000;
const GETREADY_DELAY   = 2500;
const NEXT_SIGN_DELAY  = 2200;   // pause after each answer before advancing

let mode           = 'practice';
let quizSigns      = [];
let quizIdx        = 0;
let score          = 0;
let missedSigns    = [];   // BUG 8: [{ expected, got }]
let promptTimer    = null;
let getReadyTimer  = null;
let rafId          = null;

const DEBOUNCE_FRAMES = 45;
let debounceCount  = 0;
let lastDetected   = null;
let cooldown       = false;

// BUG 11 FIX: MediaPipe's per-frame face/hand presence flips true/false
// even when the person hasn't moved (confidence hovers right at the
// detection threshold), which made '#face-warn' and the hand-status
// pill flash on/off every few frames. Fix: only trust "missing" after
// it's been missing continuously for HOLD_MS — a single dropped frame
// no longer flips the UI, only a real, sustained loss does.
const FACE_WARN_HOLD_MS   = 600;
const HAND_STATUS_HOLD_MS = 400;
let lastFaceSeenAt = Date.now();
let lastHandSeenAt = Date.now();
let lastHandCount  = 0;

// ── Page boot ──────────────────────────────────────────────────────
// BUG 3 FIX (preserved): check readyState so we don't miss DOMContentLoaded
// when lesson.js (type="module") loads after the event already fired.

async function boot() {
  if (totalSigns === 0) {
    // Category has no functional signs yet (comingSoon) — bail out
    // of camera boot entirely and just say so.
    setStatus(`"${category}" isn't trained yet — check back soon.`, 'error');
    updateLessonMeta();
    return;
  }
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

  if (counter) counter.textContent = `Sign ${signIdx + 1} of ${totalSigns || 1}`;
  if (fill)    fill.dataset.progress = totalSigns ? Math.round(((signIdx + 1) / totalSigns) * 100) : 0;

  // BUGFIX: previously always showed the raw signId (e.g. the whole
  // phrase "WHAT'S YOUR NAME?" crammed into the little "letter"
  // badge). Use the human-friendly title from data.js when we have
  // it, and only show the big single-letter badge for actual letters.
  const signDataForTitle = window.LWData?.getSign?.(level, sign) ?? null;
  const displayTitle = signDataForTitle?.title ?? sign;
  if (letter)  letter.textContent   = sign.length === 1 ? sign : '✋';
  if (title)   title.textContent    = sign.length === 1 ? `Letter ${sign}` : displayTitle;

  const categoryMeta = window.LWData?.getCategory?.(level, category) ?? null;
  if (lessonSubtitleEl) {
    const label = categoryMeta?.title ?? category;
    lessonSubtitleEl.textContent = `${label} · ${level[0].toUpperCase()}${level.slice(1)} Level`;
  }

  // Back link should return to this lesson's own level tab AND the
  // category picker it came from (was previously just the bare level
  // tab, dropping the learner back at the category grid instead of
  // the word/phrase list they picked from).
  const backBtnEl = document.getElementById('btn-back-to-lessons');
  if (backBtnEl) {
    backBtnEl.href = category && category !== 'alphabet'
      ? `learn.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}`
      : `learn.html?level=${encodeURIComponent(level)}`;
  }

  // REV 3: viewing a sign is enough to count as "practiced" — the
  // graded check now happens in the category assessment, not here.
  window.LWProgress?.recordSignPracticed?.(level, category, sign);

  const stripBadgeEl = document.getElementById('lesson-strip-badge');
  if (stripBadgeEl) {
    stripBadgeEl.textContent = `${level[0].toUpperCase()}${level.slice(1)} · ${categoryMeta?.title ?? category}`;
    stripBadgeEl.className   = `badge badge--${level}`;
  }

  if (motionBufWrapEl) {
    motionBufWrapEl.style.display = getDetectionType(sign) === 'motion' ? '' : 'none';
  }

  const signData = signDataForTitle;

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
    if (lessonImgHintEl) lessonImgHintEl.textContent = `Add image to ${signData.imageUrl}`;

    if (lessonVideoEl) {
      const source = lessonVideoEl.querySelector('source');
      if (source) source.src = signData.videoUrl;
      lessonVideoEl.load();
    }

    // NEW: link out to Lifeprint.com (ASL University) for a second,
    // authoritative reference on this sign, when we have one.
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) {
      if (signData.referenceUrl) {
        referenceEl.innerHTML =
          `📖 <a href="${escapeHtml(signData.referenceUrl)}" target="_blank" rel="noopener noreferrer">See this sign on Lifeprint.com (ASL University)</a>`;
        referenceEl.style.display = '';
      } else {
        referenceEl.style.display = 'none';
      }
    }
  } else {
    if (lessonDescriptionEl) lessonDescriptionEl.textContent =
      `Lesson content for "${displayTitle}" hasn't been written yet. The camera detection still works — try practicing the sign below.`;
    if (lessonTipsEl) lessonTipsEl.innerHTML = '';
    if (lessonImageEl) lessonImageEl.style.display = 'none';
    const placeholder = document.getElementById('lesson-img-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) referenceEl.style.display = 'none';
  }

  // REV 3: this is now an optional, ungraded practice check — the
  // real assessment lives in quiz.html (category / level).
  if (startBtnEl) startBtnEl.textContent = '🎥 Practice Check (optional)';

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

function navUrl(targetSign) {
  // BUGFIX: was interpolating category/targetSign raw into the URL,
  // which breaks for Intermediate phrases like "WHAT'S YOUR NAME?"
  // (spaces, apostrophe, question mark all corrupt the query string).
  return `lesson.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}&sign=${encodeURIComponent(targetSign)}`;
}

function setupNavButtons() {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (btnPrev) {
    if (signIdx <= 0) {
      btnPrev.setAttribute('disabled', '');
    } else {
      btnPrev.onclick = () => {
        shutdown();
        window.location = navUrl(signOrder[signIdx - 1]);
      };
    }
  }

  if (btnNext) {
    const isLast = signIdx >= totalSigns - 1;
    if (isLast) {
      // REV 3: the graded check is now the category assessment page,
      // not the in-lesson camera quiz (which is optional practice only).
      btnNext.textContent = 'Finish → Category Assessment 📝';
      btnNext.onclick = () => {
        shutdown();
        window.location = `quiz.html?level=${level}&category=${category}`;
      };
    } else {
      btnNext.textContent = 'Next Sign →';
      btnNext.onclick = () => {
        shutdown();
        window.location = navUrl(signOrder[signIdx + 1]);
      };
    }
  }
}

// ── Boot camera + models ───────────────────────────────────────────

async function bootDetectionEngine() {
  setStatus('Loading hand + face tracking model…', 'loading');

  try {
    await initMediaPipe();
    setStatus('Starting camera…', 'loading');
    await startCamera(videoEl, canvasEl);
  } catch (err) {
    console.error('[lesson.js] Boot failed:', err);
    setStatus(`Failed to start: ${err.message}`, 'error');
    return;
  }

  // BUG 1 + 2 FIX: camera is now live — hide the full-screen status
  // overlay immediately so the video is visible.
  setStatus('', 'ready');

  if (!isModelReady()) {
    setFaceWarn(`⚠️ Hand/face tracking failed to load — sign detection is disabled until this recovers. (${getModelError() ?? 'unknown error'})`);
  }

  try {
    await loadModels();
    const motionErr = getMotionModelError();
    if (motionErr) {
      setClassifierWarn(
        '⚠️ Motion model failed to load — motion signs cannot be detected. ' +
        'Check that /asl_motion_model/model.json exists. (' + motionErr + ')'
      );
    }
  } catch (err) {
    console.error('[lesson.js] Classifier failed to load — camera still running:', err);
    setClassifierWarn('⚠️ Sign classifier failed to load — camera is live but detection is disabled. Check the console for details (Keras 3 issue).');
  }

  startRenderLoop();
}

// ── Main detection render loop ─────────────────────────────────────

function startRenderLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);

    if (!videoEl || videoEl.readyState < 2) return;

    const { leftHandLandmarks, rightHandLandmarks, faceLandmarks, anyHandPresent } = processFrame(videoEl);
    const handsForDrawing = [leftHandLandmarks, rightHandLandmarks].filter(Boolean);
    const now = Date.now();

    if (handsForDrawing.length > 0) { lastHandSeenAt = now; lastHandCount = handsForDrawing.length; }
    if (faceLandmarks)              lastFaceSeenAt = now;

    if (handsForDrawing.length > 0) {
      drawSkeleton(ctx, handsForDrawing, canvasEl.width, canvasEl.height);
    } else {
      clearCanvas(ctx, canvasEl.width, canvasEl.height);
      // Reset the gesture debounce immediately — that's an internal
      // stability check, not user-facing, so no hysteresis needed here.
      debounceCount = 0;
      lastDetected  = null;
    }
    // BUG 11 FIX: only report "no hand" once it's actually been gone
    // for a beat, so the pill doesn't flicker between states.
    setHandStatus(now - lastHandSeenAt > HAND_STATUS_HOLD_MS ? 0 : lastHandCount);

    // BUG 7 FIX: face-relative detection needs the whole head in frame.
    // BUG 11 FIX: same hysteresis — don't flash the warning on a single
    // dropped face-detection frame, only on a sustained loss.
    if (isModelReady()) {
      setFaceWarn(
        now - lastFaceSeenAt > FACE_WARN_HOLD_MS
          ? '⚠️ Face not detected — step back so your whole head is visible.'
          : ''
      );
    }

    if (!anyHandPresent) return;

    const detType = getDetectionType(sign);
    let result;

    if (detType === 'motion') {
      // BUG 10 FIX: keep classifying through cooldown and the trailing
      // "relax" motion (hand opening back up after e.g. BOY's grasp)
      // gets swept into a fresh window and can flip the result to a
      // different sign (DAD) right after the correct one already
      // matched. Stop feeding the buffer entirely while cooldown is
      // active — there's nothing left to detect until the next prompt.
      if (cooldown) {
        result = { label: null, confidence: 0, matched: false, buffering: false };
      } else {
        result = classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks);
      }
      updateMotionBuffer(result.buffering);
    } else {
      result = classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks);
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
  } else if (motionBuffer_progress > 0) {
    motionBuffer_progress = 0;
    motionBufEl.style.width = '0%';
  }
}

// ── Practice mode ──────────────────────────────────────────────────

function handlePracticeFrame(result) {
  const isMotion = getDetectionType(sign) === 'motion';

  if (result.matched && !cooldown) {
    if (isMotion) {
      showFeedback(`✅ Nice! Detected: ${result.label}`, 'success');
      enterCooldown(1200);
      resetMotionBuffer();
      debounceCount = 0;
      lastDetected  = null;
    } else {
      debounceCount++;
      if (debounceCount >= DEBOUNCE_FRAMES && lastDetected === result.label) {
        showFeedback(`✅ Nice! Detected: ${result.label}`, 'success');
        enterCooldown(1200);
        debounceCount = 0;
      }
      lastDetected = result.label;
    }
  } else if (!result.matched && !result.buffering) {
    if (!isMotion) {
      debounceCount = 0;
      lastDetected  = null;
    }
  }
}

// ── Assessment mode ────────────────────────────────────────────────

function startAssessment() {
  // BUG 8 FIX: word/category lessons test every sign in the category
  // in one assessment; the alphabet keeps testing just the one letter.
  quizSigns   = isCategoryAssessment ? [...signOrder] : [sign];
  quizIdx     = 0;
  score       = 0;
  missedSigns = [];
  mode        = 'assessment';
  debounceCount = 0;
  lastDetected  = null;
  // BUG 11 FIX: don't carry over stale "last seen" timestamps from a
  // previous run — that could otherwise show a false warning for the
  // first HOLD_MS of a fresh practice check.
  lastFaceSeenAt = Date.now();
  lastHandSeenAt = Date.now();
  lastHandCount  = 0;

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
  cooldown          = true;               // stay in cooldown through the get-ready pause
  resetMotionBuffer();

  if (scoreEl)  scoreEl.textContent  = `Score: ${score} / ${quizSigns.length}`;
  showFeedback('', '');

  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);

  // BUG 9 FIX: brief "get ready" pause before the sign is revealed and
  // the countdown starts — gives time to relax the hands between signs
  // instead of chaining straight into the next one.
  const isFirst = quizIdx === 0;
  if (promptEl) promptEl.textContent = isFirst ? `Sign: "${currentSign}"` : 'Get ready…';

  getReadyTimer = setTimeout(() => {
    cooldown = false;
    if (promptEl) promptEl.textContent = `Sign: "${currentSign}"`;

    promptTimer = setTimeout(() => {
      missedSigns.push({ expected: currentSign, got: null });
      showFeedback('⏱ Time up — moving on', 'error');
      setTimeout(() => {
        quizIdx++;
        showNextPrompt();
      }, NEXT_SIGN_DELAY);
    }, PROMPT_TIMEOUT);
  }, isFirst ? 0 : GETREADY_DELAY);
}

function handleAssessmentFrame(result) {
  if (cooldown || quizIdx >= quizSigns.length) return;

  const currentSign = quizSigns[quizIdx];
  if (!result.matched || !result.label) return;

  const isMotion = getDetectionType(currentSign) === 'motion';

  if (isMotion) {
    debounceCount = 0;
  } else {
    debounceCount++;
    if (debounceCount < DEBOUNCE_FRAMES) return;
    debounceCount = 0;
  }

  enterCooldown(1500);
  clearTimeout(promptTimer);
  if (isMotion) resetMotionBuffer();

  if (result.label === currentSign) {
    score++;
    showFeedback(`✅ Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
  } else {
    missedSigns.push({ expected: currentSign, got: result.label });
    showFeedback(`❌ Detected ${result.label} — expected ${currentSign}`, 'error');
  }

  setTimeout(() => {
    quizIdx++;
    showNextPrompt();
  }, NEXT_SIGN_DELAY);
}

function endAssessment() {
  mode = 'practice';
  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);

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

  // BUG 8 FIX: "Review missed signs" — only relevant/shown on fail,
  // and only meaningful for multi-sign (category) assessments.
  if (missedListEl) {
    if (!passed && missedSigns.length > 0) {
      missedListEl.innerHTML =
        `<p><strong>Review these signs:</strong></p><ul>` +
        missedSigns.map(m =>
          `<li>${escapeHtml(m.expected)}${m.got ? ` — detected as ${escapeHtml(m.got)}` : ' — not detected in time'}</li>`
        ).join('') +
        `</ul>`;
      missedListEl.style.display = '';
    } else {
      missedListEl.innerHTML = '';
      missedListEl.style.display = 'none';
    }
  }

  // REV 3: this camera round is optional practice, not a gate — always
  // record the sign(s) as practiced and always let the learner continue,
  // whatever the score. The graded pass/fail lives in quiz.html.
  if (overlayEl && finalScoreEl) {
    finalScoreEl.textContent = `${Math.round(pct * 100)}%`;
    document.getElementById('overlay-result-title').textContent =
      passed ? '🎉 Nice practice run!' : 'Good attempt — keep practicing!';
    document.getElementById('overlay-result-msg').textContent =
      passed
        ? 'That looked great. This was just an optional camera practice check — head to the category assessment when you\u2019re ready.'
        : `You scored ${Math.round(pct * 100)}% this time. Camera detection has its limits, so this is just optional practice — it won\u2019t stop you from continuing.`;

    const continueBtn = document.getElementById('btn-overlay-continue');
    const retryBtn    = document.getElementById('btn-overlay-retry');
    // Both actions are always available now — nothing is gated.
    if (continueBtn) continueBtn.style.display = '';
    if (retryBtn)    retryBtn.style.display    = '';

    overlayEl.style.display = 'flex';

    quizSigns.forEach(s => window.LWProgress?.recordSignPracticed?.(level, category, s));
  }

  if (startBtnEl) {
    startBtnEl.style.display = '';
    startBtnEl.textContent   = '🎥 Practice Check (optional)';
  }
}

// ── UI helpers ─────────────────────────────────────────────────────

function updateConfidenceUI(result) {
  if (!detectedEl || !confidenceEl || !confTextEl) return;

  if (result.label) {
    // BUG 10: motion signs now need two agreeing windows before they
    // lock in — show that as "holding" so it doesn't look stuck.
    detectedEl.textContent        = result.confirming ? `${result.label} (hold…)` : result.label;
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

function setClassifierWarn(message) {
  if (!classifierWarnEl) {
    classifierWarnEl = document.getElementById('classifier-warn');
  }
  if (!classifierWarnEl) return;
  classifierWarnEl.textContent = message;
  classifierWarnEl.style.display = message ? '' : 'none';
}

// BUG 7 FIX: non-blocking "no face detected" warning, same pattern as
// setClassifierWarn(). lesson.html needs a <div id="face-warn"></div>
// below #classifier-warn — see lesson.html snippet.
function setFaceWarn(message) {
  if (!faceWarnEl) {
    faceWarnEl = document.getElementById('face-warn');
  }
  if (!faceWarnEl) return;
  faceWarnEl.textContent = message;
  faceWarnEl.style.display = message ? '' : 'none';
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
  clearTimeout(getReadyTimer);
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
    startBtnEl.textContent   = '🎥 Practice Check (optional)';
    startBtnEl.style.display = '';
  }
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
    window.location = navUrl(signOrder[nextIdx]);
  } else {
    // REV 3: last sign in the category → the graded category assessment,
    // not straight to the dashboard.
    window.location = `quiz.html?level=${level}&category=${category}`;
  }
};