/**
 * js/game-gate.js — gates the games until Chapter 1 is finished
 * ─────────────────────────────────────────────────────────────────
 * RULE      The games open only after Chapter 1 (asl_foundations) is
 *           100% complete — AND only once GAME_RELEASED is true.
 *
 * WHAT IT DOES
 *   The Game tab in the sidebar is NEVER locked: learners can always open
 *   pages/game.html and look around. The lock lives inside that page.
 *
 *   On pages/game.html (the picker — any page with #game-lock):
 *     - Shows the #game-lock banner: why the games are locked, Chapter 1
 *       progress, and a button to Learn.
 *     - Turns every `.game-mode` card into a locked card: href removed,
 *       aria-disabled, muted colors, a "Locked" pill. Clicking (or
 *       Enter/Space on) a locked card shakes it and opens a modal that
 *       explains the same thing.
 *   On a game page (GAME_PAGES below) a locked learner is sent back to
 *       game.html, where the banner flashes once, so typing the URL
 *       doesn't bypass the lock and doesn't fail silently.
 *   - The modal is built here (markup + styles). It uses the theme tokens,
 *     so light/dark both work. The banner + card styles are in css/game.css.
 *
 * GAME_PAGES  Every page below must load this script, or it can be opened
 *           by URL. Add: <script src="../js/game-gate.js" defer></script>
 *           (after js/mobile-nav.js) to any game page that lacks it.
 *           (game.html is NOT listed: it is the picker, it stays open.)
 *
 * NO FLASH   The check needs Firebase auth + the missions sync, which can take
 *           seconds. So the last result is remembered per account in
 *           localStorage ("lw_game_gate:<uid>", uid read from "lw_session",
 *           the same sync cache js/role-guard.js uses) and painted BEFORE the
 *           page renders: a data-game-gate attribute on <html> (css/game.css
 *           styles the locked look from it) plus the banner/cards in init().
 *           The real check then runs and quietly corrects it. With nothing
 *           remembered (first visit, new account) the cards sit dimmed and
 *           inert ("checking") instead of showing Play and then locking.
 *           Only trustworthy results (`definitive`, see evaluate) are remembered.
 *
 * UNLOCK PULSE  When a learner who last SAW the Game locked next sees it unlocked,
 *           the sidebar item glows (two beats, ~1.8s, `.lw-unlock-pulse` in
 *           css/style.css §19b), then returns to normal. This is not a second
 *           unlock system: the answer still comes from evaluate() below;
 *           window.LWUnlockFx only remembers what each account last saw
 *           (localStorage `lw_unlock_seen_v1:<uid>`) so a real locked -> unlocked
 *           change can be told apart from an ordinary page load. First sighting,
 *           fail-closed fallbacks and the dev override never pulse. js/learn.js
 *           reuses the same helper for chapter rows, so this script must load on
 *           Learn too.
 *           IT ONLY PLAYS WHERE THE LEARNER CAN SEE IT: the tab must be visible
 *           and the element on screen (a hidden tab, an off-canvas mobile drawer,
 *           a chapter scrolled out of view all wait), then it settles ~0.4s so it
 *           doesn't fire under a page that is still painting in. The change is
 *           recorded as "seen" only once the glow has actually started; if the
 *           learner leaves first, the next page load offers it again.
 *
 * OTHER PAGES  Every page with a sidebar Game link keeps loading this script: there
 *           it runs the check only to (a) refresh the remembered state, so the picker
 *           opens already correct, and (b) play the unlock pulse. It never locks or
 *           redirects there. The Game link itself is never locked.
 *
 * DEV ACCESS  Run  localStorage.setItem('lw_game_dev','1')  in the browser
 *           console to open the game while working on it (remove the key to
 *           lock again). Client-side only — same trust level as all other
 *           gating in this app; real protection would need Firestore rules.
 *
 * DEPENDS   window.LWMissions (js/missions.js) — loaded on demand if the
 *           page doesn't have it. Fails CLOSED: if progress can't be read,
 *           the games stay locked.
 */
(function () {
  'use strict';

  var GAME_RELEASED = true;                 // false = locked for everyone ("coming soon")
  var GATE_CHAPTER_ID = 'asl_foundations';  // Chapter 1
  var GAME_PAGES = /\/(wall-breaker|time-attack|construct-sentence)\.html$/;   // the games themselves (NOT the picker)
  var PICKER_URL = 'game.html';             // locked learners on a game page are sent here
  var NOTICE_KEY = 'lw_game_gate_notice';   // set before a redirect so the picker flashes its banner
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

  // Resolves { unlocked, code, reason, done, total, definitive } — done/total are Chapter 1 missions.
  // `definitive` is true only when the answer reflects real progress (not the fail-closed fallback
  // or the dev override); the remembered state and the unlock pulse ignore everything else.
  function evaluate() {
    if (devOverride()) return Promise.resolve({ unlocked: true });
    if (!GAME_RELEASED) return Promise.resolve({ unlocked: false, code: 'soon', reason: 'Game — coming soon', definitive: true });

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
        if (M.isChapterComplete(GATE_CHAPTER_ID, all)) return { unlocked: true, definitive: true };
        var res = { unlocked: false, code: 'chapter1', reason: LOCKED_CH1.reason, definitive: true };
        try {
          var inCh = all.filter(function (m) { return m.categoryGroup === GATE_CHAPTER_ID; });
          res.total = inCh.length;
          res.done = inCh.filter(function (m) { return M.getMissionProgress(m) >= 1; }).length;
        } catch (e) { /* progress line is optional */ }
        return res;
      });
    }).catch(function () { return LOCKED_CH1; }); // fail closed
  }

  /* ── Remembered state (kills the unlocked -> locked flash) ────── */
  var PICKER_PAGE = /\/game\.html$/;
  var SESSION_KEY = 'lw_session';           // js/auth.js writes {uid,email,...} here; cleared on sign-out
  var CACHE_PREFIX = 'lw_game_gate:';       // + uid, so accounts sharing a browser never see each other's state

  function sessionUid() {
    try {
      var u = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return u && u.uid ? String(u.uid) : '';
    } catch (e) { return ''; }
  }

  // Best answer available RIGHT NOW without waiting for Firebase, or null if there isn't one.
  function earlyState() {
    if (devOverride()) return { unlocked: true };
    if (!GAME_RELEASED) return { unlocked: false, code: 'soon', reason: 'Game — coming soon' };
    var uid = sessionUid();
    if (!uid) return null;
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CACHE_PREFIX + uid) || 'null'); } catch (e) { /* corrupt entry */ }
    if (!c || typeof c.unlocked !== 'boolean') return null;
    return c.unlocked
      ? { unlocked: true }
      : { unlocked: false, code: 'chapter1', reason: LOCKED_CH1.reason, done: c.done, total: c.total };
  }

  function remember(r) {
    if (!r.definitive || devOverride() || !GAME_RELEASED) return; // only remember a result that was actually read
    var uid = sessionUid();
    if (!uid) return;
    try { localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify({ unlocked: !!r.unlocked, done: r.done, total: r.total })); } catch (e) { /* private mode */ }
  }

  // <html data-game-gate="checking|locked|unlocked"> — css/game.css paints the locked look from it
  // before the body is parsed, so there is no frame that shows playable cards to a locked learner.
  function setGateAttr(v) { document.documentElement.setAttribute('data-game-gate', v); }

  var early = earlyState();
  if (PICKER_PAGE.test(window.location.pathname)) {
    setGateAttr(early ? (early.unlocked ? 'unlocked' : 'locked') : 'checking');
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

  /* ── Picker: banner + locked cards ────────────────────────────── */
  function shake(el) {
    el.classList.remove('lw-shake-invalid');
    void el.offsetWidth; // restart animation on rapid repeat clicks
    el.classList.add('lw-shake-invalid');
    el.addEventListener('animationend', function () { el.classList.remove('lw-shake-invalid'); }, { once: true });
  }

  // Fills and reveals the #game-lock banner that pages/game.html ships hidden.
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

  // A locked card stays visible and readable; it just can't be opened.
  // Safe to call again with a fresher result: it only refreshes what the modal will say.
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
      if (!a.classList.contains('game-mode--locked')) return; // unlocked meanwhile: behave like a normal link
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      shake(a);
      openModal(a.__gateResult);
    };
    a.addEventListener('click', onAttempt);
    a.addEventListener('keydown', onAttempt);
  }

  // Undo lockCard: used when the remembered "locked" turns out to be out of date (e.g. Chapter 1 was just finished).
  function unlockCard(a) {
    if (!a.classList.contains('game-mode--locked')) return;
    a.classList.remove('game-mode--locked');
    if (a.__origHref) a.setAttribute('href', a.__origHref);
    var action = a.querySelector('.game-mode__action');
    if (action && a.__origAction != null) action.innerHTML = a.__origAction;
    ['role', 'aria-disabled', 'aria-haspopup', 'tabindex', 'title', 'aria-describedby'].forEach(function (k) { a.removeAttribute(k); });
  }

  // Makes the picker match result r (idempotent, so it can run on the remembered state and again on the real one).
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

  /* ── Unlock pulse (locked → unlocked) ─────────────────────────── */
  // Callers hand in the answer from the EXISTING rules (evaluate() here, LWMissions.isChapterUnlocked()
  // on Learn); this only remembers what the learner last saw and plays the glow where they can see it.
  //   1. observe(group, states)  -> ids that flipped locked -> unlocked since this account last saw them
  //   2. play(els, {group, ids}) -> waits until els are on screen in a visible tab, glows, THEN records ids as seen
  var FX_KEY = 'lw_unlock_seen_v1';   // + ':' + uid  ->  { <group>: { <id>: true|false } }
  var FX_CLEANUP_MS = 2100;           // animation = 2 beats x 900ms (css/style.css §19b); safety net if animationend never fires
  var FX_SETTLE_MS = 400;             // once on screen, wait this long first: the page is usually still painting in
  var FX_MIN_VISIBLE_PX = 120;        // "on screen" = half the element, or this many px of a very tall one (a chapter row)
  var fxQueued = {};                  // 'group:id' -> elements waiting to glow on THIS page (so a repeat call can't queue it twice)

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
    // If storage is unavailable nothing is remembered, so nothing can fire later either. Never an error.
    try { localStorage.setItem(FX_KEY + ':' + uid, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }
  function fxGroup(store, group) {
    return (store[group] && typeof store[group] === 'object') ? store[group] : (store[group] = {});
  }

  // Already waiting to glow on this page? (Elements that were re-rendered away don't count, so the new ones can take over.)
  function fxIsQueued(k) {
    var els = fxQueued[k];
    if (!els) return false;
    if (!els.length) return true;   // handed out by observe(), play() not called yet
    return els.some(function (el) { return el && el.isConnected !== false; });
  }

  // states: { id: isUnlockedNow }. Returns the ids that flipped locked -> unlocked since this account last saw them.
  // An id never seen before is only recorded, never animated, so a first visit, a new device, a newly added
  // chapter or a signed-out page can't fire. A flipped id is NOT recorded here: play() records it once the
  // learner has really been shown the glow.
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

  // Marks ids as seen (called when their glow starts, or at once under reduced motion).
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

  // Calls cb() once el is in front of the learner: tab visible AND el on screen, for FX_SETTLE_MS in a row.
  // Looking away during the wait (tab switch, scrolling past) restarts it. Gives up if el leaves the page.
  function fxWhenSeen(el, cb) {
    var finished = false, inView = true, timer = null, io = null;
    function onScreen() { return inView && document.visibilityState !== 'hidden'; }
    function stop() {
      finished = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
      if (io) { try { io.disconnect(); } catch (e) { /* ignore */ } }
    }
    function check() {
      if (finished) return;
      clearTimeout(timer);
      if (el.isConnected === false) { stop(); return; }   // the page re-rendered it away
      if (!onScreen()) return;
      timer = setTimeout(function () {
        if (finished || !onScreen()) return;              // looked away during the wait: keep waiting
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
      } catch (e) { io = null; inView = true; }   // no usable observer: tab visibility alone decides
    }
    check();
  }

  // Adds .lw-unlock-pulse, then removes it when the animation ends.
  function fxStart(el) {
    if (fxReducedMotion()) return;
    var timer;
    function done() {
      clearTimeout(timer);
      el.removeEventListener('animationend', onEnd);
      el.classList.remove('lw-unlock-pulse');
    }
    function onEnd(e) { if (e.target === el) done(); }   // ignore animations bubbling up from children
    el.classList.remove('lw-unlock-pulse');
    void el.offsetWidth;                                  // restart cleanly if one is somehow still running
    el.classList.add('lw-unlock-pulse');
    el.addEventListener('animationend', onEnd);
    timer = setTimeout(done, FX_CLEANUP_MS);
  }

  // els: elements to glow. opts: { group, ids } = what to record as seen once the glow starts on the first of them.
  // Under reduced motion there is nothing to wait for or show: the change is simply recorded.
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
    // Only trust a real answer: the fail-closed fallback and the dev override say nothing about what
    // the learner earned, so they neither fire nor get recorded. No sidebar link = nothing to pulse,
    // and recording here would use up the transition before the learner could see it.
    if (!links.length || !r.definitive) return;
    try {
      if (fxObserve('game', { game: !!r.unlocked }).length) fxPlay(links, { group: 'game', ids: ['game'] });
    } catch (e) { /* cosmetic only — must never get in the way of the lock */ }
  }

  /* ── Start-up ─────────────────────────────────────────────────── */
  function init() {
    var links = document.querySelectorAll('.app-sidebar a[href$="game.html"]'); // never locked; only pulsed
    var onPicker = !!document.getElementById('game-lock');
    var onGamePage = GAME_PAGES.test(window.location.pathname);
    if (!onPicker && !onGamePage && !links.length) return; // no Game link, no picker, not a game: nothing to do

    var notice = false;
    try { notice = sessionStorage.getItem(NOTICE_KEY) === '1'; } catch (e) { /* ignore */ }

    // Paint what we already know right away (no waiting on Firebase).
    if (onPicker && early) applyPicker(early);

    evaluate().then(function (r) {
      remember(r);
      if (r.unlocked) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) { /* ignore */ }
        if (onPicker) applyPicker(r);
        pulseIfNewlyUnlocked(links, r);   // locked -> unlocked since the learner last saw it
        return;
      }
      pulseIfNewlyUnlocked(links, r);     // records "locked" so the next unlock is a real transition
      if (onGamePage) {
        try { sessionStorage.setItem(NOTICE_KEY, '1'); } catch (e) { /* ignore */ }
        window.location.replace(PICKER_URL);
        return;
      }
      if (!onPicker) return; // any other page: just the check above (remember + pulse bookkeeping)
      // Picker: stay on the page, show why, lock the cards (refreshes the progress numbers if already shown).
      var banner = applyPicker(r);
      if (notice) {
        try { sessionStorage.removeItem(NOTICE_KEY); } catch (e) { /* ignore */ }
        if (banner) { // arrived here because a game page was blocked: draw the eye to the banner
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