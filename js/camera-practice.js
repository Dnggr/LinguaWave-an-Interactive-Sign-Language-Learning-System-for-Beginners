
import { startCamera, stopCamera }             from './camera/cameraUtils.js';
import { initMediaPipe, processFrame, isModelReady, getModelError,
         setDetectionInterval } from './tracking/mediapipe.js';
import { drawSkeleton, clearCanvas }           from './engine/renderer.js';
import { getDetectionType }                    from './engine/dictionary.js';
import { loadTrainedLabelSets, getSignTrainingStatus,
         getSequenceTrainingStatus }              from './engine/training-status.js';
import { classifyGesture, classifyMotion, resetMotionBuffer,
         isMotionModelReady, getMotionModelError, loadModels,
         getMotionBufferStatus, finalizeMotionWindow,
         getAllowedLabelsForSign }                      from './engine/classifier.js';


const videoEl         = document.getElementById('lw-webcam');
const canvasEl        = document.getElementById('lw-canvas');
const ctx             = canvasEl?.getContext('2d');
const statusEl        = document.getElementById('camera-status');
const handStatusEl    = document.getElementById('hand-status-pill');
const detectedEl      = document.getElementById('detected-sign');
const confidenceEl    = document.getElementById('confidence-bar-fill');
const confTextEl      = document.getElementById('confidence-text');
const modeBarEl       = document.getElementById('mode-bar');
const startBtnEl      = document.getElementById('btn-start-assessment');
const promptEl        = document.getElementById('assessment-prompt');
const promptBoxEl     = document.getElementById('assessment-prompt-box');
const feedbackEl      = document.getElementById('assessment-feedback');
const scoreEl         = document.getElementById('score-display');
const overlayEl       = document.getElementById('completion-overlay');
const finalScoreEl    = document.getElementById('final-score');
const finalAttemptsEl = document.getElementById('final-attempts');
const motionBufEl     = document.getElementById('motion-buffer-bar');
const motionBufWrapEl = document.getElementById('motion-buffer-wrap');
const missedListEl    = document.getElementById('missed-signs-review');

const motionStatusLabelEl = document.getElementById('motion-status-label');
const btnTryPracticeEl    = document.getElementById('btn-try-practice');
const detectionLogListEl = document.getElementById('detection-log-list');
const btnClearLogEl      = document.getElementById('btn-clear-log');

let classifierWarnEl  = null;
let faceWarnEl        = null;
let modelDownloading = false;

const FEEDBACK_ICONS = {
  success:    'success',
  error:      'error',
  confirming: 'info',
  info:       'info',
  warning:    'warning',
};

const lessonDescriptionEl = document.getElementById('lesson-description');
const lessonTipsEl        = document.getElementById('lesson-tips');
const lessonVideoEl       = document.getElementById('lesson-video');
let   lessonEmbedEl       = document.getElementById('lesson-video-embed');
const lessonShieldEl      = document.getElementById('lesson-video-shield');
const lessonSubtitleEl    = document.getElementById('lesson-subtitle');

const YT_EMBED_RE = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]{6,}(\?[^\s#]*)?$/i;

function isYouTubeEmbedUrl(url) {
  return typeof url === 'string' && YT_EMBED_RE.test(url.trim());
}

const YT_PLAYER_PARAMS = { autoplay: '1', mute: '1', loop: '1', rel: '0', playsinline: '1', iv_load_policy: '3' };

function buildYouTubeSrc(videoUrl, { controls }) {
  const u  = new URL(videoUrl.trim());
  const id = u.pathname.split('/').pop();
  Object.entries(YT_PLAYER_PARAMS).forEach(([k, v]) => u.searchParams.set(k, v));
  if (id !== 'videoseries') u.searchParams.set('playlist', id);
  u.searchParams.set('controls', controls ? '1' : '0');
  return u.toString();
}

let currentEmbedUrl = '';

function revealEmbedControls() {
  if (!lessonEmbedEl || !currentEmbedUrl) return;
  if (lessonShieldEl && lessonShieldEl.hidden) return;
  const fresh = lessonEmbedEl.cloneNode(false);
  fresh.src = buildYouTubeSrc(currentEmbedUrl, { controls: true });
  lessonEmbedEl.replaceWith(fresh);
  lessonEmbedEl = fresh;
  if (lessonShieldEl) lessonShieldEl.hidden = true;
}
if (lessonShieldEl) lessonShieldEl.addEventListener('click', revealEmbedControls);

let lessonVideoErrWired = false;
function setLessonVideoError(failed) {
  if (!lessonVideoEl) return;
  let note = document.getElementById('lesson-video-error');
  if (failed) {
    lessonVideoEl.hidden = true;
    if (!note) {
      note = document.createElement('p');
      note.id = 'lesson-video-error';
      note.className = 'alert alert--error mt-4';
      note.setAttribute('role', 'status');
      note.textContent = "This sign's video couldn't be loaded. Check your connection and try again, or follow the written steps below.";
      const wrap = lessonVideoEl.closest('.lesson-video') || lessonVideoEl.parentElement;
      wrap.insertAdjacentElement('afterend', note);
    }
    note.hidden = false;
  } else if (note) {
    note.hidden = true;
  }
}
function wireLessonVideoErrors() {
  if (lessonVideoErrWired || !lessonVideoEl) return;
  lessonVideoErrWired = true;
  lessonVideoEl.addEventListener('error', () => setLessonVideoError(true));
  const source = lessonVideoEl.querySelector('source');
  if (source) source.addEventListener('error', () => setLessonVideoError(true));
}

function applyLessonVideo(videoUrl) {
  const url = typeof videoUrl === 'string' ? videoUrl.trim() : '';
  setLessonVideoError(false);
  wireLessonVideoErrors();

  if (lessonEmbedEl && isYouTubeEmbedUrl(url)) {
    if (lessonVideoEl) { lessonVideoEl.pause(); lessonVideoEl.hidden = true; }
    currentEmbedUrl = url;
    lessonEmbedEl.src = buildYouTubeSrc(url, { controls: false });
    lessonEmbedEl.hidden = false;
    if (lessonShieldEl) lessonShieldEl.hidden = false;
    return;
  }

  currentEmbedUrl = '';
  if (lessonEmbedEl)  { lessonEmbedEl.src = 'about:blank'; lessonEmbedEl.hidden = true; }
  if (lessonShieldEl) lessonShieldEl.hidden = true;
  if (lessonVideoEl) {
    lessonVideoEl.hidden = false;
    const source = lessonVideoEl.querySelector('source');
    if (source && url) source.src = url;
    lessonVideoEl.load();
    const p = lessonVideoEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
}

const params     = new URLSearchParams(window.location.search);
const level      = params.get('level') || 'basic';
const category   = params.get('category') || defaultCategoryFor(level);

function defaultCategoryFor(lvl) {
  if (lvl === 'basic') return 'alphabet';
  const cats = window.LWMissions?.getCategoriesForLevel?.(lvl) ?? [];
  const firstLive = cats.find(c => !c.comingSoon);
  return firstLive ? firstLive.id : (cats[0]?.id ?? 'general');
}

const isNameDrill = category === 'fingerspell_name';

const MAX_NAME_DRILL_LETTERS = 24;

function getLearnerNameLetters() {
  const user = window.LWAuth?.getCurrentUser?.();
  const raw  = (user?.name || '').toUpperCase();
  return raw.replace(/[^A-Z]/g, '').split('').slice(0, MAX_NAME_DRILL_LETTERS);
}

const FALLBACK_ALPHABET_ORDER = 'ABCDEFGHIKLMNOPQRSTUVWXYJZ'.split('');

function computeSignOrder() {
  if (isNameDrill) return ['MY_NAME'];
  const fromData = window.LWMissions?.getCategorySigns?.(level, category) ?? [];
  if (fromData.length > 0) return fromData;
  if (category === 'alphabet') return FALLBACK_ALPHABET_ORDER;
  return [];
}

const signOrder  = computeSignOrder();
const requestedSign = params.get('sign');
const sign       = (requestedSign || signOrder[0] || '').toUpperCase();
const signIdx    = Math.max(signOrder.indexOf(sign), 0);
const totalSigns = signOrder.length;

const isCategoryAssessment = false;

const PASS_THRESHOLD  = 0.80;
const PROMPT_TIMEOUT   = 15000;
const GETREADY_DELAY   = 2500;
const NEXT_SIGN_DELAY  = 2200;

let mode           = 'practice';
let quizSigns      = [];
let quizIdx        = 0;
let score          = 0;
let missedSigns    = [];
let attemptCount   = 0;
let promptTimer    = null;
let getReadyTimer  = null;
let rafId          = null;

const TRY_MIN_MS = 2000;
const TRY_MAX_MS = 10000;
const TRY_GAP_MS = 1000;
let attemptTrackingReady  = false;
let settledAssessmentKey  = null;
let staticTry             = null;
let signNeedsExplicitStart = null;

function tipsKey(signId) { return `${level}/${category}/${signId}`; }

function tipsCanCount(signId) {
  if (!attemptTrackingReady || document.hidden) return false;
  if (window.LWCameraTips?.isSuppressed?.()) return false;
  if (getDetectionType(signId) === 'motion' && !isMotionModelReady()) return false;
  return true;
}

function reportFailedAttempt(signId) {
  if (!tipsCanCount(signId)) return;
  window.LWCameraTips?.recordFailure?.(tipsKey(signId));
}

function reportPassedAttempt(signId) {
  window.LWCameraTips?.recordSuccess?.(tipsKey(signId));
}

function settleAssessmentAttempt(signId, passed) {
  const key = `${attemptCount}:${quizIdx}`;
  if (settledAssessmentKey === key) return;
  settledAssessmentKey = key;
  if (passed) reportPassedAttempt(signId); else reportFailedAttempt(signId);
}

function notePracticeSuccess() {
  if (staticTry) staticTry.settled = true;
  reportPassedAttempt(sign);
}

function noteMotionPracticeOutcome(result) {
  if (mode !== 'practice') return;
  if (result && result.matched && result.label === getActiveSignId()) {
    reportPassedAttempt(sign);
    return;
  }
  if (!tipsCanCount(getActiveSignId())) return;
  reportFailedAttempt(sign);
}

function trackStaticTry(now, handPresent) {
  if (signNeedsExplicitStart === null && window.LWMissions) signNeedsExplicitStart = needsExplicitStart(sign);
  const applies = mode === 'practice' && signNeedsExplicitStart === false && tipsCanCount(sign);
  if (!applies) { staticTry = null; return; }

  if (handPresent) {
    if (!staticTry) { staticTry = { startedAt: now, lastSeenAt: now, settled: false }; return; }
    staticTry.lastSeenAt = now;
    if (!staticTry.settled && now - staticTry.startedAt >= TRY_MAX_MS) {
      staticTry.settled = true;
      reportFailedAttempt(sign);
    }
    return;
  }
  if (staticTry && now - staticTry.lastSeenAt >= TRY_GAP_MS) {
    const t = staticTry;
    staticTry = null;
    if (!t.settled && t.lastSeenAt - t.startedAt >= TRY_MIN_MS) reportFailedAttempt(sign);
  }
}

const DEBOUNCE_FRAMES = 45;
let debounceCount  = 0;
let lastDetected   = null;
let cooldown       = false;

let motionArmed    = false;

const MOTION_COUNTDOWN_STEPS   = ['3', '2', '1', 'GO!'];
const MOTION_COUNTDOWN_STEP_MS = 450;
let motionCountdownTimer = null;

const DETECT_RATE_ACTIVE_MS = 50;
const DETECT_RATE_IDLE_MS   = 150;

function setMotionDetectionRate(active) {
  setDetectionInterval(active ? DETECT_RATE_ACTIVE_MS : DETECT_RATE_IDLE_MS);
}


const HAND_LOST_GRACE_MS = 1200;
let handLostSinceArmedAt = null;

let phraseSteps   = null;
let phraseStepIdx = 0;

const PHRASE_STEP_DELAY = 700;

function getPhraseSequence(signId) {
  if (isNameDrill && signId === 'MY_NAME') {
    const letters = getLearnerNameLetters();
    return letters.length > 0 ? letters : null;
  }
  const data = window.LWMissions?.getSign?.(level, signId);
  return (data && Array.isArray(data.sequence) && data.sequence.length > 0) ? data.sequence : null;
}

function isPhrase(signId) {
  return getPhraseSequence(signId) !== null;
}

function getActiveSignId() {
  return (phraseSteps && phraseStepIdx < phraseSteps.length) ? phraseSteps[phraseStepIdx] : sign;
}

let cachedAllowedLabels = null;
let cachedAllowedLabelsFor = null;
function getActiveAllowedLabels() {
  const active = getActiveSignId();
  if (active !== cachedAllowedLabelsFor) {
    cachedAllowedLabels = getAllowedLabelsForSign(active);
    cachedAllowedLabelsFor = active;
  }
  return cachedAllowedLabels;
}

function needsExplicitStart(signId) {
  return getDetectionType(signId) === 'motion' || isPhrase(signId);
}

function updatePhrasePromptText() {
  if (!phraseSteps) return;
  const stepLabel = phraseSteps[phraseStepIdx];
  const text = `Step ${phraseStepIdx + 1}/${phraseSteps.length}: "${stepLabel}"`;
  if (mode === 'assessment' && promptEl) promptEl.textContent = text;
  if (motionStatusLabelEl) motionStatusLabelEl.textContent = text;
}

function startPhraseStep() {
  clearTimeout(motionCountdownTimer);
  resetMotionBuffer();
  handLostSinceArmedAt = null;
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
  cooldown = true;
  runMotionCountdown(0);
}

const FACE_WARN_HOLD_MS   = 600;
const HAND_STATUS_HOLD_MS = 400;
let lastFaceSeenAt = Date.now();
let lastHandSeenAt = Date.now();

const INITIAL_WARMUP_MS = 2500;
let warmingUp = false;
let warmupTimer = null;
let lastHandCount  = 0;


function currentUnitOrder() {
  if (isNameDrill) return 2;
  return window.LWMissions?.getCategory?.(level, category)?.unit ?? null;
}

function missionForSidebarCategory(categoryId) {
  return window.LWMissions?.getMissionForCategory?.(categoryId) ?? null;
}

function isSignLearnedInMission(mission, signId) {
  if (!mission) return false;
  const index = mission.items.findIndex((item) => item.kind === 'LESSON' && item.signId === signId);
  if (index === -1) return false;
  return window.LWMissions.isItemComplete(mission, index, mission.items[index]);
}

function missionSignOrder(mission) {
  if (!mission) return [];
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

function isSignAccessible(mission, signId) {
  if (!mission) return true;
  if (window.LWMissions?.isFullCurriculumUnlocked?.()) return true;
  if (isSignLearnedInMission(mission, signId)) return true;
  const order = missionSignOrder(mission);
  const idx = order.indexOf(signId);
  if (idx <= 0) return true;
  return order.slice(0, idx).every((prevId) => isSignLearnedInMission(mission, prevId));
}

function sidebarSignRow(cat, signId, mission, missionLocked) {
  const signData = window.LWMissions?.getSign?.(cat.level, signId);
  const label = signData?.title ?? signId;
  const done = isSignLearnedInMission(mission, signId);
  const isCurrent = !isNameDrill && cat.id === category && signId === sign;

  const accessible = !missionLocked && isSignAccessible(mission, signId);
  if (!accessible) {
    const pending = !missionLocked;
    const reason = pending
      ? 'Locked: finish the earlier signs in this mission first'
      : 'Locked: finish Chapter 1 and Chapter 2 to unlock this one';
    const stateClass = pending ? ' course-sidebar__sign--pending' : ' course-sidebar__sign--locked';
    return `<span class="course-sidebar__sign${stateClass}" aria-disabled="true" title="${reason}">` +
      `<span class="course-sidebar__sign-icon">${window.LWIcons.markup('locked', { size: 'status' })}</span>` +
      `<span class="course-sidebar__sign-label">${escapeHtml(label)}</span>` +
    `</span>`;
  }

  const href = `camera-practice.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(signId)}`;
  const stateClass = isCurrent ? ' course-sidebar__sign--current' : (done ? ' course-sidebar__sign--done' : '');
  const icon = window.LWIcons.markup(
    isCurrent ? 'current' : (done ? 'complete' : 'not_started'),
    { size: 'status' }
  );
  return `<a class="course-sidebar__sign${stateClass}" href="${href}">` +
    `<span class="course-sidebar__sign-icon">${icon}</span>` +
    `<span class="course-sidebar__sign-label">${escapeHtml(label)}</span>` +
  `</a>`;
}

function sidebarCategoryBlock(cat, opts) {
  const signs = window.LWMissions.getCategorySigns(cat.level, cat.id);
  if (signs.length === 0) return '';
  const mission = missionForSidebarCategory(cat.id);
  const missionLocked = !!mission
    && window.LWMissions.getMissionStatus(mission, window.LWMissions.getAllMissions()) === 'locked';

  if (!opts.multiCategory) {
    return signs.map(s => sidebarSignRow(cat, s, mission, missionLocked)).join('');
  }

  if (missionLocked) {
    const icon = window.LWIcons.markup(cat.id);
    return `<div class="course-sidebar__cat">` +
      `<span class="course-sidebar__cat-head course-sidebar__cat-head--locked" aria-disabled="true" title="Locked: finish Chapter 1 and Chapter 2 to unlock this one">` +
        `<span class="course-sidebar__cat-icon">${icon}</span>` +
        `<span class="course-sidebar__cat-title">${escapeHtml(cat.title)}</span>` +
        `<span class="course-sidebar__cat-count">${window.LWIcons.markup('locked', { size: 'status' })}</span>` +
      `</span>` +
    `</div>`;
  }

  const doneCount = signs.filter(s => isSignLearnedInMission(mission, s)).length;
  const isCurrentCat = !isNameDrill && cat.id === category;
  const icon = window.LWIcons.markup(cat.id);
  const targetSign = signs.find(s => !isSignLearnedInMission(mission, s) && isSignAccessible(mission, s)) || signs[0];
  const catHref = `camera-practice.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(targetSign)}`;
  const rows = isCurrentCat ? signs.map(s => sidebarSignRow(cat, s, mission, missionLocked)).join('') : '';

  return `<div class="course-sidebar__cat${isCurrentCat ? ' course-sidebar__cat--open' : ''}">` +
    `<a class="course-sidebar__cat-head" href="${catHref}">` +
      `<span class="course-sidebar__cat-icon">${icon}</span>` +
      `<span class="course-sidebar__cat-title">${escapeHtml(cat.title)}</span>` +
      `<span class="course-sidebar__cat-count">${doneCount}/${signs.length}</span>` +
    `</a>` +
    (isCurrentCat ? `<div class="course-sidebar__signs">${rows}</div>` : '') +
  `</div>`;
}

function showSidebarUnavailable(el, reason) {
  console.error('[lesson.js] course sidebar cannot render. Reason:', reason);
  el.innerHTML = `<div class="alert alert--error sidebar-fallback-alert">Couldn't load the course outline. <a href="learn.html">Go to Learn</a> or reload.</div>`;
}

function wireSidebarProgressCapture(el) {
  if (!el || el.dataset.progressCaptureWired === 'true') return;
  el.dataset.progressCaptureWired = 'true';
  el.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    markCurrentSignPracticed();
  });
}

const SIDEBAR_SEARCH_CSS = `
.sbq-col { display: block; box-sizing: border-box; }
.sbq { --sbq-accent: var(--clr-accent, #4da3ff); --sbq-line: var(--clr-border, rgba(148,163,184,.28)); --sbq-muted: var(--clr-text-muted, #8fa0c2);
  padding: 0 0 var(--space-3, 12px); }
.sbq [hidden], .sbq-results[hidden], .course-sidebar__outline[hidden] { display: none !important; }

.sbq__field { position: relative; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 8px 0 14px;
  border: 1px solid var(--sbq-line); border-radius: 14px; cursor: text;
  background: color-mix(in srgb, currentColor 5%, transparent);
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.sbq__field:hover { border-color: color-mix(in srgb, var(--sbq-accent) 40%, var(--sbq-line)); }
.sbq__field:focus-within { border-color: var(--sbq-accent);
  background: color-mix(in srgb, var(--sbq-accent) 7%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sbq-accent) 20%, transparent),
              0 10px 24px -12px color-mix(in srgb, var(--sbq-accent) 80%, transparent); }

.sbq__icon { display: flex; flex: none; color: var(--sbq-muted);
  transition: color .18s ease, transform .3s cubic-bezier(.3, 1.5, .5, 1); }
.sbq__field:focus-within .sbq__icon { color: var(--sbq-accent); transform: scale(1.1) rotate(-10deg); }

.sbq .sbq__input { flex: 1; min-width: 0; width: auto; height: 100%; margin: 0; padding: 0; border: 0; border-radius: 0;
  outline: 0; box-shadow: none; background: transparent; color: inherit;
  font: inherit; font-size: 15px; font-weight: 500; letter-spacing: .005em;
  -webkit-appearance: none; appearance: none; }
.sbq .sbq__input:focus { outline: 0; box-shadow: none; border: 0; background: transparent; }
.sbq .sbq__input::placeholder { color: var(--sbq-muted); font-weight: 400; opacity: 1; }
.sbq .sbq__input::-webkit-search-cancel-button, .sbq .sbq__input::-webkit-search-decoration { display: none; }
@media (pointer: coarse) { .sbq .sbq__input { font-size: 16px; } }   /* 16px stops iOS zoom-on-focus */

.sbq-kbd { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px;
  font: 600 11px/1 'JetBrains Mono', ui-monospace, monospace; color: var(--sbq-muted);
  border: 1px solid var(--sbq-line); border-bottom-width: 2px; border-radius: 6px; }
.sbq__field .sbq-kbd { transition: opacity .15s ease; }
.sbq__field:focus-within .sbq-kbd, .sbq.is-filled .sbq__field .sbq-kbd { display: none; }
@media (hover: none) { .sbq__field .sbq-kbd { display: none; } }

.sbq__clear { box-sizing: border-box; display: none; flex: none; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%;
  color: inherit; cursor: pointer; background: color-mix(in srgb, currentColor 12%, transparent);
  transition: background .15s ease, transform .15s ease; }
.sbq.is-filled .sbq__clear { display: grid; }
.sbq__clear:hover { background: color-mix(in srgb, var(--sbq-accent) 28%, transparent); transform: scale(1.08); }
.sbq__clear:focus-visible { outline: 2px solid var(--sbq-accent); outline-offset: 2px; }

.sbq-results { --sbq-accent: var(--clr-accent, #4da3ff); --sbq-line: var(--clr-border, rgba(148,163,184,.28)); --sbq-muted: var(--clr-text-muted, #8fa0c2);
  padding: 2px 0 var(--space-3, 12px); }
.sbq-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 14px 8px;
  font: 600 11px/1 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--sbq-muted); }
.sbq-meta b { color: var(--sbq-accent); font-weight: 700; }
.sbq-meta__hint { display: inline-flex; align-items: center; gap: 6px; letter-spacing: .04em; }
@media (hover: none) { .sbq-meta__hint { display: none; } }

.sbq-group { margin-bottom: var(--space-2, 8px); }
.sbq-group__title { display: flex; align-items: center; gap: 10px; padding: 8px 14px 6px;
  font: 600 11px/1.2 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--sbq-muted); }
.sbq-group__title::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--sbq-accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--sbq-accent) 80%, transparent); }
.sbq-group__title::after { content: ""; flex: 1; height: 1px; background: var(--sbq-line); }

.sbq-results mark { padding: 0; color: var(--sbq-accent); font-weight: 700; background: linear-gradient(var(--sbq-accent), var(--sbq-accent)) 0 100% / 100% 2px no-repeat; }
.sbq-results a:focus-visible { outline: 2px solid var(--sbq-accent); outline-offset: -2px; border-radius: 10px; }
.sbq-results .is-top { position: relative; }
.sbq-results .is-top::after { box-sizing: border-box; content: "\\21B5"; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px;
  font: 600 12px/1 'JetBrains Mono', ui-monospace, monospace; color: var(--sbq-muted);
  border: 1px solid var(--sbq-line); border-bottom-width: 2px; border-radius: 6px; pointer-events: none; }
@media (hover: none) { .sbq-results .is-top::after { display: none; } }

.sbq-empty { display: grid; justify-items: center; gap: 6px; padding: 30px 20px 22px; text-align: center; color: var(--sbq-muted); font-size: 14px; }
.sbq-empty svg { margin-bottom: 4px; opacity: .8; }
.sbq-empty strong { color: inherit; font-weight: 600; word-break: break-word; }
.sbq-empty small { font-size: 12.5px; opacity: .85; }

@media (prefers-reduced-motion: no-preference) {
  :root:not(.lw-force-reduced-motion) .sbq-results [data-i] { animation: sbqIn .26s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--i, 0) * 24ms); }
}
@keyframes sbqIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`;

function injectSidebarSearchStyles() {
  if (document.getElementById('lw-sidebar-search-css')) return;
  const s = document.createElement('style');
  s.id = 'lw-sidebar-search-css';
  s.textContent = SIDEBAR_SEARCH_CSS;
  document.head.appendChild(s);
}

const SBQ_ICON_SEARCH =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>';
const SBQ_ICON_CLEAR =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" ' +
  'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const SBQ_ICON_EMPTY =
  '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/><path d="m9 9 4 4M13 9l-4 4"/></svg>';

function sidebarSearchableItems() {
  const cats = [], flat = [];
  window.LWMissions.getUnits().forEach(unit => {
    if (unit.kind === 'interactive') { flat.push(unit); return; }
    const liveCats = window.LWMissions.getCategoriesForUnit(unit.order)
      .filter(c => !c.comingSoon && window.LWMissions.getCategorySigns(c.level, c.id).length > 0);
    if (liveCats.length === 0) return;
    const unlocked = unit.kind === 'reference'
      || (window.LWProgress?.isCategoryUnlocked?.(liveCats[0].level, liveCats[0].id) ?? true);
    if (!unlocked) return;
    liveCats.forEach(cat => cats.push({ unit, cat, multi: liveCats.length > 1 }));
  });
  return { cats, flat };
}

function sidebarSearchMarkup() {
  let n = 0;
  try {
    sidebarSearchableItems().cats.forEach(({ cat }) => {
      n += window.LWMissions.getCategorySigns(cat.level, cat.id).length;
    });
  } catch (e) {  }
  const placeholder = n > 0 ? `Search ${n} signs\u2026` : 'Search signs\u2026';
  return `<div class="sbq" role="search">` +
    `<label class="sbq__field">` +
      `<span class="sbq__icon">${SBQ_ICON_SEARCH}</span>` +
      `<input id="course-sidebar-search-input" class="sbq__input" type="search" enterkeyhint="go" ` +
        `placeholder="${placeholder}" autocomplete="off" autocapitalize="off" spellcheck="false" ` +
        `aria-label="Search signs" aria-controls="course-sidebar-results" />` +
      `<kbd class="sbq-kbd" aria-hidden="true">/</kbd>` +
      `<button type="button" id="course-sidebar-search-clear" class="sbq__clear" aria-label="Clear search">${SBQ_ICON_CLEAR}</button>` +
    `</label>` +
    `<div class="sr-only" id="course-sidebar-search-status" role="status"></div>` +
  `</div>`;
}

function buildSidebarSearchResults(q) {
  const { cats, flat } = sidebarSearchableItems();
  const parts = [];
  let count = 0;

  cats.forEach(({ unit, cat, multi }) => {
    const mission = missionForSidebarCategory(cat.id);
    const missionLocked = !!mission
      && window.LWMissions.getMissionStatus(mission, window.LWMissions.getAllMissions()) === 'locked';
    const wholeCat = String(unit.title).toLowerCase().includes(q) || String(cat.title).toLowerCase().includes(q);
    const rows = [];
    window.LWMissions.getCategorySigns(cat.level, cat.id).forEach(signId => {
      const label = window.LWMissions.getSign?.(cat.level, signId)?.title ?? signId;
      if (wholeCat || String(label).toLowerCase().includes(q)) {
        rows.push(sidebarSignRow(cat, signId, mission, missionLocked));
      }
    });
    if (!rows.length) return;
    count += rows.length;
    const title = multi ? `${unit.title} \u203a ${cat.title}` : `${unit.order}. ${unit.title}`;
    parts.push(`<div class="sbq-group">` +
      `<div class="sbq-group__title">${escapeHtml(title)}</div>` +
      `<div class="course-sidebar__signs">${rows.join('')}</div>` +
    `</div>`);
  });
  flat.forEach(unit => {
    if (!String(unit.title).toLowerCase().includes(q)) return;
    count++;
    parts.push(`<div class="sbq-group">` +
      `<a class="course-sidebar__unit course-sidebar__unit--flat" href="camera-practice.html?level=basic&category=fingerspell_name">` +
        `<span class="course-sidebar__unit-icon">${window.LWIcons.markup(unit.id)}</span>` +
        `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
      `</a></div>`);
  });

  return { html: parts.join(''), count };
}

function highlightSidebarMatches(container, q) {
  container.querySelectorAll('.course-sidebar__sign-label').forEach(span => {
    const text = span.textContent;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return;
    span.textContent = '';
    span.append(text.slice(0, i));
    const m = document.createElement('mark');
    m.textContent = text.slice(i, i + q.length);
    span.append(m, text.slice(i + q.length));
  });
}

function ensureSidebarColumn(el) {
  const existing = el.parentElement;
  if (existing && existing.classList.contains('sbq-col')) return existing;
  const col = document.createElement('div');
  col.className = 'sbq-col';
  el.parentNode.insertBefore(col, el);
  col.appendChild(el);
  col.insertAdjacentHTML('afterbegin', sidebarSearchMarkup());
  return col;
}

const SBQ_ITEM_PROPS = [
  'flexGrow', 'flexShrink', 'flexBasis', 'order', 'alignSelf', 'justifySelf',
  'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'minWidth', 'maxWidth',
];
function syncSidebarColumn(col, el) {
  const search = col.querySelector('.sbq');

  SBQ_ITEM_PROPS.concat(['position', 'top', 'zIndex', 'width']).forEach(p => { col.style[p] = ''; });
  ['position', 'maxHeight', 'width', 'minWidth', 'maxWidth', 'flex', 'margin', 'alignSelf'].forEach(p => { el.style[p] = ''; });

  col.style.display = 'contents';
  if (search) search.style.display = 'none';
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const m = {};
  SBQ_ITEM_PROPS.concat(['position', 'top', 'zIndex', 'maxHeight']).forEach(p => { m[p] = cs[p]; });
  col.style.display = '';
  if (search) search.style.display = '';
  const h = search ? search.offsetHeight : 0;

  SBQ_ITEM_PROPS.forEach(p => { col.style[p] = m[p]; });
  col.style.width = rect.width + 'px';
  if (m.position === 'sticky') {
    col.style.position = 'sticky';
    col.style.top = m.top;
    col.style.alignSelf = 'start';
    if (m.zIndex !== 'auto') col.style.zIndex = m.zIndex;
  }

  el.style.margin = '0';
  el.style.width = 'auto';
  el.style.minWidth = '0';
  el.style.maxWidth = 'none';
  el.style.flex = 'none';
  el.style.alignSelf = 'auto';
  if (m.position === 'sticky') el.style.position = 'static';
  if (m.maxHeight && m.maxHeight !== 'none') el.style.maxHeight = `calc(${m.maxHeight} - ${h}px)`;
}

function sidebarSearchMount(el, outlineHtml) {
  injectSidebarSearchStyles();
  const col = ensureSidebarColumn(el);
  el.innerHTML =
    `<div class="course-sidebar__outline" id="course-sidebar-outline">${outlineHtml}</div>` +
    `<div class="sbq-results" id="course-sidebar-results" role="region" aria-label="Search results" hidden></div>`;
  const input = col.querySelector('#course-sidebar-search-input');
  if (input) input.value = '';
  col.querySelector('.sbq')?.classList.remove('is-filled');
  wireSidebarSearch(el, col);
  syncSidebarColumn(col, el);
  if (!col.dataset.sbqResize) {
    col.dataset.sbqResize = 'true';
    let raf = 0;
    const resync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => syncSidebarColumn(col, el));
    };
    window.addEventListener('resize', resync);
    const parent = col.parentElement;
    if (window.ResizeObserver && parent) {
      let lastW = parent.clientWidth;
      new ResizeObserver(() => {
        if (parent.clientWidth !== lastW) { lastW = parent.clientWidth; resync(); }
      }).observe(parent);
    }
  }
}

function wireSidebarSearch(el, col) {
  const wrap   = col.querySelector('.sbq');
  const input  = col.querySelector('#course-sidebar-search-input');
  const clear  = col.querySelector('#course-sidebar-search-clear');
  const status = col.querySelector('#course-sidebar-search-status');
  if (!wrap || !input || !clear || !status || input.dataset.sbqWired) return;
  input.dataset.sbqWired = 'true';

  const outlineEl = () => el.querySelector('#course-sidebar-outline');
  const resultsEl = () => el.querySelector('#course-sidebar-results');
  const links = () => [...(resultsEl()?.querySelectorAll('a[href]') ?? [])];

  function run() {
    const outline = outlineEl(), results = resultsEl();
    if (!outline || !results) return;
    const raw = input.value.trim();
    const q = raw.toLowerCase();
    wrap.classList.toggle('is-filled', !!input.value);

    if (!q) {
      results.hidden = true;
      results.innerHTML = '';
      outline.hidden = false;
      status.textContent = '';
      scrollCourseSidebarToCurrent(el);
      return;
    }

    let found = { html: '', count: 0 };
    try {
      found = buildSidebarSearchResults(q);
    } catch (e) {
      console.error('[lesson.js] sidebar search failed:', e);
    }

    if (found.count) {
      results.innerHTML =
        `<div class="sbq-meta"><span><b>${found.count}</b> ${found.count === 1 ? 'result' : 'results'}</span>` +
        `<span class="sbq-meta__hint"><kbd class="sbq-kbd">Esc</kbd> clear</span></div>` + found.html;
      highlightSidebarMatches(results, q);
      links().forEach((a, i) => { a.dataset.i = i; a.style.setProperty('--i', Math.min(i, 10)); });
      links()[0]?.classList.add('is-top');
      status.textContent = `${found.count} ${found.count === 1 ? 'result' : 'results'}`;
    } else {
      results.innerHTML = `<div class="sbq-empty">${SBQ_ICON_EMPTY}` +
        `<span>No signs match <strong>\u201c${escapeHtml(raw)}\u201d</strong></span>` +
        `<small>Check the spelling or try a shorter word.</small></div>`;
      status.textContent = 'No results';
    }
    outline.hidden = true;
    results.hidden = false;
    el.scrollTop = 0;
  }

  function reset() { input.value = ''; run(); input.focus(); }

  input.addEventListener('input', run);
  clear.addEventListener('click', reset);
  input.addEventListener('keydown', (e) => {
    const results = resultsEl();
    if (e.key === 'Escape' && input.value) { e.preventDefault(); reset(); }
    else if (e.key === 'ArrowDown' && results && !results.hidden) {
      const first = links()[0];
      if (first) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Enter' && results && !results.hidden) {
      const first = links()[0];
      if (first) { e.preventDefault(); first.click(); }
    }
  });
  el.addEventListener('keydown', (e) => {
    const results = resultsEl();
    if (!results || results.hidden || !results.contains(document.activeElement)) return;
    const list = links();
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowDown')    { e.preventDefault(); list[Math.min(i + 1, list.length - 1)].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i === 0 ? input : list[i - 1]).focus(); }
    else if (e.key === 'Escape')  { e.preventDefault(); reset(); }
  });

  if (!document.body.dataset.sidebarSearchKey) {
    document.body.dataset.sidebarSearchKey = 'true';
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = document.activeElement;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const box = document.getElementById('course-sidebar-search-input');
      if (box) { e.preventDefault(); box.focus(); }
    });
  }
}

function renderCourseSidebar() {
  const el = document.getElementById('course-sidebar');
  if (!el) return;
  wireSidebarProgressCapture(el);
  if (!window.LWMissions) {
    showSidebarUnavailable(el, 'window.LWMissions did not load');
    return;
  }

  try {
    const units = window.LWMissions.getUnits();
    const curUnitOrder = currentUnitOrder();

    const outlineHtml = units.map(unit => {
      const icon = window.LWIcons.markup(unit.id);
      const isCurrentUnit = unit.order === curUnitOrder;

      if (unit.kind === 'interactive') {
        const href = 'camera-practice.html?level=basic&category=fingerspell_name';
        return `<a class="course-sidebar__unit course-sidebar__unit--flat${isCurrentUnit ? ' course-sidebar__unit--current' : ''}" href="${href}">` +
          `<span class="course-sidebar__unit-icon">${icon}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
        `</a>`;
      }

      const allCats  = window.LWMissions.getCategoriesForUnit(unit.order);
      const liveCats = allCats.filter(c => !c.comingSoon && window.LWMissions.getCategorySigns(c.level, c.id).length > 0);

      if (liveCats.length === 0) {
        return `<div class="course-sidebar__unit course-sidebar__unit--locked">` +
          `<span class="course-sidebar__unit-icon">${window.LWIcons.markup('locked', { size: 'sm' })}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">Soon</span>` +
        `</div>`;
      }

      const isReference = unit.kind === 'reference';
      const unlocked = isReference || (window.LWProgress?.isCategoryUnlocked?.(liveCats[0].level, liveCats[0].id) ?? true);
      if (!unlocked) {
        return `<div class="course-sidebar__unit course-sidebar__unit--locked">` +
          `<span class="course-sidebar__unit-icon">${window.LWIcons.markup('locked', { size: 'sm' })}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">0%</span>` +
        `</div>`;
      }

      let totalItems = 0, doneItems = 0;
      liveCats.forEach(c => {
        const m = missionForSidebarCategory(c.id);
        if (!m || !m.items.length) return;
        totalItems += m.items.length;
        doneItems  += m.items.filter((item, i) => window.LWMissions.isItemComplete(m, i, item)).length;
      });
      const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
      const open = isCurrentUnit;
      const body = liveCats.map(c => sidebarCategoryBlock(c, { multiCategory: liveCats.length > 1 })).join('');

      return `<div class="course-sidebar__unit${open ? ' course-sidebar__unit--open' : ''}${isCurrentUnit ? ' course-sidebar__unit--current' : ''}">` +
        `<button type="button" class="course-sidebar__unit-head" data-toggle-unit="${unit.order}">` +
          `<span class="course-sidebar__unit-icon">${icon}</span>` +
          `<span class="course-sidebar__unit-title">${unit.order}. ${escapeHtml(unit.title)}</span>` +
          `<span class="course-sidebar__unit-pct">${pct}%</span>` +
          `<span class="course-sidebar__chevron" aria-hidden="true">${open ? '\u25be' : '\u25b8'}</span>` +
        `</button>` +
        `<div class="course-sidebar__unit-bar"><div class="course-sidebar__unit-bar-fill" style="--p:${pct}"></div></div>` +
        `<div class="course-sidebar__unit-body"${open ? '' : ' style="display:none;"'}>${body}</div>` +
      `</div>`;
    }).join('');

    sidebarSearchMount(el, outlineHtml);

    el.querySelectorAll('[data-toggle-unit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap    = btn.closest('.course-sidebar__unit');
        const body    = wrap?.querySelector('.course-sidebar__unit-body');
        const chevron = wrap?.querySelector('.course-sidebar__chevron');
        if (!wrap || !body) return;
        const nowOpen = wrap.classList.toggle('course-sidebar__unit--open');
        body.style.display = nowOpen ? '' : 'none';
        if (chevron) chevron.textContent = nowOpen ? '\u25be' : '\u25b8';
      });
    });
  } catch (e) {
    showSidebarUnavailable(el, 'render threw: ' + (e && e.message));
    return;
  }

  scrollCourseSidebarToCurrent(el);
}

function scrollCourseSidebarToCurrent(el) {
  let target = el.querySelector('.course-sidebar__sign--current');
  if (!target || target.getBoundingClientRect().height === 0) {
    target = el.querySelector('.course-sidebar__unit--current');
  }
  if (!target) return;
  const t = target.getBoundingClientRect();
  const c = el.getBoundingClientRect();
  el.scrollTop += (t.top - c.top - el.clientTop) - (el.clientHeight - t.height) / 2;
}


async function boot() {
  if (!(window.LWProgress?.isCategoryUnlocked?.(level, category) ?? true)) {
    window.LinguaWave?.showToast?.(
      "That lesson isn't unlocked yet. Finish the one before it first.",
      'error'
    );
    window.location.replace(`learn.html?category=${encodeURIComponent(category)}`);
    return;
  }

  const lockedMission = window.LWMissions?.getMissionForCategory?.(category);
  if (lockedMission) {
    const allMissions = window.LWMissions.getAllMissions();
    if (window.LWMissions.getMissionStatus(lockedMission, allMissions) === 'locked') {
      window.LinguaWave?.showToast?.(
        'This mission is locked. Finish Chapter 1 and Chapter 2 first.',
        'error'
      );
      window.location.replace(`mission-overview.html?mission=${encodeURIComponent(category)}`);
      return;
    }

    if (!isNameDrill && !isSignAccessible(lockedMission, sign)) {
      window.LinguaWave?.showToast?.(
        "That sign isn't unlocked yet. Finish the earlier ones in this mission first.",
        'error'
      );
      window.location.replace(`mission-overview.html?mission=${encodeURIComponent(category)}`);
      return;
    }
  }

  if (isNameDrill && getLearnerNameLetters().length === 0) {
    setStatus('We couldn\'t find any letters (A\u2013Z) to fingerspell in your profile name. Update your name and come back to this drill.', 'error');
    updateLessonMeta();
    return;
  }
  if (totalSigns === 0) {
    setStatus(`"${category}" isn't trained yet. Check back soon.`, 'error');
    updateLessonMeta();
    return;
  }
  updateLessonMeta();
  setupNavButtons();

  if (btnClearLogEl) {
    btnClearLogEl.onclick = () => {
      if (detectionLogListEl) {
        detectionLogListEl.innerHTML = '<li class="detection-log__empty">No detections yet</li>';
      }
    };
  }

  await bootDetectionEngine();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}


let practiceCheckLocked = false;
let untrainedReturnFocusEl = null;
let untrainedInfo = { model: 'motion', name: null };
const untrainedModalEl = document.getElementById('untrained-modal');

async function applyPracticeCheckLock() {
  if (!startBtnEl || isNameDrill) return;
  let status;
  try {
    const sets  = await loadTrainedLabelSets();
    const steps = getPhraseSequence(sign);
    status = steps ? getSequenceTrainingStatus(steps, sets) : getSignTrainingStatus(sign, sets);
  } catch (e) {
    console.warn('[camera-practice] training-status check failed, leaving Practice Check unlocked:', e);
    return;
  }

  const lockedNoteEl = document.getElementById('practice-check-locked-note');
  const normalNoteEl = document.querySelector('.practice-check-note');
  practiceCheckLocked = !status.trained;

  if (!practiceCheckLocked) {
    startBtnEl.classList.remove('is-locked');
    startBtnEl.removeAttribute('aria-disabled');
    startBtnEl.removeAttribute('data-lock-tip');
    startBtnEl.onclick = startAssessment;
    if (lockedNoteEl) lockedNoteEl.hidden = true;
    if (normalNoteEl) normalNoteEl.style.display = '';
    return;
  }

  const modelName = status.model === 'motion' ? 'motion' : 'sign';
  const signName  = window.LWMissions?.getSign?.(level, sign)?.title ?? sign;
  const tip = 'Locked — we don\'t have trained data for this sign yet.';
  window.LWIcons.setLabel(startBtnEl, 'chapter_lock', 'Practice Check', { size: 'sm' });
  startBtnEl.classList.add('is-locked');
  startBtnEl.setAttribute('aria-disabled', 'true');
  startBtnEl.setAttribute('data-lock-tip', tip);
  untrainedInfo = { model: modelName, name: signName };
  startBtnEl.onclick = (e) => { e?.preventDefault?.(); openUntrainedModal(); };
  if (lockedNoteEl) lockedNoteEl.hidden = false;
  if (normalNoteEl) normalNoteEl.style.display = 'none';
}

function openUntrainedModal() {
  if (!untrainedModalEl) return;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('untrained-model', untrainedInfo.model);
  set('untrained-sign', `"${untrainedInfo.name || sign}"`);
  const iconEl = document.getElementById('untrained-icon');
  if (iconEl && !iconEl.firstChild) iconEl.appendChild(window.LWIcons.node('chapter_lock'));
  untrainedReturnFocusEl = document.activeElement;
  untrainedModalEl.style.display = 'flex';
  document.getElementById('untrained-ok')?.focus();
}

function closeUntrainedModal() {
  if (!untrainedModalEl) return;
  untrainedModalEl.style.display = 'none';
  untrainedReturnFocusEl?.focus?.();
  untrainedReturnFocusEl = null;
}

document.getElementById('untrained-ok')?.addEventListener('click', closeUntrainedModal);
document.getElementById('untrained-close')?.addEventListener('click', closeUntrainedModal);
untrainedModalEl?.addEventListener('click', (e) => { if (e.target === untrainedModalEl) closeUntrainedModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && untrainedModalEl && untrainedModalEl.style.display !== 'none') closeUntrainedModal();
});

function updateLessonMeta() {
  const counter = document.getElementById('lesson-counter');
  const fill    = document.getElementById('lesson-progress-fill');
  const letter  = document.getElementById('lesson-letter');
  const title   = document.getElementById('lesson-title');

  const nameDrillLetters = isNameDrill ? getLearnerNameLetters() : null;
  if (isNameDrill) {
    if (counter) counter.textContent = nameDrillLetters.length > 0
      ? `${nameDrillLetters.length} letters`
      : 'No name on file';
    if (fill) fill.dataset.progress = 0;
  } else {
    if (counter) counter.textContent = `Sign ${signIdx + 1} of ${totalSigns || 1}`;
    if (fill)    fill.dataset.progress = totalSigns ? Math.round(((signIdx + 1) / totalSigns) * 100) : 0;
  }

  const signDataForTitle = isNameDrill ? null : (window.LWMissions?.getSign?.(level, sign) ?? null);
  const displayTitle = signDataForTitle?.title ?? sign;
  if (letter) {
    if (!isNameDrill && sign.length === 1) {
      letter.textContent = sign;
    } else {
      window.LWIcons.setLabel(letter, isNameDrill ? 'fingerspell_name' : 'hand_actions', '',
        { className: 'lesson-letter__icon' });
    }
  }
  const singleCharPrefix = category === 'alphabet' ? 'Letter' : category === 'numbers' ? 'Number' : null;
  if (title) {
    title.textContent = isNameDrill
      ? (nameDrillLetters.length > 0 ? `Fingerspell: ${nameDrillLetters.join(' ')}` : 'Fingerspell Your Name')
      : (singleCharPrefix ? `${singleCharPrefix} ${sign}` : displayTitle);
  }

  const categoryMeta = isNameDrill
    ? (window.LWMissions?.getUnits?.()?.find(u => u.id === 'fingerspell_name') ?? null)
    : (window.LWMissions?.getCategory?.(level, category) ?? null);
  if (lessonSubtitleEl) {
    const label = categoryMeta?.title ?? category;
    lessonSubtitleEl.textContent = isNameDrill ? `${label} · Unit 2` : label;
  }

  const backBtnEl = document.getElementById('btn-back-to-lessons');
  if (backBtnEl) {
    backBtnEl.href = `mission-overview.html?mission=${encodeURIComponent(category)}`;
  }


  const stripBadgeEl = document.getElementById('lesson-strip-badge');
  if (stripBadgeEl) {
    stripBadgeEl.textContent = `${level[0].toUpperCase()}${level.slice(1)} · ${categoryMeta?.title ?? category}`;
    stripBadgeEl.className   = `badge badge--${level}`;
  }

  if (motionBufWrapEl) {
    motionBufWrapEl.style.display = needsExplicitStart(sign) ? '' : 'none';
  }

  const signData = signDataForTitle;

  if (signData) {
    if (lessonDescriptionEl) lessonDescriptionEl.textContent = signData.description;

    if (lessonTipsEl && Array.isArray(signData.tips)) {
      lessonTipsEl.innerHTML = signData.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }

    applyLessonVideo(signData.videoUrl);

    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) {
      if (signData.referenceUrl) {
        referenceEl.innerHTML =
          `${window.LWIcons.markup('phrasebook', { size: 'sm' })} <a href="${escapeHtml(signData.referenceUrl)}" target="_blank" rel="noopener noreferrer">See this sign on Lifeprint.com (ASL University)</a>`;
        referenceEl.style.display = '';
      } else {
        referenceEl.style.display = 'none';
      }
    }
  } else if (isNameDrill) {
    if (lessonDescriptionEl) {
      lessonDescriptionEl.textContent = nameDrillLetters.length > 0
        ? `This is the "ASDF" moment: combining letters you already know into something real. Tap "Try it" below and fingerspell your name, one letter at a time: ${nameDrillLetters.join('-')}.`
        : `We don't have any letters to drill. Your profile name doesn't contain any A–Z characters.`;
    }
    if (lessonTipsEl) {
      lessonTipsEl.innerHTML = [
        'Hold each letter clearly until it registers before moving to the next',
        'A brief pause between letters is fine. You get a fresh countdown for each one',
        'Reuses the same trained A–Z alphabet model. No new signs to learn here',
      ].map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) referenceEl.style.display = 'none';
  } else {
    if (lessonDescriptionEl) lessonDescriptionEl.textContent =
      `Lesson content for "${displayTitle}" hasn't been written yet. The camera detection still works. Try practicing the sign below.`;
    if (lessonTipsEl) lessonTipsEl.innerHTML = '';
    const referenceEl = document.getElementById('lesson-reference-link');
    if (referenceEl) referenceEl.style.display = 'none';
  }

  if (isNameDrill) {
    if (startBtnEl) startBtnEl.style.display = 'none';
  } else {
    if (startBtnEl) window.LWIcons.setLabel(startBtnEl, 'camera', 'Practice Check', { size: 'sm' });
    if (startBtnEl) startBtnEl.onclick = startAssessment;
    applyPracticeCheckLock();
  }

  if (btnTryPracticeEl) btnTryPracticeEl.onclick = handleTryItClick;

  resetMotionUI();
  syncMotionUIForMode();

  renderCourseSidebar();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function navUrl(targetSign) {
  return `camera-practice.html?level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}&sign=${encodeURIComponent(targetSign)}`;
}

function markCurrentSignPracticed() {
  if (isNameDrill) return;
  const mission = missionForSidebarCategory(category);
  if (!isSignLearnedInMission(mission, sign)) return;
  window.LWProgress?.recordSignPracticed?.(level, category, sign);
  window.LWMissions?.markSignPracticedBridge?.(category, sign);
}

function setupNavButtons() {
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (btnPrev) {
    if (signIdx <= 0) {
      btnPrev.setAttribute('disabled', '');
    } else {
      btnPrev.onclick = () => {
        shutdown();
        window.location = navUrl(signOrder[signIdx - 1]);
      };
    }
  }

  if (btnNext) {
    const isLast = signIdx >= totalSigns - 1;
    if (isNameDrill) {
      btnNext.textContent = 'Back to Dashboard →';
      btnNext.onclick = () => {
        shutdown();
        window.location = 'dashboard.html';
      };
    } else if (isLast) {
      btnNext.textContent = 'Finish → Category Assessment';
      btnNext.onclick = () => {
        markCurrentSignPracticed();
        shutdown();
        window.location = `mastery-quiz.html?mission=${encodeURIComponent(category)}`;
      };
    } else {
      const nextSignId = signOrder[signIdx + 1];
      const mission = missionForSidebarCategory(category);
      const nextAvailable = !mission || (
        missionSignOrder(mission).includes(nextSignId) &&
        isSignAccessible(mission, nextSignId)
      );
      if (!nextAvailable) {
        window.LWIcons.setLabel(btnNext, 'continue_mission', 'Continue Mission', { size: 'sm' });
        btnNext.onclick = () => {
          shutdown();
          window.location = `lesson.html?mission=${encodeURIComponent(category)}`;
        };
      } else {
        btnNext.textContent = 'Next Sign →';
        btnNext.onclick = () => {
          shutdown();
          window.location = navUrl(nextSignId);
        };
      }
    }
  }
}


function formatMB(bytes) { return (bytes / 1048576).toFixed(bytes >= 10485760 ? 0 : 1); }

function createModelLoaderUI() {
  const viewport = document.querySelector('.camera-viewport');
  if (!viewport) return null;

  if (!document.getElementById('lw-model-loader-style')) {
    const st = document.createElement('style');
    st.id = 'lw-model-loader-style';
    st.textContent =
      '.lw-model-loader{position:absolute;inset:0;z-index:11;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:var(--space-4,16px);text-align:center;background:var(--backdrop,rgba(15,23,42,.92));color:var(--clr-text,#e2e8f0);border-radius:inherit}' +
      '.lw-model-loader[hidden],.lw-model-loader button[hidden]{display:none}' +
      '.lw-model-loader__text{margin:0;font-size:var(--fs-sm,.9rem);font-weight:600}' +
      '.lw-model-loader__hint{margin:0;font-size:var(--fs-xs,.8rem);color:var(--clr-text-muted,#94a3b8);max-width:38ch}' +
      '.lw-model-loader__bar{width:min(320px,90%);height:10px;border-radius:999px;background:var(--clr-border,#334155);overflow:hidden}' +
      '.lw-model-loader__fill{height:100%;width:0;background:var(--clr-accent,#38bdf8);transition:width .25s ease}' +
      '.lw-model-loader__actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
      '.lw-model-loader.is-error .lw-model-loader__text{color:var(--clr-red-text,#fca5a5)}' +
      '.lw-model-loader.is-compact{inset:auto 0 0 0;flex-direction:row;flex-wrap:wrap;padding:8px 12px;gap:8px;border-radius:0 0 var(--radius-lg,12px) var(--radius-lg,12px)}' +
      '.lw-model-loader.is-compact .lw-model-loader__hint{display:none}' +
      '.lw-model-loader.is-compact .lw-model-loader__bar{width:120px;flex:0 0 auto}' +
      '.lw-model-loader.is-starting .lw-model-loader__fill{width:100%!important;animation:lwModelPulse 1.1s ease-in-out infinite}' +
      '@keyframes lwModelPulse{0%,100%{opacity:.35}50%{opacity:1}}' +
      '@media (prefers-reduced-motion:reduce){.lw-model-loader__fill{transition:none}.lw-model-loader.is-starting .lw-model-loader__fill{animation:none}}';
    document.head.appendChild(st);
  }

  const box = document.createElement('div');
  box.className = 'lw-model-loader';
  box.hidden = true;
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  box.innerHTML =
    '<p class="lw-model-loader__text"></p>' +
    '<div class="lw-model-loader__bar" role="progressbar" aria-label="Tracking model download" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="lw-model-loader__fill"></div></div>' +
    '<p class="lw-model-loader__hint"></p>' +
    '<div class="lw-model-loader__actions">' +
      '<button type="button" class="btn btn--ghost lw-model-loader__skip">Skip for now \u2014 keep studying</button>' +
      '<button type="button" class="btn btn--secondary lw-model-loader__retry" hidden>Retry</button>' +
    '</div>';
  viewport.appendChild(box);

  const textEl = box.querySelector('.lw-model-loader__text');
  const hintEl = box.querySelector('.lw-model-loader__hint');
  const barEl  = box.querySelector('.lw-model-loader__bar');
  const fillEl = box.querySelector('.lw-model-loader__fill');
  const skipBtn  = box.querySelector('.lw-model-loader__skip');
  const retryBtn = box.querySelector('.lw-model-loader__retry');
  let revealTimer = null;
  let retryResolve = null;

  skipBtn.addEventListener('click', () => {
    box.classList.add('is-compact');
    skipBtn.hidden = true;
    hintEl.textContent = 'The camera will start automatically when the download finishes.';
  });
  retryBtn.addEventListener('click', () => {
    if (retryResolve) { const r = retryResolve; retryResolve = null; r(); }
  });

  return {
    showProgress() {
      setStatus('', 'ready');
      box.classList.remove('is-error', 'is-starting');
      retryBtn.hidden = true;
      skipBtn.hidden = box.classList.contains('is-compact');
      textEl.textContent = 'Downloading hand-tracking model (about 14 MB)\u2026';
      hintEl.textContent = 'First time only \u2014 it is saved on this device for next time. You can keep studying this lesson meanwhile.';
      fillEl.style.width = '0%';
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => { box.hidden = false; }, 400);
    },
    update(loaded, total) {
      const pct = loaded >= total ? 100 : Math.min(99, Math.floor((loaded / total) * 100));
      fillEl.style.width = pct + '%';
      barEl.setAttribute('aria-valuenow', String(pct));
      textEl.textContent = 'Downloading hand-tracking model\u2026 ' + formatMB(loaded) + ' / ' + formatMB(total) + ' MB (' + pct + '%)';
    },
    startingEngine() {
      clearTimeout(revealTimer);
      box.hidden = false;
      box.classList.add('is-starting');
      textEl.textContent = 'Download complete \u2014 starting the hand-tracking engine\u2026';
      hintEl.textContent = 'Almost ready. This can take a few seconds on slower connections and devices.';
    },
    showErrorAndWaitForRetry(err) {
      clearTimeout(revealTimer);
      box.hidden = false;
      box.classList.add('is-error');
      textEl.textContent = 'Could not download the tracking model.';
      hintEl.textContent = (err && err.message ? err.message + ' ' : '') + 'Check your connection, then tap Retry.';
      retryBtn.hidden = false;
      skipBtn.hidden = true;
      return new Promise((resolve) => { retryResolve = resolve; });
    },
    done() {
      clearTimeout(revealTimer);
      box.remove();
    },
  };
}

async function bootDetectionEngine() {
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const plainHttp = location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(location.hostname);
    setStatus(plainHttp
      ? 'The camera only works on a secure address. Open this site with https:// (or http://localhost while testing).'
      : 'Your browser does not support camera access. Please use Chrome or Edge.', 'error');
    return;
  }
  const loader = createModelLoaderUI();
  modelDownloading = true;
  if (!loader) setStatus('Loading hand + face tracking model\u2026', 'loading');

  try {
    for (;;) {
      try {
        if (loader) loader.showProgress();
        await initMediaPipe({
          onProgress: (loaded, total) => { if (loader) loader.update(loaded, total); },
          onPhase: (phase) => { if (loader && phase === 'starting') loader.startingEngine(); },
        });
        break;
      } catch (err) {
        console.error('[lesson.js] Tracking model failed to load:', err);
        if (!loader) throw err;
        await loader.showErrorAndWaitForRetry(err);
      }
    }
    modelDownloading = false;
    if (loader) loader.done();
    setStatus('Starting camera\u2026', 'loading');
    await startCamera(videoEl, canvasEl);
  } catch (err) {
    modelDownloading = false;
    if (loader) loader.done();
    console.error('[lesson.js] Boot failed:', err);
    setStatus(`Failed to start: ${err.message}`, 'error');
    return;
  }

  setStatus('', 'ready');

  if (!isModelReady()) {
    setFaceWarn(`Hand/face tracking failed to load. Sign detection is disabled until this recovers. (${getModelError() ?? 'unknown error'})`);
  }

  let classifierLoaded = false;
  try {
    await loadModels();
    classifierLoaded = true;
    const motionErr = getMotionModelError();
    if (motionErr) {
      setClassifierWarn(
        'Motion model failed to load. Motion signs cannot be detected. ' +
        'Check that /asl_motion_model/model.json exists. (' + motionErr + ')'
      );
    }
  } catch (err) {
    console.error('[lesson.js] Classifier failed to load — camera still running:', err);
    setClassifierWarn('Sign classifier failed to load. Camera is live but detection is disabled. Check the console for details (Keras 3 issue).');
  }

  lastFaceSeenAt = Date.now();
  lastHandSeenAt = Date.now();

  warmingUp = true;
  clearTimeout(warmupTimer);
  warmupTimer = setTimeout(() => { warmingUp = false; }, INITIAL_WARMUP_MS);

  attemptTrackingReady = isModelReady() && classifierLoaded;

  startRenderLoop();
}


function startRenderLoop() {
  function loop() {
    rafId = requestAnimationFrame(loop);

    if (!videoEl || videoEl.readyState < 2) return;

    const { leftHandLandmarks, rightHandLandmarks, faceLandmarks, poseLandmarks, anyHandPresent } = processFrame(videoEl);
    const handsForDrawing = [leftHandLandmarks, rightHandLandmarks].filter(Boolean);
    const now = Date.now();

    if (handsForDrawing.length > 0) { lastHandSeenAt = now; lastHandCount = handsForDrawing.length; }
    if (faceLandmarks)              lastFaceSeenAt = now;
    if (warmingUp && (handsForDrawing.length > 0 || faceLandmarks)) {
      warmingUp = false;
      clearTimeout(warmupTimer);
    }

    if (handsForDrawing.length > 0) {
      drawSkeleton(ctx, handsForDrawing, canvasEl.width, canvasEl.height);
    } else {
      clearCanvas(ctx, canvasEl.width, canvasEl.height);
      debounceCount = 0;
      lastDetected  = null;
    }
    const handLostForAWhile = now - lastHandSeenAt > (warmingUp ? INITIAL_WARMUP_MS : HAND_STATUS_HOLD_MS);
    setHandStatus(handLostForAWhile ? 0 : lastHandCount);

    if (isModelReady()) {
      const faceHoldMs = warmingUp ? INITIAL_WARMUP_MS : FACE_WARN_HOLD_MS;
      setFaceWarn(
        now - lastFaceSeenAt > faceHoldMs
          ? 'Face not detected. Step back so your whole head is visible.'
          : ''
      );
    }

    trackStaticTry(now, !!anyHandPresent);

    if (!anyHandPresent) {
      if (motionArmed && !cooldown) {
        if (handLostSinceArmedAt === null) handLostSinceArmedAt = now;

        if (now - handLostSinceArmedAt > HAND_LOST_GRACE_MS) {
          const forced = finalizeMotionWindow(getActiveAllowedLabels(), getActiveSignId());
          motionArmed = false;
          handLostSinceArmedAt = null;

          if (forced) {
            logDetection(forced.label, forced.confidence, forced.matched ? 'success' : 'fail');
            setMotionStatus(forced.matched ? 'success' : 'fail', forced.label);
            noteMotionPracticeOutcome(forced);
            updateConfidenceUI(forced);
            if (mode === 'practice') handlePracticeFrame(forced);
            else if (mode === 'assessment') handleAssessmentFrame(forced);
          } else {
            setMotionStatus('hand-lost');
            noteMotionPracticeOutcome(null);
            updateConfidenceUI({ label: null, confidence: 0, matched: false, buffering: false });
          }
          updateMotionBuffer();
        }
      }
      return;
    }
    handLostSinceArmedAt = null;

    const detType = getDetectionType(getActiveSignId());
    let result;

    if (detType === 'motion') {
      if (cooldown || !motionArmed) {
        result = { label: null, confidence: 0, matched: false, buffering: false };
      } else {
        result = classifyMotion(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels(), poseLandmarks, getActiveSignId());

        if (!result.buffering) {
          motionArmed = false;
          logDetection(result.label, result.confidence, result.matched ? 'success' : 'fail');
          setMotionStatus(result.matched ? 'success' : 'fail', result.label);
          noteMotionPracticeOutcome(result);
        }
      }
      updateMotionBuffer();
    } else {
      result = classifyGesture(leftHandLandmarks, rightHandLandmarks, faceLandmarks, getActiveAllowedLabels(), poseLandmarks, getActiveSignId());
    }

    updateConfidenceUI(result);

    if (mode === 'practice') {
      handlePracticeFrame(result);
    } else if (mode === 'assessment') {
      handleAssessmentFrame(result);
    }
  }
  loop();
}

function updateMotionBuffer() {
  if (!motionBufEl) return;

  if (!motionArmed) {
    motionBufEl.style.setProperty('--p', '0');
    return;
  }

  const { elapsedMs, durationMs, progress } = getMotionBufferStatus();
  motionBufEl.style.setProperty('--p', String(Math.round(progress * 100)));

  if (motionStatusLabelEl && elapsedMs > 0) {
    const elapsedSec  = (elapsedMs / 1000).toFixed(1);
    const durationSec = (durationMs / 1000).toFixed(1);
    motionStatusLabelEl.textContent = `Recording: ${elapsedSec}s / ${durationSec}s. Keep signing!`;
  }
}


function setMotionStatus(state, label) {
  if (!motionStatusLabelEl) return;
  const isActive = state === 'recording' || state === 'countdown';
  motionBufWrapEl?.classList.toggle('is-recording', isActive);
  if (btnTryPracticeEl) btnTryPracticeEl.disabled = isActive;

  switch (state) {
    case 'countdown':
      motionStatusLabelEl.textContent = `Get ready… ${label}`;
      break;
    case 'recording':
      motionStatusLabelEl.textContent = 'Recording: perform the sign now';
      break;
    case 'success':
      window.LWIcons.setLabel(motionStatusLabelEl, 'success', `Detected "${label}"`, { size: 'sm' });
      break;
    case 'fail':
      motionStatusLabelEl.textContent = label
        ? `Wasn't confident enough (saw "${label}")`
        : 'No clear motion detected';
      break;
    case 'hand-lost':
      window.LWIcons.setLabel(motionStatusLabelEl, 'warning',
      'Hand left the frame too soon. Keep it up until recording finishes, then try again', { size: 'sm' });
      break;
    case 'idle':
    default:
      motionStatusLabelEl.textContent = 'Collecting frames';
      break;
  }
}

function handleTryItClick() {
  const seq = getPhraseSequence(sign);
  if (seq) {
    phraseSteps   = seq;
    phraseStepIdx = 0;
    updatePhrasePromptText();
    startPhraseStep();
  } else {
    phraseSteps = null;
    startMotionRecording();
  }
}

function startMotionRecording() {
  if (getDetectionType(getActiveSignId()) !== 'motion' || cooldown) return;
  clearTimeout(motionCountdownTimer);
  resetMotionBuffer();
  handLostSinceArmedAt = null;
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
  runMotionCountdown(0);
}

function runMotionCountdown(stepIdx) {
  if (stepIdx >= MOTION_COUNTDOWN_STEPS.length) {
    cooldown = false;
    setMotionDetectionRate(true);

    if (getDetectionType(getActiveSignId()) === 'motion') {
      motionArmed = true;
      setMotionStatus('recording');
    } else {
      debounceCount = 0;
      lastDetected  = null;
      setMotionStatus('idle');
    }
    return;
  }
  setMotionStatus('countdown', MOTION_COUNTDOWN_STEPS[stepIdx]);
  motionCountdownTimer = setTimeout(() => runMotionCountdown(stepIdx + 1), MOTION_COUNTDOWN_STEP_MS);
}

function resetMotionUI() {
  clearTimeout(motionCountdownTimer);
  motionArmed = false;
  handLostSinceArmedAt = null;
  phraseSteps   = null;
  phraseStepIdx = 0;
  resetMotionBuffer();
  if (motionBufEl) motionBufEl.style.setProperty('--p', '0');
  setMotionStatus('idle');
  setMotionDetectionRate(true);
}

function syncMotionUIForMode() {
  if (!btnTryPracticeEl) return;
  btnTryPracticeEl.style.display =
    (mode === 'practice' && needsExplicitStart(sign)) ? '' : 'none';
}

const MAX_LOG_ENTRIES = 20;

function logDetection(label, confidence, kind) {
  if (!detectionLogListEl) return;
  const emptyEl = detectionLogListEl.querySelector('.detection-log__empty');
  if (emptyEl) emptyEl.remove();

  const icon = window.LWIcons.markup(FEEDBACK_ICONS[kind] || 'info',
    { size: 'status', className: `lw-icon--tone-${kind === 'success' ? 'success' : kind === 'confirming' ? 'info' : 'error'}` });
  const li = document.createElement('li');
  li.className = `detection-log__entry--${kind}`;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  li.innerHTML =
    `<span class="detection-log__time">${time}</span>` +
    `<span class="detection-log__label">${icon} ${label ? escapeHtml(label) : 'no sign'}</span>` +
    `<span class="detection-log__conf">${confidence}%</span>`;
  detectionLogListEl.appendChild(li);

  while (detectionLogListEl.children.length > MAX_LOG_ENTRIES) {
    detectionLogListEl.removeChild(detectionLogListEl.firstChild);
  }
}


function handlePracticeFrame(result) {
  if (phraseSteps) {
    if (cooldown || !result.matched || !result.label) return;
    const expectedStep = getActiveSignId();
    const isMotion = getDetectionType(expectedStep) === 'motion';

    if (isMotion) {
      if (result.label !== expectedStep) {
        showFeedback(`Detected "${result.label}". Try "${expectedStep}" again`, 'error');
        enterCooldown(1000);
        resetMotionBuffer();
        setTimeout(() => startPhraseStep(), 1000);
        return;
      }
      debounceCount = 0;
    } else {
      if (result.label !== expectedStep) {
        debounceCount = 0;
        lastDetected  = null;
        return;
      }
      debounceCount++;
      lastDetected = result.label;
      if (debounceCount < DEBOUNCE_FRAMES) return;
      debounceCount = 0;
    }

    if (phraseStepIdx < phraseSteps.length - 1) {
      enterCooldown(PHRASE_STEP_DELAY);
      if (isMotion) resetMotionBuffer();
      phraseStepIdx++;
      updatePhrasePromptText();
      showFeedback(`Got it, next: "${phraseSteps[phraseStepIdx]}"`, 'success');
      setTimeout(() => startPhraseStep(), PHRASE_STEP_DELAY);
      return;
    }

    enterCooldown(1200);
    if (isMotion) resetMotionBuffer();
    showFeedback('Phrase complete!', 'success');
    reportPassedAttempt(sign);
    if (isNameDrill) {
      window.LWProgress?.recordUnitAssessment?.('fingerspell_name', { score: 1, passed: true });
    }
    phraseSteps = null;
    return;
  }

  const isMotion = getDetectionType(sign) === 'motion';

  const isCorrectSign = result.label === sign;

  if (result.matched && !cooldown) {
    if (!isCorrectSign) {
      showFeedback(`Detected "${result.label}". This lesson is "${sign}"`, 'error');
      enterCooldown(800);
      debounceCount = 0;
      lastDetected  = null;
      return;
    }
    if (isMotion) {
      showFeedback(`Nice! Detected: ${result.label}`, 'success');
      enterCooldown(1200);
      resetMotionBuffer();
      debounceCount = 0;
      lastDetected  = null;
    } else {
      debounceCount++;
      if (debounceCount >= DEBOUNCE_FRAMES && lastDetected === result.label) {
        showFeedback(`Nice! Detected: ${result.label}`, 'success');
        notePracticeSuccess();
        enterCooldown(1200);
        debounceCount = 0;
      }
      lastDetected = result.label;
    }
  } else if (!result.matched && !result.buffering) {
    if (!isMotion) {
      debounceCount = 0;
      lastDetected  = null;
    }
  }
}


function startAssessment() {
  if (modelDownloading) { showFeedback('Hand-tracking is still downloading \u2014 Practice Check unlocks as soon as it finishes.', 'info'); return; }
  if (practiceCheckLocked) { openUntrainedModal(); return; }
  quizSigns   = isCategoryAssessment ? [...signOrder] : [sign];
  quizIdx     = 0;
  score       = 0;
  missedSigns = [];
  attemptCount++;
  staticTry   = null;
  mode        = 'assessment';
  syncMotionUIForMode();
  debounceCount = 0;
  lastDetected  = null;
  lastFaceSeenAt = Date.now();
  lastHandSeenAt = Date.now();
  lastHandCount  = 0;

  if (startBtnEl) startBtnEl.style.display = 'none';

  if (promptBoxEl) promptBoxEl.style.display = '';
  if (scoreEl)     scoreEl.style.display     = '';

  if (modeBarEl) {
    window.LWIcons.setLabel(modeBarEl, 'progress', 'Assessment Mode', { size: 'sm' });
    modeBarEl.className    = 'mode-bar mode-bar--pill mode-bar--assessment';
  }

  showNextPrompt();
}

function showNextPrompt() {
  if (window.LWCameraTips?.isOpen?.()) {
    window.LWCameraTips.whenClosed(showNextPrompt);
    return;
  }
  if (quizIdx >= quizSigns.length) {
    endAssessment();
    return;
  }

  const currentSign = quizSigns[quizIdx];
  debounceCount     = 0;
  lastDetected      = null;
  cooldown          = true;
  resetMotionUI();

  setMotionDetectionRate(false);

  if (scoreEl)  scoreEl.textContent  = `Score: ${score} / ${quizSigns.length}`;
  showFeedback('', '');

  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);

  const isFirst = quizIdx === 0;
  if (promptEl) promptEl.textContent = isFirst ? `Sign: "${currentSign}"` : 'Get ready…';

  getReadyTimer = setTimeout(() => {
    cooldown = false;
    if (promptEl) promptEl.textContent = `Sign: "${currentSign}"`;

    const seq = getPhraseSequence(currentSign);
    if (seq) {
      phraseSteps   = seq;
      phraseStepIdx = 0;
      updatePhrasePromptText();
      startPhraseStep();
    } else {
      phraseSteps = null;

      if (getDetectionType(currentSign) === 'motion') {
        startMotionRecording();
      } else {
        setMotionDetectionRate(true);
      }
    }

    promptTimer = setTimeout(() => {
      missedSigns.push({ expected: currentSign, got: null });
      settleAssessmentAttempt(currentSign, false);
      showFeedback('⏱ Time up, moving on', 'error');
      setTimeout(() => {
        quizIdx++;
        showNextPrompt();
      }, NEXT_SIGN_DELAY);
    }, PROMPT_TIMEOUT);
  }, isFirst ? 0 : GETREADY_DELAY);
}

function handleAssessmentFrame(result) {
  if (cooldown || quizIdx >= quizSigns.length) return;

  const currentSign = quizSigns[quizIdx];

  if (phraseSteps) {
    if (!result.matched || !result.label) return;
    const expectedStep = getActiveSignId();
    const isMotion = getDetectionType(expectedStep) === 'motion';

    if (isMotion) {
      debounceCount = 0;
    } else {
      debounceCount++;
      if (debounceCount < DEBOUNCE_FRAMES) return;
      debounceCount = 0;
    }

    if (result.label !== expectedStep) {
      enterCooldown(1500);
      clearTimeout(promptTimer);
      if (isMotion) resetMotionBuffer();
      const stepInfo = `${result.label} (step ${phraseStepIdx + 1}/${phraseSteps.length})`;
      phraseSteps = null;
      missedSigns.push({ expected: currentSign, got: stepInfo });
      settleAssessmentAttempt(currentSign, false);
      showFeedback(`Detected "${result.label}". Expected "${expectedStep}"`, 'error');
      setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
      return;
    }

    if (phraseStepIdx < phraseSteps.length - 1) {
      enterCooldown(PHRASE_STEP_DELAY);
      clearTimeout(promptTimer);
      if (isMotion) resetMotionBuffer();
      phraseStepIdx++;
      updatePhrasePromptText();
      promptTimer = setTimeout(() => {
        missedSigns.push({ expected: currentSign, got: null });
        settleAssessmentAttempt(currentSign, false);
        showFeedback('⏱ Time up, moving on', 'error');
        phraseSteps = null;
        setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
      }, PROMPT_TIMEOUT);
      setTimeout(() => startPhraseStep(), PHRASE_STEP_DELAY);
      return;
    }

    enterCooldown(1500);
    clearTimeout(promptTimer);
    if (isMotion) resetMotionBuffer();
    phraseSteps = null;
    score++;
    settleAssessmentAttempt(currentSign, true);
    showFeedback(`Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
    setTimeout(() => { quizIdx++; showNextPrompt(); }, NEXT_SIGN_DELAY);
    return;
  }

  if (!result.matched || !result.label) return;

  const isMotion = getDetectionType(currentSign) === 'motion';

  if (isMotion) {
    debounceCount = 0;
  } else {
    debounceCount++;
    if (debounceCount < DEBOUNCE_FRAMES) return;
    debounceCount = 0;
  }

  enterCooldown(1500);
  clearTimeout(promptTimer);
  if (isMotion) resetMotionBuffer();

  if (result.label === currentSign) {
    score++;
    settleAssessmentAttempt(currentSign, true);
    showFeedback(`Correct! (${result.confidence}%)`, 'success');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${quizSigns.length}`;
  } else {
    missedSigns.push({ expected: currentSign, got: result.label });
    settleAssessmentAttempt(currentSign, false);
    showFeedback(`Detected ${result.label}. Expected ${currentSign}`, 'error');
  }

  setTimeout(() => {
    quizIdx++;
    showNextPrompt();
  }, NEXT_SIGN_DELAY);
}

function endAssessment() {
  mode = 'practice';
  syncMotionUIForMode();
  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);
  resetMotionUI();

  const pct   = quizSigns.length > 0 ? score / quizSigns.length : 0;
  const passed = pct >= PASS_THRESHOLD;

  if (promptEl)  promptEl.textContent = '';
  if (feedbackEl) feedbackEl.textContent = '';

  if (promptBoxEl) promptBoxEl.style.display = 'none';
  if (scoreEl)     scoreEl.style.display     = 'none';

  if (modeBarEl) {
    window.LWIcons.setLabel(modeBarEl, 'learn', 'Practice Mode', { size: 'sm' });
    modeBarEl.className   = 'mode-bar mode-bar--pill mode-bar--practice';
  }

  if (missedListEl) {
    if (!passed && missedSigns.length > 0) {
      missedListEl.innerHTML =
        `<p><strong>Review these signs:</strong></p><ul>` +
        missedSigns.map(m =>
          `<li>${escapeHtml(m.expected)}${m.got ? `: detected as ${escapeHtml(m.got)}` : ': not detected in time'}</li>`
        ).join('') +
        `</ul>`;
      missedListEl.style.display = '';
    } else {
      missedListEl.innerHTML = '';
      missedListEl.style.display = 'none';
    }
  }

  if (overlayEl && finalScoreEl) {
    finalScoreEl.textContent = `${Math.round(pct * 100)}%`;
    if (finalAttemptsEl) finalAttemptsEl.textContent = `Attempt ${attemptCount}`;
    document.getElementById('overlay-result-title').textContent =
      passed ? 'Lesson Passed!' : 'Not quite yet';
    document.getElementById('overlay-result-msg').textContent =
      passed
        ? 'Nice work — you cleared the camera check. Your progress has been saved.'
        : `You scored ${Math.round(pct * 100)}% — you need at least ${Math.round(PASS_THRESHOLD * 100)}% to move on. Give it another go.`;

    const continueBtn = document.getElementById('btn-overlay-continue');
    const retryBtn    = document.getElementById('btn-overlay-retry');
    if (continueBtn) continueBtn.style.display = passed ? '' : 'none';
    if (retryBtn)    retryBtn.style.display    = passed ? 'none' : '';

    overlayEl.style.display = 'flex';

    if (passed) {
      quizSigns.forEach(s => {
        window.LWProgress?.recordSignPracticed?.(level, category, s);
        window.LWMissions?.markSignPracticedBridge?.(category, s);
      });
      window.LWMissions?.recordActivity?.('camera_practice');
    }
  }

  if (startBtnEl) {
    startBtnEl.style.display = '';
    window.LWIcons.setLabel(startBtnEl, 'camera', passed ? 'Practice Check' : 'Practice Check — try again', { size: 'sm' });
  }
}


function updateConfidenceUI(result) {
  if (!detectedEl || !confidenceEl || !confTextEl) return;

  if (result.label) {
    const expectedId    = getActiveSignId();
    const isCorrectSign = result.label === expectedId;
    const showAsSuccess = result.matched && isCorrectSign;
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
    const showAsWrongMatch = result.matched && !isCorrectSign;
    detectedEl.textContent        = showAsWrongMatch ? `${result.label}, not "${expectedId}"` : result.label;
    detectedEl.style.color        = showAsSuccess ? 'var(--clr-success)' : 'var(--clr-text-muted)';
    confidenceEl.style.setProperty('--p', String(result.confidence));
    confidenceEl.style.background = showAsSuccess ? 'var(--clr-success)' : 'var(--clr-yellow)';
    confTextEl.textContent        = `${result.confidence}%`;
  } else if (motionArmed) {
    window.LWIcons.setLabel(detectedEl, 'camera', 'Listening…', { size: 'sm' });
    detectedEl.style.color   = 'var(--clr-accent)';
    confidenceEl.style.setProperty('--p', '100');
    confidenceEl.style.background = 'var(--clr-accent)';
    confidenceEl.classList.add('confidence-bar-fill--pulse');
    confTextEl.textContent   = '…';
  } else {
    confidenceEl.classList.remove('confidence-bar-fill--pulse');
    detectedEl.textContent    = '–';
    detectedEl.style.color    = 'var(--clr-text-muted)';
    confidenceEl.style.setProperty('--p', '0');
    confTextEl.textContent    = '0%';
  }
}


function showFeedback(message, type) {
  if (!feedbackEl) return;
  feedbackEl.className    = `assessment-feedback assessment-feedback--${type}`;
  feedbackEl.style.display = message ? '' : 'none';
  if (!message) { feedbackEl.textContent = ''; return; }
  window.LWIcons.setLabel(feedbackEl, FEEDBACK_ICONS[type] || 'info', message,
    { size: 'sm', className: `lw-icon--tone-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}` });
}

function setStatus(message, type) {
  if (!statusEl) return;
  if (!message) { statusEl.style.display = 'none'; return; }
  statusEl.style.display   = 'flex';
  statusEl.className       = `camera-status camera-status--${type}`;
  window.LWIcons.setLabel(statusEl, FEEDBACK_ICONS[type] || 'info', message, { size: 'sm' });
}

function setClassifierWarn(message) {
  if (!classifierWarnEl) {
    classifierWarnEl = document.getElementById('classifier-warn');
  }
  if (!classifierWarnEl) return;
  if (message) window.LWIcons.setLabel(classifierWarnEl, 'warning', message, { size: 'sm' });
  else classifierWarnEl.textContent = '';
  classifierWarnEl.style.display = message ? '' : 'none';
}

function setFaceWarn(message) {
  if (!faceWarnEl) {
    faceWarnEl = document.getElementById('face-warn');
  }
  if (!faceWarnEl) return;
  if (message) window.LWIcons.setLabel(faceWarnEl, 'warning', message, { size: 'sm' });
  else faceWarnEl.textContent = '';
  faceWarnEl.style.display = message ? '' : 'none';
}

function setHandStatus(count) {
  if (!handStatusEl) return;
  if (count === 0) {
    handStatusEl.textContent  = 'No hand detected';
    handStatusEl.className    = 'hand-status-pill hand-status-pill--none';
  } else {
    window.LWIcons.setLabel(handStatusEl, 'hand_actions',
      count === 1 ? 'Hand detected' : 'Both hands', { size: 'status' });
    handStatusEl.className    = 'hand-status-pill hand-status-pill--ok';
  }
}

function enterCooldown(ms) {
  cooldown = true;
  setTimeout(() => { cooldown = false; }, ms);
}


function shutdown() {
  if (rafId) cancelAnimationFrame(rafId);
  stopCamera(videoEl);
  clearTimeout(promptTimer);
  clearTimeout(getReadyTimer);
}

window.addEventListener('beforeunload', shutdown);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera(videoEl);
});


window.closeOverlay = function() {
  if (overlayEl) overlayEl.style.display = 'none';
};

window.retryLesson = function() {
  closeOverlay();
  if (isNameDrill) return;
  startAssessment();
};

window.continueToNext = function() {
  if (!isNameDrill) {
    const mission = missionForSidebarCategory(category);
    if (!isSignLearnedInMission(mission, sign)) {
      if (overlayEl) {
        document.getElementById('overlay-result-title').textContent = 'Not quite yet';
        document.getElementById('overlay-result-msg').textContent =
          `You need at least ${Math.round(PASS_THRESHOLD * 100)}% on the camera check to move on. Give it another go.`;
        const continueBtn = document.getElementById('btn-overlay-continue');
        const retryBtn    = document.getElementById('btn-overlay-retry');
        if (continueBtn) continueBtn.style.display = 'none';
        if (retryBtn)    retryBtn.style.display    = '';
        overlayEl.style.display = 'flex';
      }
      return;
    }
  }

  shutdown();
  const nextIdx = signIdx + 1;
  if (nextIdx < totalSigns) {
    window.location = navUrl(signOrder[nextIdx]);
  } else {
    window.location = `mastery-quiz.html?mission=${encodeURIComponent(category)}`;
  }
};
