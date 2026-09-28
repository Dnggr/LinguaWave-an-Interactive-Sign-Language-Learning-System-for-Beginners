# Admin Panel — Setup

New files, at a glance:

```
firestore.rules              # NEW — publish in Firebase console (see its own header)
css/admin.css                # NEW
js/admin-firebase.js         # NEW — Firebase init + Firestore CRUD helpers
js/admin-auth.js             # NEW — single-admin route guard
js/admin-dashboard.js        # NEW
js/admin-lessons.js          # NEW
js/admin-quiz.js             # NEW
js/admin-users.js            # NEW
js/admin-reports.js          # NEW
pages/admin-dashboard.html   # NEW
pages/admin-lessons.html     # NEW
pages/admin-quiz.html        # NEW
pages/admin-users.html       # NEW
pages/admin-reports.html     # NEW
```

Drop all of them into the matching paths in the existing project (same
folders the rest of the app already uses: `css/`, `js/`, `pages/`).
Nothing in the existing codebase was modified — `js/auth.js` in
particular was left completely untouched, per
`SYSTEM_ARCHITECTURE.md`'s note that it's teammate-owned.

## 1. Create the admin account

There's no separate admin sign-up flow — the one admin is just a
normal account, identified by its email address. Register it through
the existing sign-up form on `index.html` using whichever email you
want to use as the admin (or use the placeholder,
`admin@linguawave.app`).

## 2. Set the admin email

Open `js/admin-auth.js` and change:

```js
const ADMIN_EMAIL = "admin@linguawave.app";
```

to the email you registered in step 1.

## 3. Publish the Firestore rules

`js/admin-auth.js` only hides the admin pages from everyone else — it
can't stop a technically-inclined learner from calling Firestore
directly from devtools. The real backstop is `firestore.rules`:
open Firebase console → Firestore Database → Rules, paste this file's
contents in, and Publish. **Update the email inside that file too** —
it's hardcoded there a second time since Rules can't read a JS
constant.

## 4. Open the panel

Log in with the admin account, then go directly to
`pages/admin-dashboard.html` — there's intentionally no link to it
from the learner sidebar, to keep the two experiences visually
separate.

## Scope, on purpose

- **Lesson/Quiz Management** are real CRUD screens against two new
  Firestore collections (`signs`, `questions`) that
  `SYSTEM_ARCHITECTURE.md` §4 already planned but never built. They do
  **not** touch `js/data.js`, which is what the learner-facing pages
  (`learn.html`, `lesson.html`, etc.) actually read their curriculum
  from today. So: admin-created/edited lessons and questions are real,
  saved data, but won't show up to learners yet. Wiring the learner
  pages to read from Firestore instead is a bigger, separate job (it
  touches the unit-gating logic in `js/engine/progress.js` and
  `js/missions.js`) — happy to scope that next if you want it.
- **Lesson Management** has no motion/gesture-detection fields — it
  manages lesson content only, not the trained classifier models, per
  the capstone limitation you flagged.
- **User Management**'s "Delete" only removes the Firestore profile
  document, not the Firebase Auth login itself (that needs a
  server-side Admin SDK, which this static-hosting stack doesn't have).
  The learner could still sign back in — they'd just get a fresh,
  empty profile. Flagged in the UI, not hidden.
