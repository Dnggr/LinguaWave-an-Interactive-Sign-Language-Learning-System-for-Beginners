/**
 * js/engine/learningLoop.js — Recall / Apply / Unlock content generator
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Generates the three stages of the Learning Philosophy
 *            loop that don't already exist in the app — RECALL (a
 *            genuine pre-reveal memory gate), APPLY (a short context-
 *            usage scenario), and UNLOCK (a "You can now: …" ability
 *            statement) — GENERICALLY, from data already in
 *            window.LWData (SIGNS/CATEGORIES). This is what makes
 *            "rework every lesson" possible without hand-authoring
 *            unique content for every one of the ~600+ signs already
 *            in js/data.js: the engine runs once, per sign, at
 *            request time, using that sign's own existing
 *            description/tips/category data.
 *
 *            A small CURATED overrides table is included below for
 *            the handful of signs/categories worth hand-tuning
 *            (greetings, politeness) — everything else falls back to
 *            the generic template. Add more curated entries over time
 *            without needing to touch the generic path.
 *
 * CONNECTS : Loaded AFTER js/data.js, BEFORE js/lesson.js, on
 *            pages/lesson.html. js/lesson.js calls these functions at
 *            the points described in INTEGRATION_PATCH.md.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

(function () {
  /* ── CURATED ability phrases ──────────────────────────────────────
   * Keyed by signId. Optional — anything not listed here falls back
   * to the generic template in getAbilityStatements() below. Extend
   * this table over time; it never blocks a lesson from working.
   */
  const CURATED_ABILITIES = {
    HELLO: 'greet someone',
    HI: 'greet someone casually',
    GOODBYE: 'say goodbye',
    BYE: 'say goodbye casually',
    'THANK YOU': 'thank someone',
    THANKS: 'thank someone',
    PLEASE: 'make a polite request',
    SORRY: 'apologize',
    YES: 'answer yes',
    NO: 'answer no',
    WELCOME: 'welcome someone',
    EXCUSE: 'excuse yourself politely',
  };

  /* ── CURATED context scenarios ──────────────────────────────────── */
  const CURATED_SCENARIOS = {
    HELLO: 'You meet someone and want to introduce yourself.',
    HI: 'You pass a friend on the way to class.',
    GOODBYE: 'A conversation is ending and it\u2019s time to leave.',
    'THANK YOU': 'Someone just did something helpful for you.',
    PLEASE: 'You want to politely ask someone for something.',
    SORRY: 'You accidentally bumped into someone.',
  };

  /* ── RECALL ────────────────────────────────────────────────────────
   * Guide §5.3: "Close your eyes or look away. Try to remember the
   * sign." Primary action reveals the answer; "I need a hint" is a
   * plain text link, not a second button. Reuses the sign's own
   * description/tips — no new content needed per sign.
   */
  function buildRecallPrompt(level, signId) {
    const sign = window.LWData?.getSign?.(level, signId);
    if (!sign) return null;
    const hint = sign.tips?.[0] || null;
    return {
      signId,
      title: `Recall: ${signId}`,
      prompt: 'Close your eyes or look away. Try to remember the sign.',
      hint,                      // shown only if the learner taps "I need a hint"
      revealTitle: sign.title,
      revealDescription: sign.description,
      revealImage: sign.imageUrl || null,
    };
  }

  /* ── APPLY (Context Practice) ─────────────────────────────────────
   * Guide §5.4. Generic fallback: builds a scenario from the sign's
   * own category title so every lesson gets a real Apply step even
   * before anyone hand-writes scenario copy for it.
   */
  function buildApplyPrompt(level, categoryId, signId) {
    const sign = window.LWData?.getSign?.(level, signId);
    const category = window.LWData?.getCategory?.(level, categoryId);
    if (!sign) return null;

    const scenario = CURATED_SCENARIOS[signId]
      || `You're in a conversation about ${category?.title?.toLowerCase() || 'this topic'} and need the right sign.`;

    const distractorPool = (window.LWData?.getCategorySigns?.(level, categoryId) || [])
      .filter((id) => id !== signId);
    const distractors = shuffle(distractorPool).slice(0, 2);
    // Fall back to the wider SIGNS pool if this category is too small
    // for two distinct distractors (e.g. a 1–2 sign category).
    if (distractors.length < 2) {
      const widerPool = (window.LWData?.SIGNS || [])
        .map((s) => s.signId)
        .filter((id) => id !== signId && !distractors.includes(id));
      distractors.push(...shuffle(widerPool).slice(0, 2 - distractors.length));
    }

    const options = shuffle([
      { signId, correct: true },
      ...distractors.map((id) => ({ signId: id, correct: false })),
    ]);

    return {
      signId,
      scenario,
      question: 'What would you sign first?',
      options, // render as lettered cards A/B/C per guide §5.4
    };
  }

  /* ── UNLOCK — "You can now: …" ability statements ─────────────────
   * Guide §5.8. Called at Mission/category completion, over the set
   * of signIds just completed.
   */
  function getAbilityStatements(signIds) {
    return (signIds || []).map((id) => CURATED_ABILITIES[id] || `use the sign for "${id.toLowerCase()}"`);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  window.LWLearningLoop = {
    buildRecallPrompt,
    buildApplyPrompt,
    getAbilityStatements,
  };
})();
