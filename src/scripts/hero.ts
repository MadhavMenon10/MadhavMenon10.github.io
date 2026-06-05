/* ===========================================================================
   hero.ts — WebGL2 star field on a warping spacetime grid.

   ONE program, TWO draw calls (grid lines + star points). Performance-first:
     - DPR capped to keep additive-blend overdraw in check
     - rAF pauses when the hero is offscreen, the tab is hidden, or the theme
       is light (the effect is dark-mode only; light shows the CSS gradient)
     - particle count scales by device capability (graceful degradation)
     - respects prefers-reduced-motion (renders nothing -> gradient fallback)

   See gl-shaders.ts for the (commented) shader math and tunables.
=========================================================================== */

import { create, perspective, lookAt } from './gl-math';
import { VERT_SRC, FRAG_SRC } from './gl-shaders';

// ---- Tunables --------------------------------------------------------------
const GRID_EXT = 30;                 // half-extent of the lattice (world units)
const FOV = (50 * Math.PI) / 180;
const DPR_CAP = 1.75;

interface Tier { gridN: number; stars: number; }

/** Pick a quality tier from cheap capability heuristics. */
function pickTier(): Tier {
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 640;

  if (cores <= 2 || mem <= 2) return { gridN: 28, stars: 900 };  // low power
  if (coarse || small) return { gridN: 36, stars: 1500 };        // mobile / mid
  return { gridN: 52, stars: 4000 };                             // desktop
}

export function initHero(): void {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // Animations off -> keep the static gradient, draw nothing.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!gl) return; // no WebGL2 -> gradient fallback stays

  const program = makeProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) return;
  gl.useProgram(program);

  const tier = pickTier();
  const grid = buildGrid(tier.gridN);
  const stars = buildStars(tier.stars);

  // ---- Locations ----
  const aPos = gl.getAttribLocation(program, 'a_position');
  const aSeed = gl.getAttribLocation(program, 'a_seed');
  const u = {
    proj: gl.getUniformLocation(program, 'u_proj'),
    view: gl.getUniformLocation(program, 'u_view'),
    time: gl.getUniformLocation(program, 'u_time'),
    mouse: gl.getUniformLocation(program, 'u_mouse'),
    amp: gl.getUniformLocation(program, 'u_amp'),
    freq: gl.getUniformLocation(program, 'u_freq'),
    drift: gl.getUniformLocation(program, 'u_drift'),
    wellStrength: gl.getUniformLocation(program, 'u_wellStrength'),
    wellRadius: gl.getUniformLocation(program, 'u_wellRadius'),
    mode: gl.getUniformLocation(program, 'u_mode'),
    pointScale: gl.getUniformLocation(program, 'u_pointScale'),
    colorStar: gl.getUniformLocation(program, 'u_colorStar'),
    colorGrid: gl.getUniformLocation(program, 'u_colorGrid'),
  };

  const gridVAO = makeVAO(gl, grid.positions, grid.seeds, aPos, aSeed);
  const starVAO = makeVAO(gl, stars.positions, stars.seeds, aPos, aSeed);

  // ---- GL state: premultiplied additive blending over a transparent clear --
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  const proj = create();
  const view = create();

  // ---- Resize (DPR-capped) ----
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    perspective(proj, FOV, canvas.width / canvas.height || 1, 0.1, 100);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ---- Pointer (smoothed) drives the gravity well ----
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mouse = { x: 0, z: -6 };
  const target = { x: 0, z: -6 };
  if (!coarse) {
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = nx * GRID_EXT * 0.7;
      target.z = -6 + ny * GRID_EXT * 0.4;
    }, { passive: true });
  }

  // ---- Animation loop with pause/resume ----
  const html = document.documentElement;
  const isDark = () => html.getAttribute('data-theme') !== 'light';
  let running = false;
  let visible = true;
  let raf = 0;
  let elapsed = 0; // animation-time seconds (advances only while running)
  let last = 0;

  const frame = (now: number) => {
    if (!running) return;
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.05); // clamp gaps after a pause
    last = now;
    elapsed += dt;
    const t = elapsed;

    // Touch / no pointer: the well slowly orbits on its own.
    if (coarse) {
      target.x = Math.sin(t * 0.25) * GRID_EXT * 0.5;
      target.z = -6 + Math.cos(t * 0.2) * GRID_EXT * 0.3;
    }
    mouse.x += (target.x - mouse.x) * 0.05;
    mouse.z += (target.z - mouse.z) * 0.05;

    lookAt(view, [Math.sin(t * 0.08) * 1.5, 7.5, 16], [0, -2.5, -6], [0, 1, 0]);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(u.proj, false, proj);
    gl.uniformMatrix4fv(u.view, false, view);
    gl.uniform1f(u.time, t);
    gl.uniform2f(u.mouse, mouse.x, mouse.z);

    // --- Warp tunables (see gl-shaders.ts warp()) ---
    gl.uniform1f(u.amp, 1.1);
    gl.uniform1f(u.freq, 0.22);
    gl.uniform1f(u.drift, 0.5);
    gl.uniform1f(u.wellStrength, 6.0);
    gl.uniform1f(u.wellRadius, 60.0);
    gl.uniform3f(u.colorStar, 0.85, 0.9, 1.0);
    gl.uniform3f(u.colorGrid, 0.43, 0.66, 1.0);

    // Pass 1: spacetime grid (lines)
    gl.uniform1f(u.mode, 0.0);
    gl.bindVertexArray(gridVAO);
    gl.drawArrays(gl.LINES, 0, grid.count);

    // Pass 2: star field (points)
    gl.uniform1f(u.mode, 1.0);
    gl.uniform1f(u.pointScale, 2.6 * dpr);
    gl.bindVertexArray(starVAO);
    gl.drawArrays(gl.POINTS, 0, stars.count);

    gl.bindVertexArray(null);
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || !visible || !isDark()) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // Pause when the hero scrolls offscreen.
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  }, { threshold: 0 }).observe(canvas);

  // Pause when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // React to theme toggle: run in dark, clear+idle in light.
  new MutationObserver(() => {
    if (isDark()) start();
    else { stop(); gl.clear(gl.COLOR_BUFFER_BIT); }
  }).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  // Stop cleanly on context loss (decorative — no restore needed).
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); });

  start();
}

// ---- Geometry --------------------------------------------------------------

/** N×N lattice of line segments in the XZ plane (drawn as gl.LINES). */
function buildGrid(n: number) {
  const xMin = -GRID_EXT, xMax = GRID_EXT;
  const zMin = -GRID_EXT, zMax = GRID_EXT * 0.4;
  const xStep = (xMax - xMin) / (n - 1);
  const zStep = (zMax - zMin) / (n - 1);
  const pos: number[] = [];

  for (let j = 0; j < n; j++) {               // lines along X
    const z = zMin + j * zStep;
    for (let i = 0; i < n - 1; i++) {
      const x0 = xMin + i * xStep;
      pos.push(x0, 0, z, x0 + xStep, 0, z);
    }
  }
  for (let i = 0; i < n; i++) {               // lines along Z
    const x = xMin + i * xStep;
    for (let j = 0; j < n - 1; j++) {
      const z0 = zMin + j * zStep;
      pos.push(x, 0, z0, x, 0, z0 + zStep);
    }
  }

  const positions = new Float32Array(pos);
  return { positions, seeds: new Float32Array(positions.length / 3), count: positions.length / 3 };
}

/** Random star points scattered in the volume above the grid. */
function buildStars(n: number) {
  const positions = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * GRID_EXT;
    positions[i * 3 + 1] = 0.5 + Math.random() * 14;
    positions[i * 3 + 2] = -GRID_EXT + Math.random() * (GRID_EXT * 1.4);
    seeds[i] = Math.random();
  }
  return { positions, seeds, count: n };
}

// ---- GL helpers ------------------------------------------------------------

function makeShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('shader compile error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function makeProgram(gl: WebGL2RenderingContext, vsrc: string, fsrc: string) {
  const vs = makeShader(gl, gl.VERTEX_SHADER, vsrc);
  const fs = makeShader(gl, gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('program link error:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function makeVAO(
  gl: WebGL2RenderingContext,
  positions: Float32Array,
  seeds: Float32Array,
  aPos: number,
  aSeed: number
) {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  const pbuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  const sbuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, sbuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  return vao;
}
