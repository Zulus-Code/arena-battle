import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextQualityPreset, parseQualityPreset, QUALITY_PRESETS } from '../src/quality.ts'

test('parseQualityPreset accepts high/balanced/low and defaults to high', () => {
  assert.equal(parseQualityPreset(null), 'high')
  assert.equal(parseQualityPreset(''), 'high')
  assert.equal(parseQualityPreset('unknown'), 'high')
  assert.equal(parseQualityPreset('high'), 'high')
  assert.equal(parseQualityPreset('balanced'), 'balanced')
  assert.equal(parseQualityPreset('low'), 'low')
})

test('nextQualityPreset cycles high -> balanced -> low -> high', () => {
  assert.equal(nextQualityPreset('high'), 'balanced')
  assert.equal(nextQualityPreset('balanced'), 'low')
  assert.equal(nextQualityPreset('low'), 'high')
})

test('QUALITY_PRESETS matches target renderScale, samples, and shadows', () => {
  assert.deepEqual(QUALITY_PRESETS.high, { renderScale: 1.0, samples: 2, shadows: true, particleScale: 1.0 })
  assert.deepEqual(QUALITY_PRESETS.balanced, { renderScale: 0.85, samples: 0, shadows: true, particleScale: 0.75 })
  assert.deepEqual(QUALITY_PRESETS.low, { renderScale: 0.7, samples: 0, shadows: false, particleScale: 0.5 })
})
