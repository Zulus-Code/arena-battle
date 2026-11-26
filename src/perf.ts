export const PERF_WINDOW = 60

export interface PerfConfig {
  scale: number | null
  shadows: '0' | 'basic' | null
  aa: '0' | null
  tm: '0' | null
  cs: 'linear' | null
  ibl: '0' | null
  bump: '0' | null
}

export interface PerfSummary {
  frameCount: number
  frameAvgMs: number
  frameP95Ms: number
  cpuCount: number
  cpuAvgMs: number
  cpuP95Ms: number
  fps: number
}

export interface PerfTracker {
  record(frameMs: number | null, cpuMs: number): void
  summarize(): PerfSummary
}

export interface PerfOverlay {
  record(frameMs: number | null, cpuMs: number, drawCalls: number, triangles: number): void
  dispose(): void
}

/** Parses `?perf=1` and isolated A/B flags from a URL query string. Returns null when perf is disabled. */
export function parsePerfConfig(search: string): PerfConfig | null {
  const params = new URLSearchParams(search)
  if (params.get('perf') !== '1') return null

  let scale: number | null = null
  const rawScale = params.get('scale')
  if (rawScale !== null && rawScale.trim() !== '') {
    const parsed = Number(rawScale)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 4) {
      scale = parsed
    }
  }

  const rawShadows = params.get('shadows')
  const shadows = rawShadows === '0' || rawShadows === 'basic' ? rawShadows : null

  return {
    scale,
    shadows,
    aa: params.get('aa') === '0' ? '0' : null,
    tm: params.get('tm') === '0' ? '0' : null,
    cs: params.get('cs') === 'linear' ? 'linear' : null,
    ibl: params.get('ibl') === '0' ? '0' : null,
    bump: params.get('bump') === '0' ? '0' : null,
  }
}

export function formatPerfFlags(config: PerfConfig): string {
  const parts: string[] = []
  if (config.scale !== null) parts.push(`scale=${config.scale}`)
  if (config.shadows !== null) parts.push(`shadows=${config.shadows}`)
  if (config.aa !== null) parts.push(`aa=${config.aa}`)
  if (config.tm !== null) parts.push(`tm=${config.tm}`)
  if (config.cs !== null) parts.push(`cs=${config.cs}`)
  if (config.ibl !== null) parts.push(`ibl=${config.ibl}`)
  if (config.bump !== null) parts.push(`bump=${config.bump}`)
  return parts.length > 0 ? parts.join(' ') : 'baseline'
}

function summarizeRing(buf: Float64Array, count: number, scratch: Float64Array): { avg: number; p95: number } {
  if (count === 0) return { avg: 0, p95: 0 }
  let sum = 0
  for (let i = 0; i < count; i++) {
    const value = buf[i]
    sum += value
    scratch[i] = value
  }
  scratch.subarray(0, count).sort()
  const p95Index = Math.min(count - 1, Math.ceil(count * 0.95) - 1)
  return { avg: sum / count, p95: scratch[p95Index] }
}

/** Preallocated rolling-window tracker for frame interval and CPU frame cost. */
export function createPerfTracker(windowSize = PERF_WINDOW): PerfTracker {
  const frameBuf = new Float64Array(windowSize)
  const cpuBuf = new Float64Array(windowSize)
  const scratch = new Float64Array(windowSize)
  let frameCount = 0
  let frameHead = 0
  let cpuCount = 0
  let cpuHead = 0

  return {
    record(frameMs, cpuMs) {
      if (frameMs !== null && Number.isFinite(frameMs) && frameMs >= 0) {
        frameBuf[frameHead] = frameMs
        frameHead = (frameHead + 1) % windowSize
        if (frameCount < windowSize) frameCount++
      }
      if (Number.isFinite(cpuMs) && cpuMs >= 0) {
        cpuBuf[cpuHead] = cpuMs
        cpuHead = (cpuHead + 1) % windowSize
        if (cpuCount < windowSize) cpuCount++
      }
    },
    summarize() {
      const frame = summarizeRing(frameBuf, frameCount, scratch)
      const cpu = summarizeRing(cpuBuf, cpuCount, scratch)
      return {
        frameCount,
        frameAvgMs: frame.avg,
        frameP95Ms: frame.p95,
        cpuCount,
        cpuAvgMs: cpu.avg,
        cpuP95Ms: cpu.p95,
        fps: frame.avg > 0 ? 1000 / frame.avg : 0,
      }
    },
  }
}

export function createPerfOverlay(
  root: HTMLElement,
  config: PerfConfig,
  getInfoLine: () => string,
): PerfOverlay {
  const el = document.createElement('div')
  el.className = 'perf-overlay'
  root.appendChild(el)

  const tracker = createPerfTracker(PERF_WINDOW)
  const flagsLabel = formatPerfFlags(config)
  let ticks = 0

  return {
    record(frameMs, cpuMs, drawCalls, triangles) {
      tracker.record(frameMs, cpuMs)
      ticks++
      if (ticks > 2 && ticks % 15 !== 0) return
      const s = tracker.summarize()
      el.textContent =
        `frameMs  avg ${s.frameAvgMs.toFixed(2)} | p95 ${s.frameP95Ms.toFixed(2)} (${s.fps.toFixed(1)} fps, ${s.frameCount}/${PERF_WINDOW})\n` +
        `cpuMs    avg ${s.cpuAvgMs.toFixed(2)} | p95 ${s.cpuP95Ms.toFixed(2)}\n` +
        `render   drawCalls ${drawCalls} | triangles ${Math.round(triangles)}\n` +
        `${getInfoLine()}\n` +
        `flags    ${flagsLabel}`
    },
    dispose() {
      el.remove()
    },
  }
}
