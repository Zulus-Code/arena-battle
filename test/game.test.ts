import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER_VEHICLES } from '../src/config.ts'
import { createGame, pause, resume, returnToMenu, setVehicle, start, update, type FxEvent, type Input } from '../src/game.ts'

const idle: Input = { forward: false, back: false, left: false, right: false, firing: false, yawDelta: 0 }

test('player bullets kill an enemy standing straight ahead', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 99, kind: 'scout', x: 0, z: -8, yaw: 0, hp: 30, cooldown: 99, touch: 0 })

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
  g.enemies.push({ id: 7, kind: 'scout', x: 0, z: 8, yaw: 0, hp: 30, cooldown: 99, touch: 0 })

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
  g.enemies.push({ id: 5, kind: 'scout', x: -8, z: 0, yaw: 0, hp: 30, cooldown: 99, touch: 0 })

  for (let i = 0; i < 120; i++) update(g, 1 / 60, { ...idle, firing: true })
  assert.equal(g.enemies.some((e) => e.id === 5), false)
})

test('damage from an enemy bullet reduces player hp', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.bullets.push({ x: 0, z: -2, vx: 0, vz: 20, life: 1, damage: 15, hostile: true })
  const before = g.player.hp
  for (let i = 0; i < 20; i++) update(g, 1 / 60, idle)
  assert.equal(g.player.hp, before - 15)
})

test('update emits shot, enemyHit, wallHit and playerHit events when buffer is provided', () => {
  const g = createGame([{ x: 4, z: 0, hx: 1, hz: 1 }])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.enemies.push({ id: 42, kind: 'scout', x: 0, z: -4, yaw: 0, hp: 10, cooldown: 99, touch: 0 })

  const events: FxEvent[] = []
  for (let i = 0; i < 25; i++) update(g, 1 / 60, { ...idle, firing: true }, events)

  assert.ok(events.some((e) => e.kind === 'shot' && !e.hostile))
  assert.ok(events.some((e) => e.kind === 'enemyHit' && e.id === 42 && e.killed))

  events.length = 0
  g.bullets.push({ x: 3.1, z: 0, vx: 60, vz: 0, life: 1, damage: 10, hostile: false })
  g.bullets.push({ x: 0, z: -0.5, vx: 0, vz: 60, life: 1, damage: 10, hostile: true })
  update(g, 1 / 60, idle, events)

  assert.ok(events.some((e) => e.kind === 'wallHit'))
  assert.ok(events.some((e) => e.kind === 'playerHit' && e.damage === 10))
})

test('update() in paused does not move player, bullets, cooldowns or spawn enemies', () => {
  const g = createGame([])
  start(g)
  g.player.cooldown = 0.5
  g.bullets.push({ x: 0, z: -3, vx: 0, vz: -50, life: 1, damage: 10, hostile: false })
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
  assert.equal(buggyGame.player.hp, 100)

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
  buggyGame.bullets.push({ x: buggyGame.player.x, z: buggyGame.player.z, vx: 0, vz: 0, life: 1, damage: 110, hostile: true })
  tankGame.bullets.push({ x: tankGame.player.x, z: tankGame.player.z, vx: 0, vz: 0, life: 1, damage: 110, hostile: true })
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
