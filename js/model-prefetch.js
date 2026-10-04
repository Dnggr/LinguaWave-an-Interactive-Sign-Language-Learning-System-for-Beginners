/*
  js/model-prefetch.js — start downloading the hand-tracking model early.
  ─────────────────────────────────────────────────────────────────
  Loaded on pages learners visit BEFORE the camera page (lesson.html,
  learn.html). It runs after the page has loaded, when the browser is idle,
  at low priority, so the lesson video and page come first. By the time the
  learner opens a Practice Check the model is usually already cached.

  Skipped when: the browser's Data Saver is on, the device is offline, or
  Cache Storage isn't available. Already cached → nothing is downloaded.
*/
import { warmAssets } from './mediapipe-assets.js';

(function () {
  const conn = navigator.connection || {};
  if (conn.saveData) return;                      // respect Data Saver
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