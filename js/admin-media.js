/**
 * admin-media.js — Uploads / removes lesson videos in Cloudflare R2 (REPLACES
 * js/admin-video-store.js, which wrote into the local project folder)
 * ─────────────────────────────────────────────────────────────────
 * WHERE THE FILE GOES : R2 bucket, key  videos/admin/<signId>/<timestamp>.mp4
 *                       (the key is chosen by the Worker, never by this file)
 * WHAT FIRESTORE GETS : videoUrl (public https URL learners play) and videoKey
 *                       (the R2 object key, so the file can be replaced/deleted).
 *
 * HOW (read worker/src/index.js for the other half):
 *   1. auth.currentUser.getIdToken()            -> Firebase ID token
 *   2. POST  <worker>/v1/upload-url             -> Worker checks token + admin,
 *                                                  returns a 10-minute presigned PUT URL
 *   3. PUT   file straight to R2                -> big file never touches the Worker
 *   4. POST  <worker>/v1/finalize               -> Worker checks size + real MP4,
 *                                                  deletes the object if it fails
 *   5. caller saves videoUrl/videoKey on Firestore `signs/{signId}`.
 *
 * No R2 credential exists in this file. The checks below (type/size) are for
 * fast feedback only; the Worker repeats them where they can't be bypassed.
 *
 * CONFIG: the deployed Worker URL is WORKER_URL in js/admin-worker.js (R2_SETUP.md, step 5).
 * ─────────────────────────────────────────────────────────────────
 */
import { auth } from "./admin-firebase.js";
// The Worker URL now lives in js/admin-worker.js (shared with learner deletion). Re-exported under
// the old name so nothing that imports MEDIA_API_URL has to change.
import { WORKER_URL } from "./admin-worker.js";

export const MEDIA_API_URL = WORKER_URL;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // keep in sync with worker/src/index.js
// MP4 only: the learner players hard-code type="video/mp4" (see worker/src/index.js).
export const VIDEO_TYPES = { mp4: "video/mp4" };

/** "mp4" | "" — judged by the file name, falling back to its MIME type. */
function videoExt(file) {
  const m = /\.(mp4)$/i.exec(file.name || "");
  if (m) return m[1].toLowerCase();
  return Object.keys(VIDEO_TYPES).find((e) => VIDEO_TYPES[e] === file.type) || "";
}

/** Basic checks before anything is sent. Returns an error string or "". */
export function validateVideoFile(file) {
  if (!file) return "";
  if (!videoExt(file)) return "Only MP4 videos are allowed.";
  if (file.size === 0) return "That video file is empty.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `Video is too large (${(file.size / 1048576).toFixed(1)} MB). Max is ${MAX_VIDEO_BYTES / 1048576} MB.`;
  }
  return "";
}

function configError() {
  const err = new Error("Media storage isn't set up yet: set WORKER_URL in js/admin-worker.js (see R2_SETUP.md).");
  err.code = "media/not-configured";
  return err;
}

async function callWorker(path, body) {
  if (MEDIA_API_URL.includes("YOUR-SUBDOMAIN")) throw configError();
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("You're signed out. Sign in again and retry.");
    err.code = "media/signed-out";
    throw err;
  }
  const token = await user.getIdToken(); // refreshes automatically when it's about to expire
  let res;
  try {
    res = await fetch(MEDIA_API_URL + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error("Couldn't reach the media service. Check WORKER_URL in js/admin-worker.js and that the Worker's ALLOWED_ORIGINS includes this site.");
    err.code = "media/unreachable";
    err.cause = e;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Media service error (${res.status}).`);
    err.code = `media/http-${res.status}`;
    throw err;
  }
  return data;
}

// fetch() can't report upload progress, XHR can.
function putFile(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType); // must match what the URL was signed for
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const err = new Error(`Upload to storage failed (${xhr.status}). The upload link may have expired — try again.`);
      err.code = "media/put-failed";
      reject(err);
    };
    xhr.onerror = () => {
      const err = new Error("Upload to storage failed. Check the R2 bucket's CORS settings allow PUT from this site.");
      err.code = "media/put-network";
      reject(err);
    };
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

/**
 * Uploads `file` for lesson `signId`.
 * @param {(percent:number)=>void} [onProgress]
 * @returns {Promise<{key:string, url:string}>}  save both on the lesson document
 */
export async function uploadLessonVideo(signId, file, onProgress) {
  const err = validateVideoFile(file);
  if (err) throw new Error(err);
  const contentType = VIDEO_TYPES[videoExt(file)];

  const slot = await callWorker("/v1/upload-url", { signId, contentType, size: file.size });
  await putFile(slot.uploadUrl, file, contentType, onProgress);
  const done = await callWorker("/v1/finalize", { key: slot.key });
  return { key: done.key, url: done.publicUrl };
}

/**
 * Removes a video from R2. Best-effort on purpose: a leftover file is
 * harmless, so a failure here must never undo a lesson save/delete that
 * already succeeded. Returns true when it was removed.
 */
export async function deleteLessonVideo(key) {
  if (!key) return true;
  try {
    await callWorker("/v1/delete", { key });
    return true;
  } catch (e) {
    console.warn("[admin-media] couldn't delete", key, e);
    return false;
  }
}
