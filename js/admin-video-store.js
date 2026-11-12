
export const VIDEO_DIR_SEGMENTS = ["assets", "videos", "basic", "asl_vid_diy_raw"];
export const VIDEO_PATH_PREFIX = "../" + VIDEO_DIR_SEGMENTS.join("/") + "/";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IDB_NAME = "lw-admin";
const IDB_STORE = "handles";
const IDB_KEY = "project-folder";

let folderHandle = null;

export function supportsFolderAccess() {
  return typeof window.showDirectoryPicker === "function" && window.isSecureContext;
}

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
  } catch {  }
}

export async function loadRememberedFolder() {
  if (!supportsFolderAccess()) return "";
  folderHandle = await idbGet();
  return folderHandle ? folderHandle.name : "";
}

export function getFolderName() {
  return folderHandle ? folderHandle.name : "";
}

export async function connectFolder() {
  const handle = await window.showDirectoryPicker({ id: "lw-project", mode: "readwrite" });
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

export function videoFileName(signId) {
  return `${signId}.mp4`;
}
export function videoPathFor(signId) {
  return VIDEO_PATH_PREFIX + videoFileName(signId);
}

export async function videoExists(signId) {
  if (!folderHandle || !(await ensurePermission())) return false;
  try {
    const dir = await videoDir(false);
    await dir.getFileHandle(videoFileName(signId));
    return true;
  } catch { return false; }
}

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
      try { await writable.abort(); } catch {  }
      throw e;
    }
    return { path, mode: "folder" };
  }

  downloadAs(file, name);
  return { path, mode: "download" };
}
