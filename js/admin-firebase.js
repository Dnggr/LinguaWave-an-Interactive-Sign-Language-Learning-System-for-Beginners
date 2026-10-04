/**
 * admin-firebase.js — Admin Firebase/Firestore layer (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single place that (a) connects to the same Firebase
 *            project js/auth.js already uses and (b) exposes plain
 *            CRUD helpers for the three collections the admin panel
 *            manages: `signs`, `questions`, `users`.
 *
 * BUILT ON auth.js : the Firebase config, initializeApp() and SDK
 *            imports live ONLY in js/auth.js, which exports `auth`,
 *            `db` and the Firestore helpers as ES-module exports (not
 *            on window.LWAuth, so the console-write risk from the
 *            SECURITY note at the bottom of auth.js stays closed).
 *            This file just adds the admin CRUD helpers on top.
 *
 * SECURITY NOTE (read this before deploying) : Because this is a
 *            static site with no server, the admin pages call
 *            Firestore directly from the browser. Gating those pages
 *            on the logged-in user's email (see js/admin-auth.js) stops
 *            the admin UI from being *shown* to a regular learner, but
 *            it does NOT stop a technically-inclined learner from
 *            opening devtools and calling the Firestore SDK themselves.
 *            The only real backstop for that is Firestore Security
 *            Rules, published in the Firebase console — see
 *            firestore.rules (new, at the repo root) for a starting
 *            point that restricts writes on `signs`/`questions` and
 *            profile edits on `users` to the same admin email this
 *            file's sibling (admin-auth.js) checks. Ship both together.
 *
 * SURVEYS  : listSurveys() reads the learner feedback js/feedback.js
 *            writes to `surveys/{id}` (admin-only read, see
 *            firestore.rules). getReportStats() loads users + surveys
 *            ONCE and shares them, so the dashboard and Reports pages
 *            don't issue duplicate queries. Row shaping lives in
 *            js/survey-schema.js.
 *
 * SCOPE    : Built-in lessons/quizzes are NOT stored in Firestore: the admin
 *            screens read the hardcoded curriculum (js/missions.js) through
 *            js/admin-content.js. The ONE exception is `signs`: lessons the
 *            admin creates in Lesson Management are saved there (create /
 *            update / delete below). Each doc keeps the video's public R2 URL
 *            and object key (the file lives in Cloudflare R2, not in Firestore).
 *            Besides that, this file handles `users` (list, level edit,
 *            full account delete) and the dashboard/report numbers.
 * ─────────────────────────────────────────────────────────────────
 */
// Single source of truth for Firebase: js/auth.js owns the config,
// initializeApp() and the SDK imports. Nothing is duplicated here.
import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "./auth.js";
// Same SDK build as auth.js, so these share its Firestore instance (`db`).
import {
  query,
  where,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getContentStats } from "./admin-content.js";
import { callWorker } from "./admin-worker.js";
import {
  normalizeSurvey,
  enrichWithUsers,
  sortNewestFirst,
  computeSurveyStats,
  computeAnswerDistributions,
  displayName,
} from "./survey-schema.js";
export { auth, db };
/* ── small helpers ──────────────────────────────────────────────── */
function withId(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
/* ── USERS (User Management) ──────────────────────────────────────
 * Reads/edits the SAME `users/{uid}` documents js/auth.js already
 * writes on register/login (name, email, level, joined). No "create"
 * here on purpose — accounts are created through the real sign-up
 * flow, not by the admin. Deleting a learner removes BOTH their Firebase
 * Auth login and their Firestore data. A browser can't delete someone
 * else's Auth account (that needs Google's Admin API), so that part goes
 * through the Cloudflare Worker (POST /v1/delete-user, see js/admin-worker.js
 * and worker/src/firebase-auth-admin.js). Everything else (Firestore cleanup,
 * progress reset) runs here in the admin's browser under firestore.rules.
 * There is NO Firebase Cloud Functions dependency: the Spark plan is enough.
 * ──────────────────────────────────────────────────────────────── */
// The admin is not a learner: hide the admin's own profile doc (if it has
// one) so User Management and Reports only count real learners.
const ADMIN_EMAIL_LC = "linguawave.project@gmail.com";
export async function listUsers() {
  const snap = await getDocs(collection(db, "users"));
  return withId(snap).filter(
    (u) => (u.email || "").toLowerCase() !== ADMIN_EMAIL_LC
  );
}
export function updateUserLevel(uid, level) {
  return updateDoc(doc(db, "users", uid), { level });
}
// Everything keyed by the learner's uid, besides users/{uid} itself (xpState, publicProfiles, userProgress,
// userProgressV2, userGame; surveys are found by their userId field instead). Keep in sync with firestore.rules.
const LEARNER_UID_DOCS = ["xpState", "publicProfiles", "userProgress", "userProgressV2", "userGame"];
/**
 * Admin-side Firestore cleanup (idempotent). users/{uid} goes FIRST: firestore.rules only let a
 * learner CREATE xpState / publicProfiles / progress docs while users/{uid} exists, so a learner tab
 * that is still open can't put the data back while it is being removed.
 */
async function deleteLearnerFirestoreData(uid) {
  await deleteDoc(doc(db, "users", uid));
  await Promise.all(LEARNER_UID_DOCS.map((name) => deleteDoc(doc(db, name, uid))));
  // Feedback is keyed `${uid}_${level}_${ts}`, so find it by its owner field.
  const surveys = await getDocs(query(collection(db, "surveys"), where("userId", "==", uid)));
  await Promise.all(surveys.docs.map((s) => deleteDoc(s.ref)));
}
/**
 * Deletes a learner COMPLETELY: Firebase Auth login + Firestore data. Order matters:
 *   1. The Worker deletes the Auth login (admin-only, verified server-side). If that fails, NOTHING
 *      else is deleted and this throws, so the row stays and the admin can simply try again.
 *      "Already missing" counts as success so an interrupted delete can be finished by retrying.
 *   2. Only then does this browser delete users, xpState, publicProfiles, userProgress,
 *      userProgressV2, userGame and the learner's surveys.
 * It never resolves with "data deleted but the login still exists".
 *
 * @param {string} uid                       the learner's uid
 * @param {{forceRefresh?: boolean}} [opts]  forceRefresh (default true): mint a new ID token for this call.
 *        deleteAllLearners() refreshes once up front and passes false so a bulk run isn't N refreshes.
 * @returns {Promise<{authDeleted:true, firestoreDeleted:true, alreadyMissing:boolean}>}
 * @throws  Error with code `admin/invalid-uid`, `admin/self-delete`, `worker/...` (see js/admin-worker.js:
 *          nothing was deleted) or `admin/cleanup-failed` (the login IS gone; run the delete again to finish).
 */
export async function deleteLearnerAccount(uid, { forceRefresh = true } = {}) {
  if (typeof uid !== "string" || !uid) {
    throw Object.assign(new Error("Invalid learner id."), { code: "admin/invalid-uid" });
  }
  if (uid === auth.currentUser?.uid) {
    throw Object.assign(new Error("You can't delete your own account here."), { code: "admin/self-delete" });
  }
  const res = await callWorker("/v1/delete-user", { uid }, { forceRefresh });
  // Require an explicit confirmation: anything else must never be treated as "deleted".
  if (res?.authDeleted !== true) {
    throw Object.assign(new Error("The server didn't confirm the login was deleted. Nothing else was removed."), { code: "admin/auth-not-confirmed" });
  }
  try {
    await deleteLearnerFirestoreData(uid);
  } catch (err) {
    console.error("[admin] login deleted but Firestore cleanup failed for", uid, err);
    throw Object.assign(
      new Error("The login was deleted but some data couldn't be removed. Press Delete again to finish."),
      { code: "admin/cleanup-failed", cause: err }
    );
  }
  return { authDeleted: true, firestoreDeleted: true, alreadyMissing: res.alreadyMissing === true };
}
/**
 * RESET PROGRESS (not Delete Account): keeps the Auth login and users/{uid}; removes XP, level, streak,
 * badges, the leaderboard row and all lesson progress. Writes users/{uid}.progressResetAt so the learner's
 * browser wipes its LOCAL copy on next load (js/auth.js applyProgressResetIfNeeded) instead of pushing it back.
 * Runs entirely from the admin's browser under firestore.rules (same code as the bulk reset below).
 *
 * @returns {Promise<{via:"browser"}>}
 */
export async function resetLearnerProgress(uid) {
  await resetLearnerFirestoreProgress(uid);
  return { via: "browser" };
}
/* ── BULK ACTIONS (User Management → "Reset all user data" / "Delete all users") ────────────────
 * Both work on EVERY learner returned by listUsers() (the admin's own profile is already filtered out
 * there) and, as a second guard, never touch the signed-in user's own uid. They run from the admin's
 * browser using what firestore.rules already allow the admin: delete xpState / publicProfiles /
 * userProgress / userProgressV2 / userGame / users / surveys, and update any field on users/{uid}.
 * "Delete all users" additionally calls the Worker once per learner to remove their Auth login.
 * ──────────────────────────────────────────────────────────────── */
const BULK_CONCURRENCY = 4;

async function listBulkTargets() {
  const me = auth.currentUser?.uid;
  return (await listUsers()).filter((u) => u.id !== me);
}

/** Runs worker(user) over users, BULK_CONCURRENCY at a time. Never throws for one bad user. */
async function runBulk(users, worker, onProgress) {
  const failed = [];
  let next = 0;
  let done = 0;
  async function lane() {
    while (next < users.length) {
      const u = users[next++];
      try {
        await worker(u);
      } catch (err) {
        console.error("[admin] bulk action failed for", u.id, err);
        failed.push({ uid: u.id, email: u.email || "", error: err });
      }
      done += 1;
      onProgress?.(done, users.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, users.length) }, lane));
  return failed;
}

/**
 * Resets ONE learner's progress from the browser: deletes XP/leaderboard/progress/game docs, then stamps
 * users/{uid}.progressResetAt LAST (js/auth.js applyProgressResetIfNeeded wipes the learner's local copy on
 * next load when it sees a new stamp). users/{uid} itself, the login, name, avatar and level are kept.
 */
async function resetLearnerFirestoreProgress(uid) {
  await Promise.all(LEARNER_UID_DOCS.map((name) => deleteDoc(doc(db, name, uid))));
  await updateDoc(doc(db, "users", uid), { progressResetAt: Date.now() });
}

/**
 * RESET ALL USER DATA. Every learner keeps their account; all XP, level, streaks, badges, leaderboard
 * rows, lesson/mission progress and game progress are removed. Feedback surveys are kept.
 * @param {(done:number,total:number)=>void} [onProgress]
 * @returns {Promise<{total:number, reset:number, failed:Array}>}
 */
export async function resetAllLearnersProgress(onProgress) {
  const users = await listBulkTargets();
  const failed = await runBulk(users, (u) => resetLearnerFirestoreProgress(u.id), onProgress);
  return { total: users.length, reset: users.length - failed.length, failed };
}

// Worker failures that would hit EVERY learner the same way (not signed in / not the admin / server not
// configured / unreachable). One of these on the first learner means: stop, nothing else is touched.
const SYSTEMIC_DELETE_ERRORS = ["worker/signed-out", "worker/unreachable", "worker/http-401", "worker/http-403", "worker/http-500"];

/**
 * DELETE ALL USERS. Runs deleteLearnerAccount() for every learner (Auth login first, then Firestore data;
 * see its comment). The first learner goes alone as a probe so a systemic problem (not allowed, Worker not
 * set up, offline) is reported once instead of failing 4x in parallel. A learner whose login couldn't be
 * deleted keeps ALL their data and is listed in `failed`; run it again to retry just those.
 * @returns {Promise<{total:number, deleted:number, failed:Array}>}
 */
export async function deleteAllLearners(onProgress) {
  const users = await listBulkTargets();
  if (!users.length) return { total: 0, deleted: 0, failed: [] };
  // One fresh ID token for the whole run; each call then re-uses the SDK's cached (auto-refreshed) token.
  await auth.currentUser?.getIdToken(true);
  const deleteOne = (u) => deleteLearnerAccount(u.id, { forceRefresh: false });

  let failed = await runBulk(users.slice(0, 1), deleteOne);
  onProgress?.(1, users.length);
  if (failed.length && SYSTEMIC_DELETE_ERRORS.includes(failed[0].error?.code)) {
    return { total: users.length, deleted: 0, failed };
  }
  const rest = users.slice(1);
  failed = failed.concat(await runBulk(rest, deleteOne, (d) => onProgress?.(1 + d, users.length)));
  return { total: users.length, deleted: users.length - failed.length, failed };
}

/* ── LESSONS (Lesson Management → `signs`) ────────────────────────
 * Lessons the admin adds. Doc id === signId (a lowercase slug), so a
 * lesson can never be created twice. Fields:
 *   signId, title, description, tips[], missionId, chapterId, level, category, order,
 *   videoUrl  (public https URL of the video in Cloudflare R2),
 *   videoKey  (the R2 object key, e.g. "videos/admin/hello/1790000000000.mp4",
 *              kept so the file can be replaced/deleted — js/admin-media.js),
 *   detectionType ("none" — admin-added lessons have no motion detection),
 *   source ("admin"), createdAt, updatedAt.
 * Writes are admin-only (firestore.rules: signs -> allow write: isAdmin()).
 * The video FILE itself is not stored in Firestore — only its URL and R2 key are.
 * ──────────────────────────────────────────────────────────────── */
export async function listAdminLessons() {
  const snap = await getDocs(collection(db, "signs"));
  return withId(snap);
}
function lessonPayload(data) {
  return {
    signId: data.signId,
    title: data.title,
    description: data.description || "",
    tips: Array.isArray(data.tips) ? data.tips : [],
    missionId: data.missionId || "",
    chapterId: data.chapterId || "",
    level: data.level || "",         // from the mission; learner side needs it (missions.js)
    category: data.category || "",   // from the mission; learner side needs it (missions.js)
    order: Number.isFinite(data.order) ? data.order : 0,
    videoUrl: data.videoUrl || "",
    videoKey: data.videoKey || "",
    detectionType: "none",
    source: "admin",
  };
}
/** Creates signs/{signId}. Throws {code:"lesson/exists"} if the id is taken. */
export async function createLesson(data) {
  const ref = doc(db, "signs", data.signId);
  if ((await getDoc(ref)).exists()) {
    const err = new Error("A lesson with this Sign ID already exists.");
    err.code = "lesson/exists";
    throw err;
  }
  await setDoc(ref, {
    ...lessonPayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
/** Updates an existing lesson (Sign ID never changes). */
export function updateLesson(signId, data) {
  const { signId: _ignored, ...rest } = lessonPayload({ ...data, signId });
  return updateDoc(doc(db, "signs", signId), { ...rest, updatedAt: serverTimestamp() });
}
export function deleteLesson(signId) {
  return deleteDoc(doc(db, "signs", signId));
}
/* ── SURVEYS (Feedback & Surveys) ─────────────────────────────────
 * Reads every `surveys/{id}` document in ONE getDocs() call, normalises
 * it (missing fields become safe defaults, so older documents never
 * break the page) and returns it newest-first. Sorting happens here in
 * JavaScript rather than with orderBy("submittedAt"): Firestore's
 * orderBy silently DROPS documents that lack the field, which would
 * hide legacy or malformed submissions from the admin.
 *
 * Optional `users` (an already-loaded listUsers() result) is used to
 * fill in name/email on legacy surveys saved before those were stored.
 *
 * SCALING: this is the single place to change when the collection gets
 * big. Swap the getDocs() for a query(collection, orderBy("submittedAt",
 * "desc"), limit(N), startAfter(cursor)) and have the page call it
 * per-page; every caller already treats the result as a plain array.
 * ──────────────────────────────────────────────────────────────── */
export async function listSurveys(users) {
  const snap = await getDocs(collection(db, "surveys"));
  const rows = snap.docs.map((d) => normalizeSurvey(d.id, d.data()));
  return sortNewestFirst(enrichWithUsers(rows, users));
}
/* ── REPORTS & ANALYTICS ───────────────────────────────────────────
 * Read-only aggregates computed client-side (learners from Firestore,
 * lessons/quizzes from the hardcoded curriculum). Nothing here is
 * written anywhere; it's derived fresh on every visit.
 * ──────────────────────────────────────────────────────────────── */
export async function getReportStats() {
  const users = await listUsers().catch((e) => {
    e.message = `[users] ${e.message}`;
    throw e;
  });
  // Feedback is loaded alongside but is NOT allowed to take the rest of
  // the dashboard/reports down with it: if the surveys read fails, those
  // numbers come back as null + feedbackError and everything else renders.
  let surveys = null;
  let feedbackError = null;
  try {
    surveys = await listSurveys(users);
  } catch (e) {
    console.error("[surveys] Failed to load feedback:", e);
    feedbackError = e;
  }
  // Lessons/quizzes come from the hardcoded curriculum, not Firestore.
  const content = getContentStats();
  const usersByLevel = users.reduce((acc, u) => {
    const lvl = u.level || "unspecified";
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});
  const sortedByJoined = [...users].sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));
  // Sign-ups per day for the last 14 days (users.joined is "YYYY-MM-DD") + how many joined in the last 7.
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const signupsByDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    signupsByDay.push({ date: key, count: users.filter((u) => u.joined === key).length });
  }
  const newThisWeek = signupsByDay.slice(-7).reduce((n, d) => n + d.count, 0);
  return {
    signupsByDay,
    newThisWeek,
    answerSummary: surveys ? computeAnswerDistributions(surveys) : null,
    totalUsers: users.length,
    usersByLevel,
    totalLessons: content.totalLessons,
    totalQuizzes: content.totalMissions,
    totalQuizQuestions: content.totalQuizQuestions,
    lessonsByChapter: content.lessonsByChapter,
    quizQuestionsByChapter: content.quizQuestionsByChapter,
    recentUsers: sortedByJoined.slice(0, 5),
    // Feedback (null when the surveys read failed — see feedbackError).
    feedback: surveys ? computeSurveyStats(surveys) : null,
    recentFeedback: surveys
      ? surveys.slice(0, 5).map((f) => ({
          id: f.id,
          name: displayName(f),
          email: f.userEmail,
          level: f.level,
          submittedMs: f.submittedMs,
        }))
      : [],
    feedbackError,
  };
}
