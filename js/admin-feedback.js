import { listSurveys, listUsers } from "./admin-firebase.js";
import {
  SURVEY_QUESTIONS,
  COMMENT_QUESTION,
  NO_COMMENT_TEXT,
  formatAnswer,
  getComment,
  formatDate,
  formatTime,
  displayName,
  enrichWithUsers,
  filterSurveys,
  computeSurveyStats,
  computeAnswerDistributions,
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
    "fb-refresh", "fb-search", "fb-count", "fb-charts-wrap", "fb-charts",
    "fb-loading", "fb-error", "fb-retry", "fb-empty",
    "fb-list", "fb-more-wrap", "fb-more",
    "fb-stat-total", "fb-stat-week", "fb-stat-latest",
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function showState(state, message) {
  els["fb-loading"].hidden = state !== "loading";
  els["fb-error"].hidden = state !== "error";
  els["fb-empty"].hidden = state !== "empty";
  els["fb-list"].hidden = state !== "list";
  els["fb-more-wrap"].hidden = state !== "list" || visibleCount >= filtered.length;
  if (state === "empty") els["fb-empty"].textContent = message || "";
  if (state !== "list") els["fb-count"].textContent = "";
}

function renderStats() {
  const s = computeSurveyStats(allSurveys);
  els["fb-stat-total"].textContent = s.total;
  els["fb-stat-week"].textContent = s.thisWeek;
  els["fb-stat-latest"].textContent = s.latestMs === null ? "None yet" : formatDate(s.latestMs);
}

function resetStats() {
  ["total", "week", "latest"].forEach((k) => {
    const el = els[`fb-stat-${k}`];
    el.setAttribute("data-sk-inline", "");
    el.innerHTML = window.LWSkeleton ? window.LWSkeleton.kpi(k === "latest" ? "7rem" : "3rem") : "&mdash;";
  });
  els["fb-charts-wrap"].hidden = true;
  els["fb-charts"].innerHTML = "";
}

const TONE = {
  q1: { 5: "good", 4: "good", 3: "mid", 2: "warn", 1: "bad" },
  q2: { 5: "good", 4: "good", 3: "mid", 2: "warn", 1: "bad" },
  q3: { too_easy: "mid", just_right: "good", too_hard: "warn" },
  q4: { yes: "good", maybe: "mid", no: "bad" },
};

function fmtPct(p) {
  return `${Math.round(p)}%`;
}

function renderChart(d) {
  const rows = d.buckets.map((b) => {
    const tone = (TONE[d.key] && TONE[d.key][b.value]) || "mid";
    return `
      <li class="fb-bar">
        <span class="fb-bar__label">${escapeHtml(d.numbered ? `${b.value} · ${b.label}` : b.label)}</span>
        <span class="fb-bar__track" aria-hidden="true"><span class="fb-bar__fill fb-bar__fill--${tone}" style="width:${b.pct.toFixed(1)}%"></span></span>
        <span class="fb-bar__num">${b.count} <span class="fb-bar__pct">(${fmtPct(b.pct)})</span></span>
      </li>`;
  }).join("");
  const avg = d.average === null ? "" : `<span class="fb-chart__avg">Average ${d.average.toFixed(1)} / 5</span>`;
  const note = d.skipped
    ? `${d.answered} response${d.answered === 1 ? "" : "s"} &middot; ${d.skipped} not answered`
    : `${d.answered} response${d.answered === 1 ? "" : "s"}`;
  return `
    <figure class="card fb-chart">
      <figcaption class="fb-chart__head">
        <span class="fb-chart__q">${escapeHtml(d.label)}</span>
        <span class="fb-chart__text">${escapeHtml(d.text)}</span>
        ${avg}
      </figcaption>
      <ul class="fb-bars">${rows}</ul>
      <p class="fb-chart__note">${note}</p>
    </figure>`;
}

function renderCharts() {
  if (!allSurveys.length) {
    els["fb-charts-wrap"].hidden = true;
    els["fb-charts"].innerHTML = "";
    return;
  }
  els["fb-charts"].innerHTML = computeAnswerDistributions(allSurveys).map(renderChart).join("");
  els["fb-charts-wrap"].hidden = false;
}

function field(label, valueHtml, extraClass = "") {
  return `
    <div class="fb-field ${extraClass}">
      <span class="fb-field__label">${label}</span>
      <span class="fb-field__value">${valueHtml}</span>
    </div>`;
}

function renderCard(s) {
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

function applyFilters({ resetPaging = true } = {}) {
  filtered = filterSurveys(allSurveys, {
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
    showState("empty", "No feedback matches your search.");
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

async function loadFeedback() {
  if (loading) return;
  loading = true;
  els["fb-refresh"].disabled = true;
  resetStats();
  if (window.LWSkeleton) els["fb-loading"].innerHTML = window.LWSkeleton.cards("Loading feedback\u2026", 4);
  showState("loading");
  try {
    const [surveys, users] = await Promise.all([
      listSurveys(),
      listUsers().catch((err) => {
        console.warn("[admin-feedback] Could not load users for name lookup:", err);
        return [];
      }),
    ]);
    allSurveys = enrichWithUsers(surveys, users);
    renderStats();
    renderCharts();
    applyFilters();
  } catch (err) {
    console.error("[admin-feedback] Failed to load surveys:", err);
    allSurveys = [];
    filtered = [];
    ["total", "week", "latest"].forEach((k) => { els[`fb-stat-${k}`].innerHTML = "&mdash;"; });
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
