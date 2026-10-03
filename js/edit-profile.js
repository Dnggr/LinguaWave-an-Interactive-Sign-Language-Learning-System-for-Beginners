/**
 * js/edit-profile.js — Controller for pages/edit-profile.html
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Wires the Account Profile page — display name edit,
 *            Change Password / forgot-password (js/account-
 *            security.js), and — RECONCILED this pass — Change Email
 *            and Delete Account, pulled in from js/auth.js's PROFILE
 *            MANAGEMENT block (window.LWAuth.updateUserEmail /
 *            .deleteAccount), the same reauthentication-gated
 *            operations a teammate session built as part of an
 *            in-page modal on pages/settings.html. That modal itself
 *            didn't land (see pages/settings.html's own RECONCILED
 *            note) — this page stayed the real destination — but its
 *            two genuinely new capabilities and its guard-confirm
 *            pattern moved here.
 *
 * SAVE NAME (this pass): "Save changes" is aria-disabled (not `disabled`) while the
 *            name input matches the saved name. It stays focusable and
 *            looks dimmed, but a click does nothing. See syncSaveState()
 *            in initNameForm() and the .btn[aria-disabled] rules in
 *            pages/edit-profile.html.
 *
 * PROFILE PICTURE (this pass): the round pencil button on the picture opens
 *            the same picker pages/profile.html has (initAvatarPicker()
 *            below, adapted from js/profile-page.js). The learner picks one
 *            of js/avatars.js's pictures; only the ID is stored, via
 *            window.LWAuth.updateAvatar(), which also updates their
 *            leaderboard row. Needs js/avatars.js loaded before this file.
 *
 * XP REMOVAL (this pass): this page used to show an account-wide
 *            Level/XP summary card here (driven by js/xp.js /
 *            window.LWXP) — removed along with its initLevelCard()
 *            function and the js/xp.js <script> tag on this page.
 *
 * FIX (this pass): Save name used to call
 *            window.LWAuth.doc(window.LWAuth.db, ...) / .setDoc(...)
 *            directly. Those raw Firestore handles were deliberately
 *            removed from window.LWAuth by the same teammate session
 *            (see auth.js's SECURITY note — they let anyone in the
 *            browser console write arbitrary fields to their own
 *            Firestore profile) — landing both changes together would
 *            have made Save throw uncaught. Now calls the narrow,
 *            purpose-built window.LWAuth.updateUsername() instead,
 *            same as the teammate session's own modal called it.
 *
 * COLLAPSIBLE SECURITY SECTIONS (this pass): Password and Delete account
 *            are one-line rows whose forms stay hidden until the row's
 *            button is clicked (initCollapse()). Hide, or finishing the
 *            action, closes the form again and clears what was typed.
 *            Password is DISABLED for accounts with no email/password
 *            sign-in (Google only), see getSignInProviders().
 *            Change Password / forgot-password now call window.LWAuth
 *            (.changePassword / .sendPasswordReset) instead of
 *            window.LWAccountSecurity: js/account-security.js is not in
 *            the repo (so those calls threw), and auth.js's own
 *            changePassword() already enforces the sign-up password
 *            policy. The older SCOPE note below about staying on
 *            account-security.js is therefore out of date.
 *
 * GUARD CONFIRM MODAL: every action that changes account state (name,
 *            email, password, delete) now goes through
 *            window.LWConfirmGuard(message) first — a small promise-
 *            based modal defined in initConfirmGuardModal() below,
 *            same pattern/markup as pages/settings.html's own copy
 *            (js/settings-page.js), duplicated here rather than
 *            shared since the two pages don't share one DOM. Shows
 *            the message, disables Confirm for a 5-second countdown
 *            (10 seconds for Delete Account, which passes its own length),
 *            resolves true only once Confirm is clicked after the
 *            countdown finishes (Cancel/Escape resolve false).
 *            Delete Account additionally requires typing "DELETE"
 *            first, before the guard even opens — same double
 *            confirmation the teammate session used for it.
 *
 * SCOPE    : js/auth.js is teammate-owned; only the PROFILE MANAGEMENT
 *            methods it exports (updateUsername / updateUserEmail /
 *            deleteAccount) are called from here — never
 *            doc/db/getDoc/setDoc directly. Change Password stays on
 *            js/account-security.js rather than switching to
 *            auth.js's own (newer) changePassword() — both reauth the
 *            same way, and there's no functional reason to touch a
 *            path that already works and is already verified.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// Firebase error codes -> plain, learner-facing copy. Falls back to a
// generic message for anything not listed here rather than surfacing
// a raw Firebase code. auth/invalid-credential is the current SDK's
// code for "wrong password" on reauth (12.16.0 consolidated this away
// from the older auth/wrong-password) — both are mapped, in case that
// ever changes again.
function friendlyAuthError(err) {
  var map = {
    'auth/wrong-password': 'That current password is not correct.',
    'auth/invalid-credential': 'That current password is not correct.',
    'auth/weak-password': 'That password is too weak. Please choose a stronger one.',
    'auth/requires-recent-login': 'Please log out and back in, then try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/no-current-user': 'Please refresh the page and try again.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/invalid-email': 'That does not look like a valid email address.',
    // NEW — reachable now that Change Email calls updateUserEmail().
    'auth/email-already-in-use': 'Another account already uses that email.',
    // auth.js updateOwnProfile(): the admin deleted this account while the tab was open.
    'lw/account-removed': 'This account was removed by an administrator. Please create a new account.',
  };
  if (err && map[err.code]) return map[err.code];
  // auth.js throws its own readable messages under lw/* codes (e.g. lw/invalid-password
  // from the sign-up password policy); they never contain the password, so show them as-is.
  if (err && typeof err.code === 'string' && err.code.indexOf('lw/') === 0 && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

/* ── GUARD CONFIRM MODAL (RECONCILED) ─────────────────────────────
 * Own copy of pages/settings.html's initConfirmGuardModal() (see
 * js/settings-page.js) — identical behavior, wired to this page's own
 * #guard-confirm-modal markup, since the two pages don't share a DOM.
 * Exposes window.LWConfirmGuard(message, seconds?) -> Promise<boolean>.
 * `seconds` is the countdown length; omitted, it is GUARD_COUNTDOWN_SECONDS. Falls
 * back to window.confirm() if the markup is missing for any reason,
 * so a guarded action never silently stops working.
 * ──────────────────────────────────────────────────────────────── */
// Countdown before Confirm turns on. Everything gets the short one; Delete
// Account is the one destructive action here, so it passes the long one.
var GUARD_COUNTDOWN_SECONDS = 5;
var DELETE_COUNTDOWN_SECONDS = 10;

function initConfirmGuardModal() {
  var overlay    = document.getElementById('guard-confirm-modal');
  var messageEl  = document.getElementById('guard-confirm-message');
  var confirmBtn = document.getElementById('guard-confirm-btn');
  var cancelBtn  = document.getElementById('guard-confirm-cancel');
  var modalEl    = overlay ? overlay.querySelector('.modal') : null;

  var countdownTimer = null;
  var resolveActive = null;

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
    var resolve = resolveActive;
    resolveActive = null;
    if (resolve) resolve(result);
  }

  if (overlay && messageEl && confirmBtn && cancelBtn) {
    confirmBtn.addEventListener('click', function () {
      if (confirmBtn.disabled) return; // countdown hasn't finished
      settle(true);
    });
    cancelBtn.addEventListener('click', function () { settle(false); });
    // Clicking the backdrop deliberately does NOT dismiss it — only
    // Cancel or Escape do, so a stray click can't silently wave
    // through (or drop) an in-flight account change.

    window.LWConfirmGuard = function confirmGuard(message, seconds) {
      return new Promise(function (resolve) {
        resolveActive = resolve;
        messageEl.textContent = message;
        overlay.hidden = false;
        if (modalEl) modalEl.focus();
        document.addEventListener('keydown', onKeydown);

        var remaining = (seconds > 0) ? Math.floor(seconds) : GUARD_COUNTDOWN_SECONDS;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Confirm (' + remaining + ')';
        stopCountdown();
        countdownTimer = setInterval(function () {
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
    console.warn('[edit-profile.js] #guard-confirm-modal markup not found — falling back to window.confirm().');
    window.LWConfirmGuard = function confirmGuard(message) {
      return Promise.resolve(window.confirm(message));
    };
  }
}

/* ── NAME ─────────────────────────────────────────────────────── */
// Same 30-char cap js/auth.js's register()/updateUsername() enforce
// server-side-equivalent (see that file's header comments for why
// the HTML `maxlength` attribute alone isn't enough).
var MAX_NAME_LENGTH = 30;

function initNameForm(user) {
  var input = document.getElementById('edit-profile-name-input');
  var btn = document.getElementById('btn-save-name');
  if (!input || !btn) return;
  // Truncates an already-oversized stored name on load (old bad data
  // from before this validation existed) so it self-heals the next
  // time this learner saves — see auth.js's register()/updateUsername().
  input.value = (user.name || '').slice(0, MAX_NAME_LENGTH);

  // "Save changes" is inert until the name actually differs from what is saved.
  // aria-disabled rather than `disabled`: the button stays focusable (and is
  // announced as dimmed) but the click handler below ignores it. The baseline is
  // the FULL stored name, so an oversized stored name that was just truncated
  // above counts as a change and can be saved.
  var savedName = (user.name || '').trim();
  function syncSaveState() {
    var unchanged = input.value.trim() === savedName;
    if (unchanged) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  }
  syncSaveState();
  input.addEventListener('input', syncSaveState);

  btn.addEventListener('click', async function () {
    if (btn.getAttribute('aria-disabled') === 'true') return;   // nothing changed
    var trimmed = input.value.trim();
    if (!trimmed) {
      window.LinguaWave && window.LinguaWave.showToast('Enter a name first.', 'error');
      input.focus();
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      window.LinguaWave && window.LinguaWave.showToast('Please use a name with ' + MAX_NAME_LENGTH + ' characters or fewer.', 'error');
      input.focus();
      return;
    }
    if (typeof window.LWAuth === 'undefined' || typeof window.LWAuth.updateUsername !== 'function') {
      window.LinguaWave && window.LinguaWave.showToast('Saving your name is not available right now.', 'error');
      return;
    }

    var confirmed = await window.LWConfirmGuard('Do you want to change your display name to "' + trimmed + '"?');
    if (!confirmed) return;

    setBusy(btn, true, 'Saving…', 'Save changes');
    try {
      // updateUsername() writes users/{uid}.name AND patches the
      // localStorage session cache itself (see auth.js) — no need to
      // duplicate that here, just refresh what's on screen.
      await window.LWAuth.updateUsername(trimmed);
      savedName = trimmed;   // the new baseline: Save goes inert again until the next edit
      // Same targets main.js's own initUserDetails() fills on load —
      // updated here too so the sidebar/avatar reflect the new name
      // immediately, without a full page reload.
      document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = trimmed; });
      document.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = trimmed.charAt(0).toUpperCase(); });
      // No picture chosen yet -> the avatar shows the name's initial, so repaint it too.
      if (typeof window.LWRepaintEditAvatar === 'function') window.LWRepaintEditAvatar(trimmed);
      if (window.LinguaWave && window.LinguaWave.refreshSidebarUser) window.LinguaWave.refreshSidebarUser();
      window.LinguaWave && window.LinguaWave.showToast('Profile updated.', 'success');
    } catch (e) {
      console.warn('[edit-profile.js] could not save name:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
      // Account was deleted by the admin: auth.js already signed them out, so leave this page.
      if (e && e.code === 'lw/account-removed') {
        setTimeout(function () { window.location.href = '../index.html'; }, 2500);
      }
    } finally {
      setBusy(btn, false, 'Saving…', 'Save changes');
      syncSaveState();
    }
  });
}

/* ── EMAIL (RECONCILED) ──────────────────────────────────────────
 * Pulled in from the teammate session's auth.js PROFILE MANAGEMENT
 * block: window.LWAuth.updateUserEmail() reauthenticates with the
 * current password, then calls verifyBeforeUpdateEmail() — the login
 * email does not change until the learner clicks the confirmation
 * link Firebase sends to the NEW address, so nothing here touches the
 * cached session or the read-only email display in the Profile card
 * above. */
/* ── EMAIL ────────────────────────────────────────────────────── */
// Same 254-char cap js/auth.js's register()/updateUserEmail() enforce
// server-side-equivalent — see that file's MAX_EMAIL_LENGTH comment for
// why 254 (RFC 5321's practical max deliverable address length).
var MAX_EMAIL_LENGTH = 254;

function initEmailForm() {
  var newEmailEl = document.getElementById('new-email-input');
  var passwordEl = document.getElementById('email-password-input');
  var btn = document.getElementById('btn-change-email');
  if (!btn) return;

  btn.addEventListener('click', async function () {
    var newEmail = (newEmailEl.value || '').trim();
    var password = passwordEl.value;

    if (!newEmail || !password) {
      window.LinguaWave && window.LinguaWave.showToast('Enter a new email and your current password.', 'error');
      return;
    }
    if (newEmail.length > MAX_EMAIL_LENGTH) {
      window.LinguaWave && window.LinguaWave.showToast('Please use an email address with ' + MAX_EMAIL_LENGTH + ' characters or fewer.', 'error');
      return;
    }
    if (typeof window.LWAuth === 'undefined' || typeof window.LWAuth.updateUserEmail !== 'function') {
      window.LinguaWave && window.LinguaWave.showToast('Changing email is not available right now.', 'error');
      return;
    }

    var confirmed = await window.LWConfirmGuard('Do you want to change your email to ' + newEmail + '?');
    if (!confirmed) return;

    setBusy(btn, true, 'Sending…', 'Update Email');
    try {
      await window.LWAuth.updateUserEmail(newEmail, password);
      passwordEl.value = '';
      window.LinguaWave && window.LinguaWave.showToast(
        "Confirmation link sent to " + newEmail + ". Your login email won't change until you click it.",
        'success'
      );
    } catch (e) {
      console.warn('[edit-profile.js] could not change email:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
    } finally {
      setBusy(btn, false, 'Sending…', 'Update Email');
    }
  });
}

/* ── COLLAPSIBLE SECTIONS ─────────────────────────────────────────
 * Wires a toggle button to a panel that starts hidden. Open: shows the
 * panel, sets aria-expanded and swaps the button label to "Hide", focuses
 * opts.focusEl. Close: the reverse, restores the original label and calls
 * opts.onClose() (used to clear typed values). Does nothing while the
 * button is disabled. Returns { open, close, isOpen }. */
function initCollapse(toggleBtn, panel, opts) {
  opts = opts || {};
  var closedLabel = toggleBtn.textContent.trim();
  var api = {
    isOpen: function () { return !panel.hidden; },
    open: function () {
      if (toggleBtn.disabled) return;
      panel.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = opts.openLabel || 'Hide';
      if (opts.focusEl) opts.focusEl.focus();
    },
    close: function () {
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = closedLabel;
      if (opts.onClose) opts.onClose();
    },
  };
  toggleBtn.addEventListener('click', function () {
    if (api.isOpen()) api.close(); else api.open();
  });
  return api;
}

/* ── SIGN-IN METHODS ───────────────────────────────────────────────
 * Which providers this Firebase account can sign in with, as plain
 * strings: ['google.com'], ['password'], or both when a Google account
 * was linked to an email one. window.LWAuth deliberately never exposes
 * the Firebase user object, so this reads auth.currentUser from js/auth.js's
 * ES-module export (the same module instance the page already loaded, no
 * second Firebase app). Resolves null when it can't tell (not ready within
 * 4 seconds, import failed): callers then leave the password form enabled,
 * because wrongly blocking an email/password learner is worse than showing
 * a Google learner a form that would fail on the current-password check. */
var AUTH_MODULE_URL = (function () {
  try { return new URL('auth.js', document.currentScript.src).href; } catch (e) { return './auth.js'; }
})();

function getSignInProviders() {
  var lookup = Promise.resolve()
    .then(function () { return window.LWAuth.whenAuthReady(); })
    .then(function () { return import(AUTH_MODULE_URL); })
    .then(function (mod) {
      var u = mod.auth && mod.auth.currentUser;
      if (!u || !Array.isArray(u.providerData)) return null;
      return u.providerData.map(function (p) { return p.providerId; });
    })
    .catch(function (e) {
      console.warn('[edit-profile.js] could not read sign-in methods:', e);
      return null;
    });
  var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); });
  return Promise.race([lookup, timeout]);
}

/* ── PASSWORD ─────────────────────────────────────────────────── */
function initPasswordForm(user) {
  var toggleBtn = document.getElementById('btn-toggle-password');
  var panel = document.getElementById('password-panel');
  var statusEl = document.getElementById('password-status');
  var noteEl = document.getElementById('password-google-note');
  var hintEl = document.getElementById('new-password-hint');
  var currentEl = document.getElementById('current-password-input');
  var newEl = document.getElementById('new-password-input');
  var confirmEl = document.getElementById('confirm-password-input');
  var btn = document.getElementById('btn-change-password');
  var forgotBtn = document.getElementById('btn-forgot-password');
  if (!btn || !toggleBtn || !panel) return;

  // Live requirement hint, from the same validatePassword() sign-up and
  // changePassword() use, so what the learner reads is what gets enforced.
  var minLen = (window.LWAuth && window.LWAuth.MIN_PASSWORD_LENGTH) || 8;
  var defaultHint = 'Use at least ' + minLen + ' characters, with upper and lower case letters, a number and a special character.';
  function resetHint() {
    if (!hintEl) return;
    hintEl.textContent = defaultHint;
    hintEl.classList.remove('edit-hint--ok', 'edit-hint--bad');
  }
  function clearFields() {
    currentEl.value = '';
    newEl.value = '';
    confirmEl.value = '';
    resetHint();
  }
  function passwordCheck(value) {
    if (!window.LWAuth || typeof window.LWAuth.validatePassword !== 'function') return null;
    // Same context changePassword() passes, so this can't reject what it would accept.
    return window.LWAuth.validatePassword(value, { email: user.email || '' });
  }
  resetHint();

  var collapse = initCollapse(toggleBtn, panel, { focusEl: currentEl, onClose: clearFields });

  newEl.addEventListener('input', function () {
    if (!newEl.value) { resetHint(); return; }
    var check = passwordCheck(newEl.value);
    if (!check || !hintEl) return;
    hintEl.textContent = check.message;
    hintEl.classList.toggle('edit-hint--ok', !!check.valid);
    hintEl.classList.toggle('edit-hint--bad', !check.valid);
  });

  // Sign-in method gate: no email/password sign-in (Google only) means
  // there is no password to change, so the button stays disabled.
  getSignInProviders().then(function (providers) {
    var hasPassword = providers === null || providers.indexOf('password') !== -1;
    toggleBtn.disabled = !hasPassword;
    if (hasPassword) {
      statusEl.textContent = 'Configured';
    } else {
      statusEl.textContent = providers.indexOf('google.com') !== -1 ? 'Managed by Google' : 'Managed by your sign-in provider';
      if (noteEl) noteEl.hidden = false;
      collapse.close();
    }
  });

  btn.addEventListener('click', async function () {
    var current = currentEl.value;
    var next = newEl.value;
    var confirm = confirmEl.value;

    if (!current || !next || !confirm) {
      window.LinguaWave && window.LinguaWave.showToast('Fill in all three password fields.', 'error');
      return;
    }
    var check = passwordCheck(next);
    if (check && !check.valid) {
      window.LinguaWave && window.LinguaWave.showToast(check.message, 'error');
      newEl.focus();
      return;
    }
    if (next !== confirm) {
      window.LinguaWave && window.LinguaWave.showToast('New passwords do not match.', 'error');
      confirmEl.focus();
      return;
    }
    if (typeof window.LWAuth === 'undefined' || typeof window.LWAuth.changePassword !== 'function') {
      window.LinguaWave && window.LinguaWave.showToast('Changing your password is not available right now.', 'error');
      return;
    }

    // GUARD (RECONCILED) — same pattern as Name/Email/Delete below.
    var confirmed = await window.LWConfirmGuard('Do you want to update your password now?');
    if (!confirmed) return;

    setBusy(btn, true, 'Updating…', 'Update Password');
    try {
      await window.LWAuth.changePassword(current, next);
      collapse.close();   // also clears the three fields
      window.LinguaWave && window.LinguaWave.showToast('Password updated.', 'success');
    } catch (e) {
      console.warn('[edit-profile.js] could not change password:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
    } finally {
      setBusy(btn, false, 'Updating…', 'Update Password');
    }
  });

  if (forgotBtn) {
    // Not guarded: unlike the actions above, this doesn't change
    // account state by itself — it only sends an email — same
    // reasoning the teammate session's own modal used for never
    // gating sendPasswordReset().
    forgotBtn.addEventListener('click', function () {
      if (!user.email) return;
      if (!window.LWAuth || typeof window.LWAuth.sendPasswordReset !== 'function') {
        window.LinguaWave && window.LinguaWave.showToast('Sending a reset link is not available right now.', 'error');
        return;
      }
      setBusy(forgotBtn, true, 'Sending…', 'Forgot your current password?');
      window.LWAuth.sendPasswordReset(user.email)
        .then(function () {
          window.LinguaWave && window.LinguaWave.showToast('Reset link sent to ' + user.email + '.', 'success');
        })
        .catch(function (e) {
          console.warn('[edit-profile.js] could not send reset email:', e);
          window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
        })
        .finally(function () {
          setBusy(forgotBtn, false, 'Sending…', 'Forgot your current password?');
        });
    });
  }
}

/* ── DELETE ACCOUNT (RECONCILED) ──────────────────────────────────
 * Pulled in from the teammate session's auth.js, GRACE-PERIOD SOFT
 * DELETE this pass (see auth.js's deleteAccount() header comment for
 * the full design + its stated limitation): window.LWAuth.deleteAccount()
 * reauthenticates, flags the account, and signs the learner out — it
 * does NOT delete anything immediately. Logging back in within the
 * grace period cancels it automatically (js/auth.js's login()).
 * Typed "DELETE" + password first, THEN the guard modal (10-second countdown) —
 * the same double confirmation the teammate session used for this one
 * action, since it's still the most consequential thing on this page
 * even though it's now reversible for a while. */
function initDeleteForm() {
  var passwordEl = document.getElementById('delete-password-input');
  var confirmEl = document.getElementById('delete-confirm-input');
  var btn = document.getElementById('btn-delete-account');
  if (!btn) return;

  var graceDays = (window.LWAuth && window.LWAuth.DELETION_GRACE_PERIOD_DAYS) || 30;

  // UX: the days shown in the card follow the real grace period, and the button only turns on once the
  // learner has typed DELETE (the click handler below still re-checks it).
  var graceEl = document.getElementById('delete-grace-days');
  if (graceEl) graceEl.textContent = graceDays;
  btn.disabled = true;
  confirmEl.addEventListener('input', function () {
    btn.disabled = (confirmEl.value || '').trim() !== 'DELETE';
  });

  // The warning and confirm form stay hidden until "Delete account" is
  // clicked; hiding it again clears the typed DELETE and re-disables the button.
  var toggleBtn = document.getElementById('btn-toggle-delete');
  var panel = document.getElementById('delete-panel');
  if (toggleBtn && panel) {
    initCollapse(toggleBtn, panel, {
      focusEl: confirmEl,
      onClose: function () {
        confirmEl.value = '';
        btn.disabled = true;
      },
    });
  }

  btn.addEventListener('click', async function () {
    // [DISABLED] The "Current password" field was removed from this card (commented out in the HTML), so there
    // is no password to read; the typed DELETE + confirm modal are the safeguards. auth.js deleteAccount()
    // skips re-authentication when no password is passed.
    // var password = passwordEl.value;
    var password = passwordEl ? passwordEl.value : '';

    if ((confirmEl.value || '').trim() !== 'DELETE') {
      window.LinguaWave && window.LinguaWave.showToast('Type DELETE (all caps) to confirm.', 'error');
      confirmEl.focus();
      return;
    }
    // [DISABLED] password no longer required here:
    // if (!password) {
    //   window.LinguaWave && window.LinguaWave.showToast('Enter your password.', 'error');
    //   return;
    // }
    if (typeof window.LWAuth === 'undefined' || typeof window.LWAuth.deleteAccount !== 'function') {
      window.LinguaWave && window.LinguaWave.showToast('Account deletion is not available right now.', 'error');
      return;
    }

    var confirmed = await window.LWConfirmGuard(
      'Do you want to deactivate your account? You\'ll be signed out immediately, and it will be ' +
      'permanently deleted in ' + graceDays + ' days unless you log back in before then to cancel.',
      DELETE_COUNTDOWN_SECONDS
    );
    if (!confirmed) return;

    setBusy(btn, true, 'Deactivating…', 'Delete my account');
    try {
      await window.LWAuth.deleteAccount(password);
      // Not an immediate "as-if-gone" redirect: the account is only
      // deactivated at this point (see auth.js), so say that plainly
      // before leaving, rather than behaving as if it was hard-deleted.
      window.LinguaWave && window.LinguaWave.showToast(
        'Account deactivated. Log back in within ' + graceDays + ' days to cancel — after that it is permanently deleted.',
        'success'
      );
      setTimeout(function () { window.location.href = '../index.html'; }, 2500);
    } catch (e) {
      console.warn('[edit-profile.js] could not delete account:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
      setBusy(btn, false, 'Deactivating…', 'Delete my account');
    }
  });
}

/* ── PROFILE PICTURE ──────────────────────────────────────────────
 * Same behaviour as the picker in js/profile-page.js (pages/profile.html):
 * a native <dialog> with one radio per picture in js/avatars.js. Choosing
 * one previews it straight away on the big picture; Save stores it, and
 * closing any other way (Esc, Cancel, X, backdrop click) puts the picture
 * back to what is saved. All state lives inside this function so it can't
 * clash with names in js/main.js (a plain script sharing the global scope).
 * Exposes window.LWRepaintEditAvatar(name) for the Save-name handler. */
function initAvatarPicker() {
  var slot       = document.getElementById('profile-avatar');
  var dlg        = document.getElementById('avatar-panel');
  var openBtn    = document.getElementById('btn-change-avatar');
  var pickerEl   = document.getElementById('avatar-picker');
  var previewEl  = document.getElementById('avatar-dialog-preview');
  var saveBtn    = document.getElementById('btn-save-avatar');
  var cancelBtn  = document.getElementById('btn-cancel-avatar');
  var closeBtn   = document.getElementById('btn-close-avatar');
  if (!slot || !dlg || !openBtn || !pickerEl || !saveBtn) return;

  // The change button is useless without the picture list — hide it rather
  // than show a button that does nothing (e.g. avatars.js failed to load).
  if (!window.LWAvatars) {
    console.warn('[edit-profile.js] js/avatars.js is not loaded — picture picker disabled.');
    openBtn.hidden = true;
    return;
  }

  var savedId = null;      // what is stored on the account
  var selectedId = null;   // what is currently highlighted in the picker
  var nameOverride = null; // set after Save name, until the session cache catches up

  function toast(msg, type) {
    window.LinguaWave && window.LinguaWave.showToast && window.LinguaWave.showToast(msg, type);
  }
  function attr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function currentName() {
    if (nameOverride) return nameOverride;
    var u = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
    return (u && u.name) || 'Learner';
  }
  function paint() {
    slot.innerHTML = window.LWAvatars.markup(selectedId, { size: 'hero', name: currentName() });
    if (previewEl) previewEl.innerHTML = window.LWAvatars.markup(selectedId, { size: 'lg', name: currentName() });
  }
  function syncSave() {
    saveBtn.disabled = !selectedId || selectedId === savedId;
  }
  function renderPicker() {
    pickerEl.innerHTML = window.LWAvatars.LIST.map(function (a) {
      return '<label class="avatar-option">' +
        '<input type="radio" name="avatar" value="' + attr(a.id) + '" aria-label="' + attr(a.label) + '"' +
        (a.id === selectedId ? ' checked' : '') + '>' +
        window.LWAvatars.markup(a.id) +
      '</label>';
    }).join('');
  }

  // showModal() gives the focus trap and Esc. Anything that closes the dialog
  // without saving fires 'close', which reverts the preview (onClosed below).
  function setOpen(open) {
    if (open && !dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      openBtn.setAttribute('aria-expanded', 'true');
    } else if (!open && dlg.open) {
      if (typeof dlg.close === 'function') dlg.close(); else { dlg.removeAttribute('open'); onClosed(); }
    }
  }
  function onClosed() {
    openBtn.setAttribute('aria-expanded', 'false');
    if (selectedId !== savedId) {
      selectedId = savedId;
      renderPicker(); paint(); syncSave();
    }
  }

  async function save() {
    if (!selectedId || selectedId === savedId) return;
    if (!window.LWAuth || typeof window.LWAuth.updateAvatar !== 'function') {
      toast('Saving your picture is not available right now.', 'error');
      return;
    }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      await window.LWAuth.updateAvatar(selectedId);
      savedId = selectedId;
      if (window.LinguaWave && window.LinguaWave.refreshSidebarUser) window.LinguaWave.refreshSidebarUser(); // repaint the sidebar account card
      toast('Profile picture updated.', 'success');
      setOpen(false);
    } catch (e) {
      console.warn('[edit-profile.js] could not save picture:', e);
      var removed = e && e.code === 'lw/account-removed';
      toast(removed ? friendlyAuthError(e) : 'Could not save your picture. Please try again.', 'error');
      // Account was deleted by the admin: auth.js already signed them out, so leave this page.
      if (removed) setTimeout(function () { window.location.href = '../index.html'; }, 2500);
    } finally {
      saveBtn.textContent = 'Save picture';
      syncSave();
    }
  }

  // Start from the session cache (instant), then confirm against the account.
  var cached = window.LWAuth && window.LWAuth.getCurrentUser && window.LWAuth.getCurrentUser();
  savedId = (cached && window.LWAvatars.find(cached.avatar)) ? cached.avatar : null;
  selectedId = savedId;
  renderPicker(); paint(); syncSave();

  pickerEl.addEventListener('change', function (e) {
    if (!e.target || e.target.name !== 'avatar') return;
    selectedId = e.target.value;
    paint(); syncSave();
  });
  saveBtn.addEventListener('click', save);
  openBtn.addEventListener('click', function () { setOpen(true); });
  if (cancelBtn) cancelBtn.addEventListener('click', function () { setOpen(false); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) setOpen(false); }); // backdrop click
  dlg.addEventListener('close', onClosed);

  window.LWRepaintEditAvatar = function (name) {
    if (name) nameOverride = name;
    paint();
  };

  // The session cache can be stale (picture changed on another device), so
  // re-read it once auth is ready — unless the learner has already started
  // choosing something else.
  Promise.resolve()
    .then(function () { return window.LWAuth.whenAuthReady(); })
    .then(function () { return window.LWAuth.getAvatar(); })
    .then(function (stored) {
      var untouched = selectedId === savedId;
      savedId = stored;
      if (untouched) { selectedId = stored; renderPicker(); }
      paint(); syncSave();
    })
    .catch(function (e) {
      console.warn('[edit-profile.js] could not read saved picture:', e);
    });
}

function initEditProfilePage() {
  var user = window.LWAuth && window.LWAuth.getCurrentUser();
  if (!user) return; // requireAuth() (this page's own inline script) is already sending them to login
  initConfirmGuardModal();
  initAvatarPicker();
  initNameForm(user);
  // [DISABLED] Change Email is hidden on this page (card commented out in pages/edit-profile.html).
  // initEmailForm();
  initPasswordForm(user);
  initDeleteForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditProfilePage);
} else {
  initEditProfilePage();
}