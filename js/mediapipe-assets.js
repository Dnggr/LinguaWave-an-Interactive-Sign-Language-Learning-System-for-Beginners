/*
  js/mediapipe-assets.js — where the hand-tracking files come from, and how
  they get cached.
  ─────────────────────────────────────────────────────────────────
  WHY     : the MediaPipe holistic model (~14 MB) and its WASM are ~89% of
            what the camera page downloads. This module
              1. prefers a copy hosted on linguawave.online
                 (assets/mediapipe/…) and falls back to Google/jsDelivr
                 if that copy isn't there;
              2. asks the service worker (/sw.js) to download the model, so
                 the download SURVIVES the learner clicking "Next lesson" or
                 refreshing — the new page just re-attaches to its progress;
              3. stores everything in Cache Storage, so later visits (even
                 offline) are instant.

  FALLBACKS: if there is no service worker (plain http:// on a LAN address,
            some private-browsing modes) the page downloads the model itself
            — it works, but the download restarts if the page is closed.
            NOTE: service workers, Cache Storage AND the webcam all require
            https:// or http://localhost.

  USED BY : js/tracking/mediapipe.js (initMediaPipe),
            js/model-prefetch.js (warm the cache from lesson/learn pages).

  KEEP IN SYNC: CACHE_NAME must match CACHE in /sw.js.
*/

export const CACHE_NAME = 'lw-ml-v1';
const MP_VERSION = '0.10.21';          // same version js/tracking/mediapipe.js imports

// Set to true ONLY after you copied the wasm files to assets/mediapipe/wasm/
// AND confirmed your server compresses .wasm: jsDelivr serves the WASM
// compressed (~2.6 MB); an uncompressed self-hosted copy is ~9.5 MB, which
// is WORSE on slow internet.
export const SELF_HOST_WASM = false;

const CDN_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task';
const LOCAL_MODEL = new URL('../assets/mediapipe/holistic_landmarker.task', import.meta.url).href;
const LOCAL_WASM_BASE = new URL('../assets/mediapipe/wasm', import.meta.url).href;

// Only used for the progress bar if the server doesn't send Content-Length.
const MODEL_APPROX_BYTES = 13_700_000;
const WASM_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];
const SW_ACK_TIMEOUT_MS = 4000;        // no reply from the worker → download in the page instead
const SW_STALL_TIMEOUT_MS = 25000;     // worker went quiet mid-download → download in the page instead

// ── Service worker ────────────────────────────────────────────────

function swSupported() {
  try {
    if (!('serviceWorker' in navigator)) return false;
    return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  } catch (_) { return false; }
}

export function ensureServiceWorker() {
  try {
    if (!swSupported()) return;
    // sw.js lives at the site root so its scope covers /pages/* too.
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url).href).catch(() => {});
  } catch (_) { /* caching is an optimisation — never block the app */ }
}

function withTimeout(promise, ms, msg) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function activeWorker() {
  const reg = await withTimeout(navigator.serviceWorker.ready, SW_ACK_TIMEOUT_MS, 'sw-not-ready');
  if (!reg.active) throw new Error('sw-not-active');
  return reg.active;
}

/** Ask the worker to download `urls` (tried in order) and report progress. Resolves with the URL that worked. */
function modelViaServiceWorker(urls, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const key = urls.join('|');
    let acked = false;
    let ackTimer = null;
    let stallTimer = null;
    let finished = false;

    function finish(fn, value) {
      if (finished) return;
      finished = true;
      clearTimeout(ackTimer); clearTimeout(stallTimer);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      if (signal) signal.removeEventListener('abort', onAbort);
      fn(value);
    }
    const noSW = (why) => Object.assign(new Error(why), { noServiceWorker: true });
    function armStall() {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => finish(reject, noSW('sw-stalled')), SW_STALL_TIMEOUT_MS);
    }
    function onAbort() { finish(reject, Object.assign(new Error('aborted'), { name: 'AbortError' })); }
    function onMessage(e) {
      const m = e.data;
      if (!m || m.type !== 'lw-ml') return;
      if (m.event === 'ack' && m.key === key) { acked = true; clearTimeout(ackTimer); armStall(); }
      else if (m.event === 'progress' && urls.includes(m.url)) {
        armStall();
        if (onProgress) onProgress(m.loaded, Math.max(m.total || MODEL_APPROX_BYTES, m.loaded));
      }
      else if (m.event === 'chain-done' && m.key === key) finish(resolve, m.url);
      else if (m.event === 'chain-error' && m.key === key) finish(reject, new Error(m.message || 'Model download failed'));
    }

    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    try { navigator.serviceWorker.startMessages && navigator.serviceWorker.startMessages(); } catch (_) { /* optional */ }

    activeWorker().then((worker) => {
      ackTimer = setTimeout(() => { if (!acked) finish(reject, noSW('sw-no-ack')); }, SW_ACK_TIMEOUT_MS);
      worker.postMessage({ type: 'lw-ml-warm', kind: 'model', key, urls });
    }).catch((e) => finish(reject, noSW(e.message)));
  });
}

/** Fire-and-forget: have the worker pre-fill the cache with these files. */
async function filesViaServiceWorker(urls) {
  const worker = await activeWorker();
  worker.postMessage({ type: 'lw-ml-warm', kind: 'files', urls });
}

// ── Cache helpers ─────────────────────────────────────────────────

async function openCache() {
  try { return ('caches' in self) ? await caches.open(CACHE_NAME) : null; } catch (_) { return null; }
}

async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return r.ok && !/text\/html/i.test(r.headers.get('content-type') || '');
  } catch (_) { return false; }
}

function contentLength(res) {
  // With gzip/brotli the header is the COMPRESSED size, but we count
  // decoded bytes — so only trust it when there is no content-encoding.
  if (res.headers.get('content-encoding')) return 0;
  return Number(res.headers.get('content-length')) || 0;
}

let resolved = null;
/** Decides which URLs to use. A local copy wins when it exists. */
export async function resolveAssets() {
  if (resolved) return resolved;
  const localModel = await exists(LOCAL_MODEL);
  const localWasm = SELF_HOST_WASM && await exists(`${LOCAL_WASM_BASE}/${WASM_FILES[1]}`);
  resolved = {
    modelUrls: localModel ? [LOCAL_MODEL, CDN_MODEL] : [CDN_MODEL],
    wasmBase: localWasm ? LOCAL_WASM_BASE : CDN_WASM_BASE,
  };
  return resolved;
}

async function readCachedModel(cache) {
  if (!cache) return null;
  for (const u of [LOCAL_MODEL, CDN_MODEL]) {
    const hit = await cache.match(u);
    if (!hit) continue;
    const buf = await hit.arrayBuffer();
    if (buf.byteLength > 1_000_000) return new Uint8Array(buf);   // sanity check: not a stub/error page
    await cache.delete(u).catch(() => {});
  }
  return null;
}

/** True when the model is already in the browser cache (no network needed). */
export async function isModelCached() {
  const cache = await openCache();
  if (!cache) return false;
  for (const u of [LOCAL_MODEL, CDN_MODEL]) if (await cache.match(u)) return true;
  return false;
}

// ── Model download inside the page (fallback path) ────────────────

async function downloadInPage(url, cache, onProgress, signal, lowPriority) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal, ...(lowPriority ? { priority: 'low' } : {}) });
  if (!res.ok || !res.body) throw new Error(`Model download failed (HTTP ${res.status})`);
  const declared = contentLength(res);
  const total = declared || MODEL_APPROX_BYTES;

  // cache.put reads a clone in parallel, so the file is only downloaded once.
  const putP = cache ? cache.put(url, res.clone()).catch(() => {}) : Promise.resolve();

  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress) onProgress(loaded, Math.max(total, loaded));
  }
  if (declared && loaded !== declared) {
    if (cache) await cache.delete(url).catch(() => {});
    throw new Error('Model download was cut off — check your connection and retry.');
  }
  await putP;

  const bytes = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) { bytes.set(c, o); o += c.length; }
  return bytes;
}

/**
 * Returns the model as a Uint8Array. Order: browser cache (instant) →
 * service worker download (survives navigation) → download in this page.
 * onProgress(loaded, total) reports bytes.
 */
export async function getModelBytes({ onProgress, signal, lowPriority = false } = {}) {
  const cache = await openCache();
  const cached = await readCachedModel(cache);
  if (cached) { if (onProgress) onProgress(cached.length, cached.length); return cached; }

  const { modelUrls } = await resolveAssets();

  if (cache && swSupported()) {
    try {
      await modelViaServiceWorker(modelUrls, { onProgress, signal });
      const fromCache = await readCachedModel(cache);
      if (fromCache) { if (onProgress) onProgress(fromCache.length, fromCache.length); return fromCache; }
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      if (!e || !e.noServiceWorker) throw e;       // the worker tried every URL and they all failed
      // otherwise: no usable worker → fall through to a download in this page
    }
  }

  let lastErr;
  for (const url of modelUrls) {
    try { return await downloadInPage(url, cache, onProgress, signal, lowPriority); }
    catch (e) { lastErr = e; if (signal && signal.aborted) throw e; }
  }
  throw lastErr || new Error('Model download failed');
}

// ── WASM warm-up (the library fetches these itself; we only pre-fill) ──

export async function ensureWasmCached({ lowPriority = false } = {}) {
  const { wasmBase } = await resolveAssets();
  const urls = WASM_FILES.map((f) => `${wasmBase}/${f}`);

  if (swSupported() && ('caches' in self)) {
    try { await filesViaServiceWorker(urls); return; } catch (_) { /* fall through */ }
  }
  const cache = await openCache();
  await Promise.all(urls.map(async (url) => {
    if (cache && await cache.match(url)) return;
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', ...(lowPriority ? { priority: 'low' } : {}) });
    if (cache && res.ok) await cache.put(url, res);
    // no Cache Storage: the plain fetch still fills the browser's HTTP cache
  }));
}

// ── Public entry points ───────────────────────────────────────────

/**
 * Everything initMediaPipe() needs: where the WASM is, and the model bytes.
 * The WASM download starts IMMEDIATELY and runs in parallel with the model
 * (it used to wait until the model finished, which looked like a hang at 100%).
 */
export async function prepareAssets({ onProgress, signal } = {}) {
  ensureServiceWorker();
  const assets = await resolveAssets();
  const wasmP = ensureWasmCached().catch(() => {});      // best effort — the library fetches it itself otherwise
  const modelBytes = await getModelBytes({ onProgress, signal });
  await wasmP;
  return { wasmBase: assets.wasmBase, modelBytes };
}

/** Quietly fills the cache ahead of time (used by js/model-prefetch.js). */
export async function warmAssets() {
  ensureServiceWorker();
  if (swSupported() && ('caches' in self)) {
    if (!(await isModelCached())) {
      const { modelUrls } = await resolveAssets();
      const worker = await activeWorker();
      worker.postMessage({ type: 'lw-ml-warm', kind: 'model', key: modelUrls.join('|'), urls: modelUrls });
    }
    await ensureWasmCached({ lowPriority: true });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) { /* optional */ }
    return;
  }
  // No service worker: pre-fill from this page (stops if the page is closed).
  if (!(await isModelCached())) await getModelBytes({ lowPriority: true });
  await ensureWasmCached({ lowPriority: true });
}