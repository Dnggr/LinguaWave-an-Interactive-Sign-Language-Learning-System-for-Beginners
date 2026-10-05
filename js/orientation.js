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
 * READING-PROGRESS BAR (right edge, .scroll-progress in css/app.css):
 *   - Fills top-to-bottom with scroll position, but is ONE-WAY: it keeps
 *     the furthest point reached, so scrolling back up never shrinks it.
 *     The furthest point is also remembered per account (localStorage) so
 *     a reload does not reset it.
 *   - Already full for learners whose Orientation is complete, including
 *     the grandfathered ones (isOrientationComplete()). It stays hidden
 *     until the account's progress is known, so there is no empty flash.
 *   - Jumps to full the moment Orientation completes (bottom reached or
 *     Continue clicked), and also if the cross-device sync later reveals
 *     that this account had already completed it.
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
  var PROGRESS_KEY_PREFIX = 'lw-orientation-read-max:';

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

    // ── Reading-progress bar (one-way) ────────────────────────────
    var bar = document.querySelector('.scroll-progress');
    var barReady = false;      // .is-ready added (account progress known)
    var maxProgress = 0;       // furthest point reached, 0..1. Only ever goes up.
    var barFrame = 0;
    var storageKey = null;

    function progressKey() {
      if (storageKey) return storageKey;
      var uid = 'guest';
      try {
        var u = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
        if (u && u.uid) uid = u.uid;
      } catch (e) {}
      storageKey = PROGRESS_KEY_PREFIX + uid;
      return storageKey;
    }

    function readSaved() {
      try {
        var v = parseFloat(localStorage.getItem(progressKey()));
        return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
      } catch (e) { return 0; }
    }

    function writeSaved(v) {
      try { localStorage.setItem(progressKey(), String(Math.round(v * 1000) / 1000)); } catch (e) {}
    }

    function clearSaved() {
      try { localStorage.removeItem(progressKey()); } catch (e) {}
    }

    // Raise the bar to `v` (0..1). Lower values are ignored: this is what makes it one-way.
    function raiseProgress(v) {
      if (!(v > maxProgress)) return;
      maxProgress = Math.min(1, v);
      if (bar) bar.style.setProperty('--orientation-progress', String(maxProgress));
      if (barReady && !finished) writeSaved(maxProgress);
    }

    function scrollRatio() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 1;     // everything already fits on screen
      return Math.min(1, Math.max(0, window.scrollY / scrollable));
    }

    function onBarScroll() {
      if (barFrame) return;
      barFrame = window.requestAnimationFrame(function () {
        barFrame = 0;
        raiseProgress(scrollRatio());
      });
    }

    function stopBarTracking() {
      window.removeEventListener('scroll', onBarScroll);
      window.removeEventListener('resize', onBarScroll);
      if (barFrame) { window.cancelAnimationFrame(barFrame); barFrame = 0; }
    }

    // Show the bar. `isDone` = this account has already completed Orientation.
    function showBar(isDone) {
      if (!bar || barReady) return;
      barReady = true;
      if (isDone) {
        raiseProgress(1);
        clearSaved();
      } else {
        raiseProgress(Math.max(readSaved(), scrollRatio()));
        window.addEventListener('scroll', onBarScroll, { passive: true });
        window.addEventListener('resize', onBarScroll, { passive: true });
      }
      bar.classList.add('is-ready');
    }

    // Orientation turned out to be done already (e.g. the cross-device sync arrived late).
    function settleAsAlreadyDone() {
      if (finished) return;
      finished = true;
      if (observer) { observer.disconnect(); observer = null; }
      window.removeEventListener('scroll', onScrollFallback);
      window.removeEventListener('resize', onScrollFallback);
      stopBarTracking();
      if (note && note.parentNode) note.parentNode.removeChild(note);
      note = null;
      if (barReady) clearSaved();
      raiseProgress(1);
    }

    function complete() {
      if (finished) return;
      finished = true;
      if (observer) { observer.disconnect(); observer = null; }
      window.removeEventListener('scroll', onScrollFallback);
      window.removeEventListener('resize', onScrollFallback);
      stopBarTracking();
      raiseProgress(1);                  // completed = full bar, never partial
      if (barReady) clearSaved();

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
      if (finished) { showBar(true); return; }   // completed (Continue) before auth was ready
      var already = false;
      try { already = !!(m.isOrientationComplete && m.isOrientationComplete()); } catch (e) {}
      if (already) { finished = true; showBar(true); return; }
      addNote();
      watchBottom();
      showBar(false);

      // Progress may live only in Firestore (new device): once the sync has run, re-check, so
      // a learner who had already finished sees a full bar and no "unlock Chapter 1" note.
      try {
        Promise.resolve(m.whenMissionsSyncReady && m.whenMissionsSyncReady()).then(function () {
          var doneNow = false;
          try { doneNow = !!(m.isOrientationComplete && m.isOrientationComplete()); } catch (e) {}
          if (doneNow) settleAsAlreadyDone();
        }, function () {});
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();