import * as THREE from 'three'
import { instancedDynamicBufferAttribute, instanceColor } from 'three/tsl'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
import { BULLET } from './config.ts'
import type { Bullet } from './game.ts'

const FRIENDLY_COLOR = 0xffe56b
const HOSTILE_COLOR = 0xff4f73
const BASE_RADIUS = 0.3
const BULLET_Y = 0.9
const TRAIL_LENGTH = 6
const TRAIL_STEP = 0.32
const MAX_TRAIL = BULLET.max * TRAIL_LENGTH

interface TrailSlot {
  bullet: Bullet | null
  seen: boolean
  xs: Float32Array
  zs: Float32Array
  head: number
  count: number
  lastX: number
  lastZ: number
}

export interface BulletSystem {
  sync(bullets: readonly Bullet[], camera: THREE.Camera, paused: boolean): void
  reset(): void
}

let sharedGlowTexture: THREE.CanvasTexture | null = null

function getGlowTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) return sharedGlowTexture
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  sharedGlowTexture = tex
  return tex
}

function makeInstancedPool(
  scene: THREE.Scene,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  max: number,
  renderOrder: number,
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

function uploadInstancedBuffers(mesh: THREE.InstancedMesh, count: number): void {
  mesh.count = count
  if (count <= 0) return
  mesh.instanceMatrix.clearUpdateRanges()
  mesh.instanceMatrix.addUpdateRange(0, count * 16)
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) {
    mesh.instanceColor.clearUpdateRanges()
    mesh.instanceColor.addUpdateRange(0, count * 3)
    mesh.instanceColor.needsUpdate = true
  }
}

/**
 * Zero-allocation instanced projectile renderer (3 draw calls total across friendly & hostile):
 * emissive core sphere, camera-facing radial glow billboard, and fading circular-buffer trail.
 */
export function createBulletSystem(scene: THREE.Scene): BulletSystem {
  const coreMesh = makeInstancedPool(
    scene,
    new THREE.SphereGeometry(BASE_RADIUS, 12, 10),
    new MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
      emissiveNode: instanceColor.mul(1.2),
    }),
    BULLET.max,
    0,
  )

  const glowMesh = makeInstancedPool(
    scene,
    new THREE.PlaneGeometry(BASE_RADIUS * 3.2, BASE_RADIUS * 3.2),
    new MeshBasicNodeMaterial({
      map: getGlowTexture(),
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      toneMapped: false,
    }),
    BULLET.max,
    2,
  )

  const trailAlphas = new Float32Array(MAX_TRAIL)
  const trailAlphaAttr = new THREE.InstancedBufferAttribute(trailAlphas, 1)
  trailAlphaAttr.setUsage(THREE.DynamicDrawUsage)
  const trailMesh = makeInstancedPool(
    scene,
    new THREE.SphereGeometry(BASE_RADIUS, 8, 6),
    new MeshBasicNodeMaterial({
      transparent: true,
      opacityNode: instancedDynamicBufferAttribute(trailAlphaAttr, 'float'),
      depthWrite: false,
      toneMapped: false,
    }),
    MAX_TRAIL,
    1,
  )

  const byBullet = new WeakMap<Bullet, TrailSlot>()
  const activeSlots: TrailSlot[] = []
  const freeSlots: TrailSlot[] = Array.from({ length: BULLET.max }, () => ({
    bullet: null,
    seen: false,
    xs: new Float32Array(TRAIL_LENGTH),
    zs: new Float32Array(TRAIL_LENGTH),
    head: 0,
    count: 0,
    lastX: 0,
    lastZ: 0,
  }))

  const matrix = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const idQuat = new THREE.Quaternion()
  const bulletScale = new THREE.Vector3()
  const trailScale = new THREE.Vector3()
  const friendlyCol = new THREE.Color(FRIENDLY_COLOR)
  const hostileCol = new THREE.Color(HOSTILE_COLOR)

  function acquireSlot(b: Bullet): TrailSlot | null {
    const slot = freeSlots.pop()
    if (!slot) return null
    slot.bullet = b
    slot.seen = true
    slot.head = 0
    slot.count = 1
    slot.xs[0] = b.x
    slot.zs[0] = b.z
    slot.lastX = b.x
    slot.lastZ = b.z
    byBullet.set(b, slot)
    activeSlots.push(slot)
    return slot
  }

  function advanceTrail(slot: TrailSlot, bx: number, bz: number): void {
    const dx = bx - slot.lastX
    const dz = bz - slot.lastZ
    const dist = Math.hypot(dx, dz)
    if (dist < TRAIL_STEP) return

    const steps = Math.floor(dist / TRAIL_STEP)
    if (steps > TRAIL_LENGTH) {
      slot.head = 0
      slot.count = 1
      slot.xs[0] = bx
      slot.zs[0] = bz
      slot.lastX = bx
      slot.lastZ = bz
      return
    }

    const ux = (dx / dist) * TRAIL_STEP
    const uz = (dz / dist) * TRAIL_STEP
    for (let s = 0; s < steps; s++) {
      slot.lastX += ux
      slot.lastZ += uz
      slot.head = (slot.head + 1) % TRAIL_LENGTH
      slot.xs[slot.head] = slot.lastX
      slot.zs[slot.head] = slot.lastZ
      if (slot.count < TRAIL_LENGTH) slot.count++
    }
  }

  return {
    sync(bullets, camera, paused) {
      const bulletCount = Math.min(bullets.length, BULLET.max)

      for (let i = 0; i < activeSlots.length; i++) activeSlots[i].seen = false
      for (let i = 0; i < bulletCount; i++) {
        const existing = byBullet.get(bullets[i])
        if (existing) existing.seen = true
      }
      for (let i = activeSlots.length - 1; i >= 0; i--) {
        const slot = activeSlots[i]
        if (slot.seen) continue
        slot.bullet = null
        const last = activeSlots.pop()!
        if (i < activeSlots.length) activeSlots[i] = last
        freeSlots.push(slot)
      }

      let trailCount = 0

      for (let i = 0; i < bulletCount; i++) {
        const b = bullets[i]
        const col = b.hostile ? hostileCol : friendlyCol
        const scl = b.radius / BASE_RADIUS

        pos.set(b.x, BULLET_Y, b.z)
        bulletScale.setScalar(scl)
        matrix.compose(pos, idQuat, bulletScale)
        coreMesh.setMatrixAt(i, matrix)
        coreMesh.setColorAt(i, col)

        matrix.compose(pos, camera.quaternion, bulletScale)
        glowMesh.setMatrixAt(i, matrix)
        glowMesh.setColorAt(i, col)

        const slot = byBullet.get(b) ?? acquireSlot(b)
        if (!slot) continue

        if (!paused) advanceTrail(slot, b.x, b.z)

        const tCount = slot.count
        for (let k = 0; k < tCount; k++) {
          if (trailCount >= MAX_TRAIL) break
          const idx = (slot.head - k + TRAIL_LENGTH) % TRAIL_LENGTH
          const frac = k / TRAIL_LENGTH
          const s = ((1 - frac) * 0.72 + 0.12) * scl
          pos.set(slot.xs[idx], BULLET_Y, slot.zs[idx])
          trailScale.setScalar(s)
          matrix.compose(pos, idQuat, trailScale)
          trailMesh.setMatrixAt(trailCount, matrix)
          trailMesh.setColorAt(trailCount, col)
          trailAlphas[trailCount] = (1 - frac) * 0.55
          trailCount++
        }
      }

      uploadInstancedBuffers(coreMesh, bulletCount)
      uploadInstancedBuffers(glowMesh, bulletCount)
      uploadInstancedBuffers(trailMesh, trailCount)
      if (trailCount > 0) {
        trailAlphaAttr.clearUpdateRanges()
        trailAlphaAttr.addUpdateRange(0, trailCount)
        trailAlphaAttr.needsUpdate = true
      }
    },

    reset() {
      for (let i = activeSlots.length - 1; i >= 0; i--) {
        const slot = activeSlots[i]
        slot.bullet = null
        freeSlots.push(slot)
      }
      activeSlots.length = 0
      coreMesh.count = 0
      glowMesh.count = 0
      trailMesh.count = 0
    },
  }
}
