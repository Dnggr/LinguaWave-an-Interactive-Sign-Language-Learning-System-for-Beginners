/*
  js/engine/classifier.js — TensorFlow.js Static-Sign Classifier
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads the trained asl_static_model and classifies a set
             of 21 hand landmarks into a sign label with a confidence %.
             For motion signs (J, Z, HELLO, THANK YOU) a separate
             motion model path is provided — see classifyMotion().
  CONNECTS : Imported by js/lesson.js.

  MODEL PATHS (relative to the project root served by your HTTP server):
    Static model:   /asl_static_model/model.json
    Motion model:   /asl_motion_model/model.json

  If you see 404s:  make sure the asl_static_model/ and asl_motion_model/
  folders are in the project root alongside index.html.

  ─────────────────────────────────────────────────────────────────
  KERAS 3 COMPAT FIX
  ─────────────────────────────────────────────────────────────────
  These models were exported from Keras 3.x. Keras 3's serializer
  writes "dtype" as a nested object:
      "dtype": { "module": "keras", "class_name": "DTypePolicy",
                 "config": { "name": "float32" }, "registered_name": null }
  tf.js's layer deserializer expects "dtype" to be a plain string
  ("float32"). When it isn't, layer construction silently goes wrong
  and the weight binder can't match saved weights to layer variables
  (the "no target variable" error). Re-exporting from Python is the
  "proper" fix, but we don't need to touch the model files at all —
  we just rewrite that one field in memory, right after fetching
  model.json and before handing it to tf.loadLayersModel(). See
  fixKeras3DtypePolicy() + loadKeras3CompatModel() below.
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
const MOTION_FRAMES_REQUIRED = 30;   // frames to collect before running motion model

// ── State ─────────────────────────────────────────────────────────
let staticModel  = null;
let staticLabels = null;
let motionModel  = null;
let motionLabels = null;
let motionModelError = null;   // set if motion model fails to load

export function getMotionModelError() { return motionModelError; }

// Frame buffer for motion detection (30 frames × 63 values)
let motionBuffer = [];
let lastFrameFlat = null;   // ← add this


// ── Keras 3 compat loader ───────────────────────────────────────────

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

/**
 * Recursively walks a Keras model_config tree and rewrites any
 * Keras-3-style nested DTypePolicy "dtype" field into the plain
 * string tf.js expects, in place.
 */
/**
 * Keras 3 exports InputLayer config with "batch_shape" instead of
 * "batchInputShape" that TF.js expects. Fix it in-place.
 */
function fixKeras3InputLayer(node) {
  if (Array.isArray(node)) {
    node.forEach(fixKeras3InputLayer);
    return;
  }
  if (!node || typeof node !== 'object') return;

  // If this is an InputLayer config, rename batch_shape → batchInputShape
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

/**
 * Loads a tf.js layers model from a model.json path, patching the
 * Keras 3 DTypePolicy dtype fields before tf.js parses the topology.
 * Drop-in replacement for tf.loadLayersModel(modelJsonPath).
 */
async function loadKeras3CompatModel(modelJsonPath) {
  const res = await fetch(modelJsonPath);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${modelJsonPath}`);
  const modelJSON = await res.json();

fixKeras3DtypePolicy(modelJSON.modelTopology);
fixKeras3InputLayer(modelJSON.modelTopology);  // ← add this line

  // ── Name-scope fix ────────────────────────────────────────────────
  // The Python tfjs converter wrote weight names as
  // "<model_name>/<layer_name>/<weight_name>" (e.g.
  // "asl_static_model/batch_normalization/gamma"), because Keras 3
  // tracks variables under a full name-scope that includes the
  // top-level model's own name. tf.js's Sequential container, when
  // rebuilt from modelTopology, does NOT prefix its sublayers' weight
  // names with the container's own name — it expects just
  // "<layer_name>/<weight_name>" (e.g. "batch_normalization/gamma").
  // That mismatch is what throws "no target variable" even after the
  // dtype fix above. Strip the leading "<model_name>/" segment so the
  // names line up with what tf.js will actually look for.
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

/**
 * Loads both the static and motion models.
 * Static model is required; motion model logs a warning if missing.
 */
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
    console.warn('[classifier] Motion model not loaded (J, Z, HELLO, THANK YOU disabled):', e.message);
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
 * @returns {{ label: string|null, confidence: number (0–100), matched: boolean }}
 */
export function classifyGesture(landmarks) {
  if (!staticModel || !staticLabels) return { label: null, confidence: 0, matched: false };
  if (!landmarks || landmarks.length !== 21) return { label: null, confidence: 0, matched: false };

  const flat  = landmarks.flatMap(p => [p.x, p.y, p.z]);
  const input = tf.tensor2d([flat]);   // shape [1, 63]

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

  // ILY key fix: model outputs "ILY", dictionary key is "ILY" (both match now)
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
 * @returns {{ label: string|null, confidence: number, matched: boolean, buffering: boolean }}
 *   buffering: true while still collecting frames (caller can show progress indicator)
 */
export function classifyMotion(landmarks) {
  if (!motionModel || !motionLabels) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }
  if (!landmarks || landmarks.length !== 21) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const flat = landmarks.flatMap(p => [p.x, p.y, p.z]);

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

  const input = tf.tensor3d([frameWindow]);

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