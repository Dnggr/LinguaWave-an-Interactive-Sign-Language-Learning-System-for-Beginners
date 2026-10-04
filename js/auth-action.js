/**
 * js/auth-action.js — controller for pages/auth-action.html
 * ─────────────────────────────────────────────────────────────────
 * Firebase appends ?mode=...&oobCode=... to the "action URL". One page
 * serves every email, so this file routes by mode:
 *   resetPassword          -> verify code, show the new-password form
 *   verifyEmail            -> apply code, "Email verified"
 *   verifyAndChangeEmail   -> apply code, "Email updated"
 *   recoverEmail           -> apply code, "Email restored"
 * Password rules + strength come from window.LWAuth (js/auth.js), the
 * same functions signup enforces, so the two can't disagree. Nothing
 * typed is logged, stored or placed in an error message.
 */
import { auth } from './auth.js';
import {
  verifyPasswordResetCode, confirmPasswordReset, applyActionCode,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const LW = window.LWAuth;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const mode = params.get('mode');
const code = params.get('oobCode');

const MARK_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const MARK_BAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>';
const EYE = '<svg class="pw-toggle__icon--show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg><svg class="pw-toggle__icon--hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';
const LEVEL_TEXT = { empty: 'Strength', weak: 'Weak', medium: 'Medium', strong: 'Strong', 'very-strong': 'Very strong' };

const SCREENS = ['aa-loading', 'aa-form', 'aa-result'];
function show(id) {
  SCREENS.forEach((s) => { $(s).hidden = s !== id; });
  const h = $(id).querySelector('h1');
  if (h) h.focus({ preventScroll: true });
}

function showResult(kind, title, text, ctaLabel, ctaHref) {
  $('aa-result').dataset.kind = kind;
  $('aa-mark').innerHTML = kind === 'ok' ? MARK_OK : MARK_BAD;
  $('aa-title').textContent = title;
  $('aa-text').textContent = text;
  $('aa-cta').textContent = ctaLabel;
  $('aa-cta').href = ctaHref;
  document.title = title + ' | LinguaWave';
  show('aa-result');
}

const BAD_LINK = ['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found'];

function showBadLink() {
  showResult('error', 'This link can\'t be used',
    'It may have expired or already been used. Request a new one from the Log In screen.',
    'Back to Log In', '../index.html');
}

/* ── Password reset form ─────────────────────────────────────── */
function setMsg(el, msg) {
  el.textContent = msg || '';
  el.hidden = !msg;
}

function addToggles() {
  document.querySelectorAll('#aa-reset .form-group').forEach((group) => {
    const input = group.querySelector('input');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-controls', input.id);
    btn.innerHTML = EYE;
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the field
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      input.type = on ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
    });
    group.appendChild(btn);
  });
}

function initResetForm(email) {
  const pw = $('aa-password');
  const confirm = $('aa-confirm');
  const ctx = { email };
  $('aa-email').textContent = email;
  addToggles();

  function renderStrength() {
    const v = pw.value;
    const s = LW.getPasswordStrength(v, ctx);
    const level = v ? s.level : 'empty';
    $('aa-panel').dataset.open = v ? 'true' : 'false';
    $('aa-meter').dataset.level = level;
    $('aa-meter').style.setProperty('--pw-fill', v ? s.progress.toFixed(3) : '0');
    $('aa-level').textContent = LEVEL_TEXT[level];
    const r = LW.validatePassword(v, ctx);
    setMsg($('aa-pw-msg'), v && !r.valid ? r.message : '');
    pw.setAttribute('aria-invalid', v && !r.valid ? 'true' : 'false');
  }
  function renderConfirm(force) {
    if (!confirm.value && !force) { setMsg($('aa-confirm-msg'), ''); return; }
    const r = LW.validateConfirmPassword(pw.value, confirm.value);
    setMsg($('aa-confirm-msg'), r.valid ? '' : r.message);
    confirm.setAttribute('aria-invalid', r.valid ? 'false' : 'true');
  }

  pw.addEventListener('input', () => { renderStrength(); renderConfirm(false); });
  confirm.addEventListener('input', () => renderConfirm(false));

  $('aa-reset').addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('aa-error'), '');
    const rule = LW.validatePassword(pw.value, ctx);
    const same = LW.validateConfirmPassword(pw.value, confirm.value);
    if (!rule.valid || !same.valid) {
      renderStrength(); renderConfirm(true);
      (rule.valid ? confirm : pw).focus();
      return;
    }
    const btn = $('aa-submit');
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-disabled', 'true');
    btn.textContent = 'Saving...';
    try {
      await confirmPasswordReset(auth, code, pw.value);
      pw.value = confirm.value = '';
      showResult('ok', 'Password updated',
        'Your password has been changed. Log in with the new one.', 'Log In', '../index.html');
    } catch (err) {
      if (err && BAD_LINK.includes(err.code)) { showBadLink(); return; }
      const box = $('aa-error');
      box.textContent = LW.describeAuthError(err);
      box.hidden = false;
      btn.removeAttribute('aria-busy');
      btn.removeAttribute('aria-disabled');
      btn.textContent = 'Save new password';
    }
  });

  $('aa-reset').addEventListener('click', (e) => {
    // aria-disabled (not disabled) keeps the button focusable; block repeat taps here.
    if (e.target.closest('#aa-submit')?.getAttribute('aria-busy') === 'true') e.preventDefault();
  });
  show('aa-form');
}

/* ── Email links: apply on load ──────────────────────────────── */
const APPLY = {
  verifyEmail: ['Email verified', 'Your email address is confirmed. You can continue to LinguaWave.', 'Continue', 'verify-email.html'],
  verifyAndChangeEmail: ['Email updated', 'Your new email address is confirmed. Use it the next time you log in.', 'Continue', 'verify-email.html'],
  recoverEmail: ['Email restored', 'Your old email address is back on the account. If you didn\'t request the change, reset your password too.', 'Back to Log In', '../index.html'],
};

async function run() {
  if (!code || !mode) {
    showResult('error', 'Open this page from your email',
      'This page works from the link in a LinguaWave email. Open that email and tap the link again.',
      'Go to LinguaWave', '../index.html');
    return;
  }
  try {
    if (mode === 'resetPassword') {
      const email = await verifyPasswordResetCode(auth, code);
      initResetForm(email);
    } else if (APPLY[mode]) {
      await applyActionCode(auth, code);
      showResult('ok', ...APPLY[mode]);
    } else {
      showBadLink();
    }
  } catch (err) {
    if (err && BAD_LINK.includes(err.code)) showBadLink();
    else showResult('error', 'Something went wrong', LW.describeAuthError(err), 'Back to Log In', '../index.html');
  }
}
run();
