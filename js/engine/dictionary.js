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
    description:  'Fist, thumb resting BESIDE index knuckle (not tucked under)',
    category: 'alphabet', imageFile: 'A.png',
  },
  'E': {
    description:  'All fingers curl in toward palm, tips touching thumb which is tucked under',
    category: 'alphabet', imageFile: 'E.png',
  },
  'M': {
    description:  'Index, middle, ring fold over tucked thumb (3 fingers over thumb)',
    category: 'alphabet', imageFile: 'M.png',
  },
  'N': {
    description:  'Index and middle fold over tucked thumb (2 fingers over thumb)',
    category: 'alphabet', imageFile: 'N.png',
  },
  'S': {
    description:  'Fist, thumb wraps ACROSS front of all curled fingers',
    category: 'alphabet', imageFile: 'S.png',
  },
  'T': {
    description:  'Fist, thumb inserted BETWEEN index and middle fingers',
    category: 'alphabet', imageFile: 'T.png',
  },

  // ─── Four-fingers-up ──────────────────────────────────────

  'B': {
    description:  'Four fingers straight up, thumb tucked flat across palm',
    category: 'alphabet', imageFile: 'B.png',
  },

  // ─── Open / curved hand [1,1,1,1,1] ─────────────────────

  'C': {
    description:  'All fingers curved into C arc — not touching, not fully open',
    category: 'alphabet', imageFile: 'C.png',
  },
  'O': {
    description:  'All finger tips and thumb curve to TOUCH, forming a closed O',
    category: 'alphabet', imageFile: 'O.png',
  },

  // ─── Index-only [0,1,0,0,0] ──────────────────────────────

  'D': {
    description:  'Index points straight UP, other fingers and thumb form a circle',
    category: 'alphabet', imageFile: 'D.png',
  },
  'X': {
    description:  'Index extended but HOOKED/bent at first joint like a hook',
    category: 'alphabet', imageFile: 'X.png',
  },

  // Motion signs (handled by motion model — static model skips these)
  'J': {
    description:  'Pinky up, draw J in the air — MOTION sign',
    category: 'alphabet', imageFile: 'J.png', detectionType: 'motion',
  },
  'Z': {
    description:  'Index extended, draw Z in air — MOTION sign',
    category: 'alphabet', imageFile: 'Z.png', detectionType: 'motion',
  },

  // ─── Two-finger group [1,1,0,0,1] ────────────────────────

  'F': {
    description:  'Index touches thumb forming circle; middle, ring, pinky up',
    category: 'alphabet', imageFile: 'F.png',
  },
  'K': {
    description:  'Index and middle point up/out, thumb between them, ring/pinky curled',
    category: 'alphabet', imageFile: 'K.png',
  },
  'P': {
    description:  'Like K but pointed downward',
    category: 'alphabet', imageFile: 'P.png',
  },

  // ─── Remaining alphabet ───────────────────────────────────

  'G': {
    description:  'Index and thumb point sideways (like a gun pointing left)',
    category: 'alphabet', imageFile: 'G.png',
  },
  'H': {
    description:  'Index and middle extended horizontally side by side',
    category: 'alphabet', imageFile: 'H.png',
  },
  'I': {
    description:  'Pinky finger extended straight up, others curled',
    category: 'alphabet', imageFile: 'I.png',
  },
  'L': {
    description:  'Index points up, thumb points out — L-shape',
    category: 'alphabet', imageFile: 'L.png',
  },
  'Q': {
    description:  'Index and thumb point downward',
    category: 'alphabet', imageFile: 'Q.png',
  },
  'R': {
    description:  'Index and middle crossed (index over middle)',
    category: 'alphabet', imageFile: 'R.png',
  },
  'U': {
    description:  'Index and middle extended straight up together, not spread',
    category: 'alphabet', imageFile: 'U.png',
  },
  'V': {
    description:  'Index and middle spread in a V/peace sign',
    category: 'alphabet', imageFile: 'V.png',
  },
  'W': {
    description:  'Index, middle, ring extended and spread in a W',
    category: 'alphabet', imageFile: 'W.png',
  },
  'Y': {
    description:  'Thumb and pinky extended (hang-loose / shaka)',
    category: 'alphabet', imageFile: 'Y.png',
  },
  'ILY': {
    description:  'I love you — thumb, index, and pinky extended',
    category: 'alphabet', imageFile: 'ILY.png',
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
    description:  'Closed circle — fingertips and thumb touch, same handshape as letter O',
    category: 'numbers', imageFile: '0.png',
  },
  '1': {
    description:  'Index finger extended up, thumb resting across curled fingers (no circle, unlike D)',
    category: 'numbers', imageFile: '1.png',
  },
  '2': {
    description:  'Index and middle fingers extended up together, not spread (unlike V)',
    category: 'numbers', imageFile: '2.png',
  },
  '3': {
    description:  'Thumb, index, and middle fingers extended; ring and pinky curled',
    category: 'numbers', imageFile: '3.png',
  },
  '4': {
    description:  'Four fingers extended up and spread, thumb folded across palm',
    category: 'numbers', imageFile: '4.png',
  },
  '5': {
    description:  'All five fingers extended and spread, open hand',
    category: 'numbers', imageFile: '5.png',
  },
  '6': {
    description:  'Thumb touches pinky tip; index, middle, ring extended up. Tap-disambiguated from the letter W in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '6.png',
    detectionType: 'motion',
  },
  '7': {
    description:  'Thumb touches ring finger tip; index, middle, pinky extended up',
    category: 'numbers', imageFile: '7.png',
  },
  '8': {
    description:  'Thumb touches middle finger tip; index, ring, pinky extended up',
    category: 'numbers', imageFile: '8.png',
  },
  '9': {
    description:  'Thumb touches index finger tip forming a small circle; middle, ring, pinky extended up. Tap-disambiguated from the letter F in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '9.png',
    detectionType: 'motion',
  },
  '10': {
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
    description:  'Open "5" hand, thumb tip taps the CHIN',
    category: 'family', imageFile: 'mom.gif', detectionType: 'motion',
  },
  'DAD': {
    description:  'Open "5" hand, thumb tip taps the FOREHEAD',
    category: 'family', imageFile: 'dad.gif', detectionType: 'motion',
  },
  'BOY': {
    description:  'Flat hand near the forehead, closes into a small grasping motion (like tipping a cap)',
    category: 'family', imageFile: 'boy.gif', detectionType: 'motion',
  },
  'GIRL': {
    description:  'Thumb of an "A" hand brushes down along the jaw/cheek',
    category: 'family', imageFile: 'girl.gif', detectionType: 'motion',
  },
  'BROTHER': {
    // CHANGED — this still described the OLDER/legacy version (both
    // hands in L, index fingers meet) after data.js's description was
    // already corrected against ASLU. Only the dominant hand moves;
    // see data.js's medium_family_BROTHER entry for the full sourced
    // explanation (lifeprint.com/asl101/pages-signs/b/brosis.htm).
    description:  'L-hand at forehead morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'brother.gif', detectionType: 'motion',
  },
  'MARRIAGE': {
    description:  'Hands clasp together and interlock in front of the chest',
    category: 'family', imageFile: 'marriage.gif', detectionType: 'motion',
  },
  'SISTER': {
    // CHANGED — same fix as BROTHER above, same ASLU source.
    description:  'L-hand at jaw morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'sister.gif', detectionType: 'motion',
  },
  'GRANDMA': {
    description:  'Open "5" hand taps the chin (like MOM), then hops forward and taps again',
    category: 'family', imageFile: 'grandma.gif', detectionType: 'motion',
  },
  'GRANDPA': {
    description:  'Open "5" hand taps the forehead (like DAD), then hops forward and taps again',
    category: 'family', imageFile: 'grandpa.gif', detectionType: 'motion',
  },
  'AUNT': {
    description:  '"A" handshape shaken near the cheek',
    category: 'family', imageFile: 'aunt.gif', detectionType: 'motion',
  },
  'UNCLE': {
    description:  '"U" handshape shaken near the temple',
    category: 'family', imageFile: 'uncle.gif', detectionType: 'motion',
  },
  'BABY': {
    description:  'Both forearms cross and rock gently, like cradling an infant',
    category: 'family', imageFile: 'baby.gif', detectionType: 'motion',
  },
  'SINGLE': {
    description:  '"I" handshape traced along the ring finger of the other hand',
    category: 'family', imageFile: 'single.gif', detectionType: 'motion',
  },
  'DIVORCED': {
    description:  'Two flat hands touch, then twist and pull apart',
    category: 'family', imageFile: 'divorced.gif', detectionType: 'motion',
  },
  'SCHOOL': {
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
    description:  'Flattened-O hand touches mouth corner, then cheek/ear',
    category: 'places', imageFile: 'home.gif', detectionType: 'motion',
  },
  'WORK': {
    description:  'Two S-fists, dominant wrist taps non-dominant fist twice',
    category: 'places', imageFile: 'work.gif', detectionType: 'motion',
  },
  'STORE': {
    description:  'Two flat-O hands near chest, wrists rotate forward twice',
    category: 'places', imageFile: 'store.gif', detectionType: 'motion',
  },
  'CHURCH': {
    description:  'C-hand taps twice on the back of an S-fist base hand',
    category: 'places', imageFile: 'church.gif', detectionType: 'motion',
  },
  'WITH': {
    description:  'Two A-fists brought together, knuckles touching',
    category: 'places', imageFile: 'with.gif', detectionType: 'motion',
  },
  'CAR': {
    // NEW signId — data.js's SIGNS entry used to say 'CAR/DRIVE' (see
    // block comment above). Lesson title can stay "Car / Drive"; this
    // key just needs to match the model's literal output string.
    description:  'Both hands grip an imaginary steering wheel, small alternating turns',
    category: 'places', imageFile: 'car.gif', detectionType: 'motion',
  },
  'IN': {
    // NEW — split out of the old combined 'IN/OUT' signId (see block
    // comment above). data.js now has a separate medium_places_IN entry.
    description:  'Bunched fingertips dip down into a curved "container" base hand',
    category: 'places', imageFile: 'in.gif', detectionType: 'motion',
  },
  'OUT': {
    // NEW — the other half of the old combined 'IN/OUT' signId.
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
    description:  'Index finger up, elbow rests on the other arm, sweeps down like the sun crossing the sky',
    category: 'time', imageFile: 'day.gif', detectionType: 'motion',
  },
  'NIGHT': {
    description:  'Bent hand (fingers pointing down) settles wrist-first onto the back of the other hand, like the sun dipping down',
    category: 'time', imageFile: 'night.gif', detectionType: 'motion',
  },
  'WEEK': {
    description:  '"1" hand slides across the upturned palm of the base hand and off the fingertips',
    category: 'time', imageFile: 'week.gif', detectionType: 'motion',
  },
  'MONTH': {
    description:  'Dominant "1" finger traces down the length of the vertical non-dominant "1" finger',
    category: 'time', imageFile: 'month.gif', detectionType: 'motion',
  },
  'YEAR': {
    description:  'Two "S" fists — dominant fist circles all the way around the stationary one and lands back on top',
    category: 'time', imageFile: 'year.gif', detectionType: 'motion',
  },
  'TODAY': {
    description:  'Both hands, palms up, drop down twice in place — the repeated version of NOW',
    category: 'time', imageFile: 'today.gif', detectionType: 'motion',
  },
  'FINISH': {
    description:  'Both open "5" hands near the shoulders twist quickly from palms-in to palms-out',
    category: 'time', imageFile: 'finish.gif', detectionType: 'motion',
  },


  // FIX (this session, PIVOT_CHECKLIST.md Phase 7 flagged item):
  // both confirmed absent from asl_motion_model/labels.json — neither
  // was previously marked disabled, so the classifier ran a doomed
  // match on every attempt. Now consistent with the 16 Essential
  // Words below (same pattern: real entry, disabled until retrained).
  'HELLO':    { category:'word', imageFile:'hello.gif',    detectionType:'motion' },
  'THANK YOU':{ category:'word', imageFile:'thank-you.gif',detectionType:'motion' },

  // FIX (this session, PIVOT_CHECKLIST.md Phase 7 flagged item):
  // HOT/COLD (Unit 5, temperature) previously had NO SIGN_DICTIONARY
  // entry at all — worse than the Essential Words above, since
  // getDetectionType()'s `?? 'static'` fallback meant a camera
  // attempt silently ran the wrong (static-alphabet) classifier
  // instead of cleanly no-matching. Added as disabled placeholders,
  // same shape as the Essential Words, so both fail the same clean
  // way until real capture + retraining happens.
  'HOT':  { category:'temperature', imageFile:'hot.gif',  detectionType:'motion', disabled:true },
  'COLD': { category:'temperature', imageFile:'cold.gif', detectionType:'motion', disabled:true },
  'YES':      { category:'word', imageFile:'yes.gif',      detectionType:'motion' },
  'NO':       { category:'word', imageFile:'no.gif',       detectionType:'motion' },
  'PLEASE':   { category:'word', imageFile:'please.gif',   detectionType:'motion' },
  'SORRY':    { category:'word', imageFile:'sorry.gif',    detectionType:'motion' },
  'HELP':     { category:'word', imageFile:'help.gif',     detectionType:'motion' },
  'WATER':    { category:'word', imageFile:'water.gif',    detectionType:'motion' },
  'FOOD':     { category:'word', imageFile:'food.gif',     detectionType:'motion' },
  'GOOD':     { category:'word', imageFile:'good.gif',     detectionType:'motion' },
  'BAD':      { category:'word', imageFile:'bad.gif',      detectionType:'motion', disabled:true },
  'GO':       { category:'word', imageFile:'go.gif',       detectionType:'motion' },
  'COME':     { category:'word', imageFile:'come.gif',     detectionType:'motion' },
  'WHERE':    { category:'word', imageFile:'where.gif',    detectionType:'motion' },
  'WHY':      { category:'word', imageFile:'why.gif',      detectionType:'motion' },
  'WHAT':     { category:'word', imageFile:'what.gif',     detectionType:'motion' },
  // BUGFIX (this session): this key used to be 'RESTROOM'. data.js has
  // no 'RESTROOM' signId — it has a 'BATHROOM' entry (in `health`,
  // moved to `requests` this session) with the identical T-hand-shake
  // description. Same real-world sign, two different labels, neither
  // file referencing the other — renamed to match data.js rather than
  // create a second, duplicate dictionary entry for one physical sign.
  'BATHROOM': { category:'word', imageFile:'bathroom.gif', detectionType:'motion' },
  'HUNGRY':   { category:'word', imageFile:'hungry.gif',   detectionType:'motion' },

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
  'EXCUSE': { category:'word', imageFile:'excuse.gif', detectionType:'motion' },
  'WHO':    { category:'word', imageFile:'who.gif',    detectionType:'motion' },
  'WHEN':   { category:'word', imageFile:'when.gif',   detectionType:'motion' },
  'HOW':    { category:'word', imageFile:'how.gif',    detectionType:'motion' },
  'STOP':   { category:'word', imageFile:'stop.gif',   detectionType:'motion' },

  // REV 8 (2026-08-25): disabled placeholders for the new data.js content
  // added this session (Actions/Hand Actions/Communication, Units 9-11).
  // Same rationale as the HELLO/HOT-COLD/Essential-Words fixes above —
  // a data.js SIGNS entry with no matching key here would make
  // getAllowedLabelsForSign() fall back to unrestricted matching instead
  // of a defined (disabled) category, which looks like an oversight to
  // the next person reading this file. No new detection/training work
  // is implied by adding these — they stay disabled until Phase 7
  // capture + retraining actually happens for this content.
  'WAIT':   { category:'word', imageFile:'wait.gif',   detectionType:'motion' },
  'SIT':    { category:'word', imageFile:'sit.gif',    detectionType:'motion' },
  'STAND':  { category:'word', imageFile:'stand.gif',  detectionType:'motion' },
  'WALK':   { category:'word', imageFile:'walk.gif',   detectionType:'motion' },
  'RUN':    { category:'word', imageFile:'run.gif',    detectionType:'motion' },
  'JUMP':   { category:'word', imageFile:'jump.gif',   detectionType:'motion' },
  'EAT':    { category:'word', imageFile:'eat.gif',    detectionType:'motion', disabled:true },
  'DRINK':  { category:'word', imageFile:'drink.gif',  detectionType:'motion' },
  'SLEEP':  { category:'word', imageFile:'sleep.gif',  detectionType:'motion' },
  'WAKE':   { category:'word', imageFile:'wake.gif',   detectionType:'motion' },
  'PLAY':   { category:'word', imageFile:'play.gif',   detectionType:'motion' },
  'LOOK':   { category:'word', imageFile:'look.gif',   detectionType:'motion' },
  'SEE':    { category:'word', imageFile:'see.gif',    detectionType:'motion', disabled:true },
  'LISTEN': { category:'word', imageFile:'listen.gif', detectionType:'motion' },
  'TALK':   { category:'word', imageFile:'talk.gif',   detectionType:'motion' },
  'READ':   { category:'word', imageFile:'read.gif',   detectionType:'motion' },
  'WRITE':  { category:'word', imageFile:'write.gif',  detectionType:'motion' },
  'DRAW':   { category:'word', imageFile:'draw.gif',   detectionType:'motion' },
  'SING':   { category:'word', imageFile:'sing.gif',   detectionType:'motion' },
  'DANCE':  { category:'word', imageFile:'dance.gif',  detectionType:'motion' },
  'COOK':   { category:'word', imageFile:'cook.gif',   detectionType:'motion' },
  'CLEAN':  { category:'word', imageFile:'clean.gif',  detectionType:'motion' },
  'THINK':  { category:'word', imageFile:'think.gif',  detectionType:'motion' },
  'CRY':    { category:'word', imageFile:'cry.gif',    detectionType:'motion' },
  'LAUGH':  { category:'word', imageFile:'laugh.gif',  detectionType:'motion' },
  'RIDE':   { category:'word', imageFile:'ride.gif',   detectionType:'motion' },
  'BATH':   { category:'word', imageFile:'bath.gif',   detectionType:'motion' },
  'GIVE':   { category:'word', imageFile:'give.gif',   detectionType:'motion' },
  'TAKE':   { category:'word', imageFile:'take.gif',   detectionType:'motion' },
  'PUT':    { category:'word', imageFile:'put.gif',    detectionType:'motion' },
  'GET':    { category:'word', imageFile:'get.gif',    detectionType:'motion' },
  'BRING':  { category:'word', imageFile:'bring.gif',  detectionType:'motion' },
  'CARRY':  { category:'word', imageFile:'carry.gif',  detectionType:'motion', disabled:true },
  'PUSH':   { category:'word', imageFile:'push.gif',   detectionType:'motion', disabled:true },
  'PULL':   { category:'word', imageFile:'pull.gif',   detectionType:'motion' },
  'THROW':  { category:'word', imageFile:'throw.gif',  detectionType:'motion' },
  'CATCH':  { category:'word', imageFile:'catch.gif',  detectionType:'motion' },
  'PICK':   { category:'word', imageFile:'pick.gif',   detectionType:'motion' },
  'ASK':    { category:'word', imageFile:'ask.gif',    detectionType:'motion' },
  'ANSWER': { category:'word', imageFile:'answer.gif', detectionType:'motion' },
  'TELL':   { category:'word', imageFile:'tell.gif',   detectionType:'motion' },
  'SHOW':   { category:'word', imageFile:'show.gif',   detectionType:'motion' },
  'SHARE':  { category:'word', imageFile:'share.gif',  detectionType:'motion' },
  'TEACH':  { category:'word', imageFile:'teach.gif',  detectionType:'motion' },
  'SIGN':   { category:'word', imageFile:'sign.gif',   detectionType:'motion' },

  // CONTENT PASS (2026-08-26): parity placeholders for the new 'body'
  // category opened in data.js this session (Unit 12, 16 words). Same
  // convention as the REV 8 block above — disabled until Phase 7
  // capture + retraining, added now so getAllowedLabelsForSign() and
  // any SIGNS/SIGN_DICTIONARY parity check don't flag these as orphans.
  'BODY':    { category:'word', imageFile:'body.gif',    detectionType:'motion' },
  'HEAD':    { category:'word', imageFile:'head.gif',    detectionType:'motion' },
  'HAIR':    { category:'word', imageFile:'hair.gif',    detectionType:'motion' },
  'FACE':    { category:'word', imageFile:'face.gif',    detectionType:'motion' },
  'EYE':     { category:'word', imageFile:'eye.gif',     detectionType:'motion' },
  'EAR':     { category:'word', imageFile:'ear.gif',     detectionType:'motion' },
  'NOSE':    { category:'word', imageFile:'nose.gif',    detectionType:'motion' },
  'MOUTH':   { category:'word', imageFile:'mouth.gif',   detectionType:'motion' },
  'TEETH':   { category:'word', imageFile:'teeth.gif',   detectionType:'motion' },
  'HAND':    { category:'word', imageFile:'hand.gif',    detectionType:'motion' },
  'FINGER':  { category:'word', imageFile:'finger.gif',  detectionType:'motion' },
  'ARM':     { category:'word', imageFile:'arm.gif',     detectionType:'motion' },
  'LEG':     { category:'word', imageFile:'leg.gif',     detectionType:'motion' },
  'FOOT':    { category:'word', imageFile:'foot.gif',    detectionType:'motion' },
  'STOMACH': { category:'word', imageFile:'stomach.gif', detectionType:'motion' },
  'BACK':    { category:'word', imageFile:'back.gif',    detectionType:'motion' },

  // CONTENT PASS (2026-08-26, later session): parity placeholders for
  // the new 'personal_information' category opened in data.js this
  // session (Unit 13, 6 new words — the other 9 words[] entries reuse
  // existing SIGNS/dictionary.js coverage from 'family'/'people'/
  // 'places' and don't need new entries here). Same convention as the
  // 'body' block above — disabled until Phase 7 capture + retraining.
  'NAME':     { category:'word', imageFile:'name.gif',     detectionType:'motion' },
  'AGE':      { category:'word', imageFile:'age.gif',      detectionType:'motion' },
  'FAMILY':   { category:'word', imageFile:'family.gif',   detectionType:'motion' },
  'BIRTHDAY': { category:'word', imageFile:'birthday.gif', detectionType:'motion', disabled:true },
  'LIVE':     { category:'word', imageFile:'live.gif',     detectionType:'motion' },
  'FROM':     { category:'word', imageFile:'from.gif',     detectionType:'motion' },

  // ══════════════════════════════════════════════════════════
  // INTERMEDIATE LEVEL — PHRASES (all motion, disabled until model trained)
  // ══════════════════════════════════════════════════════════
  'NICE TO MEET YOU':  { category:'phrase', imageFile:'nice-to-meet-you.gif',  detectionType:'motion', disabled:true },
  'HOW ARE YOU':       { category:'phrase', imageFile:'how-are-you.gif',       detectionType:'motion', disabled:true },
  'WHERE IS':          { category:'phrase', imageFile:'where-is.gif',          detectionType:'motion', disabled:true },
  'I AM LEARNING':     { category:'phrase', imageFile:'i-am-learning.gif',     detectionType:'motion', disabled:true },
  'WHAT IS YOUR NAME': { category:'phrase', imageFile:'what-is-your-name.gif', detectionType:'motion', disabled:true },
  // ══════════════════════════════════════════════════════════
  // SYNC PASS (2026-10-01): every label in asl_motion_model/labels.json
  // now has a LIVE entry here. Before this, getDetectionType() fell
  // back to 'static' for any label with no entry, so these signs were
  // read by the static (alphabet/number) model, and classifyMotion()
  // dropped any label with no entry or disabled:true. Entries below
  // were copied from js/dictionary.js (the unused root copy) so the
  // category/imageFile values match what the lessons already use.
  // ══════════════════════════════════════════════════════════

  // Trained-label spelling of 'THANK YOU' (lessons teach THANK YOU;
  // the model outputs THANKS). Needs the matching SIGN_GROUPS pair
  // in js/engine/classifier.js — see note in the hand-off message.
  'THANKS':   { category:'word', imageFile:'thank-you.gif', detectionType:'motion' },

  // ─── animals ───
  'BIRD':          { category:'animals', imageFile:'bird.png', detectionType:'motion' },
  'CAT':           { category:'animals', imageFile:'cat.png', detectionType:'motion' },
  'COW':           { category:'animals', imageFile:'cow.png', detectionType:'motion' },
  'DOG':           { category:'animals', imageFile:'dog.png', detectionType:'motion' },
  'DUCK':          { category:'animals', imageFile:'duck.png', detectionType:'motion' },
  'FISH':          { category:'animals', imageFile:'fish.png', detectionType:'motion' },
  'GOAT':          { category:'animals', imageFile:'goat.png', detectionType:'motion' },
  'HORSE':         { category:'animals', imageFile:'horse.png', detectionType:'motion' },
  'PIG':           { category:'animals', imageFile:'pig.png', detectionType:'motion' },
  'RABBIT':        { category:'animals', imageFile:'rabbit.png', detectionType:'motion' },
  'SHEEP':         { category:'animals', imageFile:'sheep.png', detectionType:'motion' },

  // ─── answers ───
  'KNOW':          { category:'answers', imageFile:'know.png', detectionType:'motion' },

  // ─── directions ───
  'DOWN':          { category:'directions', imageFile:'down.png', detectionType:'motion' },
  'FORWARD':       { category:'directions', imageFile:'forward.png', detectionType:'motion' },
  'LEFT':          { category:'directions', imageFile:'left.png', detectionType:'motion' },
  'RIGHT':         { category:'directions', imageFile:'right.png', detectionType:'motion' },
  'UP':            { category:'directions', imageFile:'up.png', detectionType:'motion' },

  // ─── distance ───
  'AWAY':          { category:'distance', imageFile:'away.png', detectionType:'motion' },
  'FAR':           { category:'distance', imageFile:'far.png', detectionType:'motion' },
  'HERE':          { category:'distance', imageFile:'here.png', detectionType:'motion' },
  'NEAR':          { category:'distance', imageFile:'near.png', detectionType:'motion' },
  'THERE':         { category:'distance', imageFile:'there.png', detectionType:'motion' },

  // ─── drinks ───
  'COFFEE':        { category:'drinks', imageFile:'coffee.png', detectionType:'motion' },
  'JUICE':         { category:'drinks', imageFile:'juice.png', detectionType:'motion' },
  'MILK':          { category:'drinks', imageFile:'milk.png', detectionType:'motion' },
  'SODA':          { category:'drinks', imageFile:'soda.png', detectionType:'motion' },
  'TEA':           { category:'drinks', imageFile:'tea.png', detectionType:'motion' },

  // ─── essentials_greetings ───
  'AFTERNOON':     { category:'essentials_greetings', imageFile:'afternoon.png', detectionType:'motion' },
  'GOODBYE':       { category:'essentials_greetings', imageFile:'goodbye.png', detectionType:'motion' },
  'MORNING':       { category:'essentials_greetings', imageFile:'morning.png', detectionType:'motion' },
  'WELCOME':       { category:'essentials_greetings', imageFile:'welcome.png', detectionType:'motion' },

  // ─── feelings ───
  'ANGRY':         { category:'feelings', imageFile:'angry.png', detectionType:'motion' },
  'BORED':         { category:'feelings', imageFile:'bored.png', detectionType:'motion' },
  'EXCITED':       { category:'feelings', imageFile:'excited.png', detectionType:'motion' },
  'FINE':          { category:'feelings', imageFile:'fine.png', detectionType:'motion' },
  'HAPPY':         { category:'feelings', imageFile:'happy.png', detectionType:'motion' },
  'LIKE':          { category:'feelings', imageFile:'like.png', detectionType:'motion' },
  'LOVE':          { category:'feelings', imageFile:'love.png', detectionType:'motion' },
  'NERVOUS':       { category:'feelings', imageFile:'nervous.png', detectionType:'motion' },
  'OKAY':          { category:'feelings', imageFile:'okay.png', detectionType:'motion' },
  'SAD':           { category:'feelings', imageFile:'sad.png', detectionType:'motion' },
  'SCARED':        { category:'feelings', imageFile:'scared.png', detectionType:'motion' },
  'SICK':          { category:'feelings', imageFile:'sick.png', detectionType:'motion' },
  'THIRSTY':       { category:'feelings', imageFile:'thirsty.png', detectionType:'motion' },
  'TIRED':         { category:'feelings', imageFile:'tired.png', detectionType:'motion' },
  'WORRIED':       { category:'feelings', imageFile:'worried.png', detectionType:'motion' },

  // ─── frequency ───
  'ALWAYS':        { category:'frequency', imageFile:'always.png', detectionType:'motion' },
  'DAILY':         { category:'frequency', imageFile:'daily.png', detectionType:'motion' },
  'MONTHLY':       { category:'frequency', imageFile:'monthly.png', detectionType:'motion' },
  'NEVER':         { category:'frequency', imageFile:'never.png', detectionType:'motion' },
  'OFTEN':         { category:'frequency', imageFile:'often.png', detectionType:'motion' },
  'RARELY':        { category:'frequency', imageFile:'rarely.png', detectionType:'motion' },
  'SOMETIMES':     { category:'frequency', imageFile:'sometimes.png', detectionType:'motion' },
  'WEEKLY':        { category:'frequency', imageFile:'weekly.png', detectionType:'motion' },

  // ─── location ───
  'FRONT':         { category:'location', imageFile:'front.png', detectionType:'motion' },

  // ─── making_requests ───
  'CAN':           { category:'making_requests', imageFile:'can.png', detectionType:'motion' },
  'HAVE':          { category:'making_requests', imageFile:'have.png', detectionType:'motion' },
  'THAT':          { category:'making_requests', imageFile:'that.png', detectionType:'motion' },
  'THIS':          { category:'making_requests', imageFile:'this.png', detectionType:'motion' },

  // ─── people ───
  'CHILD':         { category:'people', imageFile:'child.png', detectionType:'motion' },
  'FRIEND':        { category:'people', imageFile:'friend.png', detectionType:'motion' },
  'MAN':           { category:'people', imageFile:'man.png', detectionType:'motion' },
  'ME':            { category:'people', imageFile:'me.png', detectionType:'motion' },
  'MY':            { category:'people', imageFile:'my.png', detectionType:'motion' },
  'PERSON':        { category:'people', imageFile:'person.png', detectionType:'motion' },
  'STUDENT':       { category:'people', imageFile:'student.png', detectionType:'motion' },
  'TEACHER':       { category:'people', imageFile:'teacher.png', detectionType:'motion' },
  'WOMAN':         { category:'people', imageFile:'woman.png', detectionType:'motion' },
  'YOU':           { category:'people', imageFile:'you.png', detectionType:'motion' },
  'YOUR':          { category:'people', imageFile:'your.png', detectionType:'motion' },

  // ─── requests ───
  'MORE':          { category:'requests', imageFile:'more.png', detectionType:'motion' },

  // ─── responses ───
  'MAYBE':         { category:'responses', imageFile:'maybe.png', detectionType:'motion' },
  'SURE':          { category:'responses', imageFile:'sure.png', detectionType:'motion' },
  'UNDERSTAND':    { category:'responses', imageFile:'understand.png', detectionType:'motion' },

  // ─── sequence ───
  'BEGINNING':     { category:'sequence', imageFile:'beginning.png', detectionType:'motion' },
  'END':           { category:'sequence', imageFile:'end.png', detectionType:'motion' },
  'FINALLY':       { category:'sequence', imageFile:'finally.png', detectionType:'motion' },
  'FIRST':         { category:'sequence', imageFile:'first.png', detectionType:'motion' },
  'MIDDLE':        { category:'sequence', imageFile:'middle.png', detectionType:'motion' },
  'NEXT':          { category:'sequence', imageFile:'next.png', detectionType:'motion' },
  'SECOND':        { category:'sequence', imageFile:'second.png', detectionType:'motion' },
  'THEN':          { category:'sequence', imageFile:'then.png', detectionType:'motion' },
  'THIRD':         { category:'sequence', imageFile:'third.png', detectionType:'motion' },

  // ─── snacks ───
  'CAKE':          { category:'snacks', imageFile:'cake.png', detectionType:'motion' },
  'CANDY':         { category:'snacks', imageFile:'candy.png', detectionType:'motion' },
  'CHOCOLATE':     { category:'snacks', imageFile:'chocolate.png', detectionType:'motion' },
  'COOKIE':        { category:'snacks', imageFile:'cookie.png', detectionType:'motion' },
  'DONUT':         { category:'snacks', imageFile:'donut.png', detectionType:'motion' },
  'ICECREAM':      { category:'snacks', imageFile:'icecream.png', detectionType:'motion' },
  'PIE':           { category:'snacks', imageFile:'pie.png', detectionType:'motion' },
  'POPCORN':       { category:'snacks', imageFile:'popcorn.png', detectionType:'motion' },

  // ─── social ───
  'CLASSMATE':     { category:'social', imageFile:'classmate.png', detectionType:'motion' },
  'MEET':          { category:'social', imageFile:'meet.png', detectionType:'motion' },
  'NEIGHBOR':      { category:'social', imageFile:'neighbor.png', detectionType:'motion' },
  'TOGETHER':      { category:'social', imageFile:'together.png', detectionType:'motion' },
  'VISIT':         { category:'social', imageFile:'visit.png', detectionType:'motion' },

  // ─── turn_taking ───
  'FINISHED':      { category:'turn_taking', imageFile:'finished.png', detectionType:'motion' },
  'TURN':          { category:'turn_taking', imageFile:'turn.png', detectionType:'motion' },

  // ─── vegetables ───
  'BEAN':          { category:'vegetables', imageFile:'bean.png', detectionType:'motion' },
  'BROCCOLI':      { category:'vegetables', imageFile:'broccoli.png', detectionType:'motion' },
  'CABBAGE':       { category:'vegetables', imageFile:'cabbage.png', detectionType:'motion' },
  'CARROT':        { category:'vegetables', imageFile:'carrot.png', detectionType:'motion' },
  'CORN':          { category:'vegetables', imageFile:'corn.png', detectionType:'motion' },
  'GARLIC':        { category:'vegetables', imageFile:'garlic.png', detectionType:'motion' },
  'ONION':         { category:'vegetables', imageFile:'onion.png', detectionType:'motion' },
  'PEA':           { category:'vegetables', imageFile:'pea.png', detectionType:'motion' },
  'POTATO':        { category:'vegetables', imageFile:'potato.png', detectionType:'motion' },
  'TOMATO':        { category:'vegetables', imageFile:'tomato.png', detectionType:'motion' },

  // ─── wild_animals ───
  'LION':          { category:'wild_animals', imageFile:'lion.png', detectionType:'motion' },
  'TIGER':         { category:'wild_animals', imageFile:'tiger.png', detectionType:'motion' },

  // ─── in the motion model and the lesson word lists, but in NEITHER
  // dictionary until now. imageFile names follow the <word>.png
  // convention — CHECK these files exist in your images folder. ───
  "DON'T":        { category:'answers', imageFile:'dont.png', detectionType:'motion' },
  'LESS':         { category:'requests', imageFile:'less.png', detectionType:'motion' },
  'MANY':         { category:'essentials_basic_responses', imageFile:'many.png', detectionType:'motion' },
  'MUCH':         { category:'essentials_basic_responses', imageFile:'much.png', detectionType:'motion' },
  'NEED':         { category:'requests', imageFile:'need.png', detectionType:'motion' },
  'WANT':         { category:'requests', imageFile:'want.png', detectionType:'motion' },
  'WHICH':        { category:'essentials_basic_responses', imageFile:'which.png', detectionType:'motion' },

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