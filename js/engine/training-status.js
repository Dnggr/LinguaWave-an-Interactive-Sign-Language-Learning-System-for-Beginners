
import { getDetectionType, getSignData } from './dictionary.js';
import { getSignGroup }     from './classifier.js';

const STATIC_LABELS_PATH = '../asl_static_model/labels.json';
const MOTION_LABELS_PATH = '../asl_motion_model/labels.json';

const LABEL_ALIASES = { 'THANK YOU': ['THANKS'], 'THANKS': ['THANK YOU'] };

let labelSetsPromise = null;

async function fetchLabelSet(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json = await res.json();
  return new Set(
    Object.values(json).map((l) => String(l).toUpperCase()).filter((l) => l !== 'NONE')
  );
}

export function loadTrainedLabelSets() {
  if (!labelSetsPromise) {
    labelSetsPromise = Promise.all([
      fetchLabelSet(STATIC_LABELS_PATH).catch((e) => { console.warn('[training-status]', e.message); return null; }),
      fetchLabelSet(MOTION_LABELS_PATH).catch((e) => { console.warn('[training-status]', e.message); return null; }),
    ]).then(([staticSet, motionSet]) => ({ static: staticSet, motion: motionSet }));
  }
  return labelSetsPromise;
}

function candidates(signId) {
  const id = String(signId).toUpperCase();
  return new Set([id, ...getSignGroup(id), ...(LABEL_ALIASES[id] || [])].map((s) => s.toUpperCase()));
}

export function getSignTrainingStatus(signId, sets) {
  const model = getDetectionType(signId) === 'motion' ? 'motion' : 'static';
  const set = sets?.[model];
  if (!set) return { trained: true, model, known: false };
  const inLabels = [...candidates(signId)].some((l) => set.has(l));
  const trained  = inLabels && !getSignData(String(signId).toUpperCase())?.disabled;
  return { trained, model, known: true };
}

export function getSequenceTrainingStatus(steps, sets) {
  const results = steps.map((s) => ({ step: s, ...getSignTrainingStatus(s, sets) }));
  const missing = results.filter((r) => !r.trained).map((r) => r.step);
  return {
    trained: missing.length === 0,
    model: results.some((r) => r.model === 'motion') ? 'motion' : 'static',
    known: results.every((r) => r.known),
    missing,
  };
}
