/**
 * js/settings-page.js — Preference persistence for pages/settings.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Wires the Notifications / Sound Effects / Reduced Motion
 *            toggle switches to localStorage, following the exact
 *            same persistence pattern js/theme.js already established
 *            for the theme toggle (a plain localStorage key, read on
 *            load, written on change) — not a new pattern.
 *
 * SCOPE    : No backend/Firestore write exists for these preferences
 *            anywhere in this repo (js/auth.js is out of scope, not
 *            opened — same rule every other session in this codebase
 *            has followed). This is local-device persistence only,
 *            same tier as the theme preference. If/when a real
 *            preferences doc exists server-side, only this file's
 *            save()/load() would need to change.
 *
 * "Edit Profile" has no destination yet (no profile-edit screen exists
 * in this repo) — the button below just logs a console note rather
 * than silently doing nothing or guessing at a route.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const PREF_STORAGE_KEY = 'lw-preferences';
const DEFAULT_PREFS = { notifications: true, soundEffects: true, reducedMotion: false };

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[settings-page.js] could not persist preferences:', e);
  }
}

function applyReducedMotion(enabled) {
  // Layers on top of css/style.css's own `prefers-reduced-motion`
  // media query rather than replacing it — this class only matters
  // for a learner whose OS-level setting doesn't already request it.
  document.documentElement.classList.toggle('lw-force-reduced-motion', enabled);
}

// BUGFIX (this session) — same class of bug as dashboard.js's
// initDashboard() fix; see its comment for the full reasoning. Same
// readyState guard applied here for consistency/safety.
function initThemeSelect() {
  // BUGFIX — this <select> shipped with a comment claiming it was
  // "wired directly to js/theme.js", but no listener existed anywhere
  // in the repo, so picking Light/Dark here did nothing. theme.js's
  // applyTheme()/getCurrentTheme() are real top-level `window` globals
  // (see that file's header), so we reuse them directly rather than
  // introducing a second theme mechanism.
  const themeSelectEl = document.getElementById('theme-select-settings');
  if (!themeSelectEl || typeof getCurrentTheme !== 'function' || typeof applyTheme !== 'function') return;

  themeSelectEl.value = getCurrentTheme();

  themeSelectEl.addEventListener('change', () => {
    applyTheme(themeSelectEl.value);
  });

  // Keep the dropdown in sync if the theme changes elsewhere — e.g. the
  // sidebar's .theme-toggle button on this same page, or another tab
  // (theme.js already listens for the 'storage' event for that case).
  window.addEventListener('storage', (e) => {
    if (e.key === 'lw-theme' && e.newValue) themeSelectEl.value = e.newValue;
  });
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    // Runs after theme.js's own click handler (listener order), so
    // getCurrentTheme() already reflects the new value here.
    themeSelectEl.value = getCurrentTheme();
  });
}

function initSettingsPage() {
  const prefs = loadPrefs();

  initThemeSelect();

  const notifEl  = document.getElementById('pref-notifications');
  const soundEl  = document.getElementById('pref-sound-effects');
  const motionEl = document.getElementById('pref-reduced-motion');

  if (notifEl)  notifEl.checked  = prefs.notifications;
  if (soundEl)  soundEl.checked  = prefs.soundEffects;
  if (motionEl) motionEl.checked = prefs.reducedMotion;
  applyReducedMotion(prefs.reducedMotion);

  notifEl?.addEventListener('change', () => {
    prefs.notifications = notifEl.checked;
    savePrefs(prefs);
  });
  soundEl?.addEventListener('change', () => {
    prefs.soundEffects = soundEl.checked;
    savePrefs(prefs);
  });
  motionEl?.addEventListener('change', () => {
    prefs.reducedMotion = motionEl.checked;
    savePrefs(prefs);
    applyReducedMotion(prefs.reducedMotion);
  });

  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    // No profile-edit screen exists in this repo yet — see file header.
    console.info('[settings-page.js] Edit Profile has no destination yet.');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}