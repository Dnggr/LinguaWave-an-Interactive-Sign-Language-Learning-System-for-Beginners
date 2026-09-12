/**
 * LinguaWaveV2/js/v2-lesson-loop.js — Sign Learning Loop engine (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE : This is the first real code integration of
 *           "LinguaWaveV2_Learning_Psychology_Analysis.docx" (the
 *           16-screenshot reference analysis) and its chapter-level
 *           follow-up ("...Analysis_Chapters_1-2.docx") into the
 *           actual app. It turns the six-stage loop those documents
 *           recommend — Watch → Recognize → Discriminate →
 *           Contextualize → Produce → Celebrate — into working logic
 *           that runs against REAL LinguaWaveV2 mission data.
 *
 * SCOPE (this pass) : the discrimination pairs, "same sign as"
 *           duplicates, and Contextualize phrases below are hand-
 *           curated ONLY for Chapter 1 (ASL Foundations: Alphabet,
 *           Numbers) and Chapter 2 (Introduce Yourself: Greetings,
 *           People, Personal Information) — the two chapters the
 *           Chapters_1-2 analysis covers. Every function still works
 *           for all 65 live missions app-wide: uncurated signs fall
 *           back to generic-but-real logic (same-category near-
 *           neighbor guess, generic sentence template) rather than
 *           returning nothing — same "degrade, don't throw" rule
 *           js/data-v2.js itself follows throughout. Curating the
 *           remaining 10 chapters is tracked as the next step in the
 *           analysis doc's own §5 (Next Steps) and is NOT done here.
 *
 * ISOLATION : reads window.LWDataV2 / window.LWData only, exactly the
 *           same discipline v2-mission-overview.js etc. already
 *           follow. Does not touch js/data.js, js/engine/progress.js,
 *           js/lesson.js, or js/quiz.js. No new localStorage key is
 *           introduced for progress — see hasSignLearnedElsewhere()
 *           below, which reads the EXISTING lw_datav2_progress_v1
 *           completedItemIds list js/data-v2.js already writes,
 *           rather than inventing a second store.
 *
 * NODE-TESTABLE : same IIFE(global) pattern as js/data-v2.js, so this
 *           file can be sanity-checked in a plain Node harness
 *           (`global.window = global; require('./v2-lesson-loop.js')`)
 *           without a browser — there is no jsdom in this project's
 *           dev environment (see every prior AI_MEMORY.md session
 *           note), so that harness-level check is the same standing
 *           verification ceiling the rest of dataV2 already accepts.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

(function (global) {

  /* ── NEAR_NEIGHBORS — curated discrimination pairs ────────────────
   * signId -> array of signIds that are genuinely easy to confuse it
   * with, per the real SIGNS_V2 descriptions (see the Chapters_1-2
   * analysis doc §1.2/§1.4/§2.2/§2.3 discrimination maps for the
   * source reasoning behind every entry below — not reproduced here,
   * only the resulting pairs). Deliberately NOT exhaustive outside
   * Chapters 1–2 (see file header). Order matters slightly: the
   * first entry is used as the primary Discriminate-step distractor.
   */
  const NEAR_NEIGHBORS = {
    // Alphabet — closed-fist family
    A: ['S', 'T', 'E', 'M', 'N'], S: ['A', 'T', 'E', 'M', 'N'],
    T: ['A', 'S', 'E', 'M', 'N'], E: ['A', 'S', 'T', 'M', 'N'],
    M: ['N', 'A', 'S', 'T', 'E'], N: ['M', 'A', 'S', 'T', 'E'],
    // Alphabet — two-finger-up family
    U: ['V', 'H', '2'], V: ['U', '2'], H: ['U', 'V'],
    K: ['P'], P: ['K'], R: ['U'],
    // Alphabet — spread-finger family
    W: ['3', '6', '4'], B: ['4'], 
    // Alphabet — circle-shape family
    C: ['O'], O: ['C', '0'], F: ['9'],
    // Alphabet — hooked-index pair
    D: ['X', '1'], X: ['D'],
    // Alphabet — sideways-pointing pair
    G: ['Q'], Q: ['G'],
    // Alphabet — motion outliers (traced-shape neighbor only, not handshape)
    J: ['I'], I: ['J'],
    // Numbers — thumb-tap family + alphabet collisions
    '0': ['O'], '1': ['D'], '2': ['U', 'V'], '3': ['W'],
    '4': ['B'], '6': ['W', '7', '8', '9'], '7': ['6', '8', '9'],
    '8': ['6', '7', '9'], '9': ['F', '6', '7', '8'],
    // Greetings — identical-sign pairs (see SAME_SIGN_AS; also listed
    // here so a Recognize step can still deliberately offer the
    // "wrong register" word as a distractor even before that step is
    // downgraded to a register question by SAME_SIGN_AS below).
    HELLO: ['HI'], HI: ['HELLO'], GOODBYE: ['BYE'], BYE: ['GOODBYE'],
    EVENING: ['NIGHT'], NIGHT: ['EVENING'],
    // People — location/orientation-only pairs
    ME: ['YOU', 'MY'], YOU: ['ME', 'YOUR'], MY: ['YOUR', 'ME'], YOUR: ['MY', 'YOU'],
    MAN: ['WOMAN'], WOMAN: ['MAN'], TEACHER: ['STUDENT'], STUDENT: ['TEACHER'],
    // Personal Information — tap-count pair
    NAME: [], AGE: [],
  };

  /* ── SAME_SIGN_AS — true identical-sign pairs ──────────────────────
   * signId -> the canonical signId it is physically identical to.
   * These are NOT discrimination pairs (there is nothing to tell
   * apart visually) — per the Chapters_1-2 analysis §2.2, they need a
   * lighter loop: skip Watch/Recognize/Discriminate, go straight to a
   * register/timing Contextualize question. Restricted to pairs the
   * sign data itself states are identical, not just similar.
   */
  const SAME_SIGN_AS = {
    HI: 'HELLO',
    BYE: 'GOODBYE',
    NIGHT: 'EVENING',
  };

  /* ── REGISTER_PROMPTS — the lighter Contextualize question used in
   * place of a full loop for SAME_SIGN_AS pairs. */
  const REGISTER_PROMPTS = {
    HI: { prompt: 'Your friend walks by after class. Which greeting fits best?', options: ['HI', 'HELLO'], answer: 'HI',
          note: 'Same sign as HELLO — HI is just quicker and more casual.' },
    BYE: { prompt: 'You\u2019re ending a quick video call with a friend. Which fits best?', options: ['BYE', 'GOODBYE'], answer: 'BYE',
           note: 'Same sign as GOODBYE — BYE is just quicker and more casual.' },
    NIGHT: { prompt: 'It\u2019s late and you\u2019re heading to bed. Which word fits this moment?', options: ['NIGHT', 'EVENING'], answer: 'NIGHT',
             note: 'Physically the same sign as EVENING — in ASL, context or a following word tells them apart, not the handshape.' },
  };

  /* ── CONTEXT_PROMPTS — Contextualize-stage sentence prompts ────────
   * signId -> { template, fillWith } used to build a short, real
   * phrase around the sign instead of drilling it in isolation
   * (Ref. Analysis §8E stage 4). Falls back to a generic template
   * (see contextPromptFor()) for any signId not listed here.
   */
  const CONTEXT_PROMPTS = {
    HELLO: 'You meet someone for the first time today. Sign: ___',
    MORNING: 'You arrive at work and it\u2019s 8am. Sign: GOOD ___',
    AFTERNOON: 'You\u2019re catching up with a friend after lunch. Sign: GOOD ___',
    WELCOME: 'A guest arrives at your door. Sign: ___',
    GOODBYE: 'Class just ended. Sign: ___',
    ME: 'Introduce yourself: ___ NAME [fingerspell your name]',
    YOU: 'Ask a new friend their name: ___ NAME?',
    MY: '___ FRIEND is here today.',
    YOUR: 'What is ___ NAME?',
    FRIEND: 'This is my ___.',
    NAME: 'MY ___ [fingerspell your name]',
    AGE: 'I AM [number] YEARS ___.',
    FROM: 'I ___ [your hometown].',
    LIVE: 'I ___ [where you live].',
    FAMILY: 'I have a big ___.',
    BIRTHDAY: 'My ___ is in [month].',
  };

  /* ── helpers ───────────────────────────────────────────────────── */

  function uniq(arr) { return Array.from(new Set(arr)); }

  function liveSign(level, signId) {
    return (global.LWDataV2 && typeof global.LWDataV2.getSign === 'function')
      ? global.LWDataV2.getSign(level, signId)
      : null;
  }

  function signTitle(level, signId) {
    const s = liveSign(level, signId);
    return (s && s.title) || signId;
  }

  /**
   * Returns the neighbor signIds for a sign, filtered down to ones
   * that actually resolve to a real SIGNS_V2 entry at this level (a
   * curated pair can reference a signId from a different category —
   * e.g. numbers referencing an alphabet letter — this just confirms
   * the referenced sign genuinely exists before it's offered as a
   * distractor). Never throws; returns [] if none resolve.
   */
  function getNearNeighbors(level, signId) {
    const curated = NEAR_NEIGHBORS[signId] || [];
    return curated.filter((id) => !!liveSign(level, id));
  }

  /**
   * Picks up to `count` Recognize-step distractor signIds for
   * `signId`. Prefers curated near-neighbors first (the hardest, most
   * diagnostic distractors — Ref. Analysis §7), then fills any
   * remaining slots from the sign's own category (excluding itself
   * and anything already picked), then — only if still short —
   * from any other live sign in the same level. Always returns
   * whatever it can find rather than throwing on a small category.
   */
  function buildRecognizeOptions(level, signId, categorySignIds, count) {
    count = count || 4;
    const correct = signId;
    const pool = [];
    getNearNeighbors(level, signId).forEach((id) => { if (id !== correct) pool.push(id); });
    (categorySignIds || []).forEach((id) => { if (id !== correct && pool.indexOf(id) === -1) pool.push(id); });
    if (pool.length < count - 1 && global.LWDataV2 && global.LWDataV2.content) {
      global.LWDataV2.content.SIGNS.forEach((s) => {
        if (s.level === level && s.signId !== correct && pool.indexOf(s.signId) === -1) pool.push(s.signId);
      });
    }
    const distractors = pool.slice(0, Math.max(0, count - 1));
    const options = shuffleDeterministic([correct].concat(distractors), signId);
    return { correct, options };
  }

  /**
   * Builds a Discriminate-step pair: { targetSignId, neighborSignId }
   * or null if no usable neighbor exists at all (a small, real
   * category can legitimately have none — the caller should skip the
   * Discriminate stage for that item rather than fake one, same
   * "don't fabricate" rule the rest of this codebase follows).
   */
  function buildDiscriminatePair(level, signId, categorySignIds) {
    const neighbors = getNearNeighbors(level, signId);
    let neighborSignId = neighbors[0] || null;
    if (!neighborSignId) {
      // Generic fallback: another sign from the same category, so an
      // uncurated chapter still gets a real (if less diagnostic)
      // discrimination question instead of none at all.
      const alt = (categorySignIds || []).find((id) => id !== signId);
      neighborSignId = alt || null;
    }
    return neighborSignId ? { targetSignId: signId, neighborSignId } : null;
  }

  /** Deterministic (not Math.random) shuffle, seeded by a string —
   * keeps option order stable across re-renders of the same item
   * within a session, same "reproducible, not real-random" rule
   * js/data-v2.js's own genericBonusEligible()/bonusSignIds already
   * follow for the same reason (see that file's §3.3 comment). */
  function shuffleDeterministic(arr, seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const j = seed % (i + 1);
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /** True if `signId` is a documented physical duplicate of another
   * signId (HI/HELLO, BYE/GOODBYE, NIGHT/EVENING). */
  function sameSignAs(signId) {
    return SAME_SIGN_AS[signId] || null;
  }

  function registerPromptFor(signId) {
    return REGISTER_PROMPTS[signId] || null;
  }

  /**
   * Reads the EXISTING lw_datav2_progress_v1 store (via the same
   * localStorage key js/data-v2.js already owns — no new key) and
   * checks whether `signId`'s LESSON step has already been completed
   * in ANY mission other than `excludeMissionId`. This is what lets
   * e.g. Personal Information's 9 duplicate signs (BOY, GIRL, CHILD,
   * PERSON, FRIEND, STUDENT, TEACHER, HOME, SCHOOL — all literally
   * the same SIGNS_V2 entries as Family/People/Places, per that
   * category's own file-header comment) skip a redundant re-teach if
   * the learner already has them from an earlier mission. General-
   * purpose: works for any future chapter's duplicate signs too, not
   * just Chapter 2 — nothing here is hardcoded to a specific mission.
   * Degrades to false (never throws) if localStorage is unavailable.
   */
  function hasSignLearnedElsewhere(signId, excludeMissionId) {
    try {
      const raw = global.localStorage.getItem('lw_datav2_progress_v1');
      if (!raw) return false;
      const state = JSON.parse(raw);
      const ids = state.completedItemIds || [];
      const suffix = `_LESSON_${signId}`;
      return ids.some((id) => id.endsWith(suffix) && !id.startsWith(`${excludeMissionId}_`));
    } catch {
      return false;
    }
  }

  /** Generic, always-available Contextualize prompt for any signId
   * not in CONTEXT_PROMPTS — never leaves the stage empty. */
  function contextPromptFor(level, signId) {
    if (CONTEXT_PROMPTS[signId]) return CONTEXT_PROMPTS[signId];
    const title = signTitle(level, signId);
    return `Use "${title}" in a short sentence of your own.`;
  }

  /**
   * The main integration point: given a mission (from
   * window.LWDataV2.getMissionForCategory()) and one of its existing
   * items (unchanged shape — LESSON/BOOSTER/PRACTICE/QUIZ), returns a
   * plan describing exactly how v2-lesson.js should render that item
   * per the six-stage loop, without mutating mission.items itself or
   * inventing a parallel progress model. This is the piece that
   * actually connects the psychology-analysis documents' recommended
   * loop to this mission's real, already-existing item schema.
   */
  function planForItem(mission, index, item) {
    const level = mission.level;
    const categorySignIds = (global.LWDataV2 && item.signId)
      ? global.LWDataV2.getCategorySigns(level, mission.category)
      : [];

    if (item.kind === 'QUIZ') {
      return { loopStage: 'Produce/Celebrate (mission)', render: 'quiz-handoff' };
    }

    const duplicateOf = item.signId ? sameSignAs(item.signId) : null;
    const learnedElsewhere = item.signId ? hasSignLearnedElsewhere(item.signId, mission.id) : false;
    const lighter = !!duplicateOf || learnedElsewhere;

    if (item.kind === 'LESSON') {
      if (lighter) {
        return {
          loopStage: 'Contextualize (lighter — sign already known)',
          render: 'lesson-lighter',
          reason: duplicateOf ? `Same sign as ${duplicateOf}` : 'Already taught in an earlier mission',
          registerPrompt: duplicateOf ? registerPromptFor(item.signId) : null,
          contextPrompt: contextPromptFor(level, item.signId),
        };
      }
      return { loopStage: 'Watch', render: 'lesson-watch' };
    }

    if (item.kind === 'BOOSTER') {
      if (lighter && registerPromptFor(item.signId)) {
        return { loopStage: 'Discriminate (register, not handshape)', render: 'booster-register',
                 registerPrompt: registerPromptFor(item.signId) };
      }
      return {
        loopStage: 'Recognize',
        render: 'booster-recognize',
        options: item.signId ? buildRecognizeOptions(level, item.signId, categorySignIds, 4) : null,
      };
    }

    if (item.kind === 'PRACTICE') {
      const optionCount = (item.difficultyRamp && item.difficultyRamp[0] === '2-option') ? 2 : 3;
      const pair = item.signId ? buildDiscriminatePair(level, item.signId, categorySignIds) : null;
      return {
        loopStage: 'Discriminate + Contextualize',
        render: 'practice-scenario',
        scenarioTitle: item.scenarioTitle,
        discriminatePair: pair,
        recognizeOptions: item.signId ? buildRecognizeOptions(level, item.signId, categorySignIds, optionCount) : null,
        contextPrompt: item.signId ? contextPromptFor(level, item.signId) : null,
      };
    }

    return { loopStage: 'Unknown item kind', render: 'unknown' };
  }

  global.LWDataV2Loop = {
    getNearNeighbors,
    buildRecognizeOptions,
    buildDiscriminatePair,
    sameSignAs,
    registerPromptFor,
    hasSignLearnedElsewhere,
    contextPromptFor,
    planForItem,
    signTitle,
    // exposed for the Node test harness only
    _internals: { NEAR_NEIGHBORS, SAME_SIGN_AS, REGISTER_PROMPTS, CONTEXT_PROMPTS },
  };

})(typeof window !== 'undefined' ? window : global);
