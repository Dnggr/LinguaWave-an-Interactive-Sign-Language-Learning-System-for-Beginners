// Run from the repo root (Node 18+):   node apply-offline-patch.mjs
// Edits 5 existing files in place. Safe to re-run (already-patched files are skipped).
// Commit first so you can `git diff` / revert.
import fs from 'node:fs';

function edit(file, fn) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let src = raw.replace(/\r\n/g, '\n');
  const out = fn(src);
  if (out === null) { console.log('skip (already patched): ' + file); return; }
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log('patched: ' + file);
}
function replaceOnce(src, oldStr, newStr, label) {
  const n = src.split(oldStr).length - 1;
  if (n !== 1) throw new Error(`[${label}] expected 1 match, found ${n}. File differs from the export I patched - tell Claude.`);
  return src.replace(oldStr, () => newStr);
}

// ── 1. js/tracking/mediapipe.js : use the cached / self-hosted assets ─────────
edit('js/tracking/mediapipe.js', (s) => {
  if (s.includes('prepareAssets')) return null;
  s = replaceOnce(s,
    "} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';\n",
    "} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';\n" +
    "// Model + WASM now come from js/mediapipe-assets.js (cached in the browser, optionally self-hosted).\n" +
    "import { prepareAssets } from '../mediapipe-assets.js';\n", 'mp import');
  s = replaceOnce(s,
    "export async function initMediaPipe() {\n  console.log('[mediapipe] Loading HolisticLandmarker model…');\n\n" +
    "  const vision = await FilesetResolver.forVisionTasks(\n    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'\n  );\n",
    "// opts.onProgress(loadedBytes, totalBytes) reports the model download; opts.signal can abort it.\n" +
    "export async function initMediaPipe(opts = {}) {\n  console.log('[mediapipe] Loading HolisticLandmarker model…');\n\n" +
    "  const { wasmBase, modelBytes } = await prepareAssets(opts);\n" +
    "  const vision = await FilesetResolver.forVisionTasks(wasmBase);\n", 'mp init head');
  const path = "        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',\n";
  const n = s.split(path).length - 1;
  if (n !== 2) throw new Error(`[mp modelAssetPath] expected 2 matches, found ${n}`);
  s = s.split(path).join("        modelAssetBuffer: modelBytes.slice(),   // bytes from js/mediapipe-assets.js (a copy per attempt)\n");
  return s;
});

// ── 2. js/camera-practice.js : progress bar + skip + retry ────────────────────
const LOADER_UI = String.raw`// ── Tracking-model download UI: progress bar, "skip for now", retry ───────────
// The model (~14 MB) is the slow part of opening the camera. This shows real
// progress, lets the learner keep studying meanwhile (Skip), and offers Retry
// if the connection drops. Built in JS so no HTML change is needed.
function formatMB(bytes) { return (bytes / 1048576).toFixed(bytes >= 10485760 ? 0 : 1); }

function createModelLoaderUI() {
  const viewport = document.querySelector('.camera-viewport');
  if (!viewport) return null;

  if (!document.getElementById('lw-model-loader-style')) {
    const st = document.createElement('style');
    st.id = 'lw-model-loader-style';
    st.textContent =
      '.lw-model-loader{position:absolute;inset:0;z-index:11;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:var(--space-4,16px);text-align:center;background:var(--backdrop,rgba(15,23,42,.92));color:var(--clr-text,#e2e8f0);border-radius:inherit}' +
      '.lw-model-loader[hidden],.lw-model-loader button[hidden]{display:none}' +
      '.lw-model-loader__text{margin:0;font-size:var(--fs-sm,.9rem);font-weight:600}' +
      '.lw-model-loader__hint{margin:0;font-size:var(--fs-xs,.8rem);color:var(--clr-text-muted,#94a3b8);max-width:38ch}' +
      '.lw-model-loader__bar{width:min(320px,90%);height:10px;border-radius:999px;background:var(--clr-border,#334155);overflow:hidden}' +
      '.lw-model-loader__fill{height:100%;width:0;background:var(--clr-accent,#38bdf8);transition:width .25s ease}' +
      '.lw-model-loader__actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
      '.lw-model-loader.is-error .lw-model-loader__text{color:var(--clr-red-text,#fca5a5)}' +
      '.lw-model-loader.is-compact{inset:auto 0 0 0;flex-direction:row;flex-wrap:wrap;padding:8px 12px;gap:8px;border-radius:0 0 var(--radius-lg,12px) var(--radius-lg,12px)}' +
      '.lw-model-loader.is-compact .lw-model-loader__hint{display:none}' +
      '.lw-model-loader.is-compact .lw-model-loader__bar{width:120px;flex:0 0 auto}' +
      '@media (prefers-reduced-motion:reduce){.lw-model-loader__fill{transition:none}}';
    document.head.appendChild(st);
  }

  const box = document.createElement('div');
  box.className = 'lw-model-loader';
  box.hidden = true;
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  box.innerHTML =
    '<p class="lw-model-loader__text"></p>' +
    '<div class="lw-model-loader__bar" role="progressbar" aria-label="Tracking model download" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="lw-model-loader__fill"></div></div>' +
    '<p class="lw-model-loader__hint"></p>' +
    '<div class="lw-model-loader__actions">' +
      '<button type="button" class="btn btn--ghost lw-model-loader__skip">Skip for now \u2014 keep studying</button>' +
      '<button type="button" class="btn btn--secondary lw-model-loader__retry" hidden>Retry</button>' +
    '</div>';
  viewport.appendChild(box);

  const textEl = box.querySelector('.lw-model-loader__text');
  const hintEl = box.querySelector('.lw-model-loader__hint');
  const barEl  = box.querySelector('.lw-model-loader__bar');
  const fillEl = box.querySelector('.lw-model-loader__fill');
  const skipBtn  = box.querySelector('.lw-model-loader__skip');
  const retryBtn = box.querySelector('.lw-model-loader__retry');
  let revealTimer = null;
  let retryResolve = null;

  skipBtn.addEventListener('click', () => {
    box.classList.add('is-compact');
    skipBtn.hidden = true;
    hintEl.textContent = 'The camera will start automatically when the download finishes.';
  });
  retryBtn.addEventListener('click', () => {
    if (retryResolve) { const r = retryResolve; retryResolve = null; r(); }
  });

  return {
    showProgress() {
      setStatus('', 'ready');                       // hide the plain "Loading\u2026" overlay
      box.classList.remove('is-error');
      retryBtn.hidden = true;
      skipBtn.hidden = box.classList.contains('is-compact');
      textEl.textContent = 'Downloading hand-tracking model (about 14 MB)\u2026';
      hintEl.textContent = 'First time only \u2014 it is saved on this device for next time. You can keep studying this lesson meanwhile.';
      fillEl.style.width = '0%';
      // Already cached = instant: don't flash the box for a split second.
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => { box.hidden = false; }, 400);
    },
    update(loaded, total) {
      const pct = loaded >= total ? 100 : Math.min(99, Math.floor((loaded / total) * 100));
      fillEl.style.width = pct + '%';
      barEl.setAttribute('aria-valuenow', String(pct));
      textEl.textContent = 'Downloading hand-tracking model\u2026 ' + formatMB(loaded) + ' / ' + formatMB(total) + ' MB (' + pct + '%)';
    },
    showErrorAndWaitForRetry(err) {
      clearTimeout(revealTimer);
      box.hidden = false;
      box.classList.add('is-error');
      textEl.textContent = 'Could not download the tracking model.';
      hintEl.textContent = (err && err.message ? err.message + ' ' : '') + 'Check your connection, then tap Retry.';
      retryBtn.hidden = false;
      skipBtn.hidden = true;
      return new Promise((resolve) => { retryResolve = resolve; });
    },
    done() {
      clearTimeout(revealTimer);
      box.remove();
    },
  };
}

async function bootDetectionEngine() {
  const loader = createModelLoaderUI();
  modelDownloading = true;
  if (!loader) setStatus('Loading hand + face tracking model\u2026', 'loading');

  try {
    // Download (or read from the browser cache) the tracking model. On failure
    // show the error with a Retry button instead of dead-ending the page.
    for (;;) {
      try {
        if (loader) loader.showProgress();
        await initMediaPipe({ onProgress: (loaded, total) => { if (loader) loader.update(loaded, total); } });
        break;
      } catch (err) {
        console.error('[lesson.js] Tracking model failed to load:', err);
        if (!loader) throw err;
        await loader.showErrorAndWaitForRetry(err);
      }
    }
    modelDownloading = false;
    if (loader) loader.done();
    setStatus('Starting camera\u2026', 'loading');
    await startCamera(videoEl, canvasEl);
  } catch (err) {
    modelDownloading = false;
    if (loader) loader.done();
    console.error('[lesson.js] Boot failed:', err);
    setStatus(` + '`Failed to start: ${err.message}`' + String.raw`, 'error');
    return;
  }
`;

edit('js/camera-practice.js', (s) => {
  if (s.includes('createModelLoaderUI')) return null;
  // module-level flag: declared up top because boot() runs during module evaluation (see FEEDBACK_ICONS note)
  s = s.replace(/^(let faceWarnEl\s*= null;)$/m, (m) => m + "\n// True while the tracking model is still downloading (Skip keeps the lesson usable meanwhile).\nlet modelDownloading = false;");
  if (!s.includes('let modelDownloading')) throw new Error('[cp flag] could not find "let faceWarnEl = null;"');

  const oldBoot =
    "async function bootDetectionEngine() {\n" +
    "  setStatus('Loading hand + face tracking model…', 'loading');\n\n" +
    "  try {\n" +
    "    await initMediaPipe();\n" +
    "    setStatus('Starting camera…', 'loading');\n" +
    "    await startCamera(videoEl, canvasEl);\n" +
    "  } catch (err) {\n" +
    "    console.error('[lesson.js] Boot failed:', err);\n" +
    "    setStatus(`Failed to start: ${err.message}`, 'error');\n" +
    "    return;\n" +
    "  }\n";
  s = replaceOnce(s, oldBoot, LOADER_UI, 'cp boot');

  s = replaceOnce(s, "function startAssessment() {\n",
    "function startAssessment() {\n" +
    "  // Tracking model still downloading (learner pressed Skip): nothing could be detected yet.\n" +
    "  if (modelDownloading) { showFeedback('Hand-tracking is still downloading \\u2014 Practice Check unlocks as soon as it finishes.', 'info'); return; }\n", 'cp startAssessment');
  return s;
});

// ── 3. Start the download early on pages learners open before the camera ─────
for (const f of ['pages/lesson.html', 'pages/learn.html']) {
  edit(f, (s) => {
    if (s.includes('model-prefetch.js')) return null;
    return replaceOnce(s, '</body>', '  <script type="module" src="../js/model-prefetch.js"></script>\n</body>', f);
  });
}
console.log('\nDone. Next: copy sw.js to the site ROOT, js/*.js into js/, .htaccess to the root.');
