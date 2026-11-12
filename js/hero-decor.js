(function () {
  const STAR_COUNT = 42;
  const BIG_STAR_COUNT = 4;
  const MIN_DIST_FACTOR = 0.55;
  const MAX_ATTEMPTS = 40;

  const SPARKLE_PATH =
    'M12 0c.6 4.7 1.9 8 4 10.1 2.1 2.1 5.4 3.4 10.1 4-4.7.6-8 1.9-10.1 4' +
    '-2.1 2.1-3.4 5.4-4 10.1-.6-4.7-1.9-8-4-10.1-2.1-2.1-5.4-3.4-10.1-4 ' +
    '4.7-.6 8-1.9 10.1-4C10.1 8 11.4 4.7 12 0z';

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function scatterPoints(count, widthPx, heightPx, minDist) {
    const points = [];
    for (let i = 0; i < count; i++) {
      let candidate = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const x = Math.random() * widthPx;
        const y = Math.random() * heightPx;
        const clear = points.every((p) => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) >= minDist;
        });
        candidate = { x, y };
        if (clear) break;
      }
      points.push(candidate);
    }
    return points;
  }

  function buildStar(xPct, yPct, isBig) {
    const el = document.createElement(isBig ? 'span' : 'span');
    el.className = 'hero-star' + (isBig ? ' hero-star--big' : '');
    el.style.left = xPct.toFixed(2) + '%';
    el.style.top = yPct.toFixed(2) + '%';
    el.style.setProperty('--o', (isBig ? randBetween(0.75, 1) : randBetween(0.3, 0.95)).toFixed(2));

    if (isBig) {
      const size = randBetween(13, 19);
      el.style.animationDelay = randBetween(0, 3).toFixed(2) + 's';
      el.style.animationDuration = randBetween(3.2, 4.8).toFixed(2) + 's';
      el.style.width = size.toFixed(1) + 'px';
      el.style.height = size.toFixed(1) + 'px';
      el.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="' +
        SPARKLE_PATH +
        '"/></svg>';
    } else {
      const size = randBetween(1.5, 3.4);
      el.style.width = size.toFixed(1) + 'px';
      el.style.height = size.toFixed(1) + 'px';
    }
    return el;
  }

  function populateStarField() {
    const field = document.querySelector('.hero-decor--night');
    const hero = document.querySelector('.hero--wave');
    if (!field || !hero) return;

    const rect = hero.getBoundingClientRect();
    const w = rect.width || 1440;
    const h = rect.height || 600;
    const minDist = Math.sqrt((w * h) / (STAR_COUNT + BIG_STAR_COUNT)) * MIN_DIST_FACTOR;

    const total = STAR_COUNT + BIG_STAR_COUNT;
    const points = scatterPoints(total, w, h, minDist);

    const bigEvery = Math.floor(total / BIG_STAR_COUNT);
    const frag = document.createDocumentFragment();
    points.forEach((p, i) => {
      const isBig = BIG_STAR_COUNT > 0 && i % bigEvery === 0 && i / bigEvery < BIG_STAR_COUNT;
      frag.appendChild(buildStar((p.x / w) * 100, (p.y / h) * 100, isBig));
    });
    field.appendChild(frag);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateStarField);
  } else {
    populateStarField();
  }
})();

(function () {
  const HERO_SPIN_ENABLED = true;
  if (HERO_SPIN_ENABLED) document.documentElement.setAttribute('data-lw-theme-transition', 'off');

  const SPIN_MS = 900;
  const THEME_FLIP_MS = Math.round(SPIN_MS * 0.5);
  const CLEANUP_BUFFER_MS = 150;

  let isSpinning = false;
  let flipTimer = null;
  let cleanupTimer = null;
  let activeSpinClass = null;
  let heroRotor = null;
  let themeToggleBtn = null;

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lw-force-reduced-motion');
    } catch (e) {
      return false;
    }
  }

  function onSpinAnimationEnd(event) {
    if (event.target !== heroRotor) return;
    finishSpin();
  }

  function finishSpin() {
    if (!isSpinning) return;
    isSpinning = false;
    if (activeSpinClass) heroRotor.classList.remove(activeSpinClass);
    activeSpinClass = null;
    themeToggleBtn.removeAttribute('aria-disabled');
    heroRotor.removeEventListener('animationend', onSpinAnimationEnd);
    window.clearTimeout(flipTimer);
    window.clearTimeout(cleanupTimer);
  }

  function startSpin() {
    const spinClass = getCurrentTheme() === 'dark' ? 'is-spinning-to-light' : 'is-spinning-to-dark';

    isSpinning = true;
    activeSpinClass = spinClass;
    themeToggleBtn.setAttribute('aria-disabled', 'true');

    heroRotor.classList.remove('is-spinning-to-dark', 'is-spinning-to-light');
    void heroRotor.offsetWidth;
    heroRotor.classList.add(spinClass);

    heroRotor.addEventListener('animationend', onSpinAnimationEnd);
    flipTimer = window.setTimeout(toggleTheme, THEME_FLIP_MS);
    cleanupTimer = window.setTimeout(finishSpin, SPIN_MS + CLEANUP_BUFFER_MS);
  }

  function handleHeroThemeToggle() {
    if (isSpinning) return;
    if (prefersReducedMotion()) {
      toggleTheme();
      return;
    }
    startSpin();
  }

  function initHeroThemeSpin() {
    if (!HERO_SPIN_ENABLED) return;
    heroRotor = document.querySelector('.hero-rotor');
    themeToggleBtn = document.getElementById('theme-toggle');
    if (!heroRotor || !themeToggleBtn) return;

    themeToggleBtn.onclick = handleHeroThemeToggle;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroThemeSpin);
  } else {
    initHeroThemeSpin();
  }
})();
