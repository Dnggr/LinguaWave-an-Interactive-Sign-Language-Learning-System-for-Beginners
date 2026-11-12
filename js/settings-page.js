'use strict';

const PREF_STORAGE_KEY = 'lw-preferences';
const DEFAULT_PREFS = { reducedMotion: false };

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[settings-page.js] could not persist preferences:', e);
  }
}

function applyReducedMotion(enabled) {
  document.documentElement.classList.toggle('lw-force-reduced-motion', enabled);
}

function initThemeSelect() {
  if (typeof getThemePreference !== 'function' || typeof applyTheme !== 'function') {
    console.warn('[settings-page.js] js/theme.js globals not found — theme control will not work on this page.');
  }
}

function initMissionsDevBlock() {
  const block = document.getElementById('settings-missions-dev');
  if (!block) return;

  const isDev = new URLSearchParams(window.location.search).get('dev') === '1';
  if (!isDev) return;

  block.hidden = false;

  const toggle = document.getElementById('pref-missions-enabled');
  if (!toggle) return;

  if (typeof window.LWMissions === 'undefined') {
    console.warn('[settings-page.js] js/missions.js not loaded — Missions dev toggle will not work.');
    toggle.disabled = true;
    return;
  }

  toggle.checked = window.LWMissions.isEnabled();
  toggle.addEventListener('change', () => {
    window.LWMissions.setEnabled(toggle.checked);
  });
}

const GUARD_COUNTDOWN_SECONDS = 5;

function initConfirmGuardModal() {
  const overlay    = document.getElementById('guard-confirm-modal');
  const messageEl  = document.getElementById('guard-confirm-message');
  const confirmBtn = document.getElementById('guard-confirm-btn');
  const cancelBtn  = document.getElementById('guard-confirm-cancel');
  const modalEl    = overlay?.querySelector('.modal');

  let countdownTimer = null;
  let resolveActive   = null;

  function onKeydown(e) {
    if (e.key === 'Escape') settle(false);
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function settle(result) {
    stopCountdown();
    document.removeEventListener('keydown', onKeydown);
    overlay.hidden = true;
    const resolve = resolveActive;
    resolveActive = null;
    if (resolve) resolve(result);
  }

  if (overlay && messageEl && confirmBtn && cancelBtn) {
    confirmBtn.addEventListener('click', () => {
      if (confirmBtn.disabled) return;
      settle(true);
    });
    cancelBtn.addEventListener('click', () => settle(false));

    window.LWConfirmGuard = function confirmGuard(message) {
      return new Promise((resolve) => {
        resolveActive = resolve;
        messageEl.textContent = message;
        overlay.hidden = false;
        modalEl?.focus();
        document.addEventListener('keydown', onKeydown);

        let remaining = GUARD_COUNTDOWN_SECONDS;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Confirm (' + remaining + ')';
        stopCountdown();
        countdownTimer = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            stopCountdown();
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
          } else {
            confirmBtn.textContent = 'Confirm (' + remaining + ')';
          }
        }, 1000);
      });
    };
  } else {
    console.warn('[settings-page.js] #guard-confirm-modal markup not found — falling back to window.confirm().');
    window.LWConfirmGuard = function confirmGuard(message) {
      return Promise.resolve(window.confirm(message));
    };
  }
}

function initProfileAvatar() {
  const slot = document.getElementById('settings-avatar-initial');
  if (!slot || !window.LWAvatars) return;

  const session = () => window.LWAuth?.getCurrentUser?.();
  const paint = (avatarId) => {
    const name = session()?.name || 'Learner';
    slot.innerHTML = window.LWAvatars.markup(avatarId, { name });
  };

  const cached = session();
  if (cached && window.LWAvatars.find(cached.avatar)) paint(cached.avatar);

  Promise.resolve()
    .then(() => window.LWAuth.whenAuthReady())
    .then(() => window.LWAuth.getAvatar())
    .then((stored) => paint(stored))
    .catch((e) => console.warn('[settings-page.js] profile picture not loaded:', e));

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) paint(session()?.avatar);
  });
}

function initSettingsPage() {
  const prefs = loadPrefs();

  initConfirmGuardModal();
  initProfileAvatar();
  initThemeSelect();
  initMissionsDevBlock();

  const motionEl = document.getElementById('pref-reduced-motion');

  const switchEls = [motionEl]
    .filter(Boolean)
    .map((input) => input.closest('.toggle-switch'))
    .filter(Boolean);
  switchEls.forEach((el) => el.classList.add('toggle-switch--no-transition'));

  if (motionEl) motionEl.checked = prefs.reducedMotion;
  applyReducedMotion(prefs.reducedMotion);

  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    switchEls.forEach((el) => el.classList.remove('toggle-switch--no-transition'));
  });

  motionEl?.addEventListener('change', () => {
    prefs.reducedMotion = motionEl.checked;
    savePrefs(prefs);
    applyReducedMotion(prefs.reducedMotion);
  });

  const replayEl = document.getElementById('btn-replay-guides');
  replayEl?.addEventListener('click', async () => {
    if (!window.LWTour) return;
    const confirmed = await window.LWConfirmGuard('Do you want to reset all guided tours so they play again from the start?');
    if (!confirmed) return;
    window.LWTour.resetAll();
    window.location.href = 'dashboard.html?tour=1';
  });

  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    window.location.href = 'edit-profile.html';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}
