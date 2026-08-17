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
import { initMediaPipe, processFrame, isModelReady, getModelError,
         // NEW: lets us throttle detection down during assessment's
         // get-ready pause + countdown (dead time where nothing is
         // being recorded yet) and back up the instant recording
         // actually starts — see the constants + call sites below.
         setDetectionInterval } from '../js/tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }           from '../js/engine/renderer.js';
import { getDetectionType }                    from '../js/engine/dictionary.js';
import { classifyGesture, classifyMotion, resetMotionBuffer,
         isMotionModelReady, getMotionModelError, loadModels,
         // getMotionBufferStatus() gives the REAL recording progress
         // (see classifier.js — now time-based: elapsed/total ms, not
         // frame count) instead of the old synthetic time-based
         // progress estimate. finalizeMotionWindow() lets us force-finish
         // a short recording when the user's hand has clearly left the
         // frame for good, instead of silently hanging until the 15s
         // PROMPT_TIMEOUT. Both are part of the "hand dropped too soon /
         // % bar lied" fix — see the block comment near HAND_LOST_GRACE_MS.
         getMotionBufferStatus, finalizeMotionWindow,
         getAllowedLabelsForSign }                      from '../js/engine/classifier.js';

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

// NEW: Start Recording and Practice Check are now one and the same
// action (see startAssessment/showNextPrompt) — the dedicated button
// and hint text are gone. Status during countdown/recording/confirming
// now shows in this label instead, which lives right above the frame-
// collecting bar in the merged detection panel.
const motionStatusLabelEl = document.getElementById('motion-status-label');
const btnTryPracticeEl    = document.getElementById('btn-try-practice');
const detectionLogListEl = document.getElementById('detection-log-list');
const btnClearLogEl      = document.getElementById('btn-clear-log');

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

// NEW: motion signs now require the user to explicitly click "Start
// Recording" before classifyMotion() is fed any frames. Previously
// detection ran continuously/passively the whole time a motion sign
// was on screen, which had two hidden problems: classifyMotion()
// requires TWO consecutive agreeing 40-frame windows to confirm a
// match (see js/engine/classifier.js), with no UI cue that a second
// attempt was even needed — it just looked broken. And each window
// was captured on an arbitrary ~1.3s cycle unsynced to when the user
// actually started signing, so a window could catch half-idle +
// half-gesture instead of the whole motion. Gating on this flag means
// every window is deliberately synced to a real, intentional attempt.
let motionArmed    = false;

// NEW: 3-2-1 countdown before recording actually arms, matching
// capture.html's existing countdown pattern (same steps/timing) so the
// UX is consistent across the project. This exists because clicking
// "Start Recording" with a mouse and then needing your hand back in
// frame INSTANTLY was the actual friction point — the countdown buys
// that repositioning time.
const MOTION_COUNTDOWN_STEPS   = ['3', '2', '1', 'GO!'];
const MOTION_COUNTDOWN_STEP_MS = 450;
let motionCountdownTimer = null;

// NEW — "assessment mode motion detection is laggy" fix. Every prompt
// spends GETREADY_DELAY (2.5s) + the 4-step countdown above (1.8s) —
// 4.3s total — with full-rate Holistic tracking running for no benefit,
// since nothing is recorded until motionArmed flips true at the end of
// the countdown. A single practice attempt pays that cost once; a full
// category assessment pays it on EVERY sign, back-to-back, non-stop —
// that sustained load is what actually made it feel laggy. DETECT_RATE_IDLE_MS
// is used for that dead time; DETECT_RATE_ACTIVE_MS (matches
// mediapipe.js's own default) is restored the instant recording starts
// or for any static sign (which needs continuous full-rate detection
// throughout, no countdown to spare). See setMotionDetectionRate() below.
const DETECT_RATE_ACTIVE_MS = 50;  // ~20fps — while actually consuming frames
const DETECT_RATE_IDLE_MS   = 150; // ~6-7fps — get-ready pause + countdown dead time

function setMotionDetectionRate(active) {
  setDetectionInterval(active ? DETECT_RATE_ACTIVE_MS : DETECT_RATE_IDLE_MS);
}

// CHANGED: this used to be a fake, time-based progress estimate
// (motionBuffer_progress += 1/30 per buffering tick, assuming a steady
// 30fps) that had no real connection to how many frames the classifier
// had actually collected. Under any lag, or whenever classifyMotion()
// skips a "frozen hand" frame (see classifier.js), the bar and the
// real buffer drifted apart — the bar could show "almost done" while
// the model was nowhere close, which is exactly what taught users to
// drop their hand early. It's gone now; the render loop reads the
// REAL count straight from classifier.js's getMotionBufferStatus()
// every tick instead (see updateMotionBuffer() below).
//
// Declared up here (not lower down near updateMotionBuffer, where it
// used to live) for the same temporal-dead-zone reason as before:
// updateLessonMeta() -> resetMotionUI() can run synchronously during
// boot(), before a later `let` further down the file would have
// executed yet.

// NEW — "hand dropped too soon" fix. While a recording is armed and
// actively buffering, if the hand disappears from frame we don't want
// to just sit there quietly until the 15s PROMPT_TIMEOUT gives up —
// that's the exact silent-failure behavior driving the complaint. Once
// the hand has been gone continuously for HAND_LOST_GRACE_MS, we treat
// it as "they're done, on purpose or not" and force-finish the window
// via classifier.js's finalizeMotionWindow() (pads with the last real
// frame instead of throwing the attempt away), so the user gets an
// actual result — success, fail, or a clear "too short" message —
// within about a second instead of a frozen bar and a 15s wait.
const HAND_LOST_GRACE_MS = 1200;
let handLostSinceArmedAt = null;

// ══════════════════════════════════════════════════════════════════
// NEW — Tier 0 phrase chaining: "I AM A STUDENT" walks through I ->
// AM -> STUDENT as separate, already-working atomic detections, one
// after another, instead of needing a whole new continuous-recognition
// model. A phrase-type SIGNS entry (data.js) carries a `sequence`
// array of component signIds that DO each have a real dictionary.js
// entry + trained model output — dictionary.js itself is untouched,
// it only ever sees real atomic signIds, never a phrase's own made-up
// top-level signId.
//
// phraseSteps / phraseStepIdx track progress through the CURRENT
// phrase attempt. getActiveSignId() is the one thing that changed
// everywhere else: every detection-relevant call site that used to
// read the bare `sign` constant now reads getActiveSignId() instead,
// which resolves to the current step's real signId while a phrase is
// active, or just `sign` unchanged otherwise (so nothing about a
// plain, non-phrase lesson behaves differently).
let phraseSteps   = null;
let phraseStepIdx = 0;

const PHRASE_STEP_DELAY = 700; // brief pause between phrase steps

function getPhraseSequence(signId) {
  const data = window.LWData?.getSign?.(level, signId);
  return (data && Array.isArray(data.sequence) && data.sequence.length > 0) ? data.sequence : null;
}

function isPhrase(signId) {
  return getPhraseSequence(signId) !== null;
}

function getActiveSignId() {
  return (phraseSteps && phraseStepIdx < phraseSteps.length) ? phraseSteps[phraseStepIdx] : sign;
}

// NEW: category-scoped candidate set for the currently active sign
// (see classifier.js's getAllowedLabelsForSign()). Cached and only
// rebuilt when the active sign actually changes — this runs at
// detection framerate, so rebuilding the Set every frame would be
// wasted work. Fixes 6/W, 9/F, 0/O: without this, a correctly-signed
// '6' could get classified as 'W' purely because they're visually
// identical handshapes.
let cachedAllowedLabels = null;
let cachedAllowedLabelsFor = null;
function getActiveAllowedLabels() {
  const active = getActiveSignId();
  if (active !== cachedAllowedLabelsFor) {
    cachedAllowedLabels = getAllowedLabelsForSign(active);
    cachedAllowedLabelsFor = active;
  }
  return cachedAllowedLabels;
}

// Whether THIS lesson's sign needs the motion-recording UI panel /
// explicit "Try it" trigger at all, as opposed to a plain static sign
// which just detects passively/continuously with no start boundary.
// A phrase ALWAYS needs an explicit start, even if its first component
// happens to be static — a multi-step sequence needs a clear "go"
// moment the same way a motion sign does.
function needsExplicitStart(signId) {
  return getDetectionType(signId) === 'motion' || isPhrase(signId);
}

function updatePhrasePromptText() {
  if (!phraseSteps) return;
  const stepLabel = phraseSteps[phraseStepIdx];
  const text = `Step ${phraseStepIdx + 1}/${phraseSteps.length}: "${stepLabel}"`;
  if (mode === 'assessment' && promptEl) promptEl.textContent = text;
  if (motionStatusLabelEl) motionStatusLabelEl.textContent = text;
}

/**
 * Starts (or restarts) the CURRENT phrase step — runs the same
 * "3,2,1,GO!" countdown regardless of whether this step's component is
 * motion or static (see runMotionCountdown()'s terminal branch, which
 * now checks getActiveSignId() rather than assuming motion). A
 * standalone static sign never needed a countdown because it has no
 * "start" boundary; a step WITHIN a sequence does, the same way a
 * motion sign does, so every step gets one for consistency.
 */
function startPhraseStep() {
  // FIX: cancel any countdown chain still ticking from a previous
  // attempt before starting a new one. Without this, a stray old
  // setTimeout chain keeps running independently — each one eventually
  // reaches runMotionCountdown()'s terminal branch and redundantly
  // toggles motionArmed/cooldown/the detection rate on top of whatever
  // the CURRENT attempt is doing. One overlap is a minor glitch; several
  // retries each leaving one behind compounds into exactly "gets
  // laggier every time I try again" — multiple interleaved timer chains
  // all mutating shared state out of sync with each other.
  clearTimeout(motionCountdownTimer);
  resetMotionBuffer();
  handLostSinceArmedAt = null;
  if (motionBufEl) motionBufEl.style.width = '0%';
  cooldown = true; // hold through the countdown below
  runMotionCountdown(0);
}

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

  // NEW: clear-log button only needs wiring once (not per-sign like
  // updateLessonMeta's other bindings), since the log itself persists
  // across sign changes on purpose.
  if (btnClearLogEl) {
    btnClearLogEl.onclick = () => {
      if (detectionLogListEl) {
        detectionLogListEl.innerHTML = '<li class="detection-log__empty">No detections yet</li>';
      }
    };
  }

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
  // CHANGED — used to be `sign.length === 1 ? 'Letter ${sign}' : displayTitle`,
  // which assumed every single-character signId was a letter. That broke
  // the moment the 'numbers' category (also single-character signIds,
  // '0'..'9') was added — a number would render as "Letter 3". Branch on
  // `category` instead of string length, and fall back to displayTitle
  // (data.js's own SIGNS.title, e.g. "Number 3") for every other case —
  // that's already correct and doesn't need a hardcoded prefix at all.
  const singleCharPrefix = category === 'alphabet' ? 'Letter' : category === 'numbers' ? 'Number' : null;
  if (title)   title.textContent    = singleCharPrefix ? `${singleCharPrefix} ${sign}` : displayTitle;

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
    motionBufWrapEl.style.display = needsExplicitStart(sign) ? '' : 'none';
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
  // CHANGED: "Practice Check" renamed to "Assessment" — Start Recording
  // used to be a separate button/action; now clicking this one button
  // both starts the assessment flow AND (for motion signs) triggers the
  // 3-2-1 countdown + recording automatically, see showNextPrompt().
  if (startBtnEl) startBtnEl.textContent = '🎥 Start Assessment';

  // BUG 5 FIX: use .onclick assignment (idempotent) instead of
  // addEventListener, which stacks duplicate listeners if called twice.
  if (startBtnEl) startBtnEl.onclick = startAssessment;

  // NEW: the "Try it" practice trigger — same idempotent wiring, same
  // startMotionRecording() function the Assessment flow calls
  // automatically. Only relevant for motion signs; syncMotionUIForMode()
  // handles show/hide based on practice vs. assessment mode.
  if (btnTryPracticeEl) btnTryPracticeEl.onclick = handleTryItClick;

  // Put motion UI back to a clean idle state every time a sign loads —
  // a half-finished recording/countdown from a previous sign should
  // never carry over.
  resetMotionUI();
  syncMotionUIForMode();
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
    const handLostForAWhile = now - lastHandSeenAt > HAND_STATUS_HOLD_MS;
    setHandStatus(handLostForAWhile ? 0 : lastHandCount);

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

    if (!anyHandPresent) {
      // CHANGED (was: unconditional early return, no grace handling —
      // see the removed BUG-10-era comment this replaced). A recording
      // attempt should still tolerate the hand being briefly out of
      // frame (e.g. mid-motion for a sign that dips low or wide), so
      // this does NOT abort the instant the hand disappears. But if
      // the hand stays gone for HAND_LOST_GRACE_MS while we're actively
      // armed and buffering, that's almost always "the user finished
      // signing and put their hand down" — so instead of silently
      // waiting out the full 15s PROMPT_TIMEOUT, force-finish the
      // window right now with whatever real frames were captured.
      if (motionArmed && !cooldown) {
        if (handLostSinceArmedAt === null) handLostSinceArmedAt = now;

        if (now - handLostSinceArmedAt > HAND_LOST_GRACE_MS) {
          const forced = finalizeMotionWindow(getActiveAllowedLabels());
          motionArmed = false;
          handLostSinceArmedAt = null;

          if (forced) {
            // Enough real frames were captured to make a fair (if
            // padded) guess — treat exactly like a normal completed
            // window so scoring/logging/UI all stay consistent.
            logDetection(forced.label, forced.confidence, forced.matched ? 'success' : 'fail');
            setMotionStatus(forced.matched ? 'success' : 'fail', forced.label);
            updateConfidenceUI(forced);
            if (mode === 'practice') handlePracticeFrame(forced);
            else if (mode === 'assessment') handleAssessmentFrame(forced);
          } else {
            // Too little real motion captured to guess fairly — tell
            // the user plainly what happened instead of a vague fail.
            setMotionStatus('hand-lost');
            updateConfidenceUI({ label: null, confidence: 0, matched: false, buffering: false });
          }
          updateMotionBuffer();
        }
      }
      return;
    }
    handLostSinceArmedAt = null;

    const detType = getDetectionType(getActiveSignId());
    let result;

    if (detType === 'motion') {
      // Only feed frames to the motion classifier while armed (set by
      // startMotionRecording(), triggered automatically from
      // showNextPrompt() in assessment mode, or manually via the
      // "Try it" button in practice mode).
      // BUG 10 (unchanged): also skip entirely during cooldown, so the
      // trailing "relax" motion after a match doesn't bleed into a
      // fresh window.
      if (cooldown || !motionArmed) {
        result = { label: null, confidence: 0, matched: false, buffering: false };
      } else {
        result = classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels());

        if (!result.buffering) {
          // A window just finished (matched or rejected) — this is a
          // conclusive result now (single-window match, see
          // classifier.js), so the recording session always ends here.
          motionArmed = false;
          logDetection(result.label, result.confidence, result.matched ? 'success' : 'fail');
          setMotionStatus(result.matched ? 'success' : 'fail', result.label);
        }
      }
      updateMotionBuffer();
    } else {
      result = classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels());
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

// CHANGED: no longer takes a `buffering` bool and fakes a time-based
// fill — reads the REAL frame count straight from classifier.js. Also
// writes an explicit "N/40 frames" readout into the status label while
// armed, since a bare percentage bar turned out not to be a strong
// enough signal to keep users' hands up (see HAND_LOST_GRACE_MS above
// and the getMotionBufferStatus() comment in classifier.js).
// CHANGED: getMotionBufferStatus() is now time-based, not frame-count-
// based (see classifier.js's block comment near MOTION_RECORD_DURATION_MS
// for why — the old frame-count target combined with a fast/throttled
// detection rate produced a rigid ~2 second recording window with no
// room to actually perform a sign). Shows elapsed/total seconds instead
// of a frame count, which is also just a more honest thing to show the
// user — "frames" was never a meaningful unit to them anyway.
function updateMotionBuffer() {
  if (!motionBufEl) return;

  if (!motionArmed) {
    motionBufEl.style.width = '0%';
    return;
  }

  const { elapsedMs, durationMs, progress } = getMotionBufferStatus();
  motionBufEl.style.width = `${Math.round(progress * 100)}%`;

  if (motionStatusLabelEl && elapsedMs > 0) {
    const elapsedSec  = (elapsedMs / 1000).toFixed(1);
    const durationSec = (durationMs / 1000).toFixed(1);
    motionStatusLabelEl.textContent = `Recording — ${elapsedSec}s / ${durationSec}s — keep signing!`;
  }
}

// ── Motion recording status + detection log ────────────────────────

/**
 * Updates the status label that sits above the frame-collecting bar
 * (inside #motion-buffer-wrap) for one of six states, and pulses that
 * whole wrap while something is actively happening. This used to
 * update a dedicated "Start Recording" button + hint text; that
 * button is gone now — recording is triggered automatically by
 * startAssessment()/showNextPrompt(), so there's nothing left to
 * click here, only status to report.
 */
function setMotionStatus(state, label) {
  if (!motionStatusLabelEl) return;
  const isActive = state === 'recording' || state === 'countdown';
  motionBufWrapEl?.classList.toggle('is-recording', isActive);
  if (btnTryPracticeEl) btnTryPracticeEl.disabled = isActive;

  switch (state) {
    case 'countdown':
      motionStatusLabelEl.textContent = `Get ready… ${label}`; // '3' / '2' / '1' / 'GO!'
      break;
    case 'recording':
      motionStatusLabelEl.textContent = 'Recording — perform the sign now';
      break;
    case 'success':
      motionStatusLabelEl.textContent = `✅ Detected "${label}"`;
      break;
    case 'fail':
      motionStatusLabelEl.textContent = label
        ? `❌ Wasn't confident enough (saw "${label}")`
        : '❌ No clear motion detected';
      break;
    case 'hand-lost':
      // NEW: shown when the hand left frame with too little of the
      // sign captured to even guess — see HAND_LOST_GRACE_MS handling
      // in the render loop. Explicit and actionable, unlike the old
      // silent hang.
      motionStatusLabelEl.textContent = '⚠️ Hand left the frame too soon — keep it up until recording finishes, then try again';
      break;
    case 'idle':
    default:
      motionStatusLabelEl.textContent = 'Collecting frames';
      break;
  }
}

/**
 * Runs a 3-2-1-GO countdown (same pattern/timing as capture.html)
 * before actually arming recording, then starts feeding frames to
 * the motion classifier. CHANGED: this used to be a click handler
 * for a dedicated "Start Recording" button. Start Recording and
 * Practice Check/Assessment were conceptually the same action (both
 * are "attempt this sign for real"), so they're now one thing —
 * this is called automatically from showNextPrompt() the moment the
 * get-ready pause ends, for motion signs only.
 */
/**
 * NEW — the "Try it" button's actual click handler. A phrase-type sign
 * needs its sequence state initialized before anything starts; a plain
 * motion sign just starts recording exactly as before.
 */
function handleTryItClick() {
  const seq = getPhraseSequence(sign);
  if (seq) {
    phraseSteps   = seq;
    phraseStepIdx = 0;
    updatePhrasePromptText();
    startPhraseStep();
  } else {
    phraseSteps = null;
    startMotionRecording();
  }
}

function startMotionRecording() {
  if (getDetectionType(getActiveSignId()) !== 'motion' || cooldown) return;
  // FIX: same overlapping-timer-chain issue as startPhraseStep() above —
  // see that comment for the full explanation.
  clearTimeout(motionCountdownTimer);
  resetMotionBuffer();
  handLostSinceArmedAt = null;
  if (motionBufEl) motionBufEl.style.width = '0%';
  runMotionCountdown(0);
}

function runMotionCountdown(stepIdx) {
  if (stepIdx >= MOTION_COUNTDOWN_STEPS.length) {
    // CHANGED: cooldown is now explicitly cleared here (it used to just
    // rely on showNextPrompt already having cleared it before this ever
    // ran). startPhraseStep() sets cooldown=true for the duration of
    // ITS countdown — including for a static phrase step, which never
    // had a countdown before and needs cooldown to actually gate the
    // render loop's passive/continuous static check during those 3
    // seconds. Harmless no-op for the plain non-phrase motion flow,
    // where cooldown was already false by this point anyway.
    cooldown = false;
    setMotionDetectionRate(true);

    if (getDetectionType(getActiveSignId()) === 'motion') {
      motionArmed = true;
      setMotionStatus('recording');
    } else {
      // NEW: a static step within a phrase (see startPhraseStep()) —
      // static detection is passive/continuous once cooldown lifts, so
      // there's nothing to "arm," just reset the debounce state for a
      // clean start on this step.
      debounceCount = 0;
      lastDetected  = null;
      setMotionStatus('idle');
    }
    return;
  }
  setMotionStatus('countdown', MOTION_COUNTDOWN_STEPS[stepIdx]);
  motionCountdownTimer = setTimeout(() => runMotionCountdown(stepIdx + 1), MOTION_COUNTDOWN_STEP_MS);
}

/**
 * Fully resets motion recording state — used whenever a sign/prompt
 * changes so a half-finished recording (or a countdown still ticking)
 * from before doesn't linger.
 */
function resetMotionUI() {
  clearTimeout(motionCountdownTimer);
  motionArmed = false;
  handLostSinceArmedAt = null;
  // NEW: clear phrase progress too — a fresh prompt (or a wrong-answer
  // restart) should never inherit a half-finished sequence from before.
  phraseSteps   = null;
  phraseStepIdx = 0;
  resetMotionBuffer();
  if (motionBufEl) motionBufEl.style.width = '0%';
  setMotionStatus('idle');
  // NEW (assessment lag fix): default back to full-rate detection —
  // this is the "normal" state for idle browsing, practice mode, and
  // the end of an assessment. showNextPrompt() explicitly drops back
  // to the idle rate right after calling this, specifically for
  // assessment's get-ready dead time — see the call site there.
  setMotionDetectionRate(true);
}

/**
 * Shows/hides the "Try it" practice trigger based on the current
 * mode. Practice mode: visible, so motion detection has a way to run
 * outside a scored assessment. Assessment mode: hidden, since
 * showNextPrompt() already triggers recording automatically per
 * prompt and a second manual trigger would just be confusing there.
 */
function syncMotionUIForMode() {
  if (!btnTryPracticeEl) return;
  btnTryPracticeEl.style.display =
    (mode === 'practice' && needsExplicitStart(sign)) ? '' : 'none';
}

const MAX_LOG_ENTRIES = 20;

/**
 * Appends one entry to the persistent detection log panel. Newest
 * entries render at the top (see .detection-log__list's
 * column-reverse in css/lesson-camera.css) — appendChild here keeps
 * DOM order oldest→newest while the CSS flips the visual order.
 */
function logDetection(label, confidence, kind) {
  if (!detectionLogListEl) return;
  const emptyEl = detectionLogListEl.querySelector('.detection-log__empty');
  if (emptyEl) emptyEl.remove();

  const icon = kind === 'success' ? '✅' : kind === 'confirming' ? '🔁' : '❌';
  const li = document.createElement('li');
  li.className = `detection-log__entry--${kind}`;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  li.innerHTML =
    `<span class="detection-log__time">${time}</span>` +
    `<span class="detection-log__label">${icon} ${label ? escapeHtml(label) : 'no sign'}</span>` +
    `<span class="detection-log__conf">${confidence}%</span>`;
  detectionLogListEl.appendChild(li);

  while (detectionLogListEl.children.length > MAX_LOG_ENTRIES) {
    detectionLogListEl.removeChild(detectionLogListEl.firstChild);
  }
}

// ── Practice mode ──────────────────────────────────────────────────

function handlePracticeFrame(result) {
  // NEW — phrase-type sign in practice mode. Uses a STRICT per-step
  // correctness check (must match the CURRENT step's expected
  // component), unlike plain practice's existing "any confident match
  // counts" behavior just below — a sequence specifically needs to
  // verify the right component was signed at each step, or advancing
  // on a wrong letter/word would silently break the whole point of
  // practicing the sequence. Left the existing plain-sign behavior
  // completely untouched below; this only intercepts when a phrase is
  // actually active.
  if (phraseSteps) {
    if (cooldown || !result.matched || !result.label) return;
    const expectedStep = getActiveSignId();
    const isMotion = getDetectionType(expectedStep) === 'motion';

    if (isMotion) {
      if (result.label !== expectedStep) {
        // Forgiving in practice mode: retry just this step rather than
        // aborting the whole sequence, unlike assessment's strict fail.
        showFeedback(`❌ Detected "${result.label}" — try "${expectedStep}" again`, 'error');
        enterCooldown(1000);
        resetMotionBuffer();
        setTimeout(() => startPhraseStep(), 1000);
        return;
      }
      debounceCount = 0;
    } else {
      if (result.label !== expectedStep) {
        debounceCount = 0;
        lastDetected  = null;
        return; // just keep waiting — static path has no "wrong guess" moment to react to
      }
      debounceCount++;
      lastDetected = result.label;
      if (debounceCount < DEBOUNCE_FRAMES) return;
      debounceCount = 0;
    }

    if (phraseStepIdx < phraseSteps.length - 1) {
      enterCooldown(PHRASE_STEP_DELAY);
      if (isMotion) resetMotionBuffer();
      phraseStepIdx++;
      updatePhrasePromptText();
      showFeedback(`✅ Got it — next: "${phraseSteps[phraseStepIdx]}"`, 'success');
      setTimeout(() => startPhraseStep(), PHRASE_STEP_DELAY);
      return;
    }

    enterCooldown(1200);
    if (isMotion) resetMotionBuffer();
    showFeedback('✅ Phrase complete!', 'success');
    phraseSteps = null;
    return;
  }

  // ── existing non-phrase logic, unchanged below ──
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
  syncMotionUIForMode();
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
  resetMotionUI();

  // NEW (assessment lag fix): drop to the idle detection rate for the
  // get-ready pause below — full-rate tracking isn't needed until
  // frames are actually being consumed (see the block comment near
  // DETECT_RATE_IDLE_MS). Restored to active rate further down: right
  // away for static signs, or at the end of the countdown for motion
  // signs (see runMotionCountdown()'s terminal branch).
  setMotionDetectionRate(false);

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

    // NEW: phrase-type prompt — walk through its component signs one
    // at a time (see the phrase-chaining block comment near
    // phraseSteps) instead of a single detection attempt.
    const seq = getPhraseSequence(currentSign);
    if (seq) {
      phraseSteps   = seq;
      phraseStepIdx = 0;
      updatePhrasePromptText();
      startPhraseStep();
    } else {
      phraseSteps = null;

      // CHANGED: Start Recording and Assessment are now one action.
      // Static letters need nothing extra here — they've always detected
      // passively/continuously once cooldown lifts. Motion signs used to
      // need a separate button click; now the countdown + recording
      // starts automatically the instant the get-ready pause ends.
      if (getDetectionType(currentSign) === 'motion') {
        startMotionRecording();
      } else {
        // NEW: static signs have no countdown to wait through — they
        // start consuming frames the instant cooldown lifts, so the
        // active rate needs to be back on right now, not at some later
        // "recording started" point (there isn't one for static).
        setMotionDetectionRate(true);
      }
    }

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

  // NEW — phrase-type prompt: check against the CURRENT STEP's expected
  // component, not the outer phrase signId (which has no dictionary
  // entry of its own — it's just a label for "these N signs in order").
  // Any wrong component fails the whole phrase attempt immediately,
  // same bar as a normal wrong-answer assessment prompt; the final
  // step's success falls through to the exact same scoring/feedback/
  // advance path a plain prompt uses.
  if (phraseSteps) {
    if (!result.matched || !result.label) return;
    const expectedStep = getActiveSignId();
    const isMotion = getDetectionType(expectedStep) === 'motion';

    if (isMotion) {
      debounceCount = 0;
    } else {
      debounceCount++;
      if (debounceCount < DEBOUNCE_FRAMES) return;
      debounceCount = 0;
    }

    if (result.label !== expectedStep) {
      enterCooldown(1500);
      clearTimeout(promptTimer);
      if (isMotion) resetMotionBuffer();
      const stepInfo = `${result.label} (step ${phraseStepIdx + 1}/${phraseSteps.length})`;
      phraseSteps = null;
      missedSigns.push({ expected: currentSign, got: stepInfo });
      showFeedback(`❌ Detected "${result.label}" — expected "${expectedStep}"`, 'error');
      setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
      return;
    }

    if (phraseStepIdx < phraseSteps.length - 1) {
      enterCooldown(PHRASE_STEP_DELAY);
      clearTimeout(promptTimer);
      if (isMotion) resetMotionBuffer();
      phraseStepIdx++;
      updatePhrasePromptText();
      // re-arm the timeout for the next step, same total-attempt spirit
      // as the single-step case — a phrase just gets steps' worth of
      // extra time rather than one shared clock ticking under it
      promptTimer = setTimeout(() => {
        missedSigns.push({ expected: currentSign, got: null });
        showFeedback('⏱ Time up — moving on', 'error');
        phraseSteps = null;
        setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
      }, PROMPT_TIMEOUT);
      setTimeout(() => startPhraseStep(), PHRASE_STEP_DELAY);
      return;
    }

    // Final step correct — whole phrase succeeded.
    enterCooldown(1500);
    clearTimeout(promptTimer);
    if (isMotion) resetMotionBuffer();
    phraseSteps = null;
    score++;
    showFeedback(`✅ Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
    setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
    return;
  }

  // ── existing non-phrase logic, unchanged below ──
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
  syncMotionUIForMode();
  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);
  resetMotionUI(); // NEW: don't leave a stale "Recording…" button if time ran out mid-attempt

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
    startBtnEl.textContent   = '🎥 Start Assessment';
  }
}

// ── UI helpers ─────────────────────────────────────────────────────

function updateConfidenceUI(result) {
  if (!detectedEl || !confidenceEl || !confTextEl) return;

  if (result.label) {
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
    detectedEl.textContent        = result.label;
    detectedEl.style.color        = result.matched ? 'var(--clr-success)' : 'var(--clr-text-muted)';
    confidenceEl.style.width      = `${result.confidence}%`;
    confidenceEl.style.background = result.matched ? 'var(--clr-success)' : 'var(--clr-yellow)';
    confTextEl.textContent        = `${result.confidence}%`;
  } else if (motionArmed) {
    // NEW: classifyMotion() only returns a label once its ~1.3s frame
    // window completes — the whole time it's collecting, result.label
    // is null, which meant this readout just sat on a flat "– 0%" the
    // entire time. That reads as frozen even though it's actively
    // working (the thin frame-collecting bar below is the only thing
    // that moved). Show an explicit pulsing "Listening" state instead.
    detectedEl.textContent   = '🎥 Listening…';
    detectedEl.style.color   = 'var(--clr-accent)';
    confidenceEl.style.width = '100%';
    confidenceEl.style.background = 'var(--clr-accent)';
    confidenceEl.classList.add('confidence-bar-fill--pulse');
    confTextEl.textContent   = '…';
  } else {
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
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
    startBtnEl.textContent   = '🎥 Start Assessment';
    startBtnEl.style.display = '';
  }
  if (promptBoxEl) promptBoxEl.style.display = 'none';
  if (scoreEl)     scoreEl.style.display     = 'none';
  if (modeBarEl) {
    modeBarEl.textContent = '📖 Practice Mode';
    modeBarEl.className   = 'mode-bar mode-bar--practice';
  }
  mode = 'practice';
  syncMotionUIForMode();
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