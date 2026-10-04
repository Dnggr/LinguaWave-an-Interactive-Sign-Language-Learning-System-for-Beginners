/**
 * js/settings-page.js — Preference persistence for pages/settings.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Wires the Reduced Motion toggle switch to localStorage, following the exact
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
 * PROFILE PICTURE (display only): initProfileAvatar() below shows the learner's
 * chosen picture in the profile card (needs js/avatars.js loaded first). It is
 * only shown here; the picker lives on pages/edit-profile.html.
 *
 * "Edit Profile" routes to pages/edit-profile.html — see that page's
 * own js/edit-profile.js for the profile-edit screen itself. (This
 * file used to also wire a Level badge here, driven by js/xp.js /
 * window.LWXP — removed along with initLevelBadge() below.)
 *
 * GUARD CONFIRM MODAL (RECONCILED — pulled in from a teammate's pass
 * that also built an in-page Edit Profile modal here; that modal
 * itself didn't land, see pages/settings.html's own RECONCILED note,
 * but this generic guard is used on its own merits): "Replay all
 * guides", which resets saved tour state for the whole account, goes
 * through window.LWConfirmGuard(message) — a small promise-based
 * modal defined in initConfirmGuardModal() below. It shows the
 * message, disables its Confirm button for a 5-second countdown, and
 * only resolves true once the learner clicks Confirm after the
 * countdown finishes (Cancel/Escape resolve false immediately).
 * js/edit-profile.js has its own copy of this same modal for its own
 * sensitive actions, since the two files don't share one page/DOM.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const PREF_STORAGE_KEY = 'lw-preferences';
// The guided tour has no preference here any more: it used to have a
// "Guide popups" switch (showGuides), replaced by the "Replay all guides"
// button below. js/tour.js retires any leftover showGuides value itself,
// and this file never reads or writes it.
const DEFAULT_PREFS = { reducedMotion: false };

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

// NEW — Missions pilot dev toggle (pages/settings.html's hidden
// #settings-missions-dev block). Only reveals the block when the page
// is loaded with ?dev=1; the checkbox itself just mirrors
// window.LWMissions's own isEnabled()/setEnabled() — no separate state
// lives here. See LinguaWave_SoloLearn_Learning_Psychology_Missions_
// Integration_Plan.docx §7 Phase 1.
function initMissionsDevBlock() {
  const block = document.getElementById('settings-missions-dev');
  if (!block) return;

  const isDev = new URLSearchParams(window.location.search).get('dev') === '1';
  if (!isDev) return; // stays `hidden` — not shown to real learners

  block.hidden = false;

  const toggle = document.getElementById('pref-missions-enabled');
  if (!toggle) return;

  if (typeof window.LWMissions === 'undefined') {
    console.warn('[settings-page.js] js/missions.js not loaded — Missions dev toggle will not work.');
    toggle.disabled = true;
    return;
  }

  toggle.checked = window.LWMissions.isEnabled();
  toggle.addEventListener('change', () => {
    window.LWMissions.setEnabled(toggle.checked);
  });
}

// Guard confirm modal (RECONCILED — from a teammate's pass). A single,
// reusable, promise-based modal, used here for "Replay all guides".
// Exposes window.LWConfirmGuard(message) -> Promise<boolean>.
//
// Depends on pages/settings.html's #guard-confirm-modal markup:
//   #guard-confirm-modal        the .modal-overlay wrapper (hidden by default)
//   #guard-confirm-message      paragraph the message text is written into
//   #guard-confirm-btn          the Confirm button (disabled + counts down)
//   #guard-confirm-cancel       the Cancel button
//
// If that markup is missing for any reason, LWConfirmGuard falls back
// to a plain window.confirm() so a guarded action never silently stops
// working.
const GUARD_COUNTDOWN_SECONDS = 5;

function initConfirmGuardModal() {
  const overlay    = document.getElementById('guard-confirm-modal');
  const messageEl  = document.getElementById('guard-confirm-message');
  const confirmBtn = document.getElementById('guard-confirm-btn');
  const cancelBtn  = document.getElementById('guard-confirm-cancel');
  const modalEl    = overlay?.querySelector('.modal');

  let countdownTimer = null;
  let resolveActive   = null;

  function onKeydown(e) {
    if (e.key === 'Escape') settle(false);
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function settle(result) {
    stopCountdown();
    document.removeEventListener('keydown', onKeydown);
    overlay.hidden = true;
    const resolve = resolveActive;
    resolveActive = null;
    if (resolve) resolve(result);
  }

  if (overlay && messageEl && confirmBtn && cancelBtn) {
    confirmBtn.addEventListener('click', () => {
      if (confirmBtn.disabled) return; // countdown hasn't finished
      settle(true);
    });
    cancelBtn.addEventListener('click', () => settle(false));
    // Clicking the backdrop deliberately does NOT dismiss it — only
    // Cancel or Escape do, so a stray click can't silently wave
    // through (or drop) an in-flight account change.

    window.LWConfirmGuard = function confirmGuard(message) {
      return new Promise((resolve) => {
        resolveActive = resolve;
        messageEl.textContent = message;
        overlay.hidden = false;
        modalEl?.focus();
        document.addEventListener('keydown', onKeydown);

        let remaining = GUARD_COUNTDOWN_SECONDS;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Confirm (' + remaining + ')';
        stopCountdown();
        countdownTimer = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            stopCountdown();
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
          } else {
            confirmBtn.textContent = 'Confirm (' + remaining + ')';
          }
        }, 1000);
      });
    };
  } else {
    console.warn('[settings-page.js] #guard-confirm-modal markup not found — falling back to window.confirm().');
    window.LWConfirmGuard = function confirmGuard(message) {
      return Promise.resolve(window.confirm(message));
    };
  }
}

/* ── PROFILE PICTURE (display only) ───────────────────────────────
 * Paints the picture chosen on Edit Profile / Profile into the card's
 * #settings-avatar-initial slot. Same read order as js/main.js's sidebar
 * avatar: the session cache first (instant), then one getAvatar() once auth
 * is ready, because the cache can be stale (picture changed on another
 * device) or have no `avatar` key yet. No picture, or avatars.js missing,
 * leaves the initial that main.js already put there. */
function initProfileAvatar() {
  const slot = document.getElementById('settings-avatar-initial');
  if (!slot || !window.LWAvatars) return;

  const session = () => window.LWAuth?.getCurrentUser?.();
  const paint = (avatarId) => {
    const name = session()?.name || 'Learner';
    slot.innerHTML = window.LWAvatars.markup(avatarId, { name });
  };

  const cached = session();
  if (cached && window.LWAvatars.find(cached.avatar)) paint(cached.avatar);

  Promise.resolve()
    .then(() => window.LWAuth.whenAuthReady())
    .then(() => window.LWAuth.getAvatar())
    .then((stored) => paint(stored))
    .catch((e) => console.warn('[settings-page.js] profile picture not loaded:', e));

  // Back/forward can restore this page from memory with the old picture; the
  // session cache was updated when it was saved, so repaint from that.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) paint(session()?.avatar);
  });
}

function initSettingsPage() {
  const prefs = loadPrefs();

  initConfirmGuardModal();
  initProfileAvatar();
  initThemeSelect();
  initMissionsDevBlock();

  const motionEl = document.getElementById('pref-reduced-motion');

  // BUGFIX — the checkbox ships `checked`/unchecked hardcoded in the HTML
  // (see pages/settings.html), and the .checked assignment below
  // corrects it to its real stored value. .toggle-switch's track/
  // thumb both have CSS transitions (for nice user-triggered clicks),
  // so whenever a stored value differed from the hardcoded default,
  // that correction visibly slid/faded the switch on every single page
  // load — e.g. a switch flipping off→on on every refresh even
  // though nothing had actually changed. Suppressed for this one
  // initial sync only, same "no-transition" pattern js/theme.js uses
  // for the theme switch (see its initThemeToggles()).
  const switchEls = [motionEl]
    .filter(Boolean)
    .map((input) => input.closest('.toggle-switch'))
    .filter(Boolean);
  switchEls.forEach((el) => el.classList.add('toggle-switch--no-transition'));

  if (motionEl) motionEl.checked = prefs.reducedMotion;
  applyReducedMotion(prefs.reducedMotion);

  // Force layout so the class-add above is actually applied by the
  // time we remove it on the next frame, instead of both changes
  // getting batched into one paint.
  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    switchEls.forEach((el) => el.classList.remove('toggle-switch--no-transition'));
  });

  motionEl?.addEventListener('change', () => {
    prefs.reducedMotion = motionEl.checked;
    savePrefs(prefs);
    applyReducedMotion(prefs.reducedMotion);
  });

  // "Replay all guides". js/tour.js owns the state: resetAll() forgets
  // every guide this account has seen or skipped, plus any "Skip all".
  // Then we open the dashboard with ?tour=1 so the first guide plays
  // straight away (the dashboard is where the tour starts), and every
  // other page's guide plays on its next visit. Nothing here reads a
  // setting, so no toggle can stop a replay from working.
  //
  // GUARD (RECONCILED — from a teammate's pass): this clears saved
  // tour progress across the whole app, so it goes through the guard
  // modal + 5s countdown above before resetAll() runs.
  const replayEl = document.getElementById('btn-replay-guides');
  replayEl?.addEventListener('click', async () => {
    if (!window.LWTour) return;
    const confirmed = await window.LWConfirmGuard('Do you want to reset all guided tours so they play again from the start?');
    if (!confirmed) return;
    window.LWTour.resetAll();
    window.location.href = 'dashboard.html?tour=1';
  });

  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    window.location.href = 'edit-profile.html';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}