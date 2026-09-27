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
 * ─────────────────────────────────────────────────────────────────
 */
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
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

// ── AUTH STATE SYNC ─────────────────────────────────────────────
// Fires once on page load (after Firebase checks for an existing
// session) and again any time login/logout state changes. Keeps
// localStorage as an accurate cache of who's currently signed in.
let authReady = false;
let hasFiredReady = false;

onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
    const existing = getCurrentUser();

    if (existing && existing.uid === firebaseUser.uid) {
      // Already cached — skip the Firestore fetch entirely
    } else {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);
      const profile = snapshot.exists() ? snapshot.data() : {};

      const user = {
        uid: firebaseUser.uid,
        name: profile.name || firebaseUser.email.split('@')[0] || 'Learner',
        email: firebaseUser.email,
        level: profile.level || 'basic',
        joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
      };
      localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
    }
  } else {
    localStorage.removeItem(LW_SESSION_KEY);
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
  return !!auth.currentUser;
}

/* ── LOG IN ───────────────────────────────────────────────────────
 * Signs in with Firebase Auth, then reads the matching Firestore
 * profile (falling back to sensible defaults if the document doesn't
 * exist yet) so the cached session always has a name/level/joined
 * date to show, not just an email.
 *
 * Also doubles as the "undo" for deleteAccount()'s grace-period soft
 * delete below: if the profile is flagged `deletionRequested`, logging
 * back in here clears it — coming back within the window IS the
 * cancellation, no separate "restore my account" flow needed.
 * ──────────────────────────────────────────────────────────────── */
async function login(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = result.user;

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
    name: profile.name || firebaseUser.email.split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: profile.level || 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
}

/* ── REGISTER ─────────────────────────────────────────────────────
 * Creates the Firebase Auth account, then writes a matching Firestore
 * profile document (`users/{uid}`). `level` has no signup-time picker
 * in index.html, so every new account is written with a fixed
 * 'basic' value — kept as a real field (rather than dropped) so
 * anything downstream that reads `user.level` never sees `undefined`.
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
  const trimmedEmail = (email || '').trim();
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    throw new Error('Email must be ' + MAX_EMAIL_LENGTH + ' characters or fewer.');
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = result.user;

  const user = {
    uid: firebaseUser.uid,
    name: trimmedName || firebaseUser.email.split('@')[0] || 'Learner',
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

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
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

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
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
 * Call requireAuth() at the top of every protected page
 * (dashboard, learn, lesson, quiz, feedback).
 * Call redirectIfLoggedIn() on index.html so a returning user skips
 * straight past the login form.
 * ──────────────────────────────────────────────────────────────── */
function requireAuth(loginPath) {
  if (authReady) {
    if (!isLoggedIn()) window.location.href = loginPath || '/index.html';
    return;
  }
  window.addEventListener('lwauth-ready', () => {
    if (!isLoggedIn()) window.location.href = loginPath || '/index.html';
  }, { once: true });
}

function redirectIfLoggedIn(dashboardPath) {
  if (isLoggedIn()) {
    // Every actual caller already passes an explicit path (index.html
    // passes 'pages/dashboard.html'); this fallback just mirrors that
    // same default in case a future caller omits the argument.
    window.location.href = dashboardPath || 'pages/dashboard.html';
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

/* ── EXPORTS ──────────────────────────────────────────────────────
 * Exposed as window.LWAuth so plain <script> tags (no bundler) can
 * use it from any page.
 * ──────────────────────────────────────────────────────────────── */
window.LWAuth = {
  LW_SESSION_KEY,
  DELETION_GRACE_PERIOD_DAYS,
  getCurrentUser,
  isLoggedIn,
  login,
  register,
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
};
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
