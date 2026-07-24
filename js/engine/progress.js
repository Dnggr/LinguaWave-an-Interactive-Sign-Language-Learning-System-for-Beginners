/**
 * js/engine/progress.js — Progress Tracking Engine
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single source of truth for what a learner has practiced,
 *            passed, and unlocked. Replaces the old flat "lw_progress"
 *            blob (score-per-sign only) with a structure that mirrors
 *            the real flow: sign practice → category assessment →
 *            level assessment, matching the flowchart's
 *            "End-of-lesson assessment" / "Score ≥ 80%?" / "More
 *            lessons available?" nodes — just resolved per category
 *            and per level instead of per single sign.
 *
 * CONNECTS : Loaded as a plain <script> (not a module) on every page
 *            that needs it, AFTER js/data.js:
 *              pages/lesson.html, pages/learn.html, pages/quiz.html,
 *              pages/dashboard.html
 *            Read by: js/lesson.js (records practice), js/quiz.js
 *            (records assessment results, computes lock state),
 *            js/learn.js (lock icons / CTA), js/dashboard.js (stats).
 *
 * STORAGE  : localStorage key 'lw_progress_v2'. Shape:
 *   {
 *     levels: {
 *       [level]: {
 *         categories: {
 *           [categoryId]: {
 *             signs: { [signId]: { practicedAt } },
 *             assessment: { attempts, bestScore, lastScore, passed,
 *                            breakdown, lastAt } | null
 *           }
 *         },
 *         levelAssessment: { attempts, bestScore, lastScore, passed,
 *                             breakdown, lastAt } | null
 *       }
 *     }
 *   }
 *
 * TODO     : Swap loadStore()/saveStore() for Firestore users/{uid}
 *            reads/writes. Every other function is storage-agnostic.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

(function () {
  const STORE_KEY     = 'lw_progress_v2';
  const LEVEL_ORDER    = ['basic', 'medium', 'intermediate'];
  const PASS_THRESHOLD = 0.80;

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { console.warn('[progress.js] corrupt store, resetting', e); return {}; }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { console.warn('[progress.js] could not save progress:', e); }
  }

  function ensureLevel(store, level) {
    if (!store.levels) store.levels = {};
    if (!store.levels[level]) store.levels[level] = { categories: {}, levelAssessment: null };
    return store.levels[level];
  }

  function ensureCategory(store, level, category) {
    const lvl = ensureLevel(store, level);
    if (!lvl.categories[category]) lvl.categories[category] = { signs: {}, assessment: null };
    return lvl.categories[category];
  }

  /* ── Writes ────────────────────────────────────────────────────── */

  /** Mark a sign as practiced (viewed / attempted in lesson.html). */
  function recordSignPracticed(level, category, signId) {
    const store = loadStore();
    const cat   = ensureCategory(store, level, category);
    cat.signs[signId] = { ...(cat.signs[signId] || {}), practicedAt: new Date().toISOString() };
    saveStore(store);
  }

  /**
   * Record the result of a category-end assessment.
   * @param {{score:number, passed:boolean, breakdown:object}} result
   */
  function recordCategoryAssessment(level, category, result) {
    const store = loadStore();
    const cat   = ensureCategory(store, level, category);
    const prev  = cat.assessment;
    cat.assessment = {
      attempts:  (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      lastScore: result.score,
      passed:    !!(prev?.passed) || !!result.passed,
      breakdown: result.breakdown ?? null,
      lastAt:    new Date().toISOString(),
    };
    saveStore(store);
    return cat.assessment;
  }

  /** Record the result of a level-final assessment. */
  function recordLevelAssessment(level, result) {
    const store = loadStore();
    const lvl   = ensureLevel(store, level);
    const prev  = lvl.levelAssessment;
    lvl.levelAssessment = {
      attempts:  (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      lastScore: result.score,
      passed:    !!(prev?.passed) || !!result.passed,
      breakdown: result.breakdown ?? null,
      lastAt:    new Date().toISOString(),
    };
    saveStore(store);
    return lvl.levelAssessment;
  }

  /* ── Reads ─────────────────────────────────────────────────────── */

  function getCategoryProgress(level, category) {
    const store = loadStore();
    return store.levels?.[level]?.categories?.[category] ?? { signs: {}, assessment: null };
  }

  function getLevelAssessment(level) {
    const store = loadStore();
    return store.levels?.[level]?.levelAssessment ?? null;
  }

  /** Categories in a level that actually have playable sign content. */
  function liveCategoriesFor(level) {
    const cats = window.LWData?.getCategoriesForLevel?.(level) ?? [];
    return cats.filter(c => !c.comingSoon && (window.LWData.getCategorySigns(level, c.id).length > 0));
  }

  /**
   * A category is unlocked if it's the first live category in its level,
   * or the previous live category's assessment has been passed.
   */
  function isCategoryUnlocked(level, categoryId) {
    const live = liveCategoriesFor(level);
    const idx  = live.findIndex(c => c.id === categoryId);
    if (idx <= 0) return true;
    const prevProg = getCategoryProgress(level, live[idx - 1].id);
    return !!prevProg.assessment?.passed;
  }

  /**
   * Levels themselves are never locked — a learner can jump straight
   * into Medium or Intermediate if that's what they want to practice.
   * Progress/assessments are still tracked per level regardless; this
   * only ever gated ACCESS, which product decided against. Categories
   * within a level are still sequential (see isCategoryUnlocked).
   */
  function isLevelUnlocked(_level) {
    return true;
  }

  /** The level-final assessment unlocks once every live category has passed. */
  function isLevelFinalUnlocked(level) {
    const live = liveCategoriesFor(level);
    if (live.length === 0) return false;
    return live.every(c => !!getCategoryProgress(level, c.id).assessment?.passed);
  }

  /** Aggregate stats for a level — powers dashboard cards + learn.js locks. */
  function getLevelStats(level) {
    const live    = liveCategoriesFor(level);
    const allCats = window.LWData?.getCategoriesForLevel?.(level) ?? [];
    let totalSigns = 0, practicedSigns = 0, passedCategories = 0;

    live.forEach(c => {
      const signs = window.LWData.getCategorySigns(level, c.id);
      const prog  = getCategoryProgress(level, c.id);
      totalSigns    += signs.length;
      practicedSigns += signs.filter(s => !!prog.signs[s]).length;
      if (prog.assessment?.passed) passedCategories++;
    });

    return {
      totalCategories:  allCats.length,
      liveCategories:   live.length,
      passedCategories,
      totalSigns, practicedSigns,
      pct: totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0,
      levelAssessment:    getLevelAssessment(level),
      levelFinalUnlocked: isLevelFinalUnlocked(level),
      unlocked:           isLevelUnlocked(level),
    };
  }

  /** Flat list of every practiced sign, for the dashboard recap grid. */
  function getAllLearnedSigns() {
    const store = loadStore();
    const out = [];
    Object.entries(store.levels || {}).forEach(([level, lvl]) => {
      Object.entries(lvl.categories || {}).forEach(([category, catData]) => {
        Object.keys(catData.signs || {}).forEach(signId => out.push({ level, category, signId }));
      });
    });
    return out;
  }

  window.LWProgress = {
    PASS_THRESHOLD, LEVEL_ORDER,
    recordSignPracticed, recordCategoryAssessment, recordLevelAssessment,
    getCategoryProgress, getLevelAssessment, getLevelStats,
    isCategoryUnlocked, isLevelUnlocked, isLevelFinalUnlocked,
    liveCategoriesFor, getAllLearnedSigns,
  };
})();