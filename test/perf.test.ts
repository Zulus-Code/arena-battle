import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPerfTracker, formatPerfFlags, parsePerfConfig } from '../src/perf.ts'

test('parsePerfConfig returns null unless perf=1 is set', () => {
  assert.equal(parsePerfConfig(''), null)
  assert.equal(parsePerfConfig('?perf=0&scale=0.5&aa=0'), null)
  assert.equal(parsePerfConfig('?scale=0.5&shadows=0&ibl=0'), null)
})

test('parsePerfConfig parses ?perf=1 baseline and isolated A/B flags', () => {
  assert.deepEqual(parsePerfConfig('?perf=1'), {
    scale: null,
    shadows: null,
    aa: null,
    tm: null,
    cs: null,
    ibl: null,
    bump: null,
  })

  assert.deepEqual(
    parsePerfConfig('?perf=1&scale=0.5&shadows=basic&aa=0&tm=0&cs=linear&ibl=0&bump=0'),
    {
      scale: 0.5,
      shadows: 'basic',
      aa: '0',
      tm: '0',
      cs: 'linear',
      ibl: '0',
      bump: '0',
    },
  )

  assert.equal(parsePerfConfig('?perf=1&shadows=0')?.shadows, '0')
  assert.equal(parsePerfConfig('?perf=1&shadows=unknown')?.shadows, null)
  assert.equal(parsePerfConfig('?perf=1&scale=0')?.scale, null)
  assert.equal(parsePerfConfig('?perf=1&scale=-1')?.scale, null)
  assert.equal(parsePerfConfig('?perf=1&scale=bad')?.scale, null)
})

test('formatPerfFlags reports baseline or active flags consistently', () => {
  const baseline = parsePerfConfig('?perf=1')!
  assert.equal(formatPerfFlags(baseline), 'baseline')

  const flags = parsePerfConfig('?perf=1&tm=0&cs=linear&scale=0.5')!
  assert.equal(formatPerfFlags(flags), 'scale=0.5 tm=0 cs=linear')
})

test('createPerfTracker computes rolling 60-frame avg, p95 and fps', () => {
  const tracker = createPerfTracker(60)
  // Frame 0 has null frameMs; only cpuMs is recorded.
  tracker.record(null, 2)
  assert.equal(tracker.summarize().frameCount, 0)
  assert.equal(tracker.summarize().cpuCount, 1)

  // Push 70 frames so the first 10 drop out of the 60-frame window:
  // remaining 60 values are 11..70 for frameMs and 1..60 for cpuMs (wait: 71 cpu entries -> 12..71).
  for (let i = 1; i <= 70; i++) {
    tracker.record(i, i + 1)
  }

  const s = tracker.summarize()
  assert.equal(s.frameCount, 60)
  // Average of 11..70 = (11 + 70) / 2 = 40.5
  assert.equal(s.frameAvgMs, 40.5)
  // Nearest-rank p95 of 60 sorted items (11..70) is index ceil(57) - 1 = 56 -> 11 + 56 = 67
  assert.equal(s.frameP95Ms, 67)
  assert.ok(Math.abs(s.fps - 1000 / 40.5) < 1e-9)

  assert.equal(s.cpuCount, 60)
  // Last 60 cpu entries are i=11..70 -> values 12..71, avg = 41.5, p95 = 12 + 56 = 68
  assert.equal(s.cpuAvgMs, 41.5)
  assert.equal(s.cpuP95Ms, 68)
})
