
const THEME_STORAGE_KEY = 'lw-theme';
const THEME_BG = { light: '#F8FAFC', dark: '#0F172A' };
const systemSchemeQuery = matchMedia('(prefers-color-scheme: light)');

function getThemePreference() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
}

function resolveTheme(pref) {
  return pref === 'system' ? (systemSchemeQuery.matches ? 'light' : 'dark') : pref;
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function commitTheme(pref, resolved) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-pref', pref);
  root.style.colorScheme = resolved;
  root.style.background = THEME_BG[resolved];
  syncToggleButtons(resolved);
  syncSegmentedControls(pref);
}

function applyTheme(pref, originSource) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  const changes = root.getAttribute('data-theme') !== resolved;

  try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch (e) {  }

  if (activeThemeVeil) activeThemeVeil.abort();

  if (!changes || !canAnimateTheme()) {
    commitTheme(pref, resolved);
    return;
  }
  runThemeTransition(resolveThemeOrigin(originSource), resolved, () => commitTheme(pref, resolved));
}

function toggleTheme(source) {
  if (source && source.currentTarget) source = source.currentTarget;
  applyTheme((pendingTheme || getCurrentTheme()) === 'light' ? 'dark' : 'light', source);
}


let themeTransitionSeq = 0;
let activeThemeVeil = null;
let pendingTheme = null;

function prefersReducedMotionTheme() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('lw-force-reduced-motion');
  } catch (e) {
    return false;
  }
}

function canAnimateTheme() {
  return document.documentElement.dataset.lwThemeTransition !== 'off' &&
    document.visibilityState !== 'hidden' && !prefersReducedMotionTheme();
}

function resolveThemeOrigin(source) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  const centre = (el, rect) => ({
    x: clamp(rect.left + rect.width / 2, vw),
    y: clamp(rect.top + rect.height / 2, vh),
    el,
  });

  if (source && typeof source.x === 'number' && typeof source.y === 'number') {
    return { x: clamp(source.x, vw), y: clamp(source.y, vh), el: null };
  }
  if (source && typeof source.getBoundingClientRect === 'function') {
    const rect = source.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return centre(source, rect);
  }

  const candidates = Array.from(document.querySelectorAll('.theme-switch'));
  const activeOpt = document.querySelector('.theme-segmented__opt--active');
  if (activeOpt) candidates.push(activeOpt);
  let offscreen = null;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) continue;
    const onScreen = rect.right > 0 && rect.left < vw && rect.bottom > 0 && rect.top < vh;
    if (onScreen) return centre(el, rect);
    if (!offscreen) offscreen = centre(null, rect);
  }
  return offscreen || { x: vw / 2, y: vh / 2, el: null };
}

function themeCoverRadius(x, y) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const farthest = Math.max(
    Math.hypot(x, y),
    Math.hypot(w - x, y),
    Math.hypot(x, h - y),
    Math.hypot(w - x, h - y)
  );
  return Math.ceil(farthest) + 2;
}

function pulseThemeControl(el) {
  if (!el || !el.classList || !el.classList.contains('theme-switch')) return;
  el.classList.remove('is-theme-pulse');
  void el.offsetWidth;
  el.classList.add('is-theme-pulse');
  el.addEventListener('animationend', () => el.classList.remove('is-theme-pulse'), { once: true });
}

function runThemeTransition(origin, resolved, commit) {
  const root = document.documentElement;
  const seq = ++themeTransitionSeq;
  const radius = themeCoverRadius(origin.x, origin.y);

  root.style.setProperty('--theme-origin-x', `${origin.x}px`);
  root.style.setProperty('--theme-origin-y', `${origin.y}px`);
  root.style.setProperty('--theme-transition-radius', `${radius}px`);
  root.classList.add('lw-theme-switching');

  pendingTheme = resolved;
  let committed = false;
  const commitOnce = () => {
    if (committed) return;
    committed = true;
    commit();
    if (seq === themeTransitionSeq) pendingTheme = null;
    pulseThemeControl(origin.el);
  };
  const cleanup = () => {
    if (seq !== themeTransitionSeq) return;
    root.classList.remove('lw-theme-switching');
    root.style.removeProperty('--theme-origin-x');
    root.style.removeProperty('--theme-origin-y');
    root.style.removeProperty('--theme-transition-radius');
  };

  if (typeof document.startViewTransition === 'function') {
    try {
      const vt = document.startViewTransition(commitOnce);
      vt.ready.catch(() => {  });
      vt.finished.then(cleanup, cleanup);
      return;
    } catch (err) {
    }
  }
  runThemeVeil(origin, radius, resolved, commitOnce, cleanup);
}

function runThemeVeil(origin, radius, resolved, commitOnce, cleanup) {
  const veil = document.createElement('div');
  veil.className = 'lw-theme-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.background = THEME_BG[resolved];
  const at = `${origin.x}px ${origin.y}px`;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    commitOnce();
    veil.remove();
    if (activeThemeVeil === handle) activeThemeVeil = null;
    cleanup();
  };
  const handle = { abort: finish };
  activeThemeVeil = handle;

  document.body.appendChild(veil);
  if (typeof veil.animate !== 'function') { finish(); return; }
  const grow = veil.animate(
    [{ clipPath: `circle(0px at ${at})` }, { clipPath: `circle(${radius}px at ${at})` }],
    { duration: 680, easing: 'cubic-bezier(.4, .1, .2, 1)', fill: 'forwards' }
  );
  grow.finished.then(() => {
    if (finished) return;
    commitOnce();
    return veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' }).finished;
  }).then(finish, finish);
}

function syncToggleButtons(resolvedTheme) {
  const isDark = resolvedTheme === 'dark';
  document.querySelectorAll('.theme-switch').forEach((btn) => {
    btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    const label = `Switch to ${isDark ? 'light' : 'dark'} theme`;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  });
}

function syncSegmentedControls(pref) {
  document.querySelectorAll('.theme-segmented').forEach((group) => {
    group.querySelectorAll('.theme-segmented__opt').forEach((opt) => {
      const active = opt.dataset.themeValue === pref;
      opt.classList.toggle('theme-segmented__opt--active', active);
      opt.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  });
}

function initThemeToggles() {
  const switches = document.querySelectorAll('.theme-switch');
  const segmented = document.querySelectorAll('.theme-segmented');
  switches.forEach((btn) => btn.classList.add('theme-switch--no-transition'));
  segmented.forEach((el) => el.classList.add('theme-segmented--no-transition'));

  syncToggleButtons(getCurrentTheme());
  syncSegmentedControls(getThemePreference());

  void document.body.offsetHeight;

  requestAnimationFrame(() => {
    switches.forEach((btn) => btn.classList.remove('theme-switch--no-transition'));
    segmented.forEach((el) => el.classList.remove('theme-segmented--no-transition'));
  });

  switches.forEach((btn) => {
    btn.onclick = (e) => toggleTheme(e.currentTarget);
  });

  segmented.forEach((group) => {
    group.querySelectorAll('.theme-segmented__opt').forEach((opt) => {
      opt.onclick = () => applyTheme(opt.dataset.themeValue, opt);
    });
  });
}

window.addEventListener('storage', (e) => {
  if (e.key === THEME_STORAGE_KEY && e.newValue) {
    commitTheme(e.newValue, resolveTheme(e.newValue));
  }
});

try {
  if (JSON.parse(localStorage.getItem('lw-preferences') || '{}').reducedMotion) {
    document.documentElement.classList.add('lw-force-reduced-motion');
  }
} catch (err) {  }

window.addEventListener('storage', (e) => {
  if (e.key !== 'lw-preferences') return;
  let on = false;
  try { on = !!JSON.parse(e.newValue || '{}').reducedMotion; } catch (err) {  }
  document.documentElement.classList.toggle('lw-force-reduced-motion', on);
});

systemSchemeQuery.addEventListener('change', () => {
  if (getThemePreference() === 'system') applyTheme('system');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggles);
} else {
  initThemeToggles();
}
