import * as THREE from 'three'
import { MeshLambertNodeMaterial } from 'three/webgpu'
import { ENEMIES, type EnemyKind } from './config.ts'

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 8)
wheelGeo.rotateZ(Math.PI / 2)
const wheelMat = new MeshLambertNodeMaterial({ color: 0x2b2b33, flatShading: true })

function vehicle(bodyColor: number, scale: number): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.75, 3.2),
    new MeshLambertNodeMaterial({ color: bodyColor, flatShading: true }),
  )
  body.position.y = 0.72
  g.add(body)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.6, 1.2),
    new MeshLambertNodeMaterial({ color: 0xdfe9ff, flatShading: true }),
  )
  cabin.position.set(0, 1.3, -0.2)
  g.add(cabin)

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 2.0, 8),
    new MeshLambertNodeMaterial({ color: 0x33333d, flatShading: true }),
  )
  barrel.rotation.x = Math.PI / 2
  barrel.position.set(0, 0.85, -1.9)
  g.add(barrel)

  for (const [x, z] of [
    [-1.15, 1.05],
    [1.15, 1.05],
    [-1.15, -1.05],
    [1.15, -1.05],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.position.set(x, 0.45, z)
    g.add(wheel)
  }

  g.scale.setScalar(scale)
  return g
}

export function buildPlayerMesh(): THREE.Group {
  return vehicle(0xff3d6e, 1)
}

export function buildEnemyMesh(kind: EnemyKind): THREE.Group {
  return vehicle(ENEMIES[kind].color, kind === 'boss' ? 1.5 : kind === 'tank' ? 1.15 : 0.9)
}
