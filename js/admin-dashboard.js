/**
 * admin-dashboard.js — Controller for pages/admin-dashboard.html
 * Gates the page on the admin account, then fills the KPI tiles (learners, lessons, quizzes, feedback) and the
 * "latest sign-ups / latest feedback" lists from ONE getReportStats() call. Shortcuts are static markup.
 * Styles for tiles and lists (.rp-*) live in css/admin.css (shared with the Reports page).
 */
import { getReportStats } from "./admin-firebase.js";
import { formatDate } from "./survey-schema.js";

const $ = (id) => document.getElementById(id);
const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initial = (s) => (String(s || "?").trim()[0] || "?").toUpperCase();

function renderList(id, rows, emptyText, who, sub, when) {
  const el = $(id);
  if (!rows.length) { el.innerHTML = `<p class="text-muted">${emptyText}</p>`; return; }
  el.innerHTML = `<ul class="rp-list">${rows.map((r) => `
    <li><span class="rp-avatar" aria-hidden="true">${esc(initial(who(r) || sub(r)))}</span>
      <span class="rp-list__who"><strong>${esc(who(r) || sub(r) || "Learner")}</strong><small>${esc(sub(r))}</small></span>
      <span class="rp-list__when">${esc(when(r))}</span></li>`).join("")}</ul>`;
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;

  try {
    const stats = await getReportStats();
    $("stat-users").textContent = stats.totalUsers;
    $("stat-new-users").textContent = stats.newThisWeek ? `+${stats.newThisWeek} this week` : "";
    $("stat-signs").textContent = stats.totalLessons;
    $("stat-questions").textContent = stats.totalQuizzes;
    // Feedback comes from the same load; null means the surveys read failed on its own.
    $("stat-feedback").textContent = stats.feedback ? stats.feedback.total : "\u2014";
    const q1 = (stats.answerSummary || []).find((d) => d.key === "q1");
    $("stat-rating").textContent = q1 && q1.average !== null ? `${q1.average.toFixed(1)} / 5 avg rating` : "";

    renderList("dash-recent-users", stats.recentUsers, "No learners yet.",
      (u) => u.name, (u) => u.email || "", (u) => u.joined || "\u2014");
    if (stats.feedback) {
      renderList("dash-recent-feedback", stats.recentFeedback, "No feedback submissions yet.",
        (f) => f.name, (f) => f.email || "", (f) => formatDate(f.submittedMs));
    } else {
      $("dash-recent-feedback").innerHTML = `<p class="text-muted">Unable to load feedback. Please try again.</p>`;
    }
    if (stats.feedbackError) {
      window.LinguaWave?.showToast?.("Couldn't load the feedback count.", "error");
    }
  } catch (err) {
    console.error("Failed to load admin stats:", err);
    window.LinguaWave?.showToast?.("Couldn't load stats from Firestore.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);