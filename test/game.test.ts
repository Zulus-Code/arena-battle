import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, start, update, type Input } from '../src/game.ts'

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

test('turret offset is relative to the hull and stays put when the mouse is idle', () => {
  const g = createGame([])
  start(g)
  update(g, 1 / 60, { ...idle, yawDelta: 0.5 })
  assert.equal(g.player.turret, 0.5)

  const offset = g.player.turret
  for (let i = 0; i < 60; i++) update(g, 1 / 60, { ...idle, left: true })
  assert.equal(g.player.turret, offset, 'hull turn must not change the turret offset')
})

test('bullets follow the hull heading when the turret offset is zero', () => {
  const g = createGame([])
  start(g)
  g.enemies.length = 0
  g.toSpawn = 0
  g.player.yaw = Math.PI / 2 // hull faces -X
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
