/**
 * auth.js — Authentication Layer (BYPASS / MOCK MODE)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single source of truth for "is someone logged in" across
 *            every page. Right now it does NOT talk to a backend —
 *            login() / register() accept whatever is typed (or
 *            nothing at all) and just store a session in
 *            localStorage. This lets the rest of the team build pages
 *            against a stable API while Firebase Auth is wired in.
 *
 * CONNECTS : Loaded by index.html (root) and every pages/*.html file.
 *            index.html calls login()/register().
 *            main.js calls getCurrentUser() to render the navbar.
 *            Every protected page calls requireAuth() on load.
 *
 * HANDOFF  : Whoever wires up real Firebase Auth only needs to edit
 *            the 4 functions marked "REPLACE WITH FIREBASE" below.
 *            Nothing else in the codebase should need to change —
 *            every page calls these functions, never localStorage
 *            directly.
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
 * REPLACE WITH FIREBASE: firebase.auth().signInWithEmailAndPassword()
 *
 * BYPASS MODE: no credential check happens here at all. Whatever is
 * typed (or left blank) logs the user in immediately. This is
 * intentional for now — remove the bypass once real auth is wired.
 * ──────────────────────────────────────────────────────────────── */
/*function login(email, password) {
  const safeEmail = (email || '').trim() || 'guest@linguawave.app';
  const existing = getCurrentUser();

  const user = {
    uid: existing?.uid || 'demo-uid',
    name: existing?.name || safeEmail.split('@')[0] || 'Learner',
    email: safeEmail,
    level: existing?.level || 'basic',
    joined: existing?.joined || new Date().toISOString().slice(0, 10),
  };

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
}*/

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
 * REPLACE WITH FIREBASE: firebase.auth().createUserWithEmailAndPassword()
 *                         + Firestore write to users/{uid}
 *
 * BYPASS MODE: same as login — accepts any input, creates a session.
 * ──────────────────────────────────────────────────────────────── */
/*function register(name, email, password, level) {
  const safeEmail = (email || '').trim() || 'guest@linguawave.app';
  
  const user = {
    uid: 'demo-uid',
    name: (name || '').trim() || safeEmail.split('@')[0] || 'Learner',
    email: safeEmail,
    level: level || 'basic',
    joined: new Date().toISOString().slice(0, 10),
  };

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
}*/
async function register(name, email, password, level) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = result.user;

  const user = {
    uid: firebaseUser.uid,
    name: (name || '').trim() || firebaseUser.email.split('@')[0] || 'Learner',
    email: firebaseUser.email,
    level: level || 'basic',
    joined: new Date(firebaseUser.metadata.creationTime).toISOString().slice(0, 10),
  };

  const userRef = doc(db, 'users', firebaseUser.uid);
  await setDoc(userRef, user);
  

  localStorage.setItem(LW_SESSION_KEY, JSON.stringify(user));
  return user;
}

/* ── LOG OUT ──────────────────────────────────────────────────────
 * REPLACE WITH FIREBASE: firebase.auth().signOut()
 * ──────────────────────────────────────────────────────────────── */
/*function logout(redirectPath) {
  localStorage.removeItem(LW_SESSION_KEY);
  window.location.href = redirectPath || '/index.html';
}*/
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
/*function requireAuth(loginPath) {
  if (!isLoggedIn()) {
    window.location.href = loginPath || '/index.html';
  }
}*/
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





