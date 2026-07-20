/*
  js/engine/classifier.js — TensorFlow.js Sign Classifier
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads the trained asl_static_model / asl_motion_model and
             classifies hand landmarks (+ face-relative features) into
             a sign label with a confidence %.
  CONNECTS : Imported by js/lesson.js.

  MODEL PATHS (relative to the project root served by your HTTP server):
    Static model:   /asl_static_model/model.json
    Motion model:   /asl_motion_model/model.json

  ─────────────────────────────────────────────────────────────────
  FACE-RELATIVE FEATURES (see 01_face_relative_landmarks_guide.txt)
  ─────────────────────────────────────────────────────────────────
  Feature vector per frame is now 67 values instead of 63:
    - 63 : the existing 21 hand landmarks (x, y, z)
    - 4  : normalized face-relative distances
             dist(thumbTip, chin)     / faceScale
             dist(thumbTip, forehead) / faceScale
             dist(indexTip, chin)     / faceScale
             dist(wrist, chin)        / faceScale
  faceScale = dist(forehead, chin) — cancels out camera distance.

  This is applied to ALL signs (not hand-picked), per the guide's
  recommendation — it costs nothing at inference and future-proofs
  every sign added later. Both asl_static_model and asl_motion_model
  MUST be retrained with 67-wide input for this to work (see the
  Colab training script). Training-time and inference-time feature
  order MUST match exactly — that's handled by computeFaceRelativeFeatures()
  below being the single source of truth used both here and in your
  capture tool.

  MediaPipe FaceLandmarker point indices used as anchors:
    FOREHEAD_IDX = 10   (top-center of forehead)
    CHIN_IDX     = 152  (bottom-center of chin)
  These are the standard MediaPipe Face Mesh (468-point) indices.
  Sanity-check them visually if results look off (draw a dot at each
  index over the video feed) — index numbers are easy to mix up.
  ─────────────────────────────────────────────────────────────────
  KERAS 3 COMPAT FIX (unchanged, preserved from previous version)
  ─────────────────────────────────────────────────────────────────
*/

// ── Load TF.js from CDN (UMD bundle → sets window.tf) ────────────
await new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js';
  s.onload  = resolve;
  s.onerror = () => reject(new Error('[classifier] Failed to load TensorFlow.js from CDN.'));
  document.head.appendChild(s);
});

const tf = window.tf;
if (!tf) throw new Error('[classifier] window.tf is undefined after script load.');

import { SIGN_DICTIONARY } from './dictionary.js';

// ── Config ────────────────────────────────────────────────────────
const STATIC_MODEL_PATH  = '../asl_static_model/model.json';
const STATIC_LABELS_PATH = '../asl_static_model/labels.json';
const MOTION_MODEL_PATH  = '../asl_motion_model/model.json';
const MOTION_LABELS_PATH = '../asl_motion_model/labels.json';

const MATCH_THRESHOLD        = 75;   // minimum % confidence to count as "matched"
const MOTION_THRESHOLD       = 70;   // slightly lower for motion signs
const MOTION_FRAMES_REQUIRED = 20;   // matches capture.html's signFrameLengths for J/Z/MOM/DAD/BOY/GIRL
// NOTE: capture.html supports variable per-sign frame lengths (15–60).
// The LSTM model needs a FIXED window, so any new motion sign you train
// must also use 20 frames, or you'll need a separate model/window per length.

// ── Face-relative feature config ─────────────────────────────────
const FOREHEAD_IDX = 10;
const CHIN_IDX      = 152;
export const FACE_FEATURE_COUNT = 2;
export const HAND_FEATURE_COUNT = 63;
export const TOTAL_FEATURE_COUNT = HAND_FEATURE_COUNT + FACE_FEATURE_COUNT; // 65

// ── State ─────────────────────────────────────────────────────────
let staticModel  = null;
let staticLabels = null;
let motionModel  = null;
let motionLabels = null;
let motionModelError = null;   // set if motion model fails to load

export function getMotionModelError() { return motionModelError; }

// Frame buffer for motion detection (30 frames × 67 values)
let motionBuffer = [];
let lastFrameFlat = null;

// ── Face-relative feature helper ─────────────────────────────────

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Builds the 4-value normalized face-relative feature set from a set
 * of 21 hand landmarks and 468 face landmarks. This is the SAME
 * function that must be used at capture/training time — keep it in
 * sync with whatever your capture tool uses.
 *
 * @param {Array<{x,y,z}>} handLm  - 21 hand landmarks
 * @param {Array<{x,y,z}>|null} faceLm - full face landmark set, or null
 * @returns {number[]|null} 4 values, or null if no face was detected
 */
export function computeFaceRelativeFeatures(handLm, faceLm) {
  // Matches capture.html's faceRelativeFeatures() exactly — same
  // fallback behavior (no face => [0,0], never reject the frame).
  if (!faceLm || !handLm || !handLm.length) return [0, 0];
  const chin     = faceLm[CHIN_IDX];
  const forehead = faceLm[FOREHEAD_IDX];
  if (!chin || !forehead) return [0, 0];

  const faceHeight = dist3(forehead, chin) || 1e-6;
  const wrist = handLm[0];

  return [
    dist3(wrist, chin)     / faceHeight,
    dist3(wrist, forehead) / faceHeight,
  ];
}

function buildFeatureVector(landmarks, faceLandmarks) {
  const faceFeat = computeFaceRelativeFeatures(landmarks, faceLandmarks);
  return landmarks.flatMap(p => [p.x, p.y, p.z]).concat(faceFeat);
}

// ── Keras 3 compat loader (unchanged) ────────────────────────────

function fixKeras3DtypePolicy(node) {
  if (Array.isArray(node)) {
    node.forEach(fixKeras3DtypePolicy);
    return;
  }
  if (!node || typeof node !== 'object') return;

  for (const key of Object.keys(node)) {
    const val = node[key];
    if (
      key === 'dtype' &&
      val && typeof val === 'object' &&
      val.class_name === 'DTypePolicy'
    ) {
      node[key] = val.config?.name || 'float32';
    } else {
      fixKeras3DtypePolicy(val);
    }
  }
}

function fixKeras3InputLayer(node) {
  if (Array.isArray(node)) {
    node.forEach(fixKeras3InputLayer);
    return;
  }
  if (!node || typeof node !== 'object') return;

  if (node.class_name === 'InputLayer' && node.config) {
    if (node.config.batch_shape && !node.config.batchInputShape) {
      node.config.batchInputShape = node.config.batch_shape;
      delete node.config.batch_shape;
    }
  }

  for (const val of Object.values(node)) {
    fixKeras3InputLayer(val);
  }
}

function concatArrayBuffers(buffers) {
  const total  = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

async function fetchArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.arrayBuffer();
}

async function loadKeras3CompatModel(modelJsonPath) {
  const res = await fetch(modelJsonPath);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${modelJsonPath}`);
  const modelJSON = await res.json();

  fixKeras3DtypePolicy(modelJSON.modelTopology);
  fixKeras3InputLayer(modelJSON.modelTopology);

  const modelName = modelJSON.modelTopology?.model_config?.config?.name;
  const stripPrefix = (name) =>
    modelName && name.startsWith(`${modelName}/`) ? name.slice(modelName.length + 1) : name;

  const baseUrl = modelJsonPath.substring(0, modelJsonPath.lastIndexOf('/') + 1);

  const ioHandler = {
    load: async () => {
      const weightSpecs = [];
      const buffers     = [];

      for (const group of modelJSON.weightsManifest) {
        for (const w of group.weights) {
          weightSpecs.push({ ...w, name: stripPrefix(w.name) });
        }
        for (const path of group.paths) {
          buffers.push(await fetchArrayBuffer(baseUrl + path));
        }
      }

      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs,
        weightData: concatArrayBuffers(buffers),
        format:       modelJSON.format,
        generatedBy:  modelJSON.generatedBy,
        convertedBy:  modelJSON.convertedBy,
      };
    },
  };

  return tf.loadLayersModel(ioHandler);
}

// ── Load ──────────────────────────────────────────────────────────

export async function loadModels() {
  console.log('[classifier] Loading static model…');
  try {
    staticModel  = await loadKeras3CompatModel(STATIC_MODEL_PATH);
    const res    = await fetch(STATIC_LABELS_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    staticLabels = await res.json();
    console.log('[classifier] Static model ready. Labels:', staticLabels);
  } catch (e) {
    console.error('[classifier] Failed to load static model:', e.message);
    console.error('[classifier] → Verify: /asl_static_model/model.json exists in project root.');
    throw e;   // static model is required — re-throw so lesson.js catches it
  }

  console.log('[classifier] Loading motion model…');
  try {
    motionModel  = await loadKeras3CompatModel(MOTION_MODEL_PATH);
    const res2   = await fetch(MOTION_LABELS_PATH);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    motionLabels = await res2.json();
    console.log('[classifier] Motion model ready. Labels:', motionLabels);
  } catch (e) {
    console.warn('[classifier] Motion model not loaded:', e.message);
    motionModelError = e.message;   // expose for lesson.js warning
  }
}

export function isClassifierReady() {
  return staticModel !== null && staticLabels !== null;
}

export function isMotionModelReady() {
  return motionModel !== null && motionLabels !== null;
}

// ── Static Classify ───────────────────────────────────────────────

/**
 * Classifies a single-frame hand pose using the static model.
 *
 * @param {Array<{x,y,z}>} landmarks - 21 landmarks from mediapipe.js (dominantLandmarks)
 * @param {Array<{x,y,z}>|null} faceLandmarks - full face landmark set from mediapipe.js
 * @returns {{ label: string|null, confidence: number (0–100), matched: boolean, faceMissing?: boolean }}
 */
export function classifyGesture(landmarks, faceLandmarks) {
  if (!staticModel || !staticLabels) return { label: null, confidence: 0, matched: false };
  if (!landmarks || landmarks.length !== 21) return { label: null, confidence: 0, matched: false };

  const flat = buildFeatureVector(landmarks, faceLandmarks);
  /**
  if (!flat) {
    // No face in frame — reject outright rather than falling back to
    // zeros, which could be misread by the model as "very close".
    return { label: null, confidence: 0, matched: false, faceMissing: true };
  }
   */

  const input = tf.tensor2d([flat]);   // shape [1, 67]

  let rawLabel   = null;
  let confidence = 0;

  tf.tidy(() => {
    const output = staticModel.predict(input);
    const probs  = Array.from(output.dataSync());
    const maxIdx = probs.indexOf(Math.max(...probs));
    confidence   = Math.round(probs[maxIdx] * 100);
    rawLabel     = staticLabels[String(maxIdx)] ?? null;
  });

  input.dispose();

  if (!rawLabel) return { label: null, confidence: 0, matched: false };

  const entry = SIGN_DICTIONARY[rawLabel];
  if (!entry || entry.disabled) return { label: null, confidence: 0, matched: false };

  return {
    label:    rawLabel,
    confidence,
    matched:  confidence >= MATCH_THRESHOLD,
  };
}

// ── Motion Classify ───────────────────────────────────────────────

/**
 * Adds a frame to the motion buffer. Once 30 frames are collected,
 * runs the LSTM motion model and returns a result.
 *
 * @param {Array<{x,y,z}>} landmarks - 21 landmarks
 * @param {Array<{x,y,z}>|null} faceLandmarks - full face landmark set
 * @returns {{ label: string|null, confidence: number, matched: boolean, buffering: boolean, faceMissing?: boolean }}
 */
export function classifyMotion(landmarks, faceLandmarks) {
  if (!motionModel || !motionLabels) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }
  if (!landmarks || landmarks.length !== 21) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const flat = buildFeatureVector(landmarks, faceLandmarks);
  /**
  if (!flat) {
    // No face — don't wipe an in-progress buffer over a transient loss
    // (mediapipe.js already applies ghost-frame tolerance upstream);
    // just skip this frame and surface faceMissing for the UI.
    return { label: null, confidence: 0, matched: false, buffering: motionBuffer.length > 0, faceMissing: true };
  }
     */

  // Only collect frame if hand moved enough since last frame
  if (lastFrameFlat) {
    let diff = 0;
    for (let i = 0; i < flat.length; i++) {
      diff += Math.abs(flat[i] - lastFrameFlat[i]);
    }
    const avgDiff = diff / flat.length;

    if (avgDiff < 0.001) {
      // Hand is essentially frozen — skip this frame but DON'T reset
      // the buffer so a brief pause mid-stroke doesn't wipe progress
      lastFrameFlat = flat;
      return { label: null, confidence: 0, matched: false, buffering: motionBuffer.length > 0 };
    }
  }

  lastFrameFlat = flat;
  motionBuffer.push(flat);

  if (motionBuffer.length < MOTION_FRAMES_REQUIRED) {
    return { label: null, confidence: 0, matched: false, buffering: true };
  }

  const frameWindow = motionBuffer.slice(-MOTION_FRAMES_REQUIRED);
  motionBuffer = [];

  const input = tf.tensor3d([frameWindow]);   // shape [1, 30, 67]

  let rawLabel   = null;
  let confidence = 0;

  tf.tidy(() => {
    const output = motionModel.predict(input);
    const probs  = Array.from(output.dataSync());
    const maxIdx = probs.indexOf(Math.max(...probs));
    confidence   = Math.round(probs[maxIdx] * 100);
    rawLabel     = motionLabels[String(maxIdx)] ?? null;
  });

  input.dispose();

  if (!rawLabel) return { label: null, confidence: 0, matched: false, buffering: false };

  return {
    label:    rawLabel,
    confidence,
    matched:  confidence >= MOTION_THRESHOLD,
    buffering: false,
  };
}

/**
 * Resets the motion frame buffer. Call this when switching signs
 * or exiting assessment mode.
 */
export function resetMotionBuffer() {
  motionBuffer  = [];
  lastFrameFlat = null;
}

// ── Utility ───────────────────────────────────────────────────────

export function landmarkDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}