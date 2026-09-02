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
  // REMOVED (this session) — 'food_unit' (order:33) dropped at the user's
  // request; the category was still comingSoon:true with a words[]/SIGNS
  // mismatch (see the removed 'food' CATEGORIES entry's history for detail)
  // and is no longer wanted. Per this file's existing convention (see the
  // Homepage-pivot Unit 0 removal note above), the order gap at 33 is left
  // as-is rather than renumbering every unit after it — nothing reads UNITS
  // as a zero-indexed array.
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
  // UNLOCKED (2026-09-01): FAST/SLOW/STRONG/WEAK/EMPTY/OPEN/CLOSED researched fresh
  // against lifeprint.com and cross-checked against Handspeak/PocketSign/StrongASL/
  // SigningSavvy. GOOD/BAD reuse the existing medium_feelings_GOOD/BAD entries
  // (same physical sign, already live under Questions). FULL was already here.
  {
    id: 'descriptions', level: 'medium', title: 'Descriptions', order: 1, comingSoon: false, unit: 21,
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
    id: 'home', level: 'medium', title: 'Home', order: 1, comingSoon: false, unit: 23,
    words: ['HOUSE', 'HOME', 'BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING', 'DINING', 'GARAGE', 'GARDEN', 'YARD'],
  },
  // 23. Furniture
  {
    id: 'furniture', level: 'medium', title: 'Furniture', order: 1, comingSoon: false, unit: 24,
    words: ['BED', 'PILLOW', 'BLANKET', 'CHAIR', 'TABLE', 'SOFA', 'DESK', 'SHELF', 'CABINET', 'CLOSET', 'LAMP'],
  },
  // 24. Household
  {
    id: 'household', level: 'medium', title: 'Household', order: 1, comingSoon: false, unit: 25,
    words: ['DOOR', 'WINDOW', 'WALL', 'FLOOR', 'ROOF', 'CLOCK', 'MIRROR', 'FAN', 'TV', 'REMOTE', 'PHONE', 'COMPUTER', 'BOOK', 'KEY'],
  },
  // 25. Bathroom
  // UNLOCKED (2026-09-01): researched against lifeprint.com, cross-checked against
  // Handspeak/PocketSign/StrongASL/SigningSavvy. TOILET reuses medium_home_BATHROOM
  // (ASLU: same "T"-handshake sign covers both; context distinguishes). TOOTHBRUSH
  // reuses medium_health_BRUSH_TEETH (SigningSavvy confirms the noun shares the verb's
  // sign). SINK removed — ASLU has no dedicated sign, Dr. Bill recommends fingerspelling
  // S-I-N-K (same treatment as PEN/ART/ENGLISH elsewhere in this file).
  {
    id: 'bathroom', level: 'medium', title: 'Bathroom', order: 1, comingSoon: false, unit: 26,
    words: ['TOILET', 'SHOWER', 'BATHTUB', 'SOAP', 'SHAMPOO', 'TOWEL', 'TOOTHBRUSH', 'TOOTHPASTE'],
  },
  // 26. Kitchen
  // UNLOCKED (2026-09-01): researched against lifeprint.com, cross-checked against
  // Handspeak/PocketSign/StrongASL/SigningSavvy. CUP/SPOON/FORK reuse the existing
  // medium_food_* entries (CUP's description corrected in the process — see AUDIT
  // note on that entry). STOVE, OVEN, FREEZER, POT, and PAN removed — ASLU has no
  // dedicated sign for any of them (Dr. Bill explicitly recommends fingerspelling
  // STOVE and OVEN; no clear ASLU-documented sign for FREEZER/POT/PAN as kitchen
  // nouns), same treatment as PEN/ART/ENGLISH elsewhere in this file.
  {
    id: 'kitchen', level: 'medium', title: 'Kitchen', order: 1, comingSoon: false, unit: 27,
    words: ['REFRIGERATOR', 'PLATE', 'BOWL', 'CUP', 'GLASS', 'SPOON', 'FORK', 'KNIFE'],
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
  // 32. Food — REMOVED (this session) at the user's request. This category
  // was still comingSoon:true and had an unresolved mismatch between its
  // words[] (FOOD, RICE, BREAD, EGG, CHICKEN, FISH, MEAT, SOUP, CHEESE,
  // NOODLES, SANDWICH, PIZZA, PASTA) and its SIGNS coverage — only
  // EGG/CHEESE/PIZZA overlapped with words[], while MILK/HAMBURGER/HOT
  // DOG/APPLE/SPOON/FORK/CUP/CEREAL/CANDY/COOKIE had SIGNS entries but
  // weren't in words[], and 10 words[] items (RICE, BREAD, CHICKEN, FISH,
  // MEAT, SOUP, NOODLES, SANDWICH, PASTA, FOOD) had no sign at all. Rather
  // than resolve that mismatch, the category and its dedicated
  // 'medium_food_*' SIGNS entries were deleted outright. The corresponding
  // UNITS entry ('food_unit', order:33) was also removed. Two SIGNS entries
  // that lived in this block (WATER, HUNGRY) were NOT deleted — their
  // `category` was already 'requests', not 'food', so they still belong to
  // and are used by the live 'requests' (Needs) category; only their asset
  // paths still point at .../medium/food/ (cosmetic, not functional — flag
  // for a future asset-folder rename if desired). A few OTHER categories'
  // entries (medium_fruits_APPLE, medium_snacks_COOKIE, medium_snacks_CANDY)
  // are separate, independent duplicate SIGNS entries that merely referenced
  // "Food" by name in a tip/comment for context — those tips were reworded
  // since the category they pointed to no longer exists; the entries
  // themselves are untouched and still fully functional.
  // 33. Fruits
  // UNLOCKED (2026-09-01): researched fresh against lifeprint.com (ASLU),
  // cross-checked against Handspeak/aslbloom/Signing Time/ASL-LEX. APPLE
  // reuses the existing medium_food_APPLE entry (same physical sign);
  // ORANGE reuses medium_colors_ORANGE (ASLU documents the color sign and
  // the fruit sign as identical — squeezing a loose 'C' hand at the chin).
  // MANGO/PAPAYA/COCONUT/AVOCADO removed from words[] — ASLU has no single
  // widely-agreed dedicated sign for any of the four (lifeprint's own
  // vegetable/fruit-request notes list them as fingerspell-or-regional-
  // variant items), so per this file's existing convention for such words
  // (see STOVE/OVEN/PEN/ENGLISH elsewhere) they're left to the Fingerspell
  // feature rather than given an invented "the" sign.
  {
    id: 'fruits', level: 'medium', title: 'Fruits', order: 1, comingSoon: false, unit: 34,
    words: ['APPLE', 'BANANA', 'ORANGE', 'GRAPES', 'WATERMELON', 'PINEAPPLE', 'STRAWBERRY', 'PEAR', 'MELON'],
  },
  // 34. Vegetables
  // CUCUMBER dropped from words[] — lifeprint.com has no written/textual
  // description (video-only entry) and cross-check sources disagree or are
  // low-confidence; ASLU lists fingerspelling as a recognized variation, so
  // treated the same as SINK/STOVE/OVEN/TOY/BAG elsewhere in this file.
  {
    id: 'vegetables', level: 'medium', title: 'Vegetables', order: 1, comingSoon: false, unit: 35,
    words: ['CARROT', 'POTATO', 'TOMATO', 'ONION', 'GARLIC', 'CORN', 'PEA', 'BEAN', 'CABBAGE', 'LETTUCE', 'PUMPKIN', 'BROCCOLI'],
  },
  // 35. Snacks
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. COOKIE and
  // CANDY reuse the existing medium_food_COOKIE/CANDY entries (same
  // physical signs). See "MEDIUM · SNACKS" SIGNS block at the end of the file.
  {
    id: 'snacks', level: 'medium', title: 'Snacks', order: 1, comingSoon: false, unit: 36,
    words: ['COOKIE', 'CAKE', 'CANDY', 'CHOCOLATE', 'DONUT', 'PIE', 'POPCORN', 'CHIPS', 'CUPCAKE', 'ICECREAM'],
  },
  // 36. Drinks — unlocked (2026-09-01): all 6 words researched fresh against
  // lifeprint.com and cross-checked against Handspeak/aslbloom/PocketSign/
  // ASL Interactive. See "MEDIUM · DRINKS" SIGNS block at the end of the file.
  {
    id: 'drinks', level: 'medium', title: 'Drinks', order: 1, comingSoon: false, unit: 37,
    words: ['WATER', 'MILK', 'JUICE', 'SODA', 'TEA', 'COFFEE'],
  },
  // 37. Animals
  // FISH/RABBIT/CHICKEN/DUCK/GOAT researched against lifeprint.com,
  // cross-checked against a second source per word. CHICKEN is a duplicate
  // of BIRD (lifeprint: "the sign BIRD can in context be used to mean
  // chicken").
  {
    id: 'animals', level: 'medium', title: 'Animals', order: 1, comingSoon: false, unit: 38,
    words: ['DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'CHICKEN', 'DUCK', 'COW', 'PIG', 'HORSE', 'GOAT', 'SHEEP'],
  },
  // 38. Wild Animals
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. ZEBRA has no
  // single dedicated ASLU sign — written as the documented HORSE + STRIPES
  // compound. See "MEDIUM · WILD ANIMALS" SIGNS block at the end of the file.
  {
    id: 'wild_animals', level: 'medium', title: 'Wild Animals', order: 1, comingSoon: false, unit: 39,
    words: ['LION', 'TIGER', 'ELEPHANT', 'MONKEY', 'GIRAFFE', 'BEAR', 'ZEBRA', 'SNAKE', 'FROG', 'TURTLE'],
  },
  // 39. Insects
  {
    id: 'insects', level: 'medium', title: 'Insects', order: 1, comingSoon: false, unit: 40,
    words: ['ANT', 'BUTTERFLY', 'BEE', 'SPIDER'],
  },
  // 40. Clothes
  // SHORTS/DRESS/SKIRT/HAT/JACKET/BELT researched against lifeprint.com,
  // cross-checked against a second source per word. CAP is a duplicate of
  // HAT (lifeprint: CAP's page notes it can also mean "putting a hat on" —
  // same physical sign).
  {
    id: 'clothes', level: 'medium', title: 'Clothes', order: 1, comingSoon: false, unit: 41,
    words: ['SHIRT', 'PANTS', 'SHORTS', 'DRESS', 'SKIRT', 'SHOES', 'SOCKS', 'HAT', 'CAP', 'JACKET', 'COAT', 'BELT'],
  },
  // 41. Dressing — unlocked (2026-09-01): WEAR/CHANGE/FOLD are new content,
  // researched fresh against lifeprint.com and cross-checked against
  // Handspeak/PocketSign/SigningTime. WASH/CLEAN/DIRTY duplicate the entries
  // already live under 'health'/'appearance' (same physical sign, matching
  // the BOY/GIRL precedent under 'personal_information'). See the
  // "MEDIUM · DRESSING" SIGNS block at the end of the file — including a
  // flagged note on the existing WASH entry that I did NOT change.
  {
    id: 'dressing', level: 'medium', title: 'Dressing', order: 1, comingSoon: false, unit: 42,
    words: ['WEAR', 'CHANGE', 'WASH', 'FOLD', 'CLEAN', 'DIRTY'],
  },
  // 42. Personal Items
  // UNLOCKED (2026-09-02): researched fresh against lifeprint.com (ASLU),
  // cross-checked against Handspeak/aslbloom/PocketSign/babysignlanguage.
  // PHONE/KEY reuse the existing medium_household_PHONE/KEY entries (same
  // physical signs). 'BAG' removed from words[] — ASLU's own bag.htm page
  // states the concept is "most of the time" just fingerspelled B-A-G, no
  // single agreed dedicated sign (same precedent as MANGO/PAPAYA elsewhere
  // in this file), so it's left to the Fingerspell feature.
  {
    id: 'personal_items', level: 'medium', title: 'Personal Items', order: 1, comingSoon: false, unit: 43,
    words: ['WALLET', 'PHONE', 'WATCH', 'GLASSES', 'KEY', 'UMBRELLA', 'BOTTLE'],
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
  // UNLOCKED (2026-09-02): all 12 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. HOT/COLD reuse
  // the existing medium_temperature_HOT/COLD entries. WARM/COOL are also
  // listed in 'temperature' (Touch, Unit 18) words[] but that category has
  // no SIGNS entries for either word yet — flagged separately, not fixed
  // here since 'temperature' wasn't in scope this pass; WARM/COOL below
  // are written fresh under 'weather' so this category stands on its own.
  // See "MEDIUM · WEATHER" SIGNS block at the end of the file.
  {
    id: 'weather', level: 'medium', title: 'Weather', order: 1, comingSoon: false, unit: 46,
    words: ['SUNNY', 'RAINY', 'CLOUDY', 'WINDY', 'STORMY', 'HOT', 'COLD', 'WARM', 'COOL', 'THUNDER', 'LIGHTNING', 'SNOW'],
  },
  // 46. Seasons
  {
    id: 'seasons', level: 'medium', title: 'Seasons', order: 1, comingSoon: false, unit: 47,
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
  // 48. Vehicles — UNLOCKED (this session): all 11 words researched
  // against lifeprint.com (ASLU), cross-checked against Handspeak /
  // ASLbloom / Signing Savvy. See SIGNS entries for per-word notes
  // (BUS/TRUCK/VAN/TAXI are lexicalized fingerspelling).
  {
    id: 'vehicles', level: 'medium', title: 'Vehicles', order: 1, comingSoon: false, unit: 49,
    words: ['CAR', 'BUS', 'TRUCK', 'VAN', 'TAXI', 'TRAIN', 'BIKE', 'MOTORCYCLE', 'AIRPLANE', 'BOAT', 'SHIP'],
  },
  // 49. Transportation — unlocked (2026-09-01): DRIVE and FLY are new
  // content, researched fresh against lifeprint.com and cross-checked
  // against Handspeak. WALK, RIDE, GO, STOP, WAIT duplicate the entries
  // already live under 'actions' (same physical signs, same precedent as
  // WASH/CLEAN/DIRTY under 'dressing'). See "MEDIUM · TRANSPORTATION"
  // SIGNS block at the end of the file.
  {
    id: 'transportation', level: 'medium', title: 'Transportation', order: 1, comingSoon: false, unit: 50,
    words: ['WALK', 'RIDE', 'DRIVE', 'FLY', 'GO', 'STOP', 'WAIT'],
  },
  // 50. Professions
  {
    id: 'professions', level: 'medium', title: 'Professions', order: 1, comingSoon: true, unit: 51,
    words: ['TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'FARMER', 'DRIVER', 'COOK', 'CHEF', 'ENGINEER', 'DENTIST', 'MECHANIC', 'CARPENTER', 'LAWYER', 'SOLDIER', 'CASHIER', 'WAITER', 'ARTIST', 'WORKER', 'OWNER'],
  },
  // 51. Community — UNLOCKED (this session): all 9 remaining words
  // researched against lifeprint.com (ASLU), cross-checked against a
  // second source; see SIGNS entries for per-word notes.
  // 'MARKET' removed from words[] — despite repeated searches
  // (Handspeak, StartASL, SignASL, ASLbloom) no source gave a citable
  // handshape/movement/location description, only that an entry
  // exists. Same precedent as 'MAY' under Manners: don't invent a
  // description, drop it from the preview list instead. If a described
  // source turns up later, add it back in and give it a SIGNS entry.
  {
    id: 'community', level: 'medium', title: 'Community', order: 1, comingSoon: false, unit: 52,
    words: ['SCHOOL', 'HOSPITAL', 'POLICE', 'FIRE', 'LIBRARY', 'BANK', 'STORE', 'RESTAURANT', 'PARK'],
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
    id: 'daytime', level: 'medium', title: 'Daytime', order: 1, comingSoon: false, unit: 54,
    words: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
  },
  // 54. Days
  {
    id: 'days', level: 'medium', title: 'Days', order: 1, comingSoon: false, unit: 55,
    words: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  },
  // 55. Months
  // UNLOCKED (2026-09-02): all 12 words researched against lifeprint.com
  // (ASLU), cross-checked against StartASL and a third source (Hearview).
  // All three sources agree months are fingerspelled, not iconic signs —
  // 5 letters or fewer spelled in full, more than 5 abbreviated to the
  // first 3 letters, except September (abbreviated to 4: SEPT). Flagging
  // for Joshua: since these are fingerspelling sequences rather than a
  // single static handshape or a single gesture-motion, double check
  // whether the classifier/dictionary.js can actually evaluate a
  // multi-letter fingerspelled sequence before wiring these up for
  // detection — same open question likely applies to any other
  // fingerspelled vocabulary elsewhere in this file.
  {
    id: 'months', level: 'medium', title: 'Months', order: 1, comingSoon: false, unit: 56,
    words: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  },
  // 56. Sequence
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against Handspeak. FINISHED reuses the existing
  // medium_turn_taking_FINISHED entry (same physical sign).
  {
    id: 'sequence', level: 'medium', title: 'Sequence', order: 1, comingSoon: false, unit: 57,
    words: ['FIRST', 'SECOND', 'THIRD', 'NEXT', 'THEN', 'BEGINNING', 'MIDDLE', 'END', 'FINALLY', 'FINISHED'],
  },
  // 57. Frequency
  // UNLOCKED (2026-09-02): all 8 words are new content, researched fresh
  // against lifeprint.com (ASLU) and cross-checked against Handspeak.
  // DAILY reuses the EVERYDAY-inflection of TOMORROW; WEEKLY/MONTHLY reuse
  // inflected versions of WEEK/MONTH (see the new Days/Months-adjacent
  // notes on those SIGNS entries below). RARELY is ASLU's own documented
  // exaggerated variant of SOMETIMES, not a separate root sign.
  {
    id: 'frequency', level: 'medium', title: 'Frequency', order: 1, comingSoon: false, unit: 58,
    words: ['ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'NEVER', 'DAILY', 'WEEKLY', 'MONTHLY'],
  },
  // 58. Location
  {
    id: 'location', level: 'medium', title: 'Location', order: 1, comingSoon: true, unit: 59,
    words: ['IN', 'OUT', 'INSIDE', 'OUTSIDE', 'ON', 'UNDER', 'ABOVE', 'BELOW', 'FRONT', 'BACK', 'BEHIND', 'BESIDE', 'BETWEEN', 'NEXT'],
  },
  // 59. Distance
  {
    id: 'distance', level: 'medium', title: 'Distance', order: 1, comingSoon: false, unit: 60,
    words: ['NEAR', 'FAR', 'HERE', 'THERE', 'CLOSE', 'AWAY'],
  },
  // 60. Directions — UNLOCKED (this session): 5 new words researched
  // against lifeprint.com (ASLU); BACK/TURN/GO/STOP/WAIT reuse existing
  // entries. FORWARD flagged as lower-confidence (no dedicated ASLU page).
  {
    id: 'directions', level: 'medium', title: 'Directions', order: 1, comingSoon: false, unit: 61,
    words: ['LEFT', 'RIGHT', 'UP', 'DOWN', 'FORWARD', 'BACK', 'TURN', 'GO', 'STOP', 'WAIT'],
  },
  // 61. Social — UNLOCKED (this session): 5 new words researched
  // against lifeprint.com (ASLU); FRIEND/PLAY/TALK/SHARE/HELP/LIKE/LOVE
  // reuse existing entries. CLASSMATE and NEIGHBOR are compound signs,
  // flagged as lower-confidence — see SIGNS entries.
  {
    id: 'social', level: 'medium', title: 'Social', order: 1, comingSoon: false, unit: 62,
    words: ['FRIEND', 'CLASSMATE', 'NEIGHBOR', 'PLAY', 'TALK', 'SHARE', 'HELP', 'MEET', 'VISIT', 'LIKE', 'LOVE', 'TOGETHER'],
  },
  // 62. Manners
  // UNLOCKED (2026-09-02): PLEASE/SORRY/EXCUSE/HELP reuse the existing
  // medium_requests_*/medium_feelings_SORRY entries (same physical signs).
  // WELCOME reuses the medium_essentials_greetings_WELCOME entry added
  // during this session's audit (see that entry's notes on the
  // welcome/hire/invite caveat). THANKS reuses medium_requests_THANK_YOU
  // (same sign, same signId 'THANK YOU' so it still matches
  // dictionary.js). 'MAY' removed from words[] — no ASLU-documented
  // single sign for the permission-modal "may" (sources agree it's
  // typically fingerspelled or covered by CAN); same MANGO/PAPAYA
  // precedent as elsewhere in this file.
  {
    id: 'manners', level: 'medium', title: 'Manners', order: 1, comingSoon: false, unit: 63,
    words: ['PLEASE', 'THANKS', 'WELCOME', 'SORRY', 'EXCUSE', 'HELP'],
  },
  // 63. Turn-Taking
  // UNLOCKED (2026-09-02): MY/YOUR/WAIT/GO/STOP reuse existing
  // medium_people_*/medium_actions_* entries (same physical signs).
  // TURN/AGAIN/FINISHED are new content, researched fresh against
  // lifeprint.com (ASLU) and cross-checked against Handspeak/Brainscape
  // ASLU-sourced flashcard sets.
  {
    id: 'turn_taking', level: 'medium', title: 'Turn-Taking', order: 1, comingSoon: false, unit: 64,
    words: ['MY', 'YOUR', 'TURN', 'WAIT', 'GO', 'STOP', 'AGAIN', 'FINISHED'],
  },
  // 64. Responses
  // UNLOCKED (2026-09-02): YES/NO/OKAY/GOOD reuse existing
  // medium_essentials_basic_responses_*/medium_feelings_GOOD entries.
  // SURE/REALLY are new content but ASLU documents them as the SAME sign
  // as TRUE (index finger from the lips moving forward) — see the shared
  // note on both entries below. MAYBE/UNDERSTAND are new content,
  // researched fresh against lifeprint.com and cross-checked against
  // Handspeak/StudoCu ASLU-sourced notes.
  {
    id: 'responses', level: 'medium', title: 'Responses', order: 1, comingSoon: false, unit: 65,
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
  // UNLOCKED (2026-09-02): 8 of 10 words are DUPLICATES of existing entries
  // (HELLO/GOODBYE from essentials_greetings, GOOD/FINE from feelings,
  // NAME from personal_information, MEET from social, THANKS/WELCOME from
  // requests/essentials_greetings — same physical signs, see each entry's
  // note). NICE and LATER are new content, researched fresh against
  // lifeprint.com (ASLU), cross-checked against Handspeak/aslbloom.
  {
    id: 'conversation', level: 'medium', title: 'Conversation', order: 1, comingSoon: false, unit: 67,
    words: ['HELLO', 'GOOD', 'FINE', 'NAME', 'NICE', 'MEET', 'THANKS', 'WELCOME', 'LATER', 'GOODBYE'],
  },
  // 67. Requests
  // id deliberately NOT 'requests' -- that id is already used by topic 7
  // 'Needs' (Everyday Essentials), which has real disabled:true dictionary
  // placeholders. Two different source-file topics are both titled
  // 'Requests'-ish (7='Needs', 67='Requests') -- kept as two categories,
  // not merged, matching the source file's own structure.
  // UNLOCKED (2026-09-02): 6 of 10 words are DUPLICATES of existing entries
  // (HELP/PLEASE from requests, GIVE from hand_actions, WAIT/GO from
  // actions, WHERE from requests — same physical signs, see each entry's
  // note). HAVE, CAN, THIS, and THAT are new content, researched fresh
  // against lifeprint.com (ASLU), cross-checked against Handspeak/
  // aslbloom/PocketSign/Brainscape ASLU-sourced flashcard sets.
  {
    id: 'making_requests', level: 'medium', title: 'Requests', order: 1, comingSoon: false, unit: 68,
    words: ['HAVE', 'CAN', 'HELP', 'GIVE', 'PLEASE', 'WAIT', 'GO', 'WHERE', 'THIS', 'THAT'],
  },
  // 68. Answers
  // UNLOCKED (2026-09-02): YES/NO/OKAY/SURE/MAYBE/UNDERSTAND/GOOD all
  // reuse entries already added under Responses this session (same
  // physical signs). KNOW is new content, researched fresh against
  // lifeprint.com. 'DON'T' in this word list refers to the compound
  // DON'T-KNOW sign (see that entry's notes) — flagging this so it's
  // clear the literal word list item isn't a standalone "don't" sign.
  {
    id: 'answers', level: 'medium', title: 'Answers', order: 1, comingSoon: false, unit: 69,
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

  // ── MEDIUM · FOOD ── REMOVED (this session) — the 'food' category and its
  // 11 dedicated category:'food' SIGNS entries (PIZZA, MILK, HAMBURGER, HOT
  // DOG, EGG, APPLE, CHEESE, SPOON, FORK, CUP, CEREAL) were deleted at the
  // user's request; see the CATEGORIES comment on the old 'food' entry (now
  // also removed) for the full mismatch history. WATER and HUNGRY below were
  // KEPT — despite the 'medium_food_' id prefix, their `category` was
  // already 'requests', not 'food', so they still belong to and are used by
  // the live 'requests' (Needs) category. Only their asset paths still point
  // at .../medium/food/ (cosmetic leftover, not functional).
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
  {
    id: 'medium_clothes_SHORTS', level: 'medium', category: 'clothes', signId: 'SHORTS', title: 'Shorts', order: 7,
    description: 'Sign PANTS first — both open hands near your hips, pulled up slightly as fingers close toward the thumb — then use a slicing motion across your thigh to show the shortened length.',
    tips: [
      'First part borrows the PANTS handshape and pulling motion',
      'Second part is a level slicing motion across the thigh',
      'The slicing motion is what separates SHORTS from plain PANTS',
    ],
    imageUrl: '../assets/images/medium/clothes/shorts.png', videoUrl: '../assets/videos/medium/clothes/shorts.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_DRESS', level: 'medium', category: 'clothes', signId: 'DRESS', title: 'Dress', order: 8,
    description: 'Hold both open \u20185\u2019 hands near the top of your chest, thumbs touching your body, and brush them down in one long, continuous sweep to your lower torso.',
    tips: [
      'Thumbs lightly brush the body as the hands travel down',
      'One long single sweep — not a short double brush',
      'A shorter, double-brush version of this same motion means CLOTHES instead',
    ],
    imageUrl: '../assets/images/medium/clothes/dress.png', videoUrl: '../assets/videos/medium/clothes/dress.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dress.htm',
  },
  {
    id: 'medium_clothes_SKIRT', level: 'medium', category: 'clothes', signId: 'SKIRT', title: 'Skirt', order: 9,
    description: 'Hold both open \u20185\u2019 hands near your waist, heels of your hands touching your body, and move them downward and outward in one motion.',
    tips: [
      'Done at the waist, not the chest — that\u2019s what separates it from DRESS',
      'Contact is at the heel of the hand, not the thumbtip',
      'A single outward-and-down motion',
    ],
    imageUrl: '../assets/images/medium/clothes/skirt.png', videoUrl: '../assets/videos/medium/clothes/skirt.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/skirt.htm',
  },
  {
    id: 'medium_clothes_HAT', level: 'medium', category: 'clothes', signId: 'HAT', title: 'Hat', order: 10,
    description: 'Hold your dominant hand flat, palm down, and gently pat the top of your head twice.',
    tips: [
      'Handshape is flat and open, not a fist',
      'Two light pats, not one firm one',
      'A single, more forceful pat instead means "put on a hat"',
    ],
    imageUrl: '../assets/images/medium/clothes/hat.png', videoUrl: '../assets/videos/medium/clothes/hat.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/hat.htm',
  },
  {
    // DUPLICATE — same sign as medium_clothes_HAT (lifeprint: CAP's page notes it can also mean "putting a hat on").
    id: 'medium_clothes_CAP', level: 'medium', category: 'clothes', signId: 'CAP', title: 'Cap', order: 11,
    description: 'Hold your dominant hand flat, palm down, and gently pat the top of your head twice.',
    tips: [
      'Handshape is flat and open, not a fist',
      'Two light pats, not one firm one',
      'Same sign already used for HAT — context tells them apart',
    ],
    imageUrl: '../assets/images/medium/clothes/hat.png', videoUrl: '../assets/videos/medium/clothes/hat.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_clothes_JACKET', level: 'medium', category: 'clothes', signId: 'JACKET', title: 'Jacket', order: 12,
    description: 'Form both hands into an \u2018A\u2019 handshape (fist with thumb alongside, not tucked in) near your shoulders, then move them downward and inward, like putting on a jacket.',
    tips: [
      'Handshape is \u2018A\u2019 — not the closed-thumb \u2018S\u2019 fist',
      'Starts at the shoulders',
      'One motion down and in, like pulling a jacket closed',
    ],
    imageUrl: '../assets/images/medium/clothes/jacket.png', videoUrl: '../assets/videos/medium/clothes/jacket.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/j/jacket.htm',
  },
  {
    id: 'medium_clothes_BELT', level: 'medium', category: 'clothes', signId: 'BELT', title: 'Belt', order: 13,
    description: 'Form both hands into an \u2018H\u2019 handshape (index and middle fingers together, extended) and trace a line across your waist, like showing where a belt sits.',
    tips: [
      'Handshape is \u2018H\u2019 on both hands',
      'Traced right at waist level',
      'A held, tracing motion rather than a tap',
    ],
    imageUrl: '../assets/images/medium/clothes/belt.png', videoUrl: '../assets/videos/medium/clothes/belt.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/belt.htm',
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
  // AUDIT FIX (2026-09-01): the 7 entries below were missing even though
  // this category has been comingSoon:false — words[] promised HI/
  // MORNING/AFTERNOON/EVENING/NIGHT/GOODBYE/BYE/WELCOME but only HELLO
  // had a SIGNS entry. Researched fresh against lifeprint.com (ASLU),
  // cross-checked against Handspeak/aslbloom. MORNING/AFTERNOON/EVENING/
  // NIGHT are DUPLICATES of the existing medium_daytime_* entries (same
  // physical signs; asset paths point at the original daytime files per
  // this file's existing duplicate-entry convention — see dressing/WASH).
  {
    // DUPLICATE — same sign as HELLO. ASLU: "hi" is the identical wave,
    // just quicker/smaller and more casual.
    id: 'medium_essentials_greetings_HI', level: 'medium', category: 'essentials_greetings', signId: 'HI', title: 'Hi', order: 2,
    description: 'Hold your dominant hand flat near your forehead, fingers together like a salute, then move it outward and slightly down, away from your head — same as HELLO, just a bit quicker.',
    tips: [
      'Identical sign to HELLO — HI is just a smaller, faster, more casual version',
      'Hand is flat, fingers together, palm facing out',
      'A quick smile helps mark it as the casual "hi" rather than formal "hello"',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/hello.png', videoUrl: '../assets/videos/medium/essentials_greetings/hello.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_daytime_MORNING.
    id: 'medium_essentials_greetings_MORNING', level: 'medium', category: 'essentials_greetings', signId: 'MORNING', title: 'Morning', order: 3,
    description: 'Rest your non-dominant forearm horizontally in front of you, then raise your bent dominant forearm up from beneath it in one smooth motion, like the sun rising over the horizon.',
    tips: [
      'Non-dominant arm stays flat and still — it represents the horizon',
      'Dominant forearm rises up from underneath it, fingertips leading the way',
      'Same sign already used for MORNING under Daytime',
    ],
    imageUrl: '../assets/images/medium/daytime/morning.png', videoUrl: '../assets/videos/medium/daytime/morning.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_daytime_AFTERNOON.
    id: 'medium_essentials_greetings_AFTERNOON', level: 'medium', category: 'essentials_greetings', signId: 'AFTERNOON', title: 'Afternoon', order: 4,
    description: 'Rest your dominant hand, flat and palm down, near the elbow of your bent non-dominant arm, angled slightly up and forward, roughly like it\u2019s pointing to \u20182 o\u2019clock\u2019.',
    tips: [
      'Dominant hand stays flat and rests near the crook of the other elbow',
      'Angle points slightly upward and forward, not straight out',
      'Same sign already used for AFTERNOON under Daytime',
    ],
    imageUrl: '../assets/images/medium/daytime/afternoon.png', videoUrl: '../assets/videos/medium/daytime/afternoon.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_daytime_EVENING.
    id: 'medium_essentials_greetings_EVENING', level: 'medium', category: 'essentials_greetings', signId: 'EVENING', title: 'Evening', order: 5,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down — the same sign used for NIGHT.',
    tips: [
      'This is the same sign as NIGHT — context or a following word tells them apart',
      'Non-dominant arm stays flat and still, like a horizon line',
      'Same sign already used for EVENING under Daytime',
    ],
    imageUrl: '../assets/images/medium/daytime/evening.png', videoUrl: '../assets/videos/medium/daytime/evening.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_daytime_NIGHT.
    id: 'medium_essentials_greetings_NIGHT', level: 'medium', category: 'essentials_greetings', signId: 'NIGHT', title: 'Night', order: 6,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down, like the sun dropping below the horizon.',
    tips: [
      'Non-dominant arm represents the horizon, same idea as MORNING',
      'Dominant hand droops down over it instead of rising, like a sunset',
      'Same sign already used for NIGHT under Daytime',
    ],
    imageUrl: '../assets/images/medium/daytime/night.png', videoUrl: '../assets/videos/medium/daytime/night.mp4', detectionType: 'motion',
  },
  {
    // NEW — no prior entry for GOODBYE. ASLU: "wave hello with a side to
    // side movement; wave goodbye with a bending of the large knuckles or
    // at the wrist" — a deliberately different wave from HELLO.
    id: 'medium_essentials_greetings_GOODBYE', level: 'medium', category: 'essentials_greetings', signId: 'GOODBYE', title: 'Goodbye', order: 7,
    description: 'Hold your dominant hand up, palm facing outward, and bend your fingers down and back up at the large knuckles (or bend at the wrist instead) — like a child\u2019s wave.',
    tips: [
      'The bend happens at the big knuckles or the wrist — not a side-to-side wave like HELLO',
      'Palm faces the person you\u2019re leaving',
      'BYE uses this exact same sign, just quicker and more casual',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/goodbye.png', videoUrl: '../assets/videos/medium/essentials_greetings/goodbye.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as GOODBYE, per the HI/HELLO precedent above.
    id: 'medium_essentials_greetings_BYE', level: 'medium', category: 'essentials_greetings', signId: 'BYE', title: 'Bye', order: 8,
    description: 'Hold your dominant hand up, palm facing outward, and bend your fingers down and back up at the large knuckles (or bend at the wrist instead) — same as GOODBYE, just a bit quicker.',
    tips: [
      'Identical sign to GOODBYE — BYE is just a smaller, faster, more casual version',
      'The bend happens at the big knuckles or the wrist, not a side-to-side wave',
      'Palm faces the person you\u2019re leaving',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/goodbye.png', videoUrl: '../assets/videos/medium/essentials_greetings/goodbye.mp4', detectionType: 'motion',
  },
  {
    // NEW — no prior entry for WELCOME. ASLU labels this sign
    // WELCOME/HIRE/INVITE — same physical sign, meaning depends on
    // context. ASLU explicitly recommends AGAINST using it as a reply to
    // "thank you" (that\u2019s a separate convention — see FINE/NO PROBLEM);
    // this entry covers the "welcome, come on in" greeting sense only.
    id: 'medium_essentials_greetings_WELCOME', level: 'medium', category: 'essentials_greetings', signId: 'WELCOME', title: 'Welcome', order: 9,
    description: 'Hold your flat dominant hand out to the side, palm up, then bring it in toward your torso in one smooth arc, as if welcoming someone into a space.',
    tips: [
      'This same sign also means HIRE and INVITE — context makes the meaning clear',
      'Best used for "welcome, come on in" — not as a reply to "thank you" (use FINE or a thumbs-up for that instead)',
      'One smooth inward arc, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/welcome.png', videoUrl: '../assets/videos/medium/essentials_greetings/welcome.mp4', detectionType: 'motion',
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
    description: 'Use the index fingers of both hands to trace the outline of a heart shape over your chest, starting at the top center and meeting at the bottom.',
    tips: [
      'Index fingers lead the trace, not the middle fingers',
      'Both hands move down and inward together',
      'The middle-finger chest-tap is a different sign — that one means the emotional concept of "heart," not the shape',
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

  // ── MEDIUM · DESCRIPTIONS ── (UNLOCKED 2026-09-01 — FAST/SLOW/STRONG/WEAK/
  // EMPTY/OPEN/CLOSED researched fresh against lifeprint.com, cross-checked
  // against Handspeak/PocketSign/StrongASL/SigningSavvy. GOOD/BAD are
  // duplicates of medium_feelings_GOOD/BAD — same physical sign, already
  // live under Questions. FULL was already here, relocated unchanged from
  // the retired 'amounts' category.)
  {
    id: 'medium_descriptions_FAST', level: 'medium', category: 'descriptions', signId: 'FAST', title: 'Fast', order: 1,
    description: 'Form both hands into "L" shapes (thumb and index finger extended), then snap your wrists sharply back while your thumbs curl in, like a quick double flick.',
    tips: [
      'Both hands start in a clear "L" handshape',
      'The snap is sharp and sudden — the speed of the motion mirrors the meaning',
      'Keep the movement at the wrists; your arms stay mostly still',
    ],
    imageUrl: '../assets/images/medium/descriptions/fast.png', videoUrl: '../assets/videos/medium/descriptions/fast.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/fast.htm',
  },
  {
    id: 'medium_descriptions_SLOW', level: 'medium', category: 'descriptions', signId: 'SLOW', title: 'Slow', order: 2,
    description: 'Hold your non-dominant hand out flat, palm down. Slide your dominant hand slowly up the back of your non-dominant hand and wrist, a short distance.',
    tips: [
      'Non-dominant hand stays flat and still',
      'The sliding hand only travels a few inches',
      'Doing the slide at an exaggerated crawl emphasizes "very slow"',
    ],
    imageUrl: '../assets/images/medium/descriptions/slow.png', videoUrl: '../assets/videos/medium/descriptions/slow.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/slow.htm',
  },
  {
    id: 'medium_descriptions_STRONG', level: 'medium', category: 'descriptions', signId: 'STRONG', title: 'Strong', order: 3,
    description: 'Form both hands into fists near your shoulders, then pull them downward and outward together, like flexing your biceps.',
    tips: [
      'Both hands are closed fists — that\u2019s what separates this from related "open-5" signs',
      'The motion is a firm pull down and out, not a soft drift',
      'Think "flexing" — the sign is meant to look like showing off muscle',
    ],
    imageUrl: '../assets/images/medium/descriptions/strong.png', videoUrl: '../assets/videos/medium/descriptions/strong.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/strong.htm',
  },
  {
    id: 'medium_descriptions_WEAK', level: 'medium', category: 'descriptions', signId: 'WEAK', title: 'Weak', order: 4,
    description: 'Rest the fingertips of your dominant hand on the upturned palm of your non-dominant hand, then bend your dominant hand\u2019s knuckles downward twice, like they\u2019re buckling.',
    tips: [
      'Non-dominant hand stays flat and still underneath',
      'The buckling motion happens twice, at the knuckles',
      'Memory aid: "weak in the knees" — the fingers give out the same way',
    ],
    imageUrl: '../assets/images/medium/descriptions/weak.png', videoUrl: '../assets/videos/medium/descriptions/weak.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/weak.htm',
  },
  {
    // DUPLICATE — same sign as medium_feelings_GOOD (already live under Questions).
    id: 'medium_descriptions_GOOD', level: 'medium', category: 'descriptions', signId: 'GOOD', title: 'Good', order: 5,
    description: 'Touch your flat fingertips to your chin, then move your hand down to rest on the palm of your other hand.',
    tips: [
      'Fingertips start at the chin',
      'Hand moves down to rest on your other open palm',
      'Same physical sign already used for GOOD under Questions',
    ],
    imageUrl: '../assets/images/medium/feelings/good.png', videoUrl: '../assets/videos/medium/feelings/good.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_BAD (already live under Questions).
    id: 'medium_descriptions_BAD', level: 'medium', category: 'descriptions', signId: 'BAD', title: 'Bad', order: 6,
    description: 'Touch your fingertips to your chin, then flip your hand downward so the palm faces the floor.',
    tips: [
      'Both GOOD and BAD start the same way — fingertips to the chin',
      'BAD flips the palm down, instead of resting it on your other hand like GOOD',
      'Same physical sign already used for BAD under Questions',
    ],
    imageUrl: '../assets/images/medium/feelings/bad.png', videoUrl: '../assets/videos/medium/feelings/bad.mp4', detectionType: 'motion',
  },
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
  {
    id: 'medium_descriptions_EMPTY', level: 'medium', category: 'descriptions', signId: 'EMPTY', title: 'Empty', order: 8,
    description: 'Hold your non-dominant hand flat, palm down. Place your dominant hand\u2019s middle finger on the back of your non-dominant wrist, then slide it forward past the knuckles.',
    tips: [
      'Non-dominant hand stays flat and still, palm down',
      'Only the middle finger makes contact as it slides',
      'The same sign can also mean "available," depending on context',
    ],
    imageUrl: '../assets/images/medium/descriptions/empty.png', videoUrl: '../assets/videos/medium/descriptions/empty.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/e/empty.htm',
  },
  {
    id: 'medium_descriptions_OPEN', level: 'medium', category: 'descriptions', signId: 'OPEN', title: 'Open', order: 9,
    description: 'Start with both flat hands together in front of you, palms facing out, then swing them apart and back toward yourself, like pushing open a pair of double doors.',
    tips: [
      'Hands start touching, side by side',
      'Both hands swing outward together — this is the general "open," not the door-specific version',
      'The opposite motion, hands swinging together, signs CLOSED',
    ],
    imageUrl: '../assets/images/medium/descriptions/open.png', videoUrl: '../assets/videos/medium/descriptions/open.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
  },
  {
    id: 'medium_descriptions_CLOSED', level: 'medium', category: 'descriptions', signId: 'CLOSED', title: 'Closed', order: 10,
    description: 'Start with both flat hands apart, fingers up, palms facing each other, then swing them together to meet in the middle, like shutting a pair of double doors.',
    tips: [
      'Hands start a few inches apart, fingers pointing up',
      'Both hands swing inward together to meet',
      'The opposite motion, hands swinging apart, signs OPEN',
    ],
    imageUrl: '../assets/images/medium/descriptions/closed.png', videoUrl: '../assets/videos/medium/descriptions/closed.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
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
  {
    // DUPLICATE — same sign as medium_animals_BIRD (lifeprint: "the sign BIRD can in context be used to mean chicken").
    id: 'medium_animals_CHICKEN', level: 'medium', category: 'animals', signId: 'CHICKEN', title: 'Chicken', order: 9,
    description: 'Hold your thumb and index finger together in front of your mouth and open and close them like a beak.',
    tips: [
      'Handshape is thumb and index pinching together',
      'Opens and closes like a beak',
      'Same sign already used for BIRD — context tells them apart',
    ],
    imageUrl: '../assets/images/medium/animals/bird.png', videoUrl: '../assets/videos/medium/animals/bird.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_animals_DUCK', level: 'medium', category: 'animals', signId: 'DUCK', title: 'Duck', order: 10,
    description: 'Hold your thumb, index, and middle fingers together in front of your mouth, like a duck\u2019s bill, and open and close them twice.',
    tips: [
      'Handshape uses three fingers (thumb, index, middle) — one more than BIRD',
      'Held right in front of the mouth',
      'Two open-close taps, like quacking',
    ],
    imageUrl: '../assets/images/medium/animals/duck.png', videoUrl: '../assets/videos/medium/animals/duck.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/duck.htm',
  },
  {
    id: 'medium_animals_FISH', level: 'medium', category: 'animals', signId: 'FISH', title: 'Fish', order: 11,
    description: 'Hold your dominant hand flat, fingers together, and move it forward while wiggling it side to side, like a fish swimming through water.',
    tips: [
      'Hand stays flat the whole time',
      'The side-to-side wiggle mimics a fish\u2019s tail',
      'Moves forward as it wiggles, not in place',
    ],
    imageUrl: '../assets/images/medium/animals/fish.png', videoUrl: '../assets/videos/medium/animals/fish.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/fish.htm',
  },
  {
    id: 'medium_animals_RABBIT', level: 'medium', category: 'animals', signId: 'RABBIT', title: 'Rabbit', order: 12,
    description: 'Hold both hands in an \u2018H\u2019 handshape (index and middle fingers extended together) at the sides of your head, like rabbit ears, and bend the fingers backward twice.',
    tips: [
      'Handshape is \u2018H\u2019 — index and middle fingers together, not spread like a \u2018V\u2019',
      'Hands rest at the sides of the head',
      'A double backward bend, like ears flopping',
    ],
    imageUrl: '../assets/images/medium/animals/rabbit.png', videoUrl: '../assets/videos/medium/animals/rabbit.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/rabbit.htm',
  },
  {
    id: 'medium_animals_GOAT', level: 'medium', category: 'animals', signId: 'GOAT', title: 'Goat', order: 13,
    description: 'Form a bent \u2018V\u2019 handshape (index and middle fingers bent) and touch your chin, then touch your upper forehead, in one quick motion.',
    tips: [
      'Handshape stays a bent \u2018V\u2019 throughout',
      'Two touch points: chin first, then forehead',
      'Think of a goat\u2019s beard and horns',
    ],
    imageUrl: '../assets/images/medium/animals/goat.png', videoUrl: '../assets/videos/medium/animals/goat.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · HOME (Unit 23) ── (new this pass — unlocks Unit 23.
  // HOME and BATHROOM are duplicates of signs already verified
  // elsewhere in this file (see medium_places_HOME and
  // medium_health_BATHROOM); the other 8 words are fresh lifeprint.com
  // (ASLU) research, cross-checked against Handspeak, aslbloom, and
  // other secondary sources.)
  {
    id: 'medium_home_HOUSE', level: 'medium', category: 'home', signId: 'HOUSE', title: 'House', order: 1,
    description: 'Touch the fingertips of both flat hands together above your head, like the peak of a roof, then pull them apart and angle them down to trace the slanted sides of the house.',
    tips: [
      'Both hands stay flat, palms facing each other',
      'Starts at a peak, then comes down and out on both sides',
      'Not the same sign as HOME — see below',
    ],
    imageUrl: '../assets/images/medium/home/house.png', videoUrl: '../assets/videos/medium/home/house.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/house.htm',
  },
  {
    // DUPLICATE — same sign as medium_places_HOME.
    id: 'medium_home_HOME', level: 'medium', category: 'home', signId: 'HOME', title: 'Home', order: 2,
    description: 'Bring your fingertips and thumb together into a flattened ‘O’ shape. Touch them to the corner of your mouth, then move your hand back to touch your cheek near your ear.',
    tips: [
      'Two touches: mouth corner, then cheek/ear',
      'Keep the hand shape compact the whole time',
      'Same sign already used for HOME under Places',
    ],
    imageUrl: '../assets/images/medium/places/home.png', videoUrl: '../assets/videos/medium/places/home.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_home_BEDROOM', level: 'medium', category: 'home', signId: 'BEDROOM', title: 'Bedroom', order: 3,
    description: 'A compound sign: rest the side of your head on your open flat hand at the cheek, like resting on a pillow, then trace the shape of a box in front of you with both flat hands.',
    tips: [
      'First part (BED): hand flat, head tilts to rest on it',
      'Second part (ROOM): hands trace a box — sides, then front/back',
      'This is BED + ROOM signed together',
    ],
    imageUrl: '../assets/images/medium/home/bedroom.png', videoUrl: '../assets/videos/medium/home/bedroom.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bedroom.htm',
  },
  {
    // DUPLICATE — same sign as medium_health_BATHROOM.
    id: 'medium_home_BATHROOM', level: 'medium', category: 'home', signId: 'BATHROOM', title: 'Bathroom', order: 4,
    description: 'Form a ‘T’ handshape (fist with your thumb tucked between your index and middle fingers) and shake it gently side to side.',
    tips: [
      'Thumb pokes out between index and middle finger',
      'Small, quick side-to-side shake',
      'Same sign already used for BATHROOM under Needs',
    ],
    imageUrl: '../assets/images/medium/health/bathroom.png', videoUrl: '../assets/videos/medium/health/bathroom.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_home_KITCHEN', level: 'medium', category: 'home', signId: 'KITCHEN', title: 'Kitchen', order: 5,
    description: 'Like the sign for COOK, but flip a ‘K’ handshape (index and middle finger extended, thumb between them) over your other flat palm instead of a flat hand.',
    tips: [
      'Base hand stays flat, palm up, the whole time',
      'Dominant hand is a ‘K’ handshape, not flat like COOK',
      'One clear flipping motion is enough',
    ],
    imageUrl: '../assets/images/medium/home/kitchen.png', videoUrl: '../assets/videos/medium/home/kitchen.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/k/kitchen.htm',
  },
  {
    id: 'medium_home_LIVING', level: 'medium', category: 'home', signId: 'LIVING', title: 'Living Room', order: 6,
    description: 'A compound sign: brush the thumb of your open hand upward on your chest twice, then trace the shape of a box in front of you with both flat hands.',
    tips: [
      'First part (POLITE): thumb brushes up the chest in a small circle',
      'Second part (ROOM): hands trace a box shape',
      'This is POLITE + ROOM — the standard way to sign ‘living room’',
    ],
    imageUrl: '../assets/images/medium/home/living.png', videoUrl: '../assets/videos/medium/home/living.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/living-room.htm',
  },
  {
    id: 'medium_home_DINING', level: 'medium', category: 'home', signId: 'DINING', title: 'Dining Room', order: 7,
    description: 'A compound sign: bring the fingertips of your flat-O hand to your mouth as if eating, then trace the shape of a box in front of you with both flat hands.',
    tips: [
      'First part (EAT): fingertips tap toward the mouth',
      'Second part (ROOM): hands trace a box shape',
      'This is EAT + ROOM — the standard way to sign ‘dining room’',
    ],
    imageUrl: '../assets/images/medium/home/dining.png', videoUrl: '../assets/videos/medium/home/dining.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dining-room.htm',
  },
  {
    id: 'medium_home_GARAGE', level: 'medium', category: 'home', signId: 'GARAGE', title: 'Garage', order: 8,
    description: 'Hold a horizontal ‘3’ handshape (thumb, index, and middle finger extended) under your other flat hand, and move it forward and back twice, like a car driving in under a roof.',
    tips: [
      'Handshape is a horizontal ‘3’ — thumb, index, middle finger',
      'Top hand stays flat and still, like a ceiling',
      'Double forward-back motion for the noun ‘garage’',
    ],
    imageUrl: '../assets/images/medium/home/garage.png', videoUrl: '../assets/videos/medium/home/garage.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/garage.htm',
  },
  {
    id: 'medium_home_GARDEN', level: 'medium', category: 'home', signId: 'GARDEN', title: 'Garden', order: 9,
    description: 'Start with your dominant flat-O hand, palm up, resting inside your other loosely closed fist. Push it upward while opening the fingers, like a plant sprouting out of the ground, and repeat.',
    tips: [
      'Starts closed inside the base hand, like a seed',
      'Opens into a spread hand as it rises',
      'Repeated motion — a single motion means GROW instead',
    ],
    imageUrl: '../assets/images/medium/home/garden.png', videoUrl: '../assets/videos/medium/home/garden.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/garden.htm',
  },
  {
    id: 'medium_home_YARD', level: 'medium', category: 'home', signId: 'YARD', title: 'Yard', order: 10,
    description: 'Hold an open ‘5’ hand out in front of you, palm down, and sweep it in a flat, horizontal circle, gesturing at the outdoor space around the house.',
    tips: [
      'Handshape is an open ‘5’, moving in a flat horizontal circle',
      'Same general sign as FIELD/AREA, not a dedicated ‘yard’ sign',
      'Context (like pointing near HOUSE) shows you mean the yard',
    ],
    imageUrl: '../assets/images/medium/home/yard.png', videoUrl: '../assets/videos/medium/home/yard.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/field.htm',
  },

  // ── MEDIUM · FURNITURE (Unit 24) ── (new this pass — unlocks Unit 24.
  // All 11 words are fresh lifeprint.com (ASLU) research, cross-checked
  // against Handspeak, aslbloom, signingsavvy, and other secondary
  // sources. DESK and CLOSET are duplicates of TABLE and CABINET —
  // lifeprint documents DESK as literally the same sign as TABLE, and
  // CLOSET/CABINET/cupboard/locker all share the DOOR sign, with
  // meaning coming from context rather than handshape.)
  {
    id: 'medium_furniture_BED', level: 'medium', category: 'furniture', signId: 'BED', title: 'Bed', order: 1,
    description: 'Rest the side of your head against your flat hand (or both hands together), like resting on a pillow, tilting your head slightly to the side.',
    tips: [
      'Hand(s) rest against the side of the head, not on top',
      'A brief hold, not a repeated motion',
      'Most signers do this on their right side',
    ],
    imageUrl: '../assets/images/medium/furniture/bed.png', videoUrl: '../assets/videos/medium/furniture/bed.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bed.htm',
  },
  {
    id: 'medium_furniture_PILLOW', level: 'medium', category: 'furniture', signId: 'PILLOW', title: 'Pillow', order: 2,
    description: 'Hold both open ‘5’ hands, palms facing each other, at the sides of your head — the same position as BED — and gently bend your fingers a few times, like squeezing a pillow.',
    tips: [
      'Same head position as BED, but hands stay open and apart',
      'Fingers bend and flex a few times, not a single motion',
      'A squeezing motion, like fluffing a pillow',
    ],
    imageUrl: '../assets/images/medium/furniture/pillow.png', videoUrl: '../assets/videos/medium/furniture/pillow.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pillow.htm',
  },
  {
    id: 'medium_furniture_BLANKET', level: 'medium', category: 'furniture', signId: 'BLANKET', title: 'Blanket', order: 3,
    description: 'With both hands slightly bent, thumbs tucked under the fingers, pull your hands up toward your chest in a double movement, like pulling a blanket up over yourself.',
    tips: [
      'Thumbs tuck under the fingers, not alongside them',
      'Double movement — a big pull, then a smaller repeat',
      'Thumbs alongside (not under) the fingers means SATISFY instead',
    ],
    imageUrl: '../assets/images/medium/furniture/blanket.png', videoUrl: '../assets/videos/medium/furniture/blanket.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/blanket.htm',
  },
  {
    id: 'medium_furniture_CHAIR', level: 'medium', category: 'furniture', signId: 'CHAIR', title: 'Chair', order: 4,
    description: 'Like the sign for SIT, but tap your bent two-finger ‘H’ handshape down on your other hand’s fingers twice instead of once.',
    tips: [
      'Same handshape as SIT — bent index and middle fingers',
      'Two taps make it the noun CHAIR; one tap means the verb SIT',
      'Base hand stays flat and still underneath',
    ],
    imageUrl: '../assets/images/medium/furniture/chair.png', videoUrl: '../assets/videos/medium/furniture/chair.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/chair.htm',
  },
  {
    id: 'medium_furniture_TABLE', level: 'medium', category: 'furniture', signId: 'TABLE', title: 'Table', order: 5,
    description: 'Hold both forearms horizontal in front of you, one on top of the other, then lower your dominant arm to rest flat on top of the other — showing a flat tabletop.',
    tips: [
      'Both arms/hands stay flat and horizontal',
      'One clean downward landing motion',
      'Also means DESK — a ‘D’ handshape version exists but isn’t required',
    ],
    imageUrl: '../assets/images/medium/furniture/table.png', videoUrl: '../assets/videos/medium/furniture/table.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/table.htm',
  },
  {
    id: 'medium_furniture_SOFA', level: 'medium', category: 'furniture', signId: 'SOFA', title: 'Sofa', order: 6,
    description: 'Sign SIT (bent two fingers tapping down), then hold both hands in a curved ‘C’ shape and move them outward to show the length of the couch.',
    tips: [
      'First part borrows the SIT handshape',
      'Second part uses curved ‘C’ hands, not flat ones',
      'Once the topic is established, many signers drop the SIT part',
    ],
    imageUrl: '../assets/images/medium/furniture/sofa.png', videoUrl: '../assets/videos/medium/furniture/sofa.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/couch.htm',
  },
  {
    // DUPLICATE — same sign as medium_furniture_TABLE (this sign covers both).
    id: 'medium_furniture_DESK', level: 'medium', category: 'furniture', signId: 'DESK', title: 'Desk', order: 7,
    description: 'Hold both forearms horizontal in front of you, one on top of the other, then lower your dominant arm to rest flat on top of the other — showing a flat tabletop.',
    tips: [
      'Both arms/hands stay flat and horizontal',
      'One clean downward landing motion',
      'Same sign already used for TABLE — some signers add a ‘D’ handshape to specify desk',
    ],
    imageUrl: '../assets/images/medium/furniture/table.png', videoUrl: '../assets/videos/medium/furniture/table.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_furniture_SHELF', level: 'medium', category: 'furniture', signId: 'SHELF', title: 'Shelf', order: 8,
    description: 'Hold both flat hands together in front of you, palms down, fingertips touching, then smoothly pull them apart to trace a flat horizontal line at chest height.',
    tips: [
      'Hands start together, fingertips touching',
      'Pull apart in one smooth, level motion',
      'Done lower and it reads as FLOOR instead',
    ],
    imageUrl: '../assets/images/medium/furniture/shelf.png', videoUrl: '../assets/videos/medium/furniture/shelf.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/shelf.htm',
  },
  {
    id: 'medium_furniture_CABINET', level: 'medium', category: 'furniture', signId: 'CABINET', title: 'Cabinet', order: 9,
    description: 'The same sign as DOOR — your dominant flat hand, fingers up, pivots open and then closed, like a hinge at your pinkie. Context makes clear you mean a cabinet, not an actual door.',
    tips: [
      'Only the dominant hand moves; the hinge is at the pinkie side',
      'One open-then-close pivot',
      'Same sign also covers CLOSET, cupboard, and locker',
    ],
    imageUrl: '../assets/images/medium/furniture/cabinet.png', videoUrl: '../assets/videos/medium/furniture/cabinet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
  },
  {
    // DUPLICATE — same sign as medium_furniture_CABINET (both are context-dependent uses of DOOR).
    id: 'medium_furniture_CLOSET', level: 'medium', category: 'furniture', signId: 'CLOSET', title: 'Closet', order: 10,
    description: 'The same sign as DOOR — your dominant flat hand, fingers up, pivots open and then closed, like a hinge at your pinkie. Context makes clear you mean a closet, not an actual door.',
    tips: [
      'Only the dominant hand moves; the hinge is at the pinkie side',
      'One open-then-close pivot',
      'Same sign already used for CABINET above — also covers cupboard and locker',
    ],
    imageUrl: '../assets/images/medium/furniture/cabinet.png', videoUrl: '../assets/videos/medium/furniture/cabinet.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_furniture_LAMP', level: 'medium', category: 'furniture', signId: 'LAMP', title: 'Lamp', order: 11,
    description: 'Hold your non-dominant flat hand out, palm down, as the base. Rest your dominant hand’s fingertips near it, loosely closed together, then open them into a spread hand while moving downward, like light shining down from a lamp.',
    tips: [
      'Non-dominant hand stays flat and still, like a tabletop',
      'Dominant hand opens while moving down and out',
      'Same general idea as the sign for LIGHT',
    ],
    imageUrl: '../assets/images/medium/furniture/lamp.png', videoUrl: '../assets/videos/medium/furniture/lamp.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/light.htm',
  },

  // ── MEDIUM · BATHROOM (Unit 26) ── (UNLOCKED 2026-09-01 — researched
  // against lifeprint.com, cross-checked against Handspeak/PocketSign/
  // StrongASL/SigningSavvy. TOILET is a duplicate of medium_home_BATHROOM
  // (ASLU: same "T"-handshake sign covers both BATHROOM and TOILET —
  // context, and often raised eyebrows, tells them apart). TOOTHBRUSH is a
  // duplicate of medium_health_BRUSH_TEETH (SigningSavvy: the noun shares
  // the verb's sign). SINK dropped from words[] — no dedicated ASLU sign,
  // Dr. Bill recommends fingerspelling S-I-N-K.)
  {
    // DUPLICATE — same sign as medium_home_BATHROOM.
    id: 'medium_bathroom_TOILET', level: 'medium', category: 'bathroom', signId: 'TOILET', title: 'Toilet', order: 1,
    description: 'Form a \u2018T\u2019 handshape (fist with your thumb tucked between your index and middle fingers) and shake it gently side to side.',
    tips: [
      'Thumb pokes out between the index and middle finger',
      'Small, quick side-to-side shake',
      'Same physical sign as BATHROOM under Home \u2014 context (and often raised eyebrows) tells them apart',
    ],
    imageUrl: '../assets/images/medium/health/bathroom.png', videoUrl: '../assets/videos/medium/health/bathroom.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_bathroom_SHOWER', level: 'medium', category: 'bathroom', signId: 'SHOWER', title: 'Shower', order: 2,
    description: 'Hold your dominant hand in an \u2018S\u2019 (fist) shape just above your head, then open it into a spread \u20185\u2019 hand as you move it slightly downward, like water spraying down.',
    tips: [
      'Hand stays near/above the head the whole time \u2014 where a showerhead would be',
      'Handshape opens from a fist to spread fingers as it moves',
      'A single crisp opening motion, not a repeated shake',
    ],
    imageUrl: '../assets/images/medium/bathroom/shower.png', videoUrl: '../assets/videos/medium/bathroom/shower.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/shower.htm',
  },
  {
    id: 'medium_bathroom_BATHTUB', level: 'medium', category: 'bathroom', signId: 'BATHTUB', title: 'Bathtub', order: 3,
    description: 'Sign BATH first \u2014 both hands in \u2018A\u2019 fists, rubbing up and down your chest like scrubbing \u2014 then fingerspell T-U-B.',
    tips: [
      'This is a compound: the BATH motion, then fingerspelling',
      'BATH uses the same rubbing handshape as washing your body, not a flat hand',
      'lifeprint.com documents this as sign + fingerspell, not a single fixed sign',
    ],
    imageUrl: '../assets/images/medium/bathroom/bathtub.png', videoUrl: '../assets/videos/medium/bathroom/bathtub.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bathtub.htm',
  },
  {
    id: 'medium_bathroom_SOAP', level: 'medium', category: 'bathroom', signId: 'SOAP', title: 'Soap', order: 4,
    description: 'Hold your non-dominant hand flat, palm up. Brush your dominant hand\u2019s fingertips across the palm twice, like lathering a bar of soap.',
    tips: [
      'Base hand stays flat, palm up, like a bar of soap',
      'Two short brushing strokes across the palm',
      'Fingertips do the brushing \u2014 not a flat-hand rub',
    ],
    imageUrl: '../assets/images/medium/bathroom/soap.png', videoUrl: '../assets/videos/medium/bathroom/soap.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/soap.htm',
  },
  {
    id: 'medium_bathroom_SHAMPOO', level: 'medium', category: 'bathroom', signId: 'SHAMPOO', title: 'Shampoo', order: 5,
    description: 'Hold both loosely curved \u20185\u2019 hands at the sides of your head and rub them back and forth, like massaging shampoo into your hair.',
    tips: [
      'Both hands work at the sides of the head, not just one',
      'Fingers stay loosely curved, not flat or in fists',
      'A back-and-forth rubbing motion, like scrubbing your scalp',
    ],
    imageUrl: '../assets/images/medium/bathroom/shampoo.png', videoUrl: '../assets/videos/medium/bathroom/shampoo.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/shampoo.htm',
  },
  {
    id: 'medium_bathroom_TOWEL', level: 'medium', category: 'bathroom', signId: 'TOWEL', title: 'Towel', order: 6,
    description: 'Mime holding a towel behind your neck with both hands and pull it side to side, like drying your back.',
    tips: [
      'Both hands stay up near the back of the neck/shoulders',
      'A side-to-side pulling motion, like a towel-drying rub',
      'Hands are loosely closed, as if actually gripping a towel',
    ],
    imageUrl: '../assets/images/medium/bathroom/towel.png', videoUrl: '../assets/videos/medium/bathroom/towel.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/towel.htm',
  },
  {
    // DUPLICATE — same sign as medium_health_BRUSH_TEETH.
    id: 'medium_bathroom_TOOTHBRUSH', level: 'medium', category: 'bathroom', signId: 'TOOTHBRUSH', title: 'Toothbrush', order: 7,
    description: 'Hold your index finger in front of your teeth and brush it back and forth, like brushing your teeth.',
    tips: [
      'Only the index finger is extended',
      'Quick back-and-forth motion',
      'Same physical sign already used for BRUSH TEETH under Health \u2014 context tells the noun and verb apart',
    ],
    imageUrl: '../assets/images/medium/health/brush_teeth.png', videoUrl: '../assets/videos/medium/health/brush_teeth.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_bathroom_TOOTHPASTE', level: 'medium', category: 'bathroom', signId: 'TOOTHPASTE', title: 'Toothpaste', order: 8,
    description: 'Sign BRUSH TEETH (index finger brushing side to side in front of your teeth), then mime squeezing a tube with your other hand, like squeezing out toothpaste.',
    tips: [
      'First part reuses the BRUSH TEETH motion',
      'Second part mimes squeezing a tube between your fingers',
      'This is a compound sign \u2014 two parts signed in sequence',
    ],
    imageUrl: '../assets/images/medium/bathroom/toothpaste.png', videoUrl: '../assets/videos/medium/bathroom/toothpaste.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/toothpaste.htm',
  },

  // ── MEDIUM · KITCHEN (Unit 27) ── (UNLOCKED 2026-09-01 — researched
  // against lifeprint.com, cross-checked against Handspeak/PocketSign/
  // StrongASL/SigningSavvy. CUP/SPOON/FORK are duplicates of the existing
  // medium_food_CUP/SPOON/FORK entries. AUDIT NOTE: while verifying CUP
  // against lifeprint.com/asl101/pages-signs/c/cup.htm ("place your right
  // hand into your uplifted left palm"), found the source medium_food_CUP
  // entry says the dominant hand taps the *back* of the other hand — that
  // looks like an error (should be the upturned *palm*). Left medium_food_
  // CUP itself untouched since 'food' wasn't in scope this pass (it also
  // has an unrelated words[] mismatch flagged separately), but this
  // KITCHEN duplicate uses the corrected palm-up version. Worth fixing
  // medium_food_CUP to match next time that category is in scope.
  // STOVE, OVEN, FREEZER, POT, and PAN dropped from words[] — no dedicated
  // ASLU sign for any of them (Dr. Bill explicitly recommends fingerspelling
  // STOVE and OVEN; no clear ASLU-documented sign for FREEZER/POT/PAN as
  // kitchen nouns).)
  {
    id: 'medium_kitchen_REFRIGERATOR', level: 'medium', category: 'kitchen', signId: 'REFRIGERATOR', title: 'Refrigerator', order: 1,
    description: 'Form both hands into \u2018R\u2019 handshapes (crossed index and middle fingers) and shake them gently, like shivering from the cold.',
    tips: [
      'Handshape is \u2018R\u2019 on both hands \u2014 an initialized, cold-shiver version of COLD',
      'A small shaking/shivering motion, not a big shake',
      'Some signers just fingerspell "REF" instead \u2014 both are understood',
    ],
    imageUrl: '../assets/images/medium/kitchen/refrigerator.png', videoUrl: '../assets/videos/medium/kitchen/refrigerator.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/refrigerator.htm',
  },
  {
    id: 'medium_kitchen_PLATE', level: 'medium', category: 'kitchen', signId: 'PLATE', title: 'Plate', order: 2,
    description: 'Using the thumb and index finger of each hand, trace the outer edge of an imaginary circular plate in front of you.',
    tips: [
      'Both hands trace together, tracing a circle\u2019s edge',
      'Thumb and index finger stay close together as they trace \u2014 like tracing a rim',
      'Same sign covers both "plate" and "dish"',
    ],
    imageUrl: '../assets/images/medium/kitchen/plate.png', videoUrl: '../assets/videos/medium/kitchen/plate.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dish.htm',
  },
  {
    id: 'medium_kitchen_BOWL', level: 'medium', category: 'kitchen', signId: 'BOWL', title: 'Bowl', order: 3,
    description: 'Hold both hands slightly curved, palms up, side by side, showing the round shape and depth of a bowl.',
    tips: [
      'Hands are curved, not flat \u2014 this is what shows the "bowl" shape',
      'Can be made bigger or smaller to show the size of the bowl',
      'Held shape more than a repeated motion',
    ],
    imageUrl: '../assets/images/medium/kitchen/bowl.png', videoUrl: '../assets/videos/medium/kitchen/bowl.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bowl.htm',
  },
  {
    // DUPLICATE — same sign as medium_food_CUP, with a corrected description
    // (see AUDIT NOTE above the KITCHEN section header).
    id: 'medium_kitchen_CUP', level: 'medium', category: 'kitchen', signId: 'CUP', title: 'Cup', order: 4,
    description: 'Hold your non-dominant hand flat, palm up. Form a \u2018C\u2019 handshape with your dominant hand and tap it down into your upturned palm, as if setting a small cup there.',
    tips: [
      'Base hand is flat, palm UP \u2014 not palm down',
      'Dominant hand keeps a clear \u2018C\u2019 curve',
      'A small double tap: touch the palm, lift an inch, touch again',
    ],
    imageUrl: '../assets/images/medium/food/cup.png', videoUrl: '../assets/videos/medium/food/cup.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cup.htm',
  },
  {
    id: 'medium_kitchen_GLASS', level: 'medium', category: 'kitchen', signId: 'GLASS', title: 'Glass', order: 5,
    description: 'Same as CUP \u2014 non-dominant hand flat, palm up, dominant hand in a \u2018C\u2019 shape \u2014 but move the \u2018C\u2019 hand higher, about 3\u20134 inches above the palm, to show a taller container.',
    tips: [
      'Same handshape as CUP; only the height of the motion changes',
      'A noticeably bigger, higher motion than CUP',
      'An even taller/bigger version of this same motion signs BOTTLE',
    ],
    imageUrl: '../assets/images/medium/kitchen/glass.png', videoUrl: '../assets/videos/medium/kitchen/glass.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cup.htm',
  },
  {
    // DUPLICATE — same sign as medium_food_SPOON.
    id: 'medium_kitchen_SPOON', level: 'medium', category: 'kitchen', signId: 'SPOON', title: 'Spoon', order: 6,
    description: 'Hold your non-dominant hand flat, palm up. Use your dominant hand\u2019s curved index and middle fingers to scoop across the palm, like using a spoon.',
    tips: [
      'Base hand stays flat and still',
      'Scooping hand curves slightly, like a spoon\u2019s bowl',
      'One smooth scoop across the palm',
    ],
    imageUrl: '../assets/images/medium/food/spoon.png', videoUrl: '../assets/videos/medium/food/spoon.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_food_FORK.
    id: 'medium_kitchen_FORK', level: 'medium', category: 'kitchen', signId: 'FORK', title: 'Fork', order: 7,
    description: 'Hold your non-dominant hand flat, palm up. Tap your dominant hand\u2019s extended index and middle fingers down onto the palm twice, like a fork stabbing food.',
    tips: [
      'Handshape is a \u2018V\u2019/\u2018U\u2019 \u2014 two fingers extended',
      'Two short downward taps',
      'Base hand stays flat and still',
    ],
    imageUrl: '../assets/images/medium/food/fork.png', videoUrl: '../assets/videos/medium/food/fork.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_kitchen_KNIFE', level: 'medium', category: 'kitchen', signId: 'KNIFE', title: 'Knife', order: 8,
    description: 'Hold your non-dominant index finger up, palm facing you. Slide your dominant index finger downward along it, making a small backward slicing motion as it passes the knuckle.',
    tips: [
      'Both hands use a simple index-finger \u2018 1\u2019 handshape',
      'The slicing motion happens right at the non-dominant knuckle',
      'Don\u2019t confuse with CAN\u2019T, which whacks straight down instead of slicing',
    ],
    imageUrl: '../assets/images/medium/kitchen/knife.png', videoUrl: '../assets/videos/medium/kitchen/knife.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/k/knife.htm',
  },

  // ── MEDIUM · HOUSEHOLD (Unit 25) ── (researched against lifeprint.com,
  // cross-checked against Handspeak/aslbloom/PocketSign/SigningSavvy.
  // TOY and BAG dropped from words[] — ASLU explicitly recommends
  // fingerspelling both (T-O-Y and B-A-G) rather than using a dedicated
  // sign; same treatment as SINK/STOVE/OVEN/FREEZER/POT/PAN elsewhere in
  // this file.)
  {
    id: 'medium_household_DOOR', level: 'medium', category: 'household', signId: 'DOOR', title: 'Door', order: 1,
    description: 'Hold your dominant flat hand up, fingers pointing up, then pivot it open and closed at the wrist, like swinging a door on a hinge at your pinkie side.',
    tips: [
      'The "hinge" is at the pinkie edge of your hand',
      'One clear open-then-close pivot',
      'Same sign also covers CABINET and CLOSET, depending on context',
    ],
    imageUrl: '../assets/images/medium/household/door.png', videoUrl: '../assets/videos/medium/household/door.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
  },
  {
    id: 'medium_household_WINDOW', level: 'medium', category: 'household', signId: 'WINDOW', title: 'Window', order: 2,
    description: 'Hold your non-dominant flat hand up as the window frame. Slide your dominant flat hand upward along it, then back down, like opening and closing a window.',
    tips: [
      'Non-dominant hand stays still, like the window frame',
      'Up-then-down motion — up opens it, down closes it',
      'A single quick down motion alone can mean "close the window"',
    ],
    imageUrl: '../assets/images/medium/household/window.png', videoUrl: '../assets/videos/medium/household/window.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/window.htm',
  },
  {
    id: 'medium_household_WALL', level: 'medium', category: 'household', signId: 'WALL', title: 'Wall', order: 3,
    description: 'Hold both flat hands in front of you, palms facing out and fingertips up, then slide them apart to the sides, like showing the flat, smooth surface of a wall.',
    tips: [
      'Palms face outward, away from you',
      'Hands move apart to the sides, not up and down',
      'A held, flat handshape throughout',
    ],
    imageUrl: '../assets/images/medium/household/wall.png', videoUrl: '../assets/videos/medium/household/wall.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wall.htm',
  },
  {
    id: 'medium_household_FLOOR', level: 'medium', category: 'household', signId: 'FLOOR', title: 'Floor', order: 4,
    description: 'Hold both flat hands together in front of you, low near your waist, palms down, then pull them apart to the sides, showing a low, flat surface.',
    tips: [
      'Done low, near waist height — that\u2019s what separates it from SHELF',
      'Palms face down, not out',
      'A smooth, level motion apart',
    ],
    imageUrl: '../assets/images/medium/household/floor.png', videoUrl: '../assets/videos/medium/household/floor.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/floor.htm',
  },
  {
    id: 'medium_household_ROOF', level: 'medium', category: 'household', signId: 'ROOF', title: 'Roof', order: 5,
    description: 'Touch the fingertips of both flat hands together above you, forming a peak, like the top of a roof — the same starting shape as the sign for HOUSE, without continuing into the walls.',
    tips: [
      'Both hands stay flat, touching only at the fingertips',
      'A peaked, angled shape, not a flat horizontal one',
      'This is the first half of the sign for HOUSE',
    ],
    imageUrl: '../assets/images/medium/household/roof.png', videoUrl: '../assets/videos/medium/household/roof.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/roof.htm',
  },
  {
    id: 'medium_household_CLOCK', level: 'medium', category: 'household', signId: 'CLOCK', title: 'Clock', order: 6,
    description: 'Sign TIME first — tap your wrist with your index finger — then curve your other hand into a \u2018C\u2019 shape to show the round size of the clock\u2019s face.',
    tips: [
      'Two parts: the wrist tap, then the C-shaped size classifier',
      'A smaller, rounder \u2018C\u2019 typically shows a desk clock',
      'The classifier can change size/shape depending on the type of clock',
    ],
    imageUrl: '../assets/images/medium/household/clock.png', videoUrl: '../assets/videos/medium/household/clock.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/clock.htm',
  },
  {
    id: 'medium_household_MIRROR', level: 'medium', category: 'household', signId: 'MIRROR', title: 'Mirror', order: 7,
    description: 'Hold your dominant hand flat, fingers together, near the side of your face, palm angled toward you, and twist it back and forth at the wrist a couple of times, like checking your reflection in a hand mirror.',
    tips: [
      'Hand stays near your face, not out in front of you',
      'A small twisting motion at the wrist, not the whole arm',
      'A bigger, slower version of this same motion can mean SEEM/appears',
    ],
    imageUrl: '../assets/images/medium/household/mirror.png', videoUrl: '../assets/videos/medium/household/mirror.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/mirror.htm',
  },
  {
    id: 'medium_household_FAN', level: 'medium', category: 'household', signId: 'FAN', title: 'Fan', order: 8,
    description: 'Form your dominant hand into a fist with your index finger extended, and move it in small circles above your head, like a ceiling fan spinning.',
    tips: [
      'Only the index finger sticks out — the rest of the hand stays closed',
      'Small circles, held above the head',
      'A handheld fan can instead be shown by fanning a flat hand near your face',
    ],
    imageUrl: '../assets/images/medium/household/fan.png', videoUrl: '../assets/videos/medium/household/fan.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/ceiling-fan.htm',
  },
  {
    id: 'medium_household_TV', level: 'medium', category: 'household', signId: 'TV', title: 'TV', order: 9,
    description: 'Form the fingerspelled letter \u2018T,\u2019 then change your handshape to the letter \u2018V\u2019 — the standard two-letter abbreviation for television.',
    tips: [
      'Just two letters: T, then V — not the full word',
      'Keep the transition between the two handshapes crisp',
      'More common in everyday conversation than fingerspelling the whole word',
    ],
    imageUrl: '../assets/images/medium/household/tv.png', videoUrl: '../assets/videos/medium/household/tv.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/tv.htm',
  },
  {
    id: 'medium_household_REMOTE', level: 'medium', category: 'household', signId: 'REMOTE', title: 'Remote', order: 10,
    description: 'Hold your non-dominant hand as if gripping a small remote control, and use your dominant thumb to mime repeatedly pressing buttons on top of it.',
    tips: [
      'Non-dominant hand shapes around an imaginary remote',
      'The thumb does small, repeated pressing motions',
      'Distinct from the sign CONTROL, which uses two hooked hands mimicking reins',
    ],
    imageUrl: '../assets/images/medium/household/remote.png', videoUrl: '../assets/videos/medium/household/remote.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.pocketsign.org/asl/control',
  },
  {
    id: 'medium_household_PHONE', level: 'medium', category: 'household', signId: 'PHONE', title: 'Phone', order: 11,
    description: 'Form a \u2018Y\u2019 handshape (thumb and pinky extended, other fingers folded down) and hold it up to the side of your face, thumb near your ear and pinky near your mouth, like holding an old telephone handset.',
    tips: [
      'Handshape is a \u2018Y\u2019 — thumb and pinky only',
      'Thumb rests near the ear, pinky near the mouth',
      'A held position more than a repeated motion',
    ],
    imageUrl: '../assets/images/medium/household/phone.png', videoUrl: '../assets/videos/medium/household/phone.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/phone.htm',
  },
  {
    id: 'medium_household_COMPUTER', level: 'medium', category: 'household', signId: 'COMPUTER', title: 'Computer', order: 12,
    description: 'Hold your non-dominant arm out, palm down. Form a \u2018C\u2019 handshape with your dominant hand and tap it against your forearm twice, moving from your elbow toward your wrist.',
    tips: [
      'Handshape is a \u2018C\u2019 — an initialized sign for the letter',
      'Two distinct taps, not a smooth slide',
      'Regional variation exists — some sign it by tapping a \u2018C\u2019 on the forehead instead',
    ],
    imageUrl: '../assets/images/medium/household/computer.png', videoUrl: '../assets/videos/medium/household/computer.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/computer.htm',
  },
  {
    id: 'medium_household_BOOK', level: 'medium', category: 'household', signId: 'BOOK', title: 'Book', order: 13,
    description: 'Hold both flat hands together, palms touching like a closed book, then open them upward and outward like pages opening.',
    tips: [
      'Hands start pressed together, fingertips up',
      'A single open motion, like a book being opened',
      'One of the most iconic, easy-to-recognize signs in ASL',
    ],
    imageUrl: '../assets/images/medium/household/book.png', videoUrl: '../assets/videos/medium/household/book.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/book.htm',
  },
  {
    id: 'medium_household_KEY', level: 'medium', category: 'household', signId: 'KEY', title: 'Key', order: 14,
    description: 'Hold your thumb and index finger together as if pinching an imaginary key, and twist your wrist twice, like turning a key in a lock.',
    tips: [
      'A pinching handshape, thumb and index finger together',
      'Two twists — a single twist instead means the verb LOCK',
      'Can be positioned as if unlocking a door in front of you',
    ],
    imageUrl: '../assets/images/medium/household/key.png', videoUrl: '../assets/videos/medium/household/key.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/k/key.htm',
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

  // ── MEDIUM · INSECTS ── (new this pass — unlocks Unit 40)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/aslbloom/pocketsign. ANT note: lifeprint documents that
  // many Deaf signers just use the sign BUG for "ant" or fingerspell
  // it — flagged in the tips below rather than silently omitted.
  // AUDIT (2026-09-01): description corrected — 4 sources (lifeprint,
  // Handspeak, aslbloom, PocketSign) agree the thumb makes contact
  // with the nose (not just "near" it) and the only movement is the
  // two fingers bending/wiggling in place; none document the hand
  // traveling forward. The old wording risked mistraining the motion
  // classifier on a movement that isn't part of the real sign.
  {
    id: 'medium_insects_ANT', level: 'medium', category: 'insects', signId: 'ANT', title: 'Ant', order: 1,
    description: 'Touch your thumb to the tip of your nose with your index and middle fingers extended out in front, then bend those two fingers down and up a couple of times while your thumb stays anchored on your nose.',
    tips: [
      'Thumb tip stays in contact with your nose the whole time — only the fingers move',
      'Only the index and middle fingers extend — the rest of the hand stays closed',
      'Many signers instead use the general sign BUG, or just fingerspell A-N-T',
    ],
    imageUrl: '../assets/images/medium/insects/ant.png', videoUrl: '../assets/videos/medium/insects/ant.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_insects_BUTTERFLY', level: 'medium', category: 'insects', signId: 'BUTTERFLY', title: 'Butterfly', order: 2,
    description: 'Cross your wrists in front of your chest with both hands open and flat, palms facing your body, thumbs linked together, then flutter your fingers like a pair of wings.',
    tips: [
      'Wrists cross at the thumbs, palms facing back toward you',
      'Fingers flutter together like flapping wings',
      'Keep the crossed-hand position steady while only the fingers move',
    ],
    imageUrl: '../assets/images/medium/insects/butterfly.png', videoUrl: '../assets/videos/medium/insects/butterfly.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_insects_BEE', level: 'medium', category: 'insects', signId: 'BEE', title: 'Bee', order: 3,
    description: 'Touch your fingertip to your cheek as if a bee just stung you there, then quickly brush the same spot as if swatting the bee away.',
    tips: [
      'First contact is a light touch to the cheek — the "sting"',
      'Follow immediately with a quick brushing motion — the "swat"',
      'A brief wince or startled expression sells the meaning',
    ],
    imageUrl: '../assets/images/medium/insects/bee.png', videoUrl: '../assets/videos/medium/insects/bee.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_insects_SPIDER', level: 'medium', category: 'insects', signId: 'SPIDER', title: 'Spider', order: 4,
    description: 'Hold both hands in a curved, claw-like ‘5’ shape, one resting just above the other, and wiggle all your fingers up and down as you move both hands forward a short distance, like a spider crawling on its legs.',
    tips: [
      'Both hands curve into a loose claw/‘5’ shape — this represents the legs',
      'Fingers wiggle continuously while the hands move forward',
      'Keep the motion low and close together, like small skittering steps',
    ],
    imageUrl: '../assets/images/medium/insects/spider.png', videoUrl: '../assets/videos/medium/insects/spider.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · SEASONS ── (new this pass — unlocks Unit 47)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/ava.me/aslbloom. WINTER note: lifeprint documents this
  // as literally the same sign as COLD, disambiguated by context, an
  // optional 'W' handshape, or a mouth movement — captured in the tips
  // rather than treated as a separate, unrelated handshape.
  {
    id: 'medium_seasons_SPRING', level: 'medium', category: 'seasons', signId: 'SPRING', title: 'Spring', order: 1,
    description: 'Pinch your dominant hand\u2019s fingers and thumb together and rest it inside your loosely closed non-dominant fist, then push it up and out while opening your fingers into a spread \u20185\u2019, like a plant sprouting and blooming.',
    tips: [
      'Non-dominant fist represents the ground a plant grows from',
      'Dominant hand opens from a pinched point into a spread ‘5’ as it rises',
      'This same single-motion handshape change is also used for GROW',
    ],
    imageUrl: '../assets/images/medium/seasons/spring.png', videoUrl: '../assets/videos/medium/seasons/spring.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_seasons_SUMMER', level: 'medium', category: 'seasons', signId: 'SUMMER', title: 'Summer', order: 2,
    description: 'Curl your index finger into a hook shape, palm facing down, and drag it once across your forehead from your non-dominant side to your dominant side, like wiping sweat from your brow.',
    tips: [
      'Handshape curls from a straight index finger into a hook partway through',
      'One smooth pass across the forehead, palm down',
      'Different from BLACK, which uses the same path but keeps the index finger straight',
    ],
    imageUrl: '../assets/images/medium/seasons/summer.png', videoUrl: '../assets/videos/medium/seasons/summer.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_seasons_FALL', level: 'medium', category: 'seasons', signId: 'FALL', title: 'Fall', order: 3,
    description: 'Hold your non-dominant arm upright and slightly bent, like a leaning tree trunk, then brush the side of your dominant hand down along your non-dominant forearm once or twice, like a leaf falling off a branch.',
    tips: [
      'Non-dominant arm represents a tired, leaning tree',
      'Dominant hand brushes downward along it in a falling motion',
      'Also commonly labeled AUTUMN in ASL dictionaries — same sign',
    ],
    imageUrl: '../assets/images/medium/seasons/fall.png', videoUrl: '../assets/videos/medium/seasons/fall.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_seasons_WINTER', level: 'medium', category: 'seasons', signId: 'WINTER', title: 'Winter', order: 4,
    description: 'Hold both hands in loose fists in front of your chest, elbows down, and shake them slightly inward, like you\u2019re shivering from the cold.',
    tips: [
      'Same handshape and shivering movement as COLD — context tells them apart',
      'A slight shoulder hunch and an uncomfortable facial expression reinforce the meaning',
      'Some signers add a ‘W’ handshape instead of a plain fist to make WINTER unambiguous',
    ],
    imageUrl: '../assets/images/medium/seasons/winter.png', videoUrl: '../assets/videos/medium/seasons/winter.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DAYTIME ── (new this pass — unlocks Unit 54)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/aslbloom. EVENING note: lifeprint documents NIGHT and
  // EVENING as literally the same sign — captured in the tips rather
  // than inventing a distinct handshape that isn't actually used.
  {
    id: 'medium_daytime_MORNING', level: 'medium', category: 'daytime', signId: 'MORNING', title: 'Morning', order: 1,
    description: 'Rest your non-dominant forearm horizontally in front of you, then raise your bent dominant forearm up from beneath it in one smooth motion, like the sun rising over the horizon.',
    tips: [
      'Non-dominant arm stays flat and still — it represents the horizon',
      'Dominant forearm rises up from underneath it, fingertips leading the way',
      'Keep the movement smooth and unhurried, not a sudden jerk upward',
    ],
    imageUrl: '../assets/images/medium/daytime/morning.png', videoUrl: '../assets/videos/medium/daytime/morning.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_daytime_AFTERNOON', level: 'medium', category: 'daytime', signId: 'AFTERNOON', title: 'Afternoon', order: 2,
    description: 'Rest your dominant hand, flat and palm down, near the elbow of your bent non-dominant arm, angled slightly up and forward, roughly like it\u2019s pointing to \u20182 o\u2019clock\u2019.',
    tips: [
      'Dominant hand stays flat and rests near the crook of the other elbow',
      'Angle points slightly upward and forward, not straight out',
      'Just hold the position briefly — no repeated movement needed',
    ],
    imageUrl: '../assets/images/medium/daytime/afternoon.png', videoUrl: '../assets/videos/medium/daytime/afternoon.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_daytime_EVENING', level: 'medium', category: 'daytime', signId: 'EVENING', title: 'Evening', order: 3,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down — the same sign used for NIGHT.',
    tips: [
      'This is the same sign as NIGHT — context or a following word tells them apart',
      'Non-dominant arm stays flat and still, like a horizon line',
      'Dominant hand droops down over it, fingers pointing toward the floor',
    ],
    imageUrl: '../assets/images/medium/daytime/evening.png', videoUrl: '../assets/videos/medium/daytime/evening.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_daytime_NIGHT', level: 'medium', category: 'daytime', signId: 'NIGHT', title: 'Night', order: 4,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down, like the sun dropping below the horizon.',
    tips: [
      'Non-dominant arm represents the horizon, same idea as MORNING',
      'Dominant hand droops down over it instead of rising, like a sunset',
      'This same sign also covers EVENING',
    ],
    imageUrl: '../assets/images/medium/daytime/night.png', videoUrl: '../assets/videos/medium/daytime/night.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DAYS ── (new this pass — unlocks Unit 55)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/ava.me/strongasl. THURSDAY note: lifeprint documents
  // this as using an 'H' handshape specifically because TUESDAY
  // already occupies 'T' — kept in the tips instead of treated as an
  // unrelated, arbitrary choice. SUNDAY note: unlike the other six
  // days, lifeprint documents this as a two-handed, non-initialized
  // sign (no letter handshape) — written accordingly, not forced into
  // the same pattern as the rest.
  {
    id: 'medium_days_MONDAY', level: 'medium', category: 'days', signId: 'MONDAY', title: 'Monday', order: 1,
    description: 'Form an \u2018M\u2019 handshape, palm facing up or back, and circle it in a small loop out in front of your shoulder.',
    tips: [
      'Handshape is \u2018M\u2019 \u2014 three fingers folded over the thumb',
      'The circular movement comes mostly from the elbow, kept small',
      'Palm most often faces up or back, not straight down',
    ],
    imageUrl: '../assets/images/medium/days/monday.png', videoUrl: '../assets/videos/medium/days/monday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_TUESDAY', level: 'medium', category: 'days', signId: 'TUESDAY', title: 'Tuesday', order: 2,
    description: 'Form a \u2018T\u2019 handshape and circle it in a small loop out in front of your shoulder, the same movement pattern used for the other weekday signs.',
    tips: [
      'Handshape is \u2018T\u2019 \u2014 thumb tucked between the index and middle fingers',
      'Keep the circle small and controlled, moving mostly from the wrist',
      'Distinguished from THURSDAY, which uses an \u2018H\u2019 instead',
    ],
    imageUrl: '../assets/images/medium/days/tuesday.png', videoUrl: '../assets/videos/medium/days/tuesday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_WEDNESDAY', level: 'medium', category: 'days', signId: 'WEDNESDAY', title: 'Wednesday', order: 3,
    description: 'Form a \u2018W\u2019 handshape and circle it in a small loop out in front of your shoulder, following the same pattern as the other days of the week.',
    tips: [
      'Handshape is \u2018W\u2019 \u2014 index, middle, and ring fingers spread and extended',
      'Keep the circle small and centered near your shoulder',
      'Same circular-movement family as MONDAY, TUESDAY, and FRIDAY',
    ],
    imageUrl: '../assets/images/medium/days/wednesday.png', videoUrl: '../assets/videos/medium/days/wednesday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_THURSDAY', level: 'medium', category: 'days', signId: 'THURSDAY', title: 'Thursday', order: 4,
    description: 'Form an \u2018H\u2019 handshape (index and middle fingers extended together, pointing slightly upward) and circle it in a small loop out in front of your shoulder.',
    tips: [
      'Uses \u2018H\u2019 instead of \u2018T\u2019, since TUESDAY already uses the \u2018T\u2019 handshape',
      'Some signers briefly show a \u2018T\u2019 changing into the \u2018H\u2019 before circling',
      'Keep the circle small and controlled, from the wrist',
    ],
    imageUrl: '../assets/images/medium/days/thursday.png', videoUrl: '../assets/videos/medium/days/thursday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_FRIDAY', level: 'medium', category: 'days', signId: 'FRIDAY', title: 'Friday', order: 5,
    description: 'Form an \u2018F\u2019 handshape and circle it in a small loop out in front of your shoulder, the same movement pattern used for the other weekday signs.',
    tips: [
      'Handshape is \u2018F\u2019 \u2014 thumb and index finger touch, other three fingers extended',
      'Small circular movement, not a large sweep',
      'Same family of movement as MONDAY, TUESDAY, and WEDNESDAY',
    ],
    imageUrl: '../assets/images/medium/days/friday.png', videoUrl: '../assets/videos/medium/days/friday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_SATURDAY', level: 'medium', category: 'days', signId: 'SATURDAY', title: 'Saturday', order: 6,
    description: 'Form an \u2018S\u2019 handshape (a closed fist) and circle it in a small loop out in front of your shoulder, palm facing forward or up.',
    tips: [
      'Handshape is \u2018S\u2019 \u2014 a simple closed fist',
      'Most signers do this with the palm facing up, which is easier on the wrist',
      'Same circular-movement pattern as the other weekday signs',
    ],
    imageUrl: '../assets/images/medium/days/saturday.png', videoUrl: '../assets/videos/medium/days/saturday.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_days_SUNDAY', level: 'medium', category: 'days', signId: 'SUNDAY', title: 'Sunday', order: 7,
    description: 'Hold both flat, open hands up near your shoulders, palms facing out, and move them in small circles in opposite directions from each other, like washing a window with both hands.',
    tips: [
      'Both hands are flat and open, not a letter handshape like the other weekdays',
      'One hand circles clockwise while the other circles counterclockwise',
      'Don\u2019t confuse this with WONDERFUL, which uses a different movement',
    ],
    imageUrl: '../assets/images/medium/days/sunday.png', videoUrl: '../assets/videos/medium/days/sunday.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DISTANCE ── (new this pass — unlocks Unit 60)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/pocketsign/the indexing.htm reference page. NEAR/CLOSE
  // note: lifeprint explicitly documents NOT-FAR = CLOSE-by = NEAR-by
  // as literally the same sign — written as one shared sign, not two
  // invented variants. THERE note: lifeprint's indexing reference
  // documents "there" as pointing (indexing) rather than a fixed
  // handshape — written that way rather than assigning it an
  // arbitrary handshape it doesn't use.
  {
    id: 'medium_distance_NEAR', level: 'medium', category: 'distance', signId: 'NEAR', title: 'Near', order: 1,
    description: 'Form an \u2018F\u2019 handshape (touch your thumb and index finger together, other fingers extended) and touch the fingertip to the tip of your nose, then pull your hand out and sharply down \u2014 this is the same sign used for CLOSE.',
    tips: [
      'Handshape is \u2018F\u2019 \u2014 thumb and index touch, other three fingers stay up',
      'Start by touching your nose, then pull the hand away and down in one motion',
      'This is the same sign as CLOSE; only the English gloss differs',
    ],
    imageUrl: '../assets/images/medium/distance/near.png', videoUrl: '../assets/videos/medium/distance/near.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_distance_FAR', level: 'medium', category: 'distance', signId: 'FAR', title: 'Far', order: 2,
    description: 'Hold your non-dominant hand still as a base point in front of you, then move your dominant hand away from it in an arcing path \u2014 the further the sign travels, the greater the distance being described.',
    tips: [
      'Non-dominant hand marks a fixed starting point',
      'Dominant hand arcs outward and away from it',
      'A bigger, longer arc conveys a greater distance',
    ],
    imageUrl: '../assets/images/medium/distance/far.png', videoUrl: '../assets/videos/medium/distance/far.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_distance_HERE', level: 'medium', category: 'distance', signId: 'HERE', title: 'Here', order: 3,
    description: 'Hold both hands out in front of you at belly height, palms up, fingers relaxed, and move each hand in a small circle \u2014 forward, out to the side, back toward your body, and in toward each other.',
    tips: [
      'Both palms face up the whole time',
      'Each hand traces its own small circle, not an up-and-down motion',
      'The sign THIS can also be used to mean "here" as in "this place"',
    ],
    imageUrl: '../assets/images/medium/distance/here.png', videoUrl: '../assets/videos/medium/distance/here.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_distance_THERE', level: 'medium', category: 'distance', signId: 'THERE', title: 'There', order: 4,
    description: 'Point your index finger toward the location you\u2019re referring to \u2014 in ASL, "there" is expressed by pointing at (or in the direction of) the place, rather than a fixed handshape.',
    tips: [
      'The exact direction you point is what carries the meaning',
      'Hold the point briefly so the location registers clearly',
      'Uses the same indexing principle as pointing to mean HE, SHE, or THEY',
    ],
    imageUrl: '../assets/images/medium/distance/there.png', videoUrl: '../assets/videos/medium/distance/there.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_distance_CLOSE', level: 'medium', category: 'distance', signId: 'CLOSE', title: 'Close', order: 5,
    description: 'Form an \u2018F\u2019 handshape and touch the fingertip to the tip of your nose, then pull your hand out and sharply down \u2014 the same sign used for NEAR, meaning "not far."',
    tips: [
      'Same handshape and movement as NEAR \u2014 they share one sign',
      'Quick, sharp downward pull right after leaving the nose',
      '"Close" as in "a close call" uses a different, unrelated sign',
    ],
    imageUrl: '../assets/images/medium/distance/close.png', videoUrl: '../assets/videos/medium/distance/close.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_distance_AWAY', level: 'medium', category: 'distance', signId: 'AWAY', title: 'Away', order: 6,
    description: 'Hold your dominant hand open in a loose \u20185\u2019 shape near the side of your face, palm facing out, then flick it forward and away from you, like shooing something off.',
    tips: [
      'Handshape opens from a loose \u20185\u2019, palm facing outward',
      'One quick, deliberate flick outward and away from the body',
      'Facial expression sets the tone \u2014 soft for a gentle "shoo," sharp for "go away!"',
    ],
    imageUrl: '../assets/images/medium/distance/away.png', videoUrl: '../assets/videos/medium/distance/away.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DRINKS ── (new this pass — unlocks Unit 37)
  // Researched on lifeprint.com (ASLU), cross-checked against
  // Handspeak/aslbloom/PocketSign/ASL Interactive. JUICE note: lifeprint's
  // own JUICE entry mostly discusses compound signs (e.g. ORANGE+JUICE);
  // the plain/generic "J-at-the-mouth" sign described below was confirmed
  // against SigningTime, PocketSign, and ASL Interactive instead. SODA
  // note: lifeprint lists "soda," "soda pop," and "pop" as three pages
  // for the exact same sign — captured here as one entry per this file's
  // one-entry-per-physical-sign convention.
  {
    id: 'medium_drinks_WATER', level: 'medium', category: 'drinks', signId: 'WATER', title: 'Water', order: 1,
    description: 'Form a "W" handshape with your dominant hand — index, middle, and ring fingers extended together, thumb holding your pinky down — and tap your index fingertip against your mouth or chin twice.',
    tips: [
      '"W" handshape: index, middle, and ring fingers up, thumb pins the pinky down',
      'Two light taps against the mouth/chin, not one',
      'Initialized sign — the "W" handshape stands for "water"',
    ],
    imageUrl: '../assets/images/medium/drinks/water.png', videoUrl: '../assets/videos/medium/drinks/water.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_drinks_MILK', level: 'medium', category: 'drinks', signId: 'MILK', title: 'Milk', order: 2,
    description: 'Hold your dominant hand out in a loose "C" shape and squeeze it closed into an "S" fist, then open it back into a "C" and squeeze closed again, like squeezing milk from a cow\u2019s udder.',
    tips: [
      'Handshape alternates between a loose "C" and a closed "S" fist',
      'Squeeze/release twice, at a steady pace',
      'The squeezing motion is the whole point of the sign — don\u2019t rush it into one blur',
    ],
    imageUrl: '../assets/images/medium/drinks/milk.png', videoUrl: '../assets/videos/medium/drinks/milk.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_drinks_JUICE', level: 'medium', category: 'drinks', signId: 'JUICE', title: 'Juice', order: 3,
    description: 'Form a "J" handshape — pinky finger extended, other fingers curled into the palm — and trace a small "J" shape in the air right at the corner of your mouth.',
    tips: [
      '"J" handshape: only the pinky is extended, rest of the hand is curled',
      'The tracing motion happens at the corner of the mouth on your dominant side',
      'To specify a flavor, sign the fruit first (e.g. ORANGE, then JUICE)',
    ],
    imageUrl: '../assets/images/medium/drinks/juice.png', videoUrl: '../assets/videos/medium/drinks/juice.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_drinks_SODA', level: 'medium', category: 'drinks', signId: 'SODA', title: 'Soda', order: 4,
    description: 'Form your non-dominant hand into an "O" shape, then bend the middle finger of your spread dominant hand and poke it into the "O." Pull the finger out and immediately slap your dominant palm flat over the "O," like popping open a bottle cap.',
    tips: [
      'Non-dominant "O" hand represents the bottle opening',
      'Poke in with the bent middle finger, then pull out',
      'Follow immediately with a flat palm slap over the same spot — that\u2019s the "cap"',
    ],
    imageUrl: '../assets/images/medium/drinks/soda.png', videoUrl: '../assets/videos/medium/drinks/soda.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_drinks_TEA', level: 'medium', category: 'drinks', signId: 'TEA', title: 'Tea', order: 5,
    description: 'Form an "F" handshape with your dominant hand — thumb and index finger touching in a small circle, other three fingers up — and hold your non-dominant hand in a loose fist to represent a cup. Dip the "F" fingertips down into the fist a couple of times, like dunking a tea bag.',
    tips: [
      '"F" handshape: thumb and index touch in a circle, middle/ring/pinky stay up',
      'Non-dominant fist stays still and represents the cup',
      'Dip down into the fist twice — don\u2019t confuse with VOTE, which looks similar but drops straight down once',
    ],
    imageUrl: '../assets/images/medium/drinks/tea.png', videoUrl: '../assets/videos/medium/drinks/tea.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_drinks_COFFEE', level: 'medium', category: 'drinks', signId: 'COFFEE', title: 'Coffee', order: 6,
    description: 'Stack both hands into "S" fists, dominant hand on top of the non-dominant one, and rotate the top fist in a small circular grinding motion while the bottom fist stays still, like cranking an old-fashioned coffee grinder.',
    tips: [
      'Both hands are closed "S" fists, stacked one on top of the other',
      'Only the top (dominant) hand moves, in a small circular crank',
      'Don\u2019t confuse with MAKE, where BOTH fists twist against each other instead of one cranking',
    ],
    imageUrl: '../assets/images/medium/drinks/coffee.png', videoUrl: '../assets/videos/medium/drinks/coffee.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · FRUITS ── (new this pass — unlocks Unit 34)
  // Researched on lifeprint.com (ASLU), cross-checked against Handspeak/
  // aslbloom/Signing Time/ASL-LEX (ASLU text pages don't include prose
  // descriptions for every entry, only video, so the wording below is my
  // own description of what those sources show, not copied text). APPLE
  // and ORANGE are DUPLICATES of existing entries (medium_food_APPLE,
  // medium_colors_ORANGE) — same physical signs, reused per this file's
  // duplicate-entry convention. MANGO/PAPAYA/COCONUT/AVOCADO are NOT
  // included here — see the CATEGORIES comment on 'fruits' above.
  {
    // Was previously also duplicated as medium_food_APPLE under the now-
    // removed 'food' category (see UNITS/CATEGORIES history above); this
    // entry is unaffected and still fully functional.
    id: 'medium_fruits_APPLE', level: 'medium', category: 'fruits', signId: 'APPLE', title: 'Apple', order: 1,
    description: 'Form an \u2018X\u2019 handshape (bent index finger) and twist it gently against your cheek near the corner of your mouth.',
    tips: [
      'Handshape is a bent index finger, like a hook',
      'Small twisting motion, not a big circle',
      'Contact point is the cheek near the mouth',
    ],
    imageUrl: '../assets/images/medium/food/apple.png', videoUrl: '../assets/videos/medium/food/apple.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_BANANA', level: 'medium', category: 'fruits', signId: 'BANANA', title: 'Banana', order: 2,
    description: 'Hold the index finger of your non-dominant hand pointing straight up in front of you, like a banana. With your dominant hand in a loose, slightly curled shape, make two short downward strokes along the length of that finger, as if peeling it.',
    tips: [
      'Non-dominant index finger stays still — it stands in for the banana itself',
      'Two short, quick peeling strokes, one after the other',
      'Actually trace the peeling motion down the finger rather than a vague wave near it',
    ],
    imageUrl: '../assets/images/medium/fruits/banana.png', videoUrl: '../assets/videos/medium/fruits/banana.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_colors_ORANGE. ASLU treats the
    // color and the fruit as the identical sign.
    id: 'medium_fruits_ORANGE', level: 'medium', category: 'fruits', signId: 'ORANGE', title: 'Orange', order: 3,
    description: 'Hold a loose \u2018C\u2019 handshape near your chin and squeeze it into a fist repeatedly.',
    tips: [
      'Starts as a loose \u2018C\u2019 near the chin',
      'Repeated squeezing motion, like squeezing fruit',
      'Same sign already used for ORANGE under Colors',
    ],
    imageUrl: '../assets/images/medium/colors/orange.png', videoUrl: '../assets/videos/medium/colors/orange.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_GRAPES', level: 'medium', category: 'fruits', signId: 'GRAPES', title: 'Grapes', order: 4,
    description: 'Form a loose, bent claw shape with your dominant hand and lightly bounce its fingertips against the back of your other hand or forearm — touching down, lifting, and touching down again a little further along — as if feeling the bumps of a bunch of grapes.',
    tips: [
      'Handshape is a loose, bent claw, not a tight fist',
      'A light two-part bounce (touch, lift, touch), not one long drag',
      'You may also see a three-touch version — both are used and understood',
    ],
    imageUrl: '../assets/images/medium/fruits/grapes.png', videoUrl: '../assets/videos/medium/fruits/grapes.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_WATERMELON', level: 'medium', category: 'fruits', signId: 'WATERMELON', title: 'Watermelon', order: 5,
    description: 'Sign WATER first — tap the fingertip of a \u2018W\u2019 handshape (index, middle, and ring fingers up) against your chin twice — then flick your middle finger off your thumb and thump it against the back of your other closed fist, as if checking whether a watermelon is ripe.',
    tips: [
      'This is a two-part sign: WATER, then the "thump" motion',
      'The thump alone (without WATER first) means PUMPKIN or MELON instead',
      'One quick, springy flick-and-thump for the second part, not repeated tapping',
    ],
    imageUrl: '../assets/images/medium/fruits/watermelon.png', videoUrl: '../assets/videos/medium/fruits/watermelon.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_PINEAPPLE', level: 'medium', category: 'fruits', signId: 'PINEAPPLE', title: 'Pineapple', order: 6,
    description: 'Hold an \u2018F\u2019 handshape (thumb and index finger touching in a circle, other three fingers up) just in front of one eye, like peering through a small telescope, and twist it back and forth twice.',
    tips: [
      '\u2018F\u2019 handshape stays just in front of the eye, not touching it',
      'Small back-and-forth twisting motion, like adjusting binoculars',
      'A different, mouth-level handshape is used in some regions — the eye version is the most widely recognized',
    ],
    imageUrl: '../assets/images/medium/fruits/pineapple.png', videoUrl: '../assets/videos/medium/fruits/pineapple.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_STRAWBERRY', level: 'medium', category: 'fruits', signId: 'STRAWBERRY', title: 'Strawberry', order: 7,
    description: 'Extend the index finger of your non-dominant hand. Wrap the thumb and fingers of your dominant hand loosely around the tip of that finger and give it a gentle twist.',
    tips: [
      'This same sign, done on the pinky finger instead of the index finger, means CHERRIES',
      'This is also the general sign for "berries" — context tells listeners which berry is meant',
      'One smooth twist around the fingertip, not a rubbing or sliding motion',
    ],
    imageUrl: '../assets/images/medium/fruits/strawberry.png', videoUrl: '../assets/videos/medium/fruits/strawberry.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_PEAR', level: 'medium', category: 'fruits', signId: 'PEAR', title: 'Pear', order: 8,
    description: 'Hold your non-dominant hand in a flattened \u2018O\u2019 shape (fingers and thumb curved and touching), palm facing you. Wrap the fingers and thumb of your dominant hand around it, then slide your dominant hand off to the side, closing it into a flattened \u2018O\u2019 as it comes free. Repeat.',
    tips: [
      'Non-dominant hand stays still — it represents the outline of the pear',
      'Dominant hand closes into the same flattened \u2018O\u2019 shape as it slides off',
      'Two slides, tracing the pear\u2019s shape each time',
    ],
    imageUrl: '../assets/images/medium/fruits/pear.png', videoUrl: '../assets/videos/medium/fruits/pear.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_fruits_MELON', level: 'medium', category: 'fruits', signId: 'MELON', title: 'Melon', order: 9,
    description: 'Make a loose fist with your non-dominant hand and thump your dominant hand\u2019s middle finger off your thumb against the back of it, as if checking whether a melon is ripe — the same sign used for PUMPKIN.',
    tips: [
      'Same sign as PUMPKIN — context tells them apart',
      'Add WATER before this sign to mean WATERMELON instead',
      'One quick, springy thump, not a repeated knock',
    ],
    imageUrl: '../assets/images/medium/fruits/melon.png', videoUrl: '../assets/videos/medium/fruits/melon.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · VEGETABLES ── (researched 2026-09-02, unlocks Unit 35)
  // Researched on lifeprint.com (ASLU), cross-checked against Handspeak
  // and Signing Savvy. CUCUMBER is intentionally NOT included — sources
  // disagreed enough (and Handspeak's own entry was too thin) that a
  // confident description couldn't be written; category stays
  // comingSoon:true until that one word is resolved.
  {
    id: 'medium_vegetables_CARROT', level: 'medium', category: 'vegetables', signId: 'CARROT', title: 'Carrot', order: 1,
    description: 'Close your dominant hand into a fist with the thumb resting against the side of your index finger, then bring it up beside your mouth and make a couple of small biting motions, as if taking bites out of a carrot.',
    tips: [
      'Fist stays near the corner of the mouth, not touching it',
      'Small, repeated biting motion — like nibbling, not one big bite',
      'Thumb rests along the side of the fist, not tucked inside',
    ],
    imageUrl: '../assets/images/medium/vegetables/carrot.png', videoUrl: '../assets/videos/medium/vegetables/carrot.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_POTATO', level: 'medium', category: 'vegetables', signId: 'POTATO', title: 'Potato', order: 2,
    description: 'Hold your non-dominant hand in a fist, palm down. Bend the index and middle fingers of your dominant hand and jab them down onto the back of that fist twice, as if poking a potato with a fork to see if it\u2019s cooked.',
    tips: [
      'Non-dominant fist stays still — it represents the potato',
      'Two quick downward jabs with the bent fingers, like a fork',
      'This same handshape/motion is also used for IDAHO in context',
    ],
    imageUrl: '../assets/images/medium/vegetables/potato.png', videoUrl: '../assets/videos/medium/vegetables/potato.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_TOMATO', level: 'medium', category: 'vegetables', signId: 'TOMATO', title: 'Tomato', order: 3,
    description: 'Touch your dominant index finger to your chin, then bring it down to meet the index finger of your non-dominant hand, which is held out in front of you in a loose, flattened \u2018O\u2019 shape.',
    tips: [
      'Starts at the chin (borrowing from the sign for RED)',
      'Dominant finger travels down and meets the other hand\u2019s fingertip',
      'Non-dominant hand stays steady out in front of you',
    ],
    imageUrl: '../assets/images/medium/vegetables/tomato.png', videoUrl: '../assets/videos/medium/vegetables/tomato.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_ONION', level: 'medium', category: 'vegetables', signId: 'ONION', title: 'Onion', order: 4,
    description: 'Make an \u2018X\u2019 handshape with your dominant hand and touch the knuckle of your bent index finger to the top of your cheekbone, near the corner of your eye, then twist your wrist back and forth.',
    tips: [
      'Handshape is an \u2018X\u2019 — index finger bent into a hook, other fingers closed',
      'Touches high on the cheek, right by the eye',
      'Think: onions make your eyes water, so the sign sits right there',
    ],
    imageUrl: '../assets/images/medium/vegetables/onion.png', videoUrl: '../assets/videos/medium/vegetables/onion.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_GARLIC', level: 'medium', category: 'vegetables', signId: 'GARLIC', title: 'Garlic', order: 5,
    description: 'Make an \u2018X\u2019 handshape with your dominant hand and tap the knuckle of your bent index finger against the side of your nose a couple of times.',
    tips: [
      'Same \u2018X\u2019 handshape as ONION, just moved to the side of the nose instead of the eye',
      'Short double tap, not a twist',
      'Nose placement is the whole difference from ONION — keep that distinction clear',
    ],
    imageUrl: '../assets/images/medium/vegetables/garlic.png', videoUrl: '../assets/videos/medium/vegetables/garlic.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_CORN', level: 'medium', category: 'vegetables', signId: 'CORN', title: 'Corn', order: 6,
    description: 'Hold your dominant index finger up beside your mouth, representing an ear of corn, and twist it forward a couple of times, as if turning the cob to take another bite.',
    tips: [
      'Index finger stands in for the whole ear of corn',
      'Held right beside the mouth, not touching it',
      'Twisting motion, repeated twice, like rolling corn-on-the-cob',
    ],
    imageUrl: '../assets/images/medium/vegetables/corn.png', videoUrl: '../assets/videos/medium/vegetables/corn.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_PEA', level: 'medium', category: 'vegetables', signId: 'PEA', title: 'Pea', order: 7,
    description: 'Make a \u2018G\u2019 handshape (thumb and index finger open, other fingers closed) with your dominant hand, and tap the side of your non-dominant index finger twice, moving slightly forward on the second tap.',
    tips: [
      '\u2018G\u2019 handshape does the tapping — thumb and index finger form a small pinch',
      'Non-dominant index finger stands in for the pea pod',
      'Second tap moves a little further along, showing multiple peas in the pod',
    ],
    imageUrl: '../assets/images/medium/vegetables/pea.png', videoUrl: '../assets/videos/medium/vegetables/pea.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_BEAN', level: 'medium', category: 'vegetables', signId: 'BEAN', title: 'Bean', order: 8,
    description: 'Hold your non-dominant hand in a fist with the index finger sticking straight up, representing a bean pod. Pinch your dominant thumb and index finger around it near the base, then slide them up and off the tip, as if stringing the bean.',
    tips: [
      'Non-dominant index finger represents the long pod',
      'Dominant hand pinches and slides along its whole length',
      'One smooth pull from base to tip, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/vegetables/bean.png', videoUrl: '../assets/videos/medium/vegetables/bean.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_CABBAGE', level: 'medium', category: 'vegetables', signId: 'CABBAGE', title: 'Cabbage', order: 9,
    description: 'Make loose \u2018A\u2019 fists with both hands and strike the wrist/knuckle side of each one against the corresponding side of your head, just above your ears.',
    tips: [
      'Both hands strike at the same time, one on each side of the head',
      'Contact is with the wrist/knuckle edge of the fist, not the palm',
      'Don\u2019t confuse with LETTUCE, which uses a twisting motion instead of a strike',
    ],
    imageUrl: '../assets/images/medium/vegetables/cabbage.png', videoUrl: '../assets/videos/medium/vegetables/cabbage.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_LETTUCE', level: 'medium', category: 'vegetables', signId: 'LETTUCE', title: 'Lettuce', order: 10,
    description: 'Loosely curl the fingers of your dominant hand into a claw shape, rest the palm against the side of your head near your temple, and twist your wrist forward a couple of times.',
    tips: [
      'Hand shape is a loose claw, resting flat against the head (not striking it)',
      'Twisting motion at the wrist, done twice',
      'Easy to mix up with CABBAGE — that one strikes the head instead of twisting against it',
    ],
    imageUrl: '../assets/images/medium/vegetables/lettuce.png', videoUrl: '../assets/videos/medium/vegetables/lettuce.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_PUMPKIN', level: 'medium', category: 'vegetables', signId: 'PUMPKIN', title: 'Pumpkin', order: 11,
    description: 'Make a loose fist with your non-dominant hand and thump your dominant hand\u2019s middle finger off your thumb against the back of it, as if checking whether a pumpkin is ripe — the same sign already used for MELON.',
    tips: [
      'Same sign as MELON — surrounding words make the meaning clear',
      'One quick, springy thump of the middle finger, not a repeated knock',
      'Non-dominant fist stays still and represents the pumpkin',
    ],
    imageUrl: '../assets/images/medium/vegetables/pumpkin.png', videoUrl: '../assets/videos/medium/vegetables/pumpkin.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_vegetables_BROCCOLI', level: 'medium', category: 'vegetables', signId: 'BROCCOLI', title: 'Broccoli', order: 12,
    description: 'Hold your non-dominant hand up in a \u2018V\u2019 shape (or just an extended index finger) to represent the stalk, then use your dominant fingertips to tap near the top a couple of times, showing the clumped florets.',
    tips: [
      'Non-dominant hand represents the stalk standing upright',
      'Dominant hand taps near the top to show the bumpy florets',
      'Sources vary more than usual on this one — treat it as one common version, not the only version',
    ],
    imageUrl: '../assets/images/medium/vegetables/broccoli.png', videoUrl: '../assets/videos/medium/vegetables/broccoli.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DRESSING ── (new this pass — unlocks Unit 42)
  // WEAR/CHANGE/FOLD researched on lifeprint.com (ASLU), cross-checked
  // against Handspeak/PocketSign/SigningTime. WASH/CLEAN/DIRTY are
  // DUPLICATES of the entries already live under 'health'/'appearance' —
  // not re-researched here, just re-listed so this category is playable
  // on its own (same precedent as BOY/GIRL under 'personal_information').
  //
  // AUDIT FLAG (2026-09-01) on the existing medium_health_WASH entry
  // (NOT changed): lifeprint's own WASH page splits this into three
  // different signs depending on what's being washed — a general sign
  // (dominant "A" fist scrubs circularly ON TOP of a stationary
  // non-dominant "A" fist), a separate WASH-DISHES sign, and a separate
  // WASH-CLOTHES/washing-machine sign (twisting motion, like loosening a
  // jar lid). The file's current WASH entry instead describes both fists
  // rubbing against each other symmetrically — which matches Handspeak's
  // historical (1910) definition and a couple of "wash hands" sources,
  // but not lifeprint's own "general sign" page. Given real, sourced
  // disagreement between reputable sources (rather than one clear error
  // like the ANT fix from the previous pass), I didn't rewrite it — flag
  // for a human call on which variant this app should standardize on,
  // especially since 'dressing' context arguably means WASH-CLOTHES,
  // which is a third, distinct sign from either version described above.
  {
    id: 'medium_dressing_WEAR', level: 'medium', category: 'dressing', signId: 'WEAR', title: 'Wear', order: 1,
    description: 'Form both hands into a "U" handshape — index and middle fingers extended together, rest of the hand closed — and hold them near your upper chest, palms facing your body, then move them down a short distance in one smooth motion.',
    tips: [
      'Both hands use the two-finger "U" handshape, not flat open hands',
      'One smooth downward slide, not a repeated brushing motion',
      'Flat open hands brushing down instead means CLOTHES, not WEAR — don\u2019t mix them up',
    ],
    imageUrl: '../assets/images/medium/dressing/wear.png', videoUrl: '../assets/videos/medium/dressing/wear.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_dressing_CHANGE', level: 'medium', category: 'dressing', signId: 'CHANGE', title: 'Change', order: 2,
    description: 'Form both hands into "X" handshapes (hooked index finger, other fingers curled) and touch your knuckles together in front of you, then twist both hands so the one that was on top ends up on the bottom.',
    tips: [
      'Both hands are "X" handshapes, knuckles touching as a pivot point',
      'The twist swaps which hand is on top — that flip is the whole sign',
      'A bigger, more exaggerated twist can emphasize a bigger change',
    ],
    imageUrl: '../assets/images/medium/dressing/change.png', videoUrl: '../assets/videos/medium/dressing/change.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_health_WASH. See AUDIT FLAG above —
    // this entry was reviewed but intentionally left unchanged.
    id: 'medium_dressing_WASH', level: 'medium', category: 'dressing', signId: 'WASH', title: 'Wash', order: 3,
    description: 'Make two loose fists and rub them together in a circular motion, like washing your hands.',
    tips: [
      'Both hands stay loosely closed',
      'Circular rubbing motion, not side to side',
      'Same sign already used for WASH under Health — see this file\u2019s audit note on possible washing-context variants',
    ],
    imageUrl: '../assets/images/medium/health/wash.png', videoUrl: '../assets/videos/medium/health/wash.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_dressing_FOLD', level: 'medium', category: 'dressing', signId: 'FOLD', title: 'Fold', order: 4,
    description: 'Hold your non-dominant hand flat, palm up, out in front of you. Bring your flat dominant hand, palm down, over and down onto the non-dominant hand, like folding a piece of clothing in half and setting it down.',
    tips: [
      'Non-dominant hand stays flat and still — it represents the item being folded',
      'Only the dominant hand moves, ending resting on top of the other',
      'A bigger motion suggests folding something large (a blanket); a smaller one suggests something small (a sock)',
    ],
    imageUrl: '../assets/images/medium/dressing/fold.png', videoUrl: '../assets/videos/medium/dressing/fold.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_appearance_CLEAN / medium_actions_CLEAN.
    id: 'medium_dressing_CLEAN', level: 'medium', category: 'dressing', signId: 'CLEAN', title: 'Clean', order: 5,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant flat hand across the palm from base to fingertips, as if wiping it clean.',
    tips: [
      'Base hand stays flat and still',
      'One smooth sliding motion, base to fingertips',
      'Same sign already used for CLEAN under Actions/Appearance',
    ],
    imageUrl: '../assets/images/medium/actions/clean.png', videoUrl: '../assets/videos/medium/actions/clean.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_appearance_DIRTY.
    id: 'medium_dressing_DIRTY', level: 'medium', category: 'dressing', signId: 'DIRTY', title: 'Dirty', order: 6,
    description: 'Hold your open, spread hand under your chin, palm down, and wiggle your fingers.',
    tips: [
      'Fingers WIGGLE loosely — this is what separates it from PIG, which bends and unbends together',
      'Handshape stays open (a "5" hand), not closed',
      'Same sign already used for DIRTY under Appearance',
    ],
    imageUrl: '../assets/images/medium/appearance/dirty.png', videoUrl: '../assets/videos/medium/appearance/dirty.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · TRANSPORTATION ── (new this pass — unlocks Unit 50)
  // DRIVE and FLY researched fresh on lifeprint.com (ASLU), cross-checked
  // against Handspeak. WALK, RIDE, GO, STOP, WAIT are DUPLICATES of the
  // entries already live under 'actions' — re-listed here so this
  // category is playable on its own, same precedent as WASH/CLEAN/DIRTY
  // under 'dressing'. FLY note: this is the "travel by airplane" sense
  // (the "I-Love-You" handshape moving through the air), a different
  // sign from FLY-insect or FLY-flapping (a bird's wings) — the right
  // sense for a Transportation category.
  {
    id: 'medium_transportation_WALK', level: 'medium', category: 'transportation', signId: 'WALK', title: 'Walk', order: 1,
    description: 'Hold both flat hands, palms down, out in front of you and move them alternately forward, like two feet walking.',
    tips: [
      'Both hands stay flat, palms facing down',
      'Alternate which hand moves forward',
      'Same sign already used for WALK under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/walk.png', videoUrl: '../assets/videos/medium/actions/walk.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_RIDE.
    id: 'medium_transportation_RIDE', level: 'medium', category: 'transportation', signId: 'RIDE', title: 'Ride', order: 2,
    description: 'Rest the bent first two fingers of your dominant hand (\u2018sitting\u2019 like legs) inside the curved \u2018C\u2019 shape of your non-dominant hand, then move both hands forward together.',
    tips: [
      'Dominant hand\u2019s fingers rest inside the base hand, like a rider',
      'Base hand keeps a loose \u2018C\u2019 curve',
      'Same sign already used for RIDE under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/ride.png', videoUrl: '../assets/videos/medium/actions/ride.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_transportation_DRIVE', level: 'medium', category: 'transportation', signId: 'DRIVE', title: 'Drive', order: 3,
    description: 'Form both hands into \u2018S\u2019 fists, palms facing you, held apart in front of you, and move them alternately up and down as if gripping and turning a large steering wheel.',
    tips: [
      'Both hands stay in closed \u2018S\u2019 fists',
      'Use a bigger, more sustained motion than CAR — a smaller version of this same motion means CAR instead of DRIVE',
      'Hands move as a pair, like turning a wheel back and forth',
    ],
    imageUrl: '../assets/images/medium/transportation/drive.png', videoUrl: '../assets/videos/medium/transportation/drive.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_transportation_FLY', level: 'medium', category: 'transportation', signId: 'FLY', title: 'Fly', order: 4,
    description: 'Form an \u2018I-Love-You\u2019 handshape (thumb, index finger, and pinky extended, middle and ring fingers curled down), palm facing down, and move your hand forward through the air, like a small airplane cruising along.',
    tips: [
      'Handshape is \u2018ILY\u2019 — thumb, index, and pinky out, middle and ring curled',
      'Palm faces down as the hand travels forward',
      'A different sign from FLY-insect (pinching an \u2018F\u2019 hand) or a bird flapping wings',
    ],
    imageUrl: '../assets/images/medium/transportation/fly.png', videoUrl: '../assets/videos/medium/transportation/fly.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_GO.
    id: 'medium_transportation_GO', level: 'medium', category: 'transportation', signId: 'GO', title: 'Go', order: 5,
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body — the reverse of COME',
      'Same sign already used for GO under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/go.png', videoUrl: '../assets/videos/medium/actions/go.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_STOP.
    id: 'medium_transportation_STOP', level: 'medium', category: 'transportation', signId: 'STOP', title: 'Stop', order: 6,
    description: 'Hold your non-dominant hand flat, palm up, and chop the edge of your dominant flat hand down onto it in one sharp motion.',
    tips: [
      'Base hand stays flat and still',
      'One sharp, decisive chopping motion',
      'Same sign already used for STOP under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/stop.png', videoUrl: '../assets/videos/medium/actions/stop.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_WAIT.
    id: 'medium_transportation_WAIT', level: 'medium', category: 'transportation', signId: 'WAIT', title: 'Wait', order: 7,
    description: 'Hold both hands up in front of you with fingers loosely bent and spread, and wiggle your fingers.',
    tips: [
      'Fingers stay loose and bent (not a fist, not flat)',
      'Wiggle the fingers gently, hands mostly still',
      'Same sign already used for WAIT under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/wait.png', videoUrl: '../assets/videos/medium/actions/wait.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · MANNERS (unlocked 2026-09-02) ──
  {
    // DUPLICATE — same sign as medium_requests_PLEASE.
    id: 'medium_manners_PLEASE', level: 'medium', category: 'manners', signId: 'PLEASE', title: 'Please', order: 1,
    description: 'Hold your flat hand on your chest and rub it in a circular motion.',
    tips: [
      'Hand stays flat against the chest',
      'Circular motion, not side to side',
      'Same sign already used for PLEASE under Polite Words',
    ],
    imageUrl: '../assets/images/medium/requests/please.png', videoUrl: '../assets/videos/medium/requests/please.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_THANK_YOU. Kept signId
    // 'THANK YOU' (not 'THANKS') so it still matches the trained sign in
    // js/engine/dictionary.js.
    id: 'medium_manners_THANKS', level: 'medium', category: 'manners', signId: 'THANK YOU', title: 'Thanks', order: 2,
    description: 'Touch your flat fingertips to your chin, then move your hand forward and down, as if extending your thanks outward.',
    tips: [
      'Starts with fingertips at the chin',
      'Moves outward toward the other person',
      'Same sign already used for Thank You under Polite Words',
    ],
    imageUrl: '../assets/images/medium/requests/thank_you.png', videoUrl: '../assets/videos/medium/requests/thank_you.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_essentials_greetings_WELCOME.
    // ASLU labels this sign WELCOME/HIRE/INVITE and explicitly recommends
    // against using it as a reply to "thank you" — see that entry's tips.
    id: 'medium_manners_WELCOME', level: 'medium', category: 'manners', signId: 'WELCOME', title: 'Welcome', order: 3,
    description: 'Hold your flat dominant hand out to the side, palm up, then bring it in toward your torso in one smooth arc, as if welcoming someone into a space.',
    tips: [
      'This same sign also means HIRE and INVITE — context makes the meaning clear',
      'ASLU notes this is best used for "welcome, come on in" — not as a reply to "thank you"',
      'Same sign already used for Welcome under Greetings',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/welcome.png', videoUrl: '../assets/videos/medium/essentials_greetings/welcome.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_SORRY.
    id: 'medium_manners_SORRY', level: 'medium', category: 'manners', signId: 'SORRY', title: 'Sorry', order: 4,
    description: 'Make a fist and rub it in a circular motion over the center of your chest.',
    tips: [
      'Hand is a closed fist',
      'Circular motion, not side to side',
      'Same sign already used for SORRY under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/sorry.png', videoUrl: '../assets/videos/medium/feelings/sorry.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_EXCUSE.
    id: 'medium_manners_EXCUSE', level: 'medium', category: 'manners', signId: 'EXCUSE', title: 'Excuse', order: 5,
    description: 'Brush the fingertips of your dominant hand across the palm of your other flat hand, from the base toward the fingertips.',
    tips: [
      'Base hand stays flat and still',
      'One smooth brushing motion',
      'Same sign already used for EXCUSE under Polite Words',
    ],
    imageUrl: '../assets/images/medium/requests/excuse.png', videoUrl: '../assets/videos/medium/requests/excuse.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_HELP.
    id: 'medium_manners_HELP', level: 'medium', category: 'manners', signId: 'HELP', title: 'Help', order: 6,
    description: 'Rest your dominant fist (thumb up) on the palm of your other flat hand, then lift both hands upward together.',
    tips: [
      'Base hand stays flat, fist rests on top of it',
      'Both hands rise together in one motion',
      'Same sign already used for HELP under Needs',
    ],
    imageUrl: '../assets/images/medium/requests/help.png', videoUrl: '../assets/videos/medium/requests/help.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · PERSONAL_ITEMS (unlocked 2026-09-02) ──
  {
    // NEW — researched against lifeprint.com, cross-checked against
    // Handspeak/aslbloom/PocketSign/babysignlanguage. All sources agree:
    // both hands press together flat like a closed billfold, then the
    // top edges open and close slightly while the bottom (pinky) edges
    // stay together.
    id: 'medium_personal_items_WALLET', level: 'medium', category: 'personal_items', signId: 'WALLET', title: 'Wallet', order: 1,
    description: 'Hold both flat hands together in front of you, palms facing each other like a closed book. Keeping the bottom edges touching, open and close the top edges a couple of times, like flipping open a billfold to check inside.',
    tips: [
      'Bottom (pinky-side) edges of both hands stay touching throughout',
      'Only the top edges open and close, and only a little — too wide looks like the sign for BOOK',
      'Repeat the small open-close motion twice',
    ],
    imageUrl: '../assets/images/medium/personal_items/wallet.png', videoUrl: '../assets/videos/personal_items/wallet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.pocketsign.org/asl/wallet',
  },
  {
    // DUPLICATE — same sign as medium_household_PHONE.
    id: 'medium_personal_items_PHONE', level: 'medium', category: 'personal_items', signId: 'PHONE', title: 'Phone', order: 2,
    description: 'Form a \u2018Y\u2019 handshape (thumb and pinky extended, other fingers folded down) and hold it up to the side of your face, thumb near your ear and pinky near your mouth, like holding an old telephone handset.',
    tips: [
      'Handshape is a \u2018Y\u2019 — thumb and pinky only',
      'Thumb rests near the ear, pinky near the mouth',
      'Same sign already used for PHONE under Household',
    ],
    imageUrl: '../assets/images/medium/household/phone.png', videoUrl: '../assets/videos/medium/household/phone.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "watch" entry (WRISTWATCH
    // uses an 'F' handshape on the back of the wrist), cross-checked
    // against babysignlanguage/hearview (small 'C'/'F' resting on the
    // wrist — same core idea, minor handshape variation between sources).
    id: 'medium_personal_items_WATCH', level: 'medium', category: 'personal_items', signId: 'WATCH', title: 'Watch', order: 3,
    description: 'Form a small \u2018F\u2019 handshape (thumb and index finger touching in a circle, other three fingers up) with your dominant hand, and rest it on the back of your non-dominant wrist, like the face of a wristwatch.',
    tips: [
      'The small circle represents the watch face sitting on your wrist',
      'This is the WRISTWATCH sign, different from WATCH meaning "to look at"',
      'A brief held position — no repeated motion needed',
    ],
    imageUrl: '../assets/images/medium/personal_items/watch.png', videoUrl: '../assets/videos/personal_items/watch.mp4', detectionType: 'static',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/watch.htm',
  },
  {
    // NEW — researched against lifeprint.com's "glasses" entry,
    // cross-checked against Handspeak/babysignlanguage/PocketSign. All
    // agree on the core idea: 'C' or pinched handshapes near each eye,
    // tapped or drawn outward to outline the frames.
    id: 'medium_personal_items_GLASSES', level: 'medium', category: 'personal_items', signId: 'GLASSES', title: 'Glasses', order: 4,
    description: 'Form a small \u2018C\u2019 shape with the thumb and index finger of each hand (other fingers curled in), and tap them near the outer corner of each eye a couple of times, as if tracing the rim of a pair of glasses.',
    tips: [
      'Keep the \u2018C\u2019 shape small and close to the eyes — too big can look like BINOCULARS or CAMERA',
      'A light double tap near each eye, not a big sweeping motion',
      'A one-handed version (touching just one eye) is also commonly used',
    ],
    imageUrl: '../assets/images/medium/personal_items/glasses.png', videoUrl: '../assets/videos/personal_items/glasses.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/glasses.htm',
  },
  {
    // DUPLICATE — same sign as medium_household_KEY.
    id: 'medium_personal_items_KEY', level: 'medium', category: 'personal_items', signId: 'KEY', title: 'Key', order: 5,
    description: 'Hold your thumb and index finger together as if pinching an imaginary key, and twist your wrist twice, like turning a key in a lock.',
    tips: [
      'A pinching handshape, thumb and index finger together',
      'Two twists — a single twist instead means the verb LOCK',
      'Same sign already used for KEY under Household',
    ],
    imageUrl: '../assets/images/medium/household/key.png', videoUrl: '../assets/videos/household/key.mp4', detectionType: 'motion',
  },
  {
    // NEW — ASLU's own umbrella.htm page describes this as a mime of the
    // real-world action; cross-checked against Handspeak/StartASL, which
    // agree it's iconic and consistently done the same way.
    id: 'medium_personal_items_UMBRELLA', level: 'medium', category: 'personal_items', signId: 'UMBRELLA', title: 'Umbrella', order: 6,
    description: 'Hold your non-dominant fist upright, then place your dominant \u2018S\u2019 hand on top of it and push it upward, as if popping open a real umbrella.',
    tips: [
      'The non-dominant fist represents the umbrella\u2019s handle/pole',
      'The dominant hand pops upward in one clear motion, mimicking the canopy opening',
      'This sign is iconic — it looks like the action it describes',
    ],
    imageUrl: '../assets/images/medium/personal_items/umbrella.png', videoUrl: '../assets/videos/personal_items/umbrella.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/u/umbrella.htm',
  },
  {
    // NEW — researched against aslinteractive/multiple ASL dictionaries,
    // which agree on the core shape: a curved dominant hand outlines the
    // cylindrical body of a bottle moving up from a flat base hand.
    id: 'medium_personal_items_BOTTLE', level: 'medium', category: 'personal_items', signId: 'BOTTLE', title: 'Bottle', order: 7,
    description: 'Hold your non-dominant hand flat, palm up, as a base. With your dominant hand in a curved \u2018C\u2019 shape, move it upward just above the base hand, outlining the cylindrical shape of a bottle.',
    tips: [
      'The flat base hand represents a tabletop or the bottom of the bottle',
      'The curved dominant hand traces upward once, showing the bottle\u2019s shape',
      'Keep the \u2018C\u2019 curve consistent as it rises, like outlining a can or jar',
    ],
    imageUrl: '../assets/images/medium/personal_items/bottle.png', videoUrl: '../assets/videos/personal_items/bottle.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · TURN_TAKING (unlocked 2026-09-02) ──
  {
    // DUPLICATE — same sign as medium_people_MY.
    id: 'medium_turn_taking_MY', level: 'medium', category: 'turn_taking', signId: 'MY', title: 'My', order: 1,
    description: 'Place your flat, open dominant hand on the center of your chest, palm facing in.',
    tips: [
      'Handshape is flat ("B" hand), not a fist',
      'Palm rests against your own chest',
      'Same sign already used for MY under People',
    ],
    imageUrl: '../assets/images/medium/people/my.png', videoUrl: '../assets/videos/medium/people/my.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_people_YOUR.
    id: 'medium_turn_taking_YOUR', level: 'medium', category: 'turn_taking', signId: 'YOUR', title: 'Your', order: 2,
    description: 'Push your flat, open dominant hand outward, palm facing the person you\u2019re talking to.',
    tips: [
      'Handshape is flat ("B" hand), not a point',
      'Palm faces toward the other person, not toward you',
      'Same sign already used for YOUR under People',
    ],
    imageUrl: '../assets/images/medium/people/your.png', videoUrl: '../assets/videos/medium/people/your.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "turn" entry. ASLU is
    // explicit that MY TURN and YOUR TURN are directional versions of the
    // same 'L'-handshape sign, rolled toward the signer or the other
    // person respectively. This entry covers the general/YOUR-TURN
    // direction; reverse it toward yourself for "my turn."
    id: 'medium_turn_taking_TURN', level: 'medium', category: 'turn_taking', signId: 'TURN', title: 'Turn', order: 3,
    description: 'Make an \u2018L\u2019 handshape (index finger and thumb out) and roll your wrist to flip it forward, toward the person whose turn it is.',
    tips: [
      'Handshape stays an \u2018L\u2019 throughout — only the wrist rolls',
      'Roll it toward yourself for "my turn," or toward the other person for "your turn"',
      'A single clear roll, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/turn_taking/turn.png', videoUrl: '../assets/videos/turn_taking/turn.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/turn.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_GO.
    id: 'medium_turn_taking_GO', level: 'medium', category: 'turn_taking', signId: 'GO', title: 'Go', order: 4,
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body',
      'Same sign already used for GO under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/go.png', videoUrl: '../assets/videos/medium/actions/go.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_STOP.
    id: 'medium_turn_taking_STOP', level: 'medium', category: 'turn_taking', signId: 'STOP', title: 'Stop', order: 5,
    description: 'Hold your non-dominant hand flat, palm up, and chop the edge of your dominant flat hand down onto it in one sharp motion.',
    tips: [
      'Base hand stays flat and still',
      'One sharp, decisive chopping motion',
      'Same sign already used for STOP under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/stop.png', videoUrl: '../assets/videos/medium/actions/stop.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_WAIT.
    id: 'medium_turn_taking_WAIT', level: 'medium', category: 'turn_taking', signId: 'WAIT', title: 'Wait', order: 6,
    description: 'Hold both hands up in front of you with fingers loosely bent and spread, and wiggle your fingers.',
    tips: [
      'Fingers stay loose and bent (not a fist, not flat)',
      'Wiggle the fingers gently, hands mostly still',
      'Same sign already used for WAIT under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/wait.png', videoUrl: '../assets/videos/medium/actions/wait.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "again" entry (Bill Vicars'
    // own parameter breakdown: bent dominant hand arcs down to touch a
    // flat non-dominant palm), cross-checked against Brainscape's
    // ASLU-linked flashcard set.
    id: 'medium_turn_taking_AGAIN', level: 'medium', category: 'turn_taking', signId: 'AGAIN', title: 'Again', order: 7,
    description: 'Hold your non-dominant hand flat, palm up. Bend your dominant hand at the knuckles and arc it down so your fingertips land on your non-dominant palm.',
    tips: [
      'Non-dominant hand stays flat and still as the "landing pad"',
      'Dominant hand is bent at the big knuckles, not flat and not a fist',
      'One clear arcing motion, fingertips touching down on the palm',
    ],
    imageUrl: '../assets/images/medium/turn_taking/again.png', videoUrl: '../assets/videos/turn_taking/again.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/a/again.htm',
  },
  {
    // NEW — researched against lifeprint.com's "finish" entry, cross-
    // checked against Brainscape's ASLU-sourced flashcard set (both
    // describe the same twisting-wrists motion).
    id: 'medium_turn_taking_FINISHED', level: 'medium', category: 'turn_taking', signId: 'FINISHED', title: 'Finished', order: 8,
    description: 'Hold both open \u201c5\u201d hands in front of you, palms facing you, then quickly twist both wrists so your palms end up facing outward.',
    tips: [
      'Both hands move together in the same quick twisting motion',
      'A single twist reads as more final/definite; a couple of quick twists is also common',
      'Different from FINISH used to mean "stop it!" — that version uses a sharper, single-handed motion with an intense expression',
    ],
    imageUrl: '../assets/images/medium/turn_taking/finished.png', videoUrl: '../assets/videos/turn_taking/finished.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/finish.htm',
  },

  // ── MEDIUM · FREQUENCY (unlocked 2026-09-02) ──
  {
    // NEW — ASLU's own signing-notes page gives this as the simple,
    // standalone version of ALWAYS: circling an upright index finger.
    id: 'medium_frequency_ALWAYS', level: 'medium', category: 'frequency', signId: 'ALWAYS', title: 'Always', order: 1,
    description: 'Point your index finger straight up and draw small, continuous circles in the air in front of you.',
    tips: [
      'Only the index finger is extended, pointing upward',
      'The circle is small and steady, not a big sweeping motion',
      'Keep circling for a beat to show the ongoing, repeated idea of "always"',
    ],
    imageUrl: '../assets/images/medium/frequency/always.png', videoUrl: '../assets/videos/frequency/always.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/topics/signingnotes.htm',
  },
  {
    // NEW — researched against lifeprint.com's "often" entry, which gives
    // this exact bent-hand-to-palm description.
    id: 'medium_frequency_OFTEN', level: 'medium', category: 'frequency', signId: 'OFTEN', title: 'Often', order: 2,
    description: 'Hold your non-dominant hand flat, palm up. Tap the fingertips of your bent dominant hand on the base of that palm, then lift and tap again a couple inches further forward.',
    tips: [
      'Dominant hand is bent at the knuckles, not flat',
      'The tap-lift-tap-forward pattern is what separates OFTEN from a single tap',
      'A faster, doubled version of this same motion can mean "frequently"',
    ],
    imageUrl: '../assets/images/medium/frequency/often.png', videoUrl: '../assets/videos/frequency/often.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/often.htm',
  },
  {
    // NEW — researched against lifeprint.com's "sometimes" entry.
    id: 'medium_frequency_SOMETIMES', level: 'medium', category: 'frequency', signId: 'SOMETIMES', title: 'Sometimes', order: 3,
    description: 'Hold your non-dominant hand flat, palm up. Point your dominant index finger down and trace a slow, narrow oval path across the top of your non-dominant palm.',
    tips: [
      'The oval path is narrow and controlled, not a big sweep',
      'Only the dominant index finger moves — the base hand stays still',
      'A relaxed, neutral expression fits "once in a while"',
    ],
    imageUrl: '../assets/images/medium/frequency/sometimes.png', videoUrl: '../assets/videos/frequency/sometimes.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sometimes.htm',
  },
  {
    // NEW — ASLU's own "sometimes" page states RARELY isn't a separate
    // root sign: it's SOMETIMES done with a much bigger oval, squinted
    // eyes, and a slight head shake. Documented here as its own entry
    // (matching this file's convention) but the description reflects
    // that it's an exaggerated variant, not a distinct sign.
    id: 'medium_frequency_RARELY', level: 'medium', category: 'frequency', signId: 'RARELY', title: 'Rarely', order: 4,
    description: 'Do the SOMETIMES motion — tracing an oval with your index finger across your other palm — but make the oval much bigger, squint slightly, and give a small head shake.',
    tips: [
      'Same base sign as SOMETIMES — the size of the oval is what changes the meaning',
      'A bigger, slower oval reads as "rarely" rather than "sometimes"',
      'The squint and head shake are part of what signals the "rarely" meaning',
    ],
    imageUrl: '../assets/images/medium/frequency/rarely.png', videoUrl: '../assets/videos/frequency/rarely.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sometimes.htm',
  },
  {
    // NEW — researched against lifeprint.com's "never" entry.
    id: 'medium_frequency_NEVER', level: 'medium', category: 'frequency', signId: 'NEVER', title: 'Never', order: 5,
    description: 'Hold your flat dominant hand up near your shoulder, palm facing away from your non-dominant side, then swipe it down and to the side in one motion, like a downward karate chop.',
    tips: [
      'Handshape is flat, like a "B" hand, thumb straight rather than tucked',
      'The path curves slightly, like a stretched-out question mark',
      'One firm downward-and-out swipe, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/frequency/never.png', videoUrl: '../assets/videos/frequency/never.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/never.htm',
  },
  {
    // NEW — researched against lifeprint.com's Lesson 6 notes: TOMORROW's
    // handshape done twice, without the forward arc, means EVERYDAY/DAILY.
    id: 'medium_frequency_DAILY', level: 'medium', category: 'frequency', signId: 'DAILY', title: 'Daily', order: 6,
    description: 'Make a slightly open \u2018A\u2019 handshape, hold it at the side of your head near your temple, and tap it forward twice with no arcing motion.',
    tips: [
      'This is the TOMORROW handshape, but done twice and without TOMORROW\u2019s forward arc',
      'Keep both taps short and at the same spot near the temple',
      'Also glossed as EVERYDAY',
    ],
    imageUrl: '../assets/images/medium/frequency/daily.png', videoUrl: '../assets/videos/frequency/daily.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/lessons/lesson06.htm',
  },
  {
    // NEW — researched against lifeprint.com's Lesson 12/emotional-
    // imprinting pages: WEEK is a base sign (dominant index finger slides
    // across the non-dominant palm) that gets inflected with a repeated
    // movement to mean WEEKLY.
    id: 'medium_frequency_WEEKLY', level: 'medium', category: 'frequency', signId: 'WEEKLY', title: 'Weekly', order: 7,
    description: 'Hold your non-dominant hand flat, palm up. Slide your dominant index finger forward across that palm from base to fingertips, and repeat the slide a second time to show it happening again and again.',
    tips: [
      'This is the WEEK sign — sliding one index finger across the other palm',
      'The repeated slide (done twice) is what turns WEEK into WEEKLY',
      'Keep the motion along the palm, not off to the side',
    ],
    imageUrl: '../assets/images/medium/frequency/weekly.png', videoUrl: '../assets/videos/frequency/weekly.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/lessons/lesson12.htm',
  },
  {
    // NEW — researched against lifeprint.com's Lesson 12/emotional-
    // imprinting pages: MONTH is a base sign (dominant index finger
    // moves down the length of the upright non-dominant index finger)
    // that gets inflected with a repeated movement to mean MONTHLY.
    id: 'medium_frequency_MONTHLY', level: 'medium', category: 'frequency', signId: 'MONTHLY', title: 'Monthly', order: 8,
    description: 'Hold your non-dominant index finger up, pointing straight up. With your dominant index finger held horizontally, slide it down the length of your non-dominant finger, and repeat the slide a second time.',
    tips: [
      'This is the MONTH sign — one finger stacked "weeks" moving down the other',
      'The repeated downward slide (done twice) is what turns MONTH into MONTHLY',
      'Keep the non-dominant finger straight and still as the "calendar"',
    ],
    imageUrl: '../assets/images/medium/frequency/monthly.png', videoUrl: '../assets/videos/frequency/monthly.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/lessons/lesson12.htm',
  },

  // ── MEDIUM · RESPONSES (unlocked 2026-09-02) ──
  {
    // DUPLICATE — same sign as medium_essentials_basic_responses_YES.
    id: 'medium_responses_YES', level: 'medium', category: 'responses', signId: 'YES', title: 'Yes', order: 1,
    description: 'Make an \u2018S\u2019 handshape (a closed fist) and nod it up and down at the wrist, like a small head nod.',
    tips: [
      'Handshape is a simple closed fist',
      'The whole fist bobs up and down from the wrist',
      'Same sign already used for YES under Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/yes.png', videoUrl: '../assets/videos/essentials_basic_responses/yes.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_essentials_basic_responses_NO.
    id: 'medium_responses_NO', level: 'medium', category: 'responses', signId: 'NO', title: 'No', order: 2,
    description: 'Bring your thumb, index, and middle fingers together in front of you, opening and closing them once like a small beak.',
    tips: [
      'Thumb + index + middle finger, the rest stay closed',
      'One quick open-close snap, like a beak',
      'Same sign already used for NO under Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/no.png', videoUrl: '../assets/videos/essentials_basic_responses/no.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_OKAY.
    id: 'medium_responses_OKAY', level: 'medium', category: 'responses', signId: 'OKAY', title: 'Okay', order: 3,
    description: 'Form an \u201cOK\u201d handshape (thumb and index finger touching in a circle, other three fingers extended up) and hold it out in front of you, or fingerspell O-K.',
    tips: [
      'Thumb and index finger form a small circle',
      'Other three fingers stay extended and relaxed',
      'Same sign already used for OKAY under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/okay.png', videoUrl: '../assets/videos/feelings/okay.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "sure"/"true" entries.
    // ASLU documents SURE as using the exact same sign as TRUE: an index
    // finger moving out from the lips. There is no separate "sure" sign.
    id: 'medium_responses_SURE', level: 'medium', category: 'responses', signId: 'SURE', title: 'Sure', order: 4,
    description: 'Touch your dominant index finger to your lips, then move it forward and slightly down in one quick, confident motion.',
    tips: [
      'This is the same sign as TRUE — ASLU treats SURE/TRUE/REALLY as one sign with several English translations',
      'Contact starts right at the lips, not the chin',
      'A quick, decisive forward motion reads as more confident/certain',
    ],
    imageUrl: '../assets/images/medium/responses/sure.png', videoUrl: '../assets/videos/responses/sure.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sure.htm',
  },
  {
    // NEW — researched against lifeprint.com's "maybe" entry.
    id: 'medium_responses_MAYBE', level: 'medium', category: 'responses', signId: 'MAYBE', title: 'Maybe', order: 5,
    description: 'Hold both hands out in front of you, palms up, and alternate raising and lowering them, like a seesaw or a pair of old-fashioned scales.',
    tips: [
      'Both palms face up throughout',
      'One hand rises while the other falls, then reverse, repeating a couple of times',
      'A slightly uncertain facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/responses/maybe.png', videoUrl: '../assets/videos/responses/maybe.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/maybe.htm',
  },
  {
    // NEW — same underlying sign as SURE above (see that entry's notes);
    // documented as its own entry here since it's a separate word in
    // this category's word list.
    id: 'medium_responses_REALLY', level: 'medium', category: 'responses', signId: 'REALLY', title: 'Really', order: 6,
    description: 'Touch your dominant index finger to your lips, then move it forward and slightly down in one quick motion — the same sign used for TRUE and SURE.',
    tips: [
      'Same physical sign as SURE — ASLU treats REALLY/SURE/TRUE as one sign',
      'Contact starts right at the lips',
      'A firm, single forward motion; can be repeated for extra emphasis',
    ],
    imageUrl: '../assets/images/medium/responses/really.png', videoUrl: '../assets/videos/responses/really.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/true.htm',
  },
  {
    // DUPLICATE — same sign as medium_feelings_GOOD.
    id: 'medium_responses_GOOD', level: 'medium', category: 'responses', signId: 'GOOD', title: 'Good', order: 7,
    description: 'Touch your flat fingertips to your chin, then move your hand down to rest on the palm of your other hand.',
    tips: [
      'Fingertips start at the chin',
      'Hand moves down to rest on your other open palm',
      'Same sign already used for GOOD under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/good.png', videoUrl: '../assets/videos/feelings/good.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "understand" entry
    // (the classic "lightbulb" memory aid), cross-checked against
    // Brainscape's ASLU-linked flashcard set.
    id: 'medium_responses_UNDERSTAND', level: 'medium', category: 'responses', signId: 'UNDERSTAND', title: 'Understand', order: 8,
    description: 'Hold your dominant hand up near your forehead with your index finger bent, touching your thumb. Flick the index finger up straight, like a lightbulb switching on.',
    tips: [
      'Start with the index finger curled against the thumb, near the forehead',
      'The quick flick to a straight, upright finger is the key motion',
      'Memory aid: think of a lightbulb turning on in your head',
    ],
    imageUrl: '../assets/images/medium/responses/understand.png', videoUrl: '../assets/videos/responses/understand.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/u/understand.htm',
  },

  // ── MEDIUM · ANSWERS (unlocked 2026-09-02) ──
  {
    // DUPLICATE — same sign as medium_responses_YES.
    id: 'medium_answers_YES', level: 'medium', category: 'answers', signId: 'YES', title: 'Yes', order: 1,
    description: 'Make an \u2018S\u2019 handshape (a closed fist) and nod it up and down at the wrist, like a small head nod.',
    tips: [
      'Handshape is a simple closed fist',
      'The whole fist bobs up and down from the wrist',
      'Same sign already used for YES under Responses/Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/yes.png', videoUrl: '../assets/videos/essentials_basic_responses/yes.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_responses_NO.
    id: 'medium_answers_NO', level: 'medium', category: 'answers', signId: 'NO', title: 'No', order: 2,
    description: 'Bring your thumb, index, and middle fingers together in front of you, opening and closing them once like a small beak.',
    tips: [
      'Thumb + index + middle finger, the rest stay closed',
      'One quick open-close snap, like a beak',
      'Same sign already used for NO under Responses/Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_basic_responses/no.png', videoUrl: '../assets/videos/essentials_basic_responses/no.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_responses_OKAY.
    id: 'medium_answers_OKAY', level: 'medium', category: 'answers', signId: 'OKAY', title: 'Okay', order: 3,
    description: 'Form an \u201cOK\u201d handshape (thumb and index finger touching in a circle, other three fingers extended up) and hold it out in front of you, or fingerspell O-K.',
    tips: [
      'Thumb and index finger form a small circle',
      'Other three fingers stay extended and relaxed',
      'Same sign already used for OKAY under Responses/Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/okay.png', videoUrl: '../assets/videos/feelings/okay.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_responses_SURE.
    id: 'medium_answers_SURE', level: 'medium', category: 'answers', signId: 'SURE', title: 'Sure', order: 4,
    description: 'Touch your dominant index finger to your lips, then move it forward and slightly down in one quick, confident motion.',
    tips: [
      'This is the same sign as TRUE and REALLY',
      'Contact starts right at the lips, not the chin',
      'Same sign already used for SURE under Responses',
    ],
    imageUrl: '../assets/images/medium/responses/sure.png', videoUrl: '../assets/videos/responses/sure.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_responses_MAYBE.
    id: 'medium_answers_MAYBE', level: 'medium', category: 'answers', signId: 'MAYBE', title: 'Maybe', order: 5,
    description: 'Hold both hands out in front of you, palms up, and alternate raising and lowering them, like a seesaw or a pair of old-fashioned scales.',
    tips: [
      'Both palms face up throughout',
      'One hand rises while the other falls, then reverse, repeating a couple of times',
      'Same sign already used for MAYBE under Responses',
    ],
    imageUrl: '../assets/images/medium/responses/maybe.png', videoUrl: '../assets/videos/responses/maybe.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "know" entry, cross-
    // checked against its signing-notes page (KNOW vs THINK distinction).
    id: 'medium_answers_KNOW', level: 'medium', category: 'answers', signId: 'KNOW', title: 'Know', order: 6,
    description: 'Hold your bent dominant hand (fingers bent at the large knuckles, thumb alongside) with the fingertips touching the side of your forehead.',
    tips: [
      'Handshape is bent ("bent-B"), not a single index finger — a single finger touching the forehead instead means THINK',
      'Contact point is the side of the forehead, though a casual cheek version is also common',
      'A brief touch is enough — no repeated motion needed',
    ],
    imageUrl: '../assets/images/medium/answers/know.png', videoUrl: '../assets/videos/answers/know.mp4', detectionType: 'static',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/k/know.htm',
  },
  {
    // NEW — researched against lifeprint.com's "don't know" entry. This
    // word list item ("DON'T") refers to the compound DON'T-KNOW sign,
    // not a freestanding "don't" — flagged in this category's comment
    // above and here in the description itself.
    id: 'medium_answers_DONT', level: 'medium', category: 'answers', signId: "DON'T", title: "Don't Know", order: 7,
    description: 'Start the KNOW handshape at the side of your forehead, then twist your hand outward so your palm ends up facing forward, shaking your head slightly and raising your shoulders.',
    tips: [
      'Starts the same as KNOW, but twists outward instead of just tapping',
      'A slight head shake and shoulder raise help signal "I don\u2019t know" rather than just "know"',
      'This is a compound sign for "don\u2019t know," not a separate standalone "don\u2019t"',
    ],
    imageUrl: '../assets/images/medium/answers/dont_know.png', videoUrl: '../assets/videos/answers/dont_know.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dont-know.htm',
  },
  {
    // DUPLICATE — same sign as medium_responses_UNDERSTAND.
    id: 'medium_answers_UNDERSTAND', level: 'medium', category: 'answers', signId: 'UNDERSTAND', title: 'Understand', order: 8,
    description: 'Hold your dominant hand up near your forehead with your index finger bent, touching your thumb. Flick the index finger up straight, like a lightbulb switching on.',
    tips: [
      'Start with the index finger curled against the thumb, near the forehead',
      'The quick flick to a straight, upright finger is the key motion',
      'Same sign already used for UNDERSTAND under Responses',
    ],
    imageUrl: '../assets/images/medium/responses/understand.png', videoUrl: '../assets/videos/responses/understand.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_responses_GOOD.
    id: 'medium_answers_GOOD', level: 'medium', category: 'answers', signId: 'GOOD', title: 'Good', order: 9,
    description: 'Touch your flat fingertips to your chin, then move your hand down to rest on the palm of your other hand.',
    tips: [
      'Fingertips start at the chin',
      'Hand moves down to rest on your other open palm',
      'Same sign already used for GOOD under Responses/Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/good.png', videoUrl: '../assets/videos/feelings/good.mp4', detectionType: 'motion',
  },

  /* ── MEDIUM · WILD ANIMALS (Unit 39) ── (NEW this session — unlocks
   * Unit 39. All 10 words researched fresh against lifeprint.com (ASLU),
   * cross-checked against a second source (Quizlet's lifeprint-sourced
   * flashcard set, aslbloom.com, or Signing Savvy, noted per entry).
   * ZEBRA has no single dedicated ASLU sign — both lifeprint.com's own
   * "Animals" page and a lifeprint-sourced flashcard set independently
   * describe it as the compound HORSE + STRIPES, so it's written that
   * way here rather than inventing a single sign. */
  {
    id: 'medium_wild_animals_LION', level: 'medium', category: 'wild_animals', signId: 'LION', title: 'Lion', order: 1,
    description: 'Hold a loosely curved open hand at your forehead, then draw it backward over the top of your head, tracing the shape of a lion\u2019s mane.',
    tips: [
      'Fingers stay loosely spread the whole time, not flat or in a fist',
      'The path goes back over the head, not down the face',
      'One smooth backward sweep is enough',
    ],
    imageUrl: '../assets/images/medium/wild_animals/lion.png', videoUrl: '../assets/videos/medium/wild_animals/lion.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/lion.htm',
  },
  {
    id: 'medium_wild_animals_TIGER', level: 'medium', category: 'wild_animals', signId: 'TIGER', title: 'Tiger', order: 2,
    description: 'Hold both hands in loose claw shapes in front of your face and pull them backward and out to the sides, like a tiger clawing the air. Repeat the motion.',
    tips: [
      'Both hands use the same curved, claw-like shape',
      'Motion pulls back and outward, away from the face',
      'Repeat the clawing motion at least once for clarity',
    ],
    imageUrl: '../assets/images/medium/wild_animals/tiger.png', videoUrl: '../assets/videos/medium/wild_animals/tiger.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/tiger.htm',
  },
  {
    id: 'medium_wild_animals_ELEPHANT', level: 'medium', category: 'wild_animals', signId: 'ELEPHANT', title: 'Elephant', order: 3,
    description: 'Hold your flat hand near your nose, then sweep it forward and down in a curve, tracing the long shape of an elephant\u2019s trunk.',
    tips: [
      'Starts right at the nose, not the mouth or chin',
      'The curve moves down and away from the face',
      'A second version uses a \u2018C\u2019 handshape instead \u2014 either is acceptable',
    ],
    imageUrl: '../assets/images/medium/wild_animals/elephant.png', videoUrl: '../assets/videos/medium/wild_animals/elephant.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/e/elephant.htm',
  },
  {
    id: 'medium_wild_animals_MONKEY', level: 'medium', category: 'wild_animals', signId: 'MONKEY', title: 'Monkey', order: 4,
    description: 'Scratch both hands upward along your sides, like a monkey scratching itself, and repeat the motion once.',
    tips: [
      'Both hands scratch at the same time, not one after the other',
      'Motion goes upward along the ribs',
      'Repeat once \u2014 a single scratch reads as incomplete',
    ],
    imageUrl: '../assets/images/medium/wild_animals/monkey.png', videoUrl: '../assets/videos/medium/wild_animals/monkey.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/monkey-advanced.htm',
  },
  {
    id: 'medium_wild_animals_GIRAFFE', level: 'medium', category: 'wild_animals', signId: 'GIRAFFE', title: 'Giraffe', order: 5,
    description: 'Hold a \u2018G\u2019 handshape (or a \u2018C\u2019 handshape) at your neck, then raise it straight up above your head, tracing the length of a giraffe\u2019s long neck.',
    tips: [
      'Starts at the neck, not the chest',
      'Path is a straight rise, not a curve or circle',
      'Either the \u2018G\u2019 or \u2018C\u2019 handshape is acceptable',
    ],
    imageUrl: '../assets/images/medium/wild_animals/giraffe.png', videoUrl: '../assets/videos/medium/wild_animals/giraffe.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/giraffe.htm',
  },
  {
    id: 'medium_wild_animals_BEAR', level: 'medium', category: 'wild_animals', signId: 'BEAR', title: 'Bear', order: 6,
    description: 'Cross both arms over your chest with your hands in a loose claw shape, and scratch your chest twice.',
    tips: [
      'Arms cross fully, not just hands touching',
      'Hands stay clawed, not flat or fisted',
      'Two clear scratching motions',
    ],
    imageUrl: '../assets/images/medium/wild_animals/bear.png', videoUrl: '../assets/videos/medium/wild_animals/bear.mp4', detectionType: 'motion',
  },
  {
    // FLAG — no single dedicated ASLU sign for ZEBRA. lifeprint.com's own
    // "Animals" practice page and a lifeprint-sourced flashcard set both
    // independently describe this the same way: sign HORSE, then show
    // stripes. Written here as a two-part compound rather than inventing
    // a single fixed sign.
    id: 'medium_wild_animals_ZEBRA', level: 'medium', category: 'wild_animals', signId: 'ZEBRA', title: 'Zebra', order: 7,
    description: 'There isn\u2019t one single widely-agreed sign for \u2018zebra\u2019 \u2014 sign HORSE first (a \u2018U\u2019 handshape flicking at the temple), then trace a few stripes down your arm or body with bent \u20184\u2019 or \u20185\u2019 hands.',
    tips: [
      'This is HORSE + STRIPES, not one fixed sign \u2014 the compound is what\u2019s recognized',
      'Keep the stripe-tracing motion short and clear',
      'Some signers use different handshapes for the stripes part \u2014 all are understood',
    ],
    imageUrl: '../assets/images/medium/wild_animals/zebra.png', videoUrl: '../assets/videos/medium/wild_animals/zebra.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_wild_animals_SNAKE', level: 'medium', category: 'wild_animals', signId: 'SNAKE', title: 'Snake', order: 8,
    description: 'Form a \u2018bent V\u2019 handshape (index and middle fingers bent, spread apart) and move your hand forward a few inches in a slithering motion, like a snake moving along the ground.',
    tips: [
      'Handshape is a bent \u2018V\u2019, not a straight point',
      'The path slithers forward, not straight ahead',
      'A short, few-inch motion is enough',
    ],
    imageUrl: '../assets/images/medium/wild_animals/snake.png', videoUrl: '../assets/videos/medium/wild_animals/snake.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/snake.htm',
  },
  {
    id: 'medium_wild_animals_FROG', level: 'medium', category: 'wild_animals', signId: 'FROG', title: 'Frog', order: 9,
    description: 'Hold an \u2018S\u2019 handshape (or modified \u2018S\u2019) just below your chin, then flick your index and middle fingers open into a \u2018V\u2019 shape.',
    tips: [
      'Starts as a closed fist under the chin',
      'The flick opens sharply into a \u2018V\u2019 \u2014 like a frog\u2019s throat and legs',
      'Keep the motion at chin height',
    ],
    imageUrl: '../assets/images/medium/wild_animals/frog.png', videoUrl: '../assets/videos/medium/wild_animals/frog.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/frog.htm',
  },
  {
    id: 'medium_wild_animals_TURTLE', level: 'medium', category: 'wild_animals', signId: 'TURTLE', title: 'Turtle', order: 10,
    description: 'Make an \u2018A\u2019 handshape (closed fist, thumb tucked) with your dominant hand and cover it with your other hand curved over the top like a shell, then wiggle the thumb out from underneath.',
    tips: [
      'The covering hand stays curved, like a shell over the fist',
      'The thumb wiggling out represents the turtle\u2019s head poking out',
      'Keep the wiggle small and quick',
    ],
    imageUrl: '../assets/images/medium/wild_animals/turtle.png', videoUrl: '../assets/videos/medium/wild_animals/turtle.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/turtle.htm',
  },

  /* ── MEDIUM · SNACKS (Unit 36) ── (NEW this session — unlocks Unit
   * 36. COOKIE and CANDY are duplicates of the existing
   * medium_food_COOKIE/medium_food_CANDY entries (same physical signs,
   * matching this file's existing duplicate-entry convention). The
   * other 8 words are fresh lifeprint.com (ASLU) research, cross-
   * checked against a second source per entry. CAKE has several
   * ASLU-documented variants — ASLU's own recommendation is to
   * fingerspell it, but the "palm down version" is the one ASLU
   * describes using when an actual sign is wanted, so that's the
   * version written here; flagged in the tips. */
  {
    // Was previously also duplicated as medium_food_COOKIE under the now-
    // removed 'food' category (see UNITS/CATEGORIES history above); this
    // entry is unaffected and still fully functional.
    id: 'medium_snacks_COOKIE', level: 'medium', category: 'snacks', signId: 'COOKIE', title: 'Cookie', order: 1,
    description: 'Form a \u2018C\u2019 handshape and press it into the palm of your other flat hand, then twist it slightly, as if using a cookie cutter.',
    tips: [
      'Dominant hand keeps the \u2018C\u2019 shape',
      'Base hand stays flat, palm up',
      'Twist happens after the press-down',
    ],
    imageUrl: '../assets/images/medium/food/cookie.png', videoUrl: '../assets/videos/medium/food/cookie.mp4', detectionType: 'motion',
  },
  {
    // FLAG — ASLU documents several signs for CAKE and explicitly says
    // fingerspelling is the safest option since there's no single
    // agreed sign. This is ASLU's "palm down version" \u2014 the one Dr.
    // Bill uses when he does sign an actual concept for CAKE rather
    // than fingerspelling it.
    id: 'medium_snacks_CAKE', level: 'medium', category: 'snacks', signId: 'CAKE', title: 'Cake', order: 2,
    description: 'Hold your non-dominant hand flat, palm down. Bring your dominant hand, in a loose claw shape, down onto the back of it, as if patting the top of a frosted cake.',
    tips: [
      'ASLU notes there are several accepted versions of this sign \u2014 fingerspelling C-A-K-E is also common and safest',
      'Base hand stays flat and palm down',
      'A single pat/contact is enough for this version',
    ],
    imageUrl: '../assets/images/medium/snacks/cake.png', videoUrl: '../assets/videos/medium/snacks/cake.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cake.htm',
  },
  {
    // Was previously also duplicated as medium_food_CANDY under the now-
    // removed 'food' category (see UNITS/CATEGORIES history above); this
    // entry is unaffected and still fully functional.
    id: 'medium_snacks_CANDY', level: 'medium', category: 'snacks', signId: 'CANDY', title: 'Candy', order: 3,
    description: 'Hold your index finger with a slight bend near the corner of your mouth and twist it gently, as if turning a piece of candy.',
    tips: [
      'Handshape is a bent index finger',
      'Small twisting motion at the mouth',
      'Similar to APPLE but with just the index finger',
    ],
    imageUrl: '../assets/images/medium/food/candy.png', videoUrl: '../assets/videos/medium/food/candy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_snacks_CHOCOLATE', level: 'medium', category: 'snacks', signId: 'CHOCOLATE', title: 'Chocolate', order: 4,
    description: 'Form a \u2018C\u2019 handshape with your dominant hand and circle it counter-clockwise on the back of your other hand.',
    tips: [
      'Handshape stays a clear \u2018C\u2019 throughout',
      'Motion circles counter-clockwise, not back-and-forth',
      'Keep the circle small and centered on the back of the hand',
    ],
    imageUrl: '../assets/images/medium/snacks/chocolate.png', videoUrl: '../assets/videos/medium/snacks/chocolate.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/chocolate.htm',
  },
  {
    id: 'medium_snacks_DONUT', level: 'medium', category: 'snacks', signId: 'DONUT', title: 'Donut', order: 5,
    description: 'Hold both hands in an \u2018R\u2019 handshape at the corners of your mouth, then arc them forward so they meet a few inches in front of your mouth, tracing the round shape of a donut.',
    tips: [
      'Both hands start at the corners of the mouth, not the cheeks',
      'The path curves forward and together, like the outline of a ring',
      'A second common variant pinches a \u2018C\u2019-like shape near the cheeks instead \u2014 both are accepted',
    ],
    imageUrl: '../assets/images/medium/snacks/donut.png', videoUrl: '../assets/videos/medium/snacks/donut.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/donut.htm',
  },
  {
    id: 'medium_snacks_PIE', level: 'medium', category: 'snacks', signId: 'PIE', title: 'Pie', order: 6,
    description: 'Hold your non-dominant hand flat, palm up, like a pie. Use the edge of your dominant flat hand to make two slicing motions across the palm, forming a wedge shape.',
    tips: [
      'Base hand stays flat, palm up, the whole time',
      'Two clear slices, angled to form a wedge, not parallel lines',
      'The cutting hand does the work; the base hand stays still',
    ],
    imageUrl: '../assets/images/medium/snacks/pie.png', videoUrl: '../assets/videos/medium/snacks/pie.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/pie.htm',
  },
  {
    id: 'medium_snacks_POPCORN', level: 'medium', category: 'snacks', signId: 'POPCORN', title: 'Popcorn', order: 7,
    description: 'Hold both hands in a modified \u2018X\u2019 shape (thumbnail resting against the pad of the thumb) and flick each index finger upward, one hand and then the other, like kernels popping.',
    tips: [
      'Alternate hands \u2014 first one flicks, then the other',
      'The flicking motion should look like a quick \u2018pop\u2019',
      'Keep the hands at roughly chest height',
    ],
    imageUrl: '../assets/images/medium/snacks/popcorn.png', videoUrl: '../assets/videos/medium/snacks/popcorn.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/popcorn.htm',
  },
  {
    id: 'medium_snacks_CHIPS', level: 'medium', category: 'snacks', signId: 'CHIPS', title: 'Chips', order: 8,
    description: 'Hold your non-dominant hand in a palm-down fist, representing a potato. Use the thumb of your dominant \u2018C\u2019 hand to lightly brush/scrape along the back of it, twice, like slicing off chips.',
    tips: [
      'Base hand stays a closed fist, palm down',
      'The dominant thumb does the scraping, not the whole hand',
      'Two quick downward/forward slicing motions',
    ],
    imageUrl: '../assets/images/medium/snacks/chips.png', videoUrl: '../assets/videos/medium/snacks/chips.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/chips.htm',
  },
  {
    id: 'medium_snacks_CUPCAKE', level: 'medium', category: 'snacks', signId: 'CUPCAKE', title: 'Cupcake', order: 9,
    description: 'Sign CUP (a \u2018C\u2019 hand tapping down onto your upturned palm), then immediately sign CAKE (a clawed hand patting a flat, palm-down hand) \u2014 the two signs run together as one compound.',
    tips: [
      'This is CUP + CAKE signed together, not a single separate sign',
      'As with most compound signs, drop any repeated movement from the individual parts',
      'Some signers instead use a version of CAKE done with the base hand palm-up to mean small pastries \u2014 both are seen',
    ],
    imageUrl: '../assets/images/medium/snacks/cupcake.png', videoUrl: '../assets/videos/medium/snacks/cupcake.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cupcake.htm',
  },
  {
    id: 'medium_snacks_ICECREAM', level: 'medium', category: 'snacks', signId: 'ICECREAM', title: 'Ice Cream', order: 10,
    description: 'Hold an \u2018S\u2019 handshape (closed fist) in front of your mouth and move it downward twice, as if licking an ice cream cone.',
    tips: [
      'Hand stays a closed fist the whole time',
      'Two short downward movements in front of the mouth',
      'You don\u2019t need to actually stick your tongue out \u2014 the hand motion carries the meaning',
    ],
    imageUrl: '../assets/images/medium/snacks/icecream.png', videoUrl: '../assets/videos/medium/snacks/icecream.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/i/icecream.htm',
  },

  /* ── MEDIUM · WEATHER (Unit 46) ── (NEW this session — unlocks Unit
   * 46. HOT and COLD are duplicates of the existing
   * medium_temperature_HOT/COLD entries. WARM and COOL are also listed
   * in the 'temperature' category's words[] (Unit 18, Touch) but that
   * category currently has NO SIGNS entries for either word — flagged
   * separately in chat, NOT fixed here since 'temperature' wasn't in
   * scope this pass. WARM/COOL below are written fresh under 'weather'
   * so this category is self-contained. The other 6 words are new
   * ASLU-checked content. */
  {
    id: 'medium_weather_SUNNY', level: 'medium', category: 'weather', signId: 'SUNNY', title: 'Sunny', order: 1,
    description: 'Hold a \u2018C\u2019 handshape near the side of your face by your eye, then raise it up and out, tracing the sun rising into the sky.',
    tips: [
      'Starts near the eye, not the forehead',
      'The \u2018C\u2019 handshape is paired with the sign for MOON, which uses just the thumb and index finger instead',
      'A second version circles a flattened \u2018O\u2019 hand and opens it, meaning \u2018sunlight\u2019 when the motion is bigger',
    ],
    imageUrl: '../assets/images/medium/weather/sunny.png', videoUrl: '../assets/videos/medium/weather/sunny.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sun.htm',
  },
  {
    id: 'medium_weather_RAINY', level: 'medium', category: 'weather', signId: 'RAINY', title: 'Rainy', order: 2,
    description: 'Hold both hands up in loose, curved shapes and drop them downward a short distance, repeating the motion, as if raindrops are falling from the sky.',
    tips: [
      'Fingertips represent the droplets falling',
      'The motion repeats \u2014 a single drop isn\u2019t enough',
      'A sideways version of this same motion can show wind-driven rain',
    ],
    imageUrl: '../assets/images/medium/weather/rainy.png', videoUrl: '../assets/videos/medium/weather/rainy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/rain.htm',
  },
  {
    id: 'medium_weather_CLOUDY', level: 'medium', category: 'weather', signId: 'CLOUDY', title: 'Cloudy', order: 3,
    description: 'Hold both hands in loose claw (\u20185\u2019) shapes, palms up, above your face, and move them in alternating circles, like clouds rolling across the sky.',
    tips: [
      'Both hands stay above face height, not at chest level',
      'The circling is alternating \u2014 one hand leads while the other follows',
      'Palms face up throughout',
    ],
    imageUrl: '../assets/images/medium/weather/cloudy.png', videoUrl: '../assets/videos/medium/weather/cloudy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cloudy.htm',
  },
  {
    id: 'medium_weather_WINDY', level: 'medium', category: 'weather', signId: 'WINDY', title: 'Windy', order: 4,
    description: 'Hold both open, flat hands out in front of you, palms facing each other, and sway them together from side to side, like branches blowing in the wind.',
    tips: [
      'Both hands move together, in sync',
      'The bigger and faster the sway, the stronger the wind being described',
      'Keep the palms facing each other throughout',
    ],
    imageUrl: '../assets/images/medium/weather/windy.png', videoUrl: '../assets/videos/medium/weather/windy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wind.htm',
  },
  {
    // FLAG — ASLU describes the general STORM sign as "a modified
    // version of WIND" and notes separate variants exist for specific
    // kinds of storms (lightning storm, rainstorm, snowstorm). This
    // entry uses the general/modified-WIND version as the primary sign.
    id: 'medium_weather_STORMY', level: 'medium', category: 'weather', signId: 'STORMY', title: 'Stormy', order: 5,
    description: 'Sign WINDY, but bigger and more forceful \u2014 both open hands sway side to side with more force and a wider range of motion, and a tense facial expression.',
    tips: [
      'This is an intensified version of WINDY, not a separate handshape',
      'ASLU also documents specific variants for a lightning storm, rainstorm, or snowstorm \u2014 those swap in the LIGHTNING, RAIN, or SNOW handshape instead',
      'A tense, serious facial expression helps convey the intensity',
    ],
    imageUrl: '../assets/images/medium/weather/stormy.png', videoUrl: '../assets/videos/medium/weather/stormy.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/storm.htm',
  },
  {
    // DUPLICATE — same sign as medium_temperature_HOT.
    id: 'medium_weather_HOT', level: 'medium', category: 'weather', signId: 'HOT', title: 'Hot', order: 6,
    description: 'Start with a clawed hand near your mouth, then quickly twist your wrist and pull the hand away, as if you touched something too hot.',
    tips: [
      'Facial expression matters \u2014 look like it\u2019s genuinely hot!',
      'The twist-and-pull is sharp and fast',
      'Same sign already used for HOT under Touch',
    ],
    imageUrl: '../assets/images/medium/temperature/hot.png', videoUrl: '../assets/videos/medium/temperature/hot.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_temperature_COLD.
    id: 'medium_weather_COLD', level: 'medium', category: 'weather', signId: 'COLD', title: 'Cold', order: 7,
    description: 'Hold both fists up near your shoulders and shake them slightly, as if shivering from the cold.',
    tips: [
      'Small, quick shaking motion',
      'Both fists move together',
      'Same sign already used for COLD under Touch',
    ],
    imageUrl: '../assets/images/medium/temperature/cold.png', videoUrl: '../assets/videos/medium/temperature/cold.mp4', detectionType: 'motion',
  },
  {
    // NEW — no SIGNS entry existed for WARM anywhere in this file,
    // despite 'temperature' (Touch, Unit 18) already listing it in
    // words[] as comingSoon:false. That mismatch is flagged in chat;
    // this entry is written fresh under 'weather' only.
    id: 'medium_weather_WARM', level: 'medium', category: 'weather', signId: 'WARM', title: 'Warm', order: 8,
    description: 'Start with a \u2018modified O\u2019 hand (the same handshape as FOOD) near your mouth, then move it upward and outward, like warm breath rising on a cold day.',
    tips: [
      'Handshape starts the same as FOOD, not a flat or open hand',
      'The motion rises upward and away from the mouth',
      'A slower, gentler motion than HOT',
    ],
    imageUrl: '../assets/images/medium/weather/warm.png', videoUrl: '../assets/videos/medium/weather/warm.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/warm.htm',
  },
  {
    // NEW — no SIGNS entry existed for COOL anywhere in this file,
    // despite 'temperature' (Touch, Unit 18) already listing it in
    // words[] as comingSoon:false. Same flag as WARM above.
    id: 'medium_weather_COOL', level: 'medium', category: 'weather', signId: 'COOL', title: 'Cool', order: 9,
    description: 'Hold both open hands near your face and wave them back toward you a couple of times, like fanning yourself.',
    tips: [
      'Both hands move together, like two small fans',
      'Motion is toward your own face, not pushing outward',
      'A relaxed, pleasant expression fits the meaning \u2014 unlike the sharp pull-away of HOT',
    ],
    imageUrl: '../assets/images/medium/weather/cool.png', videoUrl: '../assets/videos/medium/weather/cool.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cool.htm',
  },
  {
    id: 'medium_weather_THUNDER', level: 'medium', category: 'weather', signId: 'THUNDER', title: 'Thunder', order: 10,
    description: 'Point to your ear, then hold both hands in an open \u20185\u2019 shape and move them firmly back and forth toward each other, like a rumbling boom.',
    tips: [
      'The point to the ear comes first, then the two-handed motion',
      'The back-and-forth motion should look firm and forceful, not gentle',
      'Both hands move at the same time, mirroring each other',
    ],
    imageUrl: '../assets/images/medium/weather/thunder.png', videoUrl: '../assets/videos/medium/weather/thunder.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/thunder.htm',
  },
  {
    id: 'medium_weather_LIGHTNING', level: 'medium', category: 'weather', signId: 'LIGHTNING', title: 'Lightning', order: 11,
    description: 'Point your index finger upward and trace a sharp, downward zigzag in the air, like a lightning bolt striking down from the sky.',
    tips: [
      'Only the index finger is extended',
      'The path is a zigzag, not a straight line or curve',
      'A quick, sudden motion matches the meaning better than a slow one',
    ],
    imageUrl: '../assets/images/medium/weather/lightning.png', videoUrl: '../assets/videos/medium/weather/lightning.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/lightning.htm',
  },
  {
    id: 'medium_weather_SNOW', level: 'medium', category: 'weather', signId: 'SNOW', title: 'Snow', order: 12,
    description: 'Hold both hands up with fingers loosely spread and flutter them as you move your hands downward and side to side, like snow drifting down.',
    tips: [
      'The fluttering fingers are what set this apart from RAIN',
      'Motion drifts side to side on the way down, not straight down',
      'ASLU notes this sign varies quite a bit by region \u2014 this is the simplest common version',
    ],
    imageUrl: '../assets/images/medium/weather/snow.png', videoUrl: '../assets/videos/medium/weather/snow.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/snow.htm',
  },

  /* ── MEDIUM · MONTHS (Unit 56) ──────────────────────────────────
   * UNLOCKED (2026-09-02): all 12 words are new content, researched
   * against lifeprint.com (ASLU) and cross-checked against StartASL.com
   * and Hearview.ai. All three sources agree on the same rule: ASL
   * doesn't have gesture-based signs for individual months — they are
   * fingerspelled, palm facing forward/out. Months of 5 letters or
   * fewer are spelled in full; longer names are abbreviated to their
   * first 3 letters, except September, which is abbreviated to 4
   * letters (SEPT) to keep it distinct. See the CATEGORIES entry above
   * for a flag re: whether the classifier can evaluate a fingerspelled
   * sequence the same way it evaluates a single static/motion sign.
   * ──────────────────────────────────────────────────────────────── */
  {
    id: 'medium_months_JANUARY', level: 'medium', category: 'months', signId: 'JANUARY', title: 'January', order: 1,
    description: 'Fingerspell J-A-N with your palm facing forward. Like most months, January doesn\u2019t have its own gesture-based sign in ASL, so it\u2019s spelled out.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Only three letters \u2014 January is long enough to be abbreviated',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/january.png', videoUrl: '../assets/videos/medium/months/january.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/j/january.htm',
  },
  {
    id: 'medium_months_FEBRUARY', level: 'medium', category: 'months', signId: 'FEBRUARY', title: 'February', order: 2,
    description: 'Fingerspell F-E-B with your palm facing forward \u2014 February is shortened to its first three letters rather than spelled in full.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Three letters only, not the full word',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/february.png', videoUrl: '../assets/videos/medium/months/february.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/february.htm',
  },
  {
    id: 'medium_months_MARCH', level: 'medium', category: 'months', signId: 'MARCH', title: 'March', order: 3,
    description: 'Fingerspell M-A-R-C-H with your palm facing forward. At exactly five letters, March is short enough to spell out in full rather than abbreviate.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Spelled out completely \u2014 not shortened like the longer months',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/march.png', videoUrl: '../assets/videos/medium/months/march.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/march.htm',
  },
  {
    id: 'medium_months_APRIL', level: 'medium', category: 'months', signId: 'APRIL', title: 'April', order: 4,
    description: 'Fingerspell A-P-R-I-L with your palm facing forward, spelling the full word rather than shortening it.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Spelled out completely, same as March',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/april.png', videoUrl: '../assets/videos/medium/months/april.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_MAY', level: 'medium', category: 'months', signId: 'MAY', title: 'May', order: 5,
    description: 'Fingerspell M-A-Y with your palm facing forward \u2014 already short enough that there\u2019s no shorter abbreviation to use.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Only three letters, spelled in full',
      'Watch for confusion with the modal MAY \u2014 this is the fingerspelled month, a different sign entirely',
    ],
    imageUrl: '../assets/images/medium/months/may.png', videoUrl: '../assets/videos/medium/months/may.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_JUNE', level: 'medium', category: 'months', signId: 'JUNE', title: 'June', order: 6,
    description: 'Fingerspell J-U-N-E with your palm facing forward, spelling the full word rather than shortening it.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Spelled out completely, not abbreviated',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/june.png', videoUrl: '../assets/videos/medium/months/june.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_JULY', level: 'medium', category: 'months', signId: 'JULY', title: 'July', order: 7,
    description: 'Fingerspell J-U-L-Y with your palm facing forward, spelling the full word rather than shortening it.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Spelled out completely, not abbreviated',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/july.png', videoUrl: '../assets/videos/medium/months/july.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_AUGUST', level: 'medium', category: 'months', signId: 'AUGUST', title: 'August', order: 8,
    description: 'Fingerspell A-U-G with your palm facing forward. At six letters, August is long enough to be shortened to its first three letters.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Three letters only, not the full word',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/august.png', videoUrl: '../assets/videos/medium/months/august.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_SEPTEMBER', level: 'medium', category: 'months', signId: 'SEPTEMBER', title: 'September', order: 9,
    description: 'Fingerspell S-E-P-T with your palm facing forward. September is the one exception to the usual 3-letter abbreviation \u2014 it uses 4 letters so it stays distinct from other month abbreviations.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Four letters, not three \u2014 the one exception in the months set',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/september.png', videoUrl: '../assets/videos/medium/months/september.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_OCTOBER', level: 'medium', category: 'months', signId: 'OCTOBER', title: 'October', order: 10,
    description: 'Fingerspell O-C-T with your palm facing forward \u2014 October is shortened to its first three letters.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Three letters only, not the full word',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/october.png', videoUrl: '../assets/videos/medium/months/october.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_NOVEMBER', level: 'medium', category: 'months', signId: 'NOVEMBER', title: 'November', order: 11,
    description: 'Fingerspell N-O-V with your palm facing forward \u2014 November is shortened to its first three letters.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Three letters only, not the full word',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/november.png', videoUrl: '../assets/videos/medium/months/november.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },
  {
    id: 'medium_months_DECEMBER', level: 'medium', category: 'months', signId: 'DECEMBER', title: 'December', order: 12,
    description: 'Fingerspell D-E-C with your palm facing forward \u2014 December is shortened to its first three letters.',
    tips: [
      'Palm faces forward/out, same posture as fingerspelling any word',
      'Three letters only, not the full word',
      'Keep the letters crisp and evenly paced rather than rushed',
    ],
    imageUrl: '../assets/images/medium/months/december.png', videoUrl: '../assets/videos/medium/months/december.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/month.htm',
  },

  /* ── MEDIUM · SEQUENCE (Unit 57) ─────────────────────────────────
   * UNLOCKED (2026-09-02): 9 of 10 words are new content, researched
   * against lifeprint.com (ASLU) and cross-checked against Handspeak.
   * FINISHED reuses the existing medium_turn_taking_FINISHED entry
   * (same physical sign, same precedent as WARM/COOL under weather).
   * ──────────────────────────────────────────────────────────────── */
  {
    id: 'medium_sequence_FIRST', level: 'medium', category: 'sequence', signId: 'FIRST', title: 'First', order: 1,
    description: 'Form the number \u20181\u2019 handshape (index finger up, palm generally facing out) and give your wrist a small twist \u2014 the same twisting motion used for ordinal numbers 1st through 9th.',
    tips: [
      'The twist is small and quick, not a big rotation',
      'Ordinal numbers 1st\u20139th all use this same twist; only the base number handshape changes',
      'Numbers 10th and beyond switch to fingerspelling \u201cTH\u201d instead of twisting \u2014 a different pattern',
    ],
    imageUrl: '../assets/images/medium/sequence/first.png', videoUrl: '../assets/videos/medium/sequence/first.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/first.htm',
  },
  {
    id: 'medium_sequence_SECOND', level: 'medium', category: 'sequence', signId: 'SECOND', title: 'Second', order: 2,
    description: 'Form the number \u20182\u2019 handshape (index and middle fingers up) and give your wrist the same small twist used for FIRST.',
    tips: [
      'Same twisting motion as FIRST, just with the \u20182\u2019 handshape',
      'The twist is small and quick, not a big rotation',
      'Keep the index and middle fingers together and straight',
    ],
    imageUrl: '../assets/images/medium/sequence/second.png', videoUrl: '../assets/videos/medium/sequence/second.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/numbersordianlandcardinal.htm',
  },
  {
    id: 'medium_sequence_THIRD', level: 'medium', category: 'sequence', signId: 'THIRD', title: 'Third', order: 3,
    description: 'Form the number \u20183\u2019 handshape (thumb, index, and middle fingers up) and give your wrist the same small twist used for FIRST and SECOND.',
    tips: [
      'Same twisting motion as FIRST and SECOND, just with the \u20183\u2019 handshape',
      'The twist is small and quick, not a big rotation',
      'This ordinal-twist pattern continues up through 9th',
    ],
    imageUrl: '../assets/images/medium/sequence/third.png', videoUrl: '../assets/videos/medium/sequence/third.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/numbersordianlandcardinal.htm',
  },
  {
    id: 'medium_sequence_NEXT', level: 'medium', category: 'sequence', signId: 'NEXT', title: 'Next', order: 4,
    description: 'Start with your dominant hand held flat just behind your non-dominant hand, then lift it up and over to land flat in front of it \u2014 like flipping to the next card in a stack.',
    tips: [
      'Think of flipping through a stack of index cards to the next one',
      'The motion arcs up and over, landing flat in front of the other hand',
      'Not used for \u201cnext week/month/year\u201d \u2014 those use their own modified signs instead',
    ],
    imageUrl: '../assets/images/medium/sequence/next.png', videoUrl: '../assets/videos/medium/sequence/next.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/next.htm',
  },
  {
    id: 'medium_sequence_THEN', level: 'medium', category: 'sequence', signId: 'THEN', title: 'Then', order: 5,
    description: 'Hold your non-dominant hand in an \u2018L\u2019 shape, index finger pointing forward and thumb up. Touch your dominant index fingertip to the tip of that thumb, then touch it again to the tip of the index finger.',
    tips: [
      'The dominant hand touches down twice: thumb tip first, then index fingertip',
      'Can also mean \u201csecondly,\u201d as in listing a second point',
      'In real conversation, this sign is often skipped when the order of events is already obvious \u2014 flagging in case FINISH ends up being the more natural sign to teach instead',
    ],
    imageUrl: '../assets/images/medium/sequence/then.png', videoUrl: '../assets/videos/medium/sequence/then.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/then.htm',
  },
  {
    id: 'medium_sequence_BEGINNING', level: 'medium', category: 'sequence', signId: 'BEGINNING', title: 'Beginning', order: 6,
    description: 'Hold your non-dominant hand flat with the fingers together except for a small gap between the index and middle fingers. Insert your dominant index fingertip into that gap at the base and twist it.',
    tips: [
      'The gap is specifically between the index and middle fingers of the base hand',
      'The dominant finger twists as it inserts, like a key turning',
      'Also covers \u201cstart / begin / initiate\u201d',
    ],
    imageUrl: '../assets/images/medium/sequence/beginning.png', videoUrl: '../assets/videos/medium/sequence/beginning.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/beginning.htm',
  },
  {
    id: 'medium_sequence_MIDDLE', level: 'medium', category: 'sequence', signId: 'MIDDLE', title: 'Middle', order: 7,
    description: 'Circle the tip of your bent dominant middle finger and plant it into the upturned palm of your non-dominant hand.',
    tips: [
      'Only the middle finger is used on the dominant hand, bent at the big knuckle',
      'The motion is a small circle before the finger lands in the palm',
      'Same core sign as CENTER',
    ],
    imageUrl: '../assets/images/medium/sequence/middle.png', videoUrl: '../assets/videos/medium/sequence/middle.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/middle.htm',
  },
  {
    id: 'medium_sequence_END', level: 'medium', category: 'sequence', signId: 'END', title: 'End', order: 8,
    description: 'Hold your non-dominant hand flat and stationary. Slide your dominant hand along the top of it until it reaches the edge and drops off.',
    tips: [
      'The dominant hand travels the full length of the non-dominant hand before dropping off',
      'Keep the non-dominant hand still \u2014 only the dominant hand moves',
      'In everyday conversation FINISH/FINISHED is often preferred over END for phrases like \u201cthe movie ended\u201d',
    ],
    imageUrl: '../assets/images/medium/sequence/end.png', videoUrl: '../assets/videos/medium/sequence/end.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/e/end.htm',
  },
  {
    // Lifeprint's own "finally" page exists but has no written
    // description (image/video only) \u2014 cross-checked against
    // ASLBloom and Handspeak instead, which independently agree.
    id: 'medium_sequence_FINALLY', level: 'medium', category: 'sequence', signId: 'FINALLY', title: 'Finally', order: 9,
    description: 'Hold both index fingers up near the corners of your mouth, palms facing in, then flip both wrists outward together in a smooth upward arc.',
    tips: [
      'Both hands move together and mirror each other',
      'Many signers mouth \u201cpah\u201d as they complete the sign',
      'Conveys something happening at last, often after difficulty or delay',
    ],
    imageUrl: '../assets/images/medium/sequence/finally.png', videoUrl: '../assets/videos/medium/sequence/finally.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/790/',
  },
  {
    // DUPLICATE — same sign as medium_turn_taking_FINISHED.
    id: 'medium_sequence_FINISHED', level: 'medium', category: 'sequence', signId: 'FINISHED', title: 'Finished', order: 10,
    description: 'Hold both open \u201c5\u201d hands in front of you, palms facing you, then quickly twist both wrists so your palms end up facing outward.',
    tips: [
      'Both hands move together in the same quick twisting motion',
      'A single twist reads as more final/definite; a couple of quick twists is also common',
      'Same sign already used for FINISHED under Turn-Taking',
    ],
    imageUrl: '../assets/images/medium/turn_taking/finished.png', videoUrl: '../assets/videos/turn_taking/finished.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/finish.htm',
  },
  /* ── MEDIUM · VEHICLES ──────────────────────────────────────────
   * UNLOCKED (this session) — researched against lifeprint.com (ASLU),
   * cross-checked against Handspeak / ASLbloom / Signing Savvy. BUS,
   * TRUCK, VAN, and TAXI are all ASLU-documented as *lexicalized
   * fingerspelling* (quick, blended spelling) rather than a single
   * iconic gesture — flagging for Joshua same as the Months category:
   * double check whether the classifier/dictionary.js can evaluate a
   * fingerspelled sequence before wiring these four up for live
   * detection. CAR reuses the existing medium_places_CAR entry (same
   * physical sign).
   */
  {
    // DUPLICATE — same sign as medium_places_CAR.
    id: 'medium_vehicles_CAR', level: 'medium', category: 'vehicles', signId: 'CAR', title: 'Car / Drive', order: 1,
    description: 'Hold both hands as if gripping a steering wheel and move them in a small alternating turning motion, as if driving.',
    tips: [
      'Hands stay shoulder-width apart',
      'Small, natural steering-wheel turns',
      'Same sign already used for CAR under Places',
    ],
    imageUrl: '../assets/images/medium/places/car.png', videoUrl: '../assets/videos/medium/places/car.mp4', detectionType: 'motion',
  },
  {
    // NEW — ASLU's recommended version of BUS is lexicalized
    // fingerspelling, not a single gesture. Cross-checked against
    // Signing Savvy, which agrees and lists it as "very quickly"
    // spelled. A slower, more gesture-like regional variant also
    // exists (see tips).
    id: 'medium_vehicles_BUS', level: 'medium', category: 'vehicles', signId: 'BUS', title: 'Bus', order: 2,
    description: 'Fingerspell B-U-S very quickly, blending the letters together rather than forming each one crisply.',
    tips: [
      'ASLU\u2019s recommended version — spell fast, don\u2019t pause between letters',
      'A regional variant exists: a bent-V handshape pulled backward twice, like tugging an old bus signal cord',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/vehicles/bus.png', videoUrl: '../assets/videos/medium/vehicles/bus.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bus.htm',
  },
  {
    // NEW — lifeprint.com confirms TRUCK is fingerspelled, noting the
    // "C" is formed with just the thumb, index, and middle finger at
    // speed. Cross-checked against Signing Savvy.
    id: 'medium_vehicles_TRUCK', level: 'medium', category: 'vehicles', signId: 'TRUCK', title: 'Truck', order: 3,
    description: 'Fingerspell T-R-U-C-K quickly, using a reduced \u2018C\u2019 (just thumb, index, and middle finger) to keep the spelling fast.',
    tips: [
      'Spell at speed — this is lexicalized fingerspelling, not a gesture',
      'The reduced \u2018C\u2019 handshape is what keeps it fast',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/vehicles/truck.png', videoUrl: '../assets/videos/medium/vehicles/truck.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/truck.htm',
  },
  {
    // NEW — no dedicated ASLU dictionary page; cross-checked against
    // Signing Savvy (labels it a "lexicalized fingerspell") and
    // Handspeak's general note that borrowed/short vehicle words are
    // commonly fingerspelled.
    id: 'medium_vehicles_VAN', level: 'medium', category: 'vehicles', signId: 'VAN', title: 'Van', order: 4,
    description: 'Fingerspell V-A-N quickly, blending the three letters together.',
    tips: [
      'Short word, spelled fast rather than gestured',
      'Keep the handshapes crisp even though the spelling is quick',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/vehicles/van.png', videoUrl: '../assets/videos/medium/vehicles/van.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.signingsavvy.com/sign/VAN/8205/1',
  },
  {
    // NEW — no dedicated ASLU dictionary page; cross-checked against
    // Signing Savvy and Handspeak, both of which list TAXI as
    // lexicalized fingerspelling.
    id: 'medium_vehicles_TAXI', level: 'medium', category: 'vehicles', signId: 'TAXI', title: 'Taxi', order: 5,
    description: 'Fingerspell T-A-X-I quickly, blending the letters together.',
    tips: [
      'Spelled fast rather than gestured',
      'Also covers "taxicab / cab"',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/vehicles/taxi.png', videoUrl: '../assets/videos/medium/vehicles/taxi.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.signingsavvy.com/sign/TAXI/5723/1',
  },
  {
    // NEW — researched against lifeprint.com, which is explicit that
    // both hands use "H" handshapes, the non-dominant hand represents
    // the tracks and stays still, and the dominant hand slides along it.
    id: 'medium_vehicles_TRAIN', level: 'medium', category: 'vehicles', signId: 'TRAIN', title: 'Train', order: 6,
    description: 'Hold your non-dominant hand flat in front of you as the "track." Rest your dominant hand in an \u2018H\u2019 handshape on top of it and slide it forward and back along the track.',
    tips: [
      'Both hands use an \u2018H\u2019 handshape (index and middle finger extended together)',
      'Base hand stays completely still — only the dominant hand slides',
      'Also the base for the idiom "train-gone-sorry" (you missed it)',
    ],
    imageUrl: '../assets/images/medium/vehicles/train.png', videoUrl: '../assets/videos/medium/vehicles/train.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/train.htm',
  },
  {
    // NEW — researched against lifeprint.com (BICYCLE page) and cross-
    // checked against a Lifeprint lesson-18 practice story that pairs
    // BIKE with MOTORCYCLE.
    id: 'medium_vehicles_BIKE', level: 'medium', category: 'vehicles', signId: 'BIKE', title: 'Bike', order: 7,
    description: 'Make two fists (\u2018S\u2019 handshapes) in front of you and rotate them in alternating forward circles, like pedaling a bicycle.',
    tips: [
      'Both hands are fists, rotating like bike pedals',
      'One hand is always roughly opposite the other in the circle',
      'Also see MOTORCYCLE — a different handshape, so don\u2019t mix them up',
    ],
    imageUrl: '../assets/images/medium/vehicles/bike.png', videoUrl: '../assets/videos/medium/vehicles/bike.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bicycle.htm',
  },
  {
    // NEW — researched against lifeprint.com and cross-checked against
    // ASLbloom, which independently gives the same description.
    id: 'medium_vehicles_MOTORCYCLE', level: 'medium', category: 'vehicles', signId: 'MOTORCYCLE', title: 'Motorcycle', order: 8,
    description: 'Mime gripping motorcycle handlebars with both fists out in front of you, then twist your wrists as if revving the throttle.',
    tips: [
      'Both hands are fists, held as if on handlebars',
      'The twisting motion is at the wrists, not the whole arm',
      'Also see BIKE — same general idea (grip + motion), different handshape story',
    ],
    imageUrl: '../assets/images/medium/vehicles/motorcycle.png', videoUrl: '../assets/videos/medium/vehicles/motorcycle.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/motorcycle.htm',
  },
  {
    // NEW — researched against lifeprint.com, which specifies the
    // "I-love-you" handshape and a small double forward motion.
    id: 'medium_vehicles_AIRPLANE', level: 'medium', category: 'vehicles', signId: 'AIRPLANE', title: 'Airplane', order: 9,
    description: 'Form an \u2018I-love-you\u2019 handshape (thumb, index, and pinky extended) and move it forward a couple of inches, then back, then forward again.',
    tips: [
      'Handshape is the same as "I love you" — thumb, index, pinky out',
      'Small double-forward motion, not one long push',
      'Angle the palm slightly downward',
    ],
    imageUrl: '../assets/images/medium/vehicles/airplane.png', videoUrl: '../assets/videos/medium/vehicles/airplane.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/a/airplane.htm',
  },
  {
    // NEW — researched against lifeprint.com and cross-checked against
    // ASLbloom, both describing cupped hands moving forward with an
    // up-down rocking motion.
    id: 'medium_vehicles_BOAT', level: 'medium', category: 'vehicles', signId: 'BOAT', title: 'Boat', order: 10,
    description: 'Cup both hands together, side by side, to shape the hull of a boat, then move them forward while rocking slightly up and down twice.',
    tips: [
      'Hands stay cupped together throughout — they represent the hull',
      'The rocking motion happens as the hands move forward',
      'A bigger, farther-forward version of this same sign means "cruise"',
    ],
    imageUrl: '../assets/images/medium/vehicles/boat.png', videoUrl: '../assets/videos/medium/vehicles/boat.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/boat.htm',
  },
  {
    // NEW — ASLbloom documents SHIP as the same cupped-hands "hull"
    // sign as BOAT; sources agree the two share a base sign and are
    // distinguished mainly by context (and sometimes a larger, slower
    // movement for a bigger vessel) rather than a different handshape.
    id: 'medium_vehicles_SHIP', level: 'medium', category: 'vehicles', signId: 'SHIP', title: 'Ship', order: 11,
    description: 'Cup both hands together to shape a hull, then move them forward with a smooth, slightly larger rocking motion than BOAT, to suggest a bigger vessel.',
    tips: [
      'Same base handshape as BOAT — a cupped-hands hull',
      'Context (and a slightly bigger movement) is what signals "ship" over "boat"',
      'Don\u2019t confuse with the CL:3 vehicle classifier, which is used for smaller boats and submarines',
    ],
    imageUrl: '../assets/images/medium/vehicles/ship.png', videoUrl: '../assets/videos/medium/vehicles/ship.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.aslbloom.com/signs/ship',
  },

  /* ── MEDIUM · COMMUNITY ─────────────────────────────────────────
   * PARTIAL UNLOCK (this session) — 9 of the 10 words[] researched
   * against lifeprint.com (ASLU), cross-checked against a second
   * source. MARKET could not be confidently sourced this session (no
   * ASLU dictionary page; secondary sources gave definitions but no
   * usable handshape/movement description) — SKIPPED, see chat
   * summary. Because of that, comingSoon is intentionally left `true`
   * for this category; flip it once MARKET is resolved. SCHOOL and
   * STORE reuse the existing medium_places_SCHOOL / medium_places_STORE
   * entries (same physical signs).
   */
  {
    // DUPLICATE — same sign as medium_places_SCHOOL.
    id: 'medium_community_SCHOOL', level: 'medium', category: 'community', signId: 'SCHOOL', title: 'School', order: 1,
    description: 'Hold both hands flat, palms open and facing up. Clap the fingertips of your top hand down into the palm of your bottom hand twice.',
    tips: [
      'Both hands are flat, fingers together',
      'Top hand does the clapping motion',
      'Same sign already used for SCHOOL under Places',
    ],
    imageUrl: '../assets/images/medium/places/school.png', videoUrl: '../assets/videos/medium/places/school.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com, which describes an
    // \u2018H\u2019 handshape drawing a cross on the shoulder/upper arm.
    id: 'medium_community_HOSPITAL', level: 'medium', category: 'community', signId: 'HOSPITAL', title: 'Hospital', order: 2,
    description: 'Use an \u2018H\u2019 handshape to draw a small cross shape on your upper arm or shoulder.',
    tips: [
      'Handshape is \u2018H\u2019 (index and middle finger extended together)',
      'The motion traces a cross — down, then across',
      'Also see PATIENT (medical version) for a related sign',
    ],
    imageUrl: '../assets/images/medium/community/hospital.png', videoUrl: '../assets/videos/medium/community/hospital.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/hospital.htm',
  },
  {
    // NEW — researched against lifeprint.com, which lists two common
    // variants; this entry uses the "badge tap" version, which reads
    // more clearly as a discrete motion sign than the version built
    // around a static handshape.
    id: 'medium_community_POLICE', level: 'medium', category: 'community', signId: 'POLICE', title: 'Police', order: 3,
    description: 'Tap a modified \u2018C\u2019 handshape twice on your upper-left chest, as if tapping a badge.',
    tips: [
      'Handshape is a loose \u2018C\u2019',
      'Two clear taps in the same badge-height spot',
      'Also covers "cop" / "person who wears a badge" generally (ranger, warden, etc.)',
    ],
    imageUrl: '../assets/images/medium/community/police.png', videoUrl: '../assets/videos/medium/community/police.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/police.htm',
  },
  {
    // NEW — researched against lifeprint.com, which gives this as the
    // "flame/burning" sense of FIRE (as opposed to the unrelated
    // "fired from a job" sign).
    id: 'medium_community_FIRE', level: 'medium', category: 'community', signId: 'FIRE', title: 'Fire', order: 4,
    description: 'Hold both hands up in \u20185\u2019 handshapes, wiggle your fingers, and move your hands alternately up and down a couple of times, like rising flames.',
    tips: [
      'Both hands are open \u20185\u2019 handshapes with fingers wiggling',
      'Hands alternate — one goes up while the other goes down',
      'This is the "flame/burning" sense, not "fired from a job"',
    ],
    imageUrl: '../assets/images/medium/community/fire.png', videoUrl: '../assets/videos/medium/community/fire.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/fire.htm',
  },
  {
    // NEW — researched against lifeprint.com, which describes circling
    // an \u2018L\u2019 handshape in the air.
    id: 'medium_community_LIBRARY', level: 'medium', category: 'community', signId: 'LIBRARY', title: 'Library', order: 5,
    description: 'Form an \u2018L\u2019 handshape and circle it in the air in front of you.',
    tips: [
      'Handshape stays an \u2018L\u2019 throughout the circle',
      'Right-handed signers typically circle clockwise from their own view',
      'LIBRARY + the flat-hand PERSON sign means "librarian"',
    ],
    imageUrl: '../assets/images/medium/community/library.png', videoUrl: '../assets/videos/medium/community/library.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/library.htm',
  },
  {
    // NEW — researched against lifeprint.com, which is explicit that
    // BANK (the institution) is signed as lexicalized fingerspelling —
    // flagging for Joshua same as the Months/BUS/TRUCK/VAN/TAXI entries.
    id: 'medium_community_BANK', level: 'medium', category: 'community', signId: 'BANK', title: 'Bank', order: 6,
    description: 'Fingerspell B-N-K quickly, blending the letters together rather than forming each one crisply.',
    tips: [
      'This is lexicalized fingerspelling, not a single gesture',
      'Letters blend together — don\u2019t pause between them',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/community/bank.png', videoUrl: '../assets/videos/medium/community/bank.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bank.htm',
  },
  {
    // DUPLICATE — same sign as medium_places_STORE.
    id: 'medium_community_STORE', level: 'medium', category: 'community', signId: 'STORE', title: 'Store', order: 8,
    description: 'Hold both hands in a loose \u2018flat O\u2019 shape near your chest, palms facing forward, and rotate your wrists forward twice, as if presenting items on a shelf.',
    tips: [
      'Both hands move together, in sync',
      'Small forward rotation from the wrist, repeated twice',
      'Same sign already used for STORE under Places',
    ],
    imageUrl: '../assets/images/medium/places/store.png', videoUrl: '../assets/videos/medium/places/store.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com, which describes an
    // \u2018R\u2019 handshape touching each corner of the chin.
    id: 'medium_community_RESTAURANT', level: 'medium', category: 'community', signId: 'RESTAURANT', title: 'Restaurant', order: 9,
    description: 'Touch an \u2018R\u2019 handshape to one corner of your chin, then to the other corner.',
    tips: [
      'Handshape is \u2018R\u2019 (crossed index and middle fingers) throughout',
      'Two clear touches — corner to corner',
      'A related but different sign covers "cafeteria / cafe"',
    ],
    imageUrl: '../assets/images/medium/community/restaurant.png', videoUrl: '../assets/videos/medium/community/restaurant.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/restaurant.htm',
  },
  {
    // NEW — lifeprint.com references PARK ("P-A-R-K") only as
    // fingerspelling in the context of ROLLERCOASTER P-A-R-K; no
    // ASLU dictionary page exists for a gestural sign, and this matches
    // the general pattern (like BANK) of short place-names being
    // fingerspelled.
    id: 'medium_community_PARK', level: 'medium', category: 'community', signId: 'PARK', title: 'Park', order: 10,
    description: 'Fingerspell P-A-R-K, spelling at a natural conversational speed.',
    tips: [
      'No single gestural sign is ASLU-documented for this sense of "park"',
      'Keep letters distinct — this one isn\u2019t blended as fast as BANK or BUS',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/community/park.png', videoUrl: '../assets/videos/medium/community/park.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/park.htm',
  },

  /* ── MEDIUM · DIRECTIONS ────────────────────────────────────────
   * UNLOCKED (this session) — 5 of the 10 words[] are new content,
   * researched against lifeprint.com (ASLU). BACK, TURN, GO, STOP, and
   * WAIT reuse the existing medium_body_BACK / medium_turn_taking_TURN
   * / medium_actions_GO / medium_actions_STOP / medium_actions_WAIT
   * entries (same physical signs, same precedent as Transportation's
   * reuse of GO/STOP/WAIT).
   */
  {
    // NEW — researched against lifeprint.com's "left-handed signing"
    // page and its "locations" page, which both describe an \u2018L\u2019
    // handshape patted/moved out to the left.
    id: 'medium_directions_LEFT', level: 'medium', category: 'directions', signId: 'LEFT', title: 'Left', order: 1,
    description: 'Form an \u2018L\u2019 handshape and move it out to your left side, as if patting an imaginary wall on your left.',
    tips: [
      'Handshape is \u2018L\u2019 (index finger and thumb out)',
      'Movement is a short, clear motion to your left',
      'Left-handed signers still use \u2018L\u2019 but on their left hand, moving left',
    ],
    imageUrl: '../assets/images/medium/directions/left.png', videoUrl: '../assets/videos/medium/directions/left.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-layout/lefthandedsigners.htm',
  },
  {
    // NEW — researched against lifeprint.com's "right" page, which
    // labels this the "RIGHT-direction" sense and describes it as the
    // opposite of LEFT.
    id: 'medium_directions_RIGHT', level: 'medium', category: 'directions', signId: 'RIGHT', title: 'Right', order: 2,
    description: 'Form an \u2018R\u2019 handshape and move it out to your right side — the mirror image of LEFT.',
    tips: [
      'Handshape is \u2018R\u2019 (crossed index and middle fingers)',
      'Direction is the mirror of LEFT',
      'Different from RIGHT/correct, which taps the dominant index finger onto the non-dominant one',
    ],
    imageUrl: '../assets/images/medium/directions/right.png', videoUrl: '../assets/videos/medium/directions/right.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/right.htm',
  },
  {
    // NEW — standard directional point; cross-referenced against
    // lifeprint.com's signing-notes page, which confirms a single
    // upward movement (versus a repeated one for "upstairs").
    id: 'medium_directions_UP', level: 'medium', category: 'directions', signId: 'UP', title: 'Up', order: 3,
    description: 'Point your index finger upward and move your hand a short distance up.',
    tips: [
      'A single clean upward movement — repeating it changes the meaning to "upstairs"',
      'Keep the point roughly at or below head height',
      'The mirror image of DOWN',
    ],
    imageUrl: '../assets/images/medium/directions/up.png', videoUrl: '../assets/videos/medium/directions/up.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/topics/signingnotes.htm',
  },
  {
    // NEW — standard directional point, mirror image of UP.
    id: 'medium_directions_DOWN', level: 'medium', category: 'directions', signId: 'DOWN', title: 'Down', order: 4,
    description: 'Point your index finger downward and move your hand a short distance down.',
    tips: [
      'A single clean downward movement',
      'The mirror image of UP',
      'Keep the motion small and controlled, not a big sweep',
    ],
    imageUrl: '../assets/images/medium/directions/down.png', videoUrl: '../assets/videos/medium/directions/down.mp4', detectionType: 'motion',
  },
  {
    // NEW — cross-checked against Signing Savvy, which groups FORWARD
    // with ADVANCE / PROCEED / MOVE-AHEAD under the same sign; no
    // single ASLU dictionary page exists for this exact gloss, so this
    // entry is flagged as slightly lower-confidence than the others in
    // this batch.
    id: 'medium_directions_FORWARD', level: 'medium', category: 'directions', signId: 'FORWARD', title: 'Forward', order: 5,
    description: 'Hold both hands flat, palms facing forward, and move them forward together in one smooth motion.',
    tips: [
      'Both hands move together, palms leading the motion',
      'Same general sign family as ADVANCE / PROCEED / MOVE-AHEAD',
      'Lower-confidence entry — no dedicated ASLU page found; double-check locally before relying on this one',
    ],
    imageUrl: '../assets/images/medium/directions/forward.png', videoUrl: '../assets/videos/medium/directions/forward.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.signingsavvy.com/sign/FORWARD/3487/1',
  },
  {
    // DUPLICATE — same sign as medium_body_BACK.
    id: 'medium_directions_BACK', level: 'medium', category: 'directions', signId: 'BACK', title: 'Back', order: 6,
    description: 'Point your thumb back over your shoulder, toward your own back.',
    tips: [
      'Thumb does the pointing, hand in a loose fist',
      'Gesture is aimed behind you',
      'Same sign already used for BACK under Body',
    ],
    imageUrl: '../assets/images/medium/body/back.png', videoUrl: '../assets/videos/medium/body/back.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_turn_taking_TURN.
    id: 'medium_directions_TURN', level: 'medium', category: 'directions', signId: 'TURN', title: 'Turn', order: 7,
    description: 'Make an \u2018L\u2019 handshape (index finger and thumb out) and roll your wrist to flip it forward, toward the person or direction it applies to.',
    tips: [
      'Handshape stays an \u2018L\u2019 throughout — only the wrist rolls',
      'Direction of the roll indicates which way you\u2019re turning',
      'Same sign already used for TURN under Turn-Taking',
    ],
    imageUrl: '../assets/images/medium/turn_taking/turn.png', videoUrl: '../assets/videos/turn_taking/turn.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/turn.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_GO.
    id: 'medium_directions_GO', level: 'medium', category: 'directions', signId: 'GO', title: 'Go', order: 8,
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body — the reverse of COME',
      'Same sign already used for GO under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/go.png', videoUrl: '../assets/videos/medium/actions/go.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_STOP.
    id: 'medium_directions_STOP', level: 'medium', category: 'directions', signId: 'STOP', title: 'Stop', order: 9,
    description: 'Hold your non-dominant hand flat, palm up, and chop the edge of your dominant flat hand down onto it in one sharp motion.',
    tips: [
      'Base hand stays flat and still',
      'One sharp, decisive chopping motion',
      'Same sign already used for STOP under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/stop.png', videoUrl: '../assets/videos/medium/actions/stop.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_WAIT.
    id: 'medium_directions_WAIT', level: 'medium', category: 'directions', signId: 'WAIT', title: 'Wait', order: 10,
    description: 'Hold both hands up in front of you with fingers loosely bent and spread, and wiggle your fingers.',
    tips: [
      'Fingers stay loose and bent (not a fist, not flat)',
      'Wiggle the fingers gently, hands mostly still',
      'Same sign already used for WAIT under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/wait.png', videoUrl: '../assets/videos/medium/actions/wait.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wait.htm',
  },

  /* ── MEDIUM · SOCIAL ────────────────────────────────────────────
   * UNLOCKED (this session) — 5 of the 12 words[] are new content,
   * researched against lifeprint.com (ASLU). CLASSMATE and NEIGHBOR
   * are ASL *compound* signs rather than single dictionary entries —
   * flagged individually below. FRIEND, PLAY, TALK, SHARE, HELP, LIKE,
   * and LOVE reuse the existing medium_people_FRIEND /
   * medium_actions_PLAY / medium_actions_TALK / medium_communication_SHARE
   * / medium_requests_HELP / medium_feelings_LIKE / medium_feelings_LOVE
   * entries (same physical signs).
   */
  {
    // DUPLICATE — same sign as medium_people_FRIEND.
    id: 'medium_social_FRIEND', level: 'medium', category: 'social', signId: 'FRIEND', title: 'Friend', order: 1,
    description: 'Hook your index fingers together, then reverse and hook them together the other way — like two links of a chain interlocking.',
    tips: [
      'Both hands use a hooked index-finger ("X") handshape',
      'Hook, then flip and hook again the opposite way',
      'Same sign already used for FRIEND under People',
    ],
    imageUrl: '../assets/images/medium/people/friend.png', videoUrl: '../assets/videos/medium/people/friend.mp4', detectionType: 'motion',
  },
  {
    // NEW — no single ASLU dictionary entry for "classmate"; this
    // follows ASLU's own documented agent-marker compounding pattern
    // (the same pattern used for LIBRARY+AGENT = "librarian"), applied
    // to the well-documented CLASS sign. Flagging as a compound, lower-
    // confidence entry — worth a local double-check.
    id: 'medium_social_CLASSMATE', level: 'medium', category: 'social', signId: 'CLASSMATE', title: 'Classmate', order: 2,
    description: 'Sign CLASS (both hands in a \u2018C\u2019 handshape, circling around each other in front of you), then add the flat-hand PERSON sign to mean "a person in that class."',
    tips: [
      'This is a compound: CLASS + PERSON/AGENT, not a single dictionary sign',
      'Same agent-marker pattern ASLU uses for LIBRARY+AGENT = "librarian"',
      'Compound, lower-confidence entry — no dedicated ASLU page; double-check locally',
    ],
    imageUrl: '../assets/images/medium/social/classmate.png', videoUrl: '../assets/videos/medium/social/classmate.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "neighbor" page, which
    // documents two variants; this entry uses "version 2," which the
    // page itself labels as "next one over + person" and is easier to
    // describe unambiguously as a motion sign than version 1.
    id: 'medium_social_NEIGHBOR', level: 'medium', category: 'social', signId: 'NEIGHBOR', title: 'Neighbor', order: 3,
    description: 'Sign NEXT (indicating something positioned beside you), then add the flat-hand PERSON sign to mean "the person next to me."',
    tips: [
      'ASLU labels this version "next one over + person"',
      'A second ASLU variant also exists — this entry uses the clearer of the two for a motion sign',
      'Compound sign — double-check locally',
    ],
    imageUrl: '../assets/images/medium/social/neighbor.png', videoUrl: '../assets/videos/medium/social/neighbor.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/neighbor.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_PLAY.
    id: 'medium_social_PLAY', level: 'medium', category: 'social', signId: 'PLAY', title: 'Play', order: 4,
    description: 'Form \u2018Y\u2019 handshapes (thumb and pinky out, middle fingers curled) with both hands and twist them back and forth at the wrists.',
    tips: [
      'Both hands use the \u2018Y\u2019 handshape',
      'Twisting comes from the wrist, not the whole arm',
      'Same sign already used for PLAY under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/play.png', videoUrl: '../assets/videos/medium/actions/play.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_TALK.
    id: 'medium_social_TALK', level: 'medium', category: 'social', signId: 'TALK', title: 'Talk', order: 5,
    description: 'Point your index finger at your mouth, then move it forward and back between yourself and the person you\u2019re talking to.',
    tips: [
      'Index finger starts near your own mouth/chin',
      'Motion alternates outward and back',
      'Same sign already used for TALK under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/talk.png', videoUrl: '../assets/videos/medium/actions/talk.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_communication_SHARE.
    id: 'medium_social_SHARE', level: 'medium', category: 'social', signId: 'SHARE', title: 'Share', order: 6,
    description: 'Hold your non-dominant hand flat with fingers together. Brush the pinky-side edge of your dominant flat hand back and forth along the side of your index finger, from the base to the fingertips.',
    tips: [
      'Base hand stays flat and still, fingers together',
      'Dominant hand\u2019s pinky edge does the brushing',
      'Same sign already used for SHARE under Communication',
    ],
    imageUrl: '../assets/images/medium/communication/share.png', videoUrl: '../assets/videos/medium/communication/share.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/share.htm',
  },
  {
    // DUPLICATE — same sign as medium_requests_HELP.
    id: 'medium_social_HELP', level: 'medium', category: 'social', signId: 'HELP', title: 'Help', order: 7,
    description: 'Rest your dominant fist (thumb up) on the palm of your other flat hand, then lift both hands upward together.',
    tips: [
      'Base hand stays flat, dominant hand is a thumbs-up fist',
      'Both hands lift together',
      'Same sign already used for HELP under Requests',
    ],
    imageUrl: '../assets/images/medium/requests/help.png', videoUrl: '../assets/videos/medium/requests/help.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "meet" page, which is
    // explicit that both hands use index-finger handshapes and that
    // the fingertips do not touch when they come together.
    id: 'medium_social_MEET', level: 'medium', category: 'social', signId: 'MEET', title: 'Meet', order: 8,
    description: 'Point both index fingers up and bring them together in front of you from opposite directions, stopping just before the tips touch.',
    tips: [
      'Both hands use an index-finger ("1") handshape',
      'Tips come close but don\u2019t actually touch',
      'Can be directional: move the dominant hand toward the other to mean "meet that person"',
    ],
    imageUrl: '../assets/images/medium/social/meet.png', videoUrl: '../assets/videos/medium/social/meet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/meet.htm',
  },
  {
    // NEW — researched against lifeprint.com's "visit" page.
    id: 'medium_social_VISIT', level: 'medium', category: 'social', signId: 'VISIT', title: 'Visit', order: 9,
    description: 'Form \u2018V\u2019 handshapes with both hands and move them in alternating circles — up, forward, down, and back — so one hand is always opposite the other.',
    tips: [
      'Both hands use a \u2018V\u2019 handshape',
      'When the right hand is up, the left is down; when right is forward, left is back',
      'A continuous circular motion, not a single gesture',
    ],
    imageUrl: '../assets/images/medium/social/visit.png', videoUrl: '../assets/videos/medium/social/visit.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/v/visit.htm',
  },
  {
    // DUPLICATE — same sign as medium_feelings_LIKE.
    id: 'medium_social_LIKE', level: 'medium', category: 'social', signId: 'LIKE', title: 'Like', order: 10,
    description: 'Place your thumb and middle finger against your chest as if pinching your shirt, then pull your hand outward while opening your fingers.',
    tips: [
      'Starts pinched against the chest',
      'Pull outward while the fingers open',
      'Same sign already used for LIKE under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/like.png', videoUrl: '../assets/videos/medium/feelings/like.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_LOVE.
    id: 'medium_social_LOVE', level: 'medium', category: 'social', signId: 'LOVE', title: 'Love', order: 11,
    description: 'Cross both fists over your chest, one on top of the other, as if hugging yourself.',
    tips: [
      'Both hands are closed fists',
      'Cross at the chest, like a hug',
      'Same sign already used for LOVE under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/love.png', videoUrl: '../assets/videos/medium/feelings/love.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "with / together" page,
    // which documents TOGETHER as the same base sign as WITH.
    id: 'medium_social_TOGETHER', level: 'medium', category: 'social', signId: 'TOGETHER', title: 'Together', order: 12,
    description: 'Form \u2018A\u2019 handshapes (fists, thumbs alongside) with both hands and hold them side by side, touching.',
    tips: [
      'Both hands are fists, held together, palms facing each other',
      'Same base sign as WITH',
      'A small horizontal circle while held together can add the sense of "working together"',
    ],
    imageUrl: '../assets/images/medium/social/together.png', videoUrl: '../assets/videos/medium/social/together.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/with.htm',
  },

  // ── MEDIUM · CONVERSATION (unlocked 2026-09-02) ──
  {
    // DUPLICATE — same sign as medium_essentials_greetings_HELLO.
    id: 'medium_conversation_HELLO', level: 'medium', category: 'conversation', signId: 'HELLO', title: 'Hello', order: 1,
    description: 'Hold your dominant hand flat near your forehead, fingers together like a salute, then move it outward and slightly down, away from your head.',
    tips: [
      'Starts near the forehead/temple, like a salute',
      'Hand is flat, fingers together, palm facing out',
      'Same sign already used for Hello under Greetings',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/hello.png', videoUrl: '../assets/videos/medium/essentials_greetings/hello.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_GOOD.
    id: 'medium_conversation_GOOD', level: 'medium', category: 'conversation', signId: 'GOOD', title: 'Good', order: 2,
    description: 'Touch your flat fingertips to your chin, then move your hand down to rest on the palm of your other hand.',
    tips: [
      'Fingertips start at the chin',
      'Hand moves down to rest on your other open palm',
      'Same sign already used for Good under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/good.png', videoUrl: '../assets/videos/medium/feelings/good.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_feelings_FINE.
    id: 'medium_conversation_FINE', level: 'medium', category: 'conversation', signId: 'FINE', title: 'Fine', order: 3,
    description: 'Touch the thumb of an open "5" hand to the center of your chest.',
    tips: [
      'Handshape is an open "5" hand, thumb leading',
      'A single touch to the chest is enough',
      'Same sign already used for Fine under Feelings',
    ],
    imageUrl: '../assets/images/medium/feelings/fine.png', videoUrl: '../assets/videos/medium/feelings/fine.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_personal_information_NAME.
    id: 'medium_conversation_NAME', level: 'medium', category: 'conversation', signId: 'NAME', title: 'Name', order: 4,
    description: 'Form both hands into an "H" handshape (index and middle fingers together). Tap the fingers of your dominant hand crosswise onto the fingers of your non-dominant hand, twice.',
    tips: [
      'Both hands use the two-finger "H" handshape',
      'Dominant hand taps crosswise on top of the stationary hand',
      'Same sign already used for Name under Personal Information',
    ],
    imageUrl: '../assets/images/medium/personal_information/name.png', videoUrl: '../assets/videos/medium/personal_information/name.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/name.htm',
  },
  {
    // NEW — researched against lifeprint.com's "nice / clean" page, cross-
    // checked against Handspeak and aslbloom. All three sources agree:
    // NICE and CLEAN are the identical sign; only a repeated (double)
    // motion shifts the meaning toward "clean up."
    id: 'medium_conversation_NICE', level: 'medium', category: 'conversation', signId: 'NICE', title: 'Nice', order: 5,
    description: 'Hold your non-dominant hand flat in front of you, palm up, and slide the flat palm of your dominant hand across it, from the wrist toward the fingertips.',
    tips: [
      'This is the same sign as CLEAN — context tells them apart',
      'One smooth stroke means "nice"; a repeated double stroke shifts it toward "clean up"',
      'Both hands stay flat the whole time',
    ],
    imageUrl: '../assets/images/medium/conversation/nice.png', videoUrl: '../assets/videos/medium/conversation/nice.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/nice.htm',
  },
  {
    // DUPLICATE — same sign as medium_social_MEET.
    id: 'medium_conversation_MEET', level: 'medium', category: 'conversation', signId: 'MEET', title: 'Meet', order: 6,
    description: 'Point both index fingers up and bring them together in front of you from opposite directions, stopping just before the tips touch.',
    tips: [
      'Both hands use an index-finger ("1") handshape',
      'Tips come close but don\u2019t actually touch',
      'Same sign already used for Meet under Social',
    ],
    imageUrl: '../assets/images/medium/social/meet.png', videoUrl: '../assets/videos/medium/social/meet.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_THANK_YOU. Kept signId
    // 'THANK YOU' (not 'THANKS') so it still matches the trained sign in
    // js/engine/dictionary.js — same precedent as medium_manners_THANKS.
    id: 'medium_conversation_THANKS', level: 'medium', category: 'conversation', signId: 'THANK YOU', title: 'Thanks', order: 7,
    description: 'Touch your flat fingertips to your chin, then move your hand forward and down, as if extending your thanks outward.',
    tips: [
      'Starts with fingertips at the chin',
      'Moves outward toward the other person',
      'Same sign already used for Thank You under Polite Words',
    ],
    imageUrl: '../assets/images/medium/requests/thank_you.png', videoUrl: '../assets/videos/medium/requests/thank_you.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_essentials_greetings_WELCOME. ASLU
    // labels this sign WELCOME/HIRE/INVITE and recommends against using it
    // as a reply to "thank you" — see that entry's tips.
    id: 'medium_conversation_WELCOME', level: 'medium', category: 'conversation', signId: 'WELCOME', title: 'Welcome', order: 8,
    description: 'Hold your flat dominant hand out to the side, palm up, then bring it in toward your torso in one smooth arc, as if welcoming someone into a space.',
    tips: [
      'This same sign also means HIRE and INVITE — context makes the meaning clear',
      'Best used for "welcome, come on in," not as a reply to "thank you"',
      'Same sign already used for Welcome under Greetings',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/welcome.png', videoUrl: '../assets/videos/medium/essentials_greetings/welcome.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "later" page, cross-checked
    // against Handspeak. Lifeprint documents two versions (a near-cheek
    // "FUTURE"-style version, and a palm version); both sources agree on
    // the palm version's details, so that's the one described here.
    id: 'medium_conversation_LATER', level: 'medium', category: 'conversation', signId: 'LATER', title: 'Later', order: 9,
    description: 'Hold your non-dominant hand flat and upright, palm facing you, and touch the tip of your dominant hand\u2019s thumb (in an "L" handshape) to its palm, then rotate your dominant hand forward once.',
    tips: [
      'Dominant hand uses an "L" handshape — the thumb tip is the point of contact',
      'One forward rotation means "later"; a repeated rotation shifts it toward "possible/someday"',
      'A different, one-handed sign near the cheek is used for the casual "see you later"',
    ],
    imageUrl: '../assets/images/medium/conversation/later.png', videoUrl: '../assets/videos/medium/conversation/later.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/later.htm',
  },
  {
    // DUPLICATE — same sign as medium_essentials_greetings_GOODBYE.
    id: 'medium_conversation_GOODBYE', level: 'medium', category: 'conversation', signId: 'GOODBYE', title: 'Goodbye', order: 10,
    description: 'Hold your dominant hand up, palm facing outward, and bend your fingers down and back up at the large knuckles (or bend at the wrist instead) — like a child\u2019s wave.',
    tips: [
      'The bend happens at the big knuckles or the wrist — not a side-to-side wave like HELLO',
      'Palm faces the person you\u2019re leaving',
      'Same sign already used for Goodbye under Greetings',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/goodbye.png', videoUrl: '../assets/videos/medium/essentials_greetings/goodbye.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · MAKING_REQUESTS (unlocked 2026-09-02) ──
  {
    // NEW — researched against lifeprint.com's "have" page and Signing
    // Notes page, cross-checked against a Brainscape ASLU-sourced
    // flashcard set. All sources agree on the "bent" handshape and the
    // inward pull to the chest.
    id: 'medium_making_requests_HAVE', level: 'medium', category: 'making_requests', signId: 'HAVE', title: 'Have', order: 1,
    description: 'Hold both hands in a "bent" handshape (fingers straight, bent at the big knuckles, thumb out) a few inches out from your upper chest, then move them back to touch your chest.',
    tips: [
      'Handshape is "bent" — not a fist, not fully flat',
      'Motion pulls inward, ending with contact at the chest',
      'It\u2019s common to see this sign done with just one hand',
    ],
    imageUrl: '../assets/images/medium/making_requests/have.png', videoUrl: '../assets/videos/medium/making_requests/have.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/have.htm',
  },
  {
    // NEW — researched against lifeprint.com's "can" page, cross-checked
    // against aslbloom and Handspeak. All sources agree: "S" (fist)
    // handshapes, moving downward together.
    id: 'medium_making_requests_CAN', level: 'medium', category: 'making_requests', signId: 'CAN', title: 'Can', order: 2,
    description: 'Hold both hands in "S" (fist) shapes out in front of you, palms down, and move them downward together in one firm motion.',
    tips: [
      'Both hands are fists ("S" handshape) — not open or "A" hands',
      'One firm downward drop means "can"; a repeated bounce shifts it toward "possible"',
      'A bigger, stronger motion adds emphasis, like "definitely can"',
    ],
    imageUrl: '../assets/images/medium/making_requests/can.png', videoUrl: '../assets/videos/medium/making_requests/can.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/can.htm',
  },
  {
    // DUPLICATE — same sign as medium_requests_HELP.
    id: 'medium_making_requests_HELP', level: 'medium', category: 'making_requests', signId: 'HELP', title: 'Help', order: 3,
    description: 'Rest your dominant fist (thumb up) on the palm of your other flat hand, then lift both hands upward together.',
    tips: [
      'Base hand stays flat, dominant hand is a thumbs-up fist',
      'Both hands lift together in one smooth motion',
      'Same sign already used for Help under Needs',
    ],
    imageUrl: '../assets/images/medium/requests/help.png', videoUrl: '../assets/videos/medium/requests/help.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_hand_actions_GIVE.
    id: 'medium_making_requests_GIVE', level: 'medium', category: 'making_requests', signId: 'GIVE', title: 'Give', order: 4,
    description: 'Hold your dominant hand in a flat-O shape (fingers and thumb pinched together) and move it from your body outward toward the person receiving, opening your fingers slightly as you finish.',
    tips: [
      'Fingers and thumb start pinched together, like holding a small object',
      'Motion moves outward, away from your body',
      'Same sign already used for Give under Hand Actions',
    ],
    imageUrl: '../assets/images/medium/hand_actions/give.png', videoUrl: '../assets/videos/medium/hand_actions/give.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_PLEASE.
    id: 'medium_making_requests_PLEASE', level: 'medium', category: 'making_requests', signId: 'PLEASE', title: 'Please', order: 5,
    description: 'Hold your flat hand on your chest and rub it in a circular motion.',
    tips: [
      'Hand stays flat against the chest',
      'Circular motion, not side to side',
      'Same sign already used for Please under Polite Words',
    ],
    imageUrl: '../assets/images/medium/requests/please.png', videoUrl: '../assets/videos/medium/requests/please.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_WAIT.
    id: 'medium_making_requests_WAIT', level: 'medium', category: 'making_requests', signId: 'WAIT', title: 'Wait', order: 6,
    description: 'Hold both hands up in front of you with fingers loosely bent and spread, and wiggle your fingers.',
    tips: [
      'Fingers stay loose and bent (not a fist, not flat)',
      'Wiggle the fingers gently, hands mostly still',
      'Same sign already used for Wait under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/wait.png', videoUrl: '../assets/videos/medium/actions/wait.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wait.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_GO.
    id: 'medium_making_requests_GO', level: 'medium', category: 'making_requests', signId: 'GO', title: 'Go', order: 7,
    description: 'Point both index fingers up and forward, then flick them away from your body.',
    tips: [
      'Palms face forward, both index fingers extended',
      'Motion pushes outward, away from your body — the reverse of COME',
      'Same sign already used for Go under Actions',
    ],
    imageUrl: '../assets/images/medium/actions/go.png', videoUrl: '../assets/videos/medium/actions/go.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_requests_WHERE.
    id: 'medium_making_requests_WHERE', level: 'medium', category: 'making_requests', signId: 'WHERE', title: 'Where', order: 8,
    description: 'Hold your index finger up and shake it quickly from side to side.',
    tips: [
      'Only the index finger is extended',
      'Quick, small side-to-side shake',
      'Same sign already used for Where under Questions',
    ],
    imageUrl: '../assets/images/medium/requests/where.png', videoUrl: '../assets/videos/medium/requests/where.mp4', detectionType: 'motion',
  },
  {
    // NEW — researched against lifeprint.com's "this" page. ASLU's primary
    // recommendation is to just point at the object/place in real
    // conversation, but it also documents a two-handed "citation" version
    // (pointing at the palm of the non-dominant hand) for when nothing
    // specific is in the signing space — used here since it's the more
    // detectable, teachable base form. Cross-checked against Handspeak's
    // general indexing/pointing convention notes.
    id: 'medium_making_requests_THIS', level: 'medium', category: 'making_requests', signId: 'THIS', title: 'This', order: 9,
    description: 'Hold your non-dominant hand flat in front of you, palm up, and point your dominant index finger down, tapping it against the palm.',
    tips: [
      'This is the citation/base version — in real conversation most signers just point straight at the object or place they mean',
      'Handshape is a "1" (index finger), though it can relax toward a "G" shape as the wrist bends',
      'A small, quick downward tap, not a long hold',
    ],
    imageUrl: '../assets/images/medium/making_requests/this.png', videoUrl: '../assets/videos/medium/making_requests/this.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/this.htm',
  },
  {
    // NEW — researched against Handspeak's THAT entry, cross-checked
    // against a second ASL-instruction source (PocketSign). Both agree
    // on a "Y" handshape moving downward, directional toward the
    // referent. Distinct from lifeprint's "indexing" page, which covers
    // the separate 1-handshape point used for "that person" specifically
    // (see HE/SHE/THEY under the indexing convention) — this entry covers
    // the general demonstrative "that [object/idea]" sense that fits this
    // category's words[] list.
    id: 'medium_making_requests_THAT', level: 'medium', category: 'making_requests', signId: 'THAT', title: 'That', order: 10,
    description: 'Form a "Y" handshape with your dominant hand (thumb and pinky extended, other three fingers curled down), palm facing down, and move it downward toward the thing you mean.',
    tips: [
      'Handshape is a "Y" — thumb and pinky out, middle three fingers tucked down',
      'The sign is directional — aim the "Y" toward whatever you\u2019re referring to as your hand drops',
      'A different sign (pointing with a "1" handshape) is used for "that person" specifically',
    ],
    imageUrl: '../assets/images/medium/making_requests/that.png', videoUrl: '../assets/videos/medium/making_requests/that.mp4', detectionType: 'motion',
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