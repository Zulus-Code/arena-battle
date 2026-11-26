import * as THREE from 'three'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
import type { EnemyKind } from './config.ts'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
  startScale: number
  endScale: number
  gravity: number
  r: number
  g: number
  b: number
}

interface ParticleRing {
  slots: Particle[]
  cursor: number
  active: boolean
  prevCount: number
  mesh: THREE.InstancedMesh
  spinFactor: number
}

interface RingWave {
  x: number
  z: number
  life: number
  maxLife: number
  startRadius: number
  endRadius: number
  r: number
  g: number
  b: number
}

export interface FxSystem {
  spawnMuzzle(x: number, y: number, z: number, dx: number, dz: number, hostile: boolean): void
  spawnImpact(x: number, y: number, z: number, hostile: boolean): void
  spawnExplosion(x: number, z: number, kind: EnemyKind): void
  spawnDust(x: number, z: number, vx: number, vz: number, scale?: number): void
  update(dt: number): void
  reset(): void
}

function makePool(
  scene: THREE.Scene,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  max: number,
  renderOrder = 0,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, max)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.setColorAt(0, new THREE.Color(1, 1, 1))
  mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.count = 0
  mesh.renderOrder = renderOrder
  scene.add(mesh)
  return mesh
}

function makeParticleRing(
  scene: THREE.Scene,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  max: number,
  spinFactor: number,
  renderOrder = 0,
): ParticleRing {
  const slots: Particle[] = Array.from({ length: max }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 1,
    startScale: 1,
    endScale: 0,
    gravity: 0,
    r: 1,
    g: 1,
    b: 1,
  }))
  return {
    slots,
    cursor: 0,
    active: false,
    prevCount: 0,
    mesh: makePool(scene, geo, mat, max, renderOrder),
    spinFactor,
  }
}

/** Allocates the next chronological slot in the ring buffer (zero runtime allocations). */
function nextSlot(ring: ParticleRing): Particle {
  const slot = ring.slots[ring.cursor]
  ring.cursor = (ring.cursor + 1) % ring.slots.length
  ring.active = true
  return slot
}

function setParticle(
  p: Particle,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  startScale: number,
  endScale: number,
  gravity: number,
  r: number,
  g: number,
  b: number,
): void {
  p.x = x
  p.y = y
  p.z = z
  p.vx = vx
  p.vy = vy
  p.vz = vz
  p.life = life
  p.maxLife = life
  p.startScale = startScale
  p.endScale = endScale
  p.gravity = gravity
  p.r = r
  p.g = g
  p.b = b
}

/**
 * Zero-allocation instanced VFX system (3 draw calls total: sparks, smoke/dust, shockwaves)
 * backed by chronological fixed-size ring buffers.
 */
export function createFxSystem(scene: THREE.Scene): FxSystem {
  const MAX_SPARKS = 220
  const MAX_SMOKE = 150
  const MAX_RINGS = 16

  const sparksRing = makeParticleRing(
    scene,
    new THREE.OctahedronGeometry(0.18, 0),
    new MeshBasicNodeMaterial({ toneMapped: false }),
    MAX_SPARKS,
    4.5,
    2,
  )
  const smokeRing = makeParticleRing(
    scene,
    new THREE.IcosahedronGeometry(0.32, 0),
    new MeshStandardNodeMaterial({ roughness: 0.96, metalness: 0, flatShading: true }),
    MAX_SMOKE,
    0,
  )
  const ringGeo = new THREE.RingGeometry(0.66, 1.0, 22)
  ringGeo.rotateX(-Math.PI / 2)
  const ringsMesh = makePool(
    scene,
    ringGeo,
    new MeshBasicNodeMaterial({
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    MAX_RINGS,
    3,
  )

  const rings: RingWave[] = Array.from({ length: MAX_RINGS }, () => ({
    x: 0,
    z: 0,
    life: 0,
    maxLife: 1,
    startRadius: 1,
    endRadius: 2,
    r: 1,
    g: 1,
    b: 1,
  }))
  let ringCursor = 0
  let ringsActive = false
  let prevRings = 0

  const mat4 = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const col = new THREE.Color()

  function syncParticles(ring: ParticleRing, dt: number): void {
    if (!ring.active && ring.prevCount === 0) return

    const slots = ring.slots
    const damp = 1 - Math.min(0.95, 2.8 * dt)
    let n = 0

    for (let i = 0; i < slots.length; i++) {
      const p = slots[i]
      if (p.life <= 0) continue
      p.life -= dt
      if (p.life <= 0) continue

      p.vy -= p.gravity * dt
      p.x += p.vx * dt
      p.y = Math.max(0.06, p.y + p.vy * dt)
      p.z += p.vz * dt
      p.vx *= damp
      p.vz *= damp

      const t = 1 - p.life / p.maxLife
      const s = p.startScale + (p.endScale - p.startScale) * t
      pos.set(p.x, p.y, p.z)
      if (ring.spinFactor > 0) quat.setFromAxisAngle(up, t * ring.spinFactor + i)
      else quat.identity()
      scl.setScalar(Math.max(0.001, s))
      mat4.compose(pos, quat, scl)
      ring.mesh.setMatrixAt(n, mat4)

      const fade = 1 - t * 0.45
      col.setRGB(p.r * fade, p.g * fade, p.b * fade)
      ring.mesh.setColorAt(n, col)
      n++
    }

    ring.mesh.count = n
    ring.active = n > 0
    ring.prevCount = n

    if (n > 0) {
      ring.mesh.instanceMatrix.clearUpdateRanges()
      ring.mesh.instanceMatrix.addUpdateRange(0, n * 16)
      ring.mesh.instanceMatrix.needsUpdate = true
      if (ring.mesh.instanceColor) {
        ring.mesh.instanceColor.clearUpdateRanges()
        ring.mesh.instanceColor.addUpdateRange(0, n * 3)
        ring.mesh.instanceColor.needsUpdate = true
      }
    }
  }

  function syncRings(dt: number): void {
    if (!ringsActive && prevRings === 0) return

    let n = 0
    quat.identity()
    for (let i = 0; i < rings.length; i++) {
      const rw = rings[i]
      if (rw.life <= 0) continue
      rw.life -= dt
      if (rw.life <= 0) continue

      const t = 1 - rw.life / rw.maxLife
      const ease = 1 - (1 - t) * (1 - t)
      const r = rw.startRadius + (rw.endRadius - rw.startRadius) * ease
      pos.set(rw.x, 0.06, rw.z)
      scl.set(r, 1, r)
      mat4.compose(pos, quat, scl)
      ringsMesh.setMatrixAt(n, mat4)
      const fade = 1 - t
      col.setRGB(rw.r * fade, rw.g * fade, rw.b * fade)
      ringsMesh.setColorAt(n, col)
      n++
    }

    ringsMesh.count = n
    ringsActive = n > 0
    prevRings = n

    if (n > 0) {
      ringsMesh.instanceMatrix.clearUpdateRanges()
      ringsMesh.instanceMatrix.addUpdateRange(0, n * 16)
      ringsMesh.instanceMatrix.needsUpdate = true
      if (ringsMesh.instanceColor) {
        ringsMesh.instanceColor.clearUpdateRanges()
        ringsMesh.instanceColor.addUpdateRange(0, n * 3)
        ringsMesh.instanceColor.needsUpdate = true
      }
    }
  }

  function resetRing(ring: ParticleRing): void {
    for (const p of ring.slots) p.life = 0
    ring.cursor = 0
    ring.active = false
    ring.prevCount = 0
    ring.mesh.count = 0
  }

  return {
    spawnMuzzle(x, y, z, dx, dz, hostile) {
      const [r, g, b] = hostile ? [1.0, 0.38, 0.45] : [1.0, 0.9, 0.42]
      setParticle(
        nextSlot(sparksRing),
        x,
        y,
        z,
        dx * 4,
        0.4,
        dz * 4,
        0.08,
        hostile ? 1.5 : 1.75,
        0.1,
        0,
        r,
        g,
        b,
      )
      for (let i = 0; i < 3; i++) {
        const spread = (Math.random() - 0.5) * 0.7
        const rx = dx * Math.cos(spread) - dz * Math.sin(spread)
        const rz = dx * Math.sin(spread) + dz * Math.cos(spread)
        const spd = 7 + Math.random() * 6
        setParticle(nextSlot(sparksRing), x, y, z, rx * spd, 1.5 + Math.random() * 2.5, rz * spd, 0.14, 0.55, 0.05, 10, r, g, b)
      }
    },

    spawnImpact(x, y, z, hostile) {
      const [r, g, b] = hostile ? [1.0, 0.35, 0.45] : [1.0, 0.85, 0.35]
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2
        const spd = 4 + Math.random() * 7
        setParticle(
          nextSlot(sparksRing),
          x,
          y,
          z,
          Math.cos(a) * spd,
          2.5 + Math.random() * 4.5,
          Math.sin(a) * spd,
          0.18 + Math.random() * 0.1,
          0.75,
          0.05,
          18,
          r,
          g,
          b,
        )
      }
      setParticle(
        nextSlot(smokeRing),
        x,
        y + 0.1,
        z,
        (Math.random() - 0.5) * 1.2,
        1.4,
        (Math.random() - 0.5) * 1.2,
        0.32,
        0.55,
        0.05,
        -1.2,
        0.75,
        0.7,
        0.62,
      )
    },

    spawnExplosion(x, z, kind) {
      const isBoss = kind === 'boss'
      const isTank = kind === 'tank'
      const sparkCount = isBoss ? 28 : isTank ? 18 : 12
      const smokeCount = isBoss ? 14 : isTank ? 9 : 6
      const power = isBoss ? 1.8 : isTank ? 1.3 : 1.0

      for (let i = 0; i < sparkCount; i++) {
        const a = Math.random() * Math.PI * 2
        const spd = (5 + Math.random() * 11) * power
        const hot = i % 3 === 0
        setParticle(
          nextSlot(sparksRing),
          x,
          0.8 + Math.random() * 0.6,
          z,
          Math.cos(a) * spd,
          (4 + Math.random() * 7) * power,
          Math.sin(a) * spd,
          0.28 + Math.random() * 0.24,
          (hot ? 1.5 : 0.95) * power,
          0.05,
          20,
          1.0,
          hot ? 0.9 : 0.45,
          hot ? 0.45 : 0.14,
        )
      }

      for (let i = 0; i < smokeCount; i++) {
        const a = Math.random() * Math.PI * 2
        const spd = (1.5 + Math.random() * 4.5) * power
        const shade = 0.28 + Math.random() * 0.22
        setParticle(
          nextSlot(smokeRing),
          x + Math.cos(a) * 0.4,
          0.6 + Math.random() * 0.5,
          z + Math.sin(a) * 0.4,
          Math.cos(a) * spd,
          (2.0 + Math.random() * 3.0) * power,
          Math.sin(a) * spd,
          0.55 + Math.random() * 0.35,
          1.1 * power,
          0.05,
          -1.8,
          shade,
          shade * 0.95,
          shade * 0.9,
        )
      }

      const rw = rings[ringCursor]
      ringCursor = (ringCursor + 1) % rings.length
      ringsActive = true
      rw.x = x
      rw.z = z
      rw.life = isBoss ? 0.48 : 0.3
      rw.maxLife = rw.life
      rw.startRadius = 0.5 * power
      rw.endRadius = 3.6 * power
      rw.r = isBoss ? 0.95 : 1.0
      rw.g = isBoss ? 0.55 : 0.72
      rw.b = isBoss ? 1.0 : 0.32
    },

    spawnDust(x, z, vx, vz, scale = 0.75) {
      setParticle(
        nextSlot(smokeRing),
        x + (Math.random() - 0.5) * 0.45,
        0.16,
        z + (Math.random() - 0.5) * 0.45,
        vx + (Math.random() - 0.5) * 0.8,
        0.5 + Math.random() * 0.6,
        vz + (Math.random() - 0.5) * 0.8,
        0.34,
        scale,
        0.04,
        -0.6,
        0.82,
        0.74,
        0.56,
      )
    },

    update(dt) {
      syncParticles(sparksRing, dt)
      syncParticles(smokeRing, dt)
      syncRings(dt)
    },

    reset() {
      resetRing(sparksRing)
      resetRing(smokeRing)
      for (const rw of rings) rw.life = 0
      ringCursor = 0
      ringsActive = false
      prevRings = 0
      ringsMesh.count = 0
    },
  }
}
