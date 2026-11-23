import * as THREE from 'three'
import { MeshBasicNodeMaterial, MeshLambertNodeMaterial, WebGPURenderer } from 'three/webgpu'
import './style.css'
import { BULLET, type EnemyKind } from './config.ts'
import { createGame, start, update, type Game } from './game.ts'
import { createHud } from './hud.ts'
import { createInput, requestLock } from './input.ts'
import { buildEnemyMesh, buildPlayerMesh, type VehicleView } from './meshes.ts'
import { buildArena } from './scene.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ui = document.querySelector<HTMLElement>('#ui')!

const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearAlpha(0)
await renderer.init()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 300)

const obstacles = buildArena(scene)
const game: Game = createGame(obstacles)
const input = createInput(canvas)
const hud = createHud(ui)

const player = buildPlayerMesh()
scene.add(player.root)

// Thin aim beam attached to the turret: shows exactly where bullets go.
const aimGeo = new THREE.CylinderGeometry(0.035, 0.035, 20, 6)
aimGeo.rotateX(Math.PI / 2)
const aimBeam = new THREE.Mesh(
  aimGeo,
  new MeshBasicNodeMaterial({ color: 0xffe066, transparent: true, opacity: 0.4, depthWrite: false }),
)
aimBeam.position.set(0, 0.34, -12)
player.turret.add(aimBeam)

// Enemies reuse vehicles per kind: spawning is frequent, allocation is not.
const freeByKind: Record<EnemyKind, VehicleView[]> = { scout: [], tank: [], boss: [] }
const enemyMeshes = new Map<number, VehicleView>()
const meshKind = new WeakMap<VehicleView, EnemyKind>()

const bulletGeo = new THREE.SphereGeometry(0.28, 6, 5)
function bulletPool(color: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    bulletGeo,
    new MeshLambertNodeMaterial({ color }),
    BULLET.max,
  )
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.count = 0
  scene.add(mesh)
  return mesh
}
const friendlyBullets = bulletPool(0xffe066)
const hostileBullets = bulletPool(0xff4d6d)
const matrix = new THREE.Matrix4()
const camFollow = new THREE.Vector3()
const camTarget = new THREE.Vector3()

function syncEnemies(): void {
  const seen = new Set<number>()
  for (const e of game.enemies) {
    seen.add(e.id)
    let view = enemyMeshes.get(e.id)
    if (!view) {
      const pool = freeByKind[e.kind]
      view = pool.pop() ?? buildEnemyMesh(e.kind)
      meshKind.set(view, e.kind)
      scene.add(view.root)
      enemyMeshes.set(e.id, view)
    }
    view.root.position.set(e.x, 0, e.z)
    view.root.rotation.y = e.yaw
  }
  for (const [id, view] of enemyMeshes) {
    if (seen.has(id)) continue
    scene.remove(view.root)
    enemyMeshes.delete(id)
    freeByKind[meshKind.get(view) ?? 'scout'].push(view)
  }
}

function syncBullets(): void {
  let friendly = 0
  let hostile = 0
  for (const b of game.bullets) {
    matrix.makeTranslation(b.x, 0.9, b.z)
    if (b.hostile) hostileBullets.setMatrixAt(hostile++, matrix)
    else friendlyBullets.setMatrixAt(friendly++, matrix)
  }
  friendlyBullets.count = friendly
  hostileBullets.count = hostile
  friendlyBullets.instanceMatrix.needsUpdate = true
  hostileBullets.instanceMatrix.needsUpdate = true
}

function syncCamera(dt: number): void {
  const p = game.player
  const fx = -Math.sin(p.yaw)
  const fz = -Math.cos(p.yaw)
  camFollow.set(p.x - fx * 9.5, 9.6, p.z - fz * 9.5)
  camTarget.set(p.x, 1.1, p.z)
  const k = 1 - Math.pow(0.001, dt)
  camera.position.lerp(camFollow, k)
  camera.lookAt(camTarget)
  if (game.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * game.shake * 1.5
    camera.position.y += (Math.random() - 0.5) * game.shake * 1.5
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener('click', () => {
  if (game.phase !== 'playing') start(game)
  requestLock(canvas)
})

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && game.phase === 'over') start(game)
})

const STEP = 1 / 60
let last = performance.now()
let acc = 0

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  acc += dt
  if (acc > STEP * 5) acc = STEP * 5

  input.beginFrame()
  while (acc >= STEP) {
    update(game, STEP, input.state)
    acc -= STEP
  }
  input.endFrame()

  const p = game.player
  player.root.position.set(p.x, 0, p.z)
  player.root.rotation.y = p.yaw
  player.turret.rotation.y = p.turret - p.yaw
  syncEnemies()
  syncBullets()
  syncCamera(dt)
  hud.update(game)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
