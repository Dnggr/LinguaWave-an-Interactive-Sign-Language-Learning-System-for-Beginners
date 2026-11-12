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
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBpiKsa6ySEBy7IggejmT8TDWaxAFr5E2c",
  authDomain: "linguawave-63911.firebaseapp.com",
  projectId: "linguawave-63911",
  storageBucket: "linguawave-63911.firebasestorage.app",
  messagingSenderId: "34514540529",
  appId: "1:34514540529:web:18f5b1cd7f04e965fe1650",
  measurementId: "G-6CLTW0GZXJ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
'use strict';
let pendingGoogleCredential = null;
const LW_SESSION_KEY = 'lw_session';
const MAX_NAME_LENGTH = 30;
const MAX_EMAIL_LENGTH = 254;
const DELETION_GRACE_PERIOD_DAYS = 30;
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_KEY_PREFIX = 'lw_verify_resend_at:';
const LOGIN_PAGE_URL = new URL('../index.html', import.meta.url).href;
const VERIFY_PAGE_URL = new URL('../pages/verify-email.html', import.meta.url).href;
const LOCAL_LEARNING_KEYS = [
  'lw_progress_v3',
  'lw_missions_progress_v1',
  'lw_missions_streak_v1',
  'lw_missions_hearts_v1',
];
const RESET_SEEN_PREFIX = 'lw_reset_seen_v1:';
const RESET_CHECK_KEY = 'lw_reset_check_v1';
const RESET_CHECK_TTL_MS = 5 * 60 * 1000;
function clearLocalLearningState(uid) {
  try {
    LOCAL_LEARNING_KEYS.forEach((k) => localStorage.removeItem(k));
    if (uid) {
      localStorage.removeItem('lw_xp_pending_v1:' + uid);
      localStorage.removeItem('lw_xp_pending_v2:' + uid);
      localStorage.removeItem('lw_xp_backfilled_v1:' + uid);
      localStorage.removeItem('lw_xp_backfilled_v2:' + uid);
      localStorage.removeItem(`lw_game_v2:${uid}`);
    }
    sessionStorage.removeItem('lw_missions_last_sync_v1');
    sessionStorage.removeItem('lw_progress_last_sync_v1');
  } catch (e) {  }
}
async function applyProgressResetIfNeeded(firebaseUser) {
  const uid = firebaseUser.uid;
  try {
    const last = JSON.parse(sessionStorage.getItem(RESET_CHECK_KEY) || 'null');
    if (last && last.uid === uid && Date.now() - last.at < RESET_CHECK_TTL_MS) return;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) { clearLocalLearningState(uid); return; }
    const marker = snap.data().progressResetAt;
    if (marker != null) {
      const seenKey = RESET_SEEN_PREFIX + uid;
      if (localStorage.getItem(seenKey) !== String(marker)) {
        clearLocalLearningState(uid);
        localStorage.setItem(seenKey, String(marker));
      }
    }
    sessionStorage.setItem(RESET_CHECK_KEY, JSON.stringify({ uid, at: Date.now() }));
  } catch (e) {
    console.warn('[auth] reset check failed, will retry on the next load:', e);
  }
}
let authReady = false;
let hasFiredReady = false;
let stopProfileListener = null;
let profileWatchUid = null;
const ADMIN_LOGIN_EMAIL = 'linguawave.project@gmail.com';
function isAdminLogin(firebaseUser) {
  return !!firebaseUser && (firebaseUser.email || '').toLowerCase() === ADMIN_LOGIN_EMAIL;
}
onAuthStateChanged(auth, async (firebaseUser) => {
  try {
    if (firebaseUser && !firebaseUser.emailVerified) {
      localStorage.removeItem(LW_SESSION_KEY);
      stopProfileWatch();
    } else if (firebaseUser) {
      await applyProgressResetIfNeeded(firebaseUser);
      const existing = getCurrentUser();
      if (existing && existing.uid === firebaseUser.uid) {
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
      startProfileWatch(firebaseUser.uid);
    } else {
      localStorage.removeItem(LW_SESSION_KEY);
      sessionStorage.removeItem(RESET_CHECK_KEY);
      stopProfileWatch();
    }
  } catch (syncError) {
    console.error('[auth] Could not sync the session cache:', syncError);
  }
  authReady = true;
  if (!hasFiredReady) {
    hasFiredReady = true;
    window.dispatchEvent(new Event('lwauth-ready'));
  }
});
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(LW_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function getAuthState() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return 'logged-out';
  return firebaseUser.emailVerified ? 'verified' : 'unverified';
}
function getVerificationInfo() {
  const firebaseUser = auth.currentUser;
  return {
    state: getAuthState(),
    email: firebaseUser ? firebaseUser.email : null,
    uid: firebaseUser ? firebaseUser.uid : null,
  };
}
function isLoggedIn() {
  const firebaseUser = auth.currentUser;
  return !!firebaseUser && firebaseUser.emailVerified === true;
}
function normalizeEmail(email) {
  return (email === null || email === undefined ? '' : String(email)).trim();
}
function lwError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
const INVALID_EMAIL_MESSAGE = "That doesn't look like a valid email address. Please check it and try again.";
const GENERIC_AUTH_MESSAGE = 'Something went wrong. Please try again.';
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
const MAX_LOCAL_PART_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 50;
const VERY_STRONG_MIN_LENGTH = 12;
const LOCAL_PART_CHARS_RE = /^[A-Za-z0-9._%+-]+$/;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,}$/;
const UNSUPPORTED_PROVIDER_MESSAGE =
  'Please use an email address from a supported provider (' +
  SUPPORTED_EMAIL_DOMAINS.map(function (d) { return '@' + d; }).join(', ') + ').';
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
  const parts = normalized.split('@');
  if (parts.length !== 2) { result.reason = 'format'; return result; }
  const local = parts[0];
  const domain = parts[1].toLowerCase();
  const localOk = local.length > 0 &&
    local.length <= MAX_LOCAL_PART_LENGTH &&
    LOCAL_PART_CHARS_RE.test(local) &&
    local.charAt(0) !== '.' &&
    local.charAt(local.length - 1) !== '.' &&
    local.indexOf('..') === -1;
  const labels = domain.split('.');
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
const PASSWORD_SPECIAL_CHARS = '^$*.[]{}()?"!@#%&/\\,><\':;|_~`=+-';
const PASSWORD_SPECIAL_EXAMPLES = '!@#$%&';
const PASSWORD_MIN_LEVEL = 'strong';
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
const PASSWORD_CHECKLIST = Object.freeze(PASSWORD_REQUIREMENTS.map(function (r) {
  return Object.freeze({ key: r.key, label: r.label });
}));
const PASSWORD_REQUIRED_KEYS = PASSWORD_MIN_LEVEL === 'medium'
  ? ['length', 'lower', 'upper', 'number']
  : PASSWORD_REQUIREMENTS.map(function (r) { return r.key; });
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
function squashForCompare(value) {
  return String(value === null || value === undefined ? '' : value).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function findPasswordWeakness(password, context) {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'common';
  if (!context) return null;
  const pw = squashForCompare(password);
  const pwStem = pw.replace(/[0-9]+$/, '');
  const email = String(context.email || '').trim().toLowerCase();
  const local = email.split('@')[0];
  const parts = [local, email, context.name];
  for (let i = 0; i < parts.length; i++) {
    const part = squashForCompare(parts[i]);
    if (part.length < 3) continue;
    if (pw === part || pwStem === part) return 'personal';
    if (part.length >= 6 && pw.indexOf(part) !== -1) return 'personal';
  }
  return null;
}
const STRENGTH_MEDIUM_AT = 40;
const STRENGTH_STRONG_AT = 70;
const STRENGTH_VERY_STRONG_AT = 90;
const KEYBOARD_ROWS = Object.freeze(['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']);
function patternPenalty(pw) {
  const chars = Array.from(pw.toLowerCase());
  let penalty = 0;
  const runs = chars.join('').match(/(.)\1{2,}/gu);
  if (runs) penalty += runs.length * 6;
  const isAlnum = function (c) { return /[a-z0-9]/.test(c); };
  for (let i = 2; i < chars.length; i++) {
    if (!isAlnum(chars[i]) || !isAlnum(chars[i - 1]) || !isAlnum(chars[i - 2])) continue;
    const d1 = chars[i - 1].codePointAt(0) - chars[i - 2].codePointAt(0);
    const d2 = chars[i].codePointAt(0) - chars[i - 1].codePointAt(0);
    if (d1 === d2 && (d1 === 1 || d1 === -1)) penalty += 4;
  }
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
  const missing = PASSWORD_REQUIREMENTS.filter(function (r) {
    return PASSWORD_REQUIRED_KEYS.indexOf(r.key) !== -1 && !strength.checks[r.key];
  });
  const missingKeys = missing.map(function (r) { return r.key; });
  if (!strength.checks.length) {
    result.missing = missingKeys;
    result.message = 'Password is too short';
    return result;
  }
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
function resendKey(uid) { return RESEND_KEY_PREFIX + uid; }
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
  try { localStorage.setItem(resendKey(firebaseUser.uid), String(Date.now())); } catch (e) {  }
}
const CONTINUE_URL_ERRORS = ['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri'];
let verificationSendInFlight = false;
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
    if (err && err.code === 'auth/too-many-requests') markVerificationSent(user);
    throw err;
  } finally {
    verificationSendInFlight = false;
  }
}
async function checkVerificationNow() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw lwError('lw/not-signed-in', 'You need to be signed in to do that.');
  await firebaseUser.reload();
  if (!firebaseUser.emailVerified) return { verified: false };
  await firebaseUser.getIdToken(true);
  const user = await finishVerifiedLogin(firebaseUser);
  return { verified: true, user };
}
async function finishVerifiedLogin(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists() && !isAdminLogin(firebaseUser)) {
    await signOutRemovedAccount(firebaseUser.uid);
    throw lwError('lw/account-removed', ACCOUNT_REMOVED_MESSAGE);
  }
  const profile = snapshot.exists() ? snapshot.data() : {};
  const restoredDeletion = !!profile.deletionRequested;
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
  if (restoredDeletion) void syncXpPublicProfile();
  return user;
}
async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw lwError('lw/missing-credentials', 'Please enter your email and password.');
  }
  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.formatValid) {
    throw lwError('lw/invalid-email', INVALID_EMAIL_MESSAGE);
  }
  if (!emailCheck.providerSupported) {
    throw lwError('lw/unsupported-email-provider', UNSUPPORTED_PROVIDER_MESSAGE);
  }
  const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const firebaseUser = result.user;
  if (!firebaseUser.emailVerified) {
    localStorage.removeItem(LW_SESSION_KEY);
    return { verified: false, user: null };
  }
  const user = await finishVerifiedLogin(firebaseUser);
  return { verified: true, user };
}
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
  const confirmCheck = validateConfirmPassword(password, confirmPassword);
  if (!confirmCheck.valid) {
    throw lwError('lw/password-mismatch', confirmCheck.message);
  }
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const firebaseUser = result.user;
  const user = {
    uid: firebaseUser.uid,
    name: trimmedName || (firebaseUser.email || '').split('@')[0].slice(0, MAX_NAME_LENGTH) || 'Learner',
    email: firebaseUser.email,
    level: 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };
  const userRef = doc(db, 'users', firebaseUser.uid);
  try {
    await setDoc(userRef, user);
  } catch (firestoreError) {
    try {
      await firebaseUser.delete();
    } catch (deleteError) {
      console.error('Failed to roll back orphaned auth account:', deleteError);
    }
    throw firestoreError;
  }
  let verificationSent = true;
  try {
    await sendVerificationEmail(firebaseUser);
  } catch (sendError) {
    verificationSent = false;
    console.error('Failed to send verification email:', sendError);
  }
  return { verificationSent, email: normalizedEmail };
}
async function resetXpForNewProfile(uid) {
  clearLocalLearningState(uid);
}
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (error) {
    if (error && error.code === 'auth/account-exists-with-different-credential') {
      pendingGoogleCredential = GoogleAuthProvider.credentialFromError(error);
    }
    throw error;
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
    await resetXpForNewProfile(firebaseUser.uid);
  }
  const user = {
    uid: firebaseUser.uid,
    name: profile.name || firebaseUser.email.split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: profile.level || 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };
  if (firebaseUser.emailVerified) {
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LW_SESSION_KEY);
  }
  return user;
}
async function linkPendingGoogleCredential() {
  if (!pendingGoogleCredential || !auth.currentUser) return;
  const credential = pendingGoogleCredential;
  pendingGoogleCredential = null;
  await linkWithCredential(auth.currentUser, credential);
}
async function logout(redirectPath) {
  const uid = auth.currentUser?.uid;
  await signOut(auth);
  localStorage.removeItem(window.LWProgress?.STORE_KEY);
  if (uid) localStorage.removeItem(`lw_game_v2:${uid}`);
  localStorage.removeItem(LW_SESSION_KEY);
  window.location.href = redirectPath || '/index.html';
}
async function sendPasswordReset(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) throw new Error('Enter your email address.');
  try {
    await sendPasswordResetEmail(auth, trimmed);
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') return;
    throw err;
  }
}
async function reauthenticate(currentPassword) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseUser, credential);
  return firebaseUser;
}
async function signOutRemovedAccount(uid) {
  stopProfileWatch();
  try { await signOut(auth); } catch (e) {  }
  clearLocalLearningState(uid);
  try { localStorage.removeItem(window.LWProgress?.STORE_KEY); } catch (e) {  }
  localStorage.removeItem(LW_SESSION_KEY);
  sessionStorage.removeItem(RESET_CHECK_KEY);
}
const ACCOUNT_REMOVED_MESSAGE = 'This account was removed by an administrator. You have been signed out.';
function sendRemovedAccountToLogin() {
  const path = window.location.pathname || '';
  if (/\/index\.html$/.test(path) || path === '/' || path === '') return;
  const toLogin = /\/pages\//.test(path) ? '../index.html' : 'index.html';
  try { window.LinguaWave && window.LinguaWave.showToast && window.LinguaWave.showToast(ACCOUNT_REMOVED_MESSAGE, 'error'); } catch (e) {  }
  setTimeout(() => window.location.replace(toLogin), 2000);
}
function stopProfileWatch() {
  if (stopProfileListener) { stopProfileListener(); stopProfileListener = null; }
  profileWatchUid = null;
}
function startProfileWatch(uid) {
  if (isAdminLogin(auth.currentUser)) return;
  if (profileWatchUid === uid && stopProfileListener) return;
  stopProfileWatch();
  profileWatchUid = uid;
  let docExists = null;
  let recheckTimer = null;
  stopProfileListener = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.metadata.fromCache) return;
    docExists = snap.exists();
    if (docExists) {
      if (recheckTimer) { clearTimeout(recheckTimer); recheckTimer = null; }
      return;
    }
    if (recheckTimer) return;
    recheckTimer = setTimeout(async () => {
      recheckTimer = null;
      if (docExists !== false || profileWatchUid !== uid) return;
      await signOutRemovedAccount(uid);
      sendRemovedAccountToLogin();
    }, 3000);
  }, (err) => {
    console.warn('[auth] profile watch stopped:', err?.code || '', err?.message || err);
  });
}
async function updateOwnProfile(fields) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const userRef = doc(db, 'users', firebaseUser.uid);
  try {
    await updateDoc(userRef, fields);
    return;
  } catch (err) {
    if (!err || (err.code !== 'not-found' && err.code !== 'permission-denied')) throw err;
    const snap = await getDoc(userRef);
    if (snap.exists()) throw err;
  }
  await signOutRemovedAccount(firebaseUser.uid);
  throw lwError('lw/account-removed', ACCOUNT_REMOVED_MESSAGE);
}
async function updateUsername(newName) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const trimmed = (newName || '').trim();
  if (!trimmed) throw new Error('Enter a name first.');
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error('Name must be ' + MAX_NAME_LENGTH + ' characters or fewer.');
  }
  await updateOwnProfile({ name: trimmed });
  await syncXpPublicProfile();
  const cached = getCurrentUser();
  if (cached && cached.uid === firebaseUser.uid) {
    cached.name = trimmed;
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(cached));
  }
}
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
  await updateOwnProfile({ avatar: avatarId });
  await syncXpPublicProfile();
  const cached = getCurrentUser();
  if (cached && cached.uid === firebaseUser.uid) {
    cached.avatar = avatarId;
    localStorage.setItem(LW_SESSION_KEY, JSON.stringify(cached));
  }
}
async function updateUserEmail(newEmail, currentPassword) {
  const trimmed = (newEmail || '').trim();
  if (!trimmed) throw new Error('Enter a new email address.');
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    throw new Error('Email must be ' + MAX_EMAIL_LENGTH + ' characters or fewer.');
  }
  const firebaseUser = await reauthenticate(currentPassword);
  await verifyBeforeUpdateEmail(firebaseUser, trimmed);
}
async function changePassword(currentPassword, newPassword) {
  const check = validatePassword(newPassword, {
    email: auth.currentUser ? auth.currentUser.email : '',
  });
  if (!check.valid) throw lwError('lw/invalid-password', check.message);
  const firebaseUser = await reauthenticate(currentPassword);
  await updatePassword(firebaseUser, newPassword);
}
async function deleteAccount(currentPassword) {
  const firebaseUser = currentPassword ? await reauthenticate(currentPassword) : auth.currentUser;
  if (!firebaseUser) throw new Error('Not signed in.');
  const uid = firebaseUser.uid;
  await updateDoc(doc(db, 'users', uid), {
    deletionRequested: true,
    deletionRequestedAt: new Date().toISOString(),
  });
  await syncXpPublicProfile();
  await signOut(auth);
  localStorage.removeItem(window.LWProgress?.STORE_KEY);
  localStorage.removeItem(LW_SESSION_KEY);
}
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
    redirectOnce(dashboardPath || 'pages/dashboard.html');
  } else if (state === 'unverified') {
    redirectOnce(verifyPath || VERIFY_PAGE_URL);
  }
}
function whenAuthReady() {
  return new Promise((resolve) => {
    if (authReady) {
      resolve();
    } else {
      window.addEventListener('lwauth-ready', () => resolve(), { once: true });
    }
  });
}
async function syncXpPublicProfile() {
  try {
    if (!window.LWXP?.syncPublicProfile) await import('./xp.js');
    await window.LWXP?.syncPublicProfile?.();
  } catch (error) {
    console.warn('[auth] could not sync XP leaderboard profile:', error?.code || '', error?.message || error);
  }
}
const PROGRESS_COLLECTIONS = ['userProgress', 'userProgressV2', 'userGame'];
async function progressRef(name) {
  if (PROGRESS_COLLECTIONS.indexOf(name) === -1) throw new Error('progress collection not allowed: ' + name);
  await whenAuthReady();
  const u = auth.currentUser;
  if (!u || !u.emailVerified) return null;
  return doc(db, name, u.uid);
}
async function readProgressDoc(name) {
  const ref = await progressRef(name);
  if (!ref) return null;
  const snap = await getDoc(ref);
  return { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
}
async function writeProgressDoc(name, data, opts) {
  const ref = await progressRef(name);
  if (!ref) return false;
  await setDoc(ref, data, opts && opts.merge ? { merge: true } : {});
  return true;
}
window.LWAuth = {
  LW_SESSION_KEY,
  DELETION_GRACE_PERIOD_DAYS,
  RESEND_COOLDOWN_SECONDS,
  SUPPORTED_EMAIL_DOMAINS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  VERY_STRONG_MIN_LENGTH,
  PASSWORD_SPECIAL_CHARS,
  PASSWORD_CHECKLIST,
  validateEmail,
  validatePassword,
  getPasswordStrength,
  validateConfirmPassword,
  getCurrentUser,
  getAuthUid: () => auth.currentUser?.uid || null,
  isLoggedIn,
  getAuthState,
  getVerificationInfo,
  login,
  register,
  sendVerificationEmail,
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
(function autoGuardProtectedPages() {
  const page = (window.location.pathname.split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '');
  if (page === '' || page === 'index' || page === 'verify-email' || page.indexOf('admin-') === 0) return;
  requireAuth();
})();
export { app, auth, db, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, clearLocalLearningState };
