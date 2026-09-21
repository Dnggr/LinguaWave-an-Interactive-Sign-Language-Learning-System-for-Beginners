/**
 * js/tour-guides.js: the copy for every page guide           (NEW)
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
 *   }
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

  window.LWTourGuides = {

    /* ── Dashboard ─────────────────────────────────────────────── */
    dashboard: {
      steps: [
        {
          title: 'Welcome to your dashboard',
          body: 'Here is a 30-second tour of where everything is. You can skip it at any time.',
        },
        {
          target: '.app-sidebar__nav',
          fit: 'children',
          placement: 'right',
          title: 'Move around from the menu',
          body: 'Learn holds every mission, Progress tracks how far you have come, and Settings keeps your preferences.',
        },
        {
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
          target: '#learning-path-grid',
          placement: 'top',
          title: 'Jump into any open mission',
          body: 'Each tile shows a mission\u2019s progress. Finish every mission in a chapter to unlock the next one.',
        },
      ],
    },

    /* ── Learn ─────────────────────────────────────────────────── */
    learn: {
      steps: [
        {
          target: '#path-search-input',
          placement: 'bottom',
          title: 'Find a mission fast',
          body: 'Type a mission name or a topic to narrow the list.',
        },
        {
          target: '#orientation-slot .path-row',
          optional: true,
          placement: 'bottom',
          title: 'New to ASL? Start here',
          body: 'This short orientation introduces the basics before your first mission.',
        },
        {
          target: '#path-list .trail-group',
          placement: 'top',
          title: 'Work through the chapters',
          body: 'Missions are grouped into chapters. Open a chapter to see its missions. Later chapters unlock as you finish earlier ones.',
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
          title: 'Test yourself, if you like',
          body: 'Practice Check runs a short camera round. It is optional and never blocks your progress.',
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

  };
})();
