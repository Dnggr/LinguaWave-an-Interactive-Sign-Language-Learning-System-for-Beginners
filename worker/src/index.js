/**
 * LinguaWave media Worker — trusted server-side layer in front of Cloudflare R2
 * ─────────────────────────────────────────────────────────────────
 * WHY : the site is static, so the browser is untrusted. Hiding the admin UI
 *       or checking "isAdmin" in front-end JS is NOT a security boundary. This
 *       Worker is where "who is calling, and are they the admin?" is decided,
 *       and it is the only place that ever holds R2 credentials.
 *
 * FLOW (see LinguaWave_Object_Storage_Integration_Plan.md §5–7, §13):
 *   1. Admin browser gets a Firebase ID token (auth.currentUser.getIdToken()).
 *   2. POST /v1/upload-url  -> Worker verifies the token + admin email, picks the
 *                              object key itself, returns a SHORT-LIVED presigned
 *                              PUT URL. The video bytes never pass through here.
 *   3. Browser PUTs the file straight to R2 with that URL.
 *   4. POST /v1/finalize    -> Worker re-checks the object it finds in R2 (exists,
 *                              size, really an MP4). Bad objects are deleted.
 *   5. Browser saves { videoUrl, videoKey } on the Firestore `signs` document.
 *   6. Learners play the video from GET /media/<key> on THIS Worker (public, Range-aware).
 *   6. POST /v1/delete      -> removes an admin-uploaded object (replace / delete lesson).
 *
 * LEARNERS never call this Worker: they read the lesson from Firestore and play
 * videoUrl straight from the public R2 media domain.
 *
 * BINDINGS / CONFIG (worker/wrangler.toml + `wrangler secret put`):
 *   MEDIA                  R2 bucket binding (used for finalize/delete — no keys)
 *   R2_ACCOUNT_ID          var     \
 *   R2_BUCKET_NAME         var      } only needed to build presigned URLs
 *   R2_ACCESS_KEY_ID       secret   } (the S3-compatible API token for THIS bucket,
 *   R2_SECRET_ACCESS_KEY   secret  /  Object Read & Write, never put in front-end code)
 *   FIREBASE_PROJECT_ID    var     e.g. linguawave-63911
 *   ADMIN_EMAIL            var     KEEP IN SYNC with firestore.rules, js/admin-auth.js,
 *                                  js/role-guard.js, functions/index.js, index.html
 *   ALLOWED_ORIGINS        var     comma list of site origins allowed to call this API
 *   PUBLIC_MEDIA_BASE      var     public base URL of the bucket, no trailing slash
 *
 * NOT CHECKED: ID-token revocation (a token stays valid up to 1 hour after the
 * admin account is disabled). Fine for one admin; use Firebase Admin SDK
 * checkRevoked / custom claims if that ever matters.
 * ─────────────────────────────────────────────────────────────────
 */

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // keep in sync with js/admin-media.js
export const UPLOAD_URL_TTL_SECONDS = 600;
export const KEY_PREFIX = "videos/admin/";

const SIGN_ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const KEY_RE = /^videos\/admin\/[a-z0-9][a-z0-9_-]{0,39}\/\d{10,16}\.(mp4)$/;
// MP4 only for now: the learner players hard-code <source type="video/mp4"> (js/lesson.js,
// js/mastery-quiz.js). To allow WebM, add it to the two maps + KEY_RE below, to VIDEO_TYPES in
// js/admin-media.js and the key pattern in firestore.rules, AND make those players set type per URL.
const TYPE_BY_EXT = { mp4: "video/mp4" };
const EXT_BY_TYPE = { "video/mp4": "mp4" };

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/* ── small helpers ──────────────────────────────────────────────── */
const enc = new TextEncoder();

function b64urlToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}
function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(str) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(str)));
}
async function hmac(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
// RFC 3986 encoding as AWS SigV4 wants it.
function awsEncode(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ── Firebase ID-token verification ─────────────────────────────── */
async function fetchJwks() {
  // Google rotates these keys; Cloudflare caches the response for an hour.
  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new HttpError(503, "Couldn't load Firebase signing keys.");
  return res.json();
}

/**
 * Verifies a Firebase Auth ID token (RS256) the way Google documents it.
 * @returns {Promise<object>} the token's claims
 * @throws  {HttpError} 401 for anything wrong with the token
 */
export async function verifyFirebaseToken(token, projectId, { getJwks = fetchJwks, now = Date.now() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new HttpError(401, "Malformed token.");
  let header, claims;
  try {
    header = b64urlToJson(parts[0]);
    claims = b64urlToJson(parts[1]);
  } catch {
    throw new HttpError(401, "Malformed token.");
  }
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "Unsupported token.");

  const { keys = [] } = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Unknown signing key.");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(parts[2]),
    enc.encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new HttpError(401, "Bad token signature.");

  const nowSec = Math.floor(now / 1000);
  const skew = 60;
  if (typeof claims.exp !== "number" || claims.exp + skew < nowSec) throw new HttpError(401, "Token expired.");
  if (typeof claims.iat !== "number" || claims.iat - skew > nowSec) throw new HttpError(401, "Token not valid yet.");
  if (claims.aud !== projectId) throw new HttpError(401, "Wrong token audience.");
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new HttpError(401, "Wrong token issuer.");
  if (typeof claims.sub !== "string" || !claims.sub) throw new HttpError(401, "Token has no subject.");
  return claims;
}

/** Valid Firebase token + the one admin account (same rule as firestore.rules isAdmin()). */
async function requireAdmin(request, env, deps) {
  const m = /^Bearer (.+)$/.exec(request.headers.get("Authorization") || "");
  if (!m) throw new HttpError(401, "Sign in required.");
  const claims = await verifyFirebaseToken(m[1], env.FIREBASE_PROJECT_ID, deps);
  const email = String(claims.email || "").toLowerCase();
  if (!email || email !== String(env.ADMIN_EMAIL).toLowerCase() || claims.email_verified !== true) {
    throw new HttpError(403, "Admin only.");
  }
  return claims;
}

/* ── SigV4 presigned PUT (R2 S3-compatible API) ─────────────────── */
/**
 * Builds a presigned URL. Generic on purpose so it can be checked against AWS's
 * published test vector (see worker/test/sigv4.test.mjs).
 */
export async function presignUrl({
  method, host, path, region, service = "s3",
  accessKeyId, secretAccessKey, expires, amzDate,
  signedHeaders = {}, // lowercase header name -> exact value the client must send (host is added)
}) {
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/${service}/aws4_request`;
  const headers = { ...signedHeaders, host };
  const names = Object.keys(headers).sort();
  const signedList = names.join(";");

  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signedList,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${awsEncode(k)}=${awsEncode(query[k])}`)
    .join("&");
  const canonicalHeaders = names.map((n) => `${n}:${String(headers[n]).trim()}\n`).join("");
  const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedList, "UNSIGNED-PAYLOAD"].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  let k = await hmac(enc.encode("AWS4" + secretAccessKey), date);
  k = await hmac(k, region);
  k = await hmac(k, service);
  k = await hmac(k, "aws4_request");
  const signature = hex(await hmac(k, stringToSign));
  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function amzNow(now = new Date()) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260101T120000Z
}

/* ── video sniffing (don't trust the file name or Content-Type) ─── */
export function sniffVideo(bytes) {
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") return "video/mp4";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm"; // EBML header (WebM / Matroska)
  }
  return "";
}

/* ── HTTP plumbing ──────────────────────────────────────────────── */
function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const h = { Vary: "Origin" };
  if (origin && allowedOrigins(env).includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(request, env) },
  });
}
async function readJson(request) {
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body;
  } catch { /* fall through */ }
  throw new HttpError(400, "Send a JSON body.");
}

/* ── routes ─────────────────────────────────────────────────────── */
async function uploadUrl(request, env, now) {
  const { signId, contentType, size } = await readJson(request);
  if (typeof signId !== "string" || !SIGN_ID_RE.test(signId)) throw new HttpError(400, "Invalid Sign ID.");
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) throw new HttpError(415, "Only MP4 videos are allowed.");
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, "Missing file size.");
  if (size > MAX_VIDEO_BYTES) throw new HttpError(413, `Video is larger than ${MAX_VIDEO_BYTES / 1048576} MB.`);

  // The Worker — not the browser — chooses the object key, so nothing outside
  // videos/admin/<signId>/ can be written, and a replacement never overwrites
  // the previous file (a unique timestamp is part of the key).
  const key = `${KEY_PREFIX}${signId}/${now.getTime()}.${ext}`;
  const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${env.R2_BUCKET_NAME}/${key.split("/").map(awsEncode).join("/")}`;
  const url = await presignUrl({
    method: "PUT", host, path, region: "auto",
    accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    expires: UPLOAD_URL_TTL_SECONDS, amzDate: amzNow(now),
    signedHeaders: { "content-type": contentType },
  });
  return {
    key,
    uploadUrl: url,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    publicUrl: `${env.PUBLIC_MEDIA_BASE.replace(/\/$/, "")}/${key}`,
  };
}

function checkKey(key) {
  if (typeof key !== "string" || !KEY_RE.test(key)) throw new HttpError(400, "Invalid object key.");
  return key;
}

async function finalize(request, env) {
  const key = checkKey((await readJson(request)).key);
  const head = await env.MEDIA.head(key);
  if (!head) throw new HttpError(404, "Upload not found. It may have expired or failed.");

  const reject = async (status, msg) => {
    await env.MEDIA.delete(key); // never leave a rejected file in the bucket
    throw new HttpError(status, msg);
  };
  if (head.size <= 0) await reject(400, "The uploaded file is empty.");
  if (head.size > MAX_VIDEO_BYTES) await reject(413, `Video is larger than ${MAX_VIDEO_BYTES / 1048576} MB.`);

  const part = await env.MEDIA.get(key, { range: { offset: 0, length: 16 } });
  const sniffed = sniffVideo(new Uint8Array(await part.arrayBuffer()));
  const extType = TYPE_BY_EXT[key.split(".").pop()];
  if (!sniffed || sniffed !== extType) await reject(415, "That file isn't a valid MP4 video.");

  return {
    key,
    size: head.size,
    contentType: sniffed,
    publicUrl: `${env.PUBLIC_MEDIA_BASE.replace(/\/$/, "")}/${key}`,
  };
}

async function remove(request, env) {
  const key = checkKey((await readJson(request)).key);
  await env.MEDIA.delete(key); // R2 delete is a no-op for a missing key
  return { deleted: key };
}

/* ── public media (GET /media/<key>) ───────────────────────────────
 * Serves the admin videos to learners from this Worker's own hostname,
 * instead of the bucket's *.r2.dev URL (development-only per Cloudflare,
 * and unreachable on some networks' DNS). Public on purpose: no token,
 * no cookies, so Access-Control-Allow-Origin "*" is safe. Only keys that
 * match KEY_RE are served, so nothing else in the bucket is reachable.
 * Supports Range (browsers need it to start/seek <video> quickly). The
 * key contains a timestamp and is never overwritten, so it is immutable. */
const MEDIA_PREFIX = "/media/";

function mediaHeaders(extra = {}) {
  return {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    ...extra,
  };
}

// Parses a single "bytes=a-b" / "bytes=a-" / "bytes=-n" range against `size`.
// Returns {offset, length}, null when there is no usable Range header (serve
// everything), or "invalid" when it cannot be satisfied (416).
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null; // malformed or multi-range: ignore, send whole file
  let start;
  let end;
  if (m[1] === "") {                       // suffix: last n bytes
    const n = Number(m[2]);
    if (n === 0) return "invalid";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { offset: start, length: end - start + 1 };
}

async function serveMedia(request, env) {
  const method = request.method;
  const url = new URL(request.url);
  let key;
  try { key = decodeURIComponent(url.pathname.slice(MEDIA_PREFIX.length)); } catch { key = ""; }
  if (!KEY_RE.test(key)) return new Response("Not found.", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });

  const head = await env.MEDIA.head(key);
  if (!head) return new Response("Not found.", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  const size = head.size;
  const etag = head.httpEtag ? { ETag: head.httpEtag } : {};

  const range = parseRange(request.headers.get("Range"), size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: mediaHeaders({ "Content-Range": `bytes */${size}` }) });
  }
  if (method === "HEAD") {
    return new Response(null, { status: 200, headers: mediaHeaders({ "Content-Length": String(size), ...etag }) });
  }
  const obj = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!obj) return new Response("Not found.", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  if (range) {
    return new Response(obj.body, {
      status: 206,
      headers: mediaHeaders({
        "Content-Range": `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`,
        "Content-Length": String(range.length),
        ...etag,
      }),
    });
  }
  return new Response(obj.body, { status: 200, headers: mediaHeaders({ "Content-Length": String(size), ...etag }) });
}

/* ── entry ──────────────────────────────────────────────────────── */
export default {
  async fetch(request, env, _ctx, deps = {}) {
    const url = new URL(request.url);
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith(MEDIA_PREFIX)) {
      try {
        return await serveMedia(request, env);
      } catch (err) {
        console.error("[media-worker] serve", err);
        return new Response("Something went wrong.", { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    try {
      if (request.method !== "POST") throw new HttpError(405, "Use POST.");
      const routes = { "/v1/upload-url": uploadUrl, "/v1/finalize": finalize, "/v1/delete": remove };
      const handler = routes[url.pathname];
      if (!handler) throw new HttpError(404, "Not found.");
      const claims = await requireAdmin(request, env, deps); // every route is admin-only
      const data = await handler(request, env, deps.now ? new Date(deps.now) : new Date());
      console.log(JSON.stringify({ route: url.pathname, uid: claims.sub, key: data.key || data.deleted }));
      return json(data, 200, request, env);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status, request, env);
      console.error("[media-worker]", err);
      return json({ error: "Something went wrong." }, 500, request, env);
    }
  },
};
