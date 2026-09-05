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
 *       root.style.background = resolved === 'light' ? '#FFF8F0' : '#1F1712';
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
 * ─────────────────────────────────────────────────────────────────
 */

const THEME_STORAGE_KEY = 'lw-theme';
const THEME_BG = { light: '#FFF8F0', dark: '#1F1712' };
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

// pref: 'system' | 'light' | 'dark'
function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-pref', pref);
  root.style.colorScheme = resolved;
  root.style.background = THEME_BG[resolved];
  localStorage.setItem(THEME_STORAGE_KEY, pref);
  syncToggleButtons(resolved);
  syncSegmentedControls(pref);
}

// Sidebar quick-toggle: a binary switch, so it only ever chooses an
// EXPLICIT light/dark — same convention as most apps' quick-toggle
// (it overrides 'system' rather than trying to represent it). Anyone
// who wants "follow my OS" back can still pick System in Settings.
function toggleTheme() {
  applyTheme(getCurrentTheme() === 'light' ? 'dark' : 'light');
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
    btn.onclick = toggleTheme;
  });

  segmented.forEach((group) => {
    group.querySelectorAll('.theme-segmented__opt').forEach((opt) => {
      opt.onclick = () => applyTheme(opt.dataset.themeValue);
    });
  });
}

// Keep multiple open tabs in sync with each other.
window.addEventListener('storage', (e) => {
  if (e.key === THEME_STORAGE_KEY && e.newValue) {
    const resolved = resolveTheme(e.newValue);
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-pref', e.newValue);
    root.style.colorScheme = resolved;
    root.style.background = THEME_BG[resolved];
    syncToggleButtons(resolved);
    syncSegmentedControls(e.newValue);
  }
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