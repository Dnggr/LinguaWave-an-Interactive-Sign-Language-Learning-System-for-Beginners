# LinguaWave — System Architecture & Developer Handoff
<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST. -->
> Capstone Project 2025 · ASL Interactive Learning System for Beginners
> **Rev. 5** — `pages/lesson.html` turned into a persistent "course player": a collapsible course-outline sidebar (all `UNITS`, locked/current/done, per-unit progress) merged directly into the lesson page, replacing the `learn.html` → `lesson.html` click-through for browsing already-unlocked content. A UI/UX change, not curriculum content — see the Rev 5 section below. `learn.html` itself is unchanged (still the entry point for picking a unit). Also fixed 2 flagged Phase 7 bugs in `dictionary.js` (`HELLO`/`THANK YOU` now `disabled:true`; `HOT`/`COLD` now have placeholder entries) — see `PIVOT_CHECKLIST.md`. **Verified in a real browser for the first time on 2026-08-20 (review session)**, via user-provided screenshots of the dashboard→lesson journey — confirmed the sidebar renders correctly, and found/fixed 4 bugs by tracing the screenshots through the code (a false-positive "correct" match in plain practice mode, a stale image hint on the name drill, duplicated text in the dashboard's recap chips, and a pre-existing "Start Assessment"/"Practice Check" button-text mismatch) — see the "Review session" addendum at the end of the Rev 5 section below and `PIVOT_CHECKLIST.md`'s matching section for the full list, including items flagged but not fixed. **All 5 of that review session's remaining flagged items (including the one left as "needs a decision") were cleared 2026-08-21** — see the second addendum at the end of the Rev 5 section below and `PIVOT_CHECKLIST.md`'s matching section.
> **Dashboard UX Review (2026-08-21)** — a learner-perspective UX
> review of `pages/dashboard.html` (Dashboard → Learn → Lesson,
> screenshot-based), producing a redesign direction + checklist for a
> future dashboard-only implementation session. **No code was
> changed** — this is a product/UX recommendation layered on top of
> the existing Rev 4/5 architecture, not a revision of it. See the
> "Dashboard UX Review Addendum" section below and
> `PIVOT_CHECKLIST.md`'s matching checklist for the full findings.
> **Rev. 4 (IN PROGRESS — Phase 7 partially done)** — Curriculum pivot: single continuous "Basic ASL" path replacing the three user-selectable levels. Planning complete 2026-08-17; Phase 1 (`data.js` restructure), Phase 2 (Fingerspell Your Name drill), Phase 3 (`progress.js` unlock-chain flattening), Phase 4 (`learn.js`/`dashboard.js` trail-view UI), Phase 5 (signup-time level picker removed), and Phase 6 (`quiz.js`/`lesson.js` assessment format changes) implemented 2026-08-18 → 2026-08-20 — see the Rev 4 section below and `PIVOT_CHECKLIST.md` for phase-by-phase status. All app-code phases are complete. Phase 7 (content capture + model retraining) is partially done as of 2026-08-20: the `6`/`9`/`10` routing fix and 6 curated Unit 6 phrases have landed; capture + retraining for the 16 Essential Words, 5 phrase placeholders, and `HELLO`/`THANK YOU`/`HOT`/`COLD` is still open (the latter four now fail cleanly instead of silently — see Rev 5) — see `PIVOT_CHECKLIST.md` and `AI_MEMORY.md`'s Session Log for detail.
> **Rev. 3** — Lesson/assessment/progress rework (UI + auth untouched, out of scope for this pass).
> **Rev. 2** — Admin panel removed, login/register merged into the landing page, auth running in bypass mode pending Firebase integration.

## Rev 5 — Course Player merge: `learn.html` trail browsing folded into `lesson.html`

**Status: done, 2026-08-20 (a session after Rev 4 Phase 7).** Requested
directly by the user, shown a reference screenshot (a Cisco Networking
Academy course page: persistent left sidebar course outline with
per-module progress bars and collapsible modules, main pane showing
lesson content inline with prev/next). Confirmed via a follow-up
question that "full merge" was wanted — one page, sidebar + inline
content + prev/next — over two lighter options (visual-only restyle
of the existing trail, or a sidebar bolted onto `learn.html` alone
while keeping the click-through to a separate `lesson.html`).

### What changed

`pages/lesson.html` (already the page with all the camera/MediaPipe/
classifier lifecycle code, and already the page every other screen
deep-links into via a stable `?level=&category=&sign=` URL) gained a
new persistent sidebar column: `<aside id="course-sidebar">`, wrapped
together with the existing (UNCHANGED) `.lesson-layout` two-column
grid inside a new `.course-layout` flex container. `js/lesson.js`
gained a `renderCourseSidebar()` function, called once at the end of
`updateLessonMeta()` (the one function every `boot()` path already
calls, including both early-return branches), that walks
`window.LWData.getUnits()` and renders one row/section per unit:

- `kind: 'info'` (Unit 0) and `kind: 'interactive'` (Unit 2, the name
  drill) render as flat single rows.
- `kind: 'category-group'` / `'reference'` units render as a
  collapsible section with a mini progress bar. Only the unit the
  learner is currently inside starts expanded; others start collapsed
  (click the header to toggle). Units with exactly one live category
  list its signs directly; units with more than one (Common Things &
  People, Phrasebook) show each category as its own sub-row, with only
  the *current* category expanded down to individual signs — clicking
  any other category jumps straight to its first not-yet-done sign.
- Locked/current/done state is computed with the exact same
  `window.LWData`/`window.LWProgress` calls `js/learn.js`'s trail and
  `js/dashboard.js`'s unit rows already use (`isCategoryUnlocked`,
  `getCategoryProgress`, `getCategorySigns`, `getCategoriesForUnit`) —
  so this sidebar can't silently disagree with either of those screens
  about what's locked. It never writes progress — purely a read/nav
  surface.

Every row is a plain `<a href="lesson.html?...">` — a real, full page
navigation, identical in kind to the Prev/Next buttons and the old
"Back to lessons" link that were already on this page. This was a
deliberate scope choice: a true single-page app (swapping content
without a full reload) would need the camera/MediaPipe boot-and-
teardown lifecycle re-architected to survive an in-place sign change
instead of a fresh page load, which is a much larger and riskier
change to make without a real browser to test camera-dependent flows
in (this sandbox's standing limitation, flagged by every phase before
this one too). Because every sidebar link is a normal navigation,
`shutdown()`'s existing `window.addEventListener('beforeunload', ...)`
keeps working with zero new code, and the camera/classifier code path
itself was not touched at all.

### What deliberately did NOT change

- **`pages/learn.html` / `js/learn.js` — untouched.** It's still the
  dashboard's entry point for *picking* a unit (its Phase 4 trail-map
  UI). The new sidebar is for moving through what's already unlocked
  once you're inside a lesson — which is what the reference screenshot
  was actually showing (mid-course, not a landing/catalog page).
- Unit 0 (Welcome) and Unit 7 (Phrasebook) still render their actual
  content on `learn.html` only — the sidebar links out to
  `learn.html?unit=welcome` / `learn.html?unit=phrasebook` rather than
  duplicating `UNIT0_CONTENT`'s static text or the ~100-item Phrasebook
  browse list inside `lesson.js`. Flagged as a follow-on if full
  parity is wanted.
- No new interaction pattern (e.g. a hamburger toggle) was added for
  small screens — the sidebar just stacks above the content/camera
  panels under 1200px width (a new `.course-layout` breakpoint,
  reusing the same "stack the columns" pattern `.lesson-layout` already
  used for its own 1024px breakpoint).

### Bug fixes bundled into the same session

Two Phase 7 items `PIVOT_CHECKLIST.md` had explicitly flagged as
"small, safe AI-doable, just not made unprompted" were made this
session (the "fix bugs" part of the request was read as the missing
go-ahead): `HELLO`/`THANK YOU` in `dictionary.js` now carry
`disabled: true` (confirmed last session to be absent from
`asl_motion_model/labels.json` — they now fail the same clean way the
16 Essential Words already do, instead of running a doomed classifier
match every attempt); `HOT`/`COLD` now have real `disabled: true`
placeholder entries (previously had none at all, which meant
`getDetectionType()`'s `?? 'static'` fallback silently ran the *wrong*
classifier). Neither is trained yet — capture + retraining for all
four is still open, same as the 16 Essential Words and 5 phrase
placeholders.

### Verification + risk notes

`node --check` on both edited JS files (no syntax errors); every new
DOM id and `window.LWData`/`window.LWProgress` call cross-checked
against the real markup/exports by `grep`, same discipline as Rev 4's
own phases. **Not exercised in a real browser** — same standing
limitation as every phase before this one, worth calling out
specifically here because the new code (collapse/expand toggling,
sticky positioning at various widths, the nested-category expand
branch for multi-category units) has the least prior precedent to
lean on. Recommend clicking through a multi-category unit (Common
Things & People) specifically to check that branch, and resizing the
window across the new 1200px breakpoint to confirm the stack behaves.

### Addendum (2026-08-20, review session) — first real-browser check + 4 bug fixes

The "not exercised in a real browser" gap above was partially closed:
the user provided 6 actual screenshots (dashboard, the Fingerspell
Your Name lesson, the Letter A lesson, the Alphabet grid, the Unit 0
Welcome screen) from a live local server. The sidebar itself checked
out — locked/current/done states and per-unit progress in the
screenshots matched what the code should produce. Tracing the
screenshots against the actual code surfaced 4 real bugs, all fixed
this session (full before/after in `AI_MEMORY.md`'s matching Session
Log entry and `PIVOT_CHECKLIST.md`'s "Review session" section):

1. `js/lesson.js` `handlePracticeFrame()` — plain single-sign practice
   showed a false "✅ Nice!" success message for any confidently
   classified sign in the category, never compared against the sign
   the lesson teaches. Now compares `result.label` to the active
   `sign`, matching the pattern assessment mode and phrase-mode
   practice already used.
2. `js/lesson.js` `updateLessonMeta()` — the name drill showed a
   stale "Add image to assets/images/basic/A.png" hint, since its
   `signData` is null by design and the branch that sets that hint
   was never reached. Now sets drill-appropriate copy.
3. `js/dashboard.js` `renderRecap()` — the dashboard's recap chips
   rendered each sign's text twice ("A A", "Y Y", "Z Z") via a
   redundant `<span>` left over from before `.recap-card__img` became
   a self-contained pill. Removed.
4. The pre-existing (already flagged in code comments, not newly
   found) "🎥 Start Assessment" vs. intended "🎥 Practice Check
   (optional)" button-text mismatch, across 4 sites in
   `pages/lesson.html` and `js/lesson.js`. Now consistent.

One related item was flagged but deliberately NOT fixed:
`updateConfidenceUI()`'s Detected Sign color/confidence-bar fill are
still driven by raw `result.matched`, not the same target-sign
comparison fix #1 added — see the flagging comment above that function
in `lesson.js` for why (it's shared unconditionally by both practice
and assessment mode, so needs its own decision). `js/auth.js` was
explicitly out of scope this session (teammate-owned) and was not
opened. New suggestions surfaced but not implemented (a hardcoded
"ASL Alphabet" welcome-banner string, a "viewed" vs. "practiced"
terminology inconsistency, unblocked direct-URL access to locked
categories, and the camera panel's two warning boxes firing
immediately on first open) are tracked as unchecked items in
`PIVOT_CHECKLIST.md` rather than repeated here.

### Addendum (2026-08-21) — the 4 surfaced-but-not-implemented items
### above, plus the 1 flagged "needs a decision" item, all cleared

Requested directly ("do this" over the full list, including the
decision-pending `updateConfidenceUI()` item). `js/auth.js` again
explicitly excluded and not opened. Five fixes, all in `js/lesson.js`,
`js/dashboard.js` + `pages/dashboard.html`, and `js/learn.js`:

1. **`updateConfidenceUI()` now IS correctness-aware, same in both
   modes.** The decision: tint green only when `result.matched &&
   result.label === getActiveSignId()` — reusing the exact
   mode-agnostic resolver `handlePracticeFrame`/`handleAssessmentFrame`
   already relied on for the same question, which is what made this a
   real decision rather than a guess (see the full reasoning in
   `lesson.js`'s replaced comment block above the function).
2. **Locked categories now blocked via direct URL.** `boot()` checks
   `isCategoryUnlocked(level, category)` before anything else; if
   locked, toasts and redirects to `learn.html?category=X` (which
   already re-checks the same lock and falls back to the trail).
3. **Dashboard welcome banner is real again.** New
   `renderWelcomeBanner()` walks the same flat chain
   `renderContinueButton()` uses and shows one of 4 states depending on
   where the learner actually is.
4. **"viewed" → "practiced"** in `learn.js`'s two badge strings, to
   match the term already used everywhere else this number appears.
5. **Camera panel no longer shows two false warnings on first load.**
   Root cause: `lastFaceSeenAt`/`lastHandSeenAt` are stamped at
   module-load time, before `bootDetectionEngine()`'s own async
   model/camera loading — by the time the render loop's first real
   frame ran, both were already past their hold thresholds. Fixed with
   the exact same reset pattern `startAssessment()` already used for
   the same staleness bug at a different call site.

`node --check` clean on all 3 edited files. **Still not exercised in a
real browser** — same standing gap as every session that's touched
this camera path; see `AI_MEMORY.md`'s matching 2026-08-21 session log
entry for the specific recommended click-throughs (fix #1's
green/yellow behavior mid-assessment, fix #5's actual on-load feel).
Full reasoning, verification detail, and the "why now" for the
decision in #1 are in `AI_MEMORY.md`'s 2026-08-21 Session Log entry and
`PIVOT_CHECKLIST.md`'s matching section — not repeated here.

---

## Dashboard UX Review Addendum — 2026-08-21

### Scope

This addendum documents a learner-perspective review of the current dashboard after
Rev 4/Rev 5. It is a **UX/product direction**, not a curriculum or progress-model
revision.

User constraint for this session:
- `js/auth.js` is out of scope.
- No code changes were made.
- The existing Rev 4/5 curriculum/progress architecture remains authoritative.

### Current dashboard role

The current dashboard consists of:
1. account information,
2. one aggregate progress card,
3. one row per unit,
4. a "Signs You've Learned" recap.

This is structurally valid, and `js/dashboard.js` correctly consumes the existing
flat Rev 4 chain through `LWProgress.getOrderedLiveCategories()` and the unit data
from `LWData`.

However, the current experience is too report-oriented for a learner's home page.
`learn.html` is already the full learning-path browser, and `lesson.html` is the
course player. Therefore the dashboard should not become a third copy of the same
path.

### Recommended product separation

```text
Dashboard
  = "What should I do next?"
  = next action + compact progress summary + review/recent activity

Learn
  = "Where can I go?"
  = full learning-path navigation

Lesson
  = "Teach and practice this."
  = course-player content + quick checks + optional camera practice

Quiz
  = "Can I demonstrate recall?"
  = graded category assessment
```

### Dashboard design priority

The first viewport should prioritize the learner's next action.

Recommended order:

```text
Welcome / learner context
        ↓
Continue Learning card
        ↓
Practice Progress + Assessment Progress
        ↓
Compact Learning Path summary
        ↓
Recent Practiced Signs / Review
```

The existing aggregate progress card may remain, but the dashboard should not lead
with a large aggregate percentage while the next lesson is visually secondary.

### Metric semantics

Current code calculates the headline percentage from practiced signs.

That metric should be treated explicitly as:

`Practice Progress`

not as:

`Mastery`

Assessment pass information must remain a separate signal.

Recommended learner-facing summary:

```text
9% Practice Progress
8 Signs Practiced
0 / 8 Category Assessments Passed
```

A future mastery score may be added only when a documented mastery rule exists.

### Current position

The dashboard should expose a clear "You are here" state using the **existing**
flat chain and current-category logic. It should not build a second unlock or
ordering algorithm.

Future implementation should continue using:
- `LWProgress.getOrderedLiveCategories()`
- `LWProgress.getCategoryProgress()`
- `LWProgress.isCategoryUnlocked()`
- `LWData.getUnits()`
- `LWData.getCategorySigns()`

### Current Level field

Rev 4 intentionally removed user-selectable proficiency levels. The dashboard's
`Current Level: Basic` field is therefore product-obsolete and was already identified
as an open follow-up.

Recommended future replacement:

`Current Unit`

Example:

`Unit 1 · The Alphabet`

This should be solved in dashboard scope without restoring a signup-level picker and
without modifying auth ownership.

### Review entry point

The existing "Signs You've Learned" recap is useful as history, but it is not yet
a learning/repetition feature.

The dashboard should reserve a visible Review/Trainer entry point, but a new spaced
repetition algorithm is intentionally **not** part of this dashboard task. A future
Review mode should reuse the existing detected-sign infrastructure.

### Dashboard implementation boundary

Preferred future changes:
- `pages/dashboard.html`
- `js/dashboard.js`
- `css/dashboard.css`

Explicitly avoid:
- `js/auth.js`
- `js/data.js`
- `js/learn.js`
- `js/engine/progress.js`

unless a concrete blocker is found and documented before expanding scope.

### Review findings from current screenshots

1. Dashboard is visually dominated by progress reporting rather than an obvious
   next action.
2. Unit rows are useful as a summary but duplicate some of `learn.html`'s role.
3. The current percentage can be mistaken for mastery because it is not clearly
   labeled as practice progress.
4. Current Unit/current lesson is not visually prominent.
5. `Current Level: Basic` conflicts with the single-path product model.
6. There is no explicit review action from the dashboard.
7. The long page can push the most useful learner action below the fold.
8. The Letter M lesson screenshot still shows a missing-image placeholder for
   `../assets/images/basic/M.png`; verify asset availability.
9. The Letter M lesson screenshot still shows initial camera warnings. The codebase
   says the first-load timestamp race was fixed, so this must be real-browser verified
   rather than assumed resolved.
10. Detected `C` while teaching `M` is correctly not green in the screenshot, but the
    UI should make the "wrong sign" result unmistakable.

### Relationship to Rev 4 / Rev 5

This review does **not** change:
- unit ordering,
- category unlocking,
- assessment policy,
- camera-as-optional-practice policy,
- Phrasebook/reference status,
- model routing,
- auth behavior.

It is a presentation-level recommendation for the existing architecture.

### Verification requirement

After a future dashboard implementation, perform real-browser verification:
- fresh learner state,
- partial progress state,
- passed-category state,
- near-end state,
- narrow viewport,
- keyboard navigation,
- direct return to the dashboard after a lesson.

Also re-check the Letter M image and first-load camera warning observations from the
provided screenshots.

---

## Rev 4 — IN PROGRESS: single continuous "Basic ASL" path (curriculum pivot)

**Status: Phases 1–6 implemented (2026-08-18 → 2026-08-20); Phase 7 (content
capture/retrain, not app code) still planning only.** This section is the deep-planning output from the
2026-08-17 adviser consultation — it exists so any AI assistant (or
Joshua, later) picks up the *agreed direction* instead of re-deriving it
or contradicting it. See AI_MEMORY.md §0 for the short pointer version and
the session log entries (2026-08-17 planning, 2026-08-18 Phase 1, 2026-08-18
Phase 2, 2026-08-18 Phase 3, 2026-08-19 Phase 4, 2026-08-20 Phase 6) for how this was derived and implemented. `js/data.js` now has a real `UNITS` array, a
`unit` field on every `CATEGORIES` entry, `UNIT0_CONTENT`, and the Unit 5
`comingSoon` split described below. The Unit 2 Fingerspell Your Name drill
is also implemented, as an extension of `js/lesson.js` (see §Implementation
phases → Phase 2, and `PIVOT_CHECKLIST.md`) — now reachable from a real nav
entry point (a trail node in `pages/learn.html`) as well as the direct URL.
`js/engine/progress.js`'s unlock chain is
now flat across `UNITS` too (see §Progress / unlock model changes below) —
storage key is `lw_progress_v3`. `pages/learn.html`/`js/learn.js` render
that flat model as a single scrollable trail (locked/current/done nodes),
and `pages/dashboard.html`/`js/dashboard.js` summarize it the same way
(one aggregate card + one row per unit, replacing the old three
basic/medium/intermediate cards) — see §Implementation phases → Phase 4.
**Phase 5 (2026-08-19)** removed the signup-time proficiency picker —
`index.html`'s Sign Up form no longer has a "Starting level" `<select>`,
and `js/auth.js`'s `register()` no longer takes a `level` argument
(every new account gets a fixed `level: 'basic'`) — see §Implementation
phases → Phase 5. **Phase 6 (2026-08-20)** tightened the teach→quiz loop
(a new in-lesson "Quick Check"), added a sign-ordering/fingerspelling-
challenge camera question type for Unit 6, and decided the Level Final
Assessment question (CTA retired, mechanism kept) — see §Assessment
format changes below and §Implementation phases → Phase 6. Only Phase 7
(capture/retrain, content and ML work) remains unbuilt.

### Why

The adviser's framing, translated into product terms: LinguaWave should
not offer a "choose your level" fork at signup. Everything the app teaches
is basic ASL — the progression comes from *combining* what was already
taught, not from unlocking harder content. The adviser's own example: a
typing tutor doesn't have a "beginner/intermediate/advanced" mode: it
teaches `A`, `S`, `D`, `F` individually, then drills the combinations
`ASDF`, `FDSA`, `AASS`. LinguaWave's letters→words→phrases structure
already has this shape — the fix is presentation and ordering, not new
detection technology. The adviser also pointed at lingvano.com as the
reference for lesson pacing and quiz variety (see §Assessment below).

### The Unit Map

One linear path, replacing the three-level selector. `level`/`category`
values in the codebase are unchanged (see §Data model below) — this table
maps them onto the new presentation order.

| Unit | Title | Maps from existing data | Detection status today |
|---|---|---|---|
| 0 | Welcome to ASL (background, how camera practice works, a couple of Deaf-culture basics) | new — no existing content | N/A, no camera, no `SIGN_DICTIONARY` needed |
| 1 | The Alphabet (A–Z) | `level:basic, category:alphabet` — unchanged | ✅ fully trained (static model) |
| 2 | Fingerspell Your Name | new — interactive drill, see §New content below | ✅ reuses the A–Z static model, zero new training data |
| 3 | Numbers (0–9, working toward 10) | `level:basic, category:numbers` — unchanged | ⚠️ static 0–9 trained; `6`/`9`/`10` → `detectionType:'motion'` routing fix confirmed done 2026-08-20 (`dictionary.js` + `data.js` both checked directly). Still not actually detectable, though — `asl_motion_model/labels.json` has zero digit classes today, so this needs real capture + retraining regardless of the routing fix |
| 4 | Everyday Essentials (greetings & courtesy words) | `level:medium, category:requests` (partial) + the `disabled:true` placeholders in `dictionary.js` (`PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`) | ❌ **Fixed 2026-08-20 (Rev 5):** `HELLO`/`THANK YOU` now carry `disabled: true` in `dictionary.js`, same as the rest of this row — previously enabled-but-untrained (confirmed absent from `asl_motion_model/labels.json`), so any attempt could never succeed despite looking "live" in the UI. All 18 in this row still need real capture + retraining. |
| 5 | Common Things & People (thematic vocab) | `level:medium` — family, places, time, temperature, food, clothes, health, feelings, colors, money, animals, amounts | ⚠️ family/places/time are trained and confirmed working. **Fixed 2026-08-20 (Rev 5):** `temperature` (`HOT`/`COLD`) now has real `disabled: true` placeholder entries in `dictionary.js` (previously had none at all, so `getDetectionType()` silently fell back to `'static'` and ran the wrong classifier) — still needs capture + retraining like everything else in this row. ❌ food/clothes/health/feelings/colors/money/animals/amounts have `data.js` content but no `SIGN_DICTIONARY` entry at all (see gap note below) |
| 6 | Basic Phrases | the `sequence_demo` chaining mechanism (real, working) + a curated set of 6 phrases built only from Unit 1–5 words | ✅ **Done 2026-08-20** — `CAR_SPELL`/`HOME_WORK_DEMO` demo placeholders replaced with 6 real curated phrases (`MOM_HOME`, `DAD_WORK`, `TODAY_SCHOOL`, `FINISH_WORK`, `SISTER_STORE`, `TODAY_GRANDMA_HOME`), each built from words confirmed present in `asl_motion_model/labels.json` |
| 7+ | Phrasebook (reference reading, not graded) | all 18 `level:intermediate` categories (~100 sentence-level entries, including `greetings_intro`) | ❌ 0 of these have any `SIGN_DICTIONARY` entry — see "Suggested removals" for why this becomes read-only content instead of a graded unit. **✅ Implemented 2026-08-19 (Phase 4)** — `learn.js` renders Unit 7 in `isReference` mode: browsable, no assessment CTA, never locked. |

**Gap note (found while building this table, not previously documented):**
grep across `dictionary.js` confirms `food`, `clothes`, `health`,
`feelings`, `colors`, `money`, `animals`, `amounts`, and all 18
`intermediate` categories have zero matching `SIGN_DICTIONARY` entries.
Their `data.js` content (descriptions, image/video paths) is real and
fine to keep, but a learner's camera check on any of these signs today
would just never match, silently, because the label was never trained —
this predates the pivot and was only surfaced by cross-referencing the
two files category-by-category for this plan.

### New content needed

1. **Unit 0 — Welcome to ASL.** A short "info" lesson type: no camera, no
   sign — background on what ASL is, how the practice/assessment flow
   works, and 1–2 lines of Deaf-culture etiquette (see "Suggested
   additions" below). Optionally a 2–3 question comprehension check, not
   an 80%-gated assessment.
2. **Unit 2 — Fingerspell Your Name.** A new interactive drill: take the
   learner's own name (already collected at signup) and build a live
   sequence check against it using the *same* phrase-chaining/motion
   pipeline `lesson.js` already uses for `sequence_demo` — just with a
   dynamically-generated `sequence` array instead of a fixed one. This is
   the literal "ASDF" moment from the adviser's analogy: combining
   letters the learner just drilled individually into something personal
   and real. Zero new training data required — it's 100% built on the
   already-trained A–Z static model.
3. **Unit 4 — Everyday Essentials.** Mostly a capture/retrain task (see
   the placeholder list in the Unit Map table above), not new app code —
   `dictionary.js` already has the entries stubbed out with
   `disabled: true`.
4. **Unit 6 — Basic Phrases.** Curate a short list (start with 5–8) of
   phrases buildable entirely from words that are already trained by the
   time a learner reaches Unit 6 — e.g. a name-introduction phrase reusing
   the Unit 2 mechanism, `THANK YOU` + a fingerspelled word, etc. Swap
   these in for `CAR_SPELL`/`HOME_WORK_DEMO` in the `sequence_demo`
   category (see "Suggested removals" — this category stops being a demo).

### Assessment format changes (lingvano.com reference) — ✅ Done 2026-08-20 (Phase 6)

Lingvano's format, observed via public reviews/app-store listings: short
video-based lessons that quiz almost immediately after teaching a sign
(not after a whole chapter), a mix of quiz formats (match sign to
picture/video, multiple choice, fingerspelling challenges, simple
sentence-ordering), and a live camera "mirror" feature that's framed as
practice rather than a strict gate.

- **Rounds 1–2 already match this** (`quiz.js`'s Multiple Choice and
  Identification rounds) — no change needed there.
- **Tighten the teach→quiz loop.** Today a learner walks through every
  sign in a category before any quiz happens. Add a lightweight,
  non-blocking mini-check after each sign (or small cluster) inside
  `lesson.html` itself, reusing the existing Practice Check UI, so
  retention gets tested closer to when it was taught — matching
  Lingvano's tight loop instead of the current "10 signs then one big
  quiz" pattern. **✅ Implemented 2026-08-20 (Phase 6)** — new "Quick
  Check" card in `lesson.html`/`lesson.js`, a 4-option recall MC
  question shown after every 3rd sign and always on a category's last
  sign. "Reusing the existing Practice Check UI" turned out to have two
  readings once actually implementing it — the camera panel's
  *mechanism* (webcam + classifier) vs. its *interaction pattern*
  (optional, skippable, immediate-feedback, never blocks Prev/Next).
  Phase 6 went with the latter: a plain recall question doesn't need a
  webcam and needs to work even before/without a camera, so it's a new
  component styled to match, not a literal reuse of the camera panel's
  DOM. Flagging this interpretation, same as earlier phases have
  flagged theirs — see `lesson.js`'s Phase 6 header comment and
  AI_MEMORY.md's Phase 6 session log.
- **New question type for Unit 6:** a sign-ordering/fingerspelling
  challenge — show the target phrase in English, learner produces the
  signs in order via camera using the chaining engine, rather than only
  picking from 4 pre-written options. This is closer to what actually
  proves recall, the way Lingvano's fingerspelling rounds do. **✅
  Implemented 2026-08-20 (Phase 6)** — `quiz.js`'s existing optional
  camera round now detects phrase-type signs (any `SIGNS` entry with a
  `sequence` array; today that's Unit 6/`sequence_demo`'s `CAR_SPELL`/
  `HOME_WORK_DEMO`) step by step in order, reusing `lesson.js`'s
  existing `phraseSteps`/`phraseStepIdx` chaining mechanism rather than
  building a second one. Implemented generally (any phrase-type sign
  anywhere gets this treatment, not a `category === 'sequence_demo'`
  special case) since that's the more direct data-driven read of "for
  Unit 6" — Unit 6 just happens to be the only category with phrase
  content today.
- **Camera Check stays optional/bonus everywhere**, including the new
  Unit 6 ordering challenge — this already matches Lingvano's "mirror is
  practice, not a gate" positioning and is Rev 3's existing, deliberate
  design; no change to that reasoning, just extending the pattern to the
  new question type. **✅ Confirmed 2026-08-20 (Phase 6)** — the phrase
  branch only ever writes into `cameraRoundData`, the same object the
  plain atomic-sign path already used; `computeGradedScore()` never
  reads it, only `rounds` (MC + Identification). Structurally
  incapable of affecting pass/fail.
- Keep the 80% pass threshold and the existing MC + Identification rounds
  as the only graded rounds, for the same webcam-accuracy reasons Rev 3
  already documented. **Unchanged — confirmed still true 2026-08-20.**

**Level Final Assessment — DECIDED 2026-08-20 (Phase 6).** Open since
Phase 3, made more pressing by Phase 4 (see §Implementation phases and
§Progress/unlock model changes below for the history). Decision:
**retire the CTA into it, keep the mechanism.** `quiz.js`'s
`buildActionButtons()` no longer offers "🏁 Take Level Final Assessment"
after a category pass — that was the one remaining entry point into it
anywhere in the app. Nothing in `progress.js` changed
(`recordLevelAssessment`/`getLevelAssessment`/`isLevelFinalUnlocked`/
`LEVEL_ORDER` are all exactly as Phase 3 left them) and
`quiz.html?level=X&final=1` still runs a complete, working level-final
assessment for anyone who already has it bookmarked — this only stops
*offering* it as a next step. Reasoning: re-adding a trail entry point
would mean resurfacing the three-level (`basic`/`medium`/`intermediate`)
framing Rev 4 is deliberately dissolving — a category's `level` field
and its position on the trail can now disagree (see the Unit Map above:
Unit 4's `requests` is `level: 'medium'` but sits right after Unit 3's
`level: 'basic'` `numbers`), so there's no honest place left to put "you
finished Basic, now do the Basic-level final" that wouldn't contradict
the trail it would sit next to. "Redesign as a trail-wide review" — the
other option this section originally listed — is a real, reasonable
alternative, but it's a new feature in its own right (what would it
cover, when would it trigger, new rounds or reused ones?), not a small
follow-on to what already exists, so it wasn't attempted here.
**Flagging this decision explicitly**, same spirit as Phase 4's
category-locking-reversal flag: this is a real product call made by an
AI session during Phase 6, not something Joshua explicitly signed off
on beforehand. See `quiz.js`'s block comment above `buildActionButtons()`
and AI_MEMORY.md's Phase 6 session log for the same reasoning in more
detail.

### Progress / unlock model changes — ✅ Done 2026-08-18 (Phase 3)

- ~~Replace the level-based hierarchy...~~ **Done.** `js/engine/progress.js`
  keeps its role as the single source of truth (still swappable for
  Firestore later, per Rev 3) — its internal unlock rule now walks **one
  flat ordered chain** across every unit/category in the Unit Map above,
  via a new `getOrderedLiveCategories()` (walks `getUnits()` → filters to
  `kind === 'category-group'` → `getCategoriesForUnit(order)`).
  `isCategoryUnlocked(level, categoryId)` walks that chain instead of the
  old per-level `liveCategoriesFor(level)` walk. `level`/`category` params
  on every public function are unchanged (see §Data model — internal
  field names aren't renamed), so `js/learn.js`, `js/quiz.js`,
  `js/dashboard.js`, and `js/lesson.js` all keep working without edits.
  **Concrete behavior change worth knowing:** a category is no longer
  automatically unlocked just for being first in its `level` — e.g. Unit
  4's `requests` (level:`medium`) now stays locked until Unit 3's
  `numbers` (level:`basic`) is passed, because the chain crosses level
  boundaries. `level`/`category` params on every public function stayed
  unchanged specifically so `js/learn.js`, `js/quiz.js`,
  `js/dashboard.js`, and `js/lesson.js` wouldn't need edits to keep
  *calling* `progress.js` the same way — that held true through Phase 5
  (`learn.js`/`dashboard.js` were rewritten for the trail UI, but every
  `LWProgress` call they make uses a signature that already existed
  going into Phase 4; `quiz.js`/`lesson.js` remained fully untouched
  through Phase 5). **As of Phase 6 (2026-08-20), `quiz.js`/`lesson.js`
  are no longer untouched** — both gained new features, but neither
  needed to change how they call `progress.js`; the signatures used are
  the same ones that already existed. See §Assessment format changes
  above for what Phase 6 actually did.
  Verified with a standalone mock-data test harness (not
  committed to the repo — throwaway, see AI_MEMORY.md's Phase 3 session
  log for what it checked).
- ~~Unit 0 (intro) and the Unit 7+ Phrasebook don't gate anything~~
  **Confirmed.** They're excluded structurally — `getOrderedLiveCategories()`
  only walks `kind === 'category-group'` units, and Unit 0 is `kind:'info'`,
  Unit 7/Phrasebook is `kind:'reference'`. (Unit 2/Fingerspell Your Name,
  `kind:'interactive'`, is also excluded, but only incidentally — it has
  zero `CATEGORIES` entries to begin with, see Phase 2's session log.)
- ~~Storage key should bump...~~ **Done.** `lw_progress_v2` → `lw_progress_v3`.
  Per the answered Phase 0 question, **no migration shim was written** —
  a returning learner's progress resets. The storage *shape* also changed
  as part of this, from level-nested (`levels[level].categories[cat]`) to
  a flat `categories[cat]` map (plus a separate flat `levelAssessments[level]`
  map for the still-per-level level-final-assessment feature, which Phase 3
  left otherwise untouched — see AI_MEMORY.md's Phase 3 session log for the
  full before/after shape and the reasoning for keeping level-finals as-is).

### Data model / migration strategy

- Add a new top-level `UNITS` array to `data.js`:
  `{ id, order, title, kind: 'info' | 'category-group' | 'interactive' }`.
  It sits **above** `CATEGORIES`, it doesn't replace it.
- Each existing `CATEGORIES` entry gets a new `unit` field (integer,
  matching `UNITS[].order`) so `learn.js` can render one continuous trail
  without touching every category's existing `id`/`level`.
- **Recommendation: don't rename `level`.** Its values (`'basic'` /
  `'medium'` / `'intermediate'`) stay exactly as they are in `data.js`,
  `dictionary.js`, every `?level=X&sign=Y` / `?level=X&category=Y` URL,
  and `getDetectionType()` / `getAllowedLabelsForSign()`. Renaming would
  touch `learn.js`, `lesson.js`, `quiz.js`, `progress.js`, `dashboard.js`,
  and every link in every HTML page, for zero pedagogical benefit — the
  pivot is about ordering and presentation, not what the field is called
  internally. `level` becomes a legacy internal partition key; `unit` /
  `UNITS` is what actually drives the new UI and unlock order.
- `js/learn.js` needed the biggest UI change: replace the three-tab
  (`basic`/`medium`/`intermediate`) + card-grid + word-picker structure
  with a single scrollable **trail view** that walks `UNITS` in order,
  each category shown as a node (locked / current / done) — the
  SoloLearn/Duolingo-style path the adviser referenced. **✅ Done
  2026-08-19 (Phase 4)** — see §Implementation phases → Phase 4 and
  `PIVOT_CHECKLIST.md`. Note this required reintroducing real
  per-category locking (see §Suggested removals / Phase 4 notes there
  and AI_MEMORY.md §0 for why that's flagged as a reversal of a Rev 3
  decision, worth a second look).
- `index.html` / `js/auth.js`'s `register()` "choose your proficiency
  level" step goes away — see "Suggested removals" below. **✅ Done
  2026-08-19 (Phase 5).**

### Suggested additions (mine, not adviser-requested — worth weighing)

1. **Deaf-culture micro-notes.** One or two short reads sprinkled between
   units — attention-getting etiquette, eye contact norms, the
   capitalization convention for "Deaf" — using the same "info" lesson
   type as Unit 0, so it costs almost nothing to build. This is the
   difference between a sign-matching app and something that teaches a
   learner to actually interact respectfully — directly serves "make the
   user REALLY learn ASL."
2. **Review / Trainer mode.** A lightweight drill that pulls random
   already-passed signs back into camera practice, mirroring Lingvano's
   Vocab Trainer. Reuses the existing detection pipeline entirely — the
   only new logic is picking N random already-unlocked `signId`s. High
   retention value for low build cost, and directly supports "really
   learn" over "complete once and forget."
3. **Optional placement/skip test.** A short per-unit assessment a
   learner who already knows some ASL can take to unlock ahead, without
   abandoning the enforced default order for true beginners.
4. **Sign-variation callouts.** Where ASL has more than one accepted way
   to sign something, surface a one-line "there's another common way to
   sign this" note. Lingvano does this for "HOW" and it's called out
   specifically in reviews as a trust-builder — cheap to add given
   `dictionary.js` already half-tracks alternates via its disabled
   entries.

### Suggested removals / deprioritizations

1. **The signup-time proficiency-level picker.** Directly contradicts the
   single-path model — a total beginner and a returning learner both
   start at Unit 0 now. Use the placement/skip test above instead, if
   some learners genuinely need to skip ahead. **✅ Implemented
   2026-08-19 (Phase 5)** — `index.html`'s Sign Up form no longer has
   the picker; `js/auth.js`'s `register()` no longer takes a `level`
   argument. See §Implementation phases → Phase 5.
2. **All 18 `intermediate` phrase categories** (`greetings_intro`
   through `everyday_dialogues`, ~100 sentence entries — corrected
   2026-08-19: earlier drafts of this doc said "the 17
   non-`greetings_intro`" categories, but none of the 18 have a
   `SIGN_DICTIONARY` entry, `greetings_intro` included; Phase 1's actual
   implementation already tags all 18 uniformly as `unit: 7`). None have
   any `SIGN_DICTIONARY` entry — full-sentence motion
   detection for ~100 unique sentences isn't realistic training scope for
   a capstone. Recommend demoting these to a **read-only "Phrasebook"**
   reference section (browse only, no quiz, no camera check) instead of
   presenting them as a graded unit that can't actually be assessed by
   camera and would need ~100 more MC questions to feel complete. The
   content itself is good — just stop implying it's an interactive lesson
   until real detection backs it. **✅ Implemented 2026-08-19 (Phase 4)**
   — see the Unit Map row 7+ above.
3. **`sequence_demo`'s "(Demo)" framing.** The chaining mechanism it
   proves out is exactly what Unit 6 needs — it's not a demo anymore.
   Rename the category once real phrase content replaces
   `CAR_SPELL`/`HOME_WORK_DEMO`.

### Implementation phases (priority order — confirm with Joshua before starting any of these)

1. ~~`data.js` — add `UNITS`, tag each `CATEGORIES` entry with `unit`, add
   Unit 0 intro content, promote/rename `sequence_demo` into a real Basic
   Phrases skeleton.~~ **✅ Done 2026-08-18** — see `PIVOT_CHECKLIST.md`
   Phase 1 and AI_MEMORY.md's matching session log entry.
2. ~~Name-fingerspelling interactive drill — self-contained, no retraining
   needed, good first coding task.~~ **✅ Done 2026-08-18**, as an
   extension of `js/lesson.js` (no new page/route) — see
   `PIVOT_CHECKLIST.md` Phase 2 and AI_MEMORY.md's matching session log
   entry for the full function-by-function breakdown. **Now reachable
   from the trail UI as of Phase 4** (2026-08-19) via a real nav entry
   point (a trail node in `pages/learn.html` links straight into it);
   also still reachable directly via
   `pages/lesson.html?level=basic&category=fingerspell_name`. Verified
   by tracing the call graph, not by running it in a browser — flagging
   that caveat here too, not just in the session log.
3. ~~`js/engine/progress.js` — flatten the unlock chain, bump the storage
   key.~~ **✅ Done 2026-08-18** — see `PIVOT_CHECKLIST.md` Phase 3 and
   AI_MEMORY.md's matching session log entry. Verified with a mock-data
   test harness (unlock-chain ordering, storage shape, Unit 0/7 exclusion,
   cross-level gating) — not run against the real app in a browser, same
   caveat as Phases 1–2.
4. ~~`js/learn.js` — trail-view UI replacing the level tabs / card grid /
   word picker.~~ **✅ Done 2026-08-19** — see `PIVOT_CHECKLIST.md`
   Phase 4 and AI_MEMORY.md's matching session log entry.
   `pages/dashboard.html`/`js/dashboard.js` updated to match (one
   aggregate + per-unit rows, replacing the three level cards) as part
   of the same phase. Verified with a Node test harness that runs the
   actual shipped `learn.js`/`dashboard.js`/`data.js`/`progress.js`
   files against a minimal DOM shim (not a hand-written mock of their
   shape) — not run against the real app in a browser, same caveat as
   Phases 1–3.
5. ~~`js/auth.js` + `index.html` — remove the proficiency-level picker
   from signup.~~ **✅ Done 2026-08-19** — see `PIVOT_CHECKLIST.md`
   Phase 5 and AI_MEMORY.md's matching session log entry. Confirmed via
   grep (see that log entry) that no unlock/trail/routing code ever
   read the user's own `level` — only `pages/dashboard.html`'s cosmetic
   "Current Level" field does, which now always shows "Basic" and is
   flagged as an unresolved follow-up (repurpose or remove), not fixed
   as part of this phase. Not exercised against live Firebase in a
   browser — same caveat as every phase before it.
6. ~~`js/quiz.js` — tighten the teach→quiz loop, add the sign-ordering
   question type for Unit 6. Also where the level-final-assessment
   question (see §Progress / unlock model changes) needs an actual
   decision — Phase 4 made the gap more visible (no more `learn.js` entry
   point into it) without resolving it.~~ **✅ Done 2026-08-20** — see
   `PIVOT_CHECKLIST.md` Phase 6 and AI_MEMORY.md's matching session log
   entry. Level Final Assessment decided (CTA retired, mechanism kept —
   see §Assessment format changes above for full reasoning). Verified
   with `node --check` on both changed files plus cross-checking every
   new DOM id and every `window.LWData`/`window.LWProgress` call against
   the real markup/exports — not run against the real app in a browser
   (webcam-dependent flows especially can't be verified this way), same
   caveat as every phase before it.
7. Capture + retrain: Essential Words placeholders (§Unit 4), Numbers
   6/9/10 motion-type fix (pre-existing item, AI_MEMORY.md §4) — content
   and ML work, not app code. **Not started — the only remaining phase.**

### Open questions for Joshua — ANSWERED 2026-08-18

- ~~Keep `localStorage` progress as-is and accept a reset when the storage
  key bumps, or write a small migration shim?~~ **Answered: accept a
  reset** (simplest, pre-launch). **Applied 2026-08-18 in Phase 3** —
  storage key is now `lw_progress_v3`, no migration shim.
- ~~Unit 0's "what is ASL" content — static text (fastest to ship), or
  reuse the YouTube reference-video panel already prototyped in
  `capture.html`?~~ **Answered: static text.** Implemented in Phase 1 as
  `UNIT0_CONTENT` in `data.js` (4 sections). **Now rendered as of Phase 4**
  (2026-08-19) — `learn.js`'s Unit 0 trail node opens a dedicated info
  screen showing it, which also links out to the pre-existing, more
  detailed `pages/intro-to-asl.html` rather than duplicating its content
  (the two now overlap somewhat — flagged in AI_MEMORY.md §4 as an open
  follow-up, not resolved).
- ~~How many Unit 5 sub-categories should show before Unit 6 unlocks — all
  12, or just the ones with real detection today (family/places/time/
  temperature), with the rest marked `comingSoon`?~~ **Answered: only the
  4 trained ones**, rest `comingSoon`. Implemented in Phase 1 — see
  `PIVOT_CHECKLIST.md` Phase 1 for exactly which 8 categories flipped.

---

## Rev 3 — What changed (lesson · assessment · progress)

**Scope of this revision:** UI polish and auth were explicitly left alone.
Everything below is about how a lesson is assessed and how progress is
tracked.

1. **Per-sign camera assessment is now OPTIONAL practice, not a gate.**
   `pages/lesson.html`'s "Start Assessment" button is now "🎥 Practice
   Check (optional)". MediaPipe/webcam accuracy has real limits, so it
   no longer decides pass/fail or blocks navigation — it just gives
   the learner a live feedback loop if they want it. Opening a sign at
   all is enough to mark it "practiced" (`LWProgress.recordSignPracticed`).

2. **New graded assessment layer: one per CATEGORY, one per LEVEL.**
   `pages/quiz.html` + `js/quiz.js` now run a real assessment with
   three rounds, matching the flowchart's "End-of-lesson assessment" /
   "Score ≥ 80%?" nodes, just resolved per category and per level:
     - **Round 1 — Multiple Choice** (graded): read a description, pick the sign.
     - **Round 2 — Identification** (graded): see the sign, pick its name.
     - **Round 3 — Camera Check** (optional, bonus only): live MediaPipe
       gesture/motion detection. Never counted toward the 80% pass
       threshold — same reasoning as #1.
   `?level=X&category=Y` runs a category assessment; `?level=X&final=1`
   runs a level-final assessment across every category in that level.

3. **New progress engine: `js/engine/progress.js` (`window.LWProgress`).**
   Single source of truth for: signs practiced, category-assessment
   results, level-assessment results, and unlock rules (a category
   unlocks once the previous one is passed; a level's final assessment
   unlocks once every category in it is passed; the next level unlocks
   once the current level's final assessment is passed). Storage is
   `localStorage` (`lw_progress_v2` at the time of this revision — see
   Rev 4 → Phase 3, which superseded this with a flat `lw_progress_v3`
   shape and a cross-level unlock chain; the per-level unlock rule
   described in this paragraph is Rev 3 history, not current behavior)
   but every read/write goes through this module, so swapping in
   Firestore later only touches this one file.

4. **`js/learn.js` and `pages/dashboard.html` now read real progress**
   instead of hardcoded numbers/MOCK_PROGRESS — lock icons, "✔ Passed"
   badges, category/level assessment CTAs, and the "Signs You've
   Learned" recap grid are all driven by `LWProgress`.

**Not changed in this revision:** `js/auth.js` (still bypass mode),
all page styling/layout, and the admin-free content model
(`js/data.js` is still hand-edited — see below).

---

## 1. Project Overview

LinguaWave is a **web-based ASL (American Sign Language) learning system** for beginner learners. It provides structured, step-by-step lessons across three difficulty levels, multiple-choice assessments, and a survey-based feedback system.

**Tech Stack (planned):**
- Frontend: Plain HTML5 + CSS3 + Vanilla JavaScript (static, no framework)
- Backend/DB: Firebase Firestore (NoSQL)
- Auth: Firebase Authentication (Email + Password) — **currently stubbed, see §6**
- Storage: Firebase Storage (images and videos)
- Hosting: Firebase Hosting (or any static host)

---

## 2. Scope Summary

### IN SCOPE
| Feature | Status |
|---|---|
| ASL Alphabet learning (A–Z) — images, text, video | Static UI ✅ · Firebase TODO |
| Basic vocabulary module | Static UI ✅ · Firebase TODO |
| Intermediate sentence construction module | Static UI ✅ · Firebase TODO |
| Combined login / sign-up landing page | Static UI ✅ · Firebase Auth TODO (bypass mode active) |
| User dashboard (account details + content + progress) | Static UI ✅ · Firebase TODO |
| Multiple-choice assessment | Static UI ✅ · Logic TODO |
| Survey-based feedback system | Static UI ✅ · Firebase TODO |
| Structured step-by-step learning flow | UI complete ✅ |

### OUT OF SCOPE (Limitations)
- No FSL or other sign languages — ASL only
- No gesture recognition or motion tracking
- No advanced learner content
- Assessments: multiple-choice + survey ONLY (no open-ended or gesture-based)
- Requires internet (web app)
- **No admin panel / content management UI.** This was a deliberate decision — there
  is only one user role (the learner). Signs and quiz questions are added directly
  in code by the dev team via `js/data.js` instead of through an upload interface.
  This keeps the team's edit access exactly where it already is (the repo), with no
  separate access-control layer to build, test, or secure.

---

## 3. File Structure

```
linguawave/
│
├── index.html                  # Log In / Sign Up — now the ONLY entry point
│                                #   (the old marketing landing page is gone;
│                                #    visitors land directly on the auth form)
│
├── pages/
│   ├── dashboard.html          # Post-login hub: account details + content + progress
│   ├── learn.html              # Level & lesson selector grid
│   ├── lesson.html             # Individual sign lesson viewer
│   ├── quiz.html               # Multiple-choice assessment
│   └── feedback.html           # Post-level survey
│   (admin.html, login.html, register.html — REMOVED)
│
├── css/
│   ├── style.css               # Global design tokens, resets, shared components
│   ├── auth.css                # index.html (login/register tabs) styles
│   ├── dashboard.css           # dashboard.html styles (incl. account card)
│   ├── learn.css               # learn.html specific styles
│   ├── lesson.css              # lesson.html specific styles
│   ├── quiz.css                # quiz.html specific styles
│   ├── feedback.css            # feedback.html specific styles
│   └── toast.css               # Toast notification styles (shared)
│   (admin.css, home.css — REMOVED)
│
├── js/
│   ├── auth.js                 # NEW — auth API (bypass mode). See §6.
│   ├── data.js                 # NEW — hardcoded signs/questions content (no admin UI)
│   ├── main.js                 # Shared utilities: nav, progress bars, user-detail rendering
│   ├── learn.js                # Tab switching + lesson grid render
│   ├── lesson.js                # Sign navigation (PREV/NEXT), progress tracking
│   ├── quiz.js                  # Question flow, score calculation, pass/fail
│   └── feedback.js              # Survey submit handler
│   (admin.js — REMOVED)
│
└── assets/
    ├── images/                 # Placeholder + uploaded sign images
    └── videos/                 # Placeholder + uploaded sign demo videos
```

---

## 4. Page-by-Page Breakdown

### `index.html` — Log In / Sign Up (Landing Page)
- **Shows:** LinguaWave logo + tagline, a Log In / Sign Up tab toggle, and the
  corresponding form. There is no separate marketing page anymore.
- **Routes to:** `pages/dashboard.html` on Log In or Create Account
- **Auth behavior:** `LWAuth.redirectIfLoggedIn('pages/dashboard.html')` runs in
  `<head>` before the form renders — a returning logged-in user never sees this
  page at all.
- **Not bypass mode** (corrected 2026-08-19 — this line was stale, same
  issue as the one fixed in `index.html`'s own header comment during
  Phase 5, see AI_MEMORY.md's Phase 5 session log): both forms call real
  Firebase Auth + a Firestore profile write/read via `js/auth.js`'s
  `login()`/`register()`. See §6.
- **REV 4 PHASE 5 (2026-08-19):** the register form's "Starting level"
  picker is gone — `register()` no longer takes a `level` argument, every
  new account gets a fixed `level: 'basic'`.

---

### `pages/dashboard.html` — User Dashboard
- **Shows, top to bottom:**
  1. **Welcome header** + "Continue Learning" button
  2. **Your Account** — name, email, current level, member-since date
     (the "user details" section — `current level` is now a vestige of
     the *removed* signup-time level picker: Rev 4 Phase 5, done
     2026-08-19, deleted the picker but deliberately left this display
     field alone, so it now always reads "Basic" for every account.
     Repurposing/removing it is an open follow-up, not yet done — see
     AI_MEMORY.md §4 and PIVOT_CHECKLIST.md Phase 5's flag)
  3. **Overall Progress** — REV 4 PHASE 4 (2026-08-19): one aggregate
     progress card (whole flat unit chain combined) + one compact row
     per `UNITS` entry, replacing the old three basic/medium/intermediate
     level cards (see the Rev 4 section above)
  4. **Signs You've Learned** — recap grid of mastered signs
- **Routes to:** `learn.html` (unit rows), `lesson.html` (Continue button + Unit 2's row)
- **Auth behavior:** `LWAuth.requireAuth('../index.html')` runs in `<head>` —
  anyone without an active session is bounced back to the login page.
- **Data source:** `getActiveUser()` in `main.js` (merges the real auth session
  with mock progress) → Firestore `users/{uid}` (TODO)

---

### `pages/learn.html` — Trail / Lesson Selector
- **Shows:** REV 4 PHASE 4 (2026-08-19): a single scrollable **trail** —
  one node per `UNITS` entry, shown locked / current / done — replacing
  the old level-tabs + per-level card grid. Clicking a node opens that
  unit's screen: an info screen (Unit 0), a "pick a category" list (any
  unit with more than one category), or straight into the
  category's grid/picker (units with exactly one category). See the Rev
  4 section above and `js/learn.js`'s own file header for the full view
  breakdown.
- **URL params:** own scheme is `?unit=<unitId>` / `?category=<categoryId>`;
  the old `?level=basic|medium|intermediate[&category=Y]` shape is still
  accepted on load for backward compatibility with `js/quiz.js`/`js/lesson.js`,
  which still build links that way.
- **Routes to:** `lesson.html?level=X&category=Y&sign=Z`, `quiz.html?level=X&category=Y`
- **Auth-guarded** (see dashboard.html pattern above)
- **Data source:** Static HTML → `js/data.js` → Firestore `lessons` collection (TODO)

---

### `pages/lesson.html` — Sign Lesson Viewer
- **Shows:** Sign image, text description, demo video, PREV/NEXT buttons
- **URL params:** `?level=basic&sign=F`
- **Routes to:** Next sign (same page), or `quiz.html` after last sign
- **Auth-guarded**
- **Data source:** Static content → `js/data.js` → Firestore `signs/{id}` (TODO)

---

### `pages/quiz.html` — Assessment
- **Shows:** Multiple-choice questions (4 options), score on completion
- **Score threshold:** ≥80% to pass
- **On pass:** Save progress → `dashboard.html`
- **On fail:** Retry → `lesson.html`
- **On level complete:** → `feedback.html`
- **Auth-guarded**
- **Data source:** Hardcoded → `js/data.js` → Firestore `questions` collection (TODO)

---

### `pages/feedback.html` — Survey
- **Shows:** 5 survey questions (Likert scales + open text)
- **On submit:** Write to Firestore `surveys` collection → `dashboard.html`
- **Auth-guarded**
- **Reviewing responses:** directly in the Firestore console by querying the
  `surveys` collection — no admin UI is built for this.

---

## 5. Firestore Data Schema (planned)

```
users/
  {uid}/
    name: string
    email: string
    level: "basic" | "medium" | "intermediate"
    progress:
      basic:
        completed: number
        total: 26
        completedLessons: { A: {score: 0.9}, B: {score: 1.0}, … }
      medium:
        completed: number
        total: 10
        completedLessons: { … }
      intermediate:
        completed: number
        total: 8
        completedLessons: { … }
    learnedSigns: ["A", "B", "C", …]

signs/
  {id}/                           # e.g. "basic_A"
    level: "basic"
    signId: "A"
    title: "Letter A"
    description: string
    imageUrl: string              # Firebase Storage URL
    videoUrl: string              # Firebase Storage URL
    order: number

questions/
  {id}/
    level: "basic" | "medium" | "intermediate"
    relatedSign: "A"              # optional
    prompt: string
    options: [{ id: "A", text: "…" }, …]
    correctId: "A"
    order: number

surveys/
  {id}/
    userId: string
    level: string
    timestamp: Timestamp
    q1: number                    # Satisfaction 1–5
    q2: number                    # Clarity 1–5
    q3: "too_easy"|"just_right"|"too_hard"
    q4: "yes"|"maybe"|"no"
    q5: string                    # Open text
```

*Note: there is no `role` field and no admin-only collection — every account
is a learner account. `signs` and `questions` are populated by editing
`js/data.js` directly and (eventually) seeding Firestore from it, rather than
through an in-app upload flow.*

---

## 6. Auth Bypass Mode — `js/auth.js`

To unblock frontend/content work while Firebase Auth is being wired in by a
teammate, `js/auth.js` implements a **mock auth layer** with the same function
names a real implementation would use. Every page calls these functions —
none of them touch `localStorage` directly — so swapping the internals for
real Firebase calls should not require touching `index.html`, `dashboard.html`,
or any other page.

| Function | Current (bypass) behavior | Replace with |
|---|---|---|
| `login(email, password)` | Accepts any input (or none), stores a session | `firebase.auth().signInWithEmailAndPassword()` |
| `register(name, email, password, level)` | Accepts any input, stores a session | `firebase.auth().createUserWithEmailAndPassword()` + Firestore write to `users/{uid}` |
| `logout(redirectPath)` | Clears the local session | `firebase.auth().signOut()` |
| `getCurrentUser()` | Reads the local session | `firebase.auth().currentUser` + Firestore read |

`requireAuth(loginPath)` and `redirectIfLoggedIn(dashboardPath)` are the two
route guards used at the top of every page — these should keep working
unchanged once the four functions above are real.

**Before shipping:** bypass mode means anyone can "log in" without a real
account. This is fine for development and demoing the flow, but the four
functions above need to be swapped for actual Firebase calls before this goes
anywhere a real user could reach it.

---

## 7. User Flow (maps to flowchart)

```
START
  ↓
Open app (index.html — Log In / Sign Up)
  ↓
Already logged in? (LWAuth.redirectIfLoggedIn)
  No  → Fill in Log In or Sign Up tab → Choose proficiency level (sign-up only) → Dashboard
  Yes → Skip straight to Dashboard
  ↓
Dashboard (pages/dashboard.html)
  · Your Account (user details)
  · Overall Progress (content / level cards)
  · Signs You've Learned (recap)
  ↓
Select level & lesson (learn.html)
  ↓
View lesson content (lesson.html)
  ↓
User clicks NEXT? → Yes → More signs? → Yes → next sign (loop)
                                       → No (lesson done)
  ↓
End-of-lesson assessment (quiz.html)
  ↓
Score ≥ 80%? → No → Retry lesson
             → Yes → Save progress to Firestore
  ↓
Show previous signs recap (dashboard.html recap section)
  ↓
More lessons available? → Yes → back to learn.html
                        → No → feedback.html → back to Dashboard
```

---

## 8. Implementation Priorities (what to build next)

1. **Replace the 4 bypass functions in `js/auth.js`** with real Firebase Auth calls
   (see table in §6). No other file should need to change.
2. **Connect Firestore for progress** — update `getActiveUser()` in `js/main.js`
   - Read/write `users/{uid}` document
   - Update progress on quiz pass
3. **Wire `js/data.js` into rendering** — `js/learn.js`, `js/lesson.js`, `js/quiz.js`
   - Loop over `LWData.SIGNS` / `LWData.QUESTIONS` instead of hand-coded HTML
   - Once this works, swapping `data.js` for a Firestore read is a small change
4. **Dynamic lesson rendering** — `js/learn.js`, `js/lesson.js`
   - Eventually fetch `signs` from Firestore instead of `js/data.js`
5. **Dynamic quiz questions** — `js/quiz.js`
   - Eventually fetch from Firestore `questions` collection
6. **Survey storage** — `js/feedback.js`
   - Write `surveys` documents to Firestore

---

## 9. Design System Reference

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

---

*Last updated: Capstone 2025, Rev. 2 — Admin panel removed, auth/landing pages
merged, dashboard now includes account details, auth running in bypass mode
pending Firebase integration.*