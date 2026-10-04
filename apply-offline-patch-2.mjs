// Run from the repo root (Node 18+) AFTER apply-offline-patch.mjs:
//
//   node apply-offline-patch-2.mjs
//
// Adds to the already-patched files:
//   * js/tracking/mediapipe.js  - reports a "starting engine" phase
//   * js/camera-practice.js     - "Starting the hand-tracking engine…" state after 100%,
//                                 and a clear message when the page is not on a secure address
// Safe to re-run.
import fs from 'node:fs';

function edit(file, fn) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const out = fn(raw.replace(/\r\n/g, '\n'));
  if (out === null) { console.log('skip (already patched): ' + file); return; }
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log('patched: ' + file);
}
function replaceOnce(src, oldStr, newStr, label) {
  const n = src.split(oldStr).length - 1;
  if (n !== 1) throw new Error(`[${label}] expected 1 match, found ${n}. Did apply-offline-patch.mjs run first? Tell Claude.`);
  return src.replace(oldStr, () => newStr);
}

edit('js/tracking/mediapipe.js', (s) => {
  if (s.includes("opts.onPhase('starting')")) return null;
  return replaceOnce(s,
    "  const { wasmBase, modelBytes } = await prepareAssets(opts);\n",
    "  const { wasmBase, modelBytes } = await prepareAssets(opts);\n" +
    "  if (typeof opts.onPhase === 'function') opts.onPhase('starting');   // download done - engine is initialising\n", 'mp phase');
});

edit('js/camera-practice.js', (s) => {
  if (s.includes('startingEngine')) return null;

  // 1) styles for the indeterminate bar
  s = replaceOnce(s,
    "'@media (prefers-reduced-motion:reduce){.lw-model-loader__fill{transition:none}}';",
    "'.lw-model-loader.is-starting .lw-model-loader__fill{width:100%!important;animation:lwModelPulse 1.1s ease-in-out infinite}' +\n" +
    "      '@keyframes lwModelPulse{0%,100%{opacity:.35}50%{opacity:1}}' +\n" +
    "      '@media (prefers-reduced-motion:reduce){.lw-model-loader__fill{transition:none}.lw-model-loader.is-starting .lw-model-loader__fill{animation:none}}';", 'cp css');

  // 2) the new phase
  s = replaceOnce(s,
    "    showErrorAndWaitForRetry(err) {\n",
    "    startingEngine() {\n" +
    "      clearTimeout(revealTimer);\n" +
    "      box.hidden = false;\n" +
    "      box.classList.add('is-starting');\n" +
    "      textEl.textContent = 'Download complete \\u2014 starting the hand-tracking engine\\u2026';\n" +
    "      hintEl.textContent = 'Almost ready. This can take a few seconds on slower connections and devices.';\n" +
    "    },\n" +
    "    showErrorAndWaitForRetry(err) {\n", 'cp phase fn');
  s = replaceOnce(s,
    "      box.classList.remove('is-error');\n      retryBtn.hidden = true;\n",
    "      box.classList.remove('is-error', 'is-starting');\n      retryBtn.hidden = true;\n", 'cp showProgress reset');

  // 3) wire it up
  s = replaceOnce(s,
    "await initMediaPipe({ onProgress: (loaded, total) => { if (loader) loader.update(loaded, total); } });",
    "await initMediaPipe({\n" +
    "          onProgress: (loaded, total) => { if (loader) loader.update(loaded, total); },\n" +
    "          onPhase: (phase) => { if (loader && phase === 'starting') loader.startingEngine(); },\n" +
    "        });", 'cp wire');

  // 4) secure-address check, BEFORE spending 13 MB on a camera that cannot start
  s = replaceOnce(s,
    "  const loader = createModelLoaderUI();\n  modelDownloading = true;\n",
    "  // The webcam (and the service worker that caches the model) only exist on https:// or http://localhost.\n" +
    "  // Over plain http on a LAN address (e.g. http://192.168.x.x) the browser hides them entirely - say so\n" +
    "  // up front instead of downloading 13 MB and then failing.\n" +
    "  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {\n" +
    "    const plainHttp = location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(location.hostname);\n" +
    "    setStatus(plainHttp\n" +
    "      ? 'The camera only works on a secure address. Open this site with https:// (or http://localhost while testing).'\n" +
    "      : 'Your browser does not support camera access. Please use Chrome or Edge.', 'error');\n" +
    "    return;\n" +
    "  }\n" +
    "  const loader = createModelLoaderUI();\n  modelDownloading = true;\n", 'cp secure check');
  return s;
});
console.log('\nDone. Now replace sw.js (root) and js/mediapipe-assets.js with the new versions.');
