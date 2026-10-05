/**
 * js/tour-guides.js: the copy for every page guide
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : One plain data file that holds what each guided tour says
 *            and what it points at. Edit wording or add a step here;
 *            js/tour.js (the engine) never needs to change for that.
 *            Same idea as js/data.js: content lives in a data file a
 *            non-engineer can edit.
 *
 * WIRING   : A page opts in with `<body data-tour="GUIDE_ID">` and
 *            loads css/tour.css, this file, then js/tour.js. GUIDE_ID
 *            is one of the keys below.
 *
 * STEP SHAPE
 *   {
 *     target:    CSS selector for the element to spotlight. Leave it
 *                out for a centred card with no spotlight (a welcome).
 *     title:     short, in the learner's words (aim for 5 words).
 *     body:      one or two sentences of plain text (no HTML).
 *     placement: 'bottom' | 'top' | 'right' | 'left'. Where the card
 *                prefers to sit; falls back to whichever side has
 *                room. Phones always dock the card at the bottom.
 *     fit:       'children' spotlights the union of the target's
 *                children rather than its own (possibly taller) box.
 *     optional:  true when the target is legitimately absent in some
 *                states (a locked mission has no Start button). The
 *                step is dropped silently. Every guide should still
 *                have at least one NON-optional target, because the
 *                engine waits for those before it starts, which is
 *                how it copes with content a page renders after load.
 *     when:      (NEW) function returning true/false, evaluated once
 *                when the guide starts. A step whose `when` returns
 *                false is dropped, exactly like a missing target. This
 *                is how one guide shows different copy depending on
 *                state (e.g. Orientation done or not). Keep it cheap
 *                and side-effect free; if it throws, the step is kept.
 *   }
 *
 * GUIDE-LEVEL OPTIONS (NEW, all optional)
 *   requires:  function. The guide only auto-starts when it returns
 *              true. (It does not block start(id) / ?tour=1.)
 *   followUps: array of guide ids. After this page's own guide, the
 *              engine auto-starts these in order, each only if its own
 *              `requires` passes and it has not been seen. A follow-up
 *              runs right after the primary guide FINISHES (Done), or
 *              on its own when the primary was already seen. It never
 *              chains after a Skip.
 *
 * ORIENTATION: new learners must finish Orientation before Chapter 1
 *            unlocks (js/missions.js isOrientationComplete()). The
 *            helpers just below read that single source of truth, so
 *            the tour never keeps a second copy of the state:
 *              - dashboard / learn guides tell a new user to start
 *                with Orientation;
 *              - the `orientation` guide explains how to finish it;
 *              - the `chapter1-unlocked` follow-up points at Chapter 1
 *                once Orientation is done and Chapter 1 is untouched.
 *
 * REMINDERS : window.LWTourReminders (bottom of this file) holds the copy
 *            for one-step "Got it" popups that are NOT guides: they are
 *            not tracked as seen or skipped and never replay a guide.
 *
 * COPY RULES (so the guides read like one voice)
 *   - Say what the learner can DO here, not how the page is built.
 *   - Only state things the app really does. Every claim below was
 *     checked against the page's own code or on-screen text.
 *   - Sentence case, active voice, no exclamation marks.
 *
 * Steps whose target isn't on the page when the guide starts are
 * dropped, and the progress segments count only what's left.
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── State helpers (read-only; the source of truth is LWMissions) ── */
  function missionsApi() { return window.LWMissions || null; }

  // True when Orientation is done. If the missions layer isn't on the page
  // we answer "done" on purpose, so a missing script can never make the tour
  // nag a returning learner to redo Orientation.
  function orientationDone() {
    try {
      var m = missionsApi();
      if (!m || typeof m.isOrientationComplete !== 'function') return true;
      return !!m.isOrientationComplete();
    } catch (e) { return true; }
  }
  function orientationPending() { return !orientationDone(); }

  // Chapter 1 exists and nothing in it has been started yet.
  function chapter1Untouched() {
    try {
      var m = missionsApi();
      if (!m || !m.getAllMissions || !m.getMissionProgress) return false;
      var list = m.getAllMissions().filter(function (x) { return x.categoryGroup === 'asl_foundations'; });
      return list.length > 0 && list.every(function (x) { return m.getMissionProgress(x) === 0; });
    } catch (e) { return false; }
  }

  function currentPage() {
    return document.body && document.body.dataset ? document.body.dataset.tour : '';
  }
  function onPage(id) { return function () { return currentPage() === id; }; }

  window.LWTourGuides = {

    /* ── Dashboard ─────────────────────────────────────────────── */
    dashboard: {
      followUps: ['chapter1-unlocked'],
      steps: [
        {
          when: orientationPending,
          title: 'Welcome to LinguaWave',
          body: 'Your first step is Orientation. It unlocks Chapter 1. Here is a 30-second tour. You can skip it at any time.',
        },
        {
          when: orientationDone,
          title: 'Welcome to your dashboard',
          body: 'Here is a 30-second tour of where everything is. You can skip it at any time.',
        },
        {
          target: '.app-sidebar__nav',
          optional: true, // collapsed behind the menu button on phones (css/responsive.css)
          fit: 'children',
          placement: 'right',
          title: 'Move around from the menu',
          body: 'Learn holds every mission, Progress tracks how far you have come, Game and Leaderboard are for practice and ranking, and Settings keeps your preferences.',
        },
        {
          // The account card js/main.js adds to the foot of the sidebar
          // (initSidebarAccountLinks). Hidden with the sidebar on phones.
          target: '.app-sidebar__user',
          optional: true,
          placement: 'right',
          title: 'Open your profile',
          body: 'Select your name to see your level, achievements and activity, or to change your picture.',
        },
        {
          when: orientationPending,
          target: '#mission-banner',
          placement: 'bottom',
          title: 'Start with Orientation',
          body: 'This button opens Orientation. Finish it and your first mission appears here.',
        },
        {
          when: orientationDone,
          target: '#mission-banner',
          placement: 'bottom',
          title: 'Pick up your next mission',
          body: 'This is the mission to do next. Start it here, or continue where you left off.',
        },
        {
          target: '#progress-card',
          title: 'Track your progress',
          body: 'See your overall progress, day streak and Mastery Hearts. Hearts are spent on wrong answers in a Mastery Quiz.',
        },
        {
          // The Orientation card added to the dashboard (#orientation-card).
          when: orientationPending,
          target: '#orientation-card .path-row',
          optional: true,
          placement: 'top',
          title: 'Orientation comes first',
          body: 'Open this card and read through the page. Chapter 1, and every chapter after it, stays locked until you finish.',
        },
        {
          when: orientationPending,
          target: '#learning-path-grid',
          placement: 'top',
          title: 'Chapter 1 unlocks after Orientation',
          body: 'These tiles open once Orientation is done. After that, finish every mission in a chapter to unlock the next one.',
        },
        {
          when: orientationDone,
          target: '#learning-path-grid',
          placement: 'top',
          title: 'Jump into any open mission',
          body: 'Each tile shows a mission\u2019s progress. Finish every mission in a chapter to unlock the next one.',
        },
      ],
    },

    /* ── Learn ─────────────────────────────────────────────────── */
    learn: {
      followUps: ['chapter1-unlocked'],
      steps: [
        {
          target: '#path-search-input',
          placement: 'bottom',
          title: 'Find a mission fast',
          body: 'Type a mission name or a topic to narrow the list.',
        },
        {
          when: orientationPending,
          target: '#orientation-slot .path-row',
          optional: true,
          placement: 'bottom',
          title: 'Start with Orientation',
          body: 'Open this first. Chapter 1 stays locked until you finish it.',
        },
        {
          when: orientationDone,
          target: '#orientation-slot .path-row',
          optional: true,
          placement: 'bottom',
          title: 'Orientation is done',
          body: 'You can reopen the orientation here any time.',
        },
        {
          when: orientationPending,
          target: '#path-list .trail-group',
          placement: 'top',
          title: 'Chapters open in order',
          body: 'Missions are grouped into chapters. Chapter 1 unlocks once Orientation is done, and later chapters unlock as you finish earlier ones.',
        },
        {
          when: orientationDone,
          target: '#path-list .trail-group',
          placement: 'top',
          title: 'Work through the chapters',
          body: 'Missions are grouped into chapters. Open a chapter to see its missions. Later chapters unlock as you finish earlier ones.',
        },
      ],
    },

    /* ── Orientation (new learners only) ───────────────────────── */
    // One centred card, deliberately with no target: spotlighting the
    // Continue button would scroll the page to the end, and scrolling to
    // the end is what completes Orientation (js/orientation.js).
    orientation: {
      requires: orientationPending,
      steps: [
        {
          title: 'Start with Orientation',
          body: 'Read through this page. When you reach the end, or press Continue to the Learning Path, Orientation is complete and Chapter 1 unlocks.',
        },
      ],
    },

    /* ── Chapter 1 unlocked (follow-up on dashboard + learn) ───── */
    // Auto-starts only after Orientation is done AND Chapter 1 has not been
    // touched, so it appears once, right when it is useful. Each step is
    // tied to the page it belongs to through `when`.
    'chapter1-unlocked': {
      requires: function () { return orientationDone() && chapter1Untouched(); },
      steps: [
        {
          when: onPage('learn'),
          target: '#path-list .trail-group[data-chapter="asl_foundations"]',
          placement: 'top',
          title: 'Chapter 1 is unlocked',
          body: 'Orientation is complete. Open Chapter 1 and start your first mission.',
        },
        {
          when: onPage('dashboard'),
          target: '#mission-banner',
          placement: 'bottom',
          title: 'Chapter 1 is unlocked',
          body: 'Orientation is complete. Start your first Chapter 1 mission here.',
        },
      ],
    },

    /* ── Mission overview ──────────────────────────────────────── */
    'mission-overview': {
      steps: [
        {
          target: '.mo-header',
          placement: 'bottom',
          title: 'Check the mission status',
          body: 'The badge shows whether this mission is available, in progress, locked or completed.',
        },
        {
          target: '.sign-chip-row',
          placement: 'bottom',
          title: 'See the signs you will learn',
          body: 'A sign turns green once you have learned it. Signs open in order, so finish one to unlock the next.',
        },
        {
          target: '.mo-facts',
          placement: 'top',
          title: 'Know what it takes',
          body: 'Check the time estimate and how many Mastery Hearts you have. A wrong answer in the Mastery Quiz costs one.',
        },
        {
          target: '.mo-actions',
          optional: true,
          placement: 'top',
          title: 'Start when you are ready',
          body: 'Start, continue or review the lesson here. Already know these signs? Take the Mastery Quiz to finish the mission early.',
        },
      ],
    },

    /* ── Lesson (mission flow) ─────────────────────────────────── */
    lesson: {
      steps: [
        {
          target: '.lesson-track',
          placement: 'bottom',
          title: 'Follow your progress',
          body: 'The bar shows where you are in this mission, one step at a time.',
        },
        {
          target: '#lesson-content',
          placement: 'top',
          title: 'One idea at a time',
          body: 'Each screen teaches or checks a single sign. Take your time, then continue when you are ready.',
        },
        {
          target: '#lesson-exit',
          placement: 'bottom',
          title: 'Leave any time',
          body: 'Finished items stay finished. Come back later and the mission resumes where you stopped.',
        },
      ],
    },

    /* ── Camera practice ───────────────────────────────────────── */
    'camera-practice': {
      steps: [
        {
          target: '#lesson-desc',
          placement: 'bottom',
          title: 'Learn how the sign is made',
          body: 'Read the steps, then watch the video to see the sign in motion.',
        },
        {
          target: '.camera-viewport',
          placement: 'left',
          title: 'Try it on camera',
          body: 'Allow camera access, keep your hand in view and sign. Detection runs in your browser.',
        },
        {
          target: '.detection-panel',
          placement: 'left',
          title: 'See what it detects',
          body: 'The detected sign and confidence update as you sign. Hold a letter steady for about 1.5 seconds.',
        },
        {
          target: '#btn-start-assessment',
          placement: 'left',
          title: 'Clear the camera check',
          body: 'Practice Check runs a short camera round. Score at least 80% to move on to the next sign. If you miss, you can try again.',
        },
        {
          // The existing Camera Tips card, in place (never a copy). Kept
          // last on the right-hand column, in the page's own top-to-bottom
          // order. Also the target of the repeated-miss reminder below.
          target: '.camera-tips',
          placement: 'left',
          title: 'Tips for better detection',
          body: 'Good light and a centered, fully visible hand help most. If detection keeps missing, this card pops up as a reminder.',
        },
        {
          target: '#course-sidebar',
          placement: 'right',
          title: 'Track the whole course',
          body: 'The outline lists every sign in the course. Signs unlock in order as you learn them.',
        },
      ],
    },

    /* ── Mastery quiz ──────────────────────────────────────────── */
    'mastery-quiz': {
      steps: [
        {
          target: '.quiz-progress',
          placement: 'bottom',
          title: 'Follow the quiz',
          body: 'See which question you are on. The bar fills as you answer.',
        },
        {
          target: '#mq-hearts-row',
          placement: 'bottom',
          title: 'Mind your hearts',
          body: 'A wrong answer costs one Mastery Heart. Hearts refill over time, so you can try again later.',
        },
        {
          target: '#mq-options',
          placement: 'top',
          title: 'Choose what the sign means',
          body: 'Watch the sign, then pick the matching word. Finish before your hearts run out to complete the mission.',
        },
      ],
    },

    /* ── Progress ──────────────────────────────────────────────── */
    progress: {
      steps: [
        {
          target: '#progress-hero',
          placement: 'bottom',
          title: 'See your overall progress',
          body: 'The ring shows how much of the course you have finished. The tiles count signs learned, missions completed and your day streak.',
        },
        {
          target: '#needs-review',
          placement: 'left',
          title: 'Review before you forget',
          body: 'Signs you have not practiced in a while show up here. Select one to practice it again.',
        },
        {
          target: '#progress-chapters',
          placement: 'top',
          title: 'Track each chapter',
          body: 'These bars show how far you are through the course, chapter by chapter.',
        },
      ],
    },

    /* ── Leaderboard ───────────────────────────────────────────── */
    leaderboard: {
      steps: [
        {
          title: 'Welcome to the leaderboard',
          body: 'See how your XP compares with other learners. This tour takes under a minute and you can skip it at any time.',
        },
        {
          target: '#lb-me',
          placement: 'left',
          title: 'Your level at a glance',
          body: 'This panel shows your level, XP and badges, and how much XP is left until your next level. Press My badges to see the ones you have earned and the ones still ahead.',
        },
        {
          target: '#lb-tabs',
          placement: 'bottom',
          title: 'Switch between boards',
          body: 'Rank by level, streaks or badges, or open a game board for Construct a Sentence, Wall Breaker or Time Attack. You can flip the order and choose how many learners to show.',
        },
        {
          target: '#lb-panel',
          placement: 'top',
          title: 'Find yourself on the board',
          body: 'Your row is highlighted. Lessons are worth far more XP than games, so steady lessons are the way up.',
        },
        {
          target: '#lb-how-btn',
          placement: 'bottom',
          title: 'Check how XP works',
          body: 'Open this any time to see what earns XP, how the boards are ranked and how streaks count.',
        },
      ],
    },

    /* ── Game picker ───────────────────────────────────────────── */
    // Only the picker (pages/game.html). The three game pages are
    // played full screen and have no guide. A learner who has not
    // unlocked the Game never reaches this page (js/game-gate.js).
    game: {
      steps: [
        {
          target: '.game-picker__intro',
          placement: 'bottom',
          title: 'Choose a game',
          body: 'Each mode practices your signs in a different way. Pick one to start.',
        },
        {
          target: '.game-mode--sentence',
          title: 'Build sentences from memory',
          body: 'Memorize the signs, then drag the videos into the right order. No camera needed.',
        },
        {
          target: '.game-mode--wall',
          title: 'Break the wall in any order',
          body: 'Hold static signs or record motion signs to break each brick. This one uses your camera.',
        },
        {
          target: '.game-mode--time',
          title: 'Race the clock',
          body: 'Fingerspell the words in order against the clock. Longer words earn more XP. This one uses your camera.',
        },
      ],
    },

    /* ── Profile ───────────────────────────────────────────────── */
    profile: {
      steps: [
        {
          target: '.profile-side__avatar-wrap',
          placement: 'right',
          title: 'Pick your picture',
          body: 'Select the round button on your picture to choose a new one. It shows next to your name on the leaderboard.',
        },
        {
          target: '#xp-card',
          placement: 'bottom',
          title: 'Check your level',
          body: 'See your level, total XP and how much is left until the next level. The streak and badge chips open the leaderboard.',
        },
        {
          target: '#profile-achievements',
          placement: 'right',
          title: 'Collect achievements',
          body: 'Earned achievements light up. Point at a locked one to see what unlocks it.',
        },
        {
          target: '#profile-activity',
          placement: 'top',
          title: 'Look back on your practice',
          body: 'Each square is one day over the past year, so you can see when you practiced.',
        },
      ],
    },

  };

  /* ── Reminders (NEW) ─────────────────────────────────────────────
     One-step popups that point at something already on a page when a
     learner needs it, instead of replaying a whole guide. Run by
     window.LWTour.remind() (js/tour.js); WHEN one fires is decided by
     the page's own trigger (camera-practice: js/camera-tips-reminder.js).
       target       the element to spotlight (the real card, never a copy)
       tiers[]      copy from gentle to more helpful; the trigger picks
                    the tier from how many times the learner has missed
       buttonLabel  the only button
     Same copy rules as the guides above. */
  window.LWTourReminders = {
    'camera-tips': {
      target: '.camera-tips',
      placement: 'left',
      icon: 'camera_tips',
      buttonLabel: 'Got it',
      tiers: [
        // 2nd miss
        { title: 'Quick Camera Tip', body: 'Try keeping your hand centered and fully visible.' },
        // 5th miss
        { title: 'Let\u2019s adjust your setup', body: 'Make sure your hand is well-lit and there is enough space around it.' },
        // 10th miss and every later reminder
        { title: 'Need a little help?', body: 'Review these camera tips before trying again.' },
      ],
    },
  };
})();
