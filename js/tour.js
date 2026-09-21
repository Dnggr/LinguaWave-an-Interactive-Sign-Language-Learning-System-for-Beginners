/**
 * js/tour.js: guided tour / hint popups engine                 (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Walks a learner through a page one hint at a time. Each
 *            hint is a small card with Back / Skip / Next, a row of
 *            progress segments, and (usually) a spotlight on the part
 *            of the page it is talking about. What each guide says
 *            lives in js/tour-guides.js; how it looks lives in
 *            css/tour.css. This file only decides WHEN to show a guide
 *            and HOW to drive it.
 *
 * WIRING   : A page opts in with `<body data-tour="dashboard">` and
 *            loads css/tour.css, js/tour-guides.js, then this file.
 *            Nothing else is needed. The engine auto-starts the
 *            page's guide the FIRST time a learner opens the page,
 *            unless that guide was already finished or skipped, or the
 *            learner chose "Skip all". It adds no button of its own to
 *            the page: the only in-app way to see guides again is
 *            "Replay all guides" in Settings.
 *
 * SKIP     : Every card has a Skip button. Pressed on its own it
 *            closes just THIS page's guide and remembers that, so the
 *            other pages' guides still play on their first visit.
 *            Once the learner has skipped SKIPS_BEFORE_SKIP_ALL (2)
 *            guides, the button reads "Skip all" on every guide from
 *            the third one on, and pressing it dismisses the whole
 *            tour: every guide, on every page, for this account,
 *            including guides added later. Esc does whatever the
 *            button on screen does.
 *            A guide opened on request with start(id, {manual: true})
 *            (no button in the UI does this today) always shows plain
 *            "Skip", and skipping it counts toward nothing.
 *
 * REPLAY   : Nothing switches guides off except Skip all, and nothing
 *            can block a replay. resetAll() (the "Replay all guides"
 *            button in Settings) forgets every guide and any Skip all,
 *            so the whole tour plays again from the next page visit.
 *            `?tour=1` in a page's URL, and start(id, {manual: true}),
 *            start a guide regardless of what was seen or skipped.
 *
 * STATE    : One localStorage key, device-local (there is no
 *            server-side store for UI hints in this repo, same tier
 *            as the theme and js/settings-page.js preferences):
 *              lw_tour_seen_v1   { users: { <uid|'guest'>: { <guideId>:
 *                                { status, at }, __all__: { status, at } } } }
 *                                Keyed by uid so two accounts on one
 *                                device each get their own tour.
 *                                status: 'done'; 'skipped' (Skip was
 *                                pressed on an automatic guide: these
 *                                are what the "Skip all" threshold
 *                                counts); 'dismissed'; or 'closed'
 *                                (ended without a choice: page left
 *                                mid-guide, stop(), or Skip on a guide
 *                                the learner opened themselves).
 *                                `__all__` is the Skip-all flag.
 *            The old Settings switch (lw-preferences.showGuides) no
 *            longer exists and nothing reads it as a setting. A device
 *            that had left it off is honoured once, as Skip all, and
 *            the field is deleted (takeLegacySwitch()).
 *
 * PUBLIC API (window.LWTour)
 *   start(id, {manual})   run a guide now; resolves true if it opened
 *   stop()                close the open guide (recorded as closed)
 *   isActive()            is a guide open right now
 *   hasGuide(id)          is there a guide with this id
 *   hasSeen(id)           finished, skipped or dismissed by the current
 *                         account (a Skip all counts for every guide)
 *   reset(id)             forget one guide (also lifts a Skip all)
 *   resetAll()            forget everything: the "Replay all guides" action
 *   Fires `lwtour:end` on document with {guideId, status}, status being
 *   'done' | 'skipped' | 'dismissed' | 'closed'.
 *   `?tour=1` in a page's URL forces its guide to start (handy for
 *   demos and support); the param is removed from the address bar.
 *
 * DESIGN NOTES (non-obvious, kept for whoever edits this next)
 *   - Targets are re-queried by selector on every reposition, never
 *     held as element references. Several pages re-render their
 *     containers with innerHTML after Firestore sync, which would
 *     leave a held node detached and the spotlight pointing at
 *     nothing.
 *   - A 350ms "keep aligned" loop repositions the card in addition to
 *     scroll/resize handlers, because layout also shifts with no
 *     event at all (late-loading fonts and images, a sync repaint).
 *     It writes styles only when the geometry actually changed.
 *   - Scrolling to a target is instant, not smooth: the card picks a
 *     side from the target's final position, and a smooth scroll made
 *     it flip sides mid-way. The spotlight/card still glide (CSS).
 *   - ArrowLeft/ArrowRight/Escape are swallowed in the CAPTURE phase
 *     while a guide is open. js/lesson.js binds document-level arrow
 *     keys that step the lesson; without this they would fire behind
 *     the card.
 *   - Every timer/interval/rAF id is tracked and cleared in
 *     teardown(), per AGENTS.md's timer-safety rule. A page hide
 *     mid-guide records it as 'closed' so it doesn't nag on return,
 *     but 'closed' is not a skip: reloading a page must not push the
 *     learner toward "Skip all".
 *   - The skip count is derived from the stored statuses rather than
 *     kept as its own counter, so it can never drift from what the
 *     store says, and "Replay all guides" resets it for free.
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  if (window.LWTour) return; // a page that loads this twice keeps the first

  /* ── Config ────────────────────────────────────────────────────── */
  var SEEN_KEY = 'lw_tour_seen_v1';
  var LEGACY_PREFS_KEY = 'lw-preferences'; // only touched to retire the old showGuides switch
  var ALL_KEY = '__all__';                // the "Skip all" flag inside one account's record
  var SKIPS_BEFORE_SKIP_ALL = 2;          // guides skipped before the button reads "Skip all"
  var MOBILE_QUERY = '(max-width: 560px)';
  var READY_TIMEOUT_MS = 5000;            // how long to wait for a page to render its targets
  var POLL_MS = 100;
  var SETTLE_MS = 600;                    // let first paint / sync repaint calm down
  var AUTH_TIMEOUT_MS = 2500;
  var ALIGN_MS = 350;
  var NOTE_MS = 4200;
  var SPOT_PAD = 8;                       // breathing room around the target
  var POP_GAP = 14;                       // target-to-card distance
  var VIEW_MARGIN = 12;                   // card-to-screen-edge distance
  var DEFAULT_ORDER = ['bottom', 'top', 'right', 'left'];
  var SKIP_NOTE = 'Guide skipped. You can replay all guides from Settings.';
  var SKIP_ALL_NOTE = 'All guides skipped. You can replay them any time from Settings.';

  /* ── State ─────────────────────────────────────────────────────── */
  var active = null;      // the open guide, or null
  var starting = false;   // a start() is waiting for the page to render
  var timers = new Set(); // every pending setTimeout id (cleared in teardown)
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

  /* ── Storage ───────────────────────────────────────────────────── */
  function currentUid() {
    try { return (window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser() || {}).uid || null; }
    catch (e) { return null; }
  }
  function userKey(uid) { return uid || 'guest'; }

  function readSeenStore() {
    try {
      var raw = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null');
      if (raw && typeof raw === 'object' && raw.users && typeof raw.users === 'object') return raw;
    } catch (e) { /* fall through to an empty store */ }
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
  // How many guides this account skipped with the Skip button. Only
  // status 'skipped' counts: finishing a guide, leaving the page
  // mid-guide and skipping a guide the learner opened themselves are
  // all recorded differently on purpose (see finish()).
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
    // A skip is history: replaying that guide on request and finishing
    // (or closing) it must not lower the count that turns the button
    // into "Skip all".
    var prev = store.users[k][id];
    if (prev && prev.status === 'skipped' && (status === 'done' || status === 'closed')) return;
    store.users[k][id] = { status: status, at: Date.now() };
    writeSeenStore(store);
  }
  // "Skip all": one flag for the whole account rather than a status
  // per known guide, so a guide added next month stays dismissed too.
  function markAllDismissed(uid) {
    var store = readSeenStore();
    var k = userKey(uid);
    store.users[k] = store.users[k] || {};
    store.users[k][ALL_KEY] = { status: 'dismissed', at: Date.now() };
    writeSeenStore(store);
  }
  function reset(id) {
    // A replay must never be undone by a stale switch, so a full reset
    // also discards the old showGuides field (see takeLegacySwitch).
    if (!id) takeLegacySwitch();
    var store = readSeenStore();
    var k = userKey(currentUid());
    if (store.users[k]) {
      if (id) { delete store.users[k][id]; delete store.users[k][ALL_KEY]; }
      else store.users[k] = {};
      writeSeenStore(store);
    }
  }

  // The old global "Guide popups" switch lived at lw-preferences.showGuides
  // and is gone. Left alone, a device that had it off would keep every
  // guide silent with no switch to turn back on, and "Replay all guides"
  // would look broken. So: delete the field, and report whether it was
  // off so the caller can honour that once, as Skip all.
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

  /* ── Geometry ──────────────────────────────────────────────────── */
  function isMobile() { return window.matchMedia(MOBILE_QUERY).matches; }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), Math.max(min, max)); }

  function guides() { return window.LWTourGuides || {}; }

  function queryTarget(step) {
    if (!step.target) return null;
    try { return document.querySelector(step.target); } catch (e) { return null; }
  }

  // The on-screen box of a step's target, or null when there is no
  // target / it isn't rendered (display:none, zero size, detached).
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
      var own = el.getBoundingClientRect();           // no visible children: use its own box
      if (own.width < 1 || own.height < 1) return null;
      top = own.top; left = own.left; bottom = own.bottom; right = own.right;
    }
    return { top: top, left: left, bottom: bottom, right: right, el: el };
  }

  function radiusFor(el) {
    var px = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.min(Math.max(px + SPOT_PAD, 10), 26);
  }

  // A fixed element never moves when the window scrolls, so scrolling
  // toward it is pointless. (Sticky is deliberately NOT treated the
  // same: camera-practice's .camera-panel is sticky on desktop but
  // sits in normal flow once the layout stacks on a phone, where its
  // children still need scrolling into view.)
  function isFixed(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return true;
    }
    return false;
  }

  // Height of a sticky top bar (camera-practice's .navbar) so a target
  // is never scrolled to sit underneath it.
  function stickyTopOffset() {
    var nav = document.querySelector('.navbar');
    return nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
  }

  /* ── Waiting for the page ──────────────────────────────────────── */
  // Pages here render into containers after load (and again after a
  // Firestore sync), so a guide waits until its required targets exist.
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
      try { p = window.LWAuth && window.LWAuth.whenAuthReady && window.LWAuth.whenAuthReady(); } catch (e) { /* ignore */ }
      if (!p || typeof p.then !== 'function') return resolve();
      var done = false;
      function finish() { if (!done) { done = true; resolve(); } }
      p.then(finish, finish);
      later(finish, AUTH_TIMEOUT_MS); // never let a slow auth hold the page's guide hostage
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

  /* ── DOM ───────────────────────────────────────────────────────── */
  function buildDom(guideId, count, skipAll) {
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

  /* ── Placement ─────────────────────────────────────────────────── */
  // Position the spotlight and the card for the current step.
  // `animate` false = jump (first paint, scroll, resize, realign).
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

    if (!spot) {                                   // welcome card: dead centre
      pl = (vw - pw) / 2;
      pt = (vh - ph) / 2;
    } else if (isMobile()) {                       // phones: dock at the bottom
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
      // A target too big to sit beside (a whole column): dock the card
      // at the bottom of the screen, over the spotlight.
      if (!pick) pick = { left: clamp((vw - pw) / 2, M, vw - pw - M), top: vh - ph - M };
      pl = pick.left;
      pt = pick.top;
    }

    pl = Math.round(pl);
    pt = Math.round(pt);
    var sig = spot
      ? [spot.left, spot.top, spot.width, spot.height, pl, pt, ph].map(Math.round).join(',')
      : 'c,' + [vw, vh, pl, pt, ph].join(',');
    if (!animate && sig === a.sig) return;          // nothing moved: skip the style writes
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
      void a.root.offsetWidth;                      // commit the jump before transitions come back
      a.root.classList.remove('lw-tour--instant');
    }
  }

  // Bring the target into view (window scroll only, never a nested
  // scroller) leaving room for a sticky navbar and, on phones, the
  // docked card.
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
      // 'instant', not 'auto': css/style.css sets `scroll-behavior:
      // smooth` on the page, and 'auto' would defer to it, leaving the
      // target off-screen while the card is placed.
      try { window.scrollBy({ top: delta, left: 0, behavior: 'instant' }); }
      catch (e) { window.scrollBy(0, delta); }
    }
  }

  /* ── Steps ─────────────────────────────────────────────────────── */
  function showStep(i, first) {
    var a = active;
    if (!a) return;
    a.index = i;
    var step = a.steps[i];
    var last = i === a.steps.length - 1;

    a.titleEl.textContent = step.title || '';
    a.bodyEl.textContent = step.body || '';
    a.textEl.classList.remove('is-in');
    void a.textEl.offsetWidth;                      // restart the fade-in
    a.textEl.classList.add('is-in');

    a.segs.forEach(function (seg, n) {
      seg.classList.toggle('is-done', n < i);
      seg.classList.toggle('is-current', n === i);
    });
    a.progress.setAttribute('aria-valuenow', String(i + 1));
    a.progress.setAttribute('aria-valuetext', 'Step ' + (i + 1) + ' of ' + a.steps.length);

    a.backBtn.hidden = i === 0;
    a.nextBtn.textContent = last ? 'Done' : 'Next';

    ensureVisible(step);
    place(!first);
  }

  function next() {
    if (!active) return;
    if (active.index >= active.steps.length - 1) finish('done'); else showStep(active.index + 1);
  }
  function back() {
    if (active && active.index > 0) showStep(active.index - 1);
  }

  /* ── Open / close ──────────────────────────────────────────────── */
  function onKeydown(e) {
    var a = active;
    if (!a) return;
    if (e.key === 'Escape' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // Capture phase + stopPropagation: keeps js/lesson.js's own
      // document-level arrow-key listener from stepping the lesson.
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') skip();
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
    // The label is decided once, when the guide opens: the count only
    // changes when a guide ends, so it can't go stale mid-guide.
    var skipAll = !manual && skippedCount(uid) >= SKIPS_BEFORE_SKIP_ALL;
    var root = buildDom(guideId, steps.length, skipAll);
    var pop = root.querySelector('.lw-tour__pop');

    active = {
      guideId: guideId,
      steps: steps,
      index: 0,
      uid: uid,
      manual: manual,
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

    root.querySelector('[data-tour-skip]').addEventListener('click', skip);
    active.backBtn.addEventListener('click', back);
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

  // The Skip button and Esc. What it does depends on the label the
  // learner is looking at: "Skip" ends this guide, "Skip all" ends the tour.
  function skip() {
    if (!active) return;
    finish(active.skipAll ? 'dismissed' : 'skipped');
  }

  // status: 'done' | 'skipped' | 'dismissed' (Skip all) | 'closed'
  // (ended without a choice). `silent` suppresses the confirmation note.
  function finish(status, silent) {
    var a = teardown();
    if (!a) return;
    // Skipping a guide the learner opened themselves says nothing about
    // whether they want the tour, so it is recorded as 'closed' and never
    // counts toward "Skip all".
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
    } catch (e) { /* CustomEvent unavailable: nothing listens anyway */ }
  }

  /* ── Skip confirmation ─────────────────────────────────────────── */
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

  /* ── Start ─────────────────────────────────────────────────────── */
  function start(guideId, opts) {
    var guide = guides()[guideId];
    if (active || starting || !guide || !Array.isArray(guide.steps) || !guide.steps.length) {
      return Promise.resolve(false);
    }
    starting = true;
    return waitForTargets(guide.steps, READY_TIMEOUT_MS).then(function () {
      if (active) return false;
      // Drop steps whose target never showed up (or is hidden here).
      var steps = guide.steps.filter(function (s) { return !s.target || targetRect(s); });
      if (!steps.length) return false;
      open(guideId, steps, opts);
      return true;
    }).then(function (ok) { starting = false; return ok; },
            function (err) { starting = false; console.warn('[tour.js] guide failed to start:', err); return false; });
  }

  function stop() { if (active) finish('closed', true); }

  /* ── Auto-start ────────────────────────────────────────────────── */
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
      // LWAuth present but nobody signed in: the page is about to
      // redirect to login, so don't flash a guide at it.
      if (window.LWAuth && !uid && !forced) return;
      if (takeLegacySwitch()) markAllDismissed(uid); // the old switch was off: keep that choice, once
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
    hasGuide: function (id) { return !!guides()[id]; },
    hasSeen: function (id) { return hasSeen(id); },
    reset: reset,
    resetAll: function () { reset(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoStart);
  else autoStart();
})();
