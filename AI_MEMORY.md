# AI_MEMORY.md — Read this first

> **For any AI assistant (Claude, ChatGPT, Copilot, etc.) working on this
> repo:** read this file before making changes. It's the running memory
> of decisions, conventions, and open threads across AI-assisted sessions
> on this project, so you don't have to re-derive them from scratch or
> contradict a decision that was already made deliberately.
>
> **After you make a change**, add a short entry to the "Session Log" at
> the bottom — date, what changed, what's still open. Keep entries brief;
> this is a changelog, not a transcript.

---

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