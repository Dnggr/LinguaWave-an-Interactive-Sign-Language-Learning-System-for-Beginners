
import {
  HolisticLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
import { prepareAssets } from '../mediapipe-assets.js';

let holisticLandmarker = null;
let modelError         = null;
let lastVideoTime      = -1;

let DETECT_INTERVAL_MS = 33;
let lastDetectAt = 0;

const _detectTimings = [];
let _detectTimingCounter = 0;
function logDetectTimingIfDue(ms) {
  _detectTimings.push(ms);
  if (_detectTimings.length > 30) _detectTimings.shift();
  _detectTimingCounter++;
  if (_detectTimingCounter % 60 !== 0) return;
  const avg = _detectTimings.reduce((a, b) => a + b, 0) / _detectTimings.length;
  console.debug(`[holistic timing] call #${_detectTimingCounter}: last=${ms.toFixed(1)}ms, rolling avg (last ${_detectTimings.length})=${avg.toFixed(1)}ms`);
}
let cachedResult = null;

const GHOST_FRAMES = 10;

let lastGoodLeftPts   = null, leftGhostCounter   = 0;
let lastGoodRightPts  = null, rightGhostCounter  = 0;

const FACE_GHOST_FRAMES = 10;
let faceGhostCounter    = 0;
let lastGoodForehead    = null;
let lastGoodChin        = null;

const FOREHEAD_IDX = 10;
const CHIN_IDX     = 152;

const TORSO_GHOST_FRAMES = 10;
let torsoGhostCounter     = 0;
let lastGoodShoulderCenter = null;
let lastGoodHipCenter      = null;

const HAND_ZERO = new Array(63).fill(0);

let anyHandPresent = false;

const trackStats = {
  frames: 0, faceFrames: 0, poseFrames: 0,
  rawLeft: 0, rawRight: 0,
  faceGateLeft: 0, faceGateRight: 0,
  boneAndPoseLeft: 0, boneAndPoseRight: 0,
  jumpHeldLeft: 0, jumpHeldRight: 0,
  ghostLeft: 0, ghostRight: 0,
  freshLeft: 0, freshRight: 0,
  labelSwapSuspectLeft: 0, labelSwapSuspectRight: 0,
  partialAnchorFrames: 0,
};
export function resetTrackingStats() { Object.keys(trackStats).forEach((key) => { trackStats[key] = 0; }); }
export function getTrackingStats() {
  const s = { ...trackStats };
  const f = Math.max(1, s.frames);
  const pct = (n) => `${Math.round(n * 100 / f)}%`;
  s.summary = {
    holisticReturnedLeft: pct(s.rawLeft), holisticReturnedRight: pct(s.rawRight),
    usedLeft: pct(s.freshLeft), usedRight: pct(s.freshRight),
    face: pct(s.faceFrames), pose: pct(s.poseFrames), anchorsPartial: pct(s.partialAnchorFrames),
  };
  let hint = 'Not enough frames yet: keep the hand in view for a few seconds, then call LWTrack.stats() again.';
  if (s.frames >= 40) {
    if (s.rawRight < s.frames * 0.05 && s.rawLeft >= s.frames * 0.2) {
      hint = 'Holistic itself almost never returns the RIGHT hand while it returns the left. Our filters are not the cause: improve lighting, keep the right shoulder and arm inside the frame, and keep the wrist unobstructed.';
    } else if (s.rawLeft < s.frames * 0.05 && s.rawRight >= s.frames * 0.2) {
      hint = 'Holistic itself almost never returns the LEFT hand while it returns the right. Check lighting and framing on the left side.';
    } else if (s.rawRight > 0 && s.freshRight < s.rawRight * 0.5) {
      hint = 'Holistic sees the right hand but our filters drop most of those frames. Look at faceGateRight, boneAndPoseRight and jumpHeldRight to see which one.';
    } else if (s.rawLeft > 0 && s.freshLeft < s.rawLeft * 0.5) {
      hint = 'Holistic sees the left hand but our filters drop most of those frames. Look at faceGateLeft, boneAndPoseLeft and jumpHeldLeft.';
    } else if (s.labelSwapSuspectLeft > s.rawLeft * 0.6 && s.labelSwapSuspectRight > s.rawRight * 0.6) {
      hint = 'Holistic labels look swapped relative to the pose model (each hand sits nearer the opposite pose wrist).';
    } else {
      hint = 'Tracking looks healthy on both hands. If a sign still fails, the cause is classification, not detection.';
    }
  }
  s.hint = hint;
  return s;
}
if (typeof window !== 'undefined') {
  window.LWTrack = { stats: () => { const s = getTrackingStats(); console.table(s.summary); console.log(s.hint, s); return s; }, reset: resetTrackingStats };
}

export function resetTracking() {
  cachedResult = null;
  lastVideoTime = -1;
  lastDetectAt = 0;
  lastGoodLeftPts = null; leftGhostCounter = 0;
  lastGoodRightPts = null; rightGhostCounter = 0;
  faceGhostCounter = 0; lastGoodForehead = null; lastGoodChin = null;
  torsoGhostCounter = 0; lastGoodShoulderCenter = null; lastGoodHipCenter = null;
  leftPendingJumpPts = null; leftPendingJumpCount = 0;
  rightPendingJumpPts = null; rightPendingJumpCount = 0;
  leftBoneLengthBaseline = null; rightBoneLengthBaseline = null;
  anyHandPresent = false;
}

const MAX_HAND_FACE_RADIUS = 6.5;

const JUMP_DISTANCE_THRESHOLD = 0.30;
const JUMP_CONFIRM_FRAMES     = 2;

let leftPendingJumpPts = null, leftPendingJumpCount  = 0;

const BONE_LENGTH_TOLERANCE  = 0.65;
const BONE_LENGTH_EMA_ALPHA  = 0.05;
const POSE_DISAGREEMENT_MAX  = 0.22;
const POSE_LEFT_WRIST_IDX    = 15;
const POSE_RIGHT_WRIST_IDX   = 16;
const POSE_LEFT_SHOULDER_IDX = 11;
const POSE_RIGHT_SHOULDER_IDX= 12;
const POSE_LEFT_HIP_IDX       = 23;
const POSE_RIGHT_HIP_IDX      = 24;

let leftBoneLengthBaseline  = null;
let rightBoneLengthBaseline = null;

let rightPendingJumpPts = null, rightPendingJumpCount = 0;


export async function initMediaPipe(opts = {}) {
  console.log('[mediapipe] Loading HolisticLandmarker model…');

  const { wasmBase, modelBytes } = await prepareAssets(opts);
  if (typeof opts.onPhase === 'function') opts.onPhase('starting');
  const vision = await FilesetResolver.forVisionTasks(wasmBase);

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
        modelAssetBuffer: modelBytes.slice(),
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
        modelAssetBuffer: modelBytes.slice(),
        delegate: 'CPU',
      },
    });
    console.log('[mediapipe] HolisticLandmarker model ready (CPU delegate).');
  } catch (e) {
    console.error('[mediapipe] HolisticLandmarker failed to load:', e.message);
    modelError = e.message;
    throw e;
  }
}

function inFrame(p, margin = 0.02) {
  return !!p && p.x >= -margin && p.x <= 1 + margin && p.y >= -margin && p.y <= 1 + margin;
}

function firstOf(list) {
  if (!list || list.length === 0) return null;
  return Array.isArray(list[0]) ? list[0] : list;
}

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function faceRelativeFeatures(handLandmarks, forehead, chin, shoulderCenter, hipCenter) {
  if (!handLandmarks || !handLandmarks.length) return [0, 0, 0, 0];
  const wrist = handLandmarks[0];
  const faceHeight = (forehead && chin) ? (dist3(forehead, chin) || 1e-6) : null;
  const handToChin     = (forehead && chin && faceHeight) ? dist3(wrist, chin) / faceHeight : 0;
  const handToForehead = (forehead && chin && faceHeight) ? dist3(wrist, forehead) / faceHeight : 0;
  const torsoUnit = faceHeight || ((shoulderCenter && hipCenter) ? (dist3(shoulderCenter, hipCenter) || 1e-6) : null);
  const handToShoulder = (shoulderCenter && torsoUnit) ? dist3(wrist, shoulderCenter) / torsoUnit : 0;
  const handToHip       = (hipCenter && torsoUnit)      ? dist3(wrist, hipCenter) / torsoUnit      : 0;
  return [handToChin, handToForehead, handToShoulder, handToHip];
}

function palmOrientation(handPts) {
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

function isHandNearFace(handPts, forehead, chin) {
  if (!handPts || !forehead || !chin) return true;
  const faceHeight = dist3(forehead, chin) || 1e-6;
  const faceCenter = { x: (forehead.x + chin.x) / 2, y: (forehead.y + chin.y) / 2 };
  const wristDist  = dist2(handPts[0], faceCenter) / faceHeight;
  return wristDist <= MAX_HAND_FACE_RADIUS;
}

function boneLength(handPts) {
  return dist3(handPts[0], handPts[9]);
}

function isBoneLengthPlausible(handPts, baseline) {
  if (baseline === null) return true;
  const current = boneLength(handPts);
  return Math.abs(current - baseline) / baseline <= BONE_LENGTH_TOLERANCE;
}

function updateBoneLengthBaseline(baseline, handPts) {
  const current = boneLength(handPts);
  return baseline === null ? current : baseline + BONE_LENGTH_EMA_ALPHA * (current - baseline);
}

function isWristNearPoseWrist(handPts, poseWrist) {
  if (!poseWrist) return true;
  return dist2(handPts[0], poseWrist) <= POSE_DISAGREEMENT_MAX;
}

function debounceJump(newPts, lastGoodPts, pendingPts, pendingCount) {
  if (!newPts || !lastGoodPts) {
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  const jump = dist2(newPts[0], lastGoodPts[0]);
  if (jump <= JUMP_DISTANCE_THRESHOLD) {
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  let nextPendingPts, nextPendingCount;
  if (pendingPts && dist2(newPts[0], pendingPts[0]) <= JUMP_DISTANCE_THRESHOLD) {
    nextPendingPts   = pendingPts;
    nextPendingCount = pendingCount + 1;
  } else {
    nextPendingPts   = newPts;
    nextPendingCount = 1;
  }
  if (nextPendingCount >= JUMP_CONFIRM_FRAMES) {
    return { value: newPts, pendingPts: null, pendingCount: 0 };
  }
  return { value: lastGoodPts, pendingPts: nextPendingPts, pendingCount: nextPendingCount };
}

export function buildFeatureVec(leftPts, rightPts, forehead, chin, shoulderCenter, hipCenter) {
  const leftPresent  = leftPts  ? 1 : 0;
  const rightPresent = rightPts ? 1 : 0;
  if (!leftPts && !rightPts) return null;

  const faceExtra = faceRelativeFeatures(rightPts || leftPts, forehead, chin, shoulderCenter, hipCenter);
  const leftVec   = leftPts  ? leftPts.flatMap(p => [p.x, p.y, p.z])  : HAND_ZERO;
  const rightVec  = rightPts ? rightPts.flatMap(p => [p.x, p.y, p.z]) : HAND_ZERO;
  const leftOrient  = palmOrientation(leftPts);
  const rightOrient = palmOrientation(rightPts);

  return [...leftVec, ...rightVec, leftPresent, rightPresent, ...faceExtra, ...leftOrient, ...rightOrient];
}

export function processFrame(videoElement) {
  if (!holisticLandmarker) {
    return {
      leftHandLandmarks: null, rightHandLandmarks: null, faceLandmarks: null,
      poseLandmarks: null, shoulderCenter: null, hipCenter: null,
      forehead: null, chin: null, anyHandPresent: false, featureVec: null,
    };
  }

  const now = performance.now();

  const sameVideoFrame = videoElement.currentTime === lastVideoTime;
  const withinThrottle = now - lastDetectAt < DETECT_INTERVAL_MS;

  if ((sameVideoFrame || withinThrottle) && cachedResult) {
    return cachedResult;
  }
  lastVideoTime = videoElement.currentTime;
  lastDetectAt  = now;

  const detectStart = performance.now();
  const result = holisticLandmarker.detectForVideo(videoElement, now);
  logDetectTimingIfDue(performance.now() - detectStart);

  const leftRaw  = firstOf(result.leftHandLandmarks);
  const rightRaw = firstOf(result.rightHandLandmarks);
  const faceRaw  = firstOf(result.faceLandmarks);
  const poseRaw       = firstOf(result.poseLandmarks);
  const poseLeftWrist  = poseRaw ? poseRaw[POSE_LEFT_WRIST_IDX]  : null;
  const poseRightWrist = poseRaw ? poseRaw[POSE_RIGHT_WRIST_IDX] : null;

  const faceTrusted = !!faceRaw && inFrame(faceRaw[FOREHEAD_IDX]) && inFrame(faceRaw[CHIN_IDX]);
  const poseTrusted = !!poseRaw
    && inFrame(poseRaw[POSE_LEFT_SHOULDER_IDX]) && inFrame(poseRaw[POSE_RIGHT_SHOULDER_IDX])
    && inFrame(poseRaw[POSE_LEFT_HIP_IDX])      && inFrame(poseRaw[POSE_RIGHT_HIP_IDX]);
  const crossWristL = (poseTrusted && inFrame(poseLeftWrist))  ? poseLeftWrist  : null;
  const crossWristR = (poseTrusted && inFrame(poseRightWrist)) ? poseRightWrist : null;
  if (!faceTrusted || !poseTrusted) trackStats.partialAnchorFrames++;

  trackStats.frames++;
  if (faceRaw) trackStats.faceFrames++;
  if (poseRaw) trackStats.poseFrames++;
  if (leftRaw)  trackStats.rawLeft++;
  if (rightRaw) trackStats.rawRight++;
  if (leftRaw && poseLeftWrist && poseRightWrist && dist2(leftRaw[0], poseRightWrist) + 0.05 < dist2(leftRaw[0], poseLeftWrist)) trackStats.labelSwapSuspectLeft++;
  if (rightRaw && poseLeftWrist && poseRightWrist && dist2(rightRaw[0], poseLeftWrist) + 0.05 < dist2(rightRaw[0], poseRightWrist)) trackStats.labelSwapSuspectRight++;

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

  let shoulderCenter, hipCenter;
  if (poseRaw && poseRaw[POSE_LEFT_SHOULDER_IDX] && poseRaw[POSE_RIGHT_SHOULDER_IDX]) {
    torsoGhostCounter = 0;
    const ls = poseRaw[POSE_LEFT_SHOULDER_IDX], rs = poseRaw[POSE_RIGHT_SHOULDER_IDX];
    shoulderCenter = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2 };
    lastGoodShoulderCenter = shoulderCenter;
    if (poseRaw[POSE_LEFT_HIP_IDX] && poseRaw[POSE_RIGHT_HIP_IDX]) {
      const lh = poseRaw[POSE_LEFT_HIP_IDX], rh = poseRaw[POSE_RIGHT_HIP_IDX];
      hipCenter = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: (lh.z + rh.z) / 2 };
      lastGoodHipCenter = hipCenter;
    } else {
      hipCenter = null; lastGoodHipCenter = null;
    }
  } else {
    torsoGhostCounter++;
    if (torsoGhostCounter <= TORSO_GHOST_FRAMES && lastGoodShoulderCenter) {
      shoulderCenter = lastGoodShoulderCenter;
      hipCenter      = lastGoodHipCenter;
    } else {
      shoulderCenter = null; hipCenter = null;
      lastGoodShoulderCenter = null; lastGoodHipCenter = null;
    }
  }

  let leftFiltered  = leftRaw;
  let rightFiltered = rightRaw;
  if (faceTrusted) {
    if (leftFiltered  && !isHandNearFace(leftFiltered, forehead, chin))  { leftFiltered  = null; trackStats.faceGateLeft++; }
    if (rightFiltered && !isHandNearFace(rightFiltered, forehead, chin)) { rightFiltered = null; trackStats.faceGateRight++; }
  }

  if (leftFiltered && !isBoneLengthPlausible(leftFiltered, leftBoneLengthBaseline)
                   && !isWristNearPoseWrist(leftFiltered, crossWristL)) {
    leftFiltered = null; trackStats.boneAndPoseLeft++;
  }
  if (rightFiltered && !isBoneLengthPlausible(rightFiltered, rightBoneLengthBaseline)
                     && !isWristNearPoseWrist(rightFiltered, crossWristR)) {
    rightFiltered = null; trackStats.boneAndPoseRight++;
  }

  const leftJump = debounceJump(leftFiltered, lastGoodLeftPts, leftPendingJumpPts, leftPendingJumpCount);
  leftFiltered        = leftJump.value;
  leftPendingJumpPts   = leftJump.pendingPts;
  leftPendingJumpCount = leftJump.pendingCount;
  if (leftJump.pendingCount > 0) trackStats.jumpHeldLeft++;

  const rightJump = debounceJump(rightFiltered, lastGoodRightPts, rightPendingJumpPts, rightPendingJumpCount);
  rightFiltered         = rightJump.value;
  rightPendingJumpPts   = rightJump.pendingPts;
  rightPendingJumpCount = rightJump.pendingCount;
  if (rightJump.pendingCount > 0) trackStats.jumpHeldRight++;

  let leftPts = leftFiltered;
  if (leftPts) {
    lastGoodLeftPts = leftPts;
    leftGhostCounter = 0;
    leftBoneLengthBaseline = updateBoneLengthBaseline(leftBoneLengthBaseline, leftPts);
    trackStats.freshLeft++;
  }
  else if (lastGoodLeftPts && leftGhostCounter < GHOST_FRAMES) { leftPts = lastGoodLeftPts; leftGhostCounter++; trackStats.ghostLeft++; }
  else { leftPts = null; lastGoodLeftPts = null; leftBoneLengthBaseline = null; }

  let rightPts = rightFiltered;
  if (rightPts) {
    lastGoodRightPts = rightPts;
    rightGhostCounter = 0;
    rightBoneLengthBaseline = updateBoneLengthBaseline(rightBoneLengthBaseline, rightPts);
    trackStats.freshRight++;
  }
  else if (lastGoodRightPts && rightGhostCounter < GHOST_FRAMES) { rightPts = lastGoodRightPts; rightGhostCounter++; trackStats.ghostRight++; }
  else { rightPts = null; lastGoodRightPts = null; rightBoneLengthBaseline = null; }

  anyHandPresent = !!(leftPts || rightPts);

  cachedResult = {
    leftHandLandmarks:  leftPts,
    rightHandLandmarks: rightPts,
    faceLandmarks:      faceRaw ?? null,
    poseLandmarks: poseRaw ?? null,
    shoulderCenter,
    hipCenter,
    forehead,
    chin,
    anyHandPresent,
    _fv: undefined,
    get featureVec() {
      if (this._fv === undefined) this._fv = buildFeatureVec(leftPts, rightPts, forehead, chin, shoulderCenter, hipCenter);
      return this._fv;
    },
  };
  return cachedResult;
}

export function setDetectionInterval(ms) {
  if (typeof ms === 'number' && ms > 0) {
    DETECT_INTERVAL_MS = ms;
  }
}

export function isModelReady() {
  return holisticLandmarker !== null;
}

export function getModelError() {
  return modelError;
}
