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
 */
'use strict';

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/** Fills #level-name from ?level=, same param quiz.js's post-final-
 *  assessment CTA already supplies. Falls back to a generic label
 *  rather than a fabricated/stale content description if the param is
 *  missing (e.g. someone reaches this page via the sidebar link with
 *  no query string at all). */
function initLevelName() {
  const level = new URLSearchParams(window.location.search).get('level');
  const el = document.getElementById('level-name');
  if (el) el.textContent = level ? `${cap(level)} Level` : 'this level';
}

const REQUIRED_QUESTIONS = ['q1', 'q2', 'q3', 'q4'];

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
  question?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

window.submitSurvey = async function () {
  const missing = findFirstMissingRequired();
  if (missing) {
    window.LinguaWave?.showToast?.('Please answer every question before submitting.', 'error');
    scrollToQuestion(missing);
    return;
  }

  const answers = {
    q1: document.querySelector('input[name="q1"]:checked')?.value ?? null,
    q2: document.querySelector('input[name="q2"]:checked')?.value ?? null,
    q3: document.querySelector('input[name="q3"]:checked')?.value ?? null,
    q4: document.querySelector('input[name="q4"]:checked')?.value ?? null,
    q5: document.getElementById('q5-text')?.value?.trim() || null,
  };

  const level = new URLSearchParams(window.location.search).get('level') || 'unknown';
  const btn = document.getElementById('btn-submit-survey');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const auth = window.LWAuth;
    const user = auth?.getCurrentUser?.();
    // Auth-gated page (requireAuth() runs on load) — a missing user
    // here would mean the session expired mid-form, not a normal path.
    const uid = user?.uid ?? user?.email ?? 'anonymous';
    if (auth?.db && auth?.doc && auth?.setDoc) {
      const surveyId = `${uid}_${level}_${Date.now()}`;
      const surveyRef = auth.doc(auth.db, 'surveys', surveyId);
      await auth.setDoc(surveyRef, {
        userId: uid,
        level,
        answers,
        submittedAt: new Date().toISOString(),
      });
    } else {
      // Defensive fallback only — pages/feedback.html always loads
      // auth.js, so this shouldn't happen in practice.
      console.warn('[feedback.js] window.LWAuth Firestore handles unavailable — answers not persisted:', answers);
    }
    window.LinguaWave?.showToast?.('Thanks for your feedback! 🎉', 'success');
  } catch (err) {
    console.error('[feedback.js] Firestore write failed:', err);
    window.LinguaWave?.showToast?.('Could not submit feedback — please try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Feedback & Continue'; }
    return;
  }

  setTimeout(() => { window.location = 'dashboard.html'; }, 900);
};

document.addEventListener('DOMContentLoaded', initLevelName);