# LinguaWave — System Architecture & Developer Handoff
<!-- AI ASSISTANTS: read AI_MEMORY.md at the repo root FIRST. -->
> Capstone Project 2025 · ASL Interactive Learning System for Beginners
> **Rev. 3** — Lesson/assessment/progress rework (UI + auth untouched, out of scope for this pass).
> **Rev. 2** — Admin panel removed, login/register merged into the landing page, auth running in bypass mode pending Firebase integration.

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