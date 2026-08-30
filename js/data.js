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
 *
 * REV 7 (2026-08-24) — UNITS/CATEGORIES rewritten to implement
 * Omen's uploaded "updated fixed lesson.txt" 68-topic curriculum.
 * SIGNS, QUESTIONS, UNIT0_CONTENT, and every helper function below
 * were UNCHANGED that session — the pivot only touched the two
 * arrays it needed to. See AI_MEMORY.md §0 / PIVOT_CHECKLIST.md /
 * SYSTEM_ARCHITECTURE.md Rev 7 section for the full writeup, mapping
 * table, and open flags.
 *
 * HOMEPAGE PIVOT (this session) — Unit 0 ("Welcome to ASL: A Brief
 * History") is no longer a curriculum unit. Its `UNITS` entry
 * (order:0, kind:'info') is REMOVED — the learning trail now starts
 * at order:1 (Alphabet); order:2 (Fingerspell)/order:3 (Numbers) and
 * every unit after them keep their existing `order` values unchanged
 * (a gap at 0 is intentional, not renumbered). `UNIT0_CONTENT` is
 * REMOVED from this file entirely (Option B — see task notes): its
 * five sections now live as static markup in the new
 * `pages/homepage.html`, the authenticated landing page shown right
 * after login/register (see index.html). `intro-to-asl.html` is
 * UNCHANGED and still exists as the deeper, longer-form reference
 * page homepage.html links out to. No other CATEGORIES/SIGNS content
 * touched, no ordering/unlock logic touched — `js/engine/progress.js`
 * was inspected and confirmed to need no change (it already only
 * walks `kind:'category-group'` units, so Unit 0 was structurally
 * excluded from gating even before this removal).
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
 * kind: 'info' (no camera/sign, just reading — historically Unit 0;
 *          NO LIVE UNIT USES THIS KIND as of the Homepage pivot, see
 *          the file header comment above — kept documented here in
 *          case a future info-only unit is ever added) |
 *       'interactive' (a drill with no CATEGORIES entry of its own —
 *          Unit 2, built in Phase 2 directly on the A–Z static model) |
 *       'category-group' (one or more CATEGORIES entries tagged with
 *          this unit's order, walked in `CATEGORIES[].order` order) |
 *       'reference' (browse-only, not graded, not gating anything —
 *          Unit 71 Phrasebook (Rev 7); NOT one of the three kinds named in
 *          Rev 4's data-model note, added here because the Phrasebook
 *          needs a kind that is neither gradeable nor an info screen —
 *          flag this for Joshua/adviser sign-off if it matters).
 * ──────────────────────────────────────────────────────────────── */
/* ── UNITS — REV 7 PIVOT (Omen's "updated fixed lesson" curriculum) ──
 * REPLACED (this session) — the old Rev 6 11-unit table is gone.
 * Implements the 68-topic vocabulary progression from Omen's uploaded
 * "updated fixed lesson.txt" 1:1, in the order given (that file says
 * it's "already sorted," so this doesn't re-sort it) — background info
 * screen, then topics 1–68 exactly as numbered there, one topic = one
 * unit. `kind`/`gated` mechanics are UNCHANGED from Rev 6 — only the
 * unit COUNT and CONTENT changed, not how units function.
 *
 * Two units are NOT from the source file and were kept from Rev 6 —
 * flagging both for confirmation, not a unilateral removal:
 *   - order:2 'fingerspell_name' (gated assessment) — the source list
 *     has no fingerspelling topic, but this is a working, already-built
 *     gate mechanism (reuses the trained A–Z model). Deleting it would
 *     remove real functionality the lesson plan simply doesn't mention.
 *     Kept in its Rev 6 position, right after the Alphabet.
 *   - order:70/71 'basic_phrases' (sequence_demo) and 'phrasebook' —
 *     the source list is pure vocabulary, no phrase-combination or
 *     reference-sentence topics. Kept at the very END, after every
 *     vocab unit, matching the adviser's own "combine what's already
 *     taught" framing from Rev 4 (see SYSTEM_ARCHITECTURE.md). Both are
 *     UNCHANGED from Rev 6 otherwise (same id, same content, same
 *     kind) — only the `order` number moved to make room.
 *
 * kind meanings unchanged from Rev 6 — see SYSTEM_ARCHITECTURE.md.
 * ──────────────────────────────────────────────────────────────── */
const UNITS = [
  // HOMEPAGE PIVOT (this session) — order:0 'welcome' (kind:'info',
  // "Welcome to ASL: A Brief History") REMOVED. That content is now
  // the static pages/homepage.html landing page shown right after
  // login, not a trail unit — see file header comment. Order
  // deliberately starts at 1 now; 1/2/3 below keep their existing
  // values unchanged (per task instructions: don't renumber just to
  // close the gap at 0 — nothing reads UNITS as a zero-indexed array,
  // every lookup below is by `.id` or `.order` value, confirmed via
  // getUnits()/getCategoriesForUnit()/progress.js's getOrderedLiveCategories()).
  { id: 'alphabet', order: 1, title: 'The Alphabet', kind: 'category-group' },
  // UNCHANGED from Rev 6 — see file header note above. Not in the
  // source lesson plan; kept as a working feature.
  { id: 'fingerspell_name', order: 2, title: 'Fingerspell Your Name', kind: 'interactive', gated: true },
  { id: 'numbers', order: 3, title: 'Numbers', kind: 'category-group' },
  // ── Topics 3–68 below, one per unit, order matches the source
  // file's own numbering exactly (topic N below = "N. <title>" in
  // updated_fixed_lesson.txt) minus the 2-unit offset from Welcome +
  // Fingerspell above.
  { id: 'greetings', order: 4, title: 'Greetings', kind: 'category-group' },
  { id: 'polite_words', order: 5, title: 'Polite Words', kind: 'category-group' },
  { id: 'people', order: 6, title: 'People', kind: 'category-group' },
  { id: 'feelings', order: 7, title: 'Feelings', kind: 'category-group' },
  { id: 'needs', order: 8, title: 'Needs', kind: 'category-group' },
  { id: 'actions', order: 9, title: 'Actions', kind: 'category-group' },
  { id: 'hand_actions', order: 10, title: 'Hand Actions', kind: 'category-group' },
  { id: 'communication', order: 11, title: 'Communication', kind: 'category-group' },
  { id: 'body', order: 12, title: 'Body', kind: 'category-group' },
  { id: 'personal_information', order: 13, title: 'Personal Information', kind: 'category-group' },
  { id: 'colors_unit', order: 14, title: 'Colors', kind: 'category-group' },
  { id: 'shapes', order: 15, title: 'Shapes', kind: 'category-group' },
  { id: 'size', order: 16, title: 'Size', kind: 'category-group' },
  { id: 'appearance', order: 17, title: 'Appearance', kind: 'category-group' },
  { id: 'touch', order: 18, title: 'Touch', kind: 'category-group' },
  { id: 'taste', order: 19, title: 'Taste', kind: 'category-group' },
  { id: 'sound', order: 20, title: 'Sound', kind: 'category-group' },
  { id: 'descriptions', order: 21, title: 'Descriptions', kind: 'category-group' },
  { id: 'family_unit', order: 22, title: 'Family', kind: 'category-group' },
  { id: 'home', order: 23, title: 'Home', kind: 'category-group' },
  { id: 'furniture', order: 24, title: 'Furniture', kind: 'category-group' },
  { id: 'household', order: 25, title: 'Household', kind: 'category-group' },
  { id: 'bathroom', order: 26, title: 'Bathroom', kind: 'category-group' },
  { id: 'kitchen', order: 27, title: 'Kitchen', kind: 'category-group' },
  { id: 'school', order: 28, title: 'School', kind: 'category-group' },
  { id: 'school_supplies', order: 29, title: 'School Supplies', kind: 'category-group' },
  { id: 'classroom', order: 30, title: 'Classroom', kind: 'category-group' },
  { id: 'classroom_actions', order: 31, title: 'Classroom Actions', kind: 'category-group' },
  { id: 'subjects', order: 32, title: 'Subjects', kind: 'category-group' },
  { id: 'food_unit', order: 33, title: 'Food', kind: 'category-group' },
  { id: 'fruits', order: 34, title: 'Fruits', kind: 'category-group' },
  { id: 'vegetables', order: 35, title: 'Vegetables', kind: 'category-group' },
  { id: 'snacks', order: 36, title: 'Snacks', kind: 'category-group' },
  { id: 'drinks', order: 37, title: 'Drinks', kind: 'category-group' },
  { id: 'animals_unit', order: 38, title: 'Animals', kind: 'category-group' },
  { id: 'wild_animals', order: 39, title: 'Wild Animals', kind: 'category-group' },
  { id: 'insects', order: 40, title: 'Insects', kind: 'category-group' },
  { id: 'clothes_unit', order: 41, title: 'Clothes', kind: 'category-group' },
  { id: 'dressing', order: 42, title: 'Dressing', kind: 'category-group' },
  { id: 'personal_items', order: 43, title: 'Personal Items', kind: 'category-group' },
  { id: 'nature', order: 44, title: 'Nature', kind: 'category-group' },
  { id: 'plants', order: 45, title: 'Plants', kind: 'category-group' },
  { id: 'weather', order: 46, title: 'Weather', kind: 'category-group' },
  { id: 'seasons', order: 47, title: 'Seasons', kind: 'category-group' },
  { id: 'places_unit', order: 48, title: 'Places', kind: 'category-group' },
  { id: 'vehicles', order: 49, title: 'Vehicles', kind: 'category-group' },
  { id: 'transportation', order: 50, title: 'Transportation', kind: 'category-group' },
  { id: 'professions', order: 51, title: 'Professions', kind: 'category-group' },
  { id: 'community', order: 52, title: 'Community', kind: 'category-group' },
  { id: 'time_unit', order: 53, title: 'Time', kind: 'category-group' },
  { id: 'daytime', order: 54, title: 'Daytime', kind: 'category-group' },
  { id: 'days', order: 55, title: 'Days', kind: 'category-group' },
  { id: 'months', order: 56, title: 'Months', kind: 'category-group' },
  { id: 'sequence', order: 57, title: 'Sequence', kind: 'category-group' },
  { id: 'frequency', order: 58, title: 'Frequency', kind: 'category-group' },
  { id: 'location', order: 59, title: 'Location', kind: 'category-group' },
  { id: 'distance', order: 60, title: 'Distance', kind: 'category-group' },
  { id: 'directions', order: 61, title: 'Directions', kind: 'category-group' },
  { id: 'social', order: 62, title: 'Social', kind: 'category-group' },
  { id: 'manners', order: 63, title: 'Manners', kind: 'category-group' },
  { id: 'turn_taking', order: 64, title: 'Turn-Taking', kind: 'category-group' },
  { id: 'responses', order: 65, title: 'Responses', kind: 'category-group' },
  { id: 'questions', order: 66, title: 'Questions', kind: 'category-group' },
  { id: 'conversation', order: 67, title: 'Conversation', kind: 'category-group' },
  { id: 'requests_unit', order: 68, title: 'Requests', kind: 'category-group' },
  { id: 'answers', order: 69, title: 'Answers', kind: 'category-group' },
  // UNCHANGED from Rev 6 (id/kind/content) — see file header note above.
  { id: 'basic_phrases', order: 70, title: 'Basic Phrases', kind: 'category-group' },
  { id: 'phrasebook', order: 71, title: 'Phrasebook', kind: 'reference' },
];

/* ── UNIT 0 CONTENT — REMOVED this session (Homepage pivot) ─────────
 * `UNIT0_CONTENT` (five sections: "What is ASL?", "A Brief History of
 * ASL", "How practice works in LinguaWave", and two Deaf-culture
 * notes — originally added Rev 4 Phase 1, history content added
 * 2026-08-23) used to be read by a dedicated Unit 0 "info" trail
 * screen (learn.js's now-also-removed renderUnitInfo()). Unit 0 is no
 * longer a curriculum unit (see the UNITS array above and the file
 * header comment) — this content was moved VERBATIM into the new
 * pages/homepage.html as static markup (Option B: static HTML over a
 * renamed-but-still-data-driven HOMEPAGE_CONTENT array, since nothing
 * else reads this content and a static informational page needs no
 * render layer). No SIGNS/SIGN_DICTIONARY/CATEGORIES entry ever
 * referenced this const, so removing it has zero effect on lesson
 * content, detection, or progress/unlock logic.
 * ──────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  // ── level=basic — Alphabet & Numbers (topics 1-2, unchanged from Rev 6) ──
  { id: 'alphabet', level: 'basic', title: 'Alphabet', order: 1, comingSoon: false, unit: 1 },
  { id: 'numbers', level: 'basic', title: 'Numbers', order: 1, comingSoon: false, unit: 3 },

  // ── level=medium — topics 3-68, one category per unit, in the exact
  // order given in Omen's uploaded 'updated fixed lesson.txt' (topic
  // numbers in the comments below match that file's own numbering) ──
  // 3. Greetings
  // LEGACY id/content kept — see dictionary.js's HELLO placeholder
  // (disabled:true). words[] below is the fuller preview list from the new
  // plan; only HELLO has an actual SIGNS/dictionary entry so far.
  {
    id: 'essentials_greetings', level: 'medium', title: 'Greetings', order: 1, comingSoon: false, unit: 4,
    words: ['HELLO', 'HI', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'GOODBYE', 'BYE', 'WELCOME'],
  },
  // 4. Polite Words
  // LEGACY id/content kept — PLEASE/THANK YOU/EXCUSE/SORRY have disabled:true
  // dictionary.js placeholders. words[] below is the new plan's fuller Polite
  // Words list; THANKS/WELCOME/YES/NO have no SIGNS entry of their own yet
  // (YES/NO live under 'essentials_basic_responses'/'questions' instead — see
  // that entry).
  {
    id: 'essentials_polite_expressions', level: 'medium', title: 'Polite Words', order: 1, comingSoon: false, unit: 5,
    words: ['PLEASE', 'THANKS', 'WELCOME', 'SORRY', 'EXCUSE', 'YES', 'NO'],
  },
  // 5. People
  // REV 8 (2026-08-25): 'I', 'HE', 'SHE' removed from words[] — resolves the
  // decision previously flagged in the "MEDIUM · PEOPLE" SIGNS block comment.
  // 'I' is the same physical sign as 'ME' (ASLU doesn't treat them as visually
  // distinct) and its signId would've collided with the fingerspelled letter
  // 'I'; medium_people_ME's own tips already note it covers "I". 'HE'/'SHE'
  // aren't distinguished by handshape in ASL — both are done by pointing at
  // whatever referent was established in space — so giving them separate
  // "how to sign" descriptions would misteach a distinction that doesn't
  // exist. Per project convention (see BATHROOM/RESTROOM), we don't invent
  // duplicate physical-sign entries just to hit one-entry-per-word.
  {
    id: 'people', level: 'medium', title: 'People', order: 1, comingSoon: false, unit: 6,
    words: ['ME', 'MY', 'YOU', 'YOUR', 'BOY', 'GIRL', 'BABY', 'CHILD', 'MAN', 'WOMAN', 'PERSON', 'FRIEND', 'TEACHER', 'STUDENT'],
  },
  // 6. Feelings
  // LEGACY id kept (was already comingSoon:true, zero dictionary.js entries) —
  // words[] replaced wholesale with the new plan's Feelings list;
  // CRY/LIKE/LOVE from the old list moved to 'actions'/'social' per the new
  // plan, safe since none were ever wired to detection.
  {
    id: 'feelings', level: 'medium', title: 'Feelings', order: 1, comingSoon: false, unit: 7,
    words: ['HAPPY', 'SAD', 'ANGRY', 'SCARED', 'EXCITED', 'TIRED', 'SLEEPY', 'HUNGRY', 'THIRSTY', 'SICK', 'FINE', 'OKAY', 'BORED', 'WORRIED', 'NERVOUS'],
  },
  // 7. Needs
  // LEGACY id/content kept — HELP/STOP/WATER/FOOD/HUNGRY/BATHROOM/GO/COME have
  // disabled:true dictionary.js placeholders (Phase 7). words[] below is the
  // new plan's fuller Needs list; the real placeholder set is narrower (no
  // SLEEP/MORE/LESS/WANT/NEED/LIKE entry yet) — flagged, not a regression,
  // just the preview text now says more than the app can actually check yet.
  {
    id: 'requests', level: 'medium', title: 'Needs', order: 1, comingSoon: false, unit: 8,
    words: ['FOOD', 'WATER', 'HELP', 'SLEEP', 'BATHROOM', 'HOME', 'SCHOOL', 'MORE', 'LESS', 'WANT', 'NEED', 'LIKE'],
  },
  // 8. Actions
  // REV 8 (2026-08-25): flipped to comingSoon:false — full ASLU-checked SIGNS
  // coverage added for every word[] below (see "MEDIUM · ACTIONS" block).
  // GO/COME/STOP/DRINK/SLEEP/CRY were relocated here from other categories'
  // SIGNS entries (category:'requests'/'food'/'health'/'feelings') where they
  // were orphaned leftovers — none of those categories' own words[] claimed
  // them, except 'health', which is still comingSoon:true/dormant, so no live
  // regression. CLEAN reuses the old 'health' NICE/CLEAN entry (same physical
  // sign) rather than inventing a duplicate — see that entry's history note.
  {
    id: 'actions', level: 'medium', title: 'Actions', order: 1, comingSoon: false, unit: 9,
    words: ['GO', 'COME', 'STOP', 'WAIT', 'SIT', 'STAND', 'WALK', 'RUN', 'JUMP', 'EAT', 'DRINK', 'SLEEP', 'WAKE', 'PLAY', 'LOOK', 'SEE', 'LISTEN', 'TALK', 'READ', 'WRITE', 'DRAW', 'SING', 'DANCE', 'COOK', 'CLEAN', 'THINK', 'CRY', 'LAUGH', 'RIDE', 'BATH'],
  },
  // 9. Hand Actions
  // REV 8 (2026-08-25): flipped to comingSoon:false — full ASLU-checked SIGNS
  // coverage added for every word[] below (see "MEDIUM · HAND ACTIONS" block).
  {
    id: 'hand_actions', level: 'medium', title: 'Hand Actions', order: 1, comingSoon: false, unit: 10,
    words: ['GIVE', 'TAKE', 'PUT', 'GET', 'BRING', 'CARRY', 'PUSH', 'PULL', 'THROW', 'CATCH', 'PICK'],
  },
  // 10. Communication
  // REV 8 (2026-08-25): flipped to comingSoon:false. 'HELP' removed from
  // words[] — it's already live under 'requests' (Needs, Unit 8) and that
  // category's own words[] claims it; per project convention we don't
  // duplicate a physical-sign entry across two categories, so it's not
  // repeated here. Every remaining word has real SIGNS coverage (see
  // "MEDIUM · COMMUNICATION" block).
  {
    id: 'communication', level: 'medium', title: 'Communication', order: 1, comingSoon: false, unit: 11,
    words: ['ASK', 'ANSWER', 'TELL', 'SHOW', 'SHARE', 'TEACH', 'SIGN'],
  },
  // 11. Body
  {
    id: 'body', level: 'medium', title: 'Body', order: 1, comingSoon: false, unit: 12,
    words: ['BODY', 'HEAD', 'HAIR', 'FACE', 'EYE', 'EAR', 'NOSE', 'MOUTH', 'TEETH', 'HAND', 'FINGER', 'ARM', 'LEG', 'FOOT', 'STOMACH', 'BACK'],
  },
  // 12. Personal Information — unlocked this pass. 9 of these 15 words
  // (BOY/GIRL/CHILD/PERSON/FRIEND/STUDENT/TEACHER/HOME/SCHOOL) reuse
  // entries already live under family/people/places — see the
  // "MEDIUM · PERSONAL_INFORMATION" SIGNS block comment.
  {
    id: 'personal_information', level: 'medium', title: 'Personal Information', order: 1, comingSoon: false, unit: 13,
    words: ['NAME', 'AGE', 'BOY', 'GIRL', 'CHILD', 'PERSON', 'FAMILY', 'FRIEND', 'STUDENT', 'TEACHER', 'SCHOOL', 'HOME', 'BIRTHDAY', 'LIVE', 'FROM'],
  },
  // 13. Colors — unlocked: all 11 words have ASLU-checked SIGNS entries
  // (see "MEDIUM · COLORS" below). GOLD/SILVER aren't in this list and
  // were removed rather than kept as unused entries — see BROWN's
  // detection notes if a metallic color is ever wanted back.
  {
    id: 'colors', level: 'medium', title: 'Colors', order: 1, comingSoon: false, unit: 14,
    words: ['RED', 'BLUE', 'YELLOW', 'GREEN', 'ORANGE', 'PURPLE', 'WHITE', 'BLACK', 'GRAY', 'BROWN', 'PINK'],
  },
  // 14. Shapes
  {
    id: 'shapes', level: 'medium', title: 'Shapes', order: 1, comingSoon: false, unit: 15,
    words: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'RECTANGLE', 'OVAL', 'STAR', 'HEART', 'DIAMOND'],
  },
  // 15. Size
  // Replaces the retired legacy 'amounts' category (BIG/TALL/FULL/MORE,
  // comingSoon:true, zero dictionary.js entries — safe to retire, no
  // detection risk). FULL moved to 'descriptions' per the new plan.
  {
    id: 'size', level: 'medium', title: 'Size', order: 1, comingSoon: false, unit: 16,
    words: ['BIG', 'SMALL', 'TALL', 'SHORT', 'LONG', 'WIDE', 'THIN', 'HEAVY', 'LIGHT'],
  },
  // 16. Appearance — unlocked this pass. CLEAN reuses the entry already
  // live under 'actions'. NEAT and CLEAN are the same physical sign in
  // ASL (context/expression only) — see the "MEDIUM · APPEARANCE" SIGNS
  // block comment before wiring NEAT into a graded detection quiz.
  {
    id: 'appearance', level: 'medium', title: 'Appearance', order: 1, comingSoon: false, unit: 17,
    words: ['BEAUTIFUL', 'PRETTY', 'UGLY', 'CUTE', 'CLEAN', 'DIRTY', 'NEAT', 'MESSY', 'OLD', 'NEW', 'BROKEN', 'DARK', 'BRIGHT'],
  },
  // 17. Touch
  // LEGACY id/content kept — HOT/COLD have disabled:true dictionary.js
  // placeholders (Phase 7). Retitled 'Temperature' -> 'Touch' to match the new
  // plan's topic 17; words[] below is the fuller Touch list, but only HOT/COLD
  // have any real placeholder so far.
  {
    id: 'temperature', level: 'medium', title: 'Touch', order: 1, comingSoon: false, unit: 18,
    words: ['HOT', 'COLD', 'WARM', 'COOL', 'SOFT', 'HARD', 'ROUGH', 'SMOOTH', 'WET', 'DRY', 'SHARP'],
  },
  // 18. Taste
  {
    id: 'taste', level: 'medium', title: 'Taste', order: 1, comingSoon: false, unit: 19,
    words: ['SWEET', 'SOUR', 'SALTY', 'BITTER', 'SPICY', 'DELICIOUS', 'FRESH'],
  },
  // 19. Sound — unlocked this pass. QUIET and SILENT are the same
  // physical sign in ASL (context only) — see the "MEDIUM · SOUND"
  // SIGNS block comment before wiring SILENT into a graded detection
  // quiz. HIGH/LOW reuse the general elevation signs, applied to pitch.
  {
    id: 'sound', level: 'medium', title: 'Sound', order: 1, comingSoon: false, unit: 20,
    words: ['LOUD', 'QUIET', 'NOISY', 'SILENT', 'HIGH', 'LOW'],
  },
  // 20. Descriptions
  {
    id: 'descriptions', level: 'medium', title: 'Descriptions', order: 1, comingSoon: true, unit: 21,
    words: ['FAST', 'SLOW', 'STRONG', 'WEAK', 'GOOD', 'BAD', 'FULL', 'EMPTY', 'OPEN', 'CLOSED'],
  },
  // 21. Family
  // LEGACY id/content kept — this is real, TRAINED detection content
  // (MOM/DAD/BOY/GIRL/MARRIAGE/BROTHER/SISTER/GRANDMA/GRANDPA/AUNT/UNCLE/BABY/SINGLE/DIVORCED).
  // words[] below is the new plan's fuller Family list for the lesson-content
  // preview; the trained SIGNS set is unchanged and narrower — do not
  // delete/rename any 'family' SIGNS entries to 'match' this list.
  {
    id: 'family', level: 'medium', title: 'Family', order: 1, comingSoon: false, unit: 22,
    words: ['FAMILY', 'MOTHER', 'MOM', 'FATHER', 'DAD', 'BROTHER', 'SISTER', 'BABY', 'SON', 'DAUGHTER', 'PARENT', 'CHILD', 'GRANDMOTHER', 'GRANDMA', 'GRANDFATHER', 'GRANDPA', 'AUNT', 'UNCLE', 'COUSIN', 'GRANDCHILD'],
  },
  // 22. Home
  {
    id: 'home', level: 'medium', title: 'Home', order: 1, comingSoon: true, unit: 23,
    words: ['HOUSE', 'HOME', 'BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING', 'DINING', 'GARAGE', 'GARDEN', 'YARD'],
  },
  // 23. Furniture
  {
    id: 'furniture', level: 'medium', title: 'Furniture', order: 1, comingSoon: true, unit: 24,
    words: ['BED', 'PILLOW', 'BLANKET', 'CHAIR', 'TABLE', 'SOFA', 'DESK', 'SHELF', 'CABINET', 'CLOSET', 'LAMP'],
  },
  // 24. Household
  {
    id: 'household', level: 'medium', title: 'Household', order: 1, comingSoon: true, unit: 25,
    words: ['DOOR', 'WINDOW', 'WALL', 'FLOOR', 'ROOF', 'CLOCK', 'MIRROR', 'FAN', 'TV', 'REMOTE', 'PHONE', 'COMPUTER', 'BOOK', 'BAG', 'KEY', 'TOY'],
  },
  // 25. Bathroom
  {
    id: 'bathroom', level: 'medium', title: 'Bathroom', order: 1, comingSoon: true, unit: 26,
    words: ['TOILET', 'SHOWER', 'BATHTUB', 'SINK', 'SOAP', 'SHAMPOO', 'TOWEL', 'TOOTHBRUSH', 'TOOTHPASTE'],
  },
  // 26. Kitchen
  {
    id: 'kitchen', level: 'medium', title: 'Kitchen', order: 1, comingSoon: true, unit: 27,
    words: ['STOVE', 'OVEN', 'REFRIGERATOR', 'FREEZER', 'PLATE', 'BOWL', 'CUP', 'GLASS', 'SPOON', 'FORK', 'KNIFE', 'POT', 'PAN'],
  },
  // 27. School
  {
    id: 'school', level: 'medium', title: 'School', order: 1, comingSoon: false, unit: 28,
    words: ['TEACHER', 'STUDENT', 'PRINCIPAL', 'FRIEND', 'CLASSMATE', 'BOY', 'GIRL'],
  },
  // 28. School Supplies
  {
    id: 'school_supplies', level: 'medium', title: 'School Supplies', order: 1, comingSoon: false, unit: 29,
    // PEN removed — no dedicated ASLU sign; fingerspell P-E-N (existing Fingerspell feature covers this).
    words: ['BOOK', 'NOTEBOOK', 'PENCIL', 'ERASER', 'PAPER', 'CRAYON', 'MARKER', 'RULER', 'SCISSORS', 'GLUE', 'FOLDER', 'BACKPACK'],
  },
  // 29. Classroom
  {
    id: 'classroom', level: 'medium', title: 'Classroom', order: 1, comingSoon: false, unit: 30,
    words: ['DESK', 'CHAIR', 'TABLE', 'BOARD', 'DOOR', 'WINDOW', 'CLOCK', 'COMPUTER', 'SHELF', 'TRASH'],
  },
  // 30. Classroom Actions
  {
    id: 'classroom_actions', level: 'medium', title: 'Classroom Actions', order: 1, comingSoon: false, unit: 31,
    words: ['READ', 'WRITE', 'DRAW', 'COLOR', 'LISTEN', 'LOOK', 'SIT', 'STAND', 'ASK', 'ANSWER', 'OPEN', 'CLOSE', 'RAISE', 'LOWER', 'SHARE', 'HELP'],
  },
  // 31. Subjects
  {
    id: 'subjects', level: 'medium', title: 'Subjects', order: 1, comingSoon: false, unit: 32,
    // ART removed — identical clip to DRAW (ASLU: combine DRAW/ART with the person affix); use DRAW instead.
    // ENGLISH removed — no dedicated ASLU sign; fingerspell E-N-G-L-I-S-H (existing Fingerspell feature covers this).
    words: ['MATH', 'SCIENCE', 'MUSIC', 'HISTORY', 'COMPUTER'],
  },
  // 32. Food
  // LEGACY id kept (was already comingSoon:true, zero dictionary.js entries) —
  // words[] replaced wholesale with the new plan's Food list
  // (APPLE/MILK/COOKIE/CANDY moved out to the new 'fruits'/'drinks'/'snacks'
  // topics, matching the new plan's finer split).
  {
    id: 'food', level: 'medium', title: 'Food', order: 1, comingSoon: true, unit: 33,
    words: ['FOOD', 'RICE', 'BREAD', 'EGG', 'CHICKEN', 'FISH', 'MEAT', 'SOUP', 'CHEESE', 'NOODLES', 'SANDWICH', 'PIZZA', 'PASTA'],
  },
  // 33. Fruits
  {
    id: 'fruits', level: 'medium', title: 'Fruits', order: 1, comingSoon: true, unit: 34,
    words: ['APPLE', 'BANANA', 'ORANGE', 'MANGO', 'GRAPES', 'WATERMELON', 'PINEAPPLE', 'PAPAYA', 'STRAWBERRY', 'COCONUT', 'AVOCADO', 'PEAR', 'MELON'],
  },
  // 34. Vegetables
  {
    id: 'vegetables', level: 'medium', title: 'Vegetables', order: 1, comingSoon: true, unit: 35,
    words: ['CARROT', 'POTATO', 'TOMATO', 'ONION', 'GARLIC', 'CORN', 'PEA', 'BEAN', 'CABBAGE', 'LETTUCE', 'PUMPKIN', 'BROCCOLI', 'CUCUMBER'],
  },
  // 35. Snacks
  {
    id: 'snacks', level: 'medium', title: 'Snacks', order: 1, comingSoon: true, unit: 36,
    words: ['COOKIE', 'CAKE', 'CANDY', 'CHOCOLATE', 'DONUT', 'PIE', 'POPCORN', 'CHIPS', 'CUPCAKE', 'ICECREAM'],
  },
  // 36. Drinks
  {
    id: 'drinks', level: 'medium', title: 'Drinks', order: 1, comingSoon: true, unit: 37,
    words: ['WATER', 'MILK', 'JUICE', 'SODA', 'TEA', 'COFFEE'],
  },
  // 37. Animals
  // LEGACY id kept (was already comingSoon:true, zero dictionary.js entries) —
  // words[] replaced wholesale with the new plan's Animals list (BUG moved out
  // to the new 'insects' topic).
  {
    id: 'animals', level: 'medium', title: 'Animals', order: 1, comingSoon: true, unit: 38,
    words: ['DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'CHICKEN', 'DUCK', 'COW', 'PIG', 'HORSE', 'GOAT', 'SHEEP'],
  },
  // 38. Wild Animals
  {
    id: 'wild_animals', level: 'medium', title: 'Wild Animals', order: 1, comingSoon: true, unit: 39,
    words: ['LION', 'TIGER', 'ELEPHANT', 'MONKEY', 'GIRAFFE', 'BEAR', 'ZEBRA', 'SNAKE', 'FROG', 'TURTLE'],
  },
  // 39. Insects
  {
    id: 'insects', level: 'medium', title: 'Insects', order: 1, comingSoon: true, unit: 40,
    words: ['ANT', 'BUTTERFLY', 'BEE', 'SPIDER'],
  },
  // 40. Clothes
  // LEGACY id kept (was already comingSoon:true, zero dictionary.js entries) —
  // words[] replaced wholesale with the new plan's Clothes list (UNDERWEAR
  // dropped, SHORTS/DRESS/SKIRT/HAT/CAP/BELT added).
  {
    id: 'clothes', level: 'medium', title: 'Clothes', order: 1, comingSoon: true, unit: 41,
    words: ['SHIRT', 'PANTS', 'SHORTS', 'DRESS', 'SKIRT', 'SHOES', 'SOCKS', 'HAT', 'CAP', 'JACKET', 'COAT', 'BELT'],
  },
  // 41. Dressing
  {
    id: 'dressing', level: 'medium', title: 'Dressing', order: 1, comingSoon: true, unit: 42,
    words: ['WEAR', 'CHANGE', 'WASH', 'FOLD', 'CLEAN', 'DIRTY'],
  },
  // 42. Personal Items
  {
    id: 'personal_items', level: 'medium', title: 'Personal Items', order: 1, comingSoon: true, unit: 43,
    words: ['BAG', 'WALLET', 'PHONE', 'WATCH', 'GLASSES', 'KEY', 'UMBRELLA', 'BOTTLE'],
  },
  // 43. Nature
  {
    id: 'nature', level: 'medium', title: 'Nature', order: 1, comingSoon: true, unit: 44,
    words: ['SUN', 'MOON', 'STAR', 'SKY', 'CLOUD', 'RAIN', 'WIND', 'TREE', 'FLOWER', 'GRASS', 'LEAF', 'ROCK', 'SAND', 'MOUNTAIN', 'RIVER', 'LAKE', 'OCEAN', 'BEACH', 'ISLAND'],
  },
  // 44. Plants
  {
    id: 'plants', level: 'medium', title: 'Plants', order: 1, comingSoon: true, unit: 45,
    words: ['PLANT', 'TREE', 'FLOWER', 'GRASS', 'LEAF', 'ROOT', 'BRANCH', 'SEED', 'GARDEN', 'GROW', 'WATER', 'SOIL'],
  },
  // 45. Weather
  {
    id: 'weather', level: 'medium', title: 'Weather', order: 1, comingSoon: true, unit: 46,
    words: ['SUNNY', 'RAINY', 'CLOUDY', 'WINDY', 'STORMY', 'HOT', 'COLD', 'WARM', 'COOL', 'THUNDER', 'LIGHTNING', 'SNOW'],
  },
  // 46. Seasons
  {
    id: 'seasons', level: 'medium', title: 'Seasons', order: 1, comingSoon: true, unit: 47,
    words: ['SPRING', 'SUMMER', 'FALL', 'WINTER'],
  },
  // 47. Places
  // LEGACY id/content kept — this is real, TRAINED detection content for
  // HOME/SCHOOL/STORE/CHURCH (WORK/CAR/IN/OUT/WITH also trained but not on the
  // new plan's Places word list). words[] below is the new plan's fuller
  // Places list for the lesson-content preview; the trained SIGNS set is
  // unchanged.
  {
    id: 'places', level: 'medium', title: 'Places', order: 1, comingSoon: false, unit: 48,
    words: ['HOME', 'SCHOOL', 'PARK', 'STORE', 'MARKET', 'LIBRARY', 'HOSPITAL', 'RESTAURANT', 'ZOO', 'FARM', 'BEACH', 'CHURCH', 'BANK', 'AIRPORT'],
  },
  // 48. Vehicles
  {
    id: 'vehicles', level: 'medium', title: 'Vehicles', order: 1, comingSoon: true, unit: 49,
    words: ['CAR', 'BUS', 'TRUCK', 'VAN', 'TAXI', 'TRAIN', 'BIKE', 'MOTORCYCLE', 'AIRPLANE', 'BOAT', 'SHIP'],
  },
  // 49. Transportation
  {
    id: 'transportation', level: 'medium', title: 'Transportation', order: 1, comingSoon: true, unit: 50,
    words: ['WALK', 'RIDE', 'DRIVE', 'FLY', 'GO', 'STOP', 'WAIT'],
  },
  // 50. Professions
  {
    id: 'professions', level: 'medium', title: 'Professions', order: 1, comingSoon: true, unit: 51,
    words: ['TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'FARMER', 'DRIVER', 'COOK', 'CHEF', 'ENGINEER', 'DENTIST', 'MECHANIC', 'CARPENTER', 'LAWYER', 'SOLDIER', 'CASHIER', 'WAITER', 'ARTIST', 'WORKER', 'OWNER'],
  },
  // 51. Community
  {
    id: 'community', level: 'medium', title: 'Community', order: 1, comingSoon: true, unit: 52,
    words: ['SCHOOL', 'HOSPITAL', 'POLICE', 'FIRE', 'LIBRARY', 'BANK', 'MARKET', 'STORE', 'RESTAURANT', 'PARK'],
  },
  // 52. Time
  // LEGACY id/content kept — this is real, TRAINED detection content
  // (DAY/NIGHT/WEEK/MONTH/YEAR/WILL/BEFORE/NOW/TODAY/FINISH). words[] below is
  // the new plan's Time list for the lesson-content preview (adds
  // LATER/SOON/AFTER/EARLY/LATE/TOMORROW/YESTERDAY, none of which are trained
  // yet); the trained SIGNS set is unchanged.
  {
    id: 'time', level: 'medium', title: 'Time', order: 1, comingSoon: false, unit: 53,
    words: ['TIME', 'NOW', 'LATER', 'SOON', 'BEFORE', 'AFTER', 'EARLY', 'LATE', 'TODAY', 'TOMORROW', 'YESTERDAY'],
  },
  // 53. Daytime
  {
    id: 'daytime', level: 'medium', title: 'Daytime', order: 1, comingSoon: true, unit: 54,
    words: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
  },
  // 54. Days
  {
    id: 'days', level: 'medium', title: 'Days', order: 1, comingSoon: true, unit: 55,
    words: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  },
  // 55. Months
  {
    id: 'months', level: 'medium', title: 'Months', order: 1, comingSoon: true, unit: 56,
    words: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  },
  // 56. Sequence
  {
    id: 'sequence', level: 'medium', title: 'Sequence', order: 1, comingSoon: true, unit: 57,
    words: ['FIRST', 'SECOND', 'THIRD', 'NEXT', 'THEN', 'BEGINNING', 'MIDDLE', 'END', 'FINALLY', 'FINISHED'],
  },
  // 57. Frequency
  {
    id: 'frequency', level: 'medium', title: 'Frequency', order: 1, comingSoon: true, unit: 58,
    words: ['ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'NEVER', 'DAILY', 'WEEKLY', 'MONTHLY'],
  },
  // 58. Location
  {
    id: 'location', level: 'medium', title: 'Location', order: 1, comingSoon: true, unit: 59,
    words: ['IN', 'OUT', 'INSIDE', 'OUTSIDE', 'ON', 'UNDER', 'ABOVE', 'BELOW', 'FRONT', 'BACK', 'BEHIND', 'BESIDE', 'BETWEEN', 'NEXT'],
  },
  // 59. Distance
  {
    id: 'distance', level: 'medium', title: 'Distance', order: 1, comingSoon: true, unit: 60,
    words: ['NEAR', 'FAR', 'HERE', 'THERE', 'CLOSE', 'AWAY'],
  },
  // 60. Directions
  {
    id: 'directions', level: 'medium', title: 'Directions', order: 1, comingSoon: true, unit: 61,
    words: ['LEFT', 'RIGHT', 'UP', 'DOWN', 'FORWARD', 'BACK', 'TURN', 'GO', 'STOP', 'WAIT'],
  },
  // 61. Social
  {
    id: 'social', level: 'medium', title: 'Social', order: 1, comingSoon: true, unit: 62,
    words: ['FRIEND', 'CLASSMATE', 'NEIGHBOR', 'PLAY', 'TALK', 'SHARE', 'HELP', 'MEET', 'VISIT', 'LIKE', 'LOVE', 'TOGETHER'],
  },
  // 62. Manners
  {
    id: 'manners', level: 'medium', title: 'Manners', order: 1, comingSoon: true, unit: 63,
    words: ['PLEASE', 'THANKS', 'WELCOME', 'SORRY', 'EXCUSE', 'MAY', 'HELP'],
  },
  // 63. Turn-Taking
  {
    id: 'turn_taking', level: 'medium', title: 'Turn-Taking', order: 1, comingSoon: true, unit: 64,
    words: ['MY', 'YOUR', 'TURN', 'WAIT', 'GO', 'STOP', 'AGAIN', 'FINISHED'],
  },
  // 64. Responses
  {
    id: 'responses', level: 'medium', title: 'Responses', order: 1, comingSoon: true, unit: 65,
    words: ['YES', 'NO', 'OKAY', 'SURE', 'MAYBE', 'REALLY', 'GOOD', 'UNDERSTAND'],
  },
  // 65. Questions
  // LEGACY id/content kept, RETITLED 'Basic Responses' -> 'Questions' to match
  // the new plan's topic 65 — WHO/WHAT/WHERE/WHEN/WHY/HOW have disabled:true
  // dictionary.js placeholders, matching 6 of this topic's 10 words.
  // YES/NO/GOOD/BAD also live in THIS category's real SIGNS/dictionary content
  // (not shown in words[] below since they're not part of the new plan's
  // literal 'Questions' list) — see the new
  // 'responses'/'answers'/'polite_words' categories below for where those 4
  // words sit in the new plan; no SIGNS entries were moved or renamed.
  {
    id: 'essentials_basic_responses', level: 'medium', title: 'Questions', order: 1, comingSoon: false, unit: 66,
    words: ['WHO', 'WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW', 'WHICH', 'WHOSE', 'MANY', 'MUCH'],
  },
  // 66. Conversation
  {
    id: 'conversation', level: 'medium', title: 'Conversation', order: 1, comingSoon: true, unit: 67,
    words: ['HELLO', 'GOOD', 'FINE', 'NAME', 'NICE', 'MEET', 'THANKS', 'WELCOME', 'LATER', 'GOODBYE'],
  },
  // 67. Requests
  // id deliberately NOT 'requests' -- that id is already used by topic 7
  // 'Needs' (Everyday Essentials), which has real disabled:true dictionary
  // placeholders. Two different source-file topics are both titled
  // 'Requests'-ish (7='Needs', 67='Requests') -- kept as two categories,
  // not merged, matching the source file's own structure.
  {
    id: 'making_requests', level: 'medium', title: 'Requests', order: 1, comingSoon: true, unit: 68,
    words: ['HAVE', 'CAN', 'HELP', 'GIVE', 'PLEASE', 'WAIT', 'GO', 'WHERE', 'THIS', 'THAT'],
  },
  // 68. Answers
  {
    id: 'answers', level: 'medium', title: 'Answers', order: 1, comingSoon: true, unit: 69,
    words: ['YES', 'NO', 'OKAY', 'SURE', 'MAYBE', 'KNOW', 'DON\'T', 'UNDERSTAND', 'GOOD'],
  },

  // ── Legacy categories with real SIGNS content that the new plan
  // doesn't have a topic for. RESTORED here (not dropped) — verified
  // against the original data.js that each has authored lesson
  // content (title/description/tips), not just a words[] preview;
  // dropping the CATEGORIES entry would have made that content
  // permanently unreachable (getCategorySigns() filters by category,
  // and learn.js only offers categories it finds in this array) even
  // though the SIGNS entries themselves would still exist. Folded
  // into the closest-fit new unit as a SECOND category there (a unit
  // with >1 category already renders a category-list screen — see
  // 'family'/'places'/'time' etc. above for the same one-unit-many-
  // categories pattern from Rev 6). None of these are Phase 7
  // detection content (comingSoon stays as it was) — this is a
  // content-placement fix only, id/words/level/comingSoon all
  // unchanged from the pre-existing file.
  // REV 8 (2026-08-25): 'SLEEP' and 'NICE/CLEAN' removed from words[] — their
  // SIGNS entries were relocated to 'actions' (Unit 9, as SLEEP and CLEAN)
  // since 'actions' words[] already called for both.
  // Unlocked this pass — WASH/HURT/BRUSH TEETH already had complete SIGNS
  // entries (medium_health_WASH/HURT/BRUSH_TEETH), just never flipped.
  {
    id: 'health', level: 'medium', title: 'Health', order: 2, comingSoon: false, unit: 42,
    words: ['WASH', 'HURT', 'BRUSH TEETH'],
  },
  // No topic in the new plan is even a loose fit for Money — placed
  // alongside Personal Items (closest available theme: wallet/cost)
  // rather than invented a 73rd unit for 3 words. Flagging this one
  // for a second look/better home if Omen wants one.
  // Unlocked this pass — DOLLARS/CENTS/COST already had complete SIGNS
  // entries, just never flipped.
  {
    id: 'money', level: 'medium', title: 'Money', order: 2, comingSoon: false, unit: 43,
    words: ['DOLLARS', 'CENTS', 'COST'],
  },

  // ── Basic Phrases (unit 70) — UNCHANGED from Rev 6, see UNITS header
  // note. Real TRAINED content, built only from already-trained words.
  {
    id: 'sequence_demo', level: 'medium', title: 'Basic Phrases', order: 100, comingSoon: false, unit: 70,
    words: ['MOM_HOME', 'DAD_WORK', 'TODAY_SCHOOL', 'FINISH_WORK', 'SISTER_STORE', 'TODAY_GRANDMA_HOME'],
  },

  // ── level=intermediate — Phrasebook (unit 71) — UNCHANGED from Rev 6
  // other than the unit number (was 10, now 71 — every other field
  // identical). Read-only reference, not graded, no SIGN_DICTIONARY
  // entries. See file's original header note (kept below unedited).
  // Level 2 — Basic (Common Phrases), Modules 1–8
  {
    id: 'greetings_intro', level: 'intermediate', title: 'Greetings & Introductions', order: 1, comingSoon: false, unit: 71,
    words: ['GOOD MORNING', 'GOOD AFTERNOON', 'GOOD EVENING', 'NICE TO MEET YOU', "WHAT'S YOUR NAME?", 'MY NAME IS ___'],
  },
  {
    id: 'basic_responses', level: 'intermediate', title: 'Basic Responses', order: 2, comingSoon: false, unit: 71,
    words: ['I AM FINE', 'I AM GOOD', 'NOT BAD', 'MAYBE LATER', "I DON'T KNOW"],
  },
  {
    id: 'family_phrases', level: 'intermediate', title: 'Family Phrases', order: 3, comingSoon: false, unit: 71,
    words: ['MY MOTHER', 'MY FATHER', 'MY BROTHER', 'MY SISTER', 'MY FRIEND'],
  },
  {
    id: 'daily_needs', level: 'intermediate', title: 'Daily Needs', order: 4, comingSoon: false, unit: 71,
    words: ['I AM HUNGRY', 'I AM THIRSTY', 'I AM TIRED', 'I NEED HELP', 'I NEED WATER', 'I NEED FOOD'],
  },
  {
    id: 'asking_questions', level: 'intermediate', title: 'Asking Questions', order: 5, comingSoon: false, unit: 71,
    words: ['HOW ARE YOU?', "WHAT'S UP?", 'HOW OLD ARE YOU?', 'WHERE DO YOU LIVE?', 'WHAT TIME?', 'CAN YOU HELP?', 'CAN I GO?'],
  },
  {
    id: 'polite_expressions', level: 'intermediate', title: 'Polite Expressions', order: 6, comingSoon: false, unit: 71,
    words: ['THANK YOU', "YOU'RE WELCOME", 'EXCUSE ME', 'HAVE A NICE DAY', 'SEE YOU LATER'],
  },
  {
    id: 'affection_feelings', level: 'intermediate', title: 'Affection & Feelings', order: 7, comingSoon: false, unit: 71,
    words: ['I LOVE YOU', 'I LIKE YOU', 'I MISS YOU', 'HAPPY BIRTHDAY', "I DON'T LIKE IT", "I DON'T LIKE YOU", 'I HATE IT', 'LEAVE ME ALONE'],
  },
  {
    id: 'describing_things', level: 'intermediate', title: 'Describing Things', order: 8, comingSoon: false, unit: 71,
    words: ['RED CAR', 'BLUE SHIRT', 'GREEN TREE', 'BIG HOUSE', 'SMALL DOG', 'GOOD JOB', 'BAD DAY'],
  },

  // Level 3 — Intermediate (Everyday Sentences & Conversations), Modules 1–10
  {
    id: 'self_introduction', level: 'intermediate', title: 'Self Introduction', order: 9, comingSoon: false, unit: 71,
    words: ['HELLO, MY NAME IS ___.', 'NICE TO MEET YOU.', 'I AM ___ YEARS OLD.', 'I LIVE IN ___.', 'I AM A STUDENT.'],
  },
  {
    id: 'daily_activities', level: 'intermediate', title: 'Daily Activities', order: 10, comingSoon: false, unit: 71,
    words: ['I WAKE UP EARLY.', 'I GO TO SCHOOL.', 'I STUDY EVERY DAY.', 'I EAT BREAKFAST.', 'I GO HOME AFTER SCHOOL.', 'I SLEEP AT 10 PM.'],
  },
  {
    id: 'family_conversations', level: 'intermediate', title: 'Family Conversations', order: 11, comingSoon: false, unit: 71,
    words: ['I HAVE TWO BROTHERS.', 'MY MOTHER WORKS AT HOME.', 'MY FATHER IS A TEACHER.', 'I LOVE MY FAMILY.'],
  },
  {
    id: 'talking_about_feelings', level: 'intermediate', title: 'Talking About Feelings', order: 12, comingSoon: false, unit: 71,
    words: ['I AM HAPPY TODAY.', 'I AM NERVOUS.', 'I FEEL TIRED.', 'I AM EXCITED FOR TOMORROW.', 'I AM WORRIED ABOUT SCHOOL.'],
  },
  {
    id: 'asking_for_help', level: 'intermediate', title: 'Asking for Help', order: 13, comingSoon: false, unit: 71,
    words: ['CAN YOU HELP ME?', 'WHERE IS THE RESTROOM?', 'I NEED ASSISTANCE.', 'PLEASE REPEAT THAT.', "I DON'T UNDERSTAND."],
  },
  {
    id: 'school_conversations', level: 'intermediate', title: 'School Conversations', order: 14, comingSoon: false, unit: 71,
    words: ['WHAT IS YOUR FAVORITE SUBJECT?', 'MY FAVORITE SUBJECT IS ENGLISH.', 'WHEN IS THE EXAM?', 'I FINISHED MY ASSIGNMENT.', 'THE LESSON IS DIFFICULT.'],
  },
  {
    id: 'shopping_ordering', level: 'intermediate', title: 'Shopping & Ordering', order: 15, comingSoon: false, unit: 71,
    words: ['HOW MUCH IS THIS?', 'I WANT TO BUY THIS.', 'DO YOU HAVE ANOTHER COLOR?', 'WHERE IS THE CASHIER?', 'THANK YOU FOR YOUR HELP.'],
  },
  {
    id: 'social_conversations', level: 'intermediate', title: 'Social Conversations', order: 16, comingSoon: false, unit: 71,
    words: ['WHAT ARE YOU DOING TODAY?', 'I AM GOING WITH MY FRIENDS.', 'WOULD YOU LIKE TO JOIN US?', "THAT'S A GOOD IDEA.", 'SEE YOU TOMORROW.'],
  },
  {
    id: 'emergency_situations', level: 'intermediate', title: 'Emergency & Important Situations', order: 17, comingSoon: false, unit: 71,
    words: ['I NEED HELP.', 'CALL THE POLICE.', 'CALL AN AMBULANCE.', 'I AM LOST.', 'WHERE IS THE HOSPITAL?', 'THIS IS AN EMERGENCY.'],
  },
  {
    id: 'everyday_dialogues', level: 'intermediate', title: 'Short Everyday Dialogues', order: 18, comingSoon: false, unit: 71,
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

  /* ── MEDIUM · SCHOOL GROUP (Units 28–32) ──────────────────────
   * Lesson content for the School group's Batch 3b words that had
   * no description/tips yet. TEACHER/STUDENT/FRIEND/CLASSMATE/BOOK/
   * NOTEBOOK/ERASER/MARKER/GLUE/FOLDER/DESK/CHAIR/TABLE/DOOR/WINDOW/
   * CLOCK/SHELF/READ/WRITE/DRAW/COLOR/LISTEN/LOOK/SIT/STAND/ASK/
   * ANSWER/OPEN/RAISE/LOWER/SHARE still have no SIGNS entry in this
   * file — BOY/GIRL (family) and HELP (requests) are already covered
   * under their existing categories and don't need duplicates. */
  {
    id: 'medium_school_PRINCIPAL', level: 'medium', category: 'school', signId: 'PRINCIPAL', title: 'Principal', order: 1,
    description: 'Form a "P" handshape with your dominant hand and hold your non-dominant hand flat, palm down, in front of you. Circle the "P" above your non-dominant hand, then bring it down to rest on the back of that hand.',
    tips: [
      'Dominant hand makes a clear "P" shape',
      'Circle above the non-dominant palm before landing',
      'Let the "P" settle down onto the back of the hand',
    ],
    imageUrl: '../assets/images/medium/school/PRINCIPAL.png', videoUrl: '../assets/videos/medium/school/PRINCIPAL.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_PAPER', level: 'medium', category: 'school_supplies', signId: 'PAPER', title: 'Paper', order: 1,
    description: 'Hold your non-dominant hand flat, palm up. Strike it with the back of your dominant flat hand, then repeat the motion — like brushing a sheet of paper off a stack.',
    tips: [
      'Non-dominant palm stays flat and steady, facing up',
      'Dominant hand strikes it with a brushing motion',
      'Repeat the strike a second time',
    ],
    imageUrl: '../assets/images/medium/school_supplies/PAPER.png', videoUrl: '../assets/videos/medium/school_supplies/PAPER.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_PENCIL', level: 'medium', category: 'school_supplies', signId: 'PENCIL', title: 'Pencil', order: 2,
    description: 'Pinch your dominant thumb and index finger together as if holding a pencil, and touch them near your lips. Then bring your hand down and "write" a short motion across your non-dominant palm.',
    tips: [
      'Pinch thumb and index finger like holding a tiny pencil',
      'Touch near your lips first',
      'Finish with a quick writing motion on your other palm',
    ],
    imageUrl: '../assets/images/medium/school_supplies/PENCIL.png', videoUrl: '../assets/videos/medium/school_supplies/PENCIL.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_SCISSORS', level: 'medium', category: 'school_supplies', signId: 'SCISSORS', title: 'Scissors', order: 3,
    description: 'Hold up your dominant hand in a "V" handshape (index and middle finger spread) so it looks like an open pair of scissors. Open and close the two fingers twice, like taking two quick snips.',
    tips: [
      'Fingers form a clear "V" shape',
      'Movement is a snipping open-close, not a wave',
      'Two quick snips is enough',
    ],
    imageUrl: '../assets/images/medium/school_supplies/SCISSORS.png', videoUrl: '../assets/videos/medium/school_supplies/SCISSORS.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_RULER', level: 'medium', category: 'school_supplies', signId: 'RULER', title: 'Ruler', order: 4,
    description: 'Start with the sign for MEASURE, then switch to "G" handshapes (thumb and index finger pinched) on both hands. Trace the straight edges of a ruler by pulling the "G"-hands apart from the middle out to each side.',
    tips: [
      'Lead with the MEASURE motion so the meaning is clear',
      'Switch to pinched "G" hands for the outline',
      'Trace from the center outward to each side',
    ],
    imageUrl: '../assets/images/medium/school_supplies/RULER.png', videoUrl: '../assets/videos/medium/school_supplies/RULER.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_BACKPACK', level: 'medium', category: 'school_supplies', signId: 'BACKPACK', title: 'Backpack', order: 5,
    description: 'Form both hands into loose "C" shapes over your shoulders. Bring them down twice so the backs of your thumbs tap the area between your neck and shoulders, like feeling the straps of a backpack.',
    tips: [
      'Both hands start above the shoulders in a "C" shape',
      'Motion is a light double tap, not a hard pat',
      'Thumbs land near the collarbone',
    ],
    imageUrl: '../assets/images/medium/school_supplies/BACKPACK.png', videoUrl: '../assets/videos/medium/school_supplies/BACKPACK.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_school_supplies_CRAYON', level: 'medium', category: 'school_supplies', signId: 'CRAYON', title: 'Crayon', order: 6,
    // Compound sign — reuses COLOR + a modified ART/DRAW motion. COLOR (noun/verb) itself
    // has no SIGNS entry yet either; flag for the team before treating this as fully self-contained.
    description: 'Sign COLOR first, then modify the sign for ART/DRAW: rub your pinkie finger side-to-side against your non-dominant palm, as if coloring with a small crayon tip.',
    tips: [
      'Start clearly with the COLOR handshape',
      'Switch to a small pinkie-only rubbing motion',
      'Keep the second part small and controlled',
    ],
    imageUrl: '../assets/images/medium/school_supplies/CRAYON.png', videoUrl: '../assets/videos/medium/school_supplies/CRAYON.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_classroom_TRASH', level: 'medium', category: 'classroom', signId: 'TRASH', title: 'Trash', order: 1,
    // ASLU glosses this sign GARBAGE.
    description: 'Lay your non-dominant forearm flat in front of you, palm down, to act like the rim of a bag. Trace the outline of a hanging trash bag underneath it with your dominant hand in a loose fist/"U" shape.',
    tips: [
      'Non-dominant arm stays flat and still, like a frame',
      'Dominant hand traces a bag-like curve underneath it',
      'Keep the motion smooth, like tracing a shape once',
    ],
    imageUrl: '../assets/images/medium/classroom/TRASH.png', videoUrl: '../assets/videos/medium/classroom/TRASH.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_subjects_MATH', level: 'medium', category: 'subjects', signId: 'MATH', title: 'Math', order: 1,
    description: 'Form both hands into "M" handshapes (thumb tucked under three fingers) and tap or brush them together twice in front of you.',
    tips: [
      'Both hands hold a clean "M" handshape',
      'Motion is a light double tap, not a big swing',
      'Keep the hands close together in neutral space',
    ],
    imageUrl: '../assets/images/medium/subjects/MATH.png', videoUrl: '../assets/videos/medium/subjects/MATH.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_subjects_SCIENCE', level: 'medium', category: 'subjects', signId: 'SCIENCE', title: 'Science', order: 2,
    description: 'Hold both hands in loose fist ("A") shapes near waist height, as if holding two small beakers. Alternate tilting them up and down, like pouring chemicals from one container into another.',
    tips: [
      'Both hands stay loosely fisted, like holding beakers',
      'Alternate tilting — one up while the other tips down',
      'Keep the motion at waist/chest height',
    ],
    imageUrl: '../assets/images/medium/subjects/SCIENCE.png', videoUrl: '../assets/videos/medium/subjects/SCIENCE.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_subjects_MUSIC', level: 'medium', category: 'subjects', signId: 'MUSIC', title: 'Music', order: 3,
    description: 'Hold your non-dominant forearm flat and horizontal in front of your body. Wave your dominant open hand back and forth just above it, like a conductor leading an orchestra.',
    tips: [
      'Non-dominant forearm stays flat and still, like a stage',
      'Dominant hand waves smoothly above it',
      'Let the motion flow — this is a graceful sign',
    ],
    imageUrl: '../assets/images/medium/subjects/MUSIC.png', videoUrl: '../assets/videos/medium/subjects/MUSIC.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_subjects_HISTORY', level: 'medium', category: 'subjects', signId: 'HISTORY', title: 'History', order: 4,
    description: 'Form an "H" handshape with your dominant hand, fingers pointing forward and palm facing sideways. Move the hand downward twice, with a slightly bent wrist, near the side of your body.',
    tips: [
      'Keep a crisp "H" handshape (index + middle finger together)',
      'Two downward movements, not a circle',
      'Slightly bend the wrist on each downward motion',
    ],
    imageUrl: '../assets/images/medium/subjects/HISTORY.png', videoUrl: '../assets/videos/medium/subjects/HISTORY.mp4', detectionType: 'motion',
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

  /* ── MEDIUM · PEOPLE (Unit 6) ─────────────────────────────────
   * BOY/GIRL/BABY already covered under 'family' — not duplicated here.
   * REV 8 (2026-08-25): I/HE/SHE resolved — removed from words[] above
   * rather than given entries here. 'I' is the same physical sign as
   * 'ME' (see medium_people_ME's tips below); 'HE'/'SHE' are both done
   * by pointing at an established referent, not a distinct handshape,
   * so no separate visual description exists to give them. */
  {
    id: 'medium_people_ME', level: 'medium', category: 'people', signId: 'ME', title: 'Me', order: 1,
    // Also covers "I" — same physical sign in ASL (see block comment above).
    description: 'Point your index finger at your own chest, or touch your index fingertip to your chest.',
    tips: [
      'Point directly at your own chest/sternum',
      'A single touch or point is enough — no repeated motion',
      'Also used for "I" — ASL doesn\u2019t use a separate sign for it',
    ],
    imageUrl: '../assets/images/medium/people/me.png', videoUrl: '../assets/videos/medium/people/me.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_MY', level: 'medium', category: 'people', signId: 'MY', title: 'My', order: 2,
    description: 'Place your flat, open dominant hand on the center of your chest, palm facing in.',
    tips: [
      'Handshape is flat ("B" hand), not a fist',
      'Palm rests against your own chest',
      'A single touch — no repeated motion',
    ],
    imageUrl: '../assets/images/medium/people/my.png', videoUrl: '../assets/videos/medium/people/my.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_YOU', level: 'medium', category: 'people', signId: 'YOU', title: 'You', order: 3,
    description: 'Point your index finger directly at the person you\u2019re talking to.',
    tips: [
      'Aim the point at the actual person, not off to the side',
      'A single clear point is enough',
      'Eye contact with the person reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/people/you.png', videoUrl: '../assets/videos/medium/people/you.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_YOUR', level: 'medium', category: 'people', signId: 'YOUR', title: 'Your', order: 4,
    description: 'Push your flat, open dominant hand outward, palm facing the person you\u2019re talking to.',
    tips: [
      'Handshape is flat ("B" hand), not a point',
      'Palm faces toward the other person, not toward you',
      'A short outward push is enough',
    ],
    imageUrl: '../assets/images/medium/people/your.png', videoUrl: '../assets/videos/medium/people/your.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_MAN', level: 'medium', category: 'people', signId: 'MAN', title: 'Man', order: 5,
    description: 'Touch the thumb of an open hand to your forehead (like tipping an imaginary hat brim), then bring the hand down and touch the thumb to your chest.',
    tips: [
      'Two touches: forehead first, then chest',
      'Handshape stays open ("5" hand) the whole time',
      'Combines the "hat brim" location from BOY with the chest location',
    ],
    imageUrl: '../assets/images/medium/people/man.png', videoUrl: '../assets/videos/medium/people/man.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_WOMAN', level: 'medium', category: 'people', signId: 'WOMAN', title: 'Woman', order: 6,
    description: 'Touch the thumb of an open hand to your chin/jawline, then bring the hand down and touch the thumb to your chest.',
    tips: [
      'Two touches: chin first, then chest',
      'Handshape stays open ("5" hand) the whole time',
      'Combines the chin location from GIRL with the chest location',
    ],
    imageUrl: '../assets/images/medium/people/woman.png', videoUrl: '../assets/videos/medium/people/woman.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_PERSON', level: 'medium', category: 'people', signId: 'PERSON', title: 'Person', order: 7,
    description: 'Hold both flat hands in front of your body, palms facing each other, and move them straight down together, tracing the outline of a standing figure.',
    tips: [
      'Both hands move together, palms facing each other',
      'Motion is a straight downward line, not a curve',
      'This is the "person" suffix used on many profession signs',
    ],
    imageUrl: '../assets/images/medium/people/person.png', videoUrl: '../assets/videos/medium/people/person.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_CHILD', level: 'medium', category: 'people', signId: 'CHILD', title: 'Child', order: 8,
    description: 'Hold your flat dominant hand palm-down at about waist/hip height, then pat downward once or twice, as if patting the head of a small child.',
    tips: [
      'Palm faces down the whole time',
      'Height stays low, around hip level',
      'A light patting motion, not a big wave',
    ],
    imageUrl: '../assets/images/medium/people/child.png', videoUrl: '../assets/videos/medium/people/child.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_FRIEND', level: 'medium', category: 'people', signId: 'FRIEND', title: 'Friend', order: 9,
    description: 'Hook your index fingers together, then reverse and hook them together the other way — like two links of a chain interlocking.',
    tips: [
      'Both hands use a hooked index-finger ("X") handshape',
      'Hook, then flip and hook again the opposite way',
      'Keep the motion small and centered in front of you',
    ],
    imageUrl: '../assets/images/medium/people/friend.png', videoUrl: '../assets/videos/medium/people/friend.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_TEACHER', level: 'medium', category: 'people', signId: 'TEACHER', title: 'Teacher', order: 10,
    description: 'Sign TEACH — both open "flat-O" hands near the forehead, moving forward and out twice, as if handing knowledge outward — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'TEACH motion happens near the forehead/temple',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Together they form "teach" + "person" = teacher',
    ],
    imageUrl: '../assets/images/medium/people/teacher.png', videoUrl: '../assets/videos/medium/people/teacher.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_people_STUDENT', level: 'medium', category: 'people', signId: 'STUDENT', title: 'Student', order: 11,
    description: 'Sign LEARN — fingertips of a "flat-O" hand pick up information from your non-dominant palm and touch it to your forehead — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'LEARN motion goes from the open palm up to the forehead',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Together they form "learn" + "person" = student',
    ],
    imageUrl: '../assets/images/medium/people/student.png', videoUrl: '../assets/videos/medium/people/student.mp4', detectionType: 'motion',
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
  {
    id: 'medium_feelings_SCARED', level: 'medium', category: 'feelings', signId: 'SCARED', title: 'Scared', order: 10,
    // ASLU glosses this sign AFRAID.
    description: 'Cross both "S" (fist) hands in front of your chest, then quickly pull them apart and open into "5" hands, with a startled facial expression.',
    tips: [
      'Start with both hands as fists, crossed at the chest',
      'Pull apart sharply while opening into "5" hands',
      'A wide-eyed, startled expression completes the sign',
    ],
    imageUrl: '../assets/images/medium/feelings/scared.png', videoUrl: '../assets/videos/medium/feelings/scared.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_EXCITED', level: 'medium', category: 'feelings', signId: 'EXCITED', title: 'Excited', order: 11,
    description: 'Hold both hands in front of your chest with bent middle fingers, and brush them alternately up your chest, like HAPPY but quicker and using a bent-finger handshape.',
    tips: [
      'Middle finger is bent, not a flat palm like HAPPY',
      'Hands alternate brushing upward, one after the other',
      'A bright, energetic facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/excited.png', videoUrl: '../assets/videos/medium/feelings/excited.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_TIRED', level: 'medium', category: 'feelings', signId: 'TIRED', title: 'Tired', order: 12,
    description: 'Hold both bent hands with fingertips touching your upper chest/collarbone, then let them droop downward and slightly outward, shoulders relaxing.',
    tips: [
      'Fingertips start touching the upper chest',
      'The drooping motion is what carries the meaning',
      'Let your shoulders and expression sag slightly too',
    ],
    imageUrl: '../assets/images/medium/feelings/tired.png', videoUrl: '../assets/videos/medium/feelings/tired.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_SLEEPY', level: 'medium', category: 'feelings', signId: 'SLEEPY', title: 'Sleepy', order: 13,
    description: 'Hold an open hand in front of your face and draw it downward, closing the fingers into a loose fist near your chin as your eyes droop half-closed.',
    tips: [
      'Hand starts open, near the top of the face',
      'Fingers close together as the hand moves down',
      'Half-closing your eyes reinforces the sleepy expression',
    ],
    imageUrl: '../assets/images/medium/feelings/sleepy.png', videoUrl: '../assets/videos/medium/feelings/sleepy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_THIRSTY', level: 'medium', category: 'feelings', signId: 'THIRSTY', title: 'Thirsty', order: 14,
    description: 'Draw your index finger straight down the front of your throat.',
    tips: [
      'Contact point is the throat, not the chin or chest',
      'One smooth downward stroke',
      'Index finger only, other fingers curled in',
    ],
    imageUrl: '../assets/images/medium/feelings/thirsty.png', videoUrl: '../assets/videos/medium/feelings/thirsty.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_SICK', level: 'medium', category: 'feelings', signId: 'SICK', title: 'Sick', order: 15,
    description: 'Bend the middle finger of each hand into a claw shape. Touch one middle fingertip to your forehead and the other to your stomach, at the same time.',
    tips: [
      'Both hands use the same bent middle-finger handshape',
      'One hand touches the forehead, the other the stomach',
      'Both touches happen simultaneously, not one after the other',
    ],
    imageUrl: '../assets/images/medium/feelings/sick.png', videoUrl: '../assets/videos/medium/feelings/sick.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_FINE', level: 'medium', category: 'feelings', signId: 'FINE', title: 'Fine', order: 16,
    description: 'Touch the thumb of an open "5" hand to the center of your chest.',
    tips: [
      'Handshape is an open "5" hand, thumb leading',
      'A single touch to the chest is enough',
      'A neutral or slight smile fits the "I\u2019m fine" meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/fine.png', videoUrl: '../assets/videos/medium/feelings/fine.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_BORED', level: 'medium', category: 'feelings', signId: 'BORED', title: 'Bored', order: 17,
    // Often paired with a flat, unimpressed facial expression.
    description: 'Touch the tip of your index finger to the side of your nose and give it a small twist, keeping your face flat and unimpressed.',
    tips: [
      'Index finger touches the side of the nose, not the tip',
      'A small twisting motion, not a poke',
      'A deliberately flat, uninterested expression matches the meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/bored.png', videoUrl: '../assets/videos/medium/feelings/bored.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_WORRIED', level: 'medium', category: 'feelings', signId: 'WORRIED', title: 'Worried', order: 18,
    description: 'Hold both flat hands near your face and circle them alternately, one rising while the other falls, with a furrowed, concerned expression.',
    tips: [
      'Hands move opposite each other — one up while one goes down',
      'Keep the circles small, close to the face',
      'A furrowed brow completes the meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/worried.png', videoUrl: '../assets/videos/medium/feelings/worried.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_NERVOUS', level: 'medium', category: 'feelings', signId: 'NERVOUS', title: 'Nervous', order: 19,
    description: 'Hold both bent "5" hands out in front of your body and shake them with a small, rapid trembling motion.',
    tips: [
      'Handshape is bent/claw-like, not fully open',
      'The shake is quick and small — like a jitter, not a wave',
      'A tense, uneasy expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/feelings/nervous.png', videoUrl: '../assets/videos/medium/feelings/nervous.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_feelings_OKAY', level: 'medium', category: 'feelings', signId: 'OKAY', title: 'Okay', order: 20,
    // ASLU note: commonly fingerspelled O-K, or signed with the informal OK handshape below.
    description: 'Form an "OK" handshape (thumb and index finger touching in a circle, other three fingers extended up) and hold it out in front of you, or fingerspell O-K.',
    tips: [
      'Thumb and index finger form a small circle',
      'Other three fingers stay extended and relaxed',
      'Fingerspelling O-K is an equally common alternative',
    ],
    imageUrl: '../assets/images/medium/feelings/okay.png', videoUrl: '../assets/videos/medium/feelings/okay.mp4', detectionType: 'motion',
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
    id: 'medium_requests_MORE', level: 'medium', category: 'requests', signId: 'MORE', title: 'More', order: 20,
    description: 'Bring the fingertips of both hands together, bunched into flat ‘O’ shapes, and tap them together twice.',
    tips: [
      'Both hands bunch into the same shape',
      'Fingertips meet in the middle',
      'Two clear taps',
    ],
    imageUrl: '../assets/images/medium/requests/more.png', videoUrl: '../assets/videos/medium/requests/more.mp4', detectionType: 'motion',
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

  /* ── MEDIUM · ACTIONS (Unit 9) ──────────────────────────────────
   * REV 8 (2026-08-25): new block. GO/COME/STOP/DRINK/SLEEP/CRY are
   * relocated entries (content unchanged from their old category, only
   * id/category/order updated — see each entry's own note for where it
   * came from). CLEAN reuses the old 'health' NICE/CLEAN entry (same
   * physical sign, per the BATHROOM/RESTROOM no-duplicate-signs
   * precedent). Everything else is new, ASLU-checked (lifeprint.com)
   * content added this session. All entries added with matching
   * disabled:true dictionary.js placeholders — see that file. */
  {
    // RELOCATED (this session) — was 'medium_places_GO', category:'requests'.
    // Content unchanged. 'requests' words[] never actually claimed this
    // word, so nothing else loses coverage by moving it here.
    id: 'medium_actions_GO', level: 'medium', category: 'actions', signId: 'GO', title: 'Go', order: 1,
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body — the reverse of COME',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/actions/go.png', videoUrl: '../assets/videos/medium/actions/go.mp4', detectionType: 'motion',
  },
  {
    // RELOCATED (this session) — was 'medium_places_COME', category:'requests'.
    // Content unchanged. 'requests' words[] never actually claimed this word.
    id: 'medium_actions_COME', level: 'medium', category: 'actions', signId: 'COME', title: 'Come', order: 2,
    description: 'Point both index fingers up with palms facing you, and rotate them inward toward your body.',
    tips: [
      'Palms face you, both index fingers extended',
      'Motion pulls inward, toward your body',
      'This is a MOTION sign',
    ],
    imageUrl: '../assets/images/medium/actions/come.png', videoUrl: '../assets/videos/medium/actions/come.mp4', detectionType: 'motion',
  },
  {
    // RELOCATED (this session) — was 'medium_requests_STOP', category:'requests'.
    // Content unchanged. 'requests' words[] never actually claimed this word.
    id: 'medium_actions_STOP', level: 'medium', category: 'actions', signId: 'STOP', title: 'Stop', order: 3,
    description: 'Hold your non-dominant hand flat, palm up, and chop the edge of your dominant flat hand down onto it in one sharp motion.',
    tips: [
      'Base hand stays flat and still',
      'One sharp, decisive chopping motion',
      'Contact is the edge (pinky-side) of the dominant hand',
    ],
    imageUrl: '../assets/images/medium/actions/stop.png', videoUrl: '../assets/videos/medium/actions/stop.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_WAIT', level: 'medium', category: 'actions', signId: 'WAIT', title: 'Wait', order: 4,
    description: 'Hold both hands up in front of you with fingers loosely bent and spread, and wiggle your fingers.',
    tips: [
      'Fingers stay loose and bent (not a fist, not flat)',
      'Wiggle the fingers gently, hands mostly still',
      'This is a held sign more than a big motion',
    ],
    imageUrl: '../assets/images/medium/actions/wait.png', videoUrl: '../assets/videos/medium/actions/wait.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wait.htm',
  },
  {
    id: 'medium_actions_SIT', level: 'medium', category: 'actions', signId: 'SIT', title: 'Sit', order: 5,
    description: 'Hold both hands in a bent, two-finger \u2018H\u2019 shape (like two bent legs), and rest the fingers of your dominant hand down on top of your non-dominant hand\u2019s fingers.',
    tips: [
      'Both hands use the same bent two-finger shape',
      'The dominant hand lands on top of the stationary hand',
      'One clear downward landing motion',
    ],
    imageUrl: '../assets/images/medium/actions/sit.png', videoUrl: '../assets/videos/medium/actions/sit.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sit.htm',
  },
  {
    id: 'medium_actions_STAND', level: 'medium', category: 'actions', signId: 'STAND', title: 'Stand', order: 6,
    description: 'Hold your non-dominant hand flat, palm up. Stand the first two fingers of your dominant hand (like two legs, pointing down) upright on your palm.',
    tips: [
      'Dominant hand points its fingers downward, like legs',
      'Base hand stays flat, palm up, the whole time',
      'The \u2018legs\u2019 rest in place — no walking motion',
    ],
    imageUrl: '../assets/images/medium/actions/stand.png', videoUrl: '../assets/videos/medium/actions/stand.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_WALK', level: 'medium', category: 'actions', signId: 'WALK', title: 'Walk', order: 7,
    description: 'Hold both flat hands, palms down, out in front of you and move them alternately forward, like two feet walking.',
    tips: [
      'Both hands stay flat, palms facing down',
      'Alternate which hand moves forward',
      'The rhythm mimics footsteps',
    ],
    imageUrl: '../assets/images/medium/actions/walk.png', videoUrl: '../assets/videos/medium/actions/walk.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_RUN', level: 'medium', category: 'actions', signId: 'RUN', title: 'Run', order: 8,
    description: 'Hook the bent index finger of your dominant \u2018L\u2019 hand onto the thumb of your non-dominant \u2018L\u2019 hand, then move both hands forward quickly while your index finger flicks.',
    tips: [
      'Both hands form an \u2018L\u2019 handshape',
      'The dominant hand\u2019s index finger hooks onto the other hand\u2019s thumb',
      'Move forward with a quick, energetic motion',
    ],
    imageUrl: '../assets/images/medium/actions/run.png', videoUrl: '../assets/videos/medium/actions/run.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_JUMP', level: 'medium', category: 'actions', signId: 'JUMP', title: 'Jump', order: 9,
    description: 'Rest the fingertips of your bent \u2018V\u2019 hand (like two legs) on your flat non-dominant palm, then hop the \u2018V\u2019 hand up and back down.',
    tips: [
      'Dominant hand uses a bent \u2018V\u2019 shape for legs',
      'Base hand stays flat, acting as the ground',
      'A quick up-and-down hopping motion',
    ],
    imageUrl: '../assets/images/medium/actions/jump.png', videoUrl: '../assets/videos/medium/actions/jump.mp4', detectionType: 'motion',
  },
  {
    // Same physical sign as medium_requests_FOOD (ASL doesn't distinguish
    // the noun "food" from the verb "eat") — this is not a fabricated
    // second sign, just a second word/lesson entry for the same sign.
    id: 'medium_actions_EAT', level: 'medium', category: 'actions', signId: 'EAT', title: 'Eat', order: 10,
    description: 'Bring the fingertips of your flat-O hand (fingers and thumb pinched together) to your mouth, tapping gently as if putting food in.',
    tips: [
      'Fingertips and thumb pinch together loosely',
      'Motion moves toward the mouth, not away',
      'Same sign as FOOD (Needs) — context tells them apart',
    ],
    imageUrl: '../assets/images/medium/actions/eat.png', videoUrl: '../assets/videos/medium/actions/eat.mp4', detectionType: 'motion',
  },
  {
    // RELOCATED (this session) — was 'medium_food_DRINK', category:'food'.
    // Content unchanged. 'food' words[] never claimed this word, and
    // 'food' is still comingSoon:true, so nothing live loses coverage.
    id: 'medium_actions_DRINK', level: 'medium', category: 'actions', signId: 'DRINK', title: 'Drink', order: 11,
    description: 'Form a \u2018C\u2019 handshape as if holding a cup, bring it to your mouth, and tilt it slightly, as if taking a sip.',
    tips: [
      'Handshape curves like it\'s wrapped around a cup',
      'The tilt happens right at the mouth',
      'One smooth lift-and-tilt motion',
    ],
    imageUrl: '../assets/images/medium/actions/drink.png', videoUrl: '../assets/videos/medium/actions/drink.mp4', detectionType: 'motion',
  },
  {
    // RELOCATED (this session) — was 'medium_health_SLEEP', category:'health'.
    // Content unchanged. 'health' words[] did list this word, but 'health'
    // is still comingSoon:true/dormant (see that category's updated
    // comment) — this word was already intended to move to 'actions'.
    id: 'medium_actions_SLEEP', level: 'medium', category: 'actions', signId: 'SLEEP', title: 'Sleep', order: 12,
    description: 'Hold your spread-out hand in front of your face, then draw it down and close it near your chin, closing your eyes as your hand moves down.',
    tips: [
      'Fingers start spread, then close together',
      'Close your eyes as the hand comes down',
      'One smooth downward motion',
    ],
    imageUrl: '../assets/images/medium/actions/sleep.png', videoUrl: '../assets/videos/medium/actions/sleep.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_WAKE', level: 'medium', category: 'actions', signId: 'WAKE', title: 'Wake Up', order: 13,
    description: 'Hold your index finger and thumb pinched together near the corner of each eye, then open them apart, like eyelids opening.',
    tips: [
      'Start with fingers pinched closed at the eyes',
      'Open them outward like your eyes opening',
      'Use a sleepy expression, not a surprised one',
    ],
    imageUrl: '../assets/images/medium/actions/wake.png', videoUrl: '../assets/videos/medium/actions/wake.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wake-up.htm',
  },
  {
    id: 'medium_actions_PLAY', level: 'medium', category: 'actions', signId: 'PLAY', title: 'Play', order: 14,
    description: 'Form \u2018Y\u2019 handshapes (thumb and pinky out, middle fingers curled) with both hands and twist them back and forth at the wrists.',
    tips: [
      'Both hands use the \u2018Y\u2019 handshape',
      'Twisting comes from the wrist, not the whole arm',
      'Repeat the twisting motion a couple of times',
    ],
    imageUrl: '../assets/images/medium/actions/play.png', videoUrl: '../assets/videos/medium/actions/play.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_LOOK', level: 'medium', category: 'actions', signId: 'LOOK', title: 'Look', order: 15,
    description: 'Point the first two fingers of your dominant hand (a \u2018V\u2019 handshape) away from your eyes, aiming them in the direction you\u2019re looking.',
    tips: [
      'Fingers start near your own eyes',
      'The \u2018V\u2019 shape represents your two eyes looking',
      'Direction can change to show where you\u2019re looking',
    ],
    imageUrl: '../assets/images/medium/actions/look.png', videoUrl: '../assets/videos/medium/actions/look.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_SEE', level: 'medium', category: 'actions', signId: 'SEE', title: 'See', order: 16,
    description: 'Point the first two fingers of your dominant hand (a \u2018V\u2019 handshape) from your eyes outward and slightly down, in one short motion.',
    tips: [
      'Same handshape as LOOK, but the motion is quick and brief',
      'Fingers start near the eyes and move slightly outward',
      'A single short movement, not a sustained gaze',
    ],
    imageUrl: '../assets/images/medium/actions/see.png', videoUrl: '../assets/videos/medium/actions/see.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_LISTEN', level: 'medium', category: 'actions', signId: 'LISTEN', title: 'Listen', order: 17,
    description: 'Cup your dominant hand and place it just behind your ear, as if trying to hear something better.',
    tips: [
      'Hand forms a loose cupped shape',
      'Rests gently near, not on, the ear',
      'A slight lean toward the sound can help reinforce it',
    ],
    imageUrl: '../assets/images/medium/actions/listen.png', videoUrl: '../assets/videos/medium/actions/listen.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_TALK', level: 'medium', category: 'actions', signId: 'TALK', title: 'Talk', order: 18,
    description: 'Point your index finger at your mouth, then move it forward and back between yourself and the person you\u2019re talking to.',
    tips: [
      'Index finger starts near your own mouth/chin',
      'Motion alternates outward and back',
      'Represents an exchange of words between two people',
    ],
    imageUrl: '../assets/images/medium/actions/talk.png', videoUrl: '../assets/videos/medium/actions/talk.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_READ', level: 'medium', category: 'actions', signId: 'READ', title: 'Read', order: 19,
    description: 'Hold your non-dominant hand flat, palm up, like an open book. Move the first two fingers of your dominant hand (a \u2018V\u2019 handshape) down across the palm, as if scanning lines of text.',
    tips: [
      'Dominant hand uses a \u2018V\u2019 shape, like two eyes',
      'Motion moves downward across the base palm',
      'Base hand stays flat and steady',
    ],
    imageUrl: '../assets/images/medium/actions/read.png', videoUrl: '../assets/videos/medium/actions/read.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_WRITE', level: 'medium', category: 'actions', signId: 'WRITE', title: 'Write', order: 20,
    description: 'Pinch your thumb and index finger together as if holding a pen, and move your hand across your flat non-dominant palm, as if writing on paper.',
    tips: [
      'Dominant hand pinches like holding a small pen',
      'Base hand stays flat, palm up, like a sheet of paper',
      'A side-to-side scribbling motion works well',
    ],
    imageUrl: '../assets/images/medium/actions/write.png', videoUrl: '../assets/videos/medium/actions/write.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_DRAW', level: 'medium', category: 'actions', signId: 'DRAW', title: 'Draw', order: 21,
    description: 'Extend your pinky finger and trace a wavy, wiggly line across your flat non-dominant palm, as if sketching a picture.',
    tips: [
      'Only the pinky finger extends on the dominant hand',
      'The path is wavy/zig-zag, not straight',
      'Base hand stays flat and steady',
    ],
    imageUrl: '../assets/images/medium/actions/draw.png', videoUrl: '../assets/videos/medium/actions/draw.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_SING', level: 'medium', category: 'actions', signId: 'SING', title: 'Sing', order: 22,
    description: 'Hold your non-dominant arm out in front of you and wave your flat dominant hand back and forth above it, like conducting music.',
    tips: [
      'Non-dominant arm stays extended and still',
      'Dominant hand stays relaxed and open',
      'The waving motion flows smoothly back and forth',
    ],
    imageUrl: '../assets/images/medium/actions/sing.png', videoUrl: '../assets/videos/medium/actions/sing.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_DANCE', level: 'medium', category: 'actions', signId: 'DANCE', title: 'Dance', order: 23,
    description: 'Hold your non-dominant hand flat, palm up. Swing the first two fingers of your dominant hand (a \u2018V\u2019 handshape, like two legs) back and forth over the palm.',
    tips: [
      'Dominant hand uses the same \u2018V\u2019 shape as WALK/JUMP, but swings side to side',
      'Base hand stays flat, representing the floor',
      'A loose, rhythmic swinging motion',
    ],
    imageUrl: '../assets/images/medium/actions/dance.png', videoUrl: '../assets/videos/medium/actions/dance.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_COOK', level: 'medium', category: 'actions', signId: 'COOK', title: 'Cook', order: 24,
    description: 'Hold your non-dominant hand flat, palm up, like a pan. Place your dominant flat hand on top and flip it over, like flipping food while cooking.',
    tips: [
      'Base hand stays flat, palm up, the whole time',
      'Dominant hand flips completely over, palm up to palm down',
      'One clear flipping motion is enough',
    ],
    imageUrl: '../assets/images/medium/actions/cook.png', videoUrl: '../assets/videos/medium/actions/cook.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cook.htm',
  },
  {
    // RELOCATED (this session) — was 'medium_health_NICE', signId
    // 'NICE/CLEAN', category:'health'. Renamed to the plain 'CLEAN' signId
    // and content otherwise unchanged; 'health' words[] listed this as
    // 'NICE/CLEAN' but is still comingSoon:true/dormant. The "also means
    // nice" tip is kept so the connection isn't lost.
    id: 'medium_actions_CLEAN', level: 'medium', category: 'actions', signId: 'CLEAN', title: 'Clean', order: 25,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant flat hand across the palm from base to fingertips, as if wiping it clean.',
    tips: [
      'Base hand stays flat and still',
      'One smooth sliding motion, base to fingertips',
      'Also commonly used to mean \u2018nice\u2019',
    ],
    imageUrl: '../assets/images/medium/actions/clean.png', videoUrl: '../assets/videos/medium/actions/clean.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_THINK', level: 'medium', category: 'actions', signId: 'THINK', title: 'Think', order: 26,
    description: 'Touch your index finger to the side of your forehead near your temple, and make a small circling motion.',
    tips: [
      'Only the index finger extends',
      'Contact point is the temple, not the top of the head',
      'A small circular motion, not a single tap',
    ],
    imageUrl: '../assets/images/medium/actions/think.png', videoUrl: '../assets/videos/medium/actions/think.mp4', detectionType: 'motion',
  },
  {
    // RELOCATED (this session) — was 'medium_feelings_CRY', category:'feelings'.
    // Content unchanged. AI_MEMORY already documented CRY as intended to
    // move to 'actions'; 'feelings' words[] never claimed it, so nothing
    // live loses coverage.
    id: 'medium_actions_CRY', level: 'medium', category: 'actions', signId: 'CRY', title: 'Cry', order: 27,
    description: 'Hold both index fingers just below your eyes and trace them downward along your cheeks, alternating hands, like tears falling.',
    tips: [
      'Only the index fingers are extended',
      'Alternate hands going down, like falling tears',
      'Repeat a couple of times',
    ],
    imageUrl: '../assets/images/medium/actions/cry.png', videoUrl: '../assets/videos/medium/actions/cry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_actions_LAUGH', level: 'medium', category: 'actions', signId: 'LAUGH', title: 'Laugh', order: 28,
    description: 'Hold both hands near the corners of your mouth with your index fingers bent, and brush them upward and outward, repeating the motion, as if tracing a growing smile.',
    tips: [
      'Both index fingers stay bent (hooked), not straight',
      'Motion brushes up and outward from the mouth',
      'Repeat the motion with a big smile for emphasis',
    ],
    imageUrl: '../assets/images/medium/actions/laugh.png', videoUrl: '../assets/videos/medium/actions/laugh.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/laugh.htm',
  },
  {
    id: 'medium_actions_RIDE', level: 'medium', category: 'actions', signId: 'RIDE', title: 'Ride', order: 29,
    description: 'Rest the bent first two fingers of your dominant hand (\u2018sitting\u2019 like legs) inside the curved \u2018C\u2019 shape of your non-dominant hand, then move both hands forward together.',
    tips: [
      'Dominant hand\u2019s fingers rest inside the base hand, like a rider',
      'Base hand keeps a loose \u2018C\u2019 curve',
      'Move both hands forward together, not separately',
    ],
    imageUrl: '../assets/images/medium/actions/ride.png', videoUrl: '../assets/videos/medium/actions/ride.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/ride.htm',
  },
  {
    id: 'medium_actions_BATH', level: 'medium', category: 'actions', signId: 'BATH', title: 'Bath', order: 30,
    description: 'Make loose \u2018A\u2019 handshapes (fists with the thumb resting on the side) and rub them up and down against your chest, as if scrubbing yourself clean.',
    tips: [
      'Both hands stay in loose fists the whole time',
      'Motion rubs straight up and down, no arc',
      'Keep the motion at chest height',
    ],
    imageUrl: '../assets/images/medium/actions/bath.png', videoUrl: '../assets/videos/medium/actions/bath.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bath.htm',
  },

  /* ── MEDIUM · HAND ACTIONS (Unit 10) ────────────────────────────
   * REV 8 (2026-08-25): new block, ASLU-checked (lifeprint.com) content
   * added this session. All entries added with matching disabled:true
   * dictionary.js placeholders — see that file. */
  {
    id: 'medium_hand_actions_GIVE', level: 'medium', category: 'hand_actions', signId: 'GIVE', title: 'Give', order: 1,
    description: 'Hold your dominant hand in a flat-O shape (fingers and thumb pinched together) and move it from your body outward toward the person receiving, opening your fingers slightly as you finish.',
    tips: [
      'Fingers and thumb start pinched together, like holding a small object',
      'Motion moves outward, away from your body',
      'Direction can change depending on who you\u2019re giving to',
    ],
    imageUrl: '../assets/images/medium/hand_actions/give.png', videoUrl: '../assets/videos/medium/hand_actions/give.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101//pages-signs/g/give.htm',
  },
  {
    id: 'medium_hand_actions_TAKE', level: 'medium', category: 'hand_actions', signId: 'TAKE', title: 'Take', order: 2,
    description: 'Reach your dominant hand out with fingers slightly bent (a loose claw shape), then pull it back toward your body while closing your fingers into a fist, as if grabbing something.',
    tips: [
      'Fingers start bent and open, then close into a fist',
      'Motion pulls inward, toward your body',
      'The closing grip happens as the hand arrives at your chest',
    ],
    imageUrl: '../assets/images/medium/hand_actions/take.png', videoUrl: '../assets/videos/medium/hand_actions/take.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_PUT', level: 'medium', category: 'hand_actions', signId: 'PUT', title: 'Put', order: 3,
    description: 'Hold your dominant hand in a flat-O shape (fingers and thumb pinched together) and move it down to a spot in front of you, opening your fingers as you set it down.',
    tips: [
      'Start with fingers pinched together, as if holding something small',
      'Motion moves downward to the placement spot',
      'Fingers open at the very end, like releasing an object',
    ],
    imageUrl: '../assets/images/medium/hand_actions/put.png', videoUrl: '../assets/videos/medium/hand_actions/put.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_GET', level: 'medium', category: 'hand_actions', signId: 'GET', title: 'Get', order: 4,
    description: 'Hold both hands out in front of you with fingers slightly open, then pull them in toward your body while closing them into fists, as if grabbing hold of something.',
    tips: [
      'Both hands move together, mirroring each other',
      'Fingers close into fists as the hands arrive at your body',
      'One decisive pull inward',
    ],
    imageUrl: '../assets/images/medium/hand_actions/get.png', videoUrl: '../assets/videos/medium/hand_actions/get.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_BRING', level: 'medium', category: 'hand_actions', signId: 'BRING', title: 'Bring', order: 5,
    description: 'Hold both hands flat, palms up, side by side, and move them together from one side toward the other (or toward your body), as if carrying something on your palms.',
    tips: [
      'Both hands stay flat and move together as a pair',
      'Palms face upward the whole time, like a tray',
      'The path sweeps from the starting point to the destination',
    ],
    imageUrl: '../assets/images/medium/hand_actions/bring.png', videoUrl: '../assets/videos/medium/hand_actions/bring.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_CARRY', level: 'medium', category: 'hand_actions', signId: 'CARRY', title: 'Carry', order: 6,
    description: 'Hold both hands flat, palms up, and move them forward together in a series of small hops or arcs, as if carrying something along with you.',
    tips: [
      'Both hands stay flat and move together',
      'Motion repeats in small steps rather than one big sweep',
      'Palms stay facing up throughout',
    ],
    imageUrl: '../assets/images/medium/hand_actions/carry.png', videoUrl: '../assets/videos/medium/hand_actions/carry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_PUSH', level: 'medium', category: 'hand_actions', signId: 'PUSH', title: 'Push', order: 7,
    description: 'Hold your flat hand(s), palm facing away from you, and move them forward and away from your body with a firm, deliberate motion.',
    tips: [
      'Palm(s) face away from your body',
      'Motion moves outward, away from you',
      'Add a bit of tension in the hand to show effort',
    ],
    imageUrl: '../assets/images/medium/hand_actions/push.png', videoUrl: '../assets/videos/medium/hand_actions/push.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/push.htm',
  },
  {
    id: 'medium_hand_actions_PULL', level: 'medium', category: 'hand_actions', signId: 'PULL', title: 'Pull', order: 8,
    description: 'Make \u2018S\u2019 handshapes (fists) as if gripping a rope out in front of you, and pull both hands back toward your body.',
    tips: [
      'Both hands stay in a fist the whole time',
      'Motion pulls inward, toward your body',
      'The reverse motion and handshape of PUSH',
    ],
    imageUrl: '../assets/images/medium/hand_actions/pull.png', videoUrl: '../assets/videos/medium/hand_actions/pull.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pull.htm',
  },
  {
    id: 'medium_hand_actions_THROW', level: 'medium', category: 'hand_actions', signId: 'THROW', title: 'Throw', order: 9,
    description: 'Start with your thumb touching the fingernails of your index and middle fingers, then thrust your hand forward and open the fingers, as if hurling an object away from you.',
    tips: [
      'Handshape opens as the hand moves forward',
      'Motion thrusts outward, in the direction of the throw',
      'Add speed and force to show how hard something is thrown',
    ],
    imageUrl: '../assets/images/medium/hand_actions/throw.png', videoUrl: '../assets/videos/medium/hand_actions/throw.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/throw.htm',
  },
  {
    // BUGFIX (this session): referenceUrl pointed at lifeprint.com's
    // "catch" page, but that page is a content-empty stub (title only,
    // no image/video/description) — it doesn't actually corroborate this
    // description, so keeping it implied a verification that never
    // happened. Removed rather than leave a citation with nothing behind
    // it. capturesystem's verified_batch.md already flagged CATCH (with
    // GIVE/TAKE/GET/THROW/PICK) as "no dedicated ASLU page found in this
    // pass ... high confidence given how basic/universal it is" — that
    // caveat still stands; description content is unchanged (it was
    // already a reasonable generic rendering, just not ASLU-sourced).
    id: 'medium_hand_actions_CATCH', level: 'medium', category: 'hand_actions', signId: 'CATCH', title: 'Catch', order: 10,
    description: 'Hold both hands open in front of you, then quickly close them together, as if grabbing something out of the air.',
    tips: [
      'Hands start open and close together at the same time',
      'Time the closing motion like actually catching something',
      'Keep the motion at chest height, in front of your body',
    ],
    imageUrl: '../assets/images/medium/hand_actions/catch.png', videoUrl: '../assets/videos/medium/hand_actions/catch.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_hand_actions_PICK', level: 'medium', category: 'hand_actions', signId: 'PICK', title: 'Pick Up', order: 11,
    description: 'Lower your open hand, palm down, thumb and fingers slightly apart, then pinch your thumb and fingers together as you lift your hand, as if picking something up off a surface.',
    tips: [
      'Hand starts open, palm facing down',
      'Fingers pinch together as the hand lifts',
      'The lifting motion follows the pinch',
    ],
    imageUrl: '../assets/images/medium/hand_actions/pick.png', videoUrl: '../assets/videos/medium/hand_actions/pick.mp4', detectionType: 'motion',
  },

  /* ── MEDIUM · COMMUNICATION (Unit 11) ───────────────────────────
   * REV 8 (2026-08-25): new block, ASLU-checked (lifeprint.com) content
   * added this session. 'HELP' is intentionally NOT here — it's already
   * live under 'requests' (Needs, Unit 8) and that category's words[]
   * claims it; see the CATEGORIES entry's comment. All entries added
   * with matching disabled:true dictionary.js placeholders. */
  {
    id: 'medium_communication_ASK', level: 'medium', category: 'communication', signId: 'ASK', title: 'Ask', order: 1,
    description: 'Start with your index finger extended, palm facing the person you\u2019re asking, then bend it into an \u2018X\u2019 handshape as you move your hand toward them.',
    tips: [
      'Handshape changes from a straight index finger to a bent \u2018X\u2019',
      'Motion moves toward the person you\u2019re asking',
      'Direction can change depending on who you\u2019re asking',
    ],
    imageUrl: '../assets/images/medium/communication/ask.png', videoUrl: '../assets/videos/medium/communication/ask.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/a/ask.htm',
  },
  {
    id: 'medium_communication_ANSWER', level: 'medium', category: 'communication', signId: 'ANSWER', title: 'Answer', order: 2,
    description: 'Hold both index fingers up near your mouth, then flip them forward and downward, as if words are flowing out toward the other person.',
    tips: [
      'Both index fingers start near your mouth/chin',
      'Motion flips forward and down, away from you',
      'One smooth flipping motion is enough',
    ],
    imageUrl: '../assets/images/medium/communication/answer.png', videoUrl: '../assets/videos/medium/communication/answer.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_communication_TELL', level: 'medium', category: 'communication', signId: 'TELL', title: 'Tell', order: 3,
    description: 'Touch your index finger to your chin, then move it forward in a small arc toward the person you\u2019re telling.',
    tips: [
      'Contact point starts at the chin, not the cheek',
      'Motion arcs forward, toward the listener',
      'Direction shows who is being told',
    ],
    imageUrl: '../assets/images/medium/communication/tell.png', videoUrl: '../assets/videos/medium/communication/tell.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_communication_SHOW', level: 'medium', category: 'communication', signId: 'SHOW', title: 'Show', order: 4,
    description: 'Press the index finger of your dominant hand against the palm of your flat non-dominant hand, then move both hands forward together, toward the person you\u2019re showing.',
    tips: [
      'Index finger stays in contact with the base palm',
      'Both hands move together as a unit',
      'Direction points toward whoever you\u2019re showing',
    ],
    imageUrl: '../assets/images/medium/communication/show.png', videoUrl: '../assets/videos/medium/communication/show.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_communication_SHARE', level: 'medium', category: 'communication', signId: 'SHARE', title: 'Share', order: 5,
    description: 'Hold your non-dominant hand flat with fingers together. Brush the pinky-side edge of your dominant flat hand back and forth along the side of your index finger, from the base to the fingertips.',
    tips: [
      'Base hand stays flat and still, fingers together',
      'Dominant hand\u2019s pinky edge does the brushing',
      'Motion moves back and forth, not just one direction',
    ],
    imageUrl: '../assets/images/medium/communication/share.png', videoUrl: '../assets/videos/medium/communication/share.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/share.htm',
  },
  {
    id: 'medium_communication_TEACH', level: 'medium', category: 'communication', signId: 'TEACH', title: 'Teach', order: 6,
    description: 'Hold both hands near your forehead in a \u2018flattened-O\u2019 shape (fingertips and thumb together), then move them forward and open into flat hands, repeating the motion, as if handing knowledge outward.',
    tips: [
      'Both hands move together, starting near the forehead/temple',
      'Fingers open into flat hands as they move forward',
      'Repeat the motion once or twice for emphasis',
    ],
    imageUrl: '../assets/images/medium/communication/teach.png', videoUrl: '../assets/videos/medium/communication/teach.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/teach.htm',
  },
  {
    id: 'medium_communication_SIGN', level: 'medium', category: 'communication', signId: 'SIGN', title: 'Sign', order: 7,
    description: 'Point both index fingers toward each other in front of your body and rotate them around one another as you move your hands slightly forward.',
    tips: [
      'Both hands use a straight index-finger (\u20181\u2019) handshape',
      'Fingers circle around each other, not side to side',
      'A small forward drift as the hands rotate',
    ],
    imageUrl: '../assets/images/medium/communication/sign.png', videoUrl: '../assets/videos/medium/communication/sign.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sign.htm',
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
    id: 'medium_colors_PURPLE', level: 'medium', category: 'colors', signId: 'PURPLE', title: 'Purple', order: 7,
    description: 'Form a ‘P’ handshape and shake your hand slightly in place, held out around shoulder height — same family of movement as BLUE, GREEN, and YELLOW.',
    tips: [
      'Handshape is ‘P’ — middle finger and thumb touching, index pointing down',
      'Small shaking motion, wrist only',
      'Held at chest/shoulder height, palm facing out',
    ],
    imageUrl: '../assets/images/medium/colors/purple.png', videoUrl: '../assets/videos/medium/colors/purple.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_WHITE', level: 'medium', category: 'colors', signId: 'WHITE', title: 'White', order: 8,
    description: 'Rest your open ‘5’ hand on your chest, fingertips touching, then pull it away while closing the fingers into a flat ‘O’.',
    tips: [
      'Start with all 5 fingers spread, touching the chest',
      'Pull straight out and away from the body',
      'Fingers close together as the hand pulls away',
    ],
    imageUrl: '../assets/images/medium/colors/white.png', videoUrl: '../assets/videos/medium/colors/white.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_BLACK', level: 'medium', category: 'colors', signId: 'BLACK', title: 'Black', order: 9,
    description: 'Draw your index finger in a straight line across your forehead, from one side to the other, just above the eyebrow.',
    tips: [
      'Only the index finger is extended',
      'One straight, level pass across the forehead',
      'Stays right along the eyebrow line',
    ],
    imageUrl: '../assets/images/medium/colors/black.png', videoUrl: '../assets/videos/medium/colors/black.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_GRAY', level: 'medium', category: 'colors', signId: 'GRAY', title: 'Gray', order: 10,
    description: 'Hold both open ‘5’ hands in front of you, palms facing your body, fingers loosely interlaced, and move them back and forth so the fingertips brush past each other — like mixing black and white together.',
    tips: [
      'Both hands stay in a relaxed open ‘5’',
      'Fingers mesh loosely, not fully clasped',
      'Small repeated back-and-forth motion',
    ],
    imageUrl: '../assets/images/medium/colors/gray.png', videoUrl: '../assets/videos/medium/colors/gray.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_colors_PINK', level: 'medium', category: 'colors', signId: 'PINK', title: 'Pink', order: 11,
    description: 'Brush your middle finger down across your lips, once or twice — the same motion as RED, but with a ‘P’ handshape instead of a pointing index finger.',
    tips: [
      'Handshape is ‘P’ — middle finger extended, touches the lips',
      'Short downward brushing motion',
      'Starts at the lips, like RED',
    ],
    imageUrl: '../assets/images/medium/colors/pink.png', videoUrl: '../assets/videos/medium/colors/pink.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · SHAPES ── (new this pass — unlocks Unit 15)
  {
    id: 'medium_shapes_CIRCLE', level: 'medium', category: 'shapes', signId: 'CIRCLE', title: 'Circle', order: 1,
    description: 'Point your index finger and trace a circle in the air in front of you.',
    tips: [
      'Only the index finger is extended',
      'One continuous round loop',
      'Keep the circle a consistent size as you draw it',
    ],
    imageUrl: '../assets/images/medium/shapes/circle.png', videoUrl: '../assets/videos/medium/shapes/circle.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_SQUARE', level: 'medium', category: 'shapes', signId: 'SQUARE', title: 'Square', order: 2,
    description: 'Use both index fingers to trace a square outline in the air — down, across, up, and across again.',
    tips: [
      'Both index fingers move together, mirrored',
      'Four straight strokes, even corners',
      'Same sign is also used for a written/printed "sign" or "form" — context tells them apart',
    ],
    imageUrl: '../assets/images/medium/shapes/square.png', videoUrl: '../assets/videos/medium/shapes/square.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_TRIANGLE', level: 'medium', category: 'shapes', signId: 'TRIANGLE', title: 'Triangle', order: 3,
    description: 'Touch both index fingers together at the top to form a peak, then trace down and outward to draw the two slanted sides and the base.',
    tips: [
      'Start with fingertips touching at the top',
      'Both hands trace outward and down evenly',
      'Finish along the bottom to close the shape',
    ],
    imageUrl: '../assets/images/medium/shapes/triangle.png', videoUrl: '../assets/videos/medium/shapes/triangle.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_RECTANGLE', level: 'medium', category: 'shapes', signId: 'RECTANGLE', title: 'Rectangle', order: 4,
    description: 'Trace a rectangle in the air with both index fingers, the same way as SQUARE but wider than it is tall.',
    tips: [
      'Same tracing motion as SQUARE',
      'Make the horizontal sides longer than the vertical ones',
      'Both hands move together, mirrored',
    ],
    imageUrl: '../assets/images/medium/shapes/rectangle.png', videoUrl: '../assets/videos/medium/shapes/rectangle.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_OVAL', level: 'medium', category: 'shapes', signId: 'OVAL', title: 'Oval', order: 5,
    description: 'Trace an elongated circle in the air with your index finger, like CIRCLE but stretched longer in one direction.',
    tips: [
      'Only the index finger is extended',
      'The loop is stretched, not perfectly round',
      'One smooth continuous motion',
    ],
    imageUrl: '../assets/images/medium/shapes/oval.png', videoUrl: '../assets/videos/medium/shapes/oval.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_STAR', level: 'medium', category: 'shapes', signId: 'STAR', title: 'Star', order: 6,
    description: 'Point both index fingers upward in front of you and alternate brushing them up past each other, like a twinkling motion.',
    tips: [
      'Both index fingers point straight up',
      'Fingers alternate — one slides up as the other resets',
      'Small, quick repeated motion',
    ],
    imageUrl: '../assets/images/medium/shapes/star.png', videoUrl: '../assets/videos/medium/shapes/star.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_HEART', level: 'medium', category: 'shapes', signId: 'HEART', title: 'Heart', order: 7,
    description: 'Use the middle fingers of both hands to trace the outline of a heart shape over your chest, meeting at the bottom.',
    tips: [
      'Middle fingers lead the trace',
      'Both hands move down and inward together',
      'Finishes at a point in the center of the chest',
    ],
    imageUrl: '../assets/images/medium/shapes/heart.png', videoUrl: '../assets/videos/medium/shapes/heart.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_shapes_DIAMOND', level: 'medium', category: 'shapes', signId: 'DIAMOND', title: 'Diamond', order: 8,
    description: 'Trace a diamond outline in the air with both index fingers — two angled strokes down to a point, then two back up to close it.',
    tips: [
      'Both hands move together, mirrored',
      'Four angled strokes meeting at top and bottom points',
      'Not the same sign as a diamond ring/gem — this is the shape',
    ],
    imageUrl: '../assets/images/medium/shapes/diamond.png', videoUrl: '../assets/videos/medium/shapes/diamond.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · BODY ── (new this pass — unlocks Unit 12)
  {
    id: 'medium_body_BODY', level: 'medium', category: 'body', signId: 'BODY', title: 'Body', order: 1,
    description: 'Place both flat hands on your upper chest, then move them down the front of your torso toward your stomach.',
    tips: [
      'Both hands are flat, palms toward you',
      'Start at the chest, not the shoulders',
      'One smooth downward pass',
    ],
    imageUrl: '../assets/images/medium/body/body.png', videoUrl: '../assets/videos/medium/body/body.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_HEAD', level: 'medium', category: 'body', signId: 'HEAD', title: 'Head', order: 2,
    description: 'Touch your fingertips to the upper side of your head, then touch down near your jaw or chin.',
    tips: [
      'Two touches: upper head, then chin',
      'Bent fingers, not a flat hand',
      'Keep the two touch points on the same side',
    ],
    imageUrl: '../assets/images/medium/body/head.png', videoUrl: '../assets/videos/medium/body/head.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_HAIR', level: 'medium', category: 'body', signId: 'HAIR', title: 'Hair', order: 3,
    description: 'Pinch a strand of your hair near the top of your head between your thumb and index finger and give it a small tug.',
    tips: [
      'Thumb and index finger pinch together',
      'Contact point is the top/side of the head',
      'A light tugging motion, not a pull',
    ],
    imageUrl: '../assets/images/medium/body/hair.png', videoUrl: '../assets/videos/medium/body/hair.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_FACE', level: 'medium', category: 'body', signId: 'FACE', title: 'Face', order: 4,
    description: 'Point your index finger and trace a small circle in front of your face, from forehead to chin.',
    tips: [
      'Only the index finger is extended',
      'The circle traces the outline of the face',
      'Stays close to the face without touching it',
    ],
    imageUrl: '../assets/images/medium/body/face.png', videoUrl: '../assets/videos/medium/body/face.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_EYE', level: 'medium', category: 'body', signId: 'EYE', title: 'Eye', order: 5,
    description: 'Point your index finger toward your eye, close enough to clearly indicate it.',
    tips: [
      'Only the index finger is extended',
      'Point directly at (not into) the eye',
      'A brief, clear point is enough',
    ],
    imageUrl: '../assets/images/medium/body/eye.png', videoUrl: '../assets/videos/medium/body/eye.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_EAR', level: 'medium', category: 'body', signId: 'EAR', title: 'Ear', order: 6,
    description: 'Point your index finger toward your ear, or touch your earlobe lightly.',
    tips: [
      'Only the index finger is extended',
      'Point at or lightly touch the ear',
      'A brief, clear point is enough',
    ],
    imageUrl: '../assets/images/medium/body/ear.png', videoUrl: '../assets/videos/medium/body/ear.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_NOSE', level: 'medium', category: 'body', signId: 'NOSE', title: 'Nose', order: 7,
    description: 'Tap the tip of your nose with your index finger, twice.',
    tips: [
      'Only the index finger is extended',
      'Two light taps on the nose tip',
      'Keep the motion small and controlled',
    ],
    imageUrl: '../assets/images/medium/body/nose.png', videoUrl: '../assets/videos/medium/body/nose.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_MOUTH', level: 'medium', category: 'body', signId: 'MOUTH', title: 'Mouth', order: 8,
    description: 'Trace a small circle around your mouth with your index finger.',
    tips: [
      'Only the index finger is extended',
      'The circle outlines the mouth/lips',
      'Stays close to the mouth without touching it',
    ],
    imageUrl: '../assets/images/medium/body/mouth.png', videoUrl: '../assets/videos/medium/body/mouth.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_TEETH', level: 'medium', category: 'body', signId: 'TEETH', title: 'Teeth', order: 9,
    description: 'Brush your index finger along your front teeth, left to right.',
    tips: [
      'Only the index finger is extended',
      'Lips are parted enough to show contact',
      'One smooth sideways brush',
    ],
    imageUrl: '../assets/images/medium/body/teeth.png', videoUrl: '../assets/videos/medium/body/teeth.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_HAND', level: 'medium', category: 'body', signId: 'HAND', title: 'Hand', order: 10,
    description: 'Brush the fingertips of your dominant hand across the back of your non-dominant hand.',
    tips: [
      'Non-dominant hand stays flat and still',
      'Dominant hand\'s fingertips make the contact',
      'One brushing motion across the back of the hand',
    ],
    imageUrl: '../assets/images/medium/body/hand.png', videoUrl: '../assets/videos/medium/body/hand.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_FINGER', level: 'medium', category: 'body', signId: 'FINGER', title: 'Finger', order: 11,
    description: 'Point your dominant index finger and touch or tap the index finger of your non-dominant hand.',
    tips: [
      'Both hands use an index-finger handshape',
      'Contact is a light tap, not a grab',
      'One clear touch',
    ],
    imageUrl: '../assets/images/medium/body/finger.png', videoUrl: '../assets/videos/medium/body/finger.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_ARM', level: 'medium', category: 'body', signId: 'ARM', title: 'Arm', order: 12,
    description: 'Use your dominant flat hand to brush along the length of your non-dominant arm, from the upper arm down to the wrist.',
    tips: [
      'Dominant hand is flat, fingers together',
      'Non-dominant arm stays still as the base',
      'One smooth pass from bicep to wrist',
    ],
    imageUrl: '../assets/images/medium/body/arm.png', videoUrl: '../assets/videos/medium/body/arm.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_LEG', level: 'medium', category: 'body', signId: 'LEG', title: 'Leg', order: 13,
    description: 'Use both flat hands to trace down the length of your leg, from hip to ankle — or simply point to your leg.',
    tips: [
      'Both hands flat, palms facing each other',
      'Trace downward along one leg',
      'Pointing to the leg is also accepted',
    ],
    imageUrl: '../assets/images/medium/body/leg.png', videoUrl: '../assets/videos/medium/body/leg.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_FOOT', level: 'medium', category: 'body', signId: 'FOOT', title: 'Foot', order: 14,
    description: 'Point your index finger down toward your foot, or tap the side of your foot lightly.',
    tips: [
      'Only the index finger is extended',
      'Point clearly downward at the foot',
      'A brief, clear point is enough',
    ],
    imageUrl: '../assets/images/medium/body/foot.png', videoUrl: '../assets/videos/medium/body/foot.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_STOMACH', level: 'medium', category: 'body', signId: 'STOMACH', title: 'Stomach', order: 15,
    description: 'Pat or gently circle your flat hand over your stomach.',
    tips: [
      'Hand stays flat',
      'Small circular or patting motion',
      'Centered over the stomach',
    ],
    imageUrl: '../assets/images/medium/body/stomach.png', videoUrl: '../assets/videos/medium/body/stomach.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_body_BACK', level: 'medium', category: 'body', signId: 'BACK', title: 'Back', order: 16,
    description: 'Point your thumb back over your shoulder, toward your own back.',
    tips: [
      'Thumb does the pointing, hand in a loose fist',
      'Gesture is aimed behind you',
      'A brief, clear point is enough',
    ],
    imageUrl: '../assets/images/medium/body/back.png', videoUrl: '../assets/videos/medium/body/back.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · SIZE ── (new this pass — unlocks Unit 16. BIG/TALL
  // description text carried over unchanged from the retired 'amounts'
  // category — see data.js history — everything else here is new.)
  {
    id: 'medium_size_BIG', level: 'medium', category: 'size', signId: 'BIG', title: 'Big', order: 1,
    description: 'Hold both hands facing each other in curved ‘L’ shapes close together, then move them apart to show something large.',
    tips: [
      'Both hands move outward together',
      'Distance apart can scale with what you\'re describing',
      'Keep the curved handshape throughout',
    ],
    imageUrl: '../assets/images/medium/size/big.png', videoUrl: '../assets/videos/medium/size/big.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_SMALL', level: 'medium', category: 'size', signId: 'SMALL', title: 'Small', order: 2,
    description: 'Hold both flat hands facing each other with a small gap between them, then move them slightly closer together.',
    tips: [
      'Both hands stay flat, palms facing each other',
      'Gap starts small and shrinks further',
      'Opposite motion of BIG',
    ],
    imageUrl: '../assets/images/medium/size/small.png', videoUrl: '../assets/videos/medium/size/small.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_TALL', level: 'medium', category: 'size', signId: 'TALL', title: 'Tall', order: 3,
    description: 'Hold one index finger up as a marker, then move your other extended index finger upward alongside it to show height.',
    tips: [
      'One hand acts as a fixed reference point',
      'The other hand rises past it',
      'Only the index fingers are extended',
    ],
    imageUrl: '../assets/images/medium/size/tall.png', videoUrl: '../assets/videos/medium/size/tall.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_SHORT', level: 'medium', category: 'size', signId: 'SHORT', title: 'Short', order: 4,
    description: 'Hold your bent index and middle fingers ("H" handshape) near waist height and pat downward in a couple of small hops, to show a low height.',
    tips: [
      'Handshape is a bent ‘H’ — two fingers, slightly curved',
      'Small, short downward hops, not one long motion',
      'Kept low, around waist height',
    ],
    imageUrl: '../assets/images/medium/size/short.png', videoUrl: '../assets/videos/medium/size/short.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_LONG', level: 'medium', category: 'size', signId: 'LONG', title: 'Long', order: 5,
    description: 'Trace your index finger along the length of your other arm, from the shoulder down to the fingertips.',
    tips: [
      'Only the index finger is extended',
      'One slow, continuous trace along the whole arm',
      'The slower the trace, the longer it reads as being',
    ],
    imageUrl: '../assets/images/medium/size/long.png', videoUrl: '../assets/videos/medium/size/long.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_WIDE', level: 'medium', category: 'size', signId: 'WIDE', title: 'Wide', order: 6,
    description: 'Hold both flat hands facing each other in front of you, then move them apart horizontally to show width.',
    tips: [
      'Both hands stay flat, palms facing each other',
      'Movement is side to side, not forward/back',
      'Distance apart can scale with what you\'re describing',
    ],
    imageUrl: '../assets/images/medium/size/wide.png', videoUrl: '../assets/videos/medium/size/wide.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_THIN', level: 'medium', category: 'size', signId: 'THIN', title: 'Thin', order: 7,
    description: 'Hold your thumb and index finger close together, showing a very narrow gap between them.',
    tips: [
      'Thumb and index finger nearly touch',
      'Keep the rest of the hand relaxed',
      'Opposite idea to WIDE',
    ],
    imageUrl: '../assets/images/medium/size/thin.png', videoUrl: '../assets/videos/medium/size/thin.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_HEAVY', level: 'medium', category: 'size', signId: 'HEAVY', title: 'Heavy', order: 8,
    description: 'Hold both hands in loose, bent shapes at waist height, as if holding something, then dip them both down slightly.',
    tips: [
      'Both hands bent, like gripping an object',
      'The dip is small — a drop, not a full lower',
      'Facial expression (effort) reinforces the weight',
    ],
    imageUrl: '../assets/images/medium/size/heavy.png', videoUrl: '../assets/videos/medium/size/heavy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_size_LIGHT', level: 'medium', category: 'size', signId: 'LIGHT', title: 'Light (weight)', order: 9,
    description: 'Hold your fingertips together in front of you and flick them upward lightly, as if something weighs almost nothing.',
    tips: [
      'Fingertips start bunched together',
      'A light upward flick, not a big motion',
      'Opposite idea to HEAVY',
    ],
    imageUrl: '../assets/images/medium/size/light.png', videoUrl: '../assets/videos/medium/size/light.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · TASTE ── (new this pass — unlocks Unit 19)
  {
    id: 'medium_taste_SWEET', level: 'medium', category: 'taste', signId: 'SWEET', title: 'Sweet', order: 1,
    description: 'Brush your fingers downward across your chin, once or twice.',
    tips: [
      'Fingers stay together, slightly bent',
      'Short downward brushing motion',
      'Stays close to the chin',
    ],
    imageUrl: '../assets/images/medium/taste/sweet.png', videoUrl: '../assets/videos/medium/taste/sweet.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_SOUR', level: 'medium', category: 'taste', signId: 'SOUR', title: 'Sour', order: 2,
    description: 'Twist your index finger gently at the corner of your mouth or chin, with a slightly scrunched facial expression.',
    tips: [
      'Only the index finger is extended',
      'Small twisting motion at the mouth corner',
      'Facial expression carries a lot of the meaning',
    ],
    imageUrl: '../assets/images/medium/taste/sour.png', videoUrl: '../assets/videos/medium/taste/sour.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_SALTY', level: 'medium', category: 'taste', signId: 'SALTY', title: 'Salty', order: 3,
    description: 'Tap your index and middle fingers ("V" handshape) near the corner of your mouth, twice.',
    tips: [
      'Handshape is a ‘V’ — index and middle fingers',
      'Two light taps near the mouth',
      'Keep the motion small',
    ],
    imageUrl: '../assets/images/medium/taste/salty.png', videoUrl: '../assets/videos/medium/taste/salty.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_BITTER', level: 'medium', category: 'taste', signId: 'BITTER', title: 'Bitter', order: 4,
    description: 'Many signers use the same twisting motion at the mouth corner as SOUR, with a more exaggerated grimace — the two concepts overlap in ASL.',
    tips: [
      'Same base movement as SOUR',
      'A stronger, more pinched facial expression sets it apart',
      'Context usually makes the exact meaning clear',
    ],
    imageUrl: '../assets/images/medium/taste/bitter.png', videoUrl: '../assets/videos/medium/taste/bitter.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_SPICY', level: 'medium', category: 'taste', signId: 'SPICY', title: 'Spicy', order: 5,
    description: 'Hold both hands loosely open near chest height and shake them quickly, as if your fingers just touched something hot.',
    tips: [
      'Fingers loose and slightly spread',
      'Quick shaking motion, both hands',
      'An open-mouth facial expression often goes with it',
    ],
    imageUrl: '../assets/images/medium/taste/spicy.png', videoUrl: '../assets/videos/medium/taste/spicy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_DELICIOUS', level: 'medium', category: 'taste', signId: 'DELICIOUS', title: 'Delicious', order: 6,
    description: 'Touch your fingertips to your lips and pull them away with a smile, like a small kiss of approval.',
    tips: [
      'Fingertips bunch together and touch the lips',
      'Pull away smoothly, not too fast',
      'A pleased facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/taste/delicious.png', videoUrl: '../assets/videos/medium/taste/delicious.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_FRESH', level: 'medium', category: 'taste', signId: 'FRESH', title: 'Fresh', order: 7,
    description: 'Sweep your flat dominant hand upward across your chin and cheek in one smooth motion.',
    tips: [
      'Hand stays flat, fingers together',
      'One upward sweeping motion',
      'Similar movement family to NEW',
    ],
    imageUrl: '../assets/images/medium/taste/fresh.png', videoUrl: '../assets/videos/medium/taste/fresh.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · PERSONAL_INFORMATION (Unit 13) ── (new this pass —
  // unlocks Unit 13. NAME/AGE/FAMILY/BIRTHDAY/LIVE/FROM are new
  // ASLU-checked content (lifeprint.com, cross-checked against
  // Handspeak/PocketSign). BOY/GIRL/CHILD/PERSON/FRIEND/STUDENT/
  // TEACHER/HOME/SCHOOL are NOT new signs — they duplicate the entries
  // already live under 'family'/'people'/'places' (same physical sign,
  // matching the EAT/FOOD and CLEAN precedents elsewhere in this file)
  // so this category is self-contained and playable on its own. Flagged
  // in chat as an assumption — the alternative is stripping these 9
  // words from personal_information's words[] instead.
  {
    id: 'medium_personal_information_NAME', level: 'medium', category: 'personal_information', signId: 'NAME', title: 'Name', order: 1,
    description: 'Form both hands into an "H" handshape (index and middle fingers together). Tap the fingers of your dominant hand crosswise onto the fingers of your non-dominant hand, twice.',
    tips: [
      'Both hands use the two-finger "H" handshape',
      'Dominant hand taps crosswise on top of the stationary hand',
      'Two taps for the noun "name" — a single tap means "named/called" instead',
    ],
    imageUrl: '../assets/images/medium/personal_information/name.png', videoUrl: '../assets/videos/medium/personal_information/name.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/name.htm',
  },
  {
    id: 'medium_personal_information_AGE', level: 'medium', category: 'personal_information', signId: 'AGE', title: 'Age', order: 2,
    description: 'Hold your dominant hand in a loose "C" shape at your chin, then close it into an "S" as you move it down, twice.',
    tips: [
      'Handshape closes from a "C" into an "S" on the way down',
      'Two short downward movements from the chin',
      'Closely related to OLD (Appearance), which uses the same C-to-S handshape but a single, longer pull down',
    ],
    imageUrl: '../assets/images/medium/personal_information/age.png', videoUrl: '../assets/videos/medium/personal_information/age.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/2796/',
  },
  {
    // DUPLICATE — same sign as medium_family_BOY. Not a new sign; see
    // block comment above.
    id: 'medium_personal_information_BOY', level: 'medium', category: 'personal_information', signId: 'BOY', title: 'Boy', order: 3,
    description: 'Hold a flat hand near your forehead, then close your fingers toward your thumb in a small grasping motion, as if tipping an imaginary cap.',
    tips: [
      'Starting position is near the forehead',
      'The closing/grasping motion is what makes this a sign and not just a point',
      'Same sign already used for BOY under Family',
    ],
    imageUrl: '../assets/images/medium/family/BOY.png', videoUrl: '../assets/videos/medium/family/BOY.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_family_GIRL.
    id: 'medium_personal_information_GIRL', level: 'medium', category: 'personal_information', signId: 'GIRL', title: 'Girl', order: 4,
    description: 'Make an "A" handshape (thumb resting beside a fist) and brush your thumb down along your jaw/cheek.',
    tips: [
      'Thumb traces a short downward line near the jawline',
      'Rest of the hand stays a loose fist',
      'Same sign already used for GIRL under Family',
    ],
    imageUrl: '../assets/images/medium/family/GIRL.png', videoUrl: '../assets/videos/medium/family/GIRL.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_people_CHILD.
    id: 'medium_personal_information_CHILD', level: 'medium', category: 'personal_information', signId: 'CHILD', title: 'Child', order: 5,
    description: 'Hold your flat dominant hand palm-down at about hip height, then pat downward once or twice, as if patting the head of a small child.',
    tips: [
      'Palm faces down the whole time',
      'Height stays low, around hip level',
      'Same sign already used for CHILD under People',
    ],
    imageUrl: '../assets/images/medium/people/child.png', videoUrl: '../assets/videos/medium/people/child.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_people_PERSON.
    id: 'medium_personal_information_PERSON', level: 'medium', category: 'personal_information', signId: 'PERSON', title: 'Person', order: 6,
    description: 'Hold both flat hands in front of your body, palms facing each other, and move them straight down together, tracing the outline of a standing figure.',
    tips: [
      'Both hands move together, palms facing each other',
      'Motion is a straight downward line',
      'Same sign already used for PERSON under People',
    ],
    imageUrl: '../assets/images/medium/people/person.png', videoUrl: '../assets/videos/medium/people/person.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_personal_information_FAMILY', level: 'medium', category: 'personal_information', signId: 'FAMILY', title: 'Family', order: 7,
    description: 'Form both hands into an "F" handshape and trace a circle together out to the sides and back, as if representing a family gathered together.',
    tips: [
      'Both hands use the "F" handshape (index and thumb touching)',
      'Hands separate outward then arc back together',
      'Same base movement as the initialized sign for CLASS, just with an "F" instead of a "C"',
    ],
    imageUrl: '../assets/images/medium/personal_information/family.png', videoUrl: '../assets/videos/medium/personal_information/family.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/family.htm',
  },
  {
    // DUPLICATE — same sign as medium_people_FRIEND.
    id: 'medium_personal_information_FRIEND', level: 'medium', category: 'personal_information', signId: 'FRIEND', title: 'Friend', order: 8,
    description: 'Hook your index fingers together, then reverse and hook them together the other way — like two links of a chain interlocking.',
    tips: [
      'Both hands use a hooked index-finger ("X") handshape',
      'Hook, then flip and hook again the opposite way',
      'Same sign already used for FRIEND under People',
    ],
    imageUrl: '../assets/images/medium/people/friend.png', videoUrl: '../assets/videos/medium/people/friend.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_people_STUDENT.
    id: 'medium_personal_information_STUDENT', level: 'medium', category: 'personal_information', signId: 'STUDENT', title: 'Student', order: 9,
    description: 'Sign LEARN — fingertips of a "flat-O" hand pick up information from your non-dominant palm and touch it to your forehead — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'LEARN motion goes from the open palm up to the forehead',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Same sign already used for STUDENT under People',
    ],
    imageUrl: '../assets/images/medium/people/student.png', videoUrl: '../assets/videos/medium/people/student.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_people_TEACHER.
    id: 'medium_personal_information_TEACHER', level: 'medium', category: 'personal_information', signId: 'TEACHER', title: 'Teacher', order: 10,
    description: 'Sign TEACH — both open "flat-O" hands near the forehead, moving forward and out twice — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'TEACH motion happens near the forehead/temple',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Same sign already used for TEACHER under People',
    ],
    imageUrl: '../assets/images/medium/people/teacher.png', videoUrl: '../assets/videos/medium/people/teacher.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_places_SCHOOL.
    id: 'medium_personal_information_SCHOOL', level: 'medium', category: 'personal_information', signId: 'SCHOOL', title: 'School', order: 11,
    description: 'Hold both hands flat, palms open and facing up. Clap the fingertips of your top hand down into the palm of your bottom hand twice.',
    tips: [
      'Both hands are flat, fingers together',
      'Top hand does the clapping motion',
      'Same sign already used for SCHOOL under Places',
    ],
    imageUrl: '../assets/images/medium/places/school.png', videoUrl: '../assets/videos/medium/places/school.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_places_HOME.
    id: 'medium_personal_information_HOME', level: 'medium', category: 'personal_information', signId: 'HOME', title: 'Home', order: 12,
    description: 'Bring your fingertips and thumb together into a flattened \u2018O\u2019 shape. Touch them to the corner of your mouth, then move your hand back to touch your cheek near your ear.',
    tips: [
      'Two touches: mouth corner, then cheek/ear',
      'Keep the hand shape compact the whole time',
      'Same sign already used for HOME under Places',
    ],
    imageUrl: '../assets/images/medium/places/home.png', videoUrl: '../assets/videos/medium/places/home.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_personal_information_BIRTHDAY', level: 'medium', category: 'personal_information', signId: 'BIRTHDAY', title: 'Birthday', order: 13,
    description: 'Touch the tip of your middle finger to your chin, then touch it to your chest on the non-dominant side.',
    tips: [
      'Two touches: chin, then chest',
      'Only the middle finger makes contact',
      'Left-hand-dominant signers can mirror the sign',
    ],
    imageUrl: '../assets/images/medium/personal_information/birthday.png', videoUrl: '../assets/videos/medium/personal_information/birthday.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/birthday.htm',
  },
  {
    id: 'medium_personal_information_LIVE', level: 'medium', category: 'personal_information', signId: 'LIVE', title: 'Live', order: 14,
    description: 'Hold both hands in an "L" handshape at the sides of your torso, palms facing your body, and brush them upward once.',
    tips: [
      'Both hands use the "L" handshape',
      'Single upward brushing motion along the sides of the body',
      'Many fluent signers use "A" handshapes instead of "L" for this sign — both are seen',
    ],
    imageUrl: '../assets/images/medium/personal_information/live.png', videoUrl: '../assets/videos/medium/personal_information/live.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/live.htm',
  },
  {
    id: 'medium_personal_information_FROM', level: 'medium', category: 'personal_information', signId: 'FROM', title: 'From', order: 15,
    description: 'Hold your non-dominant index finger up, stationary. Touch your dominant index finger to it, then pull your dominant hand back toward your body while changing it into an "X" handshape.',
    tips: [
      'Base hand stays a still index finger',
      'Dominant hand changes from a "1" to an "X" as it pulls away',
      'Like pulling back the string on a bow',
    ],
    imageUrl: '../assets/images/medium/personal_information/from.png', videoUrl: '../assets/videos/medium/personal_information/from.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/from.htm',
  },

  // ── MEDIUM · APPEARANCE (Unit 17) ── (new this pass — unlocks Unit
  // 17. CLEAN duplicates the existing medium_actions_CLEAN entry — see
  // block comment on Personal Information above for why. NEAT is
  // flagged below: ASLU/PocketSign/Handspeak all describe it, in the
  // tidy/orderly sense used here, as the SAME physical sign as
  // CLEAN/NICE — distinguished only by facial expression, which this
  // project's landmark-based classifier doesn't read. Both entries are
  // written, but flagging this for a product decision — see chat.
  {
    id: 'medium_appearance_BEAUTIFUL', level: 'medium', category: 'appearance', signId: 'BEAUTIFUL', title: 'Beautiful', order: 1,
    description: 'Hold your dominant hand loosely closed in front of your face, then circle it around your face while opening your fingers outward into a spread hand, like a flower blooming.',
    tips: [
      'Circular path traced in front of the face',
      'Fingers OPEN outward as the circle finishes — the opposite of PRETTY',
      'Same movement family as PRETTY, distinguished by opening instead of closing',
    ],
    imageUrl: '../assets/images/medium/appearance/beautiful.png', videoUrl: '../assets/videos/medium/appearance/beautiful.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pretty.htm',
  },
  {
    id: 'medium_appearance_PRETTY', level: 'medium', category: 'appearance', signId: 'PRETTY', title: 'Pretty', order: 2,
    description: 'Hold your dominant hand in a relaxed, open handshape in front of your face, then circle it around your face while closing your fingers and thumb together into a flat, pinched shape.',
    tips: [
      'Circular path traced in front of the face',
      'Fingers CLOSE together as the circle finishes — the opposite of BEAUTIFUL',
      'Same movement family as BEAUTIFUL, distinguished by closing instead of opening',
    ],
    imageUrl: '../assets/images/medium/appearance/pretty.png', videoUrl: '../assets/videos/medium/appearance/pretty.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pretty.htm',
  },
  {
    id: 'medium_appearance_UGLY', level: 'medium', category: 'appearance', signId: 'UGLY', title: 'Ugly', order: 3,
    description: 'Hold your index finger under your nose, palm down, then drag it sideways while bending it into a hooked shape.',
    tips: [
      'Starts as a straight index finger, ends bent/hooked',
      'Short sideways drag just under the nose',
      'A scrunched, negative facial expression is part of the sign',
    ],
    imageUrl: '../assets/images/medium/appearance/ugly.png', videoUrl: '../assets/videos/medium/appearance/ugly.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/u/ugly.htm',
  },
  {
    id: 'medium_appearance_CUTE', level: 'medium', category: 'appearance', signId: 'CUTE', title: 'Cute', order: 4,
    description: 'Hold a modified "U" handshape (index and middle fingers together, thumb tucked) near your chin and brush it downward once or twice.',
    tips: [
      'Same handshape, location, and movement as one version of SUGAR',
      'A single downward movement leans toward "attractive"; a double, softer movement leans toward "adorable"',
      'Facial expression carries most of the distinction from SUGAR',
    ],
    imageUrl: '../assets/images/medium/appearance/cute.png', videoUrl: '../assets/videos/medium/appearance/cute.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cute.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_CLEAN.
    id: 'medium_appearance_CLEAN', level: 'medium', category: 'appearance', signId: 'CLEAN', title: 'Clean', order: 5,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant flat hand across the palm from base to fingertips, as if wiping it clean.',
    tips: [
      'Base hand stays flat and still',
      'One smooth sliding motion, base to fingertips',
      'Same sign already used for CLEAN under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/clean.png', videoUrl: '../assets/videos/medium/actions/clean.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_appearance_DIRTY', level: 'medium', category: 'appearance', signId: 'DIRTY', title: 'Dirty', order: 6,
    description: 'Hold your open, spread hand under your chin, palm down, and wiggle your fingers.',
    tips: [
      'Fingers WIGGLE loosely — this is what separates it from PIG, which bends and unbends together',
      'Handshape stays open (a "5" hand), not closed',
      'A slightly disgusted facial expression fits the meaning',
    ],
    imageUrl: '../assets/images/medium/appearance/dirty.png', videoUrl: '../assets/videos/medium/appearance/dirty.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pig.htm',
  },
  {
    // FLAG — this word's meaning here (tidy/orderly) is, per ASLU/
    // Handspeak/PocketSign, the SAME physical sign as CLEAN/NICE above —
    // a flat hand sliding once across the other palm. English splits
    // "neat" and "clean" into two words; ASL doesn't reliably split them
    // by handshape/movement, only by context and facial expression. This
    // entry is written (identical description to CLEAN) so the lesson
    // content isn't missing, but flagging that the landmark-based
    // classifier cannot currently tell this apart from CLEAN — see chat
    // writeup before wiring this into a graded quiz.
    id: 'medium_appearance_NEAT', level: 'medium', category: 'appearance', signId: 'NEAT', title: 'Neat', order: 7,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant flat hand across the palm from base to fingertips — the same sign as CLEAN.',
    tips: [
      'Physically identical to CLEAN/NICE — context and facial expression carry the difference, not handshape',
      'One smooth sliding motion, base to fingertips',
      'A repeated back-and-forth rub instead of one slide changes the meaning to "cleaning" (the verb)',
    ],
    imageUrl: '../assets/images/medium/actions/clean.png', videoUrl: '../assets/videos/medium/actions/clean.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.pocketsign.org/asl/neat',
  },
  {
    id: 'medium_appearance_MESSY', level: 'medium', category: 'appearance', signId: 'MESSY', title: 'Messy', order: 8,
    description: 'Hold both open hands in front of your chest, palms facing each other, one hand higher than the other. Rotate both hands in a circle, swapping which hand ends up on top.',
    tips: [
      'Both hands stay open and spread the whole time',
      'The hands swap top/bottom position as they circle',
      'A bigger, faster circle shows a bigger mess',
    ],
    imageUrl: '../assets/images/medium/appearance/messy.png', videoUrl: '../assets/videos/medium/appearance/messy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.pocketsign.org/asl/messy',
  },
  {
    id: 'medium_appearance_OLD', level: 'medium', category: 'appearance', signId: 'OLD', title: 'Old', order: 9,
    description: 'Hold your dominant hand in a "C" shape at your chin, then close it into an "S" as you pull it down, once.',
    tips: [
      'Handshape closes from a "C" into an "S" on the way down',
      'One single pull-down — a repeated or exaggerated version means "very old"',
      'Closely related to AGE (Personal Information), which uses the same handshape change but two shorter movements',
    ],
    imageUrl: '../assets/images/medium/appearance/old.png', videoUrl: '../assets/videos/medium/appearance/old.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/old.htm',
  },
  {
    id: 'medium_appearance_NEW', level: 'medium', category: 'appearance', signId: 'NEW', title: 'New', order: 10,
    description: 'Hold your non-dominant hand flat, palm up. Brush the back of your dominant hand across the palm in one skimming motion.',
    tips: [
      'The BACK of the dominant hand makes contact, not the palm',
      'One smooth skimming motion',
      'Same movement family as FRESH (Taste)',
    ],
    imageUrl: '../assets/images/medium/appearance/new.png', videoUrl: '../assets/videos/medium/appearance/new.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/new.htm',
  },
  {
    id: 'medium_appearance_BROKEN', level: 'medium', category: 'appearance', signId: 'BROKEN', title: 'Broken', order: 11,
    description: 'Make two fists with your knuckles touching in the middle, then twist both hands apart in opposite directions, as if snapping a stick in two.',
    tips: [
      'Both hands start as fists, knuckles touching',
      'One sharp twisting-apart motion',
      'Often paired with a "pah!" mouth movement for emphasis',
    ],
    imageUrl: '../assets/images/medium/appearance/broken.png', videoUrl: '../assets/videos/medium/appearance/broken.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/break.htm',
  },
  {
    id: 'medium_appearance_DARK', level: 'medium', category: 'appearance', signId: 'DARK', title: 'Dark', order: 12,
    description: 'Hold both open hands near the sides of your head, palms facing you, then bring them down and across each other in front of your face, curling your fingers as they cross.',
    tips: [
      'Both hands start open, end curled/clawed',
      'Hands cross at the wrists in front of the face',
      'Like pulling a curtain closed over your face',
    ],
    imageUrl: '../assets/images/medium/appearance/dark.png', videoUrl: '../assets/videos/medium/appearance/dark.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/535/',
  },
  {
    id: 'medium_appearance_BRIGHT', level: 'medium', category: 'appearance', signId: 'BRIGHT', title: 'Bright', order: 13,
    description: 'Hold your dominant fingers and thumb pinched together near your face, then spring them open into a spread hand as you move it outward and slightly down, like light bursting out.',
    tips: [
      'Starts pinched closed, ends open and spread',
      'Same sign as LIGHT (illuminated) and CLEAR/OBVIOUS — context and expression set "bright" apart',
      'A bigger, faster opening motion shows more intensity',
    ],
    imageUrl: '../assets/images/medium/appearance/bright.png', videoUrl: '../assets/videos/medium/appearance/bright.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/clear.htm',
  },

  // ── MEDIUM · SOUND (Unit 20) ── (new this pass — unlocks Unit 20.
  // FLAG: QUIET and SILENT are, per ASLU's own dictionary (which lists
  // them together as "QUIET/SILENT"), the SAME physical sign — the
  // "shhh" gesture followed by both hands crossing and pulling apart/
  // down. Same landmark-classifier caveat as NEAT/CLEAN in Appearance —
  // see chat writeup.
  {
    id: 'medium_sound_LOUD', level: 'medium', category: 'sound', signId: 'LOUD', title: 'Loud', order: 1,
    description: 'Touch your index finger to your ear, then shake both fists back and forth firmly in front of you.',
    tips: [
      'Starts with a touch to the ear',
      'Both hands close into fists ("S" handshape) for the shaking part',
      'A firm, sharp shake — bigger and faster reads as "louder"',
    ],
    imageUrl: '../assets/images/medium/sound/loud.png', videoUrl: '../assets/videos/medium/sound/loud.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/loud.htm',
  },
  {
    id: 'medium_sound_QUIET', level: 'medium', category: 'sound', signId: 'QUIET', title: 'Quiet', order: 2,
    description: 'Touch your index finger to your lips ("shhh"), then bring both flat hands up to cross at the wrists in front of your face and pull them apart and down to your sides.',
    tips: [
      'Two parts: the "shhh" touch, then both hands crossing and pulling apart',
      'Hands end up palm-down, out to the sides',
      'Same physical sign as SILENT below — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/sound/quiet.png', videoUrl: '../assets/videos/medium/sound/quiet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/q/quiet.htm',
  },
  {
    id: 'medium_sound_NOISY', level: 'medium', category: 'sound', signId: 'NOISY', title: 'Noisy', order: 3,
    description: 'Touch your index finger to your ear, then twist both open hands back and forth in front of you at the same time.',
    tips: [
      'Starts with a touch to the ear, same as LOUD',
      'Both hands stay open ("5" handshape) and twist together — LOUD uses closed fists shaking instead',
      'A bigger, faster twist reads as "noisier"',
    ],
    imageUrl: '../assets/images/medium/sound/noisy.png', videoUrl: '../assets/videos/medium/sound/noisy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/loud.htm',
  },
  {
    // FLAG — same physical sign as QUIET above; see block comment.
    id: 'medium_sound_SILENT', level: 'medium', category: 'sound', signId: 'SILENT', title: 'Silent', order: 4,
    description: 'Touch your index finger to your lips ("shhh"), then bring both flat hands up to cross at the wrists in front of your face and pull them apart and down to your sides — the same sign as QUIET.',
    tips: [
      'Physically identical to QUIET — context carries the difference, not handshape',
      'Two parts: the "shhh" touch, then both hands crossing and pulling apart',
      'A calm, settled facial expression fits the meaning',
    ],
    imageUrl: '../assets/images/medium/sound/quiet.png', videoUrl: '../assets/videos/medium/sound/quiet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/1759/',
  },
  {
    id: 'medium_sound_HIGH', level: 'medium', category: 'sound', signId: 'HIGH', title: 'High', order: 5,
    description: 'Hold your dominant hand in an "H" handshape and move it straight upward.',
    tips: [
      'Uses the "H" handshape (index and middle fingers together, pointing sideways)',
      'This is the general elevation sign for HIGH, used here for a high-pitched sound',
      'The higher and faster the movement, the higher the pitch being described',
    ],
    imageUrl: '../assets/images/medium/sound/high.png', videoUrl: '../assets/videos/medium/sound/high.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.pocketsign.org/asl/high',
  },
  {
    id: 'medium_sound_LOW', level: 'medium', category: 'sound', signId: 'LOW', title: 'Low', order: 6,
    description: 'Hold your dominant hand flat, palm down, and move or hold it at a low level in front of you.',
    tips: [
      'Handshape stays flat the whole time',
      'This is the general elevation sign for LOW, used here for a low-pitched sound',
      'The lower the hand, the lower the pitch being described',
    ],
    imageUrl: '../assets/images/medium/sound/low.png', videoUrl: '../assets/videos/medium/sound/low.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/low.htm',
  },

  // ── MEDIUM · DESCRIPTIONS ── (category still comingSoon:true — only
  // FULL is built so far, relocated unchanged from the retired
  // 'amounts' category rather than left orphaned there. Remaining
  // words (FAST/SLOW/STRONG/WEAK/GOOD/BAD/EMPTY/OPEN/CLOSED) still
  // need SIGNS entries before this category can unlock.)
  {
    id: 'medium_descriptions_FULL', level: 'medium', category: 'descriptions', signId: 'FULL', title: 'Full', order: 7,
    description: 'Hold your non-dominant hand in a fist. Sweep the edge of your dominant flat hand across the top of it, like leveling off a full container.',
    tips: [
      'Base hand is a closed fist',
      'One smooth sweeping motion across the top',
      'Like scraping a measuring cup level',
    ],
    imageUrl: '../assets/images/medium/descriptions/full.png', videoUrl: '../assets/videos/medium/descriptions/full.mp4', detectionType: 'motion',
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

/* NOTE: this file used to also export a `QUESTIONS` array of static
 * multiple-choice questions. Removed — quiz.js never read it; it
 * builds every multiple-choice/identification round dynamically from
 * SIGNS (see buildMCRound()/buildIdRound() there), so QUESTIONS had
 * been dead weight since that page was written. */

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
// HOMEPAGE PIVOT (this session) — UNIT0_CONTENT removed from this
// export list (const no longer exists, see the "UNIT 0 CONTENT"
// comment above). No other export changed.
window.LWData = {
  SIGNS, CATEGORIES, UNITS,
  getSign, getCategorySigns, getCategoriesForLevel, getCategory,
  getUnits, getCategoriesForUnit,
};