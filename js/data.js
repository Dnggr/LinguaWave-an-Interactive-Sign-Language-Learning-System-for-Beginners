/**
 * data.js — Hardcoded Learning Content
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Since there is no admin upload panel, signs and quiz
 *            questions are edited directly here by the dev team.
 *            This mirrors the shape of the planned Firestore
 *            collections (see SYSTEM_ARCHITECTURE.md §5) so swapping
 *            this file for real Firestore reads later is a drop-in
 *            replacement, not a rewrite.
 *
 * CONNECTS : js/lesson.js reads SIGNS (via window.LWData.getSign) to
 *            populate the left-hand content panel (title, description,
 *            tips, image) for whichever letter is in the ?sign= param,
 *            and reads CATEGORIES (via getCategorySigns / getCategory)
 *            to build the sign order for a lesson.
 *
 * CATEGORIES : level=basic is still the alphabet (unchanged — this
 *            preserves every existing ?level=basic&sign=X link).
 *            level=medium is now organized into word categories
 *            pulled from the LinguaWave ASL Lesson Compilation
 *            (Level 1 — Basic). Only signs the classifier can
 *            actually detect are marked functional; everything else
 *            from the source doc is listed as comingSoon so the
 *            structure is ready the moment more data is captured —
 *            it won't show up as a playable lesson until you flip
 *            comingSoon to false AND add a SIGNS content entry.
 *
 * EDITING  : To add a new sign, add another object to SIGNS below.
 *            `signId` must match a key in js/engine/dictionary.js so
 *            the detection engine and the lesson content stay in sync.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

/* ── CATEGORIES ──────────────────────────────────────────────────
 * One entry per lesson grouping, nested under its level. Content is
 * transcribed straight from the LinguaWave ASL Lesson Compilation
 * (LinguaWave_ASL_Lessons.docx) so every level maps to one content
 * type from that doc:
 *   level=basic        → LETTERS   (Level 1 — the alphabet)
 *   level=medium        → WORDS     (Level 1 — 100 Basic ASL Signs, by category)
 *   level=intermediate  → PHRASES   (Level 2 Common Phrases + Level 3 Everyday Sentences)
 *
 * `words` on comingSoon categories is just a content preview — it is
 * NOT wired to the detection engine until real SIGNS entries and a
 * trained model exist for those labels.
 * ──────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  // ── level=basic — LETTERS (Level 1: Letters — ASL Alphabet A–Z) ──
  { id: 'alphabet', level: 'basic', title: 'Alphabet', order: 1, comingSoon: false },

  // ── level=medium — WORDS (Level 1: 100 Basic ASL Signs, by category) ──
  {
    id: 'family', level: 'medium', title: 'Family', order: 1, comingSoon: false,
    source: 'LinguaWave ASL Lesson Compilation — Level 1, Family',
  },
  {
    id: 'places', level: 'medium', title: 'Places', order: 2, comingSoon: true,
    words: ['HOME', 'WORK', 'SCHOOL', 'STORE', 'CHURCH', 'COME/GO', 'CAR/DRIVE', 'IN/OUT', 'WITH'],
  },
  {
    id: 'time', level: 'medium', title: 'Time', order: 3, comingSoon: true,
    words: ['DAY', 'NIGHT', 'WEEK', 'MONTH', 'YEAR', 'WILL', 'BEFORE', 'TODAY/NOW', 'FINISH'],
  },
  {
    id: 'temperature', level: 'medium', title: 'Temperature', order: 4, comingSoon: true,
    words: ['HOT', 'COLD'],
  },
  {
    id: 'food', level: 'medium', title: 'Food', order: 5, comingSoon: true,
    words: ['PIZZA', 'MILK', 'HAMBURGER', 'HOT DOG', 'EGG', 'APPLE', 'CHEESE', 'DRINK', 'SPOON', 'FORK', 'CUP', 'CEREAL', 'WATER', 'CANDY', 'COOKIE', 'HUNGRY'],
  },
  {
    id: 'clothes', level: 'medium', title: 'Clothes', order: 6, comingSoon: true,
    words: ['SHIRT', 'PANTS', 'SOCKS', 'SHOES', 'COAT', 'UNDERWEAR'],
  },
  {
    id: 'health', level: 'medium', title: 'Health', order: 7, comingSoon: true,
    words: ['WASH', 'HURT', 'BATHROOM', 'BRUSH TEETH', 'SLEEP', 'NICE/CLEAN'],
  },
  {
    id: 'feelings', level: 'medium', title: 'Feelings', order: 8, comingSoon: true,
    words: ['HAPPY', 'ANGRY', 'SAD', 'SORRY', 'CRY', 'LIKE', 'GOOD/BAD', 'LOVE'],
  },
  {
    id: 'requests', level: 'medium', title: 'Requests', order: 9, comingSoon: true,
    words: ['PLEASE', 'EXCUSE', 'THANK YOU', 'HELP', 'WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW', 'STOP'],
  },
  {
    id: 'amounts', level: 'medium', title: 'Amounts', order: 10, comingSoon: true,
    words: ['BIG', 'TALL', 'FULL', 'MORE'],
  },
  {
    id: 'colors', level: 'medium', title: 'Colors', order: 11, comingSoon: true,
    words: ['BLUE', 'GREEN', 'YELLOW', 'RED', 'BROWN', 'ORANGE', 'GOLD', 'SILVER'],
  },
  {
    id: 'money', level: 'medium', title: 'Money', order: 12, comingSoon: true,
    words: ['DOLLARS', 'CENTS', 'COST'],
  },
  {
    id: 'animals', level: 'medium', title: 'Animals', order: 13, comingSoon: true,
    words: ['CAT', 'DOG', 'BIRD', 'HORSE', 'COW', 'SHEEP', 'PIG', 'BUG'],
  },

  // ── level=intermediate — PHRASES ────────────────────────────────
  // Level 2 — Basic (Common Phrases), Modules 1–8
  {
    id: 'greetings_intro', level: 'intermediate', title: 'Greetings & Introductions', order: 1, comingSoon: true,
    words: ['GOOD MORNING', 'GOOD AFTERNOON', 'GOOD EVENING', 'NICE TO MEET YOU', "WHAT'S YOUR NAME?", 'MY NAME IS ___'],
  },
  {
    id: 'basic_responses', level: 'intermediate', title: 'Basic Responses', order: 2, comingSoon: true,
    words: ['I AM FINE', 'I AM GOOD', 'NOT BAD', 'MAYBE LATER', "I DON'T KNOW"],
  },
  {
    id: 'family_phrases', level: 'intermediate', title: 'Family Phrases', order: 3, comingSoon: true,
    words: ['MY MOTHER', 'MY FATHER', 'MY BROTHER', 'MY SISTER', 'MY FRIEND'],
  },
  {
    id: 'daily_needs', level: 'intermediate', title: 'Daily Needs', order: 4, comingSoon: true,
    words: ['I AM HUNGRY', 'I AM THIRSTY', 'I AM TIRED', 'I NEED HELP', 'I NEED WATER', 'I NEED FOOD'],
  },
  {
    id: 'asking_questions', level: 'intermediate', title: 'Asking Questions', order: 5, comingSoon: true,
    words: ['HOW ARE YOU?', "WHAT'S UP?", 'HOW OLD ARE YOU?', 'WHERE DO YOU LIVE?', 'WHAT TIME?', 'CAN YOU HELP?', 'CAN I GO?'],
  },
  {
    id: 'polite_expressions', level: 'intermediate', title: 'Polite Expressions', order: 6, comingSoon: true,
    words: ['THANK YOU', "YOU'RE WELCOME", 'EXCUSE ME', 'HAVE A NICE DAY', 'SEE YOU LATER'],
  },
  {
    id: 'affection_feelings', level: 'intermediate', title: 'Affection & Feelings', order: 7, comingSoon: true,
    words: ['I LOVE YOU', 'I LIKE YOU', 'I MISS YOU', 'HAPPY BIRTHDAY', "I DON'T LIKE IT", "I DON'T LIKE YOU", 'I HATE IT', 'LEAVE ME ALONE'],
  },
  {
    id: 'describing_things', level: 'intermediate', title: 'Describing Things', order: 8, comingSoon: true,
    words: ['RED CAR', 'BLUE SHIRT', 'GREEN TREE', 'BIG HOUSE', 'SMALL DOG', 'GOOD JOB', 'BAD DAY'],
  },

  // Level 3 — Intermediate (Everyday Sentences & Conversations), Modules 1–10
  {
    id: 'self_introduction', level: 'intermediate', title: 'Self Introduction', order: 9, comingSoon: true,
    words: ['HELLO, MY NAME IS ___.', 'NICE TO MEET YOU.', 'I AM ___ YEARS OLD.', 'I LIVE IN ___.', 'I AM A STUDENT.'],
  },
  {
    id: 'daily_activities', level: 'intermediate', title: 'Daily Activities', order: 10, comingSoon: true,
    words: ['I WAKE UP EARLY.', 'I GO TO SCHOOL.', 'I STUDY EVERY DAY.', 'I EAT BREAKFAST.', 'I GO HOME AFTER SCHOOL.', 'I SLEEP AT 10 PM.'],
  },
  {
    id: 'family_conversations', level: 'intermediate', title: 'Family Conversations', order: 11, comingSoon: true,
    words: ['I HAVE TWO BROTHERS.', 'MY MOTHER WORKS AT HOME.', 'MY FATHER IS A TEACHER.', 'I LOVE MY FAMILY.'],
  },
  {
    id: 'talking_about_feelings', level: 'intermediate', title: 'Talking About Feelings', order: 12, comingSoon: true,
    words: ['I AM HAPPY TODAY.', 'I AM NERVOUS.', 'I FEEL TIRED.', 'I AM EXCITED FOR TOMORROW.', 'I AM WORRIED ABOUT SCHOOL.'],
  },
  {
    id: 'asking_for_help', level: 'intermediate', title: 'Asking for Help', order: 13, comingSoon: true,
    words: ['CAN YOU HELP ME?', 'WHERE IS THE RESTROOM?', 'I NEED ASSISTANCE.', 'PLEASE REPEAT THAT.', "I DON'T UNDERSTAND."],
  },
  {
    id: 'school_conversations', level: 'intermediate', title: 'School Conversations', order: 14, comingSoon: true,
    words: ['WHAT IS YOUR FAVORITE SUBJECT?', 'MY FAVORITE SUBJECT IS ENGLISH.', 'WHEN IS THE EXAM?', 'I FINISHED MY ASSIGNMENT.', 'THE LESSON IS DIFFICULT.'],
  },
  {
    id: 'shopping_ordering', level: 'intermediate', title: 'Shopping & Ordering', order: 15, comingSoon: true,
    words: ['HOW MUCH IS THIS?', 'I WANT TO BUY THIS.', 'DO YOU HAVE ANOTHER COLOR?', 'WHERE IS THE CASHIER?', 'THANK YOU FOR YOUR HELP.'],
  },
  {
    id: 'social_conversations', level: 'intermediate', title: 'Social Conversations', order: 16, comingSoon: true,
    words: ['WHAT ARE YOU DOING TODAY?', 'I AM GOING WITH MY FRIENDS.', 'WOULD YOU LIKE TO JOIN US?', "THAT'S A GOOD IDEA.", 'SEE YOU TOMORROW.'],
  },
  {
    id: 'emergency_situations', level: 'intermediate', title: 'Emergency & Important Situations', order: 17, comingSoon: true,
    words: ['I NEED HELP.', 'CALL THE POLICE.', 'CALL AN AMBULANCE.', 'I AM LOST.', 'WHERE IS THE HOSPITAL?', 'THIS IS AN EMERGENCY.'],
  },
  {
    id: 'everyday_dialogues', level: 'intermediate', title: 'Short Everyday Dialogues', order: 18, comingSoon: true,
    words: [
      'MEETING SOMEONE: HELLO. / HELLO. / WHAT IS YOUR NAME? / MY NAME IS JOHN. / NICE TO MEET YOU.',
      'ASKING FOR HELP: EXCUSE ME. / CAN YOU HELP ME? / YES, WHAT DO YOU NEED? / I AM LOOKING FOR THE RESTROOM.',
      'SHOPPING: HOW MUCH IS THIS? / IT IS TEN DOLLARS. / I WILL BUY IT. / THANK YOU.',
    ],
  },
];

/* ── SIGNS ────────────────────────────────────────────────────────
 * Mirrors Firestore signs/{id} — level, signId, category, title,
 * description, tips, imageUrl, videoUrl, order, detectionType.
 *
 * description/tips are written from the same hand-shape rules
 * defined in js/engine/dictionary.js so the lesson content panel
 * never contradicts what the classifier is actually checking for.
 * ──────────────────────────────────────────────────────────────── */
const SIGNS = [
  {
    id: 'basic_A', level: 'basic', signId: 'A', title: 'Letter A', order: 1,
    description: 'Make a fist with your thumb resting against the side of your index finger — not tucked underneath. Hold your hand upright with your palm facing the person you\u2019re signing to.',
    tips: [
      'Close all fingers into a firm fist',
      'Rest your thumb against the side of your index finger',
      'Keep your wrist straight and hand relaxed',
    ],
    imageUrl: '../assets/images/basic/A.png', videoUrl: '../assets/videos/basic/A.mp4', detectionType: 'static',
  },
  {
    id: 'basic_B', level: 'basic', signId: 'B', title: 'Letter B', order: 2,
    description: 'Hold your hand flat with all four fingers straight up and together. Fold your thumb flat across your palm.',
    tips: [
      'Keep your four fingers straight and touching',
      'Thumb tucks flat across the palm, not sticking out',
      'Palm faces forward, fingers point up',
    ],
    imageUrl: '../assets/images/basic/B.png', videoUrl: '../assets/videos/basic/B.mp4', detectionType: 'static',
  },
  {
    id: 'basic_C', level: 'basic', signId: 'C', title: 'Letter C', order: 3,
    description: 'Curve your fingers and thumb into a wide arc, like you\u2019re holding a small cup, forming the shape of the letter C.',
    tips: [
      'Curve all fingers evenly — don\u2019t let them touch',
      'Thumb curves inward to match the fingers',
      'Keep the "C" open, not closed into an O',
    ],
    imageUrl: '../assets/images/basic/C.png', videoUrl: '../assets/videos/basic/C.mp4', detectionType: 'static',
  },
  {
    id: 'basic_D', level: 'basic', signId: 'D', title: 'Letter D', order: 4,
    description: 'Point your index finger straight up. Touch your thumb to your middle finger so the remaining fingers form a circle below the index finger.',
    tips: [
      'Index finger stays straight and vertical',
      'Thumb and middle finger meet to form a small circle',
      'Ring and pinky curl in gently',
    ],
    imageUrl: '../assets/images/basic/D.png', videoUrl: '../assets/videos/basic/D.mp4', detectionType: 'static',
  },
  {
    id: 'basic_E', level: 'basic', signId: 'E', title: 'Letter E', order: 5,
    description: 'Curl all four fingers in toward your palm so the tips touch your thumb, which tucks underneath them.',
    tips: [
      'Fingertips curl down to touch the thumb',
      'Thumb stays low and tucked, not wrapped across',
      'Keep the hand compact — don\u2019t let fingers splay',
    ],
    imageUrl: '../assets/images/basic/E.png', videoUrl: '../assets/videos/basic/E.mp4', detectionType: 'static',
  },
  {
    id: 'basic_F', level: 'basic', signId: 'F', title: 'Letter F', order: 6,
    description: 'Touch your index finger and thumb together to form a circle, while your middle, ring, and pinky fingers stay extended upward.',
    tips: [
      'Index and thumb tips touch to form a small circle',
      'Middle, ring, and pinky stay straight and spread',
      'Keep the circle small and clear',
    ],
    imageUrl: '../assets/images/basic/F.png', videoUrl: '../assets/videos/basic/F.mp4', detectionType: 'static',
  },
  {
    id: 'basic_G', level: 'basic', signId: 'G', title: 'Letter G', order: 7,
    description: 'Point your index finger and thumb out to the side (not up), like a sideways "finger gun," with the other fingers curled into the palm.',
    tips: [
      'Index finger points sideways, not vertically',
      'Thumb points out parallel to the index finger',
      'Middle, ring, and pinky stay curled down',
    ],
    imageUrl: '../assets/images/basic/G.png', videoUrl: '../assets/videos/basic/G.mp4', detectionType: 'static',
  },
  {
    id: 'basic_H', level: 'basic', signId: 'H', title: 'Letter H', order: 8,
    description: 'Extend your index and middle fingers straight out to the side, held flat and together, with the rest of your hand closed.',
    tips: [
      'Index and middle fingers extend sideways, not up',
      'Keep the two fingers together, not spread',
      'Thumb and remaining fingers stay folded in',
    ],
    imageUrl: '../assets/images/basic/H.png', videoUrl: '../assets/videos/basic/H.mp4', detectionType: 'static',
  },
  {
    id: 'basic_I', level: 'basic', signId: 'I', title: 'Letter I', order: 9,
    description: 'Make a fist and extend only your pinky finger straight up.',
    tips: [
      'Only the pinky is extended — every other finger stays curled',
      'Keep the pinky straight and vertical',
      'Thumb rests against the curled fingers',
    ],
    imageUrl: '../assets/images/basic/I.png', videoUrl: '../assets/videos/basic/I.mp4', detectionType: 'static',
  },
  {
    id: 'basic_J', level: 'basic', signId: 'J', title: 'Letter J', order: 10,
    description: 'Extend your pinky finger (same hand shape as I), then trace the letter J in the air with a smooth motion. This is a MOTION sign — the system watches the movement, not just the hand shape.',
    tips: [
      'Start with the pinky-up hand shape from "I"',
      'Draw a clear J-shaped stroke in the air',
      'Keep the motion smooth and at a steady pace',
    ],
    imageUrl: '../assets/images/basic/J.png', videoUrl: '../assets/videos/basic/J.mp4', detectionType: 'motion',
  },
  {
    id: 'basic_K', level: 'basic', signId: 'K', title: 'Letter K', order: 11,
    description: 'Point your index and middle fingers up in a V shape, and place your thumb between them. Ring and pinky fingers stay curled down.',
    tips: [
      'Index and middle point upward, slightly spread',
      'Thumb tucks between the index and middle fingers',
      'Ring and pinky curl into the palm',
    ],
    imageUrl: '../assets/images/basic/K.png', videoUrl: '../assets/videos/basic/K.mp4', detectionType: 'static',
  },
  {
    id: 'basic_L', level: 'basic', signId: 'L', title: 'Letter L', order: 12,
    description: 'Point your index finger straight up and your thumb straight out to the side, forming an "L" shape. Other fingers curl into the palm.',
    tips: [
      'Index finger points straight up',
      'Thumb points out at roughly a right angle',
      'Middle, ring, and pinky stay curled down',
    ],
    imageUrl: '../assets/images/basic/L.png', videoUrl: '../assets/videos/basic/L.mp4', detectionType: 'static',
  },
  {
    id: 'basic_M', level: 'basic', signId: 'M', title: 'Letter M', order: 13,
    description: 'Fold your index, middle, and ring fingers down over your tucked thumb, so three fingers rest on top of it.',
    tips: [
      'Thumb tucks fully under, parallel to the palm',
      'Index, middle, and ring fold down on top of the thumb',
      'Pinky stays curled with the rest of the fist',
    ],
    imageUrl: '../assets/images/basic/M.png', videoUrl: '../assets/videos/basic/M.mp4', detectionType: 'static',
  },
  {
    id: 'basic_N', level: 'basic', signId: 'N', title: 'Letter N', order: 14,
    description: 'Fold your index and middle fingers down over your tucked thumb, so two fingers rest on top of it.',
    tips: [
      'Thumb tucks under, similar to "M" but with one fewer finger over it',
      'Only index and middle fold down on top of the thumb',
      'Ring and pinky stay curled with the fist',
    ],
    imageUrl: '../assets/images/basic/N.png', videoUrl: '../assets/videos/basic/N.mp4', detectionType: 'static',
  },
  {
    id: 'basic_O', level: 'basic', signId: 'O', title: 'Letter O', order: 15,
    description: 'Curve all your fingers and thumb so the tips touch, forming a closed circle — the shape of the letter O.',
    tips: [
      'All fingertips and thumb meet at a single point',
      'Keep the circle closed, unlike the open arc of "C"',
      'Hold the shape steady, don\u2019t let fingers drift apart',
    ],
    imageUrl: '../assets/images/basic/O.png', videoUrl: '../assets/videos/basic/O.mp4', detectionType: 'static',
  },
  {
    id: 'basic_P', level: 'basic', signId: 'P', title: 'Letter P', order: 16,
    description: 'Form the same shape as "K" — index and middle fingers up with thumb between them — but angle your whole hand downward.',
    tips: [
      'Same finger shape as K: index and middle out, thumb between them',
      'Tilt the whole hand so the fingers point down',
      'Keep ring and pinky curled in',
    ],
    imageUrl: '../assets/images/basic/P.png', videoUrl: '../assets/videos/basic/P.mp4', detectionType: 'static',
  },
  {
    id: 'basic_Q', level: 'basic', signId: 'Q', title: 'Letter Q', order: 17,
    description: 'Point your index finger and thumb downward, similar to "G" but angled toward the floor.',
    tips: [
      'Index finger and thumb point downward together',
      'Keep the other fingers curled into the palm',
      'Wrist angles down rather than out to the side',
    ],
    imageUrl: '../assets/images/basic/Q.png', videoUrl: '../assets/videos/basic/Q.mp4', detectionType: 'static',
  },
  {
    id: 'basic_R', level: 'basic', signId: 'R', title: 'Letter R', order: 18,
    description: 'Cross your index finger over your middle finger, both pointing up, like crossed fingers for luck.',
    tips: [
      'Index finger crosses in front of the middle finger',
      'Both fingers point upward together',
      'Ring, pinky, and thumb stay curled in',
    ],
    imageUrl: '../assets/images/basic/R.png', videoUrl: '../assets/videos/basic/R.mp4', detectionType: 'static',
  },
  {
    id: 'basic_S', level: 'basic', signId: 'S', title: 'Letter S', order: 19,
    description: 'Make a fist and wrap your thumb across the front of your curled fingers, like a classic closed fist.',
    tips: [
      'Curl all fingers in fully, like a regular fist',
      'Thumb wraps across the front of the fingers, not beside them',
      'Keep the fist compact and steady',
    ],
    imageUrl: '../assets/images/basic/S.png', videoUrl: '../assets/videos/basic/S.mp4', detectionType: 'static',
  },
  {
    id: 'basic_T', level: 'basic', signId: 'T', title: 'Letter T', order: 20,
    description: 'Make a fist and insert your thumb between your index and middle fingers, with just the tip peeking through.',
    tips: [
      'Thumb slots between the index and middle fingers',
      'Only the thumb tip should be visible between the fingers',
      'Keep the rest of the hand in a relaxed fist',
    ],
    imageUrl: '../assets/images/basic/T.png', videoUrl: '../assets/videos/basic/T.mp4', detectionType: 'static',
  },
  {
    id: 'basic_U', level: 'basic', signId: 'U', title: 'Letter U', order: 21,
    description: 'Extend your index and middle fingers straight up, held close together (not spread apart like "V").',
    tips: [
      'Index and middle fingers point straight up',
      'Keep the two fingers touching or very close together',
      'Ring, pinky, and thumb stay curled down',
    ],
    imageUrl: '../assets/images/basic/U.png', videoUrl: '../assets/videos/basic/U.mp4', detectionType: 'static',
  },
  {
    id: 'basic_V', level: 'basic', signId: 'V', title: 'Letter V', order: 22,
    description: 'Extend your index and middle fingers straight up in a clear "peace sign" V, spread apart from each other.',
    tips: [
      'Index and middle fingers spread into a wide V',
      'This is the main difference from "U" — the spread matters',
      'Ring, pinky, and thumb stay curled down',
    ],
    imageUrl: '../assets/images/basic/V.png', videoUrl: '../assets/videos/basic/V.mp4', detectionType: 'static',
  },
  {
    id: 'basic_W', level: 'basic', signId: 'W', title: 'Letter W', order: 23,
    description: 'Extend your index, middle, and ring fingers straight up, spread apart from each other, with your thumb holding down the pinky.',
    tips: [
      'Three fingers (index, middle, ring) spread upward',
      'Pinky stays curled down, held by the thumb',
      'Keep the three fingers clearly separated',
    ],
    imageUrl: '../assets/images/basic/W.png', videoUrl: '../assets/videos/basic/W.mp4', detectionType: 'static',
  },
  {
    id: 'basic_X', level: 'basic', signId: 'X', title: 'Letter X', order: 24,
    description: 'Make a fist and bend your index finger at the first joint into a hook shape, like a small hook.',
    tips: [
      'Curl the index finger into a hooked shape, not straight',
      'This is the key difference from "D" — the bend matters',
      'Keep the rest of the hand in a relaxed fist',
    ],
    imageUrl: '../assets/images/basic/X.png', videoUrl: '../assets/videos/basic/X.mp4', detectionType: 'static',
  },
  {
    id: 'basic_Y', level: 'basic', signId: 'Y', title: 'Letter Y', order: 25,
    description: 'Extend your thumb and pinky finger outward, keeping the other three fingers curled — like a "hang loose" / shaka sign.',
    tips: [
      'Only thumb and pinky stick out, on opposite sides of the hand',
      'Index, middle, and ring fingers stay curled in tightly',
      'Hold the hand steady so thumb and pinky are clearly visible',
    ],
    imageUrl: '../assets/images/basic/Y.png', videoUrl: '../assets/videos/basic/Y.mp4', detectionType: 'static',
  },
  {
    id: 'basic_Z', level: 'basic', signId: 'Z', title: 'Letter Z', order: 26,
    description: 'Extend your index finger and trace the shape of the letter Z in the air with a clear, deliberate motion. This is a MOTION sign — the system watches the movement, not just the hand shape.',
    tips: [
      'Start with just the index finger extended',
      'Draw a clear Z-shaped stroke in the air: across, diagonal, across',
      'Keep the motion deliberate and at a steady pace',
    ],
    imageUrl: '../assets/images/basic/Z.png', videoUrl: '../assets/videos/basic/Z.mp4', detectionType: 'motion',
  },

  /* ── MEDIUM · FAMILY ──────────────────────────────────────────
   * MOM/DAD are the canonical face-relative minimal pair — same
   * handshape, same movement, only the location (chin vs forehead)
   * differs. That's exactly why the classifier now needs face
   * landmarks to tell them apart at all. */
  {
    id: 'medium_family_MOM', level: 'medium', category: 'family', signId: 'MOM', title: 'Mom', order: 1,
    description: 'Open your hand into a "5" shape (all fingers spread) and tap your thumb tip against your CHIN once.',
    tips: [
      'Palm faces the person you\u2019re signing to',
      'Thumb makes contact with the chin, not the cheek or neck',
      'Keep the tap short and deliberate — this is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/family/MOM.png', videoUrl: '../assets/videos/medium/family/MOM.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_DAD', level: 'medium', category: 'family', signId: 'DAD', title: 'Dad', order: 2,
    description: 'Open your hand into the same "5" shape as MOM, but tap your thumb tip against your FOREHEAD instead of your chin.',
    tips: [
      'Same handshape as MOM — the location is what changes the meaning',
      'Thumb makes contact near the top of the forehead',
      'Keep the tap short and deliberate — this is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/family/DAD.png', videoUrl: '../assets/videos/medium/family/DAD.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_BOY', level: 'medium', category: 'family', signId: 'BOY', title: 'Boy', order: 3,
    description: 'Hold a flat hand near your forehead, then close your fingers toward your thumb in a small grasping motion, as if tipping an imaginary cap.',
    tips: [
      'Starting position is near the forehead, like DAD',
      'The closing/grasping motion is what makes this different from DAD',
      'Keep the motion small and close to the forehead',
    ],
    imageUrl: '../assets/images/medium/family/BOY.png', videoUrl: '../assets/videos/medium/family/BOY.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_GIRL', level: 'medium', category: 'family', signId: 'GIRL', title: 'Girl', order: 4,
    description: 'Make an "A" handshape (thumb resting beside a fist) and brush your thumb down along your jaw/cheek.',
    tips: [
      'Thumb traces a short downward line near the jawline',
      'Keep the rest of the hand in a loose fist, thumb doing the work',
      'This is a MOTION sign — the brushing motion matters, not just the pose',
    ],
    imageUrl: '../assets/images/medium/family/GIRL.png', videoUrl: '../assets/videos/medium/family/GIRL.mp4', detectionType: 'motion',
  },
];

/* ── QUESTIONS ────────────────────────────────────────────────────
 * Legacy multiple-choice questions — kept for reference only.
 * The live product no longer uses these (assessment now happens via
 * live camera detection inside lesson.html, see js/lesson.js), but
 * the shape is preserved here in case a written-quiz mode returns.
 * ──────────────────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 'q_basic_A',
    level: 'basic',
    relatedSign: 'A',
    prompt: 'Which option shows the correct ASL hand sign for the letter A?',
    options: [
      { id: 'A', text: 'Fist, thumb resting on the side' },
      { id: 'B', text: 'Flat palm facing forward' },
      { id: 'C', text: 'Index finger pointing up alone' },
      { id: 'D', text: 'Open hand, fingers spread' },
    ],
    correctId: 'A',
    order: 1,
  },
];

/* ── Category defaults ───────────────────────────────────────────
 * SIGNS entries under level=basic didn't previously have a
 * `category` field (alphabet was the only thing on that level).
 * Backfill it so getCategorySigns() works uniformly for every level
 * without having to touch all 26 alphabet entries above. */
SIGNS.forEach(s => {
  if (!s.category) s.category = s.level === 'basic' ? 'alphabet' : 'general';
});

/* ── Helpers ─────────────────────────────────────────────────────── */

/**
 * Returns the SIGNS entry for a given level + signId, or null.
 * @param {string} level
 * @param {string} signId
 */
function getSign(level, signId) {
  return SIGNS.find(s => s.level === level && s.signId === signId.toUpperCase()) ?? null;
}

/**
 * Returns the ordered array of signId strings that belong to a
 * given level + category (only signs with an actual SIGNS content
 * entry — comingSoon categories with no SIGNS entries return []).
 * @param {string} level
 * @param {string} categoryId
 * @returns {string[]}
 */
function getCategorySigns(level, categoryId) {
  return SIGNS
    .filter(s => s.level === level && s.category === categoryId)
    .sort((a, b) => a.order - b.order)
    .map(s => s.signId);
}

/**
 * Returns all category metadata objects for a given level, sorted
 * by their display order.
 * @param {string} level
 */
function getCategoriesForLevel(level) {
  return CATEGORIES.filter(c => c.level === level).sort((a, b) => a.order - b.order);
}

/**
 * Returns a single category's metadata, or null.
 * @param {string} level
 * @param {string} categoryId
 */
function getCategory(level, categoryId) {
  return CATEGORIES.find(c => c.level === level && c.id === categoryId) ?? null;
}

/* ── EXPORTS ─────────────────────────────────────────────────────── */
window.LWData = {
  SIGNS, QUESTIONS, CATEGORIES,
  getSign, getCategorySigns, getCategoriesForLevel, getCategory,
};