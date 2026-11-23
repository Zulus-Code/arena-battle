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
  const input: Input = { ...idle, forward: true }
  for (let i = 0; i < 600; i++) update(g, 1 / 60, input)
  assert.ok(Math.abs(g.player.z) <= 22, `player escaped the arena: ${g.player.z}`)
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
