/*
  js/engine/dictionary.js — ASL Sign Dictionary
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Defines detection rules for every ASL sign the classifier
             supports. Used by classifier.js to validate model output
             against hand geometry tiebreakers.
  CONNECTS : Imported by js/engine/classifier.js.
  MIGRATED : Ported verbatim from system_with_motion_detection v11.0
             (BUG-2 A tiebreaker + BUG-3 Q tiebreaker fixes preserved).
  ─────────────────────────────────────────────────────────────────
*/

export const SIGN_DICTIONARY = {

  // ══════════════════════════════════════════════════════════
  // BASIC LEVEL — ALPHABET
  // ══════════════════════════════════════════════════════════

  // ─── Fist group (fingerStates all 0) ──────────────────────

  'A': {
    fingerStates: [1, 0, 0, 0, 0],
    description:  'Fist, thumb resting BESIDE index knuckle (not tucked under)',
    category: 'alphabet', imageFile: 'A.png', tbWeight: 0.50,
    tiebreakers: { thumbSideOfFist: true, thumbWrapped: false, thumbBetweenFingers: false },
  },
  'E': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'All fingers curl in toward palm, tips touching thumb which is tucked under',
    category: 'alphabet', imageFile: 'E.png', tbWeight: 0.50,
    tiebreakers: { tipsClose: true, maxThumbNorm: 0.38, thumbBelowPIP: true, thumbWrapped: false },
  },
  'M': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Index, middle, ring fold over tucked thumb (3 fingers over thumb)',
    category: 'alphabet', imageFile: 'M.png', tbWeight: 0.50,
    tiebreakers: { thumbBelowPIP: true, maxThumbNorm: 1.12, minThumbNorm: 0.82, thumbWrapped: false, thumbBetweenFingers: false },
  },
  'N': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Index and middle fold over tucked thumb (2 fingers over thumb)',
    category: 'alphabet', imageFile: 'N.png', tbWeight: 0.50,
    tiebreakers: { thumbBelowPIP: true, minThumbNorm: 0.86, maxThumbNorm: 1.18, thumbWrapped: false },
  },
  'S': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Fist, thumb wraps ACROSS front of all curled fingers',
    category: 'alphabet', imageFile: 'S.png', tbWeight: 0.50,
    tiebreakers: { thumbWrapped: true, maxThumbNorm: 0.68, thumbBelowPIP: false },
  },
  'T': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Fist, thumb inserted BETWEEN index and middle fingers',
    category: 'alphabet', imageFile: 'T.png', tbWeight: 0.50,
    tiebreakers: { thumbBetweenFingers: true, maxThumbNorm: 0.52, thumbWrapped: false },
  },

  // ─── Four-fingers-up ──────────────────────────────────────

  'B': {
    fingerStates: [0, 1, 1, 1, 1],
    description:  'Four fingers straight up, thumb tucked flat across palm',
    category: 'alphabet', imageFile: 'B.png', tbWeight: 0.28,
    tiebreakers: { tipsClose: false, thumbBelowPIP: false },
  },

  // ─── Open / curved hand [1,1,1,1,1] ─────────────────────

  'C': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'All fingers curved into C arc — not touching, not fully open',
    category: 'alphabet', imageFile: 'C.png', tbWeight: 0.55,
    tiebreakers: { tipsClose: false, thumbCurvedIn: true, maxRawSpreadNorm: 0.30 },
  },
  'O': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'All finger tips and thumb curve to TOUCH, forming a closed O',
    category: 'alphabet', imageFile: 'O.png', tbWeight: 0.50,
    tiebreakers: { tipsClose: true, maxThumbNorm: 0.40 },
  },

  // ─── Index-only [0,1,0,0,0] ──────────────────────────────

  'D': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index points straight UP, other fingers and thumb form a circle',
    category: 'alphabet', imageFile: 'D.png', tbWeight: 0.30,
    tiebreakers: { indexHooked: false, indexVertical: true },
  },
  'X': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index extended but HOOKED/bent at first joint like a hook',
    category: 'alphabet', imageFile: 'X.png', tbWeight: 0.35,
    tiebreakers: { indexHooked: true },
  },

  // Motion signs (handled by motion model — static model skips these)
  'J': {
    fingerStates: [0, 1, 0, 0, 1],
    description:  'Pinky up, draw J in the air — MOTION sign',
    category: 'alphabet', imageFile: 'J.png', detectionType: 'motion',
  },
  'Z': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index extended, draw Z in air — MOTION sign',
    category: 'alphabet', imageFile: 'Z.png', detectionType: 'motion',
  },

  // ─── Two-finger group [1,1,0,0,1] ────────────────────────

  'F': {
    fingerStates: [1, 1, 0, 0, 1],
    description:  'Index touches thumb forming circle; middle, ring, pinky up',
    category: 'alphabet', imageFile: 'F.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  'K': {
    fingerStates: [1, 1, 1, 0, 0],
    description:  'Index and middle point up/out, thumb between them, ring/pinky curled',
    category: 'alphabet', imageFile: 'K.png', tbWeight: 0.30,
    tiebreakers: { indexVertical: false },
  },
  'P': {
    fingerStates: [1, 1, 1, 0, 0],
    description:  'Like K but pointed downward',
    category: 'alphabet', imageFile: 'P.png', tbWeight: 0.30,
    tiebreakers: { indexVertical: false, thumbBelowPIP: true },
  },

  // ─── Remaining alphabet ───────────────────────────────────

  'G': {
    fingerStates: [1, 1, 0, 0, 0],
    description:  'Index and thumb point sideways (like a gun pointing left)',
    category: 'alphabet', imageFile: 'G.png', tbWeight: 0.30,
    tiebreakers: { indexVertical: false },
  },
  'H': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  'Index and middle extended horizontally side by side',
    category: 'alphabet', imageFile: 'H.png', tbWeight: 0.28,
    tiebreakers: { indexVertical: false },
  },
  'I': {
    fingerStates: [0, 0, 0, 0, 1],
    description:  'Pinky finger extended straight up, others curled',
    category: 'alphabet', imageFile: 'I.png', tbWeight: 0.28,
    tiebreakers: { },
  },
  'L': {
    fingerStates: [1, 1, 0, 0, 0],
    description:  'Index points up, thumb points out — L-shape',
    category: 'alphabet', imageFile: 'L.png', tbWeight: 0.30,
    tiebreakers: { indexVertical: true },
  },
  'Q': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index and thumb point downward',
    category: 'alphabet', imageFile: 'Q.png', tbWeight: 0.40,
    tiebreakers: { thumbBelowPIP: true, indexVertical: false },
  },
  'R': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  'Index and middle crossed (index over middle)',
    category: 'alphabet', imageFile: 'R.png', tbWeight: 0.30,
    tiebreakers: { indexVertical: true },
  },
  'U': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  'Index and middle extended straight up together, not spread',
    category: 'alphabet', imageFile: 'U.png', tbWeight: 0.45,
    tiebreakers: { indexVertical: true, iMSpreadNorm_max: 0.22 },
  },
  'V': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  'Index and middle spread in a V/peace sign',
    category: 'alphabet', imageFile: 'V.png', tbWeight: 0.45,
    tiebreakers: { indexVertical: true, iMSpreadNorm_min: 0.23 },
  },
  'W': {
    fingerStates: [0, 1, 1, 1, 0],
    description:  'Index, middle, ring extended and spread in a W',
    category: 'alphabet', imageFile: 'W.png', tbWeight: 0.28,
    tiebreakers: { },
  },
  'Y': {
    fingerStates: [1, 0, 0, 0, 1],
    description:  'Thumb and pinky extended (hang-loose / shaka)',
    category: 'alphabet', imageFile: 'Y.png', tbWeight: 0.28,
    tiebreakers: { },
  },
  'ILY': {
    fingerStates: [1, 1, 0, 0, 1],
    description:  'I love you — thumb, index, and pinky extended',
    category: 'alphabet', imageFile: 'ILY.png', tbWeight: 0.28,
    tiebreakers: { },
  },

  // ══════════════════════════════════════════════════════════
  // MEDIUM LEVEL — WORDS (motion signs — need motion model)
  // ══════════════════════════════════════════════════════════

  'HELLO':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'hello.gif',    detectionType:'motion' },
  'THANK YOU':{ fingerStates:[1,1,1,1,1], category:'word', imageFile:'thank-you.gif',detectionType:'motion' },
  'YES':      { fingerStates:[0,0,0,0,0], category:'word', imageFile:'yes.gif',      detectionType:'motion', disabled:true },
  'NO':       { fingerStates:[0,1,1,0,0], category:'word', imageFile:'no.gif',       detectionType:'motion', disabled:true },
  'PLEASE':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'please.gif',   detectionType:'motion', disabled:true },
  'SORRY':    { fingerStates:[0,0,0,0,0], category:'word', imageFile:'sorry.gif',    detectionType:'motion', disabled:true },
  'HELP':     { fingerStates:[1,1,1,1,1], category:'word', imageFile:'help.gif',     detectionType:'motion', disabled:true },
  'WATER':    { fingerStates:[1,1,1,0,0], category:'word', imageFile:'water.gif',    detectionType:'motion', disabled:true },
  'FOOD':     { fingerStates:[1,1,1,1,0], category:'word', imageFile:'food.gif',     detectionType:'motion', disabled:true },
  'GOOD':     { fingerStates:[1,1,1,1,1], category:'word', imageFile:'good.gif',     detectionType:'motion', disabled:true },
  'BAD':      { fingerStates:[0,1,1,1,1], category:'word', imageFile:'bad.gif',      detectionType:'motion', disabled:true },
  'GO':       { fingerStates:[0,1,0,0,0], category:'word', imageFile:'go.gif',       detectionType:'motion', disabled:true },
  'COME':     { fingerStates:[0,1,0,0,0], category:'word', imageFile:'come.gif',     detectionType:'motion', disabled:true },
  'WHERE':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'where.gif',    detectionType:'motion', disabled:true },
  'WHY':      { fingerStates:[0,1,1,1,0], category:'word', imageFile:'why.gif',      detectionType:'motion', disabled:true },
  'WHAT':     { fingerStates:[1,1,1,1,1], category:'word', imageFile:'what.gif',     detectionType:'motion', disabled:true },
  'RESTROOM': { fingerStates:[1,1,0,0,0], category:'word', imageFile:'restroom.gif', detectionType:'motion', disabled:true },
  'HUNGRY':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'hungry.gif',   detectionType:'motion', disabled:true },

  // ══════════════════════════════════════════════════════════
  // INTERMEDIATE LEVEL — PHRASES (all motion, disabled until model trained)
  // ══════════════════════════════════════════════════════════
  'NICE TO MEET YOU':  { fingerStates:[1,1,1,1,1], category:'phrase', imageFile:'nice-to-meet-you.gif',  detectionType:'motion', disabled:true },
  'HOW ARE YOU':       { fingerStates:[0,1,1,0,0], category:'phrase', imageFile:'how-are-you.gif',       detectionType:'motion', disabled:true },
  'WHERE IS':          { fingerStates:[0,1,0,0,0], category:'phrase', imageFile:'where-is.gif',          detectionType:'motion', disabled:true },
  'I AM LEARNING':     { fingerStates:[0,1,1,1,1], category:'phrase', imageFile:'i-am-learning.gif',     detectionType:'motion', disabled:true },
  'WHAT IS YOUR NAME': { fingerStates:[0,1,1,0,0], category:'phrase', imageFile:'what-is-your-name.gif', detectionType:'motion', disabled:true },
};

// ── Helpers ────────────────────────────────────────────────────────

export function getSignsByCategory(category) {
  return Object.entries(SIGN_DICTIONARY)
    .filter(([, d]) => d.category === category && !d.disabled)
    .map(([label]) => label);
}
export function getActiveSigns()   { return Object.keys(SIGN_DICTIONARY).filter(k => !SIGN_DICTIONARY[k].disabled); }
export function getSignData(label) { return SIGN_DICTIONARY[label] ?? null; }
export function getAllSigns()       { return Object.keys(SIGN_DICTIONARY); }

/**
 * Returns the detection type for a sign label.
 * Defaults to 'static' for alphabet letters that don't override it.
 * @param {string} label
 * @returns {'static'|'motion'}
 */
export function getDetectionType(label) {
  return SIGN_DICTIONARY[label]?.detectionType ?? 'static';
}