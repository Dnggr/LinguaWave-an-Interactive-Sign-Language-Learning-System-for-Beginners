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

// NEW — diagnostic for the "gets laggier on retry, camera itself stays
// smooth" symptom. Open the browser console and watch these lines: if
// numTensors climbs steadily across predictions instead of returning to
// roughly the same baseline after each one, TF.js is leaking tensors or
// WebGL textures somewhere — a real, documented category of issue with
// converted/custom Keras models (see this project's earlier Keras-3
// DTypePolicy fix). If numTensors stays flat/bounded while the lag still
// happens, that RULES OUT a tensor leak and points elsewhere (MediaPipe's
// own internal state, or something else) — either way, this turns "not
// sure why" into an actual measurement instead of another guess.
// Throttled to ~once every 60 predictions so continuous static detection
// (which predicts every single frame) doesn't flood the console.
let _memCheckCounter = 0;
function logTfMemoryIfDue(label) {
  _memCheckCounter++;
  if (_memCheckCounter % 60 !== 0) return;
  const mem = tf.memory();
  console.debug(`[tf.memory] after ${label} (call #${_memCheckCounter}): numTensors=${mem.numTensors}, numBytes=${(mem.numBytes / 1024 / 1024).toFixed(2)}MB`);
}

import { SIGN_DICTIONARY } from './dictionary.js';

// ── Config ────────────────────────────────────────────────────────
const STATIC_MODEL_PATH  = '../asl_static_model/model.json';
const STATIC_LABELS_PATH = '../asl_static_model/labels.json';
const MOTION_MODEL_PATH  = '../asl_motion_model/model.json';
const MOTION_LABELS_PATH = '../asl_motion_model/labels.json';

// CHANGED — "random hand positions get confidently detected as real
// signs" (e.g. an open hand near the ear reads as AUNT even when the
// actual AUNT motion — shaking an A-handshape — was never performed).
// Root cause: the model was only ever trained on POSITIVE examples of
// real signs. It has no "this isn't a sign at all" output to send
// probability mass toward, so softmax is FORCED to distribute 100% of
// its confidence across the known sign classes no matter what it's
// shown — even pure noise gets assigned to whichever known sign is
// "closest" in the model's learned space, sometimes with deceptively
// high confidence. Two mitigations below (raised threshold + margin
// check) reduce false positives from the SOFTWARE side, but neither is
// a full fix — the real fix is training-side: add a "background/not a
// sign" class using genuine negative examples (random hand positions,
// resting poses, transitions between signs) the same way the Colab
// notebook's augmentation cell (Cell 6.5) already expands real
// examples. Ask if you want that added — it's a bigger change (new
// capture category + retrain) so it's not bundled into this pass.
const MATCH_THRESHOLD         = 85;   // was 75 — minimum % confidence to count as "matched"
const MOTION_THRESHOLD        = 80;   // was 70 — slightly lower than static still, but meaningfully higher than before
// A confident, CORRECT classification usually has a clear winner over
// the runner-up class. Noise/out-of-distribution input often produces
// a muddled distribution instead — several classes within a few points
// of each other — even when the top one happens to clear the absolute
// threshold above. Requiring a minimum gap between 1st and 2nd place
// catches that "the model wasn't actually sure" case specifically,
// which a pure confidence floor can't distinguish from genuine
// confidence.
const RUNNERUP_MARGIN_MIN     = 20;   // percentage points the top guess must beat 2nd place by
// CHANGED (today): 20 -> 40. capture.html used to assign a DIFFERENT frame
// length per sign (15 for short taps like IN/OUT/WITH, up to 60 for full
// sentences) — that's what made the Colab notebook reject exports the
// moment a batch mixed more than one sign type ("mixed sequence lengths").
// Every motion sign now records/imports to ONE universal 40-frame window
// (see signFrameLengths / DEFAULT_FRAME_LENGTH / MOTION_MODEL_SEQ_LEN in
// capture.html, and MOTION_FRAMES in the Colab notebook). All three MUST
// stay equal — this is the number that actually shapes the LSTM's input.
const MOTION_FRAMES_REQUIRED = 40;   // MUST match capture.html's frame window AND the notebook's MOTION_FRAMES

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
// REMOVED: lastFrameFlat used to track the previous frame for the
// frozen-frame movement filter in classifyMotion() (see that function's
// comment for why the filter itself was removed). Nothing reads it
// anymore, so it's gone rather than left as dead state.

// REMOVED (see classifyMotion): this used to hold a label across two
// consecutive windows before accepting a match, guarding against a
// single window landing mid-gesture (e.g. the tail end of BOY's
// closing grasp briefly resembling DAD's open-hand tap). That's a
// real risk in principle, but now that recording is explicitly
// triggered (3-2-1 countdown synced to the actual attempt, not a
// passive always-on cycle), the window is synced to the real
// performance rather than landing on an arbitrary slice of whatever
// the hand was doing — and the two-window requirement was causing a
// worse, more visible bug: the second confirmation window routinely
// got filled with the user relaxing their hand right after finishing,
// which predictably failed and overwrote a correct first read with
// "no sign, 0%". If specific sign pairs turn out to still get
// confused on a single window, the fix is to widen their fingerState/
// tiebreaker distinction in dictionary.js, not to reintroduce a
// second required window.

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
  let runnerUpConfidence = 0;

  tf.tidy(() => {
    const output = staticModel.predict(input);
    const probs  = Array.from(output.dataSync());
    const sorted = [...probs].sort((a, b) => b - a);
    const maxIdx = probs.indexOf(sorted[0]);
    confidence   = Math.round(sorted[0] * 100);
    runnerUpConfidence = Math.round((sorted[1] ?? 0) * 100);
    rawLabel     = staticLabels[String(maxIdx)] ?? null;
  });

  input.dispose();
  logTfMemoryIfDue('classifyGesture (static)');

  if (!rawLabel) return { label: null, confidence: 0, matched: false };

  const entry = SIGN_DICTIONARY[rawLabel];
  if (!entry || entry.disabled) return { label: null, confidence: 0, matched: false };

  // NEW: both the absolute threshold AND the margin over the runner-up
  // must pass — see the block comment near MATCH_THRESHOLD above.
  const matched = confidence >= MATCH_THRESHOLD && (confidence - runnerUpConfidence) >= RUNNERUP_MARGIN_MIN;

  return {
    label:    rawLabel,
    confidence,
    matched,
  };
}

// ── Motion Classify ───────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// CHANGED — "user puts their hand down while it's still capturing"
// ══════════════════════════════════════════════════════════════════
// Two related problems were happening together:
//
//   1) The UI's progress bar was a fake, time-based estimate (see the
//      OLD comment that used to be in lesson.js's updateMotionBuffer)
//      instead of reflecting the REAL motionBuffer.length — so it could
//      read as "basically done" while the model was still nowhere near
//      MOTION_FRAMES_REQUIRED, especially once frame-skipping (frozen-
//      hand frames, below) is factored in. Users trusted the bar and
//      dropped their hand early. FIX: getMotionBufferStatus() below
//      exposes the TRUE count/required/progress, and lesson.js now
//      reads directly from it instead of guessing.
//
//   2) Even with an accurate bar, a user who drops their hand mid-sign
//      used to just... hang. classifyMotion() already tolerates the
//      hand vanishing (it simply stops adding frames — see the
//      `!leftLm && !rightLm` guard), but nothing ever finished the
//      window early, so the attempt would silently sit there until the
//      15s PROMPT_TIMEOUT in lesson.js finally gave up. FIX:
//      finalizeMotionWindow() (new) lets lesson.js force-finish a
//      short window after a brief "hand's really gone" grace period,
//      padding the buffer by repeating its last real frame out to
//      MOTION_FRAMES_REQUIRED so the LSTM still gets the input shape
//      it expects. The sign's real motion is still intact at the
//      front of the window — we're stretching the tail, not fabricating
//      the gesture. If too FEW real frames were captured to make that
//      a fair guess (MOTION_MIN_FRAMES_TO_FINALIZE), it bails out
//      cleanly instead of guessing on mostly-padding.
// ══════════════════════════════════════════════════════════════════

// Require at least 40% of a real window before we'll even attempt a
// padded guess — below that there's not enough real motion to judge.
const MOTION_MIN_FRAMES_TO_FINALIZE = Math.round(MOTION_FRAMES_REQUIRED * 0.4);

/**
 * Shared inference path used by both a normal full window (classifyMotion)
 * and a forced/padded window (finalizeMotionWindow), so the "what counts
 * as a match" logic only lives in one place.
 */
function runMotionInference(frameWindow) {
  const input = tf.tensor3d([frameWindow]);   // shape [1, MOTION_FRAMES_REQUIRED, 130]

  let rawLabel   = null;
  let confidence = 0;
  let runnerUpConfidence = 0;

  tf.tidy(() => {
    const output = motionModel.predict(input);
    const probs  = Array.from(output.dataSync());
    const sorted = [...probs].sort((a, b) => b - a);
    const maxIdx = probs.indexOf(sorted[0]);
    confidence   = Math.round(sorted[0] * 100);
    runnerUpConfidence = Math.round((sorted[1] ?? 0) * 100);
    rawLabel     = motionLabels[String(maxIdx)] ?? null;
  });

  input.dispose();
  logTfMemoryIfDue('runMotionInference (motion)');

  if (!rawLabel) {
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
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  // NEW: same margin-over-runnerup fix as classifyGesture — see the
  // block comment near MATCH_THRESHOLD.
  const passesThreshold = confidence >= MOTION_THRESHOLD
    && (confidence - runnerUpConfidence) >= RUNNERUP_MARGIN_MIN;

  // CHANGED: this used to require the SAME label on two consecutive
  // windows before accepting a match ("confirming" state) — a holdover
  // from when detection ran passively/continuously and needed extra
  // protection against noise. Now that recording is explicitly
  // triggered (3-2-1 countdown, one deliberate attempt), that second
  // window caused a real bug instead of preventing one: after a good
  // first window, the classifier immediately started buffering a
  // SECOND window — but the user, thinking they were done, would
  // relax/lower their hand right then, feeding that irrelevant motion
  // into window two, which predictably failed and overwrote the
  // correct first result with "no sign, 0%" a moment later. A single
  // clean window is the deliberate attempt now; accept it immediately.
  return { label: rawLabel, confidence, matched: passesThreshold, buffering: false };
}

// ══════════════════════════════════════════════════════════════════
// CHANGED — "recording is way too fast now, I can't perform the sign"
// ══════════════════════════════════════════════════════════════════
// The frozen-frame filter removed above was, it turns out, doing double
// duty: besides being wrong (see the comment in classifyMotion()), it
// was ACCIDENTALLY acting as the pacing mechanism. Because a frame only
// "counted" while the hand was actively moving, reaching MOTION_FRAMES_
// REQUIRED (40) counted frames took as long as the sign itself took —
// pauses, hesitation, and a natural pace all just... didn't count
// against the total, so the window stretched to fit however long a
// real performance took.
//
// Removing that filter (correctly — the model still needs to see it)
// meant EVERY frame counts now, so 40 frames complete in exactly
// 40 × DETECT_RATE_ACTIVE_MS (see lesson.js) — a hard, rigid ~2 second
// ceiling with zero room to actually perform a sign naturally. That's
// its own real bug, and worth calling out: it's also a strong candidate
// for why misclassification persisted after the last fix — a sign
// rushed/cut off by a too-short window doesn't resemble the complete,
// natural gesture the model was trained on either.
//
// FIX: stop tying "recording complete" to a raw frame COUNT at all.
// Record for a fixed, comfortable real-TIME window instead
// (MOTION_RECORD_DURATION_MS below), capturing however many raw frames
// come in during that time — could be more or fewer than 40 depending
// on the device's actual detection rate — then RESAMPLE the captured
// sequence to exactly MOTION_FRAMES_REQUIRED frames via linear
// interpolation before running inference. This is not a new technique —
// it's the exact same resampleSequence()/resample_sequence() algorithm
// already used in capture.html and merge_linguawave_data.py for
// normalizing variable-length clips; it's just being applied live here
// instead of offline. This permanently decouples "how long you get to
// sign" from "how many frames the model wants," so it also won't need
// re-tuning again if the detection rate ever changes.
const MOTION_RECORD_DURATION_MS = 2500; // comfortable real-world signing time
let motionRecordStartAt = null;

/**
 * Port of capture.html's resampleSequence() — linear interpolation
 * between the two nearest source frames to stretch/compress a
 * variable-length clip to a fixed target frame count. MUST stay
 * identical to capture.html's version and merge_linguawave_data.py's
 * resample_sequence() — all three need to treat a clip the same way.
 */
function resampleSequence(frames, targetLength) {
  const clean = frames.filter(Boolean);
  if (!clean.length) return null;
  if (clean.length === targetLength) return clean;

  const out = [];
  for (let i = 0; i < targetLength; i++) {
    const srcIdx = targetLength === 1 ? 0 : (i / (targetLength - 1)) * (clean.length - 1);
    const lo = Math.floor(srcIdx), hi = Math.ceil(srcIdx);
    const t = srcIdx - lo;
    if (lo === hi) { out.push(clean[lo]); continue; }
    out.push(clean[lo].map((v, j) => v + (clean[hi][j] - v) * t));
  }
  return out;
}

/**
 * Adds a frame to the motion buffer. Once MOTION_RECORD_DURATION_MS has
 * elapsed since the first frame of this recording, resamples whatever
 * was captured to MOTION_FRAMES_REQUIRED frames and runs the LSTM
 * motion model.
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

  // First frame of a fresh recording — start the clock. Every frame
  // from here on is pushed unconditionally (see the block comment
  // above classifyMotion — no movement filter, matches capture.html).
  if (motionBuffer.length === 0) {
    motionRecordStartAt = performance.now();
  }
  motionBuffer.push(flat);

  const elapsed = performance.now() - motionRecordStartAt;
  if (elapsed < MOTION_RECORD_DURATION_MS) {
    return { label: null, confidence: 0, matched: false, buffering: true };
  }

  const resampled = resampleSequence(motionBuffer, MOTION_FRAMES_REQUIRED);
  motionBuffer = [];
  motionRecordStartAt = null;
  if (!resampled) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }
  return runMotionInference(resampled);
}

/**
 * NEW — force-finishes a short (in-progress) motion window instead of
 * waiting for it to naturally reach MOTION_RECORD_DURATION_MS. Call
 * this when the hand has been missing for a "they clearly dropped
 * their hand" grace period while a recording is armed (see lesson.js).
 *
 * Resamples whatever was captured so far up to MOTION_FRAMES_REQUIRED
 * frames (same technique as a normal completed window — see
 * resampleSequence() above) and runs inference on that. If too few
 * real frames were captured to make that a fair attempt, returns null
 * and clears the buffer — the caller should treat that as "no sign,
 * try again" rather than a real (if low-confidence) guess.
 *
 * @returns {{label,confidence,matched,buffering}|null}
 */
export function finalizeMotionWindow() {
  if (!motionModel || !motionLabels) return null;
  if (motionBuffer.length < MOTION_MIN_FRAMES_TO_FINALIZE) {
    motionBuffer = [];
    motionRecordStartAt = null;
    return null;
  }

  const resampled = resampleSequence(motionBuffer, MOTION_FRAMES_REQUIRED);
  motionBuffer = [];
  motionRecordStartAt = null;
  if (!resampled) return null;
  return runMotionInference(resampled);
}

/**
 * NEW — real (not estimated) buffering progress, for the UI. Now
 * TIME-based rather than frame-count-based (see the block comment near
 * MOTION_RECORD_DURATION_MS for why) — reports elapsed/total recording
 * time plus a 0–1 fraction. lesson.js's progress bar reads from this
 * directly.
 */
export function getMotionBufferStatus() {
  const elapsedMs = motionRecordStartAt ? performance.now() - motionRecordStartAt : 0;
  return {
    count:      motionBuffer.length,
    elapsedMs,
    durationMs: MOTION_RECORD_DURATION_MS,
    progress:   Math.min(elapsedMs / MOTION_RECORD_DURATION_MS, 1),
  };
}

/**
 * Resets the motion frame buffer. Call this when switching signs
 * or exiting assessment mode.
 */
export function resetMotionBuffer() {
  motionBuffer = [];
  motionRecordStartAt = null;
}

// ── Utility ───────────────────────────────────────────────────────

export function landmarkDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}