import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import type { PlayerVehicleKind } from './config.ts'

export interface TurretView {
  root: THREE.Group
  recoilGroup: THREE.Group
  muzzleY: number
  muzzleZ: number
}

const mat = (color: number, roughness: number, metalness: number, emissive = 0): MeshStandardNodeMaterial =>
  new MeshStandardNodeMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: emissive ? 1.2 : 0,
    flatShading: true,
  })

const gunmetal = mat(0x363b44, 0.42, 0.62)
const brass = mat(0xd7ae64, 0.38, 0.44)
const darkIron = mat(0x23272e, 0.5, 0.55)
const steel = mat(0x565f6b, 0.44, 0.56)
const optic = mat(0x3b8ea5, 0.2, 0.2, 0x39b8db)

function mergeParts(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geos, false)
  for (const g of geos) g.dispose()
  if (!merged) throw new Error('Failed to merge turret geometry')
  return merged
}

/** Collects sub-geometries per material and flushes them into one mesh each to stay well within draw-call budget. */
class PartCollector {
  private buckets = new Map<MeshStandardNodeMaterial, { geos: THREE.BufferGeometry[]; castShadow: boolean }>()

  add(material: MeshStandardNodeMaterial, geo: THREE.BufferGeometry, castShadow = true): void {
    let bucket = this.buckets.get(material)
    if (!bucket) {
      bucket = { geos: [], castShadow }
      this.buckets.set(material, bucket)
    } else if (castShadow) {
      bucket.castShadow = true
    }
    bucket.geos.push(geo)
  }

  flush(target: THREE.Group): void {
    for (const [material, { geos, castShadow }] of this.buckets) {
      const geo = geos.length === 1 ? geos[0] : mergeParts(geos)
      const mesh = new THREE.Mesh(geo, material)
      mesh.castShadow = castShadow
      target.add(mesh)
    }
    this.buckets.clear()
  }
}

function cylZ(rTop: number, rBot: number, len: number, segs: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, segs)
  g.rotateX(Math.PI / 2)
  g.translate(x, y, z)
  return g
}

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function buildBuggyTurret(s: number, hull: PartCollector, recoil: PartCollector): { muzzleY: number; muzzleZ: number } {
  // Low open swivel mount + pintle forks + receiver cradle (no armored dome).
  const ring = new THREE.CylinderGeometry(0.24 * s, 0.28 * s, 0.08 * s, 24)
  ring.translate(0, 0.04 * s, 0)
  hull.add(darkIron, ring)

  const flange = new THREE.TorusGeometry(0.25 * s, 0.022 * s, 10, 24)
  flange.rotateX(Math.PI / 2)
  flange.translate(0, 0.085 * s, 0)
  hull.add(gunmetal, flange)

  hull.add(darkIron, box(0.045 * s, 0.14 * s, 0.09 * s, -0.105 * s, 0.14 * s, 0.02 * s))
  hull.add(darkIron, box(0.045 * s, 0.14 * s, 0.09 * s, 0.105 * s, 0.14 * s, 0.02 * s))
  hull.add(gunmetal, box(0.16 * s, 0.09 * s, 0.32 * s, 0, 0.21 * s, 0.05 * s))

  // Side ammo box + belt feed chute + cartridge ribs.
  hull.add(brass, box(0.13 * s, 0.12 * s, 0.19 * s, 0.19 * s, 0.19 * s, 0.05 * s))
  hull.add(darkIron, box(0.14 * s, 0.025 * s, 0.20 * s, 0.19 * s, 0.25 * s, 0.05 * s))
  hull.add(brass, box(0.10 * s, 0.026 * s, 0.12 * s, 0.11 * s, 0.22 * s, 0.04 * s))
  for (let i = -1; i <= 1; i++) {
    hull.add(gunmetal, cylZ(0.011 * s, 0.011 * s, 0.08 * s, 12, 0.11 * s, 0.238 * s, 0.04 * s + i * 0.032 * s))
  }

  // Compact reflex sight.
  hull.add(darkIron, box(0.065 * s, 0.05 * s, 0.09 * s, -0.10 * s, 0.275 * s, 0.02 * s))
  hull.add(optic, box(0.046 * s, 0.032 * s, 0.02 * s, -0.10 * s, 0.275 * s, -0.028 * s), false)

  // Thin MG barrel + slotted longitudinal cooling jacket + conical flash hider.
  const barrelY = 0.22 * s
  recoil.add(darkIron, box(0.09 * s, 0.075 * s, 0.18 * s, 0, 0, 0.02 * s))
  recoil.add(darkIron, cylZ(0.036 * s, 0.04 * s, 0.54 * s, 24, 0, 0, -0.33 * s))
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    const fin = new THREE.BoxGeometry(0.014 * s, 0.022 * s, 0.50 * s)
    fin.rotateZ(a)
    fin.translate(Math.cos(a) * 0.044 * s, Math.sin(a) * 0.044 * s, -0.33 * s)
    recoil.add(gunmetal, fin)
  }
  for (const cz of [-0.07 * s, -0.59 * s]) {
    const collar = new THREE.TorusGeometry(0.046 * s, 0.01 * s, 8, 24)
    collar.translate(0, 0, cz)
    recoil.add(brass, collar)
  }
  recoil.add(gunmetal, cylZ(0.022 * s, 0.026 * s, 1.14 * s, 24, 0, 0, -0.60 * s))

  const flashPts = [
    new THREE.Vector2(0.022 * s, 0),
    new THREE.Vector2(0.034 * s, 0.02 * s),
    new THREE.Vector2(0.04 * s, 0.1 * s),
    new THREE.Vector2(0.026 * s, 0.1 * s),
    new THREE.Vector2(0.018 * s, 0.02 * s),
  ]
  const flash = new THREE.LatheGeometry(flashPts, 24)
  flash.rotateX(-Math.PI / 2)
  flash.translate(0, 0, -1.17 * s)
  recoil.add(brass, flash)

  return { muzzleY: barrelY, muzzleZ: -1.27 * s }
}

function buildTankTurret(s: number, hull: PartCollector, recoil: PartCollector): { muzzleY: number; muzzleZ: number } {
  // Turret ring.
  const base = new THREE.CylinderGeometry(0.35 * s, 0.39 * s, 0.1 * s, 28)
  base.translate(0, 0.05 * s, 0)
  hull.add(darkIron, base)

  // Chamfered octagonal turret armor body + sloped front cheeks + rear bustle.
  const turretBody = new THREE.CylinderGeometry(0.34 * s, 0.42 * s, 0.19 * s, 8)
  turretBody.rotateY(Math.PI / 8)
  turretBody.scale(0.92, 1, 1.12)
  turretBody.translate(0, 0.195 * s, 0.08 * s)
  hull.add(brass, turretBody)

  const roof = new THREE.CylinderGeometry(0.28 * s, 0.33 * s, 0.07 * s, 8)
  roof.rotateY(Math.PI / 8)
  roof.scale(0.92, 1, 1.06)
  roof.translate(0, 0.32 * s, 0.08 * s)
  hull.add(steel, roof)

  // Armored gun mantlet + side cheeks.
  const mantlet = new THREE.CylinderGeometry(0.125 * s, 0.125 * s, 0.28 * s, 24)
  mantlet.rotateZ(Math.PI / 2)
  mantlet.translate(0, 0.23 * s, -0.25 * s)
  hull.add(gunmetal, mantlet)
  hull.add(gunmetal, box(0.24 * s, 0.16 * s, 0.14 * s, 0, 0.23 * s, -0.22 * s))

  // Commander cupola + hatch + periscope.
  const cupola = new THREE.CylinderGeometry(0.125 * s, 0.145 * s, 0.08 * s, 24)
  cupola.translate(-0.1 * s, 0.385 * s, 0.12 * s)
  hull.add(darkIron, cupola)
  const hatch = new THREE.CylinderGeometry(0.105 * s, 0.11 * s, 0.025 * s, 24)
  hatch.translate(-0.1 * s, 0.43 * s, 0.12 * s)
  hull.add(steel, hatch)
  hull.add(darkIron, box(0.08 * s, 0.05 * s, 0.08 * s, -0.1 * s, 0.45 * s, 0.04 * s))
  hull.add(optic, box(0.056 * s, 0.03 * s, 0.02 * s, -0.1 * s, 0.45 * s, -0.005 * s), false)

  // Gunner sight on right cheek.
  hull.add(darkIron, box(0.085 * s, 0.065 * s, 0.095 * s, 0.14 * s, 0.37 * s, -0.09 * s))
  hull.add(optic, box(0.058 * s, 0.04 * s, 0.02 * s, 0.14 * s, 0.37 * s, -0.14 * s), false)

  // Whip antenna.
  const antBase = new THREE.CylinderGeometry(0.026 * s, 0.034 * s, 0.05 * s, 16)
  antBase.translate(-0.22 * s, 0.36 * s, 0.32 * s)
  hull.add(darkIron, antBase)
  const ant = new THREE.CylinderGeometry(0.006 * s, 0.012 * s, 0.56 * s, 12)
  ant.rotateX(0.12)
  ant.translate(-0.22 * s, 0.65 * s, 0.35 * s)
  hull.add(darkIron, ant)

  // Rear bustle stowage basket.
  hull.add(gunmetal, box(0.42 * s, 0.025 * s, 0.14 * s, 0, 0.17 * s, 0.52 * s))
  hull.add(darkIron, box(0.42 * s, 0.09 * s, 0.02 * s, 0, 0.22 * s, 0.58 * s))
  hull.add(darkIron, box(0.02 * s, 0.09 * s, 0.14 * s, -0.2 * s, 0.22 * s, 0.52 * s))
  hull.add(darkIron, box(0.02 * s, 0.09 * s, 0.14 * s, 0.2 * s, 0.22 * s, 0.52 * s))

  // Recoil barrel + bore evacuator + 3-baffle slotted muzzle brake.
  const barrelY = 0.23 * s
  recoil.add(darkIron, cylZ(0.076 * s, 0.082 * s, 0.32 * s, 24, 0, 0, -0.44 * s))
  recoil.add(gunmetal, cylZ(0.048 * s, 0.056 * s, 1.3 * s, 28, 0, 0, -0.78 * s))
  recoil.add(darkIron, cylZ(0.056 * s, 0.058 * s, 0.22 * s, 24, 0, 0, -1.41 * s))
  for (const bz of [-1.34 * s, -1.41 * s, -1.48 * s]) {
    const ring = new THREE.TorusGeometry(0.072 * s, 0.015 * s, 10, 24)
    ring.translate(0, 0, bz)
    recoil.add(brass, ring)
  }
  recoil.add(brass, cylZ(0.07 * s, 0.066 * s, 0.03 * s, 24, 0, 0, -1.505 * s))

  return { muzzleY: barrelY, muzzleZ: -1.52 * s }
}

function buildHeavyTurret(s: number, hull: PartCollector, recoil: PartCollector): { muzzleY: number; muzzleZ: number } {
  // Heavy turret ring.
  const base = new THREE.CylinderGeometry(0.46 * s, 0.52 * s, 0.12 * s, 32)
  base.translate(0, 0.06 * s, 0)
  hull.add(darkIron, base)

  // Massive chamfered siege turret hull + angled upper deck + rear counterweight bustle.
  const lowerHull = new THREE.CylinderGeometry(0.48 * s, 0.56 * s, 0.22 * s, 8)
  lowerHull.rotateY(Math.PI / 8)
  lowerHull.scale(0.96, 1, 1.18)
  lowerHull.translate(0, 0.22 * s, 0.1 * s)
  hull.add(brass, lowerHull)

  const upperDeck = new THREE.CylinderGeometry(0.38 * s, 0.46 * s, 0.1 * s, 8)
  upperDeck.rotateY(Math.PI / 8)
  upperDeck.scale(0.94, 1, 1.12)
  upperDeck.translate(0, 0.375 * s, 0.1 * s)
  hull.add(steel, upperDeck)

  hull.add(gunmetal, box(0.68 * s, 0.22 * s, 0.26 * s, 0, 0.24 * s, 0.62 * s))

  // Massive breech block / armored mantlet.
  hull.add(gunmetal, box(0.42 * s, 0.24 * s, 0.22 * s, 0, 0.25 * s, -0.34 * s))
  const trunnion = new THREE.CylinderGeometry(0.145 * s, 0.145 * s, 0.44 * s, 28)
  trunnion.rotateZ(Math.PI / 2)
  trunnion.translate(0, 0.25 * s, -0.38 * s)
  hull.add(steel, trunnion)

  // Large commander hatch + loader hatch.
  const cmdCupola = new THREE.CylinderGeometry(0.165 * s, 0.185 * s, 0.09 * s, 28)
  cmdCupola.translate(-0.16 * s, 0.45 * s, 0.16 * s)
  hull.add(darkIron, cmdCupola)
  const cmdHatch = new THREE.CylinderGeometry(0.14 * s, 0.145 * s, 0.03 * s, 28)
  cmdHatch.translate(-0.16 * s, 0.5 * s, 0.16 * s)
  hull.add(steel, cmdHatch)

  const ldrCupola = new THREE.CylinderGeometry(0.12 * s, 0.135 * s, 0.055 * s, 24)
  ldrCupola.translate(0.17 * s, 0.445 * s, 0.18 * s)
  hull.add(gunmetal, ldrCupola)

  // Dual optics: gunner rangefinder pod + panoramic commander periscope.
  hull.add(darkIron, box(0.13 * s, 0.095 * s, 0.15 * s, 0.19 * s, 0.455 * s, -0.13 * s))
  hull.add(optic, box(0.09 * s, 0.058 * s, 0.02 * s, 0.19 * s, 0.455 * s, -0.21 * s), false)

  hull.add(darkIron, box(0.095 * s, 0.075 * s, 0.095 * s, -0.16 * s, 0.54 * s, 0.08 * s))
  hull.add(optic, box(0.068 * s, 0.045 * s, 0.02 * s, -0.16 * s, 0.54 * s, 0.028 * s), false)

  // Side ZIP stowage box with strap ribs.
  hull.add(darkIron, box(0.13 * s, 0.17 * s, 0.46 * s, -0.49 * s, 0.23 * s, 0.16 * s))
  hull.add(steel, box(0.14 * s, 0.03 * s, 0.48 * s, -0.49 * s, 0.305 * s, 0.16 * s))
  for (const sz of [0.02 * s, 0.30 * s]) {
    hull.add(brass, box(0.145 * s, 0.18 * s, 0.025 * s, -0.49 * s, 0.23 * s, sz))
  }

  // Thick cannon + breech collar + thermal sleeve + 2-chamber Lathe muzzle brake.
  const barrelY = 0.25 * s
  recoil.add(darkIron, cylZ(0.12 * s, 0.13 * s, 0.36 * s, 28, 0, 0, -0.38 * s))
  recoil.add(steel, cylZ(0.095 * s, 0.102 * s, 0.84 * s, 28, 0, 0, -0.78 * s))
  for (const cz of [-0.52 * s, -0.78 * s, -1.04 * s]) {
    const clamp = new THREE.TorusGeometry(0.102 * s, 0.012 * s, 10, 28)
    clamp.translate(0, 0, cz)
    recoil.add(darkIron, clamp)
  }
  recoil.add(gunmetal, cylZ(0.068 * s, 0.078 * s, 1.54 * s, 32, 0, 0, -0.98 * s))

  const brakePts = [
    new THREE.Vector2(0.068 * s, 0),
    new THREE.Vector2(0.115 * s, 0.01 * s),
    new THREE.Vector2(0.115 * s, 0.05 * s),
    new THREE.Vector2(0.074 * s, 0.06 * s),
    new THREE.Vector2(0.074 * s, 0.12 * s),
    new THREE.Vector2(0.118 * s, 0.13 * s),
    new THREE.Vector2(0.118 * s, 0.17 * s),
    new THREE.Vector2(0.074 * s, 0.18 * s),
    new THREE.Vector2(0.074 * s, 0.24 * s),
    new THREE.Vector2(0.115 * s, 0.25 * s),
    new THREE.Vector2(0.11 * s, 0.29 * s),
    new THREE.Vector2(0.068 * s, 0.3 * s),
    new THREE.Vector2(0.052 * s, 0.28 * s),
    new THREE.Vector2(0.052 * s, 0.24 * s),
  ]
  const brake = new THREE.LatheGeometry(brakePts, 32)
  brake.rotateX(-Math.PI / 2)
  brake.translate(0, 0, -1.64 * s)
  recoil.add(brass, brake)

  return { muzzleY: barrelY, muzzleZ: -1.94 * s }
}

/**
 * Roof-mounted class-specific gun turret with separate recoil sleeve
 * and muzzle coordinates for the laser sight and muzzle flash.
 */
export function buildTurret(kind: PlayerVehicleKind, vehicleHeight: number): TurretView {
  const s = Math.max(0.6, vehicleHeight)
  const root = new THREE.Group()
  const recoilGroup = new THREE.Group()

  const hullParts = new PartCollector()
  const recoilParts = new PartCollector()

  const muzzle =
    kind === 'buggy'
      ? buildBuggyTurret(s, hullParts, recoilParts)
      : kind === 'tank'
        ? buildTankTurret(s, hullParts, recoilParts)
        : buildHeavyTurret(s, hullParts, recoilParts)

  recoilGroup.position.set(0, muzzle.muzzleY, 0)
  hullParts.flush(root)
  recoilParts.flush(recoilGroup)
  root.add(recoilGroup)

  return {
    root,
    recoilGroup,
    muzzleY: muzzle.muzzleY,
    muzzleZ: muzzle.muzzleZ,
  }
}
