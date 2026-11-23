import * as THREE from 'three'
import { MeshBasicNodeMaterial, MeshLambertNodeMaterial } from 'three/webgpu'
import { ARENA } from './config.ts'
import type { Rect } from './rules.ts'

const flat = (color: number): MeshLambertNodeMaterial =>
  new MeshLambertNodeMaterial({ color, flatShading: true })

/** Cheap checkerboard: two-tone CanvasTexture, repeats over the floor. */
function checkerTexture(): THREE.CanvasTexture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size * 2
  const g = c.getContext('2d')!
  g.fillStyle = '#c9b98c'
  g.fillRect(0, 0, size * 2, size * 2)
  g.fillStyle = '#c0b081'
  g.fillRect(0, 0, size, size)
  g.fillRect(size, size, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(11, 11)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function shadowBlob(x: number, z: number, radius: number): THREE.Mesh {
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 16),
    new MeshBasicNodeMaterial({ color: 0x2f2c22, transparent: true, opacity: 0.24, depthWrite: false }),
  )
  blob.rotation.x = -Math.PI / 2
  blob.position.set(x, 0.02, z)
  return blob
}

interface PropSpec {
  kind: 'crate' | 'barrel' | 'block'
  x: number
  z: number
  hx: number
  hz: number
  height: number
  color: number
}

/** Vertical panels + rivet line for the arena walls. */
function wallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#6d8ba6'
  g.fillRect(0, 0, 256, 128)
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#64829d' : '#7492ad'
    g.fillRect(i * 32 + 2, 0, 28, 128)
  }
  g.fillStyle = '#54708a'
  g.fillRect(0, 108, 256, 6)
  g.fillStyle = '#86a2bd'
  g.fillRect(0, 0, 256, 5)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(7, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const PROPS: PropSpec[] = [
  { kind: 'crate', x: -10, z: -8, hx: 1.2, hz: 1.2, height: 1.6, color: 0xa97b46 },
  { kind: 'crate', x: 10, z: -10, hx: 1.4, hz: 1.4, height: 1.8, color: 0xb28652 },
  { kind: 'crate', x: -6, z: -2, hx: 1.2, hz: 1.2, height: 1.5, color: 0x9e7342 },
  { kind: 'block', x: 0, z: 6, hx: 1.6, hz: 1.6, height: 2.6, color: 0x828a92 },
  { kind: 'block', x: 12, z: 9, hx: 2.0, hz: 2.4, height: 2.2, color: 0x8d949c },
  { kind: 'barrel', x: -13, z: 10, hx: 0.8, hz: 0.8, height: 2.0, color: 0xb5544a },
  { kind: 'barrel', x: 8, z: 3, hx: 0.8, hz: 0.8, height: 2.0, color: 0x6f8f5e },
  { kind: 'barrel', x: 5, z: -3, hx: 0.8, hz: 0.8, height: 2.0, color: 0x5f7d99 },
]

function addProp(scene: THREE.Scene, p: PropSpec): void {
  if (p.kind === 'barrel') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(p.hx, p.hx, p.height, 12), flat(p.color))
    barrel.position.set(p.x, p.height / 2, p.z)
    scene.add(barrel)
    for (const y of [0.35, 0.65, 0.35 + 0.3]) {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(p.hx * 1.02, p.hx * 1.02, 0.06, 12),
        flat(0x2d3038),
      )
      ring.position.set(p.x, p.height * y, p.z)
      scene.add(ring)
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(p.hx * 2, p.height, p.hz * 2), flat(p.color))
    body.position.set(p.x, p.height / 2, p.z)
    scene.add(body)
    if (p.kind === 'crate') {
      const plank = flat(0x7d5628)
      for (const y of [p.height * 0.3, p.height * 0.7]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(p.hx * 2.02, 0.14, p.hz * 2.02), plank)
        strip.position.set(p.x, y, p.z)
        scene.add(strip)
      }
    }
  }
  scene.add(shadowBlob(p.x, p.z, Math.max(p.hx, p.hz) * 1.35))
}

export function buildArena(scene: THREE.Scene): Rect[] {
  const half = ARENA.half
  const wallT = ARENA.wallThickness
  const wallH = ARENA.wallHeight

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2, half * 2),
    new MeshLambertNodeMaterial({ map: checkerTexture() }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const wallLower = new MeshLambertNodeMaterial({ map: wallTexture() })
  const cornice = flat(0xcbb282)
  const hWall = new THREE.BoxGeometry(half * 2 + wallT * 2, wallH, wallT)
  const vWall = new THREE.BoxGeometry(wallT, wallH, half * 2 + wallT * 2)
  const walls: Array<[THREE.BoxGeometry, number, number]> = [
    [hWall, 0, -half - wallT / 2],
    [hWall, 0, half + wallT / 2],
    [vWall, -half - wallT / 2, 0],
    [vWall, half + wallT / 2, 0],
  ]
  for (const [geo, x, z] of walls) {
    const wall = new THREE.Mesh(geo, wallLower)
    wall.position.set(x, wallH / 2, z)
    scene.add(wall)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(
        geo === hWall ? half * 2 + wallT * 2 : wallT * 1.3,
        0.28,
        geo === hWall ? wallT * 1.3 : half * 2 + wallT * 2,
      ),
      cornice,
    )
    cap.position.set(x, wallH + 0.14, z)
    scene.add(cap)
  }

  // Corner pillars break the endless-wall look.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, wallH + 0.9, 1.3), flat(0x4a5058))
      pillar.position.set(sx * (half + wallT / 2), (wallH + 0.9) / 2, sz * (half + wallT / 2))
      scene.add(pillar)
    }
  }

  // Painted border line on the floor.
  const lineMat = flat(0xe3ddcc)
  const edge = half - 0.5
  for (const [w, d, x, z] of [
    [half * 2 - 1, 0.5, 0, -edge],
    [half * 2 - 1, 0.5, 0, edge],
    [0.5, half * 2 - 1, -edge, 0],
    [0.5, half * 2 - 1, edge, 0],
  ] as const) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), lineMat)
    strip.position.set(x, 0.035, z)
    scene.add(strip)
  }

  const rects: Rect[] = []
  for (const p of PROPS) {
    addProp(scene, p)
    rects.push({ x: p.x, z: p.z, hx: p.hx, hz: p.hz })
  }

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6a7a5a, 1.15))
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.9)
  sun.position.set(18, 30, 12)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xbfe3ff, 0.45)
  fill.position.set(-14, 12, -18)
  scene.add(fill)

  return rects
}
