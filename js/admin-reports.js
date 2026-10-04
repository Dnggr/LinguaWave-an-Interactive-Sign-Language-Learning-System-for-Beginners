/**
 * admin-reports.js — Controller for pages/admin-reports.html
 * Read-only. One getReportStats() call (js/admin-firebase.js) feeds everything: KPI tiles, sign-ups of the
 * last 14 days, a feedback snapshot (averages + difficulty split), lessons / quiz questions by chapter
 * (bars scale to the biggest chapter), and the recent sign-ups / feedback lists. No level breakdowns:
 * the app is one linear trail. No writes happen on this page.
 */
import { getReportStats } from "./admin-firebase.js";
import { formatDate } from "./survey-schema.js";

const $ = (id) => document.getElementById(id);
const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initial = (s) => (String(s || "?").trim()[0] || "?").toUpperCase();

// entries: [{ label, count }] ; bars scale to the largest value so differences are visible.
function renderBars(id, entries, total) {
  const el = $(id);
  if (!entries.length) { el.innerHTML = `<p class="text-muted">No data yet.</p>`; return; }
  const max = Math.max(...entries.map((e) => e.count), 1);
  el.innerHTML = `<ul class="rp-bars">${entries.map(({ label, count }) => `
    <li class="rp-bar">
      <span class="rp-bar__label">${esc(label)}</span>
      <span class="rp-bar__track" aria-hidden="true"><span class="rp-bar__fill" style="width:${((count / max) * 100).toFixed(1)}%"></span></span>
      <span class="rp-bar__num">${count}<span class="rp-bar__pct"> ${total ? Math.round((count / total) * 100) : 0}%</span></span>
    </li>`).join("")}</ul>`;
}

// 14 columns, one per day; the title gives the exact date and count.
function renderSignups(days) {
  const el = $("report-signups");
  const total = days.reduce((n, d) => n + d.count, 0);
  const max = Math.max(...days.map((d) => d.count), 1);
  const cols = days.map((d) => {
    const dt = new Date(`${d.date}T00:00:00`);
    const lbl = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `<div class="rp-col" title="${esc(lbl)}: ${d.count} sign-up${d.count === 1 ? "" : "s"}">
      <span class="rp-col__n">${d.count || ""}</span>
      <span class="rp-col__bar" style="height:${d.count ? Math.max(6, (d.count / max) * 100) : 3}%"></span>
      <span class="rp-col__d">${dt.getDate()}</span>
    </div>`;
  }).join("");
  el.innerHTML = `<p class="rp-big">${total} <span>new learner${total === 1 ? "" : "s"} in 14 days</span></p><div class="rp-cols" role="img" aria-label="Sign-ups per day, last 14 days: ${total} total">${cols}</div>`;
}

function renderFeedbackSummary(dist) {
  const el = $("report-feedback-summary");
  const q = (k) => dist.find((d) => d.key === k);
  const [q1, q2, q3, q4] = ["q1", "q2", "q3", "q4"].map(q);
  if (!q1 || !q1.answered && !q4.answered) { el.innerHTML = `<p class="text-muted">No feedback submissions yet.</p>`; return; }
  const yes = q4.buckets.find((b) => b.value === "yes");
  const avg = (d) => (d.average === null ? "&mdash;" : d.average.toFixed(1));
  const seg = { too_easy: "mid", just_right: "good", too_hard: "warn" };
  el.innerHTML = `
    <div class="rp-mini">
      <div><strong>${avg(q1)}<small>/5</small></strong><span>Satisfaction</span></div>
      <div><strong>${avg(q2)}<small>/5</small></strong><span>Sign clarity</span></div>
      <div><strong>${q4.answered ? Math.round(yes.pct) : "&mdash;"}<small>${q4.answered ? "%" : ""}</small></strong><span>Would recommend</span></div>
    </div>
    <p class="rp-sub">Difficulty</p>
    <div class="rp-stack" role="img" aria-label="Difficulty: ${q3.buckets.map((b) => `${b.label} ${b.count}`).join(", ")}">
      ${q3.buckets.filter((b) => b.count).map((b) => `<span class="rp-stack__seg rp-stack__seg--${seg[b.value]}" style="flex:${b.count}"></span>`).join("") || `<span class="rp-stack__seg" style="flex:1"></span>`}
    </div>
    <ul class="rp-legend">${q3.buckets.map((b) => `<li><i class="rp-dot rp-dot--${seg[b.value]}"></i>${esc(b.label)} <b>${b.count}</b></li>`).join("")}</ul>`;
}

function renderRecentUsers(users) {
  const el = $("report-recent-users");
  if (!users.length) { el.innerHTML = `<p class="text-muted">No learners yet.</p>`; return; }
  el.innerHTML = `<ul class="rp-list">${users.map((u) => `
    <li><span class="rp-avatar" aria-hidden="true">${esc(initial(u.name || u.email))}</span>
      <span class="rp-list__who"><strong>${esc(u.name || u.email || "Learner")}</strong><small>${esc(u.email || "")}</small></span>
      <span class="rp-list__when">${esc(u.joined || "—")}</span></li>`).join("")}</ul>`;
}

function renderRecentFeedback(rows) {
  const el = $("report-recent-feedback");
  if (!rows.length) { el.innerHTML = `<p class="text-muted">No feedback submissions yet.</p>`; return; }
  el.innerHTML = `<ul class="rp-list">${rows.map((f) => `
    <li><span class="rp-avatar" aria-hidden="true">${esc(initial(f.name))}</span>
      <span class="rp-list__who"><strong>${esc(f.name)}</strong><small>${esc(f.email || "")}</small></span>
      <span class="rp-list__when">${esc(formatDate(f.submittedMs))}</span></li>`).join("")}</ul>`;
}

function renderFeedbackUnavailable() {
  $("report-total-feedback").textContent = "\u2014";
  const msg = `<p class="text-muted">Unable to load feedback. Please try again.</p>`;
  $("report-feedback-summary").innerHTML = msg;
  $("report-recent-feedback").innerHTML = msg;
}

// Refresh: put every placeholder back to its skeleton so a reload looks like a load, not a freeze.
// (The first load uses the skeletons already in the HTML.)
let loadedOnce = false;
function showLoading() {
  const S = window.LWSkeleton;
  if (!S) return;
  ["report-total-users", "report-total-signs", "report-total-questions", "report-total-feedback"].forEach((id) => {
    const el = $(id);
    el.setAttribute("data-sk-inline", "");
    el.innerHTML = S.kpi();
  });
  $("report-new-users").textContent = "";
  $("report-avg-rating").textContent = "";
  $("report-signups").innerHTML = S.chart("Loading sign-ups\u2026");
  $("report-feedback-summary").innerHTML = S.bars("Loading feedback snapshot\u2026", 4);
  $("report-signs-by-level").innerHTML = S.bars("Loading lessons by chapter\u2026", 6);
  $("report-questions-by-level").innerHTML = S.bars("Loading quiz questions by chapter\u2026", 6);
  $("report-recent-users").innerHTML = S.list("Loading recent sign-ups\u2026", 5);
  $("report-recent-feedback").innerHTML = S.list("Loading recent feedback\u2026", 5);
}

async function load() {
  const btn = $("report-refresh");
  btn.disabled = true;
  if (loadedOnce) showLoading();
  try {
    const s = await getReportStats();
    $("report-total-users").textContent = s.totalUsers;
    $("report-new-users").textContent = s.newThisWeek ? `+${s.newThisWeek} this week` : "";
    $("report-total-signs").textContent = s.totalLessons;
    $("report-total-questions").textContent = s.totalQuizzes;
    renderSignups(s.signupsByDay);
    renderBars("report-signs-by-level", s.lessonsByChapter, s.totalLessons);
    renderBars("report-questions-by-level", s.quizQuestionsByChapter, s.totalQuizQuestions);
    renderRecentUsers(s.recentUsers);
    if (s.feedback) {
      $("report-total-feedback").textContent = s.feedback.total;
      const q1 = (s.answerSummary || []).find((d) => d.key === "q1");
      $("report-avg-rating").textContent = q1 && q1.average !== null ? `${q1.average.toFixed(1)} / 5 avg satisfaction` : "";
      renderFeedbackSummary(s.answerSummary || []);
      renderRecentFeedback(s.recentFeedback);
    } else {
      renderFeedbackUnavailable();
    }
    $("report-updated").textContent = `Live snapshot \u00b7 updated ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  } catch (err) {
    console.error("Failed to load report stats:", err);
    window.LWSkeleton?.settle?.(document, "Couldn't load this. Try refreshing the page.");
    window.LinguaWave?.showToast?.("Couldn't load reports from Firestore.", "error");
  } finally {
    loadedOnce = true;
    btn.disabled = false;
  }
}

async function init() {
  const ok = await window.LWAdminAuth.requireAdmin();
  if (!ok) return;
  $("report-refresh").addEventListener("click", load);
  await load();
}

document.addEventListener("DOMContentLoaded", init);