// ─── Victory System ───────────────────────────────────────────────────────────
// Evaluates win/lose conditions and emits appropriate events.

import type { PlayerData } from '@/domain/entities/Player';
import type { EnemyData } from '@/domain/entities/Enemy';
import type { GameSessionData } from '@/domain/entities/GameSession';
import { evaluateVictory, type VictoryCondition } from '@/domain/rules/VictoryRules';
import { isDead } from '@/domain/entities/Health';
import { eventBus } from '@/events/EventBus';

export function checkVictory(
  player: PlayerData,
  enemies: readonly EnemyData[],
  session: GameSessionData,
  condition: VictoryCondition,
  timeLimit: number,
): 'Win' | 'Lose' | 'Ongoing' {
  const aliveEnemies = enemies.filter((e) => e.status !== 'Dead');
  const bossAlive = aliveEnemies.some((e) => e.isBoss);
  const playerAlive = !isDead(player.health);
  const timeRemaining = timeLimit > 0 ? timeLimit - session.timeElapsed : 999;

  const result = evaluateVictory({
    condition,
    enemiesAlive: aliveEnemies.length,
    bossAlive,
    playerAlive,
    timeRemaining,
  });

  if (result.outcome === 'Win') {
    eventBus.emit({
      type: 'LevelCompleted',
      levelIndex: session.level,
      score: session.score,
      timeElapsed: session.timeElapsed,
    });
    return 'Win';
  }

  if (result.outcome === 'Lose') {
    eventBus.emit({
      type: 'GameOver',
      score: session.score,
      reason: 'PlayerDead',
    });
    return 'Lose';
  }

  return 'Ongoing';
}
