/**
 * admin-dashboard.js — Controller for pages/admin-dashboard.html (NEW)
 * Gates the page on the admin account, then fills the summary stat
 * tiles (learners, lessons, quizzes, feedback) from Firestore. Everything else on the page (quick links)
 * is static markup.
 */
import { getReportStats } from "./admin-firebase.js";

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;

  try {
    const stats = await getReportStats();
    document.getElementById("stat-users").textContent = stats.totalUsers;
    document.getElementById("stat-signs").textContent = stats.totalLessons;
    document.getElementById("stat-questions").textContent = stats.totalQuizzes;
    // Feedback comes from the same load; null means the surveys read failed
    // on its own (everything above still rendered).
    document.getElementById("stat-feedback").textContent =
      stats.feedback ? stats.feedback.total : "\u2014";
    if (stats.feedbackError) {
      window.LinguaWave?.showToast?.("Couldn't load the feedback count.", "error");
    }
  } catch (err) {
    console.error("Failed to load admin stats:", err);
    window.LinguaWave?.showToast?.("Couldn't load stats from Firestore.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
