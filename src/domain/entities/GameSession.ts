// ─── Game Session Entity ──────────────────────────────────────────────────────
// Tracks the state of the current game session.

export interface GameSessionData {
  readonly score: number;
  readonly level: number;
  readonly timeElapsed: number;
  readonly enemiesKilled: number;
  readonly shotsFired: number;
  readonly shotsHit: number;
}

export function createGameSession(): GameSessionData {
  return {
    score: 0,
    level: 1,
    timeElapsed: 0,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
  };
}

export function addScore(session: GameSessionData, delta: number): GameSessionData {
  return { ...session, score: session.score + delta };
}

export function incrementKills(session: GameSessionData): GameSessionData {
  return { ...session, enemiesKilled: session.enemiesKilled + 1 };
}

export function accuracy(session: GameSessionData): number {
  if (session.shotsFired === 0) return 0;
  return session.shotsHit / session.shotsFired;
}
