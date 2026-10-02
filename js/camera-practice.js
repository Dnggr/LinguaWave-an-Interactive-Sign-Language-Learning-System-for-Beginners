/*
  js/camera-practice.js — Sign Lesson Orchestrator
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Wires together camera, MediaPipe, classifier, and renderer
             for the lesson page. Manages practice / assessment modes.
  CONNECTS : pages/camera-practice.html  (type="module" script)
             js/camera/cameraUtils.js
             js/tracking/mediapipe.js
             js/engine/classifier.js
             js/engine/renderer.js
             js/engine/dictionary.js
             js/missions.js (window.LWMissions — categories + sign order)
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
  FIX:     Sign order for a lesson is now pulled from window.LWMissions
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
  to match capturesystem's feature vector (now 138 values — see
  js/tracking/mediapipe.js and js/engine/classifier.js). processFrame()
  now returns leftHandLandmarks/rightHandLandmarks/poseLandmarks/
  anyHandPresent instead of dominantLandmarks, and isFaceModelReady()/
  getFaceModelError() were replaced by isModelReady()/getModelError()
  (one combined model now, not a separate hand + face model).
  poseLandmarks is threaded through to classifyGesture()/classifyMotion()
  so they can derive the shoulder/hip body-relative features.

  CAMERA TIPS REMINDER — repeated misses point at the Camera Tips card
  ─────────────────────────────────────────────────────────────────
  WHERE:   the "Camera Tips reminder hooks" block below the assessment
           state, plus one-line calls in startRenderLoop() (static-try
           tracking + motion-window outcome), handlePracticeFrame()
           (success), handleAssessmentFrame()/showNextPrompt() (each
           Practice Check prompt settles ONCE: passed / wrong / time up)
           and bootDetectionEngine() (detection-ready flag).
  WHAT:    This file decides what one attempt is and reports it as a
           pass or a miss; js/camera-tips-reminder.js counts per sign and
           shows the reminder (2nd, 5th, 10th, 20th miss, then every 10)
           through LWTour.remind() — a spotlight on the REAL Camera Tips
           card, not a copy, with a "Got it" button. Whole tutorial
           restarts are not involved.
  RULES:   Frames are never counted. Only a finished attempt is: a
           Practice Check prompt, a finished motion recording, or a
           "try" at a static sign (hand raised -> hand lowered / 10s, at
           most ONE miss per try however long the hand stays up).
           Nothing is counted while the models aren't loaded, a tour or
           reminder is open, or the tab is hidden. See the block for the
           limits (static-only phrase practice, e.g. the name drill, has
           no discrete attempt to count).

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

  GATE (this session — supersedes REV 3 above for THIS check only):
  product now requires the per-sign Camera Practice check to actually
  gate progress — a learner must score >= PASS_THRESHOLD here before
  "Continue to Next Sign" is offered or the sign counts as done.
  REV 3's category/level quiz.html assessment is untouched by this;
  only this page's own per-sign round changed. Concretely:
    - "Viewing/opening a sign calls recordSignPracticed() immediately"
      (above) was already dead — see the BUGFIX comment on
      recordSignPracticed()'s real call site further down, which
      moved that to sign-EXIT, not open. This session narrows it
      further: completion (recordSignPracticed() AND
      LWMissions.markSignPracticedBridge()) is now written in exactly
      ONE place, endAssessment(), and only when passed is true. Every
      other former writer (the Finish button, a sidebar-link exit —
      see markCurrentSignPracticed()) now only reconfirms an
      ALREADY-passed sign; it can no longer complete one on its own.
    - The button is "🎥 Practice Check" (no "(optional)" — it isn't).
    - continueToNext() re-checks the same persisted completion state
      before navigating, instead of trusting that the Continue button
      was correctly hidden — see its own comment for why.
  ══════════════════════════════════════════════════════════════════
*/

import { startCamera, stopCamera }             from './camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady, getModelError,
         // NEW: lets us throttle detection down during assessment's
         // get-ready pause + countdown (dead time where nothing is
         // being recorded yet) and back up the instant recording
         // actually starts — see the constants + call sites below.
         setDetectionInterval } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }           from './engine/renderer.js';
import { getDetectionType }                    from './engine/dictionary.js';
import { loadTrainedLabelSets, getSignTrainingStatus,
         getSequenceTrainingStatus }              from './engine/training-status.js';
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
         getAllowedLabelsForSign }                      from './engine/classifier.js';

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
const finalAttemptsEl = document.getElementById('final-attempts');
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

/* BUGFIX (dark-mode UX pass) — this used to be declared right above
   showFeedback() (~line 2750). boot() is invoked at MODULE LEVEL (see the
   `boot()` call after its definition, ~line 1418) and has no `await` before
   bootDetectionEngine(), so its very first statement — setStatus('Loading
   hand + face tracking model…') — ran DURING module evaluation, before the
   `const` below had been initialised: "ReferenceError: Cannot access
   'FEEDBACK_ICONS' before initialization". That rejected boot()'s promise
   and the detection engine never started. Declared up here it exists
   before any code can call setStatus()/showFeedback()/logDetection(). */
// Maps the semantic feedback `type` these helpers already took to an
// icon in the shared set. This is the whole point of the icon migration
// for this file: before, ~20 call sites each hard-coded their own emoji
// INTO the message string ("\u2705 Correct!", "\u274c Detected X") while ALSO
// passing type:'success'/'error' — the glyph and the type could disagree,
// and did. Now the caller passes meaning only and the icon is derived.
const FEEDBACK_ICONS = {
  success:    'success',
  error:      'error',
  confirming: 'info',
  info:       'info',
  warning:    'warning',
};

// Lesson content refs
const lessonDescriptionEl = document.getElementById('lesson-description');
const lessonTipsEl        = document.getElementById('lesson-tips');
const lessonVideoEl       = document.getElementById('lesson-video');
let   lessonEmbedEl       = document.getElementById('lesson-video-embed');   // `let`: swapped for a fresh <iframe> when controls are revealed
const lessonShieldEl      = document.getElementById('lesson-video-shield');
const lessonSubtitleEl    = document.getElementById('lesson-subtitle');

// ── Demo video: local file vs. YouTube embed ───────────────────────
// missions.js `videoUrl` can be EITHER a local file (../assets/videos/…mp4,
// the default for almost every sign) OR a YouTube embed URL
// (https://www.youtube.com/embed/<id>?si=…). A YouTube embed URL is a web
// page, not a media file, so it can't go in <video>/<source> — it needs the
// <iframe id="lesson-video-embed"> in camera-practice.html. This picks the
// right player per sign and hides the other.
//
// Only YouTube embed URLs are accepted for the iframe (allow-list, not "any
// https URL"): videoUrl can also come from admin-edited Firestore content
// (js/admin-content.js), and we don't want arbitrary pages framed here.
// To support another host (e.g. player.vimeo.com), extend YT_EMBED_RE.
const YT_EMBED_RE = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]{6,}(\?[^\s#]*)?$/i;

function isYouTubeEmbedUrl(url) {
  return typeof url === 'string' && YT_EMBED_RE.test(url.trim());
}

// How the YouTube embed behaves. These are YouTube IFrame Player parameters
// (https://developers.google.com/youtube/player_parameters) added ON TOP of
// whatever is already in the sign's videoUrl (e.g. its `?si=` share id):
//   autoplay+mute  start immediately, silently — browsers only allow autoplay when
//                  muted. This also skips YouTube's "cued" thumbnail screen, which
//                  always draws the title/channel bar. Same muted/looping treatment
//                  lesson.js already gives local sign clips.
//   loop           replay forever. Needs `playlist=<same video id>` for a single
//                  video (added in buildYouTubeSrc) — YouTube ignores loop without it.
//                  Looping also means the clip never reaches YouTube's end screen,
//                  which is where the "More videos" grid comes from.
//   rel=0          related videos limited to the SAME channel (YouTube no longer
//                  lets embeds turn suggestions off completely).
//   playsinline    iOS: play in place instead of forcing fullscreen.
//   iv_load_policy=3  hide video annotation pop-ups.
const YT_PLAYER_PARAMS = { autoplay: '1', mute: '1', loop: '1', rel: '0', playsinline: '1', iv_load_policy: '3' };

// videoUrl → the iframe src actually loaded. `controls:false` is the clean default;
// `controls:true` is what the learner gets after clicking the video.
function buildYouTubeSrc(videoUrl, { controls }) {
  const u  = new URL(videoUrl.trim());
  const id = u.pathname.split('/').pop();                  // …/embed/<id>
  Object.entries(YT_PLAYER_PARAMS).forEach(([k, v]) => u.searchParams.set(k, v));
  // loop needs playlist=<id> for a single video. NOT for /embed/videoseries (a real
  // playlist, which loops on its own) — there "playlist" would be the literal
  // string "videoseries" and break the embed.
  if (id !== 'videoseries') u.searchParams.set('playlist', id);
  u.searchParams.set('controls', controls ? '1' : '0');
  return u.toString();
}

// The videoUrl currently showing in the iframe, so the shield click can rebuild
// the same video with controls turned on.
let currentEmbedUrl = '';

// Reload the embed with YouTube's controls, then get out of the way.
// A brand-new <iframe> is swapped in instead of changing .src on the old one:
// re-pointing an already-loaded iframe adds a browser-history entry (Back would
// step through the player's own states); a new iframe's first load does not.
// The clip is a couple of seconds and loops, so restarting it is unnoticeable.
function revealEmbedControls() {
  if (!lessonEmbedEl || !currentEmbedUrl) return;
  if (lessonShieldEl && lessonShieldEl.hidden) return;   // already revealed — never reload twice
  const fresh = lessonEmbedEl.cloneNode(false);
  fresh.src = buildYouTubeSrc(currentEmbedUrl, { controls: true });
  lessonEmbedEl.replaceWith(fresh);
  lessonEmbedEl = fresh;
  if (lessonShieldEl) lessonShieldEl.hidden = true;
}
if (lessonShieldEl) lessonShieldEl.addEventListener('click', revealEmbedControls);

// ── demo-video failure message ─────────────────────────────────────
// A <video> that can't load (host unreachable, 404) or can't decode (e.g. HEVC)
// used to just stay a black box. Show a short message in its place instead.
// A failed <source> fires 'error' on the <source> (it doesn't bubble), a decode
// failure fires it on the <video> — so both are listened to.
let lessonVideoErrWired = false;
function setLessonVideoError(failed) {
  if (!lessonVideoEl) return;
  let note = document.getElementById('lesson-video-error');
  if (failed) {
    lessonVideoEl.hidden = true;
    if (!note) {
      note = document.createElement('p');
      note.id = 'lesson-video-error';
      note.className = 'alert alert--error mt-4';
      note.setAttribute('role', 'status');
      note.textContent = "This sign's video couldn't be loaded. Check your connection and try again, or follow the written steps below.";
      const wrap = lessonVideoEl.closest('.lesson-video') || lessonVideoEl.parentElement;
      wrap.insertAdjacentElement('afterend', note);
    }
    note.hidden = false;
  } else if (note) {
    note.hidden = true;
  }
}
function wireLessonVideoErrors() {
  if (lessonVideoErrWired || !lessonVideoEl) return;
  lessonVideoErrWired = true;
  lessonVideoEl.addEventListener('error', () => setLessonVideoError(true));
  // The <source> is reused across signs (only its src changes), so one listener is enough.
  const source = lessonVideoEl.querySelector('source');
  if (source) source.addEventListener('error', () => setLessonVideoError(true));
}

function applyLessonVideo(videoUrl) {
  const url = typeof videoUrl === 'string' ? videoUrl.trim() : '';
  setLessonVideoError(false);
  wireLessonVideoErrors();

  if (lessonEmbedEl && isYouTubeEmbedUrl(url)) {
    // YouTube: stop/hide the local player, load the embed clean (no controls),
    // and put the click-to-reveal shield on top.
    if (lessonVideoEl) { lessonVideoEl.pause(); lessonVideoEl.hidden = true; }
    currentEmbedUrl = url;
    lessonEmbedEl.src = buildYouTubeSrc(url, { controls: false });
    lessonEmbedEl.hidden = false;
    if (lessonShieldEl) lessonShieldEl.hidden = false;
    return;
  }

  // Local file: blank/hide the iframe (stops any YouTube playback) and the shield,
  // then load the mp4. With no videoUrl at all, keep the HTML's placeholder.mp4.
  currentEmbedUrl = '';
  if (lessonEmbedEl)  { lessonEmbedEl.src = 'about:blank'; lessonEmbedEl.hidden = true; }
  if (lessonShieldEl) lessonShieldEl.hidden = true;
  if (lessonVideoEl) {
    lessonVideoEl.hidden = false;
    const source = lessonVideoEl.querySelector('source');
    if (source && url) source.src = url;
    lessonVideoEl.load();
    // autoplay attr covers most cases; this is a safety net (muted, so browsers allow it).
    const p = lessonVideoEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
}

// ── URL params ─────────────────────────────────────────────────────
const params     = new URLSearchParams(window.location.search);
const level      = params.get('level') || 'basic';
// BUG 6 FIX: category defaults to 'alphabet' for the basic level
// (preserves every existing ?level=basic&sign=X link untouched).
// For other levels it defaults to the first non-comingSoon category.
const category   = params.get('category') || defaultCategoryFor(level);

function defaultCategoryFor(lvl) {
  if (lvl === 'basic') return 'alphabet';
  const cats = window.LWMissions?.getCategoriesForLevel?.(lvl) ?? [];
  const firstLive = cats.find(c => !c.comingSoon);
  return firstLive ? firstLive.id : (cats[0]?.id ?? 'general');
}

// ── REV 4 PIVOT — Phase 2: Fingerspell Your Name (Unit 2) ───────────
// NEW — this is the "extension of lesson.js" option named in
// PIVOT_CHECKLIST.md's Phase 2. `fingerspell_name` is deliberately NOT
// a CATEGORIES/SIGNS entry in data.js — per SYSTEM_ARCHITECTURE.md
// Rev 4 §"New content needed" #2, its sequence is built at runtime
// from the logged-in learner's own name instead of authored content,
// reusing the A–Z static model with zero new training data. Reached
// today via a direct URL — `camera-practice.html?level=basic&category=
// fingerspell_name` — since wiring a Unit 2 node into the trail UI is
// explicitly Phase 4 (learn.js rewrite), not this phase. See
// AI_MEMORY.md's 2026-08-18 Phase 2 session log entry.
const isNameDrill = category === 'fingerspell_name';

// Sanity cap on how many letters one drill attempt walks through —
// a learner could theoretically have a very long full name typed at
// signup. 24 is generous (longer than any realistic first+last name)
// while keeping one drill attempt from turning into a marathon.
// Flagging as a judgment call, not an adviser-specified number.
const MAX_NAME_DRILL_LETTERS = 24;

/**
 * Builds the runtime letter sequence for the name drill from the
 * logged-in learner's session name (js/auth.js → window.LWAuth).
 * Non A–Z characters (spaces, hyphens, apostrophes, accents, digits)
 * are stripped — fingerspelling only has handshapes for A–Z, so a
 * space or punctuation mark isn't a "step" to detect, it's just not
 * signed. This intentionally collapses a multi-word name (e.g. "Mary
 * Jane") into one continuous letter sequence (M-A-R-Y-J-A-N-E) rather
 * than inserting a pause marker between words — the phrase-chaining
 * pipeline has no concept of a "pause, not a sign" step, and adding
 * one is out of scope for Phase 2. Flagging in case a word-boundary
 * pause is wanted later.
 * @returns {string[]} array of single-character signIds, e.g. ['J','O','S','H']
 */
function getLearnerNameLetters() {
  const user = window.LWAuth?.getCurrentUser?.();
  const raw  = (user?.name || '').toUpperCase();
  return raw.replace(/[^A-Z]/g, '').split('').slice(0, MAX_NAME_DRILL_LETTERS);
}

// BUG 6 FIX: sign order now comes from data.js instead of a hardcoded
// per-level array. Falls back to the old hardcoded alphabet order if
// data.js somehow isn't loaded yet, so the alphabet lesson never breaks.
const FALLBACK_ALPHABET_ORDER = 'ABCDEFGHIKLMNOPQRSTUVWXYJZ'.split('');

function computeSignOrder() {
  // NEW — Rev4 Phase 2: the name drill is always exactly one "sign"
  // (a synthetic id, 'MY_NAME') regardless of how many letters are in
  // it — the per-letter walk happens INSIDE that one sign via the
  // phrase-chaining pipeline (see getPhraseSequence() below), the same
  // way sequence_demo's CAR_SPELL is one sign that internally chains
  // C→A→R. This keeps every signIdx/totalSigns/Prev-Next assumption
  // elsewhere in this file completely unchanged.
  if (isNameDrill) return ['MY_NAME'];
  const fromData = window.LWMissions?.getCategorySigns?.(level, category) ?? [];
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
let attemptCount   = 0;    // Practice Check rounds started on this page load (shown on the completion card)
let promptTimer    = null;
let getReadyTimer  = null;
let rafId          = null;

// ══════════════════════════════════════════════════════════════════
// Camera Tips reminder hooks (NEW) — see the CAMERA TIPS REMINDER entry
// in this file's header, and js/camera-tips-reminder.js.
// ══════════════════════════════════════════════════════════════════
// This file only says what ONE ATTEMPT is and whether it passed. Three
// kinds exist, and none of them is a camera frame:
//
//   1. A Practice Check prompt. Settles once, as passed (the right sign),
//      a miss (a wrong sign, or a phrase step that was wrong), or a miss
//      (time up). settleAssessmentAttempt() guards against settling the
//      same prompt twice (a late match after "Time up" would otherwise
//      count again, since that path doesn't set cooldown).
//   2. A finished motion recording in practice mode ("Try it"). The
//      classifier window ends exactly once per arming, so one recording
//      = one attempt: matched-and-correct passes, anything else (wrong
//      sign, low confidence, or the hand leaving too soon) is a miss.
//   3. A "try" at a plain static sign in practice mode. Static practice
//      has no start button, so a try is bounded by the hand itself:
//      it begins when a hand appears after >= TRY_GAP_MS without one,
//      and it is a MISS when the hand leaves for >= TRY_GAP_MS having
//      been up for >= TRY_MIN_MS with no success (shorter than that is
//      just a hand passing through frame), or when TRY_MAX_MS pass with
//      the hand still up. A try is settled once — a pass, or a miss —
//      and cannot count again until the hand has left, so holding a wrong
//      sign for a minute is ONE miss, not a stream of them.
//
// Not counted, on purpose: the static steps of a phrase in practice mode
// (the name drill, CAR_SPELL...). A wrong letter there is silently
// retried with no discrete attempt to point at, and the name drill has no
// Practice Check either, so it never triggers a reminder.
//
// Nothing counts while attemptTrackingReady is false (a model didn't load,
// so every attempt would "fail" for reasons camera tips can't fix), while
// a tour/reminder is open, or while the tab is hidden — tipsCanCount().
// Declared up here, not next to the functions that use them, for the same
// temporal-dead-zone reason as FEEDBACK_ICONS below.
const TRY_MIN_MS = 2000;
const TRY_MAX_MS = 10000;
const TRY_GAP_MS = 1000;
let attemptTrackingReady  = false;  // hand/face + static classifier loaded (set in bootDetectionEngine)
let settledAssessmentKey  = null;   // `${round}:${promptIdx}` of the prompt already reported
let staticTry             = null;   // { startedAt, lastSeenAt, settled } while a hand is up
let signNeedsExplicitStart = null;  // cached needsExplicitStart(sign); resolved on first use

// One key per sign/word, scoped by level + category so the same id in two
// places never shares a count. Failures on different signs never combine.
function tipsKey(signId) { return `${level}/${category}/${signId}`; }

function tipsCanCount(signId) {
  if (!attemptTrackingReady || document.hidden) return false;
  if (window.LWCameraTips?.isSuppressed?.()) return false;
  // A motion sign can't pass without the motion model, so a miss there
  // says nothing about the learner's camera setup.
  if (getDetectionType(signId) === 'motion' && !isMotionModelReady()) return false;
  return true;
}

function reportFailedAttempt(signId) {
  if (!tipsCanCount(signId)) return;
  window.LWCameraTips?.recordFailure?.(tipsKey(signId));
}

function reportPassedAttempt(signId) {
  window.LWCameraTips?.recordSuccess?.(tipsKey(signId));
}

// A Practice Check prompt settles once (see kind 1 above).
function settleAssessmentAttempt(signId, passed) {
  const key = `${attemptCount}:${quizIdx}`;
  if (settledAssessmentKey === key) return;
  settledAssessmentKey = key;
  if (passed) reportPassedAttempt(signId); else reportFailedAttempt(signId);
}

// A correct sign registered in practice mode (static letter/word).
function notePracticeSuccess() {
  if (staticTry) staticTry.settled = true;
  reportPassedAttempt(sign);
}

// One finished motion recording in practice mode (kind 2 above). Called
// from the render loop the moment a window ends, with the classifier's
// result, or null when the hand left before enough was captured.
function noteMotionPracticeOutcome(result) {
  if (mode !== 'practice') return;
  if (result && result.matched && result.label === getActiveSignId()) {
    reportPassedAttempt(sign);
    return;
  }
  if (!tipsCanCount(getActiveSignId())) return;
  reportFailedAttempt(sign);
}

// Kind 3 above: called every frame with whether a hand is in view, but
// it only ever reports when a whole try has ended, never per frame.
function trackStaticTry(now, handPresent) {
  if (signNeedsExplicitStart === null && window.LWMissions) signNeedsExplicitStart = needsExplicitStart(sign);
  const applies = mode === 'practice' && signNeedsExplicitStart === false && tipsCanCount(sign);
  if (!applies) { staticTry = null; return; }

  if (handPresent) {
    if (!staticTry) { staticTry = { startedAt: now, lastSeenAt: now, settled: false }; return; }
    staticTry.lastSeenAt = now;
    if (!staticTry.settled && now - staticTry.startedAt >= TRY_MAX_MS) {
      staticTry.settled = true;          // one miss for a long try, however long the hand stays up
      reportFailedAttempt(sign);
    }
    return;
  }
  if (staticTry && now - staticTry.lastSeenAt >= TRY_GAP_MS) {
    const t = staticTry;
    staticTry = null;
    if (!t.settled && t.lastSeenAt - t.startedAt >= TRY_MIN_MS) reportFailedAttempt(sign);
  }
}

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
  // NEW — Rev4 Phase 2: this is the one injection point the whole name
  // drill hangs off of. Every other consumer of phraseSteps/
  // phraseStepIdx (handleTryItClick, handlePracticeFrame,
  // handleAssessmentFrame, startPhraseStep, updatePhrasePromptText,
  // needsExplicitStart, getActiveAllowedLabels, ...) only ever reads
  // whatever plain array phraseSteps was last set to — none of them
  // care whether that array came from a data.js SIGNS.sequence field
  // or was built on the fly here. That's what PIVOT_CHECKLIST.md's
  // Phase 2 item 2 ("confirm it accepts a runtime-built sequence, not
  // just static data.js ones") asked to confirm — traced true by
  // reading every call site, and this branch is the proof: a fully
  // dynamic array, never touching data.js, flows through the exact
  // same mechanism CAR_SPELL/HOME_WORK_DEMO use.
  if (isNameDrill && signId === 'MY_NAME') {
    const letters = getLearnerNameLetters();
    return letters.length > 0 ? letters : null;
  }
  const data = window.LWMissions?.getSign?.(level, signId);
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
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
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

// WARM-UP GRACE (2026-08-22 session — PIVOT_CHECKLIST.md §16 "camera
// warning state needs real-browser verification" item). The two hold
// constants above are tuned for debouncing brief drop-outs *during* an
// active lesson (600ms/400ms — short on purpose, so a genuinely lost
// hand mid-practice reacts fast). The earlier "no more two false
// warnings on first camera load" fix (see bootDetectionEngine()) only
// cleared *stale* timestamps left over from module-load time — it did
// NOT give the learner more than 400-600ms to physically get their
// hand/face in frame after the camera actually goes live, which isn't
// realistic (positioning yourself in front of a camera takes a couple
// of seconds, not milliseconds). That's the actual reason the
// 2026-08-21 learner review still saw both warnings fire almost
// immediately on the Letter M screenshot even though the timestamp-
// staleness bug was already fixed — this is a second, distinct bug,
// not a re-verification of the first one. Give the learner one longer,
// one-time grace window right after camera boot, and end it early the
// moment a hand or face is actually seen (see startRenderLoop()) so a
// learner who's ready immediately isn't held to the full window, and
// every later drop-out during the lesson still gets the tight,
// responsive 600/400ms debounce, unchanged.
const INITIAL_WARMUP_MS = 2500;
let warmingUp = false;
let warmupTimer = null;
let lastHandCount  = 0;

// ── Page boot ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
// COURSE SIDEBAR — "course player" merge (NEW, this session)
// ══════════════════════════════════════════════════════════════════
// Persistent left-hand course outline (all UNITS, collapsible, with
// per-unit progress) rendered directly into this page's
// #course-sidebar, so lesson.html + the old learn.html trail read as
// one continuous screen instead of a click-through hop between two
// pages. This was an explicit product decision made this session (the
// user chose "full merge" over two lighter options — restyle-only or
// leave learn.html as its own page) — flagging it the same way
// earlier pivot phases flag their own product calls, since it goes
// beyond what SYSTEM_ARCHITECTURE.md Rev 4 §Assessment/Progress
// originally specified for this page. See AI_MEMORY.md's session log
// entry for the full reasoning and what was deliberately left as-is
// (learn.html itself is UNCHANGED — it's still the entry point for
// picking a unit from the dashboard/Continue Learning button; this
// sidebar is for moving through what's already unlocked once you're
// inside a lesson).
//
// Every row is a plain <a href="camera-practice.html?..."> — full page
// navigation, exactly like the existing Prev/Next buttons and the
// old "Back to lessons" link. No SPA state, no change to the camera
// lifecycle below: shutdown() already runs on `beforeunload`
// regardless of which link the learner clicks, so this needed zero
// new cleanup wiring.
//
// Read-only: never calls any window.LWProgress/window.LWMissions
// record/mark*() function. Locked (unit-level) is still computed with
// the same window.LWProgress.isCategoryUnlocked() call js/learn.js's
// trail and js/dashboard.js's unit rows use — unchanged.
//
// MISSION PROGRESS SYNC (this revision) — done/percentage, on the
// other hand, used to come from that same window.LWProgress store
// (getCategoryProgress()'s own "signs practiced via camera" record),
// which is a DIFFERENT store from the one mission-overview.html reads
// (window.LWMissions — chapter-gated LESSON/BOOSTER/PRACTICE/QUIZ
// items actually marked complete). The two could and did disagree —
// e.g. this sidebar showing "86%" for a category whose own Mission
// Overview page reported "24% complete". Every ✔/count/percentage in
// this sidebar now reads window.LWMissions instead (see
// missionForSidebarCategory()/isSignLearnedInMission(), just below),
// specifically so it can't silently disagree with the mission page a
// learner just came from. The per-unit "X%" badge sums
// doneItems/totalItems across every live category's own mission —
// the EXACT same fraction mission-overview.js's getMissionProgress()
// computes for a single-category unit, not a re-derived sign-only
// approximation of it — so a single-category unit's badge here and
// that category's own mission page always show the identical number.

// ICON MIGRATION — the two emoji lookup tables that used to live here
// (UNIT_ICONS and CATEGORY_ICONS, ~45 lines of hand-picked emoji, copied
// verbatim between this file and js/learn.js) are GONE. They were one of
// three competing icon systems for the same categories — see
// LinguaWave_Icon_Audit.md section 2. Every id they keyed on is now an id
// in the single shared set in js/icons.js, so the lookup table itself was
// redundant: window.LWIcons.markup(cat.id) IS the lookup.
//
// Two consequences worth knowing before you re-add a map here:
//   1. There is no longer a silent fallback. The old code ended in a
//      bookmark-emoji default, so any unmapped category quietly rendered
//      an icon that looked deliberate. An unknown id now renders a
//      visible placeholder and warns in the console (LWIcons.missing()).
//   2. Unit ids and category ids share one namespace in js/icons.js, so a
//      unit and its category can no longer drift apart the way these two
//      maps did (they disagreed on `sequence`, `answers` and
//      `basic_phrases` before this change).

// Which unit (by `order`) this page is currently inside, so the
// sidebar can auto-expand it. Mirrors updateLessonMeta()'s own
// categoryMeta lookup below (isNameDrill -> Unit 2's fixed order,
// else the current sign's own CATEGORIES.unit field).
function currentUnitOrder() {
  if (isNameDrill) return 2;
  return window.LWMissions?.getCategory?.(level, category)?.unit ?? null;
}

// MISSION PROGRESS SYNC (this revision) — the course sidebar used to
// compute every checkmark and every X%/X-of-Y count from V1's
// window.LWProgress (recordSignPracticed()'s own separate store,
// "every sign ever practiced via camera"). That's a real, different
// number from the SAME category's Mission Overview page, which reads
// window.LWMissions (getMissionProgress() — chapter-gated LESSON/
// BOOSTER/PRACTICE/QUIZ items actually marked complete). The two
// stores were tracking genuinely different things, so a category
// could show e.g. "86%" here while mission-overview.html reported
// "24% complete" for that identical mission. The sidebar now reads
// window.LWMissions instead, so its numbers agree with the mission
// page a learner just came from (or is about to jump to).
//
// missionForSidebarCategory() returns null for any categoryId with
// no live mission yet (comingSoon ids, 'fingerspell_name', Phrasebook's
// reference categories) — every caller below already treats a null
// mission the same as "nothing done", matching the sidebar's old
// zero-progress fallback for those same ids.
function missionForSidebarCategory(categoryId) {
  return window.LWMissions?.getMissionForCategory?.(categoryId) ?? null;
}

// A sign counts as "done" in the sidebar once its own LESSON item is
// complete — the exact same rule mission-overview.js's isSignLearned()
// uses for a chip's green state, so a ✔ here and a green chip there
// never disagree about the same sign.
function isSignLearnedInMission(mission, signId) {
  if (!mission) return false;
  const index = mission.items.findIndex((item) => item.kind === 'LESSON' && item.signId === signId);
  if (index === -1) return false;
  return window.LWMissions.isItemComplete(mission, index, mission.items[index]);
}

// Unique sign ids, in the order they first appear in the mission's
// own item sequence — the exact same walk mission-overview.js's
// signsInMission() does, kept as its own small local copy per this
// file's existing pattern of re-deriving small pieces of shared logic
// (see e.g. SAMPLE_MASTERY_QUIZ_CHAPTERS's own header note elsewhere
// in this codebase for why). This is deliberately NOT the same array
// as this page's own `signOrder` (window.LWMissions.getCategorySigns() —
// V1 content) — gating below needs the identical order the mission's
// own completedItemIds/isItemComplete() actually track against, not
// V1's, so it can't silently disagree with mission-overview.js about
// which sign comes "before" which.
function missionSignOrder(mission) {
  if (!mission) return [];
  const seen = new Set();
  const out = [];
  mission.items.forEach((item) => {
    if (item.signId && !seen.has(item.signId)) {
      seen.add(item.signId);
      out.push(item.signId);
    }
  });
  return out;
}

// SEQUENTIAL SIGN GATING (this revision) — mirrors mission-overview.js's
// own isSignAccessible() call-for-call, against the identical
// mission.items order (missionSignOrder() above), so this page's own
// boot()-guard/course-sidebar and that page's chips never disagree
// about which signs count as "pending". A sign already learned is
// always accessible; the mission's first sign (or any signId this
// mission doesn't track an order position for) is never gated.
function isSignAccessible(mission, signId) {
  if (!mission) return true; // no live mission for this category -> nothing to gate
  if (isSignLearnedInMission(mission, signId)) return true;
  const order = missionSignOrder(mission);
  const idx = order.indexOf(signId);
  if (idx <= 0) return true;
  return order.slice(0, idx).every((prevId) => isSignLearnedInMission(mission, prevId));
}

function sidebarSignRow(cat, signId, mission, missionLocked) {
  const signData = window.LWMissions?.getSign?.(cat.level, signId);
  const label = signData?.title ?? signId;
  const done = isSignLearnedInMission(mission, signId);
  const isCurrent = !isNameDrill && cat.id === category && signId === sign;

  // LOCKED/PENDING SIGN GATING (this revision) — a row only renders
  // as a real `<a href>` once BOTH gates below pass: the category's
  // own mission isn't chapter-locked (`missionLocked`, passed down
  // from sidebarCategoryBlock()), AND this specific sign is reachable
  // in the mission's own order (isSignAccessible() above). Either
  // failure renders a plain, non-navigable <span> instead — same
  // "hoverable, not clickable" split as mission-overview.js's own
  // `.sign-chip--locked`/`.sign-chip--pending` chips, and deliberately
  // labeled with the same two distinct reasons/classes so the two
  // pages read consistently. This is what actually stops a locked/
  // pending sign from being reachable via the sidebar — this page's
  // own boot() guard (window.LWMissions.getMissionStatus() +
  // isSignAccessible()) is the matching direct-URL backstop.
  const accessible = !missionLocked && isSignAccessible(mission, signId);
  if (!accessible) {
    const pending = !missionLocked; // mission is open, just this sign isn't reached yet
    const reason = pending
      ? 'Locked: finish the earlier signs in this mission first'
      : 'Locked: finish Chapter 1 and Chapter 2 to unlock this one';
    const stateClass = pending ? ' course-sidebar__sign--pending' : ' course-sidebar__sign--locked';
    return `<span class="course-sidebar__sign${stateClass}" aria-disabled="true" title="${reason}">` +
      `<span class="course-sidebar__sign-icon">${window.LWIcons.markup('locked', { size: 'status' })}</span>` +
      `<span class="course-sidebar__sign-label">${escapeHtml(label)}</span>` +
    `</span>`;
  }

  const href = `camera-practice.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(signId)}`;
  const stateClass = isCurrent ? ' course-sidebar__sign--current' : (done ? ' course-sidebar__sign--done' : '');
  // Status glyphs were plain text characters that rendered at a
  // different weight and baseline on every OS/font. The colour rules
  // in css/lesson.css key off the row's state class and still apply —
  // these icons inherit them through currentColor.
  const icon = window.LWIcons.markup(
    isCurrent ? 'current' : (done ? 'complete' : 'not_started'),
    { size: 'status' }
  );
  return `<a class="course-sidebar__sign${stateClass}" href="${href}">` +
    `<span class="course-sidebar__sign-icon">${icon}</span>` +
    `<span class="course-sidebar__sign-label">${escapeHtml(label)}</span>` +
  `</a>`;
}

// One category's slice of the sidebar. `opts.multiCategory` is true
// for units with more than one live category (today: Common Things &
// People, Phrasebook) — those get their own collapsible sub-row,
// expanded only when it's the category the learner is actually inside
// (clicking any OTHER category jumps straight to its first
// not-yet-done sign, same "continue where you left off" target
// dashboard.js's renderContinueButton() already computes). Units with
// exactly one live category (the common case) skip the category row
// entirely and list its signs directly — matches js/learn.js's own
// "units with exactly one category skip the picker screen" rule.
function sidebarCategoryBlock(cat, opts) {
  const signs = window.LWMissions.getCategorySigns(cat.level, cat.id);
  if (signs.length === 0) return '';
  const mission = missionForSidebarCategory(cat.id);
  const missionLocked = !!mission
    && window.LWMissions.getMissionStatus(mission, window.LWMissions.getAllMissions()) === 'locked';

  if (!opts.multiCategory) {
    return signs.map(s => sidebarSignRow(cat, s, mission, missionLocked)).join('');
  }

  // A chapter-locked category's head also shouldn't jump straight
  // into a sign the way the normal `<a>` below does — render it the
  // same non-navigable way the individual rows render while
  // `missionLocked`, rather than linking to a sign boot() would just
  // bounce the learner straight back out of anyway.
  if (missionLocked) {
    const icon = window.LWIcons.markup(cat.id);
    return `<div class="course-sidebar__cat">` +
      `<span class="course-sidebar__cat-head course-sidebar__cat-head--locked" aria-disabled="true" title="Locked: finish Chapter 1 and Chapter 2 to unlock this one">` +
        `<span class="course-sidebar__cat-icon">${icon}</span>` +
        `<span class="course-sidebar__cat-title">${escapeHtml(cat.title)}</span>` +
        `<span class="course-sidebar__cat-count">${window.LWIcons.markup('locked', { size: 'status' })}</span>` +
      `</span>` +
    `</div>`;
  }

  const doneCount = signs.filter(s => isSignLearnedInMission(mission, s)).length;
  const isCurrentCat = !isNameDrill && cat.id === category;
  const icon = window.LWIcons.markup(cat.id);
  // Jump target is the first sign that's both unlearned AND actually
  // reachable — not just the first unlearned one — so this link never
  // lands on a sign this same render pass would itself show as
  // pending underneath it.
  const targetSign = signs.find(s => !isSignLearnedInMission(mission, s) && isSignAccessible(mission, s)) || signs[0];
  const catHref = `camera-practice.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(targetSign)}`;
  const rows = isCurrentCat ? signs.map(s => sidebarSignRow(cat, s, mission, missionLocked)).join('') : '';

  return `<div class="course-sidebar__cat${isCurrentCat ? ' course-sidebar__cat--open' : ''}">` +
    `<a class="course-sidebar__cat-head" href="${catHref}">` +
      `<span class="course-sidebar__cat-icon">${icon}</span>` +
      `<span class="course-sidebar__cat-title">${escapeHtml(cat.title)}</span>` +
      `<span class="course-sidebar__cat-count">${doneCount}/${signs.length}</span>` +
    `</a>` +
    (isCurrentCat ? `<div class="course-sidebar__signs">${rows}</div>` : '') +
  `</div>`;
}

// ── Sidebar fallback (Design pass, 2026-08-23) ──────────────────────
// PIVOT_CHECKLIST.md "Design pass — learn.html/lesson.html sidebar not
// yet matching dashboard", gap #4. Mirrors js/learn.js's
// showLearnUnavailable() (same session) — same "only window.LWMissions is a
// hard requirement, LWProgress calls already degrade gracefully via
// `?.`/`?? default`" reasoning applies here too (see every
// `window.LWProgress?.` call below). Reuses css/style.css's
// `.alert`/`.alert--error` via css/lesson.css's `.sidebar-fallback-alert`
// sizing tweak, not a new error style.
function showSidebarUnavailable(el, reason) {
  console.error('[lesson.js] course sidebar cannot render. Reason:', reason);
  // FIX (V1-removal pass) — was "../pages/learn.html" (V1's page,
  // now deleted); this page now lives in the same folder as
  // learn.html, so the link is same-folder.
  el.innerHTML = `<div class="alert alert--error sidebar-fallback-alert">Couldn't load the course outline. <a href="learn.html">Go to Learn</a> or reload.</div>`;
}

// NEW (this session) — single delegated listener that makes
// markCurrentSignPracticed() (setupNavButtons(), module scope above)
// fire for EVERY way a learner can leave the current sign, not just
// the Prev/Next/Finish buttons. #course-sidebar's rows are plain
// `<a href>` navigations (sidebarSignRow()/renderCourseSidebar()
// above) — clicking one leaves this page directly without ever
// touching btnPrev/btnNext, so without this, a sign a learner only
// reached via a sidebar link (never clicked Next on) never got
// recorded. It only ever writes at the moment the learner actually
// clicks away, so stored progress never races ahead of the visible
// page state.
// Attached once per page load (guarded by the dataset flag below) —
// #course-sidebar itself is never replaced, only its innerHTML is
// re-rendered, so a listener on the container survives every
// renderCourseSidebar() re-render via normal event delegation.
function wireSidebarProgressCapture(el) {
  if (!el || el.dataset.progressCaptureWired === 'true') return;
  el.dataset.progressCaptureWired = 'true';
  el.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    // Fires synchronously before the browser follows the link's
    // normal href navigation — no preventDefault, nothing async, so
    // it can't delay or interfere with the click itself.
    markCurrentSignPracticed();
  });
}

function renderCourseSidebar() {
  const el = document.getElementById('course-sidebar');
  if (!el) return;
  wireSidebarProgressCapture(el);
  // Design pass, 2026-08-23: previously `if (!el || !window.LWMissions)
  // return;` — a missing LWData silently left whatever was already in
  // #course-sidebar (this session's new static "Loading course
  // outline…" placeholder, pages/camera-practice.html) up forever, with no
  // explanation. Same failure mode + same fix as js/learn.js's matching
  // guard this session.
  if (!window.LWMissions) {
    showSidebarUnavailable(el, 'window.LWMissions did not load');
    return;
  }

  try {
    const units = window.LWMissions.getUnits();
    const curUnitOrder = currentUnitOrder();

    el.innerHTML = units.map(unit => {
      const icon = window.LWIcons.markup(unit.id);
      const isCurrentUnit = unit.order === curUnitOrder;

      // HOMEPAGE PIVOT (this session) — the old kind==='info' branch
      // (Unit 0, linking to learn.html?unit=welcome) is REMOVED: no
      // UNITS entry has kind:'info' anymore (see data.js). That intro
      // content is now pages/homepage.html, shown once right after
      // login — not a unit the sidebar needs a row for. Unit 7
      // Phrasebook browsing still lives on learn.html (its own screen,
      // untouched this session) — the sidebar still just links out to
      // it below, unchanged.
      if (unit.kind === 'interactive') {
        const href = 'camera-practice.html?level=basic&category=fingerspell_name';
        return `<a class="course-sidebar__unit course-sidebar__unit--flat${isCurrentUnit ? ' course-sidebar__unit--current' : ''}" href="${href}">` +
          `<span class="course-sidebar__unit-icon">${icon}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
        `</a>`;
      }

      // kind: 'category-group' or 'reference' (Phrasebook)
      const allCats  = window.LWMissions.getCategoriesForUnit(unit.order);
      const liveCats = allCats.filter(c => !c.comingSoon && window.LWMissions.getCategorySigns(c.level, c.id).length > 0);

      if (liveCats.length === 0) {
        return `<div class="course-sidebar__unit course-sidebar__unit--locked">` +
          `<span class="course-sidebar__unit-icon">${window.LWIcons.markup('locked', { size: 'sm' })}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">Soon</span>` +
        `</div>`;
      }

      const isReference = unit.kind === 'reference';
      const unlocked = isReference || (window.LWProgress?.isCategoryUnlocked?.(liveCats[0].level, liveCats[0].id) ?? true);
      if (!unlocked) {
        return `<div class="course-sidebar__unit course-sidebar__unit--locked">` +
          `<span class="course-sidebar__unit-icon">${window.LWIcons.markup('locked', { size: 'sm' })}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">0%</span>` +
        `</div>`;
      }

      // ITEM-based (not sign-based) on purpose — mission-overview.html's
      // own "X% complete" is doneItems/totalItems across the mission's
      // FULL item list (every sign's LESSON, plus BOOSTER/PRACTICE/QUIZ
      // items, not just one LESSON item per sign). Summing the exact
      // same numbers here, across every live category/mission in this
      // unit, is what makes this badge agree with that page's own
      // percentage instead of landing on some other, sign-only number
      // that happens to be close but not equal.
      let totalItems = 0, doneItems = 0;
      liveCats.forEach(c => {
        const m = missionForSidebarCategory(c.id);
        if (!m || !m.items.length) return;
        totalItems += m.items.length;
        doneItems  += m.items.filter((item, i) => window.LWMissions.isItemComplete(m, i, item)).length;
      });
      const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
      const open = isCurrentUnit; // only the unit the learner is inside starts expanded
      const body = liveCats.map(c => sidebarCategoryBlock(c, { multiCategory: liveCats.length > 1 })).join('');

      return `<div class="course-sidebar__unit${open ? ' course-sidebar__unit--open' : ''}${isCurrentUnit ? ' course-sidebar__unit--current' : ''}">` +
        `<button type="button" class="course-sidebar__unit-head" data-toggle-unit="${unit.order}">` +
          `<span class="course-sidebar__unit-icon">${icon}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">${pct}%</span>` +
          `<span class="course-sidebar__chevron" aria-hidden="true">${open ? '\u25be' : '\u25b8'}</span>` +
        `</button>` +
        `<div class="course-sidebar__unit-bar"><div class="course-sidebar__unit-bar-fill" style="--p:${pct}"></div></div>` +
        `<div class="course-sidebar__unit-body"${open ? '' : ' style="display:none;"'}>${body}</div>` +
      `</div>`;
    }).join('');

    // Delegated per-unit collapse/expand — rebound every render since
    // innerHTML above is rebuilt from scratch each time updateLessonMeta()
    // runs (e.g. Prev/Next never actually reloads the WHOLE page's JS —
    // wait, it does: navUrl() uses window.location, a real navigation —
    // so in practice this only ever runs once per page load, same as
    // everything else in boot(). Kept as a fresh query+bind rather than
    // a cached reference purely for readability, not because it's
    // called more than once today.
    el.querySelectorAll('[data-toggle-unit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap    = btn.closest('.course-sidebar__unit');
        const body    = wrap?.querySelector('.course-sidebar__unit-body');
        const chevron = wrap?.querySelector('.course-sidebar__chevron');
        if (!wrap || !body) return;
        const nowOpen = wrap.classList.toggle('course-sidebar__unit--open');
        body.style.display = nowOpen ? '' : 'none';
        if (chevron) chevron.textContent = nowOpen ? '\u25be' : '\u25b8';
      });
    });
  } catch (e) {
    // Design pass, 2026-08-23: belt-and-suspenders, same reasoning as
    // js/learn.js's matching try/catch this session. window.LWMissions IS
    // guarded above, but a future data.js shape change or an
    // unexpected unit/category combo throwing partway through this
    // render shouldn't leave a half-built or stale sidebar up with
    // only a silent console error.
    showSidebarUnavailable(el, 'render threw: ' + (e && e.message));
    return;
  }

  scrollCourseSidebarToCurrent(el);
}

// ALWAYS CENTRE THE CURRENT SIGN (this session) — reported: the sidebar
// didn't follow the lesson; the learner had to scroll it to find the row
// matching the title they're looking at.
//
// History, kept because it's why this looks the way it does. An earlier
// BUGFIX reported: "when choosing course from sidebar it refreshed
// everything and goes to default state... the scroll goes back from
// beginning." Root cause: every row in #course-sidebar is a plain
// <a href="camera-practice.html?..."> by design (see the COURSE SIDEBAR
// banner comment above boot() — full page nav, same as Prev/Next), so a
// click is a real navigation and the browser can't remember the old scroll
// position. That fix saved #course-sidebar's scrollTop to sessionStorage
// ('lw-course-sidebar-scroll') and restored it on the next page, and only
// centred the current row on the first visit of a session.
// The catch: the restored position won over the current row, so after a
// Next/Prev, a deep link or a click in the middle of a long unit the
// sidebar sat wherever it was last left, not on the sign being taught.
//
// Now the current row is centred on EVERY load and nothing is saved or
// restored. That still fixes the original complaint (the list never
// resets to the top — the row you clicked IS the current row on the next
// page, so it lands centred) and makes the sidebar match the lesson title.
//
// Scrolls only #course-sidebar's own box, never scrollIntoView(): that
// scrolls EVERY scrollable ancestor, so the whole PAGE jumped ~50px on load
// and tucked the lesson title under the sticky navbar (dark-mode UX pass).
// Prefers the current SIGN row: the enclosing UNIT comes first in document
// order and centring a 26-row block can push the current sign partly out of
// view. Falls back to the unit when no sign row is rendered (name drill) or
// it has no box (collapsed unit).
// Below 1200px the sidebar is stacked above the lesson with max-height:none
// (css/lesson.css), so it has nothing to scroll and this is a no-op there —
// on purpose: scrolling the PAGE to the row would push the lesson off-screen.
function scrollCourseSidebarToCurrent(el) {
  let target = el.querySelector('.course-sidebar__sign--current');
  if (!target || target.getBoundingClientRect().height === 0) {
    target = el.querySelector('.course-sidebar__unit--current');
  }
  if (!target) return;
  const t = target.getBoundingClientRect();
  const c = el.getBoundingClientRect();
  // Offset of the row inside the sidebar's scrollable (padding) box, then
  // enough scroll to put the row's midpoint at the box's midpoint. Assigning
  // scrollTop is instant — scroll-behavior:smooth in css/style.css is on
  // <html> only and isn't inherited by this element.
  el.scrollTop += (t.top - c.top - el.clientTop) - (el.clientHeight - t.height) / 2;
}


// BUG 3 FIX (preserved): check readyState so we don't miss DOMContentLoaded
// when lesson.js (type="module") loads after the event already fired.

async function boot() {
  // FIX (2026-08-21, this session — was PIVOT_CHECKLIST.md's "Locked
  // categories aren't blocked via direct URL" item, previously flagged
  // as "never explicitly decided" rather than fixed). Decided: block
  // it. Before this, `isCategoryUnlocked()` was only ever consulted by
  // learn.js (sidebar lock icons, and its own renderCategoryView()
  // deep-link guard) and by this page's own course-sidebar renderer
  // (row-level lock icons) — never as a gate on THIS page's own boot,
  // so typing e.g. `camera-practice.html?level=basic&category=numbers` before
  // passing Unit 1 loaded the full lesson (content + live camera)
  // anyway, with only the sidebar row showing a 🔒 no one necessarily
  // scrolls to see.
  //   Safe to call unconditionally, with no name-drill/reference
  // special-casing needed: isCategoryUnlocked() (progress.js) returns
  // `true` for any categoryId that isn't in the flat live-category
  // chain at all (its own `idx <= 0` fallback) — that already covers
  // 'fingerspell_name' (Unit 2, not a CATEGORIES entry), Phrasebook's
  // reference categories, and any comingSoon id, exactly the same way
  // learn.js's existing calls rely on it without special-casing them.
  //   Still client-side-only (no backend to truly enforce this either
  // way, same caveat the checklist item itself raised) — this closes
  // the UI-level gap, not a security boundary.
  if (!(window.LWProgress?.isCategoryUnlocked?.(level, category) ?? true)) {
    window.LinguaWave?.showToast?.(
      "That lesson isn't unlocked yet. Finish the one before it first.",
      'error'
    );
    // FIX (V1-removal pass) — learn.html now lives in the same
    // folder as this page (was "../pages/learn.html", V1's page,
    // now deleted). Verified safe: learn.js doesn't read the
    // ?category= param (it's inert here, same as other legacy query
    // params passed around this codebase), and it has its own
    // independent, stricter lock model (window.LWMissions.
    // isChapterUnlocked() — locked rows aren't even rendered as
    // links) — so this can't land anywhere that re-opens locked
    // content.
    window.location.replace(`learn.html?category=${encodeURIComponent(category)}`);
    return;
  }

  // MISSION LOCK SYNC (this revision) — the check above only knows
  // V1's own, looser isCategoryUnlocked() model. It says nothing
  // about window.LWMissions's real, chapter-based lock
  // (isChapterUnlocked()/getMissionStatus() — see js/missions.js's
  // "Chapter gating" block comment): a category can pass the check
  // above while its Mission is still 'locked' because an earlier
  // chapter isn't 100% done yet. Before this, that gap meant a
  // learner could reach a still-locked mission's camera practice
  // directly — either by typing the URL, or (before this revision)
  // by clicking one of mission-overview.html's dictionary chips,
  // which used to link out regardless of the mission's own lock
  // state. mission-overview.js's chips for a locked mission no
  // longer render as links at all (see render()'s `locked` branch
  // there), so this is now purely the direct-URL backstop — same
  // "closes the UI-level gap, not a security boundary" caveat as the
  // check above. Guarded so a page with window.LWMissions absent (or
  // a category/name-drill with no live mission at all — getMissionForCategory()
  // returns null for those) simply skips this and falls through.
  const lockedMission = window.LWMissions?.getMissionForCategory?.(category);
  if (lockedMission) {
    const allMissions = window.LWMissions.getAllMissions();
    if (window.LWMissions.getMissionStatus(lockedMission, allMissions) === 'locked') {
      window.LinguaWave?.showToast?.(
        'This mission is locked. Finish Chapter 1 and Chapter 2 first.',
        'error'
      );
      window.location.replace(`mission-overview.html?mission=${encodeURIComponent(category)}`);
      return;
    }

    // PENDING SIGN GUARD (this revision) — the mission can be
    // unlocked as a whole while THIS particular sign still isn't
    // reachable yet: isSignAccessible() (above) requires every
    // earlier sign in the mission's own order to be learned first,
    // the same rule mission-overview.js's chips (and this page's own
    // course-sidebar rows, see renderCourseSidebar()) already enforce
    // by simply not rendering a working link for a still-pending
    // sign. This is the direct-URL backstop for that — same "closes
    // the UI-level gap, not a security boundary" caveat as the two
    // checks above it. The name drill is exempt: computeSignOrder()
    // always gives it exactly one synthetic 'MY_NAME' entry, so it's
    // never anything but the mission's own first (and only) sign.
    if (!isNameDrill && !isSignAccessible(lockedMission, sign)) {
      window.LinguaWave?.showToast?.(
        "That sign isn't unlocked yet. Finish the earlier ones in this mission first.",
        'error'
      );
      window.location.replace(`mission-overview.html?mission=${encodeURIComponent(category)}`);
      return;
    }
  }

  // NEW — Rev4 Phase 2: totalSigns is always 1 for the name drill (see
  // computeSignOrder()), so the empty-category bail below never fires
  // for it — but a learner with no letters in their profile name (blank
  // name, or a name made entirely of characters outside A–Z) still
  // needs an honest message instead of a silently-broken camera panel.
  if (isNameDrill && getLearnerNameLetters().length === 0) {
    setStatus('We couldn\'t find any letters (A\u2013Z) to fingerspell in your profile name. Update your name and come back to this drill.', 'error');
    updateLessonMeta();
    return;
  }
  if (totalSigns === 0) {
    // Category has no functional signs yet (comingSoon) — bail out
    // of camera boot entirely and just say so.
    setStatus(`"${category}" isn't trained yet. Check back soon.`, 'error');
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

// ══════════════════════════════════════════════════════════════════
// NEW — LOCKED PRACTICE CHECK for signs with NO TRAINED DATA
// ══════════════════════════════════════════════════════════════════
// Source of truth is asl_motion_model/labels.json / asl_static_model/
// labels.json (via js/engine/training-status.js), NOT the hand-kept
// `disabled` flags in dictionary.js. If the model has no class for this
// sign, "Practice Check" can never pass it (e.g. HI was being read as the
// static letter "Y"), so the button is locked: dimmed + hover/focus
// tooltip, and clicking it opens a modal explaining the developers don't
// have the data for it yet. Fails open if labels.json can't be loaded.
// Deleting a sign's gap is automatic: add its label, retrain, and the
// lock disappears with no code change.
let practiceCheckLocked = false;
let untrainedReturnFocusEl = null;
let untrainedInfo = { model: 'motion', name: null };   // last lock details, so the startAssessment() backstop can reuse them
const untrainedModalEl = document.getElementById('untrained-modal');

async function applyPracticeCheckLock() {
  if (!startBtnEl || isNameDrill) return;
  let status;
  try {
    const sets  = await loadTrainedLabelSets();
    const steps = getPhraseSequence(sign);
    status = steps ? getSequenceTrainingStatus(steps, sets) : getSignTrainingStatus(sign, sets);
  } catch (e) {
    console.warn('[camera-practice] training-status check failed, leaving Practice Check unlocked:', e);
    return;
  }

  const lockedNoteEl = document.getElementById('practice-check-locked-note');
  const normalNoteEl = document.querySelector('.practice-check-note');
  practiceCheckLocked = !status.trained;

  if (!practiceCheckLocked) {
    startBtnEl.classList.remove('is-locked');
    startBtnEl.removeAttribute('aria-disabled');
    startBtnEl.removeAttribute('data-lock-tip');
    startBtnEl.onclick = startAssessment;
    if (lockedNoteEl) lockedNoteEl.hidden = true;
    if (normalNoteEl) normalNoteEl.style.display = '';
    return;
  }

  const modelName = status.model === 'motion' ? 'motion' : 'sign';
  const signName  = window.LWMissions?.getSign?.(level, sign)?.title ?? sign;
  const tip = 'Locked — we don\'t have trained data for this sign yet.';
  window.LWIcons.setLabel(startBtnEl, 'chapter_lock', 'Practice Check', { size: 'sm' });
  startBtnEl.classList.add('is-locked');
  startBtnEl.setAttribute('aria-disabled', 'true');
  startBtnEl.setAttribute('data-lock-tip', tip);
  untrainedInfo = { model: modelName, name: signName };
  startBtnEl.onclick = (e) => { e?.preventDefault?.(); openUntrainedModal(); };
  if (lockedNoteEl) lockedNoteEl.hidden = false;
  if (normalNoteEl) normalNoteEl.style.display = 'none';
}

function openUntrainedModal() {
  if (!untrainedModalEl) return;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('untrained-model', untrainedInfo.model);
  set('untrained-sign', `"${untrainedInfo.name || sign}"`);
  const iconEl = document.getElementById('untrained-icon');
  if (iconEl && !iconEl.firstChild) iconEl.appendChild(window.LWIcons.node('chapter_lock'));
  untrainedReturnFocusEl = document.activeElement;
  untrainedModalEl.style.display = 'flex';
  document.getElementById('untrained-ok')?.focus();
}

function closeUntrainedModal() {
  if (!untrainedModalEl) return;
  untrainedModalEl.style.display = 'none';
  untrainedReturnFocusEl?.focus?.();
  untrainedReturnFocusEl = null;
}

document.getElementById('untrained-ok')?.addEventListener('click', closeUntrainedModal);
document.getElementById('untrained-close')?.addEventListener('click', closeUntrainedModal);
untrainedModalEl?.addEventListener('click', (e) => { if (e.target === untrainedModalEl) closeUntrainedModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && untrainedModalEl && untrainedModalEl.style.display !== 'none') closeUntrainedModal();
});

function updateLessonMeta() {
  const counter = document.getElementById('lesson-counter');
  const fill    = document.getElementById('lesson-progress-fill');
  const letter  = document.getElementById('lesson-letter');
  const title   = document.getElementById('lesson-title');

  // NEW — Rev4 Phase 2: name drill gets its own counter/letter/title
  // text instead of the generic "Sign N of M" (which would read "Sign
  // 1 of 1" — technically correct but not informative for a multi-
  // letter drill) and instead of falling through to the generic
  // single-signId title logic below (which has no data.js entry to
  // read a friendly title from for 'MY_NAME').
  const nameDrillLetters = isNameDrill ? getLearnerNameLetters() : null;
  if (isNameDrill) {
    if (counter) counter.textContent = nameDrillLetters.length > 0
      ? `${nameDrillLetters.length} letters`
      : 'No name on file';
    if (fill) fill.dataset.progress = 0;
  } else {
    if (counter) counter.textContent = `Sign ${signIdx + 1} of ${totalSigns || 1}`;
    if (fill)    fill.dataset.progress = totalSigns ? Math.round(((signIdx + 1) / totalSigns) * 100) : 0;
  }

  // BUGFIX: previously always showed the raw signId (e.g. the whole
  // phrase "WHAT'S YOUR NAME?" crammed into the little "letter"
  // badge). Use the human-friendly title from data.js when we have
  // it, and only show the big single-letter badge for actual letters.
  const signDataForTitle = isNameDrill ? null : (window.LWMissions?.getSign?.(level, sign) ?? null);
  const displayTitle = signDataForTitle?.title ?? sign;
  // The big badge shows the actual character for single-character signs
  // (letters and the 0-9 numbers category) and an icon otherwise. It used
  // to show a pen emoji for the name drill and an open-hand emoji for
  // multi-character signs; those are the only two non-letter states, so
  // they get real icons at badge scale rather than font-dependent glyphs.
  if (letter) {
    if (!isNameDrill && sign.length === 1) {
      letter.textContent = sign;
    } else {
      window.LWIcons.setLabel(letter, isNameDrill ? 'fingerspell_name' : 'hand_actions', '',
        { className: 'lesson-letter__icon' });
    }
  }
  // CHANGED — used to be `sign.length === 1 ? 'Letter ${sign}' : displayTitle`,
  // which assumed every single-character signId was a letter. That broke
  // the moment the 'numbers' category (also single-character signIds,
  // '0'..'9') was added — a number would render as "Letter 3". Branch on
  // `category` instead of string length, and fall back to displayTitle
  // (data.js's own SIGNS.title, e.g. "Number 3") for every other case —
  // that's already correct and doesn't need a hardcoded prefix at all.
  const singleCharPrefix = category === 'alphabet' ? 'Letter' : category === 'numbers' ? 'Number' : null;
  if (title) {
    title.textContent = isNameDrill
      ? (nameDrillLetters.length > 0 ? `Fingerspell: ${nameDrillLetters.join(' ')}` : 'Fingerspell Your Name')
      : (singleCharPrefix ? `${singleCharPrefix} ${sign}` : displayTitle);
  }

  // NEW — Rev4 Phase 2: 'fingerspell_name' isn't a CATEGORIES entry
  // (see computeSignOrder()'s comment), so getCategory() would return
  // null and the generic subtitle line below would just print the raw
  // category id. UNITS[2] ('fingerspell_name', order 2) is the real
  // source of truth for this drill's display name — read from there
  // instead of CATEGORIES.
  const categoryMeta = isNameDrill
    ? (window.LWMissions?.getUnits?.()?.find(u => u.id === 'fingerspell_name') ?? null)
    : (window.LWMissions?.getCategory?.(level, category) ?? null);
  if (lessonSubtitleEl) {
    const label = categoryMeta?.title ?? category;
    // Level suffix ("· Basic Level" / "· Medium Level") removed per
    // explicit request — subtitle is just the category name now
    // (name-drill keeps its own "· Unit 2" label, unaffected).
    lessonSubtitleEl.textContent = isNameDrill ? `${label} · Unit 2` : label;
  }

  // Back link returns to this sign's own Mission Overview page
  // (mission-overview.html reads the same ?mission= param
  // mission-overview.js's own links use) — the equivalent of
  // what this link used to send back to on V1's learn.html grid.
  // 'fingerspell_name' has a real mission entry too (Missions covers
  // every live category), so no dashboard-fallback special-case is
  // needed here the way V1's learn.html grid required.
  const backBtnEl = document.getElementById('btn-back-to-lessons');
  if (backBtnEl) {
    backBtnEl.href = `mission-overview.html?mission=${encodeURIComponent(category)}`;
  }

  // BUGFIX (this session): recordSignPracticed() used to fire right
  // here, unconditionally, every time updateLessonMeta() ran — which
  // is the very first thing boot() calls on page load. That meant
  // clicking a sign card on learn.html was ALL it took to have that
  // sign show up back there with a ✔ / "done" badge, before the
  // learner had watched the video, tried the Practice Check, or done
  // anything at all. Reported bug: "clicking a course topic
  // automatically checks it off." The REV 3 product decision quoted
  // above this function ("viewing/opening a sign now calls
  // recordSignPracticed() immediately") is exactly what caused it —
  // "viewing" was implemented as "the page finished loading," not
  // "the learner actually looked at this."
  //
  // Fix: record practiced when the learner actually LEAVES the sign
  // (Next / Prev / Finish → Category Assessment), not when it opens.
  // That's a real engagement signal — they were on the page — instead
  // of an artifact of navigation. See setupNavButtons() below, which
  // now calls markCurrentSignPracticed() in each nav handler before
  // navigating away. isNameDrill is still exempted, same as before
  // (see that guard's own comment above).

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
      lessonTipsEl.innerHTML = signData.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }

    // Demo video — the player (<video> for local files, <iframe> for YouTube
    // embeds) is chosen from this sign's `videoUrl` in data.js. See
    // applyLessonVideo() near the top of this file.
    applyLessonVideo(signData.videoUrl);

    // NEW: link out to Lifeprint.com (ASL University) for a second,
    // authoritative reference on this sign, when we have one.
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) {
      if (signData.referenceUrl) {
        // NOTE — unlike lesson.js's camera-practice link, this one stays
        // target="_blank" + noopener: it points to an external,
        // third-party site (Lifeprint.com), so keeping window.opener
        // isolated matters more here than reusing one tab. noopener
        // defeats named-target reuse anyway (see lesson.js's
        // cameraPracticeLinkHtml for why), so there'd be nothing to
        // gain from naming this one.
        referenceEl.innerHTML =
          `${window.LWIcons.markup('phrasebook', { size: 'sm' })} <a href="${escapeHtml(signData.referenceUrl)}" target="_blank" rel="noopener noreferrer">See this sign on Lifeprint.com (ASL University)</a>`;
        referenceEl.style.display = '';
      } else {
        referenceEl.style.display = 'none';
      }
    }
  } else if (isNameDrill) {
    // NEW — Rev4 Phase 2: custom copy instead of the generic
    // "hasn't been written yet" fallback, which would be a confusing
    // (and slightly alarming) thing to show for a drill that was never
    // supposed to have a data.js entry in the first place.
    if (lessonDescriptionEl) {
      lessonDescriptionEl.textContent = nameDrillLetters.length > 0
        ? `This is the "ASDF" moment: combining letters you already know into something real. Tap "Try it" below and fingerspell your name, one letter at a time: ${nameDrillLetters.join('-')}.`
        : `We don't have any letters to drill. Your profile name doesn't contain any A–Z characters.`;
    }
    if (lessonTipsEl) {
      lessonTipsEl.innerHTML = [
        'Hold each letter clearly until it registers before moving to the next',
        'A brief pause between letters is fine. You get a fresh countdown for each one',
        'Reuses the same trained A–Z alphabet model. No new signs to learn here',
      ].map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) referenceEl.style.display = 'none';
  } else {
    if (lessonDescriptionEl) lessonDescriptionEl.textContent =
      `Lesson content for "${displayTitle}" hasn't been written yet. The camera detection still works. Try practicing the sign below.`;
    if (lessonTipsEl) lessonTipsEl.innerHTML = '';
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) referenceEl.style.display = 'none';
  }

  // REV 3 (superseded this session — see GATE note in endAssessment()
  // and continueToNext()): this used to be an optional, ungraded
  // practice check with the real assessment living in quiz.html. It's
  // now the required gate for this sign — passing it is what unlocks
  // "Continue to Next Sign." Start Recording used to be a separate
  // button/action; now clicking this one button both starts the
  // practice-check flow AND (for motion signs) triggers the 3-2-1
  // countdown + recording automatically, see showNextPrompt().
  // FIXED (2026-08-20, review session): the button's .textContent
  // ('🎥 Start Assessment') used to not match this file's own Rev 3
  // header comment, which always said it was renamed to "🎥 Practice
  // Check (optional)" — that rename never actually landed in the 4
  // places the text is set (here, pages/camera-practice.html's default markup,
  // and the two post-camera-round resets below). All 4 said
  // "🎥 Practice Check (optional)" for a while — see AI_MEMORY.md
  // Session Log for that before/after. This session dropped the
  // "(optional)" suffix from all 4 in turn, now that it no longer is.
  //
  // NEW — Rev4 Phase 2: hide this button entirely for the name drill
  // instead of wiring it to startAssessment(). handleAssessmentFrame()
  // treats phraseSteps as all-or-nothing — one wrong letter fails the
  // WHOLE attempt immediately (see that function's phrase branch) —
  // which is a bad fit for practicing a 5-8 letter name. Practice mode
  // (the "▶ Try it" button below) retries just the missed letter
  // instead, which is what this drill is actually for. Unit 2 also
  // isn't meant to have an 80%-style gate at all per Rev 4's progress
  // model section, so there's no graded assessment to route this to
  // even if the all-or-nothing behavior weren't an issue.
  if (isNameDrill) {
    if (startBtnEl) startBtnEl.style.display = 'none';
  } else {
    if (startBtnEl) window.LWIcons.setLabel(startBtnEl, 'camera', 'Practice Check', { size: 'sm' });
    // BUG 5 FIX: use .onclick assignment (idempotent) instead of
    // addEventListener, which stacks duplicate listeners if called twice.
    if (startBtnEl) startBtnEl.onclick = startAssessment;
    applyPracticeCheckLock();   // async; re-locks the button once labels.json is read
  }

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

  // NEW — course-player merge (this session): render the persistent
  // sidebar. Placed here (not inside boot() directly) because
  // updateLessonMeta() is the one function all three boot() paths
  // already call — including the two early-return branches (empty
  // name-drill, comingSoon category) — so the sidebar still renders
  // even when the camera/content half of the page bails out early.
  renderCourseSidebar();
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
  return `camera-practice.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}&sign=${encodeURIComponent(targetSign)}`;
}

// BUGFIX (this session, paired with the removed call in
// updateLessonMeta() above): the single place recordSignPracticed()
// now fires from. Still skips the name drill for the same reason
// the old call site did (see that guard's comment) — this drill has
// its own recordUnitAssessment() completion signal elsewhere.
//
// MOVED to module scope (earlier session) — was a closure private to
// setupNavButtons(), so only Prev/Next/Finish could call it. Now
// wireSidebarProgressCapture() (near renderCourseSidebar()) shares
// this exact same function for sidebar-link exits.
//
// GATE (this session): this used to be an independent completion
// writer — it recorded a sign as done just because the learner
// navigated away from it (Finish → Category Assessment, or a
// sidebar-link click), with no regard for whether a Camera Practice
// check had ever been attempted, let alone passed. That was a real
// bypass of the "must pass the camera check to advance" rule:
// skipping the check entirely and clicking Finish still gave full
// credit. Completion is now written in exactly ONE place —
// endAssessment(), and only on a pass (see PASS_THRESHOLD above). So
// this function no longer creates completion; it only re-confirms
// bookkeeping (LWProgress's practicedAt / the mission bridge, both
// idempotent) for a sign that has ALREADY passed — a safe no-op for
// any sign that hasn't, which is what actually closes this bypass.
function markCurrentSignPracticed() {
  if (isNameDrill) return;
  const mission = missionForSidebarCategory(category);
  if (!isSignLearnedInMission(mission, sign)) return; // not passed — nothing to record
  window.LWProgress?.recordSignPracticed?.(level, category, sign);
  // BRIDGE — see markSignPracticedBridge() comment in missions.js.
  window.LWMissions?.markSignPracticedBridge?.(category, sign);
}

function setupNavButtons() {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (btnPrev) {
    if (signIdx <= 0) {
      btnPrev.setAttribute('disabled', '');
    } else {
      // Pure navigation — no markCurrentSignPracticed() here. Moving
      // to an adjacent, already-available sign shouldn't itself write
      // progress; see the matching note on the "Next Sign" branch
      // below for why.
      btnPrev.onclick = () => {
        shutdown();
        window.location = navUrl(signOrder[signIdx - 1]);
      };
    }
  }

  if (btnNext) {
    const isLast = signIdx >= totalSigns - 1;
    if (isNameDrill) {
      // NEW — Rev4 Phase 2: 'fingerspell_name' has no CATEGORIES entry,
      // so quiz.html's buildScope() would find nothing to assess and
      // just show its empty-state message — not broken, but not the
      // right destination either, since Unit 2 has no graded assessment
      // by design (see the Start Assessment button note above). Route
      // back to the dashboard instead.
      btnNext.textContent = 'Back to Dashboard →';
      btnNext.onclick = () => {
        shutdown();
        // FIX (V1-removal pass) — was "../pages/dashboard.html"
        // (V1's page, now deleted); same-folder now.
        window.location = 'dashboard.html';
      };
    } else if (isLast) {
      // REV 3: the graded check is now the category assessment page,
      // not this in-lesson camera round.
      // GATE (this session): markCurrentSignPracticed() below no
      // longer completes this sign just because Finish was clicked —
      // it only reconfirms one that already passed (see its own
      // comment). Clicking Finish without ever passing the camera
      // check still goes to the Mastery Quiz (unchanged below) — that
      // mirrors the same "skip path" the Mastery Quiz already offers
      // everywhere else in the app (see markMissionComplete()'s
      // comment in missions.js): it's allowed to leave this LESSON
      // item incomplete, it just won't get credit for it.
      // V1-removal pass: pages/quiz.html is deleted (all 12 chapters
      // now use the native Mastery Quiz — see lesson.js/mission-overview.js's
      // SAMPLE_MASTERY_QUIZ_CHAPTERS); route there instead, same-folder.
      btnNext.textContent = 'Finish → Category Assessment';
      btnNext.onclick = () => {
        markCurrentSignPracticed();
        shutdown();
        window.location = `mastery-quiz.html?mission=${encodeURIComponent(category)}`;
      };
    } else {
      // CHANGED (this session) — two things changed on this branch:
      //
      // 1. Pure navigation — neither outcome below calls
      //    markCurrentSignPracticed() any more. It used to fire
      //    unconditionally, so a learner could rack up "practiced"
      //    progress just by clicking through without watching or
      //    engaging with a sign at all. Real progress is now only
      //    recorded by an actual engagement signal — the Practice
      //    Check camera round (see the quizSigns.forEach() block later
      //    in this file) — or by "Finish → Category Assessment" above,
      //    a genuine milestone (leaving the lesson for the graded
      //    quiz), not just paging between signs.
      //
      // 2. "Next Sign →" only stays pure navigation when signOrder[signIdx+1]
      //    is actually reachable in THIS mission right now. Two
      //    separate ways that can fail, both checked below:
      //
      //    a) NOT TRACKED — the next sign in this page's own signOrder
      //       (window.LWMissions.getCategorySigns() — data.js's full
      //       content list) isn't in missionSignOrder(mission) at all
      //       (missions.js's own, independently forked sign list —
      //       see the block comment on missionSignOrder() above). E.g.
      //       data.js's 'people' category has 14 signs (…, Boy, Girl,
      //       Baby) while missions.js's copy only tracks 11 (…,
      //       Student) — advancing signIdx+1 past Student would walk a
      //       learner into content the mission has no LESSON item for
      //       at all: no chip, no progress credit, a dead end.
      //
      //    b) PENDING — the next sign IS tracked, but isSignAccessible()
      //       (the same sequential gate boot()'s own guard enforces,
      //       and the exact thing (1) above just stopped auto-
      //       satisfying) says it isn't reachable yet, because an
      //       earlier sign in the mission's own order isn't marked
      //       learned. This is now a REAL, common case post-(1): a
      //       learner who pages through with plain Next/Next/Next and
      //       never does a Practice Check never marks any LESSON item
      //       complete, so the very next sign can be "pending" on the
      //       very next click. Before this fix, clicking through
      //       anyway would silently hand off to boot()'s own guard,
      //       which redirects to Mission Overview with a toast — a
      //       confusing dead end reached by clicking the button
      //       literally labeled "Next." Caught here instead, before
      //       the click ever fires a doomed navigation.
      //
      //    Either way, swap the button for a way back INTO the mission
      //    instead of a navigation that can't actually succeed.
      const nextSignId = signOrder[signIdx + 1];
      const mission = missionForSidebarCategory(category);
      const nextAvailable = !mission || (
        missionSignOrder(mission).includes(nextSignId) &&
        isSignAccessible(mission, nextSignId)
      );
      if (!nextAvailable) {
        // lesson.html resumes at window.LWMissions.getDropOffIndex(mission)
        // — the learner's real next incomplete step in the mission —
        // not from scratch, so this genuinely continues them, it
        // doesn't restart them. In the (b) PENDING case, that drop-off
        // point is very likely the CURRENT sign itself (its own LESSON
        // item is exactly what's missing) — so this hands them
        // straight back into the guided lesson flow for the content
        // they were just looking at, not somewhere random.
        window.LWIcons.setLabel(btnNext, 'continue_mission', 'Continue Mission', { size: 'sm' });
        btnNext.onclick = () => {
          shutdown();
          window.location = `lesson.html?mission=${encodeURIComponent(category)}`;
        };
      } else {
        btnNext.textContent = 'Next Sign →';
        btnNext.onclick = () => {
          shutdown();
          window.location = navUrl(nextSignId);
        };
      }
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
    setFaceWarn(`Hand/face tracking failed to load. Sign detection is disabled until this recovers. (${getModelError() ?? 'unknown error'})`);
  }

  let classifierLoaded = false;
  try {
    await loadModels();
    classifierLoaded = true;
    const motionErr = getMotionModelError();
    if (motionErr) {
      setClassifierWarn(
        'Motion model failed to load. Motion signs cannot be detected. ' +
        'Check that /asl_motion_model/model.json exists. (' + motionErr + ')'
      );
    }
  } catch (err) {
    console.error('[lesson.js] Classifier failed to load — camera still running:', err);
    setClassifierWarn('Sign classifier failed to load. Camera is live but detection is disabled. Check the console for details (Keras 3 issue).');
  }

  // FIX (2026-08-21, earlier session): stamp both to "now" right before
  // the loop that actually reads them starts, so a stale module-load-
  // time timestamp can't fire either warning on frame one. Still not
  // enough on its own to give the learner a real chance to get in
  // frame — see the WARM-UP GRACE comment above FACE_WARN_HOLD_MS's
  // declaration for why (this session's fix, directly below).
  lastFaceSeenAt = Date.now();
  lastHandSeenAt = Date.now();

  // THIS SESSION'S FIX (2026-08-22 — PIVOT_CHECKLIST.md §16 "camera
  // warning state" item): arm the longer warm-up grace window so
  // startRenderLoop()'s hold-time checks use INITIAL_WARMUP_MS instead
  // of the tight 600/400ms constants until either a hand/face is
  // actually seen or INITIAL_WARMUP_MS elapses, whichever comes first
  // — see the loop below, which clears `warmingUp` the moment either is
  // detected. Not applied to startAssessment()'s own timestamp reset
  // (BUG 11 FIX, further down this file) — that one fires when the
  // camera is already live and the learner already got through boot,
  // a much lower-risk moment than a fresh page load, so it keeps the
  // existing tight behavior unchanged to keep this fix narrowly scoped
  // to the bug actually reported.
  warmingUp = true;
  clearTimeout(warmupTimer);
  warmupTimer = setTimeout(() => { warmingUp = false; }, INITIAL_WARMUP_MS);

  // Camera Tips reminder: only count attempts once detection can
  // actually work (see the hooks block near the assessment state).
  attemptTrackingReady = isModelReady() && classifierLoaded;

  startRenderLoop();
}

// ── Main detection render loop ─────────────────────────────────────

function startRenderLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);

    if (!videoEl || videoEl.readyState < 2) return;

    const { leftHandLandmarks, rightHandLandmarks, faceLandmarks, poseLandmarks, anyHandPresent } = processFrame(videoEl);
    const handsForDrawing = [leftHandLandmarks, rightHandLandmarks].filter(Boolean);
    const now = Date.now();

    if (handsForDrawing.length > 0) { lastHandSeenAt = now; lastHandCount = handsForDrawing.length; }
    if (faceLandmarks)              lastFaceSeenAt = now;
    // THIS SESSION'S FIX: end the warm-up grace early once the learner
    // is actually visible, so a quick starter isn't held to the full
    // window and a later genuine drop-out still gets the tight 600/
    // 400ms debounce, not the multi-second warm-up allowance.
    if (warmingUp && (handsForDrawing.length > 0 || faceLandmarks)) {
      warmingUp = false;
      clearTimeout(warmupTimer);
    }

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
    // THIS SESSION'S FIX: use the longer INITIAL_WARMUP_MS window while
    // warmingUp is armed, falling back to the normal tight constants
    // once it's cleared (early, on first detection, or after it times
    // out) — see the WARM-UP GRACE comment near this file's top.
    const handLostForAWhile = now - lastHandSeenAt > (warmingUp ? INITIAL_WARMUP_MS : HAND_STATUS_HOLD_MS);
    setHandStatus(handLostForAWhile ? 0 : lastHandCount);

    // BUG 7 FIX: face-relative detection needs the whole head in frame.
    // BUG 11 FIX: same hysteresis — don't flash the warning on a single
    // dropped face-detection frame, only on a sustained loss.
    if (isModelReady()) {
      const faceHoldMs = warmingUp ? INITIAL_WARMUP_MS : FACE_WARN_HOLD_MS;
      setFaceWarn(
        now - lastFaceSeenAt > faceHoldMs
          ? 'Face not detected. Step back so your whole head is visible.'
          : ''
      );
    }

    // Camera Tips reminder: bookkeeping for a "try" at a static sign
    // (see the hooks block). Reports only when a whole try has ended.
    trackStaticTry(now, !!anyHandPresent);

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
          const forced = finalizeMotionWindow(getActiveAllowedLabels(), getActiveSignId());
          motionArmed = false;
          handLostSinceArmedAt = null;

          if (forced) {
            // Enough real frames were captured to make a fair (if
            // padded) guess — treat exactly like a normal completed
            // window so scoring/logging/UI all stay consistent.
            logDetection(forced.label, forced.confidence, forced.matched ? 'success' : 'fail');
            setMotionStatus(forced.matched ? 'success' : 'fail', forced.label);
            noteMotionPracticeOutcome(forced);
            updateConfidenceUI(forced);
            if (mode === 'practice') handlePracticeFrame(forced);
            else if (mode === 'assessment') handleAssessmentFrame(forced);
          } else {
            // Too little real motion captured to guess fairly — tell
            // the user plainly what happened instead of a vague fail.
            setMotionStatus('hand-lost');
            noteMotionPracticeOutcome(null);
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
        result = classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels(), poseLandmarks, getActiveSignId());

        if (!result.buffering) {
          // A window just finished (matched or rejected) — this is a
          // conclusive result now (single-window match, see
          // classifier.js), so the recording session always ends here.
          motionArmed = false;
          logDetection(result.label, result.confidence, result.matched ? 'success' : 'fail');
          setMotionStatus(result.matched ? 'success' : 'fail', result.label);
          noteMotionPracticeOutcome(result);
        }
      }
      updateMotionBuffer();
    } else {
      result = classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels(), poseLandmarks, getActiveSignId());
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
    motionBufEl.style.setProperty('--p', '0');
    return;
  }

  const { elapsedMs, durationMs, progress } = getMotionBufferStatus();
  motionBufEl.style.setProperty('--p', String(Math.round(progress * 100)));

  if (motionStatusLabelEl && elapsedMs > 0) {
    const elapsedSec  = (elapsedMs / 1000).toFixed(1);
    const durationSec = (durationMs / 1000).toFixed(1);
    motionStatusLabelEl.textContent = `Recording: ${elapsedSec}s / ${durationSec}s. Keep signing!`;
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
      motionStatusLabelEl.textContent = 'Recording: perform the sign now';
      break;
    case 'success':
      window.LWIcons.setLabel(motionStatusLabelEl, 'success', `Detected "${label}"`, { size: 'sm' });
      break;
    case 'fail':
      motionStatusLabelEl.textContent = label
        ? `Wasn't confident enough (saw "${label}")`
        : 'No clear motion detected';
      break;
    case 'hand-lost':
      // NEW: shown when the hand left frame with too little of the
      // sign captured to even guess — see HAND_LOST_GRACE_MS handling
      // in the render loop. Explicit and actionable, unlike the old
      // silent hang.
      window.LWIcons.setLabel(motionStatusLabelEl, 'warning',
      'Hand left the frame too soon. Keep it up until recording finishes, then try again', { size: 'sm' });
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
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
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
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
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

  const icon = window.LWIcons.markup(FEEDBACK_ICONS[kind] || 'info',
    { size: 'status', className: `lw-icon--tone-${kind === 'success' ? 'success' : kind === 'confirming' ? 'info' : 'error'}` });
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
        showFeedback(`Detected "${result.label}". Try "${expectedStep}" again`, 'error');
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
      showFeedback(`Got it, next: "${phraseSteps[phraseStepIdx]}"`, 'success');
      setTimeout(() => startPhraseStep(), PHRASE_STEP_DELAY);
      return;
    }

    enterCooldown(1200);
    if (isMotion) resetMotionBuffer();
    showFeedback('Phrase complete!', 'success');
    reportPassedAttempt(sign);
    // NEW (this session) — Fingerspell-as-assessment. This drill is
    // deliberately forgiving (a wrong letter retries that step instead
    // of failing the attempt — see the comment above this block), so
    // there's no separate strict/lenient distinction to make here:
    // reaching this line at all means the whole name was signed
    // correctly, letter by letter. That's the pass condition.
    // isNameDrill-only guard: sequence_demo's phrase completions
    // (MOM_HOME etc.) go through this exact same code path and must
    // NOT be treated as clearing the fingerspell gate.
    if (isNameDrill) {
      window.LWProgress?.recordUnitAssessment?.('fingerspell_name', { score: 1, passed: true });
    }
    phraseSteps = null;
    return;
  }

  // ── existing non-phrase logic, unchanged below ──
  const isMotion = getDetectionType(sign) === 'motion';

  // BUG FIX (2026-08-20, review session): result.matched only means
  // "the classifier is confident about SOME sign in this category" —
  // it was never compared against `sign`, the sign THIS lesson page
  // is teaching. Without this check, confidently signing the wrong
  // letter (e.g. K while on the Letter A page) showed a false
  // "✅ Nice! Detected: K" success message.
  const isCorrectSign = result.label === sign;

  if (result.matched && !cooldown) {
    if (!isCorrectSign) {
      // Forgiving, same spirit as the phrase-mode retry message above:
      // this is free PRACTICE mode (the "Try it" button / passive
      // detection outside an active Practice Check attempt), not the
      // graded Practice Check itself — see startAssessment()/
      // handleAssessmentFrame() for that. Free practice stays
      // ungated on purpose even after this session's GATE change, so
      // a wrong guess here is still informational, not a fail state —
      // just don't claim success.
      // enterCooldown() throttles this to roughly once per 800ms
      // instead of re-firing every render-loop frame the wrong sign
      // stays in view.
      showFeedback(`Detected "${result.label}". This lesson is "${sign}"`, 'error');
      enterCooldown(800);
      debounceCount = 0;
      lastDetected  = null;
      return;
    }
    if (isMotion) {
      showFeedback(`Nice! Detected: ${result.label}`, 'success');
      enterCooldown(1200);
      resetMotionBuffer();
      debounceCount = 0;
      lastDetected  = null;
    } else {
      debounceCount++;
      if (debounceCount >= DEBOUNCE_FRAMES && lastDetected === result.label) {
        showFeedback(`Nice! Detected: ${result.label}`, 'success');
        notePracticeSuccess();
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
  // Backstop: retryLesson()/overlay buttons can reach here without going through
  // the button's own onclick — never run a check for a sign with no trained data.
  if (practiceCheckLocked) { openUntrainedModal(); return; }
  // BUG 8 FIX: word/category lessons test every sign in the category
  // in one assessment; the alphabet keeps testing just the one letter.
  quizSigns   = isCategoryAssessment ? [...signOrder] : [sign];
  quizIdx     = 0;
  score       = 0;
  missedSigns = [];
  attemptCount++;
  staticTry   = null;   // a practice try in flight doesn't carry into the check
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
    window.LWIcons.setLabel(modeBarEl, 'progress', 'Assessment Mode', { size: 'sm' });
    modeBarEl.className    = 'mode-bar mode-bar--pill mode-bar--assessment';
  }

  showNextPrompt();
}

function showNextPrompt() {
  // Camera Tips reminder: a missed prompt can just have opened it. Hold
  // the next prompt (or the results card, which is what follows the
  // last prompt) until the learner presses "Got it", so the popup never
  // stacks on the completion overlay and no prompt timer runs behind it.
  // whenClosed() runs this straight away when nothing is open.
  if (window.LWCameraTips?.isOpen?.()) {
    window.LWCameraTips.whenClosed(showNextPrompt);
    return;
  }
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
      settleAssessmentAttempt(currentSign, false);
      showFeedback('⏱ Time up, moving on', 'error');
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
      settleAssessmentAttempt(currentSign, false);
      showFeedback(`Detected "${result.label}". Expected "${expectedStep}"`, 'error');
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
        settleAssessmentAttempt(currentSign, false);
        showFeedback('⏱ Time up, moving on', 'error');
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
    settleAssessmentAttempt(currentSign, true);
    showFeedback(`Correct! (${result.confidence}%)`, 'success');
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
    settleAssessmentAttempt(currentSign, true);
    showFeedback(`Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
  } else {
    missedSigns.push({ expected: currentSign, got: result.label });
    settleAssessmentAttempt(currentSign, false);
    showFeedback(`Detected ${result.label}. Expected ${currentSign}`, 'error');
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
    window.LWIcons.setLabel(modeBarEl, 'learn', 'Practice Mode', { size: 'sm' });
    modeBarEl.className   = 'mode-bar mode-bar--pill mode-bar--practice';
  }

  // BUG 8 FIX: "Review missed signs" — only relevant/shown on fail,
  // and only meaningful for multi-sign (category) assessments.
  if (missedListEl) {
    if (!passed && missedSigns.length > 0) {
      missedListEl.innerHTML =
        `<p><strong>Review these signs:</strong></p><ul>` +
        missedSigns.map(m =>
          `<li>${escapeHtml(m.expected)}${m.got ? `: detected as ${escapeHtml(m.got)}` : ': not detected in time'}</li>`
        ).join('') +
        `</ul>`;
      missedListEl.style.display = '';
    } else {
      missedListEl.innerHTML = '';
      missedListEl.style.display = 'none';
    }
  }

  // GATE (superseded REV 3 — this session): REV 3 made this an
  // ungraded, non-blocking round ("always record the sign(s) as
  // practiced and always let the learner continue, whatever the
  // score"). Per the current product requirement, the Camera Practice
  // check is now the gate for this sign: completion is recorded, and
  // "Continue to Next Sign" is offered, ONLY on a pass. A fail records
  // nothing and only offers "Practice & Retry" — see PASS_THRESHOLD
  // above. This is the ONE place completion is written for a normal
  // (non-name-drill) sign; markCurrentSignPracticed() (Finish button /
  // sidebar-link exit, near navUrl()) no longer independently
  // completes a sign — it now only ever confirms bookkeeping for a
  // sign that got its pass right here, so there is exactly one path
  // that can complete a sign, not several that need to agree.
  if (overlayEl && finalScoreEl) {
    finalScoreEl.textContent = `${Math.round(pct * 100)}%`;
    if (finalAttemptsEl) finalAttemptsEl.textContent = `Attempt ${attemptCount}`;
    document.getElementById('overlay-result-title').textContent =
      passed ? 'Lesson Passed!' : 'Not quite yet';
    document.getElementById('overlay-result-msg').textContent =
      passed
        ? 'Nice work — you cleared the camera check. Your progress has been saved.'
        : `You scored ${Math.round(pct * 100)}% — you need at least ${Math.round(PASS_THRESHOLD * 100)}% to move on. Give it another go.`;

    const continueBtn = document.getElementById('btn-overlay-continue');
    const retryBtn    = document.getElementById('btn-overlay-retry');
    // STRICT EITHER/OR (this session): a fail no longer also offers
    // Continue — showing both implied the score didn't actually
    // matter, which is the exact bug being fixed here.
    if (continueBtn) continueBtn.style.display = passed ? '' : 'none';
    if (retryBtn)    retryBtn.style.display    = passed ? 'none' : '';

    overlayEl.style.display = 'flex';

    // Only a PASS ever writes completion. A fail must not mark the
    // sign, its mission's LESSON item, or the legacy Progress store as
    // done — see continueToNext() below for the matching read-side
    // enforcement (it re-checks this same persisted state before
    // navigating, rather than trusting that continueBtn stayed
    // hidden).
    if (passed) {
      quizSigns.forEach(s => {
        window.LWProgress?.recordSignPracticed?.(level, category, s);
        // BRIDGE — see markSignPracticedBridge() comment in missions.js.
        window.LWMissions?.markSignPracticedBridge?.(category, s);
      });
      // DAY STREAK: a PASSED camera check is a qualifying activity. Recorded here
      // (the one place a pass is decided), not in the bridge above - the bridge also
      // runs from markCurrentSignPracticed() when merely leaving an already-passed sign.
      window.LWMissions?.recordActivity?.('camera_practice');
    }
  }

  if (startBtnEl) {
    startBtnEl.style.display = '';
    window.LWIcons.setLabel(startBtnEl, 'camera', passed ? 'Practice Check' : 'Practice Check — try again', { size: 'sm' });
  }
}

// ── UI helpers ─────────────────────────────────────────────────────

// DECIDED (2026-08-21, this session — was the flagged "Detected Sign
// readout's color still doesn't check correctness" item, previously
// left unfixed pending a decision). The concern in the old flagging
// comment (below this one used to say "not a single well-defined
// concept here the way it is inside handlePracticeFrame/
// handleAssessmentFrame") turned out to already have an answer sitting
// one function above: getActiveSignId() is the exact "what sign is
// expected RIGHT NOW" resolver both handlePracticeFrame's phrase
// branch (`expectedStep`) and handleAssessmentFrame's phrase branch
// already call for precisely this purpose — it's mode-agnostic by
// construction (falls back to the plain `sign` when no phrase is
// active) and is already being read every single frame just above
// this function, in startRenderLoop(), to pick the detection type. So
// "correct for the active lesson" IS a single well-defined concept
// here after all — this just wasn't using the resolver that already
// existed.
//   The decision made: tint this readout the SAME way in both practice
// and assessment mode (no mode branch) — `matched && isCorrectSign`,
// not bare `matched`. Rationale: assessment mode already shows its own
// separate ❌ "Detected X — expected Y" feedback text when a confident
// wrong guess comes in (handleAssessmentFrame); having the readout
// directly above still glow green for that same wrong guess was
// confusing regardless of mode, not a practice-only problem — so there
// was no real case for keeping this panel "neutral" in assessment.
// matched-but-wrong now shows the same yellow/muted treatment
// (informational, not a fail state) that a matched-but-wrong result
// already got in yellow before this fix — this only changes when GREEN
// specifically is allowed to show, not the whole state machine.
function updateConfidenceUI(result) {
  if (!detectedEl || !confidenceEl || !confTextEl) return;

  if (result.label) {
    const expectedId    = getActiveSignId();
    const isCorrectSign = result.label === expectedId;
    const showAsSuccess = result.matched && isCorrectSign;
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
    // THIS SESSION'S FIX (2026-08-22 — PIVOT_CHECKLIST.md §16 "detected
    // C while teaching M is visually confusing" item): the color-
    // correctness fix above (matched && isCorrectSign) already stops a
    // confident wrong guess from glowing green, but the review flagged
    // that yellow-vs-green alone still isn't "unmistakable" — a learner
    // skimming quickly, or who can't rely on color, just saw a bare
    // wrong letter with no indication it was wrong. Only touches the
    // CONFIDENT-wrong case (matched but not the active sign); a low-
    // confidence/still-forming label is left as the bare letter, since
    // calling an in-progress attempt "not a match" before it's even
    // settled would read as premature.
    const showAsWrongMatch = result.matched && !isCorrectSign;
    detectedEl.textContent        = showAsWrongMatch ? `${result.label}, not "${expectedId}"` : result.label;
    detectedEl.style.color        = showAsSuccess ? 'var(--clr-success)' : 'var(--clr-text-muted)';
    confidenceEl.style.setProperty('--p', String(result.confidence));
    confidenceEl.style.background = showAsSuccess ? 'var(--clr-success)' : 'var(--clr-yellow)';
    confTextEl.textContent        = `${result.confidence}%`;
  } else if (motionArmed) {
    // NEW: classifyMotion() only returns a label once its ~1.3s frame
    // window completes — the whole time it's collecting, result.label
    // is null, which meant this readout just sat on a flat "– 0%" the
    // entire time. That reads as frozen even though it's actively
    // working (the thin frame-collecting bar below is the only thing
    // that moved). Show an explicit pulsing "Listening" state instead.
    window.LWIcons.setLabel(detectedEl, 'camera', 'Listening…', { size: 'sm' });
    detectedEl.style.color   = 'var(--clr-accent)';
    confidenceEl.style.setProperty('--p', '100');
    confidenceEl.style.background = 'var(--clr-accent)';
    confidenceEl.classList.add('confidence-bar-fill--pulse');
    confTextEl.textContent   = '…';
  } else {
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
    detectedEl.textContent    = '–';
    detectedEl.style.color    = 'var(--clr-text-muted)';
    confidenceEl.style.setProperty('--p', '0');
    confTextEl.textContent    = '0%';
  }
}

// FEEDBACK_ICONS lives with the other module-level declarations near the top
// of this file (search "FEEDBACK_ICONS ="), NOT here — see the BUGFIX note there.

function showFeedback(message, type) {
  if (!feedbackEl) return;
  feedbackEl.className    = `assessment-feedback assessment-feedback--${type}`;
  feedbackEl.style.display = message ? '' : 'none';
  if (!message) { feedbackEl.textContent = ''; return; }
  // setLabel(), not innerHTML: these messages interpolate model output
  // and sign ids, so the text stays a text node and only the icon is
  // markup. Nothing user- or model-supplied is ever parsed as HTML.
  window.LWIcons.setLabel(feedbackEl, FEEDBACK_ICONS[type] || 'info', message,
    { size: 'sm', className: `lw-icon--tone-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}` });
}

function setStatus(message, type) {
  if (!statusEl) return;
  if (!message) { statusEl.style.display = 'none'; return; }
  statusEl.style.display   = 'flex';
  statusEl.className       = `camera-status camera-status--${type}`;
  window.LWIcons.setLabel(statusEl, FEEDBACK_ICONS[type] || 'info', message, { size: 'sm' });
}

function setClassifierWarn(message) {
  if (!classifierWarnEl) {
    classifierWarnEl = document.getElementById('classifier-warn');
  }
  if (!classifierWarnEl) return;
  // 'warning', not 'error': the camera still runs, only detection is
  // degraded. These were all "\u26a0\ufe0f" prefixes inside the message string.
  if (message) window.LWIcons.setLabel(classifierWarnEl, 'warning', message, { size: 'sm' });
  else classifierWarnEl.textContent = '';
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
  if (message) window.LWIcons.setLabel(faceWarnEl, 'warning', message, { size: 'sm' });
  else faceWarnEl.textContent = '';
  faceWarnEl.style.display = message ? '' : 'none';
}

function setHandStatus(count) {
  if (!handStatusEl) return;
  if (count === 0) {
    handStatusEl.textContent  = 'No hand detected';
    handStatusEl.className    = 'hand-status-pill hand-status-pill--none';
  } else {
    window.LWIcons.setLabel(handStatusEl, 'hand_actions',
      count === 1 ? 'Hand detected' : 'Both hands', { size: 'status' });
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

// CHANGED: "Practice & Retry" used to only close the overlay and put the
// learner back in practice mode, so they had to find and click "Practice
// Check" again — which didn't match what the button says. It now closes the
// overlay and starts a fresh Practice Check right away. startAssessment()
// already resets quizIdx/score/missedSigns, the timers, and the prompt/score
// UI, so no separate reset is needed here. The name drill hides the Practice
// Check entirely (see the isNameDrill branch above), so it's skipped there.
window.retryLesson = function() {
  closeOverlay();
  if (isNameDrill) return;
  startAssessment();
};

// GATE, underlying-state check (this session): continueToNext() used
// to trust that it would only ever be reached by clicking a Continue
// button that was already correctly hidden on a fail. That's one
// layer (UI), not a real gate — a stale overlay, a re-shown card, or
// just calling window.continueToNext() directly from the console all
// still bypassed it. This re-derives pass/fail from the SAME
// persisted completion store boot()'s own URL/mission/pending-sign
// guards already treat as the one source of truth
// (isSignLearnedInMission() → window.LWMissions.isItemComplete()) —
// the identical check a page refresh, a typed URL, or a sidebar link
// to this same sign would be re-evaluated against — so there's no
// separate "did it actually pass" flag left lying around to go stale
// on its own.
window.continueToNext = function() {
  if (!isNameDrill) {
    const mission = missionForSidebarCategory(category);
    if (!isSignLearnedInMission(mission, sign)) {
      // Refuse the navigation and put the learner back in front of
      // the one action that can actually clear it, instead of just
      // silently doing nothing.
      if (overlayEl) {
        document.getElementById('overlay-result-title').textContent = 'Not quite yet';
        document.getElementById('overlay-result-msg').textContent =
          `You need at least ${Math.round(PASS_THRESHOLD * 100)}% on the camera check to move on. Give it another go.`;
        const continueBtn = document.getElementById('btn-overlay-continue');
        const retryBtn    = document.getElementById('btn-overlay-retry');
        if (continueBtn) continueBtn.style.display = 'none';
        if (retryBtn)    retryBtn.style.display    = '';
        overlayEl.style.display = 'flex';
      }
      return;
    }
  }

  shutdown();
  const nextIdx = signIdx + 1;
  if (nextIdx < totalSigns) {
    window.location = navUrl(signOrder[nextIdx]);
  } else {
    // REV 3: last sign in the category → the graded category assessment,
    // not straight to the dashboard.
    // V1-removal pass: pages/quiz.html is deleted — route to the native
    // Mastery Quiz instead (see the other continueToNext-style handler above).
    window.location = `mastery-quiz.html?mission=${encodeURIComponent(category)}`;
  }
};
