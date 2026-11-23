export interface Vec2 {
  x: number
  z: number
}

/** Axis-aligned box: center + half extents. */
export interface Rect {
  x: number
  z: number
  hx: number
  hz: number
}

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v

export function distance2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx
  const dz = az - bz
  return dx * dx + dz * dz
}

export function circlesHit(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number,
): boolean {
  const r = ar + br
  return distance2(ax, az, bx, bz) <= r * r
}

/** Move a circle by (dx,dz), keep it inside the arena and push it out of rectangles. */
export function moveCircle(
  pos: Vec2,
  dx: number,
  dz: number,
  radius: number,
  half: number,
  rects: readonly Rect[],
): Vec2 {
  let x = clamp(pos.x + dx, -half + radius, half - radius)
  let z = clamp(pos.z + dz, -half + radius, half - radius)

  for (const r of rects) {
    const nearX = clamp(x, r.x - r.hx, r.x + r.hx)
    const nearZ = clamp(z, r.z - r.hz, r.z + r.hz)
    const ex = x - nearX
    const ez = z - nearZ
    const d2 = ex * ex + ez * ez
    if (d2 >= radius * radius) continue

    if (d2 > 1e-9) {
      const d = Math.sqrt(d2)
      const push = radius - d
      x += (ex / d) * push
      z += (ez / d) * push
    } else {
      // center sits inside the rect: eject through the closest side
      const left = x - (r.x - r.hx) + radius
      const right = r.x + r.hx - x + radius
      const top = z - (r.z - r.hz) + radius
      const bottom = r.z + r.hz - z + radius
      const min = Math.min(left, right, top, bottom)
      if (min === left) x = r.x - r.hx - radius
      else if (min === right) x = r.x + r.hx + radius
      else if (min === top) z = r.z - r.hz - radius
      else z = r.z + r.hz + radius
    }
  }

  return { x: clamp(x, -half + radius, half - radius), z: clamp(z, -half + radius, half - radius) }
}

/** Deterministic RNG so waves are reproducible in tests and replays. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
