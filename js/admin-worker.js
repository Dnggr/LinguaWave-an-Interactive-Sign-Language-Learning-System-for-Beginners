import { auth } from "./auth.js";

export const WORKER_URL = "https://linguawave-media.johnjewelrydelacruz.workers.dev";

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
