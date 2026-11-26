import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'

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
const optic = mat(0x3b8ea5, 0.2, 0.2, 0x39b8db)

/**
 * Roof-mounted gun turret for the player buggy with separate recoil sleeve
 * and muzzle coordinates for the laser sight and muzzle flash.
 */
export function buildTurret(vehicleHeight: number): TurretView {
  const s = Math.max(0.6, vehicleHeight)
  const root = new THREE.Group()

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.35 * s, 0.16 * s, 12), gunmetal)
  base.position.y = 0.08 * s
  base.castShadow = true
  root.add(base)

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.22 * s, 0.48 * s), brass)
  housing.position.set(0, 0.23 * s, 0.04 * s)
  housing.castShadow = true
  root.add(housing)

  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 0.1 * s, 10), darkIron)
  cupola.position.set(0, 0.38 * s, 0.08 * s)
  cupola.castShadow = true
  root.add(cupola)

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.05 * s, 0.08 * s), optic)
  visor.position.set(0, 0.37 * s, -0.08 * s)
  root.add(visor)

  const recoilGroup = new THREE.Group()
  const barrelY = 0.22 * s
  recoilGroup.position.set(0, barrelY, 0)

  const shroudGeo = new THREE.CylinderGeometry(0.082 * s, 0.092 * s, 0.46 * s, 10)
  shroudGeo.rotateX(Math.PI / 2)
  const shroud = new THREE.Mesh(shroudGeo, darkIron)
  shroud.position.z = -0.35 * s
  shroud.castShadow = true
  recoilGroup.add(shroud)

  const barrelGeo = new THREE.CylinderGeometry(0.05 * s, 0.056 * s, 1.24 * s, 10)
  barrelGeo.rotateX(Math.PI / 2)
  const barrel = new THREE.Mesh(barrelGeo, gunmetal)
  barrel.position.z = -0.68 * s
  barrel.castShadow = true
  recoilGroup.add(barrel)

  const muzzleGeo = new THREE.CylinderGeometry(0.092 * s, 0.072 * s, 0.18 * s, 10)
  muzzleGeo.rotateX(Math.PI / 2)
  const muzzle = new THREE.Mesh(muzzleGeo, brass)
  muzzle.position.z = -1.32 * s
  muzzle.castShadow = true
  recoilGroup.add(muzzle)

  root.add(recoilGroup)

  return {
    root,
    recoilGroup,
    muzzleY: barrelY,
    muzzleZ: -1.42 * s,
  }
}
