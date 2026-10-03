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
 * GUARD CONFIRM MODAL: every action that changes account state (name,
 *            email, password, delete) now goes through
 *            window.LWConfirmGuard(message) first — a small promise-
 *            based modal defined in initConfirmGuardModal() below,
 *            same pattern/markup as pages/settings.html's own copy
 *            (js/settings-page.js), duplicated here rather than
 *            shared since the two pages don't share one DOM. Shows
 *            the message, disables Confirm for a 10-second countdown,
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
    'auth/weak-password': 'Please choose a password with at least 6 characters.',
    'auth/requires-recent-login': 'Please log out and back in, then try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/no-current-user': 'Please refresh the page and try again.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/invalid-email': 'That does not look like a valid email address.',
    // NEW — reachable now that Change Email calls updateUserEmail().
    'auth/email-already-in-use': 'Another account already uses that email.',
  };
  return (err && map[err.code]) || 'Something went wrong. Please try again.';
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

/* ── GUARD CONFIRM MODAL (RECONCILED) ─────────────────────────────
 * Own copy of pages/settings.html's initConfirmGuardModal() (see
 * js/settings-page.js) — identical behavior, wired to this page's own
 * #guard-confirm-modal markup, since the two pages don't share a DOM.
 * Exposes window.LWConfirmGuard(message) -> Promise<boolean>. Falls
 * back to window.confirm() if the markup is missing for any reason,
 * so a guarded action never silently stops working.
 * ──────────────────────────────────────────────────────────────── */
var GUARD_COUNTDOWN_SECONDS = 10;

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

    window.LWConfirmGuard = function confirmGuard(message) {
      return new Promise(function (resolve) {
        resolveActive = resolve;
        messageEl.textContent = message;
        overlay.hidden = false;
        if (modalEl) modalEl.focus();
        document.addEventListener('keydown', onKeydown);

        var remaining = GUARD_COUNTDOWN_SECONDS;
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

  btn.addEventListener('click', async function () {
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
      // Same targets main.js's own initUserDetails() fills on load —
      // updated here too so the sidebar/avatar reflect the new name
      // immediately, without a full page reload.
      document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = trimmed; });
      document.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = trimmed.charAt(0).toUpperCase(); });
      window.LinguaWave && window.LinguaWave.showToast('Profile updated.', 'success');
    } catch (e) {
      console.warn('[edit-profile.js] could not save name:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
    } finally {
      setBusy(btn, false, 'Saving…', 'Save changes');
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

/* ── PASSWORD ─────────────────────────────────────────────────── */
function initPasswordForm(user) {
  var currentEl = document.getElementById('current-password-input');
  var newEl = document.getElementById('new-password-input');
  var confirmEl = document.getElementById('confirm-password-input');
  var btn = document.getElementById('btn-change-password');
  var forgotBtn = document.getElementById('btn-forgot-password');
  if (!btn) return;

  btn.addEventListener('click', async function () {
    var current = currentEl.value;
    var next = newEl.value;
    var confirm = confirmEl.value;

    if (!current || !next || !confirm) {
      window.LinguaWave && window.LinguaWave.showToast('Fill in all three password fields.', 'error');
      return;
    }
    if (next.length < 6) {
      window.LinguaWave && window.LinguaWave.showToast('New password needs at least 6 characters.', 'error');
      return;
    }
    if (next !== confirm) {
      window.LinguaWave && window.LinguaWave.showToast('New passwords do not match.', 'error');
      confirmEl.focus();
      return;
    }

    // GUARD (RECONCILED) — same pattern as Name/Email/Delete below.
    var confirmed = await window.LWConfirmGuard('Do you want to update your password now?');
    if (!confirmed) return;

    setBusy(btn, true, 'Updating…', 'Update Password');
    try {
      await window.LWAccountSecurity.changePassword(current, next);
      currentEl.value = '';
      newEl.value = '';
      confirmEl.value = '';
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
      setBusy(forgotBtn, true, 'Sending…', 'Forgot your current password?');
      window.LWAccountSecurity.sendResetEmail(user.email)
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
 * Typed "DELETE" + password first, THEN the 10-second guard modal —
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
      'permanently deleted in ' + graceDays + ' days unless you log back in before then to cancel.'
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

function initEditProfilePage() {
  var user = window.LWAuth && window.LWAuth.getCurrentUser();
  if (!user) return; // requireAuth() (this page's own inline script) is already sending them to login
  initConfirmGuardModal();
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