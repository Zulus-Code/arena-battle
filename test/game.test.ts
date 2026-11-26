import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, pause, resume, returnToMenu, start, update, type FxEvent, type Input } from '../src/game.ts'

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
