# LinguaWave

> An interactive, web-based ASL (American Sign Language) learning system for beginners.
> Capstone Project 2025

LinguaWave teaches beginner-level American Sign Language through structured, step-by-step lessons across three difficulty levels, with multiple-choice assessments and a survey-based feedback system. It's a static HTML/CSS/JS site designed to run on Firebase (Auth, Firestore, Storage, Hosting), though authentication currently runs in a **bypass/mock mode** so the frontend team can build against a stable flow while Firebase is wired in.

---

## Table of Contents

- [Features](#features)
- [Limitations](#limitations)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication (Bypass Mode)](#authentication-bypass-mode)
- [Adding Content (Signs & Quiz Questions)](#adding-content-signs--quiz-questions)
- [Design System](#design-system)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Features

- **ASL Alphabet (A–Z)** — image, text description, and video demo per letter
- **Basic vocabulary module** — common words and everyday phrases
- **Intermediate sentence construction module** — simple ASL sentence structures
- **Combined login / sign-up landing page** — single entry point, no separate marketing page
- **User dashboard** — account details, level progress, and a recap of learned signs
- **Multiple-choice assessments** — 80% pass threshold to unlock the next lesson
- **Survey-based feedback** — collected after completing each level

## Limitations

- ASL only — no other sign languages
- Beginner to basic-intermediate content only; no advanced grammar or discourse
- No gesture recognition, motion tracking, or AI-based sign validation — content is static images/video
- Assessments are multiple-choice and survey only; no open-ended or gesture-based grading
- No admin panel or content-upload UI by design — see [Adding Content](#adding-content-signs--quiz-questions)
- Requires an internet connection; no offline support
- Optimized for desktop browsers; mobile responsiveness may be limited

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML5, CSS3, vanilla JavaScript (no framework, no build step) |
| Auth | Firebase Authentication (Email + Password) — *currently stubbed, see below* |
| Database | Firebase Firestore (NoSQL) — *planned, not yet connected* |
| Storage | Firebase Storage (images/videos) — *planned, not yet connected* |
| Hosting | Firebase Hosting, or any static file host |

There is no package.json, bundler, or framework. Every page is a plain `.html` file that links its own CSS and loads shared/page-specific `.js` files via `<script>` tags.

## Project Structure

```
linguawave/
│
├── index.html                  # Log In / Sign Up — the only entry point
│
├── pages/
│   ├── dashboard.html          # Post-login hub: account details + content + progress
│   ├── learn.html              # Level & lesson selector grid
│   ├── lesson.html             # Individual sign lesson viewer
│   ├── quiz.html               # Multiple-choice assessment
│   └── feedback.html           # Post-level survey
│
├── css/
│   ├── style.css               # Global design tokens, resets, shared components
│   ├── auth.css                # index.html (login/register tabs) styles
│   ├── dashboard.css           # dashboard.html styles (incl. account card)
│   ├── learn.css               # learn.html styles
│   ├── lesson.css              # lesson.html styles
│   ├── quiz.css                # quiz.html styles
│   ├── feedback.css            # feedback.html styles
│   └── toast.css               # Shared toast notification styles
│
├── js/
│   ├── auth.js                  # Auth API — currently in bypass mode (see below)
│   ├── data.js                  # Hardcoded signs/questions content (no admin UI)
│   ├── main.js                  # Shared utilities: nav, progress bars, user-detail rendering
│   ├── learn.js                 # Tab switching + lesson grid render
│   ├── lesson.js                # Sign navigation (PREV/NEXT), progress tracking
│   ├── quiz.js                  # Question flow, score calculation, pass/fail
│   └── feedback.js              # Survey submit handler
│
├── assets/
│   ├── images/                  # Sign images
│   └── videos/                  # Sign demo videos
│
└── SYSTEM_ARCHITECTURE.md       # Full architecture & developer handoff doc
```

See `SYSTEM_ARCHITECTURE.md` for a page-by-page breakdown, the planned Firestore schema, and the user flow diagram.

## Getting Started

No build step, no dependencies, no `npm install`. Clone the repo and serve the folder with any static file server (opening `index.html` directly with `file://` mostly works too, but a local server avoids occasional CORS/relative-path quirks with fonts and video).

```bash
git clone <your-repo-url>
cd linguawave

# Option A — Python (already on most machines)
python3 -m http.server 5500

# Option B — Node, if you have it
npx serve .

# Option C — VS Code "Live Server" extension
```

Then open `http://localhost:5500` (or whichever port) in your browser. You'll land on the Log In / Sign Up page.

## Authentication (Bypass Mode)

`js/auth.js` is **not connected to Firebase yet**. It accepts any input — or none at all — on both the Log In and Sign Up forms and immediately creates a local session in `localStorage`. This lets the team build and test every page in the user flow without waiting on Firebase Auth to be wired in.

Every page calls the same small set of functions instead of touching `localStorage` directly, so swapping in real Firebase only means editing the inside of these four functions in `js/auth.js`:

| Function | Bypass behavior today | Replace with |
|---|---|---|
| `login(email, password)` | Accepts anything, stores a session | `firebase.auth().signInWithEmailAndPassword()` |
| `register(name, email, password, level)` | Accepts anything, stores a session | `firebase.auth().createUserWithEmailAndPassword()` + Firestore write |
| `logout(redirectPath)` | Clears the local session | `firebase.auth().signOut()` |
| `getCurrentUser()` | Reads the local session | `firebase.auth().currentUser` + Firestore read |

`requireAuth(loginPath)` (used on every protected page) and `redirectIfLoggedIn(dashboardPath)` (used on `index.html`) should keep working unchanged once those four functions are real.

> **Before this goes anywhere a real user could reach it:** bypass mode means anyone can "log in" without an actual account. Replace the functions above first.

## Adding Content (Signs & Quiz Questions)

There's no admin panel or upload UI — content is added directly in code by the dev team via `js/data.js`. It holds two arrays, `SIGNS` and `QUESTIONS`, shaped to match the planned Firestore collections (see `SYSTEM_ARCHITECTURE.md` §5), so moving from this file to real Firestore reads later is a small change rather than a rewrite.

```js
// js/data.js
const SIGNS = [
  {
    id: 'basic_A',
    level: 'basic',
    signId: 'A',
    title: 'Letter A',
    description: '…',
    imageUrl: '../assets/images/basic/A.png',
    videoUrl: '../assets/videos/basic/A.mp4',
    order: 1,
  },
  // add more here
];
```

`data.js` isn't wired into `learn.js` / `lesson.js` / `quiz.js` yet — those still render static HTML for the existing lessons. Looping over `LWData.SIGNS` / `LWData.QUESTIONS` in those files instead of hand-coded markup is the next step (see Roadmap).

## Design System

Tokens live in `css/style.css` under `:root` and are shared across every page.

| Token | Value | Use |
|---|---|---|
| `--clr-accent` | `#3fb950` | Primary actions, progress, done states |
| `--clr-yellow` | `#d29922` | Medium level badge |
| `--clr-orange` | `#e3822a` | Intermediate level badge |
| `--clr-blue` | `#388bfd` | Links, info states |
| `--clr-red` | `#f85149` | Errors, locked content |
| `--font-display` | Space Grotesk | Headings |
| `--font-body` | Inter | Body text |

Quiz pass threshold: **80%**.

## Roadmap

1. Replace the 4 bypass functions in `js/auth.js` with real Firebase Auth calls
2. Connect Firestore for progress — update `getActiveUser()` in `js/main.js` to read/write `users/{uid}`
3. Wire `js/data.js` into `learn.js` / `lesson.js` / `quiz.js` rendering
4. Move `signs` and `questions` from `data.js` into actual Firestore collections
5. Write survey submissions in `feedback.js` to the Firestore `surveys` collection

Full detail on each step is in `SYSTEM_ARCHITECTURE.md`.

## Contributing

This is a capstone project repo. If you're on the team:

- Keep new pages consistent with the existing design tokens in `css/style.css` rather than introducing new colors/spacing ad hoc.
- Any page that should require login must call `LWAuth.requireAuth('../index.html')` at the top of `<head>`, matching the existing pages.
- Add new signs/questions to `js/data.js` rather than hand-coding more HTML cards, where practical.
- Update `SYSTEM_ARCHITECTURE.md` if you change the file structure, the Firestore schema, or the user flow.
