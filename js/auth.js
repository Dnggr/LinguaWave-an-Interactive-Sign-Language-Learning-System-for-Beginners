/**
 * auth.js — Authentication Layer (Firebase Auth + Firestore)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single source of truth for "is someone logged in" across
 *            every page. Wraps Firebase Auth (email/password) for
 *            login/register/logout, mirrors the signed-in user's
 *            profile into Firestore (`users/{uid}`), and caches a
 *            small session object in localStorage so every page can
 *            read it synchronously via getCurrentUser() without an
 *            async round-trip. Also handles self-service profile
 *            changes from the Settings page: renaming, email change,
 *            password change, and account deletion (see PROFILE
 *            MANAGEMENT below), plus the logged-out "forgot password"
 *            flow (sendPasswordReset()) used from index.html.
 *
 * CONNECTS : Loaded by index.html (root) and every pages/*.html file.
 *            index.html calls login()/register()/sendPasswordReset().
 *            main.js calls getCurrentUser() to render the navbar.
 *            Every protected page calls requireAuth() on load.
 *            pages/edit-profile.html (via js/edit-profile.js) calls
 *            updateUsername() / updateUserEmail() / deleteAccount().
 *            (js/edit-profile.js also loads js/account-security.js
 *            for its own Change Password / forgot-password forms —
 *            see that file for why it's a separate module rather than
 *            calling changePassword() here.)
 *
 * READY STATE: Firebase's onAuthStateChanged() check is async, so
 *            requireAuth() and whenAuthReady() wait for the
 *            'lwauth-ready' event (fired once, after the first auth
 *            check resolves) instead of trusting localStorage alone
 *            on first paint.
 *
 * ── EMAIL VERIFICATION + SIGNUP PRE-CHECK (2026-09-29) ──────────────
 * READ THIS BEFORE TOUCHING login()/register()/the guards below.
 *
 * Every visitor is in exactly ONE of three states, decided ONLY from
 * Firebase's live user object (auth.currentUser.emailVerified) — never
 * from localStorage, which anyone can edit in DevTools:
 *
 *     LOGGED OUT             -> index.html            (login / sign up)
 *     LOGGED IN + UNVERIFIED -> pages/verify-email.html
 *     LOGGED IN + VERIFIED   -> the normal app
 *
 *   getAuthState() returns 'logged-out' | 'unverified' | 'verified'.
 *   isLoggedIn() now means "logged in AND verified" (see its comment).
 *
 * SIGNUP  : normalize email -> format check -> Reacher pre-check (via the
 *   `checkEmailDeliverability` Cloud Function, see functions/index.js;
 *   the Reacher secret only ever exists server-side) -> Firebase
 *   createUserWithEmailAndPassword -> Firestore profile ->
 *   sendEmailVerification -> stay signed in, go to verify-email.html.
 *   If Reacher rejects, NO Firebase account is created. Reacher is a
 *   pre-filter only: "safe" does NOT prove mailbox ownership — the
 *   Firebase link does.
 * LOGIN   : Firebase checks the password; if emailVerified is false the
 *   user STAYS signed in (verify-email.html needs a real Firebase user
 *   to resend / reload) but gets NO localStorage session and no access.
 * SESSION CACHE: `lw_session` is written ONLY for verified users. That
 *   makes getCurrentUser() return null for unverified users, so every
 *   existing caller (progress sync, missions sync, navbar, tour...)
 *   treats them as logged out even before a redirect lands.
 * GUARDS  : requireAuth() implements the three-way routing above and is
 *   also run automatically for every page except index / verify-email /
 *   admin-* (see AUTO-GUARD at the bottom of this file), so pages that
 *   never called requireAuth() (dashboard, learn, lesson, progress...)
 *   are protected too. Redirects use location.replace() so the Back
 *   button can't bounce someone into a redirect loop.
 * LIMITATIONS (also in SYSTEM_ARCHITECTURE.md): guards run once when
 *   auth is ready, not continuously; a protected page can flash for a
 *   moment before an unverified user is redirected; page-level guards
 *   are routing, not a security boundary — Firestore rules still have to
 *   protect the data itself.
 * ─────────────────────────────────────────────────────────────────
 */
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
sendEmailVerification,
signOut, 
onAuthStateChanged,
EmailAuthProvider,
reauthenticateWithCredential,
verifyBeforeUpdateEmail,
deleteUser,
sendPasswordResetEmail,
updatePassword,
GoogleAuthProvider,
signInWithPopup,
linkWithCredential
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpiKsa6ySEBy7IggejmT8TDWaxAFr5E2c",
  authDomain: "linguawave-63911.firebaseapp.com",
  projectId: "linguawave-63911",
  storageBucket: "linguawave-63911.firebasestorage.app",
  messagingSenderId: "34514540529",
  appId: "1:34514540529:web:18f5b1cd7f04e965fe1650",
  measurementId: "G-6CLTW0GZXJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

'use strict';

// Set by loginWithGoogle() when it hits account-exists-with-different-
// credential — see linkPendingGoogleCredential() below for how it's
// consumed once the user logs back in with their original password.
let pendingGoogleCredential = null;

const LW_SESSION_KEY = 'lw_session';
const MAX_NAME_LENGTH = 30;
// RFC 5321's own limits (64-char local part + 255-char domain) allow up
// to 320 in theory, but 254 is the widely-used practical cap — it's the
// longest address that still fits in RFC 5321's own MAIL FROM/RCPT TO
// command length limit, so anything past it can't be a real deliverable
// address anyway.
const MAX_EMAIL_LENGTH = 254;
const DELETION_GRACE_PERIOD_DAYS = 30;

// EMAIL VERIFICATION (2026-09-29) ─────────────────────────────────
// Minimum gap between verification emails. Purely a UI courtesy on top
// of Firebase's own server-side rate limit (auth/too-many-requests); the
// last-sent time lives in localStorage so a page refresh can't reset the
// countdown. It is NOT trusted for anything security-related.
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_KEY_PREFIX = 'lw_verify_resend_at:';

// Resolved from THIS file's location (js/auth.js), so the redirect
// targets are right no matter which folder the calling page lives in.
const LOGIN_PAGE_URL = new URL('../index.html', import.meta.url).href;
const VERIFY_PAGE_URL = new URL('../pages/verify-email.html', import.meta.url).href;

// ── AUTH STATE SYNC ─────────────────────────────────────────────
// Fires once on page load (after Firebase checks for an existing
// session) and again any time login/logout state changes. Keeps
// localStorage as an accurate cache of who's currently signed in.
let authReady = false;
let hasFiredReady = false;

onAuthStateChanged(auth, async (firebaseUser) => {
  // try/catch/finally-equivalent: authReady MUST be set and 'lwauth-ready'
  // MUST fire even if the Firestore read below fails (offline, blocked
  // gstatic, rules error). Before 2026-09-29 a rejected getDoc() threw out
  // of this callback and every page's guard waited forever (see
  // PIVOT_CHECKLIST.md Phase B). The guards now depend on this event, so
  // it has to be reliable.
  try {
    if (firebaseUser && !firebaseUser.emailVerified) {
      // AUTHENTICATED BUT UNVERIFIED — not a learner yet. Deliberately no
      // session cache (and wipe any stale/forged one): getCurrentUser()
      // must return null for this person so nothing treats them as logged
      // in. verify-email.html reads Firebase directly, not this cache.
      localStorage.removeItem(LW_SESSION_KEY);
    } else if (firebaseUser) {
      const existing = getCurrentUser();

      if (existing && existing.uid === firebaseUser.uid) {
        // Already cached — skip the Firestore fetch entirely
      } else {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snapshot = await getDoc(userRef);
        const profile = snapshot.exists() ? snapshot.data() : {};

        const user = {
          uid: firebaseUser.uid,
          name: profile.name || (firebaseUser.email || '').split('@')[0] || 'Learner',
          email: firebaseUser.email,
          level: profile.level || 'basic',
          joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
        };
        localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
      }
    } else {
      localStorage.removeItem(LW_SESSION_KEY);
    }
  } catch (syncError) {
    // Cache not written (nothing half-true is stored). The guards below
    // still work because they read auth.currentUser, not the cache.
    console.error('[auth] Could not sync the session cache:', syncError);
  }

  authReady = true;

  if (!hasFiredReady) {
    hasFiredReady = true;
    window.dispatchEvent(new Event('lwauth-ready'));
  }
});


/* ── READ SESSION ─────────────────────────────────────────────── */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(LW_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/* Where the visitor stands, from Firebase's live user — NOT localStorage.
 * Only meaningful once auth is ready (after 'lwauth-ready' / whenAuthReady()),
 * because before that Firebase hasn't restored the saved session yet. */
function getAuthState() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return 'logged-out';
  return firebaseUser.emailVerified ? 'verified' : 'unverified';
}

/* Non-sensitive info verify-email.html needs to render itself. Returns
 * plain strings only — never the Firebase user object itself, so the
 * console can't reach user.delete()/etc. through window.LWAuth. */
function getVerificationInfo() {
  const firebaseUser = auth.currentUser;
  return {
    state: getAuthState(),
    email: firebaseUser ? firebaseUser.email : null,
    uid: firebaseUser ? firebaseUser.uid : null,
  };
}

function isLoggedIn() {
  // Authorization must be based on Firebase's own live auth state —
  // NOT the localStorage mirror. getCurrentUser() reads a cache that
  // exists purely so other pages can render a name/email/level
  // synchronously without an extra Firestore round-trip; being plain
  // localStorage, it can be edited directly in DevTools. auth.currentUser
  // is populated by the Firebase SDK itself from the real signed-in
  // session and can't be forged that way. (Safe to read synchronously
  // here because every caller — requireAuth()/redirectIfLoggedIn() —
  // already waits for 'lwauth-ready' first; see whenAuthReady().)
  //
  // CHANGED 2026-09-29: "logged in" now means logged in AND email
  // verified. An unverified account is authenticated with Firebase but is
  // NOT a learner yet — use getAuthState() when you need to tell
  // 'logged-out' and 'unverified' apart.
  const firebaseUser = auth.currentUser;
  return !!firebaseUser && firebaseUser.emailVerified === true;
}

/* ── SMALL HELPERS (2026-09-29) ───────────────────────────────── */

// ONE canonical email value, used for BOTH validation and the value sent
// to Firebase/Reacher, in login AND register (before, register validated
// `trimmedEmail` but sent the untrimmed `email` to Firebase). Trim only —
// deliberately NOT lowercased: the local part is technically
// case-sensitive and Firebase already treats addresses case-insensitively.
function normalizeEmail(email) {
  return (email === null || email === undefined ? '' : String(email)).trim();
}

// Cheap client-side shape check (one "@", a dot in the domain, no spaces).
// Intentionally permissive — Reacher and Firebase do the strict work; this
// only stops obvious garbage before a network call. Mirrors looksLikeEmail()
// in functions/email-check.js.
function looksLikeEmail(email) {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (/\s/.test(email)) return false;
  const at = email.lastIndexOf('@');
  if (at < 1 || at !== email.indexOf('@') || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  return domain.indexOf('.') > 0 && !domain.endsWith('.') && !domain.includes('..');
}

// Errors THIS file throws on purpose: plain Error with a `lw/...` code and
// a message that is already safe to show the learner as-is.
function lwError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const INVALID_EMAIL_MESSAGE = "That doesn't look like a valid email address. Please check it and try again.";
const CANT_RECEIVE_MESSAGE = 'This email address does not appear to be able to receive email. Please check the address and try again.';
const GENERIC_AUTH_MESSAGE = 'Something went wrong. Please try again.';

/* Turns ANY error from this file / Firebase into a learner-safe sentence
 * (index.html's modal and verify-email.html both use it). Our own errors
 * pass through untouched; Firebase's raw "Firebase: Error (auth/...)."
 * text is never shown. Pass context 'session' when the error came from
 * reload()/getIdToken() on an already-signed-in user, where
 * "user-not-found" means "this account is gone", not "wrong email". */
function describeAuthError(err, context) {
  if (!err) return GENERIC_AUTH_MESSAGE;
  if (err.name !== 'FirebaseError') return err.message || GENERIC_AUTH_MESSAGE;

  const code = err.code || '';
  if (context === 'session' &&
      ['auth/user-not-found', 'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled'].includes(code)) {
    return 'Your session has expired. Please log out and sign in again.';
  }
  switch (code) {
    case 'auth/invalid-email':
      return INVALID_EMAIL_MESSAGE;
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead. If you never verified it, logging in will take you to a page where you can get a new verification email.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      // Firebase's email-enumeration protection returns this for BOTH a
      // wrong password and a non-existent account, so the two can't be
      // told apart here — one honest message covers both.
      return 'Incorrect email or password. If you don\'t have an account yet, sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/user-not-found':
      return 'No account found with that email. Check the address or sign up first.';
    case 'auth/missing-email':
    case 'auth/missing-password':
      return 'Please enter your email and password.';
    case 'auth/weak-password':
      return 'That password is too weak. Please choose a longer one.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/requires-recent-login':
      return 'For security, please log in again and retry.';
    default:
      console.error('[auth] Unhandled Firebase error:', code, err);
      return GENERIC_AUTH_MESSAGE;
  }
}

/* ── SIGNUP PRE-CHECK (Reacher, via Cloud Function) ──────────────
 * Asks the `checkEmailDeliverability` Cloud Function (functions/index.js)
 * whether the address looks usable BEFORE any Firebase account exists.
 * The browser never talks to Reacher and never holds its secret.
 *
 *  - Function says ok:false -> throws lw/email-rejected (message tells
 *    the learner what to fix). No account gets created.
 *  - Function says ok:true (including risky/unknown) -> returns.
 *  - Function unreachable / slow / errors -> returns (FAILS OPEN): an
 *    account with an unverified email gets zero access anyway, so an
 *    infrastructure hiccup must not lock real learners out of signing up.
 *  - Rate limited (functions/resource-exhausted) -> throws; that one is
 *    NOT failed open or the limiter would be pointless.
 * Reacher "safe" != verified. Only Firebase's emailVerified proves that. */
const EMAIL_REJECT_MESSAGES = {
  'invalid-syntax': INVALID_EMAIL_MESSAGE,
  'no-mail-server': CANT_RECEIVE_MESSAGE,
  'undeliverable': CANT_RECEIVE_MESSAGE,
  'disposable': "Temporary or disposable email addresses can't be used. Please use your regular email address.",
};

async function precheckEmail(normalizedEmail) {
  let data = null;
  try {
    const checkEmailDeliverability = httpsCallable(functions, 'checkEmailDeliverability', { timeout: 20000 });
    const response = await checkEmailDeliverability({ email: normalizedEmail });
    data = response && response.data;
  } catch (callErr) {
    if (callErr && callErr.code === 'functions/resource-exhausted') {
      throw lwError('lw/too-many-checks', 'Too many attempts. Please wait a minute and try again.');
    }
    console.warn('[auth] Email pre-check unavailable, continuing without it:', callErr);
    return;
  }
  if (data && data.ok === false) {
    throw lwError('lw/email-rejected', EMAIL_REJECT_MESSAGES[data.reason] || CANT_RECEIVE_MESSAGE);
  }
}

/* ── VERIFICATION EMAIL: send / cooldown / re-check ──────────────── */
function resendKey(uid) { return RESEND_KEY_PREFIX + uid; }

/* Seconds left before another verification email may be requested
 * (0 = allowed now). The `<= RESEND_COOLDOWN_SECONDS` clamp means a
 * corrupted or hand-edited future timestamp can never lock the button
 * for longer than one cooldown period. */
function getResendCooldownRemaining(firebaseUser) {
  const user = firebaseUser || auth.currentUser;
  if (!user) return 0;
  try {
    const lastSent = Number(localStorage.getItem(resendKey(user.uid)) || 0);
    if (!lastSent) return 0;
    const remaining = Math.ceil((lastSent + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    return remaining > 0 && remaining <= RESEND_COOLDOWN_SECONDS ? remaining : 0;
  } catch (e) {
    return 0;
  }
}

function markVerificationSent(firebaseUser) {
  try { localStorage.setItem(resendKey(firebaseUser.uid), String(Date.now())); } catch (e) { /* storage blocked — Firebase's own limit still applies */ }
}

const CONTINUE_URL_ERRORS = ['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'];
let verificationSendInFlight = false;

/* Sends Firebase's built-in verification email to the signed-in user
 * (no custom token system). Used by register() for the first send and by
 * verify-email.html's Resend button.
 *
 * The link's "Continue" button is pointed back at verify-email.html so the
 * learner lands where the auto-check runs. If that URL's domain isn't in
 * Firebase Console → Authentication → Settings → Authorized domains (or the
 * page is opened from file://), Firebase rejects the continue URL — we then
 * retry once WITHOUT it rather than failing to send at all.
 *
 * Throws lw/already-verified, lw/resend-cooldown (err.remaining = seconds),
 * or the Firebase error. Returns true when an email was actually sent,
 * false when a send was already in flight (double-click guard). */
async function sendVerificationEmail(firebaseUser) {
  const user = firebaseUser || auth.currentUser;
  if (!user) throw lwError('lw/not-signed-in', 'You need to be signed in to do that.');
  if (user.emailVerified) throw lwError('lw/already-verified', 'Your email is already verified.');

  const remaining = getResendCooldownRemaining(user);
  if (remaining > 0) {
    const err = lwError('lw/resend-cooldown', 'Please wait ' + remaining + ' second' + (remaining === 1 ? '' : 's') + ' before requesting another email.');
    err.remaining = remaining;
    throw err;
  }
  if (verificationSendInFlight) return false;

  verificationSendInFlight = true;
  try {
    try {
      await sendEmailVerification(user, { url: VERIFY_PAGE_URL, handleCodeInApp: false });
    } catch (err) {
      if (err && CONTINUE_URL_ERRORS.includes(err.code)) {
        await sendEmailVerification(user);
      } else {
        throw err;
      }
    }
    markVerificationSent(user);
    return true;
  } catch (err) {
    // Firebase is already throttling us — start our own countdown too so
    // the UI stops offering an immediate retry.
    if (err && err.code === 'auth/too-many-requests') markVerificationSent(user);
    throw err;
  } finally {
    verificationSendInFlight = false;
  }
}

/* "I already verified" — the ONLY place a session flips to verified.
 * Asks Firebase itself: reload() re-fetches the user record from the
 * server (emailVerified is cached on the device and does NOT update by
 * itself after the link is clicked, possibly in another tab/device), then
 * checks it. localStorage is never consulted.
 *
 * When verified it also force-refreshes the ID token (so the
 * `email_verified` claim that Firestore rules / Cloud Functions read is
 * current) and writes the normal session cache, exactly like a fresh
 * login. onAuthStateChanged does NOT fire after reload(), which is why
 * this has to build the session itself.
 * Returns { verified:false } or { verified:true, user }. Throws on
 * network/session errors (use describeAuthError(err, 'session')). */
async function checkVerificationNow() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw lwError('lw/not-signed-in', 'You need to be signed in to do that.');

  await firebaseUser.reload();
  if (!firebaseUser.emailVerified) return { verified: false };

  await firebaseUser.getIdToken(true);
  const user = await finishVerifiedLogin(firebaseUser);
  return { verified: true, user };
}

/* Shared tail of "this person is now a real, verified learner": read the
 * Firestore profile, cancel a pending soft-delete (see deleteAccount()),
 * write the session cache. Extracted from login() so login and
 * checkVerificationNow() can't drift apart. Only ever called with a
 * user whose emailVerified is true. */
async function finishVerifiedLogin(firebaseUser) {
  // Fetch the real profile from Firestore instead of guessing
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const profile = snapshot.exists() ? snapshot.data() : {};

  // Cancel a pending deletion on successful login — see deleteAccount()'s
  // header comment for the full grace-period design.
  if (profile.deletionRequested) {
    await updateDoc(userRef, { deletionRequested: false, deletionRequestedAt: null });
    profile.deletionRequested = false;
    profile.deletionRequestedAt = null;
  }

  const user = {
    uid: firebaseUser.uid,
    name: profile.name || (firebaseUser.email || '').split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: profile.level || 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
}

/* ── LOG IN ───────────────────────────────────────────────────────
 * Signs in with Firebase Auth, then branches on Firebase's OWN
 * emailVerified flag (never localStorage):
 *
 *   verified   -> reads the matching Firestore profile (falling back to
 *                 sensible defaults if the document doesn't exist yet) so
 *                 the cached session always has a name/level/joined date,
 *                 and returns { verified: true, user }.
 *   unverified -> the user STAYS signed in (verify-email.html needs a
 *                 real Firebase user to resend the link and reload()),
 *                 but gets NO session cache and NO access. Returns
 *                 { verified: false, user: null } — the caller sends
 *                 them to pages/verify-email.html. Covers accounts that
 *                 existed before verification was enforced: nothing is
 *                 deleted, they just verify on their next login.
 *
 * (CHANGED 2026-09-29: used to sign unverified users straight back out
 * and throw, and returned the bare user object.)
 *
 * The verified path also doubles as the "undo" for deleteAccount()'s
 * grace-period soft delete below: see finishVerifiedLogin().
 * ──────────────────────────────────────────────────────────────── */
async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw lwError('lw/missing-credentials', 'Please enter your email and password.');
  }

  const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const firebaseUser = result.user;

  if (!firebaseUser.emailVerified) {
    localStorage.removeItem(LW_SESSION_KEY); // never leave a session for an unverified account
    return { verified: false, user: null };
  }

  const user = await finishVerifiedLogin(firebaseUser);
  return { verified: true, user };
}

/* ── REGISTER ─────────────────────────────────────────────────────
 * ORDER MATTERS (2026-09-29):
 *   1. normalize + validate name/email/password locally
 *   2. Reacher pre-check (precheckEmail) — a rejected address never
 *      becomes a Firebase account
 *   3. createUserWithEmailAndPassword (with the SAME normalized email)
 *   4. Firestore profile write `users/{uid}` (rolled back on failure)
 *   5. sendVerificationEmail
 * The new user is then AUTHENTICATED BUT UNVERIFIED: still signed in
 * (so verify-email.html can resend/reload) but with no session cache and
 * no learner access until Firebase reports emailVerified === true.
 *
 * Returns { verificationSent, email }. verificationSent === false means
 * the account WAS created but Firebase couldn't send the email (e.g. its
 * per-hour send limit) — the caller must say so and route to
 * verify-email.html, whose Resend button covers it; it must not act as if
 * everything went normally.
 *
 * `level` has no signup-time picker in index.html, so every new account
 * is written with a fixed 'basic' value — kept as a real field (rather
 * than dropped) so anything downstream that reads `user.level` never
 * sees `undefined`.
 *
 * Rejects an over-length `name` (> MAX_NAME_LENGTH) or `email`
 * (> MAX_EMAIL_LENGTH) before touching Firebase at all. index.html's
 * `maxlength` attributes on the signup fields only block *typing* past
 * the limit — they do nothing about a value set any other way — so
 * this is the real backstop that keeps either one out of Firebase/
 * Firestore in the first place. updateUsername()/updateUserEmail()
 * below apply the matching checks for changes made after signup.
 * ──────────────────────────────────────────────────────────────── */
async function register(name, email, password) {
  const trimmedName = (name || '').trim();
  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error('Name must be ' + MAX_NAME_LENGTH + ' characters or fewer.');
  }
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw lwError('lw/invalid-email', 'Enter your email address.');
  }
  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    throw new Error('Email must be ' + MAX_EMAIL_LENGTH + ' characters or fewer.');
  }
  if (!looksLikeEmail(normalizedEmail)) {
    throw lwError('lw/invalid-email', INVALID_EMAIL_MESSAGE);
  }
  if (!password) {
    throw lwError('lw/missing-password', 'Please choose a password.');
  }

  // Reacher pre-check FIRST — see precheckEmail() for what it rejects and
  // why it fails open. (Replaces the earlier never-deployed
  // `checkEmailDomain` DNS-only call.)
  await precheckEmail(normalizedEmail);

  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const firebaseUser = result.user;

  const user = {
    uid: firebaseUser.uid,
    name: trimmedName || (firebaseUser.email || '').split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  const userRef = doc(db, 'users', firebaseUser.uid);

  try {
    await setDoc(userRef, user);
  } catch (firestoreError) {
    // Firestore write failed — roll back the orphaned Auth account
    // rather than leaving a bodyless account behind.
    try {
      await firebaseUser.delete();
    } catch (deleteError) {
      console.error('Failed to roll back orphaned auth account:', deleteError);
    }
    throw firestoreError; // still let the caller show the real error
  }

  // Firebase's built-in verification email (no custom token system).
  // NOT fatal if it fails: the account exists, the caller is told via
  // verificationSent:false, and verify-email.html's Resend button retries.
  let verificationSent = true;
  try {
    await sendVerificationEmail(firebaseUser);
  } catch (sendError) {
    verificationSent = false;
    console.error('Failed to send verification email:', sendError);
  }

  // Intentionally NOT signed out and NOT cached — see header comment.
  return { verificationSent, email: normalizedEmail };
}

/* ── GOOGLE SIGN-IN ───────────────────────────────────────────────
 * Handles both first-time sign-up AND returning login through the
 * same call — signInWithPopup() creates the Firebase Auth user
 * automatically the first time this Google account signs in, so
 * there's no separate "register with Google" path.
 *
 * Because of that, this manually upserts the Firestore `users/{uid}`
 * doc the same way register() does — but only fills it in the FIRST
 * time (snapshot.exists() check), so a returning user's saved
 * name/level are never clobbered by whatever their Google profile
 * says today. Same deletionRequested-clearing behavior as login().
 * ──────────────────────────────────────────────────────────────── */
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (error) {
    if (error && error.code === 'auth/account-exists-with-different-credential') {
      // This email already has a password-based account. Stash the
      // Google credential so linkPendingGoogleCredential() can attach
      // it once the user proves ownership by logging in with their
      // original password — see that function below.
      pendingGoogleCredential = GoogleAuthProvider.credentialFromError(error);
    }
    throw error; // still let the caller show/handle the error
  }

  const firebaseUser = result.user;
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  let profile;
  if (snapshot.exists()) {
    profile = snapshot.data();
    if (profile.deletionRequested) {
      await updateDoc(userRef, { deletionRequested: false, deletionRequestedAt: null });
      profile.deletionRequested = false;
      profile.deletionRequestedAt = null;
    }
  } else {
    const rawName = (firebaseUser.displayName || '').trim().slice(0, MAX_NAME_LENGTH);
    profile = {
      uid: firebaseUser.uid,
      name: rawName || firebaseUser.email.split('@')[0] || 'Learner',
      email: firebaseUser.email,
      level: 'basic',
      joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
    };
    await setDoc(userRef, profile);
  }

  const user = {
    uid: firebaseUser.uid,
    name: profile.name || firebaseUser.email.split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: profile.level || 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  // 2026-09-29: Google normally reports the address as verified (Firebase
  // then sets emailVerified = true, so this gate is a no-op for almost
  // everyone). If a Google account ever comes back UNverified, treat it
  // exactly like an unverified password account: no session cache, and
  // the caller routes to verify-email.html via getAuthState().
  if (firebaseUser.emailVerified) {
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LW_SESSION_KEY);
  }
  return user;
}

/* Links a Google credential that was stashed by loginWithGoogle()
 * after an account-exists-with-different-credential error. Call this
 * right after a successful password login() — if there's nothing
 * pending, it's a silent no-op, so it's always safe to call. Once
 * linked, Google sign-in works for this account from then on. */
async function linkPendingGoogleCredential() {
  if (!pendingGoogleCredential || !auth.currentUser) return;
  const credential = pendingGoogleCredential;
  pendingGoogleCredential = null;
  await linkWithCredential(auth.currentUser, credential);
}

/* ── LOG OUT ──────────────────────────────────────────────────────
 * Signs out of Firebase Auth, then clears both local caches (session
 * + progress store) so a shared/public computer doesn't leave the
 * next person able to see this learner's progress.
 * ──────────────────────────────────────────────────────────────── */
async function logout(redirectPath) {
  await signOut(auth);
  localStorage.removeItem(window.LWProgress?.STORE_KEY);
  localStorage.removeItem(LW_SESSION_KEY);
  window.location.href = redirectPath || '/index.html';
}

/* ── FORGOT PASSWORD (logged out) ────────────────────────────────
 * Called from index.html's "Forgot password?" link — no signed-in
 * user required, since the whole point is recovering an account you
 * can't currently log into. Firebase emails newEmail a reset link
 * directly; nothing here needs the current password.
 *
 * Deliberately does NOT reveal whether the address has an account.
 * With this project's email-enumeration protection on (the default
 * for new Firebase projects), sendPasswordResetEmail() already
 * resolves the same way whether or not the address exists; this
 * still swallows auth/user-not-found defensively in case that
 * protection is ever turned off, so index.html can safely always
 * show one generic "check your inbox" message either way. Real
 * problems (bad email format, rate limiting) still surface normally.
 * ──────────────────────────────────────────────────────────────── */
async function sendPasswordReset(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) throw new Error('Enter your email address.');
  try {
    await sendPasswordResetEmail(auth, trimmed);
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') return; // don't leak account existence
    throw err;
  }
}

/* ── PROFILE MANAGEMENT (NEW) ────────────────────────────────────
 * Backs the Edit Profile modal on pages/settings.html. Each function
 * below is deliberately narrow — it only ever touches the *signed-in*
 * user's own doc/account, and only ever writes the specific field(s)
 * named here — same spirit as the SECURITY note at the bottom of this
 * file about not handing the console a general-purpose Firestore
 * write. Firestore Security Rules should still independently enforce
 * that `users/{uid}` is only writable by that uid; this is defense in
 * depth, not a substitute for rules.
 *
 * reauthenticate() is required before both updateUserEmail() and
 * deleteAccount() — Firebase rejects those "sensitive" operations
 * with auth/requires-recent-login if the session isn't fresh, and
 * asking for the password again here also stops someone from walking
 * up to an unlocked, already-logged-in tab and hijacking or deleting
 * the account without knowing the password at all.
 * ──────────────────────────────────────────────────────────────── */
async function reauthenticate(currentPassword) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseUser, credential);
  return firebaseUser;
}

/* Renames the learner. This app doesn't use Firebase Auth's own
 * displayName anywhere (login/register never set it — `name` has only
 * ever lived in Firestore), so this only touches the Firestore doc.
 * It also patches the localStorage session cache directly: the
 * onAuthStateChanged listener above skips re-fetching Firestore
 * whenever the cached uid already matches the signed-in user, so
 * without this the new name would never appear until that cache was
 * cleared (e.g. next full logout/login). Same MAX_NAME_LENGTH guard as
 * register() — see that function's header comment for why the
 * client-side maxlength attribute alone doesn't cover this. */
async function updateUsername(newName) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const trimmed = (newName || '').trim();
  if (!trimmed) throw new Error('Enter a name first.');
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error('Name must be ' + MAX_NAME_LENGTH + ' characters or fewer.');
  }

  await updateDoc(doc(db, 'users', firebaseUser.uid), { name: trimmed });

  const cached = getCurrentUser();
  if (cached && cached.uid === firebaseUser.uid) {
    cached.name = trimmed;
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(cached));
  }
}

/* Changes the learner's login email. Uses verifyBeforeUpdateEmail
 * rather than a bare updateEmail() — Firebase sends a confirmation
 * link to the NEW address, and the login email only actually changes
 * once that link is clicked. Deliberately does not touch the cached
 * session or Firestore `email` field here, since nothing has changed
 * yet from Firebase's point of view; it'll pick up the new address
 * itself the next time this learner signs in after confirming. */
async function updateUserEmail(newEmail, currentPassword) {
  const trimmed = (newEmail || '').trim();
  if (!trimmed) throw new Error('Enter a new email address.');
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    throw new Error('Email must be ' + MAX_EMAIL_LENGTH + ' characters or fewer.');
  }
  const firebaseUser = await reauthenticate(currentPassword);
  await verifyBeforeUpdateEmail(firebaseUser, trimmed);
}

/* Changes the learner's password while logged in (different from
 * sendPasswordReset() above, which is for someone who's locked out).
 * Reauthenticates with the CURRENT password first — same
 * requires-recent-login reasoning as updateUserEmail()/deleteAccount()
 * — then hands the new one to Firebase. Firebase itself enforces a
 * 6-character minimum and throws auth/weak-password below that; the
 * length check here just gives a faster, friendlier message before
 * making the round-trip. */
async function changePassword(currentPassword, newPassword) {
  const trimmed = newPassword || '';
  if (trimmed.length < 8) throw new Error('Use at least 8 characters.');
  const firebaseUser = await reauthenticate(currentPassword);
  await updatePassword(firebaseUser, trimmed);
}

/* GRACE-PERIOD SOFT DELETE — not an instant hard delete. Reauthenticates,
 * then just flags `users/{uid}` with `deletionRequested: true` +
 * `deletionRequestedAt` and signs the learner out. Nothing is deleted
 * here: not the profile doc, not `userProgressV2/{uid}`, not the
 * Firebase Auth user. Logging back in during the grace period (see
 * login() above) clears the flag automatically — coming back IS the
 * undo, same pattern Discord/Google use for their own account
 * deletions — rather than a separate "restore my account" flow.
 *
 * IMPORTANT — LIMITATION (stated plainly, not a silent gap): actually
 * purging accounts once DELETION_GRACE_PERIOD_DAYS has passed needs a
 * server-side scheduled job (e.g. a Cloud Function that checks
 * `deletionRequestedAt` on a schedule and deletes anything past the
 * window, including `userProgressV2/{uid}` and the Auth user). That
 * job does not exist in this repo — building one requires knowing this
 * project's Firebase setup (Blaze plan, existing functions, etc.) and
 * isn't something to add blind. Until it's built and deployed, a
 * "deleted" account is inert (signed out, and should be treated as
 * gone by anything that checks `deletionRequested`) but its data is
 * not physically gone yet. */
async function deleteAccount(currentPassword) {
  const firebaseUser = await reauthenticate(currentPassword);
  const uid = firebaseUser.uid;

  await updateDoc(doc(db, 'users', uid), {
    deletionRequested: true,
    deletionRequestedAt: new Date().toISOString(),
  });

  await signOut(auth);
  localStorage.removeItem(window.LWProgress?.STORE_KEY);
  localStorage.removeItem(LW_SESSION_KEY);
}

/* ── ROUTE GUARDS ─────────────────────────────────────────────────
 * requireAuth() — three-way routing (2026-09-29):
 *     logged out             -> loginPath  (default index.html)
 *     logged in + unverified -> verifyPath (default pages/verify-email.html)
 *     logged in + verified   -> stay
 * Pages may still call it explicitly (settings, edit-profile, ... do),
 * and it is ALSO run automatically for every non-public page — see
 * AUTO-GUARD at the bottom of this file.
 *
 * redirectIfLoggedIn() — for index.html: a verified user skips straight
 * past the login form, an UNVERIFIED signed-in user is sent to
 * verify-email.html. Logged out: does nothing.
 *
 * NO REDIRECT LOOPS: each state has exactly one home, and that home
 * never redirects that state anywhere else —
 *     logged out -> index.html         (redirectIfLoggedIn: no-op)
 *     unverified -> verify-email.html  (its own script: stays put)
 *     verified   -> app pages          (requireAuth: no-op)
 * All redirects use location.replace() so Back can't re-trigger one, and
 * redirectOnce() makes sure two guards on the same page can't fight.
 * ──────────────────────────────────────────────────────────────── */
let redirecting = false;
function redirectOnce(url) {
  if (redirecting) return;
  redirecting = true;
  window.location.replace(url);
}

function enforceAccess(loginPath, verifyPath) {
  const state = getAuthState();
  if (state === 'logged-out') redirectOnce(loginPath || LOGIN_PAGE_URL);
  else if (state === 'unverified') redirectOnce(verifyPath || VERIFY_PAGE_URL);
}

function requireAuth(loginPath, verifyPath) {
  if (authReady) {
    enforceAccess(loginPath, verifyPath);
    return;
  }
  window.addEventListener('lwauth-ready', () => {
    enforceAccess(loginPath, verifyPath);
  }, { once: true });
}

function redirectIfLoggedIn(dashboardPath, verifyPath) {
  const state = getAuthState();
  if (state === 'verified') {
    // Every actual caller already passes an explicit path (index.html
    // passes 'pages/dashboard.html'); this fallback just mirrors that
    // same default in case a future caller omits the argument.
    redirectOnce(dashboardPath || 'pages/dashboard.html');
  } else if (state === 'unverified') {
    redirectOnce(verifyPath || VERIFY_PAGE_URL);
  }
}

/* Resolves once Firebase has restored (or found no) session. It does NOT
 * say the user is verified — check getAuthState() afterwards if it
 * matters. Callers that only read getCurrentUser() are already safe:
 * that returns null for unverified users. */
function whenAuthReady() {
  return new Promise((resolve) => {
    if (authReady) {
      resolve();
    } else {
      window.addEventListener('lwauth-ready', () => resolve(), { once: true });
    }
  });
}

/* ── PROGRESS CLOUD BRIDGE (fix: progress not reaching Firestore) ──
 * The audit pass removed doc/db/getDoc/setDoc from window.LWAuth, but
 * js/engine/progress.js, js/missions.js and js/game.js still called them,
 * so every sync threw a (caught) TypeError and nothing ever reached
 * Firestore. Instead of re-exporting the raw SDK, expose two FIXED-PURPOSE
 * helpers: they only touch a whitelisted collection, only the signed-in
 * user's OWN document (uid comes from Firebase Auth, never from the caller),
 * and only after Firebase Auth has restored the session. firestore.rules
 * enforces the same thing server-side. */
const PROGRESS_COLLECTIONS = ['userProgress', 'userProgressV2', 'userGame'];

async function progressRef(name) {
  if (PROGRESS_COLLECTIONS.indexOf(name) === -1) throw new Error('progress collection not allowed: ' + name);
  await whenAuthReady();
  const u = auth.currentUser;               // request.auth on the server
  if (!u || !u.emailVerified) return null;
  return doc(db, name, u.uid);
}

/* → { exists: boolean, data: object|null } , or null when signed out */
async function readProgressDoc(name) {
  const ref = await progressRef(name);
  if (!ref) return null;
  const snap = await getDoc(ref);
  return { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
}

/* → true when written, false when signed out. opts.merge = setDoc merge. */
async function writeProgressDoc(name, data, opts) {
  const ref = await progressRef(name);
  if (!ref) return false;
  await setDoc(ref, data, opts && opts.merge ? { merge: true } : {});
  return true;
}

/* ── EXPORTS ──────────────────────────────────────────────────────
 * Exposed as window.LWAuth so plain <script> tags (no bundler) can
 * use it from any page.
 * ──────────────────────────────────────────────────────────────── */
window.LWAuth = {
  LW_SESSION_KEY,
  DELETION_GRACE_PERIOD_DAYS,
  RESEND_COOLDOWN_SECONDS,
  getCurrentUser,
  isLoggedIn,
  getAuthState,
  getVerificationInfo,
  login,
  register,
  sendVerificationEmail,       // replaces resendVerificationEmail(email, password)
  checkVerificationNow,
  getResendCooldownRemaining,
  describeAuthError,
  loginWithGoogle, 
  linkPendingGoogleCredential,
  logout,
  sendPasswordReset,
  updateUsername,
  updateUserEmail,
  changePassword,
  deleteAccount,
  requireAuth,
  redirectIfLoggedIn,
  whenAuthReady,
  readProgressDoc,
  writeProgressDoc,
};
/* ── AUTO-GUARD (2026-09-29) ──────────────────────────────────────
 * "No verified email, no normal LinguaWave access" has to hold for EVERY
 * page, not just the ones that remembered to call requireAuth() —
 * dashboard, learn, lesson, progress, mastery-quiz and mission-overview
 * never did, which would have let an unverified (or signed-out) visitor
 * simply walk in. Every page loads this file, so the guard runs from
 * here, once, after auth is ready.
 *
 * Exempt: index.html (the login page — it has its own redirectIfLoggedIn),
 * verify-email.html (it routes itself), and admin-*.html (own guards in
 * js/admin-auth.js / js/role-guard.js; admin-login.html must stay public).
 * Only the file name is matched, so it works under any hosting sub-path
 * and with or without the .html extension. */
(function autoGuardProtectedPages() {
  const page = (window.location.pathname.split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '');
  if (page === '' || page === 'index' || page === 'verify-email' || page.indexOf('admin-') === 0) return;
  requireAuth();
})();

// SECURITY (audit pass): `doc`, `db`, `getDoc`, `setDoc` used to be
// re-exported here, which meant anyone with the browser console could
// run LWAuth.setDoc(LWAuth.doc(LWAuth.db, 'users', uid), {level:'admin', ...})
// and write directly to their own Firestore profile — no app code
// involved at all. Nothing else in the codebase referenced these
// (checked before removing), so this only removes capability that
// wasn't being used. The real protection against that kind of write
// has to be Firestore Security Rules (see firestore.rules) — removing
// this export narrows the attack surface but does not replace rules.
//
// updateUsername/updateUserEmail/changePassword/deleteAccount above
// are exported deliberately, unlike doc/setDoc: each is a fixed,
// narrow operation on the caller's OWN uid rather than a
// general-purpose read/write — there's no path from having these on
// window.LWAuth to writing another user's doc or an arbitrary field.
// Firestore Security Rules should still independently restrict
// users/{uid} writes to that uid. sendPasswordReset() needs no such
// guard — it takes only an email and never touches Firestore or any
// signed-in session.

// ES-MODULE EXPORTS for js/admin-firebase.js (admin panel).
// This file is the ONLY place the Firebase config, initializeApp() and
// SDK imports live; the admin panel imports app/auth/db and the Firestore
// helpers from here instead of repeating them. These are module exports,
// NOT properties of window.LWAuth, so the console-hijack risk described in
// the SECURITY note above (LWAuth.setDoc / LWAuth.db) does not come back.
// Real protection is still firestore.rules.
// `setDoc` is exported for js/feedback.js ONLY (learner feedback -> surveys/{id}).
// Still a module export, not a window.LWAuth property, so the console-write
// concern above is unchanged; firestore.rules restricts surveys to create-only
// with a validated shape and the caller's own uid.
export { app, auth, db, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy };
