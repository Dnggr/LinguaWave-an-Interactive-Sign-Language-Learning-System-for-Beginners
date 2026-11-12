'use strict';

import { auth, db, doc, getDoc, setDoc } from './auth.js';

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function initLevelName() {
  const level = levelFromQuery();
  const el = document.getElementById('level-name');
  if (el) el.textContent = level ? `${cap(level)} Level` : 'this level';
}

const REQUIRED_QUESTIONS = ['q1', 'q2', 'q3', 'q4'];
const VALID_LEVELS = ['basic', 'medium', 'intermediate'];
const MAX_COMMENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 60;
const SLOW_WRITE_HINT_MS = 15000;

let inFlight = false;
let completed = false;
let attempt = null;

function levelFromQuery() {
  const raw = new URLSearchParams(window.location.search).get('level');
  const level = (raw || '').trim().toLowerCase();
  return VALID_LEVELS.includes(level) ? level : null;
}

function findFirstMissingRequired() {
  return REQUIRED_QUESTIONS.find(
    name => !document.querySelector(`input[name="${name}"]:checked`)
  ) ?? null;
}

function scrollToQuestion(name) {
  const input = document.querySelector(`input[name="${name}"]`);
  const question = input?.closest('.survey__question');
  question?.scrollIntoView({ behavior: (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || document.documentElement?.classList?.contains('lw-force-reduced-motion')) ? 'auto' : 'smooth', block: 'center' });
}

function toast(message, type) {
  window.LinguaWave?.showToast?.(message, type);
}

async function getLiveUser() {
  if (typeof auth.authStateReady === 'function') await auth.authStateReady();
  return auth.currentUser;
}

async function readProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : {};
  } catch (err) {
    console.warn('[feedback.js] Could not read users/' + uid + ' — using Firebase profile fields:', err);
    return {};
  }
}

function collectAnswers() {
  const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
  const comment = (document.getElementById('q5-text')?.value ?? '').trim().slice(0, MAX_COMMENT_LENGTH);
  return {
    q1: radio('q1'),
    q2: radio('q2'),
    q3: radio('q3'),
    q4: radio('q4'),
    q5: comment || null,
  };
}

function errorMessageFor(err) {
  if (err?.code === 'lw/not-signed-in') return 'Your session has expired. Please log in again.';
  if (err?.code === 'permission-denied') return 'Feedback could not be saved for this account. Please log in again and retry.';
  return 'Could not submit feedback. Please try again.';
}

window.submitSurvey = async function () {
  if (inFlight || completed) return;

  const missing = findFirstMissingRequired();
  if (missing) {
    toast('Please answer every question before submitting.', 'error');
    scrollToQuestion(missing);
    return;
  }

  inFlight = true;
  const btn = document.getElementById('btn-submit-survey');
  const originalLabel = btn ? btn.textContent.trim() : 'Submit Feedback & Continue';
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  const slowTimer = setTimeout(() => {
    if (btn && inFlight) btn.textContent = 'Still submitting… check your connection';
  }, SLOW_WRITE_HINT_MS);

  try {
    const user = await getLiveUser();
    if (!user) {
      const e = new Error('No signed-in Firebase user.');
      e.code = 'lw/not-signed-in';
      throw e;
    }

    const profile = await readProfile(user.uid);
    const email = user.email || '';
    const name = String(profile.name || user.displayName || email.split('@')[0] || 'Learner')
      .trim().slice(0, MAX_NAME_LENGTH);
    const level = levelFromQuery()
      || (VALID_LEVELS.includes(profile.level) ? profile.level : 'basic');

    if (!attempt || attempt.uid !== user.uid || attempt.level !== level) {
      attempt = { uid: user.uid, level, id: `${user.uid}_${level}_${Date.now()}` };
    }

    await setDoc(doc(db, 'surveys', attempt.id), {
      userId: user.uid,
      userName: name,
      userEmail: email,
      level,
      answers: collectAnswers(),
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    clearTimeout(slowTimer);
    console.error('[feedback.js] Feedback submit failed:', err);
    toast(errorMessageFor(err), 'error');
    inFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    return;
  }

  clearTimeout(slowTimer);
  completed = true;
  inFlight = false;
  toast('Thanks for your feedback!', 'success');
  if (btn) btn.textContent = 'Thank you!';
  setTimeout(() => { window.location = 'dashboard.html'; }, 900);
};

function initCommentAutoGrow() {
  var box = document.getElementById('q5-text');
  if (!box || (window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) return;
  function fit() {
    box.style.height = 'auto';
    box.style.height = box.scrollHeight + 2 + 'px';
  }
  box.addEventListener('input', fit);
  fit();
}

document.addEventListener('DOMContentLoaded', initLevelName);
document.addEventListener('DOMContentLoaded', initCommentAutoGrow);
