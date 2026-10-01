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
 * SIGNUP  : normalize email -> validate email FORMAT -> validate PROVIDER
 *   domain (SUPPORTED_EMAIL_DOMAINS) -> validate password (5-rule policy
 *   + common/personal-password block, see PASSWORD POLICY + STRENGTH
 *   below) -> validate confirm password -> Reacher pre-check (via the
 *   `checkEmailDeliverability` Cloud Function, see functions/index.js;
 *   the Reacher secret only ever exists server-side) -> Firebase
 *   createUserWithEmailAndPassword (this IS the "account already exists?"
 *   check: it throws auth/email-already-in-use before anything is sent)
 *   -> Firestore profile -> sendEmailVerification -> stay signed in, go
 *   to verify-email.html. A verification email is sent ONLY after every
 *   earlier step has passed. If any step rejects, NO Firebase account is
 *   created (except the last two, which only run after creation).
 *   Reacher is a pre-filter only: "safe" does NOT prove mailbox
 *   ownership — the Firebase link does.
 *   Keep these three facts separate (see SIGNUP VALIDATION below):
 *     1. valid FORMAT        2. SUPPORTED PROVIDER        3. VERIFIED
 *   1 and 2 say nothing about whether the mailbox exists or belongs to
 *   this person. Only 3 (Firebase's emailVerified, set by the emailed
 *   link) proves that.
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

/* ── SIGNUP VALIDATION (2026-10-01) ───────────────────────────────
 * ONE implementation, used twice: register() below enforces it (the
 * authentication layer — a hand-edited page can't skip it), and index.html
 * calls the same functions through window.LWAuth for inline feedback, so
 * the UI and the real check can never disagree.
 *
 * SUPPORTED_EMAIL_DOMAINS is the single provider list. To accept another
 * legitimate provider, add its domain here (lowercase) — nothing else in
 * this file or in index.html needs to change. functions/email-check.js
 * (the Cloud Function) should be given the same list; it is a separate
 * deployment and can't import this file.
 *
 * Domains are matched EXACTLY after lowercasing — never with
 * includes()/endsWith()/startsWith() — so "gmail.com.evil.io",
 * "notgmail.com" and "gmail.co" are all rejected. */
const SUPPORTED_EMAIL_DOMAINS = Object.freeze([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);
const SUPPORTED_EMAIL_DOMAIN_SET = new Set(SUPPORTED_EMAIL_DOMAINS);

const MAX_LOCAL_PART_LENGTH = 64;   // RFC 5321 local-part limit
const MIN_PASSWORD_LENGTH = 8;      // same minimum changePassword() uses
const MAX_PASSWORD_LENGTH = 50;     // = "Maximum password length" in Firebase console > Authentication > Settings > Password policy
const VERY_STRONG_MIN_LENGTH = 12;  // "Very strong" also needs at least this many characters (display only — signup still accepts Strong)

const LOCAL_PART_CHARS_RE = /^[A-Za-z0-9._%+-]+$/;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,}$/;

const UNSUPPORTED_PROVIDER_MESSAGE =
  'Please use an email address from a supported provider (' +
  SUPPORTED_EMAIL_DOMAINS.map(function (d) { return '@' + d; }).join(', ') + ').';

/* Checks an email in two separate steps and reports each one:
 *   formatValid       -> well-formed username@domain.tld
 *   providerSupported -> the domain (lowercased) is in SUPPORTED_EMAIL_DOMAINS
 *   valid             -> both. Still does NOT mean the mailbox exists.
 * reason: null | 'empty' | 'format' | 'provider'. Never throws. */
function validateEmail(email) {
  const normalized = normalizeEmail(email);
  const result = {
    normalized: normalized,
    domain: '',
    formatValid: false,
    providerSupported: false,
    valid: false,
    reason: null,
  };

  if (!normalized) { result.reason = 'empty'; return result; }
  if (normalized.length > MAX_EMAIL_LENGTH || /\s/.test(normalized)) { result.reason = 'format'; return result; }

  const parts = normalized.split('@');            // "user@@x.com" -> 3 parts
  if (parts.length !== 2) { result.reason = 'format'; return result; }

  const local = parts[0];
  const domain = parts[1].toLowerCase();          // case-insensitive domain compare

  const localOk = local.length > 0 &&
    local.length <= MAX_LOCAL_PART_LENGTH &&
    LOCAL_PART_CHARS_RE.test(local) &&
    local.charAt(0) !== '.' &&
    local.charAt(local.length - 1) !== '.' &&
    local.indexOf('..') === -1;

  const labels = domain.split('.');               // "gmail..com" -> an empty label
  const domainOk = labels.length >= 2 &&
    labels.every(function (label) { return DOMAIN_LABEL_RE.test(label); }) &&
    TLD_RE.test(labels[labels.length - 1]);

  if (!localOk || !domainOk) { result.reason = 'format'; return result; }

  result.formatValid = true;
  result.domain = domain;

  if (!SUPPORTED_EMAIL_DOMAIN_SET.has(domain)) { result.reason = 'provider'; return result; }

  result.providerSupported = true;
  result.valid = true;
  return result;
}

/* ── PASSWORD POLICY + STRENGTH (2026-10-01) ─────────────────────
 * ONE implementation, three users: register() and changePassword() below
 * enforce it, and index.html's strength bar / requirement checklist read
 * the very same functions through window.LWAuth — so the meter, the
 * checklist, the inline message and the real signup check cannot disagree.
 *
 * THE 5 REQUIREMENTS (PASSWORD_REQUIREMENTS, one point each):
 *   length >= MIN_PASSWORD_LENGTH, lowercase, uppercase, number, and a
 *   special character from PASSWORD_SPECIAL_CHARS.
 *
 * LEVELS (getPasswordStrength().level) come from a 0-100 PERCENT, not from
 *   which boxes are ticked — see STRENGTH SCORE below (length, character
 *   variety, uniqueness, minus patterns). Weak <40, Medium 40-69, Strong
 *   70-89, Very strong 90+. Common / email-based / too-long passwords are
 *   ALWAYS Weak, and Strong+ is only reachable once the signup requirements
 *   are met, so a green bar never sits next to a rejection.
 *
 * WHAT SIGNUP ACCEPTS (PASSWORD_MIN_LEVEL): 'strong'. This mirrors the
 * Firebase console policy (uppercase + lowercase + numeric + special,
 * 8-50 chars). To accept Medium you must change BOTH this constant to
 * 'medium' AND untick "Require special character" in the console —
 * otherwise Firebase would reject (Require mode) or silently accept
 * (Notify mode) what this file just let through.
 *
 * SECURITY: this is a UX + first-line check. The real server-side
 * boundary is the Firebase password policy, and it only blocks signups
 * when its Enforcement mode is "Require enforcement" (Notify lets weak
 * passwords through). Passwords are never trimmed, altered, logged,
 * stored, or placed in an error message here. */
// Firebase's own "non-alphanumeric" list (what its Require-special-character policy accepts).
// Keep in sync with the console; the meter itself rewards ANY non-letter/non-digit (see scoring).
const PASSWORD_SPECIAL_CHARS = '^$*.[]{}()?"!@#%&/\\,><\':;|_~`=+-';
const PASSWORD_SPECIAL_EXAMPLES = '!@#$%&';   // short hint shown in labels/messages
const PASSWORD_MIN_LEVEL = 'strong';          // 'strong' | 'medium' — see the note above before changing

const PASSWORD_REQUIREMENTS = Object.freeze([
  Object.freeze({
    key: 'length',
    label: 'At least ' + MIN_PASSWORD_LENGTH + ' characters',
    need: 'at least ' + MIN_PASSWORD_LENGTH + ' characters',
    test: function (p) { return p.length >= MIN_PASSWORD_LENGTH; },
  }),
  Object.freeze({
    key: 'lower',
    label: 'Contains lowercase',
    need: 'one lowercase letter',
    test: function (p) { return /[a-z]/.test(p); },
  }),
  Object.freeze({
    key: 'upper',
    label: 'Contains uppercase',
    need: 'one uppercase letter',
    test: function (p) { return /[A-Z]/.test(p); },
  }),
  Object.freeze({
    key: 'number',
    label: 'Contains number',
    need: 'one number',
    test: function (p) { return /[0-9]/.test(p); },
  }),
  Object.freeze({
    key: 'special',
    label: 'Contains special character (e.g. ' + PASSWORD_SPECIAL_EXAMPLES + ')',
    need: 'one special character (e.g. ' + PASSWORD_SPECIAL_EXAMPLES + ')',
    test: function (p) {
      for (let i = 0; i < p.length; i++) {
        if (PASSWORD_SPECIAL_CHARS.indexOf(p.charAt(i)) !== -1) return true;
      }
      return false;
    },
  }),
]);

// Only { key, label } — what the checklist UI needs; the test functions stay private.
const PASSWORD_CHECKLIST = Object.freeze(PASSWORD_REQUIREMENTS.map(function (r) {
  return Object.freeze({ key: r.key, label: r.label });
}));

// Which requirements signup insists on at PASSWORD_MIN_LEVEL.
const PASSWORD_REQUIRED_KEYS = PASSWORD_MIN_LEVEL === 'medium'
  ? ['length', 'lower', 'upper', 'number']
  : PASSWORD_REQUIREMENTS.map(function (r) { return r.key; });

// Obvious passwords, compared lowercase and EXACT (never "contains", so a
// long passphrase that happens to include a word is fine). Not a breach
// list — it catches the lazy picks; Firebase + the strength rules do the rest.
const COMMON_PASSWORDS = new Set([
  'password', 'password12', 'password123', 'password1234',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'pass1234', 'passpass',
  '12345678', '123456789', '1234567890', '123123123', '11111111', '00000000',
  '87654321', '12341234', '1q2w3e4r', '1qaz2wsx',
  'qwerty', 'qwerty12', 'qwerty123', 'qwertyui', 'qwertyuiop', 'asdfghjk', 'zxcvbnm1',
  'abcdefgh', 'abcd1234', 'abc12345', 'abcdefg1',
  'iloveyou', 'letmein1', 'welcome1', 'welcome123', 'admin123', 'administrator',
  'changeme', 'trustno1', 'football', 'baseball', 'monkey123', 'dragon123',
  'linguawave', 'linguawave1', 'linguawave123', 'linguawave2026', 'learnasl', 'asl12345',
]);

// Lowercase letters + digits only: "John.Smith_1" -> "johnsmith1".
function squashForCompare(value) {
  return String(value === null || value === undefined ? '' : value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* Why a password that satisfies every rule is STILL a bad pick:
 *   'common'   -> on COMMON_PASSWORDS
 *   'personal' -> is, or is built from, the learner's own email / name
 *                 (case, punctuation and trailing digits ignored)
 *   null       -> neither.
 * `context` is optional: { email, name }. */
function findPasswordWeakness(password, context) {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'common';
  if (!context) return null;

  const pw = squashForCompare(password);
  const pwStem = pw.replace(/[0-9]+$/, '');       // "johnsmith2026" -> "johnsmith"
  const email = String(context.email || '').trim().toLowerCase();
  const local = email.split('@')[0];

  const parts = [local, email, context.name];
  for (let i = 0; i < parts.length; i++) {
    const part = squashForCompare(parts[i]);
    if (part.length < 3) continue;                // too short to be a meaningful match
    if (pw === part || pwStem === part) return 'personal';
    if (part.length >= 6 && pw.indexOf(part) !== -1) return 'personal';
  }
  return null;
}

/* STRENGTH SCORE (0..100) — what the bar fills to and what the label is read from.
 * The label is no longer "did you tick the 5 boxes"; it is a percentage:
 *
 *   length     up to 40  (16+ characters = full; grows with EVERY character;
 *                        counted as at most 1.5 x the number of DIFFERENT characters)
 *   variety    up to 40  lowercase 8 + uppercase 8 + number 8 + symbol 16
 *                        "symbol" = ANY character that is not a letter or digit
 *                        (& _ - ? space, emoji ...), not just the signup set
 *   uniqueness up to 20  distinct characters (12+ different = full), so
 *                        "aaaaaaaaaaaa1!" does not score like a real password
 *   penalties  up to -25 runs (aaa), sequences (abc / 321) and keyboard rows
 *
 *   0-39 Weak · 40-69 Medium · 70-89 Strong · 90-100 Very strong
 *
 * Caps keep the label honest:
 *   - common / based-on-your-email / too long        -> max 25 (always Weak)
 *   - shorter than MIN_PASSWORD_LENGTH               -> max 39 (still grows per char)
 *   - signup requirements not all met                -> max 69 (never Strong, so a
 *     green bar can't sit next to "Password needs …")
 *   - Very strong additionally needs VERY_STRONG_MIN_LENGTH characters. */
const STRENGTH_MEDIUM_AT = 40;
const STRENGTH_STRONG_AT = 70;
const STRENGTH_VERY_STRONG_AT = 90;

const KEYBOARD_ROWS = Object.freeze(['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']);

function patternPenalty(pw) {
  const chars = Array.from(pw.toLowerCase());
  let penalty = 0;

  // Runs of 3+ identical characters: "aaa", "1111".
  const runs = chars.join('').match(/(.)\1{2,}/gu);
  if (runs) penalty += runs.length * 6;

  // Ascending / descending letter-or-digit sequences: "abc", "789", "cba".
  const isAlnum = function (c) { return /[a-z0-9]/.test(c); };
  for (let i = 2; i < chars.length; i++) {
    if (!isAlnum(chars[i]) || !isAlnum(chars[i - 1]) || !isAlnum(chars[i - 2])) continue;
    const d1 = chars[i - 1].codePointAt(0) - chars[i - 2].codePointAt(0);
    const d2 = chars[i].codePointAt(0) - chars[i - 1].codePointAt(0);
    if (d1 === d2 && (d1 === 1 || d1 === -1)) penalty += 4;
  }

  // 4+ keys in a row on a keyboard row (either direction): "qwer", "asdf", "4321".
  const lower = chars.join('');
  const reversed = chars.slice().reverse().join('');
  KEYBOARD_ROWS.forEach(function (row) {
    for (let i = 0; i + 4 <= row.length; i++) {
      const piece = row.slice(i, i + 4);
      if (lower.indexOf(piece) !== -1 || reversed.indexOf(piece) !== -1) { penalty += 10; break; }
    }
  });

  return Math.min(penalty, 25);
}

function computePasswordScore(pw) {
  if (!pw) return 0;
  const length = Array.from(pw).length;
  const distinct = new Set(Array.from(pw)).size;

  // Repeating the same few characters doesn't add length: 12 x "a" is not 12 characters of strength.
  const effectiveLength = Math.min(length, distinct * 1.5);
  let points = Math.min(effectiveLength, 16) / 16 * 40;
  if (/\p{Ll}/u.test(pw)) points += 8;
  if (/\p{Lu}/u.test(pw)) points += 8;
  if (/\p{N}/u.test(pw)) points += 8;
  if (/[^\p{L}\p{N}]/u.test(pw)) points += 16;
  points += Math.min(distinct, 12) / 12 * 20;
  points -= patternPenalty(pw);

  return Math.max(0, Math.min(100, points));
}

function levelFromPercent(percent, length) {
  if (percent >= STRENGTH_VERY_STRONG_AT && length >= VERY_STRONG_MIN_LENGTH) return 'very-strong';
  if (percent >= STRENGTH_STRONG_AT) return 'strong';
  if (percent >= STRENGTH_MEDIUM_AT) return 'medium';
  return 'weak';
}

/* Scores a password. Pure and cheap (runs on every keystroke): never throws,
 * never logs, never stores.
 * Returns { score, max, percent, level, progress, checks:{length,lower,upper,number,special},
 *           tooLong, weakReason }
 *   score/max/checks = the 5 signup requirements (what the gate enforces)
 *   percent (0..100) / level = the strength reading (see STRENGTH SCORE above)
 *   progress (0..1)  = percent / 100, what the bar's fill uses. */
function getPasswordStrength(password, context) {
  const pw = typeof password === 'string' ? password : '';
  const checks = {};
  let score = 0;
  PASSWORD_REQUIREMENTS.forEach(function (r) {
    const ok = r.test(pw);
    checks[r.key] = ok;
    if (ok) score += 1;
  });

  const length = Array.from(pw).length;
  const tooLong = pw.length > MAX_PASSWORD_LENGTH;
  const weakReason = pw.length > 0 ? findPasswordWeakness(pw, context) : null;

  let percent = computePasswordScore(pw);
  if (length < MIN_PASSWORD_LENGTH) percent = Math.min(percent, 39 * length / MIN_PASSWORD_LENGTH);
  const meetsSignup = PASSWORD_REQUIRED_KEYS.every(function (k) { return checks[k]; });
  if (!meetsSignup) percent = Math.min(percent, STRENGTH_STRONG_AT - 1);
  if (tooLong || weakReason) percent = Math.min(percent, 25);
  percent = Math.round(percent);

  return {
    score: score, max: PASSWORD_REQUIREMENTS.length,
    percent: percent, level: levelFromPercent(percent, length),
    progress: percent / 100,
    checks: checks, tooLong: tooLong, weakReason: weakReason,
  };
}

/* "Password needs …" wording (GitHub style). The message names ONLY what is
 * still missing, so it shrinks as the learner fixes things:
 *   "a number, uppercase letter and lowercase letter" -> "a number" -> (valid)
 * Listed in this order; only the first item gets an article (a / an);
 * no Oxford comma. */
const PASSWORD_NEED_ORDER = Object.freeze(['number', 'upper', 'lower', 'special']);
const PASSWORD_NEED_NOUNS = Object.freeze({
  number:  'number',
  upper:   'uppercase letter',
  lower:   'lowercase letter',
  special: 'special character (e.g. ' + PASSWORD_SPECIAL_EXAMPLES + ')',
});
function describePasswordNeeds(missingKeys) {
  const nouns = PASSWORD_NEED_ORDER
    .filter(function (k) { return missingKeys.indexOf(k) !== -1; })
    .map(function (k) { return PASSWORD_NEED_NOUNS[k]; });
  if (nouns.length === 0) return '';
  nouns[0] = (/^[aeiou]/i.test(nouns[0]) ? 'an ' : 'a ') + nouns[0];
  if (nouns.length === 1) return nouns[0];
  return nouns.slice(0, -1).join(', ') + ' and ' + nouns[nouns.length - 1];
}

/* The one password gate. Returns { valid, message, score, level, checks,
 * missing } — `message` is already safe to show (it never contains the
 * password) and is the success sentence when valid. `context` is optional
 * { email, name } so a password built from the learner's own details is
 * rejected. Never trims or alters the password. */
function validatePassword(password, context) {
  const strength = getPasswordStrength(password, context);
  const result = {
    valid: false,
    message: '',
    score: strength.score,
    level: strength.level,
    checks: strength.checks,
    missing: [],
  };

  if (typeof password !== 'string' || password.length === 0) {
    result.message = 'Please choose a password.';
    return result;
  }
  if (strength.tooLong) {
    result.message = 'Password must be ' + MAX_PASSWORD_LENGTH + ' characters or fewer.';
    return result;
  }

  // What is still missing, by requirement key (length included).
  const missing = PASSWORD_REQUIREMENTS.filter(function (r) {
    return PASSWORD_REQUIRED_KEYS.indexOf(r.key) !== -1 && !strength.checks[r.key];
  });
  const missingKeys = missing.map(function (r) { return r.key; });

  // Length is reported before anything else (live, while typing: "ab" is
  // "too short", not "too common"). Once it is long enough the message
  // switches to whatever is still missing.
  if (!strength.checks.length) {
    result.missing = missingKeys;
    result.message = 'Password is too short';
    return result;
  }

  // Common / personal picks come next: telling someone to "add a
  // special character" to Password123 would just walk them to another bad one.
  if (strength.weakReason === 'common') {
    result.message = 'That password is too common. Choose something harder to guess.';
    return result;
  }
  if (strength.weakReason === 'personal') {
    result.message = 'Your password can\'t be based on your email address or name.';
    return result;
  }

  result.missing = missingKeys;
  if (missingKeys.length > 0) {
    result.message = 'Password needs ' + describePasswordNeeds(missingKeys);
    return result;
  }

  result.valid = true;
  result.message = 'Password meets all security requirements.';
  return result;
}

function validateConfirmPassword(password, confirmPassword) {
  if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (confirmPassword !== password) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true, message: '' };
}

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
    case 'auth/password-does-not-meet-requirements':
      // Firebase's own password policy said no (the server-side backstop —
      // see PASSWORD POLICY above). Generic on purpose: no password echoed.
      return 'That password doesn\'t meet the security requirements. Use at least ' + MIN_PASSWORD_LENGTH +
        ' characters with an uppercase letter, a lowercase letter, a number and a special character (e.g. ' + PASSWORD_SPECIAL_EXAMPLES + ').';
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
 * ORDER MATTERS (2026-09-29, validation steps extended 2026-10-01):
 *   1. normalize + validate, in this order: email format -> email
 *      provider -> password -> confirm password. The first failure
 *      throws; nothing is created and nothing is sent.
 *   2. Reacher pre-check (precheckEmail) — a rejected address never
 *      becomes a Firebase account
 *   3. createUserWithEmailAndPassword (with the SAME normalized email).
 *      This is the "account already exists?" check: Firebase throws
 *      auth/email-already-in-use here, before step 5 can run.
 *   4. Firestore profile write `users/{uid}` (rolled back on failure)
 *   5. sendVerificationEmail — reachable ONLY if steps 1-4 all passed
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
async function register(name, email, password, confirmPassword) {
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
  // Format first, then provider — two separate checks (see validateEmail).
  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.formatValid) {
    throw lwError('lw/invalid-email', INVALID_EMAIL_MESSAGE);
  }
  if (!emailCheck.providerSupported) {
    throw lwError('lw/unsupported-email-provider', UNSUPPORTED_PROVIDER_MESSAGE);
  }

  const passwordCheck = validatePassword(password, { email: normalizedEmail, name: trimmedName });
  if (!passwordCheck.valid) {
    throw lwError('lw/invalid-password', passwordCheck.message);
  }
  // confirmPassword is REQUIRED: a caller that omits it fails here rather
  // than silently skipping the check.
  const confirmCheck = validateConfirmPassword(password, confirmPassword);
  if (!confirmCheck.valid) {
    throw lwError('lw/password-mismatch', confirmCheck.message);
  }

  // Reacher pre-check — see precheckEmail() for what it rejects and
  // why it fails open. (Replaces the earlier never-deployed
  // `checkEmailDomain` DNS-only call.)
  await precheckEmail(normalizedEmail);

  // Also the "account already exists?" check: throws
  // auth/email-already-in-use (see describeAuthError) and no email is sent.
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const firebaseUser = result.user;

  const user = {
    uid: firebaseUser.uid,
    // Signup has no name field: the display name is the part of the email before
    // the @ (capped so it stays valid for updateUsername()'s MAX_NAME_LENGTH).
    name: trimmedName || (firebaseUser.email || '').split('@')[0].slice(0, MAX_NAME_LENGTH) || 'Learner',
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

/* A users/{uid} profile was just (re)created. XP lives in separate docs (xpState / publicProfiles), so if the
 * database was wiped they would still hold the OLD XP and the learner would stay on the leaderboards.
 * Delete them so XP is always tied to the account's current profile. Owner delete is allowed by firestore.rules. */
async function resetXpForNewProfile(uid) {
  try {
    await Promise.all([
      deleteDoc(doc(db, 'xpState', uid)),
      deleteDoc(doc(db, 'publicProfiles', uid)),
    ]);
    localStorage.removeItem('lw_xp_pending_v1:' + uid);
    localStorage.removeItem('lw_xp_backfilled_v1:' + uid);
  } catch (e) {
    console.warn('[auth] could not reset XP for the new profile:', e);
  }
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
    await resetXpForNewProfile(firebaseUser.uid);   // brand-new profile => XP/leaderboard start fresh too
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

/* ── PROFILE PICTURE ──────────────────────────────────────────────
 * Learners pick one of the fixed pictures in js/avatars.js; only its ID is
 * stored (users/{uid}.avatar), never an image or URL. The same pattern is
 * enforced by firestore.rules, so a console-written value that isn't an
 * ID is rejected there too.
 * updateAvatar() also copies the ID onto the learner's leaderboard row
 * (publicProfiles/{uid}) so the new picture shows up without waiting for
 * their next XP save. That row only exists for learners who have earned XP
 * and aren't hidden, so "no row yet" is expected and ignored — js/xp.js puts
 * the avatar on the row whenever it creates or rewrites it.
 * getAvatar() reads the stored ID (the session cache can be stale if it was
 * changed on another device) and refreshes the cache. */
const AVATAR_ID_RE = /^avatar-\d{2}$/;

async function getAvatar() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
  const id = snap.exists() ? snap.data().avatar : null;
  const valid = (typeof id === 'string' && AVATAR_ID_RE.test(id)) ? id : null;
  const cached = getCurrentUser();
  if (cached && cached.uid === firebaseUser.uid) {
    cached.avatar = valid;
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(cached));
  }
  return valid;
}

async function updateAvatar(avatarId) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  if (typeof avatarId !== 'string' || !AVATAR_ID_RE.test(avatarId)) {
    throw new Error('Pick one of the available profile pictures.');
  }

  await updateDoc(doc(db, 'users', firebaseUser.uid), { avatar: avatarId });

  try {
    await updateDoc(doc(db, 'publicProfiles', firebaseUser.uid), { avatar: avatarId });
  } catch (e) {
    // not-found = no leaderboard row (yet / hidden / pending deletion). Anything else is
    // logged but never fails the save: the account itself already has the new picture.
    if (!e || e.code !== 'not-found') console.warn('[auth] could not update the leaderboard picture:', e);
  }

  const cached = getCurrentUser();
  if (cached && cached.uid === firebaseUser.uid) {
    cached.avatar = avatarId;
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
 * — then hands the new one to Firebase. The new password must pass the
 * SAME validatePassword() policy as signup (2026-10-01; this used to be
 * a length-only check, which let someone change to "password" right
 * after signing up with a strong one). The check runs before the
 * round-trip so the message is fast and friendly; Firebase's own
 * password policy is the server-side backstop. */
async function changePassword(currentPassword, newPassword) {
  const check = validatePassword(newPassword, {
    email: auth.currentUser ? auth.currentUser.email : '',
  });
  if (!check.valid) throw lwError('lw/invalid-password', check.message);
  const firebaseUser = await reauthenticate(currentPassword);
  await updatePassword(firebaseUser, newPassword);
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
  SUPPORTED_EMAIL_DOMAINS,     // frozen array — the one provider list
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  VERY_STRONG_MIN_LENGTH,
  PASSWORD_SPECIAL_CHARS,
  PASSWORD_CHECKLIST,          // [{ key, label }] — no longer used by index.html (its checklist was replaced by the adaptive "Password needs …" message)
  validateEmail,               // same functions register() enforces,
  validatePassword,            // exposed so index.html's inline feedback
  getPasswordStrength,         // (strength bar + checklist) and
  validateConfirmPassword,     // can't drift from the real check
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
  updateAvatar,
  getAvatar,
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