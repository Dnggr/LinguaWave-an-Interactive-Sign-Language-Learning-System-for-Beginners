/**
 * admin-lessons.js — Controller for pages/admin-lessons.html (NEW)
 * List/search/filter + create/edit/delete for the Firestore `signs`
 * collection. See js/admin-firebase.js for the CRUD functions and the
 * note on how this relates to js/data.js (the learner app's real
 * content source).
 */
import { listSigns, createSign, updateSign, deleteSign } from "./admin-firebase.js";

let allSigns = [];
let editingId = null; // null = creating a new one
let pendingDeleteId = null;

const els = {};

function cacheEls() {
  els.tbody = document.getElementById("sign-table-body");
  els.search = document.getElementById("sign-search");
  els.levelFilter = document.getElementById("sign-level-filter");
  els.newBtn = document.getElementById("btn-new-sign");

  els.modalBackdrop = document.getElementById("sign-modal-backdrop");
  els.modalTitle = document.getElementById("sign-modal-title");
  els.modalClose = document.getElementById("sign-modal-close");
  els.form = document.getElementById("sign-form");
  els.formCancel = document.getElementById("sign-form-cancel");

  els.deleteBackdrop = document.getElementById("sign-delete-backdrop");
  els.deleteBody = document.getElementById("sign-delete-body");
  els.deleteClose = document.getElementById("sign-delete-close");
  els.deleteCancel = document.getElementById("sign-delete-cancel");
  els.deleteConfirm = document.getElementById("sign-delete-confirm");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function render() {
  const term = els.search.value.trim().toLowerCase();
  const level = els.levelFilter.value;

  const rows = allSigns.filter((s) => {
    if (level && s.level !== level) return false;
    if (!term) return true;
    return (s.title || "").toLowerCase().includes(term) || (s.signId || "").toLowerCase().includes(term);
  });

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">${allSigns.length ? "No lessons match your search." : "No lessons yet — add your first one."}</td></tr>`;
    return;
  }

  els.tbody.innerHTML = rows.map((s) => `
    <tr>
      <td class="admin-table__title">${escapeHtml(s.title || "(untitled)")}</td>
      <td class="admin-table__muted">${escapeHtml(s.signId || "&mdash;")}</td>
      <td><span class="badge badge--${escapeHtml(s.level || "basic")}">${escapeHtml(s.level || "&mdash;")}</span></td>
      <td class="admin-table__muted">${escapeHtml(s.category || "&mdash;")}</td>
      <td class="admin-table__muted">${s.order ?? "&mdash;"}</td>
      <td class="admin-table__actions">
        <button class="btn btn--ghost btn--sm" data-edit="${s.id}" type="button">Edit</button>
        <button class="btn btn--danger btn--sm" data-delete="${s.id}" type="button">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function loadSigns() {
  els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__loading">Loading lessons&hellip;</td></tr>`;
  try {
    allSigns = await listSigns();
    render();
  } catch (err) {
    console.error("Failed to load signs:", err);
    els.tbody.innerHTML = `<tr><td colspan="6" class="admin-table__empty">Couldn't load lessons from Firestore.</td></tr>`;
  }
}

function openModal(sign) {
  editingId = sign ? sign.id : null;
  els.modalTitle.textContent = sign ? "Edit Lesson" : "Add Lesson";
  els.form.reset();
  els.form.elements.title.value = sign?.title || "";
  els.form.elements.signId.value = sign?.signId || "";
  els.form.elements.level.value = sign?.level || "basic";
  els.form.elements.category.value = sign?.category || "";
  els.form.elements.order.value = sign?.order ?? "";
  els.form.elements.imageUrl.value = sign?.imageUrl || "";
  els.form.elements.videoUrl.value = sign?.videoUrl || "";
  els.form.elements.description.value = sign?.description || "";
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const fd = new FormData(els.form);
  const data = {
    title: (fd.get("title") || "").trim(),
    signId: (fd.get("signId") || "").trim(),
    level: fd.get("level"),
    category: (fd.get("category") || "").trim(),
    order: fd.get("order") ? Number(fd.get("order")) : null,
    imageUrl: (fd.get("imageUrl") || "").trim(),
    videoUrl: (fd.get("videoUrl") || "").trim(),
    description: (fd.get("description") || "").trim(),
  };

  if (!data.title || !data.signId) {
    window.LinguaWave?.showToast?.("Title and Sign ID are required.", "error");
    return;
  }

  const submitBtn = document.getElementById("sign-form-submit");
  submitBtn.disabled = true;
  try {
    if (editingId) {
      await updateSign(editingId, data);
      window.LinguaWave?.showToast?.("Lesson updated.", "success");
    } else {
      await createSign(data);
      window.LinguaWave?.showToast?.("Lesson added.", "success");
    }
    closeModal();
    await loadSigns();
  } catch (err) {
    console.error("Failed to save sign:", err);
    window.LinguaWave?.showToast?.("Couldn't save this lesson.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function openDeleteConfirm(id) {
  const sign = allSigns.find((s) => s.id === id);
  pendingDeleteId = id;
  els.deleteBody.textContent = `Delete "${sign?.title || "this lesson"}"? This can't be undone.`;
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
    await deleteSign(pendingDeleteId);
    window.LinguaWave?.showToast?.("Lesson deleted.", "success");
    closeDeleteConfirm();
    await loadSigns();
  } catch (err) {
    console.error("Failed to delete sign:", err);
    window.LinguaWave?.showToast?.("Couldn't delete this lesson.", "error");
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

  els.tbody.addEventListener("click", (e) => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const delId = e.target.closest("[data-delete]")?.dataset.delete;
    if (editId) openModal(allSigns.find((s) => s.id === editId));
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
  await loadSigns();
}

document.addEventListener("DOMContentLoaded", init);
