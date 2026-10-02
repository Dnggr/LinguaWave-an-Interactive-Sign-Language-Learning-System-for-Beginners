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
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
// Same SDK build as auth.js, so these share its Firestore instance (`db`).
import {
  query,
  where,
  writeBatch,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getContentStats } from "./admin-content.js";
import {
  normalizeSurvey,
  enrichWithUsers,
  sortNewestFirst,
  computeSurveyStats,
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
 * else's Auth account (that needs the Admin SDK), so that part goes through
 * the `deleteLearnerAccount` Cloud Function in /functions (Blaze plan, see
 * ADMIN_SETUP.md). Without it, only the Firestore data is deleted and the
 * admin is told to remove the login in the Firebase console.
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
// Every collection keyed by the learner's uid (doc id === uid).
// Keep in sync with firestore.rules AND functions/index.js.
const PER_UID_COLLECTIONS = [
  "userProgress",
  "userProgressV2",
  "userGame",
  "xpState",
  "publicProfiles", // leaderboard copy — must go, or the deleted learner stays on it
];

// Callable errors that mean "the Cloud Function isn't there / can't run".
const FUNCTION_UNREACHABLE = [
  "functions/not-found",
  "functions/unavailable",
  "functions/internal",
  "functions/deadline-exceeded",
];

/**
 * Deletes ALL of a learner's Firestore data from the browser (the admin's
 * rules allow it): users/{uid}, the per-uid collections above, and every
 * surveys/* document they submitted. One atomic batch — all or nothing.
 */
async function deleteLearnerFirestoreData(uid) {
  const surveys = await getDocs(
    query(collection(db, "surveys"), where("userId", "==", uid))
  );
  const batch = writeBatch(db);
  PER_UID_COLLECTIONS.forEach((c) => batch.delete(doc(db, c, uid)));
  surveys.forEach((s) => batch.delete(s.ref));
  batch.delete(doc(db, "users", uid)); // profile last in the list (the row the admin sees)
  await batch.commit();
}

/**
 * Deletes a learner COMPLETELY.
 *  1. Preferred: the admin-only `deleteLearnerAccount` Cloud Function removes
 *     the Firebase Auth login AND all Firestore data server-side.
 *  2. If the function isn't reachable (not deployed / project on the free
 *     Spark plan), the Firestore data is still deleted from the browser, and
 *     the result says `authDeleted: false` so the UI can tell the admin to
 *     remove the login in Firebase console -> Authentication.
 * A browser CANNOT delete another user's Auth login (needs the Admin SDK) —
 * that part only ever happens in the Cloud Function.
 *
 * @returns {Promise<{authDeleted:boolean, firestoreDeleted:boolean, via:"function"|"browser"}>}
 * Other errors (e.g. permission-denied) are re-thrown untouched.
 */
export async function deleteLearnerAccount(uid) {
  try {
    const call = httpsCallable(getFunctions(auth.app), "deleteLearnerAccount");
    await call({ uid });
    return { authDeleted: true, firestoreDeleted: true, via: "function" };
  } catch (err) {
    if (!FUNCTION_UNREACHABLE.includes(err?.code)) throw err;
    console.warn("[deleteLearnerAccount] Cloud Function unreachable:", err?.code, err?.message);
  }
  await deleteLearnerFirestoreData(uid);
  return { authDeleted: false, firestoreDeleted: true, via: "browser" };
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

  return {
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
