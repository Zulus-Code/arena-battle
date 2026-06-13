// ─── Level Service ─────────────────────────────────────────────────────────────
// Level lifecycle management — orchestrates full level builds.

import type { LevelConfig } from '@/config/LevelConfig';
import type { ArenaData, ObstacleData } from '@/domain/entities/Arena';
import type { PlayerData } from '@/domain/entities/Player';
import type { PickupData } from '@/domain/entities/Pickup';
import type { GameSessionData } from '@/domain/entities/GameSession';
import { createHealth } from '@/domain/entities/Health';
import { createShield } from '@/domain/entities/Shield';
import { createWeapon } from '@/domain/entities/Weapon';
import { createGameSession } from '@/domain/entities/GameSession';
import { PLAYER_CONFIG } from '@/config/PlayerConfig';
import { ARENA_CONFIG } from '@/config/ArenaConfig';
import { DEFAULT_PLAYER_WEAPON } from '@/config/WeaponConfig';
import { randomService } from '@/core/RandomService';
import { spawnPickups } from './SpawnService';
import { v4 as uuidv4 } from 'uuid';

function createDefaultPlayer(): PlayerData {
  return {
    id: uuidv4(),
    position: { ...PLAYER_CONFIG.startPosition },
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    health: createHealth(PLAYER_CONFIG.maxHealth),
    shield: createShield(),
    weapon: createWeapon(DEFAULT_PLAYER_WEAPON),
    status: 'Alive',
    score: 0,
    speed: PLAYER_CONFIG.speed,
    turnSpeed: PLAYER_CONFIG.turnSpeed,
    speedBoostTimer: 0,
    rapidFireTimer: 0,
  };
}

/** Generate arena data with randomized obstacles */
export function buildArena(config: LevelConfig): ArenaData {
  const obstacles: ObstacleData[] = [];
  const margin = ARENA_CONFIG.obstacleMaxSize;
  const halfW = config.arenaWidth / 2 - margin;
  const halfD = config.arenaDepth / 2 - margin;

  for (let i = 0; i < config.obstacleCount; i++) {
    obstacles.push({
      id: uuidv4(),
      position: {
        x: randomService.range(-halfW, halfW),
        y: ARENA_CONFIG.obstacleHeight / 2,
        z: randomService.range(-halfD, halfD),
      },
      size: {
        x: randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize),
        y: ARENA_CONFIG.obstacleHeight,
        z: randomService.range(ARENA_CONFIG.obstacleMinSize, ARENA_CONFIG.obstacleMaxSize),
      },
      rotation: randomService.range(0, Math.PI * 2),
      destructible: true,
      hp: 100,
      maxHp: 100,
    });
  }

  return {
    width: config.arenaWidth,
    depth: config.arenaDepth,
    wallThickness: ARENA_CONFIG.wallThickness,
    obstacles,
  };
}

/** Build all entities and state for a level (enemies are spawned separately in initLevel with delays) */
export function buildLevelData(config: LevelConfig): {
  readonly arena: ArenaData;
  readonly player: PlayerData;
  readonly pickups: readonly PickupData[];
  readonly session: GameSessionData;
} {
  const arena = buildArena(config);
  const player = createDefaultPlayer();
  const pickups = spawnPickups(config, arena.obstacles, { x: config.arenaWidth / 2, z: config.arenaDepth / 2 });
  const session = createGameSession();

  return { arena, player, pickups, session };
}
