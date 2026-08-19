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

**Status: Phase 1 (`data.js` restructure), Phase 2 (Fingerspell Your
Name drill), Phase 3 (`progress.js` unlock-chain flattening), and
Phase 4 (`learn.js`/`dashboard.js` trail-view UI) complete (all
2026-08-18); Phases 5–7 not started.** The
capstone adviser reviewed the project and directed
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
  As of Phase 4, `learn.js`/`dashboard.js` now render the trail
  described above; `data.js`/`progress.js`/`auth.js` are otherwise as
  Phases 1–3 left them.
- **Flagging for review (Phase 4):** rendering the trail's
  locked/current/done nodes required reintroducing real per-category
  locking in `learn.js` — this REVERSES a deliberate Rev 3 product
  decision ("categories should never be locked", see the BUGFIX comment
  that used to be in the old `renderCategories()`). It's what Rev 4's
  plan asks for, but it's a real, visible behavior change (no more
  freely browsing ahead into medium/intermediate content) that's worth
  a second look before this ships. See the Phase 4 session log below
  for the full reasoning.


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
- **`js/learn.js`** — renders `pages/learn.html`. As of Phase 4, this is
  a single scrollable **trail** over `window.LWData.getUnits()`
  (locked/current/done nodes), not a per-level screen — see §3 below
  and the Phase 4 session log for the full view breakdown.
- **`js/dashboard.js`** — as of Phase 4, renders one aggregate progress
  card + one row per unit (via `window.LWProgress.getOrderedLiveCategories()`
  and `window.LWData.getUnits()`), not three basic/medium/intermediate
  cards.
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
  by branching on `category` instead. If you add another flat-grid
  category with short signIds, extend `singleCharPrefix` in
  `lesson.js` AND, in `learn.js`, both `BASIC_LABEL_PREFIX` (label text)
  and `FLAT_GRID_CATEGORIES` (which categories use the flat grid at
  all — added Phase 4, since the flat-grid-vs-picker choice used to be
  implicit in `level === 'basic'` and isn't anymore) rather than
  re-introducing a length check.
- **The trail (`learn.js`, as of Phase 4) is unit-scoped, not
  level-scoped.** `renderUnitCategoryList()`/`renderCategoryCard()`
  (the "pick a category" screen + card) are what any unit with more
  than one category uses (today: Unit 5 Common Things & People, Unit 7
  Phrasebook) — fully generic, a new category in one of those units
  needs zero `learn.js` changes. A unit with exactly one category
  (Alphabet, Numbers, Everyday Essentials, Basic Phrases) skips that
  screen entirely — `renderUnitView()` opens the category directly. If
  a unit's category count changes (e.g. Everyday Essentials grows past
  one), this happens automatically — nothing to update by hand,
  `renderUnitView()` branches on `getCategoriesForUnit(unit.order).length`
  every time, not a hardcoded list.

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
- **(Phase 4) `pages/intro-to-asl.html` and Unit 0's `UNIT0_CONTENT`
  screen now overlap.** Both cover "intro to ASL" ground (history/Deaf
  culture vs. a shorter welcome blurb). Phase 4 didn't merge or retire
  either — Unit 0's screen links out to `intro-to-asl.html` ("Want
  more? Read the full Introduction to ASL") rather than duplicate its
  content. Worth a decision at some point: keep both (current state),
  fold `intro-to-asl.html`'s content into `UNIT0_CONTENT`, or the
  reverse. Not resolved unilaterally — flagging for Joshua.
- **(Phase 4) Level Final Assessment CTAs have no UI entry point from
  `learn.js` anymore.** The trail is cross-level (a unit can span or
  sit between levels), so there was no honest per-level slot left to
  put the old `renderLevelFinalCTA()` in — it was dropped rather than
  forced into a screen it doesn't conceptually belong to.
  `recordLevelAssessment`/`isLevelFinalUnlocked`/`quiz.html?final=1`
  and `quiz.js`'s own "Next Level" CTA (shown after a category-final
  pass) are all untouched and still work — level finals just aren't
  reachable from the trail directly anymore. This is exactly the open
  question Phase 3's session log already flagged for Phase 6 to
  resolve (keep as a per-level concept, redesign as a trail-wide
  review, or retire) — Phase 4 didn't preempt it, just made the gap
  more visible.
- **(Phase 4) Category locking is real again, and deep links now
  enforce it.** `learn.js?category=X` / `?unit=X` bounce to the trail
  root if `X` is locked or `comingSoon` — see `renderCategoryView()`'s
  BUGFIX comment in `learn.js` for the two gaps this closed (one
  pre-existing from before Phase 4, one new this phase). If a future
  phase adds ANOTHER way to reach a category (e.g. a search box),
  route it through `renderCategoryView()` rather than calling
  `renderBasicCategoryGrid()`/`renderWordPicker()` directly, or it'll
  bypass this check.

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

**Still open (per checklist at the time — see the 2026-08-18 Phase 2
entry below for what's since been done):**
1. Phase 2 — Fingerspell Your Name interactive drill.
2. Phase 3 — `progress.js` unlock-chain flattening, storage key bump to
   `lw_progress_v3` (Joshua already answered: accept a reset, no
   migration shim needed).
3. Phase 4 — `learn.js` trail-view UI (this is also where `UNIT0_CONTENT`
   actually gets rendered for the first time).

### 2026-08-18 — Pivot Phase 2: Fingerspell Your Name (interactive drill)
**Requested:** do Phase 2 per `PIVOT_CHECKLIST.md`.

**Changes made (all in `js/lesson.js`, nothing else touched — Phase 2's
own checklist wording explicitly allows "extension of `lesson.js`" as
the implementation shape, so that's what this is; no new page/route):**
- New `isNameDrill` flag (`category === 'fingerspell_name'`), set once
  at module load alongside the existing `level`/`category` consts.
  `'fingerspell_name'` is deliberately **not** a `CATEGORIES`/`SIGNS`
  entry in `data.js` — this drill's content is the learner's own name,
  not authored curriculum, per Rev 4's "New content needed" #2.
- New `getLearnerNameLetters()` — reads `window.LWAuth.getCurrentUser()
  .name`, uppercases, strips everything outside `A`–`Z` (spaces,
  punctuation, accents, digits all drop out — fingerspelling has no
  handshape for a space), caps at `MAX_NAME_DRILL_LETTERS = 24`. A
  multi-word name collapses into one continuous letter sequence (e.g.
  "Mary Jane" → M-A-R-Y-J-A-N-E) — there's no "pause here" marker in
  the phrase-chaining pipeline, and adding one was out of scope for
  this phase. Flagging in case a word-boundary pause is wanted later.
- `computeSignOrder()` — returns the single synthetic id `['MY_NAME']`
  for the name drill, regardless of how many letters are in the name.
  The letter-by-letter walk happens *inside* that one "sign" via the
  phrase-chaining mechanism, the same way `sequence_demo`'s
  `CAR_SPELL` is one sign that internally chains C→A→R. This keeps
  every `signIdx`/`totalSigns`/Prev-Next assumption elsewhere in the
  file completely unchanged — the whole rest of the page still thinks
  it's showing "sign 1 of 1."
- `getPhraseSequence()` — the actual checklist-item-2 confirmation.
  Added one branch: if `isNameDrill && signId === 'MY_NAME'`, return
  `getLearnerNameLetters()` instead of reading `data.js`. Read every
  other consumer of the `phraseSteps`/`phraseStepIdx` state this
  seeds — `handleTryItClick`, `handlePracticeFrame`,
  `handleAssessmentFrame`, `startPhraseStep`, `updatePhrasePromptText`,
  `needsExplicitStart`, `getActiveAllowedLabels` — and confirmed none
  of them assume the array came from a `data.js` `SIGNS.sequence`
  field; they only ever read whatever plain JS array was last
  assigned. **Answer to the checklist's own question: yes, the
  pipeline accepts a runtime-built sequence, verified by tracing every
  call site** — this one function is the only place that needed a
  code change to prove it.
- `boot()` — added a friendly bail (reusing the existing `setStatus`
  pattern the "category not trained yet" branch already uses) for the
  edge case where a learner's profile name has zero `A`–`Z` characters
  (blank name, or a name typed in a script fingerspelling can't
  represent) — tells them to update their name instead of silently
  showing a broken/inert camera panel.
- `updateLessonMeta()` — several small `isNameDrill` branches:
  custom counter ("N letters" instead of "Sign 1 of 1"), custom
  title/letter badge ("Fingerspell: J O S H" / 🖊️ instead of the
  generic single-signId title logic, which has no `data.js` entry to
  read a friendly name from for `'MY_NAME'`), subtitle pulled from
  `UNITS` instead of `CATEGORIES` (`'fingerspell_name'` only exists in
  the former), back-link sent to `dashboard.html` instead of
  `learn.html?category=fingerspell_name` (that link would 404 into
  nothing meaningful until Phase 4's trail view exists), a custom
  description in the "no `signData`" branch instead of the generic
  "lesson content hasn't been written yet" message, and — the one
  decision worth flagging on its own — **the graded "🎥 Start
  Assessment" button is hidden entirely for this drill**, not wired to
  `startAssessment()`. Reason: `handleAssessmentFrame()`'s phrase
  branch is all-or-nothing — one wrong letter fails the *entire*
  attempt immediately (see that function, the `phraseSteps` block) —
  which is a bad fit for an 5–8 letter name drill, and Rev 4's
  progress-model section doesn't call for an 80%-style gate on Unit 2
  anyway. The "▶ Try it" practice button (already wired to the
  existing `handleTryItClick()`/practice-mode path, zero changes
  needed there) is forgiving instead — a missed letter retries just
  that step, which is what this drill is actually for.
- `setupNavButtons()` — Next button on the name drill reads "Back to
  Dashboard →" and routes to `dashboard.html` instead of the normal
  "Finish → Category Assessment" flow into `quiz.html`, since
  `quiz.html`'s `buildScope()` would find no `CATEGORIES`/`SIGNS`
  content for `'fingerspell_name'` and just show its empty-state
  message — not broken, but not the right destination for a drill with
  no graded assessment by design.
- Ran `node --check` on the resulting file — no syntax errors. **Not
  exercised in a real browser** (no dev server / browser tool available
  in this session, same caveat as Phase 1's `data.js` session) —
  recommend Joshua actually try the drill end-to-end once:
  `pages/lesson.html?level=basic&category=fingerspell_name`, logged in
  as a user with a name on the account. Everything above was verified
  by reading the actual call graph, not by running it.

**Bugs/things noticed, not fixed (out of scope for Phase 2, flagging
for a separate small session):**
1. `js/lesson.js`'s own Rev 3 header comment says the "Start
   Assessment" button was renamed to "🎥 Practice Check (optional)" —
   it wasn't. The literal code still sets
   `startBtnEl.textContent = '🎥 Start Assessment'` on every ordinary
   lesson page (alphabet, numbers, words, phrases). This predates this
   session and affects every lesson, not just the new name drill —
   didn't fix it here to keep this session's diff scoped to Phase 2,
   but it's a real, visible one-line mismatch worth a quick fix.
2. Confirmed (not new, but worth restating since this session read the
   whole file closely): `js/lesson.js`'s assessment mode treats a
   phrase (`phraseSteps`) as all-or-nothing — a single wrong step fails
   the whole attempt with no partial credit and no per-step retry. This
   is by design for `sequence_demo`'s existing two entries and works
   fine for a 2–3 word phrase, but would get punishing fast for
   anything longer (worth keeping in mind when Phase 7 curates real
   Unit 6 phrases — keep them short, or this behavior may need a second
   look then).
3. `MAX_NAME_DRILL_LETTERS = 24` and "strip everything outside A–Z" are
   both my judgment calls, not adviser-specified — flagging both in
   case Joshua wants different limits or wants non-Latin names handled
   some other way (there's no ASL fingerspelling alphabet for
   non-Latin scripts, so *some* fallback behavior is unavoidable, but
   the current one — silently drop unsupported characters — is a
   choice, not the only option).

**Still open (per checklist — next is Phase 3):**
1. Phase 3 — `progress.js` unlock-chain flattening, storage key bump to
   `lw_progress_v3` (Joshua already answered: accept a reset, no
   migration shim needed).
2. Phase 4 — `learn.js` trail-view UI (this is also where
   `UNIT0_CONTENT` actually gets rendered for the first time, and where
   the name drill gets a real nav entry point instead of a hand-typed
   URL — see `PIVOT_CHECKLIST.md` Phase 2's last item).
3. Phases 5–7 unchanged from before this session.
4. Phases 5–7 unchanged from before this session.

### 2026-08-18 — Pivot Phase 3: `progress.js` unlock-chain flattening
**Requested:** do Phase 3 per `PIVOT_CHECKLIST.md` — flatten the
level→category unlock nesting into one walk over `UNITS`, bump the
storage key, apply the already-answered reset-not-shim decision, and
confirm Unit 0 / the Phase 7 Phrasebook stay excluded from gating.

**Findings (read before changing anything):**
- Confirmed via grep across `js/lesson.js`, `js/quiz.js`,
  `js/dashboard.js`, `js/learn.js` that every current `LWProgress` call
  site uses the *same* function names/signatures the pre-Phase-3 file
  exported (`recordSignPracticed(level, category, signId)`,
  `recordCategoryAssessment(level, category, result)`,
  `recordLevelAssessment(level, result)`, `getCategoryProgress(level,
  category)`, `getLevelStats(level)`, `liveCategoriesFor(level)`,
  `isCategoryUnlocked(level, categoryId)`, `isLevelFinalUnlocked(level)`,
  `LEVEL_ORDER`, `PASS_THRESHOLD`, `STORE_KEY`). None of those four
  files are in scope for this phase (`learn.js` is Phase 4, `quiz.js` is
  Phase 6), so the constraint for this session was: change the
  internals freely, but don't change any public name/signature they
  depend on.
- Confirmed via grep across `js/data.js`'s `CATEGORIES` array (279
  entries) that category `id`s are unique **across the whole app**, not
  just within a level — nothing collides between e.g. `medium` and
  `intermediate`. This is what made a flat `categories: { [categoryId]:
  ... }` storage map safe — the old `level` layer in storage was never
  actually load-bearing, only the old *unlock rule* needed it.
- Re-read Rev 4's "Progress / unlock model changes" section closely:
  it asks to flatten the **unlock chain**, not to remove the level-final
  assessment feature (`recordLevelAssessment`/`isLevelFinalUnlocked`).
  That's a separate, still-per-level concept Rev 4 doesn't ask this
  phase to touch — left it working exactly as before, just moved its
  storage into its own small flat `levelAssessments` map instead of
  being buried inside the old `levels` tree.

**Changes made (all in `js/engine/progress.js`, nothing else touched —
per the checklist header's rule and the point above about not needing
to touch `learn.js`/`quiz.js`/`dashboard.js`):**
- `STORE_KEY` bumped `'lw_progress_v2'` → `'lw_progress_v3'`.
- New storage shape: `{ uid, categories: { [categoryId]: { signs,
  assessment } }, levelAssessments: { [level]: {...} } }`, replacing the
  old `{ uid, levels: { [level]: { categories: {...}, levelAssessment }
  } }`. **No migration shim** — per Joshua's already-answered Phase 0
  question, old `lw_progress_v2` data is simply left under its old key
  and never read; a returning learner's tracked progress resets under
  Phase 3. `hydrateStore()`'s Firestore-fetch fallback default was
  updated to match the new shape.
- New `getOrderedLiveCategories()` — the actual "flat walk over UNITS":
  `window.LWData.getUnits()` → filter to `kind === 'category-group'` →
  `getCategoriesForUnit(order)` for each, filtering out `comingSoon`
  and content-less categories the same way the old `liveCategoriesFor()`
  did. This is what structurally excludes Unit 0 (`kind:'info'`) and
  Unit 7/Phrasebook (`kind:'reference'`) from gating — not a special
  case, just a `kind` filter. Exported (unused by anything yet) so
  Phase 4's `learn.js` trail view doesn't have to re-derive the same
  ordering by hand.
- `isCategoryUnlocked(level, categoryId)` now walks
  `getOrderedLiveCategories()` instead of the old
  `liveCategoriesFor(level)` — this is the actual behavior change: a
  category can now be gated behind a category in a *different* level.
  Concretely verified (see below): Unit 4's `requests` (level:`medium`)
  now stays locked until Unit 3's `numbers` (level:`basic`) is passed,
  where before it would've been auto-unlocked for being first in
  `medium`. `level` param kept on the signature only for call-site
  compatibility (`js/dashboard.js`'s `renderContinueButton()` calls it
  as `isCategoryUnlocked(level, cat.id)`) — it's not used to scope the
  chain anymore.
- `recordSignPracticed`, `recordCategoryAssessment`, `getCategoryProgress`
  now key off `categoryId` alone (flat `store.categories[...]`); `level`
  params kept on every signature, accepted but unused, for the same
  call-site-compatibility reason.
- `recordLevelAssessment`/`getLevelAssessment` now read/write the new
  flat `store.levelAssessments[level]` map instead of the old
  `store.levels[level].levelAssessment` — behavior otherwise identical.
- `getAllLearnedSigns()` now walks the flat `categories` map and looks
  up each category's `level` from `window.LWData.CATEGORIES` so the
  returned `{level, category, signId}` shape is unchanged for callers
  (`js/dashboard.js`'s `renderRecap()` only reads `signId` today, but
  the full shape was kept anyway rather than narrowing the contract).
- `liveCategoriesFor(level)`, `isLevelUnlocked(level)`,
  `isLevelFinalUnlocked(level)`, `getLevelStats(level)`, `LEVEL_ORDER`,
  `PASS_THRESHOLD` — all **unchanged**, still per-level, since nothing
  in this phase asked to touch them and `dashboard.js`/`quiz.js` still
  depend on their current per-level behavior.
- Verified with a standalone mock-data Node test harness (small mock of
  `window.LWData`'s `UNITS`/`CATEGORIES`/`getCategorySigns` shaped like
  the real ones, plus a fake `localStorage`) — **not committed to the
  repo**, throwaway for this session only. It checked: the ordered
  chain correctly excludes a mock unit-0 and unit-7 (phrasebook-style)
  category and a `comingSoon` one; `isCategoryUnlocked` correctly
  cross-level-gates a unit-4 category behind a unit-3 one passing;
  `recordSignPracticed`/`getCategoryProgress`/`getLevelStats`/
  `getAllLearnedSigns`/`recordLevelAssessment` all round-trip correctly
  against the new flat shape; the raw persisted JSON has no leftover
  `levels` key. Also ran plain `node --check` — no syntax errors. **Not
  exercised against the real app in a browser** (no dev server/browser
  tool available in this session, same caveat as Phases 1–2) —
  recommend Joshua click through `learn.html` → pass a category
  assessment → confirm the next one unlocks, once this is pasted in.

**Bugs/risks noticed, not fixed (out of scope for Phase 3, flagging for
later):**
1. `hydrateStore()` destructures `window.LWAuth` (`const { db, doc,
   getDoc, getCurrentUser } = window.LWAuth;`) with no guard for
   `LWAuth` being undefined — if this script ever loads before
   `auth.js` on some page, it throws uncaught (outside the function's
   own try/catch, which only wraps the Firestore fetch below that
   line). This is **pre-existing**, not introduced by Phase 3 — the
   Rev 3 version had the identical pattern — only noticed now because
   this session's test harness didn't mock `LWAuth` at first and hit
   it directly. Every real page loads `auth.js` before
   `js/engine/progress.js` per this file's own `CONNECTS` header, so
   it's not believed to be a live bug today — just a latent one worth a
   defensive guard sometime.
2. Whether "level-final assessment" should still exist as a concept
   once the trail is one continuous path (rather than three levels) is
   an open design question this phase deliberately did NOT resolve —
   Rev 4's plan doesn't ask Phase 3 to decide it, and `quiz.js` (Phase
   6) is what actually surfaces level-finals to the learner. Flagging
   so Phase 6 doesn't assume this was already settled one way or the
   other.

**Still open (per checklist — next is Phase 4):**
1. Phase 4 — `learn.js` trail-view UI (can now use the new
   `getOrderedLiveCategories()` export directly instead of re-deriving
   the trail order from `UNITS`/`CATEGORIES` by hand).
2. Phases 5–7 unchanged from before this session.

### 2026-08-19 — Pivot Phase 4: `learn.js`/`dashboard.js` trail-view UI
**Requested:** do Phase 4 per `PIVOT_CHECKLIST.md` — replace the
three-tab switcher with a single scrollable trail over `UNITS`, render
each category as a locked/current/done node, retire
`renderBasicCategory()`/`renderCategories()`/`renderWordPicker()`'s
three-way level split in favor of one generic per-unit renderer (or
confirm reuse), and update `dashboard.html`'s progress display to
match the flat model.

**Findings (read before changing anything):**
- Confirmed via grep across `js/lesson.js`/`js/quiz.js`/
  `pages/dashboard.html`/`pages/intro-to-asl.html` that those files
  (all out of scope this phase — `lesson.js` isn't assigned to any
  remaining phase, `quiz.js` is Phase 6) still build links into this
  page as `learn.html?level=X` and `learn.html?level=X&category=Y` —
  their own old scheme, never updated. Since there's no more per-level
  screen for `?level=X` alone to land on, `boot()` now falls back to
  rendering the trail and best-effort-scrolling to a representative
  unit for that level instead of erroring or landing at a dead page.
  `?level=X&category=Y` links still resolve correctly because category
  ids are unique app-wide (same fact Phase 3 already relied on) —
  `level` is read but not needed to look the category up.
- Re-read the old `renderCategories()`'s "BUGFIX" comment (Rev 3):
  "categories should never be locked... every category with content is
  always open to browse/practice." Rev 4's checklist explicitly asks
  for locked/current/done **nodes**, which only means something if
  categories can actually be locked — so this phase reintroduces
  per-category locking via `LWProgress.isCategoryUnlocked` (already
  built cross-unit in Phase 3, just unused by any UI until now),
  deliberately **reversing** that Rev 3 decision. Flagged prominently
  in §0 above and in the code itself (`renderCategoryCard()`'s
  comment) rather than made silently — this is a real, visible
  behavior change worth a second look before it ships.
- Checked whether Unit 7 (Phrasebook)'s 18 categories are uniformly
  `comingSoon: false` with real `SIGNS` content today (confirmed via
  grep) — Rev 4's own "Suggested removals" text says "17
  non-`greetings_intro`" categories, which is slightly stale wording
  from before a later correction in this same file (§0) clarified ALL
  18 intermediate categories lack `SIGN_DICTIONARY` entries, not 17.
  Phase 1's actual code treats all 18 uniformly (`unit: 7`) — went with
  what's actually implemented over the slightly-inconsistent prose.
- Checked `pages/intro-to-asl.html` (Rev 3 content: ASL history,
  Stokoe's parameters, Deaf-culture etiquette, learning tips) against
  the new `UNIT0_CONTENT` (Phase 1, four short sections) — they
  overlap. Didn't merge or retire either; Unit 0's new screen links out
  to `intro-to-asl.html` instead of duplicating it. Flagged in §4 above
  for a real decision later.

**Changes made:**
- **`js/learn.js`** — full rewrite. Default view is now a single
  vertical trail (`renderTrail()`) walking `window.LWData.getUnits()`;
  each node's lock state comes from `getUnitState()`
  (info/interactive/reference kinds are always "available" — never
  gated; `category-group` kinds compute locked/current/done from
  `isCategoryUnlocked`/`getCategoryProgress` on that unit's live
  categories). Clicking a unit with exactly one category
  (Alphabet/Numbers/Everyday Essentials/Basic Phrases) skips straight
  to that category; a unit with more than one (Common Things & People,
  Phrasebook) opens `renderUnitCategoryList()`, a unit-scoped version
  of the old `renderCategories()`. `renderBasicCategoryGrid()`
  (formerly `renderBasicCategory()`) dropped the old
  Alphabet/Numbers sub-tab switcher — they're two separate trail units
  now, not two views of one "basic" level. `renderWordPicker()` gained
  an `isReference` mode (Phrasebook categories: no assessment CTA, no
  lock, per Rev 4's "Suggested removals" #2) and now takes a resolved
  category object instead of `(level, categoryId)`. Unit 0 renders
  `UNIT0_CONTENT` for the first time (`renderUnitInfo()`) — it existed
  in `data.js` since Phase 1 with nothing displaying it. Unit 2
  (Fingerspell Your Name) has no `learn.js` screen at all — its trail
  node is a plain `<a>` straight into
  `lesson.html?level=basic&category=fingerspell_name`, the real nav
  entry point `PIVOT_CHECKLIST.md` Phase 2's last item was waiting on.
  Replaced the old in-grid "← Back to Categories" card with ONE
  page-level back link (`#learn-back-link`, wired via `setBack()`) that
  every screen uses, context-aware (goes back one level, not always to
  the trail root — e.g. a category opened from Phrasebook's list goes
  back to that list). Removed `MODULE_GROUPS`/`renderCategories()`
  entirely — `UNITS` is itself the grouping/ordering layer now, no
  second one needed.
- **`js/learn.js` — real bugfix, found by this session's own test, not
  carried over:** added a lock/comingSoon guard directly in
  `renderCategoryView()` (the one function both the flat-grid and
  word-picker paths route through). Without it, a hand-typed or
  bookmarked `learn.html?category=X` completely bypassed both the new
  per-category locking AND (pre-existing, not new) the `comingSoon`
  check — neither the old nor the mid-session-draft code stopped a
  direct URL from rendering locked/unshipped content, only the
  picker-card UI omitted the click handler for it. Now any locked or
  `comingSoon` category deep-link bounces to the trail root instead
  (reference-mode/Phrasebook categories are exempt, by design — never
  gated).
- **`pages/learn.html`** — removed the `.level-tabs` markup (three
  Basic/Medium/Intermediate buttons). Added `#learn-context` (a small
  breadcrumb, shown/hidden per view) and `#learn-back-link` (the
  unified back link above) next to the existing "← Back to Dashboard"
  link, which is untouched. Renamed the page's intro copy to fit the
  trail framing ("Your ASL Learning Path" / "One path from the
  alphabet to full phrases...").
- **`css/learn.css`** — removed `.level-tab*` rules, `.lesson-card--back`
  (dead — no more in-grid back card), `.module-header`/`.module-section`
  (dead — `MODULE_GROUPS` is gone). Added `.trail`/`.trail-node*` (a
  single-column vertical list, not the existing auto-fill card grid —
  Rev 4 asks for a "single scrollable trail," which reads more like a
  path than a grid of tiles) and `.unit-info*` (prose block for Unit
  0's screen, same `grid-column: 1 / -1` full-width technique the old
  `.module-header` used). Kept `.lesson-card--intro` (Unit 0's link out
  to `intro-to-asl.html` reuses it).
- **`js/dashboard.js`** — full rewrite. `renderOverallProgress()`
  replaces the old per-level `renderLevelCard()`: sums
  practiced/total signs and passed/total categories across
  `window.LWProgress.getOrderedLiveCategories()` into ONE aggregate
  card. `renderUnitList()`/`renderUnitRow()` render one compact row per
  `window.LWData.getUnits()` entry (same lock-state logic as
  `learn.js`'s `getUnitState()`, kept as a small separate copy in this
  file rather than introducing a shared module just for it — judged
  lower-risk for a two-caller lookup).
- **`js/dashboard.js` — real bugfix, found by this session's own
  test, not carried over:** `renderContinueButton()` used to loop
  `LEVELS` (`basic`→`medium`→`intermediate`) and, within a level, use
  `liveCategoriesFor(level)` — sorted by each category's own in-level
  `order` field, NOT by unit. Phase 1 never renumbered `order` when it
  added `unit` (the `requests` category still has `order: 9` even
  though it's `unit: 4`, ahead of Unit 5's `family`/`places`/etc, which
  have `order: 1-4`), so that loop's `medium` pass visited `family`
  (unit 5) BEFORE `requests` (unit 4) — backwards from the real trail.
  Concretely verified with the test harness: on a fresh account with
  only Alphabet+Numbers passed, the OLD logic's shape would have
  pointed at `family`; the fixed version correctly points at
  `requests`. Fixed by walking
  `window.LWProgress.getOrderedLiveCategories()` directly instead of
  re-deriving an ordering by hand — already in the right flat order,
  doesn't need a level passed in at all.
- **`pages/dashboard.html`** — replaced the `.grid-3` of three
  `[data-level-card]` cards with one aggregate `progress-card` +
  `<div id="unit-progress-list">` (filled entirely by `dashboard.js`,
  nothing unit-specific hardcoded in the HTML).
- **`css/dashboard.css`** — removed the `[data-level-card="..."]`
  three-color-edge rules (only one `progress-card` exists now — one
  generic accent-colored edge instead). Added `.unit-progress-list`/
  `.unit-progress-row*`.
- `js/lesson.js`, `js/quiz.js`, `js/data.js`, `js/engine/progress.js`,
  `js/auth.js` — **untouched**, per the checklist header's rule and
  because Phase 4 didn't need to touch any of them (confirmed every
  `LWData`/`LWProgress` call `learn.js`/`dashboard.js` make this phase
  uses an export that already existed going into this session).

**Verified with a throwaway Node test harness (NOT committed to the
repo — same caveat as Phases 1–3, no dev server/browser tool available
this session):**
- A minimal DOM shim (`FakeElement`/`makeDocument` — just enough
  `innerHTML`/`classList`/`querySelectorAll`/`addEventListener` surface
  to run `learn.js`'s and `dashboard.js`'s actual `DOMContentLoaded`
  callbacks, not a general-purpose DOM) plus the REAL `js/data.js` and
  `js/engine/progress.js` loaded via Node's `vm` module (so this tests
  the actual shipped files, not a hand-written mock of their shape —
  a step further than Phase 3's harness took).
- `learn.js` (25 assertions): trail renders all 8 units; clicking a
  single-category unit (Alphabet) skips straight to its grid; clicking
  a multi-category unit (Common Things & People) — after seeding the
  right prerequisites — shows the picker with `family` clickable and
  `Places` visible-but-locked (chained behind `family` within the
  unit); Phrasebook categories open in reference mode (no assessment
  CTA); legacy `?level=X&category=Y` deep links resolve once unlocked
  and bounce to the trail when locked; legacy `?level=X` alone falls
  back to the trail; a `comingSoon` deep link (`?category=food`)
  bounces to the trail; Unit 4 stays locked/non-clickable on a fresh
  account and unlocks correctly; Unit 1 is open from zero progress and
  Unit 3 is locked until Unit 1 passes, then unlocks.
- `dashboard.js` (4 assertions): unit list renders without throwing on
  a fresh account, later units show `unit-progress-row--locked`, Unit 0
  and Unit 2 rows link correctly; the Continue-button bugfix above,
  verified concretely (asserted the resulting `href` contains
  `category=requests`, not `category=family`).
- Also ran plain `node --check` on both rewritten files and a brace-
  balance check on both rewritten CSS files — no syntax errors.
- **Not exercised against the real app in a browser** — recommend
  Joshua click through the full trail once this is pasted in:
  dashboard → a unit row → a category → lesson → back through the
  trail, and specifically try a stale bookmark/typed URL into a locked
  category to confirm the new bounce-to-trail behavior feels right
  rather than confusing (no toast/explanation is shown for WHY it
  bounced — just silently lands on the trail, which shows the lock
  reason via that unit's badge).

**Bugs/risks noticed, not fixed (out of scope for Phase 4, flagging
for later):**
1. `hydrateStore()`'s unguarded `window.LWAuth` destructure — same
   pre-existing issue Phase 3 already flagged, untouched again this
   phase (this session's test harness mocks `LWAuth` for exactly this
   reason, same as Phase 3's did).
2. Level Final Assessment CTAs are now unreachable from `learn.js`'s
   UI (see §4 above) — the underlying feature still works via
   `quiz.js`'s own flow, just has one fewer entry point. This is the
   open question Phase 3 flagged for Phase 6; Phase 4 made the gap
   more visible but didn't resolve it.
3. `pages/intro-to-asl.html` vs. Unit 0's `UNIT0_CONTENT` content
   overlap (see §4 above) — not merged, just cross-linked.
4. No in-app explanation for WHY a deep link bounced to the trail
   (see the "Not exercised in a browser" note above) — a toast or a
   brief inline message ("that lesson isn't unlocked yet") would be a
   nicer touch than a silent redirect, but wasn't in this phase's
   scope and didn't feel worth adding without design input.

**Still open (per checklist — next is Phase 5):**
1. Phase 5 — `auth.js`/`index.html` signup flow (remove the
   basic/medium/intermediate level picker at signup, since it's now
   vestigial — `pages/dashboard.html`'s `data-user-level` field still
   displays whatever the user picked there, untouched this phase).
2. Phase 6 — `quiz.js` (also where the Level Final Assessment open
   question from item 2 above should get resolved for real).
3. Phase 7 unchanged from before this session.