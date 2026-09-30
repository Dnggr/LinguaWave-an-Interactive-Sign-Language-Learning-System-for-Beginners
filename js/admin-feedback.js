/**
 * admin-feedback.js — Controller for pages/admin-feedback.html (NEW)
 * ─────────────────────────────────────────────────────────────────
 * Read-only. Gates on the admin account, loads `surveys` (and `users`,
 * once, to fill in identity on legacy rows) from Firestore, then renders
 * stats + a searchable / level-filterable list.
 *
 * - ONE surveys read + ONE users read per load. Filtering and search run
 *   in memory; nothing is queried per row.
 * - Rendering is chunked (PAGE_SIZE at a time + "Show more"), so a large
 *   collection doesn't build thousands of DOM nodes up front. When the
 *   data layer moves to server-side paging (see listSurveys() in
 *   js/admin-firebase.js) only loadFeedback() needs to change.
 * - Every string from Firestore goes through escapeHtml(). Answers are
 *   translated to readable labels by js/survey-schema.js; missing values
 *   render as "Not answered" / "No additional comments", never as
 *   null / undefined / [object Object].
 * - Raw Firebase errors go to the console only.
 */
import { listSurveys, listUsers } from "./admin-firebase.js";
import {
  SURVEY_QUESTIONS,
  COMMENT_QUESTION,
  NO_COMMENT_TEXT,
  formatAnswer,
  getComment,
  levelKey,
  levelLabel,
  formatDate,
  formatTime,
  displayName,
  enrichWithUsers,
  filterSurveys,
  computeSurveyStats,
} from "./survey-schema.js";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 150;

let allSurveys = [];
let filtered = [];
let visibleCount = PAGE_SIZE;
let loading = false;
let searchTimer = null;

const els = {};

function cacheEls() {
  [
    "fb-refresh", "fb-search", "fb-level-filter", "fb-count",
    "fb-loading", "fb-error", "fb-retry", "fb-empty",
    "fb-list", "fb-more-wrap", "fb-more",
    "fb-stat-total", "fb-stat-basic", "fb-stat-medium", "fb-stat-intermediate",
    "fb-stat-other", "fb-stat-other-tile", "fb-stat-week", "fb-stat-latest",
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ── view state: exactly one of loading / error / empty / list ───── */
function showState(state, message) {
  els["fb-loading"].hidden = state !== "loading";
  els["fb-error"].hidden = state !== "error";
  els["fb-empty"].hidden = state !== "empty";
  els["fb-list"].hidden = state !== "list";
  els["fb-more-wrap"].hidden = state !== "list" || visibleCount >= filtered.length;
  if (state === "empty") els["fb-empty"].textContent = message || "";
  if (state !== "list") els["fb-count"].textContent = "";
}

/* ── stats (always computed from ALL loaded rows, not the filter) ── */
function renderStats() {
  const s = computeSurveyStats(allSurveys);
  els["fb-stat-total"].textContent = s.total;
  els["fb-stat-basic"].textContent = s.byLevel.basic;
  els["fb-stat-medium"].textContent = s.byLevel.medium;
  els["fb-stat-intermediate"].textContent = s.byLevel.intermediate;
  els["fb-stat-other"].textContent = s.byLevel.other;
  els["fb-stat-other-tile"].hidden = s.byLevel.other === 0;
  els["fb-stat-week"].textContent = s.thisWeek;
  els["fb-stat-latest"].textContent = s.latestMs === null ? "None yet" : formatDate(s.latestMs);
}

function resetStats() {
  ["total", "basic", "medium", "intermediate", "other", "week", "latest"].forEach((k) => {
    els[`fb-stat-${k}`].innerHTML = "&mdash;";
  });
  els["fb-stat-other-tile"].hidden = true;
}

/* ── one submission ──────────────────────────────────────────────── */
function field(label, valueHtml, extraClass = "") {
  return `
    <div class="fb-field ${extraClass}">
      <span class="fb-field__label">${label}</span>
      <span class="fb-field__value">${valueHtml}</span>
    </div>`;
}

function renderCard(s) {
  const key = levelKey(s.level);
  const badgeClass = key === "other" ? "badge--locked" : `badge--${key}`;
  const time = formatTime(s.submittedMs);
  const comment = getComment(s.answers);

  const answers = SURVEY_QUESTIONS.map((q) => `
    <div class="fb-answer">
      <dt class="fb-answer__label">${escapeHtml(q.label)}</dt>
      <dd class="fb-answer__question">${escapeHtml(q.text)}</dd>
      <dd class="fb-answer__value">${escapeHtml(formatAnswer(q, s.answers[q.key]))}</dd>
    </div>`).join("");

  return `
    <article class="card fb-card" data-id="${escapeHtml(s.id)}">
      <div class="fb-card__meta">
        ${field("Learner", escapeHtml(displayName(s)), "fb-field--name")}
        ${field("Email", s.userEmail ? escapeHtml(s.userEmail) : "&mdash;", "fb-field--email")}
        ${field("Level", `<span class="badge ${badgeClass}">${escapeHtml(levelLabel(s.level))}</span>`)}
        ${field("Submitted", `${escapeHtml(formatDate(s.submittedMs))}${time ? `<span class="fb-field__sub">${escapeHtml(time)}</span>` : ""}`)}
      </div>
      <div class="fb-card__body">
        <span class="fb-field__label">Feedback</span>
        <dl class="fb-answers">${answers}</dl>
        <div class="fb-comment">
          <span class="fb-answer__label">${escapeHtml(COMMENT_QUESTION.label)}</span>
          ${comment
            ? `<p class="fb-comment__text">${escapeHtml(comment)}</p>`
            : `<p class="fb-comment__text fb-comment__text--none">${escapeHtml(NO_COMMENT_TEXT)}</p>`}
        </div>
      </div>
    </article>`;
}

/* ── list ────────────────────────────────────────────────────────── */
function applyFilters({ resetPaging = true } = {}) {
  filtered = filterSurveys(allSurveys, {
    level: els["fb-level-filter"].value,
    term: els["fb-search"].value,
  });
  if (resetPaging) visibleCount = PAGE_SIZE;
  renderList();
}

function renderList() {
  if (!allSurveys.length) {
    showState("empty", "No feedback submissions yet.");
    return;
  }
  if (!filtered.length) {
    showState("empty", "No feedback matches your search or filter.");
    return;
  }
  const shown = filtered.slice(0, visibleCount);
  els["fb-list"].innerHTML = shown.map(renderCard).join("");
  const total = allSurveys.length;
  els["fb-count"].textContent = filtered.length === total
    ? `Showing ${shown.length} of ${total} submission${total === 1 ? "" : "s"}, newest first`
    : `Showing ${shown.length} of ${filtered.length} matching (${total} total), newest first`;
  const remaining = filtered.length - shown.length;
  els["fb-more"].textContent = `Show ${Math.min(PAGE_SIZE, remaining)} more (${remaining} remaining)`;
  showState("list");
}

/* ── loading ─────────────────────────────────────────────────────── */
async function loadFeedback() {
  if (loading) return; // ignore repeated Refresh / Retry clicks
  loading = true;
  els["fb-refresh"].disabled = true;
  resetStats();
  showState("loading");
  try {
    const [surveys, users] = await Promise.all([
      listSurveys(),
      // Users are only used to fill in identity on legacy surveys; the
      // page still works (with "Unknown learner") if this read fails.
      listUsers().catch((err) => {
        console.warn("[admin-feedback] Could not load users for name lookup:", err);
        return [];
      }),
    ]);
    allSurveys = enrichWithUsers(surveys, users);
    renderStats();
    applyFilters();
  } catch (err) {
    console.error("[admin-feedback] Failed to load surveys:", err);
    allSurveys = [];
    filtered = [];
    showState("error");
  } finally {
    loading = false;
    els["fb-refresh"].disabled = false;
  }
}

function wireEvents() {
  els["fb-search"].addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, SEARCH_DEBOUNCE_MS);
  });
  els["fb-level-filter"].addEventListener("change", applyFilters);
  els["fb-more"].addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderList();
  });
  els["fb-refresh"].addEventListener("click", loadFeedback);
  els["fb-retry"].addEventListener("click", loadFeedback);
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  cacheEls();
  wireEvents();
  await loadFeedback();
}

document.addEventListener("DOMContentLoaded", init);
