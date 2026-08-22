# LinguaWave — System Architecture & Developer Handoff

<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST, then
     PIVOT_CHECKLIST.md, then this file's Rev 4 section. -->
> Capstone Project · ASL Interactive Learning System for Beginners

**Current state, in one line:** Rev 4 (curriculum pivot to one linear
"Basic ASL" path) is code-complete except Phase 7 (content
capture/retraining — see `PIVOT_CHECKLIST.md`). Rev 5 (course-player
sidebar) and the Dashboard UX pass are both done. `js/auth.js` is real
Firebase auth, out of scope for AI sessions (teammate owns it).

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

| Unit | Title | Source data | Detection status |
|---|---|---|---|
| 0 | Welcome to ASL (background, how practice works, Deaf-culture notes) | new, static text | N/A — no camera |
| 1 | The Alphabet (A–Z) | `basic/alphabet`, unchanged | ✅ fully trained |
| 2 | Fingerspell Your Name | new interactive drill | ✅ reuses A–Z static model |
| 3 | Numbers (0–9, working toward 10) | `basic/numbers`, unchanged | ⚠️ static 0–9 trained; `6`/`9`/`10` correctly routed to motion model but that model has zero digit classes yet — Phase 7 |
| 4 | Everyday Essentials | `medium/requests` + 16 `disabled:true` placeholders | ❌ none trained yet — Phase 7 |
| 5 | Common Things & People | `medium` — family/places/time/temperature (+8 comingSoon: food/clothes/health/feelings/colors/money/animals/amounts) | ⚠️ family/time trained & working; **places mostly trained, except `COME`/`GO` which are `disabled: true` placeholders (corrected 2026-08-23 — a stale comment previously claimed both were trained)**; temperature (`HOT`/`COLD`) has placeholder entries only; the 8 comingSoon ones have no `SIGN_DICTIONARY` entry at all (by design, hidden from UI) — though 5 of those comingSoon words (`SORRY`/`GOOD`/`BAD` in `feelings`, `WATER`/`HUNGRY` in `food`) DO have disabled placeholders, since they're also on the Phase 7 Essential Words list; see `PIVOT_CHECKLIST.md` → Phase 7 |
| 6 | Basic Phrases | `sequence_demo` mechanism + 6 curated real phrases (`MOM_HOME`, `DAD_WORK`, `TODAY_SCHOOL`, `FINISH_WORK`, `SISTER_STORE`, `TODAY_GRANDMA_HOME`) | ✅ done — built only from already-trained words |
| 7+ | Phrasebook (read-only reference, not graded) | all 18 `intermediate` categories, ~100 sentences | ❌ 0 trained — deliberately demoted to browse-only, not a graded unit (full-sentence detection for ~100 sentences isn't realistic capstone scope) |

### Data model

- `UNITS`: `{ id, order, title, kind: 'info' | 'category-group' |
  'interactive' | 'reference' }`, sits above `CATEGORIES`.
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
level boundaries). Unit 0/Unit 7/Unit 2 are structurally excluded
(wrong `kind`). Storage: `lw_progress_v3`, flat `{ categories,
levelAssessments }` shape, no migration shim from `v2` (reset accepted).
`level`/`category` *params* on every public `progress.js` function are
unchanged, so `learn.js`/`quiz.js`/`dashboard.js`/`lesson.js` never
needed a call-site rewrite for this.

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