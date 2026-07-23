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

// ── Public API ────────────────────────────────────────────────────

export async function initMediaPipe() {
  console.log('[mediapipe] Loading HolisticLandmarker model…');

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
  );

  try {
    holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      minFaceDetectionConfidence:  0.5,
      minFacePresenceConfidence:   0.5,
      minFaceSuppressionThreshold: 0.3,
      minPoseDetectionConfidence:  0.5,
      minPoseSuppressionThreshold: 0.3,
      minHandLandmarksConfidence:  0.5,
    });
    console.log('[mediapipe] HolisticLandmarker model ready.');
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

  if (videoElement.currentTime === lastVideoTime) {
    const leftPts   = lastGoodLeftPts;
    const rightPts  = lastGoodRightPts;
    const forehead  = lastGoodForehead;
    const chin      = lastGoodChin;
    return {
      leftHandLandmarks: leftPts, rightHandLandmarks: rightPts, faceLandmarks: null,
      forehead, chin, anyHandPresent, featureVec: buildFeatureVec(leftPts, rightPts, forehead, chin),
    };
  }
  lastVideoTime = videoElement.currentTime;

  const now    = performance.now();
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

  // ── Left hand, ghost-filled ────────────────────────────────────
  let leftPts = leftRaw;
  if (leftPts) { lastGoodLeftPts = leftPts; leftGhostCounter = 0; }
  else if (lastGoodLeftPts && leftGhostCounter < GHOST_FRAMES) { leftPts = lastGoodLeftPts; leftGhostCounter++; }
  else { leftPts = null; lastGoodLeftPts = null; }

  // ── Right hand, ghost-filled ───────────────────────────────────
  let rightPts = rightRaw;
  if (rightPts) { lastGoodRightPts = rightPts; rightGhostCounter = 0; }
  else if (lastGoodRightPts && rightGhostCounter < GHOST_FRAMES) { rightPts = lastGoodRightPts; rightGhostCounter++; }
  else { rightPts = null; lastGoodRightPts = null; }

  anyHandPresent = !!(leftPts || rightPts);

  return {
    leftHandLandmarks:  leftPts,
    rightHandLandmarks: rightPts,
    faceLandmarks:      faceRaw ?? null,
    forehead,
    chin,
    anyHandPresent,
    featureVec: buildFeatureVec(leftPts, rightPts, forehead, chin),
  };
}

export function isModelReady() {
  return holisticLandmarker !== null;
}

export function getModelError() {
  return modelError;
}