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
  // BASIC LEVEL — NUMBERS (0–9)
  // ══════════════════════════════════════════════════════════
  // All held handshapes — no motion — so none of these set
  // `detectionType`, same as most alphabet entries above; that
  // leaves getDetectionType() to default them to 'static', which
  // is correct: ASL numbers 0–9 are static, single-frame signs, not
  // motion signs. (Note: this is specifically about 0–9. Some
  // higher/compound ASL numbers — e.g. 10, which is signed with a
  // twisting "thumbs up" shake — DO involve motion and would need
  // `detectionType: 'motion'` plus training data in asl_motion_model
  // instead. Not included here — scope was 0–9 only.)
  //
  // These run through the SAME asl_static_model as the alphabet.
  // rawLabel from that model must come back as the exact strings
  // '0'..'9' below for classifyGesture() in classifier.js to find a
  // match — see AI_MEMORY.md → "Numbers category" for the retraining
  // checklist (labels.json, model.json, weights .bin all need to be
  // the newly retrained versions with these classes included).

  '0': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Closed circle — fingertips and thumb touch, same handshape as letter O',
    category: 'numbers', imageFile: '0.png', tbWeight: 0.50,
    tiebreakers: { },
  },
  '1': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index finger extended up, thumb resting across curled fingers (no circle, unlike D)',
    category: 'numbers', imageFile: '1.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  '2': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  'Index and middle fingers extended up together, not spread (unlike V)',
    category: 'numbers', imageFile: '2.png', tbWeight: 0.45,
    tiebreakers: { },
  },
  '3': {
    fingerStates: [1, 1, 1, 0, 0],
    description:  'Thumb, index, and middle fingers extended; ring and pinky curled',
    category: 'numbers', imageFile: '3.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  '4': {
    fingerStates: [0, 1, 1, 1, 1],
    description:  'Four fingers extended up and spread, thumb folded across palm',
    category: 'numbers', imageFile: '4.png', tbWeight: 0.28,
    tiebreakers: { },
  },
  '5': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'All five fingers extended and spread, open hand',
    category: 'numbers', imageFile: '5.png', tbWeight: 0.28,
    tiebreakers: { },
  },
  '6': {
    fingerStates: [1, 1, 1, 1, 0],
    description:  'Thumb touches pinky tip; index, middle, ring extended up',
    category: 'numbers', imageFile: '6.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  '7': {
    fingerStates: [1, 1, 1, 0, 1],
    description:  'Thumb touches ring finger tip; index, middle, pinky extended up',
    category: 'numbers', imageFile: '7.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  '8': {
    fingerStates: [1, 1, 0, 1, 1],
    description:  'Thumb touches middle finger tip; index, ring, pinky extended up',
    category: 'numbers', imageFile: '8.png', tbWeight: 0.30,
    tiebreakers: { },
  },
  '9': {
    fingerStates: [1, 0, 1, 1, 1],
    description:  'Thumb touches index finger tip forming a small circle; middle, ring, pinky extended up',
    category: 'numbers', imageFile: '9.png', tbWeight: 0.30,
    tiebreakers: { },
  },

  // ══════════════════════════════════════════════════════════
  // MEDIUM LEVEL — WORDS (motion signs — need motion model)
  // ══════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════
  // MEDIUM LEVEL — WORDS — FAMILY (motion, face-relative signs)
  // ─────────────────────────────────────────────────────────
  // MOM vs DAD is the textbook "minimal pair" the face-relative
  // feature guide is built around: same handshape (open 5, thumb
  // out), same movement (short tap), same orientation — only the
  // LOCATION differs (chin vs forehead). The static/motion models
  // can only tell these apart once retrained on the 67-value
  // feature vector (63 hand + 4 face-relative distances).
  // See 01_face_relative_landmarks_guide.txt §1, Tier A.
  // ══════════════════════════════════════════════════════════
 
  'MOM': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Open "5" hand, thumb tip taps the CHIN',
    category: 'family', imageFile: 'mom.gif', detectionType: 'motion',
  },
  'DAD': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Open "5" hand, thumb tip taps the FOREHEAD',
    category: 'family', imageFile: 'dad.gif', detectionType: 'motion',
  },
  'BOY': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Flat hand near the forehead, closes into a small grasping motion (like tipping a cap)',
    category: 'family', imageFile: 'boy.gif', detectionType: 'motion',
  },
  'GIRL': {
    fingerStates: [1, 0, 0, 0, 0],
    description:  'Thumb of an "A" hand brushes down along the jaw/cheek',
    category: 'family', imageFile: 'girl.gif', detectionType: 'motion',
  },
  'BROTHER': {
    fingerStates: [1, 1, 0, 0, 0],
    // CHANGED — this still described the OLDER/legacy version (both
    // hands in L, index fingers meet) after data.js's description was
    // already corrected against ASLU. Only the dominant hand moves;
    // see data.js's medium_family_BROTHER entry for the full sourced
    // explanation (lifeprint.com/asl101/pages-signs/b/brosis.htm).
    description:  'L-hand at forehead morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'brother.gif', detectionType: 'motion',
  },
  'MARRIAGE': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Hands clasp together and interlock in front of the chest',
    category: 'family', imageFile: 'marriage.gif', detectionType: 'motion',
  },
  'SISTER': {
    fingerStates: [1, 1, 0, 0, 0],
    // CHANGED — same fix as BROTHER above, same ASLU source.
    description:  'L-hand at jaw morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'sister.gif', detectionType: 'motion',
  },
  'GRANDMA': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Open "5" hand taps the chin (like MOM), then hops forward and taps again',
    category: 'family', imageFile: 'grandma.gif', detectionType: 'motion',
  },
  'GRANDPA': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Open "5" hand taps the forehead (like DAD), then hops forward and taps again',
    category: 'family', imageFile: 'grandpa.gif', detectionType: 'motion',
  },
  'AUNT': {
    fingerStates: [1, 0, 0, 0, 0],
    description:  '"A" handshape shaken near the cheek',
    category: 'family', imageFile: 'aunt.gif', detectionType: 'motion',
  },
  'UNCLE': {
    fingerStates: [0, 1, 1, 0, 0],
    description:  '"U" handshape shaken near the temple',
    category: 'family', imageFile: 'uncle.gif', detectionType: 'motion',
  },
  'BABY': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Both forearms cross and rock gently, like cradling an infant',
    category: 'family', imageFile: 'baby.gif', detectionType: 'motion',
  },
  'SINGLE': {
    fingerStates: [0, 0, 0, 0, 1],
    description:  '"I" handshape traced along the ring finger of the other hand',
    category: 'family', imageFile: 'single.gif', detectionType: 'motion',
  },
  'DIVORCED': {
    fingerStates: [0, 1, 1, 1, 1],
    description:  'Two flat hands touch, then twist and pull apart',
    category: 'family', imageFile: 'divorced.gif', detectionType: 'motion',
  },

  // ══════════════════════════════════════════════════════════
  // PLACES — added once merged_motion.json (2026-08-01 batch)
  // finished training. 8 of data.js's 9 "places" SIGNS entries are
  // wired here; the other 4 signId issues found during that wire-up:
  //
  //   • SCHOOL   — SKIPPED on purpose (no trained data yet, per
  //     explicit instruction — data.js's entry is untouched, still
  //     undetectable until it's actually recorded).
  //   • COME/GO  — SKIPPED — data.js has a lesson entry for this, but
  //     NEITHER "COME" nor "GO" nor "COME/GO" is in the trained model's
  //     label set at all. Same "browsable but undetectable" gap as
  //     SCHOOL — not something this pass could fix, flagging so it
  //     doesn't get assumed covered.
  //   • CAR/DRIVE → CAR — data.js's signId was 'CAR/DRIVE', but the
  //     model only has a literal "CAR" label (no separate "DRIVE").
  //     'CAR/DRIVE' would never have matched model output — data.js's
  //     signId was changed to 'CAR' to actually line up (see data.js).
  //   • IN/OUT → IN + OUT — data.js had ONE lesson entry for both
  //     directions, but the model was trained with IN and OUT as two
  //     separate, genuinely different motions (down-and-in vs
  //     up-and-out) — matching data.js's own description text, which
  //     already described two distinct movements under one signId.
  //     Split into two independent entries in data.js so each is its
  //     own practicable/assessable sign, matching what the model
  //     actually does.
  // ══════════════════════════════════════════════════════════

  'HOME': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Flattened-O hand touches mouth corner, then cheek/ear',
    category: 'places', imageFile: 'home.gif', detectionType: 'motion',
  },
  'WORK': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Two S-fists, dominant wrist taps non-dominant fist twice',
    category: 'places', imageFile: 'work.gif', detectionType: 'motion',
  },
  'STORE': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Two flat-O hands near chest, wrists rotate forward twice',
    category: 'places', imageFile: 'store.gif', detectionType: 'motion',
  },
  'CHURCH': {
    fingerStates: [1, 1, 1, 1, 0],
    description:  'C-hand taps twice on the back of an S-fist base hand',
    category: 'places', imageFile: 'church.gif', detectionType: 'motion',
  },
  'WITH': {
    fingerStates: [1, 0, 0, 0, 0],
    description:  'Two A-fists brought together, knuckles touching',
    category: 'places', imageFile: 'with.gif', detectionType: 'motion',
  },
  'CAR': {
    // NEW signId — data.js's SIGNS entry used to say 'CAR/DRIVE' (see
    // block comment above). Lesson title can stay "Car / Drive"; this
    // key just needs to match the model's literal output string.
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Both hands grip an imaginary steering wheel, small alternating turns',
    category: 'places', imageFile: 'car.gif', detectionType: 'motion',
  },
  'IN': {
    // NEW — split out of the old combined 'IN/OUT' signId (see block
    // comment above). data.js now has a separate medium_places_IN entry.
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Bunched fingertips dip down into a curved "container" base hand',
    category: 'places', imageFile: 'in.gif', detectionType: 'motion',
  },
  'OUT': {
    // NEW — the other half of the old combined 'IN/OUT' signId.
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Bunched fingers pull up and out of the base hand, opening as they exit',
    category: 'places', imageFile: 'out.gif', detectionType: 'motion',
  },


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