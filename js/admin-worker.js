/**
 * admin-worker.js — the ONE place the admin pages learn the Worker's URL and call it
 * ─────────────────────────────────────────────────────────────────
 * The Cloudflare Worker (worker/src/index.js) is the only backend LinguaWave has. It does the
 * things a static site can't do safely from the browser:
 *   POST /v1/upload-url, /v1/finalize, /v1/delete   R2 lesson videos        (js/admin-media.js)
 *   POST /v1/delete-user                            delete a learner's Firebase Auth login
 *                                                   (js/admin-firebase.js deleteLearnerAccount)
 *
 * Every call carries the admin's Firebase ID token. The Worker verifies it and checks the admin
 * email itself; nothing the browser sends here (or stores) is trusted as proof of being the admin.
 * No credential lives in this file: the service-account key is a Worker secret.
 *
 * CONFIG: WORKER_URL must be your deployed Worker, and the Worker's ALLOWED_ORIGINS
 * (worker/wrangler.toml) must include the site that serves these pages.
 * ─────────────────────────────────────────────────────────────────
 */
import { auth } from "./auth.js";

export const WORKER_URL = "https://linguawave-media.johnjewelrydelacruz.workers.dev";

/**
 * POSTs JSON to the Worker with the signed-in admin's ID token.
 * Throws an Error with a learner/admin-safe message and a `code`:
 *   worker/signed-out     nobody is signed in
 *   worker/unreachable    network / CORS failure (the request never got an answer)
 *   worker/http-<status>  the Worker answered with an error; err.status is the number and
 *                         err.message is the Worker's own explanation
 * @param {string} path  e.g. "/v1/delete-user"
 * @param {object} body
 * @param {{forceRefresh?: boolean}} [opts]  forceRefresh: always mint a new ID token instead of
 *        re-using the cached one (the SDK already refreshes a token that is about to expire).
 */
export async function callWorker(path, body, { forceRefresh = false } = {}) {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("You're signed out. Sign in again and retry.");
    err.code = "worker/signed-out";
    throw err;
  }
  const token = await user.getIdToken(forceRefresh);
  let res;
  try {
    res = await fetch(WORKER_URL + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error("Couldn't reach the LinguaWave server. Check your connection, and that the Worker's ALLOWED_ORIGINS includes this site.");
    err.code = "worker/unreachable";
    err.cause = e;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Server error (${res.status}).`);
    err.code = `worker/http-${res.status}`;
    err.status = res.status;
    throw err;
  }
  return data;
}
