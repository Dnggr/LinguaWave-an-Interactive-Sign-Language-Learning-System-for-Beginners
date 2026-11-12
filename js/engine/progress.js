'use strict';
(function () {
  const STORE_KEY     = 'lw_progress_v3';
  const LEVEL_ORDER    = ['basic', 'medium', 'intermediate'];
  const PASS_THRESHOLD = 0.80;
  const DEBUG_UNLOCK_ALL = true;
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { console.warn('[progress.js] corrupt store, resetting', e); return {}; }
  }
  function saveStoreLocal(store) {
    if (!store.uid) { const uid = window.LWAuth?.getAuthUid?.(); if (uid) store.uid = uid; }
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }
  function ensureCategory(store, categoryId) {
    if (!store.categories) store.categories = {};
    if (!store.categories[categoryId]) store.categories[categoryId] = { signs: {}, assessment: null };
    return store.categories[categoryId];
  }
  function ensureUnitAssessments(store) {
    if (!store.unitAssessments) store.unitAssessments = {};
    return store.unitAssessments;
  }
  function ensureLevelAssessments(store) {
    if (!store.levelAssessments) store.levelAssessments = {};
    return store.levelAssessments;
  }
  const SYNC_CACHE_KEY = 'lw_progress_last_sync_v1';
  const SYNC_TTL_MS = 60 * 1000;
  let remoteSynced = false;
  const emptyStore = (uid) => ({ uid, categories: {}, levelAssessments: {}, unitAssessments: {} });
  const laterIso = (a, b) => (!a ? (b || null) : !b ? a : (String(a) >= String(b) ? a : b));
  function mergeAssessment(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    const newer = String(a.lastAt || '') >= String(b.lastAt || '') ? a : b;
    return {
      ...newer,
      attempts:  Math.max(a.attempts || 0, b.attempts || 0),
      bestScore: Math.max(a.bestScore || 0, b.bestScore || 0),
      passed:    !!(a.passed || b.passed),
      lastAt:    laterIso(a.lastAt, b.lastAt),
    };
  }
  function mergeAssessmentMap(a, b) {
    const out = {};
    new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach((k) => { out[k] = mergeAssessment(a?.[k], b?.[k]); });
    return out;
  }
  function mergeStores(local, remote, uid) {
    const out = emptyStore(uid);
    new Set([...Object.keys(local.categories || {}), ...Object.keys(remote.categories || {})]).forEach((id) => {
      const l = local.categories?.[id] || {}, r = remote.categories?.[id] || {};
      const signs = {};
      new Set([...Object.keys(l.signs || {}), ...Object.keys(r.signs || {})]).forEach((s) => {
        signs[s] = { ...(r.signs?.[s] || {}), ...(l.signs?.[s] || {}), practicedAt: laterIso(l.signs?.[s]?.practicedAt, r.signs?.[s]?.practicedAt) };
      });
      out.categories[id] = { signs, assessment: mergeAssessment(l.assessment, r.assessment) };
    });
    out.levelAssessments = mergeAssessmentMap(local.levelAssessments, remote.levelAssessments);
    out.unitAssessments  = mergeAssessmentMap(local.unitAssessments, remote.unitAssessments);
    return out;
  }
  async function saveStore(store) {
    saveStoreLocal(store);
    if (!window.LWAuth) return;
    try {
      const { writeProgressDoc, getAuthUid } = window.LWAuth;
      if (!writeProgressDoc || !getAuthUid || !getAuthUid()) return;
      await progressReady;
      if (!remoteSynced) return;
      await writeProgressDoc('userProgress', loadStore());
    } catch (e) {
      console.warn('[progress.js] could not save progress:', e);
    }
  }
  let resolveProgressReady;
  const progressReady = new Promise((resolve) => { resolveProgressReady = resolve; });
  async function hydrateStore() {
    await window.LWAuth?.whenAuthReady?.();
    if (!window.LWAuth) { resolveProgressReady(); return; }
    const { readProgressDoc, writeProgressDoc, getCurrentUser } = window.LWAuth;
    const user = getCurrentUser();
    if (!user) { resolveProgressReady(); return; }
    const ownLocal = () => { const s = loadStore(); return s.uid === user.uid ? s : emptyStore(user.uid); };
    try {
      if (!readProgressDoc || !writeProgressDoc) { resolveProgressReady(); return; }
      const last = JSON.parse(sessionStorage.getItem(SYNC_CACHE_KEY) || 'null');
      if (last && last.uid === user.uid && Date.now() - last.at < SYNC_TTL_MS && loadStore().uid === user.uid) {
        remoteSynced = true;
        resolveProgressReady();
        return;
      }
    } catch (e) {  }
    try {
      const snapshot = await readProgressDoc('userProgress');
      if (!snapshot) { resolveProgressReady(); return; }
      const remote = snapshot.exists ? (snapshot.data || {}) : {};
      const merged = mergeStores(ownLocal(), remote, user.uid);
      saveStoreLocal(merged);
      remoteSynced = true;
      if (!snapshot.exists || JSON.stringify(merged) !== JSON.stringify(remote)) {
        await writeProgressDoc('userProgress', merged);
      }
      try { sessionStorage.setItem(SYNC_CACHE_KEY, JSON.stringify({ uid: user.uid, at: Date.now() })); } catch (e) {  }
    } catch (e) {
      console.warn('[progress.js] could not sync progress:', e);
    }
    resolveProgressReady();
  }
  hydrateStore();
  function whenProgressReady() {
    return progressReady;
  }
  function recordSignPracticed(level, category, signId) {
    const store = loadStore();
    const cat   = ensureCategory(store, category);
    cat.signs[signId] = { ...(cat.signs[signId] || {}), practicedAt: new Date().toISOString() };
    saveStore(store);
  }
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
  function getCategoryProgress(level, category) {
    const store = loadStore();
    return store.categories?.[category] ?? { signs: {}, assessment: null };
  }
  function getLevelAssessment(level) {
    const store = loadStore();
    return store.levelAssessments?.[level] ?? null;
  }
  function getUnitAssessment(unitId) {
    const store = loadStore();
    return store.unitAssessments?.[unitId] ?? null;
  }
  function liveCategoriesFor(level) {
    const cats = window.LWMissions?.getCategoriesForLevel?.(level) ?? [];
    return cats.filter(c => !c.comingSoon && (window.LWMissions.getCategorySigns(level, c.id).length > 0));
  }
  function getOrderedLiveCategories() {
    const units = window.LWMissions?.getUnits?.() ?? [];
    const out = [];
    units
      .filter(u => u.kind === 'category-group')
      .forEach(u => {
        const cats = window.LWMissions?.getCategoriesForUnit?.(u.order) ?? [];
        cats.forEach(c => {
          if (!c.comingSoon && window.LWMissions.getCategorySigns(c.level, c.id).length > 0) {
            out.push(c);
          }
        });
      });
    return out;
  }
  function getOrderedGates() {
    const units = window.LWMissions?.getUnits?.() ?? [];
    return units.filter(u => u.kind === 'interactive' && u.gated === true);
  }
  function gatesClearedBefore(unitOrder) {
    return getOrderedGates()
      .filter(g => g.order < unitOrder)
      .every(g => !!getUnitAssessment(g.id)?.passed);
  }
  function isCategoryUnlocked(level, categoryId) {
    if (DEBUG_UNLOCK_ALL) return true;
    const cat = (window.LWMissions?.content?.CATEGORIES ?? []).find(c => c.id === categoryId);
    if (cat && !gatesClearedBefore(cat.unit)) return false;
    const chain = getOrderedLiveCategories();
    const idx   = chain.findIndex(c => c.id === categoryId);
    if (idx <= 0) return true;
    const prevCat  = chain[idx - 1];
    const prevProg = getCategoryProgress(prevCat.level, prevCat.id);
    return !!prevProg.assessment?.passed;
  }
  function isLevelUnlocked(_level) {
    return true;
  }
  function isLevelFinalUnlocked(level) {
    const live = liveCategoriesFor(level);
    if (live.length === 0) return false;
    return live.every(c => !!getCategoryProgress(level, c.id).assessment?.passed);
  }
  function getLevelStats(level) {
    const live    = liveCategoriesFor(level);
    const allCats = window.LWMissions?.getCategoriesForLevel?.(level) ?? [];
    let totalSigns = 0, practicedSigns = 0, passedCategories = 0;
    live.forEach(c => {
      const signs = window.LWMissions.getCategorySigns(level, c.id);
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
  function getAllLearnedSigns() {
    const store = loadStore();
    const out = [];
    Object.entries(store.categories || {}).forEach(([categoryId, catData]) => {
      const catMeta = (window.LWMissions?.content?.CATEGORIES ?? []).find(c => c.id === categoryId);
      const level   = catMeta?.level ?? null;
      Object.keys(catData.signs || {}).forEach(signId => out.push({ level, category: categoryId, signId }));
    });
    return out;
  }
  window.LWProgress = {
    PASS_THRESHOLD, LEVEL_ORDER,
    recordSignPracticed, recordCategoryAssessment, recordLevelAssessment,
    recordUnitAssessment,
    getCategoryProgress, getLevelAssessment, getLevelStats,
    getUnitAssessment,
    isCategoryUnlocked, isLevelUnlocked, isLevelFinalUnlocked,
    liveCategoriesFor, getAllLearnedSigns,
    getOrderedLiveCategories,
    whenProgressReady, STORE_KEY,
  };
})();
