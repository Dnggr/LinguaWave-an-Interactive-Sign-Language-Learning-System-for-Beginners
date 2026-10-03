/* ────────────────────────────────────────────────────────────────────
 * js/banner-shader.js — interactive "fluid pastels" backdrop for the
 * Today's Mission banner (pages/dashboard.html).
 *
 * WHAT IT DOES
 *   A slow, soft, domain-warped violet/periwinkle flow (palette sampled
 *   from shaders.com's Fluid Pastels 1 preview) that behaves like water
 *   under your cursor:
 *     - hovering rests a "fingertip" on the surface: the liquid bulges
 *       around the pointer and a faint ring pulses out of it
 *     - moving leaves a wake: expanding ripple rings that fade out, and
 *       the colour field is dragged along the direction of travel
 *     - clicking / tapping drops a bigger splash
 *   Plain WebGL1, no npm package, no bundler, no network request.
 *   All ripple maths lives in the fragment shader: the last few pointer
 *   "drops" (position, birth time, strength, velocity) are uniforms, so
 *   no float textures or extensions are needed.
 *
 * HOW IT HOOKS IN
 *   Self-mounting. js/dashboard.js rebuilds #mission-banner with
 *   `innerHTML = ...` (first paint AND after the Firestore reconcile),
 *   which would wipe a canvas placed inside it. So this file keeps ONE
 *   canvas + WebGL context alive in memory and a MutationObserver
 *   re-inserts the same canvas whenever the banner is re-rendered.
 *   Pointer listeners sit on the banner element itself (it is never
 *   replaced, only its children are), and the canvas is pointer-events:
 *   none, so the Start Mission button and text stay fully clickable.
 *   dashboard.js needs no change.
 *
 * ACCESSIBILITY / SAFETY
 *   - TWO THEMES, TWO LOOKS (css/dashboard.css owns the matching text
 *     colours through the --mb-* tokens):
 *       dark  : deep indigo/violet liquid, WHITE text. Output luminance
 *               is CAPPED (<= .175 behind text => >= 4.5:1 vs white,
 *               <= .28 behind the hand art => >= 3:1).
 *       light : airy lavender / sky / rose / baby-blue pastels, DARK
 *               indigo text. Output luminance is FLOORED (>= .46 behind
 *               text => >= 5:1 vs #312E81, >= .30 behind the art).
 *     The guard runs AFTER the ripples, so no ripple can ever push the
 *     background past the limit and hurt the text.
 *   - prefers-reduced-motion (or the app's own .lw-force-reduced-motion
 *     class, set from lw-preferences) renders ONE still frame: no loop
 *     and no pointer interaction.
 *   - Loop pauses while the tab is hidden or the banner is off-screen.
 *     ~30fps while idle, ~60fps only while ripples are alive.
 *   - Touch = hover. A finger resting on the banner is the "fingertip" a
 *     mouse cursor would be. Page scrolling is never blocked by default:
 *       * a quick swipe past the banner scrolls the page as normal;
 *       * a sideways drag (touch-action: pan-y in CSS) drags the ripples;
 *       * press-and-hold ~180ms without moving "grabs" the water: from then
 *         on touchmove is preventDefault-ed so the finger can wander in
 *         any direction without the page scrolling away from under it.
 *     A drag that started a grab does not trigger the Start Mission link
 *     when the finger lifts over it, and the long-press callout / context
 *     menu is suppressed on touch only (desktop right-click is untouched).
 *   - No WebGL / context failure => canvas is never shown and the
 *     existing CSS gradient on .mission-banner is what the user sees.
 *   - Base colours follow --mb-from / --mb-to (falls back to
 *     --banner-from / --banner-to), so CSS and shader never disagree.
 * ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var BANNER_ID = 'mission-banner';
  var FRAME_IDLE_MS = 33;     // ~30fps is plenty for the slow flow
  var FRAME_ACTIVE_MS = 14;   // ~60fps while ripples are alive
  var RENDER_SCALE = 0.5;     // soft gradients: half-res looks identical
  var STILL_TIME = 14.0;      // which moment of the flow the still frame shows
  var NARROW_PX = 640;        // matches the banner's mobile breakpoint in dashboard.css

  // Interaction tuning
  var DROP_LIFE_S = 3.0;      // seconds a ripple lives (must match LIFE in the shader)
  var DROP_EVERY_PX = 12;     // new ripple after the pointer moved this far...
  var DROP_EVERY_MS = 26;     // ...and at least this long since the last one
  var MAX_DROPS = 12;         // ring buffer size (lowered automatically on weak GPUs)

  // Touch tuning
  var HOLD_MS = 180;          // press this long without moving => grab the water (page stops scrolling)
  var SLOP_PX = 10;           // finger travel that counts as "a drag", not a tap / jitter
  var CLICK_GUARD_MS = 450;   // swallow the synthetic click right after a grab-drag

  // DARK: Fluid Pastels 1 palette (sampled from the preview) — indigo-violet
  // base with lavender and blue-grey patches. sRGB 0..1.
  var PALETTE_DARK = [
    [0.376, 0.345, 0.718],   // #6058B7  deep violet (dominant)
    [0.486, 0.463, 0.745],   // #7C76BE  soft lavender
    [0.498, 0.529, 0.773],   // #7F87C5  periwinkle blue-grey
    [0.431, 0.400, 0.741],   // #6E66BD  mid violet
    [0.560, 0.500, 0.820]    // #8F80D1  light orchid
  ];

  // LIGHT: the same family lifted into true pastels — milky lavender, sky,
  // orchid, baby blue and a touch of rose.
  var PALETTE_LIGHT = [
    [0.812, 0.765, 0.980],   // #CFC3FA  lavender
    [0.737, 0.816, 0.984],   // #BCD0FB  periwinkle sky
    [0.890, 0.788, 0.961],   // #E3C9F5  orchid
    [0.761, 0.890, 0.980],   // #C2E3FA  baby blue
    [0.961, 0.804, 0.902]    // #F5CDE6  rose
  ];

  // Per-theme look. cap/floor = relative-luminance guard (see header).
  var LOOK = {
    dark:  { strength: 0.78, gain: 0.78, sheen: 0.07, textCap: 0.175, textFloor: 0.0,  artCap: 0.28, artFloor: 0.0,  palette: PALETTE_DARK },
    light: { strength: 0.86, gain: 1.00, sheen: 0.11, textCap: 0.92,  textFloor: 0.46, artCap: 0.92, artFloor: 0.30, palette: PALETTE_LIGHT }
  };

  var VERT =
    'attribute vec2 aPos;\n' +
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n';

  // MAXPTS / LIFE are #defined in front of this at build time.
  var FRAG =
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\n' +
    'precision highp float;\n' +
    '#else\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform vec2  uRes;\n' +
    'uniform float uTime;\n' +
    'uniform float uNarrow;\n' +
    'uniform float uStrength;\n' +
    'uniform float uGain;\n' +
    'uniform float uSheen;\n' +
    'uniform float uTextCap;\n' +
    'uniform float uTextFloor;\n' +
    'uniform float uArtCap;\n' +
    'uniform float uArtFloor;\n' +
    'uniform vec3  uBase1;\n' +
    'uniform vec3  uBase2;\n' +
    'uniform vec3  uP0; uniform vec3 uP1; uniform vec3 uP2; uniform vec3 uP3; uniform vec3 uP4;\n' +
    'uniform vec4  uPts[MAXPTS];   // x,y (0..1, y up), birth time, strength\n' +
    'uniform vec4  uVel[MAXPTS];   // xy = direction * speed\n' +
    'uniform vec4  uPtr;           // x,y of the resting fingertip, z = presence 0..1\n' +
    '\n' +
    'float hash(vec2 p){\n' +
    '  p = fract(p * vec2(123.34, 456.21));\n' +
    '  p += dot(p, p + 45.32);\n' +
    '  return fract(p.x * p.y);\n' +
    '}\n' +
    'float noise(vec2 p){\n' +
    '  vec2 i = floor(p);\n' +
    '  vec2 f = fract(p);\n' +
    '  f = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),\n' +
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);\n' +
    '}\n' +
    'float fbm(vec2 p){\n' +
    '  float v = 0.0;\n' +
    '  float a = 0.5;\n' +
    '  for (int i = 0; i < 3; i++){\n' +
    '    v += a * noise(p);\n' +
    '    p = p * 1.9 + vec2(17.1, 9.7);\n' +
    '    a *= 0.42;\n' +
    '  }\n' +
    '  return v;\n' +
    '}\n' +
    '\n' +
    'void main(){\n' +
    '  vec2 uv = gl_FragCoord.xy / uRes;          // 0..1, y up\n' +
    '  float aspect = uRes.x / uRes.y;\n' +
    '  vec2 uvA = vec2(uv.x * aspect, uv.y);      // aspect-corrected: 1 unit = banner height\n' +
    '\n' +
    '  // ── water: sum every live ripple into a displacement + a height ──\n' +
    '  vec2 disp = vec2(0.0);\n' +
    '  float h = 0.0;\n' +
    '  for (int i = 0; i < MAXPTS; i++){\n' +
    '    vec4 pt = uPts[i];\n' +
    '    float age = uTime - pt.z;\n' +
    '    if (pt.w > 0.0 && age >= 0.0 && age < LIFE){\n' +
    '      vec2 d = uvA - vec2(pt.x * aspect, pt.y);\n' +
    '      float r = length(d);\n' +
    '      vec2 nd = d / max(r, 0.0001);\n' +
    '      float fade = pt.w * exp(-age * 1.45) * (1.0 - smoothstep(LIFE - 0.6, LIFE, age));\n' +
    '      float e = (r - age * 0.40) * 5.5;      // ring front travels outward\n' +
    '      float wave = sin((r - age * 0.40) * 30.0) * exp(-e * e);\n' +
    '      float bump = exp(-r * r * 55.0) * exp(-age * 2.4);\n' +
    '      h += (wave * 0.85 + bump) * fade;\n' +
    '      disp += nd * (wave * 0.050 + bump * 0.060) * fade;\n' +
    '      // drag the liquid along the direction the pointer was travelling\n' +
    '      disp += uVel[i].xy * exp(-r * r * 12.0) * exp(-age * 1.7) * pt.w * 0.11;\n' +
    '    }\n' +
    '  }\n' +
    '  // resting fingertip: a gentle lens + a slow pulsing ring\n' +
    '  vec2 dp = uvA - vec2(uPtr.x * aspect, uPtr.y);\n' +
    '  float rp = length(dp);\n' +
    '  vec2 np = dp / max(rp, 0.0001);\n' +
    '  float dip = exp(-rp * rp * 22.0) * uPtr.z;\n' +
    '  float ring = sin(rp * 34.0 - uTime * 4.2) * exp(-rp * 4.5) * uPtr.z;\n' +
    '  h += dip * 0.9 + ring * 0.35;\n' +
    '  disp += np * (dip * 0.055 + ring * 0.012);\n' +
    '\n' +
    '  vec2 p = (uvA - disp) * 0.78;\n' +
    '  float t = uTime * 0.055;\n' +
    '\n' +
    '  // two-level domain warp = the slow "liquid" look\n' +
    '  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));\n' +
    '  vec2 r2 = vec2(fbm(p + 1.6 * q + vec2(1.7, 9.2) + t * 1.3),\n' +
    '                 fbm(p + 1.6 * q + vec2(8.3, 2.8) - t * 1.1));\n' +
    '  float f = fbm(p + 1.6 * r2);\n' +
    '\n' +
    '  // walk the pastel ramp with the warped field (ripples shift the ramp = colour ripples)\n' +
    '  float k = clamp(f * 1.45 + h * 0.20, 0.0, 1.0) * 4.0;\n' +
    '  vec3 pastel = mix(uP0, uP1, smoothstep(0.0, 1.0, k));\n' +
    '  pastel = mix(pastel, uP2, smoothstep(1.0, 2.0, k));\n' +
    '  pastel = mix(pastel, uP3, smoothstep(2.0, 3.0, k));\n' +
    '  pastel = mix(pastel, uP4, smoothstep(3.0, 4.0, k));\n' +
    '  pastel *= uGain;\n' +
    '\n' +
    '  // the banner\'s own 135deg gradient is the base, pastels flow over it\n' +
    '  vec3 base = mix(uBase1, uBase2, clamp((uv.x + (1.0 - uv.y)) * 0.5, 0.0, 1.0));\n' +
    '  float xm = smoothstep(0.45, 0.80, uv.x) * (1.0 - uNarrow);   // 0 = text side, 1 = art side\n' +
    '  float s = uStrength * mix(0.80, 1.0, xm) * (0.80 + 0.35 * r2.x);\n' +
    '  vec3 col = mix(base, pastel, clamp(s, 0.0, 1.0));\n' +
    '\n' +
    '  // water sheen: crests catch a little light, troughs a little shade\n' +
    '  col += vec3(0.55, 0.55, 0.75) * clamp(h, -1.0, 1.0) * uSheen;\n' +
    '\n' +
    '  // AA guard (approx. linear light): CAP luminance for white text (dark theme),\n' +
    '  // FLOOR it for dark text (light theme). Runs after the ripples.\n' +
    '  vec3 lin = pow(max(col, vec3(0.0)), vec3(2.2));\n' +
    '  float L = dot(lin, vec3(0.2126, 0.7152, 0.0722));\n' +
    '  float cap = mix(uTextCap, uArtCap, xm);\n' +
    '  float flo = mix(uTextFloor, uArtFloor, xm);\n' +
    '  if (L > cap) lin *= cap / L;\n' +
    '  else if (L < flo) lin += (vec3(1.0) - lin) * ((flo - L) / max(1.0 - L, 0.0001));\n' +
    '  col = pow(lin, vec3(1.0 / 2.2));\n' +
    '\n' +
    '  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;   // kill banding\n' +
    '  gl_FragColor = vec4(col, 1.0);\n' +
    '}\n';

  var S = {
    canvas: null,
    gl: null,
    prog: null,
    u: null,
    banner: null,
    ok: false,
    lost: false,
    raf: 0,
    last: 0,
    t0: 0,
    inView: true,
    reduced: false,
    maxDrops: MAX_DROPS,
    interactive: false,
    lastActive: -1e9,        // performance.now() of the last pointer activity
    colors: { b1: [0.145, 0.388, 0.922], b2: [0.114, 0.306, 0.847] },
    look: LOOK.dark,
    cssW: 0,
    cssH: 0
  };

  // pointer / ripple state
  var P = {
    pts: null,               // Float32Array(maxDrops*4): x, y, birth(s), strength
    vel: null,               // Float32Array(maxDrops*4): vx, vy, 0, 0
    head: 0,
    hovering: false,
    tx: 0.5, ty: 0.5,        // target (latest pointer position, 0..1, y up)
    x: 0.5, y: 0.5,          // smoothed position used by the shader
    pres: 0,                 // smoothed presence 0..1
    lastCX: 0, lastCY: 0,    // last drop position in client px
    lastDropMs: 0,
    lastDrawMs: 0
  };

  // touch gesture state (one finger; extra fingers are ignored)
  var T = {
    id: null,                // pointerId of the finger we are following
    down: false,
    engaged: false,          // true once the finger has "grabbed" the water
    timer: 0,
    sx: 0, sy: 0,            // where the finger landed (client px)
    dragged: false,          // travelled further than SLOP_PX
    clickBlockUntil: 0,      // performance.now() until which clicks are swallowed
    lastWasTouch: false
  };

  /* ── helpers ──────────────────────────────────────────────────── */
  function prefersReduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lw-force-reduced-motion');
    } catch (e) { return false; }
  }

  // '#RGB' | '#RRGGBB' | 'rgb(r, g, b)' -> [r,g,b] in 0..1, or fallback
  function parseColor(str, fallback) {
    str = (str || '').trim();
    var m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(str))) {
      return [parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255];
    }
    if ((m = /^#([0-9a-f]{3})$/i.exec(str))) {
      return [parseInt(m[1][0] + m[1][0], 16) / 255, parseInt(m[1][1] + m[1][1], 16) / 255, parseInt(m[1][2] + m[1][2], 16) / 255];
    }
    if ((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(str))) {
      return [m[1] / 255, m[2] / 255, m[3] / 255];
    }
    return fallback;
  }

  function readTheme() {
    var cs = getComputedStyle(S.banner || document.documentElement);
    // --mb-from/--mb-to are the banner's own tokens (css/dashboard.css); they
    // resolve to --banner-from/--banner-to in dark and to pastels in light.
    S.colors.b1 = parseColor(cs.getPropertyValue('--mb-from') || cs.getPropertyValue('--banner-from'), S.colors.b1);
    S.colors.b2 = parseColor(cs.getPropertyValue('--mb-to') || cs.getPropertyValue('--banner-to'), S.colors.b2);
    // Only an explicit data-theme="light" gets the light look — it must stay in
    // lock-step with the CSS selectors that switch the text to dark ink.
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    S.look = light ? LOOK.light : LOOK.dark;
  }

  function timeAt(now) {
    return STILL_TIME + (now - S.t0) / 1000;
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[banner-shader] shader compile failed:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function build() {
    var gl = S.gl;
    var header = '#define MAXPTS ' + S.maxDrops + '\n#define LIFE ' + DROP_LIFE_S.toFixed(1) + '\n';
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, header + FRAG);
    if (!vs || !fs) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[banner-shader] link failed:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var names = ['uRes', 'uTime', 'uNarrow', 'uStrength', 'uGain', 'uSheen', 'uTextCap', 'uTextFloor', 'uArtCap', 'uArtFloor', 'uBase1', 'uBase2',
                 'uP0', 'uP1', 'uP2', 'uP3', 'uP4', 'uPts', 'uVel', 'uPtr'];
    S.u = {};
    for (var i = 0; i < names.length; i++) S.u[names[i]] = gl.getUniformLocation(prog, names[i]);

    S.prog = prog;
    return true;
  }

  function resize() {
    if (!S.banner || !S.canvas) return;
    var r = S.banner.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * RENDER_SCALE));
    var h = Math.max(1, Math.round(r.height * RENDER_SCALE));
    S.cssW = r.width;
    S.cssH = r.height;
    if (S.canvas.width !== w || S.canvas.height !== h) {
      S.canvas.width = w;
      S.canvas.height = h;
    }
  }

  function isActive(now) {
    return P.pres > 0.01 || (now - S.lastActive) < DROP_LIFE_S * 1000;
  }

  function draw(now) {
    if (!S.ok || S.lost || !S.gl || !S.prog) return;
    var gl = S.gl;

    // ease the resting fingertip toward the pointer (frame-rate independent)
    var dt = Math.min(0.1, Math.max(0, (now - P.lastDrawMs) / 1000));
    P.lastDrawMs = now;
    var target = P.hovering && S.interactive && !S.reduced ? 1 : 0;
    var kPos = 1 - Math.exp(-dt * 12);
    var kPres = 1 - Math.exp(-dt * (target > P.pres ? 8 : 3.5));
    P.x += (P.tx - P.x) * kPos;
    P.y += (P.ty - P.y) * kPos;
    P.pres += (target - P.pres) * kPres;
    if (P.pres < 0.002 && target === 0) P.pres = 0;

    var time = S.reduced ? STILL_TIME : timeAt(now);
    gl.viewport(0, 0, S.canvas.width, S.canvas.height);
    gl.uniform2f(S.u.uRes, S.canvas.width, S.canvas.height);
    gl.uniform1f(S.u.uTime, time);
    gl.uniform1f(S.u.uNarrow, S.cssW > 0 && S.cssW <= NARROW_PX ? 1 : 0);
    var L = S.look;
    gl.uniform1f(S.u.uStrength, L.strength);
    gl.uniform1f(S.u.uGain, L.gain);
    gl.uniform1f(S.u.uSheen, L.sheen);
    gl.uniform1f(S.u.uTextCap, L.textCap);
    gl.uniform1f(S.u.uTextFloor, L.textFloor);
    gl.uniform1f(S.u.uArtCap, L.artCap);
    gl.uniform1f(S.u.uArtFloor, L.artFloor);
    for (var pi = 0; pi < 5; pi++) gl.uniform3fv(S.u['uP' + pi], L.palette[pi]);
    gl.uniform3fv(S.u.uBase1, S.colors.b1);
    gl.uniform3fv(S.u.uBase2, S.colors.b2);
    gl.uniform4fv(S.u.uPts, P.pts);
    gl.uniform4fv(S.u.uVel, P.vel);
    gl.uniform4f(S.u.uPtr, P.x, P.y, P.pres, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    S.canvas.classList.add('is-ready');
  }

  /* ── animation control ────────────────────────────────────────── */
  function shouldRun() {
    return S.ok && !S.lost && !S.reduced && S.inView && document.visibilityState !== 'hidden' &&
      S.canvas && S.canvas.parentNode === S.banner;
  }

  function frame(now) {
    S.raf = 0;
    if (!shouldRun()) return;
    if (now - S.last >= (isActive(now) ? FRAME_ACTIVE_MS : FRAME_IDLE_MS)) {
      S.last = now;
      draw(now);
    }
    S.raf = requestAnimationFrame(frame);
  }

  function sync() {
    // (re)start or stop the loop to match the current conditions
    S.reduced = prefersReduced();
    if (shouldRun()) {
      if (!S.raf) S.raf = requestAnimationFrame(frame);
    } else {
      if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
      if (S.ok && S.reduced && S.canvas && S.canvas.parentNode === S.banner) {
        resize();
        draw(performance.now());   // single still frame
      }
    }
  }

  /* ── pointer -> water ─────────────────────────────────────────── */
  function addDrop(x, y, vx, vy, strength, now) {
    var i = P.head * 4;
    P.pts[i] = x;
    P.pts[i + 1] = y;
    P.pts[i + 2] = timeAt(now);
    P.pts[i + 3] = strength;
    P.vel[i] = vx;
    P.vel[i + 1] = vy;
    P.head = (P.head + 1) % S.maxDrops;
    S.lastActive = now;
  }

  function pointerUV(e) {
    var r = S.banner.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)),
      h: r.height
    };
  }

  function onEnter(e) {
    if (!S.interactive || S.reduced) return;
    if (e.pointerType !== 'touch') T.lastWasTouch = false;
    var q = pointerUV(e);
    if (!q) return;
    P.hovering = true;
    P.tx = P.x = q.x;          // appear under the cursor instead of sliding in from old coords
    P.ty = P.y = q.y;
    P.lastCX = e.clientX;
    P.lastCY = e.clientY;
    P.lastDropMs = performance.now();
    S.lastActive = P.lastDropMs;
    sync();
  }

  function onMove(e) {
    if (!S.interactive || S.reduced) return;
    if (e.pointerType === 'touch') touchTrack(e);
    var q = pointerUV(e);
    if (!q) return;
    var now = performance.now();
    if (!P.hovering) onEnter(e);
    P.tx = q.x;
    P.ty = q.y;
    S.lastActive = now;

    var dx = e.clientX - P.lastCX;
    var dy = e.clientY - P.lastCY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var since = now - P.lastDropMs;
    if (dist >= DROP_EVERY_PX && since >= DROP_EVERY_MS) {
      var speed = dist / Math.max(since, 1);                  // px per ms
      var strength = Math.min(1, 0.35 + speed * 0.40);        // faster hand = bigger wake
      var mag = Math.min(1, Math.max(0.2, speed * 0.55));
      // shader units: x, y(up) in banner-height units, so a unit direction is enough
      addDrop(q.x, q.y, (dx / dist) * mag, (-dy / dist) * mag, strength, now);
      P.lastCX = e.clientX;
      P.lastCY = e.clientY;
      P.lastDropMs = now;
    }
    if (!S.raf) sync();
  }

  function onDown(e) {
    if (!S.interactive || S.reduced) return;
    var q = pointerUV(e);
    if (!q) return;
    var now = performance.now();
    P.hovering = true;
    P.tx = P.x = q.x;
    P.ty = P.y = q.y;
    P.lastCX = e.clientX;
    P.lastCY = e.clientY;
    P.lastDropMs = now;
    addDrop(q.x, q.y, 0, 0, 1.5, now);                        // splash
    if (e.pointerType === 'touch') touchStart(e);
    if (!S.raf) sync();
  }

  function onLeave() {
    P.hovering = false;
    touchReset();
  }

  /* ── touch: finger = hover ────────────────────────────────────── */
  function touchReset() {
    if (T.timer) { clearTimeout(T.timer); T.timer = 0; }
    T.id = null;
    T.down = false;
    T.engaged = false;
  }

  function touchStart(e) {
    if (T.down) return;                       // already following a finger
    T.lastWasTouch = true;
    T.id = e.pointerId;
    T.down = true;
    T.engaged = false;
    T.dragged = false;
    T.sx = e.clientX;
    T.sy = e.clientY;
    if (T.timer) clearTimeout(T.timer);
    T.timer = setTimeout(function () {
      T.timer = 0;
      // still down and not scrolling/dragging => grab the water
      if (T.down && !T.dragged) T.engaged = true;
    }, HOLD_MS);
  }

  function touchTrack(e) {
    if (!T.down || e.pointerId !== T.id) return;
    var dx = e.clientX - T.sx;
    var dy = e.clientY - T.sy;
    if (!T.dragged && (dx * dx + dy * dy) > SLOP_PX * SLOP_PX) {
      T.dragged = true;
      if (!T.engaged) {
        if (T.timer) { clearTimeout(T.timer); T.timer = 0; }
        // a mostly-sideways drag is "playing with the water" — lock it in
        // so a little vertical wobble can't hand the gesture to the scroller
        if (Math.abs(dx) > Math.abs(dy)) T.engaged = true;
        // mostly-vertical = the user wants to scroll: leave it to the browser
      }
    }
  }

  function onUp(e) {
    if (e.pointerType !== 'touch' || e.pointerId !== T.id) return;
    if (T.engaged && T.dragged) T.clickBlockUntil = performance.now() + CLICK_GUARD_MS;
    touchReset();
  }

  // NON-passive on purpose: this is the one place we may stop a scroll, and
  // only while the finger has grabbed the water.
  function onTouchMove(e) {
    if (T.engaged && e.cancelable) e.preventDefault();
  }

  function onClickCapture(e) {
    if (performance.now() < T.clickBlockUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onContextMenu(e) {
    // long-press on touch would pop a context menu / link preview over the ripples
    if (T.lastWasTouch && (T.down || performance.now() < T.clickBlockUntil + 800)) e.preventDefault();
  }

  /* ── mounting ─────────────────────────────────────────────────── */
  function ensureAttached() {
    var b = S.banner;
    if (!b) return;
    // Don't paint behind the "no live missions" / "loading failed" messages.
    if (!b.querySelector('.mission-banner__text')) return;
    if (S.canvas.parentNode !== b || b.firstChild !== S.canvas) {
      b.insertBefore(S.canvas, b.firstChild);   // same canvas element => same GL context
      resize();
      readTheme();
      draw(performance.now());
      sync();
    }
  }

  function init() {
    var banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    S.banner = banner;

    var canvas = document.createElement('canvas');
    canvas.className = 'mission-banner__shader';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');

    var gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return;   // CSS gradient fallback — nothing else to do

    S.canvas = canvas;
    S.gl = gl;
    S.reduced = prefersReduced();
    S.t0 = performance.now();

    // The spec only guarantees 16 fragment uniform vectors. We need ~14 for
    // the flow + 2 per ripple; shrink the ripple buffer on weak GPUs, and
    // turn interaction off (flow only) if there is no room for at least 3.
    var vecs = 16;
    try { vecs = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 16; } catch (e) { /* keep 16 */ }
    S.maxDrops = Math.max(1, Math.min(MAX_DROPS, Math.floor((vecs - 14) / 2)));
    S.interactive = S.maxDrops >= 3;
    P.pts = new Float32Array(S.maxDrops * 4);
    P.vel = new Float32Array(S.maxDrops * 4);

    if (!build()) return;
    S.ok = true;
    readTheme();

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      S.lost = true;
      canvas.classList.remove('is-ready');
      sync();
    }, false);
    canvas.addEventListener('webglcontextrestored', function () {
      S.lost = false;
      S.ok = build();
      sync();
      draw(performance.now());
    }, false);

    // dashboard.js replaces the banner's children with innerHTML — put the canvas back
    new MutationObserver(ensureAttached).observe(banner, { childList: true });

    // Pointer events on the banner itself (it survives re-renders). The pointer
    // listeners are passive; the only preventDefault is in onTouchMove, and only
    // after a press-and-hold / sideways drag has grabbed the water.
    if (S.interactive && 'PointerEvent' in window) {
      banner.addEventListener('pointerenter', onEnter, { passive: true });
      banner.addEventListener('pointermove', onMove, { passive: true });
      banner.addEventListener('pointerdown', onDown, { passive: true });
      banner.addEventListener('pointerup', onUp, { passive: true });
      banner.addEventListener('pointerleave', onLeave, { passive: true });
      banner.addEventListener('pointercancel', onLeave, { passive: true });
      // touch only: scroll-lock while grabbing, no stray taps after a drag, no long-press menu
      banner.addEventListener('touchmove', onTouchMove, { passive: false });
      banner.addEventListener('click', onClickCapture, true);
      banner.addEventListener('contextmenu', onContextMenu);
    } else {
      S.interactive = false;
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resize(); if (S.reduced) sync(); }).observe(banner);
    } else {
      window.addEventListener('resize', function () { resize(); if (S.reduced) sync(); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        S.inView = entries[entries.length - 1].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(banner);
    }

    document.addEventListener('visibilitychange', sync);

    // light <-> dark: data-theme on <html> swaps --banner-from/to
    new MutationObserver(function () {
      readTheme();
      if (S.reduced) sync(); else draw(performance.now());
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    try {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', sync);
    } catch (e) { /* older browsers: the initial check still applies */ }

    ensureAttached();   // banner may already be rendered
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
