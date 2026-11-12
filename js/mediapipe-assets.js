
export const CACHE_NAME = 'lw-ml-v1';
const MP_VERSION = '0.10.21';

export const SELF_HOST_WASM = false;

const CDN_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task';
const LOCAL_MODEL = new URL('../assets/mediapipe/holistic_landmarker.task', import.meta.url).href;
const LOCAL_WASM_BASE = new URL('../assets/mediapipe/wasm', import.meta.url).href;

const MODEL_APPROX_BYTES = 13_700_000;
const WASM_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];
const SW_ACK_TIMEOUT_MS = 4000;
const SW_STALL_TIMEOUT_MS = 25000;


function swSupported() {
  try {
    if (!('serviceWorker' in navigator)) return false;
    return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  } catch (_) { return false; }
}

export function ensureServiceWorker() {
  try {
    if (!swSupported()) return;
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url).href).catch(() => {});
  } catch (_) {  }
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
    try { navigator.serviceWorker.startMessages && navigator.serviceWorker.startMessages(); } catch (_) {  }

    activeWorker().then((worker) => {
      ackTimer = setTimeout(() => { if (!acked) finish(reject, noSW('sw-no-ack')); }, SW_ACK_TIMEOUT_MS);
      worker.postMessage({ type: 'lw-ml-warm', kind: 'model', key, urls });
    }).catch((e) => finish(reject, noSW(e.message)));
  });
}

async function filesViaServiceWorker(urls) {
  const worker = await activeWorker();
  worker.postMessage({ type: 'lw-ml-warm', kind: 'files', urls });
}


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
  if (res.headers.get('content-encoding')) return 0;
  return Number(res.headers.get('content-length')) || 0;
}

let resolved = null;
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
    if (buf.byteLength > 1_000_000) return new Uint8Array(buf);
    await cache.delete(u).catch(() => {});
  }
  return null;
}

export async function isModelCached() {
  const cache = await openCache();
  if (!cache) return false;
  for (const u of [LOCAL_MODEL, CDN_MODEL]) if (await cache.match(u)) return true;
  return false;
}


async function downloadInPage(url, cache, onProgress, signal, lowPriority) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal, ...(lowPriority ? { priority: 'low' } : {}) });
  if (!res.ok || !res.body) throw new Error(`Model download failed (HTTP ${res.status})`);
  const declared = contentLength(res);
  const total = declared || MODEL_APPROX_BYTES;

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
      if (!e || !e.noServiceWorker) throw e;
    }
  }

  let lastErr;
  for (const url of modelUrls) {
    try { return await downloadInPage(url, cache, onProgress, signal, lowPriority); }
    catch (e) { lastErr = e; if (signal && signal.aborted) throw e; }
  }
  throw lastErr || new Error('Model download failed');
}


export async function ensureWasmCached({ lowPriority = false } = {}) {
  const { wasmBase } = await resolveAssets();
  const urls = WASM_FILES.map((f) => `${wasmBase}/${f}`);

  if (swSupported() && ('caches' in self)) {
    try { await filesViaServiceWorker(urls); return; } catch (_) {  }
  }
  const cache = await openCache();
  await Promise.all(urls.map(async (url) => {
    if (cache && await cache.match(url)) return;
    const res = await fetch(url, { mode: 'cors', credentials: 'omit', ...(lowPriority ? { priority: 'low' } : {}) });
    if (cache && res.ok) await cache.put(url, res);
  }));
}


export async function prepareAssets({ onProgress, signal } = {}) {
  ensureServiceWorker();
  const assets = await resolveAssets();
  const wasmP = ensureWasmCached().catch(() => {});
  const modelBytes = await getModelBytes({ onProgress, signal });
  await wasmP;
  return { wasmBase: assets.wasmBase, modelBytes };
}

export async function warmAssets() {
  ensureServiceWorker();
  if (swSupported() && ('caches' in self)) {
    if (!(await isModelCached())) {
      const { modelUrls } = await resolveAssets();
      const worker = await activeWorker();
      worker.postMessage({ type: 'lw-ml-warm', kind: 'model', key: modelUrls.join('|'), urls: modelUrls });
    }
    await ensureWasmCached({ lowPriority: true });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {  }
    return;
  }
  if (!(await isModelCached())) await getModelBytes({ lowPriority: true });
  await ensureWasmCached({ lowPriority: true });
}
