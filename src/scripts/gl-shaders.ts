/* ===========================================================================
   gl-shaders.ts — GLSL ES 3.00 source for the hero star field.

   ONE vertex + ONE fragment shader, shared by two draw calls:
     - the spacetime grid  (gl.LINES,  u_mode = 0.0)
     - the star field      (gl.POINTS, u_mode = 1.0)

   The fragment outputs PREMULTIPLIED alpha so the SAME shader works for both
   blend modes set in hero.ts:
     - dark theme  -> additive   (ONE, ONE)               bright lines/dots
     - light theme -> normal over(ONE, ONE_MINUS_SRC_ALPHA) black lines/dots

   TUNE via the uniforms set in hero.ts (warp tunables, colors, alphas), or edit
   warp() below directly.
=========================================================================== */

export const VERT_SRC = /* glsl */ `#version 300 es
precision highp float;

// ---- Per-vertex attributes ----
in vec3  a_position;   // base lattice / star position (world space)
in float a_seed;       // 0..1 random per point — drives twinkle & size variance

// ---- Per-frame uniforms ----
uniform mat4  u_proj;
uniform mat4  u_view;
uniform float u_time;          // seconds (only advances while animating)
uniform vec2  u_mouse;         // world-space (x,z) target of the gravity well

uniform float u_amp;           // ambient ripple amplitude   (try 0.6 .. 1.6)
uniform float u_freq;          // ambient ripple frequency    (try 0.15 .. 0.35)
uniform float u_drift;         // ambient ripple speed        (try 0.3 .. 0.8)
uniform float u_wellStrength;  // depth of the mouse "mass" well (try 3 .. 9)
uniform float u_wellRadius;    // squared falloff radius         (try 40 .. 90)

uniform float u_mode;          // 0.0 = grid line, 1.0 = star point
uniform float u_pointScale;    // base pixel size for stars

out float v_intensity;         // brightness handed to the fragment shader

// ---- warp(): the spacetime deformation -------------------------------------
// Returns a Y (height) displacement for a horizontal position p = (x, z).
//   1) ambient ripple — slow sinusoidal "breathing" of the whole sheet.
//   2) gravity well   — a Gaussian dip toward the mouse, like a mass denting
//      the grid. Deeper with u_wellStrength; wider with u_wellRadius.
float warp(vec2 p) {
  float ripple = u_amp
               * sin(p.x * u_freq + u_time * u_drift)
               * cos(p.y * u_freq * 0.8 - u_time * u_drift * 0.7);

  vec2  d    = p - u_mouse;
  float well = -u_wellStrength * exp(-dot(d, d) / u_wellRadius);

  return ripple + well;
}

void main() {
  vec3 pos = a_position;

  // Displace height by the warp field (the lattice lives in the XZ plane).
  pos.y += warp(pos.xz);

  // Stars drift slowly toward the camera and bob, so the field feels alive.
  // Grid nodes keep their XZ so the lattice stays readable.
  if (u_mode > 0.5) {
    pos.z += u_time * 0.15 + a_seed * 2.0;            // slow drift
    pos.z  = mod(pos.z + 30.0, 60.0) - 30.0;          // wrap within the field
    pos.y += 0.15 * sin(u_time * 0.6 + a_seed * 6.2831); // gentle bob
  }

  vec4 viewPos = u_view * vec4(pos, 1.0);
  gl_Position  = u_proj * viewPos;

  // Depth fog: nearer = brighter. -viewPos.z is camera-space distance.
  float fog = clamp(1.0 - (-viewPos.z) / 40.0, 0.0, 1.0);

  if (u_mode > 0.5) {
    // Star: per-point twinkle + mild perspective sizing.
    float twinkle = 0.65 + 0.35 * sin(u_time * 1.5 + a_seed * 12.566);
    float size    = u_pointScale * twinkle * (0.55 + 0.85 * fog);
    gl_PointSize  = clamp(size, 1.0, 9.0);
    v_intensity   = fog * (0.45 + 0.55 * a_seed) * twinkle;
  } else {
    // Grid line: just fade with depth.
    v_intensity = fog * 0.5;
  }
}
`;

export const FRAG_SRC = /* glsl */ `#version 300 es
precision highp float;

in  float v_intensity;
uniform float u_mode;        // 0.0 = grid line, 1.0 = star point
uniform vec3  u_colorStar;   // star/dot tint
uniform vec3  u_colorGrid;   // grid-line tint
uniform float u_starAlpha;   // overall dot opacity   (theme-dependent)
uniform float u_gridAlpha;   // overall line opacity  (theme-dependent)
out vec4 fragColor;

// Output is PREMULTIPLIED alpha; hero.ts picks the blend equation per theme.
void main() {
  if (u_mode > 0.5) {
    // Soft round star: radial falloff from the point-sprite center.
    vec2  uv   = gl_PointCoord - 0.5;
    float glow = smoothstep(0.5, 0.0, length(uv)); // 1 at center -> 0 at edge
    glow *= glow;                                   // tighten the core
    float a = glow * v_intensity * u_starAlpha;
    fragColor = vec4(u_colorStar * a, a);
  } else {
    // Grid line: flat, depth-faded.
    float a = v_intensity * u_gridAlpha;
    fragColor = vec4(u_colorGrid * a, a);
  }
}
`;
