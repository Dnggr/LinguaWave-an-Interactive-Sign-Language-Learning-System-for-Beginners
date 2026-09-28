/**
 * admin-users.js — Controller for pages/admin-users.html (NEW)
 * Lists learner profiles from Firestore `users`, lets the admin
 * change a learner's level inline, and lets them delete a learner
 * COMPLETELY — Firebase Auth login + Firestore data — through the
 * `deleteLearnerAccount` Cloud Function (see js/admin-firebase.js).
 * The admin's own row (matched by ADMIN_EMAIL) has no delete button,
 * so a stray click can't delete the admin account.
 */
import { listUsers, updateUserLevel, deleteLearnerAccount } from "./admin-firebase.js";

let allUsers = [];
let pendingDeleteUid = null;

const els = {};

function cacheEls() {
  els.tbody = document.getElementById("user-table-body");
  els.search = document.getElementById("user-search");
  els.levelFilter = document.getElementById("user-level-filter");

  els.deleteBackdrop = document.getElementById("user-delete-backdrop");
  els.deleteBody = document.getElementById("user-delete-body");
  els.deleteClose = document.getElementById("user-delete-close");
  els.deleteCancel = document.getElementById("user-delete-cancel");
  els.deleteConfirm = document.getElementById("user-delete-confirm");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function render() {
  const term = els.search.value.trim().toLowerCase();
  const level = els.levelFilter.value;

  const rows = allUsers.filter((u) => {
    if (level && u.level !== level) return false;
    if (!term) return true;
    return (u.name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
  });

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">${allUsers.length ? "No learners match your search." : "No learners yet."}</td></tr>`;
    return;
  }

  const adminEmail = (window.LWAdminAuth?.ADMIN_EMAIL || "").toLowerCase();

  els.tbody.innerHTML = rows.map((u) => {
    const isAdminRow = (u.email || "").toLowerCase() === adminEmail;
    return `
    <tr data-uid="${u.id}">
      <td class="admin-table__title">${escapeHtml(u.name || "(no name)")}</td>
      <td class="admin-table__muted">${escapeHtml(u.email || "&mdash;")}</td>
      <td>
        <select class="form-input" data-level-select data-uid="${u.id}" style="padding: var(--space-1) var(--space-3); font-size: var(--fs-xs);">
          <option value="basic" ${u.level === "basic" ? "selected" : ""}>Basic</option>
          <option value="medium" ${u.level === "medium" ? "selected" : ""}>Medium</option>
          <option value="intermediate" ${u.level === "intermediate" ? "selected" : ""}>Intermediate</option>
        </select>
      </td>
      <td class="admin-table__muted">${escapeHtml(u.joined || "&mdash;")}</td>
      <td class="admin-table__actions">
        ${isAdminRow
          ? `<span class="badge badge--done">Admin account</span>`
          : `<button class="btn btn--danger btn--sm" data-delete="${u.id}" type="button">Delete</button>`}
      </td>
    </tr>
  `;
  }).join("");
}

async function loadUsers() {
  els.tbody.innerHTML = `<tr><td colspan="5" class="admin-table__loading">Loading learners&hellip;</td></tr>`;
  try {
    allUsers = await listUsers();
    render();
  } catch (err) {
    console.error("Failed to load users:", err);
    els.tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Couldn't load learners from Firestore.</td></tr>`;
  }
}

async function handleLevelChange(e) {
  const select = e.target.closest("[data-level-select]");
  if (!select) return;
  const uid = select.dataset.uid;
  const level = select.value;
  select.disabled = true;
  try {
    await updateUserLevel(uid, level);
    const user = allUsers.find((u) => u.id === uid);
    if (user) user.level = level;
    window.LinguaWave?.showToast?.("Level updated.", "success");
  } catch (err) {
    console.error("Failed to update level:", err);
    window.LinguaWave?.showToast?.("Couldn't update this learner's level.", "error");
    render(); // revert the visible select to the last known-good value
  } finally {
    select.disabled = false;
  }
}

function openDeleteConfirm(uid) {
  const u = allUsers.find((x) => x.id === uid);
  pendingDeleteUid = uid;
  els.deleteBody.textContent = `Permanently delete "${u?.name || u?.email || "this learner"}"? Their login and all their data will be removed.`;
  els.deleteBackdrop.hidden = false;
}

function closeDeleteConfirm() {
  els.deleteBackdrop.hidden = true;
  pendingDeleteUid = null;
}

async function confirmDelete() {
  if (!pendingDeleteUid) return;
  els.deleteConfirm.disabled = true;
  try {
    // Deletes the Auth login AND the Firestore data server-side.
    await deleteLearnerAccount(pendingDeleteUid);
    window.LinguaWave?.showToast?.("Learner deleted (login and data).", "success");
    closeDeleteConfirm();
    await loadUsers();
  } catch (err) {
    console.error("Failed to delete learner:", err);
    const notDeployed = ["functions/not-found", "functions/unavailable", "functions/internal"].includes(err?.code);
    window.LinguaWave?.showToast?.(
      notDeployed
        ? "Delete service isn't deployed yet — nothing was deleted. See ADMIN_SETUP.md."
        : (err?.message || "Couldn't delete this learner."),
      "error"
    );
  } finally {
    els.deleteConfirm.disabled = false;
  }
}

function wireEvents() {
  els.search.addEventListener("input", render);
  els.levelFilter.addEventListener("change", render);
  els.tbody.addEventListener("change", handleLevelChange);
  els.tbody.addEventListener("click", (e) => {
    const delId = e.target.closest("[data-delete]")?.dataset.delete;
    if (delId) openDeleteConfirm(delId);
  });

  els.deleteClose.addEventListener("click", closeDeleteConfirm);
  els.deleteCancel.addEventListener("click", closeDeleteConfirm);
  els.deleteBackdrop.addEventListener("click", (e) => { if (e.target === els.deleteBackdrop) closeDeleteConfirm(); });
  els.deleteConfirm.addEventListener("click", confirmDelete);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.deleteBackdrop.hidden) closeDeleteConfirm();
  });
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  cacheEls();
  wireEvents();
  await loadUsers();
}

document.addEventListener("DOMContentLoaded", init);
