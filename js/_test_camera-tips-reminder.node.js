// Sandboxed Node harness for js/camera-tips-reminder.js — no jsdom in this
// environment (standing project limitation, see AI_MEMORY.md), so this covers
// the PURE parts: when a reminder is due, which wording tier it gets, per-sign
// counting, reset on success, persistence and the fake-store fallbacks. The
// popup itself (LWTour.remind) and the attempt hooks in camera-practice.js are
// checked in a real browser, not here.
global.window = global;
global.console = console;

const tips = require('./camera-tips-reminder.js');

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', label); }
}
function shim() {
  let store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    _dump: () => store,
  };
}

// ── 1. Which failure counts get a reminder ──────────────────────────────
const due = [];
for (let n = 1; n <= 100; n++) if (tips.shouldRemind(n)) due.push(n);
check('reminders at 2, 5, 10, 20 then every 10 up to 100',
  JSON.stringify(due) === JSON.stringify([2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]));
check('no reminder on the 1st failure', !tips.shouldRemind(1));
check('no reminder between 20 and 30', [21, 25, 29].every((n) => !tips.shouldRemind(n)));
check('no reminder at 0', !tips.shouldRemind(0));

// ── 2. Wording tier ─────────────────────────────────────────────────────
check('2nd failure -> gentlest tier (0)', tips.tierFor(2) === 0);
check('5th failure -> tier 1', tips.tierFor(5) === 1);
check('10th failure -> tier 2', tips.tierFor(10) === 2);
check('20th failure -> tier 2', tips.tierFor(20) === 2);
check('30th, 40th... stay on tier 2', tips.tierFor(30) === 2 && tips.tierFor(140) === 2);

// ── 3. Per-sign counting, reset on success ──────────────────────────────
let t = tips.createTracker({});
check('starts at 0', t.getCount('basic/alphabet/A') === 0);
check('1st failure on A -> 1', t.fail('basic/alphabet/A') === 1);
check('failures on B do not add to A', t.fail('basic/alphabet/B') === 1 && t.getCount('basic/alphabet/A') === 1);
check('2nd failure on A -> 2 (reminder due)', t.fail('basic/alphabet/A') === 2 && tips.shouldRemind(2));
check('B is still at 1', t.getCount('basic/alphabet/B') === 1);
t.succeed('basic/alphabet/A');
check('success resets A', t.getCount('basic/alphabet/A') === 0);
check('success on A leaves B alone', t.getCount('basic/alphabet/B') === 1);
check('after the reset A starts over (1, not 3)', t.fail('basic/alphabet/A') === 1);
check('same id in another category is its own sign', t.fail('basic/numbers/A') === 1);

// ── 4. Persistence (sessionStorage stand-in) and account scoping ────────
const store = shim();
let scope = 'uid-1';
const t1 = tips.createTracker({ storage: store, getScope: () => scope });
t1.fail('k'); t1.fail('k'); t1.fail('k');
const t2 = tips.createTracker({ storage: store, getScope: () => scope }); // "page reload"
check('count survives a reload (3)', t2.getCount('k') === 3);
check('and the next failure continues from it (4, not a fresh 2nd)', t2.fail('k') === 4);
scope = 'uid-2';
check('another account on the same tab starts at 0', t2.getCount('k') === 0);
scope = 'uid-1';
check('the first account is untouched', t2.getCount('k') === 4);
t2.succeed('k');
check('success clears the stored count', tips.createTracker({ storage: store, getScope: () => scope }).getCount('k') === 0);
check('success leaves no empty key behind for that sign', !('k' in (JSON.parse(store.getItem('lw_camera_tips_v1'))['uid-1'] || {})));

// ── 5. Broken storage falls back to memory, never throws ────────────────
const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
const tb = tips.createTracker({ storage: broken });
let threw = false, c = 0;
try { tb.fail('x'); c = tb.fail('x'); tb.succeed('y'); } catch (e) { threw = true; }
check('unavailable storage does not throw', !threw);
check('unavailable storage still counts in memory (2)', c === 2);

const corrupt = shim();
corrupt.setItem('lw_camera_tips_v1', '{not json');
check('corrupt stored value is ignored (starts at 0)', tips.createTracker({ storage: corrupt }).getCount('x') === 0);

// ── 6. Page API with no tour engine / no DOM present ────────────────────
// (Node has neither window.LWTour nor document: recording must still count
// and must never throw, so a page that failed to load tour.js still works.)
threw = false;
let r = null;
try {
  tips.recordSuccess('page/key');
  r = [tips.recordFailure('page/key'), tips.recordFailure('page/key')];
} catch (e) { threw = true; }
check('recordFailure/recordSuccess do not throw without a tour engine', !threw);
check('2nd failure counted, but no popup without an engine', r && r[1].count === 2 && r[1].reminded === false);
check('isOpen() is false and whenClosed runs at once when nothing is open', (() => {
  let ran = false; tips.whenClosed(() => { ran = true; });
  return tips.isOpen() === false && ran;
})());
check('isSuppressed() is false with no tour and no hidden tab', tips.isSuppressed() === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
