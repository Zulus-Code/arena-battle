import {
  ARENA,
  BULLET,
  ENEMIES,
  PLAYER_VEHICLES,
  WAVE,
  type EnemyKind,
  type PlayerVehicleKind,
} from './config.ts'
import { circlesHit, clamp, moveCircle, mulberry32, raycastArena, type Rect } from './rules.ts'

const MIN_SPAWN_DISTANCE = 16
const MAX_SIMULTANEOUS_FIRE = 2
const SPAWN_ATTEMPTS = 12

export interface Bullet {
  x: number
  z: number
  vx: number
  vz: number
  life: number
  damage: number
  radius: number
  hostile: boolean
}

export interface Enemy {
  id: number
  kind: EnemyKind
  x: number
  z: number
  yaw: number
  hp: number
  cooldown: number
  engageTimer: number
  touch: number
}

export interface PlayerState {
  x: number
  z: number
  /** Hull heading. */
  yaw: number
  /** World aim heading of the turret (0 = -Z). */
  turret: number
  hp: number
  maxHp: number
  cooldown: number
}

export type Phase = 'menu' | 'playing' | 'paused' | 'over'

export type FxEvent =
  | { kind: 'shot'; hostile: boolean; ownerId: number; x: number; z: number; vx: number; vz: number }
  | { kind: 'wallHit'; hostile: boolean; x: number; z: number }
  | { kind: 'enemyHit'; id: number; enemyKind: EnemyKind; x: number; z: number; killed: boolean }
  | { kind: 'playerHit'; x: number; z: number; damage: number }

export interface Input {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  firing: boolean
  yawDelta: number
}

export interface Game {
  phase: Phase
  vehicle: PlayerVehicleKind
  player: PlayerState
  enemies: Enemy[]
  bullets: Bullet[]
  obstacles: readonly Rect[]
  score: number
  wave: number
  kills: number
  toSpawn: number
  spawnTimer: number
  breakTimer: number
  nextId: number
  shake: number
  rng: () => number
}

function makePlayer(vehicle: PlayerVehicleKind): PlayerState {
  const hp = PLAYER_VEHICLES[vehicle].hp
  return { x: 0, z: 0, yaw: 0, turret: 0, hp, maxHp: hp, cooldown: 0 }
}

export function createGame(obstacles: readonly Rect[], vehicle: PlayerVehicleKind = 'buggy'): Game {
  return {
    phase: 'menu',
    vehicle,
    player: makePlayer(vehicle),
    enemies: [],
    bullets: [],
    obstacles,
    score: 0,
    wave: 0,
    kills: 0,
    toSpawn: 0,
    spawnTimer: 0,
    breakTimer: 0,
    nextId: 1,
    shake: 0,
    rng: mulberry32(0x9e3779b9),
  }
}

function resetState(game: Game): void {
  game.player = makePlayer(game.vehicle)
  game.enemies.length = 0
  game.bullets.length = 0
  game.score = 0
  game.kills = 0
  game.wave = 0
  game.toSpawn = 0
  game.spawnTimer = 0
  game.breakTimer = 0
  game.shake = 0
}

export function setVehicle(game: Game, vehicle: PlayerVehicleKind): void {
  if (game.phase !== 'menu') return
  game.vehicle = vehicle
  const hp = PLAYER_VEHICLES[vehicle].hp
  game.player.hp = hp
  game.player.maxHp = hp
}

export function start(game: Game, vehicle: PlayerVehicleKind = game.vehicle): void {
  game.vehicle = vehicle
  resetState(game)
  game.phase = 'playing'
  beginWave(game, 1)
}

export function pause(game: Game): void {
  if (game.phase === 'playing') game.phase = 'paused'
}

export function resume(game: Game): void {
  if (game.phase === 'paused') game.phase = 'playing'
}

export function returnToMenu(game: Game): void {
  resetState(game)
  game.phase = 'menu'
}

function beginWave(game: Game, wave: number): void {
  game.wave = wave
  game.toSpawn = WAVE.baseCount + (wave - 1) * WAVE.growth
  game.spawnTimer = 0.8
  if (wave % 3 === 0) spawnEnemy(game, 'boss')
}

function pickKind(game: Game): EnemyKind {
  if (game.wave < 2) return 'scout'
  return game.rng() < 0.35 ? 'tank' : 'scout'
}

export function spawnEnemy(game: Game, kind: EnemyKind): void {
  const limit = ARENA.half - 3
  const p = game.player
  let x = 0
  let z = 0
  let found = false

  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
    const t = (game.rng() * 2 - 1) * limit
    const side = Math.floor(game.rng() * 4)
    const cx = side === 0 ? t : side === 1 ? t : side === 2 ? -limit : limit
    const cz = side === 0 ? -limit : side === 1 ? limit : side === 2 ? t : t
    if (Math.hypot(cx - p.x, cz - p.z) >= MIN_SPAWN_DISTANCE) {
      x = cx
      z = cz
      found = true
      break
    }
  }

  if (!found) {
    if (Math.abs(p.x) >= Math.abs(p.z)) {
      x = p.x >= 0 ? -limit : limit
      z = clamp(-p.z, -limit, limit)
    } else {
      x = clamp(-p.x, -limit, limit)
      z = p.z >= 0 ? -limit : limit
    }
  }

  game.enemies.push({
    id: game.nextId++,
    kind,
    x,
    z,
    yaw: 0,
    hp: ENEMIES[kind].hp,
    cooldown: 2,
    engageTimer: 0,
    touch: 0,
  })
}

function pushBullet(game: Game, bullet: Bullet): void {
  if (game.bullets.length < BULLET.max) game.bullets.push(bullet)
}

export function update(game: Game, dt: number, input: Input, events?: FxEvent[]): void {
  if (game.phase !== 'playing') return
  const p = game.player
  const playerStats = PLAYER_VEHICLES[game.vehicle]

  // Hull: A/D steer, W/S drive. The vehicle never slides sideways.
  if (input.left) p.yaw += playerStats.turnSpeed * dt
  if (input.right) p.yaw -= playerStats.turnSpeed * dt
  p.turret += input.yawDelta
  p.cooldown -= dt
  game.shake = Math.max(0, game.shake - dt * 2.5)

  const sin = Math.sin(p.yaw)
  const cos = Math.cos(p.yaw)
  let drive = 0
  if (input.forward) drive += 1
  if (input.back) drive -= 1
  if (drive !== 0) {
    const step = playerStats.speed * dt * drive
    const next = moveCircle(p, -sin * step, -cos * step, playerStats.radius, ARENA.half, game.obstacles)
    p.x = next.x
    p.z = next.z
  }

  // Turret aims in world coordinates independently of hull steering.
  if (input.firing && p.cooldown <= 0) {
    p.cooldown = playerStats.fireDelay
    const aim = p.turret
    const tsin = Math.sin(aim)
    const tcos = Math.cos(aim)
    const spawnOffset = (playerStats.radius / PLAYER_VEHICLES.buggy.radius) * 1.6
    const bx = p.x - tsin * spawnOffset
    const bz = p.z - tcos * spawnOffset
    const vx = -tsin * playerStats.bulletSpeed
    const vz = -tcos * playerStats.bulletSpeed
    pushBullet(game, {
      x: bx,
      z: bz,
      vx,
      vz,
      life: BULLET.life,
      damage: playerStats.damage,
      radius: playerStats.bulletRadius,
      hostile: false,
    })
    events?.push({ kind: 'shot', hostile: false, ownerId: 0, x: bx, z: bz, vx, vz })
  }

  // --- enemies ---
  let shotsThisTick = 0
  for (const e of game.enemies) {
    const stats = ENEMIES[e.kind]
    const dx = p.x - e.x
    const dz = p.z - e.z
    const rawDist = Math.hypot(dx, dz)
    const d = rawDist || 1
    const ux = dx / d
    const uz = dz / d

    e.cooldown = Math.max(0, e.cooldown - dt)
    e.yaw = Math.atan2(-dx, -dz)

    if (rawDist > stats.approachRange) {
      const step = stats.speed * dt
      const next = moveCircle(e, ux * step, uz * step, stats.radius, ARENA.half, game.obstacles)
      e.x = next.x
      e.z = next.z
    }

    const sdx = p.x - e.x
    const sdz = p.z - e.z
    const sd = Math.hypot(sdx, sdz)
    const sux = sd > 1e-6 ? sdx / sd : 0
    const suz = sd > 1e-6 ? sdz / sd : 0
    const hasLos =
      sd <= 1e-6 ||
      raycastArena(e.x, e.z, sux, suz, sd, ARENA.half, game.obstacles) >= sd - 1e-4

    if (hasLos && sd <= stats.detectRange) {
      e.engageTimer += dt
    } else {
      e.engageTimer = 0
    }

    if (
      hasLos &&
      sd <= stats.fireRange &&
      e.engageTimer >= stats.reaction &&
      e.cooldown <= 0 &&
      shotsThisTick < MAX_SIMULTANEOUS_FIRE
    ) {
      shotsThisTick++
      e.cooldown = stats.fireDelay
      const vx = sux * stats.bulletSpeed
      const vz = suz * stats.bulletSpeed
      pushBullet(game, {
        x: e.x,
        z: e.z,
        vx,
        vz,
        life: 3,
        damage: stats.damage,
        radius: stats.bulletRadius,
        hostile: true,
      })
      events?.push({ kind: 'shot', hostile: true, ownerId: e.id, x: e.x, z: e.z, vx, vz })
    }

    e.touch -= dt
    if (e.touch <= 0 && circlesHit(p.x, p.z, playerStats.radius, e.x, e.z, stats.radius)) {
      e.touch = 0.6
      p.hp -= 8
      game.shake = 0.3
      events?.push({ kind: 'playerHit', x: p.x, z: p.z, damage: 8 })
    }
  }

  // --- bullets ---
  for (const b of game.bullets) {
    b.x += b.vx * dt
    b.z += b.vz * dt
    b.life -= dt

    if (Math.abs(b.x) > ARENA.half - 0.4 || Math.abs(b.z) > ARENA.half - 0.4) {
      b.life = 0
      events?.push({ kind: 'wallHit', hostile: b.hostile, x: b.x, z: b.z })
      continue
    }
    for (const r of game.obstacles) {
      if (Math.abs(b.x - r.x) < r.hx && Math.abs(b.z - r.z) < r.hz) {
        b.life = 0
        events?.push({ kind: 'wallHit', hostile: b.hostile, x: b.x, z: b.z })
        break
      }
    }
  }

  for (const b of game.bullets) {
    if (b.life <= 0) continue
    if (b.hostile) {
      if (circlesHit(b.x, b.z, b.radius, p.x, p.z, playerStats.radius)) {
        p.hp -= b.damage
        b.life = 0
        game.shake = 0.35
        events?.push({ kind: 'playerHit', x: b.x, z: b.z, damage: b.damage })
      }
    } else {
      for (const e of game.enemies) {
        if (e.hp <= 0) continue
        if (circlesHit(b.x, b.z, b.radius, e.x, e.z, ENEMIES[e.kind].radius)) {
          e.hp -= b.damage
          b.life = 0
          const killed = e.hp <= 0
          if (killed) {
            game.score += ENEMIES[e.kind].score
            game.kills++
            game.shake = Math.max(game.shake, 0.18)
          }
          events?.push({
            kind: 'enemyHit',
            id: e.id,
            enemyKind: e.kind,
            x: killed ? e.x : b.x,
            z: killed ? e.z : b.z,
            killed,
          })
          break
        }
      }
    }
  }

  compact(game.bullets, (b) => b.life > 0)
  compact(game.enemies, (e) => e.hp > 0)

  // --- waves ---
  if (game.toSpawn > 0) {
    game.spawnTimer -= dt
    if (game.spawnTimer <= 0) {
      game.spawnTimer = WAVE.spawnGap
      spawnEnemy(game, pickKind(game))
      game.toSpawn--
    }
  } else if (game.enemies.length === 0) {
    game.breakTimer -= dt
    if (game.breakTimer <= 0) {
      beginWave(game, game.wave + 1)
      game.breakTimer = WAVE.interWave
    }
  }

  if (p.hp <= 0) {
    p.hp = 0
    game.phase = 'over'
  }
}

/** In-place filter: no per-frame array allocation. */
function compact<T>(arr: T[], keep: (item: T) => boolean): void {
  let w = 0
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i])) arr[w++] = arr[i]
  }
  arr.length = w
}
