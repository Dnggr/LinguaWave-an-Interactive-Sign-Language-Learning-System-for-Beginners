/**
 * admin-reports.js — Controller for pages/admin-reports.html (NEW)
 * Purely read-only: pulls getReportStats() from js/admin-firebase.js
 * and renders it as stat tiles + breakdown bars (learners by their
 * level; lessons and quiz questions by chapter) + a recent sign-ups list,
 * plus the feedback section (totals, by level, recent) taken from the same
 * getReportStats() call — no extra queries. No writes happen on this page.
 */
import { getReportStats } from "./admin-firebase.js";
import { LEVEL_LABEL as SURVEY_LEVEL_LABEL, levelLabel, formatDate } from "./survey-schema.js";

const LEVEL_LABEL = { basic: "Basic", medium: "Medium", intermediate: "Intermediate", unspecified: "Unspecified" };
const LEVEL_ORDER = ["basic", "medium", "intermediate", "unspecified"];

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// entries: [{ label, count }]
function renderBars(containerId, entries, total) {
  const el = document.getElementById(containerId);

  if (!entries.length) {
    el.innerHTML = `<p class="text-muted">No data yet.</p>`;
    return;
  }

  el.innerHTML = entries.map(({ label, count }) => {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="admin-bar-row">
        <span>${escapeHtml(label)}</span>
        <span class="admin-bar-row__track"><span class="admin-bar-row__fill" style="width:${pct}%;"></span></span>
        <span class="admin-bar-row__count">${count}</span>
      </div>
    `;
  }).join("");
}

// Learners' own level field -> bar entries in a fixed order.
function levelEntries(byLevel) {
  return LEVEL_ORDER.filter((l) => byLevel[l]).map((l) => ({ label: LEVEL_LABEL[l] || l, count: byLevel[l] }));
}

function renderRecentUsers(users) {
  const el = document.getElementById("report-recent-users");
  if (!users.length) {
    el.innerHTML = `<p class="text-muted">No learners yet.</p>`;
    return;
  }
  el.innerHTML = `
    <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:var(--space-3);">
      ${users.map((u) => `
        <li style="display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);">
          <span>
            <strong>${escapeHtml(u.name || u.email || "Learner")}</strong>
            <span class="text-muted"> &middot; ${escapeHtml(u.email || "")}</span>
          </span>
          <span class="text-muted" style="white-space:nowrap;">${escapeHtml(u.joined || "&mdash;")}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

// Feedback by level: same bar component as the other breakdowns. "other"
// (missing/unknown level on legacy surveys) only shows when non-zero.
function renderFeedbackByLevel(fb) {
  const entries = ["basic", "medium", "intermediate", "other"]
    .filter((k) => fb.byLevel[k])
    .map((k) => ({ label: SURVEY_LEVEL_LABEL[k], count: fb.byLevel[k] }));
  renderBars("report-feedback-by-level", entries, fb.total);
}

function renderRecentFeedback(rows) {
  const el = document.getElementById("report-recent-feedback");
  if (!rows.length) {
    el.innerHTML = `<p class="text-muted">No feedback submissions yet.</p>`;
    return;
  }
  el.innerHTML = `
    <ul class="fb-recent">
      ${rows.map((f) => `
        <li>
          <span class="fb-recent__who">
            <strong>${escapeHtml(f.name)}</strong>
            <span class="text-muted"> &middot; ${escapeHtml(levelLabel(f.level))}</span>
          </span>
          <span class="text-muted fb-recent__when">${escapeHtml(formatDate(f.submittedMs))}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderFeedbackUnavailable() {
  document.getElementById("report-total-feedback").textContent = "\u2014";
  const msg = `<p class="text-muted">Unable to load feedback. Please try again.</p>`;
  document.getElementById("report-feedback-by-level").innerHTML = msg;
  document.getElementById("report-recent-feedback").innerHTML = msg;
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;

  try {
    const stats = await getReportStats();

    document.getElementById("report-total-users").textContent = stats.totalUsers;
    document.getElementById("report-total-signs").textContent = stats.totalLessons;
    document.getElementById("report-total-questions").textContent = stats.totalQuizzes;

    renderBars("report-users-by-level", levelEntries(stats.usersByLevel), stats.totalUsers);
    renderBars("report-signs-by-level", stats.lessonsByChapter, stats.totalLessons);
    renderBars("report-questions-by-level", stats.quizQuestionsByChapter, stats.totalQuizQuestions);
    renderRecentUsers(stats.recentUsers);

    if (stats.feedback) {
      document.getElementById("report-total-feedback").textContent = stats.feedback.total;
      renderFeedbackByLevel(stats.feedback);
      renderRecentFeedback(stats.recentFeedback);
    } else {
      renderFeedbackUnavailable();
    }
  } catch (err) {
    console.error("Failed to load report stats:", err);
    window.LinguaWave?.showToast?.("Couldn't load reports from Firestore.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
