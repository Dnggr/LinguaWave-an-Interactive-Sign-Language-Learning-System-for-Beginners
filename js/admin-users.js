import { listUsers, deleteLearnerAccount, resetAllLearnersProgress, deleteAllLearners } from "./admin-firebase.js";
let allUsers = [];
let pendingDeleteUid = null;
let bulkMode = null;
let bulkRunning = false;
const BULK = {
  reset: {
    title: "Reset ALL user data?",
    phrase: "RESET",
    confirm: "Reset all data",
    body: (n) => `This clears the learning data of ${n} learner${n === 1 ? "" : "s"}. Their accounts and logins stay.`,
    list: ["XP, level and leaderboard rows", "Streaks, badges and achievements", "Lesson, mission and quiz progress", "Wall Breaker / game progress"],
    note: "The admin account is not affected. This can't be undone. Feedback surveys are kept.",
  },
  delete: {
    title: "Delete ALL users?",
    phrase: "DELETE",
    confirm: "Delete all users",
    body: (n) => `This permanently deletes ${n} learner account${n === 1 ? "" : "s"} and everything they have saved.`,
    list: ["Profiles, XP, badges and progress", "Leaderboard rows and game progress", "Their feedback surveys", "Their login (Firebase Authentication)"],
    note: "The admin account is not affected. This can't be undone.",
  },
};
const DENIED_CODES = ["worker/http-401", "worker/http-403", "permission-denied"];
const els = {};
function cacheEls() {
  els.tbody = document.getElementById("user-table-body");
  els.search = document.getElementById("user-search");
  els.deleteBackdrop = document.getElementById("user-delete-backdrop");
  els.deleteBody = document.getElementById("user-delete-body");
  els.deleteClose = document.getElementById("user-delete-close");
  els.deleteCancel = document.getElementById("user-delete-cancel");
  els.deleteConfirm = document.getElementById("user-delete-confirm");
  els.bulkResetOpen = document.getElementById("bulk-reset-open");
  els.bulkDeleteOpen = document.getElementById("bulk-delete-open");
  els.bulkBackdrop = document.getElementById("bulk-backdrop");
  els.bulkTitle = document.getElementById("bulk-title");
  els.bulkBody = document.getElementById("bulk-body");
  els.bulkList = document.getElementById("bulk-list");
  els.bulkNote = document.getElementById("bulk-note");
  els.bulkPrompt = document.getElementById("bulk-prompt");
  els.bulkInput = document.getElementById("bulk-input");
  els.bulkProgress = document.getElementById("bulk-progress");
  els.bulkProgressBar = document.getElementById("bulk-progress-bar");
  els.bulkProgressText = document.getElementById("bulk-progress-text");
  els.bulkClose = document.getElementById("bulk-close");
  els.bulkCancel = document.getElementById("bulk-cancel");
  els.bulkConfirm = document.getElementById("bulk-confirm");
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function render() {
  const term = els.search.value.trim().toLowerCase();
  const rows = allUsers.filter((u) => {
    if (!term) return true;
    return (u.name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
  });
  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="4" class="admin-table__empty">${allUsers.length ? "No learners match your search." : "No learners yet."}</td></tr>`;
    return;
  }
  const adminEmail = (window.LWAdminAuth?.ADMIN_EMAIL || "").toLowerCase();
  els.tbody.innerHTML = rows.map((u) => {
    const isAdminRow = (u.email || "").toLowerCase() === adminEmail;
    return `
    <tr data-uid="${u.id}">
      <td class="admin-table__title">${escapeHtml(u.name || "(no name)")}</td>
      <td class="admin-table__muted">${escapeHtml(u.email || "&mdash;")}</td>
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
  els.tbody.innerHTML = window.LWSkeleton?.table
    ? window.LWSkeleton.table("Loading learners\u2026", 6, [70, 85, 55])
    : `<tr><td colspan="4" class="admin-table__loading">Loading learners&hellip;</td></tr>`;
  try {
    allUsers = await listUsers();
    render();
  } catch (err) {
    console.error("Failed to load users:", err);
    els.tbody.innerHTML = `<tr><td colspan="4" class="admin-table__empty">Couldn't load learners from Firestore.</td></tr>`;
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
  const uid = pendingDeleteUid;
  els.deleteConfirm.disabled = true;
  try {
    await deleteLearnerAccount(uid);
    closeDeleteConfirm();
    window.LinguaWave?.showToast?.("Learner deleted (login and data).", "success");
    await loadUsers();
  } catch (err) {
    console.error("Failed to delete learner:", err);
    window.LinguaWave?.showToast?.(
      DENIED_CODES.includes(err?.code)
        ? "Not allowed: only the verified admin account can delete learners."
        : (err?.message || "Couldn't delete this learner. Nothing was deleted."),
      "error"
    );
    if (err?.code === "admin/cleanup-failed") await loadUsers();
  } finally {
    els.deleteConfirm.disabled = false;
  }
}
function openBulk(mode) {
  if (!allUsers.length) {
    window.LinguaWave?.showToast?.("There are no learners to " + (mode === "reset" ? "reset." : "delete."), "info");
    return;
  }
  const cfg = BULK[mode];
  bulkMode = mode;
  els.bulkTitle.textContent = cfg.title;
  els.bulkBody.textContent = cfg.body(allUsers.length);
  els.bulkList.innerHTML = cfg.list.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  els.bulkNote.textContent = cfg.note;
  els.bulkPrompt.textContent = `Type ${cfg.phrase} to confirm:`;
  els.bulkInput.value = "";
  els.bulkInput.disabled = false;
  els.bulkConfirm.textContent = cfg.confirm;
  els.bulkConfirm.disabled = true;
  els.bulkCancel.disabled = false;
  els.bulkProgress.hidden = true;
  els.bulkBackdrop.hidden = false;
  els.bulkInput.focus();
}
function closeBulk() {
  if (bulkRunning) return;
  els.bulkBackdrop.hidden = true;
  bulkMode = null;
}
function updateBulkConfirmState() {
  if (!bulkMode) return;
  els.bulkConfirm.disabled = bulkRunning || els.bulkInput.value.trim() !== BULK[bulkMode].phrase;
}
function onBulkProgress(done, total) {
  els.bulkProgressBar.max = total || 1;
  els.bulkProgressBar.value = done;
  els.bulkProgressText.textContent = `${done} / ${total} done`;
}
async function confirmBulk() {
  if (!bulkMode || bulkRunning || els.bulkInput.value.trim() !== BULK[bulkMode].phrase) return;
  const mode = bulkMode;
  bulkRunning = true;
  els.bulkConfirm.disabled = true;
  els.bulkCancel.disabled = true;
  els.bulkClose.disabled = true;
  els.bulkInput.disabled = true;
  els.bulkProgress.hidden = false;
  onBulkProgress(0, allUsers.length);
  const toast = window.LinguaWave?.showToast;
  try {
    if (mode === "reset") {
      const r = await resetAllLearnersProgress(onBulkProgress);
      toast?.(
        r.failed.length
          ? `Reset ${r.reset} of ${r.total} learners. ${r.failed.length} failed, see the console and try again.`
          : `All data reset for ${r.reset} learner${r.reset === 1 ? "" : "s"}.`,
        r.failed.length ? "error" : "success"
      );
    } else {
      const r = await deleteAllLearners(onBulkProgress);
      if (r.failed.length && !r.deleted) {
        const why = r.failed[0].error;
        toast?.(
          DENIED_CODES.includes(why?.code)
            ? "Not allowed: only the verified admin account can do this."
            : `Nothing was deleted. ${why?.message || "See the console."}`,
          "error"
        );
      } else if (r.failed.length) {
        toast?.(`Deleted ${r.deleted} of ${r.total} learners. ${r.failed.length} failed, see the console and try again.`, "error");
      } else {
        toast?.(`Deleted ${r.deleted} learner${r.deleted === 1 ? "" : "s"} (logins and data).`, "success");
      }
    }
  } catch (err) {
    console.error("Bulk action failed:", err);
    toast?.(DENIED_CODES.includes(err?.code) ? "Not allowed: only the verified admin account can do this." : (err?.message || "The bulk action failed."), "error");
  } finally {
    bulkRunning = false;
    els.bulkClose.disabled = false;
    closeBulk();
    await loadUsers();
  }
}

function wireEvents() {
  els.bulkResetOpen.addEventListener("click", () => openBulk("reset"));
  els.bulkDeleteOpen.addEventListener("click", () => openBulk("delete"));
  els.bulkInput.addEventListener("input", updateBulkConfirmState);
  els.bulkInput.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmBulk(); });
  els.bulkConfirm.addEventListener("click", confirmBulk);
  els.bulkClose.addEventListener("click", closeBulk);
  els.bulkCancel.addEventListener("click", closeBulk);
  els.bulkBackdrop.addEventListener("click", (e) => { if (e.target === els.bulkBackdrop) closeBulk(); });
  els.search.addEventListener("input", render);
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
    if (e.key === "Escape" && !els.bulkBackdrop.hidden) closeBulk();
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
