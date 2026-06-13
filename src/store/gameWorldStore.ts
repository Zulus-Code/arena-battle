// ─── Game World Store ─────────────────────────────────────────────────────────
// Zustand store for game world state (entities, not logic).
// Systems write here. Renderers read here.

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { ProjectileData } from '@/domain/entities/Projectile';
import type { PickupData } from '@/domain/entities/Pickup';
import type { ExplosionData } from '@/domain/entities/Explosion';
import type { ArenaData, ObstacleData } from '@/domain/entities/Arena';
import type { GameSessionData } from '@/domain/entities/GameSession';

export interface GameWorldState {
  // Entities
  player: PlayerData | null;
  enemies: readonly EnemyData[];
  projectiles: readonly ProjectileData[];
  pickups: readonly PickupData[];
  explosions: readonly ExplosionData[];
  arena: ArenaData | null;
  session: GameSessionData | null;

  // Setters (used by game systems only)
  setPlayer: (player: PlayerData | null) => void;
  setEnemies: (enemies: readonly EnemyData[]) => void;
  updateEnemy: (id: string, patch: Partial<EnemyData>) => void;
  setProjectiles: (projectiles: readonly ProjectileData[]) => void;
  setPickups: (pickups: readonly PickupData[]) => void;
  setExplosions: (explosions: readonly ExplosionData[]) => void;
  addExplosion: (explosion: ExplosionData) => void;
  removeExplosion: (id: string) => void;
  setArena: (arena: ArenaData | null) => void;
  updateObstacle: (id: string, patch: Partial<ObstacleData>) => void;
  setSession: (session: GameSessionData | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  player: null,
  enemies: [] as readonly EnemyData[],
  projectiles: [] as readonly ProjectileData[],
  pickups: [] as readonly PickupData[],
  explosions: [] as readonly ExplosionData[],
  arena: null,
  session: null,
};

export const useGameWorldStore = create<GameWorldState>((set) => ({
  ...INITIAL_STATE,

  setPlayer: (player) => set({ player }),

  setEnemies: (enemies) => set((state) => {
    if (shallow(state.enemies, enemies)) return state;
    return { enemies };
  }),

  updateEnemy: (id, patch) =>
    set((state) => ({
      enemies: state.enemies.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  setProjectiles: (projectiles) => set((state) => {
    if (shallow(state.projectiles, projectiles)) return state;
    return { projectiles };
  }),

  setPickups: (pickups) => set((state) => {
    if (shallow(state.pickups, pickups)) return state;
    return { pickups };
  }),

  setExplosions: (explosions) => set((state) => {
    if (shallow(state.explosions, explosions)) return state;
    return { explosions };
  }),

  addExplosion: (explosion) =>
    set((state) => ({ explosions: [...state.explosions, explosion] })),

  removeExplosion: (id) =>
    set((state) => ({ explosions: state.explosions.filter((e) => e.id !== id) })),

  setArena: (arena) => set({ arena }),

  updateObstacle: (id, patch) =>
    set((state) => {
      if (!state.arena) return state;
      return {
        arena: {
          ...state.arena,
          obstacles: state.arena.obstacles.map((o) =>
            o.id === id ? { ...o, ...patch } : o,
          ),
        },
      };
    }),

  setSession: (session) => set({ session }),

  reset: () => set(INITIAL_STATE),
}));
