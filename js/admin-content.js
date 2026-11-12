
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

function questionOptionCount(mission, signId) {
  const hasRamp = (mission.items || []).some(
    (it) => it.kind === "PRACTICE" && it.signId === signId && !!it.difficultyRamp
  );
  return hasRamp ? 3 : 4;
}

export function getChapters() {
  return missionsApi().getCategoryGroups().map((g) => ({ id: g.id, title: g.title, order: g.order }));
}

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
      level: mission.level,
      category: mission.category,
      signCount,
      questionCount: Math.min(MAX_QUIZ_QUESTIONS, signCount),
    };
  });
}

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
