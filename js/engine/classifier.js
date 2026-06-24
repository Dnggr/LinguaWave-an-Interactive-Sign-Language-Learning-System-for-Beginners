/*
  js/engine/classifier.js — TensorFlow.js Static-Sign Classifier
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Loads the trained asl_static_model and classifies a set
             of 21 hand landmarks into a sign label with a confidence %.
             For motion signs (J, Z, HELLO, THANK YOU) a separate
             motion model path is provided — see classifyMotion().
  CONNECTS : Imported by js/lesson.js.
  MIGRATED : Ported from system_with_motion_detection/js/engine/classifier.js
             with model paths updated to be relative to the linguawave root.

  MODEL PATHS (relative to the project root served by your HTTP server):
    Static model:   /asl_static_model/model.json
    Motion model:   /asl_motion_model/model.json

  If you see 404s:  make sure the asl_static_model/ and asl_motion_model/
  folders are in the project root alongside index.html.
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

// Frame buffer for motion detection (30 frames × 63 values)
let motionBuffer = [];

// ── Load ──────────────────────────────────────────────────────────

/**
 * Loads both the static and motion models.
 * Static model is required; motion model logs a warning if missing.
 */
export async function loadModels() {
  console.log('[classifier] Loading static model…');
  try {
    staticModel  = await tf.loadLayersModel(STATIC_MODEL_PATH);
    const res    = await fetch(STATIC_LABELS_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    staticLabels = await res.json();
    console.log('[classifier] Static model ready. Labels:', staticLabels);
  } catch (e) {
    console.error('[classifier] Failed to load static model:', e.message);
    console.error('[classifier] → Verify: /asl_static_model/model.json exists in project root.');
    throw e;
  }

  console.log('[classifier] Loading motion model…');
  try {
    motionModel  = await tf.loadLayersModel(MOTION_MODEL_PATH);
    const res2   = await fetch(MOTION_LABELS_PATH);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    motionLabels = await res2.json();
    console.log('[classifier] Motion model ready. Labels:', motionLabels);
  } catch (e) {
    // Motion model is optional for Basic-level static signs only
    console.warn('[classifier] Motion model not loaded (J, Z, HELLO, THANK YOU disabled):', e.message);
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
  motionBuffer.push(flat);

  if (motionBuffer.length < MOTION_FRAMES_REQUIRED) {
    return { label: null, confidence: 0, matched: false, buffering: true };
  }

  // Keep only the last 30 frames
  const frameWindow = motionBuffer.slice(-MOTION_FRAMES_REQUIRED);
  motionBuffer = [];   // reset after classification

  const input = tf.tensor3d([frameWindow]);   // shape [1, 30, 63]

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
  motionBuffer = [];
}

// ── Utility ───────────────────────────────────────────────────────

export function landmarkDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}