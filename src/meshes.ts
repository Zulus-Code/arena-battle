import * as THREE from 'three'
import { MeshBasicNodeMaterial, MeshLambertNodeMaterial } from 'three/webgpu'
import { ENEMIES, type EnemyKind } from './config.ts'

export interface VehicleView {
  /** Hull — the object that drives and turns. */
  root: THREE.Group
  /** Turret — rotates independently of the hull. */
  turret: THREE.Group
}

const flat = (color: number): MeshLambertNodeMaterial =>
  new MeshLambertNodeMaterial({ color, flatShading: true })
const smooth = (color: number): MeshLambertNodeMaterial =>
  new MeshLambertNodeMaterial({ color })

const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 10)
wheelGeo.rotateZ(Math.PI / 2)
const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.4, 8)
hubGeo.rotateZ(Math.PI / 2)
const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.0, 8)
barrelGeo.rotateX(Math.PI / 2)
const pipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6)
pipeGeo.rotateX(Math.PI / 2)

const wheelMat = smooth(0x1f1f24)
const hubMat = smooth(0xb8bcc2)
const darkMat = flat(0x3a3f47)

function shadowBlob(radius: number, stretch: number): THREE.Mesh {
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new MeshBasicNodeMaterial({ color: 0x2f2c22, transparent: true, opacity: 0.26, depthWrite: false }),
  )
  blob.rotation.x = -Math.PI / 2
  blob.scale.set(1, stretch, 1)
  blob.position.y = 0.03
  return blob
}

function box(
  w: number, h: number, d: number,
  color: number,
  x: number, y: number, z: number,
  material?: MeshLambertNodeMaterial,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material ?? flat(color))
  mesh.position.set(x, y, z)
  return mesh
}

interface VehicleSpec {
  body: number
  accent: number
  glass: number
  scale: number
}

function buildVehicle(spec: VehicleSpec): VehicleView {
  const root = new THREE.Group()
  const paint = flat(spec.body)
  const accent = flat(spec.accent)
  const glass = flat(spec.glass)

  root.add(shadowBlob(1.35, 1.5))
  root.add(box(2.15, 0.3, 3.4, 0, 0, 0.55, 0, darkMat))
  root.add(box(2.3, 0.55, 3.0, 0, 0, 0.92, 0, paint))
  const hood = box(2.0, 0.28, 1.05, 0, 0, 1.18, -1.0, accent)
  hood.rotation.x = -0.18
  root.add(hood)
  root.add(box(2.45, 0.24, 0.28, 0, 0, 0.62, -1.62, darkMat))
  const rear = box(2.05, 0.45, 0.85, 0, 0, 1.1, 1.05, accent)
  rear.rotation.x = 0.2
  root.add(rear)

  root.add(box(1.35, 0.5, 1.0, 0, 0, 1.42, 0.1, glass))
  const windshield = box(1.3, 0.5, 0.12, 0, 0, 1.45, -0.48, glass)
  windshield.rotation.x = -0.5
  root.add(windshield)
  for (const sx of [-0.78, 0.78]) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6), darkMat)
    bar.position.set(sx, 1.55, 0.1)
    root.add(bar)
  }

  for (const [x, z] of [[-1.12, 1.05], [1.12, 1.05], [-1.12, -1.05], [1.12, -1.05]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.position.set(x, 0.5, z)
    root.add(wheel)
    const hub = new THREE.Mesh(hubGeo, hubMat)
    hub.position.set(x, 0.5, z)
    root.add(hub)
  }

  for (const sx of [-0.45, 0.45]) {
    const pipe = new THREE.Mesh(pipeGeo, darkMat)
    pipe.position.set(sx, 1.0, 1.55)
    root.add(pipe)
  }

  for (const sx of [-0.72, 0.72]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.16, 0.1),
      new MeshLambertNodeMaterial({ color: 0xfff7cc, emissive: 0xfff0a0, emissiveIntensity: 1 }),
    )
    lamp.position.set(sx, 1.02, -1.55)
    root.add(lamp)
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), darkMat)
  antenna.position.set(0.85, 2.05, 0.9)
  root.add(antenna)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), flat(0xc4514f))
  tip.position.set(0.85, 2.55, 0.9)
  root.add(tip)

  const turret = new THREE.Group()
  turret.position.set(0, 1.62, 0)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.32, 10), darkMat)
  base.position.y = 0.16
  turret.add(base)
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.3, 8), accent)
  cupola.position.y = 0.42
  turret.add(cupola)
  const barrel = new THREE.Mesh(barrelGeo, darkMat)
  barrel.position.set(0, 0.34, -1.05)
  turret.add(barrel)
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 8), flat(0xd9b26b))
  muzzle.rotation.x = -Math.PI / 2
  muzzle.position.set(0, 0.34, -2.05)
  turret.add(muzzle)
  root.add(turret)

  root.scale.setScalar(spec.scale)
  return { root, turret }
}

export function buildPlayerMesh(): VehicleView {
  return buildVehicle({ body: 0xc4514f, accent: 0xd9b26b, glass: 0x8fb3cc, scale: 1 })
}

export function buildEnemyMesh(kind: EnemyKind): VehicleView {
  const stats = ENEMIES[kind]
  return buildVehicle({
    body: stats.color,
    accent: 0x3a3f47,
    glass: 0xb9c7b0,
    scale: kind === 'boss' ? 1.6 : kind === 'tank' ? 1.2 : 0.95,
  })
}
