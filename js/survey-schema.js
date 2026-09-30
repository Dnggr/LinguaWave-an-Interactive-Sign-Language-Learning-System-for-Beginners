/**
 * survey-schema.js — Shared survey definitions + pure helpers (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : One place that knows what a `surveys/{id}` document looks
 *            like and how to turn it into something an admin can read.
 *            Used by js/admin-firebase.js (normalise + stats),
 *            js/admin-feedback.js, js/admin-dashboard.js and
 *            js/admin-reports.js. No Firebase, no DOM — pure functions,
 *            so it can be unit-tested in Node.
 *
 * KEEP IN SYNC : SURVEY_QUESTIONS below mirrors the question text and
 *            radio values in pages/feedback.html. Stored keys stay
 *            q1..q5 (existing documents depend on them); this file only
 *            translates them into readable labels for the admin.
 *              q1  1-5   "How satisfied are you with this level overall?"
 *              q2  1-5   "How clear were the sign images and video ...?"
 *              q3  too_easy | just_right | too_hard
 *              q4  yes | maybe | no
 *              q5  free text (optional; stored as null when left empty)
 *            js/feedback.js writes; firestore.rules validates the same
 *            shape. Change one, change all three.
 *
 * LEGACY DOCUMENTS : Surveys saved before this feature stored only
 *            { userId, level, answers, submittedAt } (no userName /
 *            userEmail, and level could be "unknown"). normalizeSurvey()
 *            tolerates that; enrichWithUsers() fills the identity from
 *            the already-loaded `users` list when it can.
 * ─────────────────────────────────────────────────────────────────
 */

export const SURVEY_LEVELS = ["basic", "medium", "intermediate"];

export const LEVEL_LABEL = {
  basic: "Basic",
  medium: "Medium",
  intermediate: "Intermediate",
  other: "Other / unknown",
};

const RATING_1_TO_5_SATISFACTION = {
  1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent",
};
const RATING_1_TO_5_CLARITY = {
  1: "Very Unclear", 2: "Unclear", 3: "Neutral", 4: "Clear", 5: "Very Clear",
};
const DIFFICULTY = { too_easy: "Too Easy", just_right: "Just Right", too_hard: "Too Hard" };
const RECOMMEND = { yes: "Yes", maybe: "Maybe", no: "No" };

/** label = "Question N" heading; text = the exact wording learners saw. */
export const SURVEY_QUESTIONS = [
  { key: "q1", label: "Question 1", text: "How satisfied are you with this level overall?",
    map: RATING_1_TO_5_SATISFACTION, numbered: true },
  { key: "q2", label: "Question 2", text: "How clear were the sign images and video demonstrations?",
    map: RATING_1_TO_5_CLARITY, numbered: true },
  { key: "q3", label: "Question 3", text: "How would you rate the difficulty of this level?",
    map: DIFFICULTY },
  { key: "q4", label: "Question 4", text: "Would you recommend LinguaWave to someone learning ASL?",
    map: RECOMMEND },
];

export const COMMENT_QUESTION = {
  key: "q5", label: "Additional Comments",
  text: "Any additional comments or suggestions?",
};

export const NO_COMMENT_TEXT = "No additional comments";
export const NO_ANSWER_TEXT = "Not answered";

/* ── formatting ──────────────────────────────────────────────────── */

/**
 * Human-readable answer for q1..q4, or NO_ANSWER_TEXT. Never returns
 * "null", "undefined" or "[object Object]": anything that isn't a plain
 * string/number is treated as unanswered.
 */
export function formatAnswer(question, raw) {
  if (raw === null || raw === undefined) return NO_ANSWER_TEXT;
  if (typeof raw !== "string" && typeof raw !== "number") return NO_ANSWER_TEXT;
  const value = String(raw).trim();
  if (!value) return NO_ANSWER_TEXT;
  const label = question.map[value];
  if (!label) return value; // unknown/legacy value: show it as stored, as text
  return question.numbered ? `${value}: ${label}` : label;
}

/** Comment text or null when empty / not a string. */
export function getComment(answers) {
  const raw = answers && answers.q5;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return text || null;
}

export function levelKey(level) {
  const l = typeof level === "string" ? level.trim().toLowerCase() : "";
  return SURVEY_LEVELS.includes(l) ? l : "other";
}

export function levelLabel(level) {
  return LEVEL_LABEL[levelKey(level)];
}

/** "September 29, 2026" or "Unknown date". */
export function formatDate(ms) {
  if (!Number.isFinite(ms)) return "Unknown date";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

/** "3:42 PM" or "". */
export function formatTime(ms) {
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ── normalising Firestore documents ─────────────────────────────── */

function toMillis(value) {
  if (value === null || value === undefined) return null;
  // Firestore Timestamp (if a future writer switches to serverTimestamp()).
  if (typeof value === "object" && typeof value.toMillis === "function") {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function cleanString(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Raw Firestore data -> a flat, safe object. Every field has a defined
 * type so renderers never have to guard against undefined.
 */
export function normalizeSurvey(id, data) {
  const d = data && typeof data === "object" ? data : {};
  const answers = d.answers && typeof d.answers === "object" ? d.answers : {};
  return {
    id: String(id),
    userId: cleanString(d.userId, 128),
    userName: cleanString(d.userName, 100),
    userEmail: cleanString(d.userEmail, 254),
    level: cleanString(d.level, 30).toLowerCase(),
    answers,
    submittedMs: toMillis(d.submittedAt),
  };
}

/**
 * Fills a missing name/email on legacy surveys from a `users` list
 * (the caller already has one; no per-row Firestore reads). Returns a
 * new array. Rows that can't be matched keep empty strings and are
 * displayed as "Unknown learner" by the renderer.
 */
export function enrichWithUsers(surveys, users) {
  const byUid = new Map();
  (users || []).forEach((u) => { if (u && u.id) byUid.set(u.id, u); });
  return surveys.map((s) => {
    if ((s.userName && s.userEmail) || !s.userId) return s;
    const u = byUid.get(s.userId);
    if (!u) return s;
    return {
      ...s,
      userName: s.userName || cleanString(u.name, 100),
      userEmail: s.userEmail || cleanString(u.email, 254),
    };
  });
}

export function displayName(s) {
  return s.userName || (s.userEmail ? s.userEmail.split("@")[0] : "") || "Unknown learner";
}

/* ── sorting / filtering / stats ─────────────────────────────────── */

/**
 * Newest first. Documents with a missing/invalid timestamp sort last
 * (ties broken by id so the order is stable between renders).
 */
export function sortNewestFirst(surveys) {
  return [...surveys].sort((a, b) => {
    const am = a.submittedMs, bm = b.submittedMs;
    const aOk = Number.isFinite(am), bOk = Number.isFinite(bm);
    if (aOk && bOk && am !== bm) return bm - am;
    if (aOk !== bOk) return aOk ? -1 : 1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/**
 * filters: { level: "" | "basic" | "medium" | "intermediate", term: string }
 * term matches learner name, email and the written comment.
 */
export function filterSurveys(surveys, { level = "", term = "" } = {}) {
  const t = term.trim().toLowerCase();
  return surveys.filter((s) => {
    if (level && levelKey(s.level) !== level) return false;
    if (!t) return true;
    const comment = getComment(s.answers) || "";
    return (
      displayName(s).toLowerCase().includes(t) ||
      s.userEmail.toLowerCase().includes(t) ||
      comment.toLowerCase().includes(t)
    );
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Everything is derived from the array passed in; nothing is invented. */
export function computeSurveyStats(surveys, now = Date.now()) {
  const byLevel = { basic: 0, medium: 0, intermediate: 0, other: 0 };
  let thisWeek = 0;
  let latestMs = null;
  surveys.forEach((s) => {
    byLevel[levelKey(s.level)] += 1;
    if (Number.isFinite(s.submittedMs)) {
      if (now - s.submittedMs <= WEEK_MS && s.submittedMs <= now + 60 * 1000) thisWeek += 1;
      if (latestMs === null || s.submittedMs > latestMs) latestMs = s.submittedMs;
    }
  });
  return { total: surveys.length, byLevel, thisWeek, latestMs };
}
