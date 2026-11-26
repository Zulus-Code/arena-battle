import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import type { PlayerVehicleKind } from '../src/config.ts'
import { buildTurret } from '../src/meshes.ts'

function countMeshes(root: THREE.Object3D): number {
  let count = 0
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) count++
  })
  return count
}

test('buildTurret returns valid TurretView and scales muzzleY/muzzleZ for all three classes', () => {
  const kinds: PlayerVehicleKind[] = ['buggy', 'tank', 'heavy']
  const sameHeightResults = {} as Record<PlayerVehicleKind, ReturnType<typeof buildTurret>>

  for (const kind of kinds) {
    const view = buildTurret(kind, 1.2)
    sameHeightResults[kind] = view

    assert.ok(view.root instanceof THREE.Group, `${kind}: root must be a THREE.Group`)
    assert.ok(view.recoilGroup instanceof THREE.Group, `${kind}: recoilGroup must be a THREE.Group`)
    assert.ok(view.root.children.includes(view.recoilGroup), `${kind}: recoilGroup must live under root`)
    assert.ok(view.muzzleZ < 0, `${kind}: muzzleZ must be negative, got ${view.muzzleZ}`)
    assert.ok(view.muzzleY > 0, `${kind}: muzzleY must be positive, got ${view.muzzleY}`)

    const meshCount = countMeshes(view.root)
    assert.ok(meshCount >= 2 && meshCount <= 14, `${kind}: mesh count ${meshCount} must stay within budget (<= 14)`)

    // Scaling by vehicleHeight scales muzzle coordinates proportionally.
    const taller = buildTurret(kind, 2.4)
    assert.ok(Math.abs(taller.muzzleY / view.muzzleY - 2) < 1e-6, `${kind}: muzzleY scales with vehicleHeight`)
    assert.ok(Math.abs(taller.muzzleZ / view.muzzleZ - 2) < 1e-6, `${kind}: muzzleZ scales with vehicleHeight`)
  }

  // Barrel length ordering holds even at equal vehicleHeight: heavy > tank > buggy.
  assert.ok(
    Math.abs(sameHeightResults.tank.muzzleZ) > Math.abs(sameHeightResults.buggy.muzzleZ),
    'tank |muzzleZ| should exceed buggy |muzzleZ|',
  )
  assert.ok(
    Math.abs(sameHeightResults.heavy.muzzleZ) > Math.abs(sameHeightResults.tank.muzzleZ),
    'heavy |muzzleZ| should exceed tank |muzzleZ|',
  )
  assert.ok(
    Math.abs(sameHeightResults.heavy.muzzleZ) > Math.abs(sameHeightResults.buggy.muzzleZ),
    'heavy |muzzleZ| should exceed buggy |muzzleZ|',
  )
})
