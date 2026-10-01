/**
 * admin-video-store.js — Saves an uploaded lesson video into the project's
 * assets folder (NEW)
 * ─────────────────────────────────────────────────────────────────
 * WHERE THE FILE GOES : <project>/assets/videos/basic/asl_vid_diy_raw/<signId>.mp4
 * WHAT FIRESTORE GETS : the path relative to the pages/ folder, i.e.
 *                       ../assets/videos/basic/asl_vid_diy_raw/<signId>.mp4
 *
 * HOW (read this) : the site is static, so a web page cannot write to a
 *   folder on the server. Instead this uses the browser's File System
 *   Access API: the admin picks the LinguaWave PROJECT FOLDER once (the one
 *   that contains pages/, js/, assets/) and the browser writes the .mp4
 *   straight into it. The handle is remembered (IndexedDB), so the pick is
 *   one-time per browser; Chrome may ask to re-allow access after a restart.
 *   Supported in desktop Chrome / Edge / Opera. Elsewhere, saveVideo() falls
 *   back to downloading the file under the right name to drop in by hand.
 *
 *   The file lands in your LOCAL copy of the project. Learners only see the
 *   video after that folder is deployed/pushed (the Firestore path is
 *   saved immediately, so deploy soon after uploading).
 * ─────────────────────────────────────────────────────────────────
 */

export const VIDEO_DIR_SEGMENTS = ["assets", "videos", "basic", "asl_vid_diy_raw"];
export const VIDEO_PATH_PREFIX = "../" + VIDEO_DIR_SEGMENTS.join("/") + "/";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB — keep repo/deploy light

const IDB_NAME = "lw-admin";
const IDB_STORE = "handles";
const IDB_KEY = "project-folder";

let folderHandle = null;

export function supportsFolderAccess() {
  return typeof window.showDirectoryPicker === "function" && window.isSecureContext;
}

/* ── remember the folder across visits ─────────────────────────── */
function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet() {
  try {
    const idb = await openIdb();
    return await new Promise((resolve, reject) => {
      const r = idb.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  } catch { return null; }
}
async function idbSet(value) {
  try {
    const idb = await openIdb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      value ? tx.objectStore(IDB_STORE).put(value, IDB_KEY) : tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* remembering the folder is a convenience, never fatal */ }
}

/** Loads a previously chosen folder. Returns its name, or "" if none. */
export async function loadRememberedFolder() {
  if (!supportsFolderAccess()) return "";
  folderHandle = await idbGet();
  return folderHandle ? folderHandle.name : "";
}

export function getFolderName() {
  return folderHandle ? folderHandle.name : "";
}

/** Opens the folder picker. Must be called from a click. Returns the folder name. */
export async function connectFolder() {
  const handle = await window.showDirectoryPicker({ id: "lw-project", mode: "readwrite" });
  // Guard against picking the wrong folder: the project root has pages/.
  try {
    await handle.getDirectoryHandle("pages");
  } catch {
    const err = new Error("That doesn't look like the LinguaWave project folder. Pick the folder that contains pages/, js/ and assets/.");
    err.code = "folder/wrong";
    throw err;
  }
  folderHandle = handle;
  await idbSet(handle);
  return handle.name;
}

export async function disconnectFolder() {
  folderHandle = null;
  await idbSet(null);
}

async function ensurePermission() {
  if (!folderHandle) return false;
  const opts = { mode: "readwrite" };
  if ((await folderHandle.queryPermission(opts)) === "granted") return true;
  return (await folderHandle.requestPermission(opts)) === "granted";
}

/** True when saveVideo() can write straight into the project folder. */
export function isFolderConnected() {
  return !!folderHandle;
}

async function videoDir(create) {
  let dir = folderHandle;
  for (const seg of VIDEO_DIR_SEGMENTS) {
    dir = await dir.getDirectoryHandle(seg, { create });
  }
  return dir;
}

/** The file name a lesson's video is stored under. */
export function videoFileName(signId) {
  return `${signId}.mp4`;
}
export function videoPathFor(signId) {
  return VIDEO_PATH_PREFIX + videoFileName(signId);
}

/** Does <video folder>/<signId>.mp4 already exist? (false if the folder isn't readable) */
export async function videoExists(signId) {
  if (!folderHandle || !(await ensurePermission())) return false;
  try {
    const dir = await videoDir(false);
    await dir.getFileHandle(videoFileName(signId));
    return true;
  } catch { return false; }
}

/** Basic checks before anything is written. Returns an error string or "". */
export function validateVideoFile(file) {
  if (!file) return "";
  const isMp4 = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
  if (!isMp4) return "Only MP4 videos are allowed.";
  if (file.size === 0) return "That video file is empty.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `Video is too large (${(file.size / 1048576).toFixed(1)} MB). Max is ${MAX_VIDEO_BYTES / 1048576} MB.`;
  }
  return "";
}

function downloadAs(file, name) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Stores `file` as <signId>.mp4 in assets/videos/basic/asl_vid_diy_raw/.
 * @returns {Promise<{path:string, mode:"folder"|"download"}>}
 *   path = what to save in Firestore. mode "download" means the browser
 *   couldn't write into the project, so the file was downloaded instead
 *   and must be moved into that folder by hand.
 */
export async function saveVideo(signId, file) {
  const name = videoFileName(signId);
  const path = VIDEO_PATH_PREFIX + name;

  if (supportsFolderAccess() && folderHandle) {
    if (!(await ensurePermission())) {
      const err = new Error("Access to the project folder was not allowed.");
      err.code = "folder/denied";
      throw err;
    }
    const dir = await videoDir(true);
    const fh = await dir.getFileHandle(name, { create: true });
    const writable = await fh.createWritable();
    try {
      await writable.write(file);
      await writable.close();
    } catch (e) {
      try { await writable.abort(); } catch { /* already closed */ }
      throw e;
    }
    return { path, mode: "folder" };
  }

  downloadAs(file, name);
  return { path, mode: "download" };
}
