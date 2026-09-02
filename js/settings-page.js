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
  // The 3-way System/Light/Dark segmented control itself is fully
  // wired by js/theme.js's own initThemeToggles() — it queries every
  // .theme-segmented on the page generically, sets each option's
  // click handler, and keeps it synced (incl. the sidebar's
  // .theme-switch and other tabs via 'storage') via
  // syncSegmentedControls(). Nothing page-specific to do here anymore;
  // this function is kept as a documented no-op so
  // CLAUDE_TASKS.md-style history of "why isn't settings.html wiring
  // its own theme control" doesn't get re-litigated by a future pass.
  if (typeof getThemePreference !== 'function' || typeof applyTheme !== 'function') {
    console.warn('[settings-page.js] js/theme.js globals not found — theme control will not work on this page.');
  }
}

function initSettingsPage() {
  const prefs = loadPrefs();

  initThemeSelect();

  const notifEl  = document.getElementById('pref-notifications');
  const soundEl  = document.getElementById('pref-sound-effects');
  const motionEl = document.getElementById('pref-reduced-motion');

  // BUGFIX — all three checkboxes ship `checked` hardcoded in the HTML
  // (see pages/settings.html), and the .checked assignments below
  // correct each one to its real stored value. .toggle-switch's track/
  // thumb both have CSS transitions (for nice user-triggered clicks),
  // so whenever a stored value differed from the hardcoded default,
  // that correction visibly slid/faded the switch on every single page
  // load — e.g. Notifications flipping off→on on every refresh even
  // though nothing had actually changed. Suppressed for this one
  // initial sync only, same "no-transition" pattern js/theme.js uses
  // for the theme switch (see its initThemeToggles()).
  const switchEls = [notifEl, soundEl, motionEl]
    .filter(Boolean)
    .map((input) => input.closest('.toggle-switch'))
    .filter(Boolean);
  switchEls.forEach((el) => el.classList.add('toggle-switch--no-transition'));

  if (notifEl)  notifEl.checked  = prefs.notifications;
  if (soundEl)  soundEl.checked  = prefs.soundEffects;
  if (motionEl) motionEl.checked = prefs.reducedMotion;
  applyReducedMotion(prefs.reducedMotion);

  // Force layout so the class-add above is actually applied by the
  // time we remove it on the next frame, instead of both changes
  // getting batched into one paint.
  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    switchEls.forEach((el) => el.classList.remove('toggle-switch--no-transition'));
  });

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