/**
 * js/game-gate.js — locks the "Game" tab and the game pages
 * ─────────────────────────────────────────────────────────────────
 * RULE      The Game opens only after Chapter 1 (asl_foundations) is
 *           100% complete — AND only once GAME_RELEASED is true.
 *
 * WHAT IT DOES (every page that loads this script)
 *   - Locks every `.app-sidebar a[href$="game.html"]`: href removed,
 *     aria-disabled, dimmed, lock icon, tooltip, shake.
 *   - Clicking (or Enter/Space on) a locked link opens a modal that says
 *     why it is locked, how far Chapter 1 is, and links to Learn.
 *   - On a game page (GAME_PAGES below) a locked learner is sent to
 *     dashboard.html, where the same modal opens once, so typing the URL
 *     doesn't bypass the sidebar lock and doesn't fail silently.
 *   - The modal is built here (markup + styles), so no page needs extra
 *     HTML. It uses the theme tokens, so light/dark both work.
 *
 * GAME_PAGES  Every page below must load this script, or it can be opened
 *           by URL. Add: <script src="../js/game-gate.js" defer></script>
 *           (after js/mobile-nav.js) to any game page that lacks it.
 *
 * DEV ACCESS  Run  localStorage.setItem('lw_game_dev','1')  in the browser
 *           console to open the game while working on it (remove the key to
 *           lock again). Client-side only — same trust level as all other
 *           gating in this app; real protection would need Firestore rules.
 *
 * DEPENDS   window.LWMissions (js/missions.js) — loaded on demand if the
 *           page doesn't have it. Fails CLOSED: if progress can't be read,
 *           the Game stays locked.
 */
(function () {
  'use strict';

  var GAME_RELEASED = true;                 // false = locked for everyone ("coming soon")
  var GATE_CHAPTER_ID = 'asl_foundations';  // Chapter 1
  var GAME_PAGES = /\/(game|wall-breaker|time-attack|construct-sentence)\.html$/;
  var NOTICE_KEY = 'lw_game_gate_notice';   // set before a redirect so the next page explains it
  var LOCK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var LOCK_ICON_LG = LOCK_ICON.replace('width="14" height="14"', 'width="26" height="26"');
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';

  /* ── Access check ─────────────────────────────────────────────── */
  function devOverride() {
    try { return localStorage.getItem('lw_game_dev') === '1'; } catch (e) { return false; }
  }

  // Most pages load this script (defer) BEFORE js/auth.js (type="module") and js/missions.js (defer),
  // so when init() runs, window.LWAuth / window.LWMissions usually do not exist yet. Reading the
  // user's progress at that moment sees "no signed-in uid", which makes every saved record look like
  // it belongs to another account -> empty progress -> Chapter 1 "incomplete" -> Game locked.
  // These helpers wait for the page's own copies instead of guessing.
  var AUTH_SRC = /\/auth\.js(\?|#|$)/;
  var MISSIONS_SRC = /\/missions\.js(\?|#|$)/;
  var WAIT_MS = 20000;   // slow connections + a hard refresh (no cache) can take a while to load Firebase

  function pageLoadsScript(re) {
    var list = document.scripts;
    for (var i = 0; i < list.length; i++) if (re.test(list[i].src || '')) return true;
    return false;
  }

  // Resolves window[name] once it exists, or null if this page never loads it / it times out.
  function waitFor(name, srcRe) {
    return new Promise(function (resolve) {
      if (window[name]) { resolve(window[name]); return; }
      if (!pageLoadsScript(srcRe)) { resolve(null); return; }
      var t0 = Date.now();
      var iv = setInterval(function () {
        if (window[name]) { clearInterval(iv); resolve(window[name]); }
        else if (Date.now() - t0 > WAIT_MS) { clearInterval(iv); resolve(null); }
      }, 25);
    });
  }

  function loadMissions() {
    if (window.LWMissions) return Promise.resolve();
    // The page already loads its own missions.js: wait for THAT copy. Injecting a second copy would
    // create a second, independent LWMissions (own caches, own sync state) that can overwrite the first.
    if (pageLoadsScript(MISSIONS_SRC)) return waitFor('LWMissions', MISSIONS_SRC).then(function () {});
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = scriptSrc.replace(/game-gate\.js(\?.*)?$/, 'missions.js');
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  var LOCKED_CH1 = { unlocked: false, code: 'chapter1', reason: 'Finish Chapter 1 to unlock the Game' };

  // Resolves { unlocked, code, reason, done, total } — done/total are Chapter 1 missions.
  function evaluate() {
    if (devOverride()) return Promise.resolve({ unlocked: true });
    if (!GAME_RELEASED) return Promise.resolve({ unlocked: false, code: 'soon', reason: 'Game — coming soon' });

    // 1) wait for js/auth.js to exist, 2) wait for Firebase to restore the session (so the uid is known),
    // 3) only then load/wait for missions.js and read progress.
    var authReady = waitFor('LWAuth', AUTH_SRC).then(function (A) {
      return (A && A.whenAuthReady) ? A.whenAuthReady() : undefined;
    });
    return authReady.then(loadMissions).then(function () {
      var M = window.LWMissions;
      if (!M || !M.isChapterComplete) return LOCKED_CH1;
      var sync = M.whenMissionsSyncReady ? M.whenMissionsSyncReady() : Promise.resolve();
      return sync.then(function () {
        var all = M.getAllMissions();
        if (M.isChapterComplete(GATE_CHAPTER_ID, all)) return { unlocked: true };
        var res = { unlocked: false, code: 'chapter1', reason: LOCKED_CH1.reason };
        try {
          var inCh = all.filter(function (m) { return m.categoryGroup === GATE_CHAPTER_ID; });
          res.total = inCh.length;
          res.done = inCh.filter(function (m) { return M.getMissionProgress(m) >= 1; }).length;
        } catch (e) { /* progress line is optional */ }
        return res;
      });
    }).catch(function () { return LOCKED_CH1; }); // fail closed
  }

  /* ── Modal ────────────────────────────────────────────────────── */
  var modal = null; // { overlay, dialog, ... } once built
  var lastFocus = null;

  function injectStyles() {
    if (document.getElementById('lw-game-gate-css')) return;
    var st = document.createElement('style');
    st.id = 'lw-game-gate-css';
    st.textContent =
      '.gg-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:var(--space-4,16px);background:rgba(15,23,42,.55)}' +
      '.gg-overlay[hidden]{display:none}' +
      '.gg-dialog{width:100%;max-width:420px;max-height:100%;overflow:auto;background:var(--clr-surface,#fff);color:var(--clr-text,#0f172a);border:1px solid var(--clr-border,#e2e8f0);border-radius:var(--radius-xl,20px);padding:var(--space-6,24px);box-shadow:var(--shadow-card,0 12px 32px rgba(0,0,0,.25));text-align:center}' +
      '.gg-dialog:focus{outline:none}' +
      '.gg-mark{width:56px;height:56px;margin:0 auto var(--space-4,16px);border-radius:50%;display:grid;place-items:center;border:2px solid var(--clr-accent,#3b82f6);background:var(--clr-accent-soft,rgba(59,130,246,.15));color:var(--clr-accent,#3b82f6)}' +
      '.gg-title{margin:0 0 var(--space-2,8px);font-size:var(--fs-xl,1.4rem)}' +
      '.gg-text{margin:0;color:var(--clr-text-muted,#64748b);font-size:var(--fs-sm,.9rem);line-height:1.55}' +
      '.gg-progress{margin-top:var(--space-4,16px);text-align:left}' +
      '.gg-progress__label{display:flex;justify-content:space-between;gap:var(--space-3,12px);font-size:var(--fs-sm,.9rem);font-weight:600;margin-bottom:var(--space-2,8px)}' +
      '.gg-progress__track{height:8px;border-radius:999px;overflow:hidden;background:var(--clr-surface-2,#f1f5f9)}' +
      '.gg-progress__fill{height:100%;width:100%;border-radius:999px;background:var(--clr-accent,#3b82f6);transform-origin:left;transform:scaleX(var(--gg-fill,0))}' +
      '.gg-actions{display:flex;flex-direction:column;gap:var(--space-2,8px);margin-top:var(--space-5,20px)}' +
      '@media (prefers-reduced-motion:no-preference){.gg-overlay:not([hidden]) .gg-dialog{animation:gg-pop 220ms cubic-bezier(.22,1,.36,1)}@keyframes gg-pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}}' +
      'html.lw-force-reduced-motion .gg-dialog{animation:none!important}';
    document.head.appendChild(st);
  }

  function buildModal() {
    injectStyles();
    var overlay = document.createElement('div');
    overlay.className = 'gg-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="gg-dialog" role="dialog" aria-modal="true" aria-labelledby="gg-title" aria-describedby="gg-text" tabindex="-1">' +
        '<div class="gg-mark" aria-hidden="true">' + LOCK_ICON_LG + '</div>' +
        '<h2 class="gg-title" id="gg-title"></h2>' +
        '<p class="gg-text" id="gg-text"></p>' +
        '<div class="gg-progress" id="gg-progress" hidden>' +
          '<div class="gg-progress__label"><span>Chapter 1 · ASL Foundations</span><span id="gg-count"></span></div>' +
          '<div class="gg-progress__track" aria-hidden="true"><div class="gg-progress__fill" id="gg-fill"></div></div>' +
        '</div>' +
        '<div class="gg-actions">' +
          '<a class="btn btn--primary btn--lg" id="gg-go" href="learn.html">Go to Chapter 1</a>' +
          '<button type="button" class="btn btn--ghost" id="gg-close">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var m = {
      overlay: overlay,
      dialog: overlay.querySelector('.gg-dialog'),
      title: overlay.querySelector('#gg-title'),
      text: overlay.querySelector('#gg-text'),
      progress: overlay.querySelector('#gg-progress'),
      count: overlay.querySelector('#gg-count'),
      fill: overlay.querySelector('#gg-fill'),
      go: overlay.querySelector('#gg-go'),
      close: overlay.querySelector('#gg-close')
    };
    m.close.addEventListener('click', closeModal);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the dialog.
      var f = [m.go, m.close].filter(function (el) { return !el.hidden; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === m.dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return m;
  }

  function openModal(result) {
    if (!modal) modal = buildModal();
    var soon = result.code === 'soon';
    modal.title.textContent = soon ? 'The Game is coming soon' : 'The Game is locked';
    modal.text.textContent = soon
      ? 'We\'re still building it. Keep learning in the meantime and check back soon.'
      : 'Finish every mission in Chapter 1 to unlock the Game.';
    var hasProgress = !soon && typeof result.total === 'number' && result.total > 0;
    modal.progress.hidden = !hasProgress;
    if (hasProgress) {
      modal.count.textContent = result.done + ' of ' + result.total + ' missions';
      modal.fill.style.setProperty('--gg-fill', String(Math.min(1, result.done / result.total)));
    }
    modal.go.textContent = soon ? 'Back to Learn' : 'Go to Chapter 1';
    lastFocus = document.activeElement;
    modal.overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    modal.go.focus();
  }

  function closeModal() {
    if (!modal || modal.overlay.hidden) return;
    modal.overlay.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  /* ── Locking the sidebar link ─────────────────────────────────── */
  function lockLink(a, result) {
    a.removeAttribute('href');
    a.setAttribute('role', 'link');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('aria-haspopup', 'dialog');
    a.setAttribute('tabindex', '0');
    a.setAttribute('title', result.reason);
    a.classList.add('app-sidebar__link--locked');
    if (!a.querySelector('.app-sidebar__lock')) {
      var badge = document.createElement('span');
      badge.className = 'app-sidebar__lock';
      badge.innerHTML = LOCK_ICON;
      a.appendChild(badge);
    }
    var onAttempt = function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      a.classList.remove('lw-shake-invalid');
      void a.offsetWidth; // restart animation on rapid repeat clicks
      a.classList.add('lw-shake-invalid');
      a.addEventListener('animationend', function () { a.classList.remove('lw-shake-invalid'); }, { once: true });
      openModal(result);
    };
    a.addEventListener('click', onAttempt);
    a.addEventListener('keydown', onAttempt);
  }

  /* ── Start-up ─────────────────────────────────────────────────── */
  function init() {
    var links = document.querySelectorAll('.app-sidebar a[href$="game.html"]');
    var onGamePage = GAME_PAGES.test(window.location.pathname);
    var notice = false;
    try { notice = sessionStorage.getItem(NOTICE_KEY) === '1'; } catch (e) { /* ignore */ }
    if (!links.length && !onGamePage) return;

    evaluate().then(function (r) {
      if (r.unlocked) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) { /* ignore */ }
        return;
      }
      Array.prototype.forEach.call(links, function (a) { lockLink(a, r); });
      if (onGamePage) {
        try { sessionStorage.setItem(NOTICE_KEY, '1'); } catch (e) { /* ignore */ }
        window.location.replace('dashboard.html');
        return;
      }
      if (notice) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) { /* ignore */ }
        openModal(r); // arrived here because a game page was blocked
      }
    });
  }

  window.LWGameGate = { GAME_RELEASED: GAME_RELEASED, evaluate: evaluate };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();