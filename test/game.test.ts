import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ARENA, ENEMIES, PLAYER_VEHICLES, type PlayerVehicleKind } from '../src/config.ts'
import { createGame, pause, resume, returnToMenu, setVehicle, spawnEnemy, start, update, type FxEvent, type Input } from '../src/game.ts'
import { mulberry32, type Rect } from '../src/rules.ts'

const idle: Input = { forward: false, back: false, left: false, right: false, firing: false, yawDelta: 0 }

test('player bullets kill an enemy standing straight ahead', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 99, kind: 'scout', x: 0, z: -8, yaw: 0, hp: 30, cooldown: 99, engageTimer: 0, touch: 0 })

  for (let i = 0; i < 120; i++) update(g, 1 / 60, { ...idle, firing: true })

  assert.equal(g.enemies.some((e) => e.id === 99), false)
  assert.ok(g.score >= 100, `score should grow, got ${g.score}`)
})

test('player cannot drive through the arena wall', () => {
  const g = createGame([])
  start(g)
  for (let i = 0; i < 600; i++) update(g, 1 / 60, { ...idle, forward: true })
  assert.ok(Math.abs(g.player.z) <= 22, `player escaped the arena: ${g.player.z}`)
})

test('A/D turn the hull without moving it', () => {
  const g = createGame([])
  start(g)
  update(g, 1 / 60, { ...idle, left: true })
  assert.ok(g.player.yaw > 0, 'left should increase yaw')
  assert.equal(g.player.x, 0)
  assert.equal(g.player.z, 0)

  const yaw = g.player.yaw
  update(g, 1 / 60, { ...idle, right: true })
  assert.ok(g.player.yaw < yaw, 'right should decrease yaw')
})

test('driving forward follows the hull heading, not a fixed axis', () => {
  const g = createGame([])
  start(g)
  g.player.yaw = Math.PI / 2 // facing -X
  update(g, 1 / 60, { ...idle, forward: true })
  assert.ok(g.player.x < 0, `expected to move towards -X, got x=${g.player.x}`)
})

test('turret aims independently of the hull', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 7, kind: 'scout', x: 0, z: 8, yaw: 0, hp: 30, cooldown: 99, engageTimer: 0, touch: 0 })

  // enemy sits behind the hull: only the turret is turned around and fires
  g.player.turret = Math.PI
  for (let i = 0; i < 200; i++) update(g, 1 / 60, { ...idle, firing: true })
  assert.equal(g.enemies.some((e) => e.id === 7), false)
})

test('turret world aim stays locked on target when steering the hull with A/D', () => {
  const g = createGame([])
  start(g)
  update(g, 1 / 60, { ...idle, yawDelta: 0.5 })
  assert.equal(g.player.turret, 0.5)

  const aim = g.player.turret
  for (let i = 0; i < 60; i++) update(g, 1 / 60, { ...idle, left: true })
  assert.equal(g.player.turret, aim, 'steering the hull must not pull the turret aim off target')
  assert.ok(g.player.yaw > 0, 'hull should still turn left')
})

test('bullets fire along the turret aim even when the hull faces sideways', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.player.yaw = Math.PI / 2 // hull faces -X
  g.player.turret = Math.PI / 2 // aim turret toward -X
  g.enemies.push({ id: 5, kind: 'scout', x: -8, z: 0, yaw: 0, hp: 30, cooldown: 99, engageTimer: 0, touch: 0 })

  for (let i = 0; i < 120; i++) update(g, 1 / 60, { ...idle, firing: true })
  assert.equal(g.enemies.some((e) => e.id === 5), false)
})

test('damage from an enemy bullet reduces player hp', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.bullets.push({ x: 0, z: -2, vx: 0, vz: 20, life: 1, damage: 15, radius: 0.3, hostile: true })
  const before = g.player.hp
  for (let i = 0; i < 20; i++) update(g, 1 / 60, idle)
  assert.equal(g.player.hp, before - 15)
})

test('update emits shot, enemyHit, wallHit and playerHit events when buffer is provided', () => {
  const g = createGame([{ x: 4, z: 0, hx: 1, hz: 1 }])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 42, kind: 'scout', x: 0, z: -4, yaw: 0, hp: 10, cooldown: 99, engageTimer: 0, touch: 0 })

  const events: FxEvent[] = []
  for (let i = 0; i < 25; i++) update(g, 1 / 60, { ...idle, firing: true }, events)

  assert.ok(events.some((e) => e.kind === 'shot' && !e.hostile))
  assert.ok(events.some((e) => e.kind === 'enemyHit' && e.id === 42 && e.killed))

  events.length = 0
  g.bullets.push({ x: 3.1, z: 0, vx: 60, vz: 0, life: 1, damage: 10, radius: 0.3, hostile: false })
  g.bullets.push({ x: 0, z: -0.5, vx: 0, vz: 60, life: 1, damage: 10, radius: 0.3, hostile: true })
  update(g, 1 / 60, idle, events)

  assert.ok(events.some((e) => e.kind === 'wallHit'))
  assert.ok(events.some((e) => e.kind === 'playerHit' && e.damage === 10))
})

test('update() in paused does not move player, bullets, cooldowns or spawn enemies', () => {
  const g = createGame([])
  start(g)
  g.player.cooldown = 0.5
  g.bullets.push({ x: 0, z: -3, vx: 0, vz: -50, life: 1, damage: 10, radius: 0.3, hostile: false })
  const enemyCountBefore = g.enemies.length
  const toSpawnBefore = g.toSpawn
  const spawnTimerBefore = g.spawnTimer

  pause(g)
  assert.equal(g.phase, 'paused')

  const events: FxEvent[] = []
  for (let i = 0; i < 120; i++) {
    update(g, 1 / 60, { forward: true, back: false, left: true, right: false, firing: true, yawDelta: 0.4 }, events)
  }

  assert.equal(g.player.x, 0)
  assert.equal(g.player.z, 0)
  assert.equal(g.player.yaw, 0)
  assert.equal(g.player.turret, 0)
  assert.equal(g.player.cooldown, 0.5)
  assert.equal(g.enemies.length, enemyCountBefore)
  assert.equal(g.toSpawn, toSpawnBefore)
  assert.equal(g.spawnTimer, spawnTimerBefore)
  assert.equal(g.bullets[0].z, -3)
  assert.equal(events.length, 0)

  resume(g)
  assert.equal(g.phase, 'playing')
  update(g, 1 / 60, { ...idle, forward: true })
  assert.ok(g.player.z < 0, 'player should move again after resume')
})

test('pause/resume only apply during playing/paused and returnToMenu resets state', () => {
  const g = createGame([])
  pause(g)
  assert.equal(g.phase, 'menu')
  resume(g)
  assert.equal(g.phase, 'menu')

  start(g)
  g.score = 250
  g.kills = 2
  pause(g)
  assert.equal(g.phase, 'paused')

  returnToMenu(g)
  assert.equal(g.phase, 'menu')
  assert.equal(g.score, 0)
  assert.equal(g.kills, 0)
  assert.equal(g.enemies.length, 0)
  assert.equal(g.bullets.length, 0)

  g.phase = 'over'
  pause(g)
  assert.equal(g.phase, 'over')
  resume(g)
  assert.equal(g.phase, 'over')
})

test('start() with tank gives tank hp and speed, while buggy keeps original values', () => {
  const buggyGame = createGame([], 'buggy')
  start(buggyGame, 'buggy')
  assert.equal(buggyGame.vehicle, 'buggy')
  assert.equal(buggyGame.player.hp, PLAYER_VEHICLES.buggy.hp)
  assert.equal(buggyGame.player.maxHp, PLAYER_VEHICLES.buggy.hp)
  assert.equal(buggyGame.player.hp, 90)

  const tankGame = createGame([], 'buggy')
  start(tankGame, 'tank')
  assert.equal(tankGame.vehicle, 'tank')
  assert.equal(tankGame.player.hp, PLAYER_VEHICLES.tank.hp)
  assert.equal(tankGame.player.maxHp, PLAYER_VEHICLES.tank.hp)
  assert.ok(tankGame.player.hp > buggyGame.player.hp, 'tank should have more HP than buggy')

  // Same 10 frames of forward driving: tank moves slower than buggy.
  for (let i = 0; i < 10; i++) {
    update(buggyGame, 1 / 60, { ...idle, forward: true })
    update(tankGame, 1 / 60, { ...idle, forward: true })
  }
  const buggyDist = -buggyGame.player.z
  const tankDist = -tankGame.player.z
  assert.ok(Math.abs(buggyDist - (PLAYER_VEHICLES.buggy.speed * 10) / 60) < 1e-6)
  assert.ok(Math.abs(tankDist - (PLAYER_VEHICLES.tank.speed * 10) / 60) < 1e-6)
  assert.ok(tankDist < buggyDist, 'tank should be slower than buggy')

  // Same 10 frames of turning: tank turns slower than buggy.
  update(buggyGame, 1 / 60, { ...idle, left: true })
  update(tankGame, 1 / 60, { ...idle, left: true })
  assert.ok(tankGame.player.yaw < buggyGame.player.yaw, 'tank should turn slower than buggy')

  // Tank survives 110 damage while buggy dies.
  buggyGame.enemies.length = 0
  buggyGame.toSpawn = 0
  tankGame.enemies.length = 0
  tankGame.toSpawn = 0
  buggyGame.bullets.push({ x: buggyGame.player.x, z: buggyGame.player.z, vx: 0, vz: 0, life: 1, damage: 110, radius: 0.3, hostile: true })
  tankGame.bullets.push({ x: tankGame.player.x, z: tankGame.player.z, vx: 0, vz: 0, life: 1, damage: 110, radius: 0.3, hostile: true })
  update(buggyGame, 1 / 60, idle)
  update(tankGame, 1 / 60, idle)
  assert.equal(buggyGame.phase, 'over')
  assert.equal(tankGame.phase, 'playing')
  assert.equal(tankGame.player.hp, PLAYER_VEHICLES.tank.hp - 110)
})

test('setVehicle() updates chosen vehicle in menu and preserves it across restart', () => {
  const g = createGame([])
  assert.equal(g.vehicle, 'buggy')
  setVehicle(g, 'tank')
  assert.equal(g.vehicle, 'tank')
  assert.equal(g.player.hp, PLAYER_VEHICLES.tank.hp)
  assert.equal(g.player.maxHp, PLAYER_VEHICLES.tank.hp)

  start(g)
  assert.equal(g.vehicle, 'tank')
  assert.equal(g.player.hp, PLAYER_VEHICLES.tank.hp)

  // Calling setVehicle while playing should not mutate active match vehicle.
  setVehicle(g, 'buggy')
  assert.equal(g.vehicle, 'tank')
})

test('start() gives each player class its own hp, speed, turnSpeed, radius, damage, bulletSpeed, fireDelay and bulletRadius', () => {
  const expected: Record<
    PlayerVehicleKind,
    {
      hp: number
      speed: number
      turnSpeed: number
      radius: number
      damage: number
      fireDelay: number
      bulletSpeed: number
      bulletRadius: number
    }
  > = {
    buggy: { hp: 90, speed: 15, turnSpeed: 2.8, radius: 1.1, damage: 9, fireDelay: 0.14, bulletSpeed: 60, bulletRadius: 0.22 },
    tank: { hp: 160, speed: 10.5, turnSpeed: 2.0, radius: 1.45, damage: 16, fireDelay: 0.22, bulletSpeed: 45, bulletRadius: 0.32 },
    heavy: { hp: 240, speed: 7.0, turnSpeed: 1.5, radius: 1.9, damage: 26, fireDelay: 0.35, bulletSpeed: 32, bulletRadius: 0.45 },
  }

  const spawnDists: Record<PlayerVehicleKind, number> = { buggy: 0, tank: 0, heavy: 0 }

  for (const kind of ['buggy', 'tank', 'heavy'] as const) {
    const spec = expected[kind]
    const stats = PLAYER_VEHICLES[kind]
    assert.deepEqual(stats, spec, `PLAYER_VEHICLES.${kind} should match spec`)

    const g = createGame([])
    start(g, kind)
    g.enemies.length = 0
    g.toSpawn = 0

    assert.equal(g.player.hp, spec.hp)
    assert.equal(g.player.maxHp, spec.hp)

    // Verify movement speed & turn speed.
    const dt = 1 / 60
    const events: FxEvent[] = []
    update(g, dt, { ...idle, forward: true, left: true, firing: true }, events)
    assert.ok(Math.abs(g.player.yaw - spec.turnSpeed * dt) < 1e-6, `${kind} yaw`)
    assert.ok(Math.abs(Math.hypot(g.player.x, g.player.z) - spec.speed * dt) < 1e-6, `${kind} speed`)

    // Verify bullet stats and fireDelay.
    assert.equal(g.bullets.length, 1, `${kind} should fire 1 bullet`)
    const b = g.bullets[0]
    assert.equal(b.damage, spec.damage, `${kind} damage`)
    assert.equal(b.radius, spec.bulletRadius, `${kind} bulletRadius`)
    assert.ok(Math.abs(Math.hypot(b.vx, b.vz) - spec.bulletSpeed) < 1e-6, `${kind} bulletSpeed`)
    assert.ok(Math.abs(g.player.cooldown - spec.fireDelay) < 1e-6, `${kind} fireDelay`)

    const shot = events.find((e) => e.kind === 'shot' && !e.hostile)
    assert.ok(shot && shot.kind === 'shot')
    spawnDists[kind] = Math.hypot(shot.x - g.player.x, shot.z - g.player.z)

    // Cannot fire again before fireDelay elapses; fires once fireDelay has passed.
    g.bullets.length = 0
    update(g, spec.fireDelay * 0.5, { ...idle, firing: true })
    assert.equal(g.bullets.length, 0, `${kind} must respect fireDelay before firing again`)
    update(g, spec.fireDelay * 0.6, { ...idle, firing: true })
    assert.equal(g.bullets.length, 1, `${kind} should fire once fireDelay has elapsed`)

    // Arena wall clamp reflects class hull radius.
    const wallGame = createGame([])
    start(wallGame, kind)
    wallGame.enemies.length = 0
    wallGame.toSpawn = 0
    for (let i = 0; i < 600; i++) update(wallGame, dt, { ...idle, forward: true })
    assert.ok(Math.abs(wallGame.player.z - -(ARENA.half - spec.radius)) < 1e-6, `${kind} wall clamp radius`)
  }

  assert.ok(spawnDists.tank > spawnDists.buggy, 'tank spawn offset should exceed buggy')
  assert.ok(spawnDists.heavy > spawnDists.tank, 'heavy spawn offset should exceed tank')
})

test('player Bullet.radius equals class bulletRadius and collision uses b.radius (buggy grazes past, heavy hits)', () => {
  // Scout enemy at x=1.25 has radius 0.9:
  // - buggy bulletRadius 0.22 -> 0.9 + 0.22 = 1.12 < 1.25 (grazes past)
  // - heavy bulletRadius 0.45 -> 0.9 + 0.45 = 1.35 >= 1.25 (hits)
  const buggyGame = createGame([])
  start(buggyGame, 'buggy')
  buggyGame.enemies.length = 0
  buggyGame.toSpawn = 0
  buggyGame.enemies.push({ id: 10, kind: 'scout', x: 1.25, z: -6, yaw: 0, hp: 30, cooldown: 99, engageTimer: 0, touch: 0 })

  update(buggyGame, 1 / 60, { ...idle, firing: true })
  assert.equal(buggyGame.bullets[0].radius, PLAYER_VEHICLES.buggy.bulletRadius)
  for (let i = 0; i < 15; i++) update(buggyGame, 1 / 60, idle)
  assert.equal(buggyGame.enemies[0].hp, 30, 'buggy bullet should graze past scout')
  assert.equal(buggyGame.bullets.length, 1, 'buggy bullet should still be flying past scout')
  assert.ok(buggyGame.bullets[0].z < -6, 'buggy bullet should have passed scout z')

  const heavyGame = createGame([])
  start(heavyGame, 'heavy')
  heavyGame.enemies.length = 0
  heavyGame.toSpawn = 0
  heavyGame.enemies.push({ id: 11, kind: 'scout', x: 1.25, z: -6, yaw: 0, hp: 30, cooldown: 99, engageTimer: 0, touch: 0 })

  update(heavyGame, 1 / 60, { ...idle, firing: true })
  assert.equal(heavyGame.bullets[0].radius, PLAYER_VEHICLES.heavy.bulletRadius)
  for (let i = 0; i < 15; i++) update(heavyGame, 1 / 60, idle)
  assert.equal(heavyGame.enemies[0].hp, 30 - PLAYER_VEHICLES.heavy.damage, 'heavy bullet should hit scout via b.radius')
  assert.equal(heavyGame.bullets.length, 0, 'heavy bullet should be consumed on hit')

  // Hostile bullet collision also respects b.radius against player hull radius (1.1).
  const hostileCheck = createGame([])
  start(hostileCheck, 'buggy')
  hostileCheck.enemies.length = 0
  hostileCheck.toSpawn = 0
  hostileCheck.bullets.push({ x: 1.45, z: 0, vx: 0, vz: 0, life: 1, damage: 10, radius: 0.2, hostile: true })
  update(hostileCheck, 1 / 60, idle)
  assert.equal(hostileCheck.player.hp, PLAYER_VEHICLES.buggy.hp, 'small hostile bullet should miss')

  hostileCheck.bullets.push({ x: 1.45, z: 0, vx: 0, vz: 0, life: 1, damage: 10, radius: 0.45, hostile: true })
  update(hostileCheck, 1 / 60, idle)
  assert.equal(hostileCheck.player.hp, PLAYER_VEHICLES.buggy.hp - 10, 'large hostile bullet should hit via b.radius')
})

test('ENEMIES.boss still spawns on wave 3 and enemy bullets carry radius', () => {
  const g = createGame([])
  start(g, 'heavy')
  // Clear wave 1 and wave 2 to reach wave 3.
  for (let w = 1; w <= 2; w++) {
    g.enemies.length = 0
    g.toSpawn = 0
    g.breakTimer = 0
    update(g, 1 / 60, idle)
  }
  assert.equal(g.wave, 3)
  const boss = g.enemies.find((e) => e.kind === 'boss')
  assert.ok(boss, 'wave 3 must spawn boss')
  assert.equal(boss.hp, ENEMIES.boss.hp)

  boss.x = 0
  boss.z = -14
  boss.cooldown = 0
  for (let i = 0; i <= Math.ceil(ENEMIES.boss.reaction * 60); i++) {
    update(g, 1 / 60, idle)
  }
  const bossBullet = g.bullets.find((b) => b.hostile)
  assert.ok(bossBullet, 'boss should fire a hostile bullet')
  assert.equal(bossBullet.radius, ENEMIES.boss.bulletRadius)
  assert.equal(bossBullet.damage, ENEMIES.boss.damage)
})

test('enemy outside detectRange neither moves toward player nor fires; inside (approachRange, detectRange] approaches', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0

  const farZ = -(ENEMIES.scout.detectRange + 2)
  g.enemies.push({ id: 1, kind: 'scout', x: 0, z: farZ, yaw: 0, hp: 30, cooldown: 0, engageTimer: 10, touch: 0 })
  for (let i = 0; i < 30; i++) update(g, 1 / 60, idle)
  assert.equal(g.enemies[0].z, farZ, 'enemy beyond detectRange must not move toward player')
  assert.equal(g.bullets.length, 0, 'enemy beyond detectRange must not fire')

  // Move inside detectRange (16) and outside approachRange (9): enemy approaches player.
  g.enemies[0].z = -14
  update(g, 1 / 60, idle)
  assert.ok(g.enemies[0].z > -14, 'enemy inside detectRange and beyond approachRange must move closer')
})

test('enemy in fireRange behind obstacle does not shoot, and shoots after obstacle is removed and reaction elapses', () => {
  const obstacles: Rect[] = [{ x: 0, z: -5, hx: 2, hz: 1 }]
  const g = createGame(obstacles)
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  // Inside scout approachRange (9) & fireRange (12) so it stays behind the obstacle at z = -8.
  g.enemies.push({ id: 2, kind: 'scout', x: 0, z: -8, yaw: 0, hp: 30, cooldown: 0, engageTimer: 0, touch: 0 })

  for (let i = 0; i < 90; i++) update(g, 1 / 60, idle)
  assert.equal(g.bullets.length, 0, 'enemy must not shoot through an obstacle')
  assert.equal(g.enemies[0].engageTimer, 0, 'engageTimer must remain 0 while LOS is blocked')

  obstacles.length = 0
  for (let i = 0; i <= Math.ceil(ENEMIES.scout.reaction * 60); i++) {
    update(g, 1 / 60, idle)
  }
  assert.equal(g.bullets.length, 1, 'enemy should shoot once obstacle is removed and reaction elapses')
})

test('enemy does not fire before reaction seconds after target becomes visible, and resets timer on LOS loss', () => {
  const obstacles: Rect[] = []
  const g = createGame(obstacles)
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 3, kind: 'tank', x: 0, z: -10, yaw: 0, hp: 90, cooldown: 0, engageTimer: 0, touch: 0 })

  // Step slightly less than tank reaction (0.70s): 40 frames = 0.667s.
  for (let i = 0; i < 40; i++) update(g, 1 / 60, idle)
  assert.equal(g.bullets.length, 0, 'enemy must not fire before reaction seconds')

  // Break LOS briefly -> engageTimer resets to 0.
  obstacles.push({ x: 0, z: -5, hx: 2, hz: 1 })
  update(g, 1 / 60, idle)
  assert.equal(g.enemies[0].engageTimer, 0, 'losing LOS must reset engageTimer')

  // Clear LOS again: must wait full reaction (0.70s) again before firing.
  obstacles.length = 0
  for (let i = 0; i < 40; i++) update(g, 1 / 60, idle)
  assert.equal(g.bullets.length, 0, 'must wait full reaction time after regaining LOS')

  for (let i = 0; i < 5; i++) update(g, 1 / 60, idle)
  assert.equal(g.bullets.length, 1, 'enemy should fire once reaction elapses')
})

test('spawnEnemy never spawns closer than 16 units across 100 seeds and sets initial cooldown to 2s', () => {
  const playerSpots = [
    { x: 0, z: 0 },
    { x: 18, z: 18 },
    { x: -19, z: 17 },
    { x: 19, z: -18 },
    { x: -10, z: -15 },
  ]
  for (let i = 0; i < 100; i++) {
    const g = createGame([])
    start(g)
    g.enemies.length = 0
    g.rng = mulberry32(i + 1)
    const spot = playerSpots[i % playerSpots.length]
    g.player.x = spot.x
    g.player.z = spot.z
    spawnEnemy(g, i % 3 === 0 ? 'tank' : 'scout')
    const e = g.enemies[0]
    const dist = Math.hypot(e.x - g.player.x, e.z - g.player.z)
    assert.ok(dist >= 16, `run ${i}: spawned enemy too close (${dist.toFixed(2)} < 16)`)
    assert.equal(e.cooldown, 2, 'freshly spawned enemy must have 2s initial cooldown')
    assert.equal(e.engageTimer, 0)
  }
})

test('at most 2 enemies fire in a single tick while remaining enemies wait for the next tick', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0

  for (let i = 0; i < 5; i++) {
    g.enemies.push({
      id: 100 + i,
      kind: 'scout',
      x: (i - 2) * 2,
      z: -8,
      yaw: 0,
      hp: 30,
      cooldown: 0,
      engageTimer: ENEMIES.scout.reaction,
      touch: 0,
    })
  }

  const events: FxEvent[] = []
  update(g, 1 / 60, idle, events)
  const tick1Shots = events.filter((e) => e.kind === 'shot' && e.hostile)
  assert.equal(tick1Shots.length, 2, 'at most 2 enemies may fire in tick 1')
  assert.equal(g.bullets.length, 2)

  events.length = 0
  update(g, 1 / 60, idle, events)
  const tick2Shots = events.filter((e) => e.kind === 'shot' && e.hostile)
  assert.equal(tick2Shots.length, 2, 'next 2 enemies fire in tick 2')

  events.length = 0
  update(g, 1 / 60, idle, events)
  const tick3Shots = events.filter((e) => e.kind === 'shot' && e.hostile)
  assert.equal(tick3Shots.length, 1, 'remaining 5th enemy fires in tick 3')
})
