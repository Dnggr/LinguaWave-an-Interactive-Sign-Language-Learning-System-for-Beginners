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
  FEATURE VECTOR (matches capture.html's buildFeatureVec() exactly)
  ─────────────────────────────────────────────────────────────────
  Feature vector per frame is now 130 values instead of 65:
    - 63 : left-hand landmarks (x, y, z), zero-filled if left hand absent
    - 63 : right-hand landmarks (x, y, z), zero-filled if right hand absent
    -  1 : leftPresent  (0/1)
    -  1 : rightPresent (0/1)
    -  2 : normalized face-relative distances, computed from whichever
           hand is present (right hand preferred if both are present):
             dist(wrist, chin)     / faceScale
             dist(wrist, forehead) / faceScale
  faceScale = dist(forehead, chin) — cancels out camera distance.

  Both asl_static_model and asl_motion_model MUST be retrained with
  130-wide input for this to work. Training-time (capture.html) and
  inference-time (this file) feature order MUST match exactly —
  that's handled by computeFaceRelativeFeatures()/buildFeatureVector()
  below mirroring capture.html's faceRelativeFeatures()/buildFeatureVec().

  MediaPipe FaceLandmarker point indices used as anchors:
    FOREHEAD_IDX = 10   (top-center of forehead)
    CHIN_IDX     = 152  (bottom-center of chin)
  These are the standard MediaPipe Face Mesh (468-point) indices.
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

// ── Feature vector config — MUST mirror capture.html's buildFeatureVec()
// Layout: [63 left xyz][63 right xyz][leftPresent][rightPresent][handToChin][handToForehead]
const FOREHEAD_IDX = 10;
const CHIN_IDX      = 152;
export const HAND_FEATURE_COUNT     = 126; // 63 left + 63 right
export const PRESENCE_FEATURE_COUNT = 2;   // leftPresent, rightPresent
export const FACE_FEATURE_COUNT     = 2;   // handToChin, handToForehead
export const TOTAL_FEATURE_COUNT    = HAND_FEATURE_COUNT + PRESENCE_FEATURE_COUNT + FACE_FEATURE_COUNT; // 130

const HAND_ZERO = new Array(63).fill(0);

// ── State ─────────────────────────────────────────────────────────
let staticModel  = null;
let staticLabels = null;
let motionModel  = null;
let motionLabels = null;
let motionModelError = null;   // set if motion model fails to load

export function getMotionModelError() { return motionModelError; }

// Frame buffer for motion detection (MOTION_FRAMES_REQUIRED × 130 values)
let motionBuffer = [];
let lastFrameFlat = null;

// BUG 10 FIX: a single 20-frame window can land mid-gesture (e.g. the
// tail end of BOY's closing grasp looks a lot like DAD's open-hand
// tap once the hand starts relaxing back open). Instead of trusting
// the very first window, require the SAME label to come back on two
// windows in a row before calling it matched — the accidental
// "reopening" window essentially never survives that check because
// it doesn't repeat.
let pendingMotionLabel      = null;
let pendingMotionConfidence = 0;

// ── Feature vector helpers ────────────────────────────────────────

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Same face-relative distance math as capture.html's faceRelativeFeatures() —
 * uses the dominant present hand's wrist (right hand preferred, matching
 * capture.html's `rightPts || leftPts`). No face => [0,0], never reject.
 *
 * @param {Array<{x,y,z}>|null} dominantHandLm - wrist-bearing hand to measure from
 * @param {Array<{x,y,z}>|null} faceLm - full face landmark set, or null
 * @returns {number[]} 2 values, [0,0] if no face detected
 */
export function computeFaceRelativeFeatures(dominantHandLm, faceLm) {
  if (!faceLm || !dominantHandLm || !dominantHandLm.length) return [0, 0];
  const chin     = faceLm[CHIN_IDX];
  const forehead = faceLm[FOREHEAD_IDX];
  if (!chin || !forehead) return [0, 0];

  const faceHeight = dist3(forehead, chin) || 1e-6;
  const wrist = dominantHandLm[0];

  return [
    dist3(wrist, chin)     / faceHeight,
    dist3(wrist, forehead) / faceHeight,
  ];
}

/**
 * Builds the 130-value feature vector, IDENTICAL layout to
 * capture.html's buildFeatureVec():
 *   [63 left xyz][63 right xyz][leftPresent][rightPresent][handToChin][handToForehead]
 *
 * @param {Array<{x,y,z}>|null} leftLm  - 21 left-hand landmarks, or null
 * @param {Array<{x,y,z}>|null} rightLm - 21 right-hand landmarks, or null
 * @param {Array<{x,y,z}>|null} faceLandmarks - full face landmark set, or null
 * @returns {number[]|null} 130 values, or null if neither hand is present
 */
function buildFeatureVector(leftLm, rightLm, faceLandmarks) {
  const leftPresent  = leftLm  ? 1 : 0;
  const rightPresent = rightLm ? 1 : 0;
  if (!leftLm && !rightLm) return null;

  const faceFeat = computeFaceRelativeFeatures(rightLm || leftLm, faceLandmarks);
  const leftVec  = leftLm  ? leftLm.flatMap(p => [p.x, p.y, p.z])  : HAND_ZERO;
  const rightVec = rightLm ? rightLm.flatMap(p => [p.x, p.y, p.z]) : HAND_ZERO;

  return [...leftVec, ...rightVec, leftPresent, rightPresent, ...faceFeat];
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
 * Classifies a single-frame two-hand pose using the static model.
 *
 * @param {Array<{x,y,z}>|null} leftLm  - 21 left-hand landmarks from mediapipe.js
 * @param {Array<{x,y,z}>|null} rightLm - 21 right-hand landmarks from mediapipe.js
 * @param {Array<{x,y,z}>|null} faceLandmarks - full face landmark set from mediapipe.js
 * @returns {{ label: string|null, confidence: number (0–100), matched: boolean }}
 */
export function classifyGesture(leftLm, rightLm, faceLandmarks) {
  if (!staticModel || !staticLabels) return { label: null, confidence: 0, matched: false };
  if (!leftLm && !rightLm) return { label: null, confidence: 0, matched: false };

  const flat = buildFeatureVector(leftLm, rightLm, faceLandmarks);
  if (!flat) return { label: null, confidence: 0, matched: false };

  const input = tf.tensor2d([flat]);   // shape [1, 130]

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
 * Adds a frame to the motion buffer. Once MOTION_FRAMES_REQUIRED frames
 * are collected, runs the LSTM motion model and returns a result.
 *
 * @param {Array<{x,y,z}>|null} leftLm  - 21 left-hand landmarks
 * @param {Array<{x,y,z}>|null} rightLm - 21 right-hand landmarks
 * @param {Array<{x,y,z}>|null} faceLandmarks - full face landmark set
 * @returns {{ label: string|null, confidence: number, matched: boolean, buffering: boolean }}
 */
export function classifyMotion(leftLm, rightLm, faceLandmarks) {
  if (!motionModel || !motionLabels) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }
  if (!leftLm && !rightLm) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const flat = buildFeatureVector(leftLm, rightLm, faceLandmarks);
  if (!flat) {
    return { label: null, confidence: 0, matched: false, buffering: motionBuffer.length > 0 };
  }

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

  const input = tf.tensor3d([frameWindow]);   // shape [1, MOTION_FRAMES_REQUIRED, 130]

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

  if (!rawLabel) {
    pendingMotionLabel = null;
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  // BUG FIX: classifyGesture() already refuses to report a label that
  // has no SIGN_DICTIONARY entry (or is marked disabled). classifyMotion()
  // was missing this same guard, so a motion model trained on more labels
  // than the dictionary knows about (e.g. new family words) could either
  // silently report labels lesson.js has no content for, or — the more
  // common case — a label that IS in the dictionary but hasn't been
  // wired into data.js/dictionary.js yet would still show up as a
  // "detected" word with no matching lesson. Keep both files in sync.
  const dictEntry = SIGN_DICTIONARY[rawLabel];
  if (!dictEntry || dictEntry.disabled) {
    pendingMotionLabel = null;
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const passesThreshold = confidence >= MOTION_THRESHOLD;

  if (!passesThreshold) {
    pendingMotionLabel = null;
    // Still surface the low-confidence guess so the UI can show what
    // it's leaning toward, just not accept it yet.
    return { label: rawLabel, confidence, matched: false, buffering: false };
  }

  if (pendingMotionLabel === rawLabel) {
    // Confirmed on two consecutive windows — accept it.
    pendingMotionLabel = null;
    return { label: rawLabel, confidence, matched: true, buffering: false };
  }

  // First window to clear the threshold for this label — hold it and
  // wait for the next window to agree before committing.
  pendingMotionLabel      = rawLabel;
  pendingMotionConfidence = confidence;
  return { label: rawLabel, confidence, matched: false, buffering: false, confirming: true };
}

/**
 * Resets the motion frame buffer. Call this when switching signs
 * or exiting assessment mode.
 */
export function resetMotionBuffer() {
  motionBuffer        = [];
  lastFrameFlat        = null;
  pendingMotionLabel      = null;
  pendingMotionConfidence = 0;
}

// ── Utility ───────────────────────────────────────────────────────

export function landmarkDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}