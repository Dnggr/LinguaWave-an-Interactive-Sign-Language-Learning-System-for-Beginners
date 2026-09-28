/**
 * admin-dashboard.js — Controller for pages/admin-dashboard.html (NEW)
 * Gates the page on the admin account, then fills the three summary
 * stat tiles from Firestore. Everything else on the page (quick links)
 * is static markup.
 */
import { getReportStats } from "./admin-firebase.js";

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;

  try {
    const stats = await getReportStats();
    document.getElementById("stat-users").textContent = stats.totalUsers;
    document.getElementById("stat-signs").textContent = stats.totalSigns;
    document.getElementById("stat-questions").textContent = stats.totalQuestions;
  } catch (err) {
    console.error("Failed to load admin stats:", err);
    window.LinguaWave?.showToast?.("Couldn't load stats from Firestore.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
