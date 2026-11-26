import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
import { ARENA } from './config.ts'
import { mulberry32, type Rect } from './rules.ts'

export interface ArenaBuild {
  obstacles: Rect[]
  sun: THREE.DirectionalLight
  setDetailMaps(enabled: boolean): void
}

export interface ArenaOptions {
  /** Set false via `?perf=1&bump=0` to strip floor/wall bumpMap and roughnessMap for A/B fillrate testing. */
  bump?: boolean
}

interface SurfaceMaps {
  map: THREE.CanvasTexture
  roughnessMap?: THREE.CanvasTexture
  bumpMap?: THREE.CanvasTexture
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

let sharedShadowMaterial: MeshBasicNodeMaterial | null = null

/** Soft radial contact shadow material shared by props and vehicles. */
export function getSoftShadowMaterial(): MeshBasicNodeMaterial {
  if (sharedShadowMaterial) return sharedShadowMaterial

  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const half = size / 2
  const grad = g.createRadialGradient(half, half, 2, half, half, half)
  grad.addColorStop(0, 'rgba(26, 22, 16, 0.34)')
  grad.addColorStop(0.55, 'rgba(26, 22, 16, 0.16)')
  grad.addColorStop(1, 'rgba(26, 22, 16, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  sharedShadowMaterial = new MeshBasicNodeMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  return sharedShadowMaterial
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

function configureRepeatedTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 4
  tex.colorSpace = colorSpace
  return tex
}

/** Procedural sandstone tile albedo, roughness and bump textures (built once). */
function arenaFloorMaps(withDetailMaps = true): SurfaceMaps {
  const size = 512
  const half = size / 2
  const [c, g] = makeCanvas(size, size)
  const [rc, rg] = withDetailMaps ? makeCanvas(size, size) : [null, null]
  const [bc, bg] = withDetailMaps ? makeCanvas(size, size) : [null, null]
  const rng = mulberry32(0x13572468)

  const tiles: Array<[number, number, string, number]> = [
    [0, 0, '#cbb98b', 206],
    [half, 0, '#c2b081', 214],
    [0, half, '#c4b283', 212],
    [half, half, '#cbb98b', 204],
  ]

  for (const [tx, ty, base, rough] of tiles) {
    g.fillStyle = base
    g.fillRect(tx, ty, half, half)
    if (rg && bg) {
      rg.fillStyle = `rgb(${rough},${rough},${rough})`
      rg.fillRect(tx, ty, half, half)
      bg.fillStyle = 'rgb(168,168,168)'
      bg.fillRect(tx, ty, half, half)
    }
  }

  // Deterministic sand speckles and subtle tactical scuffs.
  for (let i = 0; i < 3800; i++) {
    const x = rng() * size
    const y = rng() * size
    const w = 1 + rng() * 3
    const dark = rng() < 0.55
    g.fillStyle = dark ? 'rgba(95, 80, 52, 0.08)' : 'rgba(248, 238, 210, 0.07)'
    g.fillRect(x, y, w, w)
    if (rg && bg) {
      const rVal = dark ? 228 : 196
      rg.fillStyle = `rgba(${rVal},${rVal},${rVal},0.35)`
      rg.fillRect(x, y, w, w)
      const bVal = dark ? 140 : 185
      bg.fillStyle = `rgba(${bVal},${bVal},${bVal},0.35)`
      bg.fillRect(x, y, w, w)
    }
  }

  // Tile seams with subtle bevel edge.
  for (const pos of [0, half]) {
    g.fillStyle = 'rgba(72, 62, 42, 0.24)'
    g.fillRect(pos, 0, 4, size)
    g.fillRect(0, pos, size, 4)
    g.fillStyle = 'rgba(255, 246, 224, 0.16)'
    g.fillRect(pos + 4, 0, 2, size)
    g.fillRect(0, pos + 4, size, 2)

    if (rg && bg) {
      rg.fillStyle = 'rgb(244,244,244)'
      rg.fillRect(pos, 0, 5, size)
      rg.fillRect(0, pos, size, 5)

      bg.fillStyle = 'rgb(90,90,90)'
      bg.fillRect(pos, 0, 4, size)
      bg.fillRect(0, pos, size, 4)
    }
  }

  const map = configureRepeatedTexture(c, THREE.SRGBColorSpace, 11, 11)
  if (!rc || !bc) return { map }
  return {
    map,
    roughnessMap: configureRepeatedTexture(rc, THREE.NoColorSpace, 11, 11),
    bumpMap: configureRepeatedTexture(bc, THREE.NoColorSpace, 11, 11),
  }
}

/** Modular steel barrier panels + rivets + base ambient occlusion for arena walls. */
function wallMaps(withDetailMaps = true): SurfaceMaps {
  const w = 512
  const h = 256
  const [c, g] = makeCanvas(w, h)
  const [rc, rg] = withDetailMaps ? makeCanvas(w, h) : [null, null]
  const [bc, bg] = withDetailMaps ? makeCanvas(w, h) : [null, null]

  g.fillStyle = '#6d8ba6'
  g.fillRect(0, 0, w, h)
  if (rg && bg) {
    rg.fillStyle = 'rgb(185,185,185)'
    rg.fillRect(0, 0, w, h)
    bg.fillStyle = 'rgb(155,155,155)'
    bg.fillRect(0, 0, w, h)
  }

  const panels = 8
  const pw = w / panels
  for (let i = 0; i < panels; i++) {
    const x = i * pw
    g.fillStyle = i % 2 ? '#64829d' : '#7391ac'
    g.fillRect(x + 3, 10, pw - 6, h - 38)
    if (bg) {
      bg.fillStyle = 'rgb(172,172,172)'
      bg.fillRect(x + 3, 10, pw - 6, h - 38)
    }

    // Seam shadow
    g.fillStyle = '#4f6981'
    g.fillRect(x, 0, 3, h)
    if (bg) {
      bg.fillStyle = 'rgb(96,96,96)'
      bg.fillRect(x, 0, 3, h)
    }

    // Rivets
    g.fillStyle = '#8fa9c2'
    if (rg && bg) {
      bg.fillStyle = 'rgb(220,220,220)'
      rg.fillStyle = 'rgb(125,125,125)'
    }
    for (const rx of [x + 10, x + pw - 14]) {
      for (const ry of [18, h - 44]) {
        g.fillRect(rx, ry, 4, 4)
        if (rg && bg) {
          bg.fillRect(rx, ry, 4, 4)
          rg.fillRect(rx, ry, 4, 4)
        }
      }
    }
  }

  // Lower technical stripe + muted hazard chevrons.
  g.fillStyle = '#485f74'
  g.fillRect(0, h - 34, w, 34)
  g.fillStyle = '#c89e4c'
  for (let x = -32; x < w + 32; x += 32) {
    g.beginPath()
    g.moveTo(x, h - 28)
    g.lineTo(x + 14, h - 28)
    g.lineTo(x + 4, h - 10)
    g.lineTo(x - 10, h - 10)
    g.closePath()
    g.fill()
  }

  // Vertical AO near the floor seam and bright bevel near top edge.
  const ao = g.createLinearGradient(0, h - 56, 0, h)
  ao.addColorStop(0, 'rgba(20, 26, 32, 0)')
  ao.addColorStop(1, 'rgba(20, 26, 32, 0.36)')
  g.fillStyle = ao
  g.fillRect(0, h - 56, w, 56)

  g.fillStyle = '#8ba6bf'
  g.fillRect(0, 0, w, 8)
  if (rg) {
    rg.fillStyle = 'rgb(145,145,145)'
    rg.fillRect(0, 0, w, 8)
  }

  const map = configureRepeatedTexture(c, THREE.SRGBColorSpace, 7, 1)
  if (!rc || !bc) return { map }
  return {
    map,
    roughnessMap: configureRepeatedTexture(rc, THREE.NoColorSpace, 7, 1),
    bumpMap: configureRepeatedTexture(bc, THREE.NoColorSpace, 7, 1),
  }
}

/** Paint vertex colors with optional vertical ambient occlusion and apply transform. */
function paintAndPlace(
  geo: THREE.BufferGeometry,
  colorHex: number,
  x: number,
  y: number,
  z: number,
  bottomShade = 0.78,
  topShade = 1.04,
): THREE.BufferGeometry {
  geo.translate(x, y, z)
  const pos = geo.attributes.position
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i)
    if (py < minY) minY = py
    if (py > maxY) maxY = py
  }
  const span = maxY - minY
  const base = new THREE.Color(colorHex)
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const t = span > 1e-5 ? (pos.getY(i) - minY) / span : 1
    const shade = bottomShade + (topShade - bottomShade) * t
    colors[i * 3] = base.r * shade
    colors[i * 3 + 1] = base.g * shade
    colors[i * 3 + 2] = base.b * shade
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geo
}

function mergeGroup(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geos, false)
  for (const g of geos) g.dispose()
  if (!merged) throw new Error('Failed to merge static arena geometry')
  return merged
}

/** Gradient sky dome with subtle warm sun halo so alpha:false works seamlessly with Fog. */
function buildSkyDome(sunDir: THREE.Vector3): THREE.Mesh {
  const geo = new THREE.SphereGeometry(140, 24, 14)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const dir = new THREE.Vector3()
  const horizon = new THREE.Color(0xe4dcc6)
  const midSky = new THREE.Color(0xb6d6e8)
  const zenith = new THREE.Color(0x5b94c2)
  const ground = new THREE.Color(0xb8a67d)
  const sunGlow = new THREE.Color(0xfff3d1)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    dir.fromBufferAttribute(pos, i).normalize()
    const h = dir.y
    if (h >= 0) {
      if (h < 0.3) c.copy(horizon).lerp(midSky, h / 0.3)
      else c.copy(midSky).lerp(zenith, (h - 0.3) / 0.7)
    } else {
      c.copy(horizon).lerp(ground, Math.min(1, -h * 3))
    }
    const sunAmt = Math.pow(Math.max(0, dir.dot(sunDir)), 14) * 0.45
    c.lerp(sunGlow, sunAmt)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(
    geo,
    new MeshBasicNodeMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  )
  // Render at the end of the opaque pass (before transparents) so Early-Z discards sky pixels occluded by floor/walls/tanks.
  mesh.renderOrder = 1
  return mesh
}

/** Outer desert ground plane and low-poly perimeter dunes outside the arena walls. */
function buildOuterTerrain(half: number): THREE.Group {
  const group = new THREE.Group()
  const apronGeo = new THREE.PlaneGeometry(260, 260)
  apronGeo.rotateX(-Math.PI / 2)
  const apron = new THREE.Mesh(
    apronGeo,
    new MeshStandardNodeMaterial({ color: 0xc8b78c, roughness: 0.96, metalness: 0 }),
  )
  apron.position.y = -0.08
  group.add(apron)

  // Low-poly desert rock formations outside the playable perimeter (1 draw call).
  const rng = mulberry32(0x76543210)
  const rockGeos: THREE.BufferGeometry[] = []
  const count = 16
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.25
    const dist = half + 11 + rng() * 34
    const radius = 3.2 + rng() * 4.5
    const height = 1.8 + rng() * 4.2
    const g = new THREE.ConeGeometry(radius, height, 6)
    g.rotateY(rng() * Math.PI)
    const col = i % 2 === 0 ? 0xb59f74 : 0xa58e66
    rockGeos.push(paintAndPlace(g, col, Math.cos(a) * dist, height * 0.42 - 0.1, Math.sin(a) * dist, 0.72, 1.05))
  }
  const rocks = new THREE.Mesh(
    mergeGroup(rockGeos),
    new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, flatShading: true }),
  )
  group.add(rocks)
  return group
}

function makeSurfaceMaterial(
  maps: SurfaceMaps,
  bumpScale: number,
  roughness: number,
  metalness: number,
): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial({ map: maps.map, roughness, metalness })
  if (maps.roughnessMap && maps.bumpMap) {
    mat.roughnessMap = maps.roughnessMap
    mat.bumpMap = maps.bumpMap
    mat.bumpScale = bumpScale
  }
  return mat
}

/** Builds the batched arena, procedural PBR maps, sky, fog, lighting, and shadow rig. */
export function buildArena(scene: THREE.Scene, options?: ArenaOptions): ArenaBuild {
  let detailEnabled = options?.bump !== false
  const half = ARENA.half
  const wallT = ARENA.wallThickness
  const wallH = ARENA.wallHeight

  scene.fog = new THREE.Fog(0xdfd7bf, 44, 112)
  const sunPos = new THREE.Vector3(24, 25, 14)
  scene.add(buildSkyDome(sunPos.clone().normalize()))
  scene.add(buildOuterTerrain(half))

  // Arena floor
  const floorMaps = arenaFloorMaps(detailEnabled)
  let floorDetailMat = detailEnabled ? makeSurfaceMaterial(floorMaps, 0.03, 0.9, 0.02) : null
  let floorPlainMat = detailEnabled ? null : makeSurfaceMaterial({ map: floorMaps.map }, 0.03, 0.9, 0.02)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2, half * 2),
    (detailEnabled ? floorDetailMat : floorPlainMat)!,
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Tactical painted markings (perimeter lines + center ring) merged into 1 draw call.
  const markGeos: THREE.BufferGeometry[] = []
  const edge = half - 0.55
  for (const [w, d, x, z] of [
    [half * 2 - 1.1, 0.42, 0, -edge],
    [half * 2 - 1.1, 0.42, 0, edge],
    [0.42, half * 2 - 1.1, -edge, 0],
    [0.42, half * 2 - 1.1, edge, 0],
  ] as const) {
    const strip = new THREE.PlaneGeometry(w, d)
    strip.rotateX(-Math.PI / 2)
    strip.translate(x, 0.015, z)
    markGeos.push(strip)
  }
  const ring = new THREE.RingGeometry(4.8, 5.15, 40)
  ring.rotateX(-Math.PI / 2)
  ring.translate(0, 0.015, 0)
  markGeos.push(ring)
  const markings = new THREE.Mesh(
    mergeGroup(markGeos),
    new MeshStandardNodeMaterial({ color: 0xe3ddcc, roughness: 0.85, metalness: 0.02 }),
  )
  markings.receiveShadow = true
  scene.add(markings)

  // Walls (4 merged into 1 mesh) + caps/pillars (merged into 1 vertex-colored mesh).
  const wMaps = wallMaps(detailEnabled)
  const wallGeos: THREE.BufferGeometry[] = []
  const trimGeos: THREE.BufferGeometry[] = []
  const span = half * 2 + wallT * 2

  for (const [w, d, x, z, capW, capD] of [
    [span, wallT, 0, -half - wallT / 2, span, wallT * 1.28],
    [span, wallT, 0, half + wallT / 2, span, wallT * 1.28],
    [wallT, span, -half - wallT / 2, 0, wallT * 1.28, span],
    [wallT, span, half + wallT / 2, 0, wallT * 1.28, span],
  ] as const) {
    const wallGeo = new THREE.BoxGeometry(w, wallH, d)
    wallGeo.translate(x, wallH / 2, z)
    wallGeos.push(wallGeo)
    trimGeos.push(paintAndPlace(new THREE.BoxGeometry(capW, 0.28, capD), 0xcbb282, x, wallH + 0.14, z, 0.9, 1.05))
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const h = wallH + 0.95
      trimGeos.push(
        paintAndPlace(
          new THREE.BoxGeometry(1.4, h, 1.4),
          0x4a5058,
          sx * (half + wallT / 2),
          h / 2,
          sz * (half + wallT / 2),
          0.72,
          1.05,
        ),
      )
    }
  }

  let wallDetailMat = detailEnabled ? makeSurfaceMaterial(wMaps, 0.035, 0.78, 0.18) : null
  let wallPlainMat = detailEnabled ? null : makeSurfaceMaterial({ map: wMaps.map }, 0.035, 0.78, 0.18)
  const wallMesh = new THREE.Mesh(
    mergeGroup(wallGeos),
    (detailEnabled ? wallDetailMat : wallPlainMat)!,
  )
  wallMesh.castShadow = true
  wallMesh.receiveShadow = true
  scene.add(wallMesh)

  const trimMesh = new THREE.Mesh(
    mergeGroup(trimGeos),
    new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.2, flatShading: true }),
  )
  trimMesh.castShadow = true
  trimMesh.receiveShadow = true
  scene.add(trimMesh)

  // Obstacles batched by surface finish (matte wood/concrete vs metallic barrels) + 1 shadow blob batch.
  const mattePropGeos: THREE.BufferGeometry[] = []
  const barrelGeos: THREE.BufferGeometry[] = []
  const blobGeos: THREE.BufferGeometry[] = []
  const rects: Rect[] = []

  for (const p of PROPS) {
    rects.push({ x: p.x, z: p.z, hx: p.hx, hz: p.hz })

    const r = Math.max(p.hx, p.hz) * 1.45
    const blob = new THREE.PlaneGeometry(r * 2, r * 2)
    blob.rotateX(-Math.PI / 2)
    blob.translate(p.x, 0.02, p.z)
    blobGeos.push(blob)

    if (p.kind === 'barrel') {
      barrelGeos.push(
        paintAndPlace(new THREE.CylinderGeometry(p.hx, p.hx, p.height, 14), p.color, p.x, p.height / 2, p.z, 0.72, 1.06),
      )
      for (const yRatio of [0.24, 0.5, 0.76]) {
        barrelGeos.push(
          paintAndPlace(
            new THREE.CylinderGeometry(p.hx * 1.03, p.hx * 1.03, 0.065, 14),
            0x2d3038,
            p.x,
            p.height * yRatio,
            p.z,
            0.85,
            1.05,
          ),
        )
      }
    } else {
      mattePropGeos.push(
        paintAndPlace(new THREE.BoxGeometry(p.hx * 2, p.height, p.hz * 2), p.color, p.x, p.height / 2, p.z, 0.72, 1.04),
      )
      if (p.kind === 'crate') {
        for (const yRatio of [0.28, 0.72]) {
          mattePropGeos.push(
            paintAndPlace(
              new THREE.BoxGeometry(p.hx * 2.03, 0.14, p.hz * 2.03),
              0x745026,
              p.x,
              p.height * yRatio,
              p.z,
              0.8,
              1.0,
            ),
          )
        }
      }
    }
  }

  const matteProps = new THREE.Mesh(
    mergeGroup(mattePropGeos),
    new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.04, flatShading: true }),
  )
  matteProps.castShadow = true
  matteProps.receiveShadow = true
  scene.add(matteProps)

  const barrels = new THREE.Mesh(
    mergeGroup(barrelGeos),
    new MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.45, flatShading: true }),
  )
  barrels.castShadow = true
  barrels.receiveShadow = true
  scene.add(barrels)

  const propShadows = new THREE.Mesh(mergeGroup(blobGeos), getSoftShadowMaterial())
  propShadows.renderOrder = 1
  scene.add(propShadows)

  // Lights
  scene.add(new THREE.HemisphereLight(0xeef6ff, 0x7c6f52, 0.56))

  const sun = new THREE.DirectionalLight(0xfff0d0, 2.7)
  sun.position.copy(sunPos)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -26
  sun.shadow.camera.right = 26
  sun.shadow.camera.top = 26
  sun.shadow.camera.bottom = -26
  sun.shadow.camera.near = 8
  sun.shadow.camera.far = 88
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.035
  sun.shadow.radius = 1.4
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xaad2f5, 0.42)
  fill.position.set(-16, 14, -20)
  scene.add(fill)

  function setDetailMaps(enabled: boolean): void {
    if (enabled === detailEnabled) return
    detailEnabled = enabled
    if (enabled) {
      if (!floorDetailMat) {
        if (!floorMaps.roughnessMap || !floorMaps.bumpMap) {
          const extra = arenaFloorMaps(true)
          extra.map.dispose()
          floorMaps.roughnessMap = extra.roughnessMap
          floorMaps.bumpMap = extra.bumpMap
        }
        floorDetailMat = makeSurfaceMaterial(floorMaps, 0.03, 0.9, 0.02)
      }
      if (!wallDetailMat) {
        if (!wMaps.roughnessMap || !wMaps.bumpMap) {
          const extra = wallMaps(true)
          extra.map.dispose()
          wMaps.roughnessMap = extra.roughnessMap
          wMaps.bumpMap = extra.bumpMap
        }
        wallDetailMat = makeSurfaceMaterial(wMaps, 0.035, 0.78, 0.18)
      }
      floor.material = floorDetailMat
      wallMesh.material = wallDetailMat
    } else {
      floorPlainMat ??= makeSurfaceMaterial({ map: floorMaps.map }, 0.03, 0.9, 0.02)
      wallPlainMat ??= makeSurfaceMaterial({ map: wMaps.map }, 0.035, 0.78, 0.18)
      floor.material = floorPlainMat
      wallMesh.material = wallPlainMat
    }
  }

  return { obstacles: rects, sun, setDetailMaps }
}
