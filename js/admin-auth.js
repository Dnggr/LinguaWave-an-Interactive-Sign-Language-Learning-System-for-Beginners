/**
 * admin-auth.js — Admin route guard (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : "Only one admin" gate for pages/admin-*.html. Reuses the
 *            EXISTING Firebase Auth session from js/auth.js (the admin
 *            logs in through the normal index.html form like any other
 *            account) and only additionally checks that the signed-in
 *            email matches ADMIN_EMAIL below.
 *
 * WHY NOT A `role` FIELD IN FIRESTORE : auth.js's own SECURITY note
 *            already flags the risk — a `role`/`level` field on a
 *            user's own profile document is something that account
 *            could rewrite from the browser console unless Security
 *            Rules stop it. A single hardcoded email, checked against
 *            Firebase's own `request.auth.token.email` (which the
 *            Firebase Auth SDK controls, not user-writable data), is
 *            the simplest thing that is actually safe to check against
 *            in Firestore Rules too — see firestore.rules at the repo
 *            root, which re-checks this SAME email server-side. Keep
 *            the two in sync if the admin's email ever changes.
 *
 * SETUP    : 1) Register a normal account through index.html's sign-up
 *               form using ADMIN_EMAIL's address below (or change
 *               ADMIN_EMAIL to whichever address you want to use).
 *            2) Log in with that account, then open
 *               pages/admin-dashboard.html directly — there is no link
 *               to it from the learner sidebar on purpose, to keep the
 *               two experiences visually separate.
 *            3) Publish firestore.rules in the Firebase console so the
 *               restriction is enforced server-side, not just here.
 *
 * CONNECTS : Loaded (as a module) by every pages/admin-*.html, after
 *            js/auth.js. Each admin page controller calls
 *            window.LWAdminAuth.requireAdmin() before rendering.
 * ─────────────────────────────────────────────────────────────────
 */

// Change this to whichever account should be the one admin.
const ADMIN_EMAIL = "admin@linguawave.app";

function isAdminEmail(email) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Waits for auth.js's real Firebase auth check to resolve, then:
 *  - not logged in at all      -> send to index.html
 *  - logged in as someone else -> toast + send back to the learner dashboard
 *  - logged in as ADMIN_EMAIL  -> resolve true, reveal the page
 * Mirrors js/auth.js's own requireAuth()/whenAuthReady() shape so it
 * reads the same way to anyone already familiar with that file.
 */
async function requireAdmin(opts) {
  const notLoggedInPath = (opts && opts.notLoggedInPath) || "../index.html";
  const notAdminPath = (opts && opts.notAdminPath) || "dashboard.html";

  if (window.LWAuth?.whenAuthReady) {
    await window.LWAuth.whenAuthReady();
  }

  if (!window.LWAuth?.isLoggedIn?.()) {
    window.location.href = notLoggedInPath;
    return false;
  }

  const user = window.LWAuth.getCurrentUser?.();
  if (!isAdminEmail(user?.email)) {
    // main.js (loaded earlier on every admin page) provides this.
    window.LinguaWave?.showToast?.("This area is for the admin account only.", "error");
    window.location.href = notAdminPath;
    return false;
  }

  document.body.classList.add("admin-ready");
  return true;
}

window.LWAdminAuth = {
  ADMIN_EMAIL,
  isAdminEmail,
  requireAdmin,
};
