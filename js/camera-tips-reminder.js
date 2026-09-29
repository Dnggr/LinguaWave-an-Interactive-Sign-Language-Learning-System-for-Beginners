/**
 * js/camera-tips-reminder.js: Camera Tips as contextual coaching   (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Decides WHEN the Camera Tips card should pop up on
 *            pages/camera-practice.html, and shows it. A learner who keeps
 *            missing the same sign gets a short reminder pointed at the
 *            real Camera Tips card, instead of the whole tutorial
 *            restarting.
 *
 * WHAT IT IS NOT: it does not decide what counts as a failed attempt.
 *            That is the page's job (js/camera-practice.js knows what a
 *            Practice Check prompt or a motion recording is) and it calls
 *            recordFailure() / recordSuccess() ONCE PER ATTEMPT. This file
 *            only counts what it is told, so it never sees a camera frame
 *            and cannot count one.
 *
 * WHEN IT FIRES (per sign / word, see keys below)
 *            2nd, 5th, 10th and 20th failed attempt, then every 10 more
 *            (30, 40, 50 ...). REMINDER_AT + REPEAT_EVERY below.
 *            Wording gets more helpful with the count:
 *              2  -> tier 0   "Quick Camera Tip"
 *              5  -> tier 1   "Let's adjust your setup"
 *              10 and every later one -> tier 2   "Need a little help?"
 *            The copy lives in js/tour-guides.js (window.LWTourReminders),
 *            the popup itself is LWTour.remind() in js/tour.js.
 *
 * COUNTING RULES (decisions, kept here so they are easy to change)
 *   - Per sign. The key is whatever the page passes (camera-practice uses
 *     "level/category/sign"), so a miss on B never adds to A.
 *   - A SUCCESS on a sign resets that sign's count (RESET_ON_SUCCESS).
 *     "Repeated failed attempts" means in a row: a learner who gets it
 *     right has their camera set up fine, and counting old misses across
 *     a success would pop tips up during practice that is going well.
 *     Set RESET_ON_SUCCESS to false to count every miss ever instead.
 *   - Nothing is counted while a guide or reminder is on screen, or while
 *     the tab is hidden (isSuppressed()); the page checks that before it
 *     reports an attempt, so behind-the-popup camera noise can't add up.
 *   - The count survives a reload / moving to another sign and back, for
 *     the life of the tab (sessionStorage, per account), so a reload at
 *     failure 4 doesn't hand the learner a fresh "2nd failure" tip again.
 *     It resets when the tab closes. Storage that is unavailable or full
 *     falls back to memory, silently.
 *
 * PUBLIC API (window.LWCameraTips, also module.exports under Node)
 *   recordFailure(key)  count one failed attempt; shows the reminder when
 *                       it is due. Returns { count, reminded }.
 *   recordSuccess(key)  a passed attempt: resets that sign's count.
 *   getCount(key)       current count for a sign.
 *   isSuppressed()      true while nothing should be counted (guide or
 *                       reminder open, or tab hidden).
 *   isOpen()            is the reminder on screen right now.
 *   whenClosed(fn)      run fn now, or as soon as the reminder is closed.
 *                       Lets the page hold its next step behind the popup.
 *   shouldRemind(n) / tierFor(n) / createTracker()  pure pieces, exported
 *                       for js/_test_camera-tips-reminder.node.js.
 * ─────────────────────────────────────────────────────────────────
 */
(function (root) {
  'use strict';

  /* ── Config ────────────────────────────────────────────────────── */
  var REMINDER_ID       = 'camera-tips';
  var REMINDER_AT       = [2, 5, 10, 20];   // failed attempts that trigger a reminder
  var REPEAT_EVERY      = 10;               // after the last one above: 30, 40, 50 ...
  var RESET_ON_SUCCESS  = true;             // see COUNTING RULES
  var STORE_KEY         = 'lw_camera_tips_v1';

  /* ── Pure logic (no DOM, no storage: unit-tested under Node) ───── */

  // Does this failure count get a reminder?
  function shouldRemind(count) {
    if (REMINDER_AT.indexOf(count) !== -1) return true;
    var last = REMINDER_AT[REMINDER_AT.length - 1];
    return count > last && (count - last) % REPEAT_EVERY === 0;
  }

  // Which wording tier a reminder at this count uses (index into the
  // copy's tiers[]): the 2nd failure is the gentlest, the 5th adjusts the
  // setup, the 10th and everything after asks them to review the tips.
  function tierFor(count) {
    if (count < REMINDER_AT[1]) return 0;
    if (count < REMINDER_AT[2]) return 1;
    return 2;
  }

  // Failure counts per sign, optionally persisted. `storage` is anything
  // with getItem/setItem (sessionStorage in the page, a shim in tests);
  // `getScope()` names the account so two learners on one tab don't share
  // counts. Every storage touch is try/catch: it is a convenience.
  function createTracker(opts) {
    opts = opts || {};
    var storage = opts.storage || null;
    var getScope = opts.getScope || function () { return 'guest'; };
    var memory = {};                                  // { scope: { key: n } }

    function load() {
      if (!storage) return memory;
      try {
        var raw = JSON.parse(storage.getItem(STORE_KEY) || 'null');
        if (raw && typeof raw === 'object') return raw;
      } catch (e) { /* fall through to memory */ }
      return memory;
    }
    function save(all) {
      memory = all;
      if (!storage) return;
      try { storage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* memory still holds it */ }
    }
    function scopeKey() { return String(getScope() || 'guest'); }

    function getCount(key) {
      var mine = load()[scopeKey()] || {};
      return mine[key] > 0 ? mine[key] : 0;
    }
    function fail(key) {
      var all = load();
      var s = scopeKey();
      all[s] = all[s] || {};
      all[s][key] = getCount(key) + 1;
      save(all);
      return all[s][key];
    }
    function succeed(key) {
      if (!RESET_ON_SUCCESS) return;
      var all = load();
      var mine = all[scopeKey()];
      if (mine && key in mine) { delete mine[key]; save(all); }
    }
    return { getCount: getCount, fail: fail, succeed: succeed };
  }

  /* ── Page wiring ───────────────────────────────────────────────── */
  var doc = root.document;
  var tracker = null;
  var open = false;          // the reminder is on screen
  var waiting = [];          // callbacks held until it closes

  function currentUid() {
    try { return (root.LWAuth && root.LWAuth.getCurrentUser && root.LWAuth.getCurrentUser() || {}).uid || null; }
    catch (e) { return null; }
  }
  function getTracker() {
    if (!tracker) {
      var store = null;
      try { store = root.sessionStorage || null; } catch (e) { store = null; }
      tracker = createTracker({ storage: store, getScope: currentUid });
    }
    return tracker;
  }

  function copy() { return root.LWTourReminders && root.LWTourReminders[REMINDER_ID]; }

  function flush() {
    var fns = waiting;
    waiting = [];
    fns.forEach(function (fn) { try { fn(); } catch (e) { console.warn('[camera-tips-reminder.js]', e); } });
  }
  function onReminderEnd(e) {
    if (e && e.detail && e.detail.id !== REMINDER_ID) return;
    open = false;
    flush();
  }
  if (doc && doc.addEventListener) doc.addEventListener('lwtour:reminder-end', onReminderEnd);

  function isSuppressed() {
    if (open) return true;
    if (doc && doc.hidden) return true;
    try { return !!(root.LWTour && root.LWTour.isBusy && root.LWTour.isBusy()); }
    catch (e) { return false; }
  }

  // Shows the reminder for this failure count. Never throws: a missing
  // tour engine, missing copy or a busy tour just means no popup, and
  // practice carries on exactly as before.
  function show(count) {
    var c = copy();
    if (!c || !c.tiers || !c.tiers.length || !root.LWTour || typeof root.LWTour.remind !== 'function') return false;
    var tier = c.tiers[Math.min(tierFor(count), c.tiers.length - 1)];
    var opened = false;
    try {
      opened = !!root.LWTour.remind({
        id: REMINDER_ID,
        target: c.target,
        placement: c.placement,
        icon: c.icon,
        buttonLabel: c.buttonLabel,
        title: tier.title,
        body: tier.body
      });
    } catch (e) { console.warn('[camera-tips-reminder.js] could not show the reminder:', e); }
    if (opened) open = true;
    return opened;
  }

  function recordFailure(key) {
    var count = getTracker().fail(key);
    var reminded = false;
    if (shouldRemind(count) && !isSuppressed()) reminded = show(count);
    return { count: count, reminded: reminded };
  }
  function recordSuccess(key) { getTracker().succeed(key); }
  function getCount(key) { return getTracker().getCount(key); }

  function whenClosed(fn) {
    if (open) waiting.push(fn); else fn();
  }

  var api = {
    recordFailure: recordFailure,
    recordSuccess: recordSuccess,
    getCount: getCount,
    isSuppressed: isSuppressed,
    isOpen: function () { return open; },
    whenClosed: whenClosed,
    // pure pieces, exported for the Node test
    shouldRemind: shouldRemind,
    tierFor: tierFor,
    createTracker: createTracker,
    REMINDER_AT: REMINDER_AT.slice(),
    REPEAT_EVERY: REPEAT_EVERY
  };

  root.LWCameraTips = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
