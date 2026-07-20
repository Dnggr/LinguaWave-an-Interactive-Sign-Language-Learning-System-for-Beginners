/*
  js/tracking/mediapipe.js — MediaPipe Hand + Face Tracking Module
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads MediaPipe HandLandmarker AND FaceLandmarker and
             extracts landmark coordinates from each webcam frame.
             Returns raw landmark data ONLY — no drawing, no classification.
  CONNECTS : Imported by js/lesson.js.

  UPDATE (face-relative landmarks): FaceLandmarker added alongside
  HandLandmarker so classifier.js can compute face-relative distance
  features (see 01_face_relative_landmarks_guide.txt §3/§5). Mirrors
  the exact ghost-frame tolerance pattern already used for hands.
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
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm';

// ── Module state ──────────────────────────────────────────────────
let handLandmarker  = null;
let faceLandmarker  = null;
let faceModelError  = null;
let lastVideoTime   = -1;

// Ghost-frame persistence: tolerate up to 5 consecutive empty frames
// (~167ms at 30fps) before declaring the hand/face truly gone.
const GHOST_FRAMES = 5;

let ghostCounter       = 0;
let lastGoodLandmarks  = null;
let lastGoodHandedness = null;
let lastGoodDominant   = null;

let faceGhostCounter   = 0;
let lastGoodFace       = null;

// ── Public API ────────────────────────────────────────────────────

/**
 * Loads the MediaPipe HandLandmarker + FaceLandmarker models from CDN.
 * Must be awaited once before calling processFrame().
 * Hand model is required (throws on failure). Face model is best-effort:
 * if it fails, processFrame() will keep returning faceLandmarks: null
 * and classifier.js will reject detections (see classifier.js comments).
 */
export async function initMediaPipe() {
  console.log('[mediapipe] Loading HandLandmarker model…');

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',   // Falls back to CPU automatically if GPU unavailable
    },
    runningMode:                'VIDEO',
    numHands:                   2,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence:  0.7,
    minTrackingConfidence:      0.6,
  });

  console.log('[mediapipe] HandLandmarker model ready.');

  console.log('[mediapipe] Loading FaceLandmarker model…');
  try {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    console.log('[mediapipe] FaceLandmarker model ready.');
  } catch (e) {
    console.error('[mediapipe] FaceLandmarker failed to load:', e.message);
    faceModelError = e.message;
    faceLandmarker = null;
  }
}

/**
 * Processes a single video frame and returns hand + face landmark data.
 * Call this inside a requestAnimationFrame loop.
 *
 * @param {HTMLVideoElement} videoElement
 * @returns {{
 *   landmarks:          Array<Array<{x,y,z}>>,
 *   handedness:         Array<{categoryName, score}>,
 *   dominantLandmarks:  Array<{x,y,z}> | null,
 *   faceLandmarks:      Array<{x,y,z}> | null
 * }}
 */
export function processFrame(videoElement) {
  if (!handLandmarker) {
    return { landmarks: [], handedness: [], dominantLandmarks: null, faceLandmarks: null };
  }

  if (videoElement.currentTime === lastVideoTime) {
    return {
      landmarks:         lastGoodLandmarks  ?? [],
      handedness:        lastGoodHandedness ?? [],
      dominantLandmarks: lastGoodDominant,
      faceLandmarks:     lastGoodFace,
    };
  }
  lastVideoTime = videoElement.currentTime;

  const now = performance.now();

  // ── Hands (unchanged logic) ───────────────────────────────────
  const result    = handLandmarker.detectForVideo(videoElement, now);
  const landmarks = result.landmarks  ?? [];
  const handedness= result.handedness ?? [];

  if (landmarks.length > 0) {
    ghostCounter       = 0;
    lastGoodLandmarks  = landmarks;
    lastGoodHandedness = handedness;
    lastGoodDominant   = pickDominantHand(landmarks, handedness);
  } else {
    ghostCounter++;
    if (ghostCounter > GHOST_FRAMES || !lastGoodLandmarks) {
      lastGoodLandmarks  = null;
      lastGoodHandedness = null;
      lastGoodDominant   = null;
    }
  }

  // ── Face (same ghost-frame tolerance pattern) ─────────────────
  if (faceLandmarker) {
    const faceResult = faceLandmarker.detectForVideo(videoElement, now);
    if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
      faceGhostCounter = 0;
      lastGoodFace      = faceResult.faceLandmarks[0];
    } else {
      faceGhostCounter++;
      if (faceGhostCounter > GHOST_FRAMES || !lastGoodFace) {
        lastGoodFace = null;
      }
    }
  }

  return {
    landmarks:         lastGoodLandmarks  ?? [],
    handedness:        lastGoodHandedness ?? [],
    dominantLandmarks: lastGoodDominant,
    faceLandmarks:     lastGoodFace,
  };
}

export function isModelReady() {
  return handLandmarker !== null;
}

export function isFaceModelReady() {
  return faceLandmarker !== null;
}

export function getFaceModelError() {
  return faceModelError;
}

// ── Internal: dominant hand selection ────────────────────────────

function pickDominantHand(landmarks, handedness) {
  if (!landmarks || landmarks.length === 0) return null;
  if (landmarks.length === 1) return landmarks[0];

  // MediaPipe labels the user's right hand as "Left" in mirrored-webcam mode
  for (let i = 0; i < handedness.length; i++) {
    const cat = handedness[i]?.[0]?.categoryName ?? '';
    if (cat === 'Left') return landmarks[i];
  }
  return landmarks[0];
}