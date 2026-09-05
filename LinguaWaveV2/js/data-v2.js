/**
 * js/data-v2.js — DataV2 Content Layer (PILOT — Phase 0 + Phase 1)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Implements "LinguaWave_SoloLearn_Learning_Psychology_
 *            DataV2_Integration_Plan" §5 (Proposed DataV2 Content
 *            Model) and §7 Phase 0/Phase 1. This is a NEW, ISOLATED
 *            file — it is not required by, and does not modify,
 *            js/data.js or js/engine/progress.js. Nothing in the
 *            current app reads window.LWDataV2 yet; the existing
 *            learning path (Units → Categories → Signs, gated by
 *            js/engine/progress.js) keeps working exactly as it does
 *            today whether or not the flag below is on.
 *
 * FEATURE FLAG : localStorage key 'lw-datav2-enabled' (per the plan's
 *            own schema sketch, §5.3 — kept hyphenated/lowercase to
 *            match, unlike this repo's other storage keys, which are
 *            underscored — see isEnabled()/setEnabled() below).
 *            Default OFF. Toggle lives behind a hidden Settings
 *            block (pages/settings.html, only rendered with
 *            ?dev=1 in the URL) — see Phase 1 note in the plan §7:
 *            "reachable only behind the feature flag ... not shown
 *            to real learners yet."
 *
 * PILOT MISSION : the plan's schema sketch illustrates a mission with
 *            invented ids ('m01', signId 'hello'). This pilot instead
 *            wires against REAL content already in js/data.js so the
 *            comparison in Phase 2 (§7) means something: Unit order:4
 *            ("Greetings" / CATEGORIES id 'essentials_greetings',
 *            level 'medium') — HELLO, HI, MORNING, AFTERNOON, EVENING,
 *            NIGHT, GOODBYE, BYE, WELCOME. That category was picked
 *            because it's small (9 signs), self-contained, and has a
 *            complete SIGNS entry for every word already — no missing
 *            assets to fake. If js/data.js isn't loaded first (or the
 *            category ever changes shape), buildPilotMission() below
 *            degrades to an empty item list rather than throwing, so
 *            a stale include order can't break the host page.
 *
 * PROGRESS / STREAK STORAGE : entirely separate localStorage keys from
 *            js/engine/progress.js's 'lw_progress_v3' — see STORAGE
 *            comment above PROGRESS_KEY/STREAK_KEY below. Nothing here
 *            reads or writes 'lw_progress_v3'.
 *
 * PHASE 2/3 (this revision) : the pilot-mission builder was factored
 *            into a category-agnostic buildMissionForCategory(), and
 *            a new getAllMissions()/getMissionForCategory() pair walks
 *            EVERY live category in the app (same "not comingSoon,
 *            has real SIGNS content" rule js/engine/progress.js's own
 *            getOrderedLiveCategories() uses — re-derived here from
 *            window.LWData directly, NOT by calling into
 *            js/engine/progress.js, so this file stays independent of
 *            it per its own isolation rule above) and builds a dataV2
 *            mission for each. getPilotMission() is unchanged in
 *            behavior (still Greetings) — it is now a thin wrapper
 *            around buildMissionForCategory(), kept for every existing
 *            caller (js/data-v2-preview.js). Only 'essentials_greetings'
 *            has hand-curated scenario titles/bonus-XP picks; every
 *            other category gets a category-title-based scenario
 *            template (see CATEGORY_SCENARIO_TEMPLATE below) — a
 *            known simplification flagged in this session's AI_MEMORY
 *            entry, not a claim that 68 categories were individually
 *            curated the way §3.2 describes.
 *
 *            Progress storage also gained a `completedAt` timestamp
 *            map alongside the existing `completedItemIds` array
 *            (additive — old saved state with no `completedAt` still
 *            loads fine, see loadProgressState()) so a comparison tool
 *            has something to measure drop-off against. See
 *            js/data-v2-compare.js for the actual Phase 2 comparison
 *            logic — this file only exposes the raw data it needs
 *            (getDropOffIndex, getItemCompletedAt).
 *
 * NOT DONE HERE : no real analytics backend (this repo doesn't have
 *            one) — Phase 2's "comparison" is a same-browser, local-
 *            storage observation tool, not aggregate/multi-user data.
 *            No content review/approval of the 67 auto-generated
 *            missions' generic scenario titles — that's an explicit
 *            product decision left for whoever reads Phase 2's output,
 *            same as the plan's own "decide before expanding" framing
 *            (§7 Phase 3), even though the schema work itself is done.
 *
 * MISSION OVERVIEW + HEARTS (this revision) : added a real Hearts
 *            module (getHeartsState()/consumeHeartForMastery(), own
 *            `lw_datav2_hearts_v1` key — see HEARTS_KEY below) backing
 *            the new pages/v2-mission-overview.html per the guide's
 *            §10 rule: "keep all learning activities available, gate
 *            only the next Mastery Quiz attempt." A 3-heart pool, one
 *            heart lost per Mastery Quiz attempt, each lost heart
 *            refills independently 4 hours after it was lost — see
 *            HEART_REFILL_MS. KNOWN LIMITATION: the guide's spec is
 *            "consume a heart on submit"; pages/quiz.js is still
 *            deliberately untouched (see isolation rule above), so
 *            v2-mission-overview.js currently calls
 *            consumeHeartForMastery() when the Start Mastery Quiz
 *            button is clicked (attempt START), not on submit. Fixing
 *            that properly needs a small submit-time hook added to
 *            pages/quiz.js — out of scope here, tracked in the
 *            progress tracker's open questions.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

(function (global) {

  const FEATURE_FLAG_KEY = 'lw-datav2-enabled';
  // STORAGE — own namespace, versioned like the rest of this repo's
  // localStorage keys (lw_progress_v3, lw-preferences, ...) but never
  // sharing a key with them.
  const PROGRESS_KEY = 'lw_datav2_progress_v1';
  const STREAK_KEY = 'lw_datav2_streak_v1';
  const HEARTS_KEY = 'lw_datav2_hearts_v1';

  /* ── Feature flag ────────────────────────────────────────────── */

  function isEnabled() {
    try {
      return localStorage.getItem(FEATURE_FLAG_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function setEnabled(on) {
    try {
      localStorage.setItem(FEATURE_FLAG_KEY, on ? 'true' : 'false');
    } catch (e) {
      console.warn('[data-v2.js] could not persist feature flag:', e);
    }
  }

  /* ── Pilot mission builder (§5.2, §5.3) ─────────────────────────
   * Reads real content off window.LWData rather than inventing a
   * second copy of it. Every LESSON/BOOSTER/PRACTICE item below wraps
   * an existing signId — dataV2 adds sequencing/labels/rewards on
   * top, per §5.1's "wrappers around content that already exists;
   * nothing new needs to be built to render them" principle.
   */

  const PILOT_LEVEL = 'medium';
  const PILOT_CATEGORY = 'essentials_greetings';

  // §3.2 — hand-curated content, ONLY for the Phase 1 pilot category.
  // Every other category (Phase 3, below) falls back to
  // CATEGORY_SCENARIO_TEMPLATE instead of a per-sign hand-written map
  // like this one — see file header note on that simplification.
  const CURATED = {
    essentials_greetings: {
      scenarioTitles: {
        HELLO: 'Greeting a New Classmate',
        HI: 'Waving to a Neighbor',
        MORNING: 'Starting the Day at Work',
        AFTERNOON: 'Catching Up After Lunch',
        EVENING: 'Arriving at a Dinner Party',
        NIGHT: 'Saying Goodnight to Family',
        GOODBYE: 'Leaving the Classroom',
        BYE: 'Ending a Video Call',
        WELCOME: 'Welcoming a Guest Inside',
      },
      // §3.3 — deliberately not tied to difficulty or position; a
      // fixed, hand-picked subset so the pilot is reproducible (no
      // Math.random() seeding a real reward), landing on roughly
      // 1-in-3 items, same ratio SoloLearn's own screenshots showed.
      bonusSignIds: new Set(['HI', 'EVENING', 'BYE']),
      goal: 'Greet people, ask how someone is, and say goodbye in ASL',
      introMoment: {
        illustration: 'intro-greetings.svg',
        pitch: 'Every conversation starts with a greeting. Before anything else, this mission gets your hello, your goodbye, and everything friendly in between into your hands.',
      },
      nextTeaser: 'Next up: Polite Words — please, thank you, and sorry.',
    },
  };

  // §3.2 fallback for every non-curated category (Phase 3) — still
  // situational (names the category, not "Practice 4"), just not
  // individually hand-written per sign like the pilot's own map.
  function genericScenarioTitle(signTitle, categoryTitle) {
    return `Using "${signTitle}" — ${categoryTitle}`;
  }

  // §3.3 fallback bonus-XP rule for non-curated categories: fixed
  // (not random) — every 3rd practice-eligible sign, by position, so
  // it's reproducible across sessions like the curated pilot's own
  // fixed set.
  function genericBonusEligible(indexAmongPracticeItems) {
    return indexAmongPracticeItems % 3 === 2;
  }

  function buildItemsForCategory(level, categoryId, categoryTitle, signIds, curated) {
    const items = [];
    let practiceCount = 0;
    signIds.forEach((signId, i) => {
      const sign = (global.LWData && typeof global.LWData.getSign === 'function')
        ? global.LWData.getSign(level, signId)
        : null;
      const signTitle = (sign && sign.title) || signId;

      // §3.1 — never two teaches in a row: LESSON is always directly
      // followed by a BOOSTER on the same sign, then (every other
      // sign) a scenario-titled PRACTICE before the next LESSON.
      items.push({ kind: 'LESSON', signId, scenarioTitle: null });
      items.push({ kind: 'BOOSTER', signId });

      if (i % 2 === 1 || i === signIds.length - 1) {
        const isBonus = curated
          ? curated.bonusSignIds.has(signId)
          : genericBonusEligible(practiceCount);
        practiceCount++;

        items.push({
          kind: 'PRACTICE',
          signId,
          scenarioTitle: curated
            ? (curated.scenarioTitles[signId] || `Practice: ${signTitle}`)
            : genericScenarioTitle(signTitle, categoryTitle),
          bonusXP: isBonus ? 5 : null, // §3.3
          difficultyRamp: ['2-option', '3-option+distractor'], // §3.6
        });
      }
    });

    // Mastery Quiz — unchanged concept, reuses the existing category
    // assessment (pages/quiz.html?level=<level>&category=<categoryId>).
    // Hearts are still only spent here, per §6 non-goals / the V2
    // guide's existing hearts rule — dataV2 doesn't change that.
    items.push({ kind: 'QUIZ', level, category: categoryId });

    return items;
  }

  // §5.2/§5.3, generalized (Phase 3) — builds a full dataV2 mission
  // object for ANY level+categoryId that has real SIGNS content, not
  // just the Phase 1 pilot. Degrades to an empty item list (not a
  // throw) if window.LWData isn't loaded or the category has no signs,
  // same defensive behavior as the original buildPilotMission().
  function buildMissionForCategory(level, categoryId) {
    const category = (global.LWData && typeof global.LWData.getCategory === 'function')
      ? global.LWData.getCategory(level, categoryId)
      : null;
    const signIds = (global.LWData && typeof global.LWData.getCategorySigns === 'function')
      ? global.LWData.getCategorySigns(level, categoryId)
      : [];

    const curated = CURATED[categoryId] || null;
    const categoryTitle = (category && category.title) || categoryId;

    // CHAPTER (this session) — js/data.js's UNITS now each carry a
    // `categoryGroup` (one of the 12 named curriculum chapters,
    // window.LWData.getCategoryGroups()). A mission's chapter is its
    // owning unit's chapter, looked up via category.unit (an order
    // number) against getUnits(). Missing/stale data (no LWData, unit
    // not found, or a unit somehow missing categoryGroup) degrades to
    // null rather than throwing — v2-learn.js treats null as
    // "ungrouped" and still renders the mission, just outside any
    // chapter section, so a data gap can't hide a mission.
    const owningUnit = (category && global.LWData && typeof global.LWData.getUnits === 'function')
      ? global.LWData.getUnits().find((u) => u.order === category.unit)
      : null;

    return {
      // Keep 'm_greetings' (not 'm_essentials_greetings') for the
      // curated pilot category specifically — that id is already
      // baked into any real lw_datav2_progress_v1 data a Phase 1
      // tester may have generated (see itemId()); changing it here
      // would silently orphan that progress. Every other (Phase 3)
      // category gets the straightforward `m_${categoryId}` id since
      // nothing pre-existing depends on it.
      id: categoryId === PILOT_CATEGORY ? 'm_greetings' : `m_${categoryId}`,
      title: categoryTitle,
      unitOrder: (category && category.unit) || null,
      categoryGroup: (owningUnit && owningUnit.categoryGroup) || null, // NEW — chapter id
      level,
      category: categoryId,
      goal: (curated && curated.goal) || `Learn to sign every word in ${categoryTitle}`,
      introMoment: (curated && curated.introMoment) || { // §3.7
        illustration: null,
        pitch: `A focused set of ${signIds.length} signs, one mission at a time.`,
      },
      items: buildItemsForCategory(level, categoryId, categoryTitle, signIds, curated), // §3.1
      results: { // §3.8 — recap filled at runtime, not hardcoded
        recap: [],
        nextTeaser: (curated && curated.nextTeaser) || 'Keep going — the next mission unlocks as soon as this one is mastered.',
      },
    };
  }

  function buildPilotMission() {
    return buildMissionForCategory(PILOT_LEVEL, PILOT_CATEGORY);
  }

  // §7 Phase 3 — every live category in the app, in the same order/
  // filter rule js/engine/progress.js's getOrderedLiveCategories()
  // uses (not comingSoon, has real SIGNS content) — re-derived here
  // from window.LWData directly so this file keeps its no-dependency-
  // on-progress.js rule (see file header).
  function getLiveCategoryList() {
    if (!global.LWData || typeof global.LWData.getUnits !== 'function') return [];
    const units = global.LWData.getUnits();
    const out = [];
    units
      .filter((u) => u.kind === 'category-group')
      .forEach((u) => {
        const cats = global.LWData.getCategoriesForUnit(u.order) || [];
        cats.forEach((c) => {
          if (!c.comingSoon && global.LWData.getCategorySigns(c.level, c.id).length > 0) {
            out.push(c);
          }
        });
      });
    return out;
  }

  // §7 Phase 3 — a dataV2 mission for every live category, built
  // fresh each call (missions are cheap to build; nothing here is
  // cached, matching the pilot's own no-cache behavior).
  function getAllMissions() {
    return getLiveCategoryList().map((c) => buildMissionForCategory(c.level, c.id));
  }

  // §7 Phase 3 — category ids are unique across the whole app (same
  // assumption js/engine/progress.js's own storage makes — see its
  // file header), so a bare categoryId lookup is enough; returns null
  // if the category isn't live (comingSoon, no signs, or unknown id).
  function getMissionForCategory(categoryId) {
    const cat = getLiveCategoryList().find((c) => c.id === categoryId);
    return cat ? buildMissionForCategory(cat.level, cat.id) : null;
  }

  /* ── Progress (dual-horizon, §3.4) ───────────────────────────────
   * missionProgress: fraction of this mission's items completed.
   * lessonProgress: fraction of ONE sign's own items (its LESSON +
   * BOOSTER + any PRACTICE tied to that signId) completed — the
   * "second, shorter bar" from §3.4/§5.4.
   */

  function loadProgressState() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const state = raw ? JSON.parse(raw) : { completedItemIds: [] };
      // Phase 2 addition — additive: old saved state from Phase 1
      // (before `completedAt` existed) has no such key, so backfill
      // an empty map rather than requiring a migration/reset.
      if (!state.completedAt) state.completedAt = {};
      return state;
    } catch {
      return { completedItemIds: [], completedAt: {} };
    }
  }

  function saveProgressState(state) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[data-v2.js] could not persist dataV2 progress:', e);
    }
  }

  function itemId(mission, index, item) {
    return `${mission.id}_${index}_${item.kind}_${item.signId || item.category || ''}`;
  }

  function isItemComplete(mission, index, item) {
    const state = loadProgressState();
    return state.completedItemIds.includes(itemId(mission, index, item));
  }

  function markItemComplete(mission, index, item) {
    const state = loadProgressState();
    const id = itemId(mission, index, item);
    let changed = false;
    if (!state.completedItemIds.includes(id)) {
      state.completedItemIds.push(id);
      changed = true;
    }
    if (!state.completedAt[id]) {
      // Phase 2 addition — timestamp, so a comparison tool can see
      // WHEN each item was finished, not just whether it was.
      state.completedAt[id] = new Date().toISOString();
      changed = true;
    }
    if (changed) saveProgressState(state);
    recordActivityToday();
    return getMissionProgress(mission);
  }

  // Phase 2 addition — when this item was completed, or null.
  function getItemCompletedAt(mission, index, item) {
    const state = loadProgressState();
    return state.completedAt[itemId(mission, index, item)] || null;
  }

  // Phase 2 addition — index of the first NOT-yet-complete item, in
  // the mission's own sequential order ("how far did the learner
  // actually get before stopping"). Returns mission.items.length if
  // every item is complete (no drop-off).
  function getDropOffIndex(mission) {
    for (let i = 0; i < mission.items.length; i++) {
      if (!isItemComplete(mission, i, mission.items[i])) return i;
    }
    return mission.items.length;
  }

  function getMissionProgress(mission) {
    if (!mission.items.length) return 0;
    const done = mission.items.filter((item, i) => isItemComplete(mission, i, item)).length;
    return done / mission.items.length;
  }

  function getLessonProgress(mission, signId) {
    const signItems = mission.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.signId === signId);
    if (!signItems.length) return 0;
    const done = signItems.filter(({ item, i }) => isItemComplete(mission, i, item)).length;
    return done / signItems.length;
  }

  function getRecap(mission) {
    // §3.8 — recap bullets, generated from whichever LESSON items are
    // actually complete, not a hardcoded list (so it's accurate for
    // whatever the learner has really done so far in the pilot).
    return mission.items
      .map((item, i) => ({ item, i }))
      .filter(({ item, i }) => item.kind === 'LESSON' && isItemComplete(mission, i, item))
      .map(({ item }) => `You can now sign "${item.signId}"`);
  }

  /* ── Streak / meta-progression (§3.15) — minimal, real, no fake
   * numbers. A day counts once any item is marked complete that day.
   */

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadStreakState() {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      return raw ? JSON.parse(raw) : { days: [], forgivenessUsedThisWeek: 0 };
    } catch {
      return { days: [], forgivenessUsedThisWeek: 0 };
    }
  }

  function saveStreakState(state) {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[data-v2.js] could not persist dataV2 streak:', e);
    }
  }

  function recordActivityToday() {
    const state = loadStreakState();
    const today = todayStr();
    if (!state.days.includes(today)) {
      state.days.push(today);
      state.days.sort();
      saveStreakState(state);
    }
  }

  function dayBefore(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function getStreakSummary() {
    const { days } = loadStreakState();
    if (!days.length) return { currentStreak: 0, longestStreak: 0, streakForgivenessRemaining: 1 };

    // Longest run of consecutive days anywhere in history — walk
    // forward, comparing each day to the previous day + 1.
    let longest = 1, run = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1] + 'T00:00:00');
      prev.setDate(prev.getDate() + 1);
      const expected = prev.toISOString().slice(0, 10);
      run = (days[i] === expected) ? run + 1 : 1;
      if (run > longest) longest = run;
    }

    // Current streak: consecutive days ending today or yesterday
    // (yesterday still "counts" as live until today ends).
    const today = todayStr();
    const yesterday = dayBefore(today);
    let anchor = null;
    if (days[days.length - 1] === today) anchor = today;
    else if (days[days.length - 1] === yesterday) anchor = yesterday;

    let current = 0;
    if (anchor) {
      current = 1;
      let cursor = anchor;
      for (let i = days.length - 2; i >= 0; i--) {
        const expectedPrev = dayBefore(cursor);
        if (days[i] === expectedPrev) {
          current++;
          cursor = expectedPrev;
        } else {
          break;
        }
      }
    }

    const { forgivenessUsedThisWeek } = loadStreakState();
    return {
      currentStreak: current,
      longestStreak: longest, // kept visible even if current is 0 — §3.15
      streakForgivenessRemaining: Math.max(0, 1 - forgivenessUsedThisWeek),
    };
  }

  /* ── Mastery Hearts (§6/§10) ─────────────────────────────────────
   * A 3-heart pool guarding Mastery Quiz ATTEMPTS ONLY — every other
   * learning activity (lesson, booster, practice) stays open at zero
   * hearts, per §10's "gate only the next Mastery Quiz attempt" rule.
   * Storage holds just the timestamps of currently-lost hearts
   * (`lostAt`), not a raw counter, so each lost heart can refill
   * independently on its own 4-hour timer instead of one shared timer
   * for the whole pool. Entries older than HEART_REFILL_MS are treated
   * as refilled and trimmed out on the next read/write — no cron/
   * background timer needed, same lazy-evaluation style as the streak
   * calculator above.
   */

  const MAX_HEARTS = 3;
  const HEART_REFILL_MS = 4 * 60 * 60 * 1000; // 4 hours per lost heart

  function loadHeartsState() {
    try {
      const raw = localStorage.getItem(HEARTS_KEY);
      const state = raw ? JSON.parse(raw) : { lostAt: [] };
      if (!Array.isArray(state.lostAt)) state.lostAt = [];
      return state;
    } catch {
      return { lostAt: [] };
    }
  }

  function saveHeartsState(state) {
    try {
      localStorage.setItem(HEARTS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[data-v2.js] could not persist dataV2 hearts:', e);
    }
  }

  // Drops any lostAt entries whose 4-hour refill window has already
  // passed, persisting the trim so storage doesn't grow forever.
  // Returns the still-lost (not yet refilled) timestamps.
  function trimRefilledHearts(state) {
    const now = Date.now();
    const stillLost = state.lostAt.filter((ts) => (now - new Date(ts).getTime()) < HEART_REFILL_MS);
    if (stillLost.length !== state.lostAt.length) {
      saveHeartsState({ lostAt: stillLost });
    }
    return stillLost;
  }

  // { hearts: 0-3, maxHearts: 3, nextRefillAt: ISOString|null } —
  // nextRefillAt is when the NEXT heart comes back (the oldest still-
  // lost one), or null when the pool is already full.
  function getHeartsState() {
    const stillLost = trimRefilledHearts(loadHeartsState());
    const hearts = Math.max(0, MAX_HEARTS - stillLost.length);
    let nextRefillAt = null;
    if (stillLost.length > 0) {
      const earliest = stillLost.slice().sort()[0];
      nextRefillAt = new Date(new Date(earliest).getTime() + HEART_REFILL_MS).toISOString();
    }
    return { hearts, maxHearts: MAX_HEARTS, nextRefillAt };
  }

  // Spends one heart for a Mastery Quiz attempt. No-ops (does not go
  // negative) if already at zero hearts — callers should check
  // getHeartsState().hearts > 0 before offering the action at all, this
  // is just a safe floor. Returns the resulting getHeartsState().
  function consumeHeartForMastery() {
    const stillLost = trimRefilledHearts(loadHeartsState());
    if (stillLost.length < MAX_HEARTS) {
      stillLost.push(new Date().toISOString());
      saveHeartsState({ lostAt: stillLost });
    }
    return getHeartsState();
  }

  /* ── Orientation (this session) ──────────────────────────────────
   * A single, ungated, always-visible entry v2-learn.js pins ABOVE
   * the 12 chapter sections — not a mission (no signs, no items, no
   * hearts/progress), just a pointer to pages/v2-orientation.html's
   * reading + video content. Exists because V1's equivalent content
   * (pages/homepage.html / intro-to-asl.html) lives only on the
   * post-login landing page — easy to skip once and never see again
   * since neither is part of the trail. Putting a row for it inside
   * the actual Learning Path (rather than only the landing page)
   * means every learner passes it, without it blocking anything.
   */
  const ORIENTATION = {
    id: 'orientation',
    title: 'Orientation',
    goal: 'Where ASL comes from, why it matters, and how to learn it well — start here.',
    href: 'v2-orientation.html',
  };

  function getOrientation() {
    return ORIENTATION;
  }

  /* ── UI config (§3.9, §3.10, §3.5, §3.12) ───────────────────────
   * Plain config, read by the preview renderer (js/data-v2-preview.js)
   * to decide where the hint link / heart counter / collapse
   * behavior would appear. Not consumed by the real lesson/learn UI
   * in this pilot — see file header.
   */
  const UI_CONFIG = {
    hintAvailableOn: ['recall', 'apply', 'quickCheck'], // was: recall only, §3.9
    showHeartsOn: 'everyLessonScreen', // was: quiz only, §3.10
    collapseMasteredMissions: true, // §3.5
    discussionCount: null, // reserved for §3.12, stays hidden until non-zero
  };

  /* ── Public export ───────────────────────────────────────────── */

  global.LWDataV2 = {
    schemaVersion: 2,
    featureFlagKey: FEATURE_FLAG_KEY,
    isEnabled,
    setEnabled,
    getPilotMission: buildPilotMission,
    getMissionForCategory,   // NEW — Phase 3
    getAllMissions,          // NEW — Phase 3
    getLiveCategoryList,     // NEW — Phase 3 (exposed for the mission picker)
    getMissionProgress,
    getLessonProgress,
    markItemComplete,
    isItemComplete,
    getItemCompletedAt,      // NEW — Phase 2
    getDropOffIndex,         // NEW — Phase 2
    getRecap,
    getStreakSummary,
    recordActivityToday,
    getHeartsState,          // NEW — Mission Overview + Hearts module
    consumeHeartForMastery,  // NEW — Mission Overview + Hearts module
    getOrientation,          // NEW — Orientation row above the chapters
    ui: UI_CONFIG,
  };

})(window);
