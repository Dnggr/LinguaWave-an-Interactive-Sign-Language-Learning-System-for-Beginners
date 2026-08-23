# LinguaWave — System Architecture & Developer Handoff

<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST, then
     PIVOT_CHECKLIST.md, then this file's Rev 4 section. -->
> Capstone Project · ASL Interactive Learning System for Beginners

**Current state, in one line:** Rev 4 (curriculum pivot to one linear
"Basic ASL" path) is code-complete except Phase 7 (content
capture/retraining — see `PIVOT_CHECKLIST.md`). Rev 5 (course-player
sidebar) and the Dashboard UX pass are both done. Rev 6 (Omen's unit
reorder — new Greetings/Basic Responses/Polite Expressions units,
Fingerspell-as-assessment) is code-complete as of 2026-08-23, same
caveat as Rev 4: content/training (Phase 7) still open, and 2 pieces of
Omen's original request (ASL History content, literal Days-of-the-Week
content) are explicitly not done — see the Unit Map. `js/auth.js` is
real Firebase auth, out of scope for AI sessions (teammate owns it).

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
| 0 | Welcome to ASL | new, static text | N/A — no camera. **Still titled/framed as generic welcome, NOT "ASL History"** — Omen's target order wants History content here, but that's new copywriting, not a restructure; not done this session, see PIVOT_CHECKLIST.md. |
| 1 | The Alphabet (A–Z) | `basic/alphabet`, unchanged | ✅ fully trained |
| 2 | Fingerspell Your Name | new interactive drill | ✅ reuses A–Z static model. **CHANGED this session: now a gated assessment** (`gated: true` on its UNITS entry) — completing the drill once (the drill is forgiving by design, so completion = pass) unlocks Unit 3 onward via `progress.js`'s new `recordUnitAssessment`/`getUnitAssessment`/`gatesClearedBefore`. Previously "always open," never blocked anything. |
| 3 | Numbers (0–9, working toward 10) | `basic/numbers`, unchanged | ❌ **CORRECTED 2026-08-23 (code-read audit, see `PIVOT_CHECKLIST.md` Phase A) — this row previously said "static 0–9 trained," which was wrong and self-contradicted §5's own model table below.** `asl_static_model/labels.json` has zero digit classes (25 classes, all letters); `classifyGesture()` can only ever return a label from that file, so `0,1,2,3,4,5,7,8` cannot be detected today, not just "not yet captured." `6`/`9`/`10` are correctly routed to the motion model but that model also has zero digit classes yet. **All 10 digits are Phase 7 work**, not just 3 — `PIVOT_CHECKLIST.md`'s Phase 7 item list itself hasn't been updated to reflect this yet, flagged there. Now also gated behind Unit 2's assessment (see above). |
| 4 | Everyday Essentials | `medium/requests`, **narrowed this session** to `HELP`, `STOP`, `WATER`, `FOOD`, `HUNGRY`, `BATHROOM`, `GO`, `COME` | ❌ none trained yet — Phase 7. `FOOD` and `HELLO`(Unit 5)/`YES`/`NO`(Unit 6) got real `data.js` lesson content this session (previously zero content existed for any of the four). `BATHROOM` moved in from Unit 5 `health` — same physical sign as the "RESTROOM" item on Phase 7's list, merged rather than duplicated (see `dictionary.js`'s note). |
| 5 | Greetings and Introduction | **NEW this session** — `medium/essentials_greetings` | ❌ none trained yet — Phase 7. Sole content: `HELLO`. |
| 6 | Basic Responses | **NEW this session** — `medium/essentials_basic_responses` | ❌ none trained yet — Phase 7. `YES`/`NO`/`GOOD`/`BAD`/`WHO`/`WHAT`/`WHERE`/`WHEN`/`WHY`/`HOW`, moved in from the old Unit 4 `requests` and Unit 5 `feelings`. |
| 7 | Polite Expressions | **NEW this session** — `medium/essentials_polite_expressions` | ❌ none trained yet — Phase 7. `PLEASE`/`THANK YOU`/`EXCUSE`/`SORRY`, moved in from the old Unit 4 `requests` and Unit 5 `feelings`. ids prefixed `essentials_` to avoid colliding with the Unit 10 Phrasebook's own (unrelated, full-sentence) `basic_responses`/`polite_expressions` categories — see PIVOT_CHECKLIST.md's "New blocker." |
| 8 | Common Things & People | `medium` — family/places/time/temperature (+8 comingSoon: food/clothes/health/feelings/colors/money/animals/amounts) — **was Unit 5, bumped to make room for units 5–7 above** | ⚠️ family/time trained & working; places mostly trained except `COME`/`GO` (moved out to Unit 4 this session, so this is moot for `places` now — its remaining ~7 words are fine); temperature (`HOT`/`COLD`) placeholder only; food/feelings similarly had their Phase-7-tracked words (`WATER`/`HUNGRY`, `SORRY`/`GOOD`/`BAD`) moved out this session — their remaining words are genuinely comingSoon, no Phase 7 placeholder exists for any of them |
| 9 | Basic Phrases | `sequence_demo` mechanism + 6 curated real phrases — **was Unit 6, bumped** | ✅ done — built only from already-trained words |
| 10 | Phrasebook (read-only reference, not graded) | all 18 `intermediate` categories, ~100 sentences — **was Unit 7, bumped** | ❌ 0 trained — deliberately demoted to browse-only, not a graded unit |

**Still not done from Omen's target order** (flagged, not attempted this
session — both need new content, not restructuring): ASL History copy
for Unit 0, and literal Days-of-the-Week content (today's `time`
category is generic day/week/month/year vocabulary, not the 7 weekday
names) — see PIVOT_CHECKLIST.md.

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
History content and literal Days-of-the-Week content NOT done — both
need new copywriting, not restructuring, and weren't attempted.**

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

- ASL History content for Unit 0 (currently generic "Welcome to ASL").
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
**`quiz.html`/`quiz.css` has the identical gap and is still unaddressed**
— named but out of scope in `PIVOT_CHECKLIST.md`'s original audit, still
true after this session.

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