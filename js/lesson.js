/**
 * lesson.js — Individual Lesson Viewer Logic
 * CONNECTS : pages/lesson.html
 * PURPOSE  : Reads ?level= and ?sign= URL params, loads sign data,
 *            handles NEXT/PREV navigation between signs.
 * TODO     : Fetch sign document from Firestore "signs" collection.
 *            Update lesson-counter and progress bar.
 *            On last sign, change NEXT button to "Go to Quiz".
 *            Track viewedSigns in Firestore user document.
 */
'use strict';
const SIGN_ORDER_BASIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

document.addEventListener('DOMContentLoaded', () => {
  const params  = new URLSearchParams(window.location.search);
  const level   = params.get('level') || 'basic';
  const sign    = params.get('sign')  || 'A';
  const order   = SIGN_ORDER_BASIC; // TODO: different order per level
  const idx     = order.indexOf(sign.toUpperCase());
  const total   = order.length;

  // Update counter
  const counter = document.getElementById('lesson-counter');
  if (counter) counter.textContent = `Sign ${idx + 1} of ${total}`;

  // Update progress bar
  const fill = document.getElementById('lesson-progress-fill');
  if (fill) fill.dataset.progress = Math.round(((idx + 1) / total) * 100);

  // Prev / Next button hrefs
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  if (btnPrev) {
    if (idx === 0) btnPrev.setAttribute('disabled', '');
    else btnPrev.onclick = () => window.location = `lesson.html?level=${level}&sign=${order[idx - 1]}`;
  }
  if (btnNext) {
    const isLast = idx === total - 1;
    if (isLast) {
      btnNext.textContent = 'Go to Quiz →';
      btnNext.onclick = () => window.location = `quiz.html?level=${level}`;
    } else {
      btnNext.onclick = () => window.location = `lesson.html?level=${level}&sign=${order[idx + 1]}`;
    }
  }
});
