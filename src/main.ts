import * as THREE from 'three'
import { MeshBasicNodeMaterial, PMREMGenerator, WebGPURenderer } from 'three/webgpu'
import './style.css'
import { ARENA, ENEMIES, type EnemyKind } from './config.ts'
import { createBulletSystem } from './bullets.ts'
import { createFxSystem } from './fx.ts'
import { createGame, pause, resume, returnToMenu, start, update, type FxEvent, type Game } from './game.ts'
import { createHud, type QualityPreset } from './hud.ts'
import { createInput, requestLock } from './input.ts'
import { buildTurret } from './meshes.ts'
import {
  createVehicle,
  loadVehicles,
  setVehicleFlash,
  type VehicleKind,
  type VehicleView,
} from './models.ts'
import { raycastArena, raycastCircle } from './rules.ts'
import { buildArena } from './scene.ts'

interface Pose {
  x: number
  z: number
  yaw: number
}

interface EnemyVisual {
  view: VehicleView
  kind: EnemyKind
  prev: Pose
  lastRx: number
  lastRz: number
  flash: number
  recoil: number
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** Generates a single static sky/sand IBL cubemap so metallic glTF materials reflect the arena. */
function buildStaticEnvironment(renderer: WebGPURenderer, scene: THREE.Scene): THREE.Texture {
  const envScene = new THREE.Scene()

  const skyMat = new THREE.MeshBasicMaterial({ color: 0x9ac6e4, side: THREE.BackSide })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 12, 8), skyMat)
  envScene.add(sky)

  const groundMat = new THREE.MeshBasicMaterial({ color: 0xc2af82 })
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 16), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -4
  envScene.add(ground)

  const sunCardMat = new THREE.MeshBasicMaterial()
  sunCardMat.color.setRGB(3.6, 3.1, 2.3)
  const sunCard = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), sunCardMat)
  sunCard.position.set(9, 12, 6)
  sunCard.lookAt(0, 0, 0)
  envScene.add(sunCard)

  const fillCardMat = new THREE.MeshBasicMaterial()
  fillCardMat.color.setRGB(1.3, 1.7, 2.2)
  const fillCard = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), fillCardMat)
  fillCard.position.set(-9, 7, -9)
  fillCard.lookAt(0, 0, 0)
  envScene.add(fillCard)

  const pmrem = new PMREMGenerator(renderer)
  const rt = pmrem.fromScene(envScene, 0.04)
  scene.environment = rt.texture
  scene.environmentIntensity = 0.72

  pmrem.dispose()
  sky.geometry.dispose()
  skyMat.dispose()
  ground.geometry.dispose()
  groundMat.dispose()
  sunCard.geometry.dispose()
  sunCardMat.dispose()
  fillCard.geometry.dispose()
  fillCardMat.dispose()
  return rt.texture
}

const canvas = document.querySelector<HTMLCanvasElement>('#game')!
const ui = document.querySelector<HTMLElement>('#ui')!

const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.AgXToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.type = THREE.PCFShadowMap
await renderer.init()

const scene = new THREE.Scene()
buildStaticEnvironment(renderer, scene)
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 280)

const { obstacles, sun } = buildArena(scene)
const game: Game = createGame(obstacles)
const input = createInput(canvas)
const fx = createFxSystem(scene)
const bullets = createBulletSystem(scene)

let quality: QualityPreset = 'high'
try {
  if (localStorage.getItem('arena-quality') === 'low') quality = 'low'
} catch {
  // Ignore storage access errors in restricted environments.
}

function applyQuality(preset: QualityPreset): void {
  quality = preset
  const high = preset === 'high'
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.5 : 1.0))
  renderer.shadowMap.enabled = high
  sun.castShadow = high
  hud.setQuality(preset)
  try {
    localStorage.setItem('arena-quality', preset)
  } catch {
    // Ignore storage access errors.
  }
}

let lastPausedAt = 0

function pauseGame(): void {
  if (game.phase !== 'playing') return
  pause(game)
  lastPausedAt = performance.now()
  input.clear()
  acc = 0
  snapshotPrev()
}

function resumeGame(): void {
  if (game.phase !== 'paused') return
  resume(game)
  input.clear()
  acc = 0
  last = performance.now()
  snapshotPrev()
  prevPx = game.player.x
  prevPz = game.player.z
  prevRenderYaw = game.player.yaw
}

function restartGame(): void {
  start(game)
  resetVisualState()
  input.clear()
  acc = 0
  last = performance.now()
}

function goToMenu(): void {
  returnToMenu(game)
  resetVisualState()
  input.clear()
  acc = 0
  last = performance.now()
}

const hud = createHud(ui, {
  onToggleQuality: () => applyQuality(quality === 'high' ? 'low' : 'high'),
  onResume: () => {
    resumeGame()
    requestLock(canvas)
  },
  onRestart: () => {
    restartGame()
    requestLock(canvas)
  },
  onMenu: () => {
    goToMenu()
  },
})
applyQuality(quality)

const templates = await loadVehicles()

const player = createVehicle(templates, 'buggy')
const turret = buildTurret(player.height)
turret.root.position.y = player.height * 0.85
player.tiltGroup.add(turret.root)
scene.add(player.root)

// Dynamic obstacle-clipped aim beam + impact dot anchored to the turret muzzle.
const aimGeo = new THREE.CylinderGeometry(0.036, 0.036, 1, 6)
aimGeo.rotateX(Math.PI / 2)
aimGeo.translate(0, 0, -0.5)
const aimMat = new MeshBasicNodeMaterial({
  color: 0xffe478,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
  toneMapped: false,
})
const aimBeam = new THREE.Mesh(aimGeo, aimMat)
aimBeam.position.set(0, turret.muzzleY, turret.muzzleZ)
turret.root.add(aimBeam)

const aimDotMat = new MeshBasicNodeMaterial({ color: 0xffe885, toneMapped: false })
const aimDot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), aimDotMat)
aimDot.position.set(0, turret.muzzleY, turret.muzzleZ - 10)
turret.root.add(aimDot)

const ENEMY_MODEL: Record<EnemyKind, VehicleKind> = {
  scout: 'buggyEnemy',
  tank: 'tank',
  boss: 'boss',
}
const freeByKind: Record<EnemyKind, VehicleView[]> = { scout: [], tank: [], boss: [] }
const enemyVisuals = new Map<number, EnemyVisual>()
const seenEnemies = new Set<number>()

const camFollow = new THREE.Vector3()
const camTarget = new THREE.Vector3()

const prevPlayer = { x: 0, z: 0, yaw: 0, turret: 0 }
let turretRecoil = 0
let playerSteer = 0
let playerPitch = 0
let playerRoll = 0
let dustTimer = 0
let prevPx = 0
let prevPz = 0
let prevRenderYaw = 0

function resetVisualState(): void {
  prevPlayer.x = game.player.x
  prevPlayer.z = game.player.z
  prevPlayer.yaw = game.player.yaw
  prevPlayer.turret = game.player.turret
  prevPx = game.player.x
  prevPz = game.player.z
  prevRenderYaw = game.player.yaw
  turretRecoil = 0
  playerSteer = 0
  playerPitch = 0
  playerRoll = 0
  dustTimer = 0
  for (const ev of enemyVisuals.values()) {
    setVehicleFlash(ev.view, 0)
    if (ev.view.gunNode) ev.view.gunNode.position.x = ev.view.gunRestX
    scene.remove(ev.view.root)
    freeByKind[ev.kind].push(ev.view)
  }
  enemyVisuals.clear()
  fx.reset()
  bullets.reset()
}

function handleEvents(events: FxEvent[]): void {
  for (const ev of events) {
    if (ev.kind === 'shot') {
      const spd = Math.hypot(ev.vx, ev.vz) || 1
      const dx = ev.vx / spd
      const dz = ev.vz / spd
      if (ev.ownerId === 0) {
        turretRecoil = 1
        const aim = game.player.turret
        const mx = game.player.x - Math.sin(aim) * 1.65
        const mz = game.player.z - Math.cos(aim) * 1.65
        fx.spawnMuzzle(mx, player.height * 0.85 + turret.muzzleY, mz, dx, dz, false)
      } else {
        const enemyVis = enemyVisuals.get(ev.ownerId)
        if (enemyVis) enemyVis.recoil = 1
        fx.spawnMuzzle(ev.x + dx * 1.4, 1.1, ev.z + dz * 1.4, dx, dz, true)
      }
    } else if (ev.kind === 'wallHit') {
      fx.spawnImpact(ev.x, 0.9, ev.z, ev.hostile)
    } else if (ev.kind === 'enemyHit') {
      if (ev.killed) {
        // Killed enemies are already removed by syncEnemies() this frame; play explosion instead of mesh flash.
        fx.spawnExplosion(ev.x, ev.z, ev.enemyKind)
      } else {
        const enemyVis = enemyVisuals.get(ev.id)
        if (enemyVis) {
          enemyVis.flash = 1
          setVehicleFlash(enemyVis.view, 1)
        }
        fx.spawnImpact(ev.x, 0.9, ev.z, false)
      }
    } else if (ev.kind === 'playerHit') {
      fx.spawnImpact(ev.x, 0.9, ev.z, true)
      hud.triggerHit()
    }
  }
}

function syncPlayerVisuals(dt: number, alpha: number): void {
  const p = game.player
  const rx = prevPlayer.x + (p.x - prevPlayer.x) * alpha
  const rz = prevPlayer.z + (p.z - prevPlayer.z) * alpha
  const ryaw = lerpAngle(prevPlayer.yaw, p.yaw, alpha)
  const rturret = lerpAngle(prevPlayer.turret, p.turret, alpha)

  player.root.position.set(rx, 0, rz)
  player.root.rotation.y = ryaw
  turret.root.rotation.y = rturret - ryaw

  // Spin wheels along driven distance (local forward +Z maps to world -Z via yaw = PI).
  const dx = rx - prevPx
  const dz = rz - prevPz
  const forwardDot = -Math.sin(ryaw) * dx - Math.cos(ryaw) * dz
  prevPx = rx
  prevPz = rz

  for (const w of player.wheels) w.rotation.x += forwardDot / 0.3

  const targetSteer = (input.state.left ? 0.38 : 0) + (input.state.right ? -0.38 : 0)
  playerSteer += (targetSteer - playerSteer) * Math.min(1, dt * 14)
  for (const sp of player.steerPivots) sp.rotation.y = playerSteer

  // Suspension pitch (throttle/brake) and body roll (turning speed).
  const driveInput = (input.state.forward ? 1 : 0) - (input.state.back ? 1 : 0)
  const yawRate = dt > 1e-4 ? (ryaw - prevRenderYaw) / dt : 0
  prevRenderYaw = ryaw
  const targetPitch = game.phase === 'playing' ? driveInput * 0.045 : 0
  const targetRoll = Math.max(-0.08, Math.min(0.08, -yawRate * 0.022))
  playerPitch += (targetPitch - playerPitch) * Math.min(1, dt * 10)
  playerRoll += (targetRoll - playerRoll) * Math.min(1, dt * 10)
  player.tiltGroup.rotation.x = playerPitch
  player.tiltGroup.rotation.z = playerRoll

  // Turret barrel recoil spring-back.
  turretRecoil = Math.max(0, turretRecoil - dt * 9)
  turret.recoilGroup.position.z = turretRecoil * 0.24

  // Tire dust trail when moving.
  if (game.phase === 'playing' && Math.abs(forwardDot) > 0.025) {
    dustTimer -= dt
    if (dustTimer <= 0) {
      dustTimer = 0.055
      const bx = rx + Math.sin(ryaw) * 1.25
      const bz = rz + Math.cos(ryaw) * 1.25
      fx.spawnDust(bx, bz, Math.sin(ryaw) * 2.2, Math.cos(ryaw) * 2.2, 0.72)
    }
  }

  // Obstacle- and enemy-clipped laser sight (cast from vehicle center so nose-to-wall stays clamped).
  const aim = rturret
  const adx = -Math.sin(aim)
  const adz = -Math.cos(aim)
  const muzzleOffset = -turret.muzzleZ
  const maxLen = 36
  let distFromCenter = raycastArena(rx, rz, adx, adz, maxLen + muzzleOffset, ARENA.half, obstacles)
  let lockEnemy = false
  for (const e of game.enemies) {
    const dEnemy = raycastCircle(rx, rz, adx, adz, e.x, e.z, ENEMIES[e.kind].radius, distFromCenter)
    if (dEnemy < distFromCenter) {
      distFromCenter = dEnemy
      lockEnemy = true
    }
  }
  const safeLen = Math.max(0.25, distFromCenter - muzzleOffset)
  aimBeam.scale.z = safeLen
  aimDot.position.z = turret.muzzleZ - safeLen
  aimDotMat.color.setHex(lockEnemy ? 0xff5a4e : 0xffe885)
  aimMat.color.setHex(lockEnemy ? 0xff7b66 : 0xffe478)
}

function syncEnemies(dt: number, alpha: number): void {
  seenEnemies.clear()
  for (const e of game.enemies) {
    seenEnemies.add(e.id)
    let ev = enemyVisuals.get(e.id)
    if (!ev) {
      const pool = freeByKind[e.kind]
      const view = pool.pop() ?? createVehicle(templates, ENEMY_MODEL[e.kind])
      setVehicleFlash(view, 0)
      if (view.gunNode) view.gunNode.position.x = view.gunRestX
      scene.add(view.root)
      ev = {
        view,
        kind: e.kind,
        prev: { x: e.x, z: e.z, yaw: e.yaw },
        lastRx: e.x,
        lastRz: e.z,
        flash: 0,
        recoil: 0,
      }
      enemyVisuals.set(e.id, ev)
    }

    const rx = ev.prev.x + (e.x - ev.prev.x) * alpha
    const rz = ev.prev.z + (e.z - ev.prev.z) * alpha
    const ryaw = lerpAngle(ev.prev.yaw, e.yaw, alpha)
    ev.view.root.position.set(rx, 0, rz)
    ev.view.root.rotation.y = ryaw

    const frameDist = Math.hypot(rx - ev.lastRx, rz - ev.lastRz)
    ev.lastRx = rx
    ev.lastRz = rz
    if (ev.view.wheels.length > 0 && frameDist > 1e-4) {
      for (const w of ev.view.wheels) w.rotation.x += frameDist / 0.3
    }
    if (ev.view.mixer) {
      const stepDist = Math.hypot(e.x - ev.prev.x, e.z - ev.prev.z)
      const statsSpeed = ENEMIES[e.kind].speed
      const speedRatio = Math.min(1.2, (stepDist * 60) / statsSpeed)
      if (speedRatio > 0.05) ev.view.mixer.update(dt * speedRatio)
    }
    if (ev.recoil > 0) {
      ev.recoil = Math.max(0, ev.recoil - dt * 6.5)
      if (ev.view.gunNode) ev.view.gunNode.position.x = ev.view.gunRestX + ev.recoil * 0.85
    }
    if (ev.flash > 0) {
      ev.flash = Math.max(0, ev.flash - dt * 10)
      setVehicleFlash(ev.view, ev.flash)
    }
  }

  for (const [id, ev] of enemyVisuals) {
    if (seenEnemies.has(id)) continue
    setVehicleFlash(ev.view, 0)
    if (ev.view.gunNode) ev.view.gunNode.position.x = ev.view.gunRestX
    scene.remove(ev.view.root)
    enemyVisuals.delete(id)
    freeByKind[ev.kind].push(ev.view)
  }
}

function syncCamera(dt: number, alpha: number): void {
  const p = game.player
  const rx = prevPlayer.x + (p.x - prevPlayer.x) * alpha
  const rz = prevPlayer.z + (p.z - prevPlayer.z) * alpha
  const rturret = lerpAngle(prevPlayer.turret, p.turret, alpha)
  const fxDir = -Math.sin(rturret)
  const fzDir = -Math.cos(rturret)
  camFollow.set(rx - fxDir * 9.2, 9.2, rz - fzDir * 9.2)
  camTarget.set(rx + fxDir * 2.0, 1.0, rz + fzDir * 2.0)
  const k = 1 - Math.pow(0.00005, dt)
  camera.position.lerp(camFollow, k)
  camera.lookAt(camTarget)
  if (dt > 0 && game.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * game.shake * 1.5
    camera.position.y += (Math.random() - 0.5) * game.shake * 1.5
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

document.addEventListener('pointerlockchange', () => {
  if (game.phase === 'playing' && document.pointerLockElement !== canvas) {
    pauseGame()
  }
})

window.addEventListener('blur', () => {
  if (game.phase === 'playing') pauseGame()
})

window.addEventListener('click', (e) => {
  const target = e.target as HTMLElement | null
  if (target?.closest('button')) return
  if (game.phase === 'menu' || game.phase === 'over') {
    restartGame()
    requestLock(canvas)
  } else if (game.phase === 'playing') {
    requestLock(canvas)
  }
})

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (e.repeat) return
    if (game.phase === 'playing') {
      pauseGame()
    } else if (game.phase === 'paused') {
      // Esc resumes the game directly; skip the keydown that can fire alongside pointerlockchange on the same press.
      if (performance.now() - lastPausedAt >= 250) {
        resumeGame()
        requestLock(canvas)
      }
    }
    return
  }
  if (e.code === 'KeyR' && game.phase === 'over') {
    restartGame()
  } else if (e.code === 'KeyG') {
    applyQuality(quality === 'high' ? 'low' : 'high')
  }
})

const STEP = 1 / 60
let last = performance.now()
let acc = 0
const frameEvents: FxEvent[] = []

function snapshotPrev(): void {
  prevPlayer.x = game.player.x
  prevPlayer.z = game.player.z
  prevPlayer.yaw = game.player.yaw
  prevPlayer.turret = game.player.turret
  for (const e of game.enemies) {
    const ev = enemyVisuals.get(e.id)
    if (ev) {
      ev.prev.x = e.x
      ev.prev.z = e.z
      ev.prev.yaw = e.yaw
    }
  }
}

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  frameEvents.length = 0

  if (game.phase === 'paused') {
    acc = 0
    input.endFrame()
  } else {
    acc += dt
    if (acc > STEP * 5) acc = STEP * 5

    input.beginFrame()
    while (acc >= STEP) {
      snapshotPrev()
      update(game, STEP, input.state, frameEvents)
      // mouse delta belongs to the frame, not to every fixed step
      input.state.yawDelta = 0
      acc -= STEP
    }
    input.endFrame()
  }

  const paused = game.phase === 'paused'
  const simDt = paused ? 0 : dt
  const alpha = game.phase === 'playing' ? acc / STEP : 1
  syncPlayerVisuals(simDt, alpha)
  syncEnemies(simDt, alpha)
  if (!paused) {
    handleEvents(frameEvents)
    fx.update(dt)
  }
  bullets.sync(game.bullets, camera, paused)
  syncCamera(simDt, alpha)
  hud.update(game)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
