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
 *
 * UNIT RENUMBER (2026-09-03) — the gap at order:2 (leftover from the
 * removed 'fingerspell_name' unit) is now CLOSED. Every unit from
 * the old order:3 (Numbers) onward shifted down by 1 (old order:69
 * "Answers" is now order:68), in both `UNITS[].order` and every
 * `CATEGORIES[].unit` field, so the two stay linked. Order:0 (the
 * removed Welcome unit, see Homepage Pivot above) and the never-added
 * order:70/71 (Basic Phrases/Phrasebook, see Rev 9 note below) aren't
 * part of this renumber — they don't exist as array entries, there
 * was nothing to shift. Every "Unit N" comment reference throughout
 * this file was updated to match, except ones describing history
 * (Unit 0/Unit 2/Unit 71 as they used to be) which were left as-is on
 * purpose. Checked: no helper function or `.order`/`.unit` comparison
 * in this file hardcodes a specific number — everything sorts/filters
 * generically — but `js/learn.js`/`progress.js` weren't available to
 * check for hardcoded unit numbers outside this file.
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * ═════════════════════════════════════════════════════════════════
 * TODO — 2026-09-04 DATA AUDIT (unresolved, needs next-session review)
 * ═════════════════════════════════════════════════════════════════
 * Programmatic pass only — nothing below was changed or resolved.
 * Sanity check 1 (comingSoon:true scan) PASSED: 0 locked categories
 * found, nothing to report there.
 *
 * ── TRACK A — candidate motion-classifier conflicts (UNVERIFIED) ──
 * Exact-description match scan across all detectionType:'motion'
 * entries found ZERO different-signId pairs with identical
 * descriptions — the file's already-documented precedent list
 * (BITTER/SOUR, HI/HELLO, BYE/GOODBYE, EVENING/NIGHT, ME/I, CHEF/COOK,
 * BACK/BEHIND, NEAR/CLOSE, CAP/HAT, CLOSE/CLOSED, WINTER/COLD,
 * TOILET/BATHROOM, MELON/PUMPKIN, QUIET/SILENT, NICE/CLEAN,
 * SURE/TRUE/REALLY) appears to cover every exact-text duplicate.
 *
 * A looser fuzzy pass (word-overlap similarity on descriptions,
 * different signIds, same detectionType:'motion') surfaced pairs
 * below with high overlap. THIS IS NOT PROOF of a real conflict —
 * overlapping wording can just mean two signs are described with
 * similar phrasing (movement type, location) while differing in
 * handshape, which the description text doesn't cleanly separate.
 * Each pair needs a human/AI read of the actual description (and
 * ideally the source images/video) before treating it as real, per
 * the "flag, don't batch-resolve" rule.
 *
 * Highest-overlap candidates (>=0.85 word-overlap) — check these first:
 *   - BLUE vs GREEN            (colors)
 *   - TUESDAY vs FRIDAY        (days)
 *   - BROTHER vs SISTER        (family)
 *   - 6 vs 9                   (numbers)
 *   - SECOND vs THIRD          (sequence)
 *   - APRIL vs JUNE, APRIL vs JULY, JUNE vs JULY   (months)
 *
 * Moderate-overlap candidates (0.6–0.85) — check next:
 *   - BANK vs BUS              (places / vehicles)
 *   - GRANDMA vs GRANDPA       (family)
 *   - MONDAY vs SATURDAY       (days)
 *   - UP vs DOWN               (directions)
 *   - BLUE vs YELLOW, GREEN vs YELLOW              (colors)
 *   - OCTOBER vs NOVEMBER, OCTOBER vs DECEMBER,
 *     NOVEMBER vs DECEMBER    (months)
 *   - J vs Z                   (alphabet)
 *   - RICE vs SOUP             (food)
 *   - VAN vs TAXI              (vehicles)
 *   - TUESDAY vs WEDNESDAY, WEDNESDAY vs FRIDAY    (days)
 *   - BIRD vs DUCK             (animals)
 *   - MAN vs WOMAN             (people)
 *   - AUGUST vs OCTOBER, AUGUST vs NOVEMBER, AUGUST vs DECEMBER (months)
 *   - DENTIST vs LAWYER, LAWYER vs WORKER          (professions)
 *
 * Worth noting: several of these clusters (colors, days, months,
 * numbers, alphabet letters) share a pattern where ASL distinguishes
 * them mainly by HANDSHAPE with a near-identical simple movement
 * (e.g. a small shake or twist). If the classifier here really is
 * motion-only (per detectionType:'motion') and doesn't factor in
 * handshape at all, these clusters could be a real, systemic problem
 * bigger than one-off word pairs — worth checking with Josh whether
 * detectionType:'motion' actually means "motion data only" or if
 * handshape is factored in elsewhere, before resolving pair by pair.
 *
 * ── TRACK B — words[] entries with no matching SIGNS entry ────────
 * Diffed every CATEGORIES[].words[] list against SIGNS entries
 * matching that category (by word/signId). 45 gaps found, not yet
 * sorted into B1 (exists elsewhere, needs a reused entry) vs B2
 * (needs research or should be dropped) — that sorting needs the
 * per-word ASLU/second-source check the spec calls for.
 *
 * Likely B1 (naming mismatch only — the SIGNS entry exists under a
 * different word than what's in words[], e.g. MOM vs MOTHER):
 *   - family: MOTHER (MOM exists), FATHER (DAD exists),
 *     GRANDMOTHER (GRANDMA exists), GRANDFATHER (GRANDPA exists)
 *
 * Everything else below has NO signId or word match anywhere in
 * SIGNS — could be B1 (exists under a name not yet guessed) or B2
 * (never created). Needs the actual research pass:
 *   - essentials_polite_expressions: THANKS
 *   - manners: THANKS
 *   - conversation: THANKS
 *   - feelings: HUNGRY
 *   - requests: LESS, WANT, NEED
 *   - temperature: SOFT, HARD, ROUGH, SMOOTH, WET, DRY, SHARP
 *   - family: SON, DAUGHTER, PARENT, COUSIN, GRANDCHILD
 *   - school_supplies: NOTEBOOK, ERASER, MARKER, GLUE, FOLDER
 *   - classroom: DESK, BOARD
 *   - places: MARKET (already researched+dropped as "no citable
 *     source" under 'community' category per the SEED/ROOT/MAY
 *     precedent — 'places' words[] just never got the same edit,
 *     this one's probably a quick drop, not new research), ZOO,
 *     FARM (note: a FARM *root* sign already exists inside
 *     medium_professions_FARMER's description — thumb traced along
 *     jaw — worth checking if ASLU treats standalone FARM as
 *     citable before assuming B2), AIRPORT
 *   - time: TIME, SOON, AFTER, EARLY, LATE, TOMORROW, YESTERDAY
 *   - essentials_basic_responses: WHICH, WHOSE, MANY, MUCH
 *
 * NEXT AI SESSION: work Track A highest-overlap list first (max 8
 * per batch per the standing rule), then Track B family naming
 * mismatches (quick, likely just words[] edits), then the unresolved
 * Track B list (research each against ASLU/lifeprint.com + one more
 * source; recommend dropping from words[] if nothing citable, same
 * as MANGO/PAPAYA/MARKET/SEED-ROOT precedent). Don't batch-apply
 * resolutions without confirming with Josh first, same as always.
 * ═════════════════════════════════════════════════════════════════
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
 * REV 9 (this session) — the three units that weren't from the source
 * file ('fingerspell_name' at order:2, 'basic_phrases'/'sequence_demo'
 * at order:70, and 'phrasebook' at order:71) are REMOVED. The file is
 * now scoped to exactly the 68 vocabulary topics in the lesson
 * compilation — no gated assessment, no phrase-combination or
 * reference-sentence content. Their CATEGORIES and SIGNS entries were
 * removed with them (see the CATEGORIES array below). Order gaps at
 * 2, 70, and 71 are left as-is, per this file's existing convention —
 * nothing reads UNITS as a zero-indexed array.
 *
 * kind meanings unchanged from Rev 6 — see SYSTEM_ARCHITECTURE.md.
 * ──────────────────────────────────────────────────────────────── */
const UNITS = [
  // HOMEPAGE PIVOT (this session) — order: 0 'welcome' (kind:'info',
  // "Welcome to ASL: A Brief History") REMOVED. That content is now
  // the static pages/homepage.html landing page shown right after
  // login, not a trail unit — see file header comment. Order
  // deliberately starts at 1 now; 1/2/3 below keep their existing
  // values unchanged (per task instructions: don't renumber just to
  // close the gap at 0 — nothing reads UNITS as a zero-indexed array,
  // every lookup below is by `.id` or `.order` value, confirmed via
  // getUnits()/getCategoriesForUnit()/progress.js's getOrderedLiveCategories()).
  { id: 'alphabet', order: 1, title: 'The Alphabet', kind: 'category-group' },
  // REMOVED (this session) — 'fingerspell_name' (order: 2, kind:'interactive')
  // dropped: it's not one of the 68 topics in the lesson compilation this
  // file is scoped to. Order gap at 2 left as-is, per this file's existing
  // convention (see the Homepage-pivot Unit 0 removal note above) —
  // nothing reads UNITS as a zero-indexed array.
  { id: 'numbers', order: 2, title: 'Numbers', kind: 'category-group' },
  // ── Topics 3–68 below, one per unit, order matches the source
  // file's own numbering exactly (topic N below = "N. <title>" in
  // updated_fixed_lesson.txt) minus the 2-unit offset from Welcome +
  // Fingerspell above.
  { id: 'greetings', order: 3, title: 'Greetings', kind: 'category-group' },
  { id: 'polite_words', order: 4, title: 'Polite Words', kind: 'category-group' },
  { id: 'people', order: 5, title: 'People', kind: 'category-group' },
  { id: 'feelings', order: 6, title: 'Feelings', kind: 'category-group' },
  { id: 'needs', order: 7, title: 'Needs', kind: 'category-group' },
  { id: 'actions', order: 8, title: 'Actions', kind: 'category-group' },
  { id: 'hand_actions', order: 9, title: 'Hand Actions', kind: 'category-group' },
  { id: 'communication', order: 10, title: 'Communication', kind: 'category-group' },
  { id: 'body', order: 11, title: 'Body', kind: 'category-group' },
  { id: 'personal_information', order: 12, title: 'Personal Information', kind: 'category-group' },
  { id: 'colors_unit', order: 13, title: 'Colors', kind: 'category-group' },
  { id: 'shapes', order: 14, title: 'Shapes', kind: 'category-group' },
  { id: 'size', order: 15, title: 'Size', kind: 'category-group' },
  { id: 'appearance', order: 16, title: 'Appearance', kind: 'category-group' },
  { id: 'touch', order: 17, title: 'Touch', kind: 'category-group' },
  { id: 'taste', order: 18, title: 'Taste', kind: 'category-group' },
  { id: 'sound', order: 19, title: 'Sound', kind: 'category-group' },
  { id: 'descriptions', order: 20, title: 'Descriptions', kind: 'category-group' },
  { id: 'family_unit', order: 21, title: 'Family', kind: 'category-group' },
  { id: 'home', order: 22, title: 'Home', kind: 'category-group' },
  { id: 'furniture', order: 23, title: 'Furniture', kind: 'category-group' },
  { id: 'household', order: 24, title: 'Household', kind: 'category-group' },
  { id: 'bathroom', order: 25, title: 'Bathroom', kind: 'category-group' },
  { id: 'kitchen', order: 26, title: 'Kitchen', kind: 'category-group' },
  { id: 'school', order: 27, title: 'School', kind: 'category-group' },
  { id: 'school_supplies', order: 28, title: 'School Supplies', kind: 'category-group' },
  { id: 'classroom', order: 29, title: 'Classroom', kind: 'category-group' },
  { id: 'classroom_actions', order: 30, title: 'Classroom Actions', kind: 'category-group' },
  { id: 'subjects', order: 31, title: 'Subjects', kind: 'category-group' },
  // RE-ADDED (this session) — 'food_unit' (order: 32), topic 32 "Food" from
  // the 68-topic lesson compilation (Rice/Bread/Egg/Chicken/Fish/Meat/Soup).
  // comingSoon:true on its CATEGORIES entry below — no SIGNS content has
  // been authored/verified for these 7 words yet.
  { id: 'food_unit', order: 32, title: 'Food', kind: 'category-group' },
  { id: 'fruits', order: 33, title: 'Fruits', kind: 'category-group' },
  { id: 'vegetables', order: 34, title: 'Vegetables', kind: 'category-group' },
  { id: 'snacks', order: 35, title: 'Snacks', kind: 'category-group' },
  { id: 'drinks', order: 36, title: 'Drinks', kind: 'category-group' },
  { id: 'animals_unit', order: 37, title: 'Animals', kind: 'category-group' },
  { id: 'wild_animals', order: 38, title: 'Wild Animals', kind: 'category-group' },
  { id: 'insects', order: 39, title: 'Insects', kind: 'category-group' },
  { id: 'clothes_unit', order: 40, title: 'Clothes', kind: 'category-group' },
  { id: 'dressing', order: 41, title: 'Dressing', kind: 'category-group' },
  { id: 'personal_items', order: 42, title: 'Personal Items', kind: 'category-group' },
  { id: 'nature', order: 43, title: 'Nature', kind: 'category-group' },
  { id: 'plants', order: 44, title: 'Plants', kind: 'category-group' },
  { id: 'weather', order: 45, title: 'Weather', kind: 'category-group' },
  { id: 'seasons', order: 46, title: 'Seasons', kind: 'category-group' },
  { id: 'places_unit', order: 47, title: 'Places', kind: 'category-group' },
  { id: 'vehicles', order: 48, title: 'Vehicles', kind: 'category-group' },
  { id: 'transportation', order: 49, title: 'Transportation', kind: 'category-group' },
  { id: 'professions', order: 50, title: 'Professions', kind: 'category-group' },
  { id: 'community', order: 51, title: 'Community', kind: 'category-group' },
  { id: 'time_unit', order: 52, title: 'Time', kind: 'category-group' },
  { id: 'daytime', order: 53, title: 'Daytime', kind: 'category-group' },
  { id: 'days', order: 54, title: 'Days', kind: 'category-group' },
  { id: 'months', order: 55, title: 'Months', kind: 'category-group' },
  { id: 'sequence', order: 56, title: 'Sequence', kind: 'category-group' },
  { id: 'frequency', order: 57, title: 'Frequency', kind: 'category-group' },
  { id: 'location', order: 58, title: 'Location', kind: 'category-group' },
  { id: 'distance', order: 59, title: 'Distance', kind: 'category-group' },
  { id: 'directions', order: 60, title: 'Directions', kind: 'category-group' },
  { id: 'social', order: 61, title: 'Social', kind: 'category-group' },
  { id: 'manners', order: 62, title: 'Manners', kind: 'category-group' },
  { id: 'turn_taking', order: 63, title: 'Turn-Taking', kind: 'category-group' },
  { id: 'responses', order: 64, title: 'Responses', kind: 'category-group' },
  { id: 'questions', order: 65, title: 'Questions', kind: 'category-group' },
  { id: 'conversation', order: 66, title: 'Conversation', kind: 'category-group' },
  { id: 'requests_unit', order: 67, title: 'Requests', kind: 'category-group' },
  { id: 'answers', order: 68, title: 'Answers', kind: 'category-group' },
  // REMOVED (this session) — 'basic_phrases' (order: 69) and 'phrasebook'
  // (order: 70) dropped: pure vocabulary is all the 68-topic lesson
  // compilation covers, no phrase-combination or reference-sentence
  // topics. Order gaps left as-is, same convention as above.
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
  { id: 'numbers', level: 'basic', title: 'Numbers', order: 1, comingSoon: false, unit: 2 },

  // ── level=medium — topics 3-68, one category per unit, in the exact
  // order given in Omen's uploaded 'updated fixed lesson.txt' (topic
  // numbers in the comments below match that file's own numbering) ──
  // 3. Greetings
  // LEGACY id/content kept — see dictionary.js's HELLO placeholder
  // (disabled:true). words[] below is the fuller preview list from the new
  // plan; only HELLO has an actual SIGNS/dictionary entry so far.
  {
    id: 'essentials_greetings', level: 'medium', title: 'Greetings', order: 1, comingSoon: false, unit: 3,
    // HI removed from words[]/SIGNS (2026-09-03 classifier conflict audit):
    // HI and HELLO are the identical wave, just quicker/smaller — the
    // landmark classifier can't tell them apart. HELLO is kept as the
    // trained motion entry. Same precedent as BITTER/SOUR under Taste.
    // BYE removed from words[]/SIGNS (same audit): BYE and GOODBYE are
    // the identical wave, same reasoning — GOODBYE is kept.
    // EVENING removed from words[]/SIGNS (same audit): EVENING and NIGHT
    // are the identical sign (arm + drooping hand) — NIGHT is kept.
    words: ['HELLO', 'MORNING', 'AFTERNOON', 'NIGHT', 'GOODBYE', 'WELCOME'],
  },
  // 4. Polite Words
  // LEGACY id/content kept — PLEASE/THANK YOU/EXCUSE/SORRY have disabled:true
  // dictionary.js placeholders. words[] below is the new plan's fuller Polite
  // Words list; THANKS/WELCOME/YES/NO have no SIGNS entry of their own yet
  // (YES/NO live under 'essentials_basic_responses'/'questions' instead — see
  // that entry).
  {
    id: 'essentials_polite_expressions', level: 'medium', title: 'Polite Words', order: 1, comingSoon: false, unit: 4,
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
    id: 'people', level: 'medium', title: 'People', order: 1, comingSoon: false, unit: 5,
    words: ['ME', 'MY', 'YOU', 'YOUR', 'BOY', 'GIRL', 'BABY', 'CHILD', 'MAN', 'WOMAN', 'PERSON', 'FRIEND', 'TEACHER', 'STUDENT'],
  },
  // 6. Feelings
  // LEGACY id kept (was already comingSoon:true, zero dictionary.js entries) —
  // words[] replaced wholesale with the new plan's Feelings list;
  // CRY/LIKE/LOVE from the old list moved to 'actions'/'social' per the new
  // plan, safe since none were ever wired to detection.
  // SLEEPY removed (2026-09-04 classifier conflict audit): physically identical to
  // SLEEP under Requests/Actions and can't be told apart by the landmark classifier —
  // SLEEP is kept as the trained motion entry. Same precedent as BITTER/SOUR under Taste.
  {
    id: 'feelings', level: 'medium', title: 'Feelings', order: 1, comingSoon: false, unit: 6,
    words: ['HAPPY', 'SAD', 'ANGRY', 'SCARED', 'EXCITED', 'TIRED', 'HUNGRY', 'THIRSTY', 'SICK', 'FINE', 'OKAY', 'BORED', 'WORRIED', 'NERVOUS'],
  },
  // 7. Needs
  // LEGACY id/content kept — HELP/STOP/WATER/FOOD/HUNGRY/BATHROOM/GO/COME have
  // disabled:true dictionary.js placeholders (Phase 7). words[] below is the
  // new plan's fuller Needs list; the real placeholder set is narrower (no
  // SLEEP/MORE/LESS/WANT/NEED/LIKE entry yet) — flagged, not a regression,
  // just the preview text now says more than the app can actually check yet.
  {
    id: 'requests', level: 'medium', title: 'Needs', order: 1, comingSoon: false, unit: 7,
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
    id: 'actions', level: 'medium', title: 'Actions', order: 1, comingSoon: false, unit: 8,
    // SEE removed from words[] (2026-09-04 classifier conflict audit) —
    // identical sign to LOOK; see "MEDIUM · ACTIONS" SIGNS block comment.
    words: ['GO', 'COME', 'STOP', 'WAIT', 'SIT', 'STAND', 'WALK', 'RUN', 'JUMP', 'EAT', 'DRINK', 'SLEEP', 'WAKE', 'PLAY', 'LOOK', 'LISTEN', 'TALK', 'READ', 'WRITE', 'DRAW', 'SING', 'DANCE', 'COOK', 'CLEAN', 'THINK', 'CRY', 'LAUGH', 'RIDE', 'BATH'],
  },
  // 9. Hand Actions
  // REV 8 (2026-08-25): flipped to comingSoon:false — full ASLU-checked SIGNS
  // coverage added for every word[] below (see "MEDIUM · HAND ACTIONS" block).
  {
    id: 'hand_actions', level: 'medium', title: 'Hand Actions', order: 1, comingSoon: false, unit: 9,
    // PUSH removed from words[] (2026-09-04 classifier conflict audit)
    // — identical sign to FORWARD (Directions); see "MEDIUM · HAND
    // ACTIONS" SIGNS block comment.
    words: ['GIVE', 'TAKE', 'PUT', 'GET', 'BRING', 'CARRY', 'PULL', 'THROW', 'CATCH', 'PICK'],
  },
  // 10. Communication
  // REV 8 (2026-08-25): flipped to comingSoon:false. 'HELP' removed from
  // words[] — it's already live under 'requests' (Needs, Unit 7) and that
  // category's own words[] claims it; per project convention we don't
  // duplicate a physical-sign entry across two categories, so it's not
  // repeated here. Every remaining word has real SIGNS coverage (see
  // "MEDIUM · COMMUNICATION" block).
  {
    id: 'communication', level: 'medium', title: 'Communication', order: 1, comingSoon: false, unit: 10,
    words: ['ASK', 'ANSWER', 'TELL', 'SHOW', 'SHARE', 'TEACH', 'SIGN'],
  },
  // 11. Body
  {
    id: 'body', level: 'medium', title: 'Body', order: 1, comingSoon: false, unit: 11,
    words: ['BODY', 'HEAD', 'HAIR', 'FACE', 'EYE', 'EAR', 'NOSE', 'MOUTH', 'TEETH', 'HAND', 'FINGER', 'ARM', 'LEG', 'FOOT', 'STOMACH', 'BACK'],
  },
  // 12. Personal Information — unlocked this pass. 9 of these 15 words
  // (BOY/GIRL/CHILD/PERSON/FRIEND/STUDENT/TEACHER/HOME/SCHOOL) reuse
  // entries already live under family/people/places — see the
  // "MEDIUM · PERSONAL_INFORMATION" SIGNS block comment.
  {
    id: 'personal_information', level: 'medium', title: 'Personal Information', order: 1, comingSoon: false, unit: 12,
    // AGE removed from words[] (2026-09-04 classifier conflict audit) —
    // identical sign to OLD under Appearance; see "MEDIUM ·
    // PERSONAL_INFORMATION" SIGNS block comment.
    words: ['NAME', 'BOY', 'GIRL', 'CHILD', 'PERSON', 'FAMILY', 'FRIEND', 'STUDENT', 'TEACHER', 'SCHOOL', 'HOME', 'BIRTHDAY', 'LIVE', 'FROM'],
  },
  // 13. Colors — unlocked: all 11 words have ASLU-checked SIGNS entries
  // (see "MEDIUM · COLORS" below). GOLD/SILVER aren't in this list and
  // were removed rather than kept as unused entries — see BROWN's
  // detection notes if a metallic color is ever wanted back.
  {
    id: 'colors', level: 'medium', title: 'Colors', order: 1, comingSoon: false, unit: 13,
    words: ['RED', 'BLUE', 'YELLOW', 'GREEN', 'ORANGE', 'PURPLE', 'WHITE', 'BLACK', 'GRAY', 'BROWN', 'PINK'],
  },
  // 14. Shapes
  {
    id: 'shapes', level: 'medium', title: 'Shapes', order: 1, comingSoon: false, unit: 14,
    words: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'RECTANGLE', 'OVAL', 'STAR', 'HEART', 'DIAMOND'],
  },
  // 15. Size
  // Replaces the retired legacy 'amounts' category (BIG/TALL/FULL/MORE,
  // comingSoon:true, zero dictionary.js entries — safe to retire, no
  // detection risk). FULL moved to 'descriptions' per the new plan.
  {
    id: 'size', level: 'medium', title: 'Size', order: 1, comingSoon: false, unit: 15,
    words: ['BIG', 'SMALL', 'TALL', 'SHORT', 'LONG', 'WIDE', 'THIN', 'HEAVY', 'LIGHT'],
  },
  // 16. Appearance — unlocked this pass. CLEAN reuses the entry already
  // live under 'actions'. NEAT removed from words[] — physically
  // identical to CLEAN and can't be told apart by the landmark
  // classifier (see "MEDIUM · APPEARANCE" SIGNS block comment).
  {
    id: 'appearance', level: 'medium', title: 'Appearance', order: 1, comingSoon: false, unit: 16,
    words: ['BEAUTIFUL', 'PRETTY', 'UGLY', 'CUTE', 'CLEAN', 'DIRTY', 'MESSY', 'OLD', 'NEW', 'BROKEN', 'DARK', 'BRIGHT'],
  },
  // 17. Touch
  // LEGACY id/content kept — HOT/COLD have disabled:true dictionary.js
  // placeholders (Phase 7). Retitled 'Temperature' -> 'Touch' to match the new
  // plan's topic 17; words[] below is the fuller Touch list, but only HOT/COLD
  // have any real placeholder so far.
  {
    id: 'temperature', level: 'medium', title: 'Touch', order: 1, comingSoon: false, unit: 17,
    words: ['HOT', 'COLD', 'WARM', 'COOL', 'SOFT', 'HARD', 'ROUGH', 'SMOOTH', 'WET', 'DRY', 'SHARP'],
  },
  // 18. Taste — BITTER removed from words[]: physically identical to
  // SOUR and can't be told apart by the landmark classifier (see
  // "MEDIUM · TASTE" SIGNS block comment).
  {
    id: 'taste', level: 'medium', title: 'Taste', order: 1, comingSoon: false, unit: 18,
    words: ['SWEET', 'SOUR', 'SALTY', 'SPICY', 'DELICIOUS', 'FRESH'],
  },
  // 19. Sound — unlocked this pass. SILENT removed from words[]/SIGNS
  // (2026-09-03 classifier conflict audit): QUIET and SILENT are the
  // same physical sign in ASL (context only), so the landmark classifier
  // can't tell them apart — QUIET is kept as the trained motion entry.
  // Same precedent as BITTER/SOUR under Taste. HIGH/LOW reuse the
  // general elevation signs, applied to pitch.
  {
    id: 'sound', level: 'medium', title: 'Sound', order: 1, comingSoon: false, unit: 19,
    words: ['LOUD', 'QUIET', 'NOISY', 'HIGH', 'LOW'],
  },
  // 20. Descriptions
  // UNLOCKED (2026-09-01): FAST/SLOW/STRONG/WEAK/EMPTY/OPEN/CLOSED researched fresh
  // against lifeprint.com and cross-checked against Handspeak/PocketSign/StrongASL/
  // SigningSavvy. GOOD/BAD reuse the existing medium_feelings_GOOD/BAD entries
  // (same physical sign, already live under Questions). FULL was already here.
  {
    id: 'descriptions', level: 'medium', title: 'Descriptions', order: 1, comingSoon: false, unit: 20,
    words: ['FAST', 'SLOW', 'STRONG', 'WEAK', 'GOOD', 'BAD', 'FULL', 'EMPTY', 'OPEN', 'CLOSED'],
  },
  // 21. Family
  // LEGACY id/content kept — this is real, TRAINED detection content
  // (MOM/DAD/BOY/GIRL/MARRIAGE/BROTHER/SISTER/GRANDMA/GRANDPA/AUNT/UNCLE/BABY/SINGLE/DIVORCED).
  // words[] below is the new plan's fuller Family list for the lesson-content
  // preview; the trained SIGNS set is unchanged and narrower — do not
  // delete/rename any 'family' SIGNS entries to 'match' this list.
  //
  // MOTHER/FATHER/GRANDMOTHER/GRANDFATHER removed from words[] (2026-09-04
  // Track B audit): ASL doesn't have separate signs for the formal vs.
  // informal English terms — MOM/DAD/GRANDMA/GRANDPA (already listed here,
  // already trained) are the same physical signs. A same-signId SIGNS
  // entry per the usual reuse pattern isn't possible here since it would
  // put a duplicate signId inside this same category's list (unlike the
  // cross-category DESK/TABLE-style reuse case) — dropping the redundant
  // word is the same fix used elsewhere in this file for one-sign/
  // multiple-English-word pairs (see BITTER/SOUR under Taste).
  {
    id: 'family', level: 'medium', title: 'Family', order: 1, comingSoon: false, unit: 21,
    words: ['FAMILY', 'MOM', 'DAD', 'BROTHER', 'SISTER', 'BABY', 'SON', 'DAUGHTER', 'PARENT', 'CHILD', 'GRANDMA', 'GRANDPA', 'AUNT', 'UNCLE', 'COUSIN', 'GRANDCHILD'],
  },
  // 22. Home
  {
    id: 'home', level: 'medium', title: 'Home', order: 1, comingSoon: false, unit: 22,
    words: ['HOUSE', 'HOME', 'BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING', 'DINING', 'GARAGE', 'GARDEN', 'YARD'],
  },
  // 23. Furniture
  // DESK removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit): physically identical to TABLE (same stacked-forearms motion)
  // and can't be told apart by the landmark classifier. CABINET and
  // CLOSET also removed for the same reason — both are the literal DOOR
  // sign (pivoting flat hand, hinge at the pinkie); DOOR (Household) is
  // kept as the trained motion entry for that gesture. Same precedent as
  // BITTER/SOUR under Taste.
  {
    id: 'furniture', level: 'medium', title: 'Furniture', order: 1, comingSoon: false, unit: 23,
    words: ['BED', 'PILLOW', 'BLANKET', 'CHAIR', 'TABLE', 'SOFA', 'SHELF', 'LAMP'],
  },
  // 24. Household
  {
    id: 'household', level: 'medium', title: 'Household', order: 1, comingSoon: false, unit: 24,
    words: ['DOOR', 'WINDOW', 'WALL', 'FLOOR', 'ROOF', 'CLOCK', 'MIRROR', 'FAN', 'TV', 'REMOTE', 'PHONE', 'COMPUTER', 'BOOK', 'KEY'],
  },
  // 25. Bathroom
  // UNLOCKED (2026-09-01): researched against lifeprint.com, cross-checked against
  // Handspeak/PocketSign/StrongASL/SigningSavvy. TOOTHBRUSH reuses
  // medium_health_BRUSH_TEETH (SigningSavvy confirms the noun shares the verb's
  // sign). SINK removed — ASLU has no dedicated sign, Dr. Bill recommends fingerspelling
  // S-I-N-K (same treatment as PEN/ART/ENGLISH elsewhere in this file). TOILET removed —
  // physically identical to medium_home_BATHROOM and can't be told apart by the
  // landmark classifier (see "MEDIUM · BATHROOM" SIGNS block comment).
  {
    id: 'bathroom', level: 'medium', title: 'Bathroom', order: 1, comingSoon: false, unit: 25,
    words: ['SHOWER', 'BATHTUB', 'SOAP', 'SHAMPOO', 'TOWEL', 'TOOTHBRUSH', 'TOOTHPASTE'],
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
    id: 'kitchen', level: 'medium', title: 'Kitchen', order: 1, comingSoon: false, unit: 26,
    words: ['REFRIGERATOR', 'PLATE', 'BOWL', 'CUP', 'GLASS', 'SPOON', 'FORK', 'KNIFE'],
  },
  // 27. School
  {
    id: 'school', level: 'medium', title: 'School', order: 1, comingSoon: false, unit: 27,
    words: ['TEACHER', 'STUDENT', 'PRINCIPAL', 'FRIEND', 'CLASSMATE', 'BOY', 'GIRL'],
  },
  // 28. School Supplies
  {
    id: 'school_supplies', level: 'medium', title: 'School Supplies', order: 1, comingSoon: false, unit: 28,
    // PEN removed — no dedicated ASLU sign; fingerspell P-E-N (existing Fingerspell feature covers this).
    words: ['BOOK', 'NOTEBOOK', 'PENCIL', 'ERASER', 'PAPER', 'CRAYON', 'MARKER', 'RULER', 'SCISSORS', 'GLUE', 'FOLDER', 'BACKPACK'],
  },
  // 29. Classroom
  {
    id: 'classroom', level: 'medium', title: 'Classroom', order: 1, comingSoon: false, unit: 29,
    words: ['DESK', 'CHAIR', 'TABLE', 'BOARD', 'DOOR', 'WINDOW', 'CLOCK', 'COMPUTER', 'SHELF', 'TRASH'],
  },
  // 30. Classroom Actions
  // UNLOCKED (2026-09-03) — see "MEDIUM · CLASSROOM ACTIONS" SIGNS block.
  // RAISE/LOWER removed from words[] — no dedicated ASLU/Handspeak/
  // StartASL/SignASL sign exists for "raise/lower your hand" in the
  // classroom sense; it's taught as a literal gesture, not a distinct
  // lexical sign (same exclusion category as MANGO/PAPAYA under Fruits).
  // CLOSE removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit): physically identical to medium_descriptions_CLOSED (same
  // double-hand door-shutting motion) and can't be told apart by the
  // landmark classifier — CLOSED is kept as the trained motion entry.
  // Same precedent as BITTER/SOUR under Taste. NOTE: unrelated to this,
  // signId 'CLOSE' is still separately used by medium_distance_CLOSE
  // (an entirely different F-handshape sign meaning "near") — that
  // entry is untouched.
  {
    id: 'classroom_actions', level: 'medium', title: 'Classroom Actions', order: 1, comingSoon: false, unit: 30,
    words: ['READ', 'WRITE', 'DRAW', 'COLOR', 'LISTEN', 'LOOK', 'SIT', 'STAND', 'ASK', 'ANSWER', 'OPEN', 'SHARE', 'HELP'],
  },
  // 31. Subjects
  {
    id: 'subjects', level: 'medium', title: 'Subjects', order: 1, comingSoon: false, unit: 31,
    // ART removed — identical clip to DRAW (ASLU: combine DRAW/ART with the person affix); use DRAW instead.
    // ENGLISH removed — no dedicated ASLU sign; fingerspell E-N-G-L-I-S-H (existing Fingerspell feature covers this).
    // MUSIC removed (2026-09-04 classifier conflict audit): physically identical to
    // SING under Actions and can't be told apart by the landmark classifier —
    // SING is kept as the trained motion entry. Same precedent as BITTER/SOUR under Taste.
    words: ['MATH', 'SCIENCE', 'HISTORY', 'COMPUTER'],
  },
  // 32. Food — UNLOCKED (this session): all 7 words researched against
  // lifeprint.com (ASLU), cross-checked against a second source per word
  // (three for RICE, since ASLU itself flags that one as not fully
  // standardized). FISH is a DUPLICATE of the existing
  // medium_animals_FISH entry (same physical sign) — no new research
  // needed. CHICKEN removed from words[]/SIGNS (2026-09-03 classifier
  // conflict audit): physically identical to medium_animals_BIRD (same
  // thumb-and-index "beak" motion) and can't be told apart by the
  // landmark classifier — BIRD is kept as the trained motion entry for
  // this gesture. Same precedent as BITTER/SOUR under Taste. See
  // "MEDIUM · FOOD" SIGNS block at the end of the file.
  {
    id: 'food', level: 'medium', title: 'Food', order: 1, comingSoon: false, unit: 32,
    words: ['RICE', 'BREAD', 'EGG', 'FISH', 'MEAT', 'SOUP'],
  },
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
    id: 'fruits', level: 'medium', title: 'Fruits', order: 1, comingSoon: false, unit: 33,
    words: ['APPLE', 'BANANA', 'ORANGE', 'GRAPES', 'WATERMELON', 'PINEAPPLE', 'STRAWBERRY', 'PEAR', 'MELON'],
  },
  // 34. Vegetables
  // CUCUMBER dropped from words[] — lifeprint.com has no written/textual
  // description (video-only entry) and cross-check sources disagree or are
  // low-confidence; ASLU lists fingerspelling as a recognized variation, so
  // treated the same as SINK/STOVE/OVEN/TOY/BAG elsewhere in this file.
  {
    id: 'vegetables', level: 'medium', title: 'Vegetables', order: 1, comingSoon: false, unit: 34,
    // PUMPKIN removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): PUMPKIN and MELON (under Fruits) are the identical sign —
    // MELON is kept as the trained motion entry.
    words: ['CARROT', 'POTATO', 'TOMATO', 'ONION', 'GARLIC', 'CORN', 'PEA', 'BEAN', 'CABBAGE', 'LETTUCE', 'BROCCOLI'],
  },
  // 35. Snacks
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. COOKIE and
  // CANDY reuse the existing medium_food_COOKIE/CANDY entries (same
  // physical signs). See "MEDIUM · SNACKS" SIGNS block at the end of the file.
  {
    id: 'snacks', level: 'medium', title: 'Snacks', order: 1, comingSoon: false, unit: 35,
    words: ['COOKIE', 'CAKE', 'CANDY', 'CHOCOLATE', 'DONUT', 'PIE', 'POPCORN', 'CHIPS', 'CUPCAKE', 'ICECREAM'],
  },
  // 36. Drinks — unlocked (2026-09-01): all 6 words researched fresh against
  // lifeprint.com and cross-checked against Handspeak/aslbloom/PocketSign/
  // ASL Interactive. See "MEDIUM · DRINKS" SIGNS block at the end of the file.
  {
    id: 'drinks', level: 'medium', title: 'Drinks', order: 1, comingSoon: false, unit: 36,
    words: ['WATER', 'MILK', 'JUICE', 'SODA', 'TEA', 'COFFEE'],
  },
  // 37. Animals
  // FISH/RABBIT/DUCK/GOAT researched against lifeprint.com, cross-checked
  // against a second source per word. CHICKEN removed from words[]/SIGNS
  // (2026-09-03 classifier conflict audit): physically identical to BIRD
  // (lifeprint: "the sign BIRD can in context be used to mean chicken")
  // and can't be told apart by the landmark classifier — BIRD is kept as
  // the trained motion entry. Same precedent as BITTER/SOUR under Taste.
  {
    id: 'animals', level: 'medium', title: 'Animals', order: 1, comingSoon: false, unit: 37,
    words: ['DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'DUCK', 'COW', 'PIG', 'HORSE', 'GOAT', 'SHEEP'],
  },
  // 38. Wild Animals
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. ZEBRA has no
  // single dedicated ASLU sign — written as the documented HORSE + STRIPES
  // compound. See "MEDIUM · WILD ANIMALS" SIGNS block at the end of the file.
  {
    id: 'wild_animals', level: 'medium', title: 'Wild Animals', order: 1, comingSoon: false, unit: 38,
    words: ['LION', 'TIGER', 'ELEPHANT', 'MONKEY', 'GIRAFFE', 'BEAR', 'ZEBRA', 'SNAKE', 'FROG', 'TURTLE'],
  },
  // 39. Insects
  {
    id: 'insects', level: 'medium', title: 'Insects', order: 1, comingSoon: false, unit: 39,
    words: ['ANT', 'BUTTERFLY', 'BEE', 'SPIDER'],
  },
  // 40. Clothes
  // SHORTS/DRESS/SKIRT/HAT/JACKET/BELT researched against lifeprint.com,
  // cross-checked against a second source per word. CAP removed from
  // words[]/SIGNS (2026-09-03 classifier conflict audit): physically
  // identical to HAT (same handshape + same double-pat motion) and can't
  // be told apart by the landmark classifier — same precedent as
  // BITTER/SOUR under Taste. If a distinct CAP sign is sourced later, add
  // it back with its own SIGNS entry.
  {
    id: 'clothes', level: 'medium', title: 'Clothes', order: 1, comingSoon: false, unit: 40,
    words: ['SHIRT', 'PANTS', 'SHORTS', 'DRESS', 'SKIRT', 'SHOES', 'SOCKS', 'HAT', 'JACKET', 'COAT', 'BELT'],
  },
  // 41. Dressing — unlocked (2026-09-01): WEAR/CHANGE/FOLD are new content,
  // researched fresh against lifeprint.com and cross-checked against
  // Handspeak/PocketSign/SigningTime. WASH/CLEAN/DIRTY duplicate the entries
  // already live under 'health'/'appearance' (same physical sign, matching
  // the BOY/GIRL precedent under 'personal_information'). See the
  // "MEDIUM · DRESSING" SIGNS block at the end of the file — including a
  // flagged note on the existing WASH entry that I did NOT change.
  {
    id: 'dressing', level: 'medium', title: 'Dressing', order: 1, comingSoon: false, unit: 41,
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
    id: 'personal_items', level: 'medium', title: 'Personal Items', order: 1, comingSoon: false, unit: 42,
    words: ['WALLET', 'PHONE', 'WATCH', 'GLASSES', 'KEY', 'UMBRELLA', 'BOTTLE'],
  },
  // 43. Nature — UNLOCKED (this session): 17 of the 19 words researched
  // against lifeprint.com (ASLU), cross-checked against a second source
  // (mainly Handspeak, plus ASLbloom/babysignlanguage where useful) per word.
  // TREE, FLOWER, GRASS, and LEAF are DUPLICATES of the existing
  // medium_plants_TREE/FLOWER/GRASS/LEAF entries (same physical signs). STAR
  // is a DUPLICATE of medium_shapes_STAR.
  // SKY and LAKE removed from words[] — no lifeprint.com (ASLU) page exists
  // for either sign (Handspeak and other sites have entries, but per this
  // file's existing convention — see MARKET/MAY/SEED/ROOT elsewhere — a word
  // without a citable ASLU page is dropped from the preview list rather than
  // sourced from a single secondary dictionary). If an ASLU page turns up
  // later, add them back with a SIGNS entry. See "MEDIUM · NATURE" SIGNS
  // block at the end of the file.
  {
    id: 'nature', level: 'medium', title: 'Nature', order: 1, comingSoon: false, unit: 43,
    words: ['SUN', 'MOON', 'STAR', 'CLOUD', 'RAIN', 'WIND', 'TREE', 'FLOWER', 'GRASS', 'LEAF', 'ROCK', 'SAND', 'MOUNTAIN', 'RIVER', 'OCEAN', 'BEACH', 'ISLAND'],
  },
  // 44. Plants — UNLOCKED (this session): 10 of the 12 words researched
  // against lifeprint.com (ASLU), cross-checked against a second source
  // per word. WATER and GARDEN are DUPLICATES of the existing
  // medium_drinks_WATER and medium_home_GARDEN entries (same physical
  // signs) — no new research needed for those two.
  // SEED and ROOT removed from words[] — ASLU's own "seed" page states
  // the noun is generally fingerspelled S-E-E-D (the sign with rubbed
  // fingers is specifically the verb "planting seeds," not the noun),
  // and ASLU's "root" page has no description at all. Per this file's
  // existing convention for words without a citable dedicated sign (see
  // MANGO/PAPAYA/CUCUMBER/BAG elsewhere), left to the Fingerspell
  // feature instead of inventing one. See "MEDIUM · PLANTS" SIGNS block
  // at the end of the file.
  {
    id: 'plants', level: 'medium', title: 'Plants', order: 1, comingSoon: false, unit: 44,
    words: ['PLANT', 'TREE', 'FLOWER', 'GRASS', 'LEAF', 'BRANCH', 'GARDEN', 'GROW', 'WATER', 'SOIL'],
  },
  // 45. Weather
  // UNLOCKED (2026-09-02): all 12 words researched against lifeprint.com
  // (ASLU), cross-checked against a second source per word. HOT/COLD reuse
  // the existing medium_temperature_HOT/COLD entries. WARM/COOL are also
  // listed in 'temperature' (Touch, Unit 17) words[] but that category has
  // no SIGNS entries for either word yet — flagged separately, not fixed
  // here since 'temperature' wasn't in scope this pass; WARM/COOL below
  // are written fresh under 'weather' so this category stands on its own.
  // See "MEDIUM · WEATHER" SIGNS block at the end of the file.
  {
    id: 'weather', level: 'medium', title: 'Weather', order: 1, comingSoon: false, unit: 45,
    // CLOUDY and WINDY removed from words[] (2026-09-04 classifier
    // conflict audit) — identical signs to CLOUD/WIND under Nature; see
    // "MEDIUM · WEATHER" SIGNS block comment.
    // RAINY removed (same audit): identical hand shape/repeated-drop motion
    // to RAIN under Nature — RAIN is kept as the trained motion entry.
    // STORMY removed (same audit, resolving the FLAG left on its entry):
    // same open-hand side-to-side sway as WIND, differing only in
    // amplitude/facial expression — WIND is kept. Same precedent as
    // BITTER/SOUR under Taste.
    words: ['SUNNY', 'HOT', 'COLD', 'WARM', 'COOL', 'THUNDER', 'LIGHTNING', 'SNOW'],
  },
  // 46. Seasons
  {
    id: 'seasons', level: 'medium', title: 'Seasons', order: 1, comingSoon: false, unit: 46,
    // WINTER removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): WINTER and COLD (under Weather) are the identical
    // shivering sign — COLD is kept as the trained motion entry.
    words: ['SPRING', 'SUMMER', 'FALL'],
  },
  // 47. Places
  // LEGACY id/content kept — this is real, TRAINED detection content for
  // HOME/SCHOOL/STORE/CHURCH (WORK/CAR/IN/OUT/WITH also trained but not on the
  // new plan's Places word list). words[] below is the new plan's fuller
  // Places list for the lesson-content preview; the trained SIGNS set is
  // unchanged.
  {
    id: 'places', level: 'medium', title: 'Places', order: 1, comingSoon: false, unit: 47,
    words: ['HOME', 'SCHOOL', 'PARK', 'STORE', 'MARKET', 'LIBRARY', 'HOSPITAL', 'RESTAURANT', 'ZOO', 'FARM', 'BEACH', 'CHURCH', 'BANK', 'AIRPORT'],
  },
  // 48. Vehicles — UNLOCKED (this session): all 11 words researched
  // against lifeprint.com (ASLU), cross-checked against Handspeak /
  // ASLbloom / Signing Savvy. See SIGNS entries for per-word notes
  // (BUS/TRUCK/VAN/TAXI are lexicalized fingerspelling).
  {
    id: 'vehicles', level: 'medium', title: 'Vehicles', order: 1, comingSoon: false, unit: 48,
    // SHIP removed from words[] (2026-09-04 classifier conflict audit)
    // — identical sign to BOAT; see "MEDIUM · VEHICLES" SIGNS block.
    words: ['CAR', 'BUS', 'TRUCK', 'VAN', 'TAXI', 'TRAIN', 'BIKE', 'MOTORCYCLE', 'AIRPLANE', 'BOAT'],
  },
  // 49. Transportation — unlocked (2026-09-01): DRIVE and FLY are new
  // content, researched fresh against lifeprint.com and cross-checked
  // against Handspeak. WALK, RIDE, GO, STOP, WAIT duplicate the entries
  // already live under 'actions' (same physical signs, same precedent as
  // WASH/CLEAN/DIRTY under 'dressing'). See "MEDIUM · TRANSPORTATION"
  // SIGNS block at the end of the file.
  {
    id: 'transportation', level: 'medium', title: 'Transportation', order: 1, comingSoon: false, unit: 49,
    words: ['WALK', 'RIDE', 'DRIVE', 'FLY', 'GO', 'STOP', 'WAIT'],
  },
  // 50. Professions — UNLOCKED (this session): 18 of the 20 words researched
  // against lifeprint.com (ASLU), cross-checked against a second source
  // (mainly Handspeak, plus ASLbloom/aslinteractive/Quizlet flashcards where
  // useful) per word. TEACHER is a DUPLICATE of medium_people_TEACHER,
  // POLICE is a DUPLICATE of medium_community_POLICE, and COOK is a
  // DUPLICATE of medium_actions_COOK (same physical signs). CHEF has no
  // distinct ASLU sign of its own — Signing Savvy lists CHEF as a synonym of
  // the same sign used for COOK, so it reuses that sign rather than
  // inventing a separate one.
  // CHEF removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit): CHEF and COOK are the identical sign (see note above) — COOK
  // is kept as the trained motion entry, same precedent as BITTER/SOUR
  // under Taste.
  // ENGINEER and CASHIER removed from words[] — no lifeprint.com (ASLU) page
  // exists for either sign (Handspeak has entries, but per this file's
  // existing convention — see MARKET/MAY/SEED/ROOT elsewhere — a word
  // without a citable ASLU page is dropped from the preview list rather than
  // sourced from a single secondary dictionary). If an ASLU page turns up
  // later, add them back with a SIGNS entry. See "MEDIUM · PROFESSIONS"
  // SIGNS block at the end of the file.
  {
    id: 'professions', level: 'medium', title: 'Professions', order: 1, comingSoon: false, unit: 50,
    words: ['TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'FARMER', 'DRIVER', 'COOK', 'DENTIST', 'MECHANIC', 'CARPENTER', 'LAWYER', 'SOLDIER', 'WAITER', 'ARTIST', 'WORKER', 'OWNER'],
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
    id: 'community', level: 'medium', title: 'Community', order: 1, comingSoon: false, unit: 51,
    words: ['SCHOOL', 'HOSPITAL', 'POLICE', 'FIRE', 'LIBRARY', 'BANK', 'STORE', 'RESTAURANT', 'PARK'],
  },
  // 52. Time
  // LEGACY id/content kept — this is real, TRAINED detection content
  // (DAY/NIGHT/WEEK/MONTH/YEAR/WILL/BEFORE/NOW/TODAY/FINISH). words[] below is
  // the new plan's Time list for the lesson-content preview (adds
  // LATER/SOON/AFTER/EARLY/LATE/TOMORROW/YESTERDAY, none of which are trained
  // yet); the trained SIGNS set is unchanged.
  {
    id: 'time', level: 'medium', title: 'Time', order: 1, comingSoon: false, unit: 52,
    // TODAY removed from words[] (2026-09-04 classifier conflict audit)
    // — identical sign to NOW; see "MEDIUM · TIME" SIGNS block comment.
    words: ['TIME', 'NOW', 'LATER', 'SOON', 'BEFORE', 'AFTER', 'EARLY', 'LATE', 'TOMORROW', 'YESTERDAY'],
  },
  // 53. Daytime
  {
    id: 'daytime', level: 'medium', title: 'Daytime', order: 1, comingSoon: false, unit: 53,
    // EVENING removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): EVENING and NIGHT are the identical sign — NIGHT is kept.
    words: ['MORNING', 'AFTERNOON', 'NIGHT'],
  },
  // 54. Days
  {
    id: 'days', level: 'medium', title: 'Days', order: 1, comingSoon: false, unit: 54,
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
    id: 'months', level: 'medium', title: 'Months', order: 1, comingSoon: false, unit: 55,
    words: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  },
  // 56. Sequence
  // UNLOCKED (2026-09-02): all 10 words researched against lifeprint.com
  // (ASLU), cross-checked against Handspeak. FINISHED reuses the existing
  // medium_turn_taking_FINISHED entry (same physical sign).
  {
    id: 'sequence', level: 'medium', title: 'Sequence', order: 1, comingSoon: false, unit: 56,
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
    id: 'frequency', level: 'medium', title: 'Frequency', order: 1, comingSoon: false, unit: 57,
    words: ['ALWAYS', 'OFTEN', 'SOMETIMES', 'RARELY', 'NEVER', 'DAILY', 'WEEKLY', 'MONTHLY'],
  },
  // 58. Location — UNLOCKED (this session): IN, OUT, INSIDE, OUTSIDE, and
  // FRONT researched fresh against lifeprint.com (ASLU), cross-checked
  // against a second source per word. BACK and BEHIND are DUPLICATES of
  // the existing medium_body_BACK / medium_directions_BACK entry (same
  // physical sign — its own tips already describe it as meaning
  // "behind you"). ON, UNDER, ABOVE, BELOW, BESIDE, BETWEEN, and NEXT
  // (spatial "next to") were REMOVED from words[] — ASLU's own
  // preposition-drop article and Handspeak's locatives article both
  // confirm ASL shows these spatial relationships via classifier
  // placement that changes with the objects involved, not one fixed,
  // citable sign. ASLU explicitly recommends against a general-purpose
  // "ON" sign too ("ask yourself if there's a more appropriate way").
  // Per this file's existing convention for words without a citable
  // dedicated sign (see SEED/ROOT under Plants, MARKET under Community,
  // MAY under Manners), these are left to the Fingerspell feature
  // instead of inventing fixed signs for context-dependent classifiers.
  // See "MEDIUM · LOCATION" SIGNS block at the end of the file.
  {
    id: 'location', level: 'medium', title: 'Location', order: 1, comingSoon: false, unit: 58,
    // BEHIND removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): BACK and BEHIND are the identical sign — BACK is kept as
    // the trained motion entry.
    words: ['IN', 'OUT', 'INSIDE', 'OUTSIDE', 'FRONT', 'BACK'],
  },
  // 59. Distance
  {
    id: 'distance', level: 'medium', title: 'Distance', order: 1, comingSoon: false, unit: 59,
    // CLOSE removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): NEAR and CLOSE (in the "nearby" sense) are the identical
    // F-handshape sign — NEAR is kept as the trained motion entry.
    words: ['NEAR', 'FAR', 'HERE', 'THERE', 'AWAY'],
  },
  // 60. Directions — UNLOCKED (this session): 5 new words researched
  // against lifeprint.com (ASLU); BACK/TURN/GO/STOP/WAIT reuse existing
  // entries. FORWARD flagged as lower-confidence (no dedicated ASLU page).
  {
    id: 'directions', level: 'medium', title: 'Directions', order: 1, comingSoon: false, unit: 60,
    words: ['LEFT', 'RIGHT', 'UP', 'DOWN', 'FORWARD', 'BACK', 'TURN', 'GO', 'STOP', 'WAIT'],
  },
  // 61. Social — UNLOCKED (this session): 5 new words researched
  // against lifeprint.com (ASLU); FRIEND/PLAY/TALK/SHARE/HELP/LIKE/LOVE
  // reuse existing entries. CLASSMATE and NEIGHBOR are compound signs,
  // flagged as lower-confidence — see SIGNS entries.
  {
    id: 'social', level: 'medium', title: 'Social', order: 1, comingSoon: false, unit: 61,
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
    id: 'manners', level: 'medium', title: 'Manners', order: 1, comingSoon: false, unit: 62,
    words: ['PLEASE', 'THANKS', 'WELCOME', 'SORRY', 'EXCUSE', 'HELP'],
  },
  // 63. Turn-Taking
  // UNLOCKED (2026-09-02): MY/YOUR/WAIT/GO/STOP reuse existing
  // medium_people_*/medium_actions_* entries (same physical signs).
  // TURN/AGAIN/FINISHED are new content, researched fresh against
  // lifeprint.com (ASLU) and cross-checked against Handspeak/Brainscape
  // ASLU-sourced flashcard sets.
  {
    id: 'turn_taking', level: 'medium', title: 'Turn-Taking', order: 1, comingSoon: false, unit: 63,
    words: ['MY', 'YOUR', 'TURN', 'WAIT', 'GO', 'STOP', 'AGAIN', 'FINISHED'],
  },
  // 64. Responses
  // UNLOCKED (2026-09-02): YES/NO/OKAY/GOOD reuse existing
  // medium_essentials_basic_responses_*/medium_feelings_GOOD entries.
  // SURE is new content but ASLU documents it as the SAME sign as TRUE
  // (index finger from the lips moving forward). REALLY removed from
  // words[]/SIGNS (2026-09-03 classifier conflict audit): ASLU treats
  // SURE/TRUE/REALLY as one sign with several English translations, and
  // the landmark classifier can't tell REALLY apart from SURE — SURE is
  // kept as the trained motion entry. Same precedent as BITTER/SOUR
  // under Taste. MAYBE/UNDERSTAND are new content, researched fresh
  // against lifeprint.com and cross-checked against Handspeak/StudoCu
  // ASLU-sourced notes.
  {
    id: 'responses', level: 'medium', title: 'Responses', order: 1, comingSoon: false, unit: 64,
    words: ['YES', 'NO', 'OKAY', 'SURE', 'MAYBE', 'GOOD', 'UNDERSTAND'],
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
    id: 'essentials_basic_responses', level: 'medium', title: 'Questions', order: 1, comingSoon: false, unit: 65,
    words: ['WHO', 'WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW', 'WHICH', 'WHOSE', 'MANY', 'MUCH'],
  },
  // 66. Conversation
  // UNLOCKED (2026-09-02): 8 of 10 words are DUPLICATES of existing entries
  // (HELLO/GOODBYE from essentials_greetings, GOOD/FINE from feelings,
  // NAME from personal_information, MEET from social, THANKS/WELCOME from
  // requests/essentials_greetings — same physical signs, see each entry's
  // note). LATER is new content, researched fresh against lifeprint.com
  // (ASLU), cross-checked against Handspeak/aslbloom. NICE removed from
  // words[]/SIGNS (2026-09-03 classifier conflict audit): all sources
  // agree NICE and CLEAN are the identical sign (distinguished only by a
  // single vs. double stroke, which the landmark classifier can't
  // reliably tell apart) — CLEAN is kept as the trained motion entry.
  // Same precedent as BITTER/SOUR under Taste.
  {
    id: 'conversation', level: 'medium', title: 'Conversation', order: 1, comingSoon: false, unit: 66,
    words: ['HELLO', 'GOOD', 'FINE', 'NAME', 'MEET', 'THANKS', 'WELCOME', 'LATER', 'GOODBYE'],
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
    id: 'making_requests', level: 'medium', title: 'Requests', order: 1, comingSoon: false, unit: 67,
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
    id: 'answers', level: 'medium', title: 'Answers', order: 1, comingSoon: false, unit: 68,
    words: ['YES', 'NO', 'OKAY', 'SURE', 'MAYBE', 'KNOW', 'DON\'T', 'UNDERSTAND', 'GOOD'],
  },

  // ── 'health' (words: WASH/HURT/BRUSH TEETH), 'money' (words:
  // DOLLARS/CENTS/COST), 'sequence_demo' (Basic Phrases, unit 70), and
  // the entire level=intermediate Phrasebook block (18 categories, unit
  // 71) were REMOVED — none map to a topic in the 68-topic lesson
  // compilation this file is now scoped to. Their SIGNS content (WASH,
  // HURT, BRUSH_TEETH, DOLLARS, CENTS, COST, etc.) was removed with
  // them; BATHROOM, already relocated to 'requests' earlier in this
  // file, is unaffected and stays live under Needs (unit 8).
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
    // REUSED — same physical sign as medium_personal_information_FAMILY (category: 'personal_information'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_family_FAMILY', level: 'medium', category: 'family', signId: 'FAMILY', title: 'Family', order: 13,
    description: 'Form both hands into an "F" handshape and trace a circle together out to the sides and back, as if representing a family gathered together.',
    tips: [
      'Both hands use the "F" handshape (index and thumb touching)',
      'Hands separate outward then arc back together',
      'Same base movement as the initialized sign for CLASS, just with an "F" instead of a "C"',
    ],
    imageUrl: '../assets/images/medium/family/family.png', videoUrl: '../assets/videos/medium/family/family.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/family.htm',
  },

  {
    // REUSED — same physical sign as medium_people_CHILD (category: 'people'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_family_CHILD', level: 'medium', category: 'family', signId: 'CHILD', title: 'Child', order: 14,
    description: 'Hold your flat dominant hand palm-down at about waist/hip height, then pat downward once or twice, as if patting the head of a small child.',
    tips: [
      'Palm faces down the whole time',
      'Height stays low, around hip level',
      'A light patting motion, not a big wave',
    ],
    imageUrl: '../assets/images/medium/family/child.png', videoUrl: '../assets/videos/medium/family/child.mp4', detectionType: 'motion',
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
    // REUSED — same physical sign as medium_people_TEACHER (category: 'people'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_TEACHER', level: 'medium', category: 'school', signId: 'TEACHER', title: 'Teacher', order: 2,
    description: 'Sign TEACH — both open "flat-O" hands near the forehead, moving forward and out twice, as if handing knowledge outward — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'TEACH motion happens near the forehead/temple',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Together they form "teach" + "person" = teacher',
    ],
    imageUrl: '../assets/images/medium/school/teacher.png', videoUrl: '../assets/videos/medium/school/teacher.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_people_STUDENT (category: 'people'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_STUDENT', level: 'medium', category: 'school', signId: 'STUDENT', title: 'Student', order: 3,
    description: 'Sign LEARN — fingertips of a "flat-O" hand pick up information from your non-dominant palm and touch it to your forehead — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'LEARN motion goes from the open palm up to the forehead',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Together they form "learn" + "person" = student',
    ],
    imageUrl: '../assets/images/medium/school/student.png', videoUrl: '../assets/videos/medium/school/student.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_people_FRIEND (category: 'people'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_FRIEND', level: 'medium', category: 'school', signId: 'FRIEND', title: 'Friend', order: 4,
    description: 'Hook your index fingers together, then reverse and hook them together the other way — like two links of a chain interlocking.',
    tips: [
      'Both hands use a hooked index-finger ("X") handshape',
      'Hook, then flip and hook again the opposite way',
      'Keep the motion small and centered in front of you',
    ],
    imageUrl: '../assets/images/medium/school/friend.png', videoUrl: '../assets/videos/medium/school/friend.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_social_CLASSMATE (category: 'social'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_CLASSMATE', level: 'medium', category: 'school', signId: 'CLASSMATE', title: 'Classmate', order: 5,
    description: 'Sign CLASS (both hands in a ‘C’ handshape, circling around each other in front of you), then add the flat-hand PERSON sign to mean "a person in that class."',
    tips: [
      'This is a compound: CLASS + PERSON/AGENT, not a single dictionary sign',
      'Same agent-marker pattern ASLU uses for LIBRARY+AGENT = "librarian"',
      'Compound, lower-confidence entry — no dedicated ASLU page; double-check locally',
    ],
    imageUrl: '../assets/images/medium/school/classmate.png', videoUrl: '../assets/videos/medium/school/classmate.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_personal_information_BOY (category: 'personal_information'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_BOY', level: 'medium', category: 'school', signId: 'BOY', title: 'Boy', order: 6,
    description: 'Hold a flat hand near your forehead, then close your fingers toward your thumb in a small grasping motion, as if tipping an imaginary cap.',
    tips: [
      'Starting position is near the forehead',
      'The closing/grasping motion is what makes this a sign and not just a point',
      'Same sign already used for BOY under Family',
    ],
    imageUrl: '../assets/images/medium/school/boy.png', videoUrl: '../assets/videos/medium/school/boy.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_personal_information_GIRL (category: 'personal_information'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_GIRL', level: 'medium', category: 'school', signId: 'GIRL', title: 'Girl', order: 7,
    description: 'Make an "A" handshape (thumb resting beside a fist) and brush your thumb down along your jaw/cheek.',
    tips: [
      'Thumb traces a short downward line near the jawline',
      'Rest of the hand stays a loose fist',
      'Same sign already used for GIRL under Family',
    ],
    imageUrl: '../assets/images/medium/school/girl.png', videoUrl: '../assets/videos/medium/school/girl.mp4', detectionType: 'motion',
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
    // Compound sign — reuses COLOR + a modified ART/DRAW motion. COLOR now
    // has its own SIGNS entry (medium_classroom_actions_COLOR, added
    // 2026-09-03) — this flag is resolved.
    description: 'Sign COLOR first, then modify the sign for ART/DRAW: rub your pinkie finger side-to-side against your non-dominant palm, as if coloring with a small crayon tip.',
    tips: [
      'Start clearly with the COLOR handshape',
      'Switch to a small pinkie-only rubbing motion',
      'Keep the second part small and controlled',
    ],
    imageUrl: '../assets/images/medium/school_supplies/CRAYON.png', videoUrl: '../assets/videos/medium/school_supplies/CRAYON.mp4', detectionType: 'motion',
  },
  {
    // REUSED — same physical sign as medium_household_BOOK (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_school_supplies_BOOK', level: 'medium', category: 'school_supplies', signId: 'BOOK', title: 'Book', order: 7,
    description: 'Hold both flat hands together, palms touching like a closed book, then open them upward and outward like pages opening.',
    tips: [
      'Hands start pressed together, fingertips up',
      'A single open motion, like a book being opened',
      'One of the most iconic, easy-to-recognize signs in ASL',
    ],
    imageUrl: '../assets/images/medium/school_supplies/book.png', videoUrl: '../assets/videos/medium/school_supplies/book.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/book.htm',
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
    // REUSED — same physical sign as medium_furniture_CHAIR (category: 'furniture'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_CHAIR', level: 'medium', category: 'classroom', signId: 'CHAIR', title: 'Chair', order: 2,
    description: 'Like the sign for SIT, but tap your bent two-finger ‘H’ handshape down on your other hand’s fingers twice instead of once.',
    tips: [
      'Same handshape as SIT — bent index and middle fingers',
      'Two taps make it the noun CHAIR; one tap means the verb SIT',
      'Base hand stays flat and still underneath',
    ],
    imageUrl: '../assets/images/medium/classroom/chair.png', videoUrl: '../assets/videos/medium/classroom/chair.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/chair.htm',
  },

  {
    // REUSED — same physical sign as medium_furniture_TABLE (category: 'furniture'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_TABLE', level: 'medium', category: 'classroom', signId: 'TABLE', title: 'Table', order: 3,
    description: 'Hold both forearms horizontal in front of you, one on top of the other, then lower your dominant arm to rest flat on top of the other — showing a flat tabletop.',
    tips: [
      'Both arms/hands stay flat and horizontal',
      'One clean downward landing motion',
      'Also means DESK — a ‘D’ handshape version exists but isn’t required',
    ],
    imageUrl: '../assets/images/medium/classroom/table.png', videoUrl: '../assets/videos/medium/classroom/table.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/table.htm',
  },

  {
    // REUSED — same physical sign as medium_household_DOOR (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_DOOR', level: 'medium', category: 'classroom', signId: 'DOOR', title: 'Door', order: 4,
    description: 'Hold your dominant flat hand up, fingers pointing up, then pivot it open and closed at the wrist, like swinging a door on a hinge at your pinkie side.',
    tips: [
      'The "hinge" is at the pinkie edge of your hand',
      'One clear open-then-close pivot',
      'Same sign also covers CABINET and CLOSET, depending on context',
    ],
    imageUrl: '../assets/images/medium/classroom/door.png', videoUrl: '../assets/videos/medium/classroom/door.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
  },

  {
    // REUSED — same physical sign as medium_household_WINDOW (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_WINDOW', level: 'medium', category: 'classroom', signId: 'WINDOW', title: 'Window', order: 5,
    description: 'Hold your non-dominant flat hand up as the window frame. Slide your dominant flat hand upward along it, then back down, like opening and closing a window.',
    tips: [
      'Non-dominant hand stays still, like the window frame',
      'Up-then-down motion — up opens it, down closes it',
      'A single quick down motion alone can mean "close the window"',
    ],
    imageUrl: '../assets/images/medium/classroom/window.png', videoUrl: '../assets/videos/medium/classroom/window.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/window.htm',
  },

  {
    // REUSED — same physical sign as medium_household_CLOCK (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_CLOCK', level: 'medium', category: 'classroom', signId: 'CLOCK', title: 'Clock', order: 6,
    description: 'Sign TIME first — tap your wrist with your index finger — then curve your other hand into a ‘C’ shape to show the round size of the clock’s face.',
    tips: [
      'Two parts: the wrist tap, then the C-shaped size classifier',
      'A smaller, rounder ‘C’ typically shows a desk clock',
      'The classifier can change size/shape depending on the type of clock',
    ],
    imageUrl: '../assets/images/medium/classroom/clock.png', videoUrl: '../assets/videos/medium/classroom/clock.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/clock.htm',
  },

  {
    // REUSED — same physical sign as medium_household_COMPUTER (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_COMPUTER', level: 'medium', category: 'classroom', signId: 'COMPUTER', title: 'Computer', order: 7,
    description: 'Hold your non-dominant arm out, palm down. Form a ‘C’ handshape with your dominant hand and tap it against your forearm twice, moving from your elbow toward your wrist.',
    tips: [
      'Handshape is a ‘C’ — an initialized sign for the letter',
      'Two distinct taps, not a smooth slide',
      'Regional variation exists — some sign it by tapping a ‘C’ on the forehead instead',
    ],
    imageUrl: '../assets/images/medium/classroom/computer.png', videoUrl: '../assets/videos/medium/classroom/computer.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/computer.htm',
  },

  {
    // REUSED — same physical sign as medium_furniture_SHELF (category: 'furniture'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_classroom_SHELF', level: 'medium', category: 'classroom', signId: 'SHELF', title: 'Shelf', order: 8,
    description: 'Hold both flat hands together in front of you, palms down, fingertips touching, then smoothly pull them apart to trace a flat horizontal line at chest height.',
    tips: [
      'Hands start together, fingertips touching',
      'Pull apart in one smooth, level motion',
      'Done lower and it reads as FLOOR instead',
    ],
    imageUrl: '../assets/images/medium/classroom/shelf.png', videoUrl: '../assets/videos/medium/classroom/shelf.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/shelf.htm',
  },

  /* ── MEDIUM · CLASSROOM ACTIONS (Unit 30) ──────────────────────────
   * UNLOCKED (2026-09-03) — comingSoon was already false on this
   * category but it had ZERO SIGNS entries, which is why it was
   * showing as "coming soon" in the app regardless of the flag.
   * READ/WRITE/DRAW/LISTEN/LOOK/SIT/STAND/ASK/ANSWER/SHARE/HELP are
   * DUPLICATES of existing entries elsewhere in this file (same
   * physical sign, same precedent as BOY/GIRL under
   * 'personal_information') — not re-researched. OPEN is likewise a
   * duplicate of medium_descriptions_OPEN (the general "open," not a
   * door-specific version).
   *
   * CLOSE — words[] originally requested "CLOSE" as an action verb,
   * but the file's only existing CLOSE entry (medium_distance_CLOSE)
   * means "near," a different ASL sign entirely. The correct
   * shut-something sign already exists under signId 'CLOSED'
   * (medium_descriptions_CLOSED), so this category's entry was
   * originally added as a relabeled duplicate under signId 'CLOSE'.
   * REMOVED (2026-09-03 classifier conflict audit): that duplicate put
   * two different signIds on the exact same shutting-motion, which the
   * landmark classifier can't tell apart — CLOSED is the trained
   * motion entry going forward; see medium_descriptions_CLOSED. Same
   * precedent as BITTER/SOUR under Taste.
   *
   * COLOR — no SIGNS entry existed anywhere in the file (school_supplies'
   * CRAYON entry explicitly flagged this gap already). ASLU only
   * documents COLOR as a noun (chin-area finger flutter); per ASLU's
   * own FAQ, the verb sense ("color a picture") is done by following
   * it with a WRITE-style scribbling motion — same compound-sign
   * precedent as OWNER (OWN + PERSON) elsewhere in this file, not an
   * invented sign. Researched on lifeprint.com, cross-checked against
   * a second source for the base noun handshape/location.
   *
   * RAISE and LOWER — REMOVED from words[]. Neither has a dedicated
   * ASLU/Handspeak/StartASL/SignASL entry for the classroom sense
   * ("raise/lower your hand") — it's taught as a literal mimetic
   * gesture (physically raising your hand), not a distinct lexical
   * sign, same category of exclusion as MANGO/PAPAYA/COCONUT/AVOCADO
   * under Fruits. Flagging rather than inventing one.
   */
  {
    // DUPLICATE — same sign as medium_actions_READ.
    id: 'medium_classroom_actions_READ', level: 'medium', category: 'classroom_actions', signId: 'READ', title: 'Read', order: 1,
    description: 'Hold your non-dominant hand flat, palm up, like an open book. Move the first two fingers of your dominant hand (a \u2018V\u2019 handshape) down across the palm, as if scanning lines of text.',
    tips: [
      'Dominant hand uses a \u2018V\u2019 shape, like two eyes',
      'Motion moves downward across the base palm',
      'Base hand stays flat and steady',
    ],
    imageUrl: '../assets/images/medium/actions/read.png', videoUrl: '../assets/videos/medium/actions/read.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_WRITE.
    id: 'medium_classroom_actions_WRITE', level: 'medium', category: 'classroom_actions', signId: 'WRITE', title: 'Write', order: 2,
    description: 'Pinch your thumb and index finger together as if holding a pen, and move your hand across your flat non-dominant palm, as if writing on paper.',
    tips: [
      'Dominant hand pinches like holding a small pen',
      'Base hand stays flat, palm up, like a sheet of paper',
      'A side-to-side scribbling motion works well',
    ],
    imageUrl: '../assets/images/medium/actions/write.png', videoUrl: '../assets/videos/medium/actions/write.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_DRAW.
    id: 'medium_classroom_actions_DRAW', level: 'medium', category: 'classroom_actions', signId: 'DRAW', title: 'Draw', order: 3,
    description: 'Extend your pinky finger and trace a wavy, wiggly line across your flat non-dominant palm, as if sketching a picture.',
    tips: [
      'Only the pinky finger extends on the dominant hand',
      'The path is wavy/zig-zag, not straight',
      'Base hand stays flat and steady',
    ],
    imageUrl: '../assets/images/medium/actions/draw.png', videoUrl: '../assets/videos/medium/actions/draw.mp4', detectionType: 'motion',
  },
  {
    // NEW — no SIGNS entry existed for COLOR anywhere in the file. ASLU
    // documents only the noun form (finger flutter near the chin); per
    // ASLU's own FAQ page, the verb/action sense is formed by adding a
    // WRITE-style scribbling motion, same compound-sign precedent as
    // OWNER (OWN + PERSON) elsewhere in this file.
    id: 'medium_classroom_actions_COLOR', level: 'medium', category: 'classroom_actions', signId: 'COLOR', title: 'Color', order: 4,
    description: 'Hold your dominant hand up near your chin with fingers spread and slightly curled, then wiggle your fingertips a couple of times. For the action of coloring a picture, follow it with a small side-to-side scribbling motion of your pinkie against your non-dominant palm, like filling in a coloring book.',
    tips: [
      'The chin-area finger flutter is the same base handshape used for individual colors like RED or BLUE',
      'ASLU only documents this as a noun — the scribbling second part is what turns it into "coloring," not a single standalone verb sign',
      'A bigger, more energetic flutter can suggest bright or many colors',
    ],
    imageUrl: '../assets/images/medium/classroom_actions/color.png', videoUrl: '../assets/videos/medium/classroom_actions/color.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/color.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_LISTEN.
    id: 'medium_classroom_actions_LISTEN', level: 'medium', category: 'classroom_actions', signId: 'LISTEN', title: 'Listen', order: 5,
    description: 'Cup your dominant hand and place it just behind your ear, as if trying to hear something better.',
    tips: [
      'Hand forms a loose cupped shape',
      'Rests gently near, not on, the ear',
      'A slight lean toward the sound can help reinforce it',
    ],
    imageUrl: '../assets/images/medium/actions/listen.png', videoUrl: '../assets/videos/medium/actions/listen.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_LOOK.
    id: 'medium_classroom_actions_LOOK', level: 'medium', category: 'classroom_actions', signId: 'LOOK', title: 'Look', order: 6,
    description: 'Point the first two fingers of your dominant hand (a \u2018V\u2019 handshape) away from your eyes, aiming them in the direction you\u2019re looking.',
    tips: [
      'Fingers start near your own eyes',
      'The \u2018V\u2019 shape represents your two eyes looking',
      'Direction can change to show where you\u2019re looking',
    ],
    imageUrl: '../assets/images/medium/actions/look.png', videoUrl: '../assets/videos/medium/actions/look.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_actions_SIT.
    id: 'medium_classroom_actions_SIT', level: 'medium', category: 'classroom_actions', signId: 'SIT', title: 'Sit', order: 7,
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
    // DUPLICATE — same sign as medium_actions_STAND.
    id: 'medium_classroom_actions_STAND', level: 'medium', category: 'classroom_actions', signId: 'STAND', title: 'Stand', order: 8,
    description: 'Hold your non-dominant hand flat, palm up. Stand the first two fingers of your dominant hand (like two legs, pointing down) upright on your palm.',
    tips: [
      'Dominant hand points its fingers downward, like legs',
      'Base hand stays flat, palm up, the whole time',
      'The \u2018legs\u2019 rest in place — no walking motion',
    ],
    imageUrl: '../assets/images/medium/actions/stand.png', videoUrl: '../assets/videos/medium/actions/stand.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_communication_ASK.
    id: 'medium_classroom_actions_ASK', level: 'medium', category: 'classroom_actions', signId: 'ASK', title: 'Ask', order: 9,
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
    // DUPLICATE — same sign as medium_communication_ANSWER.
    id: 'medium_classroom_actions_ANSWER', level: 'medium', category: 'classroom_actions', signId: 'ANSWER', title: 'Answer', order: 10,
    description: 'Hold both index fingers up near your mouth, then flip them forward and downward, as if words are flowing out toward the other person.',
    tips: [
      'Both index fingers start near your mouth/chin',
      'Motion flips forward and down, away from you',
      'One smooth flipping motion is enough',
    ],
    imageUrl: '../assets/images/medium/communication/answer.png', videoUrl: '../assets/videos/medium/communication/answer.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_descriptions_OPEN (general "open," not the door-specific version).
    id: 'medium_classroom_actions_OPEN', level: 'medium', category: 'classroom_actions', signId: 'OPEN', title: 'Open', order: 11,
    description: 'Start with both flat hands together in front of you, palms facing out, then swing them apart and back toward yourself, like pushing open a pair of double doors.',
    tips: [
      'Hands start touching, side by side',
      'Both hands swing outward together — this is the general "open," not the door-specific version',
      'The opposite motion, hands swinging together, signs CLOSE',
    ],
    imageUrl: '../assets/images/medium/descriptions/open.png', videoUrl: '../assets/videos/medium/descriptions/open.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/door.htm',
  },
  {
    // DUPLICATE — same sign as medium_communication_SHARE.
    id: 'medium_classroom_actions_SHARE', level: 'medium', category: 'classroom_actions', signId: 'SHARE', title: 'Share', order: 13,
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
    // DUPLICATE — same sign as medium_requests_HELP.
    id: 'medium_classroom_actions_HELP', level: 'medium', category: 'classroom_actions', signId: 'HELP', title: 'Help', order: 14,
    description: 'Rest your dominant fist (thumb up) on the palm of your other flat hand, then lift both hands upward together.',
    tips: [
      'Base hand stays flat, dominant hand is a thumbs-up fist',
      'Both hands lift together',
      'One smooth upward motion',
    ],
    imageUrl: '../assets/images/medium/requests/help.png', videoUrl: '../assets/videos/medium/requests/help.mp4', detectionType: 'motion',
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
    id: 'medium_subjects_HISTORY', level: 'medium', category: 'subjects', signId: 'HISTORY', title: 'History', order: 4,
    description: 'Form an "H" handshape with your dominant hand, fingers pointing forward and palm facing sideways. Move the hand downward twice, with a slightly bent wrist, near the side of your body.',
    tips: [
      'Keep a crisp "H" handshape (index + middle finger together)',
      'Two downward movements, not a circle',
      'Slightly bend the wrist on each downward motion',
    ],
    imageUrl: '../assets/images/medium/subjects/HISTORY.png', videoUrl: '../assets/videos/medium/subjects/HISTORY.mp4', detectionType: 'motion',
  },
  {
    // REUSED — same physical sign as medium_household_COMPUTER (category: 'household'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_subjects_COMPUTER', level: 'medium', category: 'subjects', signId: 'COMPUTER', title: 'Computer', order: 5,
    description: 'Hold your non-dominant arm out, palm down. Form a ‘C’ handshape with your dominant hand and tap it against your forearm twice, moving from your elbow toward your wrist.',
    tips: [
      'Handshape is a ‘C’ — an initialized sign for the letter',
      'Two distinct taps, not a smooth slide',
      'Regional variation exists — some sign it by tapping a ‘C’ on the forehead instead',
    ],
    imageUrl: '../assets/images/medium/subjects/computer.png', videoUrl: '../assets/videos/medium/subjects/computer.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/computer.htm',
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
    // REUSED — same physical sign as medium_community_PARK (category: 'community'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_PARK', level: 'medium', category: 'places', signId: 'PARK', title: 'Park', order: 6,
    description: 'Fingerspell P-A-R-K, spelling at a natural conversational speed.',
    tips: [
      'No single gestural sign is ASLU-documented for this sense of "park"',
      'Keep letters distinct — this one isn’t blended as fast as BANK or BUS',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/places/park.png', videoUrl: '../assets/videos/medium/places/park.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/park.htm',
  },

  {
    // REUSED — same physical sign as medium_community_LIBRARY (category: 'community'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_LIBRARY', level: 'medium', category: 'places', signId: 'LIBRARY', title: 'Library', order: 7,
    description: 'Form an ‘L’ handshape and circle it in the air in front of you.',
    tips: [
      'Handshape stays an ‘L’ throughout the circle',
      'Right-handed signers typically circle clockwise from their own view',
      'LIBRARY + the flat-hand PERSON sign means "librarian"',
    ],
    imageUrl: '../assets/images/medium/places/library.png', videoUrl: '../assets/videos/medium/places/library.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/library.htm',
  },

  {
    // REUSED — same physical sign as medium_community_HOSPITAL (category: 'community'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_HOSPITAL', level: 'medium', category: 'places', signId: 'HOSPITAL', title: 'Hospital', order: 8,
    description: 'Use an ‘H’ handshape to draw a small cross shape on your upper arm or shoulder.',
    tips: [
      'Handshape is ‘H’ (index and middle finger extended together)',
      'The motion traces a cross — down, then across',
      'Also see PATIENT (medical version) for a related sign',
    ],
    imageUrl: '../assets/images/medium/places/hospital.png', videoUrl: '../assets/videos/medium/places/hospital.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/hospital.htm',
  },

  {
    // REUSED — same physical sign as medium_community_RESTAURANT (category: 'community'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_RESTAURANT', level: 'medium', category: 'places', signId: 'RESTAURANT', title: 'Restaurant', order: 9,
    description: 'Touch an ‘R’ handshape to one corner of your chin, then to the other corner.',
    tips: [
      'Handshape is ‘R’ (crossed index and middle fingers) throughout',
      'Two clear touches — corner to corner',
      'A related but different sign covers "cafeteria / cafe"',
    ],
    imageUrl: '../assets/images/medium/places/restaurant.png', videoUrl: '../assets/videos/medium/places/restaurant.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/restaurant.htm',
  },

  {
    // REUSED — same physical sign as medium_nature_BEACH (category: 'nature'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_BEACH', level: 'medium', category: 'places', signId: 'BEACH', title: 'Beach', order: 10,
    description: 'Rest your dominant flat hand on top of your non-dominant flat hand, both palms down, then slide the top hand outward while wiggling your fingers, like water washing up over sand.',
    tips: [
      'Fingers wiggle as the top hand slides outward',
      'Many signers just fingerspell BEACH in everyday conversation',
      'The sliding motion can be repeated to show waves washing in and out',
    ],
    imageUrl: '../assets/images/medium/places/beach.png', videoUrl: '../assets/videos/medium/places/beach.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/beach.htm',
  },

  {
    // REUSED — same physical sign as medium_community_BANK (category: 'community'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_places_BANK', level: 'medium', category: 'places', signId: 'BANK', title: 'Bank', order: 11,
    description: 'Fingerspell B-N-K quickly, blending the letters together rather than forming each one crisply.',
    tips: [
      'This is lexicalized fingerspelling, not a single gesture',
      'Letters blend together — don’t pause between them',
      'Fingerspelling — flag for review before wiring to the motion classifier',
    ],
    imageUrl: '../assets/images/medium/places/bank.png', videoUrl: '../assets/videos/medium/places/bank.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bank.htm',
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
      'One short downward drop',
      'This same sign also covers TODAY — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/time/now.png', videoUrl: '../assets/videos/medium/time/now.mp4', detectionType: 'motion',
  },
  {
    // TODAY removed from words[]/SIGNS (2026-09-04 classifier conflict
    // audit): TODAY and NOW are the identical drop motion, differing
    // only by repetition (a repeated bounce vs. a single drop) — the
    // landmark classifier can't reliably count reps, so NOW is kept as
    // the trained motion entry. Same precedent as BITTER/SOUR under
    // Taste.
    // REUSED — same physical sign as medium_conversation_LATER (category: 'conversation'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_time_LATER', level: 'medium', category: 'time', signId: 'LATER', title: 'Later', order: 9.5,
    description: 'Hold your non-dominant hand flat and upright, palm facing you, and touch the tip of your dominant hand’s thumb (in an "L" handshape) to its palm, then rotate your dominant hand forward once.',
    tips: [
      'Dominant hand uses an "L" handshape — the thumb tip is the point of contact',
      'One forward rotation means "later"; a repeated rotation shifts it toward "possible/someday"',
      'A different, one-handed sign near the cheek is used for the casual "see you later"',
    ],
    imageUrl: '../assets/images/medium/time/later.png', videoUrl: '../assets/videos/medium/time/later.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/later.htm',
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
      'This same sign also covers WINTER — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/temperature/cold.png', videoUrl: '../assets/videos/medium/temperature/cold.mp4', detectionType: 'motion',
  },
  {
    // REUSED — same physical sign as medium_weather_WARM (category: 'weather'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_temperature_WARM', level: 'medium', category: 'temperature', signId: 'WARM', title: 'Warm', order: 3,
    description: 'Start with a ‘modified O’ hand (the same handshape as FOOD) near your mouth, then move it upward and outward, like warm breath rising on a cold day.',
    tips: [
      'Handshape starts the same as FOOD, not a flat or open hand',
      'The motion rises upward and away from the mouth',
      'A slower, gentler motion than HOT',
    ],
    imageUrl: '../assets/images/medium/temperature/warm.png', videoUrl: '../assets/videos/medium/temperature/warm.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/warm.htm',
  },

  {
    // REUSED — same physical sign as medium_weather_COOL (category: 'weather'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_temperature_COOL', level: 'medium', category: 'temperature', signId: 'COOL', title: 'Cool', order: 4,
    description: 'Hold both open hands near your face and wave them back toward you a couple of times, like fanning yourself.',
    tips: [
      'Both hands move together, like two small fans',
      'Motion is toward your own face, not pushing outward',
      'A relaxed, pleasant expression fits the meaning — unlike the sharp pull-away of HOT',
    ],
    imageUrl: '../assets/images/medium/temperature/cool.png', videoUrl: '../assets/videos/medium/temperature/cool.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cool.htm',
  },

  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for SOFT
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against ASL Bloom. Note for a future Track A pass: lifeprint says
    // doing this same sign with a negative/"ew" facial expression can mean
    // "wet"/"damp" instead — see the WET entry's comment below. Facial
    // expression isn't something a landmark-based hand classifier reads,
    // so this pair may be worth a real Track A look once both are live.
    id: 'medium_temperature_SOFT', level: 'medium', category: 'temperature', signId: 'SOFT', title: 'Soft', order: 5,
    description: 'Hold both hands out with loose, palm-up claw shapes, then close them into flattened \u2018O\u2019 hands, as if gently compressing something soft like cotton. Repeat the motion.',
    tips: [
      'Start with loose, open claw hands, not a fist',
      'Fingers close inward into a flattened \u2018O\u2019 shape',
      'A neutral or pleasant expression fits \u2014 a negative one can shift the meaning toward \u201cwet/damp\u201d',
    ],
    imageUrl: '../assets/images/medium/temperature/soft.png', videoUrl: '../assets/videos/medium/temperature/soft.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/soft.htm',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for HARD
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against ASL Bloom.
    id: 'medium_temperature_HARD', level: 'medium', category: 'temperature', signId: 'HARD', title: 'Hard', order: 6,
    description: 'Hold both hands in bent-\u2018V\u2019 shapes, then strike the knuckles of your dominant hand down against the knuckles of your stationary non-dominant hand.',
    tips: [
      'Both hands use a bent, knuckle-forward \u2018V\u2019 shape',
      'Non-dominant hand stays still \u2014 only the dominant hand strikes down',
      'A bigger, sharper strike can emphasize \u201creally hard\u201d',
    ],
    imageUrl: '../assets/images/medium/temperature/hard.png', videoUrl: '../assets/videos/medium/temperature/hard.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/hard.htm',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for ROUGH
    // anywhere in the file. Researched on Handspeak (ASLU's page for this
    // word is video-only, no text description to cite), cross-checked
    // against ASL Bloom's matching description.
    id: 'medium_temperature_ROUGH', level: 'medium', category: 'temperature', signId: 'ROUGH', title: 'Rough', order: 7,
    description: 'Hold your non-dominant hand flat, palm up. Brush the fingertips of your dominant clawed \u20185\u2019 hand backward across the palm, twice.',
    tips: [
      'Dominant hand uses a loose, clawed \u20185\u2019 shape, not a flat hand',
      'The brushing motion moves backward across the palm',
      'Two brushes, not one',
    ],
    imageUrl: '../assets/images/medium/temperature/rough.png', videoUrl: '../assets/videos/medium/temperature/rough.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/1851/',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for SMOOTH
    // anywhere in the file. Researched on Handspeak, cross-checked against
    // ASL Bloom's matching description.
    id: 'medium_temperature_SMOOTH', level: 'medium', category: 'temperature', signId: 'SMOOTH', title: 'Smooth', order: 8,
    description: 'Hold both hands out with thumb and middle finger touching (an \u2018&\u2019/flattened pinch shape), a small gap between the hands, then glide them together sideways in one smooth motion.',
    tips: [
      'Thumb and middle finger stay pinched together on both hands',
      'One continuous, even glide \u2014 no stopping partway',
      'The smoothness of the motion itself carries the meaning',
    ],
    imageUrl: '../assets/images/medium/temperature/smooth.png', videoUrl: '../assets/videos/medium/temperature/smooth.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.handspeak.com/word/2001/',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for WET
    // anywhere in the file. Researched on ASL Bloom. Flag for a future
    // Track A pass: lifeprint documents this concept as achievable by
    // signing SOFT with a negative/"ew" facial expression rather than as
    // a fully distinct handshape — ASL Bloom's description below (push
    // down, fingers/thumb together pointing up) reads as a different,
    // more distinct variant, but a second independent text source
    // wasn't found to confirm ASL Bloom's version specifically. Treat
    // this description as lower-confidence until cross-checked.
    id: 'medium_temperature_WET', level: 'medium', category: 'temperature', signId: 'WET', title: 'Wet', order: 9,
    description: 'Hold both open hands at chest height, palms up, then push them downward while bringing your fingers and thumb together on each hand, pointing upward.',
    tips: [
      'Both hands move together, palms starting up',
      'Fingers and thumb close together as the hands push down',
      'Lower-confidence entry \u2014 double-check against a video source before treating this as final',
    ],
    imageUrl: '../assets/images/medium/temperature/wet.png', videoUrl: '../assets/videos/medium/temperature/wet.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.aslbloom.com/signs/wet',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for DRY
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against Handspeak and Signing Time.
    id: 'medium_temperature_DRY', level: 'medium', category: 'temperature', signId: 'DRY', title: 'Dry', order: 10,
    description: 'Change your dominant hand from an index-finger \u20181\u2019 shape into a bent \u2018X\u2019 handshape as you pull it from left to right in front of your chin, without touching it.',
    tips: [
      'Handshape changes from \u20181\u2019 to bent \u2018X\u2019 partway through the motion',
      'Path moves left to right in front of the chin/mouth',
      'Don\u2019t confuse with UGLY, which sits a bit higher (near the nose) and uses a negative expression',
    ],
    imageUrl: '../assets/images/medium/temperature/dry.png', videoUrl: '../assets/videos/medium/temperature/dry.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dry.htm',
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

  /* ── MEDIUM · PEOPLE (Unit 5) ─────────────────────────────────
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
  {
    // REUSED — same physical sign as medium_personal_information_BOY (category: 'personal_information'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_people_BOY', level: 'medium', category: 'people', signId: 'BOY', title: 'Boy', order: 12,
    description: 'Hold a flat hand near your forehead, then close your fingers toward your thumb in a small grasping motion, as if tipping an imaginary cap.',
    tips: [
      'Starting position is near the forehead',
      'The closing/grasping motion is what makes this a sign and not just a point',
      'Same sign already used for BOY under Family',
    ],
    imageUrl: '../assets/images/medium/people/boy.png', videoUrl: '../assets/videos/medium/people/boy.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_personal_information_GIRL (category: 'personal_information'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_people_GIRL', level: 'medium', category: 'people', signId: 'GIRL', title: 'Girl', order: 13,
    description: 'Make an "A" handshape (thumb resting beside a fist) and brush your thumb down along your jaw/cheek.',
    tips: [
      'Thumb traces a short downward line near the jawline',
      'Rest of the hand stays a loose fist',
      'Same sign already used for GIRL under Family',
    ],
    imageUrl: '../assets/images/medium/people/girl.png', videoUrl: '../assets/videos/medium/people/girl.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_family_BABY (category: 'family'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_people_BABY', level: 'medium', category: 'people', signId: 'BABY', title: 'Baby', order: 14,
    description: 'Cross both forearms in front of your chest, palms up, and rock them gently side to side like cradling an infant.',
    tips: [
      'Both arms cradle in front of the chest, not just one hand moving',
      'The rocking motion is what makes this a MOTION sign',
      'Keep the rock small and centered on the chest',
    ],
    imageUrl: '../assets/images/medium/people/baby.png', videoUrl: '../assets/videos/medium/people/baby.mp4', detectionType: 'motion',
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
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for HUNGRY
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against Signing Savvy. Note: lifeprint documents this as the same
    // physical sign as WISH (distinguished only by starting a bit higher
    // or lower on the chest, which lifeprint itself calls "not a
    // legitimate distinction") — not a live Track A conflict since WISH
    // has no entry anywhere in this file.
    id: 'medium_feelings_HUNGRY', level: 'medium', category: 'feelings', signId: 'HUNGRY', title: 'Hungry', order: 13,
    description: 'Move your dominant hand down the middle of your chest, from collarbone to stomach.',
    tips: [
      'One smooth downward motion along the center of the chest',
      'Touching the chest isn\u2019t required, but most signers do',
      'A bigger, stronger movement can emphasize being very hungry',
    ],
    imageUrl: '../assets/images/medium/feelings/hungry.png', videoUrl: '../assets/videos/medium/feelings/hungry.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/h/hungry.htm',
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
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for THANKS
    // anywhere in the file. Researched on lifeprint.com (THANK YOU page),
    // cross-checked against Signing Savvy's THANK/THANK YOU/THANKS entries.
    // Note for a future Track A pass: ASLU notes this looks similar to GOOD
    // (differentiated by angle/directness) — not a live conflict since GOOD
    // has no motion SIGNS entry yet.
    id: 'medium_essentials_polite_expressions_THANKS', level: 'medium', category: 'essentials_polite_expressions', signId: 'THANKS', title: 'Thanks', order: 3,
    description: 'Hold your flat dominant hand with fingertips near your lips or chin, then move your hand forward and slightly down toward the person you\u2019re thanking.',
    tips: [
      'Fingertips start near the lips/chin, not the whole hand',
      'Motion moves forward and down, toward the other person',
      'A small smile helps signal you mean it',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/thanks.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/thanks.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/thankyou.htm',
  },
  {
    // REUSED — same physical sign as medium_essentials_greetings_WELCOME (category: 'essentials_greetings'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_essentials_polite_expressions_WELCOME', level: 'medium', category: 'essentials_polite_expressions', signId: 'WELCOME', title: 'Welcome', order: 5,
    description: 'Hold your flat dominant hand out to the side, palm up, then bring it in toward your torso in one smooth arc, as if welcoming someone into a space.',
    tips: [
      'This same sign also means HIRE and INVITE — context makes the meaning clear',
      'Best used for "welcome, come on in" — not as a reply to "thank you" (use FINE or a thumbs-up for that instead)',
      'One smooth inward arc, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/welcome.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/welcome.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_responses_YES (category: 'responses'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_essentials_polite_expressions_YES', level: 'medium', category: 'essentials_polite_expressions', signId: 'YES', title: 'Yes', order: 6,
    description: 'Make an ‘S’ handshape (a closed fist) and nod it up and down at the wrist, like a small head nod.',
    tips: [
      'Handshape is a simple closed fist',
      'The whole fist bobs up and down from the wrist',
      'Same sign already used for YES under Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/yes.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/yes.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_responses_NO (category: 'responses'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_essentials_polite_expressions_NO', level: 'medium', category: 'essentials_polite_expressions', signId: 'NO', title: 'No', order: 7,
    description: 'Bring your thumb, index, and middle fingers together in front of you, opening and closing them once like a small beak.',
    tips: [
      'Thumb + index + middle finger, the rest stay closed',
      'One quick open-close snap, like a beak',
      'Same sign already used for NO under Questions',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/no.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/no.mp4', detectionType: 'motion',
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
  {
    // REUSED — same physical sign as medium_actions_SLEEP (category: 'actions'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_requests_SLEEP', level: 'medium', category: 'requests', signId: 'SLEEP', title: 'Sleep', order: 21,
    description: 'Hold your spread-out hand in front of your face, then draw it down and close it near your chin, closing your eyes as your hand moves down.',
    tips: [
      'Fingers start spread, then close together',
      'Close your eyes as the hand comes down',
      'One smooth downward motion',
    ],
    imageUrl: '../assets/images/medium/requests/sleep.png', videoUrl: '../assets/videos/medium/requests/sleep.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_places_HOME (category: 'places'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_requests_HOME', level: 'medium', category: 'requests', signId: 'HOME', title: 'Home', order: 22,
    description: 'Bring your fingertips and thumb together into a flattened ‘O’ shape. Touch them to the corner of your mouth, then move your hand back to touch your cheek near your ear.',
    tips: [
      'Two touches: mouth corner, then cheek/ear',
      'Keep the hand shape compact the whole time',
      'Motion sign — the two-part movement matters',
    ],
    imageUrl: '../assets/images/medium/requests/home.png', videoUrl: '../assets/videos/medium/requests/home.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_places_SCHOOL (category: 'places'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_requests_SCHOOL', level: 'medium', category: 'requests', signId: 'SCHOOL', title: 'School', order: 23,
    description: 'Hold both hands flat, palms open and facing up. Clap the fingertips of your top hand down into the palm of your bottom hand twice.',
    tips: [
      'Both hands are flat, fingers together',
      'Top hand does the clapping motion',
      'Two claps, like getting a class\'s attention',
    ],
    imageUrl: '../assets/images/medium/requests/school.png', videoUrl: '../assets/videos/medium/requests/school.mp4', detectionType: 'motion',
  },

  {
    // REUSED — same physical sign as medium_social_LIKE (category: 'social'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_requests_LIKE', level: 'medium', category: 'requests', signId: 'LIKE', title: 'Like', order: 24,
    description: 'Place your thumb and middle finger against your chest as if pinching your shirt, then pull your hand outward while opening your fingers.',
    tips: [
      'Starts pinched against the chest',
      'Pull outward while the fingers open',
      'Same sign already used for LIKE under Feelings',
    ],
    imageUrl: '../assets/images/medium/requests/like.png', videoUrl: '../assets/videos/medium/requests/like.mp4', detectionType: 'motion',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for WANT
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against Signing Savvy.
    id: 'medium_requests_WANT', level: 'medium', category: 'requests', signId: 'WANT', title: 'Want', order: 25,
    description: 'Hold both hands in open \u20185\u2019 shapes, palms up, out in front of you, then pull them back toward your body while curling the fingers into loose claw shapes.',
    tips: [
      'Starts with flat, open \u20185\u2019 hands, palms facing up',
      'Pull inward while the fingers curl into claws',
      'Reversing the palm orientation changes this to DON\u2019T-WANT',
    ],
    imageUrl: '../assets/images/medium/requests/want.png', videoUrl: '../assets/videos/medium/requests/want.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/want.htm',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for LESS
    // anywhere in the file. Researched on lifeprint.com (LESS/THAN page),
    // cross-checked against Signing Savvy.
    id: 'medium_requests_LESS', level: 'medium', category: 'requests', signId: 'LESS', title: 'Less', order: 26,
    description: 'Hold your non-dominant hand still (flat or slightly bent), and move your dominant hand downward toward it, without the two hands touching.',
    tips: [
      'Non-dominant hand stays completely still',
      'Dominant hand does a single downward motion toward it',
      'Dominant hand can be bent or flat \u2014 the downward motion carries the meaning',
    ],
    imageUrl: '../assets/images/medium/requests/less.png', videoUrl: '../assets/videos/medium/requests/less.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/than.htm',
  },
  {
    // NEW (2026-09-04 Track B research) — no SIGNS entry existed for NEED
    // anywhere in the file. Researched on lifeprint.com, cross-checked
    // against Signing Savvy.
    id: 'medium_requests_NEED', level: 'medium', category: 'requests', signId: 'NEED', title: 'Need', order: 27,
    description: 'Form an \u2018X\u2019 handshape with your dominant hand, held out in front of you and slightly to the side, then bend it downward at the wrist.',
    tips: [
      'Start and stay in the \u2018X\u2019 handshape \u2014 don\u2019t change shape mid-sign',
      'The bend happens at the wrist, not the whole arm',
      'Don\u2019t confuse with ASK, which starts as a straight index finger and changes into \u2018X\u2019 while moving toward a person',
    ],
    imageUrl: '../assets/images/medium/requests/need.png', videoUrl: '../assets/videos/medium/requests/need.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/need.htm',
  },

  /* ── MEDIUM · ACTIONS (Unit 8) ──────────────────────────────────
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
      'This same sign also covers SEE — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/actions/look.png', videoUrl: '../assets/videos/medium/actions/look.mp4', detectionType: 'motion',
  },
  {
    // SEE removed from words[]/SIGNS (2026-09-04 classifier conflict
    // audit): SEE and LOOK are the same 'V'-handshape sign near the
    // eyes, distinguished only by a quick/brief vs. directional motion
    // — the landmark classifier can't reliably tell them apart. LOOK is
    // kept as the trained motion entry. Same precedent as BITTER/SOUR
    // under Taste.
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

  /* ── MEDIUM · HAND ACTIONS (Unit 9) ────────────────────────────
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
    // PUSH removed from words[]/SIGNS (2026-09-04 classifier conflict
    // audit): PUSH and FORWARD (under Directions) are both a flat
    // hand/hands, palm(s) facing away, moving forward — distinguished
    // only by "firm/deliberate" vs. "smooth" motion quality, which the
    // landmark classifier can't reliably detect. FORWARD is kept as the
    // trained motion entry. Same precedent as BITTER/SOUR under Taste.
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

  /* ── MEDIUM · COMMUNICATION (Unit 10) ───────────────────────────
   * REV 8 (2026-08-25): new block, ASLU-checked (lifeprint.com) content
   * added this session. 'HELP' is intentionally NOT here — it's already
   * live under 'requests' (Needs, Unit 7) and that category's words[]
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
      'This same sign also covers HI — context and tone carry the difference',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/hello.png', videoUrl: '../assets/videos/medium/essentials_greetings/hello.mp4', detectionType: 'motion',
  },
  // AUDIT FIX (2026-09-01): the entries below were missing even though
  // this category has been comingSoon:false — words[] promised
  // MORNING/AFTERNOON/NIGHT/GOODBYE/WELCOME but only HELLO had a SIGNS
  // entry. Researched fresh against lifeprint.com (ASLU), cross-checked
  // against Handspeak/aslbloom. MORNING/AFTERNOON/NIGHT are DUPLICATES
  // of the existing medium_daytime_* entries (same physical signs; asset
  // paths point at the original daytime files per this file's existing
  // duplicate-entry convention — see dressing/WASH). HI removed
  // (2026-09-03 classifier conflict audit, see CATEGORIES comment above).
  {
    // DUPLICATE — same sign as medium_daytime_MORNING.
    id: 'medium_essentials_greetings_MORNING', level: 'medium', category: 'essentials_greetings', signId: 'MORNING', title: 'Morning', order: 2,
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
    id: 'medium_essentials_greetings_AFTERNOON', level: 'medium', category: 'essentials_greetings', signId: 'AFTERNOON', title: 'Afternoon', order: 3,
    description: 'Rest your dominant hand, flat and palm down, near the elbow of your bent non-dominant arm, angled slightly up and forward, roughly like it\u2019s pointing to \u20182 o\u2019clock\u2019.',
    tips: [
      'Dominant hand stays flat and rests near the crook of the other elbow',
      'Angle points slightly upward and forward, not straight out',
      'Same sign already used for AFTERNOON under Daytime',
    ],
    imageUrl: '../assets/images/medium/daytime/afternoon.png', videoUrl: '../assets/videos/medium/daytime/afternoon.mp4', detectionType: 'motion',
  },
  {
    // DUPLICATE — same sign as medium_daytime_NIGHT. EVENING removed
    // (2026-09-03 classifier conflict audit, see CATEGORIES comment
    // above) — this NIGHT entry now also covers EVENING.
    id: 'medium_essentials_greetings_NIGHT', level: 'medium', category: 'essentials_greetings', signId: 'NIGHT', title: 'Night', order: 4,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down, like the sun dropping below the horizon.',
    tips: [
      'Non-dominant arm represents the horizon, same idea as MORNING',
      'Dominant hand droops down over it instead of rising, like a sunset',
      'This same sign also covers EVENING — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/daytime/night.png', videoUrl: '../assets/videos/medium/daytime/night.mp4', detectionType: 'motion',
  },
  {
    // NEW — no prior entry for GOODBYE. ASLU: "wave hello with a side to
    // side movement; wave goodbye with a bending of the large knuckles or
    // at the wrist" — a deliberately different wave from HELLO. BYE
    // removed (2026-09-03 classifier conflict audit, see CATEGORIES
    // comment above) — this entry now also covers BYE.
    id: 'medium_essentials_greetings_GOODBYE', level: 'medium', category: 'essentials_greetings', signId: 'GOODBYE', title: 'Goodbye', order: 5,
    description: 'Hold your dominant hand up, palm facing outward, and bend your fingers down and back up at the large knuckles (or bend at the wrist instead) — like a child\u2019s wave.',
    tips: [
      'The bend happens at the big knuckles or the wrist — not a side-to-side wave like HELLO',
      'Palm faces the person you\u2019re leaving',
      'This same sign also covers BYE — context and tone carry the difference',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/goodbye.png', videoUrl: '../assets/videos/medium/essentials_greetings/goodbye.mp4', detectionType: 'motion',
  },
  {
    // NEW — no prior entry for WELCOME. ASLU labels this sign
    // WELCOME/HIRE/INVITE — same physical sign, meaning depends on
    // context. ASLU explicitly recommends AGAINST using it as a reply to
    // "thank you" (that\u2019s a separate convention — see FINE/NO PROBLEM);
    // this entry covers the "welcome, come on in" greeting sense only.
    id: 'medium_essentials_greetings_WELCOME', level: 'medium', category: 'essentials_greetings', signId: 'WELCOME', title: 'Welcome', order: 6,
    description: 'Hold your flat dominant hand out to the side, palm up, then bring it in toward your torso in one smooth arc, as if welcoming someone into a space.',
    tips: [
      'This same sign also means HIRE and INVITE — context makes the meaning clear',
      'Best used for "welcome, come on in" — not as a reply to "thank you" (use FINE or a thumbs-up for that instead)',
      'One smooth inward arc, not a repeated motion',
    ],
    imageUrl: '../assets/images/medium/essentials_greetings/welcome.png', videoUrl: '../assets/videos/medium/essentials_greetings/welcome.mp4', detectionType: 'motion',
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

  // ── MEDIUM · SHAPES ── (new this pass — unlocks Unit 14)
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

  // ── MEDIUM · BODY ── (new this pass — unlocks Unit 11)
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

  // ── MEDIUM · SIZE ── (new this pass — unlocks Unit 15. BIG/TALL
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

  // ── MEDIUM · TASTE ── (new this pass — unlocks Unit 18)
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
    id: 'medium_taste_SPICY', level: 'medium', category: 'taste', signId: 'SPICY', title: 'Spicy', order: 4,
    description: 'Hold both hands loosely open near chest height and shake them quickly, as if your fingers just touched something hot.',
    tips: [
      'Fingers loose and slightly spread',
      'Quick shaking motion, both hands',
      'An open-mouth facial expression often goes with it',
    ],
    imageUrl: '../assets/images/medium/taste/spicy.png', videoUrl: '../assets/videos/medium/taste/spicy.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_DELICIOUS', level: 'medium', category: 'taste', signId: 'DELICIOUS', title: 'Delicious', order: 5,
    description: 'Touch your fingertips to your lips and pull them away with a smile, like a small kiss of approval.',
    tips: [
      'Fingertips bunch together and touch the lips',
      'Pull away smoothly, not too fast',
      'A pleased facial expression reinforces the meaning',
    ],
    imageUrl: '../assets/images/medium/taste/delicious.png', videoUrl: '../assets/videos/medium/taste/delicious.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_taste_FRESH', level: 'medium', category: 'taste', signId: 'FRESH', title: 'Fresh', order: 6,
    description: 'Sweep your flat dominant hand upward across your chin and cheek in one smooth motion.',
    tips: [
      'Hand stays flat, fingers together',
      'One upward sweeping motion',
      'Similar movement family to NEW',
    ],
    imageUrl: '../assets/images/medium/taste/fresh.png', videoUrl: '../assets/videos/medium/taste/fresh.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · PERSONAL_INFORMATION (Unit 12) ── (new this pass —
  // unlocks Unit 12. NAME/AGE/FAMILY/BIRTHDAY/LIVE/FROM are new
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
    // AGE removed from words[]/SIGNS (2026-09-04 classifier conflict
    // audit): AGE and OLD (under Appearance) are the same C-to-S
    // handshape at the chin, differing only by repetition count (twice
    // vs. once) — the landmark classifier can't reliably count reps, so
    // OLD is kept as the trained motion entry. Same precedent as
    // BITTER/SOUR under Taste. Flagged as lower-confidence than the
    // other pairs in this pass — AGE is arguably just as foundational a
    // word as OLD, so revisit if that turns out to matter.
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

  // ── MEDIUM · APPEARANCE (Unit 16) ── (new this pass — unlocks Unit
  // 17. CLEAN duplicates the existing medium_actions_CLEAN entry — see
  // block comment on Personal Information above for why. NEAT removed:
  // ASLU/PocketSign/Handspeak all describe it, in the tidy/orderly
  // sense used here, as the SAME physical sign as CLEAN/NICE —
  // distinguished only by facial expression, which this project's
  // landmark-based classifier doesn't read.
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
    id: 'medium_appearance_MESSY', level: 'medium', category: 'appearance', signId: 'MESSY', title: 'Messy', order: 7,
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
    id: 'medium_appearance_OLD', level: 'medium', category: 'appearance', signId: 'OLD', title: 'Old', order: 8,
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
    id: 'medium_appearance_NEW', level: 'medium', category: 'appearance', signId: 'NEW', title: 'New', order: 9,
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
    id: 'medium_appearance_BROKEN', level: 'medium', category: 'appearance', signId: 'BROKEN', title: 'Broken', order: 10,
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
    id: 'medium_appearance_DARK', level: 'medium', category: 'appearance', signId: 'DARK', title: 'Dark', order: 11,
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
    id: 'medium_appearance_BRIGHT', level: 'medium', category: 'appearance', signId: 'BRIGHT', title: 'Bright', order: 12,
    description: 'Hold your dominant fingers and thumb pinched together near your face, then spring them open into a spread hand as you move it outward and slightly down, like light bursting out.',
    tips: [
      'Starts pinched closed, ends open and spread',
      'Same sign as LIGHT (illuminated) and CLEAR/OBVIOUS — context and expression set "bright" apart',
      'A bigger, faster opening motion shows more intensity',
    ],
    imageUrl: '../assets/images/medium/appearance/bright.png', videoUrl: '../assets/videos/medium/appearance/bright.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/clear.htm',
  },

  // ── MEDIUM · SOUND (Unit 19) ── (new this pass — unlocks Unit 19.
  // QUIET and SILENT are, per ASLU's own dictionary (which lists them
  // together as "QUIET/SILENT"), the SAME physical sign — the "shhh"
  // gesture followed by both hands crossing and pulling apart/down.
  // Same landmark-classifier caveat that led to removing NEAT from
  // Appearance — see chat writeup. RESOLVED (2026-09-03 classifier
  // conflict audit): SILENT's SIGNS entry removed; QUIET is the
  // trained motion entry for this gesture.
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
      'This same sign also covers SILENT — context carries the difference',
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
      'This same sign also covers CHICKEN — context tells them apart',
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

  // ── MEDIUM · HOME (Unit 22) ── (new this pass — unlocks Unit 22.
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

  // ── MEDIUM · FURNITURE (Unit 23) ── (new this pass — unlocks Unit 23.
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

  // ── MEDIUM · BATHROOM (Unit 25) ── (UNLOCKED 2026-09-01 — researched
  // against lifeprint.com, cross-checked against Handspeak/PocketSign/
  // StrongASL/SigningSavvy. TOOTHBRUSH is a duplicate of
  // medium_health_BRUSH_TEETH (SigningSavvy: the noun shares the verb's
  // sign). SINK dropped from words[] — no dedicated ASLU sign, Dr. Bill
  // recommends fingerspelling S-I-N-K. TOILET removed — physically
  // identical to medium_home_BATHROOM (same "T"-handshake sign) and
  // can't be told apart by the landmark classifier.)
  {
    id: 'medium_bathroom_SHOWER', level: 'medium', category: 'bathroom', signId: 'SHOWER', title: 'Shower', order: 1,
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
    id: 'medium_bathroom_BATHTUB', level: 'medium', category: 'bathroom', signId: 'BATHTUB', title: 'Bathtub', order: 2,
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
    id: 'medium_bathroom_SOAP', level: 'medium', category: 'bathroom', signId: 'SOAP', title: 'Soap', order: 3,
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
    id: 'medium_bathroom_SHAMPOO', level: 'medium', category: 'bathroom', signId: 'SHAMPOO', title: 'Shampoo', order: 4,
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
    id: 'medium_bathroom_TOWEL', level: 'medium', category: 'bathroom', signId: 'TOWEL', title: 'Towel', order: 5,
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
    id: 'medium_bathroom_TOOTHBRUSH', level: 'medium', category: 'bathroom', signId: 'TOOTHBRUSH', title: 'Toothbrush', order: 6,
    description: 'Hold your index finger in front of your teeth and brush it back and forth, like brushing your teeth.',
    tips: [
      'Only the index finger is extended',
      'Quick back-and-forth motion',
      'Same physical sign already used for BRUSH TEETH under Health \u2014 context tells the noun and verb apart',
    ],
    imageUrl: '../assets/images/medium/health/brush_teeth.png', videoUrl: '../assets/videos/medium/health/brush_teeth.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_bathroom_TOOTHPASTE', level: 'medium', category: 'bathroom', signId: 'TOOTHPASTE', title: 'Toothpaste', order: 7,
    description: 'Sign BRUSH TEETH (index finger brushing side to side in front of your teeth), then mime squeezing a tube with your other hand, like squeezing out toothpaste.',
    tips: [
      'First part reuses the BRUSH TEETH motion',
      'Second part mimes squeezing a tube between your fingers',
      'This is a compound sign \u2014 two parts signed in sequence',
    ],
    imageUrl: '../assets/images/medium/bathroom/toothpaste.png', videoUrl: '../assets/videos/medium/bathroom/toothpaste.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/toothpaste.htm',
  },

  // ── MEDIUM · KITCHEN (Unit 26) ── (UNLOCKED 2026-09-01 — researched
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

  // ── MEDIUM · HOUSEHOLD (Unit 24) ── (researched against lifeprint.com,
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



















  // ── MEDIUM · INSECTS ── (new this pass — unlocks Unit 39)
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

  // ── MEDIUM · SEASONS ── (new this pass — unlocks Unit 46)
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
  // WINTER removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit, see CATEGORIES comment above) — COLD under Weather is the
  // kept trained entry for this sign.

  // ── MEDIUM · DAYTIME ── (new this pass — unlocks Unit 53)
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
    // EVENING removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit): EVENING and NIGHT are the identical sign (arm + drooping
    // hand) — the classifier can't tell them apart. NIGHT is kept as
    // the trained motion entry; see medium_daytime_NIGHT below.
    id: 'medium_daytime_NIGHT', level: 'medium', category: 'daytime', signId: 'NIGHT', title: 'Night', order: 3,
    description: 'Hold your non-dominant arm horizontal in front of you, palm down, and rest the wrist of your bent, flat dominant hand on the back of it, fingers pointing down, like the sun dropping below the horizon.',
    tips: [
      'Non-dominant arm represents the horizon, same idea as MORNING',
      'Dominant hand droops down over it instead of rising, like a sunset',
      'This same sign also covers EVENING — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/daytime/night.png', videoUrl: '../assets/videos/medium/daytime/night.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DAYS ── (new this pass — unlocks Unit 54)
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

  // ── MEDIUM · DISTANCE ── (new this pass — unlocks Unit 59)
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
    description: 'Form an \u2018F\u2019 handshape (touch your thumb and index finger together, other fingers extended) and touch the fingertip to the tip of your nose, then pull your hand out and sharply down.',
    tips: [
      'Handshape is \u2018F\u2019 \u2014 thumb and index touch, other three fingers stay up',
      'Start by touching your nose, then pull the hand away and down in one motion',
      'This same sign also covers CLOSE (as in "nearby") — context carries the difference',
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
    // CLOSE removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit, see CATEGORIES comment above) — NEAR is the kept trained
    // entry for this sign.
    id: 'medium_distance_AWAY', level: 'medium', category: 'distance', signId: 'AWAY', title: 'Away', order: 5,
    description: 'Hold your dominant hand open in a loose \u20185\u2019 shape near the side of your face, palm facing out, then flick it forward and away from you, like shooing something off.',
    tips: [
      'Handshape opens from a loose \u20185\u2019, palm facing outward',
      'One quick, deliberate flick outward and away from the body',
      'Facial expression sets the tone \u2014 soft for a gentle "shoo," sharp for "go away!"',
    ],
    imageUrl: '../assets/images/medium/distance/away.png', videoUrl: '../assets/videos/medium/distance/away.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DRINKS ── (new this pass — unlocks Unit 36)
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

  // ── MEDIUM · FRUITS ── (new this pass — unlocks Unit 33)
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
    description: 'Make a loose fist with your non-dominant hand and thump your dominant hand\u2019s middle finger off your thumb against the back of it, as if checking whether a melon is ripe.',
    tips: [
      'This same sign also covers PUMPKIN — context carries the difference',
      'Add WATER before this sign to mean WATERMELON instead',
      'One quick, springy thump, not a repeated knock',
    ],
    imageUrl: '../assets/images/medium/fruits/melon.png', videoUrl: '../assets/videos/medium/fruits/melon.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · VEGETABLES ── (researched 2026-09-02, unlocks Unit 34)
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
    // PUMPKIN removed from words[]/SIGNS (2026-09-03 classifier conflict
    // audit, see CATEGORIES comment above) — MELON under Fruits is the
    // kept trained entry for this sign.
    id: 'medium_vegetables_BROCCOLI', level: 'medium', category: 'vegetables', signId: 'BROCCOLI', title: 'Broccoli', order: 11,
    description: 'Hold your non-dominant hand up in a \u2018V\u2019 shape (or just an extended index finger) to represent the stalk, then use your dominant fingertips to tap near the top a couple of times, showing the clumped florets.',
    tips: [
      'Non-dominant hand represents the stalk standing upright',
      'Dominant hand taps near the top to show the bumpy florets',
      'Sources vary more than usual on this one — treat it as one common version, not the only version',
    ],
    imageUrl: '../assets/images/medium/vegetables/broccoli.png', videoUrl: '../assets/videos/medium/vegetables/broccoli.mp4', detectionType: 'motion',
  },

  // ── MEDIUM · DRESSING ── (new this pass — unlocks Unit 41)
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

  // ── MEDIUM · TRANSPORTATION ── (new this pass — unlocks Unit 49)
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
    // REUSED — same physical sign as medium_essentials_polite_expressions_THANKS (category: 'essentials_polite_expressions'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_manners_THANKS', level: 'medium', category: 'manners', signId: 'THANKS', title: 'Thanks', order: 2,
    description: 'Hold your flat dominant hand with fingertips near your lips or chin, then move your hand forward and slightly down toward the person you\u2019re thanking.',
    tips: [
      'Fingertips start near the lips/chin, not the whole hand',
      'Motion moves forward and down, toward the other person',
      'Same sign already used for THANKS under Polite Words',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/thanks.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/thanks.mp4', detectionType: 'motion',
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
      'This is the same sign as TRUE — also covers REALLY, per ASLU',
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
      'This is the same sign as TRUE',
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

  /* ── MEDIUM · WILD ANIMALS (Unit 38) ── (NEW this session — unlocks
   * Unit 38. All 10 words researched fresh against lifeprint.com (ASLU),
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

  /* ── MEDIUM · SNACKS (Unit 35) ── (NEW this session — unlocks Unit
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

  /* ── MEDIUM · WEATHER (Unit 45) ── (NEW this session — unlocks Unit
   * 46. HOT and COLD are duplicates of the existing
   * medium_temperature_HOT/COLD entries. WARM and COOL are also listed
   * in the 'temperature' category's words[] (Unit 17, Touch) but that
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
    // CLOUDY removed from words[]/SIGNS (2026-09-04 classifier conflict
    // audit): CLOUDY and CLOUD (under Nature) are the identical hand
    // shape/circling motion — CLOUD is kept as the trained motion
    // entry. Same precedent as BITTER/SOUR under Taste.
    // WINDY removed from words[]/SIGNS (same audit): WINDY and WIND
    // (under Nature) are the identical sway motion — WIND is kept.
    // RAINY removed (same audit): identical hand shape/repeated-drop
    // motion to RAIN under Nature — RAIN is kept.
    // STORMY removed (same audit, resolving the FLAG that used to sit on
    // this entry): same open-hand side-to-side sway as WIND, differing
    // only in amplitude and facial expression — WIND is kept.
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
    // despite 'temperature' (Touch, Unit 17) already listing it in
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
    // despite 'temperature' (Touch, Unit 17) already listing it in
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

  /* ── MEDIUM · MONTHS (Unit 55) ──────────────────────────────────
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

  /* ── MEDIUM · SEQUENCE (Unit 56) ─────────────────────────────────
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
      'This same sign also covers SHIP — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/vehicles/boat.png', videoUrl: '../assets/videos/medium/vehicles/boat.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/boat.htm',
  },
  // SHIP removed from words[]/SIGNS (2026-09-04 classifier conflict
  // audit): SHIP and BOAT are the identical cupped-hands hull sign —
  // ASLbloom itself notes they're distinguished mainly by context
  // (and sometimes a larger, slower movement), which the landmark
  // classifier can't reliably detect. BOAT is kept as the trained
  // motion entry. Same precedent as BITTER/SOUR under Taste.

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
      'This same sign also covers PUSH — context carries the difference',
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
    // REUSED — same physical sign as medium_essentials_polite_expressions_THANKS (category: 'essentials_polite_expressions'); no new research needed, same signId so it still matches dictionary.js.
    id: 'medium_conversation_THANKS', level: 'medium', category: 'conversation', signId: 'THANKS', title: 'Thanks', order: 7,
    description: 'Hold your flat dominant hand with fingertips near your lips or chin, then move your hand forward and slightly down toward the person you\u2019re thanking.',
    tips: [
      'Fingertips start near the lips/chin, not the whole hand',
      'Motion moves forward and down, toward the other person',
      'Same sign already used for THANKS under Polite Words',
    ],
    imageUrl: '../assets/images/medium/essentials_polite_expressions/thanks.png', videoUrl: '../assets/videos/medium/essentials_polite_expressions/thanks.mp4', detectionType: 'motion',
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

  // ── MEDIUM · FOOD ── (new this pass — unlocks Unit 32)
  // Researched on lifeprint.com (ASLU), cross-checked against a second
  // source per word (aslbloom/babysignlanguage/PocketSign/ASL
  // Interactive — sources vary by word since not every dictionary
  // covers every word). Descriptions below are my own wording of what
  // those sources show, not copied text. FISH is a DUPLICATE of the
  // existing medium_animals_FISH entry (same physical sign). CHICKEN's
  // SIGNS entry was removed here (2026-09-03 classifier conflict
  // audit) — see the "32. Food" CATEGORIES comment above.
  {
    // LOWER CONFIDENCE — ASLU's own rice.htm page states there "isn't a
    // widespread sign for rice" in ASL, though it (and two other
    // sources, aslbloom and babysignlanguage) independently describe
    // the same R-handshape scoop. Included per that convergence, but
    // flagged since the primary source itself hedges on how
    // standardized it is.
    id: 'medium_food_RICE', level: 'medium', category: 'food', signId: 'RICE', title: 'Rice', order: 1,
    description: 'Hold your non-dominant hand loosely cupped like a small bowl. Form your dominant hand into an \u2018R\u2019 handshape (crossed index and middle fingers) and scoop it up out of the "bowl" toward your mouth, as if spooning rice out with your fingers.',
    tips: [
      'Handshape is \u2018R\u2019 — index and middle fingers crossed, not spread',
      'Non-dominant hand stays cupped and still, representing the bowl',
      'A small, repeated scooping motion toward the mouth, not one big scoop',
    ],
    imageUrl: '../assets/images/medium/food/rice.png', videoUrl: '../assets/videos/medium/food/rice.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/rice.htm',
  },
  {
    id: 'medium_food_BREAD', level: 'medium', category: 'food', signId: 'BREAD', title: 'Bread', order: 2,
    description: 'Hold your non-dominant hand flat and upright in front of you, palm facing your body, like the side of a loaf. With your dominant hand, make a downward slicing motion against the back of your non-dominant hand, as if cutting slices off the loaf.',
    tips: [
      'Non-dominant hand stays still and upright — it represents the loaf',
      'Dominant hand slices downward, not side to side',
      'Repeat the slicing motion two or three times',
    ],
    imageUrl: '../assets/images/medium/food/bread.png', videoUrl: '../assets/videos/medium/food/bread.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/bread.htm',
  },
  {
    id: 'medium_food_EGG', level: 'medium', category: 'food', signId: 'EGG', title: 'Egg', order: 3,
    description: 'Form both hands into an \u2018H\u2019 handshape (index and middle fingers extended together). Tap your dominant \u2018H\u2019 hand down against your non-dominant \u2018H\u2019 hand, then pull both hands apart and down, as if cracking an egg and letting the halves fall away.',
    tips: [
      'Both hands use the \u2018H\u2019 handshape — index and middle fingers together',
      'One light tap first, then a clean pull-apart-and-down',
      'The pulling-apart motion is what reads as "cracking," not the tap alone',
    ],
    imageUrl: '../assets/images/medium/food/egg.png', videoUrl: '../assets/videos/medium/food/egg.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/e/egg.htm',
  },
  {
    // DUPLICATE — same sign as medium_animals_FISH.
    id: 'medium_food_FISH', level: 'medium', category: 'food', signId: 'FISH', title: 'Fish', order: 5,
    description: 'Hold your dominant hand flat, fingers together, and move it forward while wiggling it side to side, like a fish swimming through water.',
    tips: [
      'Hand stays flat the whole time',
      'The side-to-side wiggle mimics a fish\u2019s tail',
      'Same sign already used for Fish under Animals',
    ],
    imageUrl: '../assets/images/medium/animals/fish.png', videoUrl: '../assets/videos/medium/animals/fish.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_food_MEAT', level: 'medium', category: 'food', signId: 'MEAT', title: 'Meat', order: 6,
    description: 'Hold your non-dominant hand flat in front of you. With your dominant thumb and index finger, pinch the fleshy web of skin between the thumb and index finger of your non-dominant hand and give it a small wiggle, as if checking a piece of meat.',
    tips: [
      'Pinch point is the webbing between the non-dominant thumb and index finger',
      'A small wiggle or shake after the pinch, not just a static grab',
      'Non-dominant hand otherwise stays still',
    ],
    imageUrl: '../assets/images/medium/food/meat.png', videoUrl: '../assets/videos/medium/food/meat.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/meat.htm',
  },
  {
    id: 'medium_food_SOUP', level: 'medium', category: 'food', signId: 'SOUP', title: 'Soup', order: 7,
    description: 'Hold your non-dominant hand loosely cupped like a bowl in front of you. Form your dominant hand into a \u2018U\u2019 handshape (index and middle fingers extended together) and scoop it up out of the "bowl" toward your mouth, twice, like spooning soup.',
    tips: [
      'Handshape is \u2018U\u2019 — index and middle fingers together, held vertical',
      'A larger, slower scoop than the sign for SPOON, and it travels closer to the mouth',
      'Non-dominant "bowl" hand stays in place through both scoops',
    ],
    imageUrl: '../assets/images/medium/food/soup.png', videoUrl: '../assets/videos/medium/food/soup.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/soup.htm',
  },

  // ── MEDIUM · PLANTS ── (new this pass — unlocks Unit 44)
  // Researched on lifeprint.com (ASLU), cross-checked against a second
  // source per word (aslbloom/PocketSign/dummies.com ASL guide — varies
  // by word). WATER and GARDEN are DUPLICATES of the existing
  // medium_drinks_WATER/medium_home_GARDEN entries. SEED and ROOT are
  // NOT included — see the CATEGORIES comment on 'plants' above.
  {
    id: 'medium_plants_PLANT', level: 'medium', category: 'plants', signId: 'PLANT', title: 'Plant', order: 1,
    description: 'Hold your non-dominant hand in a loose \u2018C\u2019 shape at chest height, palm facing up. Push your dominant hand up through it from below, starting as a flattened \u2018O\u2019 and opening into a loose \u20185\u2019 as it emerges, as if a plant were sprouting up out of the ground. Repeat the motion a second time just to the side to show more than one plant.',
    tips: [
      'The dominant hand opens from a flattened \u2018O\u2019 into a \u20185\u2019 as it rises through the \u2018C\u2019',
      'Doing this motion just once instead of twice changes the meaning to GROW rather than "a plant"',
      'Non-dominant \u2018C\u2019 hand represents the ground the plant is coming up through',
    ],
    imageUrl: '../assets/images/medium/plants/plant.png', videoUrl: '../assets/videos/medium/plants/plant.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/p/plant.htm',
  },
  {
    id: 'medium_plants_TREE', level: 'medium', category: 'plants', signId: 'TREE', title: 'Tree', order: 2,
    description: 'Rest the elbow of your dominant arm on the back of your flat, horizontal non-dominant hand. Hold your dominant hand upright in a loose \u20185\u2019 shape, fingers spread, and twist it back and forth at the wrist.',
    tips: [
      'Non-dominant flat hand represents the ground; dominant forearm is the trunk',
      'Fingers stay spread — they represent the branches',
      'Movement is a wrist twist, not a big arm swing',
    ],
    imageUrl: '../assets/images/medium/plants/tree.png', videoUrl: '../assets/videos/medium/plants/tree.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/tree.htm',
  },
  {
    id: 'medium_plants_FLOWER', level: 'medium', category: 'plants', signId: 'FLOWER', title: 'Flower', order: 3,
    description: 'Bring the fingertips and thumb of your dominant hand together into a "squished O" shape and touch them to one side of your nose, then to the other side, as if smelling a flower.',
    tips: [
      'Handshape is a squished/flattened \u2018O\u2019, fingertips and thumb together',
      'Touch one nostril, then the other — either side can go first',
      'A light touch to the cheek/nose area, not a poke',
    ],
    imageUrl: '../assets/images/medium/plants/flower.png', videoUrl: '../assets/videos/medium/plants/flower.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/flower.htm',
  },
  {
    id: 'medium_plants_GRASS', level: 'medium', category: 'plants', signId: 'GRASS', title: 'Grass', order: 4,
    description: 'Hold a loose \u20185\u2019 handshape under your chin, palm facing up and fingers pointing outward. Brush the hand upward against your chin twice in a small circular motion.',
    tips: [
      'Handshape is a loose \u20185\u2019 — all fingers spread',
      'Palm brushes up against the chin, not away from it',
      'A small circular up-forward-down motion, repeated twice',
    ],
    imageUrl: '../assets/images/medium/plants/grass.png', videoUrl: '../assets/videos/medium/plants/grass.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/grass.htm',
  },
  {
    // LOWER CONFIDENCE — sources disagree on this one. ASLU and
    // PocketSign both describe the "falling leaf" version shown here
    // (same handshape idea as the TREE/AUTUMN family of signs); aslbloom
    // describes an unrelated tap-and-wiggle sign instead. Went with the
    // two-source version.
    id: 'medium_plants_LEAF', level: 'medium', category: 'plants', signId: 'LEAF', title: 'Leaf', order: 5,
    description: 'Hold the index finger of your non-dominant hand pointing up, representing a branch. Rest the wrist of your dominant hand, fingers together and open, against the fingertip of that index finger, then gently flutter your dominant hand back and forth as it drifts downward, like a leaf falling and blowing in the wind.',
    tips: [
      'Non-dominant index finger stays still — it\u2019s the branch the leaf hangs from',
      'The flutter comes from the wrist, not the whole arm',
      'Drifting the hand downward as it flutters is what shows the leaf "falling"',
    ],
    imageUrl: '../assets/images/medium/plants/leaf.png', videoUrl: '../assets/videos/medium/plants/leaf.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/leaf.htm',
  },
  {
    // LOWER CONFIDENCE — only two sources found describing this word in
    // detail (ASLU and PocketSign), both in close agreement, but it
    // hasn't been cross-checked against a third the way most of this
    // pass's words were.
    id: 'medium_plants_BRANCH', level: 'medium', category: 'plants', signId: 'BRANCH', title: 'Branch', order: 6,
    description: 'Hold your non-dominant arm upright, hand open, representing a tree trunk. Form your dominant hand into a \u20181\u2019 handshape (index finger extended) near the elbow of your non-dominant arm, and move it outward and slightly upward, tracing the line of a branch growing out from the trunk.',
    tips: [
      'Non-dominant arm stays upright and still — it\u2019s the tree trunk',
      'Only the index finger is extended on the dominant hand',
      'The outward-and-up path is what reads as a "branch" rather than just pointing',
    ],
    imageUrl: '../assets/images/medium/plants/branch.png', videoUrl: '../assets/videos/medium/plants/branch.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/branch.htm',
  },
  {
    // DUPLICATE — same sign as medium_home_GARDEN.
    id: 'medium_plants_GARDEN', level: 'medium', category: 'plants', signId: 'GARDEN', title: 'Garden', order: 7,
    description: 'Hold your non-dominant hand in a loose \u2018C\u2019 shape at chest height. Push your dominant hand up through it from below, starting as a flattened \u2018O\u2019 and opening into a loose \u20185\u2019, then repeat the motion just to the side to show more than one plant growing.',
    tips: [
      'Same base handshape and motion as PLANT, repeated to the side',
      'The repetition (versus a single motion) is what shows multiple plants rather than one',
      'Same sign already used for Garden under Home',
    ],
    imageUrl: '../assets/images/medium/home/garden.png', videoUrl: '../assets/videos/medium/home/garden.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_plants_GROW', level: 'medium', category: 'plants', signId: 'GROW', title: 'Grow', order: 8,
    description: 'Hold your non-dominant hand in a loose \u2018C\u2019 shape at chest height, palm facing up. Push your dominant hand up through it once, starting as a flattened \u2018O\u2019 and opening into a loose \u20185\u2019 as it emerges.',
    tips: [
      'Same handshape family as PLANT, but a single motion instead of a repeated one',
      'You can make the motion bigger or move it higher to show something growing larger',
      'Non-dominant \u2018C\u2019 hand represents where the growth is coming from',
    ],
    imageUrl: '../assets/images/medium/plants/grow.png', videoUrl: '../assets/videos/medium/plants/grow.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/grow.htm',
  },
  {
    // DUPLICATE — same sign as medium_drinks_WATER.
    id: 'medium_plants_WATER', level: 'medium', category: 'plants', signId: 'WATER', title: 'Water', order: 9,
    description: 'Tap the fingertip of a \u2018W\u2019 handshape (index, middle, and ring fingers extended) against your chin twice.',
    tips: [
      'Handshape is \u2018W\u2019 — three fingers extended, thumb and pinky tucked',
      'Contact point is the chin, tapped twice',
      'Same sign already used for Water under Drinks',
    ],
    imageUrl: '../assets/images/medium/drinks/water.png', videoUrl: '../assets/videos/medium/drinks/water.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_plants_SOIL', level: 'medium', category: 'plants', signId: 'SOIL', title: 'Soil', order: 10,
    description: 'Hold both hands in front of you in a flattened \u2018O\u2019 shape, palms facing up, and rub your fingertips against your thumbs, as if feeling grains of soil or sand between your fingers.',
    tips: [
      'This is the same sign used for DIRT and SAND — context tells them apart',
      'Both hands rub at the same time',
      'A neutral or slightly wrinkled-nose expression is common with this sign',
    ],
    imageUrl: '../assets/images/medium/plants/soil.png', videoUrl: '../assets/videos/medium/plants/soil.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dirt.htm',
  },
  /* ── MEDIUM · LOCATION (Unit 58) ── (new this session — unlocks Unit
   * 59). ON, UNDER, ABOVE, BELOW, BESIDE, BETWEEN, and spatial NEXT
   * were dropped from words[] rather than given invented signs — see
   * the comment on the 'location' CATEGORIES entry above for why. */
  {
    id: 'medium_location_IN', level: 'medium', category: 'location', signId: 'IN', title: 'In', order: 1,
    description: 'Curl your non-dominant hand into a loose \u2018C\u2019 shape, then tuck the fingertips of your closed dominant hand down into the opening, as if placing something inside a cup.',
    tips: [
      'The non-dominant \u2018C\u2019 hand acts like a container',
      'One dip into the \u2018C\u2019 is enough for the basic sign \u2018in\u2019',
      'Doing the same movement twice, smaller the second time, shifts the meaning to \u2018inside\u2019 \u2014 see that entry',
    ],
    imageUrl: '../assets/images/medium/location/in.png', videoUrl: '../assets/videos/medium/location/in.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/i/in.htm',
  },
  {
    id: 'medium_location_OUT', level: 'medium', category: 'location', signId: 'OUT', title: 'Out', order: 2,
    description: 'Hold your dominant hand loosely open in front of you, then move it slightly forward and off to the side while closing it into a squeezed \u2018O\u2019 handshape, as if pulling something out from inside.',
    tips: [
      'The handshape closes from open to a squeezed \u2018O\u2019 as the hand moves',
      'The path angles slightly forward and to the side, not straight out',
      'This same movement, done bigger and higher, becomes \u2018outside\u2019 \u2014 see that entry',
    ],
    imageUrl: '../assets/images/medium/location/out.png', videoUrl: '../assets/videos/medium/location/out.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/outside.htm',
  },
  {
    id: 'medium_location_INSIDE', level: 'medium', category: 'location', signId: 'INSIDE', title: 'Inside', order: 3,
    description: 'Sign IN, but repeat the motion a second time with a smaller movement \u2014 tuck your closed dominant hand into the non-dominant \u2018C\u2019 hand twice, the second dip noticeably smaller than the first.',
    tips: [
      'Built directly on the IN sign, just repeated',
      'The second movement is deliberately smaller than the first',
      'Handy for asking what\u2019s inside something, e.g. \u2018What\u2019s inside the box?\u2019',
    ],
    imageUrl: '../assets/images/medium/location/inside.png', videoUrl: '../assets/videos/medium/location/inside.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/i/in.htm',
  },
  {
    id: 'medium_location_OUTSIDE', level: 'medium', category: 'location', signId: 'OUTSIDE', title: 'Outside', order: 4,
    description: 'Sign \u2018go out\u2019 \u2014 an open hand sweeping up and outward at an angle \u2014 but repeat the movement to turn the one-time verb into the noun \u2018outside.\u2019',
    tips: [
      'A single movement means the verb \u2018go out\u2019; repeating it turns it into the noun \u2018outside\u2019',
      'The path arcs up and away from you, similar to (but bigger and higher than) LEAVE',
      'Some signers use an even larger, single open-hand sweep as an adjective meaning \u2018exterior\u2019',
    ],
    imageUrl: '../assets/images/medium/location/outside.png', videoUrl: '../assets/videos/medium/location/outside.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/outside.htm',
  },
  {
    id: 'medium_location_FRONT', level: 'medium', category: 'location', signId: 'FRONT', title: 'Front', order: 5,
    description: 'Hold a flat hand a few inches out in front of your forehead, then bring it straight down past your face.',
    tips: [
      'The flat hand stays a few inches away from your face the whole way down',
      'Some signers slide the hand from forehead to chin and finish by pointing forward, to mean \u2018in front of\u2019 a specific thing',
      'Different motion from BACK, which points backward over the shoulder instead of sliding down the face',
    ],
    imageUrl: '../assets/images/medium/location/front.png', videoUrl: '../assets/videos/medium/location/front.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/front.htm',
  },
  {
    // DUPLICATE — same sign as medium_body_BACK / medium_directions_BACK.
    id: 'medium_location_BACK', level: 'medium', category: 'location', signId: 'BACK', title: 'Back', order: 6,
    description: 'Point your thumb back over your shoulder, toward your own back.',
    tips: [
      'Thumb does the pointing, hand in a loose fist',
      'Gesture is aimed behind you',
      'This same sign also covers BEHIND — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/body/back.png', videoUrl: '../assets/videos/medium/body/back.mp4', detectionType: 'motion',
  },
  // BEHIND removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit, see CATEGORIES comment above) — BACK is the kept trained
  // entry for this sign.

  // ── MEDIUM · NATURE ── (new this session — unlocks Unit 43. Researched
  // against lifeprint.com/ASLU, cross-checked against a second source per
  // word — see the CATEGORIES comment above for which words are duplicates
  // and which were dropped.)
  {
    id: 'medium_nature_SUN', level: 'medium', category: 'nature', signId: 'SUN', title: 'Sun', order: 1,
    description: 'Circle a flattened \u2018O\u2019 handshape once near your head, then bring it down an inch or two while opening your fingers, as if a ray of sunlight is spilling downward.',
    tips: [
      'Keep the motion small \u2014 a bigger downward movement tends to read as SUNLIGHT instead',
      'The handshape starts closed and opens as it drops',
      'A second common version circles a full \u2018C\u2019 hand upward near the eye, paired conceptually with MOON',
    ],
    imageUrl: '../assets/images/medium/nature/sun.png', videoUrl: '../assets/videos/medium/nature/sun.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sun.htm',
  },
  {
    id: 'medium_nature_MOON', level: 'medium', category: 'nature', signId: 'MOON', title: 'Moon', order: 2,
    description: 'Form a modified \u2018C\u2019 shape using just your thumb and index finger, and hold it up near the corner of your eye, as if framing a crescent moon in the sky.',
    tips: [
      'Only the thumb and index finger are used, unlike SUN\u2019s full hand',
      'Some signers tap this handshape near the eye twice instead of holding it still',
      'Can be combined with NIGHT for signing "tonight" or an evening scene',
    ],
    imageUrl: '../assets/images/medium/nature/moon.png', videoUrl: '../assets/videos/medium/nature/moon.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/moon.htm',
  },
  {
    // DUPLICATE — same sign as medium_shapes_STAR.
    id: 'medium_nature_STAR', level: 'medium', category: 'nature', signId: 'STAR', title: 'Star', order: 3,
    description: 'Point both index fingers upward in front of you and alternate brushing them up past each other, like a twinkling motion.',
    tips: [
      'Both index fingers point straight up',
      'Fingers alternate \u2014 one slides up as the other resets',
      'Small, quick repeated motion',
    ],
    imageUrl: '../assets/images/medium/shapes/star.png', videoUrl: '../assets/videos/medium/shapes/star.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_nature_CLOUD', level: 'medium', category: 'nature', signId: 'CLOUD', title: 'Cloud', order: 4,
    description: 'Hold both hands in a loose, slightly clawed \u20185\u2019 shape above your face, palms down, and move them in small alternating circles, as if clouds are drifting overhead.',
    tips: [
      'Both hands stay up near head height, representing the sky',
      'The circular motion alternates between the two hands',
      'For a single cloud, sign ONE first and skip the sideways drift',
    ],
    imageUrl: '../assets/images/medium/nature/cloud.png', videoUrl: '../assets/videos/medium/nature/cloud.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cloud.htm',
  },
  {
    id: 'medium_nature_RAIN', level: 'medium', category: 'nature', signId: 'RAIN', title: 'Rain', order: 5,
    description: 'Hold both open hands up near head height, palms down, fingers loosely curled, and drop them downward twice, like raindrops falling from the clouds.',
    tips: [
      'Fingertips represent the falling drops',
      'Keep the motion straight down \u2014 a sideways drop can instead suggest wind-blown rain',
      'Don\u2019t confuse this with SNOW, which flutters the fingers on the way down',
    ],
    imageUrl: '../assets/images/medium/nature/rain.png', videoUrl: '../assets/videos/medium/nature/rain.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/rain.htm',
  },
  {
    id: 'medium_nature_WIND', level: 'medium', category: 'nature', signId: 'WIND', title: 'Wind', order: 6,
    description: 'Hold both open \u20185\u2019 hands apart in front of you, palms facing each other, and sway them side to side together, like a breeze pushing back and forth.',
    tips: [
      'Palms face each other the whole time',
      'Movement is side-to-side, not up-and-down like RAIN or SNOW',
      'A bigger, faster sway can show a stronger wind',
    ],
    imageUrl: '../assets/images/medium/nature/wind.png', videoUrl: '../assets/videos/medium/nature/wind.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/wind.htm',
  },
  {
    // DUPLICATE — same sign as medium_plants_TREE.
    id: 'medium_nature_TREE', level: 'medium', category: 'nature', signId: 'TREE', title: 'Tree', order: 7,
    description: 'Rest the elbow of your dominant arm on the back of your flat, horizontal non-dominant hand. Hold your dominant hand upright in a loose \u20185\u2019 shape, fingers spread, and twist it back and forth at the wrist.',
    tips: [
      'Non-dominant flat hand represents the ground; dominant forearm is the trunk',
      'Fingers stay spread \u2014 they represent the branches',
      'Movement is a wrist twist, not a big arm swing',
    ],
    imageUrl: '../assets/images/medium/plants/tree.png', videoUrl: '../assets/videos/medium/plants/tree.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/t/tree.htm',
  },
  {
    // DUPLICATE — same sign as medium_plants_FLOWER.
    id: 'medium_nature_FLOWER', level: 'medium', category: 'nature', signId: 'FLOWER', title: 'Flower', order: 8,
    description: 'Bring the fingertips and thumb of your dominant hand together into a "squished O" shape and touch them to one side of your nose, then to the other side, as if smelling a flower.',
    tips: [
      'Handshape is a squished/flattened \u2018O\u2019, fingertips and thumb together',
      'Touch one nostril, then the other \u2014 either side can go first',
      'A light touch to the cheek/nose area, not a poke',
    ],
    imageUrl: '../assets/images/medium/plants/flower.png', videoUrl: '../assets/videos/medium/plants/flower.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/flower.htm',
  },
  {
    // DUPLICATE — same sign as medium_plants_GRASS.
    id: 'medium_nature_GRASS', level: 'medium', category: 'nature', signId: 'GRASS', title: 'Grass', order: 9,
    description: 'Hold a loose \u20185\u2019 handshape under your chin, palm facing up and fingers pointing outward. Brush the hand upward against your chin twice in a small circular motion.',
    tips: [
      'Handshape is a loose \u20185\u2019 \u2014 all fingers spread',
      'Palm brushes up against the chin, not away from it',
      'A small circular up-forward-down motion, repeated twice',
    ],
    imageUrl: '../assets/images/medium/plants/grass.png', videoUrl: '../assets/videos/medium/plants/grass.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/g/grass.htm',
  },
  {
    // DUPLICATE — same sign as medium_plants_LEAF.
    id: 'medium_nature_LEAF', level: 'medium', category: 'nature', signId: 'LEAF', title: 'Leaf', order: 10,
    description: 'Hold the index finger of your non-dominant hand pointing up, representing a branch. Rest the wrist of your dominant hand, fingers together and open, against the fingertip of that index finger, then gently flutter your dominant hand back and forth as it drifts downward, like a leaf falling and blowing in the wind.',
    tips: [
      'Non-dominant index finger stays still \u2014 it\u2019s the branch the leaf hangs from',
      'The flutter comes from the wrist, not the whole arm',
      'Drifting the hand downward as it flutters is what shows the leaf "falling"',
    ],
    imageUrl: '../assets/images/medium/plants/leaf.png', videoUrl: '../assets/videos/medium/plants/leaf.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/leaf.htm',
  },
  {
    id: 'medium_nature_ROCK', level: 'medium', category: 'nature', signId: 'ROCK', title: 'Rock', order: 11,
    description: 'Make two loose fists and knock the back of your non-dominant fist with your dominant fist, like striking one rock against another.',
    tips: [
      'Both hands are in loose fist (\u2018A\u2019) shapes',
      'The dominant hand strikes down onto the back of the stationary hand',
      'A related version taps an \u2018S\u2019 hand under the chin instead, sometimes labeled STONE',
    ],
    imageUrl: '../assets/images/medium/nature/rock.png', videoUrl: '../assets/videos/medium/nature/rock.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/rock.htm',
  },
  {
    id: 'medium_nature_SAND', level: 'medium', category: 'nature', signId: 'SAND', title: 'Sand', order: 12,
    description: 'Hold both hands out in front of you and rub your thumbs back and forth across your fingertips, as if letting sand sift through your fingers.',
    tips: [
      'The same motion is used for DIRT and SOIL \u2014 context tells them apart',
      'Keep the rubbing small and continuous',
      'Often paired with BEACH when describing a shoreline',
    ],
    imageUrl: '../assets/images/medium/nature/sand.png', videoUrl: '../assets/videos/medium/nature/sand.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/s/sand.htm',
  },
  {
    id: 'medium_nature_MOUNTAIN', level: 'medium', category: 'nature', signId: 'MOUNTAIN', title: 'Mountain', order: 13,
    description: 'Sign ROCK first \u2014 knock one fist on the other \u2014 then hold both flat hands out and lift them up at a slant, tracing the rising slope of a mountainside.',
    tips: [
      'Starts with the ROCK handshape and motion',
      'The second part traces an upward slope with flat, open hands',
      'Related to the sign for "hill," just with more emphasis on the rocky base',
    ],
    imageUrl: '../assets/images/medium/nature/mountain.png', videoUrl: '../assets/videos/medium/nature/mountain.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/mountain.htm',
  },
  {
    id: 'medium_nature_RIVER', level: 'medium', category: 'nature', signId: 'RIVER', title: 'River', order: 14,
    description: 'Sign WATER by tapping a \u2018W\u2019 hand near your mouth, then hold both flat hands out and move them forward together in a wavy, side-to-side path, showing water winding along a channel.',
    tips: [
      'Begins with the WATER sign',
      'The wavy path is what turns "water" into "river" \u2014 a straighter path can read as something else',
      'A bigger, more energetic wave can suggest a fast-moving or flooding river',
    ],
    imageUrl: '../assets/images/medium/nature/river.png', videoUrl: '../assets/videos/medium/nature/river.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/r/river.htm',
  },
  {
    id: 'medium_nature_OCEAN', level: 'medium', category: 'nature', signId: 'OCEAN', title: 'Ocean', order: 15,
    description: 'Hold both open \u20185\u2019 hands out, palms down, and move them forward in a rolling, up-and-down wave motion, like swells passing under a boat.',
    tips: [
      'Palms stay down throughout',
      'The motion should rock gently up and down as it moves forward, not just side to side',
      'Often preceded by the WATER sign for extra clarity',
    ],
    imageUrl: '../assets/images/medium/nature/ocean.png', videoUrl: '../assets/videos/medium/nature/ocean.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/ocean.htm',
  },
  {
    id: 'medium_nature_BEACH', level: 'medium', category: 'nature', signId: 'BEACH', title: 'Beach', order: 16,
    description: 'Rest your dominant flat hand on top of your non-dominant flat hand, both palms down, then slide the top hand outward while wiggling your fingers, like water washing up over sand.',
    tips: [
      'Fingers wiggle as the top hand slides outward',
      'Many signers just fingerspell BEACH in everyday conversation',
      'The sliding motion can be repeated to show waves washing in and out',
    ],
    imageUrl: '../assets/images/medium/nature/beach.png', videoUrl: '../assets/videos/medium/nature/beach.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/b/beach.htm',
  },
  {
    id: 'medium_nature_ISLAND', level: 'medium', category: 'nature', signId: 'ISLAND', title: 'Island', order: 17,
    description: 'Hold your non-dominant hand in a loose fist, palm down, and circle your dominant hand \u2014 in an \u2018I\u2019 handshape \u2014 on top of it a couple of times.',
    tips: [
      'The dominant hand uses the \u2018I\u2019 handshape (pinky extended, other fingers and thumb closed)',
      'The circling motion happens on top of the stationary base hand',
      'For a small island or isle, add SMALL before this sign',
    ],
    imageUrl: '../assets/images/medium/nature/island.png', videoUrl: '../assets/videos/medium/nature/island.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/i/island.htm',
  },

  // ── MEDIUM · PROFESSIONS ── (new this session — unlocks Unit 50.
  // Researched against lifeprint.com/ASLU, cross-checked against a second
  // source per word — see the CATEGORIES comment above for which words are
  // duplicates and which were dropped. Most of these professions are
  // compound signs — a base verb/noun sign followed by the PERSON suffix
  // (both flat hands sliding straight down in front of you), the same
  // pattern already used for medium_people_TEACHER/STUDENT elsewhere in
  // this file.)
  {
    // DUPLICATE — same sign as medium_people_TEACHER.
    id: 'medium_professions_TEACHER', level: 'medium', category: 'professions', signId: 'TEACHER', title: 'Teacher', order: 1,
    description: 'Sign TEACH — both open "flat-O" hands near the forehead, moving forward and out twice, as if handing knowledge outward — then add the PERSON suffix by moving both flat hands straight down in front of you.',
    tips: [
      'TEACH motion happens near the forehead/temple',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Together they form "teach" + "person" = teacher',
    ],
    imageUrl: '../assets/images/medium/people/teacher.png', videoUrl: '../assets/videos/medium/people/teacher.mp4', detectionType: 'motion',
  },
  {
    id: 'medium_professions_DOCTOR', level: 'medium', category: 'professions', signId: 'DOCTOR', title: 'Doctor', order: 2,
    description: 'Hold your non-dominant hand palm-up like you\u2019re offering your wrist, then tap the fingertips of your dominant bent hand twice on the wrist, like a doctor checking your pulse.',
    tips: [
      'The dominant hand is bent at the knuckles, fingers pointing down toward the wrist',
      'Two light taps on the wrist, not a poke',
      'Some signers use a \u2018D\u2019 handshape instead of the bent hand \u2014 both are common',
    ],
    imageUrl: '../assets/images/medium/professions/doctor.png', videoUrl: '../assets/videos/medium/professions/doctor.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/doctor.htm',
  },
  {
    id: 'medium_professions_NURSE', level: 'medium', category: 'professions', signId: 'NURSE', title: 'Nurse', order: 3,
    description: 'Nearly identical to DOCTOR, but the tapping hand forms an \u2018N\u2019 handshape instead, tapping twice on the wrist as if checking a pulse.',
    tips: [
      'Only the handshape changes from DOCTOR \u2014 everything else stays the same',
      'The \u2018N\u2019 is formed with the index and middle fingers extended, other fingers tucked, thumb between them',
      'At fast signing speed you may see just one tap instead of two',
    ],
    imageUrl: '../assets/images/medium/professions/nurse.png', videoUrl: '../assets/videos/medium/professions/nurse.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/n/nurse.htm',
  },
  {
    // DUPLICATE — same sign as medium_community_POLICE.
    id: 'medium_professions_POLICE', level: 'medium', category: 'professions', signId: 'POLICE', title: 'Police', order: 4,
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
    id: 'medium_professions_FIREFIGHTER', level: 'medium', category: 'professions', signId: 'FIREFIGHTER', title: 'Firefighter', order: 5,
    description: 'Hold your dominant hand flat, palm facing out, and tap the back of it twice against your forehead, like tipping the brim of a firefighter\u2019s helmet.',
    tips: [
      'The hand stays flat (\u2018B\u2019 handshape) with the palm facing forward',
      'Two light taps against the forehead',
      'Some Deaf firefighters instead sign FIRE followed by FIGHT rather than this sign',
    ],
    imageUrl: '../assets/images/medium/professions/firefighter.png', videoUrl: '../assets/videos/medium/professions/firefighter.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/firefighter.htm',
  },
  {
    id: 'medium_professions_FARMER', level: 'medium', category: 'professions', signId: 'FARMER', title: 'Farmer', order: 6,
    description: 'Trace your thumb along your jawline from one side to the other with an open \u20185\u2019 hand, then add the PERSON ending by sliding both flat hands straight down in front of you.',
    tips: [
      'The FARM part is the thumb tracing along the jaw',
      'Follow immediately with the PERSON suffix (downward hands)',
      'Don\u2019t confuse the jaw-tracing motion with the sign SLOPPY, which ends with a flinging motion',
    ],
    imageUrl: '../assets/images/medium/professions/farmer.png', videoUrl: '../assets/videos/medium/professions/farmer.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/f/farm.htm',
  },
  {
    id: 'medium_professions_DRIVER', level: 'medium', category: 'professions', signId: 'DRIVER', title: 'Driver', order: 7,
    description: 'Hold both hands in loose fists, palms facing you, and turn them back and forth like gripping a steering wheel, then add the PERSON ending by sliding both flat hands straight down in front of you.',
    tips: [
      'The steering-wheel motion is bigger than the small one used for CAR',
      'Follow immediately with the PERSON suffix',
      'A single forward movement (without repeating) can instead mean "drive to" a place',
    ],
    imageUrl: '../assets/images/medium/professions/driver.png', videoUrl: '../assets/videos/medium/professions/driver.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/drive.htm',
  },
  {
    // DUPLICATE — same sign as medium_actions_COOK.
    id: 'medium_professions_COOK', level: 'medium', category: 'professions', signId: 'COOK', title: 'Cook', order: 8,
    description: 'Hold your non-dominant hand flat, palm up, like a pan. Place your dominant flat hand on top and flip it over, like flipping food while cooking.',
    tips: [
      'Base hand stays flat, palm up, the whole time',
      'Dominant hand flips completely over, palm up to palm down',
      'This same sign also covers CHEF — context carries the difference',
    ],
    imageUrl: '../assets/images/medium/actions/cook.png', videoUrl: '../assets/videos/medium/actions/cook.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/cook.htm',
  },
  // CHEF removed from words[]/SIGNS (2026-09-03 classifier conflict
  // audit, see CATEGORIES comment above) — COOK is the kept trained
  // entry for this sign.
  {
    id: 'medium_professions_DENTIST', level: 'medium', category: 'professions', signId: 'DENTIST', title: 'Dentist', order: 9,
    description: 'Form an \u2018X\u2019 handshape and tap it near your mouth twice, as if tapping a tooth, then add the PERSON ending by sliding both flat hands straight down in front of you.',
    tips: [
      'The tapping doesn\u2019t actually touch a tooth \u2014 it stays just in front of the mouth',
      'Some signers initialize the whole sign with a \u2018D\u2019 handshape instead and skip the PERSON ending',
      'In casual conversation, just the tooth-tap sign alone is often enough to mean "go to the dentist"',
    ],
    imageUrl: '../assets/images/medium/professions/dentist.png', videoUrl: '../assets/videos/medium/professions/dentist.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/d/dentist.htm',
  },
  {
    id: 'medium_professions_MECHANIC', level: 'medium', category: 'professions', signId: 'MECHANIC', title: 'Mechanic', order: 10,
    description: 'Hold your non-dominant hand in a \u20181\u2019 handshape, index finger up, and use your dominant hand in a \u2018V\u2019 handshape to grip and twist at the wrist around that finger, like turning a wrench — then add the PERSON ending.',
    tips: [
      'This is literally the sign for WRENCH, with or without the PERSON ending',
      'With enough context, many signers drop the PERSON ending and just sign WRENCH',
      'The same sign, in the right context, can also mean "plumber"',
    ],
    imageUrl: '../assets/images/medium/professions/mechanic.png', videoUrl: '../assets/videos/medium/professions/mechanic.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/m/mechanic.htm',
  },
  {
    id: 'medium_professions_CARPENTER', level: 'medium', category: 'professions', signId: 'CARPENTER', title: 'Carpenter', order: 11,
    description: 'Slide your dominant hand forward across your flat non-dominant palm, like pushing a carpenter\u2019s hand plane across a board, then add the PERSON ending.',
    tips: [
      'The forward-back-forward sliding motion is what represents "planing" wood',
      'Palm orientation faces to the side, not straight back \u2014 that\u2019s what distinguishes it from CREDIT CARD, which looks similar',
      'With enough context, "MY DAD CARPENTRY" can stand in without the PERSON ending',
    ],
    imageUrl: '../assets/images/medium/professions/carpenter.png', videoUrl: '../assets/videos/medium/professions/carpenter.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/c/carpenter.htm',
  },
  {
    id: 'medium_professions_LAWYER', level: 'medium', category: 'professions', signId: 'LAWYER', title: 'Lawyer', order: 12,
    description: 'Tap an \u2018L\u2019 handshape against your open non-dominant palm, then add the PERSON ending by sliding both flat hands straight down in front of you.',
    tips: [
      'This is the LAW sign (abbreviated to one tap) plus PERSON',
      'A single smack of an \u2018L\u2019 hand against the palm without the PERSON ending can instead mean "against the law" or "forbidden"',
      'The full LAW sign (used on its own) taps twice, moving slightly down the palm each time',
    ],
    imageUrl: '../assets/images/medium/professions/lawyer.png', videoUrl: '../assets/videos/medium/professions/lawyer.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/l/lawyer.htm',
  },
  {
    id: 'medium_professions_SOLDIER', level: 'medium', category: 'professions', signId: 'SOLDIER', title: 'Soldier', order: 13,
    description: 'Stack both hands in loose fists near the side of your chest, one above the other, and tap them against your body twice, like holding a rifle strap across your torso.',
    tips: [
      'Hands stay stacked, not side by side',
      'The tapping motion is a firm double "thump," not a light touch',
      'The same sign covers ARMY and "military" more generally',
    ],
    imageUrl: '../assets/images/medium/professions/soldier.png', videoUrl: '../assets/videos/medium/professions/soldier.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/a/army.htm',
  },
  {
    id: 'medium_professions_WAITER', level: 'medium', category: 'professions', signId: 'WAITER', title: 'Waiter', order: 14,
    description: 'Slide one open hand forward while pulling the other back, alternating as if handing out plates of food, then add the PERSON ending.',
    tips: [
      'The alternating forward-and-back motion is the SERVE sign',
      'In some regions (especially California) a one-handed "circling horns" sign is used instead',
      'With context, many signers skip the PERSON ending altogether',
    ],
    imageUrl: '../assets/images/medium/professions/waiter.png', videoUrl: '../assets/videos/medium/professions/waiter.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/waiter.htm',
  },
  {
    id: 'medium_professions_ARTIST', level: 'medium', category: 'professions', signId: 'ARTIST', title: 'Artist', order: 15,
    description: 'Trace your dominant pinky (\u2018I\u2019 handshape) down your non-dominant palm a couple of times, like sketching with a pencil, then add the PERSON ending.',
    tips: [
      'This is the sign for DRAW/ART with the PERSON ending attached',
      'The tracing motion happens on the flat non-dominant palm, which acts like a canvas',
      'The same base sign can shift toward PAINT or DESIGN with small changes in movement',
    ],
    imageUrl: '../assets/images/medium/professions/artist.png', videoUrl: '../assets/videos/medium/professions/artist.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/a/artist.htm',
  },
  {
    id: 'medium_professions_WORKER', level: 'medium', category: 'professions', signId: 'WORKER', title: 'Worker', order: 16,
    description: 'Tap your dominant fist on top of your non-dominant fist a couple of times, palms facing down, then add the PERSON ending by sliding both flat hands straight down in front of you.',
    tips: [
      'This is the WORK sign followed by PERSON',
      'WORK on its own (without PERSON) is often used to mean "job" in context',
      'Related signs like PROFESSION or CAREER use a different motion \u2014 don\u2019t mix them up',
    ],
    imageUrl: '../assets/images/medium/professions/worker.png', videoUrl: '../assets/videos/medium/professions/worker.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/w/work.htm',
  },
  {
    // OWNER combines the ASLU-documented OWN sign (own.htm) with the
    // standard PERSON agent suffix, the same construction pattern used
    // throughout this file (see TEACHER, FARMER, DRIVER, DENTIST, LAWYER,
    // ARTIST, WORKER above) — no separate dedicated "owner" page exists on
    // ASLU, but this is a standard, well-documented compound, not an
    // invented sign.
    id: 'medium_professions_OWNER', level: 'medium', category: 'professions', signId: 'OWNER', title: 'Owner', order: 17,
    description: 'Starting a couple of inches off your chest, bring your dominant hand \u2014 moving from an "unscrewing" shape into a flattened \u2018O\u2019 \u2014 in to touch your chest, then add the PERSON ending.',
    tips: [
      'The OWN sign by itself already carries a sense of "belonging to me/you" \u2014 adding PERSON turns it into a title, "the owner"',
      'MYSELF can substitute for "my own" in casual conversation',
      'Not to be confused with BOSS, which taps a clawed hand on the shoulder instead',
    ],
    imageUrl: '../assets/images/medium/professions/owner.png', videoUrl: '../assets/videos/medium/professions/owner.mp4', detectionType: 'motion',
    referenceUrl: 'https://www.lifeprint.com/asl101/pages-signs/o/own.htm',
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