// Run: cd worker && npm test   (Node 20+, no dependencies, no network)
import test from "node:test";
import assert from "node:assert/strict";
import worker, { presignUrl, verifyFirebaseToken, sniffVideo, parseRange, MAX_VIDEO_BYTES } from "../src/index.js";

const b64u = (b) => Buffer.from(b).toString("base64url");

/* ── SigV4: AWS's own published presigned-URL example ──────────── */
test("presignUrl matches the AWS documentation test vector", async () => {
  const url = await presignUrl({
    method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt", region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    expires: 86400, amzDate: "20130524T000000Z",
  });
  assert.ok(url.endsWith("X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"), url);
});

/* ── Firebase token verification with a locally generated key ───── */
const PROJECT = "linguawave-63911";
const ADMIN = "linguawave.project@gmail.com";
const kp = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"]
);
const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
const getJwks = async () => ({ keys: [jwk] });
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);

async function makeToken(over = {}, { kid = "k1", key = kp.privateKey } = {}) {
  const s = Math.floor(NOW / 1000);
  const claims = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: "uid-1",
    iat: s - 10, exp: s + 3000, email: ADMIN, email_verified: true, ...over,
  };
  const head = b64u(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const body = b64u(JSON.stringify(claims));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}
const verify = (t) => verifyFirebaseToken(t, PROJECT, { getJwks, now: NOW });

test("accepts a good token", async () => assert.equal((await verify(await makeToken())).sub, "uid-1"));
test("rejects expired, wrong aud/iss, bad signature, unknown kid", async () => {
  const s = Math.floor(NOW / 1000);
  await assert.rejects(verify(await makeToken({ exp: s - 600 })), { status: 401 });
  await assert.rejects(verify(await makeToken({ aud: "other" })), { status: 401 });
  await assert.rejects(verify(await makeToken({ iss: "https://securetoken.google.com/other" })), { status: 401 });
  await assert.rejects(verify(await makeToken({}, { kid: "nope" })), { status: 401 });
  const other = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
  await assert.rejects(verify(await makeToken({}, { key: other.privateKey })), { status: 401 });
  await assert.rejects(verify("not.a.jwt"), { status: 401 });
});

/* ── routes, with a fake R2 bucket ─────────────────────────────── */
const MP4 = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]); // ....ftypisom
const WEBM = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
function fakeBucket(objects = {}) {
  return {
    objects,
    async head(k) { const o = objects[k]; return o ? { size: o.size ?? o.bytes.length } : null; },
    async get(k) { const o = objects[k]; return o ? { arrayBuffer: async () => o.bytes.buffer.slice(0, 16) } : null; },
    async delete(k) { delete objects[k]; },
  };
}
const env = (bucket) => ({
  MEDIA: bucket, FIREBASE_PROJECT_ID: PROJECT, ADMIN_EMAIL: ADMIN,
  ALLOWED_ORIGINS: "https://app.example.com", PUBLIC_MEDIA_BASE: "https://media.example.com/",
  R2_ACCOUNT_ID: "acct", R2_BUCKET_NAME: "lw", R2_ACCESS_KEY_ID: "AK", R2_SECRET_ACCESS_KEY: "SK",
});
async function call(path, body, { token, bucket = fakeBucket(), method = "POST", origin = "https://app.example.com" } = {}) {
  const headers = { "Content-Type": "application/json", Origin: origin };
  if (token !== null) headers.Authorization = `Bearer ${token ?? (await makeToken())}`;
  const res = await worker.fetch(new Request(`https://w.example${path}`, { method, headers, body: JSON.stringify(body) }),
    env(bucket), {}, { getJwks, now: NOW });
  return { res, data: await res.json().catch(() => null), bucket };
}

test("no token -> 401; learner token -> 403; unverified admin email -> 403", async () => {
  assert.equal((await call("/v1/upload-url", {}, { token: null })).res.status, 401);
  assert.equal((await call("/v1/upload-url", {}, { token: await makeToken({ email: "learner@x.com" }) })).res.status, 403);
  assert.equal((await call("/v1/upload-url", {}, { token: await makeToken({ email_verified: false }) })).res.status, 403);
});
test("upload-url: valid request returns a presigned PUT + public URL; Worker picks the key", async () => {
  const { res, data } = await call("/v1/upload-url", { signId: "hello", contentType: "video/mp4", size: 1000 });
  assert.equal(res.status, 200);
  assert.match(data.key, /^videos\/admin\/hello\/\d{10,16}\.mp4$/);
  assert.equal(data.publicUrl, `https://media.example.com/${data.key}`);
  assert.match(data.uploadUrl, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/lw\/videos\/admin\/hello\//);
  assert.match(data.uploadUrl, /X-Amz-SignedHeaders=content-type%3Bhost/);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://app.example.com");
});
test("upload-url rejects bad id, type, size", async () => {
  const bad = (b) => call("/v1/upload-url", b).then((r) => r.res.status);
  assert.equal(await bad({ signId: "../x", contentType: "video/mp4", size: 5 }), 400);
  assert.equal(await bad({ signId: "ok", contentType: "application/pdf", size: 5 }), 415);
  assert.equal(await bad({ signId: "ok", contentType: "video/webm", size: 5 }), 415);
  assert.equal(await bad({ signId: "ok", contentType: "video/mp4", size: MAX_VIDEO_BYTES + 1 }), 413);
  assert.equal(await bad({ signId: "ok", contentType: "video/mp4", size: 0 }), 400);
});
test("finalize: real MP4 passes; WebM refused; fake, oversize and wrong-extension files are deleted", async () => {
  const k = "videos/admin/hello/1790000000000";
  const bucket = fakeBucket({
    [`${k}.mp4`]: { bytes: MP4 }, [`${k}1.webm`]: { bytes: WEBM },
    "videos/admin/fake/1790000000000.mp4": { bytes: Uint8Array.from(Buffer.from("<html>not a video</html>")) },
    "videos/admin/big/1790000000000.mp4": { bytes: MP4, size: MAX_VIDEO_BYTES + 1 },
    "videos/admin/swap/1790000000000.mp4": { bytes: WEBM },
  });
  assert.equal((await call("/v1/finalize", { key: `${k}.mp4` }, { bucket })).res.status, 200);
  // WebM is intentionally not accepted yet (learner players hard-code video/mp4).
  assert.equal((await call("/v1/finalize", { key: `${k}1.webm` }, { bucket })).res.status, 400);
  for (const [key, status] of [["videos/admin/fake/1790000000000.mp4", 415], ["videos/admin/big/1790000000000.mp4", 413], ["videos/admin/swap/1790000000000.mp4", 415]]) {
    assert.equal((await call("/v1/finalize", { key }, { bucket })).res.status, status, key);
    assert.equal(bucket.objects[key], undefined, `${key} should be deleted`);
  }
  assert.equal((await call("/v1/finalize", { key: "videos/admin/none/1790000000000.mp4" }, { bucket })).res.status, 404);
});
test("keys outside videos/admin/<signId>/ are refused (no path tricks)", async () => {
  const bucket = fakeBucket({ "videos/basic/x.mp4": { bytes: MP4 } });
  for (const key of ["videos/basic/x.mp4", "videos/admin/../basic/x.mp4", "videos/admin/a/b/1790000000000.mp4", "../etc", 5]) {
    assert.equal((await call("/v1/delete", { key }, { bucket })).res.status, 400, String(key));
  }
  assert.ok(bucket.objects["videos/basic/x.mp4"]);
});
test("delete removes an admin upload; wrong origin gets no CORS header", async () => {
  const key = "videos/admin/hello/1790000000000.mp4";
  const bucket = fakeBucket({ [key]: { bytes: MP4 } });
  const { res } = await call("/v1/delete", { key }, { bucket, origin: "https://evil.example" });
  assert.equal(res.status, 200);
  assert.equal(bucket.objects[key], undefined);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});
test("sniffVideo", () => {
  assert.equal(sniffVideo(MP4), "video/mp4");
  assert.equal(sniffVideo(WEBM), "video/webm");
  assert.equal(sniffVideo(Uint8Array.from([1, 2, 3])), "");
});

/* ── public media: GET /media/<key> ────────────────────────────── */
const MKEY = "videos/admin/nono/1790923020324.mp4";
const BYTES = Uint8Array.from({ length: 100 }, (_, i) => i);
function mediaBucket() {
  return {
    async head(k) { return k === MKEY ? { size: BYTES.length, httpEtag: '"abc"' } : null; },
    async get(k, opts) {
      if (k !== MKEY) return null;
      const r = opts?.range;
      const part = r ? BYTES.slice(r.offset, r.offset + r.length) : BYTES;
      return { body: part };
    },
  };
}
const getMedia = (path, headers = {}, method = "GET") =>
  worker.fetch(new Request(`https://w.example${path}`, { method, headers }), env(mediaBucket()), {}, {});

test("media: parseRange", () => {
  assert.equal(parseRange(null, 100), null);
  assert.deepEqual(parseRange("bytes=0-", 100), { offset: 0, length: 100 });
  assert.deepEqual(parseRange("bytes=10-19", 100), { offset: 10, length: 10 });
  assert.deepEqual(parseRange("bytes=90-500", 100), { offset: 90, length: 10 });   // end clamped
  assert.deepEqual(parseRange("bytes=-5", 100), { offset: 95, length: 5 });        // suffix
  assert.equal(parseRange("bytes=100-", 100), "invalid");
  assert.equal(parseRange("bytes=20-10", 100), "invalid");
  assert.equal(parseRange("bytes=0-1,5-6", 100), null);                            // multi-range: serve whole
  assert.equal(parseRange("garbage", 100), null);
});

test("media: full GET is public (no token), video/mp4, immutable, CORS *", async () => {
  const res = await getMedia(`/media/${MKEY}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "video/mp4");
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(res.headers.get("content-length"), "100");
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.match(res.headers.get("cache-control"), /immutable/);
  assert.equal(new Uint8Array(await res.arrayBuffer()).length, 100);
});

test("media: Range GET returns 206 with the right slice and Content-Range", async () => {
  const res = await getMedia(`/media/${MKEY}`, { Range: "bytes=10-19" });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-range"), "bytes 10-19/100");
  assert.equal(res.headers.get("content-length"), "10");
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
});

test("media: unsatisfiable range -> 416; HEAD -> headers only; missing/odd keys -> 404", async () => {
  const bad = await getMedia(`/media/${MKEY}`, { Range: "bytes=500-" });
  assert.equal(bad.status, 416);
  assert.equal(bad.headers.get("content-range"), "bytes */100");
  const head = await getMedia(`/media/${MKEY}`, {}, "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "100");
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await getMedia("/media/videos/admin/nono/1790923020999.mp4")).status, 404);   // not in bucket
  assert.equal((await getMedia("/media/secrets.txt")).status, 404);                           // not a valid key
  assert.equal((await getMedia("/media/videos/admin/../../x/1790923020324.mp4")).status, 404); // traversal
  assert.equal((await getMedia("/media/%E0%A4%A")).status, 404);                              // bad escape
});

test("media: GET on the POST routes still refused", async () => {
  const res = await worker.fetch(new Request("https://w.example/v1/upload-url", { method: "GET" }), env(mediaBucket()), {}, {});
  assert.equal(res.status, 405);
});
