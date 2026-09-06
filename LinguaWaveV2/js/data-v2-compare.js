/**
 * js/data-v2-compare.js — Phase 2 comparison logic (dev-only)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Implements "LinguaWave_SoloLearn_Learning_Psychology_
 *            DataV2_Integration_Plan" §7 Phase 2 — "Compare the pilot
 *            mission's completion rate and drop-off points against
 *            the same mission in the current system, using whatever
 *            analytics/observation is already available."
 *
 *            This repo has NO backend analytics service — there is no
 *            events pipeline, no aggregate/multi-user data anywhere in
 *            the codebase. "Whatever ... is already available" is
 *            therefore the two localStorage stores that already exist
 *            on this browser: 'lw_progress_v3' (js/engine/progress.js,
 *            the current system) and 'lw_datav2_progress_v1'
 *            (js/data-v2.js, the pilot). This file reads both and
 *            produces a same-browser, single-session comparison — NOT
 *            an aggregate/A-B test across real users. A real Phase 2
 *            (multiple learners, both flows, real drop-off stats)
 *            would need an actual analytics backend this repo doesn't
 *            have; that gap is intentional to disclose, not hidden.
 *
 * DEPENDS ON : window.LWData (js/data.js), window.LWDataV2
 *            (js/data-v2.js), and window.LWProgress (js/engine/
 *            progress.js) for the "current system" side only — this
 *            file reads LWProgress but never writes to it, and is
 *            only ever loaded on the dev-only compare page, never on
 *            a real learner-facing page.
 *
 * USAGE    : window.LWDataV2Compare.getComparison(level, categoryId)
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

(function (global) {

  // ── Old system (current live app) ────────────────────────────────
  function getOldSystemStats(level, categoryId) {
    const signIds = (global.LWData && typeof global.LWData.getCategorySigns === 'function')
      ? global.LWData.getCategorySigns(level, categoryId)
      : [];

    if (!global.LWProgress || typeof global.LWProgress.getCategoryProgress !== 'function') {
      return {
        available: false,
        reason: 'js/engine/progress.js not loaded on this page.',
        totalSigns: signIds.length,
      };
    }

    const prog = global.LWProgress.getCategoryProgress(level, categoryId);
    const signRows = signIds.map((signId) => ({
      signId,
      practicedAt: prog.signs?.[signId]?.practicedAt || null,
    }));
    const practicedCount = signRows.filter((r) => r.practicedAt).length;

    // Drop-off: first sign (in category order) never practiced. If
    // every sign was practiced, the learner reached the assessment —
    // drop-off (if any) is then "started but didn't pass the quiz".
    const firstUnpracticed = signRows.find((r) => !r.practicedAt) || null;

    return {
      available: true,
      totalSigns: signIds.length,
      practicedCount,
      percentComplete: signIds.length ? Math.round((practicedCount / signIds.length) * 100) : 0,
      signRows,
      dropOffSignId: firstUnpracticed ? firstUnpracticed.signId : null,
      assessment: prog.assessment
        ? {
            attempts: prog.assessment.attempts,
            bestScore: prog.assessment.bestScore,
            passed: !!prog.assessment.passed,
            lastAt: prog.assessment.lastAt || null,
          }
        : null,
    };
  }

  // ── New system (dataV2 pilot / any migrated mission) ─────────────
  function getNewSystemStats(mission) {
    if (!mission || !mission.items.length) {
      return { available: false, reason: 'No mission (category has no signs, or dataV2 not loaded).' };
    }

    const itemRows = mission.items.map((item, i) => ({
      index: i,
      kind: item.kind,
      signId: item.signId || null,
      complete: global.LWDataV2.isItemComplete(mission, i, item),
      completedAt: global.LWDataV2.getItemCompletedAt(mission, i, item),
    }));
    const completedCount = itemRows.filter((r) => r.complete).length;
    const dropOffIndex = global.LWDataV2.getDropOffIndex(mission);
    const dropOffItem = dropOffIndex < mission.items.length ? itemRows[dropOffIndex] : null;

    return {
      available: true,
      totalItems: mission.items.length,
      completedCount,
      percentComplete: Math.round(global.LWDataV2.getMissionProgress(mission) * 100),
      itemRows,
      dropOffIndex,
      dropOffItem, // null means "completed the whole mission, including the quiz"
    };
  }

  // ── Combined comparison for one category ─────────────────────────
  function getComparison(level, categoryId) {
    const mission = global.LWDataV2 ? global.LWDataV2.getMissionForCategory(categoryId) : null;
    return {
      level,
      categoryId,
      generatedAt: new Date().toISOString(),
      old: getOldSystemStats(level, categoryId),
      dataV2: getNewSystemStats(mission),
    };
  }

  global.LWDataV2Compare = {
    getComparison,
    getOldSystemStats,
    getNewSystemStats,
  };

})(window);
