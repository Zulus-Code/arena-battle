// ─── Victory Rules ────────────────────────────────────────────────────────────
// Defines win/lose conditions.

export type VictoryCondition = 'EliminateAll' | 'Survival' | 'KillBoss';

export interface VictoryContext {
  readonly condition: VictoryCondition;
  readonly enemiesAlive: number;
  readonly bossAlive: boolean;
  readonly playerAlive: boolean;
  readonly timeRemaining: number;
}

export type VictoryResult =
  | { readonly outcome: 'Win'; readonly reason: string }
  | { readonly outcome: 'Lose'; readonly reason: string }
  | { readonly outcome: 'Ongoing' };

export function evaluateVictory(ctx: VictoryContext): VictoryResult {
  if (!ctx.playerAlive) {
    return { outcome: 'Lose', reason: 'Player destroyed' };
  }

  switch (ctx.condition) {
    case 'EliminateAll':
      if (ctx.enemiesAlive === 0) {
        return { outcome: 'Win', reason: 'All enemies eliminated' };
      }
      break;

    case 'KillBoss':
      if (!ctx.bossAlive && ctx.enemiesAlive === 0) {
        return { outcome: 'Win', reason: 'Boss destroyed' };
      }
      break;

    case 'Survival':
      if (ctx.timeRemaining <= 0) {
        return { outcome: 'Win', reason: 'Survived the wave' };
      }
      break;
  }

  return { outcome: 'Ongoing' };
}
