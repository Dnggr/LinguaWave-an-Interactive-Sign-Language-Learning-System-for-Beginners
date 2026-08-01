/*
  js/tracking/mediapipe.js — MediaPipe Holistic Tracking Module
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads MediaPipe HolisticLandmarker and extracts left-hand,
             right-hand, and face landmark data from each webcam frame.
             Returns raw landmark data ONLY — no drawing, no classification.
  CONNECTS : Imported by js/lesson.js.

  UPDATE (holistic switch — matches capture.html): capturesystem now
  uses ONE HolisticLandmarker instead of separate HandLandmarker +
  FaceLandmarker, and keeps BOTH hands (not a single "dominant" hand)
  so the exported training JSON and this live-inference pipeline stay
  in lockstep. This file mirrors capture.html's buildFeatureVec()
  exactly — same ghost-frame handling, same 130-value layout:

    [63 left-hand xyz][63 right-hand xyz][leftPresent][rightPresent]
    [handToChin][handToForehead]  = 130 values total.

  If you ever change this layout, change it in capture.html first,
  then copy the change here — the two MUST match exactly or the
  model gets inconsistent input between training and inference.
  ─────────────────────────────────────────────────────────────────

  ══════════════════════════════════════════════════════════════════
  PERF/ROBUSTNESS PASS — laggy detection + background hands
  ══════════════════════════════════════════════════════════════════

  PROBLEM 1 — "so laggy, super not optimized"
  ─────────────────────────────────────────────────────────────────
  HolisticLandmarker runs pose + full 468-point face mesh + both hands
  EVERY call. Two things were making that worse than it needed to be:

    a) delegate was hard-locked to 'CPU'. HolisticLandmarker supports
       a 'GPU' delegate that is dramatically faster on any machine with
       a real GPU (basically everything except some old/low-end
       laptops). FIX: try 'GPU' first, fall back to 'CPU' automatically
       if GPU init throws (some browsers/drivers don't support it) —
       see initMediaPipe() below.

    b) detectForVideo() was called on every single rAF tick (up to
       ~60x/sec) even though nothing useful changes that fast for a
       hand sign. FIX: added a time-based throttle (DETECT_INTERVAL_MS)
       — we now only run the actual model ~20x/sec and reuse the last
       known landmarks in between. lesson.js's render loop can still
       call processFrame() every rAF tick for smooth skeleton drawing;
       the throttle lives in here so nothing upstream has to change.

  Also see js/camera/cameraUtils.js for a matching resolution cap —
  feeding Holistic a smaller frame is the other half of this fix.

  PROBLEM 2 — "when there's many people in the background, their
  hands get detected too"
  ─────────────────────────────────────────────────────────────────
  HolisticLandmarker only ever tracks ONE person's pose, and derives
  its hand search regions from that one pose. The bug isn't that it's
  multi-person-aware and confused — it's that pose-lock itself can
  jump: if a background person is briefly more prominent/central than
  the actual learner (leans into frame, moves, etc.), Holistic can
  re-lock its single "tracked person" onto them for a frame or two,
  and their hand landmarks land in the output instead of the user's.

  Two independent filters now guard against this, both OFF by default
  (no-op) whenever we don't have enough info to judge, so they never
  make things worse, only better:

    a) FACE-PROXIMITY GATE — a hand's wrist position is checked against
       the CURRENTLY-visible face (this frame's raw face, not a
       ghost-filled one) using the same faceHeight normalization the
       feature vector already uses. A wrist implausibly far from the
       tracked face (further than MAX_HAND_FACE_RADIUS face-heights)
       is almost certainly a different person's hand and gets dropped
       for that frame. The radius is generous on purpose — wide-arm
       motion signs need room — this only catches genuinely distant
       background hands.

    b) TELEPORT GUARD — a hand's wrist position is compared frame-to-
       frame against its own last known-good position. A hand that
       "teleports" a large distance in a single frame (the signature
       of Holistic's ROI re-locking onto a different hand/person) is
       held back for JUMP_CONFIRM_FRAMES frames — we keep reporting
       the last good position (like a ghost frame) until the new
       position repeats and is confirmed as real movement, not a
       one-frame mis-lock.
  ══════════════════════════════════════════════════════════════════

  LANDMARK INDICES (0–20) — hand:
    0 = Wrist
    1–4  = Thumb   (CMC → Tip)
    5–8  = Index   (MCP → Tip)
    9–12 = Middle  (MCP → Tip)
    13–16= Ring    (MCP → Tip)
    17–20= Pinky   (MCP → Tip)
*/

import {
  HolisticLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';

// ── Module state ──────────────────────────────────────────────────
let holisticLandmarker = null;
let modelError         = null;
let lastVideoTime      = -1;

// CHANGED (perf): throttle the actual model call independently of the
// video's own frame rate / the caller's rAF rate. 20fps is plenty for
// sign detection (signs unfold over hundreds of ms) and roughly halves
// or quarters CPU/GPU load on a 30–60fps camera.
const DETECT_INTERVAL_MS = 50; // ~20 detections/sec
let lastDetectAt = 0;
let cachedResult = null; // last frame's { leftPts, rightPts, faceRaw, forehead, chin, anyHandPresent, featureVec }

// Ghost-frame persistence — same tolerance pattern as capture.html,
// tracked independently per hand + face so one occluded hand doesn't
// zero out the other or the face mid-sign.
const GHOST_FRAMES = 10;

let lastGoodLeftPts   = null, leftGhostCounter   = 0;
let lastGoodRightPts  = null, rightGhostCounter  = 0;

const FACE_GHOST_FRAMES = 10;
let faceGhostCounter    = 0;
let lastGoodForehead    = null;
let lastGoodChin        = null;

const FOREHEAD_IDX = 10;   // MediaPipe canonical face mesh: top of forehead
const CHIN_IDX     = 152;  // MediaPipe canonical face mesh: bottom of chin

const HAND_ZERO = new Array(63).fill(0);

let anyHandPresent = false;

// CHANGED (multi-person fix, part A): reject a hand whose wrist sits
// further than this many face-heights from the currently-tracked face.
// Generous on purpose — wide gestures still need to pass — this is
// only meant to catch a hand that clearly belongs to someone else.
const MAX_HAND_FACE_RADIUS = 6.5;

// CHANGED (multi-person fix, part B): a wrist jump bigger than this
// (in normalized 0–1 image coords) in a single frame is treated as a
// probable ROI mis-lock, not real motion, and is held back until it
// repeats for JUMP_CONFIRM_FRAMES frames in a row.
const JUMP_DISTANCE_THRESHOLD = 0.30;
const JUMP_CONFIRM_FRAMES     = 2;

let leftPendingJumpPts = null, leftPendingJumpCount  = 0;
let rightPendingJumpPts = null, rightPendingJumpCount = 0;

// ── Public API ────────────────────────────────────────────────────

export async function initMediaPipe() {
  console.log('[mediapipe] Loading HolisticLandmarker model…');

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
  );

  // CHANGED (perf): try GPU first — big win when it's supported. Some
  // browser/driver combos throw on GPU init for holistic specifically,
  // so we transparently retry on CPU rather than failing the whole
  // page. Whichever succeeds is logged so it's obvious which path ran.
  const baseConfig = {
    runningMode: 'VIDEO',
    minFaceDetectionConfidence:  0.5,
    minFacePresenceConfidence:   0.5,
    minFaceSuppressionThreshold: 0.3,
    minPoseDetectionConfidence:  0.5,
    minPoseSuppressionThreshold: 0.3,
    minHandLandmarksConfidence:  0.5,
  };

  try {
    holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
      ...baseConfig,
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
        delegate: 'GPU',
      },
    });
    console.log('[mediapipe] HolisticLandmarker model ready (GPU delegate).');
    return;
  } catch (gpuErr) {
    console.warn('[mediapipe] GPU delegate failed, falling back to CPU:', gpuErr.message);
  }

  try {
    holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
      ...baseConfig,
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
        delegate: 'CPU',
      },
    });
    console.log('[mediapipe] HolisticLandmarker model ready (CPU delegate).');
  } catch (e) {
    console.error('[mediapipe] HolisticLandmarker failed to load:', e.message);
    modelError = e.message;
    throw e; // hand tracking is required
  }
}

function firstOf(list) {
  if (!list || list.length === 0) return null;
  return Array.isArray(list[0]) ? list[0] : list;
}

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 2D distance is enough (and cheaper) for the plausibility filters
// below — we only need "is this roughly where a real hand could be",
// not a precise depth-aware measurement.
function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function faceRelativeFeatures(handLandmarks, forehead, chin) {
  if (!forehead || !chin || !handLandmarks || !handLandmarks.length) return [0, 0];
  const wrist = handLandmarks[0];
  const faceHeight = dist3(forehead, chin) || 1e-6;
  return [
    dist3(wrist, chin)     / faceHeight,
    dist3(wrist, forehead) / faceHeight,
  ];
}

/**
 * CHANGED (multi-person fix, part A): drops a raw hand detection if
 * its wrist is implausibly far from the CURRENTLY visible face. Only
 * runs when we have a fresh (non-ghosted) face this frame — if the
 * face isn't visible right now we have no reliable anchor to judge
 * against, so we let the hand through rather than guess.
 */
function isHandNearFace(handPts, forehead, chin) {
  if (!handPts || !forehead || !chin) return true;
  const faceHeight = dist3(forehead, chin) || 1e-6;
  const faceCenter = { x: (forehead.x + chin.x) / 2, y: (forehead.y + chin.y) / 2 };
  const wristDist  = dist2(handPts[0], faceCenter) / faceHeight;
  return wristDist <= MAX_HAND_FACE_RADIUS;
}

/**
 * CHANGED (multi-person fix, part B): guards against a hand
 * "teleporting" to a new position in a single frame (the signature of
 * Holistic's ROI re-locking onto a different person's hand).
 *
 * NOTE: JS has no pass-by-reference for the pending-jump state, so
 * this returns a plain { value, pendingPts, pendingCount } object —
 * the caller is responsible for writing pendingPts/pendingCount back
 * into its own module-level vars. `value` is the position to actually
 * use this frame: either the new point (a normal move, or a confirmed
 * repeat jump) or the last good point (a jump we're still waiting to
 * confirm, held like a ghost frame).
 */
function debounceJump(newPts, lastGoodPts, pendingPts, pendingCount) {
  if (!newPts || !lastGoodPts) {
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  const jump = dist2(newPts[0], lastGoodPts[0]);
  if (jump <= JUMP_DISTANCE_THRESHOLD) {
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  // Big jump — is it the SAME big jump repeating (real fast motion),
  // or a one-off (mis-lock)?
  let nextPendingPts, nextPendingCount;
  if (pendingPts && dist2(newPts[0], pendingPts[0]) <= JUMP_DISTANCE_THRESHOLD) {
    nextPendingPts   = pendingPts;
    nextPendingCount = pendingCount + 1;
  } else {
    nextPendingPts   = newPts;
    nextPendingCount = 1;
  }
  if (nextPendingCount >= JUMP_CONFIRM_FRAMES) {
    // Confirmed — accept the new position and stop holding.
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  // Not confirmed yet — hold the last good position instead.
  return { value: lastGoodPts, pendingPts: nextPendingPts, pendingCount: nextPendingCount };
}

/**
 * Builds the 130-value feature vector, IDENTICAL layout to
 * capture.html's buildFeatureVec():
 *   [63 left xyz][63 right xyz][leftPresent][rightPresent]
 *   [handToChin][handToForehead]
 */
export function buildFeatureVec(leftPts, rightPts, forehead, chin) {
  const leftPresent  = leftPts  ? 1 : 0;
  const rightPresent = rightPts ? 1 : 0;
  if (!leftPts && !rightPts) return null;

  const faceExtra = faceRelativeFeatures(rightPts || leftPts, forehead, chin);
  const leftVec   = leftPts  ? leftPts.flatMap(p => [p.x, p.y, p.z])  : HAND_ZERO;
  const rightVec  = rightPts ? rightPts.flatMap(p => [p.x, p.y, p.z]) : HAND_ZERO;

  return [...leftVec, ...rightVec, leftPresent, rightPresent, ...faceExtra];
}

/**
 * Processes a single video frame and returns hand + face landmark data.
 * Call this inside a requestAnimationFrame loop.
 */
export function processFrame(videoElement) {
  if (!holisticLandmarker) {
    return {
      leftHandLandmarks: null, rightHandLandmarks: null, faceLandmarks: null,
      forehead: null, chin: null, anyHandPresent: false, featureVec: null,
    };
  }

  const now = performance.now();

  // CHANGED (perf): two independent reasons to skip a real detect call
  // and reuse cached landmarks instead — the video frame hasn't
  // advanced, OR it has but we're still within the throttle window.
  const sameVideoFrame = videoElement.currentTime === lastVideoTime;
  const withinThrottle = now - lastDetectAt < DETECT_INTERVAL_MS;

  if ((sameVideoFrame || withinThrottle) && cachedResult) {
    return cachedResult;
  }
  lastVideoTime = videoElement.currentTime;
  lastDetectAt  = now;

  const result = holisticLandmarker.detectForVideo(videoElement, now);

  const leftRaw  = firstOf(result.leftHandLandmarks);
  const rightRaw = firstOf(result.rightHandLandmarks);
  const faceRaw  = firstOf(result.faceLandmarks);

  // ── Face — same ghost-fill pattern as capture.html ────────────
  let forehead, chin;
  if (faceRaw) {
    faceGhostCounter = 0;
    forehead = faceRaw[FOREHEAD_IDX];
    chin     = faceRaw[CHIN_IDX];
    lastGoodForehead = forehead;
    lastGoodChin     = chin;
  } else {
    faceGhostCounter++;
    if (faceGhostCounter <= FACE_GHOST_FRAMES && lastGoodForehead && lastGoodChin) {
      forehead = lastGoodForehead;
      chin     = lastGoodChin;
    } else {
      forehead = null; chin = null;
      lastGoodForehead = null; lastGoodChin = null;
    }
  }

  // ── Multi-person filtering (raw detections only, before ghosting) ──
  // Face-proximity gate first (drops an obviously-wrong-person hand),
  // then jump debounce (catches a one-frame ROI mis-lock even when the
  // wrong hand happens to still be within the face radius).
  let leftFiltered  = leftRaw;
  let rightFiltered = rightRaw;
  if (faceRaw) {
    if (leftFiltered  && !isHandNearFace(leftFiltered, forehead, chin))  leftFiltered  = null;
    if (rightFiltered && !isHandNearFace(rightFiltered, forehead, chin)) rightFiltered = null;
  }
  const leftJump = debounceJump(leftFiltered, lastGoodLeftPts, leftPendingJumpPts, leftPendingJumpCount);
  leftFiltered        = leftJump.value;
  leftPendingJumpPts   = leftJump.pendingPts;
  leftPendingJumpCount = leftJump.pendingCount;

  const rightJump = debounceJump(rightFiltered, lastGoodRightPts, rightPendingJumpPts, rightPendingJumpCount);
  rightFiltered         = rightJump.value;
  rightPendingJumpPts   = rightJump.pendingPts;
  rightPendingJumpCount = rightJump.pendingCount;

  // ── Left hand, ghost-filled ────────────────────────────────────
  let leftPts = leftFiltered;
  if (leftPts) { lastGoodLeftPts = leftPts; leftGhostCounter = 0; }
  else if (lastGoodLeftPts && leftGhostCounter < GHOST_FRAMES) { leftPts = lastGoodLeftPts; leftGhostCounter++; }
  else { leftPts = null; lastGoodLeftPts = null; }

  // ── Right hand, ghost-filled ───────────────────────────────────
  let rightPts = rightFiltered;
  if (rightPts) { lastGoodRightPts = rightPts; rightGhostCounter = 0; }
  else if (lastGoodRightPts && rightGhostCounter < GHOST_FRAMES) { rightPts = lastGoodRightPts; rightGhostCounter++; }
  else { rightPts = null; lastGoodRightPts = null; }

  anyHandPresent = !!(leftPts || rightPts);

  cachedResult = {
    leftHandLandmarks:  leftPts,
    rightHandLandmarks: rightPts,
    faceLandmarks:      faceRaw ?? null,
    forehead,
    chin,
    anyHandPresent,
    featureVec: buildFeatureVec(leftPts, rightPts, forehead, chin),
  };
  return cachedResult;
}

export function isModelReady() {
  return holisticLandmarker !== null;
}

export function getModelError() {
  return modelError;
}