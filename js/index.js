const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { defineSecret, defineString } = require("firebase-functions/params");
const emailCheck = require("./email-check");
const xp = require("./xp");
const { deleteXpData, deleteProgressData, resetLearnerProgressData } = require("./xp-cleanup");

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

  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      console.error("deleteUser failed", uid, err);
      throw new HttpsError("internal", "Couldn't delete the login. Nothing else was removed.");
    }
  }

  try {
    await admin.firestore().recursiveDelete(admin.firestore().doc(`users/${uid}`));
  } catch (err) {
    console.error("recursiveDelete failed", uid, err);
    throw new HttpsError(
      "internal",
      "The login was deleted but some data couldn't be removed. Try deleting again."
    );
  }

  try {
    await deleteXpData(uid);
    await deleteProgressData(uid);
  } catch (err) {
    console.error("deleteXpData failed", uid, err);
    throw new HttpsError("internal", "The login was deleted but some XP data couldn't be removed. Try deleting again.");
  }

  return { ok: true, uid };
});

exports.resetLearnerProgress = onCall(async (request) => {
  const caller = request.auth;
  if (!caller) throw new HttpsError("unauthenticated", "Sign in first.");
  if ((caller.token.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase() || caller.token.email_verified === false) {
    throw new HttpsError("permission-denied", "Only the admin account can reset learners.");
  }
  const uid = request.data && request.data.uid;
  if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "A learner uid is required.");
  if (uid === caller.uid) throw new HttpsError("failed-precondition", "The admin account can't reset itself.");
  try {
    await resetLearnerProgressData(uid);
  } catch (err) {
    console.error("resetLearnerProgress failed", uid, err);
    throw new HttpsError("internal", "Couldn't reset this learner's progress. Try again.");
  }
  return { ok: true, uid };
});

exports.claimLessonItem = xp.claimLessonItem;
exports.claimMissionComplete = xp.claimMissionComplete;
exports.startGameSession = xp.startGameSession;
exports.finishGameSession = xp.finishGameSession;
exports.backfillLegacyProgress = xp.backfillLegacyProgress;
exports.setLeaderboardVisibility = xp.setLeaderboardVisibility;
exports.expireStaleStreaks = xp.expireStaleStreaks;
exports.syncPublicProfileFromUser = xp.syncPublicProfileFromUser;

const REACHER_URL = defineString("REACHER_URL", { default: "" });
const REACHER_SECRET = defineSecret("REACHER_SECRET");
const REACHER_REJECT_DISPOSABLE = defineString("REACHER_REJECT_DISPOSABLE", { default: "true" });

const CHECK_WINDOW_MS = 60 * 1000;
const CHECK_MAX_PER_WINDOW = 10;
const checkHits = new Map();

function tooManyChecks(ip) {
  const now = Date.now();
  if (checkHits.size > 2000) {
    for (const [key, entry] of checkHits) if (entry.resetAt <= now) checkHits.delete(key);
  }
  const entry = checkHits.get(ip);
  if (!entry || entry.resetAt <= now) {
    checkHits.set(ip, { count: 1, resetAt: now + CHECK_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > CHECK_MAX_PER_WINDOW;
}

exports.checkEmailDeliverability = onCall(
  { secrets: [REACHER_SECRET], timeoutSeconds: 30 },
  async (request) => {
    const raw = request.data && request.data.email;
    if (typeof raw !== "string") {
      throw new HttpsError("invalid-argument", "An email address is required.");
    }

    const ip = (request.rawRequest && request.rawRequest.ip) || "unknown";
    if (tooManyChecks(ip)) {
      throw new HttpsError("resource-exhausted", "Too many checks. Please wait a minute and try again.");
    }

    const email = emailCheck.normalizeEmail(raw);
    const verdict = await emailCheck.checkEmailDeliverability(email, {
      url: REACHER_URL.value(),
      secret: REACHER_SECRET.value(),
      rejectDisposable: String(REACHER_REJECT_DISPOSABLE.value()).toLowerCase() !== "false",
      timeoutMs: 12000,
      log: (msg) => console.warn(msg),
    });

    console.log(JSON.stringify({
      fn: "checkEmailDeliverability",
      domain: email.includes("@") ? email.slice(email.lastIndexOf("@") + 1).toLowerCase() : null,
      ok: verdict.ok, reason: verdict.reason || null, checked: verdict.checked,
    }));

    return { ok: verdict.ok, reason: verdict.reason || null, checked: verdict.checked };
  }
);
