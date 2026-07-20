/**
 * main.js — Global JavaScript Controller
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Shared utilities and UI behaviours that run on every
 *            page: active nav link highlighting, progress-bar
 *            animation, badge rendering, and user-detail rendering
 *            (name/email/level pulled from js/auth.js's session).
 *
 * CONNECTS : Loaded by index.html and all pages/*.html via
 *            <script src="../js/main.js"> (or ./js/main.js from root).
 *            Requires js/auth.js to be loaded first on every page.
 *
 * TODO     : Replace MOCK_PROGRESS with a real Firestore read once
 *            Firestore is wired in. Identity already comes from
 *            auth.js — see auth.js for the Firebase Auth handoff.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── MOCK PROGRESS DATA (remove when Firestore is live) ──────────── */
/*
 * Identity (name / email / level) now comes from js/auth.js's session
 * — see getActiveUser() below. This object only simulates *progress*,
 * since that will live in Firestore under users/{uid}.progress.
 * TODO: replace with a Firestore document read keyed by uid.
 */
const MOCK_PROGRESS = {
  basic:        { completed: 5, total: 26 },   // A–Z alphabet
  medium:       { completed: 0, total: 10 },   // Basic words
  intermediate: { completed: 0, total: 8  },   // Full sentences
};

/* ── ACTIVE USER: merge real session with mock progress ──────────── */
/*
 * Reads the logged-in user from js/auth.js (window.LWAuth). Every
 * protected page should already have run requireAuth(), so this
 * should never be null in practice — the fallback just keeps pages
 * from crashing if auth.js hasn't loaded for some reason.
 */
function getActiveUser() {
  const session = window.LWAuth?.getCurrentUser?.();
  return {
    name:  session?.name  || 'Guest',
    email: session?.email || '',
    level: session?.level || 'basic',
    joined: session?.joined || '',
    progress: MOCK_PROGRESS,
  };
}


/* ── UTILITY: get current page filename ─────────────────────────── */
function currentPage() {
  const path = window.location.pathname;
  return path.split('/').pop() || 'index.html';
}


/* ── NAVBAR: mark active link ────────────────────────────────────── */
/*
 * Adds .active class to the navbar link whose href matches the
 * current page so the user knows where they are.
 */
function initActiveNav() {
  const page = currentPage();
  document.querySelectorAll('.navbar__links a').forEach(link => {
    if (link.getAttribute('href') === page ||
        link.getAttribute('href') === `./${page}` ||
        link.getAttribute('href') === `pages/${page}`) {
      link.classList.add('active');
    }
  });
}


/* ── PROGRESS BARS: animate fill on page load ────────────────────── */
/*
 * Reads [data-progress="0-100"] on any .progress-bar__fill element
 * and sets the width so the CSS transition plays on load.
 * TODO: replace hardcoded data attributes with values from Firestore.
 */
function initProgressBars() {
  document.querySelectorAll('.progress-bar__fill[data-progress]').forEach(el => {
    const pct = Math.min(100, Math.max(0, parseInt(el.dataset.progress, 10)));
    // Defer to next frame so transition fires
    requestAnimationFrame(() => { el.style.width = `${pct}%`; });
  });
}


/* ── LEVEL CARDS: lock / unlock based on user progress ──────────── */
/*
 * Finds .level-card elements with [data-level] and toggles a
 * .level-card--locked class when the level hasn't been unlocked yet.
 *
 * Basic, Medium, and Intermediate are all open to every learner —
 * only a level in UNLOCKED_LEVELS' complement (i.e. a future
 * "advanced" tier) stays gated behind progress. TODO: read real
 * unlock conditions from Firestore once that tier ships.
 */
const UNLOCKED_LEVELS = ['basic', 'medium', 'intermediate'];

function initLevelCards() {
  document.querySelectorAll('.level-card[data-level]').forEach(card => {
    if (!UNLOCKED_LEVELS.includes(card.dataset.level)) {
      card.classList.add('level-card--locked');
      card.querySelector('.btn')?.setAttribute('disabled', 'true');
    }
  });
}


/* ── TOAST NOTIFICATIONS ─────────────────────────────────────────── */
/*
 * showToast(message, type)
 * Programmatically displays a slide-in notification at the bottom
 * of the screen.  type: 'success' | 'error' | 'info'
 * Used by lesson.js and quiz.js to give feedback.
 */
function showToast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation then auto-remove
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}


/* ── MODAL HELPER ────────────────────────────────────────────────── */
/*
 * openModal(id) / closeModal(id)
 * Shows/hides a <dialog id="…"> element.
 * Used by lesson.js to show video demos.
 * TODO: trap focus inside modal for accessibility.
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.showModal?.() || modal.setAttribute('open', '');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.close?.() || modal.removeAttribute('open');
}


/* ── SIGN CARD FLIP (alphabet grid) ─────────────────────────────── */
/*
 * Adds click-to-flip behaviour to .sign-card elements.
 * Front face: the sign image.  Back face: letter + meaning.
 * Used on pages/learn.html and pages/lesson.html.
 */
function initSignCards() {
  document.querySelectorAll('.sign-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('sign-card--flipped');
    });
    // Keyboard accessibility
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('sign-card--flipped');
      }
    });
  });
}


/* ── NAVBAR / USER DETAILS: fill in placeholders from the session ──
 * Any element with [data-user-name], [data-user-email],
 * [data-user-level], or [data-user-joined] gets its text filled in.
 * Any element with [data-logout="relative/path/to/index.html"]
 * gets wired to call LWAuth.logout() instead of needing an href.
 * Used by the navbar greeting on every page and the "Your Account"
 * card on the dashboard.
 */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function initUserDetails() {
  const user = getActiveUser();

  document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = user.name; });
  document.querySelectorAll('[data-user-email]').forEach(el => { el.textContent = user.email; });
  document.querySelectorAll('[data-user-level]').forEach(el => { el.textContent = capitalize(user.level); });
  document.querySelectorAll('[data-user-joined]').forEach(el => { el.textContent = user.joined || '—'; });
  document.querySelectorAll('[data-user-initial]').forEach(el => { el.textContent = (user.name || '?').charAt(0).toUpperCase(); });

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      window.LWAuth?.logout(btn.dataset.logout);
    });
  });
}


/* ── INIT ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNav();
  initProgressBars();
  initLevelCards();
  initSignCards();
  initUserDetails();
});


/* ── EXPORTS (for use by page-specific JS files) ─────────────────── */
window.LinguaWave = {
  getActiveUser,
  showToast,
  openModal,
  closeModal,
};