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

/* ── UNITS — REV 4 PIVOT (Phase 1) ──────────────────────────────────
 * NEW — top-level ordering layer added on top of CATEGORIES, per
 * SYSTEM_ARCHITECTURE.md Rev 4 §"Data model / migration strategy".
 * This does NOT replace `level`/`category` — every existing
 * CATEGORIES entry keeps its `level` untouched (see the `unit` field
 * added to each entry below) and every ?level=X URL still works.
 * `UNITS` is what js/learn.js's future trail-view (Phase 4) walks in
 * order; `level` stays a legacy internal partition key only.
 *
 * kind: 'info' (no camera/sign, just reading — Unit 0) |
 *       'interactive' (a drill with no CATEGORIES entry of its own —
 *          Unit 2, built in Phase 2 directly on the A–Z static model) |
 *       'category-group' (one or more CATEGORIES entries tagged with
 *          this unit's order, walked in `CATEGORIES[].order` order) |
 *       'reference' (browse-only, not graded, not gating anything —
 *          Unit 7+ Phrasebook; NOT one of the three kinds named in
 *          Rev 4's data-model note, added here because the Phrasebook
 *          needs a kind that is neither gradeable nor an info screen —
 *          flag this for Joshua/adviser sign-off if it matters).
 * ──────────────────────────────────────────────────────────────── */
const UNITS = [
  { id: 'welcome', order: 0, title: 'Welcome to ASL', kind: 'info' },
  { id: 'alphabet', order: 1, title: 'The Alphabet', kind: 'category-group' },
  // CHANGED (this session) — `gated: true` added. Confirmed 2026-08-23
  // (see PIVOT_CHECKLIST.md): Fingerspell Your Name becomes a real
  // assessment gate, reversing the "optional practice drill" status it
  // held since Phase 2. This flag is read by progress.js's
  // isCategoryUnlocked() — any 'interactive' unit with `gated: true`
  // must have a passed js/engine/progress.js unitAssessment before any
  // LATER category-group unit's categories count as unlocked. Passing
  // condition: completing the full name sequence once (see lesson.js's
  // phrase-chaining "Phrase complete!" handler) — the drill is
  // deliberately forgiving (retries a wrong letter rather than failing
  // the attempt), so there's no separate "strict assessment mode" to
  // build; one full completion IS the pass. Flagging this simplification
  // for confirmation — a stricter mode (e.g. no retries, timed) would be
  // a separate follow-up if wanted.
  { id: 'fingerspell_name', order: 2, title: 'Fingerspell Your Name', kind: 'interactive', gated: true },
  { id: 'numbers', order: 3, title: 'Numbers', kind: 'category-group' },
  { id: 'everyday_essentials', order: 4, title: 'Everyday Essentials', kind: 'category-group' },
  // NEW (this session) — Omen's proposed reorder, mapping confirmed
  // 2026-08-23 (see PIVOT_CHECKLIST.md). Each of these 3 is a
  // single-category unit, same pattern as 'everyday_essentials' above.
  { id: 'greetings_intro', order: 5, title: 'Greetings and Introduction', kind: 'category-group' },
  { id: 'essentials_responses', order: 6, title: 'Basic Responses', kind: 'category-group' },
  { id: 'essentials_politeness', order: 7, title: 'Polite Expressions', kind: 'category-group' },
  // CHANGED — order bumped 5/6/7 -> 8/9/10 to make room for the 3 new
  // units above. Every CATEGORIES entry that pointed at unit: 5/6/7 was
  // bumped to match (getCategoriesForUnit() matches by this numeric
  // `order`, not by id) — see the corresponding CHANGED note on each.
  { id: 'common_things_people', order: 8, title: 'Common Things & People', kind: 'category-group' },
  { id: 'basic_phrases', order: 9, title: 'Basic Phrases', kind: 'category-group' },
  { id: 'phrasebook', order: 10, title: 'Phrasebook', kind: 'reference' },
];

/* ── UNIT 0 CONTENT — "Welcome to ASL" ──────────────────────────────
 * NEW — Rev 4 Phase 1. Answered by Joshua: static text (fastest to
 * ship), NOT the capture.html YouTube reference-video panel. No
 * camera, no SIGN_DICTIONARY entry, no CATEGORIES entry — this is
 * read by a dedicated Unit 0 "info" screen (not yet built — that
 * screen itself is a Phase 4 UI task; this const is just the content).
 * Optional 2–3 question comprehension check mentioned in Rev 4 is NOT
 * included here yet — add a `check` field per section if/when that's
 * built.
 * ──────────────────────────────────────────────────────────────── */
const UNIT0_CONTENT = [
  {
    id: 'what_is_asl',
    title: 'What is ASL?',
    body: 'American Sign Language (ASL) is a complete, natural language with its own grammar and structure — it is not a signed version of English. It is expressed through handshapes, movement, facial expression, and body posture, and it is the primary language of many Deaf and hard-of-hearing communities in the United States and parts of Canada.',
  },
  {
    id: 'how_practice_works',
    title: 'How practice works in LinguaWave',
    body: 'Each lesson teaches a sign with an image, a written description, and a short demo video. When you are ready, you can open the optional Camera Check to practice in front of your webcam — LinguaWave will try to recognize your handshape live. This camera check is practice, not a pass/fail gate: your quiz score comes from the Multiple Choice and Identification rounds, not from the camera.',
  },
  {
    id: 'deaf_culture_note_1',
    title: "Deaf culture note: capitalizing \"Deaf\"",
    body: 'You will often see "Deaf" capitalized. This marks Deaf as a cultural and linguistic identity — belonging to a community with its own language and traditions — rather than only describing a hearing level. Lowercase "deaf" is generally used when referring strictly to hearing status.',
  },
  {
    id: 'deaf_culture_note_2',
    title: 'Deaf culture note: getting someone\'s attention',
    body: 'Waving in someone\'s line of sight, a light tap on the shoulder, or a gentle tap on a table to send a vibration are the polite ways to get a Deaf person\'s attention — calling out a name usually will not work the way it does in spoken conversation.',
  },
];

const CATEGORIES = [
  // ── level=basic — LETTERS (Level 1: Letters — ASL Alphabet A–Z) ──
  // unit: 1 (Rev 4 Phase 1 — see Unit Map in SYSTEM_ARCHITECTURE.md)
  { id: 'alphabet', level: 'basic', title: 'Alphabet', order: 1, comingSoon: false, unit: 1 },

  // Numbers 0–9 are single, held handshapes with NO motion — EXCEPT
  // '6' and '9', which are statically identical to the letters W/F
  // and need the motion model instead (see dictionary.js's NUMBERS
  // block comment). Wired through the SAME asl_static_model as the
  // alphabet for 0–5/7/8 — it is NOT a separate model. For those to
  // actually classify anything, asl_static_model/labels.json (and
  // the matching model.json + weights .bin) must be RETRAINED to
  // output '0'..'9' alongside the existing letters, with label
  // STRINGS exactly '0','1',...,'9' to match the SIGN_DICTIONARY
  // keys — see AI_MEMORY.md → "Numbers category" for the checklist.
  // '6'/'9'/'10' need the same treatment on asl_motion_model instead
  // (PIVOT_CHECKLIST.md Phase 7 — capture/retrain still open).
  // unit: 3 (Rev 4 Phase 1)
  { id: 'numbers', level: 'basic', title: 'Numbers', order: 2, comingSoon: false, unit: 3 },

  // ── level=medium — WORDS (Level 1: 100 Basic ASL Signs, by category) ──
  // family/places/time/temperature are unit: 5, and are the ONLY four
  // Unit 5 sub-categories with real SIGN_DICTIONARY detection today —
  // per Joshua's Phase 0 answer they stay comingSoon:false and are
  // ordered first; every other Unit 5 category below is flipped to
  // comingSoon:true (see AI_MEMORY.md gap note — they have data.js
  // content but zero SIGN_DICTIONARY entries, so a camera check would
  // silently never match).
  {
    id: 'family', level: 'medium', title: 'Family', order: 1, comingSoon: false, unit: 8,
    source: 'LinguaWave ASL Lesson Compilation — Level 1, Family',
    words: ['MOM', 'DAD', 'BOY', 'GIRL', 'MARRIAGE', 'BROTHER', 'SISTER', 'GRANDMA', 'GRANDPA', 'AUNT', 'UNCLE', 'BABY', 'SINGLE', 'DIVORCED'],
  },
  {
    id: 'places', level: 'medium', title: 'Places', order: 2, comingSoon: false, unit: 8,
    // CHANGED: 'CAR/DRIVE' -> 'CAR', 'IN/OUT' -> 'IN','OUT' — kept in
    // sync with the SIGNS entries' signId fixes below (see those entries
    // and dictionary.js's PLACES block comment for why).
    // BUGFIX (this session): 'COME/GO' was a stale combined entry —
    // COME and GO have been separate SIGNS entries since the split
    // documented on medium_places_COME below; this array just never got
    // updated (words[] is documentation only, cosmetic not functional).
    // CHANGED (this session) — COME/GO also moved out entirely, to
    // `requests` (Everyday Essentials) per the confirmed reorder mapping.
    words: ['HOME', 'WORK', 'SCHOOL', 'STORE', 'CHURCH', 'CAR', 'IN', 'OUT', 'WITH'],
  },
  // Tier 0 phrase-chaining (lesson.js). Chains several already-working
  // atomic detections (letters and/or trained word-signs) in sequence
  // instead of needing a whole new continuous-recognition model — see
  // the phraseSteps block comment in lesson.js for the full mechanism.
  // PHASE 7 (2026-08-20): the six entries below replaced the old
  // CAR_SPELL/HOME_WORK_DEMO demo placeholders — real curated phrases
  // per SYSTEM_ARCHITECTURE.md Rev 4 §"New content needed", item 4.
  // Every component word was individually grepped against this repo's
  // asl_motion_model/labels.json (not just assumed from the absence of
  // a `disabled` flag) — only family/places/time vocab confirmed
  // present there was used. HELLO/THANK_YOU/HOT/COLD were deliberately
  // left OUT even though dictionary.js's own entries don't mark them
  // `disabled` — confirmed this session that asl_motion_model/labels.json
  // has no HELLO/THANK_YOU class at all, and that HOT/COLD have ZERO
  // dictionary.js SIGN_DICTIONARY entry (not even a disabled
  // placeholder) — see PIVOT_CHECKLIST.md/AI_MEMORY.md Phase 7 entries.
  // order: 100 keeps this out of the way of the real category
  // numbering rather than needing to renumber anything (no collision —
  // checked, no other CATEGORIES entry uses order: 100).
  // id/title: title updated to drop the "(Demo content)" framing now
  // that real content replaces it; id kept as 'sequence_demo' per the
  // Phase 1 note (renaming touches lesson.js's phraseSteps + every
  // ?category=sequence_demo link for zero functional gain).
  {
    id: 'sequence_demo', level: 'medium', title: 'Basic Phrases', order: 100, comingSoon: false, unit: 9,
    words: ['MOM_HOME', 'DAD_WORK', 'TODAY_SCHOOL', 'FINISH_WORK', 'SISTER_STORE', 'TODAY_GRANDMA_HOME'],
  },
  {
    id: 'time', level: 'medium', title: 'Time', order: 3, comingSoon: false, unit: 8,
    // CHANGED: 'TODAY/NOW' -> 'NOW', 'TODAY' — kept in sync with the
    // SIGNS entries' signId split below.
    words: ['DAY', 'NIGHT', 'WEEK', 'MONTH', 'YEAR', 'WILL', 'BEFORE', 'NOW', 'TODAY', 'FINISH'],
  },
  {
    id: 'temperature', level: 'medium', title: 'Temperature', order: 4, comingSoon: false, unit: 8,
    words: ['HOT', 'COLD'],
  },
  // CHANGED (Rev 4 Phase 1): comingSoon flipped false -> true. No
  // SIGN_DICTIONARY entries exist for any of these words (confirmed by
  // grep, see AI_MEMORY.md gap note) — a camera check would silently
  // never match, so per Rev 4's "Suggested removals" reasoning these
  // stay visible as content but not presented as a playable lesson
  // yet. Flip back to false once real detection backs each one.
  {
    id: 'food', level: 'medium', title: 'Food', order: 5, comingSoon: true, unit: 8,
    // CHANGED (this session) — WATER/HUNGRY moved to `requests`
    // (Everyday Essentials) per the confirmed reorder mapping.
    words: ['PIZZA', 'MILK', 'HAMBURGER', 'HOT DOG', 'EGG', 'APPLE', 'CHEESE', 'DRINK', 'SPOON', 'FORK', 'CUP', 'CEREAL', 'CANDY', 'COOKIE'],
  },
  {
    id: 'clothes', level: 'medium', title: 'Clothes', order: 6, comingSoon: true, unit: 8,
    words: ['SHIRT', 'PANTS', 'SOCKS', 'SHOES', 'COAT', 'UNDERWEAR'],
  },
  {
    id: 'health', level: 'medium', title: 'Health', order: 7, comingSoon: true, unit: 8,
    // CHANGED (this session) — BATHROOM moved to `requests` (merged
    // with the "RESTROOM" Phase 7 tracking item, same physical sign).
    words: ['WASH', 'HURT', 'BRUSH TEETH', 'SLEEP', 'NICE/CLEAN'],
  },
  {
    id: 'feelings', level: 'medium', title: 'Feelings', order: 8, comingSoon: true, unit: 8,
    // BUGFIX (this session): 'GOOD/BAD' was a stale combined entry —
    // GOOD and BAD have been separate SIGNS entries for a while (see
    // medium_feelings_GOOD/medium_feelings_BAD below), this array just
    // never got updated when they were split (words[] is documentation
    // only, getCategorySigns() reads the SIGNS array's own `category`
    // field, so this was cosmetic, not a functional bug).
    // CHANGED (this session) — SORRY/GOOD/BAD also moved out entirely,
    // to essentials_polite_expressions / essentials_basic_responses
    // per the confirmed reorder mapping.
    words: ['HAPPY', 'ANGRY', 'SAD', 'CRY', 'LIKE', 'LOVE'],
  },
  // CHANGED (this session) — narrowed to the "Everyday Essentials"
  // slot per the confirmed reorder mapping (PIVOT_CHECKLIST.md,
  // confirmed 2026-08-23). id kept as 'requests' (internal only, not
  // user-facing) to avoid touching every ?category=requests deep link
  // for zero functional gain — only `title`/`words`/membership changed.
  // PLEASE/EXCUSE/THANK YOU moved to essentials_polite_expressions;
  // WHO/WHAT/WHEN/WHERE/WHY/HOW moved to essentials_basic_responses;
  // WATER/HUNGRY moved in from `food`, GO/COME moved in from `places`;
  // FOOD/RESTROOM are brand-new SIGNS entries (no prior data.js content
  // existed for either signId).
  {
    id: 'requests', level: 'medium', title: 'Everyday Essentials', order: 9, comingSoon: false, unit: 4,
    words: ['HELP', 'STOP', 'WATER', 'FOOD', 'HUNGRY', 'BATHROOM', 'GO', 'COME'],
  },
  // NEW (this session) — 3 categories for the reorder's new units
  // (order 5/6/7 in UNITS above). ids prefixed `essentials_`/
  // `greetings_intro` avoided the Unit 7 Phrasebook's existing
  // 'basic_responses'/'polite_expressions'/'greetings_intro' category
  // ids (found this session — see PIVOT_CHECKLIST.md's "New blocker").
  {
    id: 'essentials_greetings', level: 'medium', title: 'Greetings and Introduction', order: 1, comingSoon: false, unit: 5,
    words: ['HELLO'],
  },
  {
    id: 'essentials_basic_responses', level: 'medium', title: 'Basic Responses', order: 1, comingSoon: false, unit: 6,
    words: ['YES', 'NO', 'GOOD', 'BAD', 'WHO', 'WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW'],
  },
  {
    id: 'essentials_polite_expressions', level: 'medium', title: 'Polite Expressions', order: 1, comingSoon: false, unit: 7,
    words: ['PLEASE', 'THANK YOU', 'EXCUSE', 'SORRY'],
  },
  {
    id: 'amounts', level: 'medium', title: 'Amounts', order: 10, comingSoon: true, unit: 8,
    words: ['BIG', 'TALL', 'FULL', 'MORE'],
  },
  {
    id: 'colors', level: 'medium', title: 'Colors', order: 11, comingSoon: true, unit: 8,
    words: ['BLUE', 'GREEN', 'YELLOW', 'RED', 'BROWN', 'ORANGE', 'GOLD', 'SILVER'],
  },
  {
    id: 'money', level: 'medium', title: 'Money', order: 12, comingSoon: true, unit: 8,
    words: ['DOLLARS', 'CENTS', 'COST'],
  },
  {
    id: 'animals', level: 'medium', title: 'Animals', order: 13, comingSoon: true, unit: 8,
    words: ['CAT', 'DOG', 'BIRD', 'HORSE', 'COW', 'SHEEP', 'PIG', 'BUG'],
  },

  // ── level=intermediate — PHRASES ────────────────────────────────
  // ALL 18 categories below: unit: 7 (Phrasebook — read-only reference
  // per Rev 4 "Suggested removals" #2; none have any SIGN_DICTIONARY
  // entry, so none are graded or camera-checkable). comingSoon left
  // as-is (false) — Rev 4 recommends demoting these to browse-only
  // content, which is a Phase 4 UI/rendering decision, not a
  // comingSoon-flag decision; flag not touched here to avoid
  // conflating "not gradeable" with "hide the content."
  // Level 2 — Basic (Common Phrases), Modules 1–8
  {
    id: 'greetings_intro', level: 'intermediate', title: 'Greetings & Introductions', order: 1, comingSoon: false, unit: 10,
    words: ['GOOD MORNING', 'GOOD AFTERNOON', 'GOOD EVENING', 'NICE TO MEET YOU', "WHAT'S YOUR NAME?", 'MY NAME IS ___'],
  },
  {
    id: 'basic_responses', level: 'intermediate', title: 'Basic Responses', order: 2, comingSoon: false, unit: 10,
    words: ['I AM FINE', 'I AM GOOD', 'NOT BAD', 'MAYBE LATER', "I DON'T KNOW"],
  },
  {
    id: 'family_phrases', level: 'intermediate', title: 'Family Phrases', order: 3, comingSoon: false, unit: 10,
    words: ['MY MOTHER', 'MY FATHER', 'MY BROTHER', 'MY SISTER', 'MY FRIEND'],
  },
  {
    id: 'daily_needs', level: 'intermediate', title: 'Daily Needs', order: 4, comingSoon: false, unit: 10,
    words: ['I AM HUNGRY', 'I AM THIRSTY', 'I AM TIRED', 'I NEED HELP', 'I NEED WATER', 'I NEED FOOD'],
  },
  {
    id: 'asking_questions', level: 'intermediate', title: 'Asking Questions', order: 5, comingSoon: false, unit: 10,
    words: ['HOW ARE YOU?', "WHAT'S UP?", 'HOW OLD ARE YOU?', 'WHERE DO YOU LIVE?', 'WHAT TIME?', 'CAN YOU HELP?', 'CAN I GO?'],
  },
  {
    id: 'polite_expressions', level: 'intermediate', title: 'Polite Expressions', order: 6, comingSoon: false, unit: 10,
    words: ['THANK YOU', "YOU'RE WELCOME", 'EXCUSE ME', 'HAVE A NICE DAY', 'SEE YOU LATER'],
  },
  {
    id: 'affection_feelings', level: 'intermediate', title: 'Affection & Feelings', order: 7, comingSoon: false, unit: 10,
    words: ['I LOVE YOU', 'I LIKE YOU', 'I MISS YOU', 'HAPPY BIRTHDAY', "I DON'T LIKE IT", "I DON'T LIKE YOU", 'I HATE IT', 'LEAVE ME ALONE'],
  },
  {
    id: 'describing_things', level: 'intermediate', title: 'Describing Things', order: 8, comingSoon: false, unit: 10,
    words: ['RED CAR', 'BLUE SHIRT', 'GREEN TREE', 'BIG HOUSE', 'SMALL DOG', 'GOOD JOB', 'BAD DAY'],
  },

  // Level 3 — Intermediate (Everyday Sentences & Conversations), Modules 1–10
  {
    id: 'self_introduction', level: 'intermediate', title: 'Self Introduction', order: 9, comingSoon: false, unit: 10,
    words: ['HELLO, MY NAME IS ___.', 'NICE TO MEET YOU.', 'I AM ___ YEARS OLD.', 'I LIVE IN ___.', 'I AM A STUDENT.'],
  },
  {
    id: 'daily_activities', level: 'intermediate', title: 'Daily Activities', order: 10, comingSoon: false, unit: 10,
    words: ['I WAKE UP EARLY.', 'I GO TO SCHOOL.', 'I STUDY EVERY DAY.', 'I EAT BREAKFAST.', 'I GO HOME AFTER SCHOOL.', 'I SLEEP AT 10 PM.'],
  },
  {
    id: 'family_conversations', level: 'intermediate', title: 'Family Conversations', order: 11, comingSoon: false, unit: 10,
    words: ['I HAVE TWO BROTHERS.', 'MY MOTHER WORKS AT HOME.', 'MY FATHER IS A TEACHER.', 'I LOVE MY FAMILY.'],
  },
  {
    id: 'talking_about_feelings', level: 'intermediate', title: 'Talking About Feelings', order: 12, comingSoon: false, unit: 10,
    words: ['I AM HAPPY TODAY.', 'I AM NERVOUS.', 'I FEEL TIRED.', 'I AM EXCITED FOR TOMORROW.', 'I AM WORRIED ABOUT SCHOOL.'],
  },
  {
    id: 'asking_for_help', level: 'intermediate', title: 'Asking for Help', order: 13, comingSoon: false, unit: 10,
    words: ['CAN YOU HELP ME?', 'WHERE IS THE RESTROOM?', 'I NEED ASSISTANCE.', 'PLEASE REPEAT THAT.', "I DON'T UNDERSTAND."],
  },
  {
    id: 'school_conversations', level: 'intermediate', title: 'School Conversations', order: 14, comingSoon: false, unit: 10,
    words: ['WHAT IS YOUR FAVORITE SUBJECT?', 'MY FAVORITE SUBJECT IS ENGLISH.', 'WHEN IS THE EXAM?', 'I FINISHED MY ASSIGNMENT.', 'THE LESSON IS DIFFICULT.'],
  },
  {
    id: 'shopping_ordering', level: 'intermediate', title: 'Shopping & Ordering', order: 15, comingSoon: false, unit: 10,
    words: ['HOW MUCH IS THIS?', 'I WANT TO BUY THIS.', 'DO YOU HAVE ANOTHER COLOR?', 'WHERE IS THE CASHIER?', 'THANK YOU FOR YOUR HELP.'],
  },
  {
    id: 'social_conversations', level: 'intermediate', title: 'Social Conversations', order: 16, comingSoon: false, unit: 10,
    words: ['WHAT ARE YOU DOING TODAY?', 'I AM GOING WITH MY FRIENDS.', 'WOULD YOU LIKE TO JOIN US?', "THAT'S A GOOD IDEA.", 'SEE YOU TOMORROW.'],
  },
  {
    id: 'emergency_situations', level: 'intermediate', title: 'Emergency & Important Situations', order: 17, comingSoon: false, unit: 10,
    words: ['I NEED HELP.', 'CALL THE POLICE.', 'CALL AN AMBULANCE.', 'I AM LOST.', 'WHERE IS THE HOSPITAL?', 'THIS IS AN EMERGENCY.'],
  },
  {
    id: 'everyday_dialogues', level: 'intermediate', title: 'Short Everyday Dialogues', order: 18, comingSoon: false, unit: 10,
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

//NOTE: read the lesson.js line 1065 comment and lesson.html line 177 comment to proceed
//If we're gonna use youtube video as the source for video demonstration
//replace the value of the videoUrl with the corresponding youtube video embed source (src)
//to get the embed source of the corresponding youtube video click share, select embed and copy the src
//Example: videoUrl: "https://www.youtube.com/embed/rlhRQiVeQPY?si=U7AqOtDU-hoEq1p5"

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

   /* ── BASIC · NUMBERS (0–10) ────────────────────────────────────
   * 0–5, 7, 8 are held/static handshapes — `detectionType: 'static'`,
   * running through the SAME asl_static_model as the alphabet.
   * 6, 9, and 10 are the exception: 6/9 are tap-disambiguated from
   * the letters W/F (a single static frame can't tell them apart),
   * and 10 is a twisting thumbs-up shake — never a held pose. All
   * three are `detectionType: 'motion'` (Phase 7, 2026-08-20).
   * NOTE: image/video assets referenced below (basic/0.png … 10.mp4)
   * don't exist yet — add them the same way the letter assets were
   * added, at ../assets/images/basic/ and ../assets/videos/basic/. */
  {
    id: 'basic_0', level: 'basic', signId: '0', title: 'Number 0', order: 27, category: 'numbers',
    description: 'Curve your fingers and thumb to touch at the tips, forming a closed circle — the same handshape as the letter O.',
    tips: [
      'All fingertips and thumb meet to form one closed circle',
      'Keep the circle rounded, not flattened',
      'Hold the hand steady with the circle facing forward',
    ],
    imageUrl: '../assets/images/basic/0.png', videoUrl: '../assets/videos/basic/0.mp4', detectionType: 'static',
  },
  {
    id: 'basic_1', level: 'basic', signId: '1', title: 'Number 1', order: 28, category: 'numbers',
    description: 'Point your index finger straight up. The other three fingers stay curled into the palm, thumb resting across them (no circle, unlike the letter D).',
    tips: [
      'Only the index finger is extended, straight up',
      'Middle, ring, and pinky curl into the palm',
      'Thumb rests across the curled fingers, not touching the middle finger',
    ],
    imageUrl: '../assets/images/basic/1.png', videoUrl: '../assets/videos/basic/1.mp4', detectionType: 'static',
  },
  {
    id: 'basic_2', level: 'basic', signId: '2', title: 'Number 2', order: 29, category: 'numbers',
    description: 'Extend your index and middle fingers straight up, held together (not spread apart into a V). Thumb holds down the ring and pinky.',
    tips: [
      'Index and middle fingers point up, touching each other',
      'Keep them together — spreading them looks like the letter V instead',
      'Ring and pinky stay curled down, held by the thumb',
    ],
    imageUrl: '../assets/images/basic/2.png', videoUrl: '../assets/videos/basic/2.mp4', detectionType: 'static',
  },
  {
    id: 'basic_3', level: 'basic', signId: '3', title: 'Number 3', order: 30, category: 'numbers',
    description: 'Extend your thumb, index, and middle fingers, spread loosely apart. Ring and pinky curl into the palm.',
    tips: [
      'Thumb, index, and middle fingers all point outward/up',
      'Ring and pinky fingers curl in tightly',
      'This is a distinct shape from the letter W (which uses index/middle/ring instead of the thumb)',
    ],
    imageUrl: '../assets/images/basic/3.png', videoUrl: '../assets/videos/basic/3.mp4', detectionType: 'static',
  },
  {
    id: 'basic_4', level: 'basic', signId: '4', title: 'Number 4', order: 31, category: 'numbers',
    description: 'Extend index, middle, ring, and pinky fingers straight up and slightly spread. Thumb folds flat across the palm.',
    tips: [
      'Four fingers (everything except the thumb) point straight up',
      'Thumb tucks in across the palm, not sticking out',
      'Keep fingers slightly spread, not pressed tightly together',
    ],
    imageUrl: '../assets/images/basic/4.png', videoUrl: '../assets/videos/basic/4.mp4', detectionType: 'static',
  },
  {
    id: 'basic_5', level: 'basic', signId: '5', title: 'Number 5', order: 32, category: 'numbers',
    description: 'Open your whole hand — all five fingers extended straight and spread apart, palm facing forward.',
    tips: [
      'All five fingers, including the thumb, are extended',
      'Spread the fingers naturally apart',
      'Palm faces the person you\u2019re signing to',
    ],
    imageUrl: '../assets/images/basic/5.png', videoUrl: '../assets/videos/basic/5.mp4', detectionType: 'static',
  },
  {
    id: 'basic_6', level: 'basic', signId: '6', title: 'Number 6', order: 33, category: 'numbers',
    description: 'Touch your thumb to the tip of your pinky finger. Index, middle, and ring fingers stay extended straight up. In real ASL this is tap-disambiguated from the letter W, so it\u2019s detected as a motion sign, not a held pose.',
    tips: [
      'Thumb and pinky tip touch to form a small connection',
      'Index, middle, and ring fingers stay straight and up',
      'Keep the thumb-pinky touch light and clear, not a full fist',
    ],
    imageUrl: '../assets/images/basic/6.png', videoUrl: '../assets/videos/basic/6.mp4', detectionType: 'motion',
  },
  {
    id: 'basic_7', level: 'basic', signId: '7', title: 'Number 7', order: 34, category: 'numbers',
    description: 'Touch your thumb to the tip of your ring finger. Index, middle, and pinky fingers stay extended straight up.',
    tips: [
      'Thumb and ring finger tip touch',
      'Index, middle, and pinky fingers stay straight and up',
      'This follows the same thumb-to-finger pattern as 6, 8, and 9 — only which finger touches the thumb changes',
    ],
    imageUrl: '../assets/images/basic/7.png', videoUrl: '../assets/videos/basic/7.mp4', detectionType: 'static',
  },
  {
    id: 'basic_8', level: 'basic', signId: '8', title: 'Number 8', order: 35, category: 'numbers',
    description: 'Touch your thumb to the tip of your middle finger. Index, ring, and pinky fingers stay extended straight up.',
    tips: [
      'Thumb and middle finger tip touch',
      'Index, ring, and pinky fingers stay straight and up',
      'Keep the untouched fingers clearly separated so the shape reads as 8, not 7 or 9',
    ],
    imageUrl: '../assets/images/basic/8.png', videoUrl: '../assets/videos/basic/8.mp4', detectionType: 'static',
  },
  {
    id: 'basic_9', level: 'basic', signId: '9', title: 'Number 9', order: 36, category: 'numbers',
    description: 'Touch your thumb to the tip of your index finger, forming a small circle. Middle, ring, and pinky fingers stay extended straight up. In real ASL this is tap-disambiguated from the letter F, so it\u2019s detected as a motion sign, not a held pose.',
    tips: [
      'Thumb and index finger tip touch, forming a small circle near the top of the hand',
      'Middle, ring, and pinky fingers stay straight and up',
      'Similar circle to letter F, but F keeps its other fingers spread outward rather than straight up',
    ],
    imageUrl: '../assets/images/basic/9.png', videoUrl: '../assets/videos/basic/9.mp4', detectionType: 'motion',
  },
  {
    id: 'basic_10', level: 'basic', signId: '10', title: 'Number 10', order: 37, category: 'numbers',
    description: 'Make a closed fist with your thumb extended up (like a thumbs-up), then twist your wrist side to side. This is a genuine motion sign — there\u2019s no single frame that represents it.',
    tips: [
      'Start with a relaxed fist, thumb pointing up',
      'The twist is a small, quick shake — not a big rotation',
      'Unlike 0–9, this one can\u2019t be held still and still be correct',
    ],
    imageUrl: '../assets/images/basic/10.png', videoUrl: '../assets/videos/basic/10.mp4', detectionType: 'motion',
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
  {
    id: 'medium_family_BROTHER', level: 'medium', category: 'family', signId: 'BROTHER', title: 'Brother', order: 5,
    // CHANGED — corrected against ASLU (lifeprint.com/asl101/pages-signs/b/brosis.htm):
    // the old description ("both hands in L, come together, index fingers meet")
    // is ASLU's documented OLDER/legacy version — now associated with dated
    // "Signed English" style, not what fluent signers use today. The modern,
    // ASLU-recommended sign moves only the dominant hand: it starts as a
    // modified "L" near the forehead and morphs into a "1" as it comes down
    // onto a STATIONARY base hand already held in a "1" handshape. If
    // capture.html's training clips for BROTHER were recorded using the old
    // two-hands-meeting description, they were captured against the wrong
    // variant — worth spot-checking / re-recording.
    description: 'Hold your non-dominant hand steady in a "1" handshape (index finger up, palm facing you). Start your dominant hand in a modified "L" shape near your forehead, then bring it straight down onto your non-dominant hand — the handshape shifts from "L" to "1" as it lands.',
    tips: [
      'Only the dominant hand moves — the non-dominant "1" hand stays still',
      'Dominant hand starts near the forehead (same starting spot as BOY), not the jaw',
      'This is a MOTION sign — the handshape change (L → 1) as it lands is what matters, not two hands meeting in the middle',
    ],
    imageUrl: '../assets/images/medium/family/BROTHER.png', videoUrl: '../assets/videos/medium/family/BROTHER.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_MARRIAGE', level: 'medium', category: 'family', signId: 'MARRIAGE', title: 'Marriage', order: 6,
    description: 'Clasp your hands together in front of your chest, interlocking the fingers, then bring them down slightly — symbolizing two people joining together.',
    tips: [
      'Hands fully interlock, not just touch',
      'The downward motion after clasping matters — this is a MOTION sign',
      'Keep the motion smooth and centered in front of your chest',
    ],
    imageUrl: '../assets/images/medium/family/MARRIAGE.png', videoUrl: '../assets/videos/medium/family/MARRIAGE.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_SISTER', level: 'medium', category: 'family', signId: 'SISTER', title: 'Sister', order: 7,
    // CHANGED — same ASLU correction as BROTHER above (same source page:
    // lifeprint.com/asl101/pages-signs/b/brosis.htm). Only the dominant
    // hand moves; it starts as a modified "L" near the jaw/chin and morphs
    // into a "1" as it comes down onto a stationary base hand.
    description: 'Hold your non-dominant hand steady in a "1" handshape (index finger up, palm facing you). Start your dominant hand in a modified "L" shape near your jaw/chin, then bring it straight down onto your non-dominant hand — the handshape shifts from "L" to "1" as it lands.',
    tips: [
      'Only the dominant hand moves — the non-dominant "1" hand stays still',
      'Dominant hand starts near the jaw/chin (same starting spot as GIRL), not the forehead — that\'s BROTHER',
      'This is a MOTION sign — the handshape change (L → 1) as it lands is what matters, not two hands meeting in the middle',
    ],
    imageUrl: '../assets/images/medium/family/SISTER.png', videoUrl: '../assets/videos/medium/family/SISTER.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_GRANDMA', level: 'medium', category: 'family', signId: 'GRANDMA', title: 'Grandma', order: 8,
    description: 'Start in the MOM position — open "5" hand, thumb tapping the chin — then hop the hand forward and tap again.',
    tips: [
      'Same handshape and starting tap as MOM',
      'The forward double-hop is what turns MOM into GRANDMA',
      'Keep both taps at chin height',
    ],
    imageUrl: '../assets/images/medium/family/GRANDMA.png', videoUrl: '../assets/videos/medium/family/GRANDMA.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_GRANDPA', level: 'medium', category: 'family', signId: 'GRANDPA', title: 'Grandpa', order: 9,
    description: 'Start in the DAD position — open "5" hand, thumb tapping the forehead — then hop the hand forward and tap again.',
    tips: [
      'Same handshape and starting tap as DAD',
      'The forward double-hop is what turns DAD into GRANDPA',
      'Keep both taps at forehead height',
    ],
    imageUrl: '../assets/images/medium/family/GRANDPA.png', videoUrl: '../assets/videos/medium/family/GRANDPA.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_AUNT', level: 'medium', category: 'family', signId: 'AUNT', title: 'Aunt', order: 10,
    description: 'Make an "A" handshape (fist, thumb resting on the side) near your cheek and shake it slightly.',
    tips: [
      'Handshape is the letter "A", held near the cheek — not the chin or forehead',
      'A small back-and-forth shake is part of the sign',
      'This is a MOTION sign — a static A near the cheek is not enough',
    ],
    imageUrl: '../assets/images/medium/family/AUNT.png', videoUrl: '../assets/videos/medium/family/AUNT.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_UNCLE', level: 'medium', category: 'family', signId: 'UNCLE', title: 'Uncle', order: 11,
    description: 'Make a "U" handshape (index and middle finger together, pointing up) near your temple and shake it slightly.',
    tips: [
      'Handshape is the letter "U", held near the temple — not the chin or cheek',
      'A small back-and-forth shake is part of the sign',
      'This is a MOTION sign — a static U near the temple is not enough',
    ],
    imageUrl: '../assets/images/medium/family/UNCLE.png', videoUrl: '../assets/videos/medium/family/UNCLE.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_BABY', level: 'medium', category: 'family', signId: 'BABY', title: 'Baby', order: 12,
    description: 'Cross both forearms in front of your chest, palms up, and rock them gently side to side like cradling an infant.',
    tips: [
      'Both arms cradle in front of the chest, not just one hand moving',
      'The rocking motion is what makes this a MOTION sign',
      'Keep the rock small and centered on the chest',
    ],
    imageUrl: '../assets/images/medium/family/BABY.png', videoUrl: '../assets/videos/medium/family/BABY.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_SINGLE', level: 'medium', category: 'family', signId: 'SINGLE', title: 'Single', order: 13,
    description: 'Hold up an "I" handshape (pinky extended, other fingers curled) and trace it along the ring finger of your other hand.',
    tips: [
      'Handshape is the letter "I" — pinky up, rest of the hand curled',
      'The tracing motion along the ring finger is what completes the sign',
      'This distinguishes SINGLE from a plain pinky-up letter I',
    ],
    imageUrl: '../assets/images/medium/family/SINGLE.png', videoUrl: '../assets/videos/medium/family/SINGLE.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_family_DIVORCED', level: 'medium', category: 'family', signId: 'DIVORCED', title: 'Divorced', order: 14,
    description: 'Hold both hands in flat "D"/bent shapes facing each other, touching, then twist and pull them apart in opposite directions.',
    tips: [
      'Hands start touching, then rotate apart — the separation motion is the key part',
      'Keep the pulling-apart motion deliberate and visible',
      'This is a MOTION sign — the split matters more than the starting handshape',
    ],
    imageUrl: '../assets/images/medium/family/DIVORCED.png', videoUrl: '../assets/videos/medium/family/DIVORCED.mp4', detectionType: 'motion',
  },

  /* ── MEDIUM · WORDS (auto-generated content — see BUGFIX notes) ── */

  // ── MEDIUM · PLACES ──
  {
    id: 'medium_places_HOME', level: 'medium', category: 'places', signId: 'HOME', title: 'Home', order: 1,
    description: 'Bring your fingertips and thumb together into a flattened ‘O’ shape. Touch them to the corner of your mouth, then move your hand back to touch your cheek near your ear.',
    tips: [
      'Two touches: mouth corner, then cheek/ear',
      'Keep the hand shape compact the whole time',
      'Motion sign — the two-part movement matters',
    ],
    imageUrl: '../assets/images/medium/places/home.png', videoUrl: '../assets/videos/medium/places/home.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_WORK', level: 'medium', category: 'places', signId: 'WORK', title: 'Work', order: 2,
    description: 'Make two fists (S-handshape). Tap the wrist/heel of your dominant fist on top of your non-dominant fist twice.',
    tips: [
      'Both hands stay in a fist the whole time',
      'Contact point is the wrist/heel of the hand, not the knuckles',
      'Two clear taps',
    ],
    imageUrl: '../assets/images/medium/places/work.png', videoUrl: '../assets/videos/medium/places/work.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_SCHOOL', level: 'medium', category: 'places', signId: 'SCHOOL', title: 'School', order: 3,
    description: 'Hold both hands flat, palms open and facing up. Clap the fingertips of your top hand down into the palm of your bottom hand twice.',
    tips: [
      'Both hands are flat, fingers together',
      'Top hand does the clapping motion',
      'Two claps, like getting a class\'s attention',
    ],
    imageUrl: '../assets/images/medium/places/school.png', videoUrl: '../assets/videos/medium/places/school.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_STORE', level: 'medium', category: 'places', signId: 'STORE', title: 'Store', order: 4,
    description: 'Hold both hands in a loose ‘flat O’ shape near your chest, palms facing forward, and rotate your wrists forward twice, as if presenting items on a shelf.',
    tips: [
      'Both hands move together, in sync',
      'Small forward rotation from the wrist',
      'Repeat the motion twice',
    ],
    imageUrl: '../assets/images/medium/places/store.png', videoUrl: '../assets/videos/medium/places/store.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_CHURCH', level: 'medium', category: 'places', signId: 'CHURCH', title: 'Church', order: 5,
    description: 'Form a ‘C’ handshape with your dominant hand and tap it twice on the back of your other fist, which is held in an ‘S’ shape.',
    tips: [
      'Non-dominant hand stays a closed fist',
      'Dominant hand keeps a clear C-curve',
      'Two taps on the back of the fist',
    ],
    imageUrl: '../assets/images/medium/places/church.png', videoUrl: '../assets/videos/medium/places/church.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_COME', level: 'medium', category: 'requests', signId: 'COME', title: 'Come', order: 6,
    // CHANGED — split out of a combined 'COME/GO' entry, same fix as
    // IN/OUT earlier: a single signId can only ever match ONE detected
    // label, so a pair-entry could never actually be detected correctly.
    // BUGFIX (this session): the line below used to claim "Both COME and
    // GO are already separately captured/trained" — false. Confirmed
    // against asl_motion_model/labels.json (no COME/GO/J-Z-word class
    // for either) and dictionary.js (`disabled: true` on both). They're
    // on the Phase 7 capture list like the other Essential Words —
    // correcting the comment so a future session doesn't skip them
    // assuming this category is fully live.
    description: 'Point both index fingers up with palms facing you, and rotate them inward toward your body.',
    tips: [
      'Palms face you, both index fingers extended',
      'Motion pulls inward, toward your body',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/places/come.png', videoUrl: '../assets/videos/medium/places/come.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_GO', level: 'medium', category: 'requests', signId: 'GO', title: 'Go', order: 7,
    // CHANGED — the other half of the old combined 'COME/GO' entry.
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body — the reverse of COME',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/places/go.png', videoUrl: '../assets/videos/medium/places/go.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_CAR', level: 'medium', category: 'places', signId: 'CAR', title: 'Car / Drive', order: 8,
    // CHANGED — signId was 'CAR/DRIVE', but the trained model only has
    // a literal "CAR" label (no separate "DRIVE" motion was recorded).
    // 'CAR/DRIVE' would never have matched classifyMotion()'s output —
    // fixed to the string that's actually detectable. Title kept as-is
    // since the lesson content/description still covers the concept.
    description: 'Hold both hands as if gripping a steering wheel and move them in a small alternating turning motion, as if driving.',
    tips: [
      'Hands stay shoulder-width apart',
      'Small, natural steering-wheel turns',
      'Motion sign — keep it continuous while holding',
    ],
    imageUrl: '../assets/images/medium/places/car.png', videoUrl: '../assets/videos/medium/places/car.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_IN', level: 'medium', category: 'places', signId: 'IN', title: 'In', order: 9,
    // CHANGED — split out of a single combined 'IN/OUT' entry. The
    // model was trained with IN and OUT as two separate, genuinely
    // different motions (matching what the old description already
    // said: "IN moves down and inward; OUT moves up and outward" —
    // that was always two signs, not one). A single 'IN/OUT' signId
    // could never have matched either "IN" or "OUT" coming back from
    // classifyMotion() — see dictionary.js's PLACES block comment.
    description: 'Bring your fingertips together and dip that hand down into the opening made by your other curved hand.',
    tips: [
      'Non-dominant hand forms a loose ‘container’ shape',
      'Motion goes down and inward',
      'Fingers stay bunched together the whole time',
    ],
    imageUrl: '../assets/images/medium/places/in.png', videoUrl: '../assets/videos/medium/places/in.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_OUT', level: 'medium', category: 'places', signId: 'OUT', title: 'Out', order: 10,
    // CHANGED — the other half of the old combined 'IN/OUT' entry, see
    // the note on medium_places_IN just above.
    description: 'Pull your bunched fingers up and out of the curved base hand, opening them as they exit.',
    tips: [
      'Non-dominant hand forms a loose ‘container’ shape',
      'Motion goes up and outward — the reverse of IN',
      'Fingers open as they exit',
    ],
    imageUrl: '../assets/images/medium/places/out.png', videoUrl: '../assets/videos/medium/places/out.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_places_WITH', level: 'medium', category: 'places', signId: 'WITH', title: 'With', order: 11,
    description: 'Make two fists (A-handshape) and bring them together side by side so the knuckles touch, palms facing each other.',
    tips: [
      'Both hands are closed fists',
      'Knuckles meet in the middle',
      'Hold briefly once they touch',
    ],
    imageUrl: '../assets/images/medium/places/with.png', videoUrl: '../assets/videos/medium/places/with.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · SEQUENCE_DEMO (Basic Phrases, curated Phase 7,
  //    2026-08-20) — every component word below is confirmed present
  //    in this repo's asl_motion_model/labels.json (grepped directly,
  //    not assumed). Each entry's top-level `detectionType: 'motion'`
  //    is NOT what actually drives detection for a phrase — confirmed
  //    by reading lesson.js's getActiveSignId()/getPhraseSequence():
  //    the camera step-through resolves detectionType PER STEP via
  //    getDetectionType(stepSignId) (e.g. 'MOM', then 'HOME'), never
  //    via this entry's own signId ('MOM_HOME'). The field is required
  //    schema shape, functionally unused for `sequence`-type entries. ──
  {
    id: 'medium_sequence_demo_mom_home', level: 'medium', category: 'sequence_demo', signId: 'MOM_HOME',
    title: 'Mom Is Home', order: 1,
    sequence: ['MOM', 'HOME'],
    description: 'A short topic-comment phrase: MOM, then HOME. Chains two already-trained word-signs — sign each one clearly and hold until it registers before moving to the next.',
    tips: [
      'Each word is checked independently, in order',
      'A brief pause between signs is fine — the countdown gives you time to reset',
      'Topic first (MOM), then comment (HOME) — standard basic ASL word order',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/mom_home.png', videoUrl: '../assets/videos/medium/sequence_demo/mom_home.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_sequence_demo_dad_work', level: 'medium', category: 'sequence_demo', signId: 'DAD_WORK',
    title: 'Dad Is At Work', order: 2,
    sequence: ['DAD', 'WORK'],
    description: 'DAD, then WORK — same topic-comment pattern as "Mom Is Home", with a different family/place pair.',
    tips: [
      'Sign DAD first, hold until it registers',
      'Then sign WORK — you get a fresh countdown for it',
      'Topic (DAD) before comment (WORK)',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/dad_work.png', videoUrl: '../assets/videos/medium/sequence_demo/dad_work.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_sequence_demo_today_school', level: 'medium', category: 'sequence_demo', signId: 'TODAY_SCHOOL',
    title: 'School Today', order: 3,
    sequence: ['TODAY', 'SCHOOL'],
    description: 'TODAY, then SCHOOL — time-then-topic, the other standard basic ASL ordering (time markers generally come first in a sentence).',
    tips: [
      'Sign TODAY first, hold until it registers',
      'Then sign SCHOOL',
      'Time word (TODAY) leads, unlike the topic-first phrases above',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/today_school.png', videoUrl: '../assets/videos/medium/sequence_demo/today_school.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_sequence_demo_finish_work', level: 'medium', category: 'sequence_demo', signId: 'FINISH_WORK',
    title: 'Done With Work', order: 4,
    sequence: ['FINISH', 'WORK'],
    description: 'FINISH, then WORK — FINISH doubling as a completion marker ("done ___") is common in basic ASL phrasing.',
    tips: [
      'Sign FINISH first, hold until it registers',
      'Then sign WORK',
      'This pairing reuses FINISH the same way a learner will see it again elsewhere in Unit 5 (Time)',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/finish_work.png', videoUrl: '../assets/videos/medium/sequence_demo/finish_work.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_sequence_demo_sister_store', level: 'medium', category: 'sequence_demo', signId: 'SISTER_STORE',
    title: 'Sister Is At The Store', order: 5,
    sequence: ['SISTER', 'STORE'],
    description: 'SISTER, then STORE — another topic-comment pairing, mixing a Family word with a Places word.',
    tips: [
      'Sign SISTER first, hold until it registers',
      'Then sign STORE',
      'Topic (SISTER) before comment (STORE)',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/sister_store.png', videoUrl: '../assets/videos/medium/sequence_demo/sister_store.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_sequence_demo_today_grandma_home', level: 'medium', category: 'sequence_demo', signId: 'TODAY_GRANDMA_HOME',
    title: 'Today, Grandma Is Home', order: 6,
    sequence: ['TODAY', 'GRANDMA', 'HOME'],
    description: 'A 3-step chain — TIME + TOPIC + COMMENT (TODAY, then GRANDMA, then HOME) — showing the mechanism scales past two words.',
    tips: [
      'Sign TODAY first, hold until it registers',
      'Then GRANDMA, then HOME — each gets its own countdown',
      'Longest chain in this set — good one to try last',
    ],
    imageUrl: '../assets/images/medium/sequence_demo/today_grandma_home.png', videoUrl: '../assets/videos/medium/sequence_demo/today_grandma_home.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · TIME ──
  {
    id: 'medium_time_DAY', level: 'medium', category: 'time', signId: 'DAY', title: 'Day', order: 1,
    // CHANGED — reformatted into labeled parts (non-dominant hand /
    // dominant hand / movement) for clarity. Facts unchanged and were
    // already correct: confirmed against lifeprint.com (Dr. Bill
    // Vicars), who explicitly recommends an INDEX FINGER handshape here
    // and specifically warns AGAINST a "D" handshape, calling that
    // variant Signed English rather than ASL.
    description: 'Non-dominant hand: hold your arm flat and horizontal in front of you, palm down. Dominant hand: point your index finger straight up (not a "D" handshape — that\'s Signed English, not ASL) and rest your elbow on the back of your non-dominant hand. Movement: swing your dominant arm down in one smooth arc until your forearm rests along your other arm, like the sun crossing the sky.',
    tips: [
      'Index finger only — not a "D" handshape',
      'Elbow stays anchored on the back of your other hand throughout',
      'One smooth downward sweep, not a bounce',
    ],
    imageUrl: '../assets/images/medium/time/day.png', videoUrl: '../assets/videos/medium/time/day.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_NIGHT', level: 'medium', category: 'time', signId: 'NIGHT', title: 'Night', order: 2,
    // CHANGED — reformatted, and corrected against lifeprint.com
    // directly: ASLU describes this as a simpler placement than a big
    // arc — the dominant WRIST rests on the back of the non-dominant
    // hand, fingers pointing down. No sweeping arc motion is described
    // on the source page; kept the "sun dipping down" mental image
    // since it's a reasonable memory aid, but tightened the mechanics
    // to match ASLU rather than imply a large arcing movement.
    description: 'Non-dominant hand: hold your arm flat and horizontal in front of you, palm down. Dominant hand: bend your hand down at the wrist so your fingers curve downward. Movement: bring your dominant wrist to rest on the back of your non-dominant hand, fingers pointing down — like the sun dipping below the horizon.',
    tips: [
      'Dominant hand bends at the WRIST, fingers pointing down',
      'The wrist (not the back of the hand) rests on your other hand',
      'A settled placement, not a wide sweeping arc',
    ],
    imageUrl: '../assets/images/medium/time/night.png', videoUrl: '../assets/videos/medium/time/night.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_WEEK', level: 'medium', category: 'time', signId: 'WEEK', title: 'Week', order: 3,
    // CHANGED — reformatted into labeled parts. Facts unchanged and
    // already correct, confirmed against lifeprint.com.
    description: 'Non-dominant hand: hold it flat, palm facing up. Dominant hand: form a "1" handshape (index finger extended). Movement: slide the pinky-side edge of your dominant hand across the non-dominant palm and off the fingertips, in one smooth motion.',
    tips: [
      'Dominant hand is a simple "1" — index finger extended',
      'One continuous sliding motion, not a tap',
      'Ends past the fingertips of the base hand',
    ],
    imageUrl: '../assets/images/medium/time/week.png', videoUrl: '../assets/videos/medium/time/week.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_MONTH', level: 'medium', category: 'time', signId: 'MONTH', title: 'Month', order: 4,
    // CHANGED — reformatted, content confirmed against lifeprint.com.
    // Added one detail from the source worth knowing: a "palm down"
    // version of the dominant hand exists and isn't strictly wrong, but
    // ASLU specifically doesn't recommend it — capture with the
    // dominant palm facing back/toward you instead.
    description: 'Non-dominant hand: point your index finger straight up, palm facing to the side. Dominant hand: point your index finger too, palm facing back toward you (not palm-down). Movement: trace your dominant index finger down the length of your non-dominant finger, from tip to base.',
    tips: [
      'Both hands use a "1" handshape',
      'Dominant palm faces back toward you, not down',
      'Motion goes top to bottom, tracing the finger',
    ],
    imageUrl: '../assets/images/medium/time/month.png', videoUrl: '../assets/videos/medium/time/month.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_YEAR', level: 'medium', category: 'time', signId: 'YEAR', title: 'Year', order: 5,
    // CHANGED — reformatted into labeled parts. Facts unchanged and
    // already correct, confirmed against lifeprint.com.
    description: 'Both hands: make closed fists ("S" handshape). Starting position: rest your dominant fist on top of your non-dominant fist. Movement: circle your dominant fist forward and all the way around the non-dominant one, landing back on top where it started — like a full orbit.',
    tips: [
      'Both hands stay closed fists the whole time',
      'One complete circle, not a partial motion',
      'Ends exactly where it started, on top',
    ],
    imageUrl: '../assets/images/medium/time/year.png', videoUrl: '../assets/videos/medium/time/year.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_WILL', level: 'medium', category: 'time', signId: 'WILL', title: 'Will (future)', order: 6,
    description: 'Hold your flat hand near the side of your face, palm facing sideways, then move it forward and away from your head.',
    tips: [
      'Starts close to the cheek/temple',
      'One forward push, not a wave',
      'Also used more generally to mean ‘future’',
    ],
    imageUrl: '../assets/images/medium/time/will.png', videoUrl: '../assets/videos/medium/time/will.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_BEFORE', level: 'medium', category: 'time', signId: 'BEFORE', title: 'Before', order: 7,
    description: 'Hold both flat hands in front of you with palms facing your body, fingers touching. Move your dominant hand back toward your shoulder.',
    tips: [
      'Non-dominant hand stays in place',
      'Dominant hand pulls backward, toward the body',
      'Short, controlled motion',
    ],
    imageUrl: '../assets/images/medium/time/before.png', videoUrl: '../assets/videos/medium/time/before.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_NOW', level: 'medium', category: 'time', signId: 'NOW', title: 'Now', order: 8,
    // CHANGED — split out of a combined 'TODAY/NOW' entry, same fix as
    // IN/OUT and the others: a single signId can only ever match ONE
    // detected label. Also a real correction, not just a format change
    // — the old entry said repeating the motion "emphasizes right now,"
    // but per lifeprint.com, repeating it is specifically what turns
    // NOW into TODAY, not an emphasis version of the same sign. NOW and
    // TODAY use the same base motion — NOW does it once.
    description: 'Both hands: hold them with fingers slightly bent, palms facing up, in front of your body. Movement: drop both hands down a short distance, once.',
    tips: [
      'Both hands move together',
      'One short downward drop — NOT repeated (that\'s TODAY)',
      'Same handshape as TODAY, just a single motion instead of two',
    ],
    imageUrl: '../assets/images/medium/time/now.png', videoUrl: '../assets/videos/medium/time/now.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_TODAY', level: 'medium', category: 'time', signId: 'TODAY', title: 'Today', order: 8.5,
    // CHANGED — the other half of the old combined 'TODAY/NOW' entry.
    // Per lifeprint.com: TODAY is NOW with the drop repeated (a small
    // bounce) — that repetition is the entire difference between the
    // two signs, not an optional emphasis.
    description: 'Both hands: hold them with fingers slightly bent, palms facing up, in front of your body. Movement: drop both hands down a short distance, then bounce and drop again — the same motion as NOW, repeated once.',
    tips: [
      'Same handshape and drop as NOW',
      'The repeat/bounce is what makes it TODAY instead of NOW',
      'Keep both repeats short — this isn\'t a big motion either time',
    ],
    imageUrl: '../assets/images/medium/time/today.png', videoUrl: '../assets/videos/medium/time/today.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_time_FINISH', level: 'medium', category: 'time', signId: 'FINISH', title: 'Finish', order: 9,
    // CHANGED — reformatted, confirmed against lifeprint.com. Left out
    // an unverified detail from a non-ASLU source (a "mouth the word
    // fish" facial cue) — not documented on the source page, so not
    // included here.
    description: 'Both hands: open with fingers spread, palms facing your body. Starting position: hold both hands up near shoulder height. Movement: twist both wrists quickly so your palms end up facing forward/outward.',
    tips: [
      'Start with palms facing you, end facing forward',
      'A quick twist, not a slow turn',
      'Both hands move together, in sync',
    ],
    imageUrl: '../assets/images/medium/time/finish.png', videoUrl: '../assets/videos/medium/time/finish.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · TEMPERATURE ──
  {
    id: 'medium_temperature_HOT', level: 'medium', category: 'temperature', signId: 'HOT', title: 'Hot', order: 1,
    description: 'Start with a clawed hand (fingers bent) near your mouth, then quickly twist your wrist and pull the hand away, as if you touched something too hot.',
    tips: [
      'Facial expression matters — look like it\'s genuinely hot!',
      'The twist-and-pull is sharp and fast',
      'Starts close to the mouth',
    ],
    imageUrl: '../assets/images/medium/temperature/hot.png', videoUrl: '../assets/videos/medium/temperature/hot.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_temperature_COLD', level: 'medium', category: 'temperature', signId: 'COLD', title: 'Cold', order: 2,
    description: 'Hold both fists up near your shoulders and shake them slightly, as if shivering from the cold.',
    tips: [
      'Small, quick shaking motion',
      'Both fists move together',
      'A shivering facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/temperature/cold.png', videoUrl: '../assets/videos/medium/temperature/cold.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · FOOD ──
  {
    id: 'medium_food_PIZZA', level: 'medium', category: 'food', signId: 'PIZZA', title: 'Pizza', order: 1,
    description: 'Form a ‘P’ handshape and trace a zigzag in the air, as if drawing a triangular slice of pizza.',
    tips: [
      'Handshape is a ‘P’ (bent middle finger, thumb between)',
      'Zigzag has two clear angles',
      'Traced in the air in front of you',
    ],
    imageUrl: '../assets/images/medium/food/pizza.png', videoUrl: '../assets/videos/medium/food/pizza.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_MILK', level: 'medium', category: 'food', signId: 'MILK', title: 'Milk', order: 2,
    description: 'Hold one hand up and squeeze it open and closed repeatedly, like squeezing an udder while milking a cow.',
    tips: [
      'Alternates between a loose fist and an open hand',
      'Repeat the squeeze a couple of times',
      'Keep the motion at chest height',
    ],
    imageUrl: '../assets/images/medium/food/milk.png', videoUrl: '../assets/videos/medium/food/milk.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_HAMBURGER', level: 'medium', category: 'food', signId: 'HAMBURGER', title: 'Hamburger', order: 3,
    description: 'Clasp your hands together like you\'re holding a burger, then flip them over and clasp again.',
    tips: [
      'Both hands form loose, rounded shapes',
      'One flip in the middle of the motion',
      'Like patting a burger patty into shape',
    ],
    imageUrl: '../assets/images/medium/food/hamburger.png', videoUrl: '../assets/videos/medium/food/hamburger.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_HOT_DOG', level: 'medium', category: 'food', signId: 'HOT DOG', title: 'Hot Dog', order: 4,
    description: 'Hold both hands with thumb and fingers pinched together in front of you, then move them apart and together twice, as if shaping a hot dog.',
    tips: [
      'Both hands pinch into a small ‘O’ shape',
      'Apart-together motion, done twice',
      'Keep hands level with each other',
    ],
    imageUrl: '../assets/images/medium/food/hot_dog.png', videoUrl: '../assets/videos/medium/food/hot_dog.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_EGG', level: 'medium', category: 'food', signId: 'EGG', title: 'Egg', order: 5,
    description: 'Hold both hands in an ‘H’ shape (index and middle fingers extended), one on top of the other, then pull them apart and down, as if cracking an egg open.',
    tips: [
      'Handshape is ‘H’ — two fingers extended, together',
      'Downward, outward pulling motion',
      'One clean ‘crack’ motion',
    ],
    imageUrl: '../assets/images/medium/food/egg.png', videoUrl: '../assets/videos/medium/food/egg.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_APPLE', level: 'medium', category: 'food', signId: 'APPLE', title: 'Apple', order: 6,
    description: 'Form an ‘X’ handshape (bent index finger) and twist it gently against your cheek near the corner of your mouth.',
    tips: [
      'Handshape is a bent index finger, like a hook',
      'Small twisting motion, not a big circle',
      'Contact point is the cheek near the mouth',
    ],
    imageUrl: '../assets/images/medium/food/apple.png', videoUrl: '../assets/videos/medium/food/apple.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_CHEESE', level: 'medium', category: 'food', signId: 'CHEESE', title: 'Cheese', order: 7,
    description: 'Hold both flat hands in front of you, palms facing each other, and twist them back and forth as if pressing cheese together.',
    tips: [
      'Palms face each other the whole time',
      'Small back-and-forth twisting motion',
      'Hands stay close together',
    ],
    imageUrl: '../assets/images/medium/food/cheese.png', videoUrl: '../assets/videos/medium/food/cheese.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_DRINK', level: 'medium', category: 'food', signId: 'DRINK', title: 'Drink', order: 8,
    description: 'Form a ‘C’ handshape as if holding a cup, bring it to your mouth, and tilt it slightly, as if taking a sip.',
    tips: [
      'Handshape curves like it\'s wrapped around a cup',
      'The tilt happens right at the mouth',
      'One smooth lift-and-tilt motion',
    ],
    imageUrl: '../assets/images/medium/food/drink.png', videoUrl: '../assets/videos/medium/food/drink.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_SPOON', level: 'medium', category: 'food', signId: 'SPOON', title: 'Spoon', order: 9,
    description: 'Hold your non-dominant hand flat, palm up. Use your dominant hand\'s curved index and middle fingers to scoop across the palm, like using a spoon.',
    tips: [
      'Base hand stays flat and still',
      'Scooping hand curves slightly, like a spoon\'s bowl',
      'One smooth scoop across the palm',
    ],
    imageUrl: '../assets/images/medium/food/spoon.png', videoUrl: '../assets/videos/medium/food/spoon.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_FORK', level: 'medium', category: 'food', signId: 'FORK', title: 'Fork', order: 10,
    description: 'Hold your non-dominant hand flat, palm up. Tap your dominant hand\'s extended index and middle fingers down onto the palm twice, like a fork stabbing food.',
    tips: [
      'Handshape is a ‘V’/‘U’ — two fingers extended',
      'Two short downward taps',
      'Base hand stays flat and still',
    ],
    imageUrl: '../assets/images/medium/food/fork.png', videoUrl: '../assets/videos/medium/food/fork.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_CUP', level: 'medium', category: 'food', signId: 'CUP', title: 'Cup', order: 11,
    description: 'Form a ‘C’ handshape with your dominant hand and tap it down onto the back of your other flat hand, as if setting a cup on a table.',
    tips: [
      'Dominant hand keeps a clear ‘C’ curve',
      'Base hand is flat, palm down',
      'One or two light taps',
    ],
    imageUrl: '../assets/images/medium/food/cup.png', videoUrl: '../assets/videos/medium/food/cup.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_CEREAL', level: 'medium', category: 'food', signId: 'CEREAL', title: 'Cereal', order: 12,
    description: 'Many signers spell C-E-R-E-A-L, or use a scooping motion with a curved hand moving from an imaginary bowl up toward your mouth, similar to the sign for SPOON.',
    tips: [
      'Fingerspelling is a common, accepted option for this word',
      'If signing the concept, keep the scoop-to-mouth motion smooth',
      'Facial expression can show it\'s a meal, reinforcing context',
    ],
    imageUrl: '../assets/images/medium/food/cereal.png', videoUrl: '../assets/videos/medium/food/cereal.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_WATER', level: 'medium', category: 'requests', signId: 'WATER', title: 'Water', order: 13,
    description: 'Form a ‘W’ handshape (index, middle, and ring fingers extended) and tap it gently against your chin twice.',
    tips: [
      'Handshape is ‘W’ — three fingers extended',
      'Contact point is the chin',
      'Two light taps',
    ],
    imageUrl: '../assets/images/medium/food/water.png', videoUrl: '../assets/videos/medium/food/water.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_CANDY', level: 'medium', category: 'food', signId: 'CANDY', title: 'Candy', order: 14,
    description: 'Hold your index finger with a slight bend near the corner of your mouth and twist it gently, as if turning a piece of candy.',
    tips: [
      'Handshape is a bent index finger',
      'Small twisting motion at the mouth',
      'Similar to APPLE but with just the index finger',
    ],
    imageUrl: '../assets/images/medium/food/candy.png', videoUrl: '../assets/videos/medium/food/candy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_COOKIE', level: 'medium', category: 'food', signId: 'COOKIE', title: 'Cookie', order: 15,
    description: 'Form a ‘C’ handshape and press it into the palm of your other flat hand, then twist it slightly, as if using a cookie cutter.',
    tips: [
      'Dominant hand keeps the ‘C’ shape',
      'Base hand stays flat, palm up',
      'Twist happens after the press-down',
    ],
    imageUrl: '../assets/images/medium/food/cookie.png', videoUrl: '../assets/videos/medium/food/cookie.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_HUNGRY', level: 'medium', category: 'requests', signId: 'HUNGRY', title: 'Hungry', order: 16,
    description: 'Form a ‘C’ handshape and move it down the center of your chest, from below your throat toward your stomach.',
    tips: [
      'One smooth downward stroke',
      'Keep the ‘C’ curve consistent as it travels',
      'A slightly pained facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/food/hungry.png', videoUrl: '../assets/videos/medium/food/hungry.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · CLOTHES ──
  {
    id: 'medium_clothes_SHIRT', level: 'medium', category: 'clothes', signId: 'SHIRT', title: 'Shirt', order: 1,
    description: 'Pinch your shirt fabric near your chest between your thumb and index finger and give it a small tug, twice.',
    tips: [
      'Pinch actual fabric near the chest/collarbone',
      'Two small, quick tugs',
      'Keep the motion close to the body',
    ],
    imageUrl: '../assets/images/medium/clothes/shirt.png', videoUrl: '../assets/videos/medium/clothes/shirt.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_PANTS', level: 'medium', category: 'clothes', signId: 'PANTS', title: 'Pants', order: 2,
    description: 'Place both flat hands on your thighs and brush them upward toward your hips, as if pulling up a pair of pants.',
    tips: [
      'Both hands move together',
      'Motion goes from thigh to hip',
      'Keep hands flat against the legs',
    ],
    imageUrl: '../assets/images/medium/clothes/pants.png', videoUrl: '../assets/videos/medium/clothes/pants.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_SOCKS', level: 'medium', category: 'clothes', signId: 'SOCKS', title: 'Socks', order: 3,
    description: 'Hold both index fingers extended side by side and rub them back and forth against each other, like knitting a sock.',
    tips: [
      'Only the index fingers are extended',
      'Small side-to-side rubbing motion',
      'Fingers stay parallel and close together',
    ],
    imageUrl: '../assets/images/medium/clothes/socks.png', videoUrl: '../assets/videos/medium/clothes/socks.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_SHOES', level: 'medium', category: 'clothes', signId: 'SHOES', title: 'Shoes', order: 4,
    description: 'Make two fists (S-handshape) and tap them together twice at knuckle height, like clicking the soles of two shoes together.',
    tips: [
      'Both hands are closed fists',
      'Contact is knuckle-to-knuckle',
      'Two clear taps',
    ],
    imageUrl: '../assets/images/medium/clothes/shoes.png', videoUrl: '../assets/videos/medium/clothes/shoes.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_COAT', level: 'medium', category: 'clothes', signId: 'COAT', title: 'Coat', order: 5,
    description: 'Hook your thumbs near your collarbone with fists closed, then pull both hands down toward your chest, as if closing a coat.',
    tips: [
      'Thumbs hook near the collarbone to start',
      'Both hands pull down together',
      'One smooth downward motion',
    ],
    imageUrl: '../assets/images/medium/clothes/coat.png', videoUrl: '../assets/videos/medium/clothes/coat.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_UNDERWEAR', level: 'medium', category: 'clothes', signId: 'UNDERWEAR', title: 'Underwear', order: 6,
    description: 'Form a ‘U’ handshape (index and middle fingers together, extended) and tap it against your hip twice.',
    tips: [
      'Handshape is ‘U’ — two fingers together, extended',
      'Contact point is the hip',
      'Two light taps',
    ],
    imageUrl: '../assets/images/medium/clothes/underwear.png', videoUrl: '../assets/videos/medium/clothes/underwear.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · HEALTH ──
  {
    id: 'medium_health_WASH', level: 'medium', category: 'health', signId: 'WASH', title: 'Wash', order: 1,
    description: 'Make two loose fists and rub them together in a circular motion, like washing your hands.',
    tips: [
      'Both hands stay loosely closed',
      'Circular rubbing motion, not side to side',
      'Keep the motion at chest/waist height',
    ],
    imageUrl: '../assets/images/medium/health/wash.png', videoUrl: '../assets/videos/medium/health/wash.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_health_HURT', level: 'medium', category: 'health', signId: 'HURT', title: 'Hurt', order: 2,
    description: 'Point both index fingers toward each other and jab them together in short, quick movements near the area that hurts.',
    tips: [
      'Only the index fingers are extended',
      'Short, repeated jabbing motion',
      'Can be signed near whichever body part hurts',
    ],
    imageUrl: '../assets/images/medium/health/hurt.png', videoUrl: '../assets/videos/medium/health/hurt.mp4', detectionType: 'motion',
  },
  {
    // CHANGED (this session) — moved from `health` (still comingSoon)
    // into `requests`/Everyday Essentials. This IS the "RESTROOM" item
    // from Phase 7's Essential Words list — same physical sign (T-hand
    // shake), just tracked under two different labels in two different
    // files: `dictionary.js` had a `RESTROOM` placeholder, `data.js` had
    // this `BATHROOM` entry, and neither file referenced the other.
    // Kept the richer, already-written `BATHROOM` content rather than
    // writing a redundant new `RESTROOM` entry with the same
    // description; renamed dictionary.js's placeholder key to match
    // (see that file). signId/id left as `BATHROOM` — only `category`
    // and `order` changed here.
    id: 'medium_health_BATHROOM', level: 'medium', category: 'requests', signId: 'BATHROOM', title: 'Bathroom', order: 12,
    description: 'Form a ‘T’ handshape (fist with your thumb tucked between your index and middle fingers) and shake it gently side to side.',
    tips: [
      'Thumb pokes out between index and middle finger',
      'Small, quick side-to-side shake',
      'Also commonly used for ‘restroom’/‘toilet’',
    ],
    imageUrl: '../assets/images/medium/health/bathroom.png', videoUrl: '../assets/videos/medium/health/bathroom.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_health_BRUSH_TEETH', level: 'medium', category: 'health', signId: 'BRUSH TEETH', title: 'Brush Teeth', order: 4,
    description: 'Hold your index finger in front of your teeth and brush it back and forth, like brushing your teeth.',
    tips: [
      'Only the index finger is extended',
      'Quick back-and-forth motion',
      'Keep it right in front of the teeth/mouth',
    ],
    imageUrl: '../assets/images/medium/health/brush_teeth.png', videoUrl: '../assets/videos/medium/health/brush_teeth.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_health_SLEEP', level: 'medium', category: 'health', signId: 'SLEEP', title: 'Sleep', order: 5,
    description: 'Hold your spread-out hand in front of your face, then draw it down and close it near your chin, closing your eyes as your hand moves down.',
    tips: [
      'Fingers start spread, then close together',
      'Close your eyes as the hand comes down',
      'One smooth downward motion',
    ],
    imageUrl: '../assets/images/medium/health/sleep.png', videoUrl: '../assets/videos/medium/health/sleep.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_health_NICE', level: 'medium', category: 'health', signId: 'NICE/CLEAN', title: 'Nice / Clean', order: 6,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant flat hand across the palm from base to fingertips, as if wiping it clean.',
    tips: [
      'Base hand stays flat and still',
      'One smooth sliding motion, base to fingertips',
      'Also commonly used to mean ‘nice’',
    ],
    imageUrl: '../assets/images/medium/health/nice.png', videoUrl: '../assets/videos/medium/health/nice.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · FEELINGS ──
  {
    id: 'medium_feelings_HAPPY', level: 'medium', category: 'feelings', signId: 'HAPPY', title: 'Happy', order: 1,
    description: 'Brush your flat hand up your chest, near your heart, in two small upward motions.',
    tips: [
      'Motion is upward, brushing against the chest',
      'Repeat twice',
      'A genuine smile reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/happy.png', videoUrl: '../assets/videos/medium/feelings/happy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_ANGRY', level: 'medium', category: 'feelings', signId: 'ANGRY', title: 'Angry', order: 2,
    description: 'Hold a clawed hand (bent, tense fingers) in front of your stomach and pull it up and outward sharply.',
    tips: [
      'Fingers are bent and tense, not relaxed',
      'One sharp upward-outward pull',
      'A tense facial expression matches the sign',
    ],
    imageUrl: '../assets/images/medium/feelings/angry.png', videoUrl: '../assets/videos/medium/feelings/angry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_SAD', level: 'medium', category: 'feelings', signId: 'SAD', title: 'Sad', order: 3,
    description: 'Hold both open hands in front of your face, palms facing you, then slowly drop them down, letting your fingers droop and your expression fall.',
    tips: [
      'Both hands move together, slowly',
      'Fingers droop as the hands lower',
      'Facial expression should look genuinely down',
    ],
    imageUrl: '../assets/images/medium/feelings/sad.png', videoUrl: '../assets/videos/medium/feelings/sad.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_SORRY', level: 'medium', category: 'essentials_polite_expressions', signId: 'SORRY', title: 'Sorry', order: 4,
    description: 'Make a fist and rub it in a circular motion over the center of your chest.',
    tips: [
      'Hand is a closed fist',
      'Circular motion, not side to side',
      'Keep it centered over the chest',
    ],
    imageUrl: '../assets/images/medium/feelings/sorry.png', videoUrl: '../assets/videos/medium/feelings/sorry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_CRY', level: 'medium', category: 'feelings', signId: 'CRY', title: 'Cry', order: 5,
    description: 'Hold both index fingers just below your eyes and trace them downward along your cheeks, alternating hands, like tears falling.',
    tips: [
      'Only the index fingers are extended',
      'Alternate hands going down, like falling tears',
      'Repeat a couple of times',
    ],
    imageUrl: '../assets/images/medium/feelings/cry.png', videoUrl: '../assets/videos/medium/feelings/cry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_LIKE', level: 'medium', category: 'feelings', signId: 'LIKE', title: 'Like', order: 6,
    description: 'Place your thumb and middle finger against your chest as if pinching your shirt, then pull your hand outward while opening your fingers.',
    tips: [
      'Starts pinched against the chest',
      'Pull outward while the fingers open',
      'One smooth outward motion',
    ],
    imageUrl: '../assets/images/medium/feelings/like.png', videoUrl: '../assets/videos/medium/feelings/like.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_GOOD', level: 'medium', category: 'essentials_basic_responses', signId: 'GOOD', title: 'Good', order: 7,
    // CHANGED — split out of a combined 'GOOD/BAD' entry, same fix as
    // IN/OUT and COME/GO above. Both GOOD and BAD are already
    // separately captured/trained.
    description: 'Touch your flat fingertips to your chin, then move your hand down to rest on the palm of your other hand.',
    tips: [
      'Fingertips start at the chin',
      'Hand moves down to rest on your other open palm',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/feelings/good.png', videoUrl: '../assets/videos/medium/feelings/good.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_BAD', level: 'medium', category: 'essentials_basic_responses', signId: 'BAD', title: 'Bad', order: 8,
    // CHANGED — the other half of the old combined 'GOOD/BAD' entry.
    description: 'Touch your fingertips to your chin, then flip your hand downward so the palm faces the floor.',
    tips: [
      'Both signs start the same way — fingertips to the chin',
      'BAD flips the palm down, instead of resting it on your other hand like GOOD',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/feelings/bad.png', videoUrl: '../assets/videos/medium/feelings/bad.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_LOVE', level: 'medium', category: 'feelings', signId: 'LOVE', title: 'Love', order: 9,
    description: 'Cross both fists over your chest, one on top of the other, as if hugging yourself.',
    tips: [
      'Both hands are closed fists',
      'Cross at the chest, like a hug',
      'Hold briefly once crossed',
    ],
    imageUrl: '../assets/images/medium/feelings/love.png', videoUrl: '../assets/videos/medium/feelings/love.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · REQUESTS ──
  {
    id: 'medium_requests_PLEASE', level: 'medium', category: 'essentials_polite_expressions', signId: 'PLEASE', title: 'Please', order: 1,
    description: 'Hold your flat hand on your chest and rub it in a circular motion.',
    tips: [
      'Hand stays flat against the chest',
      'Circular motion, not side to side',
      'A polite, warm facial expression helps',
    ],
    imageUrl: '../assets/images/medium/requests/please.png', videoUrl: '../assets/videos/medium/requests/please.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_EXCUSE', level: 'medium', category: 'essentials_polite_expressions', signId: 'EXCUSE', title: 'Excuse', order: 2,
    description: 'Brush the fingertips of your dominant hand across the palm of your other flat hand, from the base toward the fingertips.',
    tips: [
      'Base hand stays flat and still',
      'One smooth brushing motion',
      'Used for ‘excuse me’ in context',
    ],
    imageUrl: '../assets/images/medium/requests/excuse.png', videoUrl: '../assets/videos/medium/requests/excuse.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_THANK_YOU', level: 'medium', category: 'essentials_polite_expressions', signId: 'THANK YOU', title: 'Thank You', order: 3,
    description: 'Touch your flat fingertips to your chin, then move your hand forward and down, as if extending your thanks outward.',
    tips: [
      'Starts with fingertips at the chin',
      'Moves outward toward the other person',
      'Keep the motion smooth, not abrupt',
    ],
    imageUrl: '../assets/images/medium/requests/thank_you.png', videoUrl: '../assets/videos/medium/requests/thank_you.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_HELP', level: 'medium', category: 'requests', signId: 'HELP', title: 'Help', order: 4,
    description: 'Rest your dominant fist (thumb up) on the palm of your other flat hand, then lift both hands upward together.',
    tips: [
      'Base hand stays flat, dominant hand is a thumbs-up fist',
      'Both hands lift together',
      'One smooth upward motion',
    ],
    imageUrl: '../assets/images/medium/requests/help.png', videoUrl: '../assets/videos/medium/requests/help.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_WHO', level: 'medium', category: 'essentials_basic_responses', signId: 'WHO', title: 'Who', order: 5,
    description: 'Hold your index finger near your chin and move it in a small circle, or tap it against your lips.',
    tips: [
      'Only the index finger is extended',
      'Small, tight circular motion at the chin/lips',
      'Pair with a questioning facial expression',
    ],
    imageUrl: '../assets/images/medium/requests/who.png', videoUrl: '../assets/videos/medium/requests/who.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_WHAT', level: 'medium', category: 'essentials_basic_responses', signId: 'WHAT', title: 'What', order: 6,
    description: 'Hold both hands out in front of you, palms up, and give a small questioning shrug, or brush your index finger across the palm of your other hand.',
    tips: [
      'Palms face up in the shrug version',
      'Keep the motion small and casual',
      'Eyebrows typically furrow for WH-questions',
    ],
    imageUrl: '../assets/images/medium/requests/what.png', videoUrl: '../assets/videos/medium/requests/what.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_WHEN', level: 'medium', category: 'essentials_basic_responses', signId: 'WHEN', title: 'When', order: 7,
    description: 'Hold one index finger up and still, then circle your other index finger around it and bring it down to touch.',
    tips: [
      'One hand stays still as an anchor',
      'The other traces a small circle before landing',
      'Both hands use a ‘1’ handshape',
    ],
    imageUrl: '../assets/images/medium/requests/when.png', videoUrl: '../assets/videos/medium/requests/when.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_WHERE', level: 'medium', category: 'essentials_basic_responses', signId: 'WHERE', title: 'Where', order: 8,
    description: 'Hold your index finger up and shake it quickly from side to side.',
    tips: [
      'Only the index finger is extended',
      'Quick, small side-to-side shake',
      'Pair with a questioning facial expression',
    ],
    imageUrl: '../assets/images/medium/requests/where.png', videoUrl: '../assets/videos/medium/requests/where.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_WHY', level: 'medium', category: 'essentials_basic_responses', signId: 'WHY', title: 'Why', order: 9,
    description: 'Touch your fingertips to your forehead, then pull your hand away while changing it into a ‘Y’ handshape (thumb and pinky extended), shaking it slightly.',
    tips: [
      'Starts at the forehead',
      'Handshape changes mid-motion into ‘Y’',
      'Small shake once it pulls away',
    ],
    imageUrl: '../assets/images/medium/requests/why.png', videoUrl: '../assets/videos/medium/requests/why.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_HOW', level: 'medium', category: 'essentials_basic_responses', signId: 'HOW', title: 'How', order: 10,
    description: 'Hold both hands with bent fingers and knuckles touching in front of you, then rotate your hands outward and up so your palms face up.',
    tips: [
      'Knuckles touch at the start',
      'Rotate outward and upward together',
      'Ends with both palms facing up',
    ],
    imageUrl: '../assets/images/medium/requests/how.png', videoUrl: '../assets/videos/medium/requests/how.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_requests_STOP', level: 'medium', category: 'requests', signId: 'STOP', title: 'Stop', order: 11,
    description: 'Hold your non-dominant hand flat, palm up, and chop the edge of your dominant flat hand down onto it in one sharp motion.',
    tips: [
      'Base hand stays flat and still',
      'One sharp, decisive chopping motion',
      'Contact is the edge (pinky-side) of the dominant hand',
    ],
    imageUrl: '../assets/images/medium/requests/stop.png', videoUrl: '../assets/videos/medium/requests/stop.mp4', detectionType: 'motion',
  },
  {
    // NEW (this session) — no prior data.js content existed for this
    // signId (it was only ever a disabled dictionary.js placeholder,
    // see PIVOT_CHECKLIST.md Phase 7's "16 Essential Words" note). Not
    // the same sign as `medium_food_HAMBURGER` etc. — this is the
    // general "food/eat" sign, distinct from any specific dish.
    id: 'medium_requests_FOOD', level: 'medium', category: 'requests', signId: 'FOOD', title: 'Food', order: 12,
    description: 'Bring a flattened O handshape (fingertips and thumb pinched together) up to your mouth, tapping it against your lips two or three times.',
    tips: [
      'Fingertips and thumb pinch together into a flat O',
      'Motion is toward the mouth, like bringing food in',
      'Tap two or three times, not just once',
    ],
    imageUrl: '../assets/images/medium/requests/food.png', videoUrl: '../assets/videos/medium/requests/food.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · ESSENTIALS_GREETINGS ──
  // NEW (this session) — no prior data.js content existed for HELLO at
  // all (only a disabled dictionary.js placeholder) — see
  // PIVOT_CHECKLIST.md Phase 7. This is the category's only sign today.
  {
    id: 'medium_essentials_greetings_HELLO', level: 'medium', category: 'essentials_greetings', signId: 'HELLO', title: 'Hello', order: 1,
    description: 'Hold your dominant hand flat near your forehead, fingers together like a salute, then move it outward and slightly down, away from your head.',
    tips: [
      'Starts near the forehead/temple, like a salute',
      'Hand is flat, fingers together, palm facing out',
      'Motion arcs outward and down, away from your head',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/hello.png', videoUrl: '../assets/videos/medium/essentials_greetings/hello.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · ESSENTIALS_BASIC_RESPONSES (YES/NO — new content;
  // WHO/WHAT/WHEN/WHERE/WHY/HOW/GOOD/BAD moved here from `requests`/
  // `feelings`, see those entries above for their unchanged content) ──
  {
    // NEW (this session) — no prior data.js content existed for YES.
    id: 'medium_essentials_basic_responses_YES', level: 'medium', category: 'essentials_basic_responses', signId: 'YES', title: 'Yes', order: 1,
    description: 'Make an ‘S’ handshape (a closed fist) and nod it up and down at the wrist, like a small head nod.',
    tips: [
      'Handshape is a simple closed fist',
      'The whole fist bobs up and down from the wrist',
      'Think of it as your fist "nodding"',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/yes.png', videoUrl: '../assets/videos/medium/essentials_basic_responses/yes.mp4', detectionType: 'motion',
  },
  {
    // NEW (this session) — no prior data.js content existed for NO.
    id: 'medium_essentials_basic_responses_NO', level: 'medium', category: 'essentials_basic_responses', signId: 'NO', title: 'No', order: 2,
    description: 'Bring your thumb, index, and middle fingers together in front of you, opening and closing them once like a small beak.',
    tips: [
      'Thumb + index + middle finger, the rest stay closed',
      'One quick open-close snap, like a beak',
      'Not the same handshape as YES — no fist involved',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/no.png', videoUrl: '../assets/videos/medium/essentials_basic_responses/no.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · AMOUNTS ──
  {
    id: 'medium_amounts_BIG', level: 'medium', category: 'amounts', signId: 'BIG', title: 'Big', order: 1,
    description: 'Hold both hands facing each other in curved ‘L’ shapes close together, then move them apart to show something large.',
    tips: [
      'Both hands move outward together',
      'Distance apart can scale with what you\'re describing',
      'Keep the curved handshape throughout',
    ],
    imageUrl: '../assets/images/medium/amounts/big.png', videoUrl: '../assets/videos/medium/amounts/big.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_amounts_TALL', level: 'medium', category: 'amounts', signId: 'TALL', title: 'Tall', order: 2,
    description: 'Hold one index finger up as a marker, then move your other extended index finger upward alongside it to show height.',
    tips: [
      'One hand acts as a fixed reference point',
      'The other hand rises past it',
      'Only the index fingers are extended',
    ],
    imageUrl: '../assets/images/medium/amounts/tall.png', videoUrl: '../assets/videos/medium/amounts/tall.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_amounts_FULL', level: 'medium', category: 'amounts', signId: 'FULL', title: 'Full', order: 3,
    description: 'Hold your non-dominant hand in a fist. Sweep the edge of your dominant flat hand across the top of it, like leveling off a full container.',
    tips: [
      'Base hand is a closed fist',
      'One smooth sweeping motion across the top',
      'Like scraping a measuring cup level',
    ],
    imageUrl: '../assets/images/medium/amounts/full.png', videoUrl: '../assets/videos/medium/amounts/full.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_amounts_MORE', level: 'medium', category: 'amounts', signId: 'MORE', title: 'More', order: 4,
    description: 'Bring the fingertips of both hands together, bunched into flat ‘O’ shapes, and tap them together twice.',
    tips: [
      'Both hands bunch into the same shape',
      'Fingertips meet in the middle',
      'Two clear taps',
    ],
    imageUrl: '../assets/images/medium/amounts/more.png', videoUrl: '../assets/videos/medium/amounts/more.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · COLORS ──
  {
    id: 'medium_colors_BLUE', level: 'medium', category: 'colors', signId: 'BLUE', title: 'Blue', order: 1,
    description: 'Form a ‘B’ handshape and shake your hand slightly in place.',
    tips: [
      'Handshape is ‘B’ — fingers flat and together',
      'Small shaking motion, wrist only',
      'Held at chest/shoulder height',
    ],
    imageUrl: '../assets/images/medium/colors/blue.png', videoUrl: '../assets/videos/medium/colors/blue.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_GREEN', level: 'medium', category: 'colors', signId: 'GREEN', title: 'Green', order: 2,
    description: 'Form a ‘G’ handshape and shake your hand slightly in place.',
    tips: [
      'Handshape is ‘G’ — index and thumb pointing out',
      'Small shaking motion, wrist only',
      'Held at chest/shoulder height',
    ],
    imageUrl: '../assets/images/medium/colors/green.png', videoUrl: '../assets/videos/medium/colors/green.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_YELLOW', level: 'medium', category: 'colors', signId: 'YELLOW', title: 'Yellow', order: 3,
    description: 'Form a ‘Y’ handshape (thumb and pinky extended) and shake your hand slightly in place.',
    tips: [
      'Handshape is ‘Y’ — thumb and pinky out, other fingers curled',
      'Small shaking motion, wrist only',
      'Held at chest/shoulder height',
    ],
    imageUrl: '../assets/images/medium/colors/yellow.png', videoUrl: '../assets/videos/medium/colors/yellow.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_RED', level: 'medium', category: 'colors', signId: 'RED', title: 'Red', order: 4,
    description: 'Brush your index finger down across your lips, once or twice.',
    tips: [
      'Only the index finger is extended',
      'Short downward brushing motion',
      'Starts at the lips',
    ],
    imageUrl: '../assets/images/medium/colors/red.png', videoUrl: '../assets/videos/medium/colors/red.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_BROWN', level: 'medium', category: 'colors', signId: 'BROWN', title: 'Brown', order: 5,
    description: 'Form a ‘B’ handshape and slide it down along the side of your cheek.',
    tips: [
      'Handshape is ‘B’ — fingers flat and together',
      'One smooth downward slide',
      'Contact stays along the cheek',
    ],
    imageUrl: '../assets/images/medium/colors/brown.png', videoUrl: '../assets/videos/medium/colors/brown.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_ORANGE', level: 'medium', category: 'colors', signId: 'ORANGE', title: 'Orange', order: 6,
    description: 'Hold a loose ‘C’ handshape near your chin and squeeze it into a fist repeatedly.',
    tips: [
      'Starts as a loose ‘C’ near the chin',
      'Repeated squeezing motion, like squeezing fruit',
      'Keep it close to the chin/mouth',
    ],
    imageUrl: '../assets/images/medium/colors/orange.png', videoUrl: '../assets/videos/medium/colors/orange.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_GOLD', level: 'medium', category: 'colors', signId: 'GOLD', title: 'Gold', order: 7,
    description: 'Touch a ‘G’ handshape near your earlobe and twist your wrist slightly, as if touching a gold earring.',
    tips: [
      'Handshape is ‘G’',
      'Contact point is the earlobe',
      'Small twisting motion',
    ],
    imageUrl: '../assets/images/medium/colors/gold.png', videoUrl: '../assets/videos/medium/colors/gold.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_SILVER', level: 'medium', category: 'colors', signId: 'SILVER', title: 'Silver', order: 8,
    description: 'Many signers fingerspell S-I-L-V-E-R, or touch an ‘S’ handshape near your earlobe with a slight twist, similar to the sign for GOLD.',
    tips: [
      'Fingerspelling is a common, accepted option',
      'If signing the concept, keep it close to the ear, like GOLD',
      'Small twisting motion for the sign version',
    ],
    imageUrl: '../assets/images/medium/colors/silver.png', videoUrl: '../assets/videos/medium/colors/silver.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · MONEY ──
  {
    id: 'medium_money_DOLLARS', level: 'medium', category: 'money', signId: 'DOLLARS', title: 'Dollars', order: 1,
    description: 'Hold your non-dominant hand flat, palm up. Grasp its fingertips with your dominant hand and pull away with a small twist, as if pulling a dollar bill from your palm.',
    tips: [
      'Base hand stays flat, palm up',
      'Dominant hand grasps and pulls with a twist',
      'One smooth motion',
    ],
    imageUrl: '../assets/images/medium/money/dollars.png', videoUrl: '../assets/videos/medium/money/dollars.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_money_CENTS', level: 'medium', category: 'money', signId: 'CENTS', title: 'Cents', order: 2,
    description: 'Touch your index finger to your temple, then move it forward while shaping the numbers to represent the amount of cents.',
    tips: [
      'Starts at the temple',
      'Moves forward and away from the head',
      'Followed by the relevant number handshape for a specific amount',
    ],
    imageUrl: '../assets/images/medium/money/cents.png', videoUrl: '../assets/videos/medium/money/cents.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_money_COST', level: 'medium', category: 'money', signId: 'COST', title: 'Cost', order: 3,
    description: 'Hold your non-dominant hand flat, palm up. Brush your dominant index finger down across the palm in a short striking motion.',
    tips: [
      'Base hand stays flat and still',
      'Short, quick downward brush',
      'Only the index finger is extended on the dominant hand',
    ],
    imageUrl: '../assets/images/medium/money/cost.png', videoUrl: '../assets/videos/medium/money/cost.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · ANIMALS ──
  {
    id: 'medium_animals_CAT', level: 'medium', category: 'animals', signId: 'CAT', title: 'Cat', order: 1,
    description: 'Pinch your thumb and index finger near the corner of your mouth and pull outward twice, like tracing a cat\'s whiskers.',
    tips: [
      'Pinch stays near the corner of the mouth',
      'Pull outward, away from the face',
      'Repeat on one or both sides',
    ],
    imageUrl: '../assets/images/medium/animals/cat.png', videoUrl: '../assets/videos/medium/animals/cat.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_DOG', level: 'medium', category: 'animals', signId: 'DOG', title: 'Dog', order: 2,
    description: 'Pat your leg or snap your fingers a couple of times, as if calling a dog to come.',
    tips: [
      'Motion should look like calling a pet over',
      'Can be signed at the leg or with a finger snap',
      'Repeat a couple of times',
    ],
    imageUrl: '../assets/images/medium/animals/dog.png', videoUrl: '../assets/videos/medium/animals/dog.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_BIRD', level: 'medium', category: 'animals', signId: 'BIRD', title: 'Bird', order: 3,
    description: 'Hold your thumb and index finger together in front of your mouth and open and close them like a beak.',
    tips: [
      'Handshape is thumb and index pinching together',
      'Opens and closes like a beak',
      'Held right in front of the mouth',
    ],
    imageUrl: '../assets/images/medium/animals/bird.png', videoUrl: '../assets/videos/medium/animals/bird.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_HORSE', level: 'medium', category: 'animals', signId: 'HORSE', title: 'Horse', order: 4,
    description: 'Hold a ‘U’ handshape (index and middle fingers extended) at your temple and bend your fingers down and up twice, like a horse\'s ears flicking.',
    tips: [
      'Handshape is ‘U’ — two fingers together, extended',
      'Contact point is the temple',
      'Bending motion, like flicking ears',
    ],
    imageUrl: '../assets/images/medium/animals/horse.png', videoUrl: '../assets/videos/medium/animals/horse.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_COW', level: 'medium', category: 'animals', signId: 'COW', title: 'Cow', order: 5,
    description: 'Hold your thumb at your temple with your fingers extended outward like horns, and twist your wrist slightly.',
    tips: [
      'Thumb anchors at the temple',
      'Fingers spread out like horns',
      'Small twisting motion',
    ],
    imageUrl: '../assets/images/medium/animals/cow.png', videoUrl: '../assets/videos/medium/animals/cow.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_SHEEP', level: 'medium', category: 'animals', signId: 'SHEEP', title: 'Sheep', order: 6,
    description: 'Use the edge of your dominant hand to stroke up along the inside of your other forearm twice, like shearing wool.',
    tips: [
      'Motion is along the inside of the forearm',
      'Repeat the stroke twice',
      'Edge of the hand does the ‘shearing’',
    ],
    imageUrl: '../assets/images/medium/animals/sheep.png', videoUrl: '../assets/videos/medium/animals/sheep.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_PIG', level: 'medium', category: 'animals', signId: 'PIG', title: 'Pig', order: 7,
    description: 'Rest the back of your hand under your chin with fingers pointing forward, and flap your fingers down a couple of times, like a pig\'s snout.',
    tips: [
      'Back of the hand rests under the chin',
      'Fingers flap down, not the whole hand',
      'Repeat a couple of times',
    ],
    imageUrl: '../assets/images/medium/animals/pig.png', videoUrl: '../assets/videos/medium/animals/pig.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_BUG', level: 'medium', category: 'animals', signId: 'BUG', title: 'Bug', order: 8,
    description: 'Touch your thumb to the tip of your nose and bend your index and middle fingers, twitching them slightly, like an insect\'s antennae.',
    tips: [
      'Thumb anchors at the nose',
      'Index and middle fingers stay bent, like antennae',
      'Small twitching motion',
    ],
    imageUrl: '../assets/images/medium/animals/bug.png', videoUrl: '../assets/videos/medium/animals/bug.mp4', detectionType: 'motion',
  },

  /* ── INTERMEDIATE · PHRASES (auto-generated content) ── */

  // ── INTERMEDIATE · GREETINGS_INTRO ──
  {
    id: 'intermediate_greetings_intro_1_good_morning', level: 'intermediate', category: 'greetings_intro', signId: 'GOOD MORNING', title: 'Good Morning', order: 1,
    description: 'This means “GOOD MORNING.” In ASL, sign the concepts in this order: GOOD-MORNING (flat hand rises from chin, like FINE, then meets the other arm like MORNING’s sunrise motion). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/good_morning.png', videoUrl: '../assets/videos/intermediate/greetings_intro/good_morning.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_greetings_intro_2_good_afternoon', level: 'intermediate', category: 'greetings_intro', signId: 'GOOD AFTERNOON', title: 'Good Afternoon', order: 2,
    description: 'This means “GOOD AFTERNOON.” In ASL, sign the concepts in this order: GOOD-AFTERNOON (dominant flat hand rests on the back of the other arm, like the sun partway across the sky). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/good_afternoon.png', videoUrl: '../assets/videos/intermediate/greetings_intro/good_afternoon.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_greetings_intro_3_good_evening', level: 'intermediate', category: 'greetings_intro', signId: 'GOOD EVENING', title: 'Good Evening', order: 3,
    description: 'This means “GOOD EVENING.” In ASL, sign the concepts in this order: GOOD-EVENING (similar to NIGHT, dominant hand dips down over the other arm). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/good_evening.png', videoUrl: '../assets/videos/intermediate/greetings_intro/good_evening.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_greetings_intro_4_nice_to_meet_you', level: 'intermediate', category: 'greetings_intro', signId: 'NICE TO MEET YOU', title: 'Nice to Meet You', order: 4,
    description: 'This means “NICE TO MEET YOU.” In ASL, sign the concepts in this order: NICE MEET-YOU (MEET brings two ‘1’ handshapes together). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/nice_to_meet_you.png', videoUrl: '../assets/videos/intermediate/greetings_intro/nice_to_meet_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_greetings_intro_5_what_s_your_name', level: 'intermediate', category: 'greetings_intro', signId: 'WHAT\'S YOUR NAME?', title: 'What’s Your Name?', order: 5,
    description: 'This means “WHAT\'S YOUR NAME.” In ASL, sign the concepts in this order: YOUR NAME WHAT (WH-word goes at the end, with furrowed brows through the whole question). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'In ASL, WH-questions often place the question word at the END of the sentence, not the start',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/what_s_your_name.png', videoUrl: '../assets/videos/intermediate/greetings_intro/what_s_your_name.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_greetings_intro_6_my_name_is', level: 'intermediate', category: 'greetings_intro', signId: 'MY NAME IS ___', title: 'My Name Is ___', order: 6,
    description: 'This means “MY NAME IS ___.” In ASL, sign the concepts in this order: MY NAME [fingerspell your name]. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Names without a common ASL sign are fingerspelled letter by letter',
    ],
    imageUrl: '../assets/images/intermediate/greetings_intro/my_name_is.png', videoUrl: '../assets/videos/intermediate/greetings_intro/my_name_is.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · BASIC_RESPONSES ──
  {
    id: 'intermediate_basic_responses_1_i_am_fine', level: 'intermediate', category: 'basic_responses', signId: 'I AM FINE', title: 'I Am Fine', order: 1,
    description: 'This means “I AM FINE.” In ASL, sign the concepts in this order: ME FINE. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/basic_responses/i_am_fine.png', videoUrl: '../assets/videos/intermediate/basic_responses/i_am_fine.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_basic_responses_2_i_am_good', level: 'intermediate', category: 'basic_responses', signId: 'I AM GOOD', title: 'I Am Good', order: 2,
    description: 'This means “I AM GOOD.” In ASL, sign the concepts in this order: ME GOOD. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/basic_responses/i_am_good.png', videoUrl: '../assets/videos/intermediate/basic_responses/i_am_good.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_basic_responses_3_not_bad', level: 'intermediate', category: 'basic_responses', signId: 'NOT BAD', title: 'Not Bad', order: 3,
    description: 'This means “NOT BAD.” In ASL, sign the concepts in this order: NOT BAD (headshake over BAD) or the single sign SO-SO (rocking flat hand). Use negation grammar (see tips).',
    tips: [
      'Negation is shown with a side-to-side head shake held over the negated sign(s), not a separate \'not\' sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/basic_responses/not_bad.png', videoUrl: '../assets/videos/intermediate/basic_responses/not_bad.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_basic_responses_4_maybe_later', level: 'intermediate', category: 'basic_responses', signId: 'MAYBE LATER', title: 'Maybe Later', order: 4,
    description: 'This means “MAYBE LATER.” In ASL, sign the concepts in this order: MAYBE LATER (MAYBE alternates open palms up-down; LATER is an ‘L’ hand that swings forward). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/basic_responses/maybe_later.png', videoUrl: '../assets/videos/intermediate/basic_responses/maybe_later.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_basic_responses_5_i_don_t_know', level: 'intermediate', category: 'basic_responses', signId: 'I DON\'T KNOW', title: 'I Don’t Know', order: 5,
    description: 'This means “I DON\'T KNOW.” In ASL, sign the concepts in this order: ME KNOW-NOT (flick fingers off the forehead, paired with a headshake or a shrug). Use negation grammar (see tips).',
    tips: [
      'Negation is shown with a side-to-side head shake held over the negated sign(s), not a separate \'not\' sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/basic_responses/i_don_t_know.png', videoUrl: '../assets/videos/intermediate/basic_responses/i_don_t_know.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · FAMILY_PHRASES ──
  {
    id: 'intermediate_family_phrases_1_my_mother', level: 'intermediate', category: 'family_phrases', signId: 'MY MOTHER', title: 'My Mother', order: 1,
    description: 'This means “MY MOTHER.” In ASL, sign the concepts in this order: MY MOTHER (5-hand, thumb taps chin). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_phrases/my_mother.png', videoUrl: '../assets/videos/intermediate/family_phrases/my_mother.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_phrases_2_my_father', level: 'intermediate', category: 'family_phrases', signId: 'MY FATHER', title: 'My Father', order: 2,
    description: 'This means “MY FATHER.” In ASL, sign the concepts in this order: MY FATHER (5-hand, thumb taps forehead). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_phrases/my_father.png', videoUrl: '../assets/videos/intermediate/family_phrases/my_father.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_phrases_3_my_brother', level: 'intermediate', category: 'family_phrases', signId: 'MY BROTHER', title: 'My Brother', order: 3,
    description: 'This means “MY BROTHER.” In ASL, sign the concepts in this order: MY BROTHER (BOY handshape at forehead, then both index fingers meet). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_phrases/my_brother.png', videoUrl: '../assets/videos/intermediate/family_phrases/my_brother.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_phrases_4_my_sister', level: 'intermediate', category: 'family_phrases', signId: 'MY SISTER', title: 'My Sister', order: 4,
    description: 'This means “MY SISTER.” In ASL, sign the concepts in this order: MY SISTER (GIRL handshape at jaw, then both index fingers meet). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_phrases/my_sister.png', videoUrl: '../assets/videos/intermediate/family_phrases/my_sister.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_phrases_5_my_friend', level: 'intermediate', category: 'family_phrases', signId: 'MY FRIEND', title: 'My Friend', order: 5,
    description: 'This means “MY FRIEND.” In ASL, sign the concepts in this order: MY FRIEND (hooked index fingers link together, then link the other way). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_phrases/my_friend.png', videoUrl: '../assets/videos/intermediate/family_phrases/my_friend.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · DAILY_NEEDS ──
  {
    id: 'intermediate_daily_needs_1_i_am_hungry', level: 'intermediate', category: 'daily_needs', signId: 'I AM HUNGRY', title: 'I Am Hungry', order: 1,
    description: 'This means “I AM HUNGRY.” In ASL, sign the concepts in this order: ME HUNGRY (‘C’ hand moves down the chest). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_am_hungry.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_am_hungry.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_needs_2_i_am_thirsty', level: 'intermediate', category: 'daily_needs', signId: 'I AM THIRSTY', title: 'I Am Thirsty', order: 2,
    description: 'This means “I AM THIRSTY.” In ASL, sign the concepts in this order: ME THIRSTY (index finger traces down the throat). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_am_thirsty.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_am_thirsty.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_needs_3_i_am_tired', level: 'intermediate', category: 'daily_needs', signId: 'I AM TIRED', title: 'I Am Tired', order: 3,
    description: 'This means “I AM TIRED.” In ASL, sign the concepts in this order: ME TIRED (bent hands drop down from the chest). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_am_tired.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_am_tired.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_needs_4_i_need_help', level: 'intermediate', category: 'daily_needs', signId: 'I NEED HELP', title: 'I Need Help', order: 4,
    description: 'This means “I NEED HELP.” In ASL, sign the concepts in this order: ME NEED HELP (NEED is a bent ‘X’ hand pressing down; HELP lifts a thumbs-up fist on the other palm). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_need_help.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_need_help.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_needs_5_i_need_water', level: 'intermediate', category: 'daily_needs', signId: 'I NEED WATER', title: 'I Need Water', order: 5,
    description: 'This means “I NEED WATER.” In ASL, sign the concepts in this order: ME NEED WATER (‘W’ hand taps the chin). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_need_water.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_need_water.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_needs_6_i_need_food', level: 'intermediate', category: 'daily_needs', signId: 'I NEED FOOD', title: 'I Need Food', order: 6,
    description: 'This means “I NEED FOOD.” In ASL, sign the concepts in this order: ME NEED FOOD (bunched fingers tap toward the mouth, like eating). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_needs/i_need_food.png', videoUrl: '../assets/videos/intermediate/daily_needs/i_need_food.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · ASKING_QUESTIONS ──
  {
    id: 'intermediate_asking_questions_1_how_are_you', level: 'intermediate', category: 'asking_questions', signId: 'HOW ARE YOU?', title: 'How Are You?', order: 1,
    description: 'This means “HOW ARE YOU.” In ASL, sign the concepts in this order: HOW YOU (both bent hands rotate palms-up, brows furrowed). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/how_are_you.png', videoUrl: '../assets/videos/intermediate/asking_questions/how_are_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_2_what_s_up', level: 'intermediate', category: 'asking_questions', signId: 'WHAT\'S UP?', title: 'What’s Up?', order: 2,
    description: 'This means “WHAT\'S UP.” In ASL, sign the concepts in this order: WHAT-UP / WRONG (index finger and thumb brush up the chest, with a curious expression). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/what_s_up.png', videoUrl: '../assets/videos/intermediate/asking_questions/what_s_up.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_3_how_old_are_you', level: 'intermediate', category: 'asking_questions', signId: 'HOW OLD ARE YOU?', title: 'How Old Are You?', order: 3,
    description: 'This means “HOW OLD ARE YOU.” In ASL, sign the concepts in this order: YOU OLD HOW-MANY (OLD is a fist pulling down from the chin; the number question goes at the end). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/how_old_are_you.png', videoUrl: '../assets/videos/intermediate/asking_questions/how_old_are_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_4_where_do_you_live', level: 'intermediate', category: 'asking_questions', signId: 'WHERE DO YOU LIVE?', title: 'Where Do You Live?', order: 4,
    description: 'This means “WHERE DO YOU LIVE.” In ASL, sign the concepts in this order: YOU LIVE WHERE (LIVE is two ‘L’ hands moving up the torso). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/where_do_you_live.png', videoUrl: '../assets/videos/intermediate/asking_questions/where_do_you_live.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_5_what_time', level: 'intermediate', category: 'asking_questions', signId: 'WHAT TIME?', title: 'What Time?', order: 5,
    description: 'This means “WHAT TIME.” In ASL, sign the concepts in this order: TIME WHAT (tap the wrist where a watch would sit, then ask WHAT). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/what_time.png', videoUrl: '../assets/videos/intermediate/asking_questions/what_time.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_6_can_you_help', level: 'intermediate', category: 'asking_questions', signId: 'CAN YOU HELP?', title: 'Can You Help?', order: 6,
    description: 'This means “CAN YOU HELP.” In ASL, sign the concepts in this order: YOU CAN HELP YOU (CAN is two ‘S’ hands dropping down like flexing strength; eyebrows raise for the yes/no question). Use a yes/no-question expression (see tips).',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/can_you_help.png', videoUrl: '../assets/videos/intermediate/asking_questions/can_you_help.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_questions_7_can_i_go', level: 'intermediate', category: 'asking_questions', signId: 'CAN I GO?', title: 'Can I Go?', order: 7,
    description: 'This means “CAN I GO.” In ASL, sign the concepts in this order: ME CAN GO-Q (eyebrows raised through the whole question). Use a yes/no-question expression (see tips).',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_questions/can_i_go.png', videoUrl: '../assets/videos/intermediate/asking_questions/can_i_go.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · POLITE_EXPRESSIONS ──
  {
    id: 'intermediate_polite_expressions_1_thank_you', level: 'intermediate', category: 'polite_expressions', signId: 'THANK YOU', title: 'Thank You', order: 1,
    description: 'This means “THANK YOU.” In ASL, sign the concepts in this order: THANK-YOU (flat hand moves from the chin outward). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/polite_expressions/thank_you.png', videoUrl: '../assets/videos/intermediate/polite_expressions/thank_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_polite_expressions_2_you_re_welcome', level: 'intermediate', category: 'polite_expressions', signId: 'YOU\'RE WELCOME', title: 'You’re Welcome', order: 2,
    description: 'This means “YOU\'RE WELCOME.” In ASL, sign the concepts in this order: WELCOME (open hand sweeps in, like inviting someone) or simply repeat PLEASE/THANK-YOU back. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/polite_expressions/you_re_welcome.png', videoUrl: '../assets/videos/intermediate/polite_expressions/you_re_welcome.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_polite_expressions_3_excuse_me', level: 'intermediate', category: 'polite_expressions', signId: 'EXCUSE ME', title: 'Excuse Me', order: 3,
    description: 'This means “EXCUSE ME.” In ASL, sign the concepts in this order: EXCUSE-ME (fingertips brush across the other palm). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/polite_expressions/excuse_me.png', videoUrl: '../assets/videos/intermediate/polite_expressions/excuse_me.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_polite_expressions_4_have_a_nice_day', level: 'intermediate', category: 'polite_expressions', signId: 'HAVE A NICE DAY', title: 'Have a Nice Day', order: 4,
    description: 'This means “HAVE A NICE DAY.” In ASL, sign the concepts in this order: NICE DAY (NICE slides across the palm; DAY sweeps the arm down like the sun’s arc). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/polite_expressions/have_a_nice_day.png', videoUrl: '../assets/videos/intermediate/polite_expressions/have_a_nice_day.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_polite_expressions_5_see_you_later', level: 'intermediate', category: 'polite_expressions', signId: 'SEE YOU LATER', title: 'See You Later', order: 5,
    description: 'This means “SEE YOU LATER.” In ASL, sign the concepts in this order: SEE-YOU LATER (V-hand points to eyes then to the person; LATER swings an ‘L’ hand forward). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/polite_expressions/see_you_later.png', videoUrl: '../assets/videos/intermediate/polite_expressions/see_you_later.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · AFFECTION_FEELINGS ──
  {
    id: 'intermediate_affection_feelings_1_i_love_you', level: 'intermediate', category: 'affection_feelings', signId: 'I LOVE YOU', title: 'I Love You', order: 1,
    description: 'This means “I LOVE YOU.” In ASL, sign the concepts in this order: Often shown with the single ILY handshape (thumb, index, and pinky extended) held up, instead of signing each word separately. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_love_you.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_love_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_2_i_like_you', level: 'intermediate', category: 'affection_feelings', signId: 'I LIKE YOU', title: 'I Like You', order: 2,
    description: 'This means “I LIKE YOU.” In ASL, sign the concepts in this order: ME LIKE YOU (thumb and middle finger pull outward from the chest). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_like_you.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_like_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_3_i_miss_you', level: 'intermediate', category: 'affection_feelings', signId: 'I MISS YOU', title: 'I Miss You', order: 3,
    description: 'This means “I MISS YOU.” In ASL, sign the concepts in this order: ME MISS YOU (middle finger brushes past the lips, tender expression). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_miss_you.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_miss_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_4_happy_birthday', level: 'intermediate', category: 'affection_feelings', signId: 'HAPPY BIRTHDAY', title: 'Happy Birthday', order: 4,
    description: 'This means “HAPPY BIRTHDAY.” In ASL, sign the concepts in this order: HAPPY BIRTHDAY (HAPPY brushes up the chest; BIRTHDAY combines BORN and DAY). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/happy_birthday.png', videoUrl: '../assets/videos/intermediate/affection_feelings/happy_birthday.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_5_i_don_t_like_it', level: 'intermediate', category: 'affection_feelings', signId: 'I DON\'T LIKE IT', title: 'I Don’t Like It', order: 5,
    description: 'This means “I DON\'T LIKE IT.” In ASL, sign the concepts in this order: ME LIKE-NOT IT (headshake through LIKE). Use negation grammar (see tips).',
    tips: [
      'Negation is shown with a side-to-side head shake held over the negated sign(s), not a separate \'not\' sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_don_t_like_it.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_don_t_like_it.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_6_i_don_t_like_you', level: 'intermediate', category: 'affection_feelings', signId: 'I DON\'T LIKE YOU', title: 'I Don’t Like You', order: 6,
    description: 'This means “I DON\'T LIKE YOU.” In ASL, sign the concepts in this order: ME LIKE-NOT YOU (headshake through LIKE). Use negation grammar (see tips).',
    tips: [
      'Negation is shown with a side-to-side head shake held over the negated sign(s), not a separate \'not\' sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_don_t_like_you.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_don_t_like_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_7_i_hate_it', level: 'intermediate', category: 'affection_feelings', signId: 'I HATE IT', title: 'I Hate It', order: 7,
    description: 'This means “I HATE IT.” In ASL, sign the concepts in this order: ME HATE IT (both ‘8’ hands flick outward from a middle-finger-and-thumb snap, with a disgusted expression). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/i_hate_it.png', videoUrl: '../assets/videos/intermediate/affection_feelings/i_hate_it.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_affection_feelings_8_leave_me_alone', level: 'intermediate', category: 'affection_feelings', signId: 'LEAVE ME ALONE', title: 'Leave Me Alone', order: 8,
    description: 'This means “LEAVE ME ALONE.” In ASL, sign the concepts in this order: ME ALONE (‘A’ hand circles in the air) — often paired with a firm expression and a stop-motion palm-out gesture. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/affection_feelings/leave_me_alone.png', videoUrl: '../assets/videos/intermediate/affection_feelings/leave_me_alone.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · DESCRIBING_THINGS ──
  {
    id: 'intermediate_describing_things_1_red_car', level: 'intermediate', category: 'describing_things', signId: 'RED CAR', title: 'Red Car', order: 1,
    description: 'This means “RED CAR.” In ASL, sign the concepts in this order: CAR RED (ASL usually puts the noun before the describing color). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/red_car.png', videoUrl: '../assets/videos/intermediate/describing_things/red_car.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_2_blue_shirt', level: 'intermediate', category: 'describing_things', signId: 'BLUE SHIRT', title: 'Blue Shirt', order: 2,
    description: 'This means “BLUE SHIRT.” In ASL, sign the concepts in this order: SHIRT BLUE. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/blue_shirt.png', videoUrl: '../assets/videos/intermediate/describing_things/blue_shirt.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_3_green_tree', level: 'intermediate', category: 'describing_things', signId: 'GREEN TREE', title: 'Green Tree', order: 3,
    description: 'This means “GREEN TREE.” In ASL, sign the concepts in this order: TREE GREEN. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/green_tree.png', videoUrl: '../assets/videos/intermediate/describing_things/green_tree.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_4_big_house', level: 'intermediate', category: 'describing_things', signId: 'BIG HOUSE', title: 'Big House', order: 4,
    description: 'This means “BIG HOUSE.” In ASL, sign the concepts in this order: HOUSE BIG. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/big_house.png', videoUrl: '../assets/videos/intermediate/describing_things/big_house.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_5_small_dog', level: 'intermediate', category: 'describing_things', signId: 'SMALL DOG', title: 'Small Dog', order: 5,
    description: 'This means “SMALL DOG.” In ASL, sign the concepts in this order: DOG SMALL. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/small_dog.png', videoUrl: '../assets/videos/intermediate/describing_things/small_dog.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_6_good_job', level: 'intermediate', category: 'describing_things', signId: 'GOOD JOB', title: 'Good Job', order: 6,
    description: 'This means “GOOD JOB.” In ASL, sign the concepts in this order: GOOD JOB / GOOD WORK, often with a thumbs-up-style GOOD and an approving expression. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/good_job.png', videoUrl: '../assets/videos/intermediate/describing_things/good_job.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_describing_things_7_bad_day', level: 'intermediate', category: 'describing_things', signId: 'BAD DAY', title: 'Bad Day', order: 7,
    description: 'This means “BAD DAY.” In ASL, sign the concepts in this order: DAY BAD (noun before description again, with a downturned expression). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/describing_things/bad_day.png', videoUrl: '../assets/videos/intermediate/describing_things/bad_day.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · SELF_INTRODUCTION ──
  {
    id: 'intermediate_self_introduction_1_hello_my_name_is', level: 'intermediate', category: 'self_introduction', signId: 'HELLO, MY NAME IS ___.', title: 'Hello, My Name Is ___.', order: 1,
    description: 'This means “HELLO, MY NAME IS ___.” In ASL, sign the concepts in this order: HELLO MY NAME [fingerspell your name]. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Names without a common ASL sign are fingerspelled letter by letter',
    ],
    imageUrl: '../assets/images/intermediate/self_introduction/hello_my_name_is.png', videoUrl: '../assets/videos/intermediate/self_introduction/hello_my_name_is.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_self_introduction_2_nice_to_meet_you', level: 'intermediate', category: 'self_introduction', signId: 'NICE TO MEET YOU.', title: 'Nice to Meet You.', order: 2,
    description: 'This means “NICE TO MEET YOU.” In ASL, sign the concepts in this order: NICE MEET-YOU. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/self_introduction/nice_to_meet_you.png', videoUrl: '../assets/videos/intermediate/self_introduction/nice_to_meet_you.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_self_introduction_3_i_am_years_old', level: 'intermediate', category: 'self_introduction', signId: 'I AM ___ YEARS OLD.', title: 'I Am ___ Years Old.', order: 3,
    description: 'This means “I AM ___ YEARS OLD.” In ASL, sign the concepts in this order: ME [number] YEARS-OLD (the number handshape usually touches the chin, combining with OLD). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/self_introduction/i_am_years_old.png', videoUrl: '../assets/videos/intermediate/self_introduction/i_am_years_old.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_self_introduction_4_i_live_in', level: 'intermediate', category: 'self_introduction', signId: 'I LIVE IN ___.', title: 'I Live In ___.', order: 4,
    description: 'This means “I LIVE IN ___.” In ASL, sign the concepts in this order: ME LIVE [place name/fingerspell]. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/self_introduction/i_live_in.png', videoUrl: '../assets/videos/intermediate/self_introduction/i_live_in.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_self_introduction_5_i_am_a_student', level: 'intermediate', category: 'self_introduction', signId: 'I AM A STUDENT.', title: 'I Am a Student.', order: 5,
    description: 'This means “I AM A STUDENT.” In ASL, sign the concepts in this order: ME STUDENT (LEARN handshape moves up to the forehead, then PERSON marker). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/self_introduction/i_am_a_student.png', videoUrl: '../assets/videos/intermediate/self_introduction/i_am_a_student.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · DAILY_ACTIVITIES ──
  {
    id: 'intermediate_daily_activities_1_i_wake_up_early', level: 'intermediate', category: 'daily_activities', signId: 'I WAKE UP EARLY.', title: 'I Wake Up Early.', order: 1,
    description: 'This means “I WAKE UP EARLY.” In ASL, sign the concepts in this order: ME WAKE-UP EARLY (WAKE-UP opens the eyes with ‘L’ handshapes at the eyes). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_wake_up_early.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_wake_up_early.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_activities_2_i_go_to_school', level: 'intermediate', category: 'daily_activities', signId: 'I GO TO SCHOOL.', title: 'I Go to School.', order: 2,
    description: 'This means “I GO TO SCHOOL.” In ASL, sign the concepts in this order: ME SCHOOL GO (topic-comment: name the place, then the action). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_go_to_school.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_go_to_school.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_activities_3_i_study_every_day', level: 'intermediate', category: 'daily_activities', signId: 'I STUDY EVERY DAY.', title: 'I Study Every Day.', order: 3,
    description: 'This means “I STUDY EVERY DAY.” In ASL, sign the concepts in this order: ME STUDY EVERY-DAY (STUDY wiggles fingers toward an open palm; repeat the DAY sign’s motion for ‘every’). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_study_every_day.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_study_every_day.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_activities_4_i_eat_breakfast', level: 'intermediate', category: 'daily_activities', signId: 'I EAT BREAKFAST.', title: 'I Eat Breakfast.', order: 4,
    description: 'This means “I EAT BREAKFAST.” In ASL, sign the concepts in this order: ME MORNING EAT (or the combined sign BREAKFAST, bunched fingers to the mouth). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_eat_breakfast.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_eat_breakfast.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_activities_5_i_go_home_after_school', level: 'intermediate', category: 'daily_activities', signId: 'I GO HOME AFTER SCHOOL.', title: 'I Go Home After School.', order: 5,
    description: 'This means “I GO HOME AFTER SCHOOL.” In ASL, sign the concepts in this order: SCHOOL FINISH, ME HOME GO (ASL often marks sequence with FINISH rather than the word ‘after’). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_go_home_after_school.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_go_home_after_school.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_daily_activities_6_i_sleep_at_10_pm', level: 'intermediate', category: 'daily_activities', signId: 'I SLEEP AT 10 PM.', title: 'I Sleep at 10 PM.', order: 6,
    description: 'This means “I SLEEP AT 10 PM.” In ASL, sign the concepts in this order: NIGHT TEN-OCLOCK, ME SLEEP (time/setting is often established first). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/daily_activities/i_sleep_at_10_pm.png', videoUrl: '../assets/videos/intermediate/daily_activities/i_sleep_at_10_pm.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · FAMILY_CONVERSATIONS ──
  {
    id: 'intermediate_family_conversations_1_i_have_two_brothers', level: 'intermediate', category: 'family_conversations', signId: 'I HAVE TWO BROTHERS.', title: 'I Have Two Brothers.', order: 1,
    description: 'This means “I HAVE TWO BROTHERS.” In ASL, sign the concepts in this order: ME BROTHER TWO HAVE (numbers can follow the noun they count in ASL). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_conversations/i_have_two_brothers.png', videoUrl: '../assets/videos/intermediate/family_conversations/i_have_two_brothers.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_conversations_2_my_mother_works_at_home', level: 'intermediate', category: 'family_conversations', signId: 'MY MOTHER WORKS AT HOME.', title: 'My Mother Works at Home.', order: 2,
    description: 'This means “MY MOTHER WORKS AT HOME.” In ASL, sign the concepts in this order: MY MOTHER HOME WORK. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/family_conversations/my_mother_works_at_home.png', videoUrl: '../assets/videos/intermediate/family_conversations/my_mother_works_at_home.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_conversations_3_my_father_is_a_teacher', level: 'intermediate', category: 'family_conversations', signId: 'MY FATHER IS A TEACHER.', title: 'My Father Is a Teacher.', order: 3,
    description: 'This means “MY FATHER IS A TEACHER.” In ASL, sign the concepts in this order: MY FATHER TEACHER (TEACHER combines the sign for TEACH with the PERSON marker). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_conversations/my_father_is_a_teacher.png', videoUrl: '../assets/videos/intermediate/family_conversations/my_father_is_a_teacher.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_family_conversations_4_i_love_my_family', level: 'intermediate', category: 'family_conversations', signId: 'I LOVE MY FAMILY.', title: 'I Love My Family.', order: 4,
    description: 'This means “I LOVE MY FAMILY.” In ASL, sign the concepts in this order: ME LOVE MY FAMILY (LOVE crosses both fists over the chest). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/family_conversations/i_love_my_family.png', videoUrl: '../assets/videos/intermediate/family_conversations/i_love_my_family.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · TALKING_ABOUT_FEELINGS ──
  {
    id: 'intermediate_talking_about_feelings_1_i_am_happy_today', level: 'intermediate', category: 'talking_about_feelings', signId: 'I AM HAPPY TODAY.', title: 'I Am Happy Today.', order: 1,
    description: 'This means “I AM HAPPY TODAY.” In ASL, sign the concepts in this order: TODAY ME HAPPY. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/talking_about_feelings/i_am_happy_today.png', videoUrl: '../assets/videos/intermediate/talking_about_feelings/i_am_happy_today.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_talking_about_feelings_2_i_am_nervous', level: 'intermediate', category: 'talking_about_feelings', signId: 'I AM NERVOUS.', title: 'I Am Nervous.', order: 2,
    description: 'This means “I AM NERVOUS.” In ASL, sign the concepts in this order: ME NERVOUS (fluttering ‘5’ hands in front of the chest). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/talking_about_feelings/i_am_nervous.png', videoUrl: '../assets/videos/intermediate/talking_about_feelings/i_am_nervous.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_talking_about_feelings_3_i_feel_tired', level: 'intermediate', category: 'talking_about_feelings', signId: 'I FEEL TIRED.', title: 'I Feel Tired.', order: 3,
    description: 'This means “I FEEL TIRED.” In ASL, sign the concepts in this order: ME TIRED (bent hands drop from the chest, shoulders can slump slightly). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/talking_about_feelings/i_feel_tired.png', videoUrl: '../assets/videos/intermediate/talking_about_feelings/i_feel_tired.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_talking_about_feelings_4_i_am_excited_for_tomorrow', level: 'intermediate', category: 'talking_about_feelings', signId: 'I AM EXCITED FOR TOMORROW.', title: 'I Am Excited for Tomorrow.', order: 4,
    description: 'This means “I AM EXCITED FOR TOMORROW.” In ASL, sign the concepts in this order: TOMORROW ME EXCITED (EXCITED alternates middle fingers brushing up the chest, faster than HAPPY). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/talking_about_feelings/i_am_excited_for_tomorrow.png', videoUrl: '../assets/videos/intermediate/talking_about_feelings/i_am_excited_for_tomorrow.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_talking_about_feelings_5_i_am_worried_about_school', level: 'intermediate', category: 'talking_about_feelings', signId: 'I AM WORRIED ABOUT SCHOOL.', title: 'I Am Worried About School.', order: 5,
    description: 'This means “I AM WORRIED ABOUT SCHOOL.” In ASL, sign the concepts in this order: SCHOOL ME WORRY (WORRY circles a flat hand near the forehead, brows furrowed). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/talking_about_feelings/i_am_worried_about_school.png', videoUrl: '../assets/videos/intermediate/talking_about_feelings/i_am_worried_about_school.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · ASKING_FOR_HELP ──
  {
    id: 'intermediate_asking_for_help_1_can_you_help_me', level: 'intermediate', category: 'asking_for_help', signId: 'CAN YOU HELP ME?', title: 'Can You Help Me?', order: 1,
    description: 'This means “CAN YOU HELP ME.” In ASL, sign the concepts in this order: YOU CAN HELP ME-Q (eyebrows raised through the question). Use a yes/no-question expression (see tips).',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_for_help/can_you_help_me.png', videoUrl: '../assets/videos/intermediate/asking_for_help/can_you_help_me.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_for_help_2_where_is_the_restroom', level: 'intermediate', category: 'asking_for_help', signId: 'WHERE IS THE RESTROOM?', title: 'Where Is the Restroom?', order: 2,
    description: 'This means “WHERE IS THE RESTROOM.” In ASL, sign the concepts in this order: RESTROOM WHERE (‘T’ hand shakes for RESTROOM, then WHERE at the end). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_for_help/where_is_the_restroom.png', videoUrl: '../assets/videos/intermediate/asking_for_help/where_is_the_restroom.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_for_help_3_i_need_assistance', level: 'intermediate', category: 'asking_for_help', signId: 'I NEED ASSISTANCE.', title: 'I Need Assistance.', order: 3,
    description: 'This means “I NEED ASSISTANCE.” In ASL, sign the concepts in this order: ME NEED HELP (same core sign as HELP, with NEED’s firmer downward press). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_for_help/i_need_assistance.png', videoUrl: '../assets/videos/intermediate/asking_for_help/i_need_assistance.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_for_help_4_please_repeat_that', level: 'intermediate', category: 'asking_for_help', signId: 'PLEASE REPEAT THAT.', title: 'Please Repeat That.', order: 4,
    description: 'This means “PLEASE REPEAT THAT.” In ASL, sign the concepts in this order: PLEASE AGAIN (AGAIN is a bent hand flipping into the other palm). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_for_help/please_repeat_that.png', videoUrl: '../assets/videos/intermediate/asking_for_help/please_repeat_that.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_asking_for_help_5_i_don_t_understand', level: 'intermediate', category: 'asking_for_help', signId: 'I DON\'T UNDERSTAND.', title: 'I Don’t Understand.', order: 5,
    description: 'This means “I DON\'T UNDERSTAND.” In ASL, sign the concepts in this order: ME UNDERSTAND-NOT (headshake over UNDERSTAND, whose index finger flicks open at the forehead). Use negation grammar (see tips).',
    tips: [
      'Negation is shown with a side-to-side head shake held over the negated sign(s), not a separate \'not\' sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/asking_for_help/i_don_t_understand.png', videoUrl: '../assets/videos/intermediate/asking_for_help/i_don_t_understand.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · SCHOOL_CONVERSATIONS ──
  {
    id: 'intermediate_school_conversations_1_what_is_your_favorite_subject', level: 'intermediate', category: 'school_conversations', signId: 'WHAT IS YOUR FAVORITE SUBJECT?', title: 'What Is Your Favorite Subject?', order: 1,
    description: 'This means “WHAT IS YOUR FAVORITE SUBJECT.” In ASL, sign the concepts in this order: YOUR FAVORITE SUBJECT WHAT (WH-word at the end). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/school_conversations/what_is_your_favorite_subject.png', videoUrl: '../assets/videos/intermediate/school_conversations/what_is_your_favorite_subject.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_school_conversations_2_my_favorite_subject_is_english', level: 'intermediate', category: 'school_conversations', signId: 'MY FAVORITE SUBJECT IS ENGLISH.', title: 'My Favorite Subject Is English.', order: 2,
    description: 'This means “MY FAVORITE SUBJECT IS ENGLISH.” In ASL, sign the concepts in this order: MY FAVORITE SUBJECT ENGLISH. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/school_conversations/my_favorite_subject_is_english.png', videoUrl: '../assets/videos/intermediate/school_conversations/my_favorite_subject_is_english.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_school_conversations_3_when_is_the_exam', level: 'intermediate', category: 'school_conversations', signId: 'WHEN IS THE EXAM?', title: 'When Is the Exam?', order: 3,
    description: 'This means “WHEN IS THE EXAM.” In ASL, sign the concepts in this order: EXAM WHEN. Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/school_conversations/when_is_the_exam.png', videoUrl: '../assets/videos/intermediate/school_conversations/when_is_the_exam.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_school_conversations_4_i_finished_my_assignment', level: 'intermediate', category: 'school_conversations', signId: 'I FINISHED MY ASSIGNMENT.', title: 'I Finished My Assignment.', order: 4,
    description: 'This means “I FINISHED MY ASSIGNMENT.” In ASL, sign the concepts in this order: ME ASSIGNMENT FINISH (FINISH after the verb/task marks completed action, like a past tense). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/school_conversations/i_finished_my_assignment.png', videoUrl: '../assets/videos/intermediate/school_conversations/i_finished_my_assignment.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_school_conversations_5_the_lesson_is_difficult', level: 'intermediate', category: 'school_conversations', signId: 'THE LESSON IS DIFFICULT.', title: 'The Lesson Is Difficult.', order: 5,
    description: 'This means “THE LESSON IS DIFFICULT.” In ASL, sign the concepts in this order: LESSON DIFFICULT (bent ‘V’ hands strike down, brows furrowed). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/school_conversations/the_lesson_is_difficult.png', videoUrl: '../assets/videos/intermediate/school_conversations/the_lesson_is_difficult.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · SHOPPING_ORDERING ──
  {
    id: 'intermediate_shopping_ordering_1_how_much_is_this', level: 'intermediate', category: 'shopping_ordering', signId: 'HOW MUCH IS THIS?', title: 'How Much Is This?', order: 1,
    description: 'This means “HOW MUCH IS THIS.” In ASL, sign the concepts in this order: THIS COST/HOW-MUCH (index finger points down, then the question sign). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/shopping_ordering/how_much_is_this.png', videoUrl: '../assets/videos/intermediate/shopping_ordering/how_much_is_this.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_shopping_ordering_2_i_want_to_buy_this', level: 'intermediate', category: 'shopping_ordering', signId: 'I WANT TO BUY THIS.', title: 'I Want to Buy This.', order: 2,
    description: 'This means “I WANT TO BUY THIS.” In ASL, sign the concepts in this order: ME WANT BUY THIS (WANT pulls open ‘5’ hands toward the body; BUY scoops from one palm). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/shopping_ordering/i_want_to_buy_this.png', videoUrl: '../assets/videos/intermediate/shopping_ordering/i_want_to_buy_this.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_shopping_ordering_3_do_you_have_another_color', level: 'intermediate', category: 'shopping_ordering', signId: 'DO YOU HAVE ANOTHER COLOR?', title: 'Do You Have Another Color?', order: 3,
    description: 'This means “DO YOU HAVE ANOTHER COLOR.” In ASL, sign the concepts in this order: OTHER COLOR HAVE YOU-Q (eyebrows raised through the whole question). Use a yes/no-question expression (see tips).',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/shopping_ordering/do_you_have_another_color.png', videoUrl: '../assets/videos/intermediate/shopping_ordering/do_you_have_another_color.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_shopping_ordering_4_where_is_the_cashier', level: 'intermediate', category: 'shopping_ordering', signId: 'WHERE IS THE CASHIER?', title: 'Where Is the Cashier?', order: 4,
    description: 'This means “WHERE IS THE CASHIER.” In ASL, sign the concepts in this order: CASHIER WHERE (often fingerspelled or paired with PAY + PERSON). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/shopping_ordering/where_is_the_cashier.png', videoUrl: '../assets/videos/intermediate/shopping_ordering/where_is_the_cashier.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_shopping_ordering_5_thank_you_for_your_help', level: 'intermediate', category: 'shopping_ordering', signId: 'THANK YOU FOR YOUR HELP.', title: 'Thank You for Your Help.', order: 5,
    description: 'This means “THANK YOU FOR YOUR HELP.” In ASL, sign the concepts in this order: YOUR HELP THANK-YOU. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/shopping_ordering/thank_you_for_your_help.png', videoUrl: '../assets/videos/intermediate/shopping_ordering/thank_you_for_your_help.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · SOCIAL_CONVERSATIONS ──
  {
    id: 'intermediate_social_conversations_1_what_are_you_doing_today', level: 'intermediate', category: 'social_conversations', signId: 'WHAT ARE YOU DOING TODAY?', title: 'What Are You Doing Today?', order: 1,
    description: 'This means “WHAT ARE YOU DOING TODAY.” In ASL, sign the concepts in this order: TODAY YOU DO-DO WHAT (WH-word at the end). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/social_conversations/what_are_you_doing_today.png', videoUrl: '../assets/videos/intermediate/social_conversations/what_are_you_doing_today.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_social_conversations_2_i_am_going_with_my_friends', level: 'intermediate', category: 'social_conversations', signId: 'I AM GOING WITH MY FRIENDS.', title: 'I Am Going With My Friends.', order: 2,
    description: 'This means “I AM GOING WITH MY FRIENDS.” In ASL, sign the concepts in this order: ME FRIEND GROUP-GO-WITH (GO-WITH sweeps both hands forward together). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/social_conversations/i_am_going_with_my_friends.png', videoUrl: '../assets/videos/intermediate/social_conversations/i_am_going_with_my_friends.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_social_conversations_3_would_you_like_to_join_us', level: 'intermediate', category: 'social_conversations', signId: 'WOULD YOU LIKE TO JOIN US?', title: 'Would You Like to Join Us?', order: 3,
    description: 'This means “WOULD YOU LIKE TO JOIN US.” In ASL, sign the concepts in this order: YOU WANT JOIN-US-Q (eyebrows raised through the question). Use a yes/no-question expression (see tips).',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/social_conversations/would_you_like_to_join_us.png', videoUrl: '../assets/videos/intermediate/social_conversations/would_you_like_to_join_us.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_social_conversations_4_that_s_a_good_idea', level: 'intermediate', category: 'social_conversations', signId: 'THAT\'S A GOOD IDEA.', title: 'That’s a Good Idea.', order: 4,
    description: 'This means “THAT\'S A GOOD IDEA.” In ASL, sign the concepts in this order: IDEA GOOD (IDEA flicks an ‘I’/bent hand off the forehead). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/social_conversations/that_s_a_good_idea.png', videoUrl: '../assets/videos/intermediate/social_conversations/that_s_a_good_idea.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_social_conversations_5_see_you_tomorrow', level: 'intermediate', category: 'social_conversations', signId: 'SEE YOU TOMORROW.', title: 'See You Tomorrow.', order: 5,
    description: 'This means “SEE YOU TOMORROW.” In ASL, sign the concepts in this order: TOMORROW SEE-YOU (TOMORROW rolls a ‘T’/thumb hand forward from the cheek). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
      'Longer ideas often lead with the topic, then comment on it (topic-comment order), rather than strict English word order',
    ],
    imageUrl: '../assets/images/intermediate/social_conversations/see_you_tomorrow.png', videoUrl: '../assets/videos/intermediate/social_conversations/see_you_tomorrow.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · EMERGENCY_SITUATIONS ──
  {
    id: 'intermediate_emergency_situations_1_i_need_help', level: 'intermediate', category: 'emergency_situations', signId: 'I NEED HELP.', title: 'I Need Help.', order: 1,
    description: 'This means “I NEED HELP.” In ASL, sign the concepts in this order: ME NEED HELP (urgent, larger movement and tense expression). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/i_need_help.png', videoUrl: '../assets/videos/intermediate/emergency_situations/i_need_help.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_emergency_situations_2_call_the_police', level: 'intermediate', category: 'emergency_situations', signId: 'CALL THE POLICE.', title: 'Call the Police.', order: 2,
    description: 'This means “CALL THE POLICE.” In ASL, sign the concepts in this order: POLICE CALL-(phone handshape) or POLICE + the directional CALL sign. Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/call_the_police.png', videoUrl: '../assets/videos/intermediate/emergency_situations/call_the_police.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_emergency_situations_3_call_an_ambulance', level: 'intermediate', category: 'emergency_situations', signId: 'CALL AN AMBULANCE.', title: 'Call an Ambulance.', order: 3,
    description: 'This means “CALL AN AMBULANCE.” In ASL, sign the concepts in this order: AMBULANCE CALL (AMBULANCE is often fingerspelled or shown with a siren-light gesture above the head). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/call_an_ambulance.png', videoUrl: '../assets/videos/intermediate/emergency_situations/call_an_ambulance.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_emergency_situations_4_i_am_lost', level: 'intermediate', category: 'emergency_situations', signId: 'I AM LOST.', title: 'I Am Lost.', order: 4,
    description: 'This means “I AM LOST.” In ASL, sign the concepts in this order: ME LOST (bent ‘V’ hand drops through a loose ‘C’, like disappearing). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/i_am_lost.png', videoUrl: '../assets/videos/intermediate/emergency_situations/i_am_lost.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_emergency_situations_5_where_is_the_hospital', level: 'intermediate', category: 'emergency_situations', signId: 'WHERE IS THE HOSPITAL?', title: 'Where Is the Hospital?', order: 5,
    description: 'This means “WHERE IS THE HOSPITAL.” In ASL, sign the concepts in this order: HOSPITAL WHERE (HOSPITAL traces an ‘H’ cross shape on the upper arm). Use a WH-question expression (see tips).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/where_is_the_hospital.png', videoUrl: '../assets/videos/intermediate/emergency_situations/where_is_the_hospital.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_emergency_situations_6_this_is_an_emergency', level: 'intermediate', category: 'emergency_situations', signId: 'THIS IS AN EMERGENCY.', title: 'This Is an Emergency.', order: 6,
    description: 'This means “THIS IS AN EMERGENCY.” In ASL, sign the concepts in this order: EMERGENCY THIS (EMERGENCY shakes an ‘E’ handshape, urgent expression). Use a neutral statement expression.',
    tips: [
      'Neutral/statement sentences use relaxed eyebrows — no extra facial question marker needed',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/emergency_situations/this_is_an_emergency.png', videoUrl: '../assets/videos/intermediate/emergency_situations/this_is_an_emergency.mp4', detectionType: 'motion',
  },

  // ── INTERMEDIATE · EVERYDAY_DIALOGUES ──
  {
    id: 'intermediate_everyday_dialogues_1_meeting_someone_hello_hello_what_is_your', level: 'intermediate', category: 'everyday_dialogues', signId: 'MEETING SOMEONE: HELLO. / HELLO. / WHAT IS YOUR NAME? / MY NAME IS JOHN. / NICE TO MEET YOU.', title: 'Dialogue: Meeting Someone', order: 1,
    description: 'A short back-and-forth: HELLO → HELLO → YOUR NAME WHAT → MY NAME [fingerspell] → NICE MEET-YOU. Each line is a separate mini-phrase — sign one, pause, then the next, the way turns happen in a real conversation.',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'Names without a common ASL sign are fingerspelled letter by letter',
      'Look up at the other person between lines — eye contact signals whose turn it is to sign',
    ],
    imageUrl: '../assets/images/intermediate/everyday_dialogues/meeting_someone_hello_hello_what_is_your.png', videoUrl: '../assets/videos/intermediate/everyday_dialogues/meeting_someone_hello_hello_what_is_your.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_everyday_dialogues_2_asking_for_help_excuse_me_can_you_help_m', level: 'intermediate', category: 'everyday_dialogues', signId: 'ASKING FOR HELP: EXCUSE ME. / CAN YOU HELP ME? / YES, WHAT DO YOU NEED? / I AM LOOKING FOR THE RESTROOM.', title: 'Dialogue: Asking for Help', order: 2,
    description: 'A short back-and-forth: EXCUSE-ME → YOU CAN HELP ME-Q → YES NEED WHAT → ME RESTROOM LOOK-FOR. Sign each line as its own phrase, pausing for the other person\'s turn.',
    tips: [
      'Yes/no questions raise your eyebrows and lean your head forward slightly, held until the question ends',
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'LOOK-FOR sweeps a bent ‘V’ hand around, like scanning for something',
    ],
    imageUrl: '../assets/images/intermediate/everyday_dialogues/asking_for_help_excuse_me_can_you_help_m.png', videoUrl: '../assets/videos/intermediate/everyday_dialogues/asking_for_help_excuse_me_can_you_help_m.mp4', detectionType: 'motion',
  },
  {
    id: 'intermediate_everyday_dialogues_3_shopping_how_much_is_this_it_is_ten_doll', level: 'intermediate', category: 'everyday_dialogues', signId: 'SHOPPING: HOW MUCH IS THIS? / IT IS TEN DOLLARS. / I WILL BUY IT. / THANK YOU.', title: 'Dialogue: Shopping', order: 3,
    description: 'A short back-and-forth: THIS COST/HOW-MUCH → TEN DOLLARS → ME BUY WILL → THANK-YOU. Money amounts combine a number handshape with the DOLLARS sign (a pulling twist from the palm).',
    tips: [
      'WH-questions (who/what/where/when/why/how) use furrowed eyebrows and a slight head tilt, held through the sign',
      'Numbers combined with DOLLARS often shift into a specific \'money\' handshape — practice plain numbers first',
      'ASL usually drops ‘am/is/are‘, ‘a/an/the’, and other small English words — sign the meaningful words only',
    ],
    imageUrl: '../assets/images/intermediate/everyday_dialogues/shopping_how_much_is_this_it_is_ten_doll.png', videoUrl: '../assets/videos/intermediate/everyday_dialogues/shopping_how_much_is_this_it_is_ten_doll.mp4', detectionType: 'motion',
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

/**
 * NEW — Rev 4 Phase 1. Returns all UNITS metadata sorted by `order`.
 * Not consumed by any UI yet — js/learn.js's trail-view rewrite is
 * Phase 4. Added now so Phase 4 doesn't need a data.js change too.
 */
function getUnits() {
  return [...UNITS].sort((a, b) => a.order - b.order);
}

/**
 * NEW — Rev 4 Phase 1. Returns every CATEGORIES entry tagged with the
 * given unit order, sorted by their existing `order` field (unchanged
 * meaning — display order within that unit, same as within a level).
 * @param {number} unitOrder
 */
function getCategoriesForUnit(unitOrder) {
  return CATEGORIES.filter(c => c.unit === unitOrder).sort((a, b) => a.order - b.order);
}

/* ── EXPORTS ─────────────────────────────────────────────────────── */
window.LWData = {
  SIGNS, QUESTIONS, CATEGORIES, UNITS, UNIT0_CONTENT,
  getSign, getCategorySigns, getCategoriesForLevel, getCategory,
  getUnits, getCategoriesForUnit,
};