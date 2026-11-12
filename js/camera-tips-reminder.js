(function (root) {
  'use strict';

  var REMINDER_ID       = 'camera-tips';
  var REMINDER_AT       = [2, 5, 10, 20];
  var REPEAT_EVERY      = 10;
  var RESET_ON_SUCCESS  = true;
  var STORE_KEY         = 'lw_camera_tips_v1';


  function shouldRemind(count) {
    if (REMINDER_AT.indexOf(count) !== -1) return true;
    var last = REMINDER_AT[REMINDER_AT.length - 1];
    return count > last && (count - last) % REPEAT_EVERY === 0;
  }

  function tierFor(count) {
    if (count < REMINDER_AT[1]) return 0;
    if (count < REMINDER_AT[2]) return 1;
    return 2;
  }

  function createTracker(opts) {
    opts = opts || {};
    var storage = opts.storage || null;
    var getScope = opts.getScope || function () { return 'guest'; };
    var memory = {};

    function load() {
      if (!storage) return memory;
      try {
        var raw = JSON.parse(storage.getItem(STORE_KEY) || 'null');
        if (raw && typeof raw === 'object') return raw;
      } catch (e) {  }
      return memory;
    }
    function save(all) {
      memory = all;
      if (!storage) return;
      try { storage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) {  }
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

  var doc = root.document;
  var tracker = null;
  var open = false;
  var waiting = [];

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
    shouldRemind: shouldRemind,
    tierFor: tierFor,
    createTracker: createTracker,
    REMINDER_AT: REMINDER_AT.slice(),
    REPEAT_EVERY: REPEAT_EVERY
  };

  root.LWCameraTips = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
