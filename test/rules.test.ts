import { test } from 'node:test'
import assert from 'node:assert/strict'
import { circlesHit, moveCircle, mulberry32, raycastArena, raycastCircle, type Rect } from '../src/rules.ts'

test('moveCircle keeps the vehicle inside the arena', () => {
  const p = moveCircle({ x: 9.5, z: 0 }, 5, 0, 1, 10, [])
  assert.equal(p.x, 9)
  assert.equal(p.z, 0)
})

test('moveCircle blocks forward motion into a prop', () => {
  const prop: Rect = { x: 0, z: 0, hx: 2, hz: 2 }
  const p = moveCircle({ x: 3.6, z: 0 }, -1.1, 0, 1, 10, [prop])
  assert.ok(p.x >= 3, `expected x >= 3, got ${p.x}`)
})

test('moveCircle ejects a circle whose center is inside a prop', () => {
  const prop: Rect = { x: 0, z: 0, hx: 2, hz: 2 }
  const p = moveCircle({ x: 0, z: 0 }, 0, 0, 1, 10, [prop])
  assert.equal(Math.abs(p.x), 3)
  assert.equal(p.z, 0)
})

test('circlesHit respects the summed radius', () => {
  assert.equal(circlesHit(0, 0, 1, 1.5, 0, 0.6), true)
  assert.equal(circlesHit(0, 0, 1, 2.1, 0, 0.6), false)
})

test('mulberry32 is deterministic', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  for (let i = 0; i < 5; i++) assert.equal(a(), b())
})

test('raycastArena clips against arena boundaries and nearest obstacle', () => {
  const prop: Rect = { x: 0, z: -8, hx: 1.5, hz: 1.5 }
  const dWall = raycastArena(0, 0, 0, -1, 50, 22, [])
  assert.equal(dWall, 22)

  const dProp = raycastArena(0, 0, 0, -1, 50, 22, [prop])
  assert.ok(Math.abs(dProp - 6.5) < 1e-6, `expected 6.5, got ${dProp}`)
})

test('raycastCircle returns intersection distance or maxDist on miss', () => {
  const hit = raycastCircle(0, 0, 0, -1, 0, -10, 1.5, 40)
  assert.ok(Math.abs(hit - 8.5) < 1e-6, `expected 8.5, got ${hit}`)

  const miss = raycastCircle(0, 0, 0, -1, 5, -10, 1.5, 40)
  assert.equal(miss, 40)
})
