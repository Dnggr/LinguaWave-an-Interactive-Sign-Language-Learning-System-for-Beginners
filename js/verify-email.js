/**
 * verify-email.js — Controller for pages/verify-email.html (NEW, 2026-09-29)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Runs the "Check your email" screen for an account that is
 *            signed in with Firebase but whose email is NOT verified yet.
 *
 * SOURCE OF TRUTH : Firebase. Nothing here reads localStorage to decide
 *            whether the email is verified. "I Already Verified" calls
 *            LWAuth.checkVerificationNow(), which does
 *            `await firebaseUser.reload()` and only then looks at
 *            `emailVerified`. The one localStorage value involved is the
 *            resend-cooldown timestamp inside js/auth.js (a UI courtesy,
 *            not trusted for anything).
 *
 * LOAD ORDER : `<script type="module">` AFTER js/auth.js in the HTML, so
 *            window.LWAuth already exists when this file runs.
 *
 * ROUTING (no loops — see the guard comments in js/auth.js):
 *     nobody signed in   -> ../index.html
 *     already verified   -> dashboard.html  (role-guard.js on that page
 *                           forwards the admin account to the admin panel)
 *     signed in, unverified -> stay here
 *
 * AUTOMATIC RE-CHECK : the page also asks Firebase (quietly, no error
 *            spam) once on load and again whenever the tab becomes
 *            visible / focused — i.e. the moment the learner returns
 *            from clicking the link in their email. Throttled so
 *            flipping tabs can't hammer Firebase.
 *
 * TIMERS   : the cooldown ticker and the post-success redirect are the
 *            only timers; both ids are tracked and cleared on pagehide.
 * ─────────────────────────────────────────────────────────────────
 */
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
  let finished = false;      // verified / redirecting — stop reacting to anything
  let lastCheckAt = 0;

  /* ── tiny UI helpers ────────────────────────────────────────── */
  function show(node) { if (node) node.hidden = false; }
  function hide(node) { if (node) node.hidden = true; }

  // kind: 'info' | 'success' | 'error'. Errors use role="alert" so screen
  // readers announce them immediately; the rest are polite status text.
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
    // replace(), not href=, so Back can't return here and re-trigger a redirect.
    window.location.replace(url);
  }

  /* ── resend cooldown ────────────────────────────────────────── */
  // Re-renders the Resend button from the live cooldown (js/auth.js owns
  // the timestamp), and keeps ticking once a second until it reaches 0.
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

  /* ── verified: success screen, then continue ────────────────── */
  function onVerified() {
    if (finished) return;
    finished = true;
    if (cooldownTimer) { clearTimeout(cooldownTimer); cooldownTimer = null; }
    hide(el.loading);
    hide(el.content);
    show(el.success);
    redirectTimer = setTimeout(() => go(NEXT_PAGE), REDIRECT_DELAY_MS);
  }

  /* ── "I Already Verified" (and the quiet automatic re-check) ─── */
  async function runCheck(silent) {
    if (checking || finished) return;
    checking = true;
    lastCheckAt = Date.now();
    if (!silent) {
      clearStatus();
      setCheckBusy(true);
    }
    try {
      // reload() the Firebase user, THEN look at emailVerified. If true this
      // also refreshes the ID token and writes the normal session cache.
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

  /* ── "Resend Verification Email" ────────────────────────────── */
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
        // Firebase already says verified (e.g. they clicked the link in
        // another tab) — finish the job instead of showing an error.
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

  /* ── "Log Out" ──────────────────────────────────────────────── */
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

  /* ── quiet re-check when the learner comes back to this tab ──── */
  function maybeAutoCheck() {
    if (finished || document.visibilityState !== 'visible') return;
    if (Date.now() - lastCheckAt < AUTO_CHECK_MIN_GAP_MS) return;
    runCheck(true);
  }

  /* ── boot ───────────────────────────────────────────────────── */
  async function init() {
    if (!LWAuth) {
      // auth.js failed to load (blocked CDN / offline). Say so instead of
      // spinning forever.
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

    // Signed in but unverified: this is the page they belong on.
    el.address.textContent = info.email || '';

    // ?status=... is set by index.html right after sign-up. Read it once,
    // then strip it so a refresh doesn't replay a stale message.
    const params = new URLSearchParams(window.location.search);
    const signupStatus = params.get('status');
    if (signupStatus) {
      try { window.history.replaceState(null, '', window.location.pathname); } catch (e) { /* not fatal */ }
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

    // Quiet first check: covers "verified in another tab/device, then opened
    // this page" without making them press the button.
    runCheck(true);
  }

  init().catch((err) => {
    console.error('[verify-email] init failed:', err);
    hide(el.loading);
    show(el.content);
    showStatus('error', LWAuth ? LWAuth.describeAuthError(err, 'session') : 'Something went wrong. Please reload the page.');
  });
})();
