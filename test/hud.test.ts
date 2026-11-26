import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, pause, start } from '../src/game.ts'
import { createMinimapSnapshot, syncMinimapSnapshot } from '../src/hud.ts'

test('syncMinimapSnapshot detects changes and skips identical paused/menu frames', () => {
  const g = createGame([{ x: 0, z: 0, hx: 1, hz: 1 }])
  const snap = createMinimapSnapshot()

  assert.equal(syncMinimapSnapshot(snap, g, false), true)
  assert.equal(syncMinimapSnapshot(snap, g, false), false)

  start(g)
  g.enemies.push({ id: 1, kind: 'scout', x: 5, z: -4, yaw: 0, hp: 30, cooldown: 1, engageTimer: 0, touch: 0 })
  assert.equal(syncMinimapSnapshot(snap, g, false), true)
  assert.equal(syncMinimapSnapshot(snap, g, false), false)

  g.enemies[0].x = 5.5
  assert.equal(syncMinimapSnapshot(snap, g, false), true)
  assert.equal(syncMinimapSnapshot(snap, g, false), false)

  pause(g)
  assert.equal(syncMinimapSnapshot(snap, g, false), true)
  assert.equal(syncMinimapSnapshot(snap, g, false), false)
  assert.equal(syncMinimapSnapshot(snap, g, true), true)
})
