/**
 * custom-lessons.js — Loads the lessons the admin added (NEW)
 * ─────────────────────────────────────────────────────────────────
 * WHAT   : Reads Firestore `signs` where source === "admin" (written by
 *          pages/admin-lessons.html) and hands them to
 *          LWMissions.registerCustomSigns(), which merges them into the
 *          curriculum so they appear in their mission (Lesson, Quick Check,
 *          Practice and Mastery Quiz) like any built-in sign.
 * WHO    : Lazy-loaded by js/missions.js (dynamic import) from
 *          whenMissionsSyncReady(). NO page needs a new <script> tag.
 * CACHE  : The last good list is saved in localStorage so the next page
 *          load shows admin lessons instantly (missions.js re-reads it
 *          synchronously), then the fresh Firestore copy replaces it.
 * VIDEO  : Each doc's `videoUrl` is the Firebase Storage download URL saved
 *          by the admin panel; the Lesson page plays it directly.
 * RULES  : firestore.rules -> signs: `allow read: if signedIn()`.
 * ─────────────────────────────────────────────────────────────────
 */
import { db, collection, getDocs } from "./auth.js";
import { query, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Only the fields the learner side needs (also keeps Firestore Timestamps
// out of the JSON cache).
function toPlain(id, d) {
  return {
    id,
    signId: d.signId || id,
    title: d.title || "",
    description: d.description || "",
    tips: Array.isArray(d.tips) ? d.tips : [],
    missionId: d.missionId || "",
    level: d.level || "",
    category: d.category || "",
    order: typeof d.order === "number" ? d.order : 0,
    videoUrl: d.videoUrl || "",
    localVideoPath: d.localVideoPath || "",
  };
}

/**
 * @param {(list: object[]) => number} register  LWMissions.registerCustomSigns
 * @param {string} cacheKey                       localStorage key
 * @returns {Promise<number>} how many lessons were registered
 */
export async function loadCustomLessons(register, cacheKey) {
  const snap = await getDocs(query(collection(db, "signs"), where("source", "==", "admin")));
  const list = snap.docs.map((d) => toPlain(d.id, d.data()));
  const added = register(list);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(list));
  } catch {
    /* private mode / quota: the list still applies to this page load */
  }
  return added;
}
