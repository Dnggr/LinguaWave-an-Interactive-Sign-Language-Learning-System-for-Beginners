# Admin Panel — Setup

New files, at a glance:

```
firestore.rules              # NEW — publish in Firebase console (see its own header)
css/admin.css                # NEW
js/admin-firebase.js         # NEW — Firestore users helpers + account-delete call
js/admin-auth.js             # NEW — single-admin route guard
js/admin-content.js          # NEW — reads hardcoded lessons/quizzes from missions.js
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

## 5. Deleting learners (Cloud Function — one-time deploy)

User Management's **Delete** removes a learner's Firebase Authentication
login **and** their Firestore data (`users/{uid}` and everything under
it). A browser can't delete someone else's login, so this goes through
the `deleteLearnerAccount` function in `functions/`.

1. Firebase console → upgrade the project to the **Blaze** plan (Cloud
   Functions require it; usage for a class project is effectively free).
2. Open `functions/index.js` and confirm `ADMIN_EMAIL` matches the admin
   email used everywhere else.
3. From the repo root (needs the Firebase CLI, `npm i -g firebase-tools`):
   ```
   firebase login
   firebase init functions   # choose your project; when asked, use the existing
                             # ./functions folder, JavaScript, keep existing files
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
   If you already have a `firebase.json`, just make sure it has
   `"functions": [{ "source": "functions" }]`.

Until it's deployed, Delete shows "Delete service isn't deployed yet —
nothing was deleted" and changes nothing (it never half-deletes).
Only the admin account can call the function (checked server-side).

## 6. Feedback & Surveys

Learner feedback (`pages/feedback.html`) is stored in Firestore `surveys`
and reviewed at `pages/admin-feedback.html` (sidebar → **Feedback**). The
admin dashboard and Reports also show feedback counts.

- **Re-publish `firestore.rules`** (step 3) after pulling this change: the
  `surveys` rule now validates the document shape, requires the id to
  start with the learner's uid and `userEmail` to match their login, and
  keeps reads admin-only. Learners can create a survey but never read,
  change or delete one.
- Old survey documents (from before names/emails were stored) still show
  up; the page fills in the learner from the `users` collection when it
  can and otherwise shows "Unknown learner".
- All feedback is loaded in one read and paged in the browser. If the
  collection ever gets large, change `listSurveys()` in
  `js/admin-firebase.js` to a `limit()`/`startAfter()` query.

## Scope, on purpose

- **Lesson/Quiz Management are read-only views of the hardcoded
  curriculum** in `js/missions.js` (through `js/admin-content.js`) — the
  same lessons and mastery quizzes learners actually use. Nothing is read
  from or written to Firestore for them, and there is no level (the app is
  one linear trail). To change a lesson or a quiz, edit `js/missions.js`
  (quizzes are generated from each mission's signs) and redeploy.
- The old Firestore `signs` / `questions` collections are no longer used
  by the app; any documents in them can be deleted in the Firebase console.
- **Lesson Management** has no motion/gesture-detection fields — it shows
  lesson content only, not the trained classifier models, per the capstone
  limitation.
