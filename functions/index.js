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
