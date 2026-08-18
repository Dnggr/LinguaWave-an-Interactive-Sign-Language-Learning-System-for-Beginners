# AI_MEMORY.md — Read this first

> **For any AI assistant (Claude, ChatGPT, Copilot, etc.) working on this
> repo:** read this file before making changes. It's the running memory
> of decisions, conventions, and open threads across AI-assisted sessions
> on this project, so you don't have to re-derive them from scratch or
> contradict a decision that was already made deliberately.
>
> **Read in this order:** (1) this file, (2) `PIVOT_CHECKLIST.md` — what's
> done vs. not on the in-progress curriculum pivot, (3)
> `SYSTEM_ARCHITECTURE.md` — full system design, most relevantly the
> **Rev 4** section the checklist tracks. Don't propose changes to lesson
> ordering, `data.js`, `learn.js`, `progress.js`, or `auth.js` without
> checking the pivot's status in those two files first.
>
> **After you make a change**, add a short entry to the "Session Log" at
> the bottom — date, what changed, what's still open. Keep entries brief;
> this is a changelog, not a transcript.

---

## 0. 🚧 ACTIVE PIVOT — Curriculum restructure (read this before touching `data.js`, `learn.js`, `progress.js`, or `auth.js`)

**Status: Phase 1 (`data.js` restructure) complete (2026-08-18); Phases
2–7 not started.** The capstone adviser reviewed the project and directed
a restructure of how content is organized. The full plan lives in
`SYSTEM_ARCHITECTURE.md` → **Rev 4** — read that section before making
any change to lesson ordering, progress/unlock logic, or the signup flow.
**`PIVOT_CHECKLIST.md`** (repo root, alongside this file) tracks execution
phase-by-phase — check it before starting work to see what's already
done, and update it in the same session you complete an item. Short
version:

- **Old model (Rev 1–3, as currently built):** three separate,
  user-selectable "levels" (`basic`/`medium`/`intermediate`) chosen at
  signup, each its own track with its own final assessment.
- **New model (adviser-directed):** LinguaWave is **all "Basic ASL"** —
  there is no separate intermediate/advanced tier the learner picks.
  Everything lives on **one linear path** that progressively combines what
  was already taught — the way a typing tutor drills `A S D F`
  individually before combining them into `ASDF`/`FDSA`. Concretely:
  *background → letters → your own name fingerspelled → numbers →
  everyday essential words → thematic vocab → phrases chained from
  already-known words → (future: conversations).*
- **Reference app:** the adviser pointed at lingvano.com's lesson/quiz
  format as the model to imitate (tight teach→quiz loop, video
  identification, multiple choice, fingerspelling challenges, an optional
  live camera "mirror" check that is practice, not a pass/fail gate).
  LinguaWave's Round 3 Camera Check already matches that pattern — see
  Rev 4 §Assessment for what else needs to change.
- **Internal field names are NOT changing.** `level`/`category` in
  `data.js`, `dictionary.js`, and every `?level=X` URL param stay exactly
  as they are — they become an internal grouping key, not a user-facing
  "choose your level" concept. Don't rename them wholesale; see Rev 4's
  "Data model / migration strategy" for why.
- **A previously-undocumented gap surfaced while planning this:** `food`,
  `clothes`, `health`, `feelings`, `colors`, `money`, `animals`, and
  `amounts` all have full `data.js` `SIGNS` content but **zero matching
  `SIGN_DICTIONARY` entries** — confirmed by grep across `dictionary.js`.
  Only `family`, `places`, `time`, and `temperature` have real detection
  behind them among the `medium`-level categories today. All 17
  non-`greetings_intro` `intermediate` phrase categories (~100 sentences)
  have the same gap. This isn't a bug to fix blindly — see Rev 4's
  "Suggested removals" for the recommendation (demote to a read-only
  Phrasebook rather than pretend they're gradeable).
- **Before writing code against this:** confirm with Joshua which
  implementation phase to start on — Rev 4 lists them in priority order.
  Nothing in `data.js`/`learn.js`/`progress.js`/`auth.js` has changed yet;
  this was a planning-only session.


## 1. What this project is

LinguaWave — a browser-based ASL learning app. Static HTML/CSS/JS
(no build step, no framework), Firebase planned but auth currently runs
in bypass/mock mode. Real-time hand-sign detection runs client-side via
MediaPipe (hand + face landmarks) + two TensorFlow.js models.

**⚠️ `README.md` is stale in places** — it describes an earlier pitch
("no gesture recognition, static images/video only") that no longer
matches reality. `SYSTEM_ARCHITECTURE.md` is the actively-maintained,
accurate developer-handoff doc (see its Rev 2/Rev 3 changelog at the
top) — trust that one over the README for anything about how detection,
assessment, or progress actually works today.

## 2. Core architecture, in one pass

- **`js/data.js`** — all lesson content: `CATEGORIES` (level + category
  metadata) and `SIGNS` (per-sign title/description/tips/media). This is
  the thing a non-engineer edits to add content. `window.LWData` exposes
  `getSign`, `getCategorySigns`, `getCategoriesForLevel`, `getCategory`.
- **`js/engine/dictionary.js`** — `SIGN_DICTIONARY`: one entry per
  detectable signId, mostly `{ fingerStates, description, category,
  imageFile, detectionType? }`. **`detectionType` defaults to `'static'`
  when omitted** (see `getDetectionType()`) — only set it explicitly to
  `'motion'`.
  **Important:** `fingerStates`, `tiebreakers`, and `tbWeight` are NOT
  read by any matching/classification code anywhere in the codebase
  (confirmed by grep across `js/`) — they're descriptive leftovers from
  an earlier geometric-matching approach, now fully superseded by the
  trained TF.js models. Don't spend effort hand-tuning them precisely;
  get the `description`/`category`/`detectionType` right, those are what
  actually drive behavior (and what the learner sees, for `description`
  via `data.js`).
- **`js/engine/classifier.js`** — loads `asl_static_model/` and
  `asl_motion_model/` from disk via `fetch`, **dynamically**, at
  whatever class count/order `labels.json` says. No hardcoded class
  counts anywhere in this file. Practical upshot: **adding new trained
  classes to a model is a data-only change** — replace `labels.json` +
  `model.json` + the weights `.bin` in the right model folder — *as
  long as* the label strings in the new `labels.json` exactly match the
  keys you add to `SIGN_DICTIONARY` in `dictionary.js`. If they don't
  match, `classifyGesture()`/`classifyMotion()` silently treats that
  class as "no match" (see the `SIGN_DICTIONARY[rawLabel]` lookup).
- **Two models, chosen by whether a sign involves movement**:
  `asl_static_model` (single-frame handshape) vs `asl_motion_model`
  (40-frame sequence, LSTM-ish). A sign's `detectionType` in
  `dictionary.js` decides which one lesson.js/classifier.js uses for it.
- **`js/learn.js`** — renders the lesson picker grid. `level=basic` is
  special-cased (flat single-character grid, not the card-per-category
  grid that medium/intermediate use) — see §3 below, this mattered for
  the Numbers rollout.
- Category field on a `SIGNS` entry **must be set explicitly** for
  anything beyond the original alphabet — the auto-backfill in
  `data.js` (`SIGNS.forEach(s => { if (!s.category) ... })`) only
  defaults *unset* `basic`-level entries to `'alphabet'`, so a second
  `basic` category (like `numbers`) needs `category: 'numbers'` written
  on every one of its `SIGNS` entries or it'll get miscategorized.

## 3. Established conventions (follow these, don't reinvent)

- **Comment tags**: this codebase already has a consistent in-code
  changelog style — `NEW`, `CHANGED`, `BUGFIX`, `REV N`, `BUG N FIX`,
  each with a short "why" right above the code it touches. Keep using
  this style for new edits so the history stays greppable
  (`grep -rn "CHANGED\|BUGFIX\|NEW —"`).
- **Data-driven over hardcoded**: `getCategorySigns`, `getDetectionType`,
  `getCategoriesForLevel` etc. exist specifically so UI code doesn't
  need level/category-specific branches. When adding content, prefer
  extending `data.js`/`dictionary.js` over adding `if (category ===
  'x')` branches in UI files — and when you DO have to branch (see
  `js/learn.js`'s `BASIC_LABEL_PREFIX`), keep it as a small lookup table
  keyed by category id, not a chain of conditionals, so the next
  category is a one-line addition.
- **Single-character signId is not a synonym for "is a letter."** This
  bit LinguaWave once already — `js/lesson.js` used to render any
  `sign.length === 1` as `Letter ${sign}`, which broke the instant
  Numbers (also single-character signIds, `'0'`–`'9'`) were added. Fixed
  by branching on `category` instead. If you add another basic-level
  category with short signIds, extend the `singleCharPrefix` lookup in
  `lesson.js` and `BASIC_LABEL_PREFIX` in `learn.js` rather than
  re-introducing a length check.
- **`level=basic` UI is NOT auto-generic like medium/intermediate.**
  `js/learn.js`'s `renderCategories()`/`renderWordPicker()`
  (card-per-category + word-picker screen) is what medium/intermediate
  use, and it's fully generic — a new category there needs zero code
  changes. `level=basic` instead uses `renderBasicCategory()`, a flat
  single-char grid with a small sub-tab switcher between basic
  categories (Alphabet/Numbers today). This was a deliberate choice to
  preserve the existing alphabet UX (compact single-letter tiles, the
  Module 1 intro banner) rather than force it into the card-grid style.
  If a THIRD basic-level category gets added, it'll show up in the
  sub-tab switcher automatically (it loops over
  `getCategoriesForLevel('basic')`) — no learn.js changes needed unless
  it also wants a `BASIC_LABEL_PREFIX` entry.

## 4. Open threads / known gaps

- **Numbers (0–9) category — added, but classification won't work
  until the retrained static model is actually dropped in.** See
  the "Numbers category" entry in the Session Log below for the full
  checklist. Short version: `asl_static_model/{labels.json,model.json,
  group1-shard1of1.bin}` need to be replaced with versions retrained on
  0–9 in addition to the existing letters, with label strings exactly
  `'0'`...`'9'`. Image/video assets at `assets/images/basic/0.png`...
  `9.png` (and matching `.mp4`s) also don't exist yet — same pattern as
  the letter assets.
- **ASL "10" is a motion sign** (twisting thumbs-up shake) — now
  reflected in `capture.html`'s `MOTION_SIGNS` (moved there 2026-08-17,
  see Session Log). **Still not wired into `dictionary.js` or
  `data.js`** — capture.html can record it, but the live app has no
  `SIGN_DICTIONARY['10']` entry yet, so it can't be detected or shown
  in a lesson until that's added (same gap 0–9 originally had).
- Motion model has no "background/not a sign" class, so noise can get
  confidently misclassified — flagged as a known limitation in
  `classifier.js`'s comments (search `MATCH_THRESHOLD`), not yet fixed.
- `js/feedback.js` still has a `TODO` to actually write survey answers
  to Firestore — currently just `console.log`s them.
- Several `medium`/`intermediate` categories are `comingSoon: true`
  with a `words` preview but no real `SIGNS` entries or trained model
  data yet (by design — see the comment block at the top of the
  `CATEGORIES` array in `data.js`).

## 5. Model / label reference (keep this in sync when models change)

| Model | Folder | Classes today | Feature vector |
|---|---|---|---|
| Static | `asl_static_model/` | A–Y minus J,Z (25, incl. `NONE`) | 130-wide (see `classifier.js` header) |
| Motion | `asl_motion_model/` | J, Z, ~30 words (33, incl. `NONE`) | 40 frames × 130 |

Both are Keras-3-exported, loaded via a custom compat loader in
`classifier.js` (`loadKeras3CompatModel`) that patches `DTypePolicy` and
`InputLayer` config quirks — don't "simplify" that loader without
checking it still round-trips a fresh Keras 3 export.

---

## Session Log

### 2026-08-17 — Numbers category (0–9) added to Basic level
**Requested:** add a "numbers" category to the basic level; also asked
whether numbers are motion or static, and whether newly-added trained
data was already wired up.

**Findings:**
- The uploaded repo snapshot's `asl_static_model/labels.json` and
  `asl_motion_model/labels.json` still only show the original classes —
  no numbers present anywhere in either. Whatever was retrained locally
  isn't reflected in what was shared, so it couldn't be wired in as-is.
- ASL numbers 0–9 are static (held handshapes, no motion) — same model
  family as the alphabet, not a separate model. (10+ does involve
  motion; out of scope here, see §4 above.)

**Changes made:**
- `js/data.js` — new `{ id: 'numbers', level: 'basic', ... }` category;
  10 new `SIGNS` entries (`basic_0`…`basic_9`) with descriptions/tips,
  `category: 'numbers'`, `detectionType: 'static'`.
- `js/engine/dictionary.js` — new `SIGN_DICTIONARY['0']`…`['9']`
  entries, `category: 'numbers'`, no `detectionType` override (defaults
  static).
- `js/lesson.js` — fixed the `sign.length === 1 → "Letter X"` bug (see
  §3) so numbers display as "Number X", not "Letter X".
- `js/learn.js` — generalized `renderAlphabet()` into
  `renderBasicCategory(categoryId)` with an Alphabet/Numbers sub-tab
  switcher; added `numbers: '🔢'` to `CATEGORY_ICONS`; `renderLevel()`
  now respects `?category=` on `level=basic` instead of always forcing
  the alphabet view.

**Still open (needs the project owner, not more code):**
1. Replace `asl_static_model/labels.json`, `model.json`, and
   `group1-shard1of1.bin` with the retrained versions that include
   0–9. Label strings must be exactly `'0'`–`'9'`.
2. Add `assets/images/basic/0.png`…`9.png` and matching `.mp4`s (same
   convention as the letter assets) — `data.js` already points at
   these paths, they just don't exist as files yet.
3. If the actual retrained label strings turn out to be different
   (e.g. `'ZERO'` instead of `'0'`), update the keys in
   `SIGN_DICTIONARY` and the `signId` values in `data.js`'s numbers
   `SIGNS` entries to match — everything else (classifier, learn.js,
   lesson.js, quiz.js) is data-driven off those two files and needs no
   further changes.

   ### 2026-08-17 — Time category + SCHOOL wired to motion model
**Requested:** asl_motion_model was retrained with new classes for the
"time" category and SCHOOL; wire the app to actually use that data for
motion detection instead of falling back to static.

**Findings:**
- `asl_motion_model/labels.json` already included DAY, FINISH, MONTH,
  NIGHT, SCHOOL, TODAY, WEEK, and YEAR — but none had a
  `SIGN_DICTIONARY` entry, so `getDetectionType()` defaulted them all
  to `'static'` and they ran through the static model instead of the
  motion model.
- `WILL`, `BEFORE`, `NOW` are `time` signIds in `data.js` but still
  aren't in `labels.json` — left unwired, same gap as `COME`/`GO`.

**Changes made:**
- `js/engine/dictionary.js` — new `SIGN_DICTIONARY` entries for DAY,
  NIGHT, WEEK, MONTH, YEAR, TODAY, FINISH (`category: 'time'`) and
  SCHOOL (`category: 'places'`), all `detectionType: 'motion'`.
  Updated the PLACES block comment (SCHOOL no longer skipped).

**Still open (needs retraining, not more code):**
1. WILL, BEFORE, NOW need trained data in `asl_motion_model` before
   they can be wired the same way.

### 2026-08-17 — Number/letter handshape collisions: '10' moved to motion, category-scoped detection added
**Requested:** confirmed capture.html's numbers wiring was correct
(it was — see the earlier "Numbers category" entry above), then worked
through which 0–10 numbers visually collide with fingerspelling
letters, whether '10' belongs in `STATIC_SIGNS` or `MOTION_SIGNS`, and
whether a category-scoped detection rule (only match against the
active lesson's category) is a valid fix instead of forcing every
colliding number into `MOTION_SIGNS`.

**Findings:**
- Per ASLU (Dr. Bill Vicars), three numbers in the 0–10 batch are
  genuinely identical static handshapes to a letter — no amount of
  training data fixes this, since there's nothing in a single frame to
  learn: `0`≈`O`, `6`≈`W` (tap-disambiguated), `9`≈`F`
  (tap-disambiguated). `2`≈`V` is a real geometric difference (palm
  orientation: `2` signed palm-toward-self, `V` palm-forward) — that
  one the model can plausibly learn from landmarks, not a true
  collision.
- `capture.html` already had `6`/`9` correctly in `MOTION_SIGNS` (see
  its in-file comments) but still had `'10'` in `STATIC_SIGNS`. Root
  cause: `10` was checked against *letter collision* only ("no
  significant letter collision found") and cleared that check — but
  was never checked against the separate question of whether it's a
  held pose at all. It isn't: ASLU describes it as a twisting
  thumbs-up shake, so a single static frame would freeze an arbitrary
  instant of the twist, same class of problem `6`/`9` already had for
  a different reason (letter collision vs. can't-freeze-a-motion).
- **New discrepancy found, not previously documented:**
  `SIGN_DICTIONARY['6']` and `['9']` in `dictionary.js` have **no
  `detectionType: 'motion'` override** — they currently default to
  `'static'` via `getDetectionType()`. `capture.html` has been
  capturing them as motion signs for a while, but that decision was
  never propagated to the dictionary, so **the live app still routes
  '6' and '9' through the static model today.** This predates this
  session and wasn't caught until now — see Still Open below.
- `classifyGesture()`/`classifyMotion()` in `classifier.js` took a
  plain global argmax with zero category awareness, confirmed via
  `quiz.js`'s scoring (`result.label === currentSign`) and
  `lesson.js`'s practice-mode step check (`result.label !==
  expectedStep`) both comparing directly against that unrestricted
  winner. This meant a correctly-signed `6` could lose to `W` on a
  near-50/50 raw softmax call and get marked wrong — a live bug, not
  just a future risk.

**Changes made:**
- `capture.html` — moved `'10'` from `STATIC_SIGNS` to `MOTION_SIGNS`
  (alongside `6`, `9`); updated both arrays' comments to explain the
  two distinct reasons a sign lands in `MOTION_SIGNS` (letter
  collision vs. genuinely can't be held as a single frame).
- `js/engine/classifier.js` — `classifyGesture()`, `classifyMotion()`,
  `finalizeMotionWindow()`, and the shared `runMotionInference()` now
  take an optional `allowedLabels` (`Set<string>|null`) param and
  restrict softmax candidates to it **before** argmax, not after (a
  post-hoc reject-if-wrong-category check would still throw away
  correct answers ~50% of the time on a genuinely-identical-handshape
  pair). Added `getAllowedLabelsForSign(signId)` — derives the allowed
  set from `SIGN_DICTIONARY[signId].category`, reusing metadata that
  already exists rather than inventing a new "mode" concept.
- `js/quiz.js` — imports `getAllowedLabelsForSign`, builds
  `allowedLabels` from `currentSign`'s category, passes it into both
  the `classifyMotion()` and `classifyGesture()` calls. Fixes the
  scoring bug above.
- `js/lesson.js` — same pattern via a new `getActiveAllowedLabels()`
  (cached, only rebuilt when `getActiveSignId()` changes — this runs
  at detection framerate, so rebuilding the category Set every frame
  would be wasted work); threaded into all three call sites
  (`finalizeMotionWindow`, `classifyMotion`, `classifyGesture`).

**Still open (needs the project owner, not more code):**
1. **`SIGN_DICTIONARY['6']` and `['9']` need `detectionType: 'motion'`
   added.** Right now the live app still thinks they're static. Fix
   this before recording/retraining numbers, or the retrained static
   model will get trained on a `6`/`9` that shouldn't be in it.
2. **`'10'` needs to be added to `dictionary.js` and `data.js`.**
   Currently only exists in `capture.html`'s `MOTION_SIGNS` — no
   `SIGN_DICTIONARY['10']` entry, no `data.js` `SIGNS` entry. Follow
   the `0`–`9` pattern (`category: 'numbers'`), but with
   `detectionType: 'motion'` set explicitly this time.
3. Recording + retraining for the 0–10 batch still hasn't happened.
   Once retrained, check Cell 9's crossover report specifically for
   `0`↔`O` (the one collision the category-scoping fix above is
   actually load-bearing for today, since `6`/`9`/`10` no longer share
   a model with any letters at all) and `2`↔`V` (confirm the model
   actually learned the palm-orientation difference — it's a real
   signal, but hasn't been verified against real data yet).
4. The category-scoping fix depends on every relevant
   `SIGN_DICTIONARY` entry having a correct `category` — a missing
   category makes `allowedLabels` come back `null` (unrestricted),
   which silently falls back to the old unscoped behavior for that one
   sign. Not currently an issue for the alphabet/numbers, but worth
   remembering if a new basic-level category gets added without a
   `category` tag.
5. `capture.html`'s `STATIC_CATEGORIES`/`MOTION_CATEGORIES` (accordion
   UI groupings) still have no `numbers` entry — numbers fall into the
   `➕ Custom Signs` catch-all there. Noticed in passing, not a
   detection bug, just a capture-tool UX gap.

### 2026-08-17 — Adviser-directed curriculum pivot: deep planning session (no code changed)
**Requested:** capstone adviser reviewed the project and directed a
restructure — see the adviser's framing in the request: "everything should
be basic ASL, but progressively upgrading," with a typing-tutor analogy
(learn `A S D F` individually, then combinations `ASDF`/`FDSA`) and an
explicit flow: background → letters → name fingerspelling → numbers →
essential words → common words → basic phrases → etc. Asked to use
lingvano.com's lesson/quiz format as a reference, make the system more
interactive, do deep planning before writing code, and update this file +
`SYSTEM_ARCHITECTURE.md` so future AI sessions have the context.

**Findings (nothing here changes behavior, all read-only investigation):**
- The three-level (`basic`/`medium`/`intermediate`) structure the app
  already has maps cleanly onto the adviser's desired flow if reframed as
  ONE ordered path instead of three user-selectable tracks — see Rev 4 in
  `SYSTEM_ARCHITECTURE.md` for the full unit-by-unit mapping.
- `HELLO` and `THANK YOU` in `dictionary.js` are already trained
  (`SIGN_DICTIONARY`, no `disabled` flag). Fifteen more "essential word"
  entries (`PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`,
  `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`) and
  five phrase entries (`NICE TO MEET YOU`, `HOW ARE YOU`, `WHERE IS`,
  `I AM LEARNING`, `WHAT IS YOUR NAME`) already exist as **placeholder
  entries with `disabled: true`** — someone already scaffolded exactly the
  "essential words" + "basic phrases" content the adviser is asking for;
  it just needs capture + retraining, not new architecture.
- Confirmed via grep: `food`, `clothes`, `health`, `feelings`, `colors`,
  `money`, `animals`, `amounts` (all `medium`-level) and all but one
  `intermediate`-level category (`greetings_intro` also has no
  `SIGN_DICTIONARY` entries, correction — **none** of the 18
  `intermediate` categories do) have `data.js` content but **no
  `SIGN_DICTIONARY` entry at all** — not disabled placeholders, just
  absent. These categories currently cannot be camera-checked; only their
  MC/Identification quiz rounds would ever work. This was invisible until
  now because nothing had cross-referenced `data.js` against
  `dictionary.js` category-by-category before.
- The phrase-chaining engine (`sequence` field, built into `lesson.js`
  earlier this month) already proves the exact mechanism a "Basic
  Phrases" unit needs — chain already-trained words instead of training
  full-sentence motion — via its two demo entries `CAR_SPELL` and
  `HOME_WORK_DEMO`. Nothing new needs to be invented for Unit 6 below,
  just real content swapped in for the demo placeholders.

**Changes made:** none to app code. Added AI_MEMORY.md §0 (this pivot's
status/pointer) and SYSTEM_ARCHITECTURE.md's Rev 4 section (full plan:
unit map, data-model changes, assessment changes, progress/unlock
changes, suggested additions/removals, phased implementation order, open
questions for Joshua).

**Still open (needs Joshua's go-ahead on which phase to start, see Rev 4's
"Implementation phases"):**
1. `data.js` restructure — add `UNITS`, tag categories with `unit`,
   Unit 0 intro content, promote `sequence_demo` to real content.
2. Name-fingerspelling interactive drill (new, no retraining needed).
3. `progress.js` unlock-chain flattening + storage key bump.
4. `learn.js` trail-view UI rewrite.
5. `auth.js`/`index.html` — remove the proficiency-level picker at signup.
6. `quiz.js` — tighter teach→quiz loop, new sign-ordering question type.
7. Capture + retrain: Essential Words placeholders, Numbers 6/9/10
   motion-type fix (this last one was already an open item pre-pivot).

### 2026-08-18 — Pivot Phase 1: `data.js` restructure
**Requested:** answered the three Phase 0 open questions (progress
migration: accept reset; Unit 0 content: static text; Unit 5 order: only
the 4 trained sub-categories, rest `comingSoon`), then do Phase 1 per
`PIVOT_CHECKLIST.md`.

**Changes made (all in `js/data.js`, nothing else touched — Phase 1 is
explicitly scoped to this one file):**
- New top-level `UNITS` array — `{ id, order, title, kind }`, 8 entries
  (0=Welcome through 7=Phrasebook), placed above `CATEGORIES`. Added a
  4th `kind` value, `'reference'` (for Unit 7/Phrasebook), beyond the
  three (`'info'|'category-group'|'interactive'`) named in Rev 4's data
  model note — flagging this for Joshua/adviser sign-off, since
  Phrasebook is neither gradeable nor a plain info screen and didn't
  fit any of the three cleanly.
- New `UNIT0_CONTENT` array — 4 static-text sections (what ASL is, how
  Camera Check practice works, 2 Deaf-culture notes). Per Joshua's
  answer this is static text, not the `capture.html` video panel. No
  screen renders this yet — building the actual Unit 0 "info" screen is
  Phase 4 UI work, this only adds the content.
- Every one of the 34 `CATEGORIES` entries got a new `unit` field
  matching the Rev 4 Unit Map table: `alphabet`→1, `numbers`→3,
  `requests`→4, `family`/`places`/`time`/`temperature`/`food`/`clothes`/
  `health`/`feelings`/`amounts`/`colors`/`money`/`animals`→5,
  `sequence_demo`→6, all 18 `intermediate` categories→7.
- Unit 5's 8 untrained sub-categories (`food`, `clothes`, `health`,
  `feelings`, `amounts`, `colors`, `money`, `animals`) flipped
  `comingSoon: false → true` per Joshua's answer. `family`/`places`/
  `time`/`temperature` (the 4 with real `SIGN_DICTIONARY` coverage)
  stay `comingSoon: false`. Implemented as a comingSoon split, not an
  `order`-integer reorder — the trained four already have lower `order`
  values than the untrained eight, so display order was already correct
  without renumbering. **Flag for Joshua:** if a literal array-position
  reorder was intended instead of a comingSoon split, this needs
  revisiting.
- `sequence_demo` title softened from `'Sequence Practice (Demo)'` to
  `'Basic Phrases (Demo content)'`, tagged `unit: 6`, and given an
  explicit `TODO(Phase 7)` comment. **Did not** rename the `id` or fully
  drop the demo framing — per the checklist's own wording this can stay
  a TODO marker until Phase 7 swaps in real phrases; renaming the `id`
  now would've meant also touching every place `'sequence_demo'` is
  referenced (`lesson.js`'s phraseSteps, any `?category=sequence_demo`
  link) for no functional gain yet.
- Added two small helper functions, `getUnits()` and
  `getCategoriesForUnit(unitOrder)`, and exported `UNITS`/`UNIT0_CONTENT`
  plus the two new helpers via `window.LWData`. Not consumed by any UI
  yet (that's Phase 4) — added now so Phase 4 doesn't need a `data.js`
  change too.
- Ran `node --check` on the resulting file — no syntax errors. Did not
  run the app in a browser (no dev server / browser tool available in
  this session) — **recommend Joshua load `learn.html` once after
  pasting this in**, just to confirm nothing that reads `CATEGORIES`
  chokes on the new `unit` field it wasn't expecting (everything that
  reads `CATEGORIES` today uses `.level`/`.id`/`.order`/`.comingSoon`,
  not `.unit`, so this should be additive-only, but wasn't executed to
  confirm).

**Bugs/risks noticed, not fixed (out of scope for Phase 1, or need your
call):**
1. The `requests` category (unit 4) still has `comingSoon: false` even
   though most of its `words` list beyond `HELLO`/`THANK YOU` traces
   back to `dictionary.js` placeholders with no real detection yet
   (`disabled: true`). Left as `false` since it partially works today —
   flagging in case you'd rather it match the Unit 5 categories'
   treatment.
2. Confirmed again (same as the pre-existing `AI_MEMORY.md` §4 gap
   note): `food`/`clothes`/`health`/`feelings`/`colors`/`money`/
   `animals`/`amounts` and all 18 `intermediate` categories have zero
   `SIGN_DICTIONARY` entries. Not a Phase 1 fix — captured here only
   because the `comingSoon` flip above is the first place that gap
   became user-visible instead of just a silent camera-check failure.
3. No validation exists anywhere that a `CATEGORIES` entry's `unit`
   value actually matches an entry in `UNITS[].order` (typo risk for
   future edits) — didn't add a runtime check since Phase 1 didn't ask
   for one; worth a one-line assertion in Phase 4 when `learn.js`
   starts actually consuming `UNITS`.

**Still open (per checklist — next is Phase 2):**
1. Phase 2 — Fingerspell Your Name interactive drill.
2. Phase 3 — `progress.js` unlock-chain flattening, storage key bump to
   `lw_progress_v3` (Joshua already answered: accept a reset, no
   migration shim needed).
3. Phase 4 — `learn.js` trail-view UI (this is also where `UNIT0_CONTENT`
   actually gets rendered for the first time).
4. Phases 5–7 unchanged from before this session.