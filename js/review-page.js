/**
 * js/review-page.js — Review Later page controller
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Drives pages/review.html's three view-states — Review
 *            Today, Review Session, Review Results — plus the
 *            Mistake Review card on the Today view. Reads from
 *            window.LWReview (due/confidence/mistake state) and
 *            window.LWProgress (the pool of actually-learned signs)
 *            + window.LWData (titles/images/descriptions).
 *
 * CONNECTS : pages/review.html only. Loaded last, NOT deferred —
 *            same load-order convention as js/progress-page.js
 *            (see that file for why: this only registers a
 *            DOMContentLoaded-timed boot, so it's safe to run before
 *            the deferred engine scripts finish).
 *
 * LOADING / FAILURE: same whenProgressReady()/whenReviewReady() race
 *            + timeout pattern as js/dashboard.js and
 *            js/progress-page.js — if either engine hangs (e.g.
 *            Firebase import fails), fall back to an empty-but-
 *            functional state rather than a stuck spinner.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

const REVIEW_READY_TIMEOUT_MS = 6000;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

/** Every learned sign, as { level, category, signId } entries — mirrors
 *  progress-page.js's own reuse of window.LWProgress.getAllLearnedSigns(). */
function learnedSignEntries() {
  return (window.LWProgress?.getAllLearnedSigns?.() || []).filter((e) => e?.signId && e?.level);
}

function findEntryForSign(signId) {
  return learnedSignEntries().find((e) => e.signId === signId) || null;
}

/* ── VIEW SWITCHING ────────────────────────────────────────────── */
function showView(viewId) {
  document.querySelectorAll('[data-review-view]').forEach((el) => {
    el.hidden = el.id !== viewId;
  });
}

/* ── VIEW 1 — REVIEW TODAY ─────────────────────────────────────── */
let sessionQueue = [];
let sessionIndex = 0;
const sessionOutcomes = { strong: 0, needsPractice: 0, notRemembered: 0 };

function renderReviewToday() {
  const listEl = document.getElementById('review-today-list');
  const subtextEl = document.getElementById('review-today-subtext');
  const startBtn = document.getElementById('btn-start-review-session');
  const sidebarCount = document.getElementById('review-sidebar-count');
  if (!listEl || !window.LWReview) return;

  const entries = learnedSignEntries();
  const knownSignIds = entries.map((e) => e.signId);
  const due = window.LWReview.getDueSigns(knownSignIds);

  if (sidebarCount) {
    if (due.length > 0) { sidebarCount.textContent = String(due.length); sidebarCount.style.display = ''; }
    else { sidebarCount.style.display = 'none'; }
  }

  if (due.length === 0) {
    subtextEl.textContent = "You're all caught up! No signs need review.";
    listEl.innerHTML = '<p class="text-muted" style="padding: var(--space-4);">Nothing due right now — check back later.</p>';
    startBtn.disabled = true;
    return;
  }

  subtextEl.textContent = `${due.length} sign${due.length === 1 ? '' : 's'} ready to review.`;
  startBtn.disabled = false;

  listEl.innerHTML = due.map((signId) => {
    const entry = findEntryForSign(signId);
    const title = entry ? (window.LWData?.getSign?.(entry.level, signId)?.title ?? signId) : signId;
    const rec = window.LWReview.getSignRecord(signId);
    const status = window.LWReview.getRecencyStatus(signId);
    const lastReviewed = rec?.lastReviewedAt
      ? new Date(rec.lastReviewedAt).toLocaleDateString()
      : 'Not reviewed yet';
    return `
      <div class="review-row">
        <span class="review-row__status-dot review-row__status-dot--${status}" aria-hidden="true"></span>
        <span class="review-row__title">${escapeHtml(title)}</span>
        <span class="review-row__meta">${escapeHtml(lastReviewed)}</span>
      </div>`;
  }).join('');

  sessionQueue = due;
}

function renderMistakeReview() {
  const listEl = document.getElementById('mistake-review-list');
  const subtextEl = document.getElementById('mistake-review-subtext');
  if (!listEl || !window.LWReview) return;

  const knownSignIds = learnedSignEntries().map((e) => e.signId);
  const mistakes = window.LWReview.getMistakes(knownSignIds);

  if (mistakes.length === 0) {
    subtextEl.textContent = 'No missed signs right now — nice work.';
    listEl.innerHTML = '<p class="text-muted" style="padding: var(--space-4);">No missed signs right now — nice work.</p>';
    return;
  }

  subtextEl.textContent = `You missed ${mistakes.length} sign${mistakes.length === 1 ? '' : 's'} recently.`;
  listEl.innerHTML = mistakes.map((signId) => {
    const entry = findEntryForSign(signId);
    const title = entry ? (window.LWData?.getSign?.(entry.level, signId)?.title ?? signId) : signId;
    const count = window.LWReview.getSignRecord(signId)?.incorrectCount || 0;
    const href = entry
      ? `lesson.html?level=${encodeURIComponent(entry.level)}&category=${encodeURIComponent(entry.category)}&sign=${encodeURIComponent(signId)}`
      : '#';
    return `
      <div class="mistake-row">
        <span class="mistake-row__title">${escapeHtml(title)}</span>
        <span class="mistake-row__count">Missed ${count}×</span>
        <a class="btn btn--secondary btn--sm" href="${href}">↺ Review again</a>
      </div>`;
  }).join('');
}

/* ── VIEW 2 — REVIEW SESSION ───────────────────────────────────── */
function startReviewSession() {
  if (sessionQueue.length === 0) return;
  sessionIndex = 0;
  sessionOutcomes.strong = 0;
  sessionOutcomes.needsPractice = 0;
  sessionOutcomes.notRemembered = 0;
  showView('view-review-session');
  showSessionSign();
}

function showSessionSign() {
  const signId = sessionQueue[sessionIndex];
  const entry = findEntryForSign(signId);
  const sign = entry ? window.LWData?.getSign?.(entry.level, signId) : null;

  document.getElementById('review-session-counter').textContent = `Sign ${sessionIndex + 1} of ${sessionQueue.length}`;
  document.getElementById('review-session-title').textContent = `Review: ${sign?.title || signId}`;
  document.getElementById('review-session-description').textContent = sign?.description || '';

  const img = document.getElementById('review-session-image');
  if (sign?.imageUrl) { img.src = sign.imageUrl; img.style.display = ''; }
  else { img.style.display = 'none'; }

  document.querySelectorAll('.confidence-scale__btn').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
}

function handleConfidencePick(confidence) {
  const signId = sessionQueue[sessionIndex];
  window.LWReview.recordReviewOutcome(signId, confidence);

  if (confidence >= 3) sessionOutcomes.strong += 1;
  else if (confidence === 2) sessionOutcomes.needsPractice += 1;
  else sessionOutcomes.notRemembered += 1;

  sessionIndex += 1;
  if (sessionIndex >= sessionQueue.length) {
    showReviewResults();
  } else {
    showSessionSign();
  }
}

/* ── VIEW 3 — REVIEW RESULTS ───────────────────────────────────── */
function showReviewResults() {
  showView('view-review-results');
  document.getElementById('review-results-subtext').textContent = `You reviewed ${sessionQueue.length} sign${sessionQueue.length === 1 ? '' : 's'}.`;
  document.getElementById('review-results-strong').textContent = String(sessionOutcomes.strong);
  document.getElementById('review-results-needs-practice').textContent = String(sessionOutcomes.needsPractice);
  document.getElementById('review-results-not-remembered').textContent = String(sessionOutcomes.notRemembered);
}

/* ── BOOT ──────────────────────────────────────────────────────── */
async function boot() {
  await Promise.all([
    withTimeout(window.LWProgress?.whenProgressReady?.() ?? Promise.resolve(), REVIEW_READY_TIMEOUT_MS),
    withTimeout(window.LWReview?.whenReviewReady?.() ?? Promise.resolve(), REVIEW_READY_TIMEOUT_MS),
  ]);

  renderReviewToday();
  renderMistakeReview();
  showView('view-review-today');

  document.getElementById('btn-start-review-session')?.addEventListener('click', startReviewSession);
  document.querySelectorAll('.confidence-scale__btn').forEach((btn) => {
    btn.addEventListener('click', () => handleConfidencePick(Number(btn.dataset.confidence)));
  });
}

document.addEventListener('DOMContentLoaded', boot);
