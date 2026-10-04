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
 *
 * ─────────────────────────────────────────────────────────────────
 * 2026-09-29 — checkEmailDeliverability({ email })  (NEW, PUBLIC callable)
 *   Signup pre-check. js/auth.js register() calls this BEFORE creating the
 *   Firebase account, so a clearly unusable address (bad syntax, a domain
 *   with no mail server such as a mistyped "gmail.co", a disposable
 *   address, a mailbox the SMTP probe says does not exist) never becomes
 *   an account. All decision logic lives in functions/email-check.js.
 *
 *   ROLE OF REACHER: a pre-filter only. "Reacher says safe" does NOT mean
 *   the person owns the mailbox — Firebase's verification email does that.
 *
 *   The browser never sees Reacher or its secret: browser -> this
 *   function -> Reacher. The function returns ONLY { ok, reason?, checked }.
 *
 *   ONE-TIME SETUP (before deploying this function):
 *     1. Run Reacher somewhere with outbound port 25 (NOT inside Cloud
 *        Functions — GCP blocks port 25). e.g. Docker image
 *        reacherhq/backend, and set its RCH__HEADER_SECRET.
 *     2. firebase functions:secrets:set REACHER_SECRET      (that header value)
 *     3. Create functions/.env containing:
 *          REACHER_URL=https://your-reacher-host      (no trailing path)
 *          REACHER_REJECT_DISPOSABLE=true             (optional, default true)
 *     4. firebase deploy --only functions
 *   With REACHER_URL empty/unset the function still works: it falls back
 *   to a plain DNS MX/A lookup (weaker — no mailbox-level check).
 *
 *   FAILS OPEN: if Reacher is down/slow, the result is DNS-only, and if
 *   DNS is inconclusive the address is allowed. That is safe because an
 *   account with an unverified email gets NO learner access (js/auth.js).
 *
 *   ABUSE NOTE: it has to be callable by signed-out visitors (they have no
 *   account yet), so it has a small per-IP limiter (in-memory, per
 *   instance — best effort, not a hard guarantee). Consider Firebase App
 *   Check if this ever gets abused.
 * ─────────────────────────────────────────────────────────────────
 * 2026-09-30 — XP / levels / badges / streaks / leaderboards (LEGACY; Spark uses js/xp.js)
 *   claimLessonItem, claimMissionComplete, startGameSession, finishGameSession,
 *   backfillLegacyProgress, setLeaderboardVisibility, expireStaleStreaks (scheduled hourly).
 *   Formerly wrote XP with the Admin SDK. The Spark client now writes paired state/profile
 *   transactions under capped Firestore rules; these callable exports are legacy.
 *   deleteLearnerAccount below also removes the learner's XP data.
 * ─────────────────────────────────────────────────────────────────
 */
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

  // 3) XP state, public leaderboard profile, game session, audit events.
  try {
    await deleteXpData(uid);
    await deleteProgressData(uid);   // userProgress / userProgressV2 / userGame are NOT under users/{uid}
  } catch (err) {
    console.error("deleteXpData failed", uid, err);
    throw new HttpsError("internal", "The login was deleted but some XP data couldn't be removed. Try deleting again.");
  }

  return { ok: true, uid };
});

/* ── RESET PROGRESS (admin only): keeps Auth login + users/{uid}; wipes XP, leaderboard row and lesson progress ── */
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

/* ── XP system (functions/xp.js) ─────────────────────────────────── */
exports.claimLessonItem = xp.claimLessonItem;
exports.claimMissionComplete = xp.claimMissionComplete;
exports.startGameSession = xp.startGameSession;
exports.finishGameSession = xp.finishGameSession;
exports.backfillLegacyProgress = xp.backfillLegacyProgress;
exports.setLeaderboardVisibility = xp.setLeaderboardVisibility;
exports.expireStaleStreaks = xp.expireStaleStreaks;
exports.syncPublicProfileFromUser = xp.syncPublicProfileFromUser;

/* ── checkEmailDeliverability ───────────────────────────────────── */
const REACHER_URL = defineString("REACHER_URL", { default: "" });
const REACHER_SECRET = defineSecret("REACHER_SECRET"); // never sent to the browser
const REACHER_REJECT_DISPOSABLE = defineString("REACHER_REJECT_DISPOSABLE", { default: "true" });

// Best-effort per-IP limiter (memory is per function instance, so this
// slows a single abuser rather than guaranteeing a global cap).
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

    // Log the domain only — no full addresses in Cloud Logging.
    console.log(JSON.stringify({
      fn: "checkEmailDeliverability",
      domain: email.includes("@") ? email.slice(email.lastIndexOf("@") + 1).toLowerCase() : null,
      ok: verdict.ok, reason: verdict.reason || null, checked: verdict.checked,
    }));

    // Only these three fields ever reach the browser (no raw Reacher JSON).
    return { ok: verdict.ok, reason: verdict.reason || null, checked: verdict.checked };
  }
);
