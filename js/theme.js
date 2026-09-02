/**
 * js/theme.js — Light/Dark theme toggle
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Applies data-theme="light"|"dark" to <html>, wires any
 *            .theme-toggle button on the page, and persists the
 *            choice in localStorage. Falls back to the OS-level
 *            prefers-color-scheme on first visit.
 * CONNECTS : Loaded on every page. Two script tags are needed per
 *            page (see snippet below) — one tiny INLINE one in
 *            <head> that runs before first paint (avoids a flash of
 *            the wrong theme), and this file itself, deferred, which
 *            wires the actual toggle button once the DOM is ready.
 *
 * USAGE — add this to the <head> of every page, BEFORE any CSS link,
 * as a literal inline script (not this file — this exact snippet):
 *
 *   <script>
 *     (function () {
 *       var saved = localStorage.getItem('lw-theme');
 *       var theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
 *       document.documentElement.setAttribute('data-theme', theme);
 *     })();
 *   </script>
 *
 * Then include this file normally near the end of <body> (or with
 * `defer`), and add a toggle button anywhere in the page markup:
 *
 *   <button class="theme-toggle" id="theme-toggle" aria-label="Toggle light/dark theme">
 *     <span class="theme-toggle__thumb"></span>
 *   </button>
 * ─────────────────────────────────────────────────────────────────
 */

const THEME_STORAGE_KEY = 'lw-theme';

function getStoredTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY);
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  syncToggleButtons(theme);
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === 'light' ? 'dark' : 'light');
}

function syncToggleButtons(theme) {
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
    btn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
    btn.classList.toggle('theme-toggle--light', theme === 'light');
  });
}

function initThemeToggles() {
  // BUGFIX — .theme-toggle--light is added by JS here, after the
  // button has already painted without it, and .theme-toggle__thumb
  // has a `transform` transition. That combination made the thumb
  // visibly slide into position on every single page load whenever
  // the stored theme was light. Suppress the transition for this one,
  // initial sync only (real user clicks later still animate normally).
  const toggles = document.querySelectorAll('.theme-toggle');
  toggles.forEach((btn) => btn.classList.add('theme-toggle--no-transition'));

  syncToggleButtons(getCurrentTheme());

  // Force layout so the class-add above is actually applied by the
  // time we remove the "no transition" class on the next frame,
  // instead of both changes getting batched into one paint.
  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    toggles.forEach((btn) => btn.classList.remove('theme-toggle--no-transition'));
  });

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    // Idempotent binding (same pattern used elsewhere in this project) —
    // safe even if this ever runs more than once on the same page.
    btn.onclick = toggleTheme;
  });
}

// Keep multiple open tabs in sync with each other.
window.addEventListener('storage', (e) => {
  if (e.key === THEME_STORAGE_KEY && e.newValue) {
    document.documentElement.setAttribute('data-theme', e.newValue);
    syncToggleButtons(e.newValue);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggles);
} else {
  initThemeToggles();
}