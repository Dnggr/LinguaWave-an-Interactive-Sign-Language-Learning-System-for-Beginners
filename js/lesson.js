'use strict';
console.info('[LinguaWave] lesson.js loaded: question fix 2026-10-02');

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

function shuffleOptions(arr) {
  const out = (arr || []).slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const YT_EMBED_RE = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{6,})(\?[^\s#]*)?$/i;
function youTubeEmbedSrc(url) {
  const m = YT_EMBED_RE.exec(String(url || '').trim());
  if (!m) return null;
  const u = new URL(String(url).trim());
  [['autoplay', '1'], ['mute', '1'], ['loop', '1'], ['playlist', m[3]], ['rel', '0'],
   ['playsinline', '1'], ['iv_load_policy', '3'], ['controls', '0']].forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

function mediaBlockHtml(sign) {
  if (!sign) {
    return `<div class="lesson-media lesson-media--missing">Sign data not found.</div>`;
  }
  const allUrls = (window.LWMissions && window.LWMissions.getSignVideoUrls)
    ? window.LWMissions.getSignVideoUrls(sign.signId, sign.videoUrl)
    : [sign.videoUrl].filter(Boolean);
  const ytSrc = youTubeEmbedSrc(allUrls[0]);
  if (ytSrc) {
    return `
    <div class="lesson-media">
      <iframe class="lesson-media__video" src="${escapeHtml(ytSrc)}" title="${escapeHtml(sign.title || sign.signId)}"
              allow="autoplay; encrypted-media" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
              style="border:0; width:100%; aspect-ratio:16/9;"></iframe>
    </div>`;
  }
  const urls = allUrls.filter((u) => !youTubeEmbedSrc(u));
  const safeVideo = escapeHtml(urls[0] || '');
  const safeImage = escapeHtml(sign.imageUrl || '');
  const safeTitle = escapeHtml(sign.title || sign.signId);

  const showFallback = `var m=this.closest('.lesson-media'); if (!m) return; var v=m.querySelector('.lesson-media__video'); var f=m.querySelector('.lesson-media__fallback'); if (v) v.style.display='none'; if (f) f.style.display='flex';`;
  const onErr = `if (this.nextElementSibling) return; ${showFallback}`;
  const sources = (urls.length ? urls : ['']).map((u) =>
    `<source src="${escapeHtml(u)}" type="video/mp4" onerror="${onErr}">`).join('');
  return `
    <div class="lesson-media">
      <video class="lesson-media__video" autoplay muted loop playsinline onerror="${showFallback}">
        ${sources}

      </video>
      <div class="lesson-media__fallback">
        <img class="lesson-media__img" alt="${safeTitle}" src="${safeImage}"
             onerror="this.style.display='none'; this.parentElement.classList.add('lesson-media__fallback--text-only');">
        <p class="lesson-media__hint text-muted" data-video-path="${safeVideo}">
          The video for this sign isn't available yet, so here's the written description instead.
        </p>
      </div>
    </div>
  `;
}

function twinMediaHtml(mission, item, plan, sign, withCaption = true) {
  const twinId = plan && plan.duplicateOf;
  const twin = twinId ? window.LWMissions.getSign(mission.level, twinId, mission.category) : null;
  const shown = twin || sign;
  if (!shown) return '';
  const own = (sign && sign.title) || item.signId;
  const caption = (twin && withCaption)
    ? `<p class="lesson-media__caption text-muted">This is the sign for both ${escapeHtml(twin.title || twinId)} and ${escapeHtml(own)}.</p>`
    : '';
  return mediaBlockHtml(shown) + caption;
}

function descriptionHtml(sign) {
  if (!sign) return '';
  const tips = (sign.tips || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `
    <p class="lesson-desc">${escapeHtml(sign.description || '')}</p>
    ${tips ? `<ul class="lesson-tips">${tips}</ul>` : ''}
  `;
}

function cameraPracticeLinkHtml(mission, signId) {
  const url = `camera-practice.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}${signId ? `&sign=${encodeURIComponent(signId)}` : ''}`;
  return `
    <a class="lesson-camera-link" href="${url}">
      ${window.LWIcons.markup('camera', { size: 'sm' })}<span class="lw-icon-label">Practice with your camera</span>
    </a>
  `;
}


function advanceAfterAnswer(container, correct, onDone, delay = 1100) {
  if (correct) {
    setTimeout(onDone, delay);
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'lesson-actions';
  wrap.innerHTML = `<button type="button" class="btn btn--primary btn--lg" id="lesson-answer-continue">Continue</button>`;
  container.appendChild(wrap);
  document.getElementById('lesson-answer-continue').addEventListener('click', () => {
    wrap.remove();
    onDone();
  }, { once: true });
}

function renderLessonWatch(mission, index, item, plan, ctx) {
  const sign = window.LWMissions.getSign(mission.level, item.signId, mission.category);
  const el = document.getElementById('lesson-content');
  el.innerHTML = `
    <div class="lesson-stage-label">Watch &amp; Learn</div>
    <h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>
    ${mediaBlockHtml(sign)}
    ${descriptionHtml(sign)}
    ${sign && sign.detectionType === 'none' ? '' : cameraPracticeLinkHtml(mission, item.signId)}
    <div class="lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="lesson-continue">Got it, continue</button>
    </div>
  `;
  document.getElementById('lesson-continue').addEventListener('click', () => {
    celebrateInline(`You just learned "${(sign && sign.title) || item.signId}"!`);
    completeAndAdvance(mission, index, item);
  });
}

function renderLessonLighter(mission, index, item, plan, ctx) {
  const sign = window.LWMissions.getSign(mission.level, item.signId, mission.category);
  const el = document.getElementById('lesson-content');
  const reg = plan.registerPrompt;
  el.innerHTML = `
    <div class="lesson-stage-label">Already in your hands</div>
    <h1>${escapeHtml((sign && sign.title) || item.signId)}</h1>
    <div class="lesson-callout">
      <strong>You already know this sign.</strong> ${escapeHtml(plan.reason)}.
    </div>
    ${twinMediaHtml(mission, item, plan, sign)}
    ${reg ? `<p class="lesson-desc">${escapeHtml(reg.note)}</p>` : ''}
    <div class="lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="lesson-continue">Continue</button>
    </div>
  `;
  document.getElementById('lesson-continue').addEventListener('click', () => {
    completeAndAdvance(mission, index, item);
  });
}

function renderRecognizeQuestion(container, mission, index, item, sign, opts, onDone, promptText = 'Which word is this?') {
  container.innerHTML += `
    ${promptText ? `<p class="lesson-prompt">${escapeHtml(promptText)}</p>` : ''}
    ${mediaBlockHtml(sign)}
    <div class="lesson-options" id="lesson-recognize-options">
      ${shuffleOptions(opts.options).map((id) => {
        const s = window.LWMissions.getSign(mission.level, id, mission.category);
        return `<button type="button" class="lesson-option" data-value="${escapeHtml(id)}">${escapeHtml((s && s.title) || id)}</button>`;
      }).join('')}
    </div>
    <p class="lesson-feedback" id="lesson-feedback" hidden></p>
  `;
  const feedback = container.querySelector('#lesson-feedback');
  container.querySelectorAll('#lesson-recognize-options .lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      container.querySelectorAll('#lesson-recognize-options .lesson-option').forEach((b) => { b.disabled = true; });
      const correct = btn.dataset.value === opts.correct;
      btn.classList.add(correct ? 'lesson-option--correct' : 'lesson-option--incorrect');
      feedback.hidden = false;
      window.LWIcons.setLabel(feedback, correct ? 'complete' : 'error',
        correct ? 'Correct!' : `Not quite, that was "${(sign && sign.title) || item.signId}".`, { size: 'sm' });
      feedback.className = 'lesson-feedback ' + (correct ? 'lesson-feedback--correct' : 'lesson-feedback--incorrect');
      advanceAfterAnswer(container, correct, onDone, 1100);
    });
  });
}

function renderBoosterRecognize(mission, index, item, plan) {
  const sign = window.LWMissions.getSign(mission.level, item.signId, mission.category);
  const el = document.getElementById('lesson-content');
  el.innerHTML = `<div class="lesson-stage-label">Quick Check</div><h1>What does this sign mean?</h1>`;
  renderRecognizeQuestion(el, mission, index, item, sign, plan.options, () => completeAndAdvance(mission, index, item), null);
}

function renderBoosterRegister(mission, index, item, plan) {
  const sign = window.LWMissions.getSign(mission.level, item.signId, mission.category);
  const reg = plan.registerPrompt;
  const el = document.getElementById('lesson-content');
  el.innerHTML = `
    <div class="lesson-stage-label">Quick Check</div>
    <h1>One sign, two words</h1>
    ${twinMediaHtml(mission, item, plan, sign, false)}
    <p class="lesson-prompt">${escapeHtml(reg.prompt)}</p>
    <div class="lesson-options" id="lesson-register-options">
      ${shuffleOptions(reg.options).map((opt) => `<button type="button" class="lesson-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
    </div>
    <p class="lesson-feedback" id="lesson-feedback" hidden></p>
  `;
  const feedback = document.getElementById('lesson-feedback');
  document.querySelectorAll('#lesson-register-options .lesson-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('#lesson-register-options .lesson-option').forEach((b) => { b.disabled = true; });
      const correct = btn.dataset.value === reg.answer;
      btn.classList.add(correct ? 'lesson-option--correct' : 'lesson-option--incorrect');
      feedback.hidden = false;
      window.LWIcons.setLabel(feedback, correct ? 'complete' : 'error',
        (correct ? 'Right! ' : `Not quite, this sign is also used for "${reg.answer}". `) + reg.note, { size: 'sm' });
      feedback.className = 'lesson-feedback ' + (correct ? 'lesson-feedback--correct' : 'lesson-feedback--incorrect');
      advanceAfterAnswer(el, correct, () => completeAndAdvance(mission, index, item), 1400);
    });
  });
}

function renderPracticeScenario(mission, index, item, plan) {
  const sign = window.LWMissions.getSign(mission.level, item.signId, mission.category);
  const el = document.getElementById('lesson-content');

  const showScenarioTitle = !!plan.discriminatePair;
  el.innerHTML = `
    <div class="lesson-stage-label">Practice</div>
    <h1>${escapeHtml(showScenarioTitle ? (item.scenarioTitle || 'Practice') : 'Which word is this?')}</h1>
  `;

  if (plan.discriminatePair) {
    const targetSign = window.LWMissions.getSign(mission.level, plan.discriminatePair.targetSignId, mission.category);
    const neighborSign = window.LWMissions.getSign(mission.level, plan.discriminatePair.neighborSignId, mission.category);
    const pairs = Math.random() < 0.5
      ? [{ sign: targetSign, correct: true }, { sign: neighborSign, correct: false }]
      : [{ sign: neighborSign, correct: false }, { sign: targetSign, correct: true }];
    el.innerHTML += `
      <p class="lesson-prompt">Which one shows "${escapeHtml((targetSign && targetSign.title) || item.signId)}"?</p>
      <div class="lesson-pair" id="lesson-pair">
        ${pairs.map((p, i) => `
          <button type="button" class="lesson-pair__card" data-correct="${p.correct}" data-index="${i}">
            ${mediaBlockHtml(p.sign)}
            <span class="lesson-pair__label">Option ${i === 0 ? 'A' : 'B'}</span>
          </button>
        `).join('')}
      </div>
      <p class="lesson-feedback" id="lesson-feedback" hidden></p>
    `;
    const feedback = document.getElementById('lesson-feedback');
    document.querySelectorAll('#lesson-pair .lesson-pair__card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('#lesson-pair .lesson-pair__card').forEach((b) => { b.disabled = true; });
        const correct = btn.dataset.correct === 'true';
        btn.classList.add(correct ? 'lesson-option--correct' : 'lesson-option--incorrect');
        feedback.hidden = false;
        window.LWIcons.setLabel(feedback, correct ? 'complete' : 'error',
          correct ? 'Correct!' : 'Not quite, take another look next time you see these two.', { size: 'sm' });
        feedback.className = 'lesson-feedback ' + (correct ? 'lesson-feedback--correct' : 'lesson-feedback--incorrect');
        advanceAfterAnswer(el, correct, () => showContextStep(mission, index, item, plan), 1100);
      });
    });
  } else if (plan.recognizeOptions) {
    renderRecognizeQuestion(el, mission, index, item, sign, plan.recognizeOptions, () => showContextStep(mission, index, item, plan), null);
  } else {
    showContextStep(mission, index, item, plan);
  }
}

function showContextStep(mission, index, item, plan) {
  const el = document.getElementById('lesson-content');
  const wrap = document.createElement('div');
  wrap.className = 'lesson-context';
  wrap.innerHTML = `
    <p class="lesson-stage-label">Try it yourself</p>
    <p class="lesson-prompt">${escapeHtml(plan.contextPrompt || '')}</p>
    <p class="text-muted">This step isn\u2019t graded. Sign it with your hands, then continue when you\u2019re ready.</p>
    <div class="lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="lesson-continue">Continue</button>
    </div>
  `;
  el.appendChild(wrap);
  wrap.scrollIntoView({ behavior: (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || document.documentElement?.classList?.contains('lw-force-reduced-motion')) ? 'auto' : 'smooth', block: 'end' });
  document.getElementById('lesson-continue').addEventListener('click', () => {
    completeAndAdvance(mission, index, item);
  });
}

function renderQuizHandoff(mission) {
  const el = document.getElementById('lesson-content');
  const recap = window.LWMissions.getRecap(mission);
  const heartsState = window.LWMissions.getHeartsState();
  const outOfHearts = heartsState.hearts <= 0;
  const usesNativeQuiz = SAMPLE_MASTERY_QUIZ_CHAPTERS.indexOf(mission.categoryGroup) !== -1;
  const quizUrl = `mastery-quiz.html?mission=${encodeURIComponent(mission.category)}&from=lesson`;
  const reviewHint = window.LWMissions.canReviewMission(mission)
    ? ' Want a refresher first? Use the arrow buttons above (or your arrow keys) to look back through the mission.'
    : '';

  el.innerHTML = `
    <div class="lesson-stage-label">Mission recap</div>
    <h1>Nice work: here's what you can do now</h1>
    <ul class="lesson-recap">
      ${recap.length ? recap.map((line) => `<li>${window.LWIcons.markup('complete', { size: 'status', className: 'lw-icon--tone-success' })}<span class="lw-icon-label">${escapeHtml(line)}</span></li>`).join('') : '<li class="text-muted">Complete a few more items to build your recap.</li>'}
    </ul>
    <p class="text-muted">One more step: finish the Mastery Quiz to complete this mission.${reviewHint}</p>
    <div class="lesson-actions">
      <button type="button" class="btn btn--primary btn--lg" id="lesson-start-quiz" ${outOfHearts ? 'disabled' : ''}>
        ${window.LWIcons.markup('current', { size: 'sm' })}<span class="lw-icon-label">Start Mastery Quiz</span>
      </button>
      <a href="mission-overview.html?mission=${encodeURIComponent(mission.category)}" class="btn btn--secondary btn--lg">
        Back to Mission Overview
      </a>
    </div>
    ${outOfHearts ? '<p class="lesson-callout">Out of Mastery Quiz hearts for now. Check Mission Overview for the refill countdown.</p>' : ''}
  `;
  const quizBtn = document.getElementById('lesson-start-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      if (usesNativeQuiz) {
        window.location.href = quizUrl;
        return;
      }
      window.LWMissions.consumeHeartForMastery();
      window.location.href = quizUrl;
    });
  }
}

function renderUnknown(mission, index, item) {
  const el = document.getElementById('lesson-content');
  el.innerHTML = `
    <p class="text-muted">This item type isn't recognized yet (${escapeHtml(item.kind)}).</p>
    <div class="lesson-actions">
      <button type="button" class="btn btn--secondary btn--lg" id="lesson-continue">Skip</button>
    </div>
  `;
  document.getElementById('lesson-continue').addEventListener('click', () => completeAndAdvance(mission, index, item));
}

function renderMissionIntro(mission, startIndex) {
  const isReviewMode = window.LWMissions.canReviewMission(mission);
  updateTrack(mission, -1, isReviewMode);
  updateReviewNav(mission, -1, isReviewMode);

  const el = document.getElementById('lesson-content');
  const introMoment = mission.introMoment || {};
  el.innerHTML = `
    <div class="lesson-intro">
      <div class="lesson-intro__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 11.5V6a2 2 0 0 0-4 0v5.5"/>
          <path d="M14 10.5V4a2 2 0 0 0-4 0v6.5"/>
          <path d="M10 10.5V6a2 2 0 0 0-4 0v9"/>
          <path d="M6 12.5v-2a2 2 0 0 0-4 0v3.5a8 8 0 0 0 8 8h1.5c2.7 0 4.3-.8 5.8-2.6l3.1-3.7a1.7 1.7 0 0 0-2.4-2.4L15 15.5"/>
        </svg>
      </div>
      <div class="lesson-stage-label">Mission intro</div>
      <h1>${escapeHtml(mission.title)}</h1>
      <p class="lesson-intro__goal">${escapeHtml(mission.goal || '')}</p>
      <div class="lesson-callout lesson-intro__pitch">
        <strong>Where you'll use it:</strong> ${escapeHtml(introMoment.pitch || '')}
      </div>
      <div class="lesson-actions">
        <button type="button" class="btn btn--primary btn--lg" id="lesson-intro-continue">Continue</button>
      </div>
    </div>
  `;
  document.getElementById('lesson-intro-continue').addEventListener('click', () => {
    renderItem(mission, startIndex);
  });
}

function celebrateInline(message) {
  const el = document.getElementById('lesson-content');
  const toast = document.createElement('div');
  toast.className = 'lesson-toast';
  toast.textContent = message;
  el.appendChild(toast);
}


function updateTrack(mission, index, isReviewMode) {
  const total = mission.items.length;
  const displayTotal = total + 1;
  const displayPos = Math.min(index + 2, displayTotal);
  const dotPct = Math.round((displayPos / displayTotal) * 100);
  const fillPct = isReviewMode ? 100 : dotPct;
  document.getElementById('lesson-track-fill').style.setProperty('--p', String(fillPct));
  const dot = document.getElementById('lesson-track-dot');
  if (dot) dot.style.setProperty('--p', String(dotPct));
  document.getElementById('lesson-track-label').textContent = `Item ${displayPos} of ${displayTotal}`;
}

function renderItem(mission, index) {
  if (index >= mission.items.length) {
    index = mission.items.length - 1;
  }
  const isReviewMode = window.LWMissions.canReviewMission(mission);
  updateTrack(mission, index, isReviewMode);
  updateReviewNav(mission, index, isReviewMode);
  const item = mission.items[index];
  const plan = window.LWMissionsLoop.planForItem(mission, index, item);

  switch (plan.render) {
    case 'lesson-watch': return renderLessonWatch(mission, index, item, plan);
    case 'lesson-lighter': return renderLessonLighter(mission, index, item, plan);
    case 'booster-recognize': return renderBoosterRecognize(mission, index, item, plan);
    case 'booster-register': return renderBoosterRegister(mission, index, item, plan);
    case 'practice-scenario': return renderPracticeScenario(mission, index, item, plan);
    case 'quiz-handoff': return renderQuizHandoff(mission);
    default: return renderUnknown(mission, index, item);
  }
}

function streakTypeForItem(item, wasComplete) {
  if (!item) return null;
  if (item.kind === 'LESSON') return wasComplete ? null : 'lesson';
  if (item.kind === 'BOOSTER') return wasComplete ? 'review' : 'recall';
  if (item.kind === 'PRACTICE') return wasComplete ? 'review' : 'practice';
  return null;
}

function completeAndAdvance(mission, index, item) {
  const wasComplete = window.LWMissions.isItemComplete(mission, index, item);
  window.LWMissions.markItemComplete(mission, index, item);
  const streakType = streakTypeForItem(item, wasComplete);
  if (streakType) window.LWMissions.recordActivity(streakType);
  if (window.LWXP) window.LWXP.claimItem(mission, index);
  const next = index + 1;
  if (next < mission.items.length) {
    renderItem(mission, next);
  } else {
    renderItem(mission, index);
  }
}

function renderSlide(mission, index) {
  if (index < 0) {
    renderMissionIntro(mission, 0);
  } else {
    renderItem(mission, index);
  }
}

function updateReviewNav(mission, index, isReviewMode) {
  const bar = document.getElementById('lesson-review-nav');
  if (!bar) return;
  if (!isReviewMode) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const label = bar.querySelector('.lesson-review-nav__label');
  if (label) {
    label.textContent = window.LWMissions.getMissionProgress(mission) >= 1
      ? 'Reviewing a completed mission'
      : 'Reviewing before the Mastery Quiz';
  }
  const prevBtn = document.getElementById('lesson-nav-prev');
  const nextBtn = document.getElementById('lesson-nav-next');
  if (prevBtn) {
    prevBtn.disabled = index <= -1;
    prevBtn.onclick = () => renderSlide(mission, index - 1);
  }
  if (nextBtn) {
    nextBtn.disabled = index >= mission.items.length - 1;
    nextBtn.onclick = () => renderSlide(mission, index + 1);
  }
}

function wantsReviewFromStart() {
  return new URLSearchParams(window.location.search).get('review') === '1';
}

function computeResumeIndex(mission) {
  const isMissionComplete = window.LWMissions.getMissionProgress(mission) >= 1;
  const startAtBeginning = isMissionComplete
    || (wantsReviewFromStart() && window.LWMissions.canReviewMission(mission));
  let startIndex = startAtBeginning ? 0 : window.LWMissions.getDropOffIndex(mission);
  if (startIndex >= mission.items.length) startIndex = mission.items.length - 1;
  return startIndex;
}

function resumeViewKey(mission) {
  return `${computeResumeIndex(mission)}|${window.LWMissions.canReviewMission(mission)}`;
}

function renderResumePoint(mission) {
  const startIndex = computeResumeIndex(mission);
  if (startIndex === 0) {
    renderMissionIntro(mission, startIndex);
  } else {
    renderItem(mission, startIndex);
  }
}

async function initPage() {
  const el = document.getElementById('lesson-content');
  if (!window.LWMissions || !window.LWMissionsLoop) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/missions.js and js/lesson-loop.js both loaded.</p>`;
    return;
  }

  const categoryId = getMissionParam();
  const mission = categoryId ? window.LWMissions.getMissionForCategory(categoryId) : null;

  if (!mission || !mission.items.length) {
    el.innerHTML = `<p class="text-muted">No lesson found for "${escapeHtml(categoryId || '')}". <a href="learn.html">Back to all missions</a>.</p>`;
    return;
  }

  document.getElementById('lesson-exit').href = `mission-overview.html?mission=${encodeURIComponent(mission.category)}`;
  document.title = `${mission.title} | LinguaWave (preview)`;

  const renderedKey = resumeViewKey(mission);
  renderResumePoint(mission);

  await window.LWMissions.whenMissionsSyncReady();
  if (resumeViewKey(mission) !== renderedKey) {
    renderResumePoint(mission);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const bar = document.getElementById('lesson-review-nav');
  if (!bar || bar.hidden) return;
  const btn = document.getElementById(e.key === 'ArrowLeft' ? 'lesson-nav-prev' : 'lesson-nav-next');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  btn.click();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
