(function () {
  'use strict';

  const LWAuth = window.LWAuth;
  const NEXT_PAGE = 'dashboard.html';
  const LOGIN_PAGE = '../index.html';
  const AUTO_CHECK_MIN_GAP_MS = 5000;
  const REDIRECT_DELAY_MS = 1200;

  const el = {
    loading: document.getElementById('verify-loading'),
    content: document.getElementById('verify-content'),
    success: document.getElementById('verify-success'),
    address: document.getElementById('verify-address'),
    status: document.getElementById('verify-status'),
    resend: document.getElementById('btn-resend'),
    check: document.getElementById('btn-check'),
    logout: document.getElementById('btn-logout'),
    continueLink: document.getElementById('verify-continue'),
  };

  const RESEND_LABEL = el.resend ? el.resend.textContent : 'Resend Verification Email';
  const CHECK_LABEL = el.check ? el.check.textContent : 'I Already Verified';

  let cooldownTimer = null;
  let redirectTimer = null;
  let resending = false;
  let checking = false;
  let loggingOut = false;
  let finished = false;
  let lastCheckAt = 0;

  function show(node) { if (node) node.hidden = false; }
  function hide(node) { if (node) node.hidden = true; }

  function showStatus(kind, message) {
    el.status.textContent = message;
    el.status.className = 'verify-status' + (kind === 'info' ? '' : ' verify-status--' + kind);
    el.status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    show(el.status);
  }
  function clearStatus() {
    el.status.textContent = '';
    hide(el.status);
  }

  function go(url) {
    window.location.replace(url);
  }

  function renderResend() {
    if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
    if (finished) return;

    if (resending) {
      el.resend.disabled = true;
      el.resend.textContent = 'Sending...';
      return;
    }
    const remaining = LWAuth.getResendCooldownRemaining();
    if (remaining > 0) {
      el.resend.disabled = true;
      el.resend.textContent = 'Resend available in ' + remaining + 's';
      cooldownTimer = setTimeout(renderResend, 1000);
    } else {
      el.resend.disabled = false;
      el.resend.textContent = RESEND_LABEL;
    }
  }

  function setCheckBusy(busy) {
    el.check.disabled = busy;
    el.check.textContent = busy ? 'Checking...' : CHECK_LABEL;
  }

  function onVerified() {
    if (finished) return;
    finished = true;
    if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
    hide(el.loading);
    hide(el.content);
    show(el.success);
    redirectTimer = setTimeout(() => go(NEXT_PAGE), REDIRECT_DELAY_MS);
  }

  async function runCheck(silent) {
    if (checking || finished) return;
    checking = true;
    lastCheckAt = Date.now();
    if (!silent) {
      clearStatus();
      setCheckBusy(true);
    }
    try {
      const result = await LWAuth.checkVerificationNow();
      if (result.verified) {
        onVerified();
      } else if (!silent) {
        showStatus('info', 'Not verified yet. Open the link in the email we sent you, then press "I Already Verified" again.');
      }
    } catch (err) {
      if (silent) {
        console.warn('[verify-email] Quiet re-check failed:', err);
      } else {
        showStatus('error', LWAuth.describeAuthError(err, 'session'));
      }
    } finally {
      checking = false;
      if (!finished && !silent) setCheckBusy(false);
    }
  }

  async function onResend() {
    if (resending || finished) return;
    resending = true;
    clearStatus();
    renderResend();
    try {
      const sent = await LWAuth.sendVerificationEmail();
      if (sent) {
        showStatus('success', 'Verification email sent. Check your inbox and your spam folder.');
      }
    } catch (err) {
      if (err && err.code === 'lw/already-verified') {
        resending = false;
        await runCheck(false);
      } else if (err && err.code === 'lw/resend-cooldown') {
        showStatus('info', err.message);
      } else {
        showStatus('error', "We couldn't send the email. " + LWAuth.describeAuthError(err, 'session'));
      }
    } finally {
      resending = false;
      renderResend();
    }
  }

  async function onLogout() {
    if (loggingOut) return;
    loggingOut = true;
    el.logout.disabled = true;
    try {
      await LWAuth.logout(LOGIN_PAGE);
    } catch (err) {
      loggingOut = false;
      el.logout.disabled = false;
      showStatus('error', "Couldn't log you out. " + LWAuth.describeAuthError(err, 'session'));
    }
  }

  function maybeAutoCheck() {
    if (finished || document.visibilityState !== 'visible') return;
    if (Date.now() - lastCheckAt < AUTO_CHECK_MIN_GAP_MS) return;
    runCheck(true);
  }

  async function init() {
    if (!LWAuth) {
      hide(el.loading);
      show(el.content);
      showStatus('error', "We couldn't reach the sign-in service. Check your connection and reload the page.");
      el.resend.disabled = true;
      el.check.disabled = true;
      return;
    }

    await LWAuth.whenAuthReady();
    const info = LWAuth.getVerificationInfo();

    if (info.state === 'logged-out') return go(LOGIN_PAGE);
    if (info.state === 'verified') return go(NEXT_PAGE);

    el.address.textContent = info.email || '';

    const params = new URLSearchParams(window.location.search);
    const signupStatus = params.get('status');
    if (signupStatus) {
      try { window.history.replaceState(null, '', window.location.pathname); } catch (e) {  }
    }

    hide(el.loading);
    show(el.content);
    renderResend();

    if (signupStatus === 'send-failed') {
      showStatus('error', "Your account was created, but we couldn't send the verification email. Press \"Resend Verification Email\" to try again.");
    } else if (signupStatus === 'sent') {
      showStatus('success', 'Account created. We just sent your verification link.');
    }

    el.resend.addEventListener('click', onResend);
    el.check.addEventListener('click', () => runCheck(false));
    el.logout.addEventListener('click', onLogout);
    document.addEventListener('visibilitychange', maybeAutoCheck);
    window.addEventListener('focus', maybeAutoCheck);
    window.addEventListener('pagehide', () => {
      if (cooldownTimer) clearTimeout(cooldownTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
    });

    runCheck(true);
  }

  init().catch((err) => {
    console.error('[verify-email] init failed:', err);
    hide(el.loading);
    show(el.content);
    showStatus('error', LWAuth ? LWAuth.describeAuthError(err, 'session') : 'Something went wrong. Please reload the page.');
  });
})();
