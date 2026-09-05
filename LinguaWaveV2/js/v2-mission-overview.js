/**
 * js/v2-mission-overview.js — Renderer for pages/v2-mission-overview.html
 * ─────────────────────────────────────────────────────────────────
 * Same data source discipline as v2-dashboard.js/v2-learn.js: reads
 * only window.LWDataV2 (missions, progress, hearts) and window.LWData
 * (sign titles for the "You'll practice" chips). Nothing here touches
 * js/engine/progress.js's real progress store or pages/quiz.js.
 *
 * "Locked" uses the exact same position-based rule v2-learn.js's
 * statusFor() already uses (there is no real gating/hearts-based
 * unlock logic yet, guide §10–11) — re-derived here rather than
 * imported, since this file has no dependency on v2-learn.js.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

function getMissionParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mission');
}

function statusFor(mission, index, currentIndex) {
  const progress = window.LWDataV2.getMissionProgress(mission);
  if (progress >= 1) return 'done';
  if (index === currentIndex) return 'current';
  if (index < currentIndex) return 'available';
  return index === currentIndex + 1 ? 'available' : 'locked';
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
  const sign = (window.LWData && typeof window.LWData.getSign === 'function')
    ? window.LWData.getSign(mission.level, signId)
    : null;
  return (sign && sign.title) || signId;
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
    <svg class="v2-heart ${filled ? 'v2-heart--full' : 'v2-heart--empty'}" width="22" height="22" viewBox="0 0 24 24"
         fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
    </svg>
  `;
}

function renderHearts() {
  const state = window.LWDataV2.getHeartsState();
  const hearts = Array.from({ length: state.maxHearts }, (_, i) => heartIcon(i < state.hearts)).join('');
  const refillNote = state.hearts < state.maxHearts
    ? `<p class="v2-hearts__refill">Next heart in ${formatCountdown(state.nextRefillAt)}</p>`
    : '';
  return `
    <div class="v2-hearts">
      <div class="v2-hearts__row">${hearts}</div>
      <p class="v2-hearts__count">${state.hearts} of ${state.maxHearts} Mastery Quiz attempts available</p>
      ${refillNote}
    </div>
  `;
}

function render(mission, status) {
  const el = document.getElementById('v2-mo-content');
  const meta = statusMeta(status);
  const locked = status === 'locked';
  const chips = signsInMission(mission)
    .map((id) => `<span class="v2-sign-chip">${signTitle(mission, id)}</span>`)
    .join('');
  const lessonUrl = `../../pages/lesson.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  const quizUrl = `../../pages/quiz.html?level=${encodeURIComponent(mission.level)}&category=${encodeURIComponent(mission.category)}`;
  const pct = Math.round(window.LWDataV2.getMissionProgress(mission) * 100);
  const heartsState = window.LWDataV2.getHeartsState();
  const outOfHearts = heartsState.hearts <= 0;

  el.innerHTML = `
    <div class="v2-mo-header">
      <span class="v2-mo-header__num">Mission ${String(mission._index + 1).padStart(2, '0')}</span>
      <span class="badge ${meta.badge}">${meta.label}</span>
    </div>
    <h1>${mission.title}</h1>
    <p class="text-muted">${mission.goal}</p>

    ${!locked ? `
      <div class="v2-mo-progress">
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        <span class="v2-mo-progress__label">${pct}% complete</span>
      </div>
    ` : `
      <div class="v2-note-banner">This mission is locked — complete earlier missions first.</div>
    `}

    <h2 class="mt-6 mb-3">You'll practice</h2>
    <div class="v2-sign-chip-row">${chips || '<span class="text-muted">No signs found for this mission.</span>'}</div>

    <div class="v2-mo-facts">
      <div class="card v2-mo-fact">
        <p class="v2-mo-fact__label">Estimated effort</p>
        <p class="v2-mo-fact__value">~${estimateMinutes(mission)} min <span class="text-muted">(estimate)</span></p>
      </div>
      <div class="card v2-mo-fact">
        <p class="v2-mo-fact__label">Mastery requirement</p>
        <p class="v2-mo-fact__value">Score 80%+ on the Mastery Quiz</p>
      </div>
      <div class="card v2-mo-fact v2-mo-fact--hearts">
        <p class="v2-mo-fact__label">Mastery Hearts</p>
        ${renderHearts()}
      </div>
    </div>

    <div class="v2-mo-actions">
      ${locked ? '' : `<a href="${lessonUrl}" class="btn btn--primary btn--lg">▶ Start Mission</a>`}
      ${locked ? '' : `
        <button type="button" class="btn btn--secondary btn--lg" id="v2-mo-start-quiz"
                data-quiz-url="${quizUrl}" ${outOfHearts ? 'disabled' : ''}>
          🎯 Start Mastery Quiz
        </button>
      `}
      <button type="button" class="btn btn--ghost btn--lg" disabled title="Coming soon">
        Know some already? <span class="badge badge--dev">Coming soon</span>
      </button>
    </div>
  `;

  const quizBtn = document.getElementById('v2-mo-start-quiz');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => {
      // KNOWN LIMITATION (see js/data-v2.js file header + tracker §5
      // open question 7): this spends the heart on attempt START, not
      // on submit, because pages/quiz.js is still untouched.
      window.LWDataV2.consumeHeartForMastery();
      window.location.href = quizBtn.dataset.quizUrl;
    });
  }
}

function initPage() {
  const el = document.getElementById('v2-mo-content');
  if (!window.LWData || !window.LWDataV2) {
    el.innerHTML = `<p class="text-muted">Loading real content failed — check that js/data.js and js/data-v2.js both loaded.</p>`;
    return;
  }

  const categoryId = getMissionParam();
  const allMissions = window.LWDataV2.getAllMissions();
  const mission = categoryId ? window.LWDataV2.getMissionForCategory(categoryId) : null;

  if (!mission) {
    el.innerHTML = `<p class="text-muted">No mission found for "${categoryId || ''}" — <a href="v2-learn.html">back to all missions</a>.</p>`;
    return;
  }

  mission._index = allMissions.findIndex((m) => m.category === mission.category);

  const currentIndex = allMissions.findIndex((m) => window.LWDataV2.getMissionProgress(m) < 1);
  const effectiveCurrent = currentIndex === -1 ? allMissions.length - 1 : currentIndex;
  const status = statusFor(mission, mission._index, effectiveCurrent);

  document.title = `${mission.title} — LinguaWave V2 (preview)`;
  render(mission, status);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
