/**
 * quiz.js — Assessment Logic
 * CONNECTS : pages/quiz.html
 * PURPOSE  : Manages question flow, tracks score, shows results.
 * TODO     : Fetch questions from Firestore "questions" collection.
 *            On pass (score >= 0.8): save to Firestore user.progress.
 *            On fail: show retry modal linking back to lesson.html.
 *            On level complete: redirect to feedback.html.
 */
'use strict';

let selectedOption = null;

window.selectOption = function(btn) {
  document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('quiz-option--selected'));
  btn.classList.add('quiz-option--selected');
  selectedOption = btn.dataset.option;
  document.getElementById('btn-submit').removeAttribute('disabled');
};

window.submitAnswer = function() {
  // TODO: real answer check against Firestore question.correctId
  const correct = 'F'; // hardcoded placeholder
  document.querySelectorAll('.quiz-option').forEach(btn => {
    if (btn.dataset.option === correct) btn.classList.add('quiz-option--correct');
    else if (btn.dataset.option === selectedOption) btn.classList.add('quiz-option--wrong');
    btn.setAttribute('disabled', '');
  });
  document.getElementById('btn-submit').textContent = 'Next Question →';
  document.getElementById('btn-submit').onclick = () => showResults();
};

window.showResults = function() {
  document.getElementById('question-card').style.display = 'none';
  document.getElementById('results-card').style.display = 'block';
  // TODO: compute real score from answered questions array
};
