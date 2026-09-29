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
 * SCOPE    : Lessons and quizzes are NO LONGER stored in / read from
 *            Firestore here. The admin Lesson/Quiz screens read the
 *            hardcoded curriculum (js/missions.js) through
 *            js/admin-content.js — the same content learners see.
 *            This file now only handles `users` (list, level edit,
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
import { getContentStats } from "./admin-content.js";

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
 * else's Auth account (that needs the Admin SDK), so it goes through the
 * `deleteLearnerAccount` Cloud Function in /functions — deploy it first
 * (see ADMIN_SETUP.md). If the function isn't reachable, NOTHING is
 * deleted, so a learner is never left half-deleted.
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
/**
 * Deletes the learner's Firebase Auth account AND their Firestore data
 * (users/{uid} and everything under it) via the admin-only Cloud
 * Function. Throws with err.code === "functions/not-found" (or
 * "functions/unavailable"/"functions/internal") if the function isn't
 * deployed — callers should surface that, not fall back to a partial delete.
 */
export async function deleteLearnerAccount(uid) {
  const call = httpsCallable(getFunctions(auth.app), "deleteLearnerAccount");
  const res = await call({ uid });
  return res.data;
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
  };
}
