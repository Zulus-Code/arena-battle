import * as THREE from 'three'
import { MeshLambertNodeMaterial } from 'three/webgpu'
import { ARENA } from './config.ts'
import type { Rect } from './rules.ts'

const PROP_COLORS = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xb57bff, 0xff9f1c]

const PROP = {
  size: 3,
  height: 2.4,
} as const

export function buildArena(scene: THREE.Scene): Rect[] {
  const half = ARENA.half
  const wallT = ARENA.wallThickness
  const wallH = ARENA.wallHeight

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2, half * 2),
    new MeshLambertNodeMaterial({ color: 0x77d16f }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const wallMat = new MeshLambertNodeMaterial({ color: 0x4d96ff, flatShading: true })
  const hWall = new THREE.BoxGeometry(half * 2 + wallT * 2, wallH, wallT)
  const vWall = new THREE.BoxGeometry(wallT, wallH, half * 2 + wallT * 2)
  const walls: Array<[THREE.BoxGeometry, number, number]> = [
    [hWall, 0, -half - wallT / 2],
    [hWall, 0, half + wallT / 2],
    [vWall, -half - wallT / 2, 0],
    [vWall, half + wallT / 2, 0],
  ]
  for (const [geo, x, z] of walls) {
    const wall = new THREE.Mesh(geo, wallMat)
    wall.position.set(x, wallH / 2, z)
    scene.add(wall)
  }

  // Hand-placed props: fixed layout, no random spawns inside the playfield.
  const props: Array<[number, number, number, number]> = [
    [-10, -8, 3, 3],
    [9, -11, 4, 2],
    [0, 6, 2.5, 2.5],
    [12, 9, 3, 5],
    [-13, 10, 2, 2],
    [4, -2, 1.5, 1.5],
  ]
  const rects: Rect[] = []
  props.forEach(([x, z, hx, hz], i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(hx * 2, PROP.height, hz * 2),
      new MeshLambertNodeMaterial({ color: PROP_COLORS[i % PROP_COLORS.length], flatShading: true }),
    )
    mesh.position.set(x, PROP.height / 2, z)
    scene.add(mesh)
    rects.push({ x, z, hx, hz })
  })

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8f5a, 1.5))
  const sun = new THREE.DirectionalLight(0xfff1cc, 2.4)
  sun.position.set(18, 30, 12)
  scene.add(sun)

  return rects
}
