/**
 * admin-auth.js — Admin route guard (REVISED: checks LIVE Firebase auth)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : "Only one admin" gate for pages/admin-*.html.
 *
 * WHAT CHANGED : The old version read the signed-in email from the
 *            localStorage session cache ("lw_session"). That cache is
 *            editable in DevTools, so a learner could paste the admin
 *            email into it and get the admin screens to render. This
 *            version reads the email from Firebase's own live user
 *            (auth.currentUser), which the SDK populates from the real
 *            signed-in session and which cannot be forged from the
 *            console. If the live user is not the admin, the stale
 *            cache is cleared (auth.js rebuilds it from Firebase on the
 *            next page load) so js/role-guard.js can't bounce the
 *            person back into an admin/learner redirect loop.
 *
 * STILL JUST UI GATING : This hides admin pages from non-admins. The
 *            real lock on admin DATA is firestore.rules (repo root).
 *            Publish it in Firebase console -> Firestore -> Rules.
 *
 * KEEP IN SYNC : ADMIN_EMAIL here, in js/role-guard.js, in index.html
 *            (LW_ADMIN_EMAIL) and in firestore.rules.
 *
 * LOAD ORDER (already how every admin page does it):
 *            js/auth.js -> js/admin-firebase.js -> js/admin-auth.js
 *
 * CONNECTS : Each admin page controller calls
 *            window.LWAdminAuth.requireAdmin() before rendering.
 * ─────────────────────────────────────────────────────────────────
 */
import { auth } from "./admin-firebase.js";

const ADMIN_EMAIL = "linguawave.project@gmail.com";
const SESSION_KEY = "lw_session";

function isAdminEmail(email) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Waits for Firebase to finish restoring the session, then:
 *  - not signed in at all      -> index.html
 *  - signed in as someone else -> toast + learner dashboard
 *  - signed in as ADMIN_EMAIL  -> reveal the page, resolve true
 */
async function requireAdmin(opts) {
  const notLoggedInPath = (opts && opts.notLoggedInPath) || "../index.html";
  const notAdminPath = (opts && opts.notAdminPath) || "dashboard.html";

  // Let auth.js finish its own onAuthStateChanged work first (it writes
  // the session cache), then make sure Firebase itself has settled.
  if (window.LWAuth?.whenAuthReady) {
    await window.LWAuth.whenAuthReady();
  }
  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }

  const user = auth.currentUser; // LIVE Firebase user — not localStorage

  if (!user) {
    window.location.replace(notLoggedInPath);
    return false;
  }

  if (!isAdminEmail(user.email)) {
    // Drop a possibly forged/stale cache so the next page load rebuilds
    // it from Firebase and role-guard.js can't loop.
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    window.LinguaWave?.showToast?.("This area is for the admin account only.", "error");
    window.location.replace(notAdminPath);
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
