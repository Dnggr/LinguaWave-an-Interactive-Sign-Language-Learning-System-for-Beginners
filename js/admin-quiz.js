/**
 * admin-quiz.js — Controller for pages/admin-quiz.html (NEW)
 * List/search/filter + create/edit/delete for the Firestore
 * `questions` collection, including the dynamic answer-options list
 * (add/remove rows, radio-select the correct one). See
 * js/admin-firebase.js for the CRUD functions and field shapes.
 */
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from "./admin-firebase.js";

let allQuestions = [];
let editingId = null;
let pendingDeleteId = null;
let optionRowSeq = 0;

const els = {};

function cacheEls() {
  els.tbody = document.getElementById("question-table-body");
  els.search = document.getElementById("question-search");
  els.levelFilter = document.getElementById("question-level-filter");
  els.newBtn = document.getElementById("btn-new-question");

  els.modalBackdrop = document.getElementById("question-modal-backdrop");
  els.modalTitle = document.getElementById("question-modal-title");
  els.modalClose = document.getElementById("question-modal-close");
  els.form = document.getElementById("question-form");
  els.formCancel = document.getElementById("question-form-cancel");
  els.optionsList = document.getElementById("question-options-list");
  els.addOptionBtn = document.getElementById("question-add-option");

  els.deleteBackdrop = document.getElementById("question-delete-backdrop");
  els.deleteBody = document.getElementById("question-delete-body");
  els.deleteClose = document.getElementById("question-delete-close");
  els.deleteCancel = document.getElementById("question-delete-cancel");
  els.deleteConfirm = document.getElementById("question-delete-confirm");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ── Options list (inside the modal) ──────────────────────────────── */
function addOptionRow(text = "", checked = false) {
  const rowId = `opt-${optionRowSeq++}`;
  const row = document.createElement("div");
  row.className = "admin-option-row mt-2";
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <input class="form-input" type="text" value="${escapeHtml(text)}" placeholder="Option text" required />
    <label class="admin-option-row__correct">
      <input type="radio" name="question-correct" ${checked ? "checked" : ""} /> Correct
    </label>
    <button class="admin-option-row__remove" type="button" aria-label="Remove option">&times;</button>
  `;
  row.querySelector(".admin-option-row__remove").addEventListener("click", () => {
    if (els.optionsList.children.length <= 2) {
      window.LinguaWave?.showToast?.("A question needs at least 2 options.", "error");
      return;
    }
    const wasChecked = row.querySelector('input[type="radio"]').checked;
    row.remove();
    if (wasChecked && els.optionsList.firstElementChild) {
      els.optionsList.firstElementChild.querySelector('input[type="radio"]').checked = true;
    }
  });
  els.optionsList.appendChild(row);
}

function resetOptionsList(options = ["", ""], correctIndex = 0) {
  els.optionsList.innerHTML = "";
  options.forEach((text, i) => addOptionRow(text, i === correctIndex));
}

function readOptionsList() {
  const rows = [...els.optionsList.children];
  const options = rows.map((r) => r.querySelector('input[type="text"]').value.trim());
  let correctIndex = rows.findIndex((r) => r.querySelector('input[type="radio"]').checked);
  if (correctIndex === -1) correctIndex = 0;
  return { options, correctIndex };
}

/* ── Table rendering ──────────────────────────────────────────────── */
function render() {
  const term = els.search.value.trim().toLowerCase();
  const level = els.levelFilter.value;

  const rows = allQuestions.filter((q) => {
    if (level && q.level !== level) return false;
    if (!term) return true;
    return (q.prompt || "").toLowerCase().includes(term);
  });

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">${allQuestions.length ? "No questions match your search." : "No questions yet — add your first one."}</td></tr>`;
    return;
  }

  els.tbody.innerHTML = rows.map((q) => `
    <tr>
      <td class="admin-table__title">${escapeHtml(q.prompt || "(untitled)")}</td>
      <td><span class="badge badge--${escapeHtml(q.level || "basic")}">${escapeHtml(q.level || "&mdash;")}</span></td>
      <td class="admin-table__muted">${escapeHtml(q.relatedSign || "&mdash;")}</td>
      <td class="admin-table__muted">${(q.options || []).length} options</td>
      <td class="admin-table__muted">${q.order ?? "&mdash;"}</td>
      <td class="admin-table__actions">
        <button class="btn btn--ghost btn--sm" data-edit="${q.id}" type="button">Edit</button>
        <button class="btn btn--danger btn--sm" data-delete="${q.id}" type="button">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function loadQuestions() {
  els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__loading">Loading questions&hellip;</td></tr>`;
  try {
    allQuestions = await listQuestions();
    render();
  } catch (err) {
    console.error("Failed to load questions:", err);
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">Couldn't load questions from Firestore.</td></tr>`;
  }
}

/* ── Modal ─────────────────────────────────────────────────────────── */
function openModal(question) {
  editingId = question ? question.id : null;
  els.modalTitle.textContent = question ? "Edit Question" : "Add Question";
  els.form.reset();
  els.form.elements.prompt.value = question?.prompt || "";
  els.form.elements.level.value = question?.level || "basic";
  els.form.elements.relatedSign.value = question?.relatedSign || "";
  els.form.elements.order.value = question?.order ?? "";
  resetOptionsList(
    question?.options?.length ? question.options : ["", ""],
    question?.correctIndex ?? 0
  );
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const fd = new FormData(els.form);
  const { options, correctIndex } = readOptionsList();

  const data = {
    prompt: (fd.get("prompt") || "").trim(),
    level: fd.get("level"),
    relatedSign: (fd.get("relatedSign") || "").trim(),
    order: fd.get("order") ? Number(fd.get("order")) : null,
    options,
    correctIndex,
  };

  if (!data.prompt || options.some((o) => !o)) {
    window.LinguaWave?.showToast?.("Fill in the question and every option.", "error");
    return;
  }

  const submitBtn = document.getElementById("question-form-submit");
  submitBtn.disabled = true;
  try {
    if (editingId) {
      await updateQuestion(editingId, data);
      window.LinguaWave?.showToast?.("Question updated.", "success");
    } else {
      await createQuestion(data);
      window.LinguaWave?.showToast?.("Question added.", "success");
    }
    closeModal();
    await loadQuestions();
  } catch (err) {
    console.error("Failed to save question:", err);
    window.LinguaWave?.showToast?.("Couldn't save this question.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function openDeleteConfirm(id) {
  const q = allQuestions.find((x) => x.id === id);
  pendingDeleteId = id;
  els.deleteBody.textContent = `Delete "${q?.prompt || "this question"}"? This can't be undone.`;
  els.deleteBackdrop.hidden = false;
}

function closeDeleteConfirm() {
  els.deleteBackdrop.hidden = true;
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  els.deleteConfirm.disabled = true;
  try {
    await deleteQuestion(pendingDeleteId);
    window.LinguaWave?.showToast?.("Question deleted.", "success");
    closeDeleteConfirm();
    await loadQuestions();
  } catch (err) {
    console.error("Failed to delete question:", err);
    window.LinguaWave?.showToast?.("Couldn't delete this question.", "error");
  } finally {
    els.deleteConfirm.disabled = false;
  }
}

function wireEvents() {
  els.search.addEventListener("input", render);
  els.levelFilter.addEventListener("change", render);
  els.newBtn.addEventListener("click", () => openModal(null));
  els.modalClose.addEventListener("click", closeModal);
  els.formCancel.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (e) => { if (e.target === els.modalBackdrop) closeModal(); });
  els.form.addEventListener("submit", handleSubmit);
  els.addOptionBtn.addEventListener("click", () => addOptionRow());

  els.tbody.addEventListener("click", (e) => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const delId = e.target.closest("[data-delete]")?.dataset.delete;
    if (editId) openModal(allQuestions.find((q) => q.id === editId));
    if (delId) openDeleteConfirm(delId);
  });

  els.deleteClose.addEventListener("click", closeDeleteConfirm);
  els.deleteCancel.addEventListener("click", closeDeleteConfirm);
  els.deleteBackdrop.addEventListener("click", (e) => { if (e.target === els.deleteBackdrop) closeDeleteConfirm(); });
  els.deleteConfirm.addEventListener("click", confirmDelete);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.modalBackdrop.hidden) closeModal();
    if (!els.deleteBackdrop.hidden) closeDeleteConfirm();
  });
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  cacheEls();
  wireEvents();
  await loadQuestions();
}

document.addEventListener("DOMContentLoaded", init);
