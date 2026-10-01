/**
 * functions/index.js — LinguaWave Cloud Functions
 * ─────────────────────────────────────────────────────────────────
 * deleteLearnerAccount({ uid })
 *   Admin-only. Deletes the learner's Firebase Auth login AND all of their
 *   Firestore data:
 *     users/{uid}  (+ any subcollections)
 *     userProgress/{uid}, userProgressV2/{uid}, userGame/{uid},
 *     xpState/{uid}, publicProfiles/{uid}   (leaderboard copy)
 *     surveys/*  where userId == uid
 *
 *   Order: Auth first, Firestore second. If a step fails midway the admin
 *   can simply press Delete again — every step tolerates "already gone".
 *
 * KEEP IN SYNC: ADMIN_EMAIL (also in firestore.rules, js/admin-auth.js,
 *   js/role-guard.js, js/admin-login.js, js/admin-firebase.js, index.html)
 *   and PER_UID_COLLECTIONS (also js/admin-firebase.js).
 *
 * Needs the Blaze plan to deploy. Requires firebase-functions >= 4 and
 * firebase-admin >= 11 in functions/package.json (Node 18+).
 * Deploy:  firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const ADMIN_EMAIL = "linguawave.project@gmail.com";
const PER_UID_COLLECTIONS = [
  "userProgress",
  "userProgressV2",
  "userGame",
  "xpState",
  "publicProfiles",
];

exports.deleteLearnerAccount = onCall(async (request) => {
  // ── who is asking? (token comes from Firebase, not from client data) ──
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  const callerEmail = String(request.auth.token.email || "").toLowerCase();
  if (callerEmail !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Only the admin can delete learners.");
  }

  // ── what are they asking for? ──
  const uid = request.data && request.data.uid;
  if (typeof uid !== "string" || !uid || uid.length > 128 || uid.includes("/")) {
    throw new HttpsError("invalid-argument", "A valid learner uid is required.");
  }
  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "The admin account can't be deleted.");
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // ── 1. Auth login ──
  let authDeleted = false;
  try {
    const target = await auth.getUser(uid);
    if (String(target.email || "").toLowerCase() === ADMIN_EMAIL) {
      throw new HttpsError("failed-precondition", "The admin account can't be deleted.");
    }
    await auth.deleteUser(uid);
    authDeleted = true;
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err.code !== "auth/user-not-found") {
      logger.error("deleteLearnerAccount: auth step failed", { uid, err });
      throw new HttpsError("internal", "Couldn't delete the login: " + (err.message || err.code));
    }
    // Already gone from Auth (e.g. a retry) — carry on and clean Firestore.
  }

  // ── 2. Firestore data ──
  try {
    await db.recursiveDelete(db.collection("users").doc(uid));
    await Promise.all(
      PER_UID_COLLECTIONS.map((c) => db.recursiveDelete(db.collection(c).doc(uid)))
    );

    const surveys = await db.collection("surveys").where("userId", "==", uid).get();
    if (!surveys.empty) {
      const writer = db.bulkWriter();
      surveys.forEach((s) => writer.delete(s.ref));
      await writer.close();
    }
  } catch (err) {
    logger.error("deleteLearnerAccount: firestore step failed", { uid, err });
    throw new HttpsError(
      "internal",
      "Login removed but some data couldn't be deleted — press Delete again to retry: " +
        (err.message || err.code)
    );
  }

  logger.info("deleteLearnerAccount: done", { uid, authDeleted });
  return { ok: true, authDeleted };
});
