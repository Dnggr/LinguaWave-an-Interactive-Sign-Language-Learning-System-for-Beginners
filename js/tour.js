(function () {
  'use strict';

  if (window.LWTour) return;

  var SEEN_KEY = 'lw_tour_seen_v1';
  var LEGACY_PREFS_KEY = 'lw-preferences';
  var ALL_KEY = '__all__';
  var SKIPS_BEFORE_SKIP_ALL = 2;
  var MOBILE_QUERY = '(max-width: 560px)';
  var READY_TIMEOUT_MS = 5000;
  var POLL_MS = 100;
  var SETTLE_MS = 600;
  var AUTH_TIMEOUT_MS = 2500;
  var ALIGN_MS = 350;
  var NOTE_MS = 4200;
  var SPOT_PAD = 8;
  var POP_GAP = 14;
  var VIEW_MARGIN = 12;
  var DEFAULT_ORDER = ['bottom', 'top', 'right', 'left'];
  var SKIP_NOTE = 'Guide skipped. You can replay all guides from Settings.';
  var SKIP_ALL_NOTE = 'All guides skipped. You can replay them any time from Settings.';

  var active = null;
  var starting = false;
  var timers = new Set();
  var noteTimer = 0;
  var noteEl = null;

  function later(fn, ms) {
    var id = setTimeout(function () { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }
  function cancelTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers.clear();
  }

  function currentUid() {
    try { return (window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser() || {}).uid || null; }
    catch (e) { return null; }
  }
  function userKey(uid) { return uid || 'guest'; }

  function readSeenStore() {
    try {
      var raw = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null');
      if (raw && typeof raw === 'object' && raw.users && typeof raw.users === 'object') return raw;
    } catch (e) {  }
    return { users: {} };
  }
  function writeSeenStore(store) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(store)); }
    catch (e) { console.warn('[tour.js] could not save guide progress:', e); }
  }
  function accountRecord(uid) {
    return readSeenStore().users[userKey(uid === undefined ? currentUid() : uid)] || {};
  }
  function hasSeen(id, uid) {
    var mine = accountRecord(uid);
    return !!(mine[ALL_KEY] || mine[id]);
  }
  function skippedCount(uid) {
    var mine = accountRecord(uid);
    return Object.keys(mine).filter(function (k) {
      return k !== ALL_KEY && mine[k] && mine[k].status === 'skipped';
    }).length;
  }
  function markSeen(id, uid, status) {
    var store = readSeenStore();
    var k = userKey(uid);
    store.users[k] = store.users[k] || {};
    var prev = store.users[k][id];
    if (prev && prev.status === 'skipped' && (status === 'done' || status === 'closed')) return;
    store.users[k][id] = { status: status, at: Date.now() };
    writeSeenStore(store);
  }
  function markAllDismissed(uid) {
    var store = readSeenStore();
    var k = userKey(uid);
    store.users[k] = store.users[k] || {};
    store.users[k][ALL_KEY] = { status: 'dismissed', at: Date.now() };
    writeSeenStore(store);
  }
  function reset(id) {
    if (!id) takeLegacySwitch();
    var store = readSeenStore();
    var k = userKey(currentUid());
    if (store.users[k]) {
      if (id) { delete store.users[k][id]; delete store.users[k][ALL_KEY]; }
      else store.users[k] = {};
      writeSeenStore(store);
    }
  }

  function takeLegacySwitch() {
    var prefs;
    try { prefs = JSON.parse(localStorage.getItem(LEGACY_PREFS_KEY) || 'null'); }
    catch (e) { return false; }
    if (!prefs || typeof prefs !== 'object' || !('showGuides' in prefs)) return false;
    var wasOff = prefs.showGuides === false;
    delete prefs.showGuides;
    try { localStorage.setItem(LEGACY_PREFS_KEY, JSON.stringify(prefs)); }
    catch (e) { console.warn('[tour.js] could not retire the old guides setting:', e); }
    return wasOff;
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lw-force-reduced-motion');
    } catch (e) { return false; }
  }

  function isMobile() { return window.matchMedia(MOBILE_QUERY).matches; }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), Math.max(min, max)); }

  function guides() { return window.LWTourGuides || {}; }

  function queryTarget(step) {
    if (!step.target) return null;
    try { return document.querySelector(step.target); } catch (e) { return null; }
  }

  function targetRect(step) {
    var el = queryTarget(step);
    if (!el || !el.isConnected) return null;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;

    var top = Infinity, left = Infinity, bottom = -Infinity, right = -Infinity;
    var boxes = step.fit === 'children' ? Array.prototype.slice.call(el.children) : [el];
    boxes.forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      top = Math.min(top, r.top); left = Math.min(left, r.left);
      bottom = Math.max(bottom, r.bottom); right = Math.max(right, r.right);
    });
    if (!isFinite(top)) {
      if (step.fit !== 'children') return null;
      var own = el.getBoundingClientRect();
      if (own.width < 1 || own.height < 1) return null;
      top = own.top; left = own.left; bottom = own.bottom; right = own.right;
    }
    return { top: top, left: left, bottom: bottom, right: right, el: el };
  }

  function radiusFor(el) {
    var px = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.min(Math.max(px + SPOT_PAD, 10), 26);
  }

  function isFixed(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return true;
    }
    return false;
  }

  function stickyTopOffset() {
    var nav = document.querySelector('.navbar');
    return nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
  }

  function waitForTargets(steps, timeout) {
    return new Promise(function (resolve) {
      var began = Date.now();
      (function check() {
        var missing = steps.some(function (s) { return s.target && !s.optional && !targetRect(s); });
        if (!missing || Date.now() - began >= timeout) return resolve();
        later(check, POLL_MS);
      })();
    });
  }

  function authReady() {
    return new Promise(function (resolve) {
      var p = null;
      try { p = window.LWAuth && window.LWAuth.whenAuthReady && window.LWAuth.whenAuthReady(); } catch (e) {  }
      if (!p || typeof p.then !== 'function') return resolve();
      var done = false;
      function finish() { if (!done) { done = true; resolve(); } }
      p.then(finish, finish);
      later(finish, AUTH_TIMEOUT_MS);
    });
  }

  function whenVisible() {
    return new Promise(function (resolve) {
      if (!document.hidden) return resolve();
      function onChange() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onChange);
        resolve();
      }
      document.addEventListener('visibilitychange', onChange);
    });
  }

  function buildDom(guideId, count, skipAll, reminder) {
    if (reminder) return buildReminderDom(guideId);
    var segs = '';
    for (var i = 0; i < count; i++) segs += '<span class="lw-tour__seg"></span>';

    var root = document.createElement('div');
    root.className = 'lw-tour';
    root.setAttribute('data-lw-tour', guideId);
    root.innerHTML =
      '<div class="lw-tour__shield" aria-hidden="true"></div>' +
      '<div class="lw-tour__spot" aria-hidden="true"></div>' +
      '<div class="lw-tour__pop" role="dialog" aria-modal="true"' +
      ' aria-labelledby="lw-tour-title" aria-describedby="lw-tour-body">' +
        '<div class="lw-tour__bar">' +
          '<div class="lw-tour__steps" role="progressbar" aria-label="Guide progress"' +
          ' aria-valuemin="1" aria-valuemax="' + count + '">' + segs + '</div>' +
          '<button type="button" class="lw-tour__link" data-tour-back hidden>Back</button>' +
          '<button type="button" class="lw-tour__link" data-tour-skip' +
          (skipAll
            ? ' aria-label="Skip all guides" title="Dismiss every guide. Replay them from Settings.">Skip all'
            : ' aria-label="Skip this guide">Skip') + '</button>' +
          '<button type="button" class="btn btn--primary lw-tour__next" data-tour-next>Next</button>' +
        '</div>' +
        '<div class="lw-tour__text" aria-live="polite">' +
          '<div class="lw-tour__title" id="lw-tour-title"></div>' +
          '<div class="lw-tour__body" id="lw-tour-body"></div>' +
        '</div>' +
      '</div>';
    return root;
  }

  function buildReminderDom(guideId) {
    var root = document.createElement('div');
    root.className = 'lw-tour lw-tour--reminder';
    root.setAttribute('data-lw-tour', guideId);
    root.innerHTML =
      '<div class="lw-tour__shield" aria-hidden="true"></div>' +
      '<div class="lw-tour__spot" aria-hidden="true"></div>' +
      '<div class="lw-tour__pop lw-tour__pop--reminder" role="dialog" aria-modal="true"' +
      ' aria-labelledby="lw-tour-title" aria-describedby="lw-tour-body">' +
        '<div class="lw-tour__text" aria-live="polite">' +
          '<div class="lw-tour__title" id="lw-tour-title"></div>' +
          '<div class="lw-tour__body" id="lw-tour-body"></div>' +
        '</div>' +
        '<div class="lw-tour__foot">' +
          '<button type="button" class="btn btn--primary lw-tour__next" data-tour-next></button>' +
        '</div>' +
      '</div>';
    return root;
  }

  function place(animate) {
    var a = active;
    if (!a) return;
    var step = a.steps[a.index];
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var t = targetRect(step);

    var spot = null;
    if (t) {
      var l = Math.max(t.left - SPOT_PAD, 4);
      var tp = Math.max(t.top - SPOT_PAD, 4);
      var r = Math.min(t.right + SPOT_PAD, vw - 4);
      var b = Math.min(t.bottom + SPOT_PAD, vh - 4);
      if (r - l > 8 && b - tp > 8) {
        spot = { left: l, top: tp, width: r - l, height: b - tp, radius: radiusFor(t.el) };
      }
    }

    var pw = a.pop.offsetWidth;
    var ph = a.pop.offsetHeight;
    var M = VIEW_MARGIN;
    var pl, pt;

    if (!spot) {
      pl = (vw - pw) / 2;
      pt = (vh - ph) / 2;
    } else if (isMobile()) {
      pl = (vw - pw) / 2;
      pt = vh - ph - M;
    } else {
      var cx = spot.left + spot.width / 2;
      var cy = spot.top + spot.height / 2;
      var sides = {
        bottom: { top: spot.top + spot.height + POP_GAP, left: clamp(cx - pw / 2, M, vw - pw - M) },
        top:    { top: spot.top - POP_GAP - ph,          left: clamp(cx - pw / 2, M, vw - pw - M) },
        right:  { left: spot.left + spot.width + POP_GAP, top: clamp(cy - ph / 2, M, vh - ph - M) },
        left:   { left: spot.left - POP_GAP - pw,         top: clamp(cy - ph / 2, M, vh - ph - M) }
      };
      var order = step.placement
        ? [step.placement].concat(DEFAULT_ORDER.filter(function (s) { return s !== step.placement; }))
        : DEFAULT_ORDER;
      var pick = null;
      for (var i = 0; i < order.length && !pick; i++) {
        var c = sides[order[i]];
        if (c && c.top >= M && c.left >= M && c.top + ph <= vh - M && c.left + pw <= vw - M) pick = c;
      }
      if (!pick) pick = { left: clamp((vw - pw) / 2, M, vw - pw - M), top: vh - ph - M };
      pl = pick.left;
      pt = pick.top;
    }

    pl = Math.round(pl);
    pt = Math.round(pt);
    var sig = spot
      ? [spot.left, spot.top, spot.width, spot.height, pl, pt, ph].map(Math.round).join(',')
      : 'c,' + [vw, vh, pl, pt, ph].join(',');
    if (!animate && sig === a.sig) return;
    a.sig = sig;

    if (!animate) a.root.classList.add('lw-tour--instant');
    a.root.classList.toggle('lw-tour--centered', !spot);

    var s = a.spot.style;
    if (spot) {
      s.left = Math.round(spot.left) + 'px';
      s.top = Math.round(spot.top) + 'px';
      s.width = Math.round(spot.width) + 'px';
      s.height = Math.round(spot.height) + 'px';
      s.borderRadius = spot.radius + 'px';
    } else {
      s.left = Math.round(vw / 2) + 'px';
      s.top = Math.round(vh / 2) + 'px';
      s.width = '0px';
      s.height = '0px';
      s.borderRadius = '0px';
    }
    a.pop.style.left = pl + 'px';
    a.pop.style.top = pt + 'px';

    if (!animate) {
      void a.root.offsetWidth;
      a.root.classList.remove('lw-tour--instant');
    }
  }

  function ensureVisible(step) {
    var t = targetRect(step);
    if (!t || isFixed(t.el)) return;
    var vh = window.innerHeight;
    var topLimit = stickyTopOffset() + VIEW_MARGIN;
    var bottomLimit = isMobile() ? vh - active.pop.offsetHeight - VIEW_MARGIN * 2 : vh - VIEW_MARGIN;
    var top = t.top - SPOT_PAD;
    var bottom = t.bottom + SPOT_PAD;
    var delta = 0;
    if (top < topLimit) delta = top - topLimit;
    else if (bottom > bottomLimit) delta = Math.min(bottom - bottomLimit, top - topLimit);
    if (Math.abs(delta) > 1) {
      try { window.scrollBy({ top: delta, left: 0, behavior: 'instant' }); }
      catch (e) { window.scrollBy(0, delta); }
    }
  }

  function showStep(i, first) {
    var a = active;
    if (!a) return;
    a.index = i;
    var step = a.steps[i];
    var last = i === a.steps.length - 1;

    setTitle(a.titleEl, step);
    a.bodyEl.textContent = step.body || '';
    a.textEl.classList.remove('is-in');
    void a.textEl.offsetWidth;
    a.textEl.classList.add('is-in');

    if (!a.reminder) {
      a.segs.forEach(function (seg, n) {
        seg.classList.toggle('is-done', n < i);
        seg.classList.toggle('is-current', n === i);
      });
      a.progress.setAttribute('aria-valuenow', String(i + 1));
      a.progress.setAttribute('aria-valuetext', 'Step ' + (i + 1) + ' of ' + a.steps.length);

      a.backBtn.hidden = i === 0;
      a.nextBtn.textContent = last ? 'Done' : 'Next';
    }

    ensureVisible(step);
    place(!first);
  }

  function setTitle(el, step) {
    el.textContent = '';
    var icons = window.LWIcons;
    if (step.icon && icons && typeof icons.markup === 'function') {
      var holder = document.createElement('span');
      holder.className = 'lw-tour__title-icon';
      holder.setAttribute('aria-hidden', 'true');
      try { holder.innerHTML = icons.markup(step.icon, { size: 'sm' }); } catch (e) { holder = null; }
      if (holder) el.appendChild(holder);
    }
    el.appendChild(document.createTextNode(step.title || ''));
  }

  function next() {
    if (!active) return;
    if (active.index >= active.steps.length - 1) finish('done'); else showStep(active.index + 1);
  }
  function back() {
    if (active && active.index > 0) showStep(active.index - 1);
  }

  function onKeydown(e) {
    var a = active;
    if (!a) return;
    if (e.key === 'Escape' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') skip();
      else if (a.reminder) return;
      else if (e.key === 'ArrowRight') next();
      else back();
      return;
    }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.slice.call(a.pop.querySelectorAll('button')).filter(function (b) { return !b.hidden; });
    if (!f.length) return;
    var here = document.activeElement;
    if (!a.pop.contains(here)) { e.preventDefault(); f[0].focus(); }
    else if (e.shiftKey && here === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && here === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function onReposition() { place(false); }
  function onPageHide() { if (active) finish('closed', true); }

  function open(guideId, steps, opts) {
    removeNote();
    var uid = currentUid();
    var manual = !!(opts && opts.manual);
    var reminder = !!(opts && opts.reminder);
    var skipAll = !manual && !reminder && skippedCount(uid) >= SKIPS_BEFORE_SKIP_ALL;
    var root = buildDom(guideId, steps.length, skipAll, reminder);
    var pop = root.querySelector('.lw-tour__pop');

    active = {
      guideId: guideId,
      steps: steps,
      index: 0,
      uid: uid,
      manual: manual,
      reminder: reminder,
      skipAll: skipAll,
      opener: document.activeElement,
      root: root,
      pop: pop,
      spot: root.querySelector('.lw-tour__spot'),
      textEl: root.querySelector('.lw-tour__text'),
      titleEl: root.querySelector('#lw-tour-title'),
      bodyEl: root.querySelector('#lw-tour-body'),
      progress: root.querySelector('.lw-tour__steps'),
      segs: Array.prototype.slice.call(root.querySelectorAll('.lw-tour__seg')),
      backBtn: root.querySelector('[data-tour-back]'),
      nextBtn: root.querySelector('[data-tour-next]'),
      sig: '',
      alignTimer: 0,
      raf: 0
    };

    if (reminder) {
      active.nextBtn.textContent = (opts && opts.buttonLabel) || 'Got it';
    } else {
      root.querySelector('[data-tour-skip]').addEventListener('click', skip);
      active.backBtn.addEventListener('click', back);
    }
    active.nextBtn.addEventListener('click', next);

    document.body.appendChild(root);
    window.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('pagehide', onPageHide);
    active.alignTimer = setInterval(function () { place(false); }, ALIGN_MS);

    showStep(0, true);
    active.raf = requestAnimationFrame(function () {
      if (!active) return;
      active.root.classList.add('is-open');
      active.nextBtn.focus({ preventScroll: true });
    });
  }

  function teardown() {
    var a = active;
    active = null;
    if (!a) return;
    clearInterval(a.alignTimer);
    cancelAnimationFrame(a.raf);
    cancelTimers();
    window.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', onReposition);
    window.removeEventListener('scroll', onReposition, true);
    window.removeEventListener('pagehide', onPageHide);
    a.root.remove();
    return a;
  }

  function skip() {
    if (!active) return;
    if (active.reminder) { finish('done'); return; }
    finish(active.skipAll ? 'dismissed' : 'skipped');
  }

  function finish(status, silent) {
    var a = teardown();
    if (!a) return;
    if (a.reminder) {
      var ro = a.opener;
      if (ro && ro !== document.body && ro.isConnected && ro.focus) ro.focus({ preventScroll: true });
      try {
        document.dispatchEvent(new CustomEvent('lwtour:reminder-end', { detail: { id: a.guideId.replace(/^reminder:/, '') } }));
      } catch (e) {  }
      return;
    }
    markSeen(a.guideId, a.uid, status === 'skipped' && a.manual ? 'closed' : status);
    if (status === 'dismissed') markAllDismissed(a.uid);

    var o = a.opener;
    if (o && o !== document.body && o.isConnected && o.focus) o.focus({ preventScroll: true });

    if (!silent && !a.manual) {
      if (status === 'skipped') showNote(SKIP_NOTE);
      else if (status === 'dismissed') showNote(SKIP_ALL_NOTE);
    }
    try {
      document.dispatchEvent(new CustomEvent('lwtour:end', { detail: { guideId: a.guideId, status: status } }));
    } catch (e) {  }
  }

  function removeNote() {
    clearTimeout(noteTimer);
    if (noteEl) { noteEl.remove(); noteEl = null; }
  }
  function showNote(text) {
    removeNote();
    noteEl = document.createElement('div');
    noteEl.className = 'lw-tour-note';
    noteEl.setAttribute('role', 'status');
    noteEl.textContent = text;
    document.body.appendChild(noteEl);
    var el = noteEl;
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    noteTimer = setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { if (noteEl === el) removeNote(); }, 300);
    }, NOTE_MS);
  }

  function start(guideId, opts) {
    var guide = guides()[guideId];
    if (active || starting || !guide || !Array.isArray(guide.steps) || !guide.steps.length) {
      return Promise.resolve(false);
    }
    starting = true;
    return waitForTargets(guide.steps, READY_TIMEOUT_MS).then(function () {
      if (active) return false;
      var steps = guide.steps.filter(function (s) { return !s.target || targetRect(s); });
      if (!steps.length) return false;
      open(guideId, steps, opts);
      return true;
    }).then(function (ok) { starting = false; return ok; },
            function (err) { starting = false; console.warn('[tour.js] guide failed to start:', err); return false; });
  }

  function stop() { if (active) finish('closed', true); }

  function remind(reminder) {
    if (active || starting || !reminder || !reminder.title) return false;
    var step = {
      target: reminder.target,
      title: reminder.title,
      body: reminder.body,
      placement: reminder.placement,
      icon: reminder.icon
    };
    open('reminder:' + (reminder.id || 'reminder'), [step], { reminder: true, buttonLabel: reminder.buttonLabel });
    return true;
  }

  function autoStart() {
    var id = document.body && document.body.dataset ? document.body.dataset.tour : '';
    if (!id || !guides()[id]) return;

    var params = new URLSearchParams(location.search);
    var forced = params.get('tour') === '1';
    if (forced && window.history && history.replaceState) {
      params.delete('tour');
      var qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    authReady().then(function () {
      var uid = currentUid();
      if (window.LWAuth && !uid && !forced) return;
      if (takeLegacySwitch()) markAllDismissed(uid);
      if (!forced && hasSeen(id, uid)) return;
      return whenVisible().then(function () {
        later(function () { start(id, { auto: true }); }, SETTLE_MS);
      });
    });
  }

  window.LWTour = {
    start: start,
    stop: stop,
    isActive: function () { return !!active; },
    isBusy: function () { return !!active || starting; },
    remind: remind,
    hasGuide: function (id) { return !!guides()[id]; },
    hasSeen: function (id) { return hasSeen(id); },
    reset: reset,
    resetAll: function () { reset(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoStart);
  else autoStart();
})();
