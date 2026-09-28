/**
 * admin-quiz.js — Controller for pages/admin-quiz.html
 * Read-only list of the HARDCODED Mastery Quizzes (one per mission, see
 * js/admin-content.js). No Firestore, no level. "View" shows the
 * question pool the quiz draws from, built by the same distractor logic
 * the learner quiz uses. To change a quiz, edit its mission's signs in
 * js/missions.js (or the distractor rules in js/lesson-loop.js).
 */
import { getQuizzes, getQuizPool, getChapters } from "./admin-content.js";

let allQuizzes = [];
const els = {};

function cacheEls() {
  els.tbody = document.getElementById("question-table-body");
  els.search = document.getElementById("question-search");
  els.chapterFilter = document.getElementById("question-chapter-filter");
  els.count = document.getElementById("question-count");

  els.modalBackdrop = document.getElementById("question-modal-backdrop");
  els.modalTitle = document.getElementById("question-modal-title");
  els.modalBody = document.getElementById("question-modal-body");
  els.modalClose = document.getElementById("question-modal-close");
  els.modalDone = document.getElementById("question-modal-done");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function render() {
  const term = els.search.value.trim().toLowerCase();
  const chapter = els.chapterFilter.value;

  const rows = allQuizzes.filter((q) => {
    if (chapter && q.chapterId !== chapter) return false;
    if (!term) return true;
    return q.title.toLowerCase().includes(term) || q.chapterTitle.toLowerCase().includes(term);
  });

  els.count.textContent = `${rows.length} of ${allQuizzes.length} quizzes`;

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">No quizzes match your search.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = rows.map((q) => `
    <tr>
      <td class="admin-table__title">${escapeHtml(q.title)} Mastery Quiz</td>
      <td class="admin-table__muted">${escapeHtml(q.chapterTitle)}</td>
      <td class="admin-table__muted">${q.signCount}</td>
      <td class="admin-table__muted">${q.questionCount}</td>
      <td class="admin-table__actions">
        <button class="btn btn--ghost btn--sm" data-view="${escapeHtml(q.missionId)}" type="button">View</button>
      </td>
    </tr>
  `).join("");
}

function fillChapterFilter() {
  const options = getChapters()
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`)
    .join("");
  els.chapterFilter.innerHTML = `<option value="">All chapters</option>${options}`;
}

function openModal(missionId) {
  const quiz = allQuizzes.find((q) => q.missionId === missionId);
  if (!quiz) return;
  const pool = getQuizPool(missionId);

  els.modalTitle.textContent = `${quiz.title} Mastery Quiz`;
  els.modalBody.innerHTML = `
    <p class="text-muted">
      Each attempt asks &ldquo;What does this sign mean?&rdquo; for up to ${quiz.questionCount}
      of the ${quiz.signCount} signs below, in a random order. Correct answer is marked.
    </p>
    <ol>
      ${pool.map((q) => `
        <li style="margin-bottom: var(--space-3);">
          <strong>${escapeHtml(q.answerTitle)}</strong>
          <div class="text-muted">
            ${q.options.map((o) => o.correct
              ? `<strong>${escapeHtml(o.title)} &#10003;</strong>`
              : escapeHtml(o.title)).join(" &middot; ")}
          </div>
        </li>
      `).join("")}
    </ol>
  `;
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
}

function wireEvents() {
  els.search.addEventListener("input", render);
  els.chapterFilter.addEventListener("change", render);
  els.tbody.addEventListener("click", (e) => {
    const id = e.target.closest("[data-view]")?.dataset.view;
    if (id) openModal(id);
  });
  els.modalClose.addEventListener("click", closeModal);
  els.modalDone.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (e) => { if (e.target === els.modalBackdrop) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.modalBackdrop.hidden) closeModal();
  });
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  cacheEls();
  try {
    allQuizzes = getQuizzes();
    fillChapterFilter();
    wireEvents();
    render();
  } catch (err) {
    console.error("Failed to load quizzes:", err);
    els.tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Couldn't load the quiz content (js/missions.js).</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
