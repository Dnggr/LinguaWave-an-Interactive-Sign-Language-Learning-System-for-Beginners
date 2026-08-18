# LinguaWave — System Architecture & Developer Handoff
<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST. -->
> Capstone Project 2025 · ASL Interactive Learning System for Beginners
> **Rev. 4 (IN PROGRESS)** — Curriculum pivot: single continuous "Basic ASL" path replacing the three user-selectable levels. Planning complete 2026-08-17; Phase 1 (`data.js` restructure) implemented 2026-08-18 — see the Rev 4 section below and `PIVOT_CHECKLIST.md` for phase-by-phase status.
> **Rev. 3** — Lesson/assessment/progress rework (UI + auth untouched, out of scope for this pass).
> **Rev. 2** — Admin panel removed, login/register merged into the landing page, auth running in bypass mode pending Firebase integration.

## Rev 4 — PLANNED: single continuous "Basic ASL" path (curriculum pivot, not yet implemented)

**Status: Phase 1 implemented (2026-08-18); Phases 2–7 still planning
only.** This section is the deep-planning output from the 2026-08-17
adviser consultation — it exists so any AI assistant (or Joshua, later)
picks up the *agreed direction* instead of re-deriving it or contradicting
it. See AI_MEMORY.md §0 for the short pointer version and the session log
entries (2026-08-17 planning, 2026-08-18 Phase 1) for how this was
derived and implemented. `js/data.js` now has a real `UNITS` array, a
`unit` field on every `CATEGORIES` entry, `UNIT0_CONTENT`, and the Unit 5
`comingSoon` split described below — everything else in this section
(trail-view UI, progress flattening, drill, quiz changes, capture/retrain)
is still unbuilt.

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
| 3 | Numbers (0–9, working toward 10) | `level:basic, category:numbers` — unchanged | ⚠️ static 0–9 trained; `6`/`9` need `detectionType:'motion'` added (pre-existing open item, AI_MEMORY.md §4); `10` needs a `dictionary.js`+`data.js` entry (also pre-existing) |
| 4 | Everyday Essentials (greetings & courtesy words) | `level:medium, category:requests` (partial) + the `disabled:true` placeholders in `dictionary.js` (`PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`) | ⚠️ `HELLO`/`THANK YOU` trained today; the rest need capture + retraining — the placeholders already exist, this is a data-collection task, not an architecture task |
| 5 | Common Things & People (thematic vocab) | `level:medium` — family, places, time, temperature, food, clothes, health, feelings, colors, money, animals, amounts | ✅ family/places/time/temperature trained; ❌ food/clothes/health/feelings/colors/money/animals/amounts have `data.js` content but **no `SIGN_DICTIONARY` entry at all** (see gap note below) — order the trained sub-categories first |
| 6 | Basic Phrases | the `sequence_demo` chaining mechanism (real, working) + a small curated set of phrases built only from Unit 1–5 words | ✅ mechanism proven via `CAR_SPELL`/`HOME_WORK_DEMO`; needs real phrase content in place of the two demo placeholders |
| 7+ | Phrasebook (reference reading, not graded) | the other 17 `level:intermediate` categories (~100 sentence-level entries) | ❌ 0 of these have any `SIGN_DICTIONARY` entry — see "Suggested removals" for why this becomes read-only content instead of a graded unit |

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

### Assessment format changes (lingvano.com reference)

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
  quiz" pattern.
- **New question type for Unit 6:** a sign-ordering/fingerspelling
  challenge — show the target phrase in English, learner produces the
  signs in order via camera using the chaining engine, rather than only
  picking from 4 pre-written options. This is closer to what actually
  proves recall, the way Lingvano's fingerspelling rounds do.
- **Camera Check stays optional/bonus everywhere**, including the new
  Unit 6 ordering challenge — this already matches Lingvano's "mirror is
  practice, not a gate" positioning and is Rev 3's existing, deliberate
  design; no change to that reasoning, just extending the pattern to the
  new question type.
- Keep the 80% pass threshold and the existing MC + Identification rounds
  as the only graded rounds, for the same webcam-accuracy reasons Rev 3
  already documented.

### Progress / unlock model changes

- Replace the level-based hierarchy (`basic` unlocks its categories →
  passing `basic`'s final unlocks `medium` → …) with **one flat ordered
  chain** across every unit/category in the Unit Map above.
  `js/engine/progress.js` keeps its role as the single source of truth
  (still swappable for Firestore later, per Rev 3) — only its internal
  unlock rule changes, from level→category nesting to a flat walk over
  `UNITS`.
- Unit 0 (intro) and the Unit 7+ Phrasebook don't gate anything and have
  no 80% threshold — nothing gradeable lives behind them yet.
- Storage key should bump `lw_progress_v2` → `lw_progress_v3` since the
  shape changes from level-nested to a flat array. A migration shim is
  optional (see "Open questions" below) — this is still pre-launch, a
  reset may be acceptable.

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
- `js/learn.js` needs the biggest UI change: replace the three-tab
  (`basic`/`medium`/`intermediate`) + card-grid + word-picker structure
  with a single scrollable **trail view** that walks `UNITS` in order,
  each category shown as a node (locked / current / done) — the
  SoloLearn/Duolingo-style path the adviser referenced.
- `index.html` / `js/auth.js`'s `register()` "choose your proficiency
  level" step goes away — see "Suggested removals" below.

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
   some learners genuinely need to skip ahead.
2. **The 17 non-`greetings_intro` `intermediate` phrase categories**
   (`basic_responses` through `everyday_dialogues`, ~100 sentence
   entries). None have any `SIGN_DICTIONARY` entry — full-sentence motion
   detection for ~100 unique sentences isn't realistic training scope for
   a capstone. Recommend demoting these to a **read-only "Phrasebook"**
   reference section (browse only, no quiz, no camera check) instead of
   presenting them as a graded unit that can't actually be assessed by
   camera and would need ~100 more MC questions to feel complete. The
   content itself is good — just stop implying it's an interactive lesson
   until real detection backs it.
3. **`sequence_demo`'s "(Demo)" framing.** The chaining mechanism it
   proves out is exactly what Unit 6 needs — it's not a demo anymore.
   Rename the category once real phrase content replaces
   `CAR_SPELL`/`HOME_WORK_DEMO`.

### Implementation phases (priority order — confirm with Joshua before starting any of these)

1. `data.js` — add `UNITS`, tag each `CATEGORIES` entry with `unit`, add
   Unit 0 intro content, promote/rename `sequence_demo` into a real Basic
   Phrases skeleton.
2. Name-fingerspelling interactive drill — self-contained, no retraining
   needed, good first coding task.
3. `js/engine/progress.js` — flatten the unlock chain, bump the storage
   key.
4. `js/learn.js` — trail-view UI replacing the level tabs / card grid /
   word picker.
5. `js/auth.js` + `index.html` — remove the proficiency-level picker from
   signup.
6. `js/quiz.js` — tighten the teach→quiz loop, add the sign-ordering
   question type for Unit 6.
7. Capture + retrain: Essential Words placeholders (§Unit 4), Numbers
   6/9/10 motion-type fix (pre-existing item, AI_MEMORY.md §4) — content
   and ML work, not app code.

### Open questions for Joshua — ANSWERED 2026-08-18

- ~~Keep `localStorage` progress as-is and accept a reset when the storage
  key bumps, or write a small migration shim?~~ **Answered: accept a
  reset** (simplest, pre-launch). Not yet applied — this is Phase 3's
  storage-key-bump work, not Phase 1.
- ~~Unit 0's "what is ASL" content — static text (fastest to ship), or
  reuse the YouTube reference-video panel already prototyped in
  `capture.html`?~~ **Answered: static text.** Implemented in Phase 1 as
  `UNIT0_CONTENT` in `data.js` (4 sections). No screen renders it yet —
  that's Phase 4.
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
   `localStorage` today (`lw_progress_v2`) but every read/write goes
   through this module, so swapping in Firestore later only touches
   this one file.

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
- **Bypass mode:** submitting either form logs you in immediately; no field is
  validated against a backend yet. See §6.

---

### `pages/dashboard.html` — User Dashboard
- **Shows, top to bottom:**
  1. **Welcome header** + "Continue Learning" button
  2. **Your Account** — name, email, current level, member-since date
     (the "user details" section)
  3. **Overall Progress** — the three level cards with % completion (the "content")
  4. **Signs You've Learned** — recap grid of mastered signs
- **Routes to:** `learn.html` (View Lessons), `lesson.html` (Continue)
- **Auth behavior:** `LWAuth.requireAuth('../index.html')` runs in `<head>` —
  anyone without an active session is bounced back to the login page.
- **Data source:** `getActiveUser()` in `main.js` (merges the real auth session
  with mock progress) → Firestore `users/{uid}` (TODO)

---

### `pages/learn.html` — Lesson Selector
- **Shows:** Level tabs, grid of lesson cards (locked / done / available)
- **URL param:** `?level=basic|medium|intermediate`
- **Routes to:** `lesson.html?level=X&sign=Y`
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