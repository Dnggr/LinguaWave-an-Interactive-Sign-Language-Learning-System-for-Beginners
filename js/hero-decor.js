/* =====================================================================
 * js/hero-decor.js — Hero night-sky star field (algorithmic scatter)
 * ---------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * The dark-mode hero used to ship 20 hand-placed <span class="hero-
 * star--N"> elements with hard-coded top/left percentages in css/
 * auth.css. Every star was kept clear of the copy block and the hand
 * illustration by construction, which made the field look like two
 * rows of dots hugging the edges of the hero rather than an actual
 * sky. There's no need for that avoidance: .hero-decor sits at
 * z-index:1, strictly behind the copy/illustration's z-index:2, so a
 * star placed "under" a letter or the illustration's circle is simply
 * covered by it — nothing is ever obstructed. Stars are free to be
 * placed anywhere in the hero.
 *
 * WHAT THIS DOES
 * On load, scatters N stars across the FULL hero rectangle using
 * Poisson-disc-style "blue noise" sampling (dart-throwing with a
 * minimum-distance rejection test, in real pixel space so the
 * spacing looks even regardless of the hero's aspect ratio) — the
 * standard technique for a field that reads as random without the
 * eye catching on clumps or empty gaps, which uniform Math.random()
 * scatter tends to produce. A few stars are upgraded to the bigger
 * four-point "sparkle" glyph, and every star gets its own randomized
 * brightness (the --o custom property, read by .hero-star in css/auth.css)
 * so the field has depth. Only the four big sparkles twinkle, each on its
 * own animation delay + duration. The 2px dots used to twinkle too; that
 * was dropped in the Impeccable pass (they were flagged as pulsing status
 * dots).
 *
 * Runs once per page load regardless of the active theme (cheap, and
 * the night layer is simply display:none in light mode via css/
 * auth.css's existing [data-theme] rule) — no need to re-run on
 * theme toggle.
 * ===================================================================== */
(function () {
  const STAR_COUNT = 42; // small dots
  const BIG_STAR_COUNT = 4; // four-point "sparkle" stars
  const MIN_DIST_FACTOR = 0.55; // lower = allowed to sit closer together
  const MAX_ATTEMPTS = 40; // per-point placement retries before giving up

  const SPARKLE_PATH =
    'M12 0c.6 4.7 1.9 8 4 10.1 2.1 2.1 5.4 3.4 10.1 4-4.7.6-8 1.9-10.1 4' +
    '-2.1 2.1-3.4 5.4-4 10.1-.6-4.7-1.9-8-4-10.1-2.1-2.1-5.4-3.4-10.1-4 ' +
    '4.7-.6 8-1.9 10.1-4C10.1 8 11.4 4.7 12 0z';

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  // Dart-throwing Poisson-disc approximation: for each new point, try
  // up to MAX_ATTEMPTS random spots and keep the first one that clears
  // minDist (in px) from every point placed so far. If none of the
  // attempts clear it, place it anyway at the last attempted spot
  // (relaxing the guarantee slightly) rather than skip a star, since
  // a few closer-than-ideal pairs are far less noticeable than a
  // visibly sparse patch.
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

    // Real pixel dimensions at load time — used only to make the
    // minimum-distance check aspect-ratio-correct (a % based check
    // would under-space stars horizontally on a hero that's much
    // wider than it is tall). Final positions are stored as % so the
    // field still scales proportionally if the hero's box changes.
    const rect = hero.getBoundingClientRect();
    const w = rect.width || 1440;
    const h = rect.height || 600;
    const minDist = Math.sqrt((w * h) / (STAR_COUNT + BIG_STAR_COUNT)) * MIN_DIST_FACTOR;

    const total = STAR_COUNT + BIG_STAR_COUNT;
    const points = scatterPoints(total, w, h, minDist);

    // Spread the "big" sparkle stars evenly through the draw order
    // (rather than all at the end) so they don't cluster together in
    // whichever region dart-throwing happened to fill last.
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

/* =====================================================================
 * HERO SKY SPIN — theme-toggle "turning back the night sky" transition
 * ---------------------------------------------------------------------
 * WHY THIS FILE (not js/theme.js)
 * This file is the one script that's ONLY ever loaded on index.html —
 * every other page loads js/theme.js but not this one — so it's where
 * a hero-only enhancement belongs without touching the dozen other
 * pages that share the same #theme-toggle markup and toggleTheme()/
 * applyTheme() logic. js/theme.js itself is completely unmodified.
 *
 * WHAT THIS DOES
 * js/theme.js's own initThemeToggles() (it runs first — theme.js is
 * the earlier <script defer> in index.html's <head>) wires #theme-
 * toggle's onclick straight to toggleTheme(). This block overwrites
 * that same onclick so a click here instead: (1) plays the rotation on
 * css/auth.css's .hero-rotor — light and dark are two fixed 180° halves
 * of one disc (see that file's "HERO — BACKGROUND SPIN LAYER" comment),
 * so which class we start depends on which way we're going: currently
 * light → "is-spinning-to-dark" (0°→180°), currently dark →
 * "is-spinning-to-light" (180°→360°, i.e. the SAME clockwise direction
 * continued, never reversed), (2) calls the ORIGINAL toggleTheme()
 * partway through — at 90°/270°, the exact instant the disc's dividing
 * line is crossing the viewport — so the sun→stars swap and every
 * other themed element on the page changing color line up with the
 * sweep instead of popping at an arbitrary moment, and (3) locks the
 * button against repeat clicks until the animation finishes.
 * toggleTheme() itself is never touched, just called at a different
 * moment than theme.js's default immediate call.
 *
 * NOTE (09-29): the other pages now share a button-originated reveal
 * (js/theme.js, css/style.css §5c). index.html was reverted to THIS spin:
 * while HERO_SPIN_ENABLED is true this file marks <html> with
 * data-lw-theme-transition="off", so theme.js's toggleTheme() (called
 * mid-spin below) changes the theme instantly instead of also starting
 * the reveal. Set the flag to false to give index.html the reveal too. */
(function () {
  const HERO_SPIN_ENABLED = true;
  if (HERO_SPIN_ENABLED) document.documentElement.setAttribute('data-lw-theme-transition', 'off');

  // Kept in sync BY HAND with css/auth.css's `.hero-rotor.is-spinning-
  // to-*` rules: SPIN_MS mirrors --spin-duration, THEME_FLIP_MS is
  // timed to that animation's 50% keyframe (the dividing line's
  // crossing point, also rotation/scale's most dramatic instant) —
  // same cross-file "kept in sync" convention as js/theme.js's own
  // THEME_BG comment for --clr-bg.
  const SPIN_MS = 900;
  const THEME_FLIP_MS = Math.round(SPIN_MS * 0.5);
  const CLEANUP_BUFFER_MS = 150; // safety margin over animationend, see finishSpin()

  let isSpinning = false;
  let flipTimer = null;
  let cleanupTimer = null;
  let activeSpinClass = null; // whichever of the two classes startSpin() actually applied, so finishSpin() removes the right one
  let heroRotor = null;
  let themeToggleBtn = null;

  // Same OS + in-app check js/tour.js's own prefersReducedMotion()
  // uses. Duplicated rather than shared because tour.js isn't loaded
  // on this page — it's 3 lines, not worth wiring a shared module for.
  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lw-force-reduced-motion');
    } catch (e) {
      return false;
    }
  }

  function onSpinAnimationEnd(event) {
    if (event.target !== heroRotor) return; // not our rotation
    finishSpin();
  }

  // Un-locks the toggle and clears the spinning state. Called from
  // whichever fires first — the real animationend, or the timeout
  // safety net below — and safe to call more than once.
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
    // getCurrentTheme() is theme.js's own helper (global, see the file
    // header) — reads data-theme BEFORE we flip it, so "currently
    // light" plays the 0°→180° keyframe and "currently dark" plays
    // 180°→360°, always advancing the same clockwise direction rather
    // than rewinding back the way it came.
    const spinClass = getCurrentTheme() === 'dark' ? 'is-spinning-to-light' : 'is-spinning-to-dark';

    isSpinning = true;
    activeSpinClass = spinClass;
    themeToggleBtn.setAttribute('aria-disabled', 'true');

    // Defensive remove → reflow → re-add, in case a previous run's
    // cleanup somehow never fired — the same restart trick js/theme.js's
    // own initThemeToggles() uses before removing its no-transition
    // class, so a class that's already present still replays from 0%
    // instead of no-op'ing. Removing BOTH direction classes here
    // guards against ever having them both applied at once.
    heroRotor.classList.remove('is-spinning-to-dark', 'is-spinning-to-light');
    void heroRotor.offsetWidth;
    heroRotor.classList.add(spinClass);

    heroRotor.addEventListener('animationend', onSpinAnimationEnd);
    // Flips data-theme (and with it every themed element on the page)
    // right as the disc's dividing line crosses the viewport — see the
    // file header comment.
    flipTimer = window.setTimeout(toggleTheme, THEME_FLIP_MS);
    // Safety net: guarantees the toggle un-locks even if animationend
    // never fires for some reason (tab backgrounded mid-animation, etc).
    cleanupTimer = window.setTimeout(finishSpin, SPIN_MS + CLEANUP_BUFFER_MS);
  }

  function handleHeroThemeToggle() {
    if (isSpinning) return; // rapid repeat click mid-transition — ignore it
    if (prefersReducedMotion()) {
      toggleTheme(); // unchanged instant-ish swap, same as every other page (auth.css still gives .hero-rotor a short plain transition under reduced motion — see that file)
      return;
    }
    startSpin();
  }

  function initHeroThemeSpin() {
    if (!HERO_SPIN_ENABLED) return; // when off, theme.js's own button-originated transition handles #theme-toggle
    heroRotor = document.querySelector('.hero-rotor');
    themeToggleBtn = document.getElementById('theme-toggle');
    if (!heroRotor || !themeToggleBtn) return; // defensive — both always exist on index.html

    // Overrides js/theme.js's own `btn.onclick = toggleTheme`, set
    // moments earlier in initThemeToggles() (theme.js is the earlier
    // deferred <script>, so it always runs first) — same button, same
    // eventual toggleTheme() call, just gated behind the spin above.
    themeToggleBtn.onclick = handleHeroThemeToggle;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroThemeSpin);
  } else {
    initHeroThemeSpin();
  }
})();
