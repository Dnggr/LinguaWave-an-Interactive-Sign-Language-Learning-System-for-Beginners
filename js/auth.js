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
'use strict';

const LW_SESSION_KEY = 'lw_session';

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
function login(email, password) {
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
}

/* ── REGISTER ─────────────────────────────────────────────────────
 * REPLACE WITH FIREBASE: firebase.auth().createUserWithEmailAndPassword()
 *                         + Firestore write to users/{uid}
 *
 * BYPASS MODE: same as login — accepts any input, creates a session.
 * ──────────────────────────────────────────────────────────────── */
function register(name, email, password, level) {
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
}

/* ── LOG OUT ──────────────────────────────────────────────────────
 * REPLACE WITH FIREBASE: firebase.auth().signOut()
 * ──────────────────────────────────────────────────────────────── */
function logout(redirectPath) {
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
  if (!isLoggedIn()) {
    window.location.href = loginPath || '/index.html';
  }
}

function redirectIfLoggedIn(dashboardPath) {
  if (isLoggedIn()) {
    window.location.href = dashboardPath || 'pages/dashboard.html';
  }
}

/* ── EXPORTS ──────────────────────────────────────────────────────
 * Exposed as window.LWAuth so plain <script> tags (no bundler) can
 * use it from any page.
 * ──────────────────────────────────────────────────────────────── */
window.LWAuth = {
  getCurrentUser,
  isLoggedIn,
  login,
  register,
  logout,
  requireAuth,
  redirectIfLoggedIn,
};
