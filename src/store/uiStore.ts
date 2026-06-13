// ─── UI Store ─────────────────────────────────────────────────────────────────
// Zustand store for pure UI state (menus, overlays, settings).
// Does NOT contain game logic or entity data.

import { create } from 'zustand';
import type { GameState } from '@/game/GameStateMachine';

export interface UIState {
  // Game state reflection (for UI transitions)
  gameState: GameState;
  setGameState: (state: GameState) => void;

  // Debug
  debugEnabled: boolean;
  toggleDebug: () => void;

  // Settings
  musicVolume: number;
  sfxVolume: number;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;

  // HUD
  showHUD: boolean;
  setShowHUD: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  gameState: 'BOOT',
  setGameState: (gameState) => set({ gameState }),

  debugEnabled: false,
  toggleDebug: () => set((s) => ({ debugEnabled: !s.debugEnabled })),

  musicVolume: 0.5,
  sfxVolume: 0.8,
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),

  showHUD: true,
  setShowHUD: (showHUD) => set({ showHUD }),
}));
