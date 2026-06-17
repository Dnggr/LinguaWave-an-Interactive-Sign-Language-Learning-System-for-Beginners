/**
 * main.js — Global JavaScript Controller
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Shared utilities and UI behaviours that run on every
 *            page: active nav link highlighting, progress-bar
 *            animation, badge rendering, and mock user-state
 *            management (placeholder until Firebase Auth is wired).
 *
 * CONNECTS : Loaded by index.html and all pages/*.html via
 *            <script src="../js/main.js"> (or ./js/main.js from root).
 *
 * TODO     : Replace MOCK_USER and all localStorage calls with real
 *            Firebase Auth + Firestore reads once authentication is
 *            implemented.  See auth.js for the auth layer.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── MOCK USER STATE (remove when Firebase is live) ──────────────── */
/*
 * Simulates a logged-in user so the static UI can render personalised
 * content without a backend.  Replace with a Firestore document read.
 */
const MOCK_USER = {
  name: 'Alex',
  level: 'basic',           // 'basic' | 'medium' | 'intermediate'
  progress: {               // lesson completion by level
    basic:        { completed: 5, total: 26 },   // A–Z alphabet
    medium:       { completed: 0, total: 10 },   // Basic words
    intermediate: { completed: 0, total: 8  },   // Full sentences
  },
};


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
 * TODO: read unlock conditions from Firestore instead of MOCK_USER.
 */
function initLevelCards() {
  const levelOrder = ['basic', 'medium', 'intermediate'];
  const userLevelIndex = levelOrder.indexOf(MOCK_USER.level);

  document.querySelectorAll('.level-card[data-level]').forEach(card => {
    const cardIndex = levelOrder.indexOf(card.dataset.level);
    if (cardIndex > userLevelIndex) {
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


/* ── INIT ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNav();
  initProgressBars();
  initLevelCards();
  initSignCards();
});


/* ── EXPORTS (for use by page-specific JS files) ─────────────────── */
window.LinguaWave = {
  MOCK_USER,
  showToast,
  openModal,
  closeModal,
};
