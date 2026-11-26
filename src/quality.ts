export type QualityPreset = 'high' | 'balanced' | 'low'

export interface QualitySpec {
  renderScale: number
  /** Applied only when creating WebGPURenderer on startup; changing preset live takes effect on reload. */
  samples: number
  shadows: boolean
  particleScale: number
}

export const QUALITY_PRESETS: Record<QualityPreset, QualitySpec> = {
  high: { renderScale: 1.0, samples: 2, shadows: true, particleScale: 1.0 },
  balanced: { renderScale: 0.85, samples: 0, shadows: true, particleScale: 0.75 },
  low: { renderScale: 0.7, samples: 0, shadows: false, particleScale: 0.5 },
}

export const QUALITY_ORDER: readonly QualityPreset[] = ['high', 'balanced', 'low']

export function parseQualityPreset(raw: string | null): QualityPreset {
  if (raw === 'balanced' || raw === 'low') return raw
  return 'high'
}

export function nextQualityPreset(current: QualityPreset): QualityPreset {
  const idx = QUALITY_ORDER.indexOf(current)
  return QUALITY_ORDER[(idx + 1) % QUALITY_ORDER.length]
}
