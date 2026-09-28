/**
 * admin-lessons.js — Controller for pages/admin-lessons.html
 * Read-only list/search/filter of the HARDCODED lessons in js/missions.js
 * (via js/admin-content.js). No Firestore, no level. Click "View" to see
 * a lesson's full content. To change a lesson, edit missions.js.
 */
import { getLessons, getChapters } from "./admin-content.js";

let allLessons = [];
const els = {};

function cacheEls() {
  els.tbody = document.getElementById("sign-table-body");
  els.search = document.getElementById("sign-search");
  els.chapterFilter = document.getElementById("sign-chapter-filter");
  els.count = document.getElementById("sign-count");

  els.modalBackdrop = document.getElementById("sign-modal-backdrop");
  els.modalTitle = document.getElementById("sign-modal-title");
  els.modalBody = document.getElementById("sign-modal-body");
  els.modalClose = document.getElementById("sign-modal-close");
  els.modalDone = document.getElementById("sign-modal-done");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function render() {
  const term = els.search.value.trim().toLowerCase();
  const chapter = els.chapterFilter.value;

  const rows = allLessons.filter((s) => {
    if (chapter && s.chapterId !== chapter) return false;
    if (!term) return true;
    return (
      s.title.toLowerCase().includes(term) ||
      s.signId.toLowerCase().includes(term) ||
      s.missionTitle.toLowerCase().includes(term)
    );
  });

  els.count.textContent = `${rows.length} of ${allLessons.length} lessons`;

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">No lessons match your search.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = rows.map((s) => `
    <tr>
      <td class="admin-table__title">${escapeHtml(s.title)}</td>
      <td class="admin-table__muted">${escapeHtml(s.signId)}</td>
      <td class="admin-table__muted">${escapeHtml(s.missionTitle)}</td>
      <td class="admin-table__muted">${escapeHtml(s.chapterTitle)}</td>
      <td class="admin-table__muted">${s.order ?? "&mdash;"}</td>
      <td class="admin-table__actions">
        <button class="btn btn--ghost btn--sm" data-view="${escapeHtml(s.key)}" type="button">View</button>
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

function openModal(lesson) {
  if (!lesson) return;
  els.modalTitle.textContent = lesson.title;
  const tips = lesson.tips.length
    ? `<ul>${lesson.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : `<p class="text-muted">No tips.</p>`;
  els.modalBody.innerHTML = `
    <p class="text-muted">${escapeHtml(lesson.chapterTitle)} &middot; ${escapeHtml(lesson.missionTitle)} &middot; Sign ID ${escapeHtml(lesson.signId)}</p>
    <h3>Description</h3>
    <p>${escapeHtml(lesson.description) || "&mdash;"}</p>
    <h3>Tips</h3>
    ${tips}
    <h3>Media</h3>
    <p class="text-muted">Image: ${escapeHtml(lesson.imageUrl) || "&mdash;"}<br />
    Video: ${escapeHtml(lesson.videoUrl) || "&mdash;"}<br />
    Detection: ${escapeHtml(lesson.detectionType) || "&mdash;"}</p>
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
    const key = e.target.closest("[data-view]")?.dataset.view;
    if (key) openModal(allLessons.find((s) => s.key === key));
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
    allLessons = getLessons();
    fillChapterFilter();
    wireEvents();
    render();
  } catch (err) {
    console.error("Failed to load lessons:", err);
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">Couldn't load the lesson content (js/missions.js).</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
