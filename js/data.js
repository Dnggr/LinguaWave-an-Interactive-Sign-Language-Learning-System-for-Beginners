/**
 * data.js — Hardcoded Learning Content
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Since there is no admin upload panel, signs and quiz
 *            questions are edited directly here by the dev team.
 *            This mirrors the shape of the planned Firestore
 *            collections (see SYSTEM_ARCHITECTURE.md §5) so swapping
 *            this file for real Firestore reads later is a drop-in
 *            replacement, not a rewrite.
 *
 * CONNECTS : Not yet wired into js/learn.js / js/lesson.js / js/quiz.js
 *            (those still render static HTML for now). Once you're
 *            ready, loop over SIGNS / QUESTIONS instead of hand-coding
 *            each <div> in the .html files.
 *
 * EDITING  : To add a new sign or question, just add another object
 *            to the array below — no upload form, no Storage bucket.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

/* ── SIGNS ────────────────────────────────────────────────────────
 * Mirrors Firestore signs/{id} — level, signId, title, description,
 * imageUrl, videoUrl, order.
 * ──────────────────────────────────────────────────────────────── */
const SIGNS = [
  {
    id: 'basic_A',
    level: 'basic',
    signId: 'A',
    title: 'Letter A',
    description: 'Make a fist with your thumb resting against the side of your index finger.',
    imageUrl: '../assets/images/basic/A.png',
    videoUrl: '../assets/videos/basic/A.mp4',
    order: 1,
  },
  {
    id: 'basic_B',
    level: 'basic',
    signId: 'B',
    title: 'Letter B',
    description: 'Hold your hand flat, fingers together pointing up, thumb folded across your palm.',
    imageUrl: '../assets/images/basic/B.png',
    videoUrl: '../assets/videos/basic/B.mp4',
    order: 2,
  },
  // TODO: add C–Z. Copy the shape above for each new letter.
];

/* ── QUESTIONS ────────────────────────────────────────────────────
 * Mirrors Firestore questions/{id} — level, relatedSign, prompt,
 * options, correctId, order.
 * ──────────────────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 'q_basic_A',
    level: 'basic',
    relatedSign: 'A',
    prompt: 'Which option shows the correct ASL hand sign for the letter A?',
    options: [
      { id: 'A', text: 'Fist, thumb resting on the side' },
      { id: 'B', text: 'Flat palm facing forward' },
      { id: 'C', text: 'Index finger pointing up alone' },
      { id: 'D', text: 'Open hand, fingers spread' },
    ],
    correctId: 'A',
    order: 1,
  },
  // TODO: add one or more questions per sign/lesson.
];

/* ── EXPORTS ─────────────────────────────────────────────────────── */
window.LWData = { SIGNS, QUESTIONS };
