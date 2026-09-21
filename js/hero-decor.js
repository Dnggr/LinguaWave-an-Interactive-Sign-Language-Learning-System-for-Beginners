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
