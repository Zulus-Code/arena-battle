import * as THREE from 'three'
import { MeshLambertNodeMaterial } from 'three/webgpu'

const flat = (color: number): MeshLambertNodeMaterial =>
  new MeshLambertNodeMaterial({ color, flatShading: true })

const metal = flat(0x3a3f47)
const accent = flat(0xd9b26b)

/**
 * Small roof-mounted gun for the player buggy. Scaled to the vehicle height so
 * it sits naturally on models from different packs.
 */
export function buildTurret(vehicleHeight: number): THREE.Group {
  const s = Math.max(0.6, vehicleHeight)
  const turret = new THREE.Group()

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.32 * s, 0.2 * s, 10), metal)
  base.position.y = 0.1 * s
  turret.add(base)

  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.22 * s, 0.18 * s, 8), accent)
  cupola.position.y = 0.27 * s
  turret.add(cupola)

  const barrelGeo = new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 1.25 * s, 8)
  barrelGeo.rotateX(Math.PI / 2)
  const barrel = new THREE.Mesh(barrelGeo, metal)
  barrel.position.set(0, 0.22 * s, -0.62 * s)
  turret.add(barrel)

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.16 * s, 8), accent)
  muzzle.rotation.x = -Math.PI / 2
  muzzle.position.set(0, 0.22 * s, -1.28 * s)
  turret.add(muzzle)

  return turret
}
