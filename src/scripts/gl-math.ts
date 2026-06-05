/* ===========================================================================
   gl-math.ts — minimal column-major 4x4 matrices (WebGL convention).
   Just enough for a perspective camera. No external dependency.
=========================================================================== */

export type Mat4 = Float32Array;
type Vec3 = [number, number, number];

/** Identity matrix. */
export function create(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** Perspective projection (right-handed, clip z in [-1, 1]). */
export function perspective(
  out: Mat4,
  fovy: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0; out[2] = 0;                 out[3] = 0;
  out[4] = 0;          out[5] = f; out[6] = 0;                 out[7] = 0;
  out[8] = 0;          out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
  out[12] = 0;         out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
  return out;
}

/** View matrix looking from `eye` toward `center` with `up` (gluLookAt). */
export function lookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const [ex, ey, ez] = eye;
  const [cx, cy, cz] = center;
  const [ux, uy, uz] = up;

  // z = normalize(eye - center)
  let zx = ex - cx, zy = ey - cy, zz = ez - cz;
  let zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
  // x = normalize(up x z)
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  let xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
  // y = z x x
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;

  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
  return out;
}
