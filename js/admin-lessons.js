/**
 * admin-lessons.js — Controller for pages/admin-lessons.html
 * ─────────────────────────────────────────────────────────────────
 * Two kinds of rows in one table:
 *   • Built-in lessons  — the hardcoded curriculum in js/missions.js (via
 *     js/admin-content.js). View only: they live in source, not in Firestore.
 *   • Admin-added lessons — Firestore `signs` (source === "admin").
 *     The admin can CREATE, UPDATE and DELETE these.
 *
 * VIDEO : when the admin picks an .mp4 it is written to
 *   assets/videos/basic/asl_vid_diy_raw/<signId>.mp4 (js/admin-video-store.js)
 *   and the real path (../assets/videos/basic/asl_vid_diy_raw/<signId>.mp4)
 *   is what gets saved on the lesson's Firestore document. The video is
 *   written FIRST, so Firestore never points at a file that wasn't saved.
 *
 * No level, no image. Admin-added lessons have no motion detection.
 * ─────────────────────────────────────────────────────────────────
 */
import { getLessons, getQuizzes } from "./admin-content.js";
import { listAdminLessons, createLesson, updateLesson, deleteLesson } from "./admin-firebase.js";
import {
  VIDEO_DIR_SEGMENTS,
  supportsFolderAccess,
  loadRememberedFolder,
  connectFolder,
  isFolderConnected,
  getFolderName,
  videoPathFor,
  videoExists,
  validateVideoFile,
  saveVideo,
} from "./admin-video-store.js";

const SIGN_ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MAX_TIPS = 10;
const VIDEO_FOLDER_LABEL = "assets/" + VIDEO_DIR_SEGMENTS.slice(1).join("/") + "/";

let builtIn = [];
let custom = [];
let missions = [];
let missionById = new Map();
let allRows = [];

let editing = null;          // the admin-added row being edited, or null when creating
let pendingDelete = null;    // the admin-added row awaiting delete confirmation
let signIdTouched = false;
let orderTouched = false;
let previewUrl = "";
let saving = false;

const els = {};

function cacheEls() {
  const $ = (id) => document.getElementById(id);
  Object.assign(els, {
    tbody: $("sign-table-body"), search: $("sign-search"), chapterFilter: $("sign-chapter-filter"),
    count: $("sign-count"), addBtn: $("lesson-add"),

    modalBackdrop: $("sign-modal-backdrop"), modalTitle: $("sign-modal-title"), modalBody: $("sign-modal-body"),
    modalClose: $("sign-modal-close"), modalDone: $("sign-modal-done"),

    formBackdrop: $("lesson-form-backdrop"), formHeading: $("lesson-form-heading"), formClose: $("lesson-form-close"),
    formCancel: $("lesson-form-cancel"), formSave: $("lesson-form-save"), formError: $("lesson-form-error"),
    fTitle: $("f-title"), fSignId: $("f-signid"), fMission: $("f-mission"), fOrder: $("f-order"),
    fDesc: $("f-desc"), fTips: $("f-tips"), fVideo: $("f-video"), fVideoCurrent: $("f-video-current"),
    fVideoPreview: $("f-video-preview"), fFolderStatus: $("f-folder-status"), fFolderBtn: $("f-folder-btn"),

    delBackdrop: $("lesson-delete-backdrop"), delBody: $("lesson-delete-body"), delClose: $("lesson-delete-close"),
    delCancel: $("lesson-delete-cancel"), delConfirm: $("lesson-delete-confirm"),
  });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
const toast = (msg, type) => window.LinguaWave?.showToast?.(msg, type);

/* ── data ───────────────────────────────────────────────────────── */
function customToRow(d) {
  const m = missionById.get(d.missionId);
  return {
    key: `custom:${d.id}`,
    isCustom: true,
    id: d.id,
    signId: d.signId || d.id,
    title: d.title || d.id,
    description: d.description || "",
    tips: Array.isArray(d.tips) ? d.tips : [],
    videoUrl: d.videoUrl || "",
    detectionType: d.detectionType || "none",
    order: typeof d.order === "number" ? d.order : null,
    missionId: d.missionId || "",
    missionTitle: m ? m.title : "—",
    missionNumber: m ? m.missionNumber : 9999,
    chapterId: d.chapterId || (m ? m.chapterId : ""),
    chapterTitle: m ? m.chapterTitle : "Ungrouped",
  };
}

function rebuildRows() {
  const rows = [
    ...builtIn.map((l) => ({ ...l, isCustom: false })),
    ...custom.map(customToRow),
  ];
  // Trail order: mission, then order; built-in before admin-added on a tie.
  rows.sort((a, b) =>
    (a.missionNumber - b.missionNumber) ||
    ((a.order ?? 0) - (b.order ?? 0)) ||
    (Number(a.isCustom) - Number(b.isCustom))
  );
  allRows = rows;
}

async function reloadCustom() {
  const docs = await listAdminLessons();
  // Only lessons made by this screen. Older `signs` docs from the previous
  // Firestore-based admin (no `source`) are ignored, not shown or editable.
  custom = docs.filter((d) => d.source === "admin");
  rebuildRows();
}

/* ── table ──────────────────────────────────────────────────────── */
function render() {
  const term = els.search.value.trim().toLowerCase();
  const chapter = els.chapterFilter.value;

  const rows = allRows.filter((s) => {
    if (chapter && s.chapterId !== chapter) return false;
    if (!term) return true;
    return (
      s.title.toLowerCase().includes(term) ||
      s.signId.toLowerCase().includes(term) ||
      s.missionTitle.toLowerCase().includes(term)
    );
  });

  els.count.textContent = `${rows.length} of ${allRows.length} lessons`;

  if (!rows.length) {
    els.tbody.innerHTML = `<tr><td colspan="7" class="admin-table__empty">${allRows.length ? "No lessons match your search." : "No lessons yet."}</td></tr>`;
    return;
  }

  els.tbody.innerHTML = rows.map((s) => `
    <tr>
      <td class="admin-table__title">${escapeHtml(s.title)}</td>
      <td class="admin-table__muted">${escapeHtml(s.signId)}</td>
      <td class="admin-table__muted">${escapeHtml(s.missionTitle)}</td>
      <td class="admin-table__muted">${escapeHtml(s.chapterTitle)}</td>
      <td class="admin-table__muted">${s.order ?? "&mdash;"}</td>
      <td>${s.isCustom ? `<span class="badge badge--done">Added</span>` : `<span class="admin-table__muted">Built-in</span>`}</td>
      <td class="admin-table__actions">
        ${s.isCustom
          ? `<button class="btn btn--ghost btn--sm" data-edit="${escapeHtml(s.id)}" type="button">Edit</button>
             <button class="btn btn--danger btn--sm" data-delete="${escapeHtml(s.id)}" type="button">Delete</button>`
          : `<button class="btn btn--ghost btn--sm" data-view="${escapeHtml(s.key)}" type="button">View</button>`}
      </td>
    </tr>
  `).join("");
}

function fillChapterFilter() {
  const seen = new Map();
  missions.forEach((m) => { if (m.chapterId && !seen.has(m.chapterId)) seen.set(m.chapterId, m.chapterTitle); });
  const options = [...seen].map(([id, title]) => `<option value="${escapeHtml(id)}">${escapeHtml(title)}</option>`).join("");
  els.chapterFilter.innerHTML = `<option value="">All chapters</option>${options}`;
}

function fillMissionSelect() {
  const groups = new Map();
  missions.forEach((m) => {
    if (!groups.has(m.chapterTitle)) groups.set(m.chapterTitle, []);
    groups.get(m.chapterTitle).push(m);
  });
  const html = [...groups].map(([chapter, list]) =>
    `<optgroup label="${escapeHtml(chapter)}">${list.map((m) =>
      `<option value="${escapeHtml(m.missionId)}">${escapeHtml(m.title)}</option>`).join("")}</optgroup>`
  ).join("");
  els.fMission.innerHTML = `<option value="">Select a mission&hellip;</option>${html}`;
}

/* ── view modal (built-in lessons) ──────────────────────────────── */
function openView(lesson) {
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
    <p class="text-muted">Video: ${escapeHtml(lesson.videoUrl) || "&mdash;"}<br />
    Detection: ${escapeHtml(lesson.detectionType) || "&mdash;"}</p>
    <p class="text-muted">Built-in lessons are part of the app's source (<code>js/missions.js</code>) and can't be edited here.</p>
  `;
  els.modalBackdrop.hidden = false;
}
function closeView() { els.modalBackdrop.hidden = true; }

/* ── add / edit form ────────────────────────────────────────────── */
function slugify(title) {
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

function nextOrderFor(missionId) {
  const orders = allRows.filter((r) => r.missionId === missionId).map((r) => r.order).filter((n) => typeof n === "number");
  return (orders.length ? Math.max(...orders) : 0) + 1;
}

function showFormError(msg) {
  els.formError.textContent = msg;
  els.formError.hidden = !msg;
}

function setPreview(url) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = url || "";
  if (previewUrl) {
    els.fVideoPreview.src = previewUrl;
    els.fVideoPreview.hidden = false;
  } else {
    els.fVideoPreview.removeAttribute("src");
    els.fVideoPreview.load?.();
    els.fVideoPreview.hidden = true;
  }
}

function updateFolderStatus() {
  if (!supportsFolderAccess()) {
    els.fFolderBtn.hidden = true;
    els.fFolderStatus.textContent =
      `This browser can't save into the project folder. The video will be downloaded as <signId>.mp4 — move it into ${VIDEO_FOLDER_LABEL} yourself (Chrome or Edge can do it automatically).`;
    return;
  }
  els.fFolderBtn.hidden = false;
  if (isFolderConnected()) {
    els.fFolderStatus.textContent = `Saving videos into "${getFolderName()}/${VIDEO_FOLDER_LABEL}"`;
    els.fFolderBtn.textContent = "Change project folder";
  } else {
    els.fFolderStatus.textContent =
      `Connect your LinguaWave project folder once so uploaded videos are saved into ${VIDEO_FOLDER_LABEL}`;
    els.fFolderBtn.textContent = "Choose project folder";
  }
}

function openForm(row) {
  editing = row || null;
  signIdTouched = !!row;
  orderTouched = !!row;
  showFormError("");

  els.formHeading.textContent = row ? "Edit Lesson" : "Add Lesson";
  els.fTitle.value = row ? row.title : "";
  els.fSignId.value = row ? row.signId : "";
  els.fSignId.disabled = !!row;               // Sign ID is the document id: fixed after creation
  els.fMission.value = row ? row.missionId : "";
  els.fOrder.value = row && row.order != null ? row.order : "";
  els.fDesc.value = row ? row.description : "";
  els.fTips.value = row ? row.tips.join("\n") : "";
  els.fVideo.value = "";
  setPreview("");
  els.fVideoCurrent.textContent = row && row.videoUrl
    ? `Current video: ${row.videoUrl} — choose a new file only if you want to replace it.`
    : "No video yet.";
  updateFolderStatus();
  els.formBackdrop.hidden = false;
  els.fTitle.focus();
}

function closeForm() {
  if (saving) return;
  els.formBackdrop.hidden = true;
  setPreview("");
  editing = null;
}

function readForm() {
  const title = els.fTitle.value.trim();
  const signId = (editing ? editing.signId : els.fSignId.value.trim().toLowerCase());
  const missionId = els.fMission.value;
  const orderRaw = els.fOrder.value.trim();
  const description = els.fDesc.value.trim();
  const tips = els.fTips.value.split("\n").map((t) => t.trim()).filter(Boolean);
  const file = els.fVideo.files[0] || null;

  if (!title) return { error: "Title is required." };
  if (title.length > 60) return { error: "Title must be 60 characters or fewer." };
  if (!SIGN_ID_RE.test(signId)) {
    return { error: "Sign ID must be 1–40 characters: lowercase letters, numbers, - or _ (and start with a letter or number)." };
  }
  if (!editing) {
    const taken = allRows.some((r) => r.signId.toLowerCase() === signId);
    if (taken) return { error: `Sign ID "${signId}" is already used by another lesson.` };
  }
  if (!missionId || !missionById.has(missionId)) return { error: "Choose a mission for this lesson." };
  const order = orderRaw === "" ? nextOrderFor(missionId) : Number(orderRaw);
  if (!Number.isInteger(order) || order < 0 || order > 9999) return { error: "Order must be a whole number from 0 to 9999." };
  if (description.length > 500) return { error: "Description must be 500 characters or fewer." };
  if (tips.length > MAX_TIPS) return { error: `Up to ${MAX_TIPS} tips, one per line.` };
  if (tips.some((t) => t.length > 200)) return { error: "Each tip must be 200 characters or fewer." };

  const fileErr = validateVideoFile(file);
  if (fileErr) return { error: fileErr };
  if (file && supportsFolderAccess() && !isFolderConnected()) {
    return { error: `Choose your project folder first (button under the video field) so the video can be saved into ${VIDEO_FOLDER_LABEL}` };
  }
  if (!editing && !file) return { error: "Upload an MP4 video for this lesson." };

  return {
    data: { signId, title, description, tips, order, missionId, chapterId: missionById.get(missionId).chapterId },
    file,
  };
}

async function saveForm() {
  if (saving) return;
  showFormError("");
  const form = readForm();
  if (form.error) return showFormError(form.error);

  const { data, file } = form;
  saving = true;
  els.formSave.disabled = true;
  els.formSave.textContent = "Saving…";

  try {
    let videoUrl = editing ? editing.videoUrl : "";
    let downloaded = false;

    if (file) {
      // Don't silently clobber a video that belongs to something else.
      const target = videoPathFor(data.signId);
      if (isFolderConnected() && target !== (editing && editing.videoUrl) && (await videoExists(data.signId))) {
        if (!window.confirm(`A file named ${data.signId}.mp4 already exists in ${VIDEO_FOLDER_LABEL}. Replace it?`)) {
          return;
        }
      }
      const res = await saveVideo(data.signId, file);   // 1) video first
      videoUrl = res.path;
      downloaded = res.mode === "download";
    }

    const payload = { ...data, videoUrl };
    if (editing) await updateLesson(editing.signId, payload);   // 2) then Firestore
    else await createLesson(payload);

    toast(
      downloaded
        ? `Lesson saved. Move the downloaded ${data.signId}.mp4 into ${VIDEO_FOLDER_LABEL}`
        : editing ? "Lesson updated." : "Lesson added.",
      "success"
    );
    saving = false;
    closeForm();
    await reloadCustom();
    render();
  } catch (err) {
    console.error("Failed to save lesson:", err);
    let msg = err?.message || "Couldn't save this lesson.";
    if (err?.code === "permission-denied") {
      msg = "Firestore rejected the save. Make sure you're signed in as the admin and the latest firestore.rules are published.";
    } else if (err?.name === "NotAllowedError" || err?.code === "folder/denied") {
      msg = "The browser blocked access to the project folder. Click Save again and choose Allow.";
    }
    showFormError(msg);
  } finally {
    saving = false;
    els.formSave.disabled = false;
    els.formSave.textContent = "Save Lesson";
  }
}

async function chooseFolder() {
  try {
    await connectFolder();
    updateFolderStatus();
    showFormError("");
  } catch (err) {
    if (err?.name === "AbortError") return;      // admin closed the picker
    showFormError(err?.message || "Couldn't open that folder.");
  }
}

function onVideoPicked() {
  const file = els.fVideo.files[0];
  if (!file) return setPreview("");
  const err = validateVideoFile(file);
  if (err) {
    els.fVideo.value = "";
    setPreview("");
    return showFormError(err);
  }
  showFormError("");
  setPreview(URL.createObjectURL(file));
}

/* ── delete ─────────────────────────────────────────────────────── */
function openDelete(row) {
  if (!row) return;
  pendingDelete = row;
  els.delBody.textContent = `Delete "${row.title}"? The lesson is removed for all learners.`;
  els.delBackdrop.hidden = false;
}
function closeDelete() {
  els.delBackdrop.hidden = true;
  pendingDelete = null;
}
async function confirmDelete() {
  if (!pendingDelete) return;
  els.delConfirm.disabled = true;
  try {
    await deleteLesson(pendingDelete.signId);
    toast("Lesson deleted.", "success");
    closeDelete();
    await reloadCustom();
    render();
  } catch (err) {
    console.error("Failed to delete lesson:", err);
    toast(err?.code === "permission-denied" ? "Firestore rejected the delete (admin only)." : (err?.message || "Couldn't delete this lesson."), "error");
  } finally {
    els.delConfirm.disabled = false;
  }
}

/* ── wiring ─────────────────────────────────────────────────────── */
function wireEvents() {
  els.search.addEventListener("input", render);
  els.chapterFilter.addEventListener("change", render);
  els.addBtn.addEventListener("click", () => openForm(null));

  els.tbody.addEventListener("click", (e) => {
    const viewKey = e.target.closest("[data-view]")?.dataset.view;
    if (viewKey) return openView(allRows.find((s) => s.key === viewKey));
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    if (editId) return openForm(allRows.find((s) => s.isCustom && s.id === editId));
    const delId = e.target.closest("[data-delete]")?.dataset.delete;
    if (delId) openDelete(allRows.find((s) => s.isCustom && s.id === delId));
  });

  els.modalClose.addEventListener("click", closeView);
  els.modalDone.addEventListener("click", closeView);
  els.modalBackdrop.addEventListener("click", (e) => { if (e.target === els.modalBackdrop) closeView(); });

  els.formClose.addEventListener("click", closeForm);
  els.formCancel.addEventListener("click", closeForm);
  els.formSave.addEventListener("click", saveForm);
  els.fFolderBtn.addEventListener("click", chooseFolder);
  els.fVideo.addEventListener("change", onVideoPicked);
  els.fTitle.addEventListener("input", () => {
    if (!editing && !signIdTouched) els.fSignId.value = slugify(els.fTitle.value);
  });
  els.fSignId.addEventListener("input", () => { signIdTouched = true; });
  els.fOrder.addEventListener("input", () => { orderTouched = true; });
  els.fMission.addEventListener("change", () => {
    if (!editing && !orderTouched && els.fMission.value) els.fOrder.value = nextOrderFor(els.fMission.value);
  });

  els.delClose.addEventListener("click", closeDelete);
  els.delCancel.addEventListener("click", closeDelete);
  els.delBackdrop.addEventListener("click", (e) => { if (e.target === els.delBackdrop) closeDelete(); });
  els.delConfirm.addEventListener("click", confirmDelete);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.delBackdrop.hidden) closeDelete();
    else if (!els.formBackdrop.hidden) closeForm();
    else if (!els.modalBackdrop.hidden) closeView();
  });
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  cacheEls();
  try {
    builtIn = getLessons();
    missions = getQuizzes();
    missionById = new Map(missions.map((m) => [m.missionId, m]));
    fillChapterFilter();
    fillMissionSelect();
    wireEvents();
    rebuildRows();
    render();
  } catch (err) {
    console.error("Failed to load lessons:", err);
    els.tbody.innerHTML = `<tr><td colspan="7" class="admin-table__empty">Couldn't load the lesson content (js/missions.js).</td></tr>`;
    return;
  }
  // Admin-added lessons and the remembered project folder load after the
  // built-in list is already on screen; a failure here doesn't block it.
  loadRememberedFolder().catch(() => {});
  try {
    await reloadCustom();
    render();
  } catch (err) {
    console.error("Failed to load admin-added lessons:", err);
    toast("Couldn't load the lessons you added (Firestore).", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
