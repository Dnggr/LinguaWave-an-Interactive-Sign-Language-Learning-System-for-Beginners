'use strict';

const SAMPLE_CATEGORY_GROUPS = [
  'asl_foundations', 'introduce_yourself',
  'express_feelings', 'daily_actions', 'describing_things',
  'home_family', 'school_life', 'food_nature',
  'clothing_belongings', 'people_places_time', 'having_a_conversation',
];
const MAX_QUESTIONS = 12;
const AUTO_ADVANCE_DELAY_MS = 1500;

let quizAnswerStarted = false;

function getMissionParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mission');
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function mediaBlockHtml(sign) {
  if (!sign) {
    return `<div class="lesson-media lesson-media--missing">Sign data not found.</div>`;
  }
  const safeVideo = escapeHtml(sign.videoUrl || '');
  const safeImage = escapeHtml(sign.imageUrl || '');
  const safeTitle = escapeHtml(sign.title || sign.signId);
  return `
    <div class="lesson-media">
      <video class="lesson-media__video" autoplay muted loop playsinline
             onerror="var m=this.closest('.lesson-media'); if (!m) return; var v=m.querySelector('.lesson-media__video'); var f=m.querySelector('.lesson-media__fallback'); if (v) v.style.display='none'; if (f) f.style.display='flex';">
        <source src="${safeVideo}" type="video/mp4"
                onerror="var m=this.closest('.lesson-media'); if (!m) return; var v=m.querySelector('.lesson-media__video'); var f=m.querySelector('.lesson-media__fallback'); if (v) v.style.display='none'; if (f) f.style.display='flex';">
      </video>
      <div class="lesson-media__fallback">
        <img class="lesson-media__img" alt="${safeTitle}" src="${safeImage}"
             onerror="this.style.display='none'; this.parentElement.classList.add('lesson-media__fallback--text-only');">
        <p class="lesson-media__hint text-muted" data-video-path="${safeVideo || ''}">
          The video for this sign isn't available yet, so here's the sign name instead.
        </p>
      </div>
    </div>
  `;
}

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

function letterFor(i) {
  return String.fromCharCode(65 + i);
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

function heartsRowHtml(heartsState) {
  const hearts = Array.from({ length: heartsState.maxHearts }, (_, i) =>
    `<span class="heart ${i < heartsState.hearts ? 'heart--full' : 'heart--empty'}" aria-hidden="true">&#10084;</span>`
  ).join('');
  return `<span class="quiz-hearts-row" id="mq-hearts-row" title="${heartsState.hearts} of ${heartsState.maxHearts} Mastery Hearts remaining">${hearts}</span>`;
}

function uniqueSignIds(mission) {
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

function questionOptionCount(mission, signId) {
  const hasRamp = mission.items.some((it) => it.kind === 'PRACTICE' && it.signId === signId && !!it.difficultyRamp);
  return hasRamp ? 3 : 4;
}

let quizAttemptSeed = null;
function getQuizAttemptSeed() {
  if (quizAttemptSeed === null) {
    quizAttemptSeed = Math.random().toString(36).slice(2);
  }
  return quizAttemptSeed;
}

const quizOptionsCache = new Map();

function buildQuizQuestions(mission) {
  const allSignIds = uniqueSignIds(mission);
  const ordered = shuffleDeterministic(allSignIds, `${mission.id}_mastery_quiz_${getQuizAttemptSeed()}`);
  const picked = ordered.slice(0, Math.min(MAX_QUESTIONS, ordered.length));
  const categorySignIds = window.LWMissions.getCategorySigns(mission.level, mission.category);

  return picked.map((signId) => {
    const count = questionOptionCount(mission, signId);
    const cacheKey = `${mission.id}::${signId}`;
    let built = quizOptionsCache.get(cacheKey);
    if (!built) {
      built = (window.LWMissionsLoop && typeof window.LWMissionsLoop.buildRecognizeOptions === 'function')
        ? window.LWMissionsLoop.buildRecognizeOptions(mission.level, signId, categorySignIds, count, true)
        : { correct: signId, options: [signId] };
      quizOptionsCache.set(cacheKey, built);
    }
    return { signId, correct: built.correct, options: built.options.slice() };
  });
}


function configureBackLink(mission) {
  const link = document.getElementById('mq-back');
  const label = document.getElementById('mq-back-label');
  if (!link || !label) return;
  const from = new URLSearchParams(window.location.search).get('from');
  const category = encodeURIComponent(mission.category);
  if (from === 'lesson') {
    link.href = `lesson.html?mission=${category}`;
    label.textContent = 'Back to lesson';
  } else {
    link.href = `mission-overview.html?mission=${category}`;
    label.textContent = 'Back to mission overview';
  }
}


function renderNotFound() {
  document.getElementById('mq-content').innerHTML =
    `<p class="text-muted">No mission found for that link. <a href="learn.html">Back to all missions</a>.</p>`;
}

function renderNotSampledYet(mission) {
  document.getElementById('mq-content').innerHTML = `
    <div class="note-banner">
      This sample build of the Mastery Quiz now covers all 12 chapters. "${escapeHtml(mission.title)}"
      isn't part of it. This can happen with a stale link, a typed URL, or a category not yet added to
      SAMPLE_CATEGORY_GROUPS.
    </div>
    <div class="lesson-actions">
      <a href="mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">Back to Mission Overview</a>
    </div>
  `;
}

function renderOutOfHearts(mission, heartsState, opts) {
  const category = encodeURIComponent(mission.category);
  const canReview = window.LWMissions.canReviewMission(mission);
  const lessonHref = `lesson.html?mission=${category}${canReview ? '&review=1' : ''}`;
  if (opts && opts.justFailed) {
    document.querySelectorAll('#mq-options .lesson-option').forEach((btn) => { btn.disabled = true; });
    const heartsRow = document.getElementById('mq-hearts-row');
    if (heartsRow) heartsRow.outerHTML = heartsRowHtml(heartsState);
  } else {
    document.getElementById('mq-content').innerHTML = '';
    const backLink = document.getElementById('mq-back');
    if (backLink) backLink.hidden = true;
  }
  openOutOfHeartsDialog({
    heartsState,
    lessonHref,
    lessonLabel: canReview ? 'Review the mission' : 'Start the mission',
    overviewHref: `mission-overview.html?mission=${category}`,
    justFailed: !!(opts && opts.justFailed)
  });
}


let outOfHeartsTimerId = null;

function clearOutOfHeartsTimer() {
  if (outOfHeartsTimerId !== null) {
    clearInterval(outOfHeartsTimerId);
    outOfHeartsTimerId = null;
  }
}
window.addEventListener('pagehide', clearOutOfHeartsTimer);

function oohHeartSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21.2c-.3 0-.6-.1-.8-.3C7.3 17.9 2 13.6 2 8.9 2 6.2 4.1 4 6.8 4c1.9 0 3.7 1 5.2 2.9C13.5 5 15.3 4 17.2 4 19.9 4 22 6.2 22 8.9c0 4.7-5.3 9-9.2 12-.2.2-.5.3-.8.3z"/></svg>';
}

function oohHeartsHtml(maxHearts, justFailed) {
  return Array.from({ length: maxHearts }, (_, i) =>
    `<span class="ooh-heart${justFailed && i === 0 ? ' ooh-heart--breaking' : ''}" style="--i:${i}">${oohHeartSvg()}</span>`
  ).join('');
}

function openOutOfHeartsDialog(cfg) {
  const stale = document.getElementById('ooh-dialog');
  if (stale) stale.remove();
  clearOutOfHeartsTimer();

  const { heartsState, lessonHref, lessonLabel, overviewHref, justFailed } = cfg;
  const title = justFailed ? 'Nice try, but it wasn\u2019t right' : 'You\u2019re out of hearts';
  const msg = justFailed
    ? 'You\u2019re out of hearts, so the quiz has stopped here.'
    : 'Come back once a heart has refilled to take the Mastery Quiz.';

  const dialog = document.createElement('dialog');
  dialog.id = 'ooh-dialog';
  dialog.className = 'ooh-dialog';
  dialog.setAttribute('aria-labelledby', 'ooh-title');
  dialog.setAttribute('aria-describedby', 'ooh-msg');
  dialog.innerHTML = `
    <div class="ooh-dialog__body">
      <div class="ooh-hearts" aria-hidden="true">${oohHeartsHtml(heartsState.maxHearts, justFailed)}</div>
      <h2 class="ooh-dialog__title" id="ooh-title">${title}</h2>
      <p class="ooh-dialog__msg" id="ooh-msg">${msg}</p>
      <p class="ooh-dialog__timer" data-ooh-timer>Next heart in <strong data-ooh-countdown>${formatCountdown(heartsState.nextRefillAt)}</strong></p>
      <div class="ooh-dialog__actions" data-ooh-actions>
        <a href="${lessonHref}" class="btn btn--primary btn--lg" autofocus>${lessonLabel}</a>
        <a href="${overviewHref}" class="btn btn--secondary btn--lg">Back to Mission Overview</a>
      </div>
    </div>
  `;

  dialog.addEventListener('cancel', (e) => e.preventDefault());
  dialog.addEventListener('close', () => {
    if (dialog.isConnected && window.LWMissions.getHeartsState().hearts <= 0
        && typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    clearOutOfHeartsTimer();
    dialog.remove();
  });

  document.body.appendChild(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');

  outOfHeartsTimerId = setInterval(() => {
    if (!dialog.isConnected) { clearOutOfHeartsTimer(); return; }
    const now = window.LWMissions.getHeartsState();
    if (now.hearts > 0) {
      clearOutOfHeartsTimer();
      showHeartsBack(dialog, overviewHref);
      return;
    }
    const el = dialog.querySelector('[data-ooh-countdown]');
    if (el) el.textContent = formatCountdown(now.nextRefillAt);
  }, 15000);
}

function showHeartsBack(dialog, overviewHref) {
  const first = dialog.querySelector('.ooh-heart');
  if (first) first.className = 'ooh-heart ooh-heart--full';
  dialog.querySelector('#ooh-title').textContent = 'Your hearts are back!';
  dialog.querySelector('#ooh-msg').textContent = 'You can take the Mastery Quiz again.';
  const timer = dialog.querySelector('[data-ooh-timer]');
  if (timer) timer.hidden = true;
  const actions = dialog.querySelector('[data-ooh-actions]');
  actions.innerHTML = `
    <button type="button" class="btn btn--primary btn--lg" id="ooh-retry">Try again</button>
    <a href="${overviewHref}" class="btn btn--secondary btn--lg">Back to Mission Overview</a>
  `;
  const retry = actions.querySelector('#ooh-retry');
  retry.addEventListener('click', () => window.location.reload());
  retry.focus();
}


function renderQuestion(state) {
  const el = document.getElementById('mq-content');
  const q = state.questions[state.currentIndex];
  const sign = window.LWMissions.getSign(state.mission.level, q.signId);
  const heartsState = window.LWMissions.getHeartsState();
  const pct = Math.round((state.currentIndex / state.questions.length) * 100);

  el.innerHTML = `
    <div class="quiz-progress">
      <span>Question ${state.currentIndex + 1} of ${state.questions.length} &middot; ${escapeHtml(state.mission.title)}</span>
      ${heartsRowHtml(heartsState)}
    </div>
    <div class="progress-bar quiz-progress-bar"><div class="progress-bar__fill" style="--p:${pct}"></div></div>

    <div class="lesson-stage-label">Mastery Quiz</div>
    <h1 class="lesson-prompt">What does this sign mean?</h1>
    ${mediaBlockHtml(sign)}

    <div class="lesson-options" id="mq-options">
      ${q.options.map((id, i) => {
        const s = window.LWMissions.getSign(state.mission.level, id);
        return `<button type="button" class="lesson-option" data-value="${escapeHtml(id)}">
          <span class="quiz-option-letter">${letterFor(i)}</span>${escapeHtml((s && s.title) || id)}
        </button>`;
      }).join('')}
    </div>
    <div id="mq-feedback"></div>
  `;

  document.querySelectorAll('#mq-options .lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(state, btn.dataset.value));
  });
}

function handleAnswer(state, chosenSignId) {
  quizAnswerStarted = true;

  const q = state.questions[state.currentIndex];
  const correct = chosenSignId === q.correct;

  if (correct) {
    state.numCorrect += 1;
  } else {
    const heartsAfterMiss = window.LWMissions.consumeHeartForIncorrectAnswer();

    if (heartsAfterMiss.hearts <= 0) {
      renderOutOfHearts(state.mission, heartsAfterMiss, { justFailed: true });
      return;
    }

    const heartsRow = document.getElementById('mq-hearts-row');
    if (heartsRow) heartsRow.outerHTML = heartsRowHtml(heartsAfterMiss);
  }

  document.querySelectorAll('#mq-options .lesson-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.value === q.correct) btn.classList.add('lesson-option--correct');
    else if (btn.dataset.value === chosenSignId) btn.classList.add('lesson-option--incorrect');
  });

  const correctSign = window.LWMissions.getSign(state.mission.level, q.correct);
  const isLast = state.currentIndex === state.questions.length - 1;

  function advance() {
    if (isLast) {
      finishQuiz(state);
    } else {
      state.currentIndex += 1;
      renderQuestion(state);
    }
  }

  if (correct) {
    document.getElementById('mq-feedback').innerHTML = `
      <div class="lesson-feedback lesson-feedback--correct">${window.LWIcons.markup('complete', { size: 'sm', className: 'lw-icon--tone-success' })}<span class="lw-icon-label">Correct!</span></div>
    `;
    window.setTimeout(advance, AUTO_ADVANCE_DELAY_MS);
  } else {
    document.getElementById('mq-feedback').innerHTML = `
      <div class="lesson-feedback lesson-feedback--incorrect">
        Not quite. This sign means "${escapeHtml((correctSign && correctSign.title) || q.correct)}".
      </div>
      <div class="lesson-actions">
        <button type="button" class="btn btn--primary btn--lg" id="mq-continue">${isLast ? 'See results' : 'Continue'}</button>
      </div>
    `;
    document.getElementById('mq-continue').addEventListener('click', advance);
  }
}

function finishQuiz(state) {
  const scoreFraction = state.numCorrect / state.questions.length;

  window.LWMissions.markMissionComplete(state.mission);
  window.LWMissions.recordActivity('mastery_quiz');
  if (window.LWXP) window.LWXP.claimMission(state.mission);
  const recap = window.LWMissions.getRecap(state.mission);

  renderSummary(state, { scoreFraction, recap });
}

function renderSummary(state, result) {
  const el = document.getElementById('mq-content');
  const mission = state.mission;
  const pct = Math.round(result.scoreFraction * 100);

  const recapLine = result.recap.length
    ? `<p class="quiz-summary__recap">You've mastered all ${result.recap.length} sign${result.recap.length === 1 ? '' : 's'} in ${escapeHtml(mission.title)}.</p>`
    : '';

  el.innerHTML = `
    <div class="quiz-summary">
      <div class="quiz-summary__score quiz-summary__score--pass">${pct}%</div>
      <h1>${window.LWIcons.markup('celebration', { size: 'sm' })}<span class="lw-icon-label">Mission mastered!</span></h1>
      <p class="text-muted">${state.numCorrect} of ${state.questions.length} correct.</p>
      ${recapLine}
      <div class="lesson-actions quiz-summary__actions">
        <a href="learn.html" class="btn btn--primary btn--lg">Back to your missions</a>
        <a href="mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">Mission Overview</a>
      </div>
    </div>
  `;
}


function renderQuizEntry(mission) {
  const heartsState = window.LWMissions.getHeartsState();
  if (heartsState.hearts <= 0) {
    renderOutOfHearts(mission, heartsState);
    return;
  }

  const questions = buildQuizQuestions(mission);
  if (!questions.length) {
    document.getElementById('mq-content').innerHTML = `<p class="text-muted">No signs found to quiz for this mission.</p>`;
    return;
  }

  renderQuestion({ mission, questions, currentIndex: 0, numCorrect: 0 });
}

async function initPage() {
  const el = document.getElementById('mq-content');
  if (!window.LWMissions) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/missions.js loaded.</p>`;
    return;
  }

  const categoryId = getMissionParam();
  const mission = categoryId ? window.LWMissions.getMissionForCategory(categoryId) : null;
  if (!mission) {
    renderNotFound();
    return;
  }

  document.title = `Mastery Quiz: ${mission.title} | LinguaWave (preview)`;
  configureBackLink(mission);

  if (SAMPLE_CATEGORY_GROUPS.indexOf(mission.categoryGroup) === -1) {
    renderNotSampledYet(mission);
    return;
  }

  renderQuizEntry(mission);

  await window.LWMissions.whenMissionsSyncReady();
  if (!quizAnswerStarted) renderQuizEntry(mission);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
