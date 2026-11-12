const CACHE = 'lw-ml-v1';
const MODEL_APPROX_BYTES = 13_700_000;

const CACHEABLE = [
  /\.task(\?|$)/,
  /\/vision_wasm_(nosimd_)?internal\.(js|wasm)(\?|$)/,
  /\/npm\/@mediapipe\/tasks-vision@[^/]+\//,
  /\/npm\/@tensorflow\/tfjs@[^/]+\//,
];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('lw-ml-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});


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

  const running = inflight.get(req.url);
  if (running) {
    await running.promise;
    const again = await cache.match(req.url);
    if (again) return again;
  }

  let res;
  try {
    res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
  } catch (_) {
    res = await fetch(req);
  }
  if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
    cache.put(req.url, res.clone()).catch(() => {});
  }
  return res;
}


const inflight = new Map();

async function broadcast(msg) {
  const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const c of all) c.postMessage(msg);
}

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
  const reply = (m) => { try { if (src) src.postMessage(m); } catch (_) {  } };

  if (d.kind === 'files') {
    event.waitUntil(Promise.all(d.urls.map((u) => download(u).promise)));
    return;
  }

  reply({ type: 'lw-ml', event: 'ack', key: d.key });
  for (const u of d.urls) {
    const st = inflight.get(u);
    if (st) reply({ type: 'lw-ml', event: 'progress', url: u, loaded: st.loaded, total: Math.max(st.total, st.loaded) });
  }
  event.waitUntil(
    downloadChain(d.urls)
      .then((url) => broadcast({ type: 'lw-ml', event: 'chain-done', key: d.key, url }))
      .catch((e) => broadcast({ type: 'lw-ml', event: 'chain-error', key: d.key, message: e.message }))
  );
});
