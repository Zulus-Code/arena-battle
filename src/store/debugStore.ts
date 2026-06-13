// ─── Debug Store ──────────────────────────────────────────────────────────────
// Performance metrics and debug data. Separate from game and UI state.

import { create } from 'zustand';

export interface DebugMetrics {
  fps: number;
  frameTime: number;
  enemyCount: number;
  projectileCount: number;
  explosionCount: number;
  updateTime: number;    // ms spent in game update
}

export interface DebugState {
  metrics: DebugMetrics;
  updateMetrics: (patch: Partial<DebugMetrics>) => void;
}

const INITIAL_METRICS: DebugMetrics = {
  fps: 0,
  frameTime: 0,
  enemyCount: 0,
  projectileCount: 0,
  explosionCount: 0,
  updateTime: 0,
};

export const useDebugStore = create<DebugState>((set) => ({
  metrics: INITIAL_METRICS,
  updateMetrics: (patch) =>
    set((s) => ({ metrics: { ...s.metrics, ...patch } })),
}));
