/**
 * admin-content.js — Read-only view of the HARDCODED curriculum (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Lesson Management and Quiz Management used to read/write
 *            Firestore `signs` / `questions`. Those collections were
 *            never what learners see, so the admin screens showed
 *            data that had nothing to do with the real app. They now
 *            read the SAME hardcoded content the learner pages use:
 *            js/missions.js (window.LWMissions) for lessons, and the
 *            mastery-quiz rules from js/mastery-quiz.js for quizzes.
 *
 * NO LEVEL : the app is one linear trail (AGENTS.md — no level tiers),
 *            so nothing here exposes `level` to the admin UI. The
 *            internal `level` field on each sign is still used below,
 *            but only to call missions.js/lesson-loop.js the way they
 *            expect; it is never returned to a page.
 *
 * WHAT COUNTS AS A "LESSON" / "QUIZ" :
 *   lesson = one SIGNS entry (a sign taught in a mission).
 *   quiz   = one Mastery Quiz per mission. Its questions are built at
 *            attempt time from the mission's signs (no static question
 *            list exists — see the NOTE above SIGNS_V2's helpers in
 *            missions.js), so a "quiz" row here is the mission plus the
 *            sample question set the quiz would draw from.
 *
 * READ-ONLY ON PURPOSE : content lives in source (missions.js), so
 *            there is nothing to save to. To change a lesson, edit
 *            missions.js and redeploy.
 *
 * REQUIRES : js/missions.js and js/lesson-loop.js loaded (plain
 *            <script defer>) before the page controller runs.
 * ─────────────────────────────────────────────────────────────────
 */

// Mirrors MAX_QUESTIONS in js/mastery-quiz.js — keep in sync.
const MAX_QUIZ_QUESTIONS = 12;

function missionsApi() {
  const api = window.LWMissions;
  if (!api || !api.content || typeof api.getAllMissions !== "function") {
    throw new Error("js/missions.js is not loaded on this page.");
  }
  return api;
}

function chapterMap(api) {
  const map = new Map();
  api.getCategoryGroups().forEach((g) => map.set(g.id, g));
  return map;
}

// Same rule as uniqueSignIds() in js/mastery-quiz.js.
function uniqueSignIds(mission) {
  const seen = new Set();
  const out = [];
  (mission.items || []).forEach((item) => {
    if (item.signId && !seen.has(item.signId)) {
      seen.add(item.signId);
      out.push(item.signId);
    }
  });
  return out;
}

// Same rule as questionOptionCount() in js/mastery-quiz.js.
function questionOptionCount(mission, signId) {
  const hasRamp = (mission.items || []).some(
    (it) => it.kind === "PRACTICE" && it.signId === signId && !!it.difficultyRamp
  );
  return hasRamp ? 3 : 4;
}

/** Chapters (curriculum groups) in trail order: [{id, title, order}] */
export function getChapters() {
  return missionsApi().getCategoryGroups().map((g) => ({ id: g.id, title: g.title, order: g.order }));
}

/**
 * Every lesson (sign) in trail order.
 * [{ key, signId, title, description, tips[], imageUrl, videoUrl,
 *    detectionType, order, missionId, missionTitle, missionNumber,
 *    chapterId, chapterTitle }]
 */
export function getLessons() {
  const api = missionsApi();
  const chapters = chapterMap(api);
  const lessons = [];

  api.getAllMissions().forEach((mission, idx) => {
    const chapter = chapters.get(mission.categoryGroup) || null;
    api.content.SIGNS
      .filter((s) => s.level === mission.level && s.category === mission.category)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((s) => {
        lessons.push({
          key: s.id || `${mission.category}_${s.signId}`,
          signId: s.signId,
          title: s.title || s.signId,
          description: s.description || "",
          tips: Array.isArray(s.tips) ? s.tips : [],
          imageUrl: s.imageUrl || "",
          videoUrl: s.videoUrl || "",
          detectionType: s.detectionType || "",
          order: s.order ?? null,
          missionId: mission.id,
          missionTitle: mission.title,
          missionNumber: idx + 1,
          chapterId: chapter ? chapter.id : "",
          chapterTitle: chapter ? chapter.title : "Ungrouped",
        });
      });
  });
  return lessons;
}

/**
 * One Mastery Quiz per mission.
 * [{ missionId, title, missionNumber, chapterId, chapterTitle,
 *    signCount, questionCount }]
 * questionCount = how many questions one attempt asks (capped at 12).
 */
export function getQuizzes() {
  const api = missionsApi();
  const chapters = chapterMap(api);
  return api.getAllMissions().map((mission, idx) => {
    const chapter = chapters.get(mission.categoryGroup) || null;
    const signCount = uniqueSignIds(mission).length;
    return {
      missionId: mission.id,
      title: mission.title,
      missionNumber: idx + 1,
      chapterId: chapter ? chapter.id : "",
      chapterTitle: chapter ? chapter.title : "Ungrouped",
      signCount,
      questionCount: Math.min(MAX_QUIZ_QUESTIONS, signCount),
    };
  });
}

/**
 * The full question pool for one mission's quiz, one question per sign:
 * [{ answerTitle, options: [{ title, correct }] }]
 * Uses the real distractor builder (LWMissionsLoop.buildRecognizeOptions),
 * so what the admin sees is what a learner can be asked.
 */
export function getQuizPool(missionId) {
  const api = missionsApi();
  const loop = window.LWMissionsLoop;
  const mission = api.getAllMissions().find((m) => m.id === missionId);
  if (!mission) return [];

  const categorySignIds = api.getCategorySigns(mission.level, mission.category);
  const titleOf = (signId) =>
    (loop && typeof loop.signTitle === "function") ? loop.signTitle(mission.level, signId) : signId;

  return uniqueSignIds(mission).map((signId) => {
    const count = questionOptionCount(mission, signId);
    const built = loop && typeof loop.buildRecognizeOptions === "function"
      ? loop.buildRecognizeOptions(mission.level, signId, categorySignIds, count)
      : { correct: signId, options: [signId] };
    return {
      answerTitle: titleOf(built.correct),
      options: built.options.map((id) => ({ title: titleOf(id), correct: id === built.correct })),
    };
  });
}

/** Totals for the admin dashboard / reports. */
export function getContentStats() {
  const lessons = getLessons();
  const quizzes = getQuizzes();
  const chapterOrder = getChapters().map((c) => c.title).concat("Ungrouped");
  const tally = (items) => {
    const byChapter = new Map();
    items.forEach((it) => byChapter.set(it.chapterTitle, (byChapter.get(it.chapterTitle) || 0) + (it.__n || 1)));
    return chapterOrder
      .filter((label) => byChapter.has(label))
      .map((label) => ({ label, count: byChapter.get(label) }));
  };
  return {
    totalLessons: lessons.length,
    totalMissions: quizzes.length,
    totalQuizQuestions: quizzes.reduce((n, q) => n + q.questionCount, 0),
    lessonsByChapter: tally(lessons),
    quizQuestionsByChapter: tally(quizzes.map((q) => ({ chapterTitle: q.chapterTitle, __n: q.questionCount }))),
  };
}
