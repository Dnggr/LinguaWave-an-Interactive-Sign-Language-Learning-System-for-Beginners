import { db, collection, getDocs } from "./auth.js";
import { query, where } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

export async function loadCustomLessons(register, cacheKey) {
  const snap = await getDocs(query(collection(db, "signs"), where("source", "==", "admin")));
  const list = snap.docs.map((d) => toPlain(d.id, d.data()));
  const added = register(list);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(list));
  } catch {
  }
  return added;
}
