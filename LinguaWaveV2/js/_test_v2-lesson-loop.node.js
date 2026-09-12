// Sandboxed Node harness — no jsdom in this environment (standing
// project limitation, see AI_MEMORY.md). Mirrors the localStorage
// shim pattern already used to test data-v2.js's own Hearts module.
global.window = global;
global.localStorage = (function () {
  let store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _dump: () => store,
    _reset: () => { store = {}; },
  };
})();
global.console = console;

require('./data-v2.js');
require('./v2-lesson-loop.js');

const assert = require('assert');
let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', label); }
}

// ── 1. Basic sanity: LWDataV2 and LWDataV2Loop both loaded ──────────
check('LWDataV2 loaded', !!window.LWDataV2);
check('LWDataV2Loop loaded', !!window.LWDataV2Loop);

// ── 2. Near-neighbor discrimination pairs resolve to REAL signs ─────
const alphaMission = window.LWDataV2.getMissionForCategory('alphabet');
check('alphabet mission built', !!alphaMission && alphaMission.items.length > 0);

const aNeighbors = window.LWDataV2Loop.getNearNeighbors('basic', 'A');
check('A has resolved neighbors', aNeighbors.length > 0);
check('A neighbors are real signs', aNeighbors.every((id) => !!window.LWDataV2.getSign('basic', id)));
check('A neighbors include S (closed-fist family)', aNeighbors.indexOf('S') !== -1);

const numMission = window.LWDataV2.getMissionForCategory('numbers');
const sixNeighbors = window.LWDataV2Loop.getNearNeighbors('basic', '6');
check('6 neighbors include W (cross-unit collision)', sixNeighbors.indexOf('W') !== -1);

// ── 3. Recognize-option builder never throws, always includes the
//      correct answer, respects requested count ────────────────────
const catSigns = window.LWDataV2.getCategorySigns('basic', 'alphabet');
const opts4 = window.LWDataV2Loop.buildRecognizeOptions('basic', 'A', catSigns, 4);
check('recognize options includes correct answer', opts4.options.indexOf('A') !== -1);
check('recognize options length == 4', opts4.options.length === 4);
check('recognize options are unique', new Set(opts4.options).size === opts4.options.length);

const opts2 = window.LWDataV2Loop.buildRecognizeOptions('basic', 'A', catSigns, 2);
check('recognize options respects count=2', opts2.options.length === 2);

// ── 4. Discriminate pair builder — curated + fallback path ──────────
const pairA = window.LWDataV2Loop.buildDiscriminatePair('basic', 'A', catSigns);
check('discriminate pair for A exists', !!pairA && !!pairA.neighborSignId);

// Sign with NO curated neighbor list at all (e.g. a chapter-3+ sign,
// simulated here via a category we know is uncurated: 'feelings')
const feelSigns = window.LWDataV2.getCategorySigns('medium', 'feelings');
if (feelSigns.length > 1) {
  const pairFallback = window.LWDataV2Loop.buildDiscriminatePair('medium', feelSigns[0], feelSigns);
  check('discriminate pair falls back gracefully for uncurated sign', !!pairFallback);
}

// ── 5. Same-sign-as / lighter loop detection ─────────────────────────
check('HI is flagged same-sign-as HELLO', window.LWDataV2Loop.sameSignAs('HI') === 'HELLO');
check('BYE is flagged same-sign-as GOODBYE', window.LWDataV2Loop.sameSignAs('BYE') === 'GOODBYE');
check('NIGHT is flagged same-sign-as EVENING', window.LWDataV2Loop.sameSignAs('NIGHT') === 'EVENING');
check('HELLO itself is not flagged as a duplicate', window.LWDataV2Loop.sameSignAs('HELLO') === null);
check('register prompt exists for HI', !!window.LWDataV2Loop.registerPromptFor('HI'));

// ── 6. hasSignLearnedElsewhere — real localStorage round-trip ───────
global.localStorage._reset();
check('BOY not learned anywhere yet (empty storage)',
  window.LWDataV2Loop.hasSignLearnedElsewhere('BOY', 'm_personal_information') === false);

// Simulate: the 'family' mission's BOY LESSON item was completed
const familyMission = window.LWDataV2.getMissionForCategory('family');
check('family mission built', !!familyMission);
const boyIndex = familyMission.items.findIndex((it) => it.kind === 'LESSON' && it.signId === 'BOY');
check('family mission has a BOY LESSON item', boyIndex !== -1);
window.LWDataV2.markItemComplete(familyMission, boyIndex, familyMission.items[boyIndex]);

check('BOY now detected as learned elsewhere (from family mission)',
  window.LWDataV2Loop.hasSignLearnedElsewhere('BOY', 'm_personal_information') === true);
check('BOY still not "learned elsewhere" when excluding family itself',
  window.LWDataV2Loop.hasSignLearnedElsewhere('BOY', 'm_family') === false);

// ── 7. planForItem — full integration across a real mission ─────────
global.localStorage._reset();
const greetMission = window.LWDataV2.getMissionForCategory('essentials_greetings');
check('greetings mission built', !!greetMission);

const planBySign = {};
greetMission.items.forEach((item, i) => {
  const plan = window.LWDataV2Loop.planForItem(greetMission, i, item);
  check(`plan for item ${i} (${item.kind}/${item.signId || item.category}) has a render mode`, !!plan.render);
  if (item.signId) planBySign[`${item.kind}:${item.signId}`] = plan;
});

check('HELLO LESSON uses full Watch stage', planBySign['LESSON:HELLO'].render === 'lesson-watch');
check('HI LESSON uses the lighter path', planBySign['LESSON:HI'].render === 'lesson-lighter');
check('HI LESSON cites HELLO as the reason', /HELLO/.test(planBySign['LESSON:HI'].reason));
check('HI BOOSTER uses register discrimination, not handshape recognize',
  planBySign['BOOSTER:HI'].render === 'booster-register');
check('HELLO BOOSTER uses normal recognize', planBySign['BOOSTER:HELLO'].render === 'booster-recognize');
check('HELLO BOOSTER recognize options include a near-neighbor distractor (HI)',
  planBySign['BOOSTER:HELLO'].options.options.indexOf('HI') !== -1);

const quizItem = greetMission.items.find((it) => it.kind === 'QUIZ');
const quizPlan = window.LWDataV2Loop.planForItem(greetMission, greetMission.items.indexOf(quizItem), quizItem);
check('QUIZ item plans as quiz-handoff', quizPlan.render === 'quiz-handoff');

// ── 8. Personal Information — cross-mission duplicate detection in
//      a realistic sequence (learn People first, then Personal Info) ─
global.localStorage._reset();
const peopleMission = window.LWDataV2.getMissionForCategory('people');
const piMission = window.LWDataV2.getMissionForCategory('personal_information');
check('people mission built', !!peopleMission);
check('personal_information mission built', !!piMission);

// Before People is learned: PERSON in Personal Info should be a full lesson
const piPersonIdxBefore = piMission.items.findIndex((it) => it.kind === 'LESSON' && it.signId === 'PERSON');
const planBefore = window.LWDataV2Loop.planForItem(piMission, piPersonIdxBefore, piMission.items[piPersonIdxBefore]);
check('PERSON in Personal Info is a full lesson before People is learned', planBefore.render === 'lesson-watch');

// Complete People's own PERSON lesson
const peoplePersonIdx = peopleMission.items.findIndex((it) => it.kind === 'LESSON' && it.signId === 'PERSON');
window.LWDataV2.markItemComplete(peopleMission, peoplePersonIdx, peopleMission.items[peoplePersonIdx]);

// Now Personal Info's PERSON should be lighter
const planAfter = window.LWDataV2Loop.planForItem(piMission, piPersonIdxBefore, piMission.items[piPersonIdxBefore]);
check('PERSON in Personal Info is lighter after People is learned', planAfter.render === 'lesson-lighter');
check('PERSON lighter reason cites earlier mission', /earlier mission/i.test(planAfter.reason));

// ── 9. Every one of the 65 live missions still plans without throwing
//      (breadth check — nothing in this file should crash on chapters
//      it has no curated content for) ───────────────────────────────
global.localStorage._reset();
let crashed = 0;
window.LWDataV2.getAllMissions().forEach((m) => {
  m.items.forEach((item, i) => {
    try { window.LWDataV2Loop.planForItem(m, i, item); }
    catch (e) { crashed++; console.error('planForItem crashed on', m.id, i, item.kind, e.message); }
  });
});
check('planForItem never throws across all 65 live missions', crashed === 0);

// ── 10. Full walkthrough simulation — mirrors exactly what
//       js/v2-lesson.js's completeAndAdvance() does, without a DOM,
//       confirming getDropOffIndex/getRecap behave as v2-lesson.js
//       (resume support, mission-end recap) actually depends on ────
global.localStorage._reset();
const walkMission = window.LWDataV2.getMissionForCategory('essentials_greetings');
const quizIdx = walkMission.items.findIndex((it) => it.kind === 'QUIZ');
walkMission.items.forEach((item, i) => {
  if (item.kind === 'QUIZ') return; // never marked here — see KNOWN LIMITATION note
  window.LWDataV2.markItemComplete(walkMission, i, item);
});
check('getDropOffIndex resumes exactly at the QUIZ item after all else is done',
  window.LWDataV2.getDropOffIndex(walkMission) === quizIdx);
const finalRecap = window.LWDataV2.getRecap(walkMission);
check('recap has one line per LESSON item', finalRecap.length === walkMission.items.filter((it) => it.kind === 'LESSON').length);

// Resume mid-mission: mark only the first 3 items complete, confirm
// v2-lesson.js would pick up exactly at item index 3.
global.localStorage._reset();
for (let i = 0; i < 3; i++) window.LWDataV2.markItemComplete(walkMission, i, walkMission.items[i]);
check('getDropOffIndex resumes mid-mission at the right index',
  window.LWDataV2.getDropOffIndex(walkMission) === 3);

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
