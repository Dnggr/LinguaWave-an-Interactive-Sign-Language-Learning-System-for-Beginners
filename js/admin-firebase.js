/**
 * admin-firebase.js — Admin Firebase/Firestore layer (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single place that (a) connects to the same Firebase
 *            project js/auth.js already uses and (b) exposes plain
 *            CRUD helpers for the three collections the admin panel
 *            manages: `signs`, `questions`, `users`.
 *
 * WHY A SEPARATE FILE FROM auth.js : SYSTEM_ARCHITECTURE.md marks
 *            js/auth.js as teammate-owned and out of scope for AI
 *            sessions, and auth.js deliberately does NOT export `db`/
 *            `doc`/`setDoc`/`getDoc` (see the SECURITY note at the
 *            bottom of that file — exporting them once let anyone open
 *            devtools and write straight to Firestore). This file
 *            re-initializes the Firebase connection independently
 *            (guarded with getApps()/getApp() so it safely reuses the
 *            same underlying app auth.js already started instead of
 *            throwing a "default app already exists" error) and is the
 *            ONLY place in the codebase that exports Firestore write
 *            access — and only to the admin pages that import it.
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
 * SCOPE    : `signs`/`questions` here are the Firestore collections
 *            SYSTEM_ARCHITECTURE.md §4 already planned but never built.
 *            The live learner pages (learn.html/lesson.html/etc.) still
 *            read their content from js/data.js, not from these
 *            collections — so records created/edited here are real,
 *            persisted Firestore data, but won't appear to learners
 *            until/unless someone also points the learner pages at
 *            Firestore. Flagged clearly so it isn't mistaken for a bug.
 * ─────────────────────────────────────────────────────────────────
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Same project as js/auth.js — keep in sync if that config ever changes.
const firebaseConfig = {
  apiKey: "AIzaSyBpiKsa6ySEBy7IggejmT8TDWaxAFr5E2c",
  authDomain: "linguawave-63911.firebaseapp.com",
  projectId: "linguawave-63911",
  storageBucket: "linguawave-63911.firebasestorage.app",
  messagingSenderId: "34514540529",
  appId: "1:34514540529:web:18f5b1cd7f04e965fe1650",
  measurementId: "G-6CLTW0GZXJ",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ── small helpers ──────────────────────────────────────────────── */
function withId(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listSorted(collectionName) {
  const q = query(collection(db, collectionName), orderBy("order", "asc"));
  try {
    return withId(await getDocs(q));
  } catch (e) {
    // No `order` field yet on any doc (fresh collection) — fall back to
    // an unsorted read rather than surfacing a Firestore index error.
    return withId(await getDocs(collection(db, collectionName)));
  }
}

/* ── SIGNS (Lesson Management) ────────────────────────────────────
 * Shape (mirrors SYSTEM_ARCHITECTURE.md §4's planned `signs` schema):
 *   { level: 'basic'|'medium'|'intermediate', signId, category,
 *     title, description, imageUrl, videoUrl, order }
 * Deliberately NO field here relates to the motion/gesture detection
 * models (asl_static_model / asl_motion_model) — training + labelling
 * those is out of scope for this admin panel, per the capstone limit
 * the person asked to respect. This manages lesson CONTENT only.
 * ──────────────────────────────────────────────────────────────── */
export function listSigns() {
  return listSorted("signs");
}
export async function getSign(id) {
  const snap = await getDoc(doc(db, "signs", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export function createSign(data) {
  return addDoc(collection(db, "signs"), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
export function updateSign(id, data) {
  return updateDoc(doc(db, "signs", id), { ...data, updatedAt: new Date().toISOString() });
}
export function deleteSign(id) {
  return deleteDoc(doc(db, "signs", id));
}

/* ── QUESTIONS (Quiz Management) ──────────────────────────────────
 * Shape (mirrors §4's planned `questions` schema, with `correctId`
 * concretely implemented as a 0-based index into `options` — simplest
 * thing that satisfies "simple CRUD" without inventing per-option ids):
 *   { level, relatedSign?, prompt, options: string[],
 *     correctIndex: number, order }
 * ──────────────────────────────────────────────────────────────── */
export function listQuestions() {
  return listSorted("questions");
}
export async function getQuestion(id) {
  const snap = await getDoc(doc(db, "questions", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export function createQuestion(data) {
  return addDoc(collection(db, "questions"), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
export function updateQuestion(id, data) {
  return updateDoc(doc(db, "questions", id), { ...data, updatedAt: new Date().toISOString() });
}
export function deleteQuestion(id) {
  return deleteDoc(doc(db, "questions", id));
}

/* ── USERS (User Management) ──────────────────────────────────────
 * Reads/edits the SAME `users/{uid}` documents js/auth.js already
 * writes on register/login (name, email, level, joined). No "create"
 * here on purpose — accounts are created through the real sign-up
 * flow, not by the admin. Deleting only removes the Firestore PROFILE
 * doc, not the underlying Firebase Auth account (that needs the Admin
 * SDK from a server, which this static-hosting stack doesn't have) —
 * surfaced as a visible warning in the admin UI, not hidden.
 * ──────────────────────────────────────────────────────────────── */
export async function listUsers() {
  const snap = await getDocs(collection(db, "users"));
  return withId(snap);
}
export function updateUserLevel(uid, level) {
  return updateDoc(doc(db, "users", uid), { level });
}
export function deleteUserProfile(uid) {
  return deleteDoc(doc(db, "users", uid));
}

/* ── REPORTS & ANALYTICS ───────────────────────────────────────────
 * Read-only aggregates computed client-side from the three
 * collections above. Nothing here is written anywhere; it's derived
 * fresh on every visit to pages/admin-reports.html.
 * ──────────────────────────────────────────────────────────────── */
export async function getReportStats() {
  const [users, signs, questions] = await Promise.all([
    listUsers(),
    listSigns(),
    listQuestions(),
  ]);

  const byLevel = (items) =>
    items.reduce((acc, it) => {
      const lvl = it.level || "unspecified";
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    }, {});

  const sortedByJoined = [...users].sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));

  return {
    totalUsers: users.length,
    usersByLevel: byLevel(users),
    totalSigns: signs.length,
    signsByLevel: byLevel(signs),
    totalQuestions: questions.length,
    questionsByLevel: byLevel(questions),
    recentUsers: sortedByJoined.slice(0, 5),
  };
}
