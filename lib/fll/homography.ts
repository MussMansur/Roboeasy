/**
 * Perspective correction for a user's photo of the mat: the four marked
 * corners are mapped onto the mat rectangle. Pure math on pixel arrays, so it
 * runs in the browser and in tests alike.
 */

import type { Point } from './season'

/** Row-major 3×3 matrix with h[8] = 1. */
export type Homography = readonly number[]

/** Solves the homography that maps `from[i]` to `to[i]` (4 points, no three collinear). */
export function solveHomography(from: readonly Point[], to: readonly Point[]): Homography | null {
  if (from.length !== 4 || to.length !== 4) return null
  // 8 equations, unknowns h0..h7.
  const a: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  // Gaussian elimination with partial pivoting on the augmented matrix.
  for (let col = 0; col < 8; col++) {
    let pivot = col
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    if (Math.abs(a[pivot][col]) < 1e-10) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    for (let r = 0; r < 8; r++) {
      if (r === col) continue
      const f = a[r][col] / a[col][col]
      if (f === 0) continue
      for (let c = col; c < 9; c++) a[r][c] -= f * a[col][c]
    }
  }
  const h = a.map((row, i) => row[8] / row[i])
  return [...h, 1]
}

export function applyHomography(h: Homography, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8]
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w }
}

/** RGBA pixels, like ImageData. */
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Mat corners on the source image, in this order: bottom-left (the origin of
 * field coordinates), bottom-right, top-right, top-left. "Bottom" is the
 * team's side of the mat.
 */
export type MatCorners = readonly [Point, Point, Point, Point]

/** Default corners: the whole image (for scans that are already straight). */
export function imageCorners(width: number, height: number): MatCorners {
  return [
    { x: 0, y: height },
    { x: width, y: height },
    { x: width, y: 0 },
    { x: 0, y: 0 },
  ]
}

/**
 * Warps the marked quadrilateral of `src` into a `width`×`height` image of the
 * mat seen from above (top row = far side of the mat). Bilinear sampling;
 * pixels outside the source become transparent.
 */
export function rectify(src: Pixels, corners: MatCorners, width: number, height: number): Pixels | null {
  const out: MatCorners = [
    { x: 0, y: height },
    { x: width, y: height },
    { x: width, y: 0 },
    { x: 0, y: 0 },
  ]
  const h = solveHomography(out, corners)
  if (!h) return null
  const data = new Uint8ClampedArray(width * height * 4)
  const { data: s, width: sw, height: sh } = src
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const w = h[6] * cx + h[7] * cy + h[8]
      const sx = (h[0] * cx + h[1] * cy + h[2]) / w - 0.5
      const sy = (h[3] * cx + h[4] * cy + h[5]) / w - 0.5
      if (!(sx >= -0.5 && sy >= -0.5 && sx <= sw - 0.5 && sy <= sh - 0.5)) continue
      const x0 = Math.max(0, Math.floor(sx))
      const y0 = Math.max(0, Math.floor(sy))
      const x1 = Math.min(sw - 1, x0 + 1)
      const y1 = Math.min(sh - 1, y0 + 1)
      const fx = Math.min(1, Math.max(0, sx - x0))
      const fy = Math.min(1, Math.max(0, sy - y0))
      const i00 = (y0 * sw + x0) * 4
      const i10 = (y0 * sw + x1) * 4
      const i01 = (y1 * sw + x0) * 4
      const i11 = (y1 * sw + x1) * 4
      const o = (y * width + x) * 4
      for (let c = 0; c < 4; c++) {
        const top = s[i00 + c] + (s[i10 + c] - s[i00 + c]) * fx
        const bottom = s[i01 + c] + (s[i11 + c] - s[i01 + c]) * fx
        data[o + c] = top + (bottom - top) * fy
      }
    }
  }
  return { data, width, height }
}

/** True when the corners form a convex quadrilateral in the given order. */
export function isConvexQuad(c: readonly Point[]): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = c[(i + 1) % 4]
    const d = c[(i + 2) % 4]
    const z = (b.x - a.x) * (d.y - b.y) - (b.y - a.y) * (d.x - b.x)
    if (Math.abs(z) < 1e-9) return false
    const s = Math.sign(z)
    if (sign && s !== sign) return false
    sign = s
  }
  return true
}
