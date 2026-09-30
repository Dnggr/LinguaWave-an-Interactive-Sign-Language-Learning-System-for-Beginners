/**
 * feedback.js — Survey Submission
 * CONNECTS : pages/feedback.html
 * PURPOSE  : Collects survey answers, validates required fields, writes
 *            to Firestore collection "surveys", then redirects.
 *
 * REV (this session) — closed out the 3 TODOs this file's own header
 * comment (and CLAUDE_TASKS.md's "Dynamic Level Name & Survey
 * Validation / Firestore Write" item) had flagged as open:
 *   1. #level-name was a hardcoded "Basic — A–Z Alphabet" string in
 *      pages/feedback.html regardless of which level was actually
 *      completed — now read from `?level=` (same param quiz.js's
 *      isFinal branch already puts on the `feedback.html?level=X` link
 *      it builds) and filled in on load, same pattern main.js's own
 *      initUserDetails() uses for [data-user-*] placeholders.
 *   2. No validation — submitSurvey() used to read whatever was
 *      checked (or wasn't) and log it. Q1–Q4 are required (radiogroups,
 *      per pages/feedback.html); Q5 stays optional (plain textarea).
 *      A missing required question now blocks submit, scrolls to it,
 *      and shows a toast — via window.LinguaWave.showToast(), the same
 *      helper lesson.js already uses, no new mechanism.
 *   3. Answers only ever hit console.log — now written to Firestore
 *      via window.LWAuth's already-exported `db`/`doc`/`setDoc` (see
 *      js/auth.js's EXPORTS block — no new Firebase imports needed).
 *      No `addDoc`/`collection` export exists on window.LWAuth, so a
 *      deterministic doc id (`${uid}_${level}_${timestamp}`) is used
 *      with `doc()`+`setDoc()` instead — avoids touching auth.js at
 *      all, matching this repo's established "auth.js stays untouched
 *      unless the task actually requires it" convention (see
 *      AI_MEMORY.md's session log — multiple prior sessions left it
 *      alone on purpose).
 *
 * REV (feedback -> admin panel) — item 3 above had silently regressed:
 *   auth.js's SECURITY pass removed `db`/`doc`/`setDoc` from
 *   window.LWAuth, so the `if (auth?.db && ...)` guard below fell into
 *   its "unavailable" branch, skipped the write and STILL showed the
 *   success toast + redirected. No survey has been persisted since.
 *   Now:
 *   - This file is an ES module (feedback.html loads it with
 *     type="module") and imports auth/db/doc/getDoc/setDoc from
 *     ./auth.js — the same module instance the page's own auth.js tag
 *     loads, so there is still exactly ONE Firebase initialisation.
 *   - Identity comes from Firebase's LIVE user (auth.currentUser), never
 *     the editable localStorage session cache. Name comes from
 *     users/{uid}; uid/email from Firebase itself. firestore.rules
 *     enforces userId == auth.uid and userEmail == auth token email.
 *   - A missing user or failed write is an ERROR: no success toast, no
 *     redirect, button restored. The old silent "not persisted" path is
 *     gone.
 *   - Level: ?level= if valid, else the learner's own profile level.
 *     (Nothing links here with ?level= any more, so every survey was
 *     being saved as "unknown".)
 *   - Double-submit guard: `inFlight`/`completed` flags set
 *     synchronously, and ONE document id per page load reused on retry.
 *   Admin side: js/admin-feedback.js reads these documents.
 */
'use strict';

import { auth, db, doc, getDoc, setDoc } from './auth.js';

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/** Fills #level-name from ?level=, same param quiz.js's post-final-
 *  assessment CTA already supplies. Falls back to a generic label
 *  rather than a fabricated/stale content description if the param is
 *  missing (e.g. someone reaches this page via the sidebar link with
 *  no query string at all). */
function initLevelName() {
  const level = levelFromQuery();
  const el = document.getElementById('level-name');
  if (el) el.textContent = level ? `${cap(level)} Level` : 'this level';
}

const REQUIRED_QUESTIONS = ['q1', 'q2', 'q3', 'q4'];
// Must match SURVEY_LEVELS in js/survey-schema.js and the `level in [...]`
// check in firestore.rules.
const VALID_LEVELS = ['basic', 'medium', 'intermediate'];
const MAX_COMMENT_LENGTH = 2000;   // also enforced by firestore.rules
const MAX_NAME_LENGTH = 60;        // also enforced by firestore.rules
const SLOW_WRITE_HINT_MS = 15000;

// ── double-submit state ─────────────────────────────────────────
// inFlight: set synchronously on the first click, before any await, so a
//   second click / touch / repeated event in the same tick sees it.
// completed: stays true through the post-success redirect delay so a
//   click during that window can't write a second document.
// attempt: the doc id for THIS page load. A retry after a failed write
//   reuses it, so a write that actually landed can't be duplicated.
//   (surveys are create-only in firestore.rules, so a same-id rewrite is
//   rejected rather than overwritten.) A different level = a different
//   page load = a different id, so per-level feedback is unaffected.
let inFlight = false;
let completed = false;
let attempt = null;

function levelFromQuery() {
  const raw = new URLSearchParams(window.location.search).get('level');
  const level = (raw || '').trim().toLowerCase();
  return VALID_LEVELS.includes(level) ? level : null;
}

/** Returns the first unanswered required question's name, or null if
 *  every required radiogroup has a checked option. */
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

/** Firebase's own signed-in user, after it has finished restoring the
 *  session. NOT the localStorage cache (editable in DevTools). */
async function getLiveUser() {
  if (typeof auth.authStateReady === 'function') await auth.authStateReady();
  return auth.currentUser;
}

/** Display name + fallback level from users/{uid}. A failed profile read
 *  must not block feedback, so it degrades to Firebase's own fields. */
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
  // Synchronous lock FIRST — before validation or any await.
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
  // Slow network: keep the button locked (no failure, no re-enable) and say
  // so, rather than inviting a second click while the first write is pending.
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
    return; // no redirect
  }

  // Firestore has acknowledged the write — only now do we celebrate + leave.
  clearTimeout(slowTimer);
  completed = true;
  inFlight = false;
  toast('Thanks for your feedback!', 'success');
  if (btn) btn.textContent = 'Thank you!';
  // Post-submit redirect: dashboard.html is in the same directory.
  setTimeout(() => { window.location = 'dashboard.html'; }, 900);
};

/* Q5 auto-grow fallback. Browsers with `field-sizing: content` (see
 * feedback.css) resize the box themselves, so this only runs where that is
 * unsupported. Resets to `auto` first so the box also SHRINKS when text is
 * deleted; the CSS min-height / max-height still clamp the result. */
function initCommentAutoGrow() {
  var box = document.getElementById('q5-text');
  if (!box || (window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) return;
  function fit() {
    box.style.height = 'auto';
    box.style.height = box.scrollHeight + 2 + 'px'; // +2 = the 1px top/bottom border
  }
  box.addEventListener('input', fit);
  fit();
}

document.addEventListener('DOMContentLoaded', initLevelName);
document.addEventListener('DOMContentLoaded', initCommentAutoGrow);