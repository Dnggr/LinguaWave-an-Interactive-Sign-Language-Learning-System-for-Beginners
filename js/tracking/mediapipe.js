/*
  js/tracking/mediapipe.js — MediaPipe Hand Tracking Module
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads the MediaPipe HandLandmarker model and extracts
             21-point landmark coordinates from each webcam frame.
             Returns raw landmark data ONLY — no drawing, no classification.
  CONNECTS : Imported by js/lesson.js.
  MIGRATED : Ported from system_with_motion_detection/js/tracking/mediapipe.js
             (v1.1 — ghost-frame flicker fix preserved).
  ─────────────────────────────────────────────────────────────────

  LANDMARK INDICES (0–20):
    0 = Wrist
    1–4  = Thumb   (CMC → Tip)
    5–8  = Index   (MCP → Tip)
    9–12 = Middle  (MCP → Tip)
    13–16= Ring    (MCP → Tip)
    17–20= Pinky   (MCP → Tip)
*/

import {
  HandLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm';

// ── Module state ──────────────────────────────────────────────────
let handLandmarker  = null;
let lastVideoTime   = -1;

// Ghost-frame persistence: tolerate up to 5 consecutive empty frames
// (~167ms at 30fps) before declaring the hand truly gone.
const GHOST_FRAMES = 5;
let ghostCounter       = 0;
let lastGoodLandmarks  = null;
let lastGoodHandedness = null;
let lastGoodDominant   = null;

// ── Public API ────────────────────────────────────────────────────

/**
 * Loads the MediaPipe HandLandmarker model from CDN.
 * Must be awaited once before calling processFrame().
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
}

/**
 * Processes a single video frame and returns hand landmark data.
 * Call this inside a requestAnimationFrame loop.
 *
 * @param {HTMLVideoElement} videoElement
 * @returns {{
 *   landmarks:          Array<Array<{x,y,z}>>,
 *   handedness:         Array<{categoryName, score}>,
 *   dominantLandmarks:  Array<{x,y,z}> | null
 * }}
 */
export function processFrame(videoElement) {
  if (!handLandmarker) {
    return { landmarks: [], handedness: [], dominantLandmarks: null };
  }

  if (videoElement.currentTime === lastVideoTime) {
    return {
      landmarks:         lastGoodLandmarks  ?? [],
      handedness:        lastGoodHandedness ?? [],
      dominantLandmarks: lastGoodDominant,
    };
  }
  lastVideoTime = videoElement.currentTime;

  const result    = handLandmarker.detectForVideo(videoElement, performance.now());
  const landmarks = result.landmarks  ?? [];
  const handedness= result.handedness ?? [];

  if (landmarks.length > 0) {
    ghostCounter       = 0;
    lastGoodLandmarks  = landmarks;
    lastGoodHandedness = handedness;
    lastGoodDominant   = pickDominantHand(landmarks, handedness);
    return { landmarks, handedness, dominantLandmarks: lastGoodDominant };
  }

  // No hand detected — apply ghost-frame tolerance
  ghostCounter++;
  if (ghostCounter <= GHOST_FRAMES && lastGoodLandmarks) {
    return {
      landmarks:         lastGoodLandmarks,
      handedness:        lastGoodHandedness,
      dominantLandmarks: lastGoodDominant,
    };
  }

  // Hand truly gone
  lastGoodLandmarks  = null;
  lastGoodHandedness = null;
  lastGoodDominant   = null;
  return { landmarks: [], handedness: [], dominantLandmarks: null };
}

export function isModelReady() {
  return handLandmarker !== null;
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