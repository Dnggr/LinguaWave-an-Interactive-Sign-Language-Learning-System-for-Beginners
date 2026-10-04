'use strict';
/**
 * Regression test for the learner-feedback -> Firestore -> admin flow.
 * Run:  node js/_test_feedback-survey.node.js
 *
 * No network, no Firebase. Three things are checked:
 *
 *  1. js/feedback.js's REAL submitSurvey() (loaded from source, with the
 *     `./auth.js` import swapped for a stub and a tiny fake DOM):
 *       - writes exactly one surveys/{uid}_{level}_{ts} doc with the
 *         Firebase user's uid/name/email (not anything typed in the page)
 *       - shows success + redirects ONLY after the write resolves
 *       - on failure: no redirect, button re-enabled with the original label
 *       - double click / repeated events => ONE write
 *       - retry after a failure reuses the same doc id
 *       - no signed-in user => error, nothing written
 *       - blocked while required questions are unanswered
 *  2. js/survey-schema.js pure helpers (labels, sort with missing fields,
 *     filter/search, stats, never "null"/"undefined"/"[object Object]").
 *  3. Consistency: radio values in pages/feedback.html === answer maps in
 *     survey-schema.js === value lists in firestore.rules, and every admin
 *     page has the Feedback nav link in the right place.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) { passed += 1; console.log('  ok   - ' + name); }
  else { failed += 1; console.log('  FAIL - ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ── 1. feedback.js behaviour ─────────────────────────────────────── */

function makeHarness({ user, setDocImpl, search = '?level=basic', checked, comment = '' }) {
  const writes = [];
  const toasts = [];
  const redirects = [];
  const btn = { disabled: false, textContent: '\n            Submit Feedback & Continue\n          ' };
  const answersChecked = checked || { q1: '4', q2: '5', q3: 'just_right', q4: 'yes' };

  const document = {
    querySelector(sel) {
      const m = /input\[name="(q\d)"\]:checked/.exec(sel);
      if (m) return answersChecked[m[1]] !== undefined ? { value: answersChecked[m[1]] } : null;
      return { closest: () => ({ scrollIntoView() {} }) }; // scrollToQuestion
    },
    getElementById(id) {
      if (id === 'btn-submit-survey') return btn;
      if (id === 'q5-text') return { value: comment, addEventListener() {}, style: {} };
      return null;
    },
    addEventListener() {},
  };
  const window = {
    location: { search, set href(v) {} },
    LinguaWave: { showToast: (m, t) => toasts.push([m, t]) },
  };
  Object.defineProperty(window, 'location', {
    value: { search, set href(v) { redirects.push(v); } }, writable: true,
  });
  // feedback.js does `window.location = 'dashboard.html'`
  const winProxy = new Proxy(window, {
    set(t, k, v) { if (k === 'location') { redirects.push(v); return true; } t[k] = v; return true; },
  });

  const stub = {
    auth: { authStateReady: async () => {}, currentUser: user },
    db: { __db: true },
    doc: (db, col, id) => ({ col, id }),
    getDoc: async () => ({ exists: () => true, data: () => ({ name: 'Profile Name', level: 'basic' }) }),
    setDoc: async (ref, data) => {
      if (setDocImpl) await setDocImpl(ref, data, writes);
      writes.push({ ref, data });
    },
  };

  let src = read('js/feedback.js');
  const importRe = /import \{[^}]*\} from '\.\/auth\.js';/;
  if (!importRe.test(src)) throw new Error('feedback.js import line not found — test needs updating');
  src = src.replace(importRe, 'const { auth, db, doc, getDoc, setDoc } = __stub;');

  const timers = [];
  const ctx = vm.createContext({
    window: winProxy, document, __stub: stub, console: { ...console, error() {}, warn() {} },
    URLSearchParams, Date, Promise, String, Number, Math,
    CSS: { supports: () => true },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
  });
  vm.runInContext(src, ctx, { filename: 'feedback.js' });
  return { submit: () => winProxy.submitSurvey(), writes, toasts, redirects, btn, timers };
}

async function testFeedbackJs() {
  console.log('\nfeedback.js submitSurvey()');
  const goodUser = { uid: 'uid123', email: 'jane@example.com', displayName: 'Jane D' };

  // success
  {
    const h = makeHarness({ user: goodUser, comment: '  Loved it  ' });
    await h.submit();
    check('writes exactly one document', h.writes.length === 1, h.writes.length);
    const w = h.writes[0];
    check('collection is "surveys"', w.ref.col === 'surveys');
    check('doc id is {uid}_{level}_{timestamp}', /^uid123_basic_\d+$/.test(w.ref.id), w.ref.id);
    check('userId from Firebase user', w.data.userId === 'uid123');
    check('userEmail from Firebase user', w.data.userEmail === 'jane@example.com');
    check('userName from users/{uid} profile', w.data.userName === 'Profile Name', w.data.userName);
    check('level from ?level=', w.data.level === 'basic');
    check('answers q1..q5 stored (comment trimmed)',
      JSON.stringify(w.data.answers) === JSON.stringify({ q1: '4', q2: '5', q3: 'just_right', q4: 'yes', q5: 'Loved it' }),
      w.data.answers);
    check('submittedAt is an ISO string', !Number.isNaN(Date.parse(w.data.submittedAt)) && /T.*Z$/.test(w.data.submittedAt));
    check('only expected top-level fields',
      Object.keys(w.data).sort().join() === 'answers,level,submittedAt,userEmail,userId,userName');
    check('success toast shown', h.toasts.some(([m, t]) => /Thanks/.test(m) && t === 'success'));
    check('no error toast', !h.toasts.some(([, t]) => t === 'error'));
    check('redirect scheduled (after write)', h.timers.some((t) => t.ms === 900));
    check('redirect has not fired synchronously', h.redirects.length === 0);
    h.timers.filter((t) => t.ms === 900).forEach((t) => t.fn());
    check('redirects to dashboard.html', h.redirects[0] === 'dashboard.html', h.redirects);
  }

  // empty comment -> null
  {
    const h = makeHarness({ user: goodUser, comment: '   ' });
    await h.submit();
    check('empty comment stored as null', h.writes[0].data.answers.q5 === null);
  }

  // level fallbacks
  {
    const h = makeHarness({ user: goodUser, search: '?level=<script>' });
    await h.submit();
    check('invalid ?level= falls back to profile level (never raw input)', h.writes[0].data.level === 'basic', h.writes[0].data.level);
    const h2 = makeHarness({ user: goodUser, search: '?level=Intermediate' });
    await h2.submit();
    check('?level= is case-normalised', h2.writes[0].data.level === 'intermediate');
    check('different level => different doc id', h2.writes[0].ref.id.startsWith('uid123_intermediate_'));
  }

  // failure: no redirect, button restored
  {
    const h = makeHarness({ user: goodUser, setDocImpl: async () => { throw new Error('boom'); } });
    await h.submit();
    check('failed write: no document recorded', h.writes.length === 0);
    check('failed write: error toast', h.toasts.some(([, t]) => t === 'error'));
    check('failed write: NO success toast', !h.toasts.some(([, t]) => t === 'success'));
    check('failed write: NO redirect scheduled', !h.timers.some((t) => t.ms === 900) && h.redirects.length === 0);
    check('failed write: button re-enabled', h.btn.disabled === false);
    check('failed write: original label restored', h.btn.textContent === 'Submit Feedback & Continue', h.btn.textContent);
  }

  // retry reuses the same id
  {
    let calls = 0;
    const ids = [];
    const h = makeHarness({
      user: goodUser,
      setDocImpl: async (ref) => { ids.push(ref.id); calls += 1; if (calls === 1) throw new Error('offline'); },
    });
    await h.submit();
    await h.submit();
    check('retry after failure succeeds', h.writes.length === 1);
    check('retry reuses the SAME doc id', ids.length === 2 && ids[0] === ids[1], ids);
  }

  // double click -> one write
  {
    let release;
    const gate = new Promise((r) => { release = r; });
    const h = makeHarness({ user: goodUser, setDocImpl: async () => { await gate; } });
    const p1 = h.submit();
    const p2 = h.submit();
    const p3 = h.submit();
    await tick(5);
    check('button disabled + "Submitting…" while in flight', h.btn.disabled === true && h.btn.textContent === 'Submitting…', h.btn.textContent);
    release();
    await Promise.all([p1, p2, p3]);
    check('3 rapid calls => ONE write', h.writes.length === 1, h.writes.length);
    await h.submit();
    check('click after success (during redirect delay) => still ONE write', h.writes.length === 1, h.writes.length);
  }

  // not signed in
  {
    const h = makeHarness({ user: null });
    await h.submit();
    check('no user: nothing written', h.writes.length === 0);
    check('no user: error toast, no redirect', h.toasts.some(([, t]) => t === 'error') && h.redirects.length === 0 && !h.timers.some((t) => t.ms === 900));
    check('no user: button usable again', h.btn.disabled === false);
  }

  // missing required
  {
    const h = makeHarness({ user: goodUser, checked: { q1: '3', q2: '3', q3: 'too_easy' } });
    await h.submit();
    check('missing q4: blocked, no write', h.writes.length === 0);
    check('missing q4: validation toast', h.toasts.some(([m, t]) => /answer every question/i.test(m) && t === 'error'));
    check('missing q4: button never locked', h.btn.disabled === false);
  }
}

/* ── 2. survey-schema.js ──────────────────────────────────────────── */

async function testSchema() {
  console.log('\nsurvey-schema.js');
  const tmp = path.join(os.tmpdir(), 'lw-survey-schema-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, read('js/survey-schema.js'));
  const S = await import('file://' + tmp);
  fs.unlinkSync(tmp);

  const q = (k) => S.SURVEY_QUESTIONS.find((x) => x.key === k);
  check('q1 numeric label', S.formatAnswer(q('q1'), '4') === '4: Very Good', S.formatAnswer(q('q1'), '4'));
  check('q2 uses its own scale', S.formatAnswer(q('q2'), '1') === '1: Very Unclear');
  check('q3 label', S.formatAnswer(q('q3'), 'too_hard') === 'Too Hard');
  check('q4 label', S.formatAnswer(q('q4'), 'maybe') === 'Maybe');

  const bad = [null, undefined, '', '   ', {}, [], { a: 1 }, true];
  const outs = bad.map((v) => S.formatAnswer(q('q1'), v));
  check('null/undefined/empty/objects => "Not answered"', outs.every((o) => o === S.NO_ANSWER_TEXT), outs);
  check('unknown legacy value shown as plain text', S.formatAnswer(q('q3'), 'weird') === 'weird');
  check('comment: string trimmed', S.getComment({ q5: '  hi ' }) === 'hi');
  check('comment: null/undefined/object => null',
    S.getComment({ q5: null }) === null && S.getComment({}) === null && S.getComment({ q5: {} }) === null && S.getComment(undefined) === null);
  check('no question label contains raw keys', S.SURVEY_QUESTIONS.every((x) => /^Question \d$/.test(x.label)));

  // normalisation of legacy / malformed docs
  const legacy = S.normalizeSurvey('a1', { userId: 'u1', level: 'unknown', answers: { q1: '3' }, submittedAt: '2026-09-01T00:00:00.000Z' });
  check('legacy doc normalises without throwing', legacy.userName === '' && legacy.userEmail === '' && legacy.submittedMs === Date.parse('2026-09-01T00:00:00.000Z'));
  const junk = S.normalizeSurvey('z', { answers: 'nope', submittedAt: { weird: true }, userName: 5 });
  check('malformed doc gets safe defaults', junk.answers && typeof junk.answers === 'object' && junk.submittedMs === null && junk.userName === '');
  check('Firestore Timestamp-like supported', S.normalizeSurvey('t', { submittedAt: { toMillis: () => 12345 } }).submittedMs === 12345);
  check('level "unknown" => other bucket', S.levelKey('unknown') === 'other' && S.levelLabel(undefined) === 'Other / unknown');

  // enrich
  const enriched = S.enrichWithUsers([legacy, S.normalizeSurvey('b', { userId: 'nope' })], [{ id: 'u1', name: 'Ann', email: 'ann@x.com' }]);
  check('legacy row filled from users list', enriched[0].userName === 'Ann' && enriched[0].userEmail === 'ann@x.com');
  check('unmatched row stays "Unknown learner"', S.displayName(enriched[1]) === 'Unknown learner');

  // sorting
  const rows = [
    S.normalizeSurvey('old', { submittedAt: '2026-01-01T00:00:00Z' }),
    S.normalizeSurvey('nodate', {}),
    S.normalizeSurvey('new', { submittedAt: '2026-09-29T10:00:00Z' }),
    S.normalizeSurvey('mid', { submittedAt: '2026-05-01T00:00:00Z' }),
    S.normalizeSurvey('bad', { submittedAt: 'not a date' }),
  ];
  const sorted = S.sortNewestFirst(rows).map((r) => r.id);
  check('newest first, undated last', sorted.slice(0, 3).join() === 'new,mid,old' && sorted.slice(3).sort().join() === 'bad,nodate', sorted);
  check('sorting does not mutate input', rows[0].id === 'old');

  // filter / search
  const data = [
    S.normalizeSurvey('1', { userName: 'John Doe', userEmail: 'john@example.com', level: 'basic', answers: { q5: 'The lessons were easy to follow.' }, submittedAt: '2026-09-29T00:00:00Z' }),
    S.normalizeSurvey('2', { userName: 'Mary', userEmail: 'mary@school.edu', level: 'medium', answers: { q5: null }, submittedAt: '2026-09-28T00:00:00Z' }),
    S.normalizeSurvey('3', { userName: 'Ken', userEmail: 'ken@school.edu', level: 'unknown', answers: {}, submittedAt: '2026-09-27T00:00:00Z' }),
  ];
  check('level filter', S.filterSurveys(data, { level: 'medium' }).map((r) => r.id).join() === '2');
  check('search by name', S.filterSurveys(data, { term: 'john' }).length === 1);
  check('search by email', S.filterSurveys(data, { term: 'SCHOOL.EDU' }).length === 2);
  check('search by comment', S.filterSurveys(data, { term: 'easy to follow' }).map((r) => r.id).join() === '1');
  check('level + search combine', S.filterSurveys(data, { level: 'basic', term: 'school' }).length === 0);
  check('empty filters => all', S.filterSurveys(data, {}).length === 3);
  check('unknown-level rows never match a real level filter', !S.filterSurveys(data, { level: 'basic' }).some((r) => r.id === '3'));

  // stats
  const now = Date.parse('2026-09-30T00:00:00Z');
  const st = S.computeSurveyStats(data, now);
  check('stats: total', st.total === 3);
  check('stats: by level (incl. other)', st.byLevel.basic === 1 && st.byLevel.medium === 1 && st.byLevel.intermediate === 0 && st.byLevel.other === 1, st.byLevel);
  check('stats: this week', st.thisWeek === 3, st.thisWeek);
  check('stats: latest', st.latestMs === Date.parse('2026-09-29T00:00:00Z'));
  check('stats: week window excludes older', S.computeSurveyStats(data, Date.parse('2026-10-05T12:00:00Z')).thisWeek === 1);
  const empty = S.computeSurveyStats([], now);
  check('stats: empty dataset => zeros, null latest', empty.total === 0 && empty.thisWeek === 0 && empty.latestMs === null);
  check('formatDate(bad) is readable', S.formatDate(NaN) === 'Unknown date' && S.formatDate(null) === 'Unknown date');
}

/* ── 3. consistency: form <-> schema <-> rules <-> nav ───────────── */

async function testConsistency() {
  console.log('\nform / schema / rules / nav consistency');
  const html = read('pages/feedback.html');
  const rules = read('firestore.rules');

  const formValues = {};
  for (const m of html.matchAll(/<input type="radio" name="(q\d)" value="([^"]+)"/g)) {
    (formValues[m[1]] = formValues[m[1]] || []).push(m[2]);
  }
  check('form has q1..q4 radios', ['q1', 'q2', 'q3', 'q4'].every((k) => formValues[k] && formValues[k].length));
  check('form has q5 textarea', /id="q5-text"/.test(html));

  const tmp = path.join(os.tmpdir(), 'lw-survey-schema2-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, read('js/survey-schema.js'));
  const S = await import('file://' + tmp);
  fs.unlinkSync(tmp);

  for (const qs of S.SURVEY_QUESTIONS) {
    const schemaKeys = Object.keys(qs.map).sort().join();
    check(`${qs.key}: schema labels cover exactly the form's values`, schemaKeys === [...formValues[qs.key]].sort().join(), { schemaKeys, form: formValues[qs.key] });
    const m = new RegExp('a\\.' + qs.key + ' in \\[([^\\]]*)\\]').exec(rules);
    const ruleVals = m ? m[1].split(',').map((s) => s.trim().replace(/'/g, '')).sort().join() : null;
    check(`${qs.key}: firestore.rules allows exactly the form's values`, ruleVals === [...formValues[qs.key]].sort().join(), ruleVals);
    const qText = new RegExp('name="' + qs.key + '"').test(html) &&
      html.includes(qs.text);
    check(`${qs.key}: admin question text matches feedback.html wording`, qText, qs.text);
  }

  const lvl = /d\.level in \[([^\]]*)\]/.exec(rules);
  check('rules level list === SURVEY_LEVELS',
    lvl && lvl[1].split(',').map((s) => s.trim().replace(/'/g, '')).join() === S.SURVEY_LEVELS.join());
  check('rules: learners cannot read/update/delete surveys',
    /allow update: if false;/.test(rules) && /allow get, list, delete: if isAdmin\(\);/.test(rules));
  check('rules: create requires own uid + id prefix + email match',
    /id\.matches\(request\.auth\.uid \+ '_\.\+'\)/.test(rules) &&
    /d\.userId == request\.auth\.uid/.test(rules) &&
    /d\.userEmail\.lower\(\) == request\.auth\.token\.email\.lower\(\)/.test(rules));
  const surveyBlock = rules.slice(rules.indexOf('match /surveys/{id}'), rules.indexOf('// ── everything else'));
  check('rules: no blanket "allow read" on surveys', !/allow (read|write)[^;]*:\s*if signedIn\(\);/.test(surveyBlock));

  // admin email single source across files
  const emails = ['js/admin-auth.js', 'js/role-guard.js', 'js/admin-firebase.js', 'firestore.rules']
    .map((f) => (read(f).match(/linguawave\.project@gmail\.com/g) || []).length);
  check('admin email present in auth guard, role guard, firebase layer and rules', emails.every((n) => n >= 1), emails);

  // writer payload keys match the rules' allowed keys
  const fb = read('js/feedback.js');
  const surveyRules = rules.split('match /surveys/{id}')[1] || '';
  const allowedSurveyKeys = /d\.keys\(\)\.hasOnly\(\[([^\]]*)\]\)/.exec(surveyRules);
  const ruleKeys = allowedSurveyKeys ? allowedSurveyKeys[1].split(',').map((s) => s.trim().replace(/'/g, '')).sort().join() : '';
  check('rules allowed top-level keys === writer keys', ruleKeys === 'answers,level,submittedAt,userEmail,userId,userName', ruleKeys);
  check('feedback.js does not import from window.LWAuth handles (one Firebase init)', !/initializeApp|firebaseConfig/.test(fb));
  check('feedback.js module import comes from ./auth.js', /from '\.\/auth\.js'/.test(fb));
  check('feedback.html loads feedback.js as a module', /<script type="module" src="\.\.\/js\/feedback\.js">/.test(html));
  check('auth.js exports setDoc as a module export (not on window.LWAuth)',
    /export \{[^}]*\bsetDoc\b[^}]*\};/.test(read('js/auth.js')) &&
    !/window\.LWAuth = \{[^}]*setDoc/.test(read('js/auth.js')));

  // nav
  const order = ['admin-dashboard', 'admin-lessons', 'admin-users', 'admin-feedback', 'admin-reports'];
  for (const p of order) {
    const page = read('pages/' + p + '.html');
    const links = [...page.matchAll(/<a href="(admin-[a-z]+)\.html" class="app-sidebar__link/g)].map((m) => m[1]);
    check(`${p}.html sidebar order`, links.join() === order.join(), links);
  }
  const fp = read('pages/admin-feedback.html');
  check('admin-feedback.html uses requireAdmin() via controller', /admin-feedback\.js/.test(fp) && /requireAdmin\(\)/.test(read('js/admin-feedback.js')));
  check('admin-feedback.html gated + noindex', /class="admin-gate"/.test(fp) && /noindex/.test(fp) && /role-guard\.js/.test(fp));
  check('page title/description text', /<h1>Feedback &amp; Surveys<\/h1>/.test(fp) && /Review learner feedback submitted through LinguaWave\./.test(fp));
  check('loading / empty / error copy present',
    /Loading feedback&hellip;/.test(fp) && /Unable to load feedback\.<br \/>Please try again\./.test(fp) &&
    /No feedback submissions yet\./.test(read('js/admin-feedback.js')));
  check('admin-feedback.js has no browser-storage / static data source',
    !/localStorage|sessionStorage/.test(read('js/admin-feedback.js')) && !/mock|hardcoded/i.test(read('js/admin-feedback.js').replace(/^\/\*\*[\s\S]*?\*\//, '')));
  check('dashboard: feedback tile + quick link', /id="stat-feedback"/.test(read('pages/admin-dashboard.html')) &&
    /Feedback &amp; Surveys/.test(read('pages/admin-dashboard.html')) && /Review learner feedback and survey responses\./.test(read('pages/admin-dashboard.html')));
  check('reports: feedback section ids exist in html and are used by js',
    ['report-total-feedback', 'report-feedback-by-level', 'report-recent-feedback'].every((id) =>
      read('pages/admin-reports.html').includes('id="' + id + '"') && read('js/admin-reports.js').includes(id)));
}

(async () => {
  await testFeedbackJs();
  await testSchema();
  await testConsistency();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
