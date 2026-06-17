/**
 * feedback.js — Survey Submission
 * CONNECTS : pages/feedback.html
 * PURPOSE  : Collects survey answers and (TODO) writes to Firestore.
 * TODO     : Gather all radio/textarea values, validate required fields,
 *            write to Firestore collection "surveys".
 *            Redirect to dashboard.html on success.
 */
'use strict';

window.submitSurvey = function() {
  const answers = {
    q1: document.querySelector('input[name="q1"]:checked')?.value,
    q2: document.querySelector('input[name="q2"]:checked')?.value,
    q3: document.querySelector('input[name="q3"]:checked')?.value,
    q4: document.querySelector('input[name="q4"]:checked')?.value,
    q5: document.getElementById('q5-text')?.value,
  };
  console.log('Survey answers (TODO: write to Firestore):', answers);
  // TODO: write to Firestore, then:
  window.location = 'dashboard.html';
};
