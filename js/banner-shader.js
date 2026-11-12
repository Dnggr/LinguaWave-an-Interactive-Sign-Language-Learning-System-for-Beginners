(function () {
  'use strict';

  var BANNER_ID = 'mission-banner';
  var FRAME_IDLE_MS = 33;
  var FRAME_ACTIVE_MS = 14;
  var RENDER_SCALE = 0.5;
  var STILL_TIME = 14.0;
  var NARROW_PX = 640;

  var DROP_LIFE_S = 3.0;
  var DROP_EVERY_PX = 12;
  var DROP_EVERY_MS = 26;
  var MAX_DROPS = 12;

  var HOLD_MS = 180;
  var SLOP_PX = 10;
  var CLICK_GUARD_MS = 450;

  var PALETTE_DARK = [
    [0.376, 0.345, 0.718],
    [0.486, 0.463, 0.745],
    [0.498, 0.529, 0.773],
    [0.431, 0.400, 0.741],
    [0.560, 0.500, 0.820]
  ];

  var PALETTE_LIGHT = [
    [0.812, 0.765, 0.980],
    [0.737, 0.816, 0.984],
    [0.890, 0.788, 0.961],
    [0.761, 0.890, 0.980],
    [0.961, 0.804, 0.902]
  ];

  var LOOK = {
    dark:  { strength: 0.78, gain: 0.78, sheen: 0.07, textCap: 0.175, textFloor: 0.0,  artCap: 0.28, artFloor: 0.0,  palette: PALETTE_DARK },
    light: { strength: 0.86, gain: 1.00, sheen: 0.11, textCap: 0.92,  textFloor: 0.46, artCap: 0.92, artFloor: 0.30, palette: PALETTE_LIGHT }
  };

  var VERT =
    'attribute vec2 aPos;\n' +
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n';

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
    lastActive: -1e9,
    colors: { b1: [0.145, 0.388, 0.922], b2: [0.114, 0.306, 0.847] },
    look: LOOK.dark,
    cssW: 0,
    cssH: 0
  };

  var P = {
    pts: null,
    vel: null,
    head: 0,
    hovering: false,
    tx: 0.5, ty: 0.5,
    x: 0.5, y: 0.5,
    pres: 0,
    lastCX: 0, lastCY: 0,
    lastDropMs: 0,
    lastDrawMs: 0
  };

  var T = {
    id: null,
    down: false,
    engaged: false,
    timer: 0,
    sx: 0, sy: 0,
    dragged: false,
    clickBlockUntil: 0,
    lastWasTouch: false
  };

  function prefersReduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('lw-force-reduced-motion');
    } catch (e) { return false; }
  }

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
    S.colors.b1 = parseColor(cs.getPropertyValue('--mb-from') || cs.getPropertyValue('--banner-from'), S.colors.b1);
    S.colors.b2 = parseColor(cs.getPropertyValue('--mb-to') || cs.getPropertyValue('--banner-to'), S.colors.b2);
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
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
    S.reduced = prefersReduced();
    if (shouldRun()) {
      if (!S.raf) S.raf = requestAnimationFrame(frame);
    } else {
      if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
      if (S.ok && S.reduced && S.canvas && S.canvas.parentNode === S.banner) {
        resize();
        draw(performance.now());
      }
    }
  }

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
    P.tx = P.x = q.x;
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
      var speed = dist / Math.max(since, 1);
      var strength = Math.min(1, 0.35 + speed * 0.40);
      var mag = Math.min(1, Math.max(0.2, speed * 0.55));
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
    addDrop(q.x, q.y, 0, 0, 1.5, now);
    if (e.pointerType === 'touch') touchStart(e);
    if (!S.raf) sync();
  }

  function onLeave() {
    P.hovering = false;
    touchReset();
  }

  function touchReset() {
    if (T.timer) { clearTimeout(T.timer); T.timer = 0; }
    T.id = null;
    T.down = false;
    T.engaged = false;
  }

  function touchStart(e) {
    if (T.down) return;
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
        if (Math.abs(dx) > Math.abs(dy)) T.engaged = true;
      }
    }
  }

  function onUp(e) {
    if (e.pointerType !== 'touch' || e.pointerId !== T.id) return;
    if (T.engaged && T.dragged) T.clickBlockUntil = performance.now() + CLICK_GUARD_MS;
    touchReset();
  }

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
    if (T.lastWasTouch && (T.down || performance.now() < T.clickBlockUntil + 800)) e.preventDefault();
  }

  function ensureAttached() {
    var b = S.banner;
    if (!b) return;
    if (!b.querySelector('.mission-banner__text')) return;
    if (S.canvas.parentNode !== b || b.firstChild !== S.canvas) {
      b.insertBefore(S.canvas, b.firstChild);
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
    if (!gl) return;

    S.canvas = canvas;
    S.gl = gl;
    S.reduced = prefersReduced();
    S.t0 = performance.now();

    var vecs = 16;
    try { vecs = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 16; } catch (e) {  }
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

    new MutationObserver(ensureAttached).observe(banner, { childList: true });

    if (S.interactive && 'PointerEvent' in window) {
      banner.addEventListener('pointerenter', onEnter, { passive: true });
      banner.addEventListener('pointermove', onMove, { passive: true });
      banner.addEventListener('pointerdown', onDown, { passive: true });
      banner.addEventListener('pointerup', onUp, { passive: true });
      banner.addEventListener('pointerleave', onLeave, { passive: true });
      banner.addEventListener('pointercancel', onLeave, { passive: true });
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

    new MutationObserver(function () {
      readTheme();
      if (S.reduced) sync(); else draw(performance.now());
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    try {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', sync);
    } catch (e) {  }

    ensureAttached();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
