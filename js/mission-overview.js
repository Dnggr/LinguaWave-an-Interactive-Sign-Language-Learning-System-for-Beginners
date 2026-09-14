/**
 * js/mission-overview.js — Renderer for pages/mission-overview.html
 * ─────────────────────────────────────────────────────────────────
 * Same data source discipline as dashboard.js/learn.js: reads
 * only window.LWMissions (missions, progress, hearts, and — as of the
 * migration-analysis pass — sign titles for the "You'll practice"
 * chips too, since SIGNS_V2 already carries its own title; V1's
 * window.LWData is no longer read here). Nothing here touches
 * js/engine/progress.js's real progress store or pages/quiz.js.
 *
 * CHAPTER GATING (Task 1, this revision) : "Locked" now comes straight
 * from the single shared window.LWMissions.getMissionStatus() in
 * js/missions.js (chapter-based: locked only while the previous chapter
 * isn't 100% complete) — the old locally-duplicated position-based
 * statusFor() is gone.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// WIDENED (merged revision) — now covers ALL 12 chapters. Started as
// just Chapters 1-2, then three separate widenings each added a
// different slice (3-5 express_feelings/daily_actions/
// describing_things; 6-8 home_family/school_life/food_nature; 9-12
// clothing_belongings/people_places_time/having_a_conversation/
// putting_it_together) — merged here into one full-coverage list
// rather than keeping any of them partial. With every chapter
// sampled, the V1 pages/quiz.html handoff below is currently
// unreachable for any real mission — it stays as a defensive
// fallback only. See js/mastery-quiz.js's own
// SAMPLE_CATEGORY_GROUPS header note for the full scope note and
// verification. Must stay in sync with js/mastery-quiz.js's own
// SAMPLE_CATEGORY_GROUPS and js/lesson.js's own copy of this same
// const — see either file's header for why there are 3 separate
// copies. Kept as a small local const (not imported) same as this
// file's own existing pattern of re-deriving small pieces of logic
// per file rather than sharing them.
const SAMPLE_MASTERY_QUIZ_CHAPTERS = [
  'asl_foundations', 'introduce_yourself',
  'express_feelings', 'daily_actions', 'describing_things',
  'home_family', 'school_life', 'food_nature',
  'clothing_belongings', 'people_places_time', 'having_a_conversation', 'putting_it_together',
];

function getMissionParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mission');
}

function statusMeta(status) {
  switch (status) {
    case 'done': return { label: 'Completed', badge: 'badge--done' };
    case 'current': return { label: 'In Progress', badge: 'badge--intermediate' };
    case 'locked': return { label: 'Locked', badge: 'badge--locked' };
    default: return { label: 'Available', badge: 'badge--basic' };
  }
}

// Unique sign ids, in the order they first appear in the mission's
// own item sequence — not sorted/deduped alphabetically, so the chip
// row reads in the same order the mission actually teaches them.
function signsInMission(mission) {
  const seen = new Set();
  const out = [];
  mission.items.forEach((item) => {
    if (item.signId && !seen.has(item.signId)) {
      seen.add(item.signId);
      out.push(item.signId);
    }
  });
  return out;
}

function signTitle(mission, signId) {
  // FIX (migration-analysis pass) — was falling back to V1's
  // window.LWData.getSign() for the display title, but missions.js's
  // SIGNS_V2 already forks its own `title` field (see getSign there),
  // so this can read window.LWMissions directly and drop the V1
  // dependency entirely. Keeps the same signId fallback if somehow
  // doesn't have the sign either.
  const sign = (window.LWMissions && typeof window.LWMissions.getSign === 'function')
    ? window.LWMissions.getSign(mission.level, signId)
    : null;
  return (sign && sign.title) || signId;
}

// Per-sign completion, for the "You'll practice" chips' green/hover
// states. A sign counts as learned once its own LESSON item (from the
// Watch→Recognize→Discriminate loop, js/lesson.js) has been marked
// complete — the SAME window.LWMissions.isItemComplete() the mission
// progress bar already reads from, just checked for one specific
// sign's item instead of tallying the whole mission. Returns false
// (not an error) if this mission has no LESSON item for that sign.
function isSignLearned(mission, signId) {
  const index = mission.items.findIndex((item) => item.kind === 'LESSON' && item.signId === signId);
  if (index === -1) return false;
  return window.LWMissions.isItemComplete(mission, index, mission.items[index]);
}

// EXPLICITLY an estimate, never shown as an exact figure — per the
// guide's Mission Overview spec. Rough per-item-kind time budget:
// LESSON ~1 min (new content), BOOSTER ~0.5 min (quick reinforcement),
// PRACTICE ~1 min (scenario + recognition rounds), the closing QUIZ
// ~4 min flat. Rounded to the nearest minute so it doesn't read as
// falsely precise.
function estimateMinutes(mission) {
  let total = 0;
  mission.items.forEach((item) => {
    if (item.kind === 'LESSON') total += 1;
    else if (item.kind === 'BOOSTER') total += 0.5;
    else if (item.kind === 'PRACTICE') total += 1;
    else if (item.kind === 'QUIZ') total += 4;
  });
  return Math.max(1, Math.round(total));
}

// "2h 15m" / "45m" / "less than a minute" — for the hearts refill
// countdown. Purely a display formatter, not stored anywhere.
function formatCountdown(targetIso) {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return 'less than a minute';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function heartIcon(filled) {
  return `
    <svg class="heart ${filled ? 'heart--full' : 'heart--empty'}" width="22" height="22" viewBox="0 0 24 24"
         fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
    </svg>
  `;
}

function renderHearts() {
  const state = window.LWMissions.getHeartsState();
  const hearts = Array.from({ length: state.maxHearts }, (_, i) => heartIcon(i < state.hearts)).join('');
  const refillNote = state.hearts < state.maxHearts
    ? `<p class="hearts__refill">Next heart in ${formatCountdown(state.nextRefillAt)}</p>`
    : '';
  // Wording (Task 2) — "remaining", not "attempts available": for the
  // sampled chapters' (SAMPLE_MASTERY_QUIZ_CHAPTERS, above) real
  // mastery-quiz.html, one heart no longer equals one whole attempt
  // (it's spent per wrong answer instead), so
  // this card — shown for every chapter regardless of which quiz it
  // uses — needs neutral wording that's still accurate for the
  // unchanged, per-attempt V1 quiz.js fallback chapters too.
  return `
    <div class="hearts">
      <div class="hearts__row">${hearts}</div>
      <p class="hearts__count">${state.hearts} of ${state.maxHearts} Mastery Hearts remaining</p>
      ${refillNote}
    </div>
  `;
}

function render(mission, status) {
  const el = document.getElementById('mo-content');
  const meta = statusMeta(status);
  const locked = status === 'locked';
  // DICTIONARY LINK — chips link straight to lesson.html (now-owned,
  // moved from pages/camera-practice.html into pages/), which IS
  // the Dictionary Section — no separate dictionary.html page.
  // Every chip links, learned or not: lesson.html is what decides
  // lock/unlock (same isSignLearned() check this chip row already
  // uses for its own green "learned" state), so clicking a still-
  // locked chip just takes the learner to that sign showing it
  // locked. `level`+`category`+`sign` together (not sign alone) let
  // lesson.html find the exact entry even if a signId is reused
  // across missions/categories.
  const chips = signsInMission(mission)
    .map((id) => {
      const learned = isSignLearned(mission, id);
      const dictUrl = `camera-practice.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}&sign=${encodeURIComponent(id)}`;
      return `<a href="${dictUrl}" class="sign-chip${learned ? ' sign-chip--learned' : ''}">${signTitle(mission, id)}</a>`;
    })
    .join('');
  // CHANGED — used to link straight to ../pages/camera-practice.html (V1).
  // Now routes to the new lesson.html, which walks this mission's
  // own items through the six-stage Sign Learning Loop from
  // LinguaWaveV2_Learning_Psychology_Analysis.docx (see that file's
  // header comment for the full integration note). pages/camera-practice.html
  // is still reachable from inside lesson.html itself, as the
  // explicit "Practice with your camera" link on each Watch stage.
  const lessonUrl = `lesson.html?mission=${encodeURIComponent(mission.category)}`;
  // NEW — ALL 12 chapters (see SAMPLE_MASTERY_QUIZ_CHAPTERS above)
  // now route to the real mastery-quiz.html sample instead of V1's
  // pages/quiz.html; see that page's own file header for the exact
  // scope and how to widen it. The V1 pages/quiz.html branch below is
  // now a defensive fallback only — every real mission's
  // categoryGroup is in the sample — still spending the heart on
  // attempt START if it's ever reached (deliberately left alone this
  // revision — see js/missions.js's file header "HEART TIMING FIX,
  //-NATIVE QUIZ ONLY").
  const usesNativeQuiz = SAMPLE_MASTERY_QUIZ_CHAPTERS.indexOf(mission.categoryGroup) !== -1;
  const quizUrl = usesNativeQuiz
    ? `mastery-quiz.html?mission=${encodeURIComponent(mission.category)}`
    : `../pages/quiz.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  const pct = Math.round(window.LWMissions.getMissionProgress(mission) * 100);
  const heartsState = window.LWMissions.getHeartsState();
  const outOfHearts = heartsState.hearts <= 0;
  // Priority 2, item 5/6 — label-only: a 'done' mission's own lesson
  // page now shows a Go to Start/Go to End review nav bar (see
  // js/lesson.js), so this entry point is relabeled to match what
  // the learner is actually about to do. Same lessonUrl/href either
  // way — no behavior change, review safety is enforced in
  // lesson.js itself, not by this label.
  const startLabel = status === 'done' ? '🔁 Review Mission' : '▶ Start Mission';

  el.innerHTML = `
    <div class="mo-header">
      <span class="mo-header__num">Mission ${String(mission._index + 1).padStart(2, '0')}</span>
      <span class="badge ${meta.badge}">${meta.label}</span>
    </div>
    <h1>${mission.title}</h1>
    <p class="text-muted">${mission.goal}</p>

    ${!locked ? `
      <div class="mo-progress">
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        <span class="mo-progress__label">${pct}% complete</span>
      </div>
    ` : `
      <div class="note-banner">This mission is locked — finish every mission in the current chapter 100% to unlock the next chapter.</div>
    `}

    <h2 class="mt-6 mb-3">You'll practice</h2>
    <div class="sign-chip-row">${chips || '<span class="text-muted">No signs found for this mission.</span>'}</div>

    <div class="mo-facts">
      <div class="card mo-fact">
        <p class="mo-fact__label">Estimated effort</p>
        <p class="mo-fact__value">~${estimateMinutes(mission)} min <span class="text-muted">(estimate)</span></p>
      </div>
      <div class="card mo-fact">
        <p class="mo-fact__label">Mastery requirement</p>
        <p class="mo-fact__value">Score 80%+ on the Mastery Quiz</p>
      </div>
      <div class="card mo-fact mo-fact--hearts">
        <p class="mo-fact__label">Mastery Hearts</p>
        ${renderHearts()}
      </div>
    </div>

    <div class="mo-actions">
      ${locked ? '' : `<a href="${lessonUrl}" class="btn btn--primary btn--lg">${startLabel}</a>`}
      ${locked ? '' : `
        <button type="button" class="btn btn--secondary btn--lg" id="mo-start-quiz"
                data-quiz-url="${quizUrl}" ${outOfHearts ? 'disabled' : ''}>
          🎯 Start Mastery Quiz
        </button>
      `}
      <button type="button" class="btn btn--ghost btn--lg" disabled title="Coming soon">
        Know some already? <span class="badge badge--dev">Coming soon</span>
      </button>
    </div>
  `;

  const quizBtn = document.getElementById('mo-start-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      if (usesNativeQuiz) {
        // Task 2 — entering mastery-quiz.html costs nothing; it
        // spends a heart per WRONG answer instead (see that page's
        // js/mastery-quiz.js), not once here and not once on submit.
        window.location.href = quizBtn.dataset.quizUrl;
        return;
      }
      // UNCHANGED, non-sampled chapters only (still V1's pages/quiz.js,
      // deliberately left untouched this revision — see js/missions.js's
      // file header "HEART TIMING FIX,-NATIVE QUIZ ONLY"): this
      // still spends the heart on attempt START, not per wrong answer.
      window.LWMissions.consumeHeartForMastery();
      window.location.href = quizBtn.dataset.quizUrl;
    });
  }
}

function renderMissionOverview() {
  const el = document.getElementById('mo-content');
  const categoryId = getMissionParam();
  const allMissions = window.LWMissions.getAllMissions();
  const mission = categoryId ? window.LWMissions.getMissionForCategory(categoryId) : null;

  if (!mission) {
    el.innerHTML = `<p class="text-muted">No mission found for "${categoryId || ''}" — <a href="learn.html">back to all missions</a>.</p>`;
    return;
  }

  mission._index = allMissions.findIndex((m) => m.category === mission.category);

  const status = window.LWMissions.getMissionStatus(mission, allMissions);

  document.title = `${mission.title} — LinguaWave (preview)`;
  render(mission, status);
}

function initPage() {
  if (!window.LWMissions) {
    // FIX (migration-analysis pass) — was also requiring window.LWData
    // (js/data.js), which this page no longer reads (see signTitle()).
    document.getElementById('mo-content').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  // Render immediately from local state (getAllMissions() /
  // getMissionForCategory() read straight off localStorage) instead
  // of blocking first paint on a Firestore round-trip. Reconcile
  // cross-device progress status in the background and re-render
  // once it resolves.
  renderMissionOverview();
  window.LWMissions.whenMissionsSyncReady().then(renderMissionOverview);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}