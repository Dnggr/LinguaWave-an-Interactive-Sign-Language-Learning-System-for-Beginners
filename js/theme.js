/**
 * js/theme.js — Appearance (System / Light / Dark) controller
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Applies data-theme="light"|"dark" to <html> (the value
 *            every CSS token in css/style.css reads), based on a
 *            3-way PREFERENCE — 'system' | 'light' | 'dark' — stored
 *            in localStorage. 'system' tracks the OS-level
 *            prefers-color-scheme live, the same way Claude's own
 *            Settings → Appearance control behaves.
 *
 * CONNECTS : Loaded on every page. Two pieces are needed per page:
 *
 *   1. A tiny INLINE script in <head>, BEFORE the CSS <link> tags,
 *      that resolves + paints the theme synchronously pre-first-paint
 *      (see the exact snippet below). This is what kills the flash —
 *      of the wrong theme AND the flash of the browser's default
 *      white canvas — on every reload and every full-page navigation
 *      (this is a static multi-page app, so moving between panels
 *      like Learn → Settings is a real page load, not an SPA route
 *      change; the inline snippet has to run fresh on each one).
 *
 *   2. This file itself, deferred, which wires the actual controls
 *      (sidebar quick .theme-switch + Settings' 3-way segmented
 *      control) once the DOM is ready, and keeps 'system' live-synced
 *      to OS changes while the tab is open.
 *
 * USAGE — add this to the <head> of every page, BEFORE any CSS link,
 * as a literal inline script (not this file — this exact snippet):
 *
 *   <script>
 *     (function () {
 *       var pref = localStorage.getItem('lw-theme') || 'system';
 *       var resolved = pref === 'system'
 *         ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
 *         : pref;
 *       var root = document.documentElement;
 *       root.setAttribute('data-theme', resolved);
 *       root.setAttribute('data-theme-pref', pref);
 *       root.style.colorScheme = resolved;
 *       // Paints the correct background INSTANTLY, without waiting on
 *       // css/style.css to finish loading/parsing — this is the part
 *       // that actually stops the white flash between page loads.
 *       root.style.background = resolved === 'light' ? '#F8FAFC' : '#0F172A';
 *     })();
 *   </script>
 *
 * Then include this file normally near the end of <body> (or with
 * `defer`), and add the quick-toggle switch anywhere in the page
 * markup — a sliding sun/moon switch (interaction modeled on
 * VitePress/repomix.com's appearance toggle; aria-checked="true"
 * means dark is active):
 *
 *   <button class="theme-switch" id="theme-toggle" type="button" role="switch"
 *           aria-checked="false" title="Switch to dark theme" aria-label="Switch to dark theme">
 *     <span class="theme-switch__check">
 *       <svg class="theme-switch__icon theme-switch__icon--sun">…</svg>
 *       <svg class="theme-switch__icon theme-switch__icon--moon">…</svg>
 *     </span>
 *   </button>
 *
 * ...and/or the 3-way Settings control (see pages/settings.html):
 *
 *   <div class="theme-segmented" id="theme-segmented" role="radiogroup" aria-label="Theme">
 *     <button type="button" class="theme-segmented__opt" data-theme-value="system">…</button>
 *     <button type="button" class="theme-segmented__opt" data-theme-value="light">…</button>
 *     <button type="button" class="theme-segmented__opt" data-theme-value="dark">…</button>
 *   </div>
 *
 * BUTTON-ORIGINATED THEME TRANSITION (added 09-29)
 * A user-triggered change is not a fade or a page-wide swap: the NEW
 * theme starts at the control that was pressed and expands outward
 * until it covers the viewport. Where that control sits is measured
 * from its real getBoundingClientRect() on every change (never
 * hardcoded), so it follows the button through every responsive
 * layout (sidebar, navbar, phone navbar, Settings' segmented control).
 * The reveal radius is the distance from that point to the FARTHEST
 * viewport corner, so it always finishes fully covered wherever the
 * button is. The pressed control at an edge makes the reveal read as a
 * ~180° sweep across the interface (a half-disc); nothing in the DOM
 * is ever rotated or moved — only a snapshot layer is clipped.
 *   • Preferred: document.startViewTransition() + a clip-path circle
 *     animation on ::view-transition-new(root) (css/style.css §5c).
 *   • Fallback (no View Transitions API): a single fixed overlay in
 *     the new theme's colour expands from the same point, the theme is
 *     committed under it, then it fades out.
 *   • Instant (no animation at all): first paint / page load (never
 *     animates), prefers-reduced-motion or the in-app Reduced Motion
 *     switch, a hidden tab, another tab's change (storage event), and
 *     a "change" that doesn't actually change the resolved theme.
 * The preference is written to localStorage BEFORE any animation
 * starts, so persistence never depends on the animation finishing.
 * Storage key stays 'lw-theme' (every page's inline <head> snippet
 * reads that exact key; renaming it would reset saved preferences).
 * ─────────────────────────────────────────────────────────────────
 */

const THEME_STORAGE_KEY = 'lw-theme';
// Kept in sync with css/style.css's --clr-bg for light/dark (this
// session's blue/teal repaint — was '#FFF8F0'/'#1F1712' under the
// previous cream/near-black-brown palette) — see that file's token
// block for the source of truth these two values mirror.
const THEME_BG = { light: '#F8FAFC', dark: '#0F172A' };
const systemSchemeQuery = matchMedia('(prefers-color-scheme: light)');

// The raw preference — what the user actually picked: 'system', 'light',
// or 'dark'. Defaults to 'system' (matches the inline <head> snippet's
// fallback) so a first-time visitor's theme follows their OS until they
// explicitly choose otherwise, same default Claude's own Settings uses.
function getThemePreference() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
}

// The resolved theme actually painted on screen: always 'light' or
// 'dark', never 'system'. Everything in css/style.css keys off this
// (via the data-theme attribute), not the raw preference.
function resolveTheme(pref) {
  return pref === 'system' ? (systemSchemeQuery.matches ? 'light' : 'dark') : pref;
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Paints a resolved theme into the DOM and syncs every control. This is
// the ONLY place the theme attributes are written (applyTheme() below,
// the cross-tab 'storage' listener and the transition's update callback
// all funnel through it), so the animated and instant paths can't drift.
// Persisting to localStorage is deliberately NOT here — see applyTheme().
function commitTheme(pref, resolved) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-pref', pref);
  root.style.colorScheme = resolved;
  root.style.background = THEME_BG[resolved];
  syncToggleButtons(resolved);
  syncSegmentedControls(pref);
}

// pref: 'system' | 'light' | 'dark'
// originSource (optional): the control the user pressed (an Element), or
// an explicit {x, y} in viewport px. Omitted for changes with no control
// (OS theme flip while on 'system'), in which case the reveal starts at
// whichever theme control is currently visible.
function applyTheme(pref, originSource) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  const changes = root.getAttribute('data-theme') !== resolved;

  // Persist first: the preference must survive even if the animation is
  // interrupted, skipped, or the tab is closed mid-reveal. try/catch so
  // a blocked/full localStorage (private mode) can't abort the repaint.
  try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch (e) { /* non-fatal */ }

  // A veil-based (fallback) transition still in flight is finished on the
  // spot so this change is evaluated against the DOM as it really is.
  if (activeThemeVeil) activeThemeVeil.abort();

  if (!changes || !canAnimateTheme()) {
    commitTheme(pref, resolved);
    return;
  }
  runThemeTransition(resolveThemeOrigin(originSource), resolved, () => commitTheme(pref, resolved));
}

// Sidebar quick-toggle: a binary switch, so it only ever chooses an
// EXPLICIT light/dark — same convention as most apps' quick-toggle
// (it overrides 'system' rather than trying to represent it). Anyone
// who wants "follow my OS" back can still pick System in Settings.
// `source` is the pressed switch (or the click Event, from which the
// switch is taken) — it becomes the transition's origin.
function toggleTheme(source) {
  if (source && source.currentTarget) source = source.currentTarget;
  // pendingTheme: the target of a transition whose DOM commit hasn't landed
  // yet (the fallback overlay commits only once it covers the screen), so a
  // second press mid-animation flips BACK instead of re-choosing the same one.
  applyTheme((pendingTheme || getCurrentTheme()) === 'light' ? 'dark' : 'light', source);
}

/* ── Theme transition internals ─────────────────────────────────── */

let themeTransitionSeq = 0;   // id of the newest transition; an older one's cleanup must not strip a newer one's state
let activeThemeVeil = null;   // { abort() } while the no-View-Transitions fallback overlay is running
let pendingTheme = null;      // resolved theme a running transition is heading to, until its commit lands

// Same OS + in-app check js/tour.js and js/hero-decor.js use (3 lines,
// duplicated rather than shared because those files aren't loaded on
// every page and this one is).
function prefersReducedMotionTheme() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('lw-force-reduced-motion');
  } catch (e) {
    return false;
  }
}

function canAnimateTheme() {
  // A page can opt out with data-lw-theme-transition="off" on <html>
  // (index.html does, via js/hero-decor.js, because it keeps its own
  // hero sky spin). A hidden tab can't show (and browsers skip) the
  // animation anyway.
  return document.documentElement.dataset.lwThemeTransition !== 'off' &&
    document.visibilityState !== 'hidden' && !prefersReducedMotionTheme();
}

// Where the reveal starts, in viewport px, read from the LIVE layout each
// time (never cached, never a fixed corner). Order: the pressed control
// (always honoured — the user just pressed it), then any .theme-switch,
// then the active Settings segment; for these fallbacks a control that is
// actually on screen beats one that isn't (on phones the sidebar becomes
// a sideways-scrolling bar whose switch can sit past the right edge).
// Zero-size rects are skipped — the navbar's switch is display:none under
// 340px, and a hidden control's rect is all zeros (that would start the
// reveal in the top-left corner). The point is finally clamped into the
// viewport, so an off-screen control still yields a sweep that comes from
// ITS side of the screen rather than from outside it. Last resort is the
// viewport centre, only reachable on a page with no theme control at all.
function resolveThemeOrigin(source) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  const centre = (el, rect) => ({
    x: clamp(rect.left + rect.width / 2, vw),
    y: clamp(rect.top + rect.height / 2, vh),
    el,
  });

  if (source && typeof source.x === 'number' && typeof source.y === 'number') {
    return { x: clamp(source.x, vw), y: clamp(source.y, vh), el: null };
  }
  if (source && typeof source.getBoundingClientRect === 'function') {
    const rect = source.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return centre(source, rect);
  }

  const candidates = Array.from(document.querySelectorAll('.theme-switch'));
  const activeOpt = document.querySelector('.theme-segmented__opt--active');
  if (activeOpt) candidates.push(activeOpt);
  let offscreen = null;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) continue;
    const onScreen = rect.right > 0 && rect.left < vw && rect.bottom > 0 && rect.top < vh;
    if (onScreen) return centre(el, rect);
    if (!offscreen) offscreen = centre(null, rect); // no pulse on something the user can't see
  }
  return offscreen || { x: vw / 2, y: vh / 2, el: null };
}

// Radius that reaches the farthest viewport corner from (x, y), so the
// reveal always ends fully covered — including a control sitting at an
// edge or corner, or scrolled partly off-screen. (+2px so anti-aliasing
// at the very last frame can't leave a hairline gap in the corner.)
function themeCoverRadius(x, y) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const farthest = Math.max(
    Math.hypot(x, y),            // top-left
    Math.hypot(w - x, y),        // top-right
    Math.hypot(x, h - y),        // bottom-left
    Math.hypot(w - x, h - y)     // bottom-right
  );
  return Math.ceil(farthest) + 2;
}

// Small press-feedback on the switch itself (see .is-theme-pulse in
// css/style.css §5c). Deliberately tiny — the button is the SOURCE of
// the wave, not the show.
function pulseThemeControl(el) {
  if (!el || !el.classList || !el.classList.contains('theme-switch')) return;
  el.classList.remove('is-theme-pulse');
  void el.offsetWidth; // restart the animation if a previous one is still finishing
  el.classList.add('is-theme-pulse');
  el.addEventListener('animationend', () => el.classList.remove('is-theme-pulse'), { once: true });
}

function runThemeTransition(origin, resolved, commit) {
  const root = document.documentElement;
  const seq = ++themeTransitionSeq;
  const radius = themeCoverRadius(origin.x, origin.y);

  // css/style.css §5c reads these three (keyframes + the fallback veil).
  root.style.setProperty('--theme-origin-x', `${origin.x}px`);
  root.style.setProperty('--theme-origin-y', `${origin.y}px`);
  root.style.setProperty('--theme-transition-radius', `${radius}px`);
  // Freezes every ordinary element's own colour/background transitions
  // for the duration: the new snapshot is LIVE, so without this each
  // themed element would visibly fade inside the already-revealed area.
  root.classList.add('lw-theme-switching');

  pendingTheme = resolved;
  let committed = false;
  const commitOnce = () => {
    if (committed) return;
    committed = true;
    commit();
    if (seq === themeTransitionSeq) pendingTheme = null; // a newer transition may already own it
    pulseThemeControl(origin.el);
  };
  const cleanup = () => {
    if (seq !== themeTransitionSeq) return; // a newer transition owns these now
    root.classList.remove('lw-theme-switching');
    root.style.removeProperty('--theme-origin-x');
    root.style.removeProperty('--theme-origin-y');
    root.style.removeProperty('--theme-transition-radius');
  };

  if (typeof document.startViewTransition === 'function') {
    try {
      const vt = document.startViewTransition(commitOnce);
      vt.ready.catch(() => { /* skipped by a newer transition or a hidden tab — expected */ });
      vt.finished.then(cleanup, cleanup);
      return;
    } catch (err) {
      // fall through to the overlay (commitOnce guards a double commit)
    }
  }
  runThemeVeil(origin, radius, resolved, commitOnce, cleanup);
}

// Fallback for browsers without document.startViewTransition: one fixed
// overlay in the NEW theme's colour expands from the same origin; the
// real change is committed underneath once it covers the screen, then
// the overlay fades out. Single element, clip-path + opacity only.
function runThemeVeil(origin, radius, resolved, commitOnce, cleanup) {
  const veil = document.createElement('div');
  veil.className = 'lw-theme-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.background = THEME_BG[resolved];
  const at = `${origin.x}px ${origin.y}px`;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    commitOnce();     // idempotent — makes sure the theme lands even if the animation was cancelled
    veil.remove();
    if (activeThemeVeil === handle) activeThemeVeil = null;
    cleanup();
  };
  const handle = { abort: finish };
  activeThemeVeil = handle;

  document.body.appendChild(veil);
  if (typeof veil.animate !== 'function') { finish(); return; }
  const grow = veil.animate(
    [{ clipPath: `circle(0px at ${at})` }, { clipPath: `circle(${radius}px at ${at})` }],
    { duration: 680, easing: 'cubic-bezier(.4, .1, .2, 1)', fill: 'forwards' } // same curve as css/style.css §5c
  );
  grow.finished.then(() => {
    if (finished) return;
    commitOnce();
    return veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }).finished;
  }).then(finish, finish);
}

// The .theme-switch's whole visual state (thumb position + sun/moon
// crossfade) is driven purely by the aria-checked="true"/"false"
// attribute selector in CSS — no separate JS-toggled class needed,
// just this one attribute plus the label text describing the action.
function syncToggleButtons(resolvedTheme) {
  const isDark = resolvedTheme === 'dark';
  document.querySelectorAll('.theme-switch').forEach((btn) => {
    btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    const label = `Switch to ${isDark ? 'light' : 'dark'} theme`;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  });
}

// Keeps every .theme-segmented control on the page (currently just
// Settings, but written to support more than one) in sync with the
// raw preference — including reflecting 'system' as its own selected
// state, distinct from whichever of light/dark it currently resolves to.
function syncSegmentedControls(pref) {
  document.querySelectorAll('.theme-segmented').forEach((group) => {
    group.querySelectorAll('.theme-segmented__opt').forEach((opt) => {
      const active = opt.dataset.themeValue === pref;
      opt.classList.toggle('theme-segmented__opt--active', active);
      opt.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  });
}

function initThemeToggles() {
  // BUGFIX — the markup ships with aria-checked="false" hardcoded (the
  // "light" resting state), and syncToggleButtons()/syncSegmentedControls()
  // right below correct that to the real resolved theme on load. Both
  // controls have `transform`/`opacity` transitions on their moving
  // parts (for nice user-triggered clicks), which made that initial
  // correction visibly slide/crossfade on every single page load
  // whenever the resolved theme differed from the hardcoded default —
  // most noticeably light-mode users seeing a dark→light animation on
  // every refresh. Suppressed for this one initial sync only (real
  // user clicks later still animate normally).
  const switches = document.querySelectorAll('.theme-switch');
  const segmented = document.querySelectorAll('.theme-segmented');
  switches.forEach((btn) => btn.classList.add('theme-switch--no-transition'));
  segmented.forEach((el) => el.classList.add('theme-segmented--no-transition'));

  syncToggleButtons(getCurrentTheme());
  syncSegmentedControls(getThemePreference());

  // Force layout so the class-adds above are actually applied by the
  // time we remove the "no transition" classes on the next frame,
  // instead of every change getting batched into one paint.
  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    switches.forEach((btn) => btn.classList.remove('theme-switch--no-transition'));
    segmented.forEach((el) => el.classList.remove('theme-segmented--no-transition'));
  });

  switches.forEach((btn) => {
    // Idempotent binding (same pattern used elsewhere in this project) —
    // safe even if this ever runs more than once on the same page.
    // The pressed switch itself is the reveal's origin.
    btn.onclick = (e) => toggleTheme(e.currentTarget);
  });

  segmented.forEach((group) => {
    group.querySelectorAll('.theme-segmented__opt').forEach((opt) => {
      opt.onclick = () => applyTheme(opt.dataset.themeValue, opt); // the pressed segment is the origin
    });
  });
}

// Keep multiple open tabs in sync with each other.
window.addEventListener('storage', (e) => {
  if (e.key === THEME_STORAGE_KEY && e.newValue) {
    // Instant on purpose: nobody pressed a control in THIS tab, so there
    // is no origin to reveal from (and it's usually a background tab).
    commitTheme(e.newValue, resolveTheme(e.newValue));
  }
});

// Reduced Motion (Settings toggle) is applied on every page by the inline
// <head> snippet; this keeps an already-open tab in step when it is flipped
// in another tab. (settings-page.js applies it directly in its own tab.)
// Fallback for pages whose <head> snippet doesn't carry the Reduced Motion line
// (e.g. index.html): apply the saved setting as soon as this script runs.
// Default is OFF — the class is only added when the learner turned it on.
try {
  if (JSON.parse(localStorage.getItem('lw-preferences') || '{}').reducedMotion) {
    document.documentElement.classList.add('lw-force-reduced-motion');
  }
} catch (err) { /* keep off */ }

window.addEventListener('storage', (e) => {
  if (e.key !== 'lw-preferences') return;
  let on = false;
  try { on = !!JSON.parse(e.newValue || '{}').reducedMotion; } catch (err) { /* keep off */ }
  document.documentElement.classList.toggle('lw-force-reduced-motion', on);
});

// Live-follow the OS theme while 'system' is selected — no reload
// needed, matching how Claude's own System option behaves.
systemSchemeQuery.addEventListener('change', () => {
  if (getThemePreference() === 'system') applyTheme('system');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggles);
} else {
  initThemeToggles();
}