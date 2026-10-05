/**
 * js/orientation.js — completes Orientation (pages/orientation.html)
 * ─────────────────────────────────────────────────────────────────
 * New learners must finish Orientation before Chapter 1 unlocks. The
 * gate itself lives in js/missions.js (isOrientationComplete() /
 * markOrientationComplete(), enforced by isChapterUnlocked()); this file
 * only decides WHEN the learner has finished. Either of these counts:
 *
 *   1. They scroll down to the bottom part of the page (a 1px sentinel
 *      placed just above the Continue button enters the viewport).
 *   2. They click "Continue to the Learning Path" (#orientation-cta).
 *
 * Returning learners who already finished (or who already had progress
 * before Orientation became required) are left alone: no observer, no
 * note, no toast.
 *
 * AUTH TIMING: progress is stored per account, so nothing is written until
 * Firebase has restored the session (LWAuth.whenAuthReady()). Writing
 * earlier would save the flag under "no user" and the real account would
 * never see it. If the learner clicks Continue before auth is ready, the
 * click waits for it and then navigates.
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var NOTE_ID = 'orientation-gate-note';

  function missions() { return window.LWMissions || null; }

  function whenAuthReady(fn) {
    var auth = window.LWAuth;
    if (auth && typeof auth.whenAuthReady === 'function') {
      var done = false;
      var run = function () { if (!done) { done = true; fn(); } };
      try { Promise.resolve(auth.whenAuthReady()).then(run, run); } catch (e) { run(); }
    } else {
      fn();
    }
  }

  function setNote(note, text) {
    if (note) note.textContent = text;
  }

  function init() {
    var m = missions();
    var cta = document.getElementById('orientation-cta');
    if (!m || typeof m.markOrientationComplete !== 'function' || !cta) return;

    var authReady = false;
    var finished = false;
    var observer = null;
    var note = null;
    var sentinel = null;

    function complete() {
      if (finished) return;
      finished = true;
      if (observer) { observer.disconnect(); observer = null; }
      window.removeEventListener('scroll', onScrollFallback);
      window.removeEventListener('resize', onScrollFallback);

      var newlyDone = false;
      try { newlyDone = !!m.markOrientationComplete(); } catch (e) { console.warn('[orientation.js] could not save Orientation:', e); }

      // Keep the sync going so the flag reaches Firestore (and the learner's other devices).
      try { Promise.resolve(m.whenMissionsSyncReady && m.whenMissionsSyncReady()).catch(function () {}); } catch (e) {}

      setNote(note, 'Orientation complete. Chapter 1 is unlocked.');
      if (newlyDone && window.LinguaWave && typeof window.LinguaWave.showToast === 'function') {
        window.LinguaWave.showToast('Orientation complete. Chapter 1 is unlocked.', 'success');
      }
    }

    // ── Bottom-of-page detection ──────────────────────────────────
    function onScrollFallback() {
      var doc = document.documentElement;
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 80) complete();
    }

    function watchBottom() {
      var ctaBlock = cta.parentElement;
      sentinel = document.createElement('div');
      sentinel.id = 'orientation-end';
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'height:1px;width:100%;pointer-events:none;';
      ctaBlock.parentNode.insertBefore(sentinel, ctaBlock);

      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) { complete(); return; }
          }
        }, { threshold: 0 });
        observer.observe(sentinel);
      } else {
        window.addEventListener('scroll', onScrollFallback, { passive: true });
        window.addEventListener('resize', onScrollFallback, { passive: true });
        onScrollFallback();
      }
    }

    // ── Hint above the button ─────────────────────────────────────
    function addNote() {
      note = document.createElement('p');
      note.id = NOTE_ID;
      note.className = 'text-muted';
      note.setAttribute('aria-live', 'polite');
      note.style.marginBottom = 'var(--space-3)';
      note.textContent = 'Reach the end of this page, or press Continue, to unlock Chapter 1.';
      cta.parentElement.insertBefore(note, cta);
    }

    // ── Continue button ───────────────────────────────────────────
    cta.addEventListener('click', function (e) {
      if (finished) return;                 // already saved: let the link navigate
      if (authReady) { complete(); return; } // save synchronously, then the link navigates
      e.preventDefault();                    // auth not ready yet: wait, save, then go
      var href = cta.getAttribute('href') || 'learn.html';
      whenAuthReady(function () {
        authReady = true;
        complete();
        window.location.href = href;
      });
    });

    whenAuthReady(function () {
      authReady = true;
      if (finished) return;
      var already = false;
      try { already = !!(m.isOrientationComplete && m.isOrientationComplete()); } catch (e) {}
      if (already) { finished = true; return; }
      addNote();
      watchBottom();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
