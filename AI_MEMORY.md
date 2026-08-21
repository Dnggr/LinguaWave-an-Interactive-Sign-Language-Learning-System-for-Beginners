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
Name drill), Phase 3 (`progress.js` unlock-chain flattening), Phase 4
(`learn.js`/`dashboard.js` trail-view UI, 2026-08-18/19), Phase 5
(signup-time level picker removed, 2026-08-19), and Phase 6 (`quiz.js`
assessment format changes, 2026-08-20) complete; Phase 7 (capture +
retrain, content/ML) partially done as of 2026-08-20 — the `6`/`9`/`10`
→ `detectionType: 'motion'` routing fix and the 6 curated Unit 6
phrases are both in (code-verified, see today's Session Log entry).
Actual capture + retraining for the 16 Essential Words, the 5 phrase
placeholders, and now also `HELLO`/`THANK YOU`/`HOT`/`COLD` (newly
confirmed broken this session, see Session Log) is still open and
needs a human + camera + Colab, not another AI session.** The
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
  Rev 4 §Assessment for what else needs to change. **As of Phase 6
  (2026-08-20), the teach→quiz loop is tighter** (a "Quick Check" recall
  mini-question now shows in `lesson.js` after every ~3 signs, not just
  at category end) **and the camera round supports fingerspelling/
  ordering challenges** for phrase-type signs (Unit 6), not just atomic
  signs — see that phase's Session Log entry for the full breakdown.
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
  As of Phase 4, `learn.js`/`dashboard.js` render the trail described
  above. As of Phase 5 (2026-08-19), `index.html`'s Sign Up form no
  longer has a "Starting level" picker, and `js/auth.js`'s `register()`
  no longer takes a `level` param — every new account is written with
  a fixed `level: 'basic'`. **As of Phase 6 (2026-08-20), `quiz.js`/
  `lesson.js` are no longer "fully untouched"** (see the Phase 4 flag
  below, which is now historical) — see that phase's Session Log entry.
  Only Phase 7 (content capture/retrain) remains.
- **Flagging for review (Phase 4):** rendering the trail's
  locked/current/done nodes required reintroducing real per-category
  locking in `learn.js` — this REVERSES a deliberate Rev 3 product
  decision ("categories should never be locked", see the BUGFIX comment
  that used to be in the old `renderCategories()`). It's what Rev 4's
  plan asks for, but it's a real, visible behavior change (no more
  freely browsing ahead into medium/intermediate content) that's worth
  a second look before this ships. See the Phase 4 session log below
  for the full reasoning.
- **Flagging for review (Phase 6):** the Level Final Assessment open
  question (flagged by Phase 3, made more pressing by Phase 4) is now
  **decided, not just noted**: `quiz.js` no longer offers a CTA into it
  anywhere, though the underlying mechanism is untouched and still
  works via a direct `quiz.html?final=1` link. This is a real product
  call made by an AI session, not something Joshua explicitly signed
  off on — see that phase's session log and the block comment above
  `buildActionButtons()` in `quiz.js` for full reasoning, and say the
  word if you'd rather it came back.


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
- **(Phase 5) `pages/dashboard.html`'s "Current Level" field
  (`data-user-level`) now always reads "Basic."** Not broken — just
  permanently uninformative, since `js/auth.js`'s `register()` hardcodes
  `level: 'basic'` for every new account now that there's no signup
  picker to source a real value from. Needs a product decision (repurpose
  the field to show the learner's current Unit, or drop it) — flagged,
  not fixed, see the Phase 5 session log below for why this was left for
  a follow-up rather than folded into this phase.
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

**Still open (per checklist — next was Phase 5, now Phase 6):**
1. ~~Phase 5 — `auth.js`/`index.html` signup flow~~ **✅ Done
   2026-08-19 — see the Phase 5 session log entry immediately below.**
2. Phase 6 — `quiz.js` (also where the Level Final Assessment open
   question from item 2 above should get resolved for real).
3. Phase 7 unchanged from before this session.

### 2026-08-19 — Pivot Phase 5: remove signup-time level picker
**Requested:** do Phase 5 per `PIVOT_CHECKLIST.md` — remove the
"choose your proficiency level" step from Sign Up, drop the `level`
param from `auth.js`'s `register()` (or default everyone to the same
starting point), and confirm no page still assumes a user-chosen
`level` exists at first login.

**Findings (read before changing anything):**
- `js/auth.js` is **not actually in bypass mode**, despite its own
  header comment and `index.html`'s header comment both still claiming
  it is. `login()`/`register()`/`logout()` already call real Firebase
  Auth (`signInWithEmailAndPassword`/`createUserWithEmailAndPassword`/
  `signOut`) plus a Firestore profile read/write — the bypass-mode
  versions of all three functions are present but fully commented out.
  This predates this session (not a Phase 5 regression) and isn't the
  same stale-doc issue AI_MEMORY.md already tracks for `README.md` —
  it's a second, previously-undocumented instance of the same kind of
  problem, this time in code comments rather than a whole doc.
  Corrected the one-line claim in `index.html`'s header comment since
  Phase 5 was already editing that file; did **not** rewrite
  `auth.js`'s own top-of-file docblock beyond the register() function
  it was already touching, to keep this session's diff scoped.
- Grepped every `.level` hit across `js/`, `pages/`, `index.html` to
  answer the checklist's "confirm no page assumes a user-chosen level"
  item directly (see PIVOT_CHECKLIST.md Phase 5 for the full result):
  the **only** place a *user's own* `level` is ever read is
  `js/main.js`'s `initUserDetails()`, which fills
  `pages/dashboard.html`'s `data-user-level` ("Current Level") display
  field — cosmetic only. Every other `.level` hit is `data.js`
  `CATEGORIES`/`SIGNS`' own internal grouping field (same field name,
  unrelated concept, explicitly meant to stay per Rev 4's data model
  note) — confirmed none of the trail/unlock code
  (`progress.js`/`learn.js`/`dashboard.js`) reads the user's profile
  `level` for gating or routing. This means Phase 5 was safe to do as a
  pure signup-form change with zero risk to the trail/unlock logic Phases
  3–4 built.
- `register()` had exactly one call site (`index.html`'s
  `handleRegister()`) — confirmed via grep, so dropping the param
  cleanly instead of just defaulting it was low-risk.

**Changes made:**
- `index.html` — removed the `#reg-level` `<select>` (Beginner/
  Intermediate/Advanced) and its `form-group` from the register form;
  `handleRegister()` no longer reads it or passes a 4th arg to
  `LWAuth.register()`. Corrected the header comment's stale "BYPASS
  MODE" claim (see Findings above) and added a REV 4 PHASE 5 note
  pointing at `SYSTEM_ARCHITECTURE.md`.
- `js/auth.js` — `register(name, email, password, level)` →
  `register(name, email, password)`; the written user doc now hardcodes
  `level: 'basic'` as a fixed constant instead of `level: level ||
  'basic'`. Updated the commented-out bypass-mode reference version of
  `register()` to match (same param drop), so a future bypass-mode
  restore via that comment doesn't quietly reintroduce the picker.
  `login()`, `logout()`, `onAuthStateChanged`, and every other export
  are untouched.
- Ran `node --check` on `js/auth.js` — no syntax errors. Verified
  `index.html`'s edited `<form>` still balances and confirmed via grep
  that no `reg-level`/`getElementById('reg-level')` reference survived
  the edit anywhere in the file. **Not exercised in a real browser or
  against live Firebase** (no dev server / browser tool, and Firebase's
  own domains aren't reachable from this session's sandboxed network
  either) — same caveat as every phase before this one. Recommend
  Joshua actually submit the Sign Up form once end-to-end to confirm a
  fresh account lands on the dashboard with `data-user-level` reading
  "Basic" and no console errors.

**Bugs/risks noticed, not fixed (out of scope for Phase 5, flagging
for later):**
1. **`pages/dashboard.html`'s "Current Level" field will now always
   read "Basic"** for every new signup — not broken, just permanently
   uninformative now that there's no picker feeding it a real value.
   Deliberately left `pages/dashboard.html`/`js/main.js` untouched —
   fixing this well (e.g. repurposing the field to show the learner's
   current Unit) means pulling unit-progress data into
   `initUserDetails()` or `dashboard.js`, which is a small UI feature
   in its own right, not a signup-form edit. Needs a real decision from
   Joshua (repurpose vs. remove) — see PIVOT_CHECKLIST.md Phase 5 for
   the same flag.
2. `js/main.js`'s `initLevelCards()` (toggles a `.level-card--locked`
   class on `.level-card[data-level]` elements) is now confirmed **dead
   code** — grepped every `pages/*.html` + `index.html` and found zero
   `.level-card`/`data-level=` markup left anywhere; Phase 4 already
   removed the last of it when it replaced `pages/dashboard.html`'s
   three level cards with the aggregate/unit-row layout. Harmless
   no-op today (`querySelectorAll` just finds nothing), not a Phase 5
   regression, and not touched — flagging since this session's own grep
   is what surfaced it, same as Phase 4 flagging its own bugs.
3. `js/auth.js`'s own top-of-file docblock (separate from the
   `index.html` one that was corrected) still describes bypass mode as
   the current behavior — same stale-comment issue as Finding #1 above,
   left as-is to keep this phase's diff to the `register()` function it
   was already editing.

**Still open (per checklist — next is Phase 6):**
1. Phase 6 — `js/quiz.js`: tighten the teach→quiz loop, add the
   sign-ordering/fingerspelling question type for Unit 6, and make the
   real call on Level Final Assessments (keep/redesign/retire — see
   PIVOT_CHECKLIST.md Phase 6 and SYSTEM_ARCHITECTURE.md's matching
   note, flagged since Phase 3, made more visible by Phase 4).
2. Phase 7 unchanged from before this session.
3. The "Current Level" display field and `initLevelCards()` dead code
   noted above — small, not blocking, worth a decision/cleanup
   whenever convenient (could ride along with Phase 6 or be its own
   tiny session).

### 2026-08-20 — Pivot Phase 6: `js/quiz.js` assessment format changes
**Requested:** do Phase 6 per `PIVOT_CHECKLIST.md` — (1) add a
non-blocking mini-check after each sign/cluster inside `lesson.html`,
reusing the existing Practice Check UI; (2) add a sign-ordering/
fingerspelling-challenge question type for Unit 6 (phrase-chaining via
camera instead of only 4-option MC); (3) confirm Camera Check + the
new ordering challenge both stay optional/bonus; and make the real
call on Level Final Assessments (open since Phase 3, more pressing
since Phase 4).

**Findings (read before changing anything):**
- Re-read `lesson.js`'s BUGFIX-8-reverted comment carefully before
  assuming what "Practice Check" meant: the camera Practice Check panel
  (labeled "🎥 Start Assessment" in the DOM, "Practice Check" in Rev 3
  comments — a known label mismatch, not fixed this phase either, out
  of scope) already tests exactly ONE sign, the one on screen, and is
  fully optional. That's a *different* thing from what the checklist
  item is asking for: the checklist is contrasting against `quiz.js`'s
  "10 signs then one big quiz" MC/Identification pattern, not the
  camera check. Confirmed this reading against
  `SYSTEM_ARCHITECTURE.md`'s Rev 4 wording before writing any code —
  see that file's own updated note for the interpretation actually
  used.
- Confirmed Unit 6 (`category: 'sequence_demo'`) is the only category
  today whose `SIGNS` entries have a `sequence` array (`CAR_SPELL`,
  `HOME_WORK_DEMO`) — grepped `data.js` for every `sequence:` hit.
  Confirmed `quiz.js`'s existing camera round would never have matched
  either of these: `getDetectionType()`/`classifyGesture()` look the
  signId up in `SIGN_DICTIONARY`, which has no entry for phrase-level
  ids (only their components do) — this was a real, silent gap, not
  hypothetical.
- Confirmed via `progress.js` that `getOrderedLiveCategories()` was
  already exported and that `dashboard.js`'s Phase 4 bugfix already
  established the exact pattern needed for the "next category" fix
  found while touching `buildActionButtons()` (see Bonus fix below) —
  reused that pattern rather than inventing a new one.

**Changes made:**
- `pages/lesson.html` / `css/lesson.css` / `js/lesson.js` — new "Quick
  Check" card. Shown by `showQuickCheck()` after every 3rd sign
  (`QUICK_CHECK_CLUSTER_SIZE`) and always on a category's last sign
  (`shouldShowQuickCheck()`); skipped for the name drill (no data.js
  description to quiz on) and single-sign categories.
  `buildQuickCheckQuestion()` builds a 4-option MC question the same
  way `quiz.js`'s MC round does (description as prompt, 3 random
  other signIds as distractors) — a small parallel reimplementation,
  not a shared import, since `quiz.js`'s helpers are private closures
  in a different page's module. Purely formative: no `LWProgress`
  write anywhere, never blocks `Prev`/`Next` (both already work
  regardless of whether the question was answered), has its own
  "Skip" control. CSS restates `quiz.css`'s `.quiz-option` visual
  language under a `.quick-check__` prefix rather than importing a
  second stylesheet into `lesson.html` for one component.
- `js/quiz.js` / `pages/quiz.html` — the optional camera round now
  detects phrase-type signs (`getCameraPhraseSequence()`) step by step
  in order (`cameraPhraseSteps`/`cameraPhraseStepIdx`), reusing
  `lesson.js`'s `phraseSteps`/`phraseStepIdx` mechanism rather than
  reinventing it: same per-step `classifyMotion`/`classifyGesture`
  call against the CURRENT step's expected component, same
  strict-fail-on-wrong-step behavior. Both success and failure still
  only ever write into `cameraRoundData` — the same object the plain
  atomic-sign path already used — so `computeGradedScore()` (which
  only sums `rounds`, i.e. MC + Identification) is structurally
  unaffected; added an explicit comment confirming this at the
  checklist's request (item 3) rather than just asserting it.
  `quiz.html`'s camera-gate card shows an extra note
  (`#gate-ordering-note`) when the category has a phrase item in
  scope, toggled by `showCameraGate()`.
- `js/quiz.js` — **Level Final Assessment: decided.** Retired the CTA
  (`buildActionButtons()` no longer offers "🏁 Take Level Final
  Assessment" after a category pass), kept the mechanism (`isFinal`
  branch, `finishAssessment()`'s `recordLevelAssessment()` call, and
  every `progress.js` export for this are all untouched — a bookmarked
  `quiz.html?final=1` link still works end to end). Full reasoning is
  in the block comment above `buildActionButtons()` in `quiz.js` and
  in `PIVOT_CHECKLIST.md`'s Phase 6 entry; short version: there's no
  honest per-level slot left in the flat trail to put the old CTA in,
  and a full "trail-wide review" redesign is a real new feature, not a
  small follow-on. **Flagging this as a real product decision made by
  this session**, same spirit as Phase 4's category-locking-reversal
  flag — say the word if you'd rather it came back.
- Bonus fix (not a checklist item, found while touching
  `buildActionButtons()` for the item above): the "Next Category" CTA
  on a category pass was computed from `liveCategoriesFor(level)` —
  the exact same per-level-walk bug class Phase 4 already found and
  fixed in `dashboard.js`'s `renderContinueButton()`, but `quiz.js` was
  untouched at the time (`SYSTEM_ARCHITECTURE.md` explicitly noted
  "quiz.js/lesson.js remain fully untouched" through Phase 4). Fixed
  by walking `getOrderedLiveCategories()` instead, same fix Phase 4
  already applied elsewhere. Concretely: finishing the last basic-level
  category used to silently fall back to "Back to Lessons" instead of
  correctly pointing at the next unit's first category, even though
  that category was already unlocked.
- Ran `node --check --input-type=module` on both `js/lesson.js` and
  `js/quiz.js` — no syntax errors. Cross-checked every new DOM id
  referenced from JS against the actual markup in `lesson.html`/
  `quiz.html` (`grep` both ways) and every `window.LWData`/
  `window.LWProgress` function call against their real exported
  signatures in `data.js`/`progress.js`. **Not exercised in a real
  browser** — no dev server / browser tool in this sandbox, same
  caveat as every phase before this one (webcam-dependent flows
  especially can't be verified this way). Recommend Joshua click
  through a lesson with 4+ signs to see the Quick Check card fire, and
  run Unit 6's category assessment's optional camera round (needs a
  real camera + a person actually fingerspelling/signing) to confirm
  the ordering-challenge step-through behaves as intended.

**Bugs/risks noticed, not fixed (out of scope for Phase 6, flagging
for later):**
1. The "🎥 Start Assessment" button text vs. "Practice Check" label
   mismatch noted in `lesson.js`'s own BUGFIX-8-reverted comment is
   still there — cosmetic, predates this phase, not touched.
2. The Quick Check's distractor pool (`window.LWData.SIGNS`) is
   app-wide, not scoped to the current category/level — on a small
   category this means distractors can come from a completely
   different topic (e.g. a Numbers checkpoint could offer an Alphabet
   letter as a wrong option). This mirrors `quiz.js`'s own MC round
   distractor scope exactly (also app-wide, see `buildDistractors()`),
   so it's consistent with existing behavior rather than a new
   inconsistency — flagging in case a tighter, same-category-only pool
   is preferred for both down the line.
3. Items 1–3 from the Phase 5 session log above (Current Level field,
   `initLevelCards()` dead code, `auth.js`'s stale bypass-mode
   docblock) are all still open — none were in this phase's scope.

**Still open (per checklist — Phase 6 was the last app-code phase):**
1. Phase 7 — capture + retrain (content/ML work, not app code): the 16
   Essential Words placeholders, 5 phrase placeholders, `SIGN_DICTIONARY`
   fixes for `'6'`/`'9'`/`'10'`, and curating real Unit 6 phrases.
   Unchanged from before this session.
2. Everything listed under "Explicitly deferred / not in scope for
   this pivot" at the bottom of `PIVOT_CHECKLIST.md` (Review/Trainer
   mode, placement test, sign-variation callouts, the
   `intro-to-asl.html`/Unit 0 content overlap) — all still genuinely
   deferred, not silently dropped.
3. The bugs/risks list above (this session's own, plus the carried-over
   Phase 5 items).

**Separately from the pivot phases above:** on 2026-08-20 (a later
session than Phase 7), `pages/lesson.html` was turned into a
persistent "course player" — a collapsible course-outline sidebar
(all `UNITS`, locked/current/done, per-unit progress) merged directly
into the lesson page, at the user's explicit request (chosen over two
lighter options: restyle-only, or leave `learn.html` as a separate
page). This is a UI/UX change, not a curriculum-content change, so
it's NOT tracked as a `PIVOT_CHECKLIST.md` phase — it's documented in
`SYSTEM_ARCHITECTURE.md` → **Rev 5** instead. `learn.html` itself is
UNCHANGED (still the dashboard's entry point for picking a unit) —
only `lesson.html`/`lesson.js`/`lesson.css` were touched. See that
session's own log entry below for the full breakdown, and Rev 5 for
the architecture.

---

### 2026-08-20 — Phase 7 (partial): number routing confirmed + curated Unit 6 phrases
**Requested:** do Phase 7 of the curriculum pivot; fix bugs; give
paste-ready files; update the three coordination docs.

**Findings:**
- `PIVOT_CHECKLIST.md` had all 5 Phase 7 items unchecked, but reading
  `js/engine/dictionary.js` and `js/data.js` directly showed the
  `6`/`9`/`10` → `detectionType: 'motion'` routing fix was **already
  implemented in code** (dictionary.js even has its own "PHASE 7
  (2026-08-20)" block comment explaining the fix). The checklist had
  simply never been updated to match — checked those two items off
  with a verification note rather than re-doing work that was already
  done.
- Of the remaining 3 items, 2 genuinely need a camera + Colab
  (Essential Words, the 5 phrase placeholders) — out of scope for an
  AI session. The 3rd (curate Unit 6 phrases) only needs *already*
  trained words, so it was done this session: replaced the
  `CAR_SPELL`/`HOME_WORK_DEMO` demo placeholders with 6 real phrases
  built from words individually grepped against this repo's actual
  `asl_motion_model/labels.json`.
- **New, precisely confirmed this session (previous notes only
  speculated):**
  1. `HELLO`/`THANK YOU` in `dictionary.js` are not `disabled: true` —
     the app treats them as usable — but grepping
     `asl_motion_model/labels.json` directly confirms neither class
     exists in the trained model. Any attempt at these two signs will
     run the motion classifier and can never succeed.
  2. `HOT`/`COLD` (Unit 5 `temperature`) are worse: **zero
     `SIGN_DICTIONARY` entry at all** in `dictionary.js`, not even a
     `disabled: true` placeholder like the 16 Essential Words have.
     `getDetectionType()`'s `?? 'static'` fallback means a camera
     attempt on either one silently runs the wrong classifier.
     `SYSTEM_ARCHITECTURE.md`'s Unit Map row for Unit 5 claims
     "family/places/time/temperature trained" — only 3 of the 4 are
     actually true.
- Confirmed (by reading `lesson.js`'s `getActiveSignId()` /
  `getPhraseSequence()` / `needsExplicitStart()`) that a `sequence`-type
  `SIGNS` entry's own top-level `detectionType` field is never read
  during phrase detection — each step resolves its own detection type
  from its own word (e.g. `'MOM'`, then `'HOME'`), not from the
  phrase's `signId` (`'MOM_HOME'`). This was an open question in an
  earlier draft of this session's work; now confirmed safe.

**Changes made:**
- `js/data.js` — `sequence_demo` category title changed
  `'Basic Phrases (Demo content)'` → `'Basic Phrases'`; `words` list
  and the two `SIGNS` entries (`CAR_SPELL`, `HOME_WORK_DEMO`) replaced
  with 6 curated phrases (`MOM_HOME`, `DAD_WORK`, `TODAY_SCHOOL`,
  `FINISH_WORK`, `SISTER_STORE`, `TODAY_GRANDMA_HOME`), each a
  `sequence` of words confirmed present in `asl_motion_model/labels.json`.
  Ran `node --check` on the result — no syntax errors.
- No changes made to `dictionary.js` — the `6`/`9`/`10` fix was already
  there; nothing to add. `HELLO`/`THANK YOU`/`HOT`/`COLD` were
  deliberately left unchanged pending a product decision (see
  `PIVOT_CHECKLIST.md`'s two new flagged items) rather than silently
  disabling user-facing content without sign-off.
- `PIVOT_CHECKLIST.md` — checked off all 3 completable Phase 7 items
  with verification notes; added 2 new unchecked items for the
  HELLO/THANK YOU and HOT/COLD findings above.
- `SYSTEM_ARCHITECTURE.md` — updated the Rev 4 changelog line and the
  Unit Map's Numbers row to reflect the confirmed-done routing fix;
  corrected the Unit 5 row's "temperature trained" claim.

**Still open:**
1. Essential Words (16) + 5 phrase placeholders — capture + retrain,
   unchanged.
2. `6`/`9`/`10` are correctly routed but `asl_motion_model` still has
   zero digit classes — needs capture + retrain same as item 1.
3. Decide + implement: disable `HELLO`/`THANK YOU` in `dictionary.js`
   until retrained, or scope a capture session for just those two.
4. Add `disabled: true` placeholder `SIGN_DICTIONARY` entries for
   `HOT`/`COLD` (matching the Essential Words pattern) — small, safe
   AI-doable change, just wasn't made unprompted alongside a docs-only
   correction.
5. Image/video assets for the 6 new `sequence_demo` phrases don't
   exist yet (same gap as the 0–9 numbers assets) — not a code issue.

---

### 2026-08-20 (later session) — Course-player merge (lesson.html + learn.html) + 2 flagged Phase 7 bug fixes
**Requested:** fix bugs; restyle the app toward a screenshot of a
Cisco Networking Academy course page (persistent sidebar course
outline + inline content); confirmed via a follow-up question that
this meant a full merge (one page, not a restyle of the existing
trail); provide paste-ready files; update the three coordination docs.

**Scope decision (flagged, same spirit as Phase 4/6's own flagged
calls):** "full merge" was implemented by extending `pages/lesson.html`
itself into the merged "course player" (adding a sidebar column),
NOT by building a third page or rewriting `learn.html`. Reasoning:
`lesson.html` already owns all the camera/MediaPipe/classifier
lifecycle code (~1800 lines in `lesson.js`) and every other page
already deep-links into it with a stable `?level=&category=&sign=`
URL shape — extending it in place reuses all of that untouched and
keeps every existing link (`quiz.js`, `dashboard.js`, `learn.js`,
`intro-to-asl.html`) working with zero changes. `learn.html` was
deliberately left AS-IS: it's still the dashboard's entry point for
picking a unit/category (its own trail-map UI, from Phase 4); the new
sidebar is for moving through what's already unlocked once you're
inside a lesson, which is what the reference screenshot was actually
showing (mid-course, not a landing page). Building a true single-page
app that swaps content without a full navigation was deliberately
NOT attempted — it would require re-architecting the camera/mediapipe
boot-and-teardown lifecycle (currently tied to a fresh page load per
sign) under real time pressure with no browser to test in (same
sandbox limitation every phase before this one has flagged). Every
sidebar row is a plain `<a href="lesson.html?...">` — a real
navigation, so `shutdown()`'s existing `beforeunload` listener keeps
working with zero new wiring, and the camera code itself was not
touched at all. See `SYSTEM_ARCHITECTURE.md` → **Rev 5** for the full
architecture writeup — this is a UI/UX initiative, not a curriculum-
content change, so it's documented there rather than as a new
`PIVOT_CHECKLIST.md` phase.

**Changes made:**
- `css/lesson.css` — new `.course-sidebar`/`.course-layout` block
  (~70 lines): sticky 260px sidebar, collapsible per-unit sections,
  mini progress bars (reuses the color tokens already in `style.css`,
  no new tokens added), stacks above content under 1200px.
- `pages/lesson.html` — wrapped the existing `.lesson-layout` (content
  panel + camera panel, UNCHANGED) in a new `.course-layout` flex
  container alongside a new `<aside id="course-sidebar">`. No existing
  element was removed, renamed, or had its id changed.
- `js/lesson.js` — added `UNIT_ICONS`/`CATEGORY_ICONS` (copied
  verbatim from `js/learn.js`'s own maps, same "small duplication is
  fine" precedent that file already documents for `js/dashboard.js`),
  `currentUnitOrder()`, `sidebarSignRow()`, `sidebarCategoryBlock()`,
  and `renderCourseSidebar()` — called once from the end of
  `updateLessonMeta()` (not from `boot()` directly) specifically
  because `updateLessonMeta()` is the one function all three of
  `boot()`'s paths already call, including both early-return branches
  (empty name-drill, `comingSoon` category) — so the sidebar still
  renders even when the camera/content half of the page bails out
  early. Locked/current/done state is computed with the *exact same*
  `window.LWData`/`window.LWProgress` calls `js/learn.js`'s trail and
  `js/dashboard.js`'s unit rows already use (`getUnits`,
  `getCategoriesForUnit`, `isCategoryUnlocked`, `getCategoryProgress`,
  `getCategorySigns`) — copied call-for-call, not re-derived, so this
  can't silently disagree with either of those screens. Read-only:
  never calls any `LWProgress` record function. One deliberate metric
  difference from `dashboard.js`'s unit rows, flagged in the code
  comment: the sidebar's per-unit % is practiced-signs/total-signs
  (finer-grained, matches `renderOverallProgress()`'s formula), not
  `dashboard.js`'s categories-passed count — say the word if a literal
  match to the dashboard number is wanted instead.
- `js/engine/dictionary.js` — the two flagged-but-not-yet-made Phase 7
  fixes from the last session: `HELLO`/`THANK YOU` now carry
  `disabled:true` (confirmed absent from `asl_motion_model/labels.json`
  last session; now behave like the 16 Essential Words instead of
  silently running a doomed classifier match on every attempt); `HOT`/
  `COLD` now have real `disabled:true` placeholder entries (previously
  had ZERO `SIGN_DICTIONARY` entry, which meant `getDetectionType()`'s
  `?? 'static'` fallback silently ran the wrong classifier). Both were
  explicitly named as "small, safe AI-doable" in `PIVOT_CHECKLIST.md`
  — the "fix bugs" part of this session's request was read as the
  green light that was missing before. Capture + retraining for all
  four is still open — this only makes their failure mode clean
  (no match) instead of silently wrong.

**Verification (same caveat as every phase before this — no browser/
dev server in this sandbox):**
- `node --check` on `js/engine/dictionary.js` directly, and on
  `js/lesson.js` via a temp `.mjs` copy (the file is loaded as
  `type="module"`, which `node --check` needs the right extension to
  parse correctly) — no syntax errors.
- Every new DOM id (`#course-sidebar`) cross-checked against
  `pages/lesson.html`'s real markup; every new
  `window.LWData`/`window.LWProgress` call cross-checked against the
  real exported function names in `data.js`/`progress.js` (`grep`
  both ways, same discipline as Phase 6).
- **Not exercised in a real browser** — the sidebar's own collapse/
  expand click handling, the sticky positioning at different viewport
  widths, and whether the new `.course-layout` flex wrapper interacts
  correctly with the camera panel's existing `position: sticky` all
  need a real click-through to confirm. Recommend loading a lesson
  with a multi-category unit in scope (Common Things & People) to
  check the nested category/sign expand behavior specifically — that
  branch has the most new logic and the least existing precedent to
  fall back on.

**Bugs/risks noticed, not fixed (out of scope this session):**
1. Every item already listed under Phase 6's "Bugs/risks noticed, not
   fixed" and "Still open" above — none were touched this session.
2. The sidebar's Unit 0 (Welcome) and Unit 7 (Phrasebook) rows link
   out to `learn.html?unit=welcome` / `learn.html?unit=phrasebook`
   rather than rendering inline — those two views (static info text,
   and a large browse-only reference list) still live entirely on
   `learn.html` and were not ported into the sidebar/content-pane
   pattern. Flagging in case full parity for those two is wanted
   later; skipped this session to keep the change additive and low-
   risk rather than also porting `UNIT0_CONTENT` rendering and the
   Phrasebook's ~100-item browse list into `lesson.js`.
3. On very small screens, the sidebar (stacked above content under
   1200px per the new CSS) has no collapse-to-a-toggle-button behavior
   — it's always visible, just stacked, which could push the actual
   lesson content quite far down the page on a long unit list.
   Flagging as a follow-on polish item, not attempted here to avoid
   inventing a second interaction pattern (hamburger toggle) without
   being able to check it against a real narrow viewport.

**Still open:**
1. Everything already listed as still-open in the Phase 7 entry above,
   minus the two dictionary.js items now fixed (see "Changes made").
2. The "bugs/risks noticed, not fixed" list immediately above.
3. Full parity for Unit 0 / Unit 7 inside the merged page (see #2 above).

---

### 2026-08-20 (review session) — Real-browser verification of Rev 5 + 4 bugs found/fixed by walking the dashboard→lesson journey with actual screenshots

**Requested:** review the app the way Rev 5 kept flagging it never had been —
in an actual running browser — by walking the dashboard→lessons journey as
a learner would, using 6 screenshots the user provided (dashboard, the
Fingerspell Your Name lesson, the Letter A lesson, the Alphabet grid, the
Unit 0 Welcome screen); criticize what's there; fix what's safely
fixable; put the rest in this checklist; exclude `auth.js` (teammate
owns it). Also asked to "visualize the code" — see the inline diagram
this session rendered (dashboard → Unit 1 → Letter A lesson → 3 bug
markers), not reproduced here since it's a visual artifact, not file
content.

**Context:** this is genuinely the first time any of Rev 4/5's work has
been checked against a real, running browser — every phase before this
one explicitly flagged "not exercised in a real browser" as its biggest
open risk. The screenshots confirmed the Rev 5 course-player sidebar
*is* live and rendering correctly (locked/current/done states, mini
progress bars, the collapsed/expanded unit sections all matched what
the code should produce) — that's a real, load-bearing confirmation,
even though most of this entry is about what wasn't right.

**Bugs found by tracing the screenshots through the actual code (not
guessed):**

1. **FIXED — `handlePracticeFrame()`'s plain single-sign branch never
   compared the detected label to the sign being taught.** The Letter A
   screenshot showed `DETECTED SIGN: K 93%` in green while parked on
   the Letter A lesson. Traced to `classifier.js`: `result.matched`
   only means "confidently classified as *some* sign in the active
   category" — `getAllowedLabelsForSign()` deliberately scopes
   candidates to the whole category (all 26 letters), by design, for
   the 6/W-9/F-0/O disambiguation fix. `handleAssessmentFrame()`
   already compares `result.label === currentSign` and phrase-mode
   practice already compares `result.label !== expectedStep` — this
   was the one inconsistent path. Fixed in `js/lesson.js`: added an
   `isCorrectSign` check before showing the "✅ Nice!" success message;
   a wrong-but-confident sign now shows `Detected "X" — this lesson is
   "Y"` instead, throttled via the same `enterCooldown()` idiom the
   rest of this file already uses (800ms) instead of re-firing every
   render-loop frame. Kept forgiving/non-blocking, matching Rev 3's
   "practice, not a gate" stance — this only stops falsely claiming
   success, it doesn't fail or lock anything.
   - **Flagging, not fixed (related, out of scope this session):**
     `updateConfidenceUI()`'s green/muted color and the confidence
     bar's fill color are still driven by raw `result.matched`, not by
     the same target-sign comparison — so the "Detected Sign" readout
     one line above the (now correct) feedback text can still render a
     wrong sign in green. Left alone because that function is shared
     unconditionally by both practice AND assessment mode from the
     render loop, so "correct for the active lesson" isn't a single
     well-defined concept there the way it is inside the two frame
     handlers — see the flagging comment now above the function in
     `lesson.js`.
2. **FIXED — Fingerspell Your Name lesson showed a stale, wrong image
   hint.** Screenshot showed "Add image to assets/images/basic/A.png"
   on a lesson that fingerspells a whole name, not one letter. Traced
   to `updateLessonMeta()`: `lessonImgHintEl.textContent` is only ever
   set inside the `if (signData)` branch, which the name drill
   deliberately never enters (`signData` is null for it — see
   `signDataForTitle`). The placeholder box's hint text was just
   whatever `pages/lesson.html`'s static default HTML last held (the
   Letter A default). Fixed by setting an appropriate hint directly in
   the `isNameDrill` branch.
   - **Correction note:** the first attempt at this fix accidentally
     merged the name-drill branch's closing lines with the next
     `else` branch's opening lines (dropped the `} else {` separator
     mid-edit), which would have thrown a `SyntaxError: Identifier
     'placeholder' has already been declared` — caught and fixed
     before finishing, then verified clean with `node --check` via a
     temp `.mjs` copy. Noting this here as a caution for anyone
     reviewing this diff by eye rather than just diffing: the final
     `js/lesson.js` is syntax-clean, but the intermediate state during
     this session was briefly broken.
3. **FIXED — Dashboard "Signs You've Learned" showed every sign
   twice.** Screenshot showed "A A", "Y Y", "Z Z" chips. Traced to
   `renderRecap()` in `js/dashboard.js`: rendered `signId` once inside
   `.recap-card__img`'s pill AND again in a sibling `<span>`. The pill
   was already redesigned into a self-contained chip for exactly this
   text (see `css/dashboard.css`'s own BUG FIX comment above
   `.recap-card__img`, which explains the redesign from a fixed
   56×56px square to a flexible pill specifically to fit multi-word
   entries like "I AM FINE") — the `<span>` was a leftover from before
   that redesign that never got removed. Fixed by deleting the
   redundant `<span>`.
4. **FIXED — pre-existing, already-flagged "Start Assessment" button
   text mismatch.** Not something this session discovered — `lesson.js`
   already had a comment (its own Rev 3 header) saying the button was
   supposed to read "🎥 Practice Check (optional)" and a separate NOTE
   admitting the rename never landed, calling it "worth a 1-line fix in
   its own small session." Since this session's own request explicitly
   included "fix bugs" while reviewing this exact page, treated that as
   the go-ahead. Turned out to be 4 sites, not 1 line: the HTML default
   (`pages/lesson.html`), and 3 separate `startBtnEl.textContent` resets
   in `js/lesson.js` (`updateLessonMeta()`, the post-camera-round
   overlay path, `window.retryLesson()`). All 4 now say "🎥 Practice
   Check (optional)"; also updated the page's top header comment and
   the camera-tips list item that both referenced the old button text
   by name, and rewrote the now-resolved flagging comment in
   `lesson.js` to say so instead of still flagging it.

**Suggestions/observations added to `PIVOT_CHECKLIST.md` (not code
changes — see that file for the actual list):** the dashboard's welcome
banner hardcodes "You're making great progress on the ASL Alphabet"
regardless of which unit the learner is actually on (same "always says
Basic" class of bug already flagged and deliberately deferred for
`data-user-level` in Phase 5); `learn.html`'s per-category "X/26
viewed" badge vs. the dashboard's "X/91 signs practiced" wording is an
inconsistent term for the same underlying concept; direct URL access to
a locked category's `lesson.html` isn't blocked (client-side-only app,
so likely not worth enforcing, but noting it was never explicitly
decided either way); the onboarding first-open experience shows two
orange warning boxes ("No hand detected" / "Face not detected — step
back") before the learner has done anything, which may read as
"something's already broken" rather than neutral guidance.

**Excluded from this session, as requested:** `js/auth.js` — not
opened, not touched, not reviewed.

**Verification:** `node --check` on `js/lesson.js` and `js/dashboard.js`
directly (both ES modules, checked via temp `.mjs` copies — `node
--check` needs the right extension to parse `import`/`export`
correctly). Every edited DOM id (`btn-start-assessment`,
`lesson-img-placeholder-hint`, `recap-grid`) cross-checked against the
real markup by `grep`, same discipline as every phase before this one.
**Still not exercised in a real browser** — the actual visual result of
fix #1's new "Detected "X" — this lesson is "Y"" feedback message
(string length vs. the feedback box's width, whether the 800ms
throttle feels right in practice) and fix #2's hint copy have not been
seen rendered. Recommend a real click-through on the Letter A page
specifically (hold a wrong letter steady in view) to confirm fix #1
feels right and doesn't spam.

**Still open:**
1. Everything already listed as still-open in every prior session log
   entry above — none of it was touched this session.
2. `updateConfidenceUI()`'s color-vs-correctness gap (see bug #1's
   flagging note above).
3. The four suggestions/observations listed above, now tracked in
   `PIVOT_CHECKLIST.md`.
4. Real-browser click-through of this session's 4 fixes (see
   Verification above).

---

### 2026-08-21 — Cleared all 4 flagged review-session items + the
### previously-decision-pending `updateConfidenceUI()` item; 5 fixes total

**Requested:** the user explicitly said "do this" over the 4 items the
2026-08-20 review session had listed as "found but not fixed," PLUS
the `updateConfidenceUI()` color item that same session had left
flagged as "needs a decision first." Read as the missing go-ahead on
all 5 (matches this repo's own pattern — see e.g. the review session's
"Start Assessment" button fix, made on a similarly-worded go-ahead).
Also asked to "visualize the code" (see the inline structural diagram
this session rendered — 3 files, 5 fixes) and to exclude `js/auth.js`
entirely (not opened, same as every session since it was first
excluded).

**Fixes made — all 5, code applied directly, no partial items:**

1. **`js/lesson.js` `updateConfidenceUI()` — Detected Sign readout now
   color-checks correctness.** This was the one flagged item with a
   real open question ("needs a decision") rather than just "not
   attempted yet." Resolved by noticing `getActiveSignId()` — already
   used by both `handlePracticeFrame`'s and `handleAssessmentFrame`'s
   phrase branches as the mode-agnostic "what's expected right now"
   resolver — already answers exactly the question the old flagging
   comment said wasn't well-defined. Decision made: tint the readout
   the SAME way in both practice and assessment mode (`result.matched
   && result.label === getActiveSignId()` gates green; anything else
   falls back to the existing yellow/muted "confident but not
   matching" treatment, unchanged). No separate assessment-mode
   behavior was added — see the full reasoning in the replaced comment
   block directly above the function in `lesson.js`.
2. **`js/lesson.js` `boot()` — locked categories now blocked via direct
   URL.** Previously `isCategoryUnlocked()` was only ever consulted for
   sidebar lock icons (this page's own course sidebar, and `learn.js`'s
   trail/category cards) — never as a gate on `lesson.html` itself.
   Added one check near the top of `boot()`: if the requested
   `?level=&category=` isn't unlocked, toast + `location.replace()` to
   `learn.html?category=X` (which already re-checks the same lock in
   its own `renderCategoryView()` and falls back to the trail if still
   locked — confirmed by reading that function, not assumed). Verified
   safe to call unconditionally (no name-drill/reference special-
   casing needed): `isCategoryUnlocked()`'s own `idx <= 0` fallback
   already returns `true` for any id not in the flat live-category
   chain, which covers `fingerspell_name` and Phrasebook categories the
   same way `learn.js`'s existing calls already rely on without special
   casing them. Still explicitly client-side-only — no backend to
   truly enforce this either way, same caveat the checklist item itself
   raised when flagging it.
3. **`js/dashboard.js` — welcome banner no longer hardcodes "ASL
   Alphabet."** New `renderWelcomeBanner()`, walking the same flat
   `getOrderedLiveCategories()` chain `renderContinueButton()` already
   uses to find the learner's current in-progress category, then
   mapping its parent unit's title into one of 4 states: nothing
   trained yet (generic opener), a real current category not yet
   practiced at all ("Let's get started with X!"), a real current
   category partway through (the original "great progress on X"
   phrasing, now with a real X), or every trained category passed
   ("nice work" close-out). `pages/dashboard.html`'s hardcoded sentence
   fragment is now wrapped in `<span data-welcome-banner>` (kept as the
   pre-JS fallback text, same pattern the aggregate-count field already
   used).
4. **`js/learn.js` — "viewed" → "practiced" terminology.** Both of
   `renderCategoryAssessmentCTA()`'s badge strings ("Ready ·
   N/M viewed" and the locked-state "N/M viewed") now say "practiced,"
   matching the term already used everywhere else that reads this same
   number — the `practicedCount` variable one line above it in the
   same function, `LWProgress.recordSignPracticed()`'s own name, and
   `dashboard.js`'s aggregate "N / M signs practiced" card. Not really
   a judgment call once traced — "viewed" was the one outlier, not a
   50/50 pick between two equally-used terms.
5. **`js/lesson.js` `bootDetectionEngine()` — no more two false
   warnings on first camera load.** Root cause: `lastFaceSeenAt`/
   `lastHandSeenAt` (the two timestamps `startRenderLoop()`'s hold-time
   check reads, per BUG 11 FIX) are stamped at MODULE-LOAD time, before
   `bootDetectionEngine()`'s own `await initMediaPipe()` / `await
   startCamera()` / `await loadModels()` calls — which routinely take a
   second or more on a first-time model fetch. By the time the render
   loop's first real frame ran, both timestamps were already older than
   their hold thresholds (`FACE_WARN_HOLD_MS`/`HAND_STATUS_HOLD_MS`),
   so the face-warn box and the "No hand detected" pill both fired
   immediately — before the learner had any chance to get in frame.
   This is the exact same staleness bug `startAssessment()` already had
   its own fix for (see the existing "BUG 11 FIX" comment there,
   `lastFaceSeenAt = Date.now(); lastHandSeenAt = Date.now();`) — just
   never applied at the OTHER place these two timestamps get read from
   a stale starting point. Applied the identical fix immediately before
   `startRenderLoop()` is called.

**Verification:** `node --check` on all 3 edited files (`js/lesson.js`
via a temp `.mjs` copy, same as every prior session — it's an ES
module; `js/dashboard.js` and `js/learn.js` directly — neither uses
`import`/`export`, confirmed by grep before checking, so no `.mjs`
rename needed for those two) — all clean, no syntax errors. Every new
reference cross-checked against the real markup/exports by `grep`,
same discipline as every phase before this one: `data-welcome-banner`
exists in both `pages/dashboard.html` and the new `dashboard.js` query;
`window.LinguaWave.showToast` is exported from `js/main.js` (confirmed
`main.js` loads and executes before `lesson.js` in `pages/lesson.html`'s
script order, so it's available by the time `boot()` runs);
`isCategoryUnlocked` is exported from `progress.js`; `getUnits`/
`getCategorySigns`/`getCategoriesForUnit` are exported from `data.js`.

**Not exercised in a real browser** — same standing limitation as
every session before this one that touched `lesson.js`'s camera path
specifically. Fix #5 (warm-up warning) is the one most worth an actual
click-through: the fix is a 2-line timestamp reset with a clear,
traceable root cause, but "does the camera panel actually look clean
on first load now" is still only reasoned about, not seen. Fix #1's
new green/yellow behavior during an actual assessment run (does a
correct answer on a later phrase step still read as clearly correct)
is the other one worth a look, since assessment mode's own use of this
readout had no prior precedent to lean on.

**Excluded from this session, as requested:** `js/auth.js` — not
opened, not touched, not reviewed. Same standing exclusion as the
2026-08-20 review session.

**Still open:**
1. Everything already listed as still-open in every prior session log
   entry above that wasn't one of this session's 5 items.
2. Real-browser verification of this session's 5 fixes (see above) —
   the single biggest recommendation coming out of this session, same
   as every camera-touching session before it.
3. Phase 7's actual capture + retraining work (16 Essential Words, 5
   phrase placeholders, `HELLO`/`THANK YOU`/`HOT`/`COLD`) — unchanged,
   still needs a human + camera + Colab.

---

### 2026-08-21 — Dashboard UX review from a learner perspective (no code)

**Requested:** Treat the app as a new ASL learner, start at Dashboard → Learn → Lesson,
critique the experience, make the dashboard more like a structured learning platform
such as Cisco Academy/Lingvano-style course experiences, and document the findings.
The user explicitly said **do not code** and **exclude `js/auth.js`** because a teammate
owns auth.

**Pre-change checks completed:** Read the active project memory first, then
`PIVOT_CHECKLIST.md`, then `SYSTEM_ARCHITECTURE.md` Rev 4 before making any
recommendations. Rev 4/5 state was respected. No changes were proposed to
`data.js`, `learn.js`, `progress.js`, or `auth.js`.

**Screenshots reviewed:**
- Dashboard (`pages/dashboard.html`)
- Learn trail (`pages/learn.html`)
- Alphabet category view
- Unit 0 Welcome
- Letter M lesson / course-player sidebar

**Main finding:** the dashboard is functional but currently feels more like a
progress/status report than the learner's home page. The full learning trail is
already present in `learn.html`, while the dashboard currently repeats the trail
with an aggregate progress card + one row per unit. The next learning action is
not visually dominant enough.

**Highest-priority recommendation:** make the dashboard learner-first:
1. A dominant "Continue Learning" card at the top.
2. Show exact current Unit + lesson/sign.
3. Keep practice progress and assessment mastery as separate metrics.
4. Keep the learning-path summary compact.
5. Add a future-facing Review entry point without building a new review algorithm here.
6. Replace/remove `Current Level: Basic`, because Rev 4 is a single continuous path.

**Important metric finding:** `js/dashboard.js` currently computes the overall percentage
from practiced signs (`practicedSigns / totalSigns`). This is valid as a practice
completion metric, but visually it can be interpreted as overall ASL mastery. The
dashboard should label it explicitly as practice progress and keep category assessment
passes separate.

**Screenshot observations / possible bugs:**
- Dashboard is vertically long and can place the main learning action above the current
  viewport.
- Dashboard unit rows are useful but not strong enough as "what do I do next?" guidance.
- "Signs You've Learned" is retrospective and currently has no review action.
- The account card still exposes "Current Level: Basic"; this was already known as a
  Rev 4 open follow-up.
- Current Letter M lesson screenshot still shows the reference-image placeholder
  (`Add image to ../assets/images/basic/M.png`); verify whether the image asset exists.
- Current Letter M screenshot still shows initial camera warnings (`No hand detected`
  and `Face not detected`) even though the code comments/memory say a first-load
  timestamp race was fixed; this needs another real-browser verification.
- Letter M shows detected `C` at 74% in the screenshot. The yellow state communicates
  that it is not a correct M, but the wording/visual distinction should remain explicit.

**Architecture direction:** Dashboard should consume existing
`LWProgress` + `LWData` APIs. Preferred implementation scope for the future redesign:
`pages/dashboard.html`, `js/dashboard.js`, `css/dashboard.css`.
Do not introduce a second progress/unlock/order algorithm.

**No code was changed in this session.**

**Still open after this session:**
- Dashboard redesign implementation.
- Real-browser verification of the latest lesson camera/warning behavior.
- Asset verification for the Letter M lesson image.
- Phase 7 capture/retraining work remains unchanged.
- Auth remains explicitly excluded.

---

### 2026-08-21 (same day, follow-up) — Dashboard implementation: Priority 0 #1 only

**Requested:** Implement "priority 0 #1" from `PIVOT_CHECKLIST.md`'s Dashboard
UX Review Checklist (the session directly above this one) — i.e. *only* item
#1, "Make 'Continue Learning' the primary action." Also requested: a code
visualization, and exclude `js/auth.js` (teammate owns it — same exclusion as
every dashboard session so far).

**Pre-change checks completed**, per this file's own header rule: read this
file, then `PIVOT_CHECKLIST.md` (found the exact "Priority 0 #1" section — §1
of its Dashboard UX Review Checklist), then confirmed against
`SYSTEM_ARCHITECTURE.md`'s Dashboard UX Review Addendum that #1 was still open
and its implementation boundary (`dashboard.html`/`dashboard.js`/`dashboard.css`
only). No changes proposed or made to `data.js`, `learn.js`, `progress.js`, or
`auth.js`.

**What changed:**
1. **`pages/dashboard.html`** — added a new `.continue-card` hero section
   directly below the page header (before "Your Account" / "Overall
   Progress"), with `data-continue-icon` / `-eyebrow` / `-title` /
   `-progress-wrap` / `-progress-fill` / `-progress-label` /
   `-secondary` hooks. The old inline CTA button that lived in `.dash-header`
   moved into this card (same `data-continue-learning` hook, so nothing
   downstream that already targeted that attribute needed to change).
2. **`js/dashboard.js`** — added `getCurrentDestination()`: a single shared
   helper that walks `LWProgress.getOrderedLiveCategories()` once to find the
   learner's current unlocked-but-unpassed category (or `cat: null` if
   everything's passed, or an empty chain if nothing's live yet), plus derived
   fields (`unit`, `signs`, `practicedCount`, `nextSign`). Added
   `renderContinueCard()`, which fills the new hero markup from that object
   with three states (fresh chain / real destination / all caught up) and sets
   the primary button's **label** (`Start Lesson` / `Continue` /
   `Review Your Path`) without touching its `href`. `renderWelcomeBanner()`
   and `renderContinueButton()` were changed to accept the shared destination
   as a parameter instead of each independently re-walking the chain — their
   own output/behavior is unchanged, only where the chain-walk lives moved.
3. **`css/dashboard.css`** — added `.continue-card` + child rules (accented
   border by default, gradient wash, 56px icon chip, inline mini progress bar,
   action button row) plus a `max-width: 640px` stacked layout for it.

**Bug/smell found and fixed in the same pass (not pre-existing — this is a
refactor made while implementing, not a separately-discovered regression):**
before this session, `renderWelcomeBanner()` and `renderContinueButton()` each
had their own copy of "loop the flat chain, find the first
unlocked-but-unpassed category." Two copies of that walk already existed;
adding the new hero card as a third independent copy would have left three
places that could silently drift out of sync if the unlock rule ever changed.
Consolidated into `getCurrentDestination()`, computed once in the
`DOMContentLoaded` handler and passed to all three render functions. Verified
the two existing functions' outputs are unchanged by tracing both through the
new shared helper by hand (`renderContinueButton()`'s href string, and each of
`renderWelcomeBanner()`'s three message branches).

**Explicitly out of scope, not done:** Priority 0 items #2 ("replace the
report feeling") and #3 ("fix the meaning of the 9% number") — only #1 was
requested. No relabeling of the aggregate progress card, no changes to how
`renderOverallProgress()` computes or presents its percentage. `js/auth.js` —
not opened, not touched, same standing exclusion as every session before this
one.

**Verification:** `node --check` on `js/dashboard.js` — clean (confirmed via
grep first that this file has no `import`/`export`, so no `.mjs` rename was
needed for the check, same discipline as prior sessions). Every new
`data-continue-*` attribute cross-checked between the HTML and JS with `grep`
— all match. HTML `<section>`/`<div>` tag-balance and CSS brace-balance
checked programmatically — both balanced.

**Not exercised in a real browser** — same standing limitation as every prior
UI-touching session. In particular, unverified: whether the hero card actually
clears the fold on real viewport heights (the acceptance criterion this
checklist item is graded on); the three hero-card states against real
`localStorage` progress data shaped like a fresh account / a partially-
practiced category / a fully-passed chain; the new narrow-viewport stack
layout; light vs. dark theme rendering of the new gradient background.

**Still open:**
1. Real-browser verification of this session's change (see above) — the
   single biggest recommendation coming out of this session.
2. Priority 0 items #2 and #3 — not started.
3. Every Priority 1 / Priority 2 item in `PIVOT_CHECKLIST.md`'s Dashboard UX
   Review Checklist — not started.
4. Everything already listed as still-open in every prior session log entry
   above (Phase 7 capture/retraining, earlier real-browser-verification asks,
   the Letter M image asset check, etc.) — unchanged by this session.
5. Auth remains explicitly excluded.