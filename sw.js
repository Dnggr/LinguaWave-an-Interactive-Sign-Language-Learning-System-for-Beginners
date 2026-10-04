/*
  sw.js — service worker (must stay at the SITE ROOT: /sw.js)
  ─────────────────────────────────────────────────────────────────
  Two jobs, both only for the big, version-pinned camera files:

  1. CACHE-FIRST for the MediaPipe .task model, MediaPipe WASM + library and
     TensorFlow.js — after the first download they load from the device
     (also offline).

  2. DOWNLOADS THE MODEL ON BEHALF OF THE PAGE. A page's own fetch() dies the
     moment the learner clicks "Next lesson" or refreshes, which used to restart
     the 13 MB download from 0%. This worker lives on across page loads, so the
     download keeps going and the next page just re-attaches to its progress.

  It deliberately does NOT touch HTML, your JS/CSS, Firebase/Firestore, the
  lesson videos or your own asl_*_model files — those behave exactly as before
  (so deployments still show up and a retrained model can never be
  half-old/half-new).

  KEEP IN SYNC: CACHE must match CACHE_NAME in js/mediapipe-assets.js.
  Changing the model / MP_VERSION? Bump both to lw-ml-v2.
*/
const CACHE = 'lw-ml-v1';
const MODEL_APPROX_BYTES = 13_700_000;      // progress fallback when Content-Length is unknown

const CACHEABLE = [
  /\.task(\?|$)/,                                   // holistic_landmarker.task (CDN or self-hosted)
  /\/vision_wasm_(nosimd_)?internal\.(js|wasm)(\?|$)/,
  /\/npm\/@mediapipe\/tasks-vision@[^/]+\//,
  /\/npm\/@tensorflow\/tfjs@[^/]+\//,
];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop caches from older versions of this worker.
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('lw-ml-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ── Cache-first for the heavy files ───────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (!CACHEABLE.some((re) => re.test(req.url))) return;
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req.url);
  if (hit) return hit;

  // The worker is already downloading this exact file (e.g. the WASM pre-fill):
  // wait for it instead of downloading a second copy.
  const running = inflight.get(req.url);
  if (running) {
    await running.promise;
    const again = await cache.match(req.url);
    if (again) return again;
  }

  let res;
  try {
    // Re-request in CORS mode so the response is cacheable (a plain <script>
    // request to a CDN would otherwise be an un-cacheable "opaque" response).
    res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
  } catch (_) {
    res = await fetch(req);                         // fall back to the original request
  }
  if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
    cache.put(req.url, res.clone()).catch(() => {});
  }
  return res;
}

// ── Downloads that outlive the page ───────────────────────────────

const inflight = new Map();     // url -> { loaded, total, promise }

async function broadcast(msg) {
  const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const c of all) c.postMessage(msg);
}

/** Starts (or joins) the download of one URL into the cache. Never rejects: resolves { ok, message }. */
function download(url) {
  const existing = inflight.get(url);
  if (existing) return existing;

  const st = { url, loaded: 0, total: 0, promise: null };
  inflight.set(url, st);

  st.promise = (async () => {
    try {
      const cache = await caches.open(CACHE);
      if (await cache.match(url)) return { ok: true };

      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok || !res.body) throw new Error('Download failed (HTTP ' + res.status + ')');

      // With gzip/brotli Content-Length is the COMPRESSED size while we count
      // decoded bytes — only trust it when there is no content-encoding.
      const declared = res.headers.get('content-encoding') ? 0 : (Number(res.headers.get('content-length')) || 0);
      st.total = declared || (/\.task(\?|$)/.test(url) ? MODEL_APPROX_BYTES : 0);

      const reader = res.body.getReader();
      const chunks = [];
      let lastSent = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        st.loaded += value.length;
        const now = Date.now();
        if (now - lastSent > 120) {
          lastSent = now;
          broadcast({ type: 'lw-ml', event: 'progress', url, loaded: st.loaded, total: Math.max(st.total, st.loaded) });
        }
      }
      if (declared && st.loaded !== declared) throw new Error('Download was cut off \u2014 check your connection and retry.');

      await cache.put(url, new Response(new Blob(chunks), {
        status: 200,
        headers: { 'content-type': res.headers.get('content-type') || 'application/octet-stream' },
      }));
      broadcast({ type: 'lw-ml', event: 'progress', url, loaded: st.loaded, total: st.loaded });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e && e.message) || 'Download failed' };
    } finally {
      inflight.delete(url);
    }
  })();
  return st;
}

/** Tries each URL in order until one is in the cache. */
async function downloadChain(urls) {
  let lastMsg = 'Download failed';
  for (const u of urls) {
    const r = await download(u).promise;
    if (r.ok) return u;
    lastMsg = r.message || lastMsg;
  }
  throw new Error(lastMsg);
}

self.addEventListener('message', (event) => {
  const d = event.data;
  if (!d || d.type !== 'lw-ml-warm' || !Array.isArray(d.urls) || !d.urls.length) return;
  const src = event.source;
  const reply = (m) => { try { if (src) src.postMessage(m); } catch (_) { /* client gone */ } };

  if (d.kind === 'files') {                       // quiet pre-fill (WASM etc.)
    event.waitUntil(Promise.all(d.urls.map((u) => download(u).promise)));
    return;
  }

  // kind === 'model': ordered fallback list, with progress for the page.
  reply({ type: 'lw-ml', event: 'ack', key: d.key });
  for (const u of d.urls) {                       // joining a download that is already running?
    const st = inflight.get(u);
    if (st) reply({ type: 'lw-ml', event: 'progress', url: u, loaded: st.loaded, total: Math.max(st.total, st.loaded) });
  }
  event.waitUntil(
    downloadChain(d.urls)
      .then((url) => broadcast({ type: 'lw-ml', event: 'chain-done', key: d.key, url }))
      .catch((e) => broadcast({ type: 'lw-ml', event: 'chain-error', key: d.key, message: e.message }))
  );
});