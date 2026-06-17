/**
 * learn.js — Lesson Selector Logic
 * CONNECTS : pages/learn.html
 * PURPOSE  : Reads ?level= URL param, activates the correct tab,
 *            and (TODO) fetches + renders lesson cards from Firestore.
 * TODO     : Replace static HTML lesson cards with dynamic render
 *            from Firestore "lessons" collection.
 */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.level-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('level-tab--active'));
      tab.classList.add('level-tab--active');
      // TODO: re-render lesson grid for selected level from Firestore
    });
  });
});
