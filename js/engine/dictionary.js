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
  // BASIC LEVEL — NUMBERS (0–9, plus 10)
  // ══════════════════════════════════════════════════════════
  // Held handshapes 0–5, 7, 8 have no motion, so they're left to
  // default to 'static' via getDetectionType(). '6', '9', and '10'
  // are the exception — see AI_MEMORY.md Session Log, 2026-08-17
  // "Number/letter handshape collisions": '6' and '9' are statically
  // identical to the letters W and F respectively (per ASLU/Dr. Bill
  // Vicars), disambiguated in real ASL by a small tap that a single
  // static frame can't capture — they need the motion model, not the
  // static one. '10' was never a static entry to begin with — it's a
  // twisting "thumbs up" shake, never a held pose.
  // PHASE 7 (2026-08-20): explicitly setting detectionType on all
  // three below closes the "still open" item from that Session Log
  // entry. This was a live routing bug — capture.html already treated
  // '6'/'9' as motion signs, but the live app kept sending them
  // through the static model because this file was never updated to
  // match.
  //
  // '0'..'5', '7', '8' run through the SAME asl_static_model as the
  // alphabet. rawLabel from that model must come back as the exact
  // strings '0'..'9' below for classifyGesture() to find a match —
  // see AI_MEMORY.md → "Numbers category" for the retraining
  // checklist (labels.json, model.json, weights .bin all need to be
  // the newly retrained versions with these classes included).
  // '6', '9', '10' need the equivalent retrain on asl_motion_model
  // instead — asl_motion_model/labels.json has ZERO digit classes
  // today, so all three are now correctly routed but still not
  // detectable in production until real capture data exists for them
  // (see PIVOT_CHECKLIST.md Phase 7 — still open, needs a camera).

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
    description:  'Thumb touches pinky tip; index, middle, ring extended up. Tap-disambiguated from the letter W in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '6.png', tbWeight: 0.30,
    tiebreakers: { }, detectionType: 'motion',
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
    description:  'Thumb touches index finger tip forming a small circle; middle, ring, pinky extended up. Tap-disambiguated from the letter F in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '9.png', tbWeight: 0.30,
    tiebreakers: { }, detectionType: 'motion',
  },
  '10': {
    fingerStates: [1, 0, 0, 0, 0],
    description:  'Closed fist, thumb extended up, twisted side-to-side at the wrist — a genuine motion sign, never a held pose.',
    category: 'numbers', imageFile: '10.png', detectionType: 'motion',
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
  'SCHOOL': {
    fingerStates: [0, 1, 1, 1, 1],
    description:  'Flat hand claps down twice onto the palm of the other flat hand',
    category: 'places', imageFile: 'school.gif', detectionType: 'motion',
  },

  // ══════════════════════════════════════════════════════════
  // PLACES — added once merged_motion.json (2026-08-01 batch)
  // finished training. 8 of data.js's 9 "places" SIGNS entries are
  // wired here; the other 4 signId issues found during that wire-up:
  //
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
  // ══════════════════════════════════════════════════════════
  // MEDIUM LEVEL — WORDS — TIME (motion signs)
  // NEW — asl_motion_model/labels.json now trains DAY, NIGHT, WEEK,
  // MONTH, YEAR, TODAY, and FINISH. data.js's "time" SIGNS entries
  // already had detectionType: 'motion' set, but with no matching
  // entry here, getDetectionType() was defaulting them all to
  // 'static' — routing them through the wrong model entirely. Wiring
  // them here is what actually switches them to asl_motion_model.
  //
  // WILL, BEFORE, NOW are also 'time' signIds in data.js but are NOT
  // in labels.json yet — same "browsable but undetectable" gap as
  // COME/GO in the PLACES block. Left unwired on purpose.
  // ══════════════════════════════════════════════════════════

  'DAY': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Index finger up, elbow rests on the other arm, sweeps down like the sun crossing the sky',
    category: 'time', imageFile: 'day.gif', detectionType: 'motion',
  },
  'NIGHT': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Bent hand (fingers pointing down) settles wrist-first onto the back of the other hand, like the sun dipping down',
    category: 'time', imageFile: 'night.gif', detectionType: 'motion',
  },
  'WEEK': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  '"1" hand slides across the upturned palm of the base hand and off the fingertips',
    category: 'time', imageFile: 'week.gif', detectionType: 'motion',
  },
  'MONTH': {
    fingerStates: [0, 1, 0, 0, 0],
    description:  'Dominant "1" finger traces down the length of the vertical non-dominant "1" finger',
    category: 'time', imageFile: 'month.gif', detectionType: 'motion',
  },
  'YEAR': {
    fingerStates: [0, 0, 0, 0, 0],
    description:  'Two "S" fists — dominant fist circles all the way around the stationary one and lands back on top',
    category: 'time', imageFile: 'year.gif', detectionType: 'motion',
  },
  'TODAY': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Both hands, palms up, drop down twice in place — the repeated version of NOW',
    category: 'time', imageFile: 'today.gif', detectionType: 'motion',
  },
  'FINISH': {
    fingerStates: [1, 1, 1, 1, 1],
    description:  'Both open "5" hands near the shoulders twist quickly from palms-in to palms-out',
    category: 'time', imageFile: 'finish.gif', detectionType: 'motion',
  },


  // FIX (this session, PIVOT_CHECKLIST.md Phase 7 flagged item):
  // both confirmed absent from asl_motion_model/labels.json — neither
  // was previously marked disabled, so the classifier ran a doomed
  // match on every attempt. Now consistent with the 16 Essential
  // Words below (same pattern: real entry, disabled until retrained).
  'HELLO':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'hello.gif',    detectionType:'motion', disabled:true },
  'THANK YOU':{ fingerStates:[1,1,1,1,1], category:'word', imageFile:'thank-you.gif',detectionType:'motion', disabled:true },

  // FIX (this session, PIVOT_CHECKLIST.md Phase 7 flagged item):
  // HOT/COLD (Unit 5, temperature) previously had NO SIGN_DICTIONARY
  // entry at all — worse than the Essential Words above, since
  // getDetectionType()'s `?? 'static'` fallback meant a camera
  // attempt silently ran the wrong (static-alphabet) classifier
  // instead of cleanly no-matching. Added as disabled placeholders,
  // same shape as the Essential Words, so both fail the same clean
  // way until real capture + retraining happens.
  'HOT':  { fingerStates:[1,1,1,1,1], category:'temperature', imageFile:'hot.gif',  detectionType:'motion', disabled:true },
  'COLD': { fingerStates:[1,1,1,1,1], category:'temperature', imageFile:'cold.gif', detectionType:'motion', disabled:true },
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
  // BUGFIX (this session): this key used to be 'RESTROOM'. data.js has
  // no 'RESTROOM' signId — it has a 'BATHROOM' entry (in `health`,
  // moved to `requests` this session) with the identical T-hand-shake
  // description. Same real-world sign, two different labels, neither
  // file referencing the other — renamed to match data.js rather than
  // create a second, duplicate dictionary entry for one physical sign.
  'BATHROOM': { fingerStates:[1,1,0,0,0], category:'word', imageFile:'bathroom.gif', detectionType:'motion', disabled:true },
  'HUNGRY':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'hungry.gif',   detectionType:'motion', disabled:true },

  // BUGFIX (this session, found auditing Phase 7 / Unit 4 for the
  // proposed reorder): data.js's 'requests' category (Unit 4) has 11
  // signIds, but only 6 (PLEASE/THANK YOU/HELP/WHERE/WHY/WHAT) had a
  // disabled placeholder here. The other 5 had NO entry at all — not
  // the same as disabled, just silently absent. Functionally near-
  // identical today (neither model has any of these 11 labels, so
  // classifyGesture/classifyMotion's `!entry` check and `entry.disabled`
  // check both end in "no match"), but getAllowedLabelsForSign(signId)
  // returns null (unrestricted matching) for a signId with no entry vs.
  // a real category Set for a disabled one — and leaving these 5
  // silently missing looks like an oversight, not a decision, to the
  // next person reading this file. Added for parity with their 6
  // siblings and with the HELLO/THANK YOU/HOT/COLD fixes above.
  'EXCUSE': { fingerStates:[1,1,1,1,1], category:'word', imageFile:'excuse.gif', detectionType:'motion', disabled:true },
  'WHO':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'who.gif',    detectionType:'motion', disabled:true },
  'WHEN':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'when.gif',   detectionType:'motion', disabled:true },
  'HOW':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'how.gif',    detectionType:'motion', disabled:true },
  'STOP':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'stop.gif',   detectionType:'motion', disabled:true },

  // REV 8 (2026-08-25): disabled placeholders for the new data.js content
  // added this session (Actions/Hand Actions/Communication, Units 9-11).
  // Same rationale as the HELLO/HOT-COLD/Essential-Words fixes above —
  // a data.js SIGNS entry with no matching key here would make
  // getAllowedLabelsForSign() fall back to unrestricted matching instead
  // of a defined (disabled) category, which looks like an oversight to
  // the next person reading this file. No new detection/training work
  // is implied by adding these — they stay disabled until Phase 7
  // capture + retraining actually happens for this content.
  'WAIT':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'wait.gif',   detectionType:'motion', disabled:true },
  'SIT':    { fingerStates:[0,1,1,0,0], category:'word', imageFile:'sit.gif',    detectionType:'motion', disabled:true },
  'STAND':  { fingerStates:[0,1,1,0,0], category:'word', imageFile:'stand.gif',  detectionType:'motion', disabled:true },
  'WALK':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'walk.gif',   detectionType:'motion', disabled:true },
  'RUN':    { fingerStates:[1,1,0,0,0], category:'word', imageFile:'run.gif',    detectionType:'motion', disabled:true },
  'JUMP':   { fingerStates:[0,1,1,0,0], category:'word', imageFile:'jump.gif',   detectionType:'motion', disabled:true },
  'EAT':    { fingerStates:[1,1,1,1,0], category:'word', imageFile:'eat.gif',    detectionType:'motion', disabled:true },
  'DRINK':  { fingerStates:[1,1,0,0,0], category:'word', imageFile:'drink.gif',  detectionType:'motion', disabled:true },
  'SLEEP':  { fingerStates:[1,1,1,1,1], category:'word', imageFile:'sleep.gif',  detectionType:'motion', disabled:true },
  'WAKE':   { fingerStates:[1,1,0,0,0], category:'word', imageFile:'wake.gif',   detectionType:'motion', disabled:true },
  'PLAY':   { fingerStates:[1,0,0,0,1], category:'word', imageFile:'play.gif',   detectionType:'motion', disabled:true },
  'LOOK':   { fingerStates:[0,1,1,0,0], category:'word', imageFile:'look.gif',   detectionType:'motion', disabled:true },
  'SEE':    { fingerStates:[0,1,1,0,0], category:'word', imageFile:'see.gif',    detectionType:'motion', disabled:true },
  'LISTEN': { fingerStates:[1,1,1,1,1], category:'word', imageFile:'listen.gif', detectionType:'motion', disabled:true },
  'TALK':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'talk.gif',   detectionType:'motion', disabled:true },
  'READ':   { fingerStates:[0,1,1,0,0], category:'word', imageFile:'read.gif',   detectionType:'motion', disabled:true },
  'WRITE':  { fingerStates:[1,1,0,0,0], category:'word', imageFile:'write.gif',  detectionType:'motion', disabled:true },
  'DRAW':   { fingerStates:[0,0,0,0,1], category:'word', imageFile:'draw.gif',   detectionType:'motion', disabled:true },
  'SING':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'sing.gif',   detectionType:'motion', disabled:true },
  'DANCE':  { fingerStates:[0,1,1,0,0], category:'word', imageFile:'dance.gif',  detectionType:'motion', disabled:true },
  'COOK':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'cook.gif',   detectionType:'motion', disabled:true },
  'CLEAN':  { fingerStates:[1,1,1,1,1], category:'word', imageFile:'clean.gif',  detectionType:'motion', disabled:true },
  'THINK':  { fingerStates:[0,1,0,0,0], category:'word', imageFile:'think.gif',  detectionType:'motion', disabled:true },
  'CRY':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'cry.gif',    detectionType:'motion', disabled:true },
  'LAUGH':  { fingerStates:[0,1,0,0,0], category:'word', imageFile:'laugh.gif',  detectionType:'motion', disabled:true },
  'RIDE':   { fingerStates:[0,1,1,0,0], category:'word', imageFile:'ride.gif',   detectionType:'motion', disabled:true },
  'BATH':   { fingerStates:[1,0,0,0,0], category:'word', imageFile:'bath.gif',   detectionType:'motion', disabled:true },
  'GIVE':   { fingerStates:[1,1,1,1,0], category:'word', imageFile:'give.gif',   detectionType:'motion', disabled:true },
  'TAKE':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'take.gif',   detectionType:'motion', disabled:true },
  'PUT':    { fingerStates:[1,1,1,1,0], category:'word', imageFile:'put.gif',    detectionType:'motion', disabled:true },
  'GET':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'get.gif',    detectionType:'motion', disabled:true },
  'BRING':  { fingerStates:[1,1,1,1,1], category:'word', imageFile:'bring.gif',  detectionType:'motion', disabled:true },
  'CARRY':  { fingerStates:[1,1,1,1,1], category:'word', imageFile:'carry.gif',  detectionType:'motion', disabled:true },
  'PUSH':   { fingerStates:[1,1,1,1,1], category:'word', imageFile:'push.gif',   detectionType:'motion', disabled:true },
  'PULL':   { fingerStates:[0,0,0,0,0], category:'word', imageFile:'pull.gif',   detectionType:'motion', disabled:true },
  'THROW':  { fingerStates:[1,1,1,0,0], category:'word', imageFile:'throw.gif',  detectionType:'motion', disabled:true },
  'CATCH':  { fingerStates:[1,1,1,1,1], category:'word', imageFile:'catch.gif',  detectionType:'motion', disabled:true },
  'PICK':   { fingerStates:[1,1,1,0,0], category:'word', imageFile:'pick.gif',   detectionType:'motion', disabled:true },
  'ASK':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'ask.gif',    detectionType:'motion', disabled:true },
  'ANSWER': { fingerStates:[0,1,0,0,0], category:'word', imageFile:'answer.gif', detectionType:'motion', disabled:true },
  'TELL':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'tell.gif',   detectionType:'motion', disabled:true },
  'SHOW':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'show.gif',   detectionType:'motion', disabled:true },
  'SHARE':  { fingerStates:[0,1,1,1,1], category:'word', imageFile:'share.gif',  detectionType:'motion', disabled:true },
  'TEACH':  { fingerStates:[1,1,1,1,0], category:'word', imageFile:'teach.gif',  detectionType:'motion', disabled:true },
  'SIGN':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'sign.gif',   detectionType:'motion', disabled:true },

  // CONTENT PASS (2026-08-26): parity placeholders for the new 'body'
  // category opened in data.js this session (Unit 12, 16 words). Same
  // convention as the REV 8 block above — disabled until Phase 7
  // capture + retraining, added now so getAllowedLabelsForSign() and
  // any SIGNS/SIGN_DICTIONARY parity check don't flag these as orphans.
  'BODY':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'body.gif',    detectionType:'motion', disabled:true },
  'HEAD':    { fingerStates:[1,1,0,0,0], category:'word', imageFile:'head.gif',    detectionType:'motion', disabled:true },
  'HAIR':    { fingerStates:[0,1,0,0,1], category:'word', imageFile:'hair.gif',    detectionType:'motion', disabled:true },
  'FACE':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'face.gif',    detectionType:'motion', disabled:true },
  'EYE':     { fingerStates:[0,1,0,0,0], category:'word', imageFile:'eye.gif',     detectionType:'motion', disabled:true },
  'EAR':     { fingerStates:[0,1,0,0,0], category:'word', imageFile:'ear.gif',     detectionType:'motion', disabled:true },
  'NOSE':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'nose.gif',    detectionType:'motion', disabled:true },
  'MOUTH':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'mouth.gif',   detectionType:'motion', disabled:true },
  'TEETH':   { fingerStates:[0,1,0,0,0], category:'word', imageFile:'teeth.gif',   detectionType:'motion', disabled:true },
  'HAND':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'hand.gif',    detectionType:'motion', disabled:true },
  'FINGER':  { fingerStates:[0,1,0,0,0], category:'word', imageFile:'finger.gif',  detectionType:'motion', disabled:true },
  'ARM':     { fingerStates:[1,1,1,1,1], category:'word', imageFile:'arm.gif',     detectionType:'motion', disabled:true },
  'LEG':     { fingerStates:[0,1,0,0,0], category:'word', imageFile:'leg.gif',     detectionType:'motion', disabled:true },
  'FOOT':    { fingerStates:[0,1,0,0,0], category:'word', imageFile:'foot.gif',    detectionType:'motion', disabled:true },
  'STOMACH': { fingerStates:[1,1,1,1,1], category:'word', imageFile:'stomach.gif', detectionType:'motion', disabled:true },
  'BACK':    { fingerStates:[1,1,1,1,1], category:'word', imageFile:'back.gif',    detectionType:'motion', disabled:true },

  // CONTENT PASS (2026-08-26, later session): parity placeholders for
  // the new 'personal_information' category opened in data.js this
  // session (Unit 13, 6 new words — the other 9 words[] entries reuse
  // existing SIGNS/dictionary.js coverage from 'family'/'people'/
  // 'places' and don't need new entries here). Same convention as the
  // 'body' block above — disabled until Phase 7 capture + retraining.
  'NAME':     { fingerStates:[0,1,1,0,0], category:'word', imageFile:'name.gif',     detectionType:'motion', disabled:true },
  'AGE':      { fingerStates:[1,1,1,1,1], category:'word', imageFile:'age.gif',      detectionType:'motion', disabled:true },
  'FAMILY':   { fingerStates:[1,0,1,1,1], category:'word', imageFile:'family.gif',   detectionType:'motion', disabled:true },
  'BIRTHDAY': { fingerStates:[0,0,1,0,0], category:'word', imageFile:'birthday.gif', detectionType:'motion', disabled:true },
  'LIVE':     { fingerStates:[1,0,0,0,0], category:'word', imageFile:'live.gif',     detectionType:'motion', disabled:true },
  'FROM':     { fingerStates:[0,1,0,0,0], category:'word', imageFile:'from.gif',     detectionType:'motion', disabled:true },

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