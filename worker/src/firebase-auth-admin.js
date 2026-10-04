/**
 * firebase-auth-admin.js — privileged Firebase Authentication calls for the Worker
 * ─────────────────────────────────────────────────────────────────
 * WHY : a browser can only delete ITS OWN Firebase Auth account. Deleting another
 *       user's login needs Google's Identity Toolkit Admin API, which needs a
 *       service-account credential. That credential lives ONLY here, as Worker
 *       secrets, and is never sent to the browser.
 *
 * HOW (no firebase-admin, just Web Crypto + fetch, which Workers have natively):
 *   1. Build a JWT { iss: <service account email>, scope, aud: Google's token URL, iat, exp }
 *      and sign it RS256 with the service account's private key.
 *   2. POST it to https://oauth2.googleapis.com/token  -> short-lived OAuth access token.
 *   3. POST { localId: uid } to Identity Toolkit  accounts:delete  with that token.
 *
 * SECRETS (set with `npx wrangler secret put`, NEVER in wrangler.toml [vars]):
 *   FIREBASE_SERVICE_ACCOUNT_EMAIL        e.g. firebase-adminsdk-xxxxx@linguawave-63911.iam.gserviceaccount.com
 *   FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY  the "private_key" value of the service-account JSON
 *                                         (-----BEGIN PRIVATE KEY----- ... ). Literal "\n" sequences are accepted.
 * PUBLIC VAR: FIREBASE_PROJECT_ID (already in wrangler.toml).
 * ─────────────────────────────────────────────────────────────────
 */

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const IDENTITY_TOOLKIT_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
const TOKEN_LIFETIME_SECONDS = 3600;       // Google's maximum for a service-account JWT
const TOKEN_REFRESH_MARGIN_SECONDS = 120;  // re-use a cached token until 2 min before it expires

const enc = new TextEncoder();

/**
 * code: "not-configured" | "token-exchange-failed" | "user-not-found" | "api-error"
 * Never carries the private key; `detail` is Google's own error text, for server logs only.
 */
export class FirebaseAuthAdminError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "FirebaseAuthAdminError";
    this.code = code;
    this.detail = detail;
  }
}

/* ── helpers ────────────────────────────────────────────────────── */
function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const strToB64url = (s) => bytesToB64url(enc.encode(s));

/** PEM (PKCS#8) text -> DER bytes. Accepts real newlines or the literal "\n" a pasted JSON value contains. */
function pemToDer(pem) {
  const body = String(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw new FirebaseAuthAdminError("not-configured", "Service-account key is empty.");
  let bin;
  try {
    bin = atob(body);
  } catch {
    throw new FirebaseAuthAdminError("not-configured", "Service-account key is not valid PKCS#8 PEM.");
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signJwt(claims, privateKeyPem) {
  let key;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(privateKeyPem),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch (err) {
    if (err instanceof FirebaseAuthAdminError) throw err;
    throw new FirebaseAuthAdminError("not-configured", "Service-account key could not be imported.");
  }
  const head = strToB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = strToB64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

function requireConfig(env) {
  const email = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey || !env.FIREBASE_PROJECT_ID) {
    throw new FirebaseAuthAdminError(
      "not-configured",
      "Firebase service-account secrets are not set on the Worker."
    );
  }
  return { email, privateKey, projectId: env.FIREBASE_PROJECT_ID };
}

/* ── OAuth access token (cached per isolate) ────────────────────── */
const tokenCache = new Map(); // service-account email -> { token, expiresAtSec }
export function clearTokenCache() {
  tokenCache.clear();
}

/**
 * Returns a Google OAuth access token for the service account.
 * @param {object} env     Worker env (needs the two secrets above)
 * @param {number} [now]   ms since epoch (injectable for tests)
 * @param {{fetchFn?: typeof fetch}} [opts]
 */
export async function getGoogleAccessToken(env, now = Date.now(), { fetchFn = fetch } = {}) {
  const { email, privateKey } = requireConfig(env);
  const nowSec = Math.floor(now / 1000);

  const cached = tokenCache.get(email);
  if (cached && cached.expiresAtSec - TOKEN_REFRESH_MARGIN_SECONDS > nowSec) return cached.token;

  const assertion = await signJwt(
    {
      iss: email,
      scope: IDENTITY_TOOLKIT_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: nowSec,
      exp: nowSec + TOKEN_LIFETIME_SECONDS,
    },
    privateKey
  );

  let res;
  try {
    res = await fetchFn(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
  } catch (err) {
    throw new FirebaseAuthAdminError("token-exchange-failed", "Couldn't reach Google to authorise.", String(err));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== "string") {
    throw new FirebaseAuthAdminError(
      "token-exchange-failed",
      "Google rejected the service-account credential.",
      `${res.status} ${data.error || ""} ${data.error_description || ""}`.trim()
    );
  }
  const expiresIn = Number(data.expires_in) > 0 ? Number(data.expires_in) : TOKEN_LIFETIME_SECONDS;
  tokenCache.set(email, { token: data.access_token, expiresAtSec: nowSec + expiresIn });
  return data.access_token;
}

/* ── delete a Firebase Auth user ────────────────────────────────── */
/**
 * Deletes the Firebase Authentication account `uid`.
 * @returns {Promise<{uid:string}>} on success
 * @throws  {FirebaseAuthAdminError} code "user-not-found" when the account no longer exists
 *          (callers may treat that as "already deleted"), otherwise a failure code.
 */
export async function deleteFirebaseAuthUser(env, uid, now = Date.now(), { fetchFn = fetch } = {}) {
  const { projectId } = requireConfig(env);
  const accessToken = await getGoogleAccessToken(env, now, { fetchFn });

  let res;
  try {
    res = await fetchFn(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:delete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ localId: uid }),
      }
    );
  } catch (err) {
    throw new FirebaseAuthAdminError("api-error", "Couldn't reach Firebase Authentication.", String(err));
  }
  if (res.ok) return { uid };

  const data = await res.json().catch(() => ({}));
  const message = String(data?.error?.message || "");
  if (message.startsWith("USER_NOT_FOUND")) {
    throw new FirebaseAuthAdminError("user-not-found", "That Firebase Auth user doesn't exist.", message);
  }
  throw new FirebaseAuthAdminError(
    "api-error",
    "Firebase Authentication refused the delete.",
    `${res.status} ${message}`.trim()
  );
}
