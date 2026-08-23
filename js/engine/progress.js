/**
 * js/engine/progress.js — Progress Tracking Engine
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Single source of truth for what a learner has practiced,
 *            passed, and unlocked.
 *
 *            REV 4 — PHASE 3 (this revision): the old level→category
 *            nesting is gone. Category progress is now stored FLAT,
 *            keyed only by categoryId (category ids are unique across
 *            the whole app — confirmed via data.js's CATEGORIES — so
 *            the level layer was never load-bearing for storage, only
 *            for the old per-level unlock chain). The unlock chain
 *            itself is now ONE walk across every live category in
 *            `UNITS` order (via js/data.js's getUnits()/
 *            getCategoriesForUnit()), replacing the old per-level
 *            "first category, or previous category in this level
 *            passed" rule. Level-final assessments (recordLevelAssessment
 *            / isLevelFinalUnlocked / LEVEL_ORDER) are UNCHANGED and
 *            still per-level — Rev 4 doesn't touch that concept (that's
 *            a Phase 6 quiz.js decision, not in scope here); they now
 *            live in their own flat `levelAssessments` map instead of
 *            nested inside the old `levels` tree.
 *            See SYSTEM_ARCHITECTURE.md Rev 4 → "Progress / unlock
 *            model changes" and PIVOT_CHECKLIST.md Phase 3.
 *
 * CONNECTS : Loaded as a plain <script> (not a module) on every page
 *            that needs it, AFTER js/data.js:
 *              pages/lesson.html, pages/learn.html, pages/quiz.html,
 *              pages/dashboard.html
 *            Read by: js/lesson.js (records practice), js/quiz.js
 *            (records assessment results, computes lock state),
 *            js/learn.js (lock icons / CTA), js/dashboard.js (stats).
 *            PUBLIC API SHAPE IS UNCHANGED from pre-Phase-3 — every
 *            function name/signature below is identical to before,
 *            so js/learn.js, js/quiz.js, js/dashboard.js, and
 *            js/lesson.js all keep working with zero edits (Phase 4/5/6
 *            haven't touched those files yet — see AI_MEMORY.md /
 *            PIVOT_CHECKLIST.md header rule about not touching them
 *            out of turn). Only the internals changed.
 *
 * STORAGE  : localStorage key 'lw_progress_v3' (bumped from
 *            'lw_progress_v2' — shape changed from level-nested to
 *            flat, see PIVOT_CHECKLIST.md Phase 0's answered question:
 *            "accept a reset, no migration shim" — pre-launch, so old
 *            v2 data is simply abandoned under its old key, not read
 *            or converted by this file). Shape:
 *   {
 *     uid: string,
 *     categories: {
 *       [categoryId]: {
 *         signs: { [signId]: { practicedAt } },
 *         assessment: { attempts, bestScore, lastScore, passed,
 *                        breakdown, lastAt } | null
 *       }
 *     },
 *     levelAssessments: {
 *       [level]: { attempts, bestScore, lastScore, passed,
 *                  breakdown, lastAt } | null
 *     },
 *     unitAssessments: {
 *       // NEW (this session, Rev 6 — Fingerspell-as-assessment): same
 *       // shape as levelAssessments, keyed by a `gated: true` UNITS id
 *       // instead of a level. Currently only 'fingerspell_name'.
 *       [unitId]: { attempts, bestScore, lastScore, passed, lastAt } | null
 *     }
 *   }
 *
 * TODO     : Swap loadStore()/saveStore() for Firestore users/{uid}
 *            reads/writes. Every other function is storage-agnostic.
 * ─────────────────────────────────────────────────────────────────
 */


'use strict';

(function () {
  const STORE_KEY     = 'lw_progress_v3';
  const LEVEL_ORDER    = ['basic', 'medium', 'intermediate'];
  const PASS_THRESHOLD = 0.80;

  /**
   * ⚠️ TEMPORARY DEBUG SWITCH — added 2026-08-21, per explicit user
   * request, NOT part of PIVOT_CHECKLIST.md's Dashboard UX Review scope.
   *
   * Phase 4 (2026-08-18/19) reintroduced real per-category locking via
   * isCategoryUnlocked() below — a deliberate REVERSAL of the old Rev 3
   * "categories are never locked" stance (see AI_MEMORY.md §0's
   * "Flagging for review (Phase 4)" and this function's own doc comment).
   * That flag is still open: Joshua hasn't signed off on the reversal
   * itself, and locking makes it hard to reach/debug categories out of
   * order without grinding through the chain for real.
   *
   * Setting this to `true` makes isCategoryUnlocked() return `true`
   * unconditionally, for every category, everywhere it's called
   * (js/learn.js trail + direct-link guard, js/dashboard.js unit rows
   * and "You are here"/Continue-Learning destination). Nothing about
   * the underlying chain/order/pass logic changes — getOrderedLive
   * Categories(), getCategoryProgress(), and the assessment-pass rule
   * are all untouched, so flipping this back is a ONE-LINE, fully
   * reversible change (isCategoryUnlocked()'s real logic is still
   * right below, just short-circuited).
   *
   * MUST be set back to `false` before this ships / before real locking
   * is evaluated again — flagged in AI_MEMORY.md's Session Log and
   * PIVOT_CHECKLIST.md so this isn't forgotten in a later session.
   */
  const DEBUG_UNLOCK_ALL = true;

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { console.warn('[progress.js] corrupt store, resetting', e); return {}; }
  }

  function saveStoreLocal(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  async function saveStore(store) {
    saveStoreLocal(store); // write locally first, always — instant, safe from navigation interruption

    try {
      const { db, doc, setDoc, getCurrentUser } = window.LWAuth;
      const user = getCurrentUser();
      if (!user) return;

      const userRef = doc(db, 'userProgress', user.uid);
      await setDoc(userRef, store);
    } catch (e) {
      console.warn('[progress.js] could not save progress:', e);
    }
  }

  // REV 4 PHASE 3 — CHANGED: flat by categoryId, no more level layer.
  function ensureCategory(store, categoryId) {
    if (!store.categories) store.categories = {};
    if (!store.categories[categoryId]) store.categories[categoryId] = { signs: {}, assessment: null };
    return store.categories[categoryId];
  }

  // NEW (this session) — small flat map for gated 'interactive' units
  // (currently just fingerspell_name). Same shape/pattern as
  // levelAssessments below, keyed by unit id instead of level. See
  // isCategoryUnlocked()'s CHANGED note for why this exists.
  function ensureUnitAssessments(store) {
    if (!store.unitAssessments) store.unitAssessments = {};
    return store.unitAssessments;
  }

  // NEW — level-final assessments still get their own small flat map;
  // this concept is untouched by the Phase 3 flattening (see file header).
  function ensureLevelAssessments(store) {
    if (!store.levelAssessments) store.levelAssessments = {};
    return store.levelAssessments;
  }

 /* ── HYDRATE: pull remote progress into local cache ───────────────
   * Runs once when this script loads. Waits for Firebase to confirm
   * who's logged in, then checks whether the cached store actually
   * belongs to THIS user. If not (new device, different account, or
   * empty cache), fetches the real progress from Firestore instead.
   * ──────────────────────────────────────────────────────────────── */
  let resolveProgressReady;
  const progressReady = new Promise((resolve) => { resolveProgressReady = resolve; });

async function hydrateStore() {
  await window.LWAuth?.whenAuthReady?.();
  console.log('[progress.js] authReady resolved, starting hydration check');

  const { db, doc, getDoc, getCurrentUser } = window.LWAuth;
  const user = getCurrentUser();

  if (!user) {
    console.log('[progress.js] no user, skipping hydration');
    resolveProgressReady();
    return;
  }

  const cached = loadStore();
  console.log('[progress.js] cached.uid:', cached.uid, 'vs user.uid:', user.uid);

  if (cached.uid === user.uid) {
    console.log('[progress.js] cache matches, skipping fetch');
    resolveProgressReady();
    return;
  }

  console.log('[progress.js] fetching from Firestore...');
  try {
    const userRef = doc(db, 'userProgress', user.uid);
    const snapshot = await getDoc(userRef);
    // REV 4 PHASE 3 — CHANGED: flat default shape (categories/levelAssessments)
    // instead of the old { levels: {} }.
    const remoteStore = snapshot.exists() ? snapshot.data() : { uid: user.uid, categories: {}, levelAssessments: {}, unitAssessments: {} };
    remoteStore.uid = user.uid;
    saveStoreLocal(remoteStore);
    console.log('[progress.js] hydration complete, saved:', remoteStore);
  } catch (e) {
    console.warn('[progress.js] could not fetch progress:', e);
  }

  resolveProgressReady();
}

  hydrateStore(); // kick off as soon as this script loads

  function whenProgressReady() {
    return progressReady;
  }

  /* ── Writes ────────────────────────────────────────────────────── */

  /** Mark a sign as practiced (viewed / attempted in lesson.html). */
  function recordSignPracticed(level, category, signId) {
    // NOTE: `level` is accepted (unused internally) purely so every
    // existing call site — js/lesson.js's recordSignPracticed(level,
    // category, sign) — keeps working unchanged. Category ids are
    // unique app-wide (confirmed via data.js CATEGORIES), so storage
    // itself no longer needs the level layer. See file header.
    const store = loadStore();
    const cat   = ensureCategory(store, category);
    cat.signs[signId] = { ...(cat.signs[signId] || {}), practicedAt: new Date().toISOString() };
    saveStore(store);
  }

  /**
   * Record the result of a category-end assessment.
   * @param {{score:number, passed:boolean, breakdown:object}} result
   */
  function recordCategoryAssessment(level, category, result) {
    const store = loadStore();
    const cat   = ensureCategory(store, category);
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

  /**
   * NEW (this session) — record the result of a gated 'interactive'
   * unit's assessment (currently just fingerspell_name). Same shape as
   * recordCategoryAssessment above, keyed by unitId instead of a
   * category id, since gated interactive units deliberately have no
   * CATEGORIES entry (see UNITS' fingerspell_name comment in data.js).
   * @param {{score:number, passed:boolean}} result
   */
  function recordUnitAssessment(unitId, result) {
    const store = loadStore();
    const map   = ensureUnitAssessments(store);
    const prev  = map[unitId];
    map[unitId] = {
      attempts:  (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score ?? 0),
      lastScore: result.score ?? 0,
      passed:    !!(prev?.passed) || !!result.passed,
      lastAt:    new Date().toISOString(),
    };
    saveStore(store);
    return map[unitId];
  }

  /**
   * Record the result of a level-final assessment.
   * UNCHANGED by Phase 3 — level-final assessments are still a
   * per-level concept (see file header); only their storage location
   * moved from `levels[level].levelAssessment` to a flat
   * `levelAssessments[level]` map.
   */
  function recordLevelAssessment(level, result) {
    const store = loadStore();
    const map   = ensureLevelAssessments(store);
    const prev  = map[level];
    map[level] = {
      attempts:  (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      lastScore: result.score,
      passed:    !!(prev?.passed) || !!result.passed,
      breakdown: result.breakdown ?? null,
      lastAt:    new Date().toISOString(),
    };
    saveStore(store);
    return map[level];
  }

  /* ── Reads ─────────────────────────────────────────────────────── */

  // REV 4 PHASE 3 — CHANGED: `level` param kept for call-site
  // compatibility (js/dashboard.js, js/quiz.js, js/learn.js all call
  // this as getCategoryProgress(level, categoryId)) but is no longer
  // used to look the record up — see ensureCategory() note above.
  function getCategoryProgress(level, category) {
    const store = loadStore();
    return store.categories?.[category] ?? { signs: {}, assessment: null };
  }

  function getLevelAssessment(level) {
    const store = loadStore();
    return store.levelAssessments?.[level] ?? null;
  }

  /** NEW (this session) — mirrors getLevelAssessment, for gated units. */
  function getUnitAssessment(unitId) {
    const store = loadStore();
    return store.unitAssessments?.[unitId] ?? null;
  }

  /** Categories in a level that actually have playable sign content. */
  function liveCategoriesFor(level) {
    const cats = window.LWData?.getCategoriesForLevel?.(level) ?? [];
    return cats.filter(c => !c.comingSoon && (window.LWData.getCategorySigns(level, c.id).length > 0));
  }

  /**
   * NEW — REV 4 PHASE 3. Every live (has content, not comingSoon)
   * category in the WHOLE app, in one flat sequence, ordered by
   * UNITS[].order first and each category's own `order` within its
   * unit second. This is "the flat walk over UNITS" the checklist
   * asks for — it's what isCategoryUnlocked() below walks instead of
   * the old per-level LEVEL_ORDER + liveCategoriesFor(level) chain.
   *
   * Only walks units of kind 'category-group' — this is *how* Unit 0
   * (Welcome, kind:'info') and the Unit 7 Phrasebook (kind:'reference')
   * stay excluded from gating, per PIVOT_CHECKLIST.md Phase 3's last
   * item: neither has (or should ever get) an 80% threshold or
   * anything unlocking behind it. Unit 2 (Fingerspell Your Name,
   * kind:'interactive') is excluded the same way, but for a different
   * reason worth noting: it isn't a CATEGORIES entry at all (see
   * AI_MEMORY.md's Phase 2 session log — the name drill is
   * deliberately not authored data.js content), so
   * getCategoriesForUnit(2) already returns empty and the kind filter
   * below is redundant for it specifically — kept anyway since it's
   * the correct general rule, not a unit-2-specific special case.
   */
  function getOrderedLiveCategories() {
    const units = window.LWData?.getUnits?.() ?? [];
    const out = [];
    units
      .filter(u => u.kind === 'category-group')
      .forEach(u => {
        const cats = window.LWData?.getCategoriesForUnit?.(u.order) ?? [];
        cats.forEach(c => {
          if (!c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0) {
            out.push(c);
          }
        });
      });
    return out;
  }

  /**
   * NEW (this session) — every 'interactive' unit tagged `gated: true`
   * in data.js's UNITS array (currently just fingerspell_name), in
   * UNITS order. Data-driven per this repo's own convention (see
   * AI_MEMORY.md §3 "Data-driven over hardcoded") — adding a second
   * gated interactive unit later needs zero changes here, just the
   * `gated: true` flag on its UNITS entry.
   */
  function getOrderedGates() {
    const units = window.LWData?.getUnits?.() ?? [];
    return units.filter(u => u.kind === 'interactive' && u.gated === true);
  }

  /**
   * NEW (this session) — true only if every gate that sits BEFORE the
   * given unit order (in UNITS order) has been passed. Category-group
   * units with no gate before them are trivially true (empty filter).
   */
  function gatesClearedBefore(unitOrder) {
    return getOrderedGates()
      .filter(g => g.order < unitOrder)
      .every(g => !!getUnitAssessment(g.id)?.passed);
  }

  /**
   * A category is unlocked if it's the first live category in the
   * FLAT cross-unit chain, or the previous live category in that same
   * chain has been passed.
   *
   * REV 4 PHASE 3 — CHANGED: this used to only look within `level`'s
   * own live categories (liveCategoriesFor(level)); it now walks
   * getOrderedLiveCategories() — every unit's categories, in UNITS
   * order — so e.g. the first category of Unit 4 now unlocks based on
   * whether the LAST category of Unit 3 (Numbers) passed, not by
   * being "first in its level" (which it isn't — Unit 4 reuses
   * level:'medium', see the Unit Map table in SYSTEM_ARCHITECTURE.md).
   * `level` is kept as a parameter purely for call-site compatibility
   * (js/dashboard.js calls isCategoryUnlocked(level, cat.id)) — it's
   * not used to scope the chain anymore.
   *
   * CHANGED (this session) — also checks gatesClearedBefore() first.
   * This is how Fingerspell Your Name (Unit 2, gated:true) blocks
   * Numbers (Unit 3) and everything after it without needing to be a
   * CATEGORIES entry itself — see data.js's fingerspell_name comment.
   */
  function isCategoryUnlocked(level, categoryId) {
    // DEBUG_UNLOCK_ALL short-circuit — see its doc comment above. Real
    // logic (unchanged) still runs below when this is `false`.
    if (DEBUG_UNLOCK_ALL) return true;

    const cat = (window.LWData?.CATEGORIES ?? []).find(c => c.id === categoryId);
    if (cat && !gatesClearedBefore(cat.unit)) return false;

    const chain = getOrderedLiveCategories();
    const idx   = chain.findIndex(c => c.id === categoryId);
    if (idx <= 0) return true;
    const prevCat  = chain[idx - 1];
    const prevProg = getCategoryProgress(prevCat.level, prevCat.id);
    return !!prevProg.assessment?.passed;
  }

  /**
   * Levels themselves are never locked — a learner can jump straight
   * into Medium or Intermediate if that's what they want to practice.
   * Progress/assessments are still tracked per level regardless; this
   * only ever gated ACCESS, which product decided against. UNCHANGED
   * by Phase 3 — category-level gating is now cross-level (see
   * isCategoryUnlocked above), but this level-access toggle is a
   * separate, still-per-level concept that Rev 4 didn't ask to change.
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
    // REV 4 PHASE 3 — CHANGED: walks the new flat `categories` map
    // instead of `levels[level].categories`. `level` in the returned
    // objects is looked up from data.js so the return shape
    // ({level, category, signId}) stays identical for callers —
    // js/dashboard.js's renderRecap() only reads `signId` today, but
    // nothing else needed to change on its end either way.
    const store = loadStore();
    const out = [];
    Object.entries(store.categories || {}).forEach(([categoryId, catData]) => {
      const catMeta = (window.LWData?.CATEGORIES ?? []).find(c => c.id === categoryId);
      const level   = catMeta?.level ?? null;
      Object.keys(catData.signs || {}).forEach(signId => out.push({ level, category: categoryId, signId }));
    });
    return out;
  }

  window.LWProgress = {
    PASS_THRESHOLD, LEVEL_ORDER,
    recordSignPracticed, recordCategoryAssessment, recordLevelAssessment,
    recordUnitAssessment, // NEW (this session) — Fingerspell-as-assessment
    getCategoryProgress, getLevelAssessment, getLevelStats,
    getUnitAssessment, // NEW (this session)
    isCategoryUnlocked, isLevelUnlocked, isLevelFinalUnlocked,
    liveCategoriesFor, getAllLearnedSigns,
    getOrderedLiveCategories, // NEW — exposed pre-emptively for Phase 4's learn.js trail view; not consumed anywhere yet.
    whenProgressReady, STORE_KEY,
  };
})();