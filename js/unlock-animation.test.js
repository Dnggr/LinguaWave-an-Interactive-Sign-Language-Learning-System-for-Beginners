const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
// Run from <repo>/tests/ (finds ../js), or point LW_JS_DIR at the folder holding game-gate.js and learn.js.
const JS_DIR = process.env.LW_JS_DIR || path.join(__dirname, '..', 'js');
const GATE = fs.readFileSync(path.join(JS_DIR, 'game-gate.js'), 'utf8');
const LEARN = fs.readFileSync(path.join(JS_DIR, 'learn.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The glow waits ~0.4s on screen before playing (FX_SETTLE_MS in game-gate.js) and lasts ~1.8s (CSS: 2 x 900ms).
const SETTLE_WAIT = 700;    // long enough for a glow to have started
const CLEANUP_WAIT = 2300;  // long enough for it to be over (cleanup safety net is 2.1s)

let pass = 0, fail = 0;
function check(name, cond) { (cond ? pass++ : fail++); console.log((cond ? 'PASS ' : 'FAIL ') + name); }

// One simulated page load. `store` is a plain object that persists across loads (the "localStorage").
function makeWindow(html, store, o) {
  const dom = new JSDOM(html, { url: 'https://app.test/pages/' + (o.page || 'dashboard.html'), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.keys(store).forEach((k) => w.localStorage.setItem(k, store[k]));
  w.matchMedia = () => ({ matches: !!o.reduced });
  w.Element.prototype.scrollIntoView = function () {};
  if (o.uid !== null) w.LWAuth = { getCurrentUser: () => ({ uid: o.uid || 'u1' }), whenAuthReady: () => Promise.resolve() };
  if (o.missions) w.LWMissions = o.missions;
  if (o.dev) w.localStorage.setItem('lw_game_dev', '1');
  return w;
}
function saveStore(w, store) {
  Object.keys(store).forEach((k) => delete store[k]);
  for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); store[k] = w.localStorage.getItem(k); }
}

/* ── Game sidebar ─────────────────────────────────────────────── */
const SIDEBAR = '<nav class="app-sidebar"><a href="dashboard.html" class="app-sidebar__link">D</a><a href="game.html" class="app-sidebar__link" id="g">Game</a></nav>';
const gameMissions = (ch1Done) => ({
  isChapterComplete: () => ch1Done, getAllMissions: () => [], getMissionProgress: () => 0,
  whenMissionsSyncReady: () => Promise.resolve()
});
async function gameLoad(store, o) {
  const w = makeWindow('<body>' + SIDEBAR + '</body>', store, o);
  w.eval(GATE);
  await sleep(SETTLE_WAIT);
  const a = w.document.getElementById('g');
  const res = { pulsing: a.classList.contains('lw-unlock-pulse'), locked: a.classList.contains('app-sidebar__link--locked'), w, a };
  return res;
}

(async () => {
  let store = {};
  let r = await gameLoad(store, { missions: gameMissions(false) });
  check('game: first visit, locked -> no pulse, sidebar link stays unlocked', !r.locked && !r.pulsing);
  saveStore(r.w, store);

  r = await gameLoad(store, { missions: gameMissions(false) });
  check('game: reload while still locked -> no pulse', !r.locked && !r.pulsing);
  saveStore(r.w, store);

  // fail-closed load (LWMissions missing) must not corrupt the "seen" record
  r = await gameLoad(store, { missions: {} });   // LWMissions present but unusable -> LOCKED_CH1 fallback (no `definitive`)
  check('game: fail-closed fallback -> no pulse, sidebar link untouched', !r.locked && !r.pulsing);
  saveStore(r.w, store);

  r = await gameLoad(store, { missions: gameMissions(true) });
  check('game: locked -> unlocked pulses (even after a fail-closed load in between)', !r.locked && r.pulsing);
  await sleep(CLEANUP_WAIT);
  check('game: pulse class removed once the animation is over', !r.a.classList.contains('lw-unlock-pulse'));
  saveStore(r.w, store);

  r = await gameLoad(store, { missions: gameMissions(true) });
  check('game: next page load, already unlocked -> NO pulse', !r.locked && !r.pulsing);
  saveStore(r.w, store);

  r = await gameLoad({}, { missions: gameMissions(true) });
  check('game: brand-new account/device already unlocked -> no pulse', !r.locked && !r.pulsing);

  // reduced motion: no class, but the transition is consumed
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  r = await gameLoad(store, { missions: gameMissions(true), reduced: true }); saveStore(r.w, store);
  check('game: prefers-reduced-motion -> no pulse class', !r.pulsing);
  r = await gameLoad(store, { missions: gameMissions(true) });
  check('game: ...and it does not replay later', !r.pulsing);

  // in-app reduced-motion toggle
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<html class="lw-force-reduced-motion"><body>' + SIDEBAR + '</body></html>', store, { missions: gameMissions(true) });
    w.document.documentElement.classList.add('lw-force-reduced-motion'); w.eval(GATE); await sleep(SETTLE_WAIT);
    check('game: html.lw-force-reduced-motion -> no pulse class', !w.document.getElementById('g').classList.contains('lw-unlock-pulse')); }

  // no signed-in uid
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false), uid: null }); saveStore(r.w, store);
  r = await gameLoad(store, { missions: gameMissions(true), uid: null });
  check('game: no uid -> no pulse, nothing stored', !r.pulsing && !Object.keys(store).some((k) => k.startsWith('lw_unlock_seen')));

  // per-account isolation
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false), uid: 'alice' }); saveStore(r.w, store);
  r = await gameLoad(store, { missions: gameMissions(true), uid: 'bob' });
  check('game: another account on same device does not inherit "locked" -> no pulse', !r.pulsing);

  // dev override
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  r = await gameLoad(store, { missions: gameMissions(false), dev: true });
  check('game: dev override does not pulse', !r.pulsing);

  // page without a sidebar link must not consume the transition
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<body><p>no sidebar</p></body>', store, { missions: gameMissions(true) }); w.eval(GATE); await sleep(80); saveStore(w, store); }
  r = await gameLoad(store, { missions: gameMissions(true) });
  check('game: a page with no Game link leaves the transition for one that has it', r.pulsing);

  /* ── Only where the learner can see it ────────────────────────── */
  const seenGameFlag = () => JSON.parse(store['lw_unlock_seen_v1:u1']).game.game;
  const glows = (w) => w.document.getElementById('g').classList.contains('lw-unlock-pulse');

  // hidden tab: no glow, the unlock is not used up; shown -> glows, then recorded
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<body>' + SIDEBAR + '</body>', store, { missions: gameMissions(true) });
    let tab = 'hidden';
    Object.defineProperty(w.document, 'visibilityState', { configurable: true, get: () => tab });
    w.eval(GATE); await sleep(SETTLE_WAIT);
    check('visible: hidden tab -> no glow', !glows(w));
    saveStore(w, store);
    check('visible: ...and the unlock is not used up', seenGameFlag() === false);
    tab = 'visible'; w.document.dispatchEvent(new w.Event('visibilitychange')); await sleep(SETTLE_WAIT);
    check('visible: tab shown -> glows', glows(w));
    saveStore(w, store);
    check('visible: ...and is then recorded as seen', seenGameFlag() === true); }

  // learner leaves before ever seeing it -> offered again next time
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<body>' + SIDEBAR + '</body>', store, { missions: gameMissions(true) });
    Object.defineProperty(w.document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    w.eval(GATE); await sleep(SETTLE_WAIT); saveStore(w, store); }
  r = await gameLoad(store, { missions: gameMissions(true) });
  check('visible: left before seeing it -> next visit still offers the glow', r.pulsing);

  // element off screen (closed mobile menu, scrolled away) -> waits for the observer to say it is in view
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<body>' + SIDEBAR + '</body>', store, { missions: gameMissions(true) });
    let cb = null;
    w.IntersectionObserver = function (fn) { cb = fn; this.observe = () => {}; this.disconnect = () => {}; };
    w.eval(GATE); await sleep(SETTLE_WAIT);
    check('visible: element off screen -> no glow, not used up', !glows(w) && cb !== null);
    saveStore(w, store);
    check('visible: ...still unseen', seenGameFlag() === false);
    cb([{ isIntersecting: true, intersectionRect: { height: 40 }, boundingClientRect: { height: 40 } }]);
    await sleep(SETTLE_WAIT);
    check('visible: scrolled / opened into view -> glows', glows(w));
    saveStore(w, store);
    check('visible: ...and is then recorded as seen', seenGameFlag() === true); }

  // reduced motion in a hidden tab: nothing to show, so the change is recorded at once
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  { const w = makeWindow('<body>' + SIDEBAR + '</body>', store, { missions: gameMissions(true), reduced: true });
    Object.defineProperty(w.document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    w.eval(GATE); await sleep(SETTLE_WAIT); saveStore(w, store);
    check('visible: reduced motion -> no glow, and the unlock is recorded straight away', !glows(w) && seenGameFlag() === true); }

  /* ── Game picker (the lock now lives in game.html, not the sidebar) ───────── */
  const PICKER_HTML = '<body>' + SIDEBAR + '<main class="game-picker">' +
    '<aside class="game-lock" id="game-lock" hidden><h2 id="game-lock-title"></h2><p id="game-lock-text"></p>' +
    '<div id="game-lock-progress" hidden><span id="game-lock-count"></span><div id="game-lock-fill"></div></div>' +
    '<a id="game-lock-go" href="learn.html">Go</a></aside>' +
    ['a', 'b', 'c'].map((n) => '<a class="game-mode" href="' + n + '.html"><h2>' + n + '</h2><span class="game-mode__action">Play ' + n + '</span></a>').join('') +
    '</main></body>';
  const slowMissions = (ch1Done, ms) => Object.assign(gameMissions(ch1Done), { whenMissionsSyncReady: () => new Promise((res) => setTimeout(res, ms)) });
  async function pickerLoad(store, o, waitMs) {
    if (!('lw_session' in store)) store.lw_session = JSON.stringify({ uid: 'u1' });   // js/auth.js keeps this; the gate reads the uid from it
    const w = makeWindow(PICKER_HTML, store, Object.assign({ page: 'game.html' }, o));
    w.eval(GATE);
    const attrRightAway = w.document.documentElement.getAttribute('data-game-gate');
    await sleep(waitMs || SETTLE_WAIT);
    const cards = Array.from(w.document.querySelectorAll('.game-mode'));
    return {
      w, attrRightAway,
      attr: w.document.documentElement.getAttribute('data-game-gate'),
      allLocked: cards.every((c) => c.classList.contains('game-mode--locked') && !c.hasAttribute('href')),
      noneLocked: cards.every((c) => !c.classList.contains('game-mode--locked') && c.getAttribute('href')),
      bannerShown: !w.document.getElementById('game-lock').hidden,
      sidebar: w.document.getElementById('g'),
    };
  }

  store = {};
  let P = await pickerLoad(store, { missions: gameMissions(false) }); saveStore(P.w, store);
  check('picker: locked -> every card locked, banner shown, sidebar link untouched',
    P.allLocked && P.bannerShown && P.attr === 'locked' && !P.sidebar.classList.contains('app-sidebar__link--locked') && P.sidebar.getAttribute('href') === 'game.html');
  check('picker: first visit with nothing remembered starts in "checking" (never "unlocked")', P.attrRightAway === 'checking');
  check('picker: the locked result is remembered for this account', JSON.parse(store['lw_game_gate:u1']).unlocked === false);

  // remembered "locked" must be painted BEFORE the slow real check answers (the unlocked -> locked flash)
  { const w = makeWindow(PICKER_HTML, store, { page: 'game.html', missions: slowMissions(false, 400) });
    w.eval(GATE);
    const right = w.document.documentElement.getAttribute('data-game-gate');
    await sleep(60);   // real check still pending
    const cards = Array.from(w.document.querySelectorAll('.game-mode'));
    check('picker: remembered locked is painted before the real check finishes (no flash)',
      right === 'locked' && cards.every((c) => c.classList.contains('game-mode--locked')) && !w.document.getElementById('game-lock').hidden);
    await sleep(500); saveStore(w, store); }

  // stale "locked": Chapter 1 was finished since -> unlocks cleanly, and the sidebar item glows once
  P = await pickerLoad(store, { missions: gameMissions(true) }); saveStore(P.w, store);
  check('picker: remembered locked -> really unlocked: cards open again, banner hidden', P.noneLocked && !P.bannerShown && P.attr === 'unlocked');
  check('picker: ...and the sidebar Game item pulses (real locked -> unlocked)', P.sidebar.classList.contains('lw-unlock-pulse'));
  P = await pickerLoad(store, { missions: gameMissions(true) });
  check('picker: next load, unlocked from the start (no lock flicker, no pulse)', P.attrRightAway === 'unlocked' && P.noneLocked && !P.sidebar.classList.contains('lw-unlock-pulse'));

  // another account on the same browser never inherits this account's remembered state
  store = {};
  P = await pickerLoad(store, { missions: gameMissions(true), uid: 'alice' }); saveStore(P.w, store);
  store.lw_session = JSON.stringify({ uid: 'bob' });
  P = await pickerLoad(store, { missions: gameMissions(false), uid: 'bob' });
  check('picker: a different account starts in "checking", not alice\'s unlocked', P.attrRightAway === 'checking' && P.allLocked);

  // any sidebar page keeps the remembered state fresh, so the picker opens already correct
  store = { lw_session: JSON.stringify({ uid: 'u1' }) };
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  check('dashboard: check result is remembered for the picker', store['lw_game_gate:u1'] && JSON.parse(store['lw_game_gate:u1']).unlocked === false);

  // storage throwing must never break locking
  store = {};
  { const w = makeWindow(PICKER_HTML, store, { page: 'game.html', missions: gameMissions(false) });
    Object.defineProperty(w, 'localStorage', { get() { throw new Error('denied'); } });
    let threw = false;
    try { w.eval(GATE); } catch (e) { threw = true; }
    await sleep(SETTLE_WAIT);
    check('picker: storage blocked -> still locks the cards, no throw',
      !threw && Array.from(w.document.querySelectorAll('.game-mode')).every((c) => c.classList.contains('game-mode--locked'))); }

  /* ── Learn chapters ─────────────────────────────────────────── */
  const LEARN_HTML = '<body><div id="orientation-slot"></div><input id="path-search-input"><div id="path-list"></div></body>';
  const mk = (unlocked) => {
    const chapters = [1, 2, 3].map((n) => ({ id: 'c' + n, order: n, title: 'T' + n, blurb: 'b' }));
    const missions = chapters.map((c, i) => ({ category: 'm' + i, categoryGroup: c.id, title: 'M', goal: 'g' }));
    return {
      getAllMissions: () => missions, getOrientation: () => ({ title: 'O', goal: 'g', href: 'o.html', complete: true }),
      isOrientationComplete: () => true, getCategoryGroups: () => chapters, getMissionProgress: () => 0,
      getTrailNumbers: () => new Map(), getCurrentChapterId: () => 'c1',
      isChapterUnlocked: (id) => unlocked.includes(id),
      getMissionStatus: (m) => (unlocked.includes(m.categoryGroup) ? 'available' : 'locked'),
      whenMissionsSyncReady: () => Promise.resolve()
    };
  };
  async function learnLoad(store, unlocked, extra) {
    const w = makeWindow(LEARN_HTML, store, Object.assign({ page: 'learn.html', missions: mk(unlocked) }, extra || {}));
    w.eval(GATE);   // registers LWUnlockFx (no sidebar here, so it just exits)
    w.eval(LEARN);
    await sleep(SETTLE_WAIT);
    const pulsing = Array.from(w.document.querySelectorAll('.trail-group')).filter((e) => e.classList.contains('lw-unlock-pulse')).map((e) => e.dataset.chapter);
    return { w, pulsing };
  }

  store = {};
  let L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  check('learn: first visit -> no pulse', L.pulsing.length === 0);
  L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  check('learn: reload, nothing changed -> no pulse', L.pulsing.length === 0);
  L = await learnLoad(store, ['c1', 'c2']); saveStore(L.w, store);
  check('learn: Chapter 2 unlocks -> only c2 pulses', JSON.stringify(L.pulsing) === '["c2"]');
  await sleep(CLEANUP_WAIT);
  check('learn: class removed afterwards', L.w.document.querySelectorAll('.lw-unlock-pulse').length === 0);
  L = await learnLoad(store, ['c1', 'c2']); saveStore(L.w, store);
  check('learn: reload -> no replay', L.pulsing.length === 0);
  L = await learnLoad(store, ['c1', 'c2', 'c3']); saveStore(L.w, store);
  check('learn: Chapter 3+ unlock -> c3 pulses, c1/c2 do not', JSON.stringify(L.pulsing) === '["c3"]');

  // several chapters flip at once (Ch2 complete opens everything)
  store = {};
  L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  L = await learnLoad(store, ['c1', 'c2', 'c3']);
  check('learn: several chapters unlock together -> all newly unlocked pulse', JSON.stringify(L.pulsing.sort()) === '["c2","c3"]');

  // search hiding a chapter must not consume its transition
  store = {};
  L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  { const w = makeWindow(LEARN_HTML, store, { page: 'learn.html', missions: mk(['c1', 'c2']) });
    const m = w.LWMissions; const all = m.getAllMissions(); m.getAllMissions = () => all.filter((x) => x.categoryGroup !== 'c2');
    w.eval(GATE); w.eval(LEARN); await sleep(SETTLE_WAIT); saveStore(w, store); }
  L = await learnLoad(store, ['c1', 'c2']);
  check('learn: chapter not rendered (e.g. filtered) is not recorded, so its unlock still shows later', L.pulsing.includes('c2'));

  // reduced motion
  store = {};
  L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  L = await learnLoad(store, ['c1', 'c2'], { reduced: true });
  check('learn: reduced motion -> no pulse class', L.pulsing.length === 0);

  // Learn is not the only place Game state is kept: the two groups are independent
  store = {};
  r = await gameLoad(store, { missions: gameMissions(false) }); saveStore(r.w, store);
  L = await learnLoad(store, ['c1']); saveStore(L.w, store);
  const rec = JSON.parse(store['lw_unlock_seen_v1:u1']);
  check('shared store keeps "game" and "chapters" separate', rec.game && rec.chapters && rec.game.game === false && rec.chapters.c1 === true);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
