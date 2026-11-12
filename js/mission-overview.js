'use strict';

const SAMPLE_MASTERY_QUIZ_CHAPTERS = [
  'asl_foundations', 'introduce_yourself',
  'express_feelings', 'daily_actions', 'describing_things',
  'home_family', 'school_life', 'food_nature',
  'clothing_belongings', 'people_places_time', 'having_a_conversation',
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
  const sign = (window.LWMissions && typeof window.LWMissions.getSign === 'function')
    ? window.LWMissions.getSign(mission.level, signId)
    : null;
  return (sign && sign.title) || signId;
}

function isSignLearned(mission, signId) {
  const index = mission.items.findIndex((item) => item.kind === 'LESSON' && item.signId === signId);
  if (index === -1) return false;
  return window.LWMissions.isItemComplete(mission, index, mission.items[index]);
}

function signChipState(mission, signId) {
  if (!isSignLearned(mission, signId)) return 'none';
  return window.LWMissions.getLessonProgress(mission, signId) >= 1
    ? 'mastered'
    : 'practicing';
}

function isSignAccessible(mission, signs, signId) {
  if (window.LWMissions.isFullCurriculumUnlocked?.()) return true;
  if (isSignLearned(mission, signId)) return true;
  const idx = signs.indexOf(signId);
  if (idx <= 0) return true;
  return signs.slice(0, idx).every((prevId) => isSignLearned(mission, prevId));
}

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

function formatCountdown(targetIso) {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return 'less than a minute';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getNextMission(mission, allMissions) {
  if (!window.LWMissions.getTrailNumbers) return null;
  const numbers = window.LWMissions.getTrailNumbers(allMissions);
  const here = numbers.get(mission.category);
  if (!here) return null;
  let nextCategory = null;
  numbers.forEach((n, category) => { if (n === here + 1) nextCategory = category; });
  return nextCategory ? (allMissions.find((m) => m.category === nextCategory) || null) : null;
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
  const signs = signsInMission(mission);
  const chips = signs
    .map((id) => {
      const label = signTitle(mission, id);
      if (locked) {
        return `<span class="sign-chip sign-chip--locked" aria-disabled="true" title="Locked: finish Chapter 1 and Chapter 2 to unlock this one">${label}</span>`;
      }
      if (!isSignAccessible(mission, signs, id)) {
        return `<span class="sign-chip sign-chip--pending" aria-disabled="true" title="Locked: finish the earlier signs in this mission first">${label}</span>`;
      }
      const dictUrl = `camera-practice.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}&sign=${encodeURIComponent(id)}`;
      const state = signChipState(mission, id);
      const stateClass = state === 'mastered' ? ' sign-chip--learned'
                       : state === 'practicing' ? ' sign-chip--practicing'
                       : '';
      const stateTitle = state === 'practicing'
        ? ' title="Practicing: finish this sign\'s booster and practice to complete it"'
        : '';
      return `<a href="${dictUrl}" class="sign-chip${stateClass}"${stateTitle}>${label}</a>`;
    })
    .join('');
  const canReview = !locked && window.LWMissions.canReviewMission(mission);
  const lessonUrl = `lesson.html?mission=${encodeURIComponent(mission.category)}${canReview ? '&review=1' : ''}`;
  const usesNativeQuiz = SAMPLE_MASTERY_QUIZ_CHAPTERS.indexOf(mission.categoryGroup) !== -1;
  const quizUrl = `mastery-quiz.html?mission=${encodeURIComponent(mission.category)}`;
  const pct = Math.round(window.LWMissions.getMissionProgress(mission) * 100);
  const heartsState = window.LWMissions.getHeartsState();
  const outOfHearts = heartsState.hearts <= 0;
  const inProgress = !canReview && pct > 0 && pct < 100;
  const startText = canReview ? 'Review Mission' : (inProgress ? 'Continue' : 'Start Mission');
  const startLabel = window.LWIcons.markup(canReview ? 'frequency' : 'current', { size: 'sm' })
    + `<span class="lw-icon-label">${startText}</span>`;

  let nextBtn = '';
  if (status === 'done') {
    const nextMission = getNextMission(mission, window.LWMissions.getAllMissions());
    if (nextMission) {
      const nextStatus = window.LWMissions.getMissionStatus(nextMission, window.LWMissions.getAllMissions());
      if (nextStatus === 'locked') {
        nextBtn = `<button type="button" class="btn btn--secondary btn--lg" id="mo-next-locked" aria-disabled="true"
                title="Locked: finish every mission in this chapter to unlock the next one">
          <span>Next</span>${window.LWIcons.markup('locked', { size: 'sm' })}
        </button>`;
      } else {
        nextBtn = `<a href="mission-overview.html?mission=${encodeURIComponent(nextMission.category)}" class="btn btn--secondary btn--lg"
                title="Next: ${nextMission.title}">
          <span>Next</span>${window.LWIcons.markup('arrow_right', { size: 'sm' })}
        </a>`;
      }
    }
  }

  const missionNumber = (window.LWMissions.getTrailNumbers && window.LWMissions.getTrailNumbers().get(mission.category)) || (mission._index + 1);

  el.innerHTML = `
    <div class="mo-header">
      <span class="mo-header__num">Mission ${String(missionNumber).padStart(2, '0')}</span>
      <span class="badge ${meta.badge}">${meta.label}</span>
    </div>
    <h1>${mission.title}</h1>
    <p class="text-muted">${mission.goal}</p>

    ${!locked ? `
      <div class="mo-progress">
        <div class="progress-bar"><div class="progress-bar__fill" style="--p:${pct}"></div></div>
        <span class="mo-progress__label">${pct}% complete</span>
      </div>
    ` : `
      <div class="note-banner">This mission is locked. Finish every mission in Chapter 1 and Chapter 2 (100%) to open all the remaining chapters.</div>
    `}

    <h2 class="mt-6 mb-3">You'll practice</h2>
    <div class="sign-chip-row">${chips || '<span class="text-muted">No signs found for this mission.</span>'}</div>

    <div class="mo-facts">
      <div class="card mo-fact">
        <p class="mo-fact__label">Estimated effort</p>
        <p class="mo-fact__value">~${estimateMinutes(mission)} min <span class="text-muted">(estimate)</span></p>
      </div>
      <div class="card mo-fact mo-fact--hearts">
        <p class="mo-fact__label">Mastery Hearts</p>
        ${renderHearts()}
      </div>
    </div>

    <!-- "Know some already?" (was here, permanently disabled/"Coming
         soon") REMOVED this session rather than wired up — it would
         have been a second implementation of exactly what "🎯 Start
         Mastery Quiz" below already does correctly: an advanced
         learner who already knows the mission's signs can go straight
         to that button, pass it, and markMissionComplete() (see
         js/missions.js) marks the whole mission done, not just the
         quiz item. Leaving a visibly-disabled duplicate button next to
         a working one read as a broken promise rather than a real gap. -->
    <div class="mo-actions">
      ${locked ? '' : `<a href="${lessonUrl}" class="btn btn--primary btn--lg">${startLabel}</a>`}
      ${locked ? '' : `
        <button type="button" class="btn btn--secondary btn--lg" id="mo-start-quiz"
                data-quiz-url="${quizUrl}" ${outOfHearts ? 'disabled' : ''}>
          ${window.LWIcons.markup('current', { size: 'sm' })}<span class="lw-icon-label">Start Mastery Quiz</span>
        </button>
      `}
      ${nextBtn}
    </div>
  `;

  const nextLocked = document.getElementById('mo-next-locked');
  if (nextLocked) nextLocked.addEventListener('click', () => window.LinguaWave?.triggerLockedFeedback?.(nextLocked));

  const quizBtn = document.getElementById('mo-start-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      if (usesNativeQuiz) {
        window.location.href = quizBtn.dataset.quizUrl;
        return;
      }
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
    el.innerHTML = `<p class="text-muted">No mission found for "${categoryId || ''}". <a href="learn.html">Back to all missions</a>.</p>`;
    return;
  }

  mission._index = allMissions.findIndex((m) => m.category === mission.category);

  const status = window.LWMissions.getMissionStatus(mission, allMissions);

  document.title = `${mission.title} | LinguaWave (preview)`;
  render(mission, status);
}

function initPage() {
  if (!window.LWMissions) {
    document.getElementById('mo-content').innerHTML =
      `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  renderMissionOverview();
  window.LWMissions.whenMissionsSyncReady().then(renderMissionOverview);

  document.getElementById('mo-content').addEventListener('click', (e) => {
    const chip = e.target.closest('.sign-chip--locked, .sign-chip--pending');
    if (!chip) return;
    e.preventDefault();
    window.LinguaWave?.triggerLockedFeedback?.(chip);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
