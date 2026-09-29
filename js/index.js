/**
 * functions/index.js — Admin-only Cloud Function (NEW)
 * ─────────────────────────────────────────────────────────────────
 * deleteLearnerAccount({ uid })
 *   Deletes a learner COMPLETELY: their Firebase Authentication login
 *   and their Firestore data (users/{uid} plus every subcollection).
 *
 * WHY A FUNCTION : a browser can only delete the account that is
 *   currently signed in. Removing someone else's login needs the
 *   Admin SDK, which only runs on a server. This is that server piece.
 *
 * WHO MAY CALL IT : only the single admin account. The check uses the
 *   caller's verified Firebase token (request.auth), not anything the
 *   browser sends, so it can't be faked from devtools.
 *
 * KEEP IN SYNC : ADMIN_EMAIL below = js/admin-auth.js = js/role-guard.js
 *   = index.html (LW_ADMIN_EMAIL) = firestore.rules.
 *
 * ORDER : Auth first, then Firestore. If Auth deletion fails nothing is
 *   touched, so a learner is never left with data but no login (or the
 *   reverse). An already-missing Auth user is treated as success so a
 *   retry can finish cleaning up leftover Firestore data.
 *
 * Deploy: see ADMIN_SETUP.md ("Deleting learners"). Needs the Blaze plan.
 * ─────────────────────────────────────────────────────────────────
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const dns = require("dns").promises;

admin.initializeApp();

const ADMIN_EMAIL = "linguawave.project@gmail.com";

exports.deleteLearnerAccount = onCall(async (request) => {
  const caller = request.auth;
  const callerEmail = (caller?.token?.email || "").toLowerCase();

  if (!caller) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  if (callerEmail !== ADMIN_EMAIL.toLowerCase() || caller.token.email_verified === false) {
    throw new HttpsError("permission-denied", "Only the admin account can delete learners.");
  }

  const uid = request.data && request.data.uid;
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "A learner uid is required.");
  }
  if (uid === caller.uid) {
    throw new HttpsError("failed-precondition", "The admin account can't delete itself.");
  }

  // 1) Authentication login.
  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      console.error("deleteUser failed", uid, err);
      throw new HttpsError("internal", "Couldn't delete the login. Nothing else was removed.");
    }
  }

  // 2) Firestore data: users/{uid} and all of its subcollections.
  try {
    await admin.firestore().recursiveDelete(admin.firestore().doc(`users/${uid}`));
  } catch (err) {
    console.error("recursiveDelete failed", uid, err);
    throw new HttpsError(
      "internal",
      "The login was deleted but some data couldn't be removed. Try deleting again."
    );
  }

  return { ok: true, uid };
});


/**
 * checkEmailDomain({ email })  —  NEW, public (no auth required)
 * ─────────────────────────────────────────────────────────────────
 * Called from js/auth.js's register(), BEFORE any Firebase Auth
 * account or Firestore doc is created. A browser has no way to do a
 * DNS lookup itself, so this is the one piece that has to live on a
 * server — everything else about email verification (the actual
 * "click this link" step) stays in Firebase Auth's free, built-in
 * sendEmailVerification().
 *
 * WHAT IT CATCHES : syntactically valid but non-existent domains —
 *   "renejay@gmail.co" passes ordinary email-format validation (the
 *   TLD ".co" is real), so Firebase happily creates that account.
 *   This looks up whether gmail.co's domain actually has a mail
 *   server; if not, register() rejects it before touching Auth or
 *   Firestore at all.
 *
 * WHAT IT DOES NOT CATCH : whether the specific mailbox
 * ("renejay@") exists at a domain that IS real (e.g. a real but
 *   mistyped Gmail address). That's exactly what the verification
 *   link itself is for — this is a fast pre-filter, not a
 *   replacement for it.
 *
 * COST : $0. Uses Node's built-in `dns` module — no paid
 *   third-party email-verification API, no API key to manage.
 *   Runs well inside Cloud Functions' free monthly invocation quota
 *   for a student project's signup volume.
 *
 * Intentionally left callable by anyone signed OUT (no auth check) —
 * it has to run before an account exists, and it reveals nothing
 * beyond "does this domain have a mail server", the same thing a
 * `dig MX <domain>` from any terminal would show.
 * ─────────────────────────────────────────────────────────────────
 */
exports.checkEmailDomain = onCall(async (request) => {
  const email = String((request.data && request.data.email) || "").trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");

  if (atIndex < 1 || atIndex === email.length - 1) {
    return { deliverable: false, reason: "invalid-format" };
  }
  const domain = email.slice(atIndex + 1);

  // 1) Normal case: the domain advertises a mail server via MX records.
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      return { deliverable: true };
    }
  } catch (err) {
    // No MX records (or domain doesn't exist) — fall through and try
    // the A/AAAA fallback below before giving up.
  }

  // 2) Fallback per RFC 5321 §5.1: a domain with no MX record but a
  // valid A/AAAA record is still allowed to receive mail there.
  try {
    await dns.resolve4(domain);
    return { deliverable: true };
  } catch (err) {
    // no IPv4 address either
  }
  try {
    await dns.resolve6(domain);
    return { deliverable: true };
  } catch (err) {
    // no IPv6 address either
  }

  return { deliverable: false, reason: "no-mail-server" };
});
