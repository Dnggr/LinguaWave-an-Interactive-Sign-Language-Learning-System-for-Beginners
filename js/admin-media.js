import { auth } from "./admin-firebase.js";
import { WORKER_URL } from "./admin-worker.js";

export const MEDIA_API_URL = WORKER_URL;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES = { mp4: "video/mp4" };

function videoExt(file) {
  const m = /\.(mp4)$/i.exec(file.name || "");
  if (m) return m[1].toLowerCase();
  return Object.keys(VIDEO_TYPES).find((e) => VIDEO_TYPES[e] === file.type) || "";
}

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
  const token = await user.getIdToken();
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

function putFile(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
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

export async function uploadLessonVideo(signId, file, onProgress) {
  const err = validateVideoFile(file);
  if (err) throw new Error(err);
  const contentType = VIDEO_TYPES[videoExt(file)];

  const slot = await callWorker("/v1/upload-url", { signId, contentType, size: file.size });
  await putFile(slot.uploadUrl, file, contentType, onProgress);
  const done = await callWorker("/v1/finalize", { key: slot.key });
  return { key: done.key, url: done.publicUrl };
}

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
