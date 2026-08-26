# LinguaWave — System Architecture & Developer Handoff

<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST, then
     PIVOT_CHECKLIST.md, then this file's Rev 7 section. -->
> Capstone Project · ASL Interactive Learning System for Beginners

**Current state, in one line:** Rev 7 (2026-08-24) replaced the Unit
Map wholesale — 72 units implementing Omen's uploaded "updated fixed
lesson.txt" curriculum, one topic per unit, superseding Rev 4/5/6's
11-unit table below (kept for history, see each Rev's own section).
Code-complete except Phase 7 (content capture/retraining — see
`PIVOT_CHECKLIST.md`), same caveat every revision here has had:
restructuring the curriculum's presentation doesn't train any models.
`js/auth.js` is real Firebase auth, out of scope for AI sessions
(teammate owns it).
`PIVOT_CHECKLIST.md`'s Phase C (camera/tab-lifecycle hygiene bugs in
`quiz.js`/`cameraUtils.js`/`classifier.js`) is done — see that file;
Phase B (auth-adjacent bugs) remains open, flagged for the teammate,
untouched by AI sessions per scope. Days-of-the-Week content is no
longer a separate open item — Rev 7's topic 54 "Days" covers it
(content-wise; still Phase 7-blocked for detection like everything
else new in Rev 7).

> Compressed 2026-08-22 — this file used to carry a full per-item
> "Implementation status" session log duplicating `PIVOT_CHECKLIST.md`'s
> own checkboxes and `AI_MEMORY.md`'s session log. That's gone; this
> file now only holds the architecture itself (what the system is and
> why), not a record of every session that built it. See the other two
> files for status/changelog.

---

## Rev 4 — Curriculum pivot: single continuous "Basic ASL" path

**Status: Phases 1–6 done (2026-08-18→20). Phase 7 (capture/retrain)
open — see `PIVOT_CHECKLIST.md`.**

### Why

Adviser's framing: no "choose your level" fork at signup. Everything
taught is basic ASL — progression comes from *combining* what's already
taught, not unlocking harder content (the adviser's own analogy: a
typing tutor doesn't have a beginner/advanced mode, it teaches `A S D F`
then drills `ASDF`/`FDSA`). Reference app for lesson pacing/quiz variety:
lingvano.com (tight teach→quiz loop, mixed question formats, camera
"mirror" as practice not a gate).

### The Unit Map

`level`/`category` field *values* in the codebase are unchanged — this
just maps them onto a new presentation order. `unit`/`UNITS` (added
Phase 1) is what actually drives ordering/unlocking now.

> **Updated 2026-08-23 (Rev 6 — Omen's reorder, mapping confirmed and
> implemented in `data.js`/`dictionary.js`/`progress.js`/`lesson.js`/
> `learn.js` this session).** Replaces the Rev 4 8-unit table below.
> `PIVOT_CHECKLIST.md` has the full session-by-session detail; this is
> just the current state.

| Unit | Title | Source data | Detection status |
|---|---|---|---|
| 0 | Welcome to ASL: A Brief History | new, static text | N/A — no camera. **Updated 2026-08-23 (later, eighth session)** — added a real `brief_history` section to `UNIT0_CONTENT` (Gallaudet/Clerc/Cogswell, American School for the Deaf founded 1817 in Hartford CT, Martha's Vineyard Sign Language's contribution), fact-checked against ASLU/lifeprint.com per `AI_MEMORY.md` §1, and retitled the unit to match. Kept short and still links out to `intro-to-asl.html`'s own fuller history section rather than duplicating it — see PIVOT_CHECKLIST.md, that page/Unit-0 overlap is still an open decision. |
| 1 | The Alphabet (A–Z) | `basic/alphabet`, unchanged | ✅ fully trained |
| 2 | Fingerspell Your Name | new interactive drill | ✅ reuses A–Z static model. **CHANGED this session: now a gated assessment** (`gated: true` on its UNITS entry) — completing the drill once (the drill is forgiving by design, so completion = pass) unlocks Unit 3 onward via `progress.js`'s new `recordUnitAssessment`/`getUnitAssessment`/`gatesClearedBefore`. Previously "always open," never blocked anything. |
| 3 | Numbers (0–9, working toward 10) | `basic/numbers`, unchanged | ❌ **CORRECTED 2026-08-23 (code-read audit, see `PIVOT_CHECKLIST.md` Phase A) — this row previously said "static 0–9 trained," which was wrong and self-contradicted §5's own model table below.** `asl_static_model/labels.json` has zero digit classes (25 classes, all letters); `classifyGesture()` can only ever return a label from that file, so `0,1,2,3,4,5,7,8` cannot be detected today, not just "not yet captured." `6`/`9`/`10` are correctly routed to the motion model but that model also has zero digit classes yet. **All 10 digits are Phase 7 work**, not just 3 — `PIVOT_CHECKLIST.md`'s Phase 7 item list reconciled to match this (merged digit item, static/motion split already decided in `dictionary.js`, not an open question). Now also gated behind Unit 2's assessment (see above). |
| 4 | Everyday Essentials | `medium/requests`, **narrowed this session** to `HELP`, `STOP`, `WATER`, `FOOD`, `HUNGRY`, `BATHROOM`, `GO`, `COME` | ❌ none trained yet — Phase 7. `FOOD` and `HELLO`(Unit 5)/`YES`/`NO`(Unit 6) got real `data.js` lesson content this session (previously zero content existed for any of the four). `BATHROOM` moved in from Unit 5 `health` — same physical sign as the "RESTROOM" item on Phase 7's list, merged rather than duplicated (see `dictionary.js`'s note). |
| 5 | Greetings and Introduction | **NEW this session** — `medium/essentials_greetings` | ❌ none trained yet — Phase 7. Sole content: `HELLO`. |
| 6 | Basic Responses | **NEW this session** — `medium/essentials_basic_responses` | ❌ none trained yet — Phase 7. `YES`/`NO`/`GOOD`/`BAD`/`WHO`/`WHAT`/`WHERE`/`WHEN`/`WHY`/`HOW`, moved in from the old Unit 4 `requests` and Unit 5 `feelings`. |
| 7 | Polite Expressions | **NEW this session** — `medium/essentials_polite_expressions` | ❌ none trained yet — Phase 7. `PLEASE`/`THANK YOU`/`EXCUSE`/`SORRY`, moved in from the old Unit 4 `requests` and Unit 5 `feelings`. ids prefixed `essentials_` to avoid colliding with the Unit 10 Phrasebook's own (unrelated, full-sentence) `basic_responses`/`polite_expressions` categories — see PIVOT_CHECKLIST.md's "New blocker." |
| 8 | Common Things & People | `medium` — family/places/time/temperature (+8 comingSoon: food/clothes/health/feelings/colors/money/animals/amounts) — **was Unit 5, bumped to make room for units 5–7 above** | ⚠️ family/time trained & working; places mostly trained except `COME`/`GO` (moved out to Unit 4 this session, so this is moot for `places` now — its remaining ~7 words are fine); temperature (`HOT`/`COLD`) placeholder only; food/feelings similarly had their Phase-7-tracked words (`WATER`/`HUNGRY`, `SORRY`/`GOOD`/`BAD`) moved out this session — their remaining words are genuinely comingSoon, no Phase 7 placeholder exists for any of them |
| 9 | Basic Phrases | `sequence_demo` mechanism + 6 curated real phrases — **was Unit 6, bumped** | ✅ done — built only from already-trained words |
| 10 | Phrasebook (read-only reference, not graded) | all 18 `intermediate` categories, ~100 sentences — **was Unit 7, bumped** | ❌ 0 trained — deliberately demoted to browse-only, not a graded unit |

**Still not done from Omen's target order:** literal Days-of-the-Week
content (today's `time` category is generic day/week/month/year
vocabulary, not the 7 weekday names) — needs new content, not
restructuring, not yet attempted; see PIVOT_CHECKLIST.md. (ASL History
copy for Unit 0 — the other item that used to be listed here — was
written 2026-08-23, see the Unit Map above.)

### Data model

- `UNITS`: `{ id, order, title, kind: 'info' | 'category-group' |
  'interactive' | 'reference', gated?: boolean }`. `gated` is NEW this
  session — only meaningful on `kind:'interactive'` units; see below.
- Every `CATEGORIES` entry gets a `unit` field (int, matches
  `UNITS[].order`).
- **`level` is not renamed.** Values (`basic`/`medium`/`intermediate`)
  stay as internal grouping keys throughout `data.js`, `dictionary.js`,
  every URL param, `getDetectionType()`. Renaming would touch 6+ files
  for zero pedagogical benefit — the pivot is about ordering/
  presentation, not the internal field name.

### Progress / unlock model

`progress.js` walks one flat chain across `UNITS` via
`getOrderedLiveCategories()` (filters to `kind==='category-group'` →
`getCategoriesForUnit`). `isCategoryUnlocked(level, categoryId)` walks
that chain — **a category is no longer auto-unlocked just for being
first in its `level`** (e.g. Unit 4's `requests`, `level:medium`, now
gates on Unit 3's `numbers`, `level:basic`, passing — the chain crosses
level boundaries). Unit 0/Unit 10/Unit 2 are structurally excluded
(wrong `kind`) **except Unit 2 also has a second, additive role — see
below.** Storage: `lw_progress_v3`, flat `{ categories,
levelAssessments, unitAssessments }` shape (`unitAssessments` added
this session), no migration shim from `v2` (reset accepted).
`level`/`category` *params* on every public `progress.js` function are
unchanged, so `learn.js`/`quiz.js`/`dashboard.js`/`lesson.js` never
needed a call-site rewrite for this.

**NEW this session — gated interactive units.** Fingerspell-as-
assessment (confirmed 2026-08-23, was previously "always open," never
blocked anything) needed a mechanism outside the CATEGORIES-based chain
above, since `fingerspell_name` deliberately has no CATEGORIES entry
(its content is generated at runtime from the learner's name, not
authored — see Phase 2's note in `AI_MEMORY.md`). Added: `gated: true`
on a `UNITS` entry marks it as a pass/fail gate; `recordUnitAssessment`/
`getUnitAssessment` (new, mirror `recordLevelAssessment`'s shape) store
the result; `getOrderedGates()` + `gatesClearedBefore(unitOrder)` (new)
check every gated unit whose `order` is smaller than the target
category's unit before falling through to the existing chain logic —
data-driven (reading `UNITS[].gated`), not a hardcoded check for
`fingerspell_name` by name, so a second gated interactive unit later
needs no changes to this logic. The pass condition itself is lenient by
design: `lesson.js`'s phrase-chaining drill already retries a wrong
letter rather than failing the attempt, so reaching "Phrase complete!"
IS the pass — there's no separate strict-mode UI. Flagged as a
simplification worth a second look if a stricter bar (no retries,
timed) is wanted later.

### Assessment format (✅ done, Phase 6)

Rounds 1–2 (Multiple Choice, Identification) unchanged from Rev 3. Added:
a non-blocking "Quick Check" recall question after every ~3 signs inside
`lesson.html` (tighter teach→quiz loop, matching lingvano.com); the
optional camera round now does ordered sign-by-sign detection for
phrase-type signs (Unit 6) via the same `phraseSteps`/`phraseStepIdx`
chaining `lesson.js` already used, instead of one atomic classify call.
Camera Check stays bonus-only everywhere — `computeGradedScore()` never
reads camera-round data, only the two graded rounds. 80% pass threshold
unchanged.

**Level Final Assessment — decided Phase 6:** CTA retired (`quiz.js`'s
`buildActionButtons()` no longer offers it after a category pass — the
trail's cross-level structure left no honest per-level slot for it), the
underlying mechanism is untouched and still runs via
`quiz.html?level=X&final=1` for anyone who has it bookmarked. A real
product call made by an AI session — flagged for confirmation, not
pre-approved.

### Suggested additions (not adviser-required, still open)

Deaf-culture micro-notes between units; Review/Trainer mode
(spaced-repetition camera drill over already-passed signs); optional
placement/skip test; sign-variation callouts (e.g. "HOW" has two
accepted forms). See `PIVOT_CHECKLIST.md` → Open/backlog.

---

## Rev 5 — Course player: `learn.html` trail folded into `lesson.html`

**Status: done, 2026-08-20.** `pages/lesson.html` gained a persistent
`<aside id="course-sidebar">` (`js/lesson.js`'s `renderCourseSidebar()`,
called from `updateLessonMeta()`), walking `getUnits()` into
collapsible per-unit sections with locked/current/done state — using
the exact same `LWData`/`LWProgress` calls `learn.js`'s trail and
`dashboard.js`'s unit rows already use, so all three surfaces agree.
Every sidebar row is a plain full-page `<a>` link (not a SPA swap) —
deliberate: rearchitecting the camera/MediaPipe boot lifecycle to
survive an in-place navigation was judged too risky without a real
browser to test webcam flows in. `pages/learn.html`/`js/learn.js` are
unchanged — still the entry point for *picking* a unit; the sidebar is
for moving through what's already unlocked once inside a lesson. Unit 0
and Unit 7 still render their real content on `learn.html` only; the
sidebar links out to them rather than duplicating.

Real-browser screenshots (2026-08-20) confirmed the sidebar renders
correctly and surfaced/fixed 4 unrelated bugs — see `AI_MEMORY.md`
Session Log. Two Phase 7 items were also folded into this session:
`HELLO`/`THANK YOU` and `HOT`/`COLD` now carry `disabled: true` in
`dictionary.js` (previously silently ran the wrong classifier).

---

## Rev 6 — Unit reorder + Fingerspell-as-assessment (Omen's request)

**Status: mapping + Fingerspell-as-assessment done, 2026-08-23. ASL
History content done 2026-08-23 (later, eighth session — content-only,
not a restructure, see the Unit Map above). Literal Days-of-the-Week
content still NOT done — needs new copywriting, not attempted.**

### Why

Omen's stated goal: restructure for better data-collection ordering.
Proposed a 10-item target order (see `PIVOT_CHECKLIST.md`'s original
request); two items were content-only (ASL History, Days of the Week)
and out of scope for a restructuring pass; the rest reordered/split
existing units. The word-to-category mapping was drafted, corrected
against actual `data.js` locations (the original ask assumed the 16
"Essential Words" were one Unit 4 bucket — they weren't, see
`PIVOT_CHECKLIST.md` Phase 7's correction), and confirmed before any
code changed.

### What changed

- **3 new units** inserted at order 5/6/7 (Greetings and Introduction,
  Basic Responses, Polite Expressions), each holding one new `medium`
  category (`essentials_greetings`, `essentials_basic_responses`,
  `essentials_polite_expressions` — prefixed to avoid colliding with
  the Phrasebook's own same-named categories, see the Unit Map).
  `common_things_people`/`basic_phrases`/`phrasebook` bumped from order
  5/6/7 → 8/9/10 to make room — every `CATEGORIES` entry pointing at
  those (31 entries) was bumped to match, since `getCategoriesForUnit`
  matches by numeric `order`, not unit id.
- **Unit 4 (`requests`, retitled "Everyday Essentials") narrowed** to
  `HELP`/`STOP`/`WATER`/`FOOD`/`HUNGRY`/`BATHROOM`/`GO`/`COME`. The
  other original members moved to the 3 new units above.
- **New lesson content written** for `HELLO`, `YES`, `NO`, `FOOD` — the
  only 4 signIds with zero prior `data.js` content (previously only
  disabled `dictionary.js` placeholders existed).
- **Merged, not duplicated:** Phase 7's tracked "RESTROOM" word and the
  pre-existing `BATHROOM` entry (Unit 5 `health`, still comingSoon) are
  the same physical sign. Moved `BATHROOM` into Unit 4 instead of
  writing a redundant new `RESTROOM` entry; renamed `dictionary.js`'s
  `RESTROOM` placeholder key to `BATHROOM` to match.
- **Fingerspell Your Name (Unit 2) is now a gated assessment** —
  reverses its "always open, never blocks anything" status. See
  "Progress / unlock model" above (Rev 4 section) for the
  `gated`/`getOrderedGates`/`gatesClearedBefore` mechanism and the
  lenient pass condition. `learn.js`'s unit card label updated to match
  (was hardcoded "Practice drill · always open" regardless of state).
- 3 small pre-existing bugs fixed along the way (not part of the
  reorder itself): `dictionary.js` missing 5 disabled placeholders for
  `requests`-category signs, a stale `data.js` comment claiming
  `COME`/`GO` were already trained, and stale `words[]` array entries
  (`GOOD/BAD`, `COME/GO`) left over from earlier signId splits — all
  cosmetic/documentation, `words[]` is not read by any code.

### What's still open

- Literal Days-of-the-Week content — no unit currently holds the 7
  weekday names; `time` (Unit 8) is generic day/week/month/year
  vocabulary and was left alone.
- Fingerspell's pass condition is deliberately lenient (completion =
  pass, matching the drill's existing forgiving retry behavior) — flag
  for a second look if a stricter bar is wanted.
- Not verified in a real browser — same limitation as every prior
  session. Verified in Node: `data.js` parses clean, `UNITS` order is a
  contiguous 0–10, every touched category resolves to the intended
  signIds, zero duplicate category/sign ids, and the gate-clearing logic
  was unit-tested standalone (Numbers correctly blocked until
  Fingerspell passes, Alphabet correctly never blocked).

---

## Rev 7 — Full curriculum replaced with Omen's uploaded lesson plan (2026-08-24)

**Status: done.** Replaces the Rev 4/6 11-unit table above wholesale —
that table is kept for history, not current. `PIVOT_CHECKLIST.md`'s
"Rev 7" section is the fuller decision log; this is the resulting
structure.

### Why

Omen uploaded a complete 68-topic vocabulary curriculum
(`updated_fixed_lesson.txt` — "already sorted," per Omen, one ASL-
basics topic per numbered line, background context before topic 1) and
asked for it to be implemented as the app's lesson plan, replacing the
Rev 4/6 ordering rather than extending it.

### What changed

- `UNITS`: 11 entries → **72 entries** (order 0–71). One topic = one
  unit, in the source file's exact order. `kind`/`gated` mechanics are
  byte-identical to Rev 6 — only which/how-many units exist changed.
- `CATEGORIES`: **90 entries** (was 33). 68 new-topic categories (one
  per new unit) + `alphabet`/`numbers` (basic level, unchanged) + the
  18-category Phrasebook (unchanged content, unit number only moved) +
  `sequence_demo` (unchanged) + `health`/`amounts`/`money` (unchanged
  content, folded in as secondary categories on the closest-fit new
  unit — see `PIVOT_CHECKLIST.md`, these were nearly dropped by
  mistake and restored).
- **Every id with real SIGNS/`dictionary.js` content is unchanged**:
  `alphabet`, `numbers`, `family`, `places`, `time`, `temperature`,
  `requests`, `essentials_greetings`, `essentials_basic_responses`,
  `essentials_polite_expressions`, `sequence_demo`, `health`,
  `amounts`, `money`, the 18 Phrasebook ids. Only `unit`/`title`/
  `words[]` moved on these — `dictionary.js`/`classifier.js` were not
  opened this session, so detection routing is byte-for-byte unchanged.
- **Two Rev 6 mechanisms kept though the source list doesn't mention
  them** (flagged for confirmation, not a unilateral deletion):
  Fingerspell Your Name (still Unit 2, gated) and Basic Phrases +
  Phrasebook (moved to the very end, Units 70/71, since the source list
  is pure vocabulary with nowhere for phrase-combination content to
  sit — matches Rev 4's own "combine what's already taught" framing).
- **Icon maps extended** (`UNIT_ICONS` in `learn.js`/`lesson.js`/
  `dashboard.js`, `CATEGORY_ICONS` in `learn.js`/`lesson.js`) to cover
  every new id — cosmetic only, would otherwise have silently fallen
  back to a generic icon for all 66 new units.

### The Unit Map (Rev 7 — current)

`level`/`category` field *values* are still unchanged internal
grouping keys (see Rev 4's "Data model" section above, still accurate)
— this table just maps the new `UNITS`/`CATEGORIES` content onto them.
"Detection status" reflects `dictionary.js` as of Rev 6 (untouched this
session): ✅ = real trained model behind it today, ❌ (structurally
present) = has a `disabled:true` placeholder waiting on Phase 7 capture,
❌ (content only) = new-plan topic with no `dictionary.js` entry at all
yet (the overwhelming majority — this was a curriculum/content
restructure, not a training session).

| Unit | Title | Category id(s) | Detection status |
|---|---|---|---|
| 0 | Welcome to ASL: A Brief History | — | N/A — info screen |
| 1 | The Alphabet | `alphabet` | ✅ trained |
| 2 | Fingerspell Your Name | — (interactive) | ✅ reuses trained A–Z model (gated assessment) |
| 3 | Numbers | `numbers` | ❌ Phase 7 (structurally present, capture-blocked) |
| 4 | Greetings | `essentials_greetings` | ❌ Phase 7 (structurally present, capture-blocked) |
| 5 | Polite Words | `essentials_polite_expressions` | ❌ Phase 7 (structurally present, capture-blocked) |
| 6 | People | `people` | ❌ Phase 7 (content only) |
| 7 | Feelings | `feelings` | ❌ Phase 7 (content only) |
| 8 | Needs | `requests` | ❌ Phase 7 (structurally present, capture-blocked) |
| 9 | Actions | `actions` | ❌ Phase 7 (content only) |
| 10 | Hand Actions | `hand_actions` | ❌ Phase 7 (content only) |
| 11 | Communication | `communication` | ❌ Phase 7 (content only) |
| 12 | Body | `body` | ❌ Phase 7 (content only) |
| 13 | Personal Information | `personal_information` | ❌ Phase 7 (content only) |
| 14 | Colors | `colors` | ❌ Phase 7 (content only) |
| 15 | Shapes | `shapes` | ❌ Phase 7 (content only) |
| 16 | Size | `size`, `amounts` | ❌ Phase 7 (content only) |
| 17 | Appearance | `appearance` | ❌ Phase 7 (content only) |
| 18 | Touch | `temperature` | ❌ Phase 7 (structurally present, capture-blocked) |
| 19 | Taste | `taste` | ❌ Phase 7 (content only) |
| 20 | Sound | `sound` | ❌ Phase 7 (content only) |
| 21 | Descriptions | `descriptions` | ❌ Phase 7 (content only) |
| 22 | Family | `family` | ✅ trained |
| 23 | Home | `home` | ❌ Phase 7 (content only) |
| 24 | Furniture | `furniture` | ❌ Phase 7 (content only) |
| 25 | Household | `household` | ❌ Phase 7 (content only) |
| 26 | Bathroom | `bathroom` | ❌ Phase 7 (content only) |
| 27 | Kitchen | `kitchen` | ❌ Phase 7 (content only) |
| 28 | School | `school` | ❌ Phase 7 (content only) |
| 29 | School Supplies | `school_supplies` | ❌ Phase 7 (content only) |
| 30 | Classroom | `classroom` | ❌ Phase 7 (content only) |
| 31 | Classroom Actions | `classroom_actions` | ❌ Phase 7 (content only) |
| 32 | Subjects | `subjects` | ❌ Phase 7 (content only) |
| 33 | Food | `food` | ❌ Phase 7 (content only) |
| 34 | Fruits | `fruits` | ❌ Phase 7 (content only) |
| 35 | Vegetables | `vegetables` | ❌ Phase 7 (content only) |
| 36 | Snacks | `snacks` | ❌ Phase 7 (content only) |
| 37 | Drinks | `drinks` | ❌ Phase 7 (content only) |
| 38 | Animals | `animals` | ❌ Phase 7 (content only) |
| 39 | Wild Animals | `wild_animals` | ❌ Phase 7 (content only) |
| 40 | Insects | `insects` | ❌ Phase 7 (content only) |
| 41 | Clothes | `clothes` | ❌ Phase 7 (content only) |
| 42 | Dressing | `dressing`, `health` | ❌ Phase 7 (content only) |
| 43 | Personal Items | `personal_items`, `money` | ❌ Phase 7 (content only) |
| 44 | Nature | `nature` | ❌ Phase 7 (content only) |
| 45 | Plants | `plants` | ❌ Phase 7 (content only) |
| 46 | Weather | `weather` | ❌ Phase 7 (content only) |
| 47 | Seasons | `seasons` | ❌ Phase 7 (content only) |
| 48 | Places | `places` | ✅ trained |
| 49 | Vehicles | `vehicles` | ❌ Phase 7 (content only) |
| 50 | Transportation | `transportation` | ❌ Phase 7 (content only) |
| 51 | Professions | `professions` | ❌ Phase 7 (content only) |
| 52 | Community | `community` | ❌ Phase 7 (content only) |
| 53 | Time | `time` | ✅ trained |
| 54 | Daytime | `daytime` | ❌ Phase 7 (content only) |
| 55 | Days | `days` | ❌ Phase 7 (content only) — closes the old "literal Days-of-the-Week content" gap, content-wise |
| 56 | Months | `months` | ❌ Phase 7 (content only) |
| 57 | Sequence | `sequence` | ❌ Phase 7 (content only) |
| 58 | Frequency | `frequency` | ❌ Phase 7 (content only) |
| 59 | Location | `location` | ❌ Phase 7 (content only) |
| 60 | Distance | `distance` | ❌ Phase 7 (content only) |
| 61 | Directions | `directions` | ❌ Phase 7 (content only) |
| 62 | Social | `social` | ❌ Phase 7 (content only) |
| 63 | Manners | `manners` | ❌ Phase 7 (content only) |
| 64 | Turn-Taking | `turn_taking` | ❌ Phase 7 (content only) |
| 65 | Responses | `responses` | ❌ Phase 7 (content only) |
| 66 | Questions | `essentials_basic_responses` | ❌ Phase 7 (structurally present, capture-blocked) |
| 67 | Conversation | `conversation` | ❌ Phase 7 (content only) |
| 68 | Requests | `making_requests` | ❌ Phase 7 (content only) |
| 69 | Answers | `answers` | ❌ Phase 7 (content only) |
| 70 | Basic Phrases | `sequence_demo` | ✅ trained (built only from already-trained words) |
| 71 | Phrasebook | 18 intermediate categories (unchanged) | ❌ 0 trained — deliberately browse-only, not graded |

### What's still open

- **Phase 7 is now a much longer list** — 66 of 72 units have zero
  `dictionary.js` entries at all (vs. Rev 6's much shorter gap list).
  See `PIVOT_CHECKLIST.md`'s Phase 7 note for the cross-reference to
  old vs. new unit numbers; reprioritizing the capture list to match
  the new front-of-the-line order (Units 3–8/18/22/48/53/66 already
  have some `dictionary.js` scaffolding) is flagged, not done.
- **Two kept-but-unlisted mechanisms** (Fingerspell Your Name; Basic
  Phrases + Phrasebook) need a nod of confirmation from Omen — the
  source list doesn't mention either, they were kept because deleting
  working features felt like a bigger unilateral call than keeping
  them out of the way at the end.
- **`money`'s placement (Unit 43, alongside Personal Items) is a
  forced fit** — the source's 68 topics have no shopping/money topic
  at all. Worth a real home if Omen wants one.
- **`numbers`'s `comingSoon: false` despite 0% of digits being
  trained** — pre-existing inconsistency (see Phase A in
  `PIVOT_CHECKLIST.md`), not introduced or fixed this session, just
  surfaced again since it's more visible now that so many other new
  units are correctly `comingSoon: true`.
- Not verified in a real browser — same limitation as every prior
  session. Verified in Node: `node --check` on `data.js`/`learn.js`/
  `lesson.js`/`dashboard.js`; a sandboxed VM eval of the full `data.js`
  confirming `UNITS` order is contiguous 0–71 and unique, every
  `CATEGORIES[].unit` resolves to a real `UNITS[].order`, every
  `CATEGORIES` id is unique per level, and zero `SIGNS[].category`
  values point at a category that no longer exists.

---

## Rev 8 — Teaching-rhythm pass: tighter recall loop (2026-08-25; personalization removed 2026-08-26)

**Status: done, this session (2026-08-25); personalization portion
removed 2026-08-26 — see the note below and `REV8_TEACHING_AUDIT.md` →
§12 for full reasoning.** Additive only — no unit/category/sign
ids, no ordering, no unlock logic touched, then or since. Brings LinguaWave's existing
lesson mechanics (already most of the way there) into a tighter
PERSONALIZE → TEACH → SEE A REAL SIGNER → RECALL → FEEDBACK → OPTIONAL
PRACTICE → CONTINUE rhythm, per a product request to borrow the
*teaching method* of a reference ASL app (not its branding, UI, AI/
bot, or visual design — none of that was touched or copied).

> **Personalization removed, 2026-08-26.** The PERSONALIZE step
> described below (`initPersonalization()`, `#personalize-card`/
> `#personalize-summary`, `lw_personalize_v1`/`lw_personalize_skipped_v1`)
> no longer exists in the app — removed per explicit request, not
> relocated to the Dashboard, not replaced with any other onboarding/
> preference system. **This does not alter the teaching loop, curriculum,
> progress, unlocks, or assessment system** — the lesson now goes
> straight to TEACH (sign image/description/tips) → SEE A REAL SIGNER
> (video) → RECALL (Quick Check, unchanged) → FEEDBACK → OPTIONAL
> PRACTICE (camera) → CONTINUE, same mechanics as below minus the one
> step. The rest of this section (What changed / What's still open) is
> preserved as the historical record of what Rev 8 originally shipped;
> read the personalization bullet below as *removed*, not current.

### Why

The request: don't dump a vocabulary list before asking the learner to
recall anything; teach one sign, then recall it immediately, with
immediate feedback, before moving on. `pages/lesson.html` already had
almost this exact shape (image → description/tips → video → Quick
Check → optional camera practice → Prev/Next) from Rev 4 Phase 6/Rev 5
— this pass is a small, targeted tightening of what already existed,
not a rebuild. See `PIVOT_CHECKLIST.md` → "Rev 8" for the fuller
before/after reasoning per item.

### What changed

- **`js/lesson.js` — `QUICK_CHECK_CLUSTER_SIZE`: 3 → 1.** This one
  constant is what actually converts the lesson loop from "Quick Check
  every 3rd sign" to "Quick Check after every sign" — `shouldShowQuickCheck()`
  and `buildQuickCheckQuestion()`'s cluster logic were already generic
  over this constant and needed no other change. Categories with only
  1 sign still correctly skip Quick Check entirely (pre-existing
  `totalSigns <= 1` guard, untouched).
- **`buildQuickCheckQuestion()` extended (not duplicated) for recall
  variety** — per the reference mechanics list's "identify a sign from
  a signer image": ~50% of the time the question now shows the sign's
  own `imageUrl` (same field the lesson's own reference image already
  renders) and asks which word it is, instead of always reading a text
  description. Falls back to the text format automatically if a sign
  has no image, so this can never render a broken question.
  `showQuickCheck()` renders the new optional `#quick-check-image`,
  with an `onerror` fallback (same defensive pattern `#lesson-image`
  already used) instead of a broken-image icon.
- ~~**New: light personalization**~~ — **REMOVED 2026-08-26, see the
  note above.** Was: `initPersonalization()` + `#personalize-card`/
  `#personalize-summary` in `lesson.html`, the PERSONALIZE step. Two
  optional questions ("who do you want to use ASL with?" / "how much
  time can you practice?"), shown at most once (first-ever lesson
  visit with no saved answer and no prior skip), collapsing to a
  one-line editable summary afterward. Storage was a single
  `localStorage` key (`lw_personalize_v1`, plus a
  `lw_personalize_skipped_v1` flag) — never a Firestore field, never a
  `js/data.js` structure, never read by `js/engine/progress.js`,
  `isCategoryUnlocked()`, or any ordering logic.
- **No change** to `SEE A REAL SIGNER` (the existing `#lesson-video`
  block already covers this — reused as-is) or to the optional-camera-
  practice step (`#btn-start-assessment` / the whole `.camera-panel` —
  reused as-is, still never a pass/fail gate). `js/data.js`,
  `js/learn.js`, `js/engine/progress.js`, `js/auth.js`, `pages/learn.html`,
  `pages/quiz.html`, `js/quiz.js` were **not opened for editing** this
  session — read for context only, confirming no dependency actually
  required touching them.

### What's still open

- Recall-variety formats D's other bullets ("choose which video/sign
  represents a word," "phrase completion," "sign/word matching") are
  not implemented — only the picture-identification variant was added
  this session. Flagged as a natural follow-up inside the same
  `buildQuickCheckQuestion()` extension point, not started because the
  request framed all of D as "where practical," not required. Still
  open — unaffected by the 2026-08-26 personalization removal.
- ~~Personalization answers are collected but not yet *used*
  anywhere...~~ — **moot, feature removed 2026-08-26.**
- Not verified in a real browser — same limitation as every prior
  session. This session's verification differs from prior sessions'
  Node-only syntax checks, though: a jsdom-based runtime harness
  actually executed the unmodified new/changed code (DOM refs through
  `initPersonalization()`, extracted verbatim from the real file)
  against a real DOM built from the real `pages/lesson.html`, with
  simulated clicks and `localStorage` — 14 test groups / 25 assertions,
  all passing. See `AI_MEMORY.md`'s Session Log for specifics. This is
  real DOM/interaction coverage, not just parse-level syntax checking,
  but it still isn't a real browser (no actual webcam/MediaPipe
  involved, camera imports were stubbed out since this pass never
  touches that code path). **The personalization-specific coverage in
  that harness is now moot** (feature removed) — the 2026-08-26
  removal session's own jsdom harness (30 structural + full top-to-
  bottom execution assertions, see `AI_MEMORY.md`) is the current
  verification record for what remains.

---

## Dashboard design principles

(Realized in code as of the 2026-08-21/22 Priority 0–2 pass — see
`PIVOT_CHECKLIST.md`. Keeping the principles here since they should
keep guiding any future dashboard work, not just document what already
shipped.)

```text
Dashboard = "What should I do next?" → next action + compact summary + review
Learn     = "Where can I go?"        → full learning-path navigation
Lesson    = "Teach and practice this" → course-player content + checks
Quiz      = "Can I demonstrate recall?" → graded category assessment
```

The dashboard should never become a third copy of `learn.html`'s trail
or `lesson.html`'s sidebar — it's a summary that consumes their same
progress APIs (`getOrderedLiveCategories`, `getCategoryProgress`,
`isCategoryUnlocked`, `getUnits`, `getCategorySigns`,
`getAllLearnedSigns`), never a second unlock/ordering algorithm. The
headline number is **Practice Progress** (signs practiced), explicitly
not "Mastery" — assessment pass/fail is a separate, differently-labeled
signal. First viewport should prioritize the next action (Continue
Learning) over the aggregate stats.

**Accessibility/loading/error patterns, however, SHOULD spread to every
page** — unlike the progress logic above, these are presentation-only
and were dashboard-specific by accident (built during the 2026-08-21/22
Priority 2 pass, never ported) rather than by design. Design pass,
2026-08-23 (see `PIVOT_CHECKLIST.md`): `learn.html`/`lesson.html` now
carry the same 4 patterns dashboard.css established — skip link,
`:focus-visible` ring on every interactive card/row, a loading-state
placeholder instead of a blank pre-render flash, and a real fallback UI
(reusing `css/style.css`'s `.alert--error`) if `window.LWData` fails to
load or a render call throws. The skip-link + loading-pulse rules
themselves moved to `css/style.css` (a new §16 — see that file) so a
future page reaches for the shared class instead of copy-pasting
`dashboard.css`'s page-local versions a third time; `dashboard.css`
itself was left untouched (still has its own identical, working copies)
to avoid any regression risk to that already-shipped page.
**`quiz.html`/`quiz.css` had the identical gap — done 2026-08-23 (later,
seventh session).** Same 4 patterns: skip link (`#question-card`),
`:focus-visible` on `.quiz-option`, `.loading-pulse` on the static
"Loading…" text, and a real error fallback (new `js/quiz.js`
`showQuizUnavailable()`, wired into a `!window.LWData` guard +
try/catch in `boot()`). See `PIVOT_CHECKLIST.md`'s matching entry for
the fuller writeup, including a pre-existing double-`boot()`-call bug
found and fixed along the way (unrelated to the design pass itself).

---

## Rev 3 — Lesson/assessment/progress rework (superseded by Rev 4/5)

Per-sign camera check became optional practice, not a pass/fail gate
(MediaPipe accuracy has real limits). Added the graded category/level
assessment layer (`quiz.js`, 3 rounds, 80% threshold, camera round
bonus-only). Added `progress.js` as the single source of truth for
practiced signs / assessment results / unlock rules (superseded by
Rev 4 Phase 3's flat cross-unit chain — the per-level unlock rule this
revision introduced is history, not current behavior). `auth.js` and UI
styling were explicitly out of scope for this revision.

---

## 1. Project Overview

Web-based ASL learning system for beginner learners. Static
HTML5/CSS3/vanilla JS, no framework, no build step.

**Stack:** Firebase Firestore (DB), Firebase Auth (real, not bypass —
see §6), Firebase Storage (images/video), Firebase Hosting or any
static host.

**Deliberately out of scope:** other sign languages (ASL only), no
admin panel/CMS (signs/questions are hand-edited in `js/data.js` by the
dev team — one user role, no separate access-control layer to build).

---

## 2. File Structure

```
linguawave/
├── index.html                  # Log In / Sign Up — only entry point
├── pages/
│   ├── dashboard.html          # Post-login hub
│   ├── learn.html              # Unit trail / category picker
│   ├── lesson.html             # Sign lesson viewer + course sidebar (Rev 5)
│   ├── quiz.html               # Assessment
│   ├── feedback.html           # Post-level survey
│   └── intro-to-asl.html       # Deaf-culture/background reading
├── css/  (one file per page + style.css tokens + toast.css)
├── js/
│   ├── auth.js                 # Real Firebase auth — teammate owns this
│   ├── data.js                 # UNITS/CATEGORIES/SIGNS content
│   ├── main.js                 # Shared nav/progress-bar/user-detail utils
│   ├── learn.js / lesson.js / quiz.js / feedback.js / dashboard.js / theme.js
│   └── engine/
│       ├── classifier.js       # Loads + runs the two TF.js models
│       ├── dictionary.js       # SIGN_DICTIONARY
│       ├── progress.js         # window.LWProgress
│       └── renderer.js         # Canvas skeleton overlay
│   └── camera/cameraUtils.js · tracking/mediapipe.js
├── asl_static_model/ , asl_motion_model/   # labels.json + model.json + weights
└── assets/images/ , assets/videos/
```

---

## 3. Page-by-Page

- **`index.html`** — Log In / Sign Up tabs, real Firebase Auth via
  `auth.js`. `LWAuth.redirectIfLoggedIn()` bounces an already-logged-in
  user straight to the dashboard. No signup-time level picker (Rev 4
  Phase 5) — every account gets `level: 'basic'`.
- **`pages/dashboard.html`** — welcome + Continue Learning hero (primary
  CTA + a secondary "Open Unit N Path" button next to it, straight to
  `learn.html?unit=X` — present since the Priority 2 §13 session,
  previously undocumented here; flagged by the 2026-08-22 screenshot
  review), account info (name/email/Current Unit/member-since), aggregate
  + per-unit progress, "Signs You've Learned" recap, review entry point.
  Auth-guarded via `LWAuth.requireAuth()`.
- **`pages/learn.html`** — the unit trail (locked/current/done nodes).
  `?unit=`/`?category=` params.
- **`pages/lesson.html`** — sign viewer + course sidebar (Rev 5). Optional
  camera practice, non-blocking Quick Check every ~3 signs. `?level=&
  category=&sign=` params.
- **`pages/quiz.html`** — 3-round category/level assessment, 80% pass
  threshold on the two graded MC/Identification rounds.
- **`pages/feedback.html`** — 5-question survey; still just
  `console.log`s answers (`TODO`: write to Firestore `surveys`).

---

## 4. Firestore Data Schema (planned/partial)

```
users/{uid}/
  name, email, level: "basic"|"medium"|"intermediate"
  progress: { basic: {completed,total,completedLessons}, medium:{…}, intermediate:{…} }
  learnedSigns: [...]

signs/{id}/        level, signId, title, description, imageUrl, videoUrl, order
questions/{id}/     level, relatedSign?, prompt, options[], correctId, order
surveys/{id}/       userId, level, timestamp, q1..q5
```

No `role` field, no admin collection — every account is a learner.
`signs`/`questions` are populated by editing `js/data.js`, not an
in-app upload flow.

---

## 5. Auth — `js/auth.js` (teammate-owned, out of scope for AI sessions)

Real Firebase Auth (email+password) + a Firestore profile write/read.
Route guards: `requireAuth(loginPath)`, `redirectIfLoggedIn(dashPath)`,
used at the top of every guarded page.

---

## 6. Design System Reference

| Token | Value | Use |
|---|---|---|
| `--clr-accent` | `#3fb950` | Primary actions, progress, done states |
| `--clr-yellow` | `#d29922` | Medium level badge |
| `--clr-orange` | `#e3822a` | Intermediate level badge |
| `--clr-blue`   | `#388bfd` | Links, info states |
| `--clr-red`    | `#f85149` | Errors, locked content |
| `--font-display` | Space Grotesk | Headings |
| `--font-body`    | Inter | Body text |
| Pass threshold | 80% | Quiz assessment |