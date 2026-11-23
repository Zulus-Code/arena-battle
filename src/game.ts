import { ARENA, BULLET, ENEMIES, PLAYER, WAVE, type EnemyKind } from './config.ts'
import { circlesHit, moveCircle, mulberry32, type Rect } from './rules.ts'

export interface Bullet {
  x: number
  z: number
  vx: number
  vz: number
  life: number
  damage: number
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
  touch: number
}

export interface PlayerState {
  x: number
  z: number
  /** Hull heading. */
  yaw: number
  /** Turret heading, independent of the hull. */
  turret: number
  hp: number
  cooldown: number
}

export type Phase = 'menu' | 'playing' | 'over'

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

export function createGame(obstacles: readonly Rect[]): Game {
  return {
    phase: 'menu',
    player: { x: 0, z: 0, yaw: 0, turret: 0, hp: PLAYER.hp, cooldown: 0 },
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

export function start(game: Game): void {
  game.phase = 'playing'
  game.player = { x: 0, z: 0, yaw: 0, turret: 0, hp: PLAYER.hp, cooldown: 0 }
  game.enemies.length = 0
  game.bullets.length = 0
  game.score = 0
  game.kills = 0
  game.wave = 0
  game.toSpawn = 0
  game.spawnTimer = 0
  game.breakTimer = 0
  game.shake = 0
  beginWave(game, 1)
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

function spawnEnemy(game: Game, kind: EnemyKind): void {
  const limit = ARENA.half - 3
  const t = (game.rng() * 2 - 1) * limit
  const side = Math.floor(game.rng() * 4)
  const x = side === 0 ? t : side === 1 ? t : side === 2 ? -limit : limit
  const z = side === 0 ? -limit : side === 1 ? limit : side === 2 ? t : t
  game.enemies.push({
    id: game.nextId++,
    kind,
    x,
    z,
    yaw: 0,
    hp: ENEMIES[kind].hp,
    cooldown: 1,
    touch: 0,
  })
}

function pushBullet(game: Game, bullet: Bullet): void {
  if (game.bullets.length < BULLET.max) game.bullets.push(bullet)
}

export function update(game: Game, dt: number, input: Input): void {
  if (game.phase !== 'playing') return
  const p = game.player

  // Hull: A/D steer, W/S drive. The vehicle never slides sideways.
  if (input.left) p.yaw += PLAYER.turnSpeed * dt
  if (input.right) p.yaw -= PLAYER.turnSpeed * dt
  p.turret += input.yawDelta
  p.cooldown -= dt
  game.shake = Math.max(0, game.shake - dt * 2.5)

  const sin = Math.sin(p.yaw)
  const cos = Math.cos(p.yaw)
  let drive = 0
  if (input.forward) drive += 1
  if (input.back) drive -= 1
  if (drive !== 0) {
    const step = PLAYER.speed * dt * drive
    const next = moveCircle(p, -sin * step, -cos * step, PLAYER.radius, ARENA.half, game.obstacles)
    p.x = next.x
    p.z = next.z
  }

  // Turret fires wherever it points, not where the hull points.
  if (input.firing && p.cooldown <= 0) {
    p.cooldown = PLAYER.fireDelay
    const tsin = Math.sin(p.turret)
    const tcos = Math.cos(p.turret)
    pushBullet(game, {
      x: p.x - tsin * 1.6,
      z: p.z - tcos * 1.6,
      vx: -tsin * PLAYER.bulletSpeed,
      vz: -tcos * PLAYER.bulletSpeed,
      life: BULLET.life,
      damage: PLAYER.damage,
      hostile: false,
    })
  }

  // --- enemies ---
  for (const e of game.enemies) {
    const stats = ENEMIES[e.kind]
    const dx = p.x - e.x
    const dz = p.z - e.z
    const d = Math.hypot(dx, dz) || 1
    e.yaw = Math.atan2(-dx, -dz)

    if (d > stats.range * 0.55) {
      const step = stats.speed * dt
      const next = moveCircle(e, (dx / d) * step, (dz / d) * step, stats.radius, ARENA.half, game.obstacles)
      e.x = next.x
      e.z = next.z
    }

    e.cooldown -= dt
    if (d < stats.range && e.cooldown <= 0) {
      e.cooldown = stats.fireDelay
      pushBullet(game, {
        x: e.x,
        z: e.z,
        vx: (dx / d) * stats.bulletSpeed,
        vz: (dz / d) * stats.bulletSpeed,
        life: 3,
        damage: stats.damage,
        hostile: true,
      })
    }

    e.touch -= dt
    if (e.touch <= 0 && circlesHit(p.x, p.z, PLAYER.radius, e.x, e.z, stats.radius)) {
      e.touch = 0.6
      p.hp -= 8
      game.shake = 0.3
    }
  }

  // --- bullets ---
  for (const b of game.bullets) {
    b.x += b.vx * dt
    b.z += b.vz * dt
    b.life -= dt

    if (Math.abs(b.x) > ARENA.half - 0.4 || Math.abs(b.z) > ARENA.half - 0.4) {
      b.life = 0
      continue
    }
    for (const r of game.obstacles) {
      if (Math.abs(b.x - r.x) < r.hx && Math.abs(b.z - r.z) < r.hz) {
        b.life = 0
        break
      }
    }
  }

  for (const b of game.bullets) {
    if (b.life <= 0) continue
    if (b.hostile) {
      if (circlesHit(b.x, b.z, BULLET.radius, p.x, p.z, PLAYER.radius)) {
        p.hp -= b.damage
        b.life = 0
        game.shake = 0.35
      }
    } else {
      for (const e of game.enemies) {
        if (e.hp <= 0) continue
        if (circlesHit(b.x, b.z, BULLET.radius, e.x, e.z, ENEMIES[e.kind].radius)) {
          e.hp -= b.damage
          b.life = 0
          if (e.hp <= 0) {
            game.score += ENEMIES[e.kind].score
            game.kills++
            game.shake = Math.max(game.shake, 0.18)
          }
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
