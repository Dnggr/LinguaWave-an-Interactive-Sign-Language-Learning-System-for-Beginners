/*
  js/engine/training-status.js — "does the model actually know this sign?"
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Single source of truth for whether a sign has TRAINED DATA,
             read straight from the two labels.json files instead of the
             hand-maintained `disabled: true` flags in dictionary.js
             (which drift out of sync every time a model is retrained).
  USED BY  : js/camera-practice.js — locks the Practice Check button and
             shows the "no trained data yet" modal for untrained signs.
  RULES    :
    - Which model to check comes from getDetectionType(): 'motion' signs
      are looked up in asl_motion_model/labels.json, everything else in
      asl_static_model/labels.json. A sign with NO dictionary entry
      defaults to 'static' (same as the classifier), so it counts as
      untrained unless the static model really has it.
    - Twins count (SIGN_GROUPS in classifier.js, e.g. BRING/CARRY): the
      classifier pools twin probabilities, so if any twin is trained the
      sign is detectable.
    - A sign explicitly marked `disabled: true` in dictionary.js is treated
      as untrained too — the classifier refuses to match it regardless of
      what labels.json says, so Practice Check could never pass it.
    - Multi-step phrases (data.js `sequence`) are trained only if EVERY
      step is trained.
    - FAILS OPEN: if a labels.json can't be fetched, nothing is locked.
      A network hiccup must never lock every sign for every learner.
  ─────────────────────────────────────────────────────────────────
*/

import { getDetectionType, getSignData } from './dictionary.js';
import { getSignGroup }     from './classifier.js';

// Same document-relative paths classifier.js uses (resolved against pages/).
const STATIC_LABELS_PATH = '../asl_static_model/labels.json';
const MOTION_LABELS_PATH = '../asl_motion_model/labels.json';

// Lesson spelling -> trained-label spelling, for names that differ but are
// NOT in SIGN_GROUPS. (Dictionary already treats THANKS as THANK YOU.)
const LABEL_ALIASES = { 'THANK YOU': ['THANKS'], 'THANKS': ['THANK YOU'] };

let labelSetsPromise = null;

async function fetchLabelSet(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json = await res.json();
  // labels.json is { "0": "A", "1": "B", ... }; 'NONE' is the background
  // class, not a sign.
  return new Set(
    Object.values(json).map((l) => String(l).toUpperCase()).filter((l) => l !== 'NONE')
  );
}

/** Loads both label sets once. Resolves { static, motion } (a Set is null if it failed to load). */
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

/**
 * @param {string} signId  lesson sign id (e.g. 'HI')
 * @param {{static:Set|null, motion:Set|null}} sets  result of loadTrainedLabelSets()
 * @returns {{trained:boolean, model:'static'|'motion', known:boolean}}
 *   known=false means the labels file didn't load, so `trained` is a fail-open true.
 */
export function getSignTrainingStatus(signId, sets) {
  const model = getDetectionType(signId) === 'motion' ? 'motion' : 'static';
  const set = sets?.[model];
  if (!set) return { trained: true, model, known: false };
  const inLabels = [...candidates(signId)].some((l) => set.has(l));
  const trained  = inLabels && !getSignData(String(signId).toUpperCase())?.disabled;
  return { trained, model, known: true };
}

/** Same, for a multi-step phrase: every step must be trained. */
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
