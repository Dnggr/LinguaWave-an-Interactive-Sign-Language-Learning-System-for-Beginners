import { warmAssets } from './mediapipe-assets.js';

(function () {
  const conn = navigator.connection || {};
  if (conn.saveData) return;
  if (navigator.onLine === false) return;
  if (!('caches' in self)) return;

  const run = () => warmAssets().catch((e) => console.debug('[model-prefetch] skipped:', e && e.message));
  const schedule = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 5000 });
    else setTimeout(run, 2000);
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
