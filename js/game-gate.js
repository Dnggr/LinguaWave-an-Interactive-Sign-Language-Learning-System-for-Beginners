(function () {
  'use strict';

  var GAME_RELEASED = true;
  var GATE_CHAPTER_ID = 'asl_foundations';
  var GAME_PAGES = /\/(wall-breaker|time-attack|construct-sentence)\.html$/;
  var PICKER_URL = 'game.html';
  var NOTICE_KEY = 'lw_game_gate_notice';
  var LOCK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var LOCK_ICON_LG = LOCK_ICON.replace('width="14" height="14"', 'width="26" height="26"');
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';

  function devOverride() {
    try { return localStorage.getItem('lw_game_dev') === '1'; } catch (e) { return false; }
  }

  var AUTH_SRC = /\/auth\.js(\?|#|$)/;
  var MISSIONS_SRC = /\/missions\.js(\?|#|$)/;
  var WAIT_MS = 20000;

  function pageLoadsScript(re) {
    var list = document.scripts;
    for (var i = 0; i < list.length; i++) if (re.test(list[i].src || '')) return true;
    return false;
  }

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

  function evaluate() {
    if (devOverride()) return Promise.resolve({ unlocked: true });
    if (!GAME_RELEASED) return Promise.resolve({ unlocked: false, code: 'soon', reason: 'Game — coming soon', definitive: true });

    var authReady = waitFor('LWAuth', AUTH_SRC).then(function (A) {
      return (A && A.whenAuthReady) ? A.whenAuthReady() : undefined;
    });
    return authReady.then(loadMissions).then(function () {
      var M = window.LWMissions;
      if (!M || !M.isChapterComplete) return LOCKED_CH1;
      var sync = M.whenMissionsSyncReady ? M.whenMissionsSyncReady() : Promise.resolve();
      return sync.then(function () {
        var all = M.getAllMissions();
        if (M.isChapterComplete(GATE_CHAPTER_ID, all)) return { unlocked: true, definitive: true };
        var res = { unlocked: false, code: 'chapter1', reason: LOCKED_CH1.reason, definitive: true };
        try {
          var inCh = all.filter(function (m) { return m.categoryGroup === GATE_CHAPTER_ID; });
          res.total = inCh.length;
          res.done = inCh.filter(function (m) { return M.getMissionProgress(m) >= 1; }).length;
        } catch (e) {  }
        return res;
      });
    }).catch(function () { return LOCKED_CH1; });
  }

  var PICKER_PAGE = /\/game\.html$/;
  var SESSION_KEY = 'lw_session';
  var CACHE_PREFIX = 'lw_game_gate:';

  function sessionUid() {
    try {
      var u = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return u && u.uid ? String(u.uid) : '';
    } catch (e) { return ''; }
  }

  function earlyState() {
    if (devOverride()) return { unlocked: true };
    if (!GAME_RELEASED) return { unlocked: false, code: 'soon', reason: 'Game — coming soon' };
    var uid = sessionUid();
    if (!uid) return null;
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CACHE_PREFIX + uid) || 'null'); } catch (e) {  }
    if (!c || typeof c.unlocked !== 'boolean') return null;
    return c.unlocked
      ? { unlocked: true }
      : { unlocked: false, code: 'chapter1', reason: LOCKED_CH1.reason, done: c.done, total: c.total };
  }

  function remember(r) {
    if (!r.definitive || devOverride() || !GAME_RELEASED) return;
    var uid = sessionUid();
    if (!uid) return;
    try { localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify({ unlocked: !!r.unlocked, done: r.done, total: r.total })); } catch (e) {  }
  }

  function setGateAttr(v) { document.documentElement.setAttribute('data-game-gate', v); }

  var early = earlyState();
  if (PICKER_PAGE.test(window.location.pathname)) {
    setGateAttr(early ? (early.unlocked ? 'unlocked' : 'locked') : 'checking');
  }

  var modal = null;
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

  function shake(el) {
    el.classList.remove('lw-shake-invalid');
    void el.offsetWidth;
    el.classList.add('lw-shake-invalid');
    el.addEventListener('animationend', function () { el.classList.remove('lw-shake-invalid'); }, { once: true });
  }

  function showBanner(result) {
    var el = document.getElementById('game-lock');
    if (!el) return null;
    var soon = result.code === 'soon';
    el.querySelector('#game-lock-title').textContent = soon ? 'The games are coming soon' : 'Finish Chapter 1 to unlock the games';
    el.querySelector('#game-lock-text').textContent = soon
      ? 'We\'re still building them. Keep learning in the meantime and check back soon.'
      : 'Complete every mission in Chapter 1 to start playing. You can look around until then.';
    var hasProgress = !soon && typeof result.total === 'number' && result.total > 0;
    var prog = el.querySelector('#game-lock-progress');
    prog.hidden = !hasProgress;
    if (hasProgress) {
      el.querySelector('#game-lock-count').textContent = result.done + ' of ' + result.total + ' missions';
      el.querySelector('#game-lock-fill').style.setProperty('--lock-fill', String(Math.min(1, result.done / result.total)));
    }
    el.querySelector('#game-lock-go').textContent = soon ? 'Back to Learn' : 'Go to Chapter 1';
    el.hidden = false;
    return el;
  }

  function lockCard(a, result, banner) {
    a.__gateResult = result;
    if (a.classList.contains('game-mode--locked')) return;
    a.__origHref = a.getAttribute('href');
    var action = a.querySelector('.game-mode__action');
    if (action) { a.__origAction = action.innerHTML; action.innerHTML = LOCK_ICON + '<span>Locked</span>'; }
    a.removeAttribute('href');
    a.setAttribute('role', 'link');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('aria-haspopup', 'dialog');
    a.setAttribute('tabindex', '0');
    a.setAttribute('title', result.reason);
    if (banner) a.setAttribute('aria-describedby', 'game-lock-text');
    a.classList.add('game-mode--locked');
    if (a.__gateBound) return;
    a.__gateBound = true;
    var onAttempt = function (e) {
      if (!a.classList.contains('game-mode--locked')) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      shake(a);
      openModal(a.__gateResult);
    };
    a.addEventListener('click', onAttempt);
    a.addEventListener('keydown', onAttempt);
  }

  function unlockCard(a) {
    if (!a.classList.contains('game-mode--locked')) return;
    a.classList.remove('game-mode--locked');
    if (a.__origHref) a.setAttribute('href', a.__origHref);
    var action = a.querySelector('.game-mode__action');
    if (action && a.__origAction != null) action.innerHTML = a.__origAction;
    ['role', 'aria-disabled', 'aria-haspopup', 'tabindex', 'title', 'aria-describedby'].forEach(function (k) { a.removeAttribute(k); });
  }

  function applyPicker(r) {
    var cards = document.querySelectorAll('.game-picker .game-mode');
    var banner = document.getElementById('game-lock');
    if (r.unlocked) {
      if (banner) banner.hidden = true;
      Array.prototype.forEach.call(cards, unlockCard);
      setGateAttr('unlocked');
      return null;
    }
    var shown = showBanner(r);
    Array.prototype.forEach.call(cards, function (a) { lockCard(a, r, shown); });
    setGateAttr('locked');
    return shown;
  }

  var FX_KEY = 'lw_unlock_seen_v1';
  var FX_CLEANUP_MS = 2100;
  var FX_SETTLE_MS = 400;
  var FX_MIN_VISIBLE_PX = 120;
  var fxQueued = {};

  function fxUid() {
    try {
      var u = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
      return (u && u.uid) || null;
    } catch (e) { return null; }
  }

  function fxLoad(uid) {
    var store = null;
    try { store = JSON.parse(localStorage.getItem(FX_KEY + ':' + uid)); } catch (e) { store = null; }
    return (store && typeof store === 'object') ? store : {};
  }
  function fxSave(uid, store) {
    try { localStorage.setItem(FX_KEY + ':' + uid, JSON.stringify(store)); } catch (e) {  }
  }
  function fxGroup(store, group) {
    return (store[group] && typeof store[group] === 'object') ? store[group] : (store[group] = {});
  }

  function fxIsQueued(k) {
    var els = fxQueued[k];
    if (!els) return false;
    if (!els.length) return true;
    return els.some(function (el) { return el && el.isConnected !== false; });
  }

  function fxObserve(group, states) {
    var uid = fxUid();
    if (!uid) return [];
    var store = fxLoad(uid);
    var seen = fxGroup(store, group);
    var fired = [];
    Object.keys(states).forEach(function (id) {
      var now = !!states[id];
      var k = group + ':' + id;
      if (seen[id] === false && now) {
        if (!fxIsQueued(k)) { fxQueued[k] = []; fired.push(id); }
        return;
      }
      seen[id] = now;
      if (!now) delete fxQueued[k];
    });
    fxSave(uid, store);
    return fired;
  }

  function fxCommit(group, ids) {
    var uid = fxUid();
    if (!uid || !group || !ids || !ids.length) return;
    var store = fxLoad(uid);
    var seen = fxGroup(store, group);
    ids.forEach(function (id) { seen[id] = true; delete fxQueued[group + ':' + id]; });
    fxSave(uid, store);
  }

  function fxReducedMotion() {
    return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      document.documentElement.classList.contains('lw-force-reduced-motion');
  }

  function fxInView(entry) {
    if (!entry || !entry.isIntersecting) return false;
    var box = entry.boundingClientRect, vis = entry.intersectionRect;
    return vis.height >= Math.min(box.height * 0.5, FX_MIN_VISIBLE_PX);
  }

  function fxWhenSeen(el, cb) {
    var finished = false, inView = true, timer = null, io = null;
    function onScreen() { return inView && document.visibilityState !== 'hidden'; }
    function stop() {
      finished = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
      if (io) { try { io.disconnect(); } catch (e) {  } }
    }
    function check() {
      if (finished) return;
      clearTimeout(timer);
      if (el.isConnected === false) { stop(); return; }
      if (!onScreen()) return;
      timer = setTimeout(function () {
        if (finished || !onScreen()) return;
        stop();
        cb();
      }, FX_SETTLE_MS);
    }
    document.addEventListener('visibilitychange', check);
    if (typeof window.IntersectionObserver === 'function') {
      try {
        inView = false;
        io = new window.IntersectionObserver(function (entries) {
          inView = fxInView(entries[entries.length - 1]);
          check();
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
        io.observe(el);
      } catch (e) { io = null; inView = true; }
    }
    check();
  }

  function fxStart(el) {
    if (fxReducedMotion()) return;
    var timer;
    function done() {
      clearTimeout(timer);
      el.removeEventListener('animationend', onEnd);
      el.classList.remove('lw-unlock-pulse');
    }
    function onEnd(e) { if (e.target === el) done(); }
    el.classList.remove('lw-unlock-pulse');
    void el.offsetWidth;
    el.classList.add('lw-unlock-pulse');
    el.addEventListener('animationend', onEnd);
    timer = setTimeout(done, FX_CLEANUP_MS);
  }

  function fxPlay(els, opts) {
    var list = Array.prototype.filter.call(els || [], Boolean);
    if (!list.length) return;
    var group = opts && opts.group, ids = (opts && opts.ids) || [];
    ids.forEach(function (id) { fxQueued[group + ':' + id] = list; });
    if (fxReducedMotion()) { fxCommit(group, ids); return; }
    var committed = false;
    list.forEach(function (el) {
      fxWhenSeen(el, function () {
        if (!committed) { committed = true; fxCommit(group, ids); }
        fxStart(el);
      });
    });
  }

  window.LWUnlockFx = { observe: fxObserve, play: fxPlay };

  function pulseIfNewlyUnlocked(links, r) {
    if (!links.length || !r.definitive) return;
    try {
      if (fxObserve('game', { game: !!r.unlocked }).length) fxPlay(links, { group: 'game', ids: ['game'] });
    } catch (e) {  }
  }

  function init() {
    var links = document.querySelectorAll('.app-sidebar a[href$="game.html"]');
    var onPicker = !!document.getElementById('game-lock');
    var onGamePage = GAME_PAGES.test(window.location.pathname);
    if (!onPicker && !onGamePage && !links.length) return;

    var notice = false;
    try { notice = sessionStorage.getItem(NOTICE_KEY) === '1'; } catch (e) {  }

    if (onPicker && early) applyPicker(early);

    evaluate().then(function (r) {
      remember(r);
      if (r.unlocked) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) {  }
        if (onPicker) applyPicker(r);
        pulseIfNewlyUnlocked(links, r);
        return;
      }
      pulseIfNewlyUnlocked(links, r);
      if (onGamePage) {
        try { sessionStorage.setItem(NOTICE_KEY, '1'); } catch (e) {  }
        window.location.replace(PICKER_URL);
        return;
      }
      if (!onPicker) return;
      var banner = applyPicker(r);
      if (notice) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) {  }
        if (banner) {
          banner.setAttribute('tabindex', '-1');
          banner.classList.add('game-lock--flash');
          banner.focus({ preventScroll: true });
        }
      }
    });
  }

  window.LWGameGate = { GAME_RELEASED: GAME_RELEASED, evaluate: evaluate };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
