import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "./auth.js";
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
function withId(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
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
const LEARNER_UID_DOCS = ["xpState", "publicProfiles", "userProgress", "userProgressV2", "userGame"];
async function deleteLearnerFirestoreData(uid) {
  await deleteDoc(doc(db, "users", uid));
  await Promise.all(LEARNER_UID_DOCS.map((name) => deleteDoc(doc(db, name, uid))));
  const surveys = await getDocs(query(collection(db, "surveys"), where("userId", "==", uid)));
  await Promise.all(surveys.docs.map((s) => deleteDoc(s.ref)));
}
export async function deleteLearnerAccount(uid, { forceRefresh = true } = {}) {
  if (typeof uid !== "string" || !uid) {
    throw Object.assign(new Error("Invalid learner id."), { code: "admin/invalid-uid" });
  }
  if (uid === auth.currentUser?.uid) {
    throw Object.assign(new Error("You can't delete your own account here."), { code: "admin/self-delete" });
  }
  const res = await callWorker("/v1/delete-user", { uid }, { forceRefresh });
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
export async function resetLearnerProgress(uid) {
  await resetLearnerFirestoreProgress(uid);
  return { via: "browser" };
}
const BULK_CONCURRENCY = 4;

async function listBulkTargets() {
  const me = auth.currentUser?.uid;
  return (await listUsers()).filter((u) => u.id !== me);
}

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

async function resetLearnerFirestoreProgress(uid) {
  await Promise.all(LEARNER_UID_DOCS.map((name) => deleteDoc(doc(db, name, uid))));
  await updateDoc(doc(db, "users", uid), { progressResetAt: Date.now() });
}

export async function resetAllLearnersProgress(onProgress) {
  const users = await listBulkTargets();
  const failed = await runBulk(users, (u) => resetLearnerFirestoreProgress(u.id), onProgress);
  return { total: users.length, reset: users.length - failed.length, failed };
}

const SYSTEMIC_DELETE_ERRORS = ["worker/signed-out", "worker/unreachable", "worker/http-401", "worker/http-403", "worker/http-500"];

export async function deleteAllLearners(onProgress) {
  const users = await listBulkTargets();
  if (!users.length) return { total: 0, deleted: 0, failed: [] };
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
    level: data.level || "",
    category: data.category || "",
    order: Number.isFinite(data.order) ? data.order : 0,
    videoUrl: data.videoUrl || "",
    videoKey: data.videoKey || "",
    detectionType: "none",
    source: "admin",
  };
}
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
export function updateLesson(signId, data) {
  const { signId: _ignored, ...rest } = lessonPayload({ ...data, signId });
  return updateDoc(doc(db, "signs", signId), { ...rest, updatedAt: serverTimestamp() });
}
export function deleteLesson(signId) {
  return deleteDoc(doc(db, "signs", signId));
}
export async function listSurveys(users) {
  const snap = await getDocs(collection(db, "surveys"));
  const rows = snap.docs.map((d) => normalizeSurvey(d.id, d.data()));
  return sortNewestFirst(enrichWithUsers(rows, users));
}
export async function getReportStats() {
  const users = await listUsers().catch((e) => {
    e.message = `[users] ${e.message}`;
    throw e;
  });
  let surveys = null;
  let feedbackError = null;
  try {
    surveys = await listSurveys(users);
  } catch (e) {
    console.error("[surveys] Failed to load feedback:", e);
    feedbackError = e;
  }
  const content = getContentStats();
  const usersByLevel = users.reduce((acc, u) => {
    const lvl = u.level || "unspecified";
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});
  const sortedByJoined = [...users].sort((a, b) => (b.joined || "").localeCompare(a.joined || ""));
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
