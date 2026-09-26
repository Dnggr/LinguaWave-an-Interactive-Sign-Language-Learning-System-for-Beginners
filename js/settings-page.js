/**
 * js/settings-page.js — Preference persistence + Edit Profile modal
 *                        for pages/settings.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Wires the Notifications / Sound Effects / Reduced Motion
 *            toggle switches to localStorage, following the exact
 *            same persistence pattern js/theme.js already established
 *            for the theme toggle (a plain localStorage key, read on
 *            load, written on change) — not a new pattern. Also wires
 *            the Edit Profile modal (rename / change email / change
 *            password / delete account) added this session.
 *
 * SCOPE    : Notifications/Sound/Motion prefs still have no backend
 *            write — local-device persistence only, same tier as the
 *            theme preference. The Edit Profile modal is different:
 *            renaming, email/password changes and account deletion
 *            are real Firebase Auth/Firestore operations, so this
 *            file does NOT talk to Firebase directly. It calls
 *            window.LWAuth.updateUsername / .updateUserEmail /
 *            .changePassword / .deleteAccount and expects those to
 *            exist on js/auth.js
 *            (out of scope, not opened this session — same rule every
 *            other session in this codebase has followed; see the
 *            contract comment above initEditProfileModal() for exactly
 *            what each method needs to do). If a method isn't there
 *            yet, its form shows a disabled-state message instead of
 *            throwing.
 *
 * "Edit Profile" now opens the modal below instead of just logging —
 * see initEditProfileModal().
 *
 * NEW (this session) — GUARD CONFIRM MODAL: every action that actually
 * changes account state (rename, email change, password change,
 * delete) — plus "Replay all guides", which resets saved tour state —
 * now goes through window.LWConfirmGuard(message), a small promise-
 * based modal defined in initConfirmGuardModal() below. It shows the
 * message ("Do you want to change your email to a@b.com?"-style),
 * disables its Confirm button for a 10-second countdown, and only
 * resolves true once the learner clicks Confirm after the countdown
 * finishes (Cancel/Escape resolve false immediately). This replaces
 * the plain window.confirm() guard from the previous pass — see
 * pages/settings.html for the new #guard-confirm-modal markup this
 * depends on.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

const PREF_STORAGE_KEY = 'lw-preferences';
// The guided tour has no preference here any more: it used to have a
// "Guide popups" switch (showGuides), replaced by the "Replay all guides"
// button below. js/tour.js retires any leftover showGuides value itself,
// and this file never reads or writes it.
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

// NEW — Guard confirm modal. A single, reusable, promise-based modal
// used by every state-changing action on this page (see the top-of-
// file note). Exposes window.LWConfirmGuard(message) -> Promise<boolean>.
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
const GUARD_COUNTDOWN_SECONDS = 10;

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
    // Same choice as the Edit Profile modal: clicking the backdrop does
    // NOT dismiss it — only Cancel or Escape do, so a stray click can't
    // silently wave through (or drop) an in-flight account change.

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

// NEW — Edit Profile modal (rename / change email / delete account).
// ─────────────────────────────────────────────────────────────────
// CONTRACT this function expects from window.LWAuth (js/auth.js):
//
//   LWAuth.updateUsername(newUsername) -> Promise<void>
//     Updates the signed-in user's Firebase Auth displayName AND the
//     matching Firestore user doc's username field, then resolves.
//     Reject with an Error on failure (see friendlyError() below for
//     which .code values get a nicer message).
//
//   LWAuth.updateUserEmail(newEmail, currentPassword) -> Promise<void>
//     Reauthenticates the user with currentPassword (e.g. via
//     EmailAuthProvider.credential + reauthenticateWithCredential),
//     then calls verifyBeforeUpdateEmail(user, newEmail) — NOT a bare
//     updateEmail() — so the login email only actually changes once
//     the learner clicks the confirmation link Firebase sends to the
//     new address. This matches Firebase's current guidance and avoids
//     an unverified address silently becoming the login email.
//
//   LWAuth.changePassword(currentPassword, newPassword) -> Promise<void>
//     Reauthenticates with currentPassword, then sets newPassword as
//     the account's password via Firebase Auth's updatePassword().
//
//   LWAuth.deleteAccount(currentPassword) -> Promise<void>
//     Reauthenticates with currentPassword, deletes the learner's
//     Firestore user doc (and any owned progress/subcollection docs),
//     then calls deleteUser() on the Firebase Auth user. Order matters:
//     delete the Firestore data first — once deleteUser() succeeds the
//     client is signed out and can no longer pass Firestore security
//     rules that check request.auth.
//
// If any of these methods is missing, that form disables itself with
// a message instead of throwing — so this still works fine if auth.js
// hasn't been updated yet.
//
// GUARD MODAL (new): each handler below awaits window.LWConfirmGuard()
// with a specific message right after its own field validation passes
// and right before the LWAuth call fires. The learner has to sit
// through the 10-second countdown and then click Confirm; cancelling
// or leaving it unclicked leaves the button/status line untouched (no
// "Saving…" flash for an unconfirmed action).
function initEditProfileModal() {
  const openBtn  = document.getElementById('btn-edit-profile');
  const overlay  = document.getElementById('edit-profile-modal');
  const closeBtn = document.getElementById('edit-profile-close');
  if (!openBtn || !overlay || !closeBtn) return;

  const modalEl        = overlay.querySelector('.modal');
  const nameEl          = document.getElementById('settings-user-name');
  const avatarInitialEl = document.getElementById('settings-avatar-initial');

  const renameForm    = document.getElementById('form-rename');
  const usernameEl    = document.getElementById('input-new-username');
  const renameStatus  = document.getElementById('rename-status');
  const renameBtn     = document.getElementById('btn-save-rename');

  const emailForm       = document.getElementById('form-email');
  const newEmailEl      = document.getElementById('input-new-email');
  const emailPasswordEl = document.getElementById('input-email-password');
  const emailStatus     = document.getElementById('email-status');
  const emailBtn        = document.getElementById('btn-save-email');

  const passwordForm        = document.getElementById('form-password');
  const currentPasswordEl   = document.getElementById('input-current-password');
  const newPasswordEl       = document.getElementById('input-new-password');
  const confirmPasswordEl   = document.getElementById('input-confirm-password');
  const passwordStatus      = document.getElementById('password-status');
  const passwordBtn         = document.getElementById('btn-save-password');

  const deleteForm       = document.getElementById('form-delete');
  const deletePasswordEl = document.getElementById('input-delete-password');
  const deleteConfirmEl  = document.getElementById('input-delete-confirm');
  const deleteStatus     = document.getElementById('delete-status');
  const deleteBtn        = document.getElementById('btn-confirm-delete');

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('modal__status--error', 'modal__status--success');
    if (kind) el.classList.add(`modal__status--${kind}`);
  }

  function friendlyError(err) {
    const code = err && err.code;
    const known = {
      'auth/wrong-password': "That password isn't correct.",
      'auth/invalid-credential': "That password isn't correct.",
      'auth/email-already-in-use': 'Another account already uses that email.',
      'auth/requires-recent-login': 'Please log out and back in, then try again.',
      'auth/invalid-email': "That doesn't look like a valid email address.",
      'auth/weak-password': 'Please choose a stronger password.',
      'auth/too-many-requests': 'Too many attempts — please wait a bit and try again.',
    };
    return (code && known[code]) || (err && err.message) || 'Something went wrong. Please try again.';
  }

  function resetModalState() {
    setStatus(renameStatus, '');
    setStatus(emailStatus, '');
    setStatus(passwordStatus, '');
    setStatus(deleteStatus, '');
    usernameEl.value = nameEl?.textContent?.trim() || '';
    newEmailEl.value = '';
    emailPasswordEl.value = '';
    currentPasswordEl.value = '';
    newPasswordEl.value = '';
    confirmPasswordEl.value = '';
    deletePasswordEl.value = '';
    deleteConfirmEl.value = '';
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal() {
    resetModalState();
    overlay.hidden = false;
    modalEl?.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    openBtn.focus();
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  // Clicking the backdrop deliberately does NOT close the modal — only
  // the X button and Escape do. This form holds a password + delete
  // account section, so an accidental outside click shouldn't be able
  // to silently discard what's been typed.

  // ── Rename ──────────────────────────────────────────────────────
  renameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = usernameEl.value.trim();
    if (!newName) { setStatus(renameStatus, 'Enter a name first.', 'error'); return; }
    if (typeof window.LWAuth?.updateUsername !== 'function') {
      setStatus(renameStatus, 'Renaming is not available right now.', 'error');
      return;
    }
    // GUARD
    const confirmed = await window.LWConfirmGuard(`Do you want to change your display name to "${newName}"?`);
    if (!confirmed) return;
    renameBtn.disabled = true;
    setStatus(renameStatus, 'Saving…');
    try {
      await window.LWAuth.updateUsername(newName);
      setStatus(renameStatus, 'Saved.', 'success');
      if (nameEl) nameEl.textContent = newName;
      if (avatarInitialEl) avatarInitialEl.textContent = newName.charAt(0).toUpperCase();
    } catch (err) {
      setStatus(renameStatus, friendlyError(err), 'error');
    } finally {
      renameBtn.disabled = false;
    }
  });

  // ── Change email ────────────────────────────────────────────────
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = newEmailEl.value.trim();
    const password = emailPasswordEl.value;
    if (!newEmail || !password) { setStatus(emailStatus, 'Fill in both fields.', 'error'); return; }
    if (typeof window.LWAuth?.updateUserEmail !== 'function') {
      setStatus(emailStatus, 'Changing email is not available right now.', 'error');
      return;
    }
    // GUARD
    const confirmed = await window.LWConfirmGuard(`Do you want to change your email to ${newEmail}?`);
    if (!confirmed) return;
    emailBtn.disabled = true;
    setStatus(emailStatus, 'Sending confirmation…');
    try {
      await window.LWAuth.updateUserEmail(newEmail, password);
      setStatus(emailStatus, `Confirmation link sent to ${newEmail}. Your login email won't change until you click it.`, 'success');
      emailPasswordEl.value = '';
    } catch (err) {
      setStatus(emailStatus, friendlyError(err), 'error');
    } finally {
      emailBtn.disabled = false;
    }
  });

  // ── Change password ─────────────────────────────────────────────
  passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = currentPasswordEl.value;
    const next = newPasswordEl.value;
    const confirmVal = confirmPasswordEl.value;
    if (!current || !next || !confirmVal) { setStatus(passwordStatus, 'Fill in all three fields.', 'error'); return; }
    if (next.length < 8) { setStatus(passwordStatus, 'New password needs at least 8 characters.', 'error'); return; }
    if (next !== confirmVal) { setStatus(passwordStatus, "New passwords don't match.", 'error'); return; }
    if (typeof window.LWAuth?.changePassword !== 'function') {
      setStatus(passwordStatus, 'Changing password is not available right now.', 'error');
      return;
    }
    // GUARD
    const confirmed = await window.LWConfirmGuard('Do you want to update your password now?');
    if (!confirmed) return;
    passwordBtn.disabled = true;
    setStatus(passwordStatus, 'Saving…');
    try {
      await window.LWAuth.changePassword(current, next);
      setStatus(passwordStatus, 'Password updated.', 'success');
      currentPasswordEl.value = '';
      newPasswordEl.value = '';
      confirmPasswordEl.value = '';
    } catch (err) {
      setStatus(passwordStatus, friendlyError(err), 'error');
    } finally {
      passwordBtn.disabled = false;
    }
  });

  // ── Delete account ──────────────────────────────────────────────
  deleteForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = deletePasswordEl.value;
    if (deleteConfirmEl.value.trim() !== 'DELETE') {
      setStatus(deleteStatus, 'Type DELETE (all caps) to confirm.', 'error');
      return;
    }
    if (!password) { setStatus(deleteStatus, 'Enter your password.', 'error'); return; }
    if (typeof window.LWAuth?.deleteAccount !== 'function') {
      setStatus(deleteStatus, 'Account deletion is not available right now.', 'error');
      return;
    }
    // GUARD — on top of the typed "DELETE" + password above, since this
    // is the single most destructive action on the page.
    const confirmed = await window.LWConfirmGuard('Do you want to permanently delete your account and all learning progress? This cannot be undone.');
    if (!confirmed) return;
    deleteBtn.disabled = true;
    setStatus(deleteStatus, 'Deleting your account…');
    try {
      await window.LWAuth.deleteAccount(password);
      window.location.href = '../index.html';
    } catch (err) {
      setStatus(deleteStatus, friendlyError(err), 'error');
      deleteBtn.disabled = false;
    }
  });
}

function initSettingsPage() {
  const prefs = loadPrefs();

  initConfirmGuardModal();
  initThemeSelect();
  initMissionsDevBlock();
  initEditProfileModal();

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

  // NEW: "Replay all guides". js/tour.js owns the state: resetAll()
  // forgets every guide this account has seen or skipped, plus any
  // "Skip all". Then we open the dashboard with ?tour=1 so the first
  // guide plays straight away (the dashboard is where the tour starts),
  // and every other page's guide plays on its next visit. Nothing here
  // reads a setting, so no toggle can stop a replay from working.
  //
  // GUARD (new): this clears saved tour progress across the whole app,
  // so it goes through the same guard modal + 10s countdown as the
  // Edit Profile actions above before resetAll() runs.
  const replayEl = document.getElementById('btn-replay-guides');
  replayEl?.addEventListener('click', async () => {
    if (!window.LWTour) return;
    const confirmed = await window.LWConfirmGuard('Do you want to reset all guided tours so they play again from the start?');
    if (!confirmed) return;
    window.LWTour.resetAll();
    window.location.href = 'dashboard.html?tour=1';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}