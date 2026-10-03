import { SENTENCES } from './construct-sentences.js';

const $ = (id) => document.getElementById(id);
const root = $('cs');

const ROUND_COUNT = 5;                       // sentences per run
const COUNTDOWN = ['3', '2', '1', 'GO!'];
const STEP_MS = 700;
const DRAG_THRESHOLD = 6;                    // px before a press becomes a drag (below it, it is a tap)
const NEXT_ROUND_MS = 1100;
const SHOW_ALL = new URLSearchParams(location.search).has('all');   // testing: skip the learned-sign filter

let phase = 'idle';                          // idle | countdown | playing | checking | done
let rounds = [], roundIndex = 0, misses = 0, playMs = 0, roundStartedAt = 0;
let tickId = null, timers = new Set(), selected = null, drag = null, justDragged = false, wasFull = false;
let lastEligible = 0, lastLearnedOnly = true;   // how many sentences matched the learner's signs on the last Start

const norm = (v) => String(v || '').trim().toLowerCase();
const formatTime = (ms) => `${(ms / 1000).toFixed(1)}s`;
const setStatus = (message) => { $('cs-status').textContent = message; };
const slotsEl = () => $('cs-slots');
const poolEl = () => $('cs-pool');
const tileIn = (slot) => slot.querySelector(':scope > .cs-tile');

function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); }
function clearTimers() { timers.forEach(clearTimeout); timers.clear(); }
function withTimeout(promise, ms, label) {
  let id;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => { id = setTimeout(() => reject(new Error(`${label} timed out.`)), ms); })
  ]).finally(() => clearTimeout(id));
}
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- content ---------- */

// ─────────────────────────────────────────────────────────────────────────────
// LEARNED-SIGNS FILTER: TEMPORARILY DISABLED.
// For now the game uses EVERY sentence in js/construct-sentences.js, whether or not the learner has finished the lessons.
// TO RE-ENABLE (once every word is learnable): delete the `return null;` line in getLearned() below, and
// uncomment the block under "ORIGINAL" (it waits for the XP service, then returns the set of learned signs).
// Nothing else needs to change: buildRounds() and the "Practice with all signs" button already handle a learned set.
// ─────────────────────────────────────────────────────────────────────────────
async function getLearned(useAll) {
  return null;   // <- delete this line to turn the learned-signs filter back on

  /* ORIGINAL (uncomment when re-enabling):
  if (useAll || SHOW_ALL) return null;
  await whenXpReady();
  if (typeof window.LWXP?.getLearnedSigns !== 'function') throw new Error('The learned-sign service is unavailable. Reload the page and try again.');
  const ids = await withTimeout(window.LWXP.getLearnedSigns(), 12000, 'Loading learned signs');
  return new Set([...ids].map(norm));
  */
}

// LWXP is set by js/xp.js (a module). If it has not finished loading yet, wait for its ready event instead of failing.
// (Only used by the learned-signs filter above, so it is idle while that filter is disabled.)
function whenXpReady(ms = 5000) {
  if (typeof window.LWXP?.getLearnedSigns === 'function') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(id); document.removeEventListener('lwxp-ready', done); resolve(); };
    const id = setTimeout(done, ms);
    document.addEventListener('lwxp-ready', done);
  });
}

// Every plain .mp4 demo on file for a sign, best first (YouTube embeds can't be dragged around, so they don't count).
// A tile tries them in order, so one missing file no longer leaves a blank tile.
function mp4Candidates(signId) {
  const M = window.LWMissions, signs = M?.content?.SIGNS || [];
  const entry = signs.find((s) => norm(s.signId) === norm(signId) && s.videoUrl) || signs.find((s) => norm(s.signId) === norm(signId));
  if (!entry) return [];
  const content = M.getSign?.(entry.level, entry.signId, entry.category) || entry;
  const urls = M.getSignVideoUrls ? M.getSignVideoUrls(entry.signId, content.videoUrl) : [content.videoUrl];
  return [...new Set(urls.filter((url) => url && !/youtube/i.test(url)))];
}

function buildRounds(learned) {
  const unplayable = new Set();
  const playable = SENTENCES.filter((s) => {
    const missing = s.words.filter((w) => !mp4Candidates(w).length);
    missing.forEach((w) => unplayable.add(w));
    return !missing.length;
  });
  if (unplayable.size) console.warn('[construct-sentence] no .mp4 found for:', [...unplayable].join(', '));
  const eligible = learned ? playable.filter((s) => s.words.every((w) => learned.has(norm(w)))) : playable;
  const picked = shuffle(eligible).slice(0, ROUND_COUNT).map((s) => ({ text: s.text, words: s.words, videos: s.words.map(mp4Candidates) }));
  return { rounds: picked, eligible: eligible.length };
}

/* ---------- board ---------- */

function makeTile(sign, urls) {
  const tile = document.createElement('div');
  tile.className = 'cs-tile'; tile.dataset.sign = sign; tile.tabIndex = 0; tile.setAttribute('role', 'button');
  const video = document.createElement('video');
  let tried = 0;
  video.src = urls[0]; video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
  video.preload = 'auto'; video.disablePictureInPicture = true; video.setAttribute('aria-hidden', 'true');
  video.addEventListener('error', () => {
    tried++;
    if (tried < urls.length) { video.src = urls[tried]; video.load(); playTile(tile); return; }
    tile.dataset.novideo = '1'; refreshNames();      // no file loaded at all: keep the name visible so the round is still solvable
  });
  const name = document.createElement('span'); name.className = 'cs-tile__name'; name.textContent = sign;
  tile.append(video, name);
  return tile;
}
function makeSlot(index) {
  const slot = document.createElement('div');
  slot.className = 'cs-slot'; slot.tabIndex = 0; slot.setAttribute('role', 'button'); slot.setAttribute('aria-label', `Position ${index + 1}`);
  const num = document.createElement('span'); num.className = 'cs-slot__num'; num.textContent = index + 1; num.setAttribute('aria-hidden', 'true');
  slot.append(num);
  return slot;
}
const playTile = (tile) => tile?.querySelector('video')?.play?.().catch(() => {});

function scramble(tiles, words) {
  let out = shuffle(tiles);
  for (let i = 0; i < 12 && tiles.length > 1 && out.every((t, n) => t.dataset.sign === words[n]); i++) out = shuffle(tiles);
  return out;
}

function refreshNames() {
  const playing = phase === 'playing';
  document.querySelectorAll('.cs-tile').forEach((tile) => {
    const hide = playing && !tile.dataset.novideo;
    tile.classList.toggle('is-nameless', hide);
    tile.setAttribute('aria-label', hide ? 'Sign video' : tile.dataset.sign);
  });
}
function setPhase(next) {
  phase = next; root.dataset.phase = next; refreshNames();
  $('cs-check').disabled = true; $('cs-reset').disabled = next !== 'playing';
}

function showIdle() {
  $('cs-sentence').textContent = 'Ready?';
  $('cs-count').textContent = '';
  slotsEl().replaceChildren();
  const hint = document.createElement('p');
  hint.className = 'cs-empty'; hint.textContent = 'Press Start. You will see each sign with its name, then the names disappear and you drag the videos into order.';
  poolEl().replaceChildren(hint);
  $('cs-count-label').textContent = '0/0'; $('cs-time').textContent = '0.0s'; $('cs-misses').textContent = '0';
  document.querySelector('.cs-progress')?.style.setProperty('--p', 0);
}

function loadRound(index) {
  const round = rounds[index];
  selected = null; wasFull = false;
  root.style.setProperty('--cs-cols', Math.min(round.words.length, 3));   // phones: tiles are sized so one row holds up to 3
  $('cs-sentence').textContent = round.text;
  $('cs-count-label').textContent = `${index + 1}/${rounds.length}`;
  document.querySelector('.cs-progress')?.style.setProperty('--p', index / rounds.length);
  slotsEl().replaceChildren(...round.words.map((_, n) => makeSlot(n)));
  poolEl().replaceChildren(...scramble(round.words.map((w, n) => makeTile(w, round.videos[n])), round.words));
}

function startRound() {
  loadRound(roundIndex);
  setPhase('countdown');
  setStatus('Memorize the signs. The names disappear at GO!');
  countdown(0);
}

function countdown(step) {
  if (phase !== 'countdown') return;
  const label = $('cs-count');
  if (step >= COUNTDOWN.length) {
    label.textContent = '';
    roundStartedAt = performance.now();
    setPhase('playing');
    setStatus('Drag the sign videos into the right order. Tap a sign, then a slot, works too.');
    return;
  }
  label.textContent = COUNTDOWN[step];
  label.style.animation = 'none'; void label.offsetWidth; label.style.animation = '';
  later(() => countdown(step + 1), STEP_MS);
}

/* ---------- moving tiles ---------- */

function swap(a, b) { const mark = document.createElement('span'); a.replaceWith(mark); b.replaceWith(a); mark.replaceWith(b); }
function setSelected(tile) {
  selected?.classList.remove('is-selected');
  selected = tile; tile?.classList.add('is-selected');
  if (tile) setStatus('Now tap the slot where it belongs.');
}

function tapTile(tile) {
  if (phase !== 'playing') return;
  if (selected === tile) return setSelected(null);
  const inSlot = tile.parentElement.classList.contains('cs-slot');
  if (selected && inSlot) { swap(selected, tile); setSelected(null); return afterChange(); }
  if (selected) return setSelected(tile);
  if (inSlot) { poolEl().append(tile); playTile(tile); return afterChange(); }   // tap a placed sign to take it back
  setSelected(tile);
}
function tapSlot(slot) {
  if (phase !== 'playing' || !selected) return;
  const occupant = tileIn(slot), moving = selected;
  if (occupant) swap(moving, occupant); else slot.append(moving);
  setSelected(null); playTile(moving); playTile(occupant); afterChange();
}

function onPointerDown(event) {
  if (phase !== 'playing' || event.button > 0 || drag) return;
  const tile = event.target.closest('.cs-tile');
  if (!tile) return;
  const r = tile.getBoundingClientRect();
  drag = { tile, id: event.pointerId, sx: event.clientX, sy: event.clientY, ox: event.clientX - r.left, oy: event.clientY - r.top, w: r.width, h: r.height, active: false, origin: tile.parentElement, ph: null };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
function beginDrag() {
  const { tile } = drag, ph = document.createElement('div');
  ph.className = 'cs-ph'; ph.style.width = `${drag.w}px`; ph.style.height = `${drag.h}px`;
  tile.replaceWith(ph); drag.ph = ph; drag.active = true;
  if (selected) setSelected(null);
  tile.classList.add('is-drag'); tile.style.width = `${drag.w}px`; tile.style.height = `${drag.h}px`;
  document.body.append(tile);               // out of any transformed ancestor so position:fixed is reliable
  playTile(tile);
}
const targetAt = (x, y) => document.elementFromPoint(x, y)?.closest('.cs-slot, .cs-pool') || null;
function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.id) return;
  if (!drag.active) {
    if (Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) < DRAG_THRESHOLD) return;
    beginDrag();
  }
  drag.tile.style.left = `${event.clientX - drag.ox}px`; drag.tile.style.top = `${event.clientY - drag.oy}px`;
  document.querySelectorAll('.cs-slot.is-over').forEach((s) => s.classList.remove('is-over'));
  const over = targetAt(event.clientX, event.clientY);
  if (over?.classList.contains('cs-slot')) over.classList.add('is-over');
}
function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.id) return;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  const d = drag; drag = null;
  document.querySelectorAll('.cs-slot.is-over').forEach((s) => s.classList.remove('is-over'));
  if (!d.active) { if (event.type === 'pointerup') tapTile(d.tile); return; }
  justDragged = true; setTimeout(() => { justDragged = false; }, 0);
  const { tile, ph } = d, target = event.type === 'pointerup' ? targetAt(event.clientX, event.clientY) : null;
  tile.classList.remove('is-drag'); tile.removeAttribute('style');
  if (target?.classList.contains('cs-slot') && target !== ph.parentElement) {
    const occupant = tileIn(target);
    if (occupant) ph.replaceWith(occupant); else ph.remove();   // the displaced sign takes the dragged sign's old spot
    target.append(tile); playTile(occupant);
  } else if (target?.classList.contains('cs-pool') && ph.parentElement.classList.contains('cs-slot')) {
    ph.remove(); poolEl().append(tile);
  } else {
    ph.replaceWith(tile);                                        // dropped nowhere useful: snap back
  }
  playTile(tile); afterChange();
}

/* ---------- checking ---------- */

function clearMarks() { slotsEl().querySelectorAll('.cs-slot').forEach((s) => s.classList.remove('is-wrong', 'is-right')); }

function playAll() { document.querySelectorAll('.cs-tile video').forEach((v) => v.play?.().catch(() => {})); }   // moving a <video> in the DOM pauses it

function afterChange() {
  clearMarks(); playAll();
  const slots = [...slotsEl().children], full = slots.length > 0 && slots.every((s) => tileIn(s));
  $('cs-check').disabled = !full || phase !== 'playing';
  if (full && !wasFull) check();          // auto-check when the last slot is filled; swaps after that use the Check button
  wasFull = full;
}

function check() {
  if (phase !== 'playing') return;
  const round = rounds[roundIndex], slots = [...slotsEl().children];
  const got = slots.map((s) => tileIn(s)?.dataset.sign);
  if (got.some((g) => !g)) return;
  const right = got.map((g, i) => g === round.words[i]);
  if (right.every(Boolean)) return roundComplete();
  misses++; $('cs-misses').textContent = misses;
  slots.forEach((s, i) => { s.classList.remove('is-wrong', 'is-right'); void s.offsetWidth; s.classList.add(right[i] ? 'is-right' : 'is-wrong'); });
  setStatus(`${right.filter(Boolean).length} of ${right.length} in the right place. Rearrange and check again.`);
}

function roundComplete() {
  playMs += performance.now() - roundStartedAt;
  setPhase('checking');                   // names come back so they can see the finished sentence
  slotsEl().querySelectorAll('.cs-slot').forEach((s) => s.classList.add('is-right'));
  setStatus('Correct!');
  later(() => { if (roundIndex + 1 >= rounds.length) finish(); else { roundIndex++; startRound(); } }, NEXT_ROUND_MS);
}

/* ---------- run lifecycle ---------- */

function tick() {
  $('cs-time').textContent = formatTime(playMs + (phase === 'playing' ? performance.now() - roundStartedAt : 0));
}

async function start(useAll = false) {
  if (!(phase === 'idle' || phase === 'done') || $('cs-start').disabled) return;
  $('cs-start').disabled = true; $('cs-all').disabled = true;
  setStatus('Preparing sentences…');   // when the learned-signs filter is re-enabled, use: useAll ? 'Preparing sentences…' : 'Preparing your learned signs…'
  let built;
  try {
    built = buildRounds(await getLearned(useAll));
  } catch (error) {
    console.error('[construct-sentence] could not prepare run:', error);
    $('cs-error-message').textContent = error?.message || 'Could not prepare your sentences. Try again.';
    $('cs-error').hidden = false; $('cs-start').disabled = false; $('cs-all').disabled = false; setStatus('Could not start.');
    return;
  }
  rounds = built.rounds; lastEligible = built.eligible; lastLearnedOnly = !(useAll || SHOW_ALL);
  // Fewer than a full run of sentences match what the learner knows: offer every sentence instead of a dead end.
  $('cs-all').hidden = useAll || SHOW_ALL || built.eligible >= ROUND_COUNT;
  $('cs-all').disabled = false;
  if (!rounds.length) {
    setStatus('No sentences use only signs you have learned yet. Learn a few more signs, or practice with all signs.');
    $('cs-start').disabled = false; return;
  }
  $('cs-result').hidden = true; $('cs-start').hidden = true; $('cs-all').hidden = true; $('cs-quit').disabled = false;
  roundIndex = 0; misses = 0; playMs = 0; $('cs-misses').textContent = '0';
  clearInterval(tickId); tickId = setInterval(tick, 100);
  startRound();
}

function finish() {
  clearInterval(tickId); tickId = null; clearTimers();
  setPhase('done'); tick();
  document.querySelector('.cs-progress')?.style.setProperty('--p', 1);
  const total = rounds.length, accuracy = Math.round(total / (total + misses) * 100);
  $('cs-summary').textContent = `Time: ${formatTime(playMs)} · Sentences: ${total} · Misses: ${misses} · Accuracy: ${accuracy}%`;
  $('cs-result').hidden = false;
  $('cs-start').hidden = false; $('cs-start').disabled = false; $('cs-quit').disabled = true;
  $('cs-all').hidden = !lastLearnedOnly || lastEligible >= ROUND_COUNT;
  setStatus('Run complete.');
}

function quit() {
  clearInterval(tickId); tickId = null; clearTimers();
  if (drag) { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); window.removeEventListener('pointercancel', onPointerUp); drag.tile.remove(); drag = null; }
  selected = null; rounds = [];
  setPhase('idle'); showIdle();
  $('cs-start').hidden = false; $('cs-start').disabled = false; $('cs-quit').disabled = true;
  $('cs-all').hidden = !lastLearnedOnly || lastEligible >= ROUND_COUNT;
  setStatus('Run abandoned.');
}

/* ---------- wiring ---------- */

root.addEventListener('pointerdown', onPointerDown);
root.addEventListener('click', (event) => {
  if (justDragged) return;
  const slot = event.target.closest('.cs-slot');
  if (slot && !event.target.closest('.cs-tile')) tapSlot(slot);
});
root.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const tile = event.target.closest?.('.cs-tile'), slot = event.target.closest?.('.cs-slot');
  if (tile) { event.preventDefault(); tapTile(tile); } else if (slot) { event.preventDefault(); tapSlot(slot); }
});
$('cs-start').addEventListener('click', () => start(false));
$('cs-all').addEventListener('click', () => start(true));
$('cs-again').addEventListener('click', () => start(false));
$('cs-check').addEventListener('click', check);
$('cs-reset').addEventListener('click', () => {
  if (phase !== 'playing') return;
  setSelected(null);
  slotsEl().querySelectorAll('.cs-tile').forEach((t) => poolEl().append(t));
  afterChange();
});
$('cs-quit').addEventListener('click', () => { $('cs-quit-modal').hidden = false; $('cs-quit-cancel').focus(); });
$('cs-quit-cancel').addEventListener('click', () => { $('cs-quit-modal').hidden = true; });
$('cs-quit-confirm').addEventListener('click', () => { $('cs-quit-modal').hidden = true; quit(); });
$('cs-error-close').addEventListener('click', () => { $('cs-error').hidden = true; });
$('cs-error-retry').addEventListener('click', () => { $('cs-error').hidden = true; start(); });

setPhase('idle'); showIdle();