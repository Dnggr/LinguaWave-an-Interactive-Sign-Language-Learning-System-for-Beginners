'use strict';

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
    'auth/email-already-in-use': 'Another account already uses that email.',
    'lw/account-removed': 'This account was removed by an administrator. Please create a new account.',
  };
  if (err && map[err.code]) return map[err.code];
  if (err && typeof err.code === 'string' && err.code.indexOf('lw/') === 0 && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

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
      if (confirmBtn.disabled) return;
      settle(true);
    });
    cancelBtn.addEventListener('click', function () { settle(false); });

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

var MAX_NAME_LENGTH = 30;

function initNameForm(user) {
  var input = document.getElementById('edit-profile-name-input');
  var btn = document.getElementById('btn-save-name');
  if (!input || !btn) return;
  input.value = (user.name || '').slice(0, MAX_NAME_LENGTH);

  var savedName = (user.name || '').trim();
  function syncSaveState() {
    var unchanged = input.value.trim() === savedName;
    if (unchanged) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  }
  syncSaveState();
  input.addEventListener('input', syncSaveState);

  btn.addEventListener('click', async function () {
    if (btn.getAttribute('aria-disabled') === 'true') return;
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
      await window.LWAuth.updateUsername(trimmed);
      savedName = trimmed;
      document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = trimmed; });
      document.querySelectorAll('[data-user-initial]').forEach(function (el) { el.textContent = trimmed.charAt(0).toUpperCase(); });
      if (typeof window.LWRepaintEditAvatar === 'function') window.LWRepaintEditAvatar(trimmed);
      if (window.LinguaWave && window.LinguaWave.refreshSidebarUser) window.LinguaWave.refreshSidebarUser();
      window.LinguaWave && window.LinguaWave.showToast('Profile updated.', 'success');
    } catch (e) {
      console.warn('[edit-profile.js] could not save name:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
      if (e && e.code === 'lw/account-removed') {
        setTimeout(function () { window.location.href = '../index.html'; }, 2500);
      }
    } finally {
      setBusy(btn, false, 'Saving…', 'Save changes');
      syncSaveState();
    }
  });
}

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

    var confirmed = await window.LWConfirmGuard('Do you want to update your password now?');
    if (!confirmed) return;

    setBusy(btn, true, 'Updating…', 'Update Password');
    try {
      await window.LWAuth.changePassword(current, next);
      collapse.close();
      window.LinguaWave && window.LinguaWave.showToast('Password updated.', 'success');
    } catch (e) {
      console.warn('[edit-profile.js] could not change password:', e);
      window.LinguaWave && window.LinguaWave.showToast(friendlyAuthError(e), 'error');
    } finally {
      setBusy(btn, false, 'Updating…', 'Update Password');
    }
  });

  if (forgotBtn) {
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

function initDeleteForm() {
  var passwordEl = document.getElementById('delete-password-input');
  var confirmEl = document.getElementById('delete-confirm-input');
  var btn = document.getElementById('btn-delete-account');
  if (!btn) return;

  var graceDays = (window.LWAuth && window.LWAuth.DELETION_GRACE_PERIOD_DAYS) || 30;

  var graceEl = document.getElementById('delete-grace-days');
  if (graceEl) graceEl.textContent = graceDays;
  btn.disabled = true;
  confirmEl.addEventListener('input', function () {
    btn.disabled = (confirmEl.value || '').trim() !== 'DELETE';
  });

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
    var password = passwordEl ? passwordEl.value : '';

    if ((confirmEl.value || '').trim() !== 'DELETE') {
      window.LinguaWave && window.LinguaWave.showToast('Type DELETE (all caps) to confirm.', 'error');
      confirmEl.focus();
      return;
    }
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

  if (!window.LWAvatars) {
    console.warn('[edit-profile.js] js/avatars.js is not loaded — picture picker disabled.');
    openBtn.hidden = true;
    return;
  }

  var savedId = null;
  var selectedId = null;
  var nameOverride = null;

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
      if (window.LinguaWave && window.LinguaWave.refreshSidebarUser) window.LinguaWave.refreshSidebarUser();
      toast('Profile picture updated.', 'success');
      setOpen(false);
    } catch (e) {
      console.warn('[edit-profile.js] could not save picture:', e);
      var removed = e && e.code === 'lw/account-removed';
      toast(removed ? friendlyAuthError(e) : 'Could not save your picture. Please try again.', 'error');
      if (removed) setTimeout(function () { window.location.href = '../index.html'; }, 2500);
    } finally {
      saveBtn.textContent = 'Save picture';
      syncSave();
    }
  }

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
  dlg.addEventListener('click', function (e) { if (e.target === dlg) setOpen(false); });
  dlg.addEventListener('close', onClosed);

  window.LWRepaintEditAvatar = function (name) {
    if (name) nameOverride = name;
    paint();
  };

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
  if (!user) return;
  initConfirmGuardModal();
  initAvatarPicker();
  initNameForm(user);
  initPasswordForm(user);
  initDeleteForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditProfilePage);
} else {
  initEditProfilePage();
}
