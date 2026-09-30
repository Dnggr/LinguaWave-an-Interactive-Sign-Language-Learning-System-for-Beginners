/*
  js/game-dev-test.js — DEVELOPER TEST PANEL for Wall Breaker  (TEMPORARY)
  ─────────────────────────────────────────────────────────────────────────
  PURPOSE   Lets the team test the LETTER and NUMBER signs (A–Z, 0–10) on both
            models without grinding through lessons first:
              • static model  -> HOLD signs   (24 letters, numbers 0-5, 7, 8)
              • motion model  -> MOVE signs   (J, Z, and numbers 6, 9, 10)
            Features: pick any subset for the wall (bypasses lesson progress),
            labels.json audit for both models, live detector readout, a
            "verified" checklist that survives reloads, force-break helpers to
            test the reward screen, and a copy-able QA report.

  REMOVE BEFORE THE FINAL DEFENSE — 3 steps, nothing else references this file:
    1. Delete this file (js/game-dev-test.js).
    2. Delete the <script> tag marked DEV-TEST in pages/game.html.
    3. Delete every line in js/game.js that contains "DEV-TEST"
       (find them with:  grep -n "DEV-TEST" js/game.js).
  Quick switch-off without deleting: set DEV_TEST_ENABLED = false below.

  SAFETY    Inert for learners. The panel only appears when the existing
            game-gate dev flag is set in the browser console:
                localStorage.setItem('lw_game_dev', '1')     (remove key = off)
            Without the flag this module returns immediately, injects nothing
            and never defines window.LWGameDev, so the hooks in game.js
            become no-ops.

  HOOKS     game.js calls window.LWGameDev.{getPool, blockSave, onStatic,
            onMotion, onSmash, onMiss, attach}. Every call is wrapped in
            try/catch inside game.js, so a bug here can never break the game.
  ─────────────────────────────────────────────────────────────────────────
*/
import { getSignsByCategory, getDetectionType } from './engine/dictionary.js';
import { isClassifierReady, isMotionModelReady, getMotionModelError } from './engine/classifier.js';

const DEV_TEST_ENABLED = true;              // false = switch the whole panel off
const FLAG = 'lw_game_dev';                 // same flag js/game-gate.js uses
const STORE = 'lw_game_devtest_v1';         // panel state + verified checklist
const STATIC_LABELS = '../asl_static_model/labels.json';
const MOTION_LABELS = '../asl_motion_model/labels.json';

function start() {
  const $ = (id) => document.getElementById(id);

  // ── the letter + number universe (same dictionary the game/classifier use) ──
  const LETTERS = getSignsByCategory('alphabet').filter((s) => /^[A-Z]$/.test(s)).sort();   // drops the ILY phrase entry
  const NUMBERS = getSignsByCategory('numbers').sort((a, b) => Number(a) - Number(b));
  const ALL = [...LETTERS, ...NUMBERS];
  const kind = (s) => (getDetectionType(s) === 'motion' ? 'motion' : 'static');
  const HOLD = ALL.filter((s) => kind(s) === 'static');
  const MOVE = ALL.filter((s) => kind(s) === 'motion');
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ── persisted state: { use, noSave, sel[], res{ sign:{pass,max} } } ──
  let st = { use: true, noSave: true, sel: ALL.slice(), res: {} };
  try {
    const j = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (j) st = { ...st, ...j, sel: (j.sel || st.sel).filter((s) => ALL.includes(s)) };
  } catch { /* corrupt entry -> defaults */ }
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch { /* private mode */ } };
  let persistT = null;
  const persistSoon = () => { clearTimeout(persistT); persistT = setTimeout(persist, 1500); };

  let api = null, coverage = null, forcing = false;
  const live = { s: null, m: null }, misses = [];
  const passed = (s) => (st.res[s]?.pass || 0) > 0;
  const bump = (label, conf) => {
    if (!ALL.includes(label) || typeof conf !== 'number') return;
    const r = (st.res[label] ||= { pass: 0, max: 0 });
    if (Math.round(conf) > r.max) { r.max = Math.round(conf); persistSoon(); }
  };

  // ── styles (tokens only, so light + dark follow the main theme) ──
  const css = document.createElement('style');
  css.id = 'gdt-style';
  css.textContent = `
.gdt-wrap{max-width:1180px;width:100%;margin:0 auto;padding:var(--space-4) var(--space-6) 0}
.gdt{border:1px dashed var(--clr-border-strong);border-radius:var(--radius-xl);background:var(--clr-surface);color:var(--clr-text)}
.gdt>summary{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-3);padding:var(--space-3) var(--space-5);cursor:pointer;border-radius:var(--radius-xl)}
.gdt>summary::-webkit-details-marker{display:none}
.gdt>summary::after{content:'';margin-left:auto;width:8px;height:8px;border-right:2px solid var(--clr-text-muted);border-bottom:2px solid var(--clr-text-muted);transform:rotate(45deg);transition:transform var(--dur-fast) var(--ease)}
.gdt[open]>summary::after{transform:rotate(-135deg)}
.gdt>summary:focus-visible,.gdt button:focus-visible,.gdt input:focus-visible{outline:3px solid var(--clr-accent);outline-offset:2px}
.gdt-title{font-family:var(--font-display);font-weight:700}
.gdt-pill{padding:2px var(--space-3);border-radius:var(--radius-pill);background:var(--clr-surface-2);color:var(--clr-text-muted);font-size:var(--fs-xs);font-weight:600;font-variant-numeric:tabular-nums}
.gdt-pill--live{font-family:var(--font-mono);min-width:9em;text-align:center}
.gdt-pill--live.is-match{background:var(--clr-success-soft);color:var(--clr-success)}
.gdt-body{display:flex;flex-direction:column;gap:var(--space-4);padding:0 var(--space-5) var(--space-5)}
.gdt-note{font-size:var(--fs-xs);color:var(--clr-text-muted)}
.gdt-h{font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--clr-text-muted);font-weight:700;margin-bottom:var(--space-2)}
.gdt-row{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-5);align-items:center}
.gdt-check{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-sm);cursor:pointer}
.gdt-check input{width:18px;height:18px;accent-color:var(--clr-accent)}
.gdt-chips{display:flex;flex-wrap:wrap;gap:var(--space-2)}
.gdt-chip{position:relative;min-width:44px;height:40px;padding:0 var(--space-3);border-radius:var(--radius-sm);font:700 var(--fs-base) var(--font-display);cursor:pointer;background:var(--clr-surface);color:var(--clr-text-muted);border:2px solid var(--clr-border-strong)}
.gdt-chip--motion{border-style:dashed}
.gdt-chip--static[aria-pressed="true"]{background:var(--clr-blue-soft);color:var(--clr-accent-text);border-color:var(--clr-accent)}
.gdt-chip--motion[aria-pressed="true"]{background:var(--clr-orange-soft);color:var(--clr-orange);border-color:var(--clr-orange)}
.gdt-chip.is-ok::after,.gdt-chip.is-miss::before{position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;font:700 11px/18px var(--font-body);text-align:center}
.gdt-chip.is-ok::after{content:'\\2713';background:var(--clr-success);color:var(--clr-text-invert)}
.gdt-chip.is-miss::before{content:'!';left:-7px;right:auto;background:var(--clr-red);color:var(--clr-text-invert)}
.gdt-legend{display:flex;flex-wrap:wrap;gap:var(--space-4);font-size:var(--fs-xs);color:var(--clr-text-muted)}
.gdt-ok{color:var(--clr-success)} .gdt-bad{color:var(--clr-red-text)}
.gdt-cov{font-size:var(--fs-sm);display:flex;flex-direction:column;gap:var(--space-1)}
.gdt-miss{list-style:none;font:var(--fs-xs) var(--font-mono);color:var(--clr-text-muted);max-height:120px;overflow:auto}
.gdt-miss li{padding:3px 0;border-bottom:1px dashed var(--clr-border)}
.gdt-todo{font-size:var(--fs-xs);color:var(--clr-text-muted);margin-top:var(--space-2);word-break:break-word}
@media (max-width:900px){.gdt-wrap{padding:var(--space-3) var(--space-4) 0}.gdt>summary{padding:var(--space-3) var(--space-4)}.gdt-body{padding:0 var(--space-4) var(--space-4)}}`;
  document.head.appendChild(css);

  // ── panel markup ──
  const wrap = document.createElement('div');
  wrap.className = 'gdt-wrap';
  wrap.innerHTML = `
<details class="gdt" id="gdt">
  <summary>
    <span class="badge badge--dev">Dev</span>
    <span class="gdt-title">Letters &amp; numbers test</span>
    <span class="gdt-pill" id="gdt-p-set"></span>
    <span class="gdt-pill" id="gdt-p-models"></span>
    <span class="gdt-pill gdt-pill--live" id="gdt-p-live" aria-hidden="true">idle</span>
  </summary>
  <div class="gdt-body">
    <p class="gdt-note">Temporary developer tool — removed before the final defense (steps at the top of js/game-dev-test.js). Only visible while <code>lw_game_dev</code> is set.</p>

    <div class="gdt-row">
      <label class="gdt-check"><input type="checkbox" id="gdt-use"> Use this test set on next Start (skips lesson progress)</label>
      <label class="gdt-check"><input type="checkbox" id="gdt-nosave"> Don't save test runs (gems, badges, best)</label>
    </div>

    <div>
      <div class="gdt-row" id="gdt-presets">
        <button type="button" class="btn btn--ghost btn--sm" data-p="all">All 37</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="letters">Letters</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="numbers">Numbers</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="hold">HOLD only</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="move">MOVE only</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="todo">Not verified yet</button>
        <button type="button" class="btn btn--ghost btn--sm" data-p="none">Clear</button>
      </div>
    </div>

    <div><h3 class="gdt-h">Letters</h3><div class="gdt-chips" id="gdt-letters"></div></div>
    <div><h3 class="gdt-h">Numbers</h3><div class="gdt-chips" id="gdt-numbers"></div></div>
    <div class="gdt-legend">
      <span>Solid = HOLD (static model)</span><span>Dashed = MOVE (motion model)</span>
      <span><b class="gdt-ok">✓</b> verified in a run</span><span><b class="gdt-bad">!</b> label missing in its model</span>
    </div>

    <div>
      <h3 class="gdt-h">Model check</h3>
      <div class="gdt-cov" id="gdt-cov">Checking labels…</div>
      <div class="gdt-row" style="margin-top:var(--space-2)"><button type="button" class="btn btn--ghost btn--sm" id="gdt-recheck">Recheck labels</button></div>
    </div>

    <div>
      <h3 class="gdt-h">Verified in runs · <span id="gdt-vcount"></span></h3>
      <div class="progress-bar"><div class="progress-bar__fill" id="gdt-vbar"></div></div>
      <p class="gdt-todo" id="gdt-todo"></p>
      <div class="gdt-row" style="margin-top:var(--space-2)">
        <button type="button" class="btn btn--secondary btn--sm" id="gdt-copy">Copy QA report</button>
        <button type="button" class="btn btn--ghost btn--sm" id="gdt-reset">Reset results</button>
      </div>
    </div>

    <div>
      <h3 class="gdt-h">During a run</h3>
      <div class="gdt-row">
        <button type="button" class="btn btn--ghost btn--sm" id="gdt-b-hold" disabled>Break all HOLD</button>
        <button type="button" class="btn btn--ghost btn--sm" id="gdt-b-move" disabled>Break all MOVE</button>
        <button type="button" class="btn btn--ghost btn--sm" id="gdt-b-all" disabled>Clear wall (test reward)</button>
        <span class="gdt-note">Shift+click a brick to force-break it. Forced breaks don't count as verified.</span>
      </div>
    </div>

    <div><h3 class="gdt-h">Recent misses</h3><ul class="gdt-miss" id="gdt-miss"><li>None yet</li></ul></div>
  </div>
</details>`;
  const gm = document.querySelector('.gm');
  if (!gm) return;                                   // not the game page
  gm.parentNode.insertBefore(wrap, gm);

  // ── rendering ──
  function chip(s) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sign = s;
    b.textContent = s;
    return b;
  }
  const chipHost = { letters: $('gdt-letters'), numbers: $('gdt-numbers') };
  LETTERS.forEach((s) => chipHost.letters.appendChild(chip(s)));
  NUMBERS.forEach((s) => chipHost.numbers.appendChild(chip(s)));

  function paintChips() {
    const bad = new Set([...(coverage?.missing || []), ...(coverage?.wrongModel || [])]);
    wrap.querySelectorAll('.gdt-chips button').forEach((b) => {
      const s = b.dataset.sign, k = kind(s), on = st.sel.includes(s);
      b.className = `gdt-chip gdt-chip--${k}${passed(s) ? ' is-ok' : ''}${bad.has(s) ? ' is-miss' : ''}`;
      b.setAttribute('aria-pressed', String(on));
      b.title = `${s} — ${k === 'motion' ? 'MOVE (motion model)' : 'HOLD (static model)'}${passed(s) ? ' · verified' : ''}${bad.has(s) ? ' · label missing in its model' : ''}`;
    });
  }
  function paintSummary() {
    $('gdt-p-set').textContent = st.use ? `Test set: ${st.sel.length} sign${st.sel.length === 1 ? '' : 's'}` : 'Test set OFF';
    const sOk = isClassifierReady(), mOk = isMotionModelReady();
    $('gdt-p-models').textContent = (sOk || mOk) ? `Static ${sOk ? '✓' : '✗'} · Motion ${mOk ? '✓' : '✗'}` : 'Models load on Start';
    $('gdt-use').checked = st.use; $('gdt-nosave').checked = st.noSave;
  }
  function paintTracker() {
    const n = ALL.filter(passed).length, rest = ALL.filter((s) => !passed(s));
    $('gdt-vcount').textContent = `${n}/${ALL.length}`;
    $('gdt-vbar').style.setProperty('--p', String(Math.round((n / ALL.length) * 100)));
    $('gdt-todo').textContent = rest.length ? `Not verified yet: ${rest.join(' ')}` : 'Every letter and number has been verified.';
  }
  function paintCoverage() {
    const el = $('gdt-cov');
    if (!coverage) { el.textContent = 'Checking labels…'; return; }
    if (coverage.error) { el.innerHTML = `<span class="gdt-bad">Could not read labels.json — ${coverage.error}</span>`; return; }
    const line = (ok, text) => `<span class="${ok ? 'gdt-ok' : 'gdt-bad'}">${ok ? '✓' : '✗'}</span> ${text}`;
    const rows = [
      line(coverage.holdOk === HOLD.length, `Static model: ${coverage.holdOk}/${HOLD.length} HOLD signs have a label`),
      line(coverage.moveOk === MOVE.length, `Motion model: ${coverage.moveOk}/${MOVE.length} MOVE signs have a label (${MOVE.join(' ')})`),
    ];
    if (coverage.missing.length) rows.push(line(false, `No label in either model: ${coverage.missing.join(' ')}`));
    if (coverage.wrongModel.length) rows.push(line(false, `dictionary.js types these as the other model: ${coverage.wrongModel.join(' ')}`));
    rows.push(`<span class="gdt-note">0 and O share one handshape — signing either breaks whichever brick is still on the wall.</span>`);
    el.innerHTML = rows.map((r) => `<div>${r}</div>`).join('');
  }
  function paintMisses() {
    const ul = $('gdt-miss');
    ul.innerHTML = '';
    if (!misses.length) { ul.innerHTML = '<li>None yet</li>'; return; }
    misses.forEach((m) => { const li = document.createElement('li'); li.textContent = `${new Date(m.t).toLocaleTimeString()}  ${m.text}`; ul.appendChild(li); });
  }
  function paintLive() {
    const now = performance.now();
    const s = live.s && now - live.s.at < 800 ? live.s : null;
    const m = live.m && now - live.m.at < 5000 ? live.m : null;
    const pick = s && m ? (s.at > m.at ? ['HOLD', s] : ['MOVE', m]) : m ? ['MOVE', m] : s ? ['HOLD', s] : null;
    const pill = $('gdt-p-live');
    if (!pick) { pill.textContent = 'idle'; pill.classList.remove('is-match'); return; }
    const [tag, r] = pick;
    pill.textContent = r.label ? `${tag} ${r.label} ${Math.round(r.confidence)}%${r.matched ? ' ✓' : ''}` : `${tag} —`;
    pill.classList.toggle('is-match', !!r.matched);
  }
  function paintRunButtons() {
    const on = !!api?.isRunning?.();
    ['gdt-b-hold', 'gdt-b-move', 'gdt-b-all'].forEach((id) => { $(id).disabled = !on; });
  }
  const paintAll = () => { paintChips(); paintSummary(); paintTracker(); paintCoverage(); paintMisses(); paintRunButtons(); };

  // ── labels.json audit (AGENTS.md "Model Label Alignment") ──
  async function checkCoverage() {
    coverage = null; paintCoverage();
    const get = async (p) => {
      const r = await fetch(p, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`);
      return new Set(Object.values(await r.json()));
    };
    try {
      const [S, M] = await Promise.all([get(STATIC_LABELS), get(MOTION_LABELS)]);
      const missing = [], wrongModel = [];
      ALL.forEach((s) => {
        const own = kind(s) === 'motion' ? M : S, other = kind(s) === 'motion' ? S : M;
        if (!own.has(s)) (other.has(s) ? wrongModel : missing).push(s);
      });
      coverage = { missing, wrongModel, holdOk: HOLD.filter((s) => S.has(s)).length, moveOk: MOVE.filter((s) => M.has(s)).length };
    } catch (e) { coverage = { error: e.message }; }
    paintChips(); paintCoverage();
  }

  // ── force-break helpers (test the reward screen / skip a stubborn sign) ──
  function force(filter) {
    if (!api?.isRunning?.()) return;
    forcing = true;
    try { api.bricks().filter((b) => !b.broken && filter(b)).forEach((b) => api.smashSign(b.sign)); }
    finally { forcing = false; }
  }
  $('gm-wall').addEventListener('click', (e) => {
    if (!e.shiftKey) return;
    const sign = e.target.closest('.gm-brick')?.querySelector('.gm-brick__sign')?.textContent;
    if (sign) force((b) => b.sign === sign);
  });

  // ── QA report ──
  function report() {
    const n = ALL.filter(passed).length;
    const lines = [`Wall Breaker dev test — ${new Date().toLocaleString()}`, `Verified ${n}/${ALL.length}`, ''];
    ALL.forEach((s) => {
      const r = st.res[s] || {};
      lines.push(`${kind(s) === 'motion' ? 'MOVE' : 'HOLD'}  ${s.padEnd(3)} ${r.pass ? `PASS x${r.pass}` : 'not verified'}${r.max ? `  best ${r.max}%` : ''}`);
    });
    if (coverage?.missing?.length) lines.push('', `Missing labels: ${coverage.missing.join(' ')}`);
    if (coverage?.wrongModel?.length) lines.push(`Wrong-model typing: ${coverage.wrongModel.join(' ')}`);
    return lines.join('\n');
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* blocked */ }
      ta.remove(); return ok;
    }
  }

  // ── wiring ──
  wrap.querySelector('.gdt-body').addEventListener('click', (e) => {
    const c = e.target.closest('.gdt-chip');
    if (c) {
      const s = c.dataset.sign;
      st.sel = st.sel.includes(s) ? st.sel.filter((x) => x !== s) : ALL.filter((x) => x === s || st.sel.includes(x));
      persist(); paintChips(); paintSummary(); return;
    }
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (p) {
      st.sel = p === 'all' ? ALL.slice() : p === 'letters' ? LETTERS.slice() : p === 'numbers' ? NUMBERS.slice()
             : p === 'hold' ? HOLD.slice() : p === 'move' ? MOVE.slice() : p === 'todo' ? ALL.filter((s) => !passed(s)) : [];
      persist(); paintChips(); paintSummary();
    }
  });
  $('gdt-use').addEventListener('change', (e) => { st.use = e.target.checked; persist(); paintSummary(); });
  $('gdt-nosave').addEventListener('change', (e) => { st.noSave = e.target.checked; persist(); });
  $('gdt-recheck').addEventListener('click', checkCoverage);
  $('gdt-b-hold').addEventListener('click', () => force((b) => b.type === 'static'));
  $('gdt-b-move').addEventListener('click', () => force((b) => b.type === 'motion'));
  $('gdt-b-all').addEventListener('click', () => force(() => true));
  $('gdt-copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget, ok = await copy(report());
    btn.textContent = ok ? 'Copied!' : 'Copy failed'; setTimeout(() => { btn.textContent = 'Copy QA report'; }, 1500);
  });
  $('gdt-reset').addEventListener('click', () => {
    if (!confirm('Clear every verified letter/number result?')) return;
    st.res = {}; persist(); paintChips(); paintTracker();
  });

  // ── the hooks game.js calls ──
  window.LWGameDev = {
    attach(a) { api = a; paintRunButtons(); },
    getPool() {                                      // replaces the learned-progress pool while "Use this test set" is on
      if (!st.use) return null;
      const signs = st.sel.filter((s) => ALL.includes(s));
      if (!signs.length) return null;
      const notes = [`DEV TEST wall — ${signs.length} letter/number sign${signs.length === 1 ? '' : 's'}, lesson progress bypassed.`];
      if (signs.some((s) => kind(s) === 'motion') && !isMotionModelReady()) notes.push(`Motion model not loaded (${getMotionModelError() || 'unknown reason'}) — MOVE bricks can't be detected.`);
      if (signs.includes('0') && signs.includes('O')) notes.push('0 and O share a handshape.');
      paintSummary();
      return { signs: shuffle(signs.slice()), learnedSet: new Set(signs), note: notes.join(' ') };
    },
    blockSave() { return st.use && st.noSave; },     // keep test runs out of gems / badges / best times
    onStatic(r) { if (!r) return; live.s = { label: r.label, confidence: r.confidence, matched: r.matched, at: performance.now() }; if (r.label) bump(r.label, r.confidence); },
    onMotion(r) { if (!r) return; live.m = { label: r.label, confidence: r.confidence, matched: r.matched, at: performance.now() }; if (r.label) bump(r.label, r.confidence); },
    onSmash(sign) {
      if (forcing || !ALL.includes(sign)) return;    // forced breaks never count as verified
      const r = (st.res[sign] ||= { pass: 0, max: 0 });
      r.pass++; persist(); paintChips(); paintTracker();
    },
    onMiss(text) { misses.unshift({ t: Date.now(), text }); misses.length = Math.min(misses.length, 8); paintMisses(); },
  };

  const tick = setInterval(() => { paintLive(); paintRunButtons(); paintSummary(); }, 250);
  window.addEventListener('pagehide', () => { clearInterval(tick); persist(); });
  paintAll();
  checkCoverage();
}

if (DEV_TEST_ENABLED) {
  let flagOn = false;
  try { flagOn = localStorage.getItem(FLAG) === '1'; } catch { /* storage blocked */ }
  if (flagOn) start();
}