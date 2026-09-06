/**
 * js/engine/reviewEngine.js — Review Later Engine
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Implements the "Review Later" stage of the Learning
 *            Philosophy loop (LEARN → OBSERVE → RECALL → PRACTICE →
 *            APPLY → REVIEW LATER → UNLOCK). Tracks, per sign, when
 *            it was last reviewed, how confident the learner felt,
 *            and how many times it's been missed — then answers
 *            "which signs are due for review right now."
 *
 *            Deliberately NOT part of js/engine/progress.js. Per the
 *            project's own standing rule ("no new progress/order
 *            algorithm"), this file only READS from progress.js
 *            (via window.LWProgress.getAllLearnedSigns) — it never
 *            touches category/level unlock state, ordering, or
 *            assessment pass/fail logic. A sign can be "due for
 *            review" without that having any effect on whether the
 *            next category is unlocked.
 *
 * CONNECTS : Loaded as a plain <script> (not a module), AFTER
 *            js/data.js, js/engine/progress.js, and js/auth.js —
 *            same load order convention as progress.js. Read by
 *            pages/review.html's js/review-page.js, and by
 *            js/lesson.js at the end of a sign's Apply step (to
 *            record the first review-eligible touch of a sign).
 *
 * STORAGE  : localStorage key 'lw_review_v1' + Firestore
 *            'userReview/{uid}', same dual-write pattern as
 *            progress.js's 'lw_progress_v3'. Shape:
 *   {
 *     uid: string,
 *     signs: {
 *       [signId]: {
 *         lastReviewedAt: number | null,   // epoch ms
 *         dueAt: number,                   // epoch ms — <= now means due
 *         confidence: 1|2|3|4 | null,      // last self-rated confidence
 *         incorrectCount: number,          // missed-in-quiz counter
 *       }
 *     }
 *   }
 *
 *            uid-scoped from day one, mirroring progress.js's
 *            `cached.uid === user.uid` reconciliation check — this is
 *            the specific mistake REV8_TEACHING_AUDIT.md §5 found in
 *            an earlier feature (personalization) that skipped it.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

(function () {
  const STORE_KEY = 'lw_review_v1';

  // Confidence → next-review interval, in days. Loosely modelled on
  // simple spaced repetition: the less confident the learner felt,
  // the sooner the sign comes back. Tune later against real data —
  // this is a first-pass scheduler, not a claim about optimal SRS.
  const CONFIDENCE_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };
  const DEFAULT_INTERVAL_DAYS = 2; // used the first time a sign is ever touched
  const DAY_MS = 24 * 60 * 60 * 1000;

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { console.warn('[reviewEngine.js] corrupt store, resetting', e); return {}; }
  }

  function saveStoreLocal(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  async function saveStore(store) {
    saveStoreLocal(store); // local write first — same rationale as progress.js

    try {
      const { db, doc, setDoc, getCurrentUser } = window.LWAuth;
      const user = getCurrentUser();
      if (!user) return;
      const userRef = doc(db, 'userReview', user.uid);
      await setDoc(userRef, store);
    } catch (e) {
      console.warn('[reviewEngine.js] could not save review state:', e);
    }
  }

  function ensureSignRecord(store, signId) {
    if (!store.signs) store.signs = {};
    if (!store.signs[signId]) {
      store.signs[signId] = {
        lastReviewedAt: null,
        dueAt: Date.now() + DEFAULT_INTERVAL_DAYS * DAY_MS,
        confidence: null,
        incorrectCount: 0,
      };
    }
    return store.signs[signId];
  }

  /* ── HYDRATE — same shape as progress.js's hydrateStore() ────────── */
  let resolveReviewReady;
  const reviewReady = new Promise((resolve) => { resolveReviewReady = resolve; });

  async function hydrateStore() {
    await window.LWAuth?.whenAuthReady?.();

    const { db, doc, getDoc, getCurrentUser } = window.LWAuth || {};
    const user = getCurrentUser?.();

    if (!user) { resolveReviewReady(); return; }

    const cached = loadStore();
    if (cached.uid === user.uid) { resolveReviewReady(); return; }

    try {
      const userRef = doc(db, 'userReview', user.uid);
      const snapshot = await getDoc(userRef);
      const remoteStore = snapshot.exists() ? snapshot.data() : { uid: user.uid, signs: {} };
      remoteStore.uid = user.uid;
      saveStoreLocal(remoteStore);
    } catch (e) {
      console.warn('[reviewEngine.js] could not fetch review state:', e);
    }

    resolveReviewReady();
  }

  hydrateStore();

  function whenReviewReady() {
    return reviewReady;
  }

  /* ── Writes ────────────────────────────────────────────────────── */

  /** Called when a quiz/context-practice answer for `signId` is wrong. */
  function recordMistake(signId) {
    const store = loadStore();
    const rec = ensureSignRecord(store, signId);
    rec.incorrectCount += 1;
    rec.dueAt = Date.now(); // wrong answer → due immediately
    saveStore(store);
  }

  /**
   * Called from Review Session after the learner rates their
   * confidence recalling `signId` (1 = "Not at all" … 4 = "Very
   * confident", matching the guide's 😟😐🙂😄 scale).
   */
  function recordReviewOutcome(signId, confidence) {
    const c = Math.min(4, Math.max(1, Number(confidence) || 1));
    const store = loadStore();
    const rec = ensureSignRecord(store, signId);
    rec.lastReviewedAt = Date.now();
    rec.confidence = c;
    rec.dueAt = Date.now() + (CONFIDENCE_INTERVAL_DAYS[c] ?? DEFAULT_INTERVAL_DAYS) * DAY_MS;
    saveStore(store);
  }

  /** First touch of a sign (end of its Apply step) — seeds a record if none exists. */
  function seedSign(signId) {
    const store = loadStore();
    ensureSignRecord(store, signId);
    saveStore(store);
  }

  /* ── Reads ─────────────────────────────────────────────────────── */

  /**
   * Every learned sign (from progress.js) that is currently due,
   * most-overdue first. `knownSignIds` should come from
   * window.LWProgress.getAllLearnedSigns() — this file never invents
   * its own notion of "learned."
   */
  function getDueSigns(knownSignIds) {
    const store = loadStore();
    const now = Date.now();
    return (knownSignIds || [])
      .map((signId) => ({ signId, rec: store.signs?.[signId] || null }))
      .filter(({ rec }) => !rec || rec.dueAt <= now)
      .sort((a, b) => (a.rec?.dueAt ?? 0) - (b.rec?.dueAt ?? 0))
      .map(({ signId }) => signId);
  }

  /**
   * Recency status for the review-row status dot (guide §5.5):
   * 'green' = reviewed recently, 'orange' = due soon, 'blue' = overdue,
   * 'gray' = never reviewed yet. This is a DISTINCT, review-specific
   * scale — do not reuse the app's semantic Completed/In-Progress/
   * Available/Locked legend here (see the guide's §1.3/§2 conflict
   * note: the two systems must not merge).
   */
  function getRecencyStatus(signId) {
    const store = loadStore();
    const rec = store.signs?.[signId];
    if (!rec || !rec.lastReviewedAt) return 'gray';
    const overdueDays = (Date.now() - rec.dueAt) / DAY_MS;
    if (overdueDays > 3) return 'blue';
    if (overdueDays > 0) return 'orange';
    return 'green';
  }

  function getMistakes(knownSignIds) {
    const store = loadStore();
    return (knownSignIds || [])
      .filter((signId) => (store.signs?.[signId]?.incorrectCount || 0) > 0)
      .sort((a, b) => (store.signs[b]?.incorrectCount || 0) - (store.signs[a]?.incorrectCount || 0));
  }

  function getSignRecord(signId) {
    const store = loadStore();
    return store.signs?.[signId] || null;
  }

  window.LWReview = {
    whenReviewReady,
    recordMistake,
    recordReviewOutcome,
    seedSign,
    getDueSigns,
    getRecencyStatus,
    getMistakes,
    getSignRecord,
  };
})();
