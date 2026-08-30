/**
 * auth.js — Authentication Layer (Firebase Auth + Firestore)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single source of truth for "is someone logged in" across
 *            every page. Wraps Firebase Auth (email/password) for
 *            login/register/logout, mirrors the signed-in user's
 *            profile into Firestore (`users/{uid}`), and caches a
 *            small session object in localStorage so every page can
 *            read it synchronously via getCurrentUser() without an
 *            async round-trip.
 *
 * CONNECTS : Loaded by index.html (root) and every pages/*.html file.
 *            index.html calls login()/register().
 *            main.js calls getCurrentUser() to render the navbar.
 *            Every protected page calls requireAuth() on load.
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
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
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


const LW_SESSION_KEY = 'lw_session';

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
  return !!getCurrentUser();
}

/* ── LOG IN ───────────────────────────────────────────────────────
 * Signs in with Firebase Auth, then reads the matching Firestore
 * profile (falling back to sensible defaults if the document doesn't
 * exist yet) so the cached session always has a name/level/joined
 * date to show, not just an email.
 * ──────────────────────────────────────────────────────────────── */
async function login(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = result.user;

  // Fetch the real profile from Firestore instead of guessing
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
  return user;
}

/* ── REGISTER ─────────────────────────────────────────────────────
 * Creates the Firebase Auth account, then writes a matching Firestore
 * profile document (`users/{uid}`). `level` has no signup-time picker
 * in index.html, so every new account is written with a fixed
 * 'basic' value — kept as a real field (rather than dropped) so
 * anything downstream that reads `user.level` never sees `undefined`.
 * ──────────────────────────────────────────────────────────────── */
async function register(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = result.user;

  const user = {
    uid: firebaseUser.uid,
    name: (name || '').trim() || firebaseUser.email.split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  const userRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(userRef, user);
  

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
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
  getCurrentUser,
  isLoggedIn,
  login,
  register,
  logout,
  requireAuth,
  redirectIfLoggedIn,
  whenAuthReady,
  doc, 
  db, 
  getDoc, 
  setDoc, 
};