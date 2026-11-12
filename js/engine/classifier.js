
await new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js';
  s.onload  = resolve;
  s.onerror = () => reject(new Error('[classifier] Failed to load TensorFlow.js from CDN.'));
  document.head.appendChild(s);
});

const tf = window.tf;
if (!tf) throw new Error('[classifier] window.tf is undefined after script load.');

let _memCheckCounter = 0;
function logTfMemoryIfDue(label) {
  _memCheckCounter++;
  if (_memCheckCounter % 60 !== 0) return;
  const mem = tf.memory();
  console.debug(`[tf.memory] after ${label} (call #${_memCheckCounter}): numTensors=${mem.numTensors}, numBytes=${(mem.numBytes / 1024 / 1024).toFixed(2)}MB`);
}

let _lastNearMissAt = 0;
function logNearMiss(kind, label, result, topRaw) {
  try {
    if (!result || result.matched || !(result.confidence >= 40)) return;
    const now = performance.now();
    if (now - _lastNearMissAt < 1000) return;
    _lastNearMissAt = now;
    console.debug(`[near-miss:${kind}] ${label} @ ${result.confidence}% (below match rules)${topRaw ? ' top: ' + topRaw : ''}`);
  } catch {  }
}

import { SIGN_DICTIONARY, getDetectionType } from './dictionary.js';

const STATIC_MODEL_PATH  = '../asl_static_model/model.json';
const STATIC_LABELS_PATH = '../asl_static_model/labels.json';
const MOTION_MODEL_PATH  = '../asl_motion_model/model.json';
const MOTION_LABELS_PATH = '../asl_motion_model/labels.json';

const MATCH_THRESHOLD         = 75;
const MOTION_THRESHOLD        = 70;
const RUNNERUP_MARGIN_MIN     = 20;
const MOTION_FRAMES_REQUIRED = 40;

const FOREHEAD_IDX = 10;
const CHIN_IDX      = 152;
const POSE_LEFT_SHOULDER_IDX = 11;
const POSE_RIGHT_SHOULDER_IDX= 12;
const POSE_LEFT_HIP_IDX       = 23;
const POSE_RIGHT_HIP_IDX      = 24;
export const HAND_FEATURE_COUNT     = 126;
export const PRESENCE_FEATURE_COUNT = 2;
export const FACE_FEATURE_COUNT     = 4;
export const ORIENTATION_FEATURE_COUNT = 6;
export const TOTAL_FEATURE_COUNT    = HAND_FEATURE_COUNT + PRESENCE_FEATURE_COUNT + FACE_FEATURE_COUNT + ORIENTATION_FEATURE_COUNT;

const HAND_ZERO = new Array(63).fill(0);

const SIGN_GROUPS = [
  ['0', 'O'],
  ['BRING', 'CARRY'],
  ['PLANT', 'SPRING'],
  ['COLD', 'WINTER'],
  ['HELLO', 'HI'],
  ['GOODBYE', 'BYE'],
  ['NIGHT', 'EVENING'],
  ['SLEEP', 'SLEEPY'],
  ['LOOK', 'SEE'],
  ['CLEAN', 'NEAT', 'NICE'],
  ['BIRD', 'CHICKEN'],
  ['DRAW', 'ART'],
  ['COOK', 'CHEF'],
  ['BACK', 'BEHIND'],
  ['NOW', 'TODAY'],
  ['FORWARD', 'PUSH'],
  ['SURE', 'TRUE', 'REALLY'],
  ['SING', 'MUSIC'],
  ['TABLE', 'DESK'],
  ['DOOR', 'CABINET', 'CLOSET'],
  ['BATHROOM', 'TOILET'],
  ['HAT', 'CAP'],
  ['BOAT', 'SHIP'],
  ['MELON', 'PUMPKIN'],
  ['CLOUD', 'CLOUDY'],
  ['WIND', 'WINDY', 'STORMY'],
  ['RAIN', 'RAINY'],
  ['BITTER', 'SOUR'],
  ['FINISH', 'FINISHED'],
  ['THANK YOU', 'THANKS'],
];
const GROUP_OF = (() => {
  const m = new Map();
  for (const g of SIGN_GROUPS) for (const l of g) m.set(l, g);
  return m;
})();

export function getSignGroup(label) {
  return GROUP_OF.get(label) ? [...GROUP_OF.get(label)] : [label];
}

function pickWinnerPoolingTwins(probs, labels, allowedLabels, targetSign = null) {
  const idxByLabel = new Map();
  probs.forEach((_, i) => idxByLabel.set(labels[String(i)], i));
  const targetGroup = targetSign ? (GROUP_OF.get(targetSign) || null) : null;

  const pooled = (i) => {
    let p = probs[i];
    for (const twin of (GROUP_OF.get(labels[String(i)]) || [])) {
      const j = idxByLabel.get(twin);
      if (j != null && j !== i) p += probs[j];
    }
    return Math.min(p, 1);
  };

  const candidates = probs
    .map((_, i) => i)
    .filter(i => !allowedLabels
      || allowedLabels.has(labels[String(i)])
      || (targetGroup && targetGroup.includes(labels[String(i)])))
    .sort((a, b) => (pooled(b) - pooled(a)) || (probs[b] - probs[a]));

  if (!candidates.length) return { label: null, confidence: 0, runnerUpConfidence: 0 };

  const win = candidates[0];
  const winLabel = labels[String(win)];
  const winGroup = GROUP_OF.get(winLabel) || null;
  const runner = candidates.slice(1).find(i => !(winGroup && winGroup.includes(labels[String(i)])));

  const outLabel = (targetGroup && winGroup === targetGroup) ? targetSign : winLabel;

  return {
    label: outLabel ?? null,
    confidence: Math.round(pooled(win) * 100),
    runnerUpConfidence: runner == null ? 0 : Math.round(pooled(runner) * 100),
  };
}

let staticModel  = null;
let staticLabels = null;
let motionModel  = null;
let motionLabels = null;
let motionModelError = null;

export function getMotionModelError() { return motionModelError; }

let motionBuffer = [];


function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalizeHandLandmarks(pts) {
  if (!pts) return null;
  const wrist = pts[0];
  const scale = dist3(wrist, pts[9]) || 1e-6;
  return pts.map(p => ({
    x: (p.x - wrist.x) / scale,
    y: (p.y - wrist.y) / scale,
    z: (p.z - wrist.z) / scale,
  }));
}

export function computeTorsoCenters(poseLm) {
  if (!poseLm) return { shoulderCenter: null, hipCenter: null };
  const ls = poseLm[POSE_LEFT_SHOULDER_IDX], rs = poseLm[POSE_RIGHT_SHOULDER_IDX];
  if (!ls || !rs) return { shoulderCenter: null, hipCenter: null };
  const shoulderCenter = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2 };

  const lh = poseLm[POSE_LEFT_HIP_IDX], rh = poseLm[POSE_RIGHT_HIP_IDX];
  const hipCenter = (lh && rh) ? { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: (lh.z + rh.z) / 2 } : null;

  return { shoulderCenter, hipCenter };
}

export function computeFaceRelativeFeatures(dominantHandLm, faceLm, poseLm) {
  if (!dominantHandLm || !dominantHandLm.length) return [0, 0, 0, 0];
  const wrist = dominantHandLm[0];

  const chin     = faceLm ? faceLm[CHIN_IDX]     : null;
  const forehead = faceLm ? faceLm[FOREHEAD_IDX] : null;
  const faceHeight = (forehead && chin) ? (dist3(forehead, chin) || 1e-6) : null;
  const handToChin     = (forehead && chin && faceHeight) ? dist3(wrist, chin) / faceHeight : 0;
  const handToForehead = (forehead && chin && faceHeight) ? dist3(wrist, forehead) / faceHeight : 0;

  const { shoulderCenter, hipCenter } = computeTorsoCenters(poseLm);
  const torsoUnit = faceHeight || ((shoulderCenter && hipCenter) ? (dist3(shoulderCenter, hipCenter) || 1e-6) : null);
  const handToShoulder = (shoulderCenter && torsoUnit) ? dist3(wrist, shoulderCenter) / torsoUnit : 0;
  const handToHip       = (hipCenter && torsoUnit)      ? dist3(wrist, hipCenter) / torsoUnit      : 0;

  return [handToChin, handToForehead, handToShoulder, handToHip];
}

export function palmOrientation(handPts) {
  if (!handPts) return [0, 0, 0];
  const wrist = handPts[0], indexMcp = handPts[5], pinkyMcp = handPts[17];
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z };
  const nx = v1.y * v2.z - v1.z * v2.y;
  const ny = v1.z * v2.x - v1.x * v2.z;
  const nz = v1.x * v2.y - v1.y * v2.x;
  const mag = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1e-6;
  return [nx / mag, ny / mag, nz / mag];
}

function buildFeatureVector(leftLm, rightLm, faceLandmarks, poseLandmarks) {
  const leftPresent  = leftLm  ? 1 : 0;
  const rightPresent = rightLm ? 1 : 0;
  if (!leftLm && !rightLm) return null;

  const faceFeat = computeFaceRelativeFeatures(rightLm || leftLm, faceLandmarks, poseLandmarks);
  const leftNorm  = normalizeHandLandmarks(leftLm);
  const rightNorm = normalizeHandLandmarks(rightLm);
  const leftVec  = leftNorm  ? leftNorm.flatMap(p => [p.x, p.y, p.z])  : HAND_ZERO;
  const rightVec = rightNorm ? rightNorm.flatMap(p => [p.x, p.y, p.z]) : HAND_ZERO;
  const leftOrient  = palmOrientation(leftLm);
  const rightOrient = palmOrientation(rightLm);

  return [...leftVec, ...rightVec, leftPresent, rightPresent, ...faceFeat, ...leftOrient, ...rightOrient];
}


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


const _labelFetches = {};
function fetchLabelsOnce(kind) {
  if (!_labelFetches[kind]) {
    const path = kind === 'motion' ? MOTION_LABELS_PATH : STATIC_LABELS_PATH;
    _labelFetches[kind] = fetch(path, { cache: 'no-cache' })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .catch((e) => { delete _labelFetches[kind]; throw e; });
  }
  return _labelFetches[kind];
}

export async function loadModelLabels() {
  const [s, m] = await Promise.allSettled([fetchLabelsOnce('static'), fetchLabelsOnce('motion')]);
  if (s.status === 'fulfilled') staticLabels = s.value; else console.warn('[classifier] static labels.json not loaded:', s.reason?.message);
  if (m.status === 'fulfilled') motionLabels = m.value; else console.warn('[classifier] motion labels.json not loaded:', m.reason?.message);
}

export async function loadModels() {
  console.log('[classifier] Loading static model…');
  try {
    staticModel  = await loadKeras3CompatModel(STATIC_MODEL_PATH);
    staticLabels = await fetchLabelsOnce('static');
    console.log('[classifier] Static model ready. Labels:', staticLabels);
  } catch (e) {
    console.error('[classifier] Failed to load static model:', e.message);
    console.error('[classifier] → Verify: /asl_static_model/model.json exists in project root.');
    throw e;
  }

  console.log('[classifier] Loading motion model…');
  try {
    motionModel  = await loadKeras3CompatModel(MOTION_MODEL_PATH);
    motionLabels = await fetchLabelsOnce('motion');
    console.log('[classifier] Motion model ready. Labels:', motionLabels);
  } catch (e) {
    console.warn('[classifier] Motion model not loaded:', e.message);
    motionModelError = e.message;
  }
}

export const NONE_LABEL = 'NONE';

const ALLOW_TWIN_ALIASES = true;

export function getTrainedLabelSet(kind) {
  const labels = kind === 'motion' ? motionLabels : staticLabels;
  if (!labels) return null;
  return new Set(Object.values(labels).filter((l) => l !== NONE_LABEL));
}

export function isSignClassifiable(signId) {
  const id = String(signId ?? '');
  if (!id || id === NONE_LABEL || !SIGN_DICTIONARY[id]) return false;
  const trained = getTrainedLabelSet(getDetectionType(id) === 'motion' ? 'motion' : 'static');
  if (!trained) return false;
  const members = ALLOW_TWIN_ALIASES ? getSignGroup(id) : [id];
  return members.some((m) => m !== NONE_LABEL && trained.has(m));
}

export function isTrainedLabel(signId) {
  const id = String(signId ?? '');
  if (!id || id === NONE_LABEL || !SIGN_DICTIONARY[id]) return false;
  return !!getTrainedLabelSet(getDetectionType(id) === 'motion' ? 'motion' : 'static')?.has(id);
}

export function getClassifiableSigns() {
  const candidates = new Set();
  for (const kind of ['static', 'motion']) {
    for (const label of getTrainedLabelSet(kind) ?? []) getSignGroup(label).forEach((g) => candidates.add(g));
  }
  return [...candidates].filter(isSignClassifiable);
}

export function isClassifierReady() {
  return staticModel !== null && staticLabels !== null;
}

export function isMotionModelReady() {
  return motionModel !== null && motionLabels !== null;
}

const AMBIDEXTROUS_FALLBACK = true;

function mirrorHandBlock(flat, start) {
  const out = new Array(63);
  for (let i = 0; i < 63; i++) {
    const v = flat[start + i];
    out[i] = (i % 3 === 0 && v !== 0) ? -v : v;
  }
  return out;
}
function reflectOrientation(flat, start) {
  const ny = flat[start + 1], nz = flat[start + 2];
  return [flat[start], ny === 0 ? 0 : -ny, nz === 0 ? 0 : -nz];
}
export function mirrorFeatureVector(flat) {
  return [
    ...mirrorHandBlock(flat, 63), ...mirrorHandBlock(flat, 0),
    flat[127], flat[126],
    flat[128], flat[129], flat[130], flat[131],
    ...reflectOrientation(flat, 135), ...reflectOrientation(flat, 132),
  ];
}
const isSingleHandVector = (flat) => flat[126] !== flat[127];
function labelConfirmsTarget(label, targetSign) {
  if (!targetSign) return true;
  if (label === targetSign) return true;
  const group = getSignGroup(targetSign);
  return !!group && group.includes(label);
}


export function classifyGesture(leftLm, rightLm, faceLandmarks, allowedLabels = null, poseLandmarks = null, targetSign = null) {
  if (!staticModel || !staticLabels) return { label: null, confidence: 0, matched: false };
  if (!leftLm && !rightLm) return { label: null, confidence: 0, matched: false };

  const flat = buildFeatureVector(leftLm, rightLm, faceLandmarks, poseLandmarks);
  if (!flat) return { label: null, confidence: 0, matched: false };

  const infer = (vector) => {
    const input = tf.tensor2d([vector]);
    let picked = null;
    try {
      tf.tidy(() => {
        const output = staticModel.predict(input);
        const probs  = Array.from(output.dataSync());
        picked = pickWinnerPoolingTwins(probs, staticLabels, allowedLabels, targetSign);
      });
    } finally {
      input.dispose();
    }
    return picked;
  };
  const passes = (r) => !!(r && r.label && r.label !== NONE_LABEL && SIGN_DICTIONARY[r.label]
    && r.confidence >= MATCH_THRESHOLD && (r.confidence - r.runnerUpConfidence) >= RUNNERUP_MARGIN_MIN);

  let r = infer(flat);
  if (AMBIDEXTROUS_FALLBACK && isSingleHandVector(flat) && !passes(r)) {
    const mirrored = infer(mirrorFeatureVector(flat));
    if (passes(mirrored) && labelConfirmsTarget(mirrored.label, targetSign)) r = mirrored;
  }
  logTfMemoryIfDue('classifyGesture (static)');

  const rawLabel = r ? r.label : null;
  const confidence = r ? r.confidence : 0;
  const runnerUpConfidence = r ? r.runnerUpConfidence : 0;
  const topRaw = r ? r.topRaw : '';

  if (!rawLabel) return { label: null, confidence: 0, matched: false };

  if (rawLabel === NONE_LABEL || !SIGN_DICTIONARY[rawLabel]) return { label: null, confidence: 0, matched: false };

  const matched = confidence >= MATCH_THRESHOLD && (confidence - runnerUpConfidence) >= RUNNERUP_MARGIN_MIN;
  logNearMiss('static', rawLabel, { matched, label: rawLabel, confidence }, topRaw);

  return {
    label:    rawLabel,
    confidence,
    matched,
  };
}

export function getAllowedLabelsForSign(signId) {
  const cat = SIGN_DICTIONARY[signId]?.category;
  if (!cat) return null;
  return new Set(Object.keys(SIGN_DICTIONARY).filter(l => SIGN_DICTIONARY[l].category === cat));
}


const MOTION_MIN_FRAMES_TO_FINALIZE = Math.round(MOTION_FRAMES_REQUIRED * 0.4);

function runMotionInference(frameWindow, allowedLabels = null, targetSign = null) {
  const infer = (window40) => {
    const input = tf.tensor3d([window40]);
    let picked = null;
    try {
      tf.tidy(() => {
        const output = motionModel.predict(input);
        const probs  = Array.from(output.dataSync());
        picked = pickWinnerPoolingTwins(probs, motionLabels, allowedLabels, targetSign);
      });
    } finally {
      input.dispose();
    }
    return picked;
  };
  const passes = (r) => !!(r && r.label && r.label !== NONE_LABEL && SIGN_DICTIONARY[r.label]
    && r.confidence >= MOTION_THRESHOLD && (r.confidence - r.runnerUpConfidence) >= RUNNERUP_MARGIN_MIN);

  let r = infer(frameWindow);
  if (AMBIDEXTROUS_FALLBACK && !passes(r) && frameWindow.filter(isSingleHandVector).length >= frameWindow.length * 0.8) {
    const mirrored = infer(frameWindow.map(mirrorFeatureVector));
    if (passes(mirrored) && labelConfirmsTarget(mirrored.label, targetSign)) r = mirrored;
  }
  logTfMemoryIfDue('runMotionInference (motion)');

  const rawLabel = r ? r.label : null;
  const confidence = r ? r.confidence : 0;
  const runnerUpConfidence = r ? r.runnerUpConfidence : 0;
  const topRaw = r ? r.topRaw : '';

  if (!rawLabel) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  if (rawLabel === NONE_LABEL || !SIGN_DICTIONARY[rawLabel]) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const passesThreshold = confidence >= MOTION_THRESHOLD
    && (confidence - runnerUpConfidence) >= RUNNERUP_MARGIN_MIN;
  logNearMiss('motion', rawLabel, { matched: passesThreshold, label: rawLabel, confidence }, topRaw);
  return { label: rawLabel, confidence, matched: passesThreshold, buffering: false };
}

const MOTION_RECORD_DURATION_MS = 2500;
let motionRecordStartAt = null;

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

export function classifyMotion(leftLm, rightLm, faceLandmarks, allowedLabels = null, poseLandmarks = null, targetSign = null) {
  if (!motionModel || !motionLabels) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }
  if (!leftLm && !rightLm) {
    return { label: null, confidence: 0, matched: false, buffering: false };
  }

  const flat = buildFeatureVector(leftLm, rightLm, faceLandmarks, poseLandmarks);
  if (!flat) {
    return { label: null, confidence: 0, matched: false, buffering: motionBuffer.length > 0 };
  }

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
  return runMotionInference(resampled, allowedLabels, targetSign);
}

export function finalizeMotionWindow(allowedLabels = null, targetSign = null) {
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
  return runMotionInference(resampled, allowedLabels, targetSign);
}

export function getMotionBufferStatus() {
  const elapsedMs = motionRecordStartAt ? performance.now() - motionRecordStartAt : 0;
  return {
    count:      motionBuffer.length,
    elapsedMs,
    durationMs: MOTION_RECORD_DURATION_MS,
    progress:   Math.min(elapsedMs / MOTION_RECORD_DURATION_MS, 1),
  };
}

export function resetMotionBuffer() {
  motionBuffer = [];
  motionRecordStartAt = null;
}


export function landmarkDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
