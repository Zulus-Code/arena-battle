import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { StatsService } from '@/services/StatsService';

function restartLevel(levelIndex: number): void {
  const config = LEVEL_CONFIGS[levelIndex];
  if (!config) return;
  stopGameLoop();
  gameStateMachine.transition('STARTING_LEVEL');
  useUIStore.getState().setGameState('STARTING_LEVEL');
  setTimeout(() => initLevel(config), 400);
}

function backToMenu(): void {
  stopGameLoop();
  gameStateMachine.transition('MENU');
  useUIStore.getState().setGameState('MENU');
}

export default function GameOverScreen() {
  const session = useGameWorldStore((s) => s.session);
  const stats = StatsService.load();

  const acc =
    session && session.shotsFired > 0
      ? Math.round((session.shotsHit / session.shotsFired) * 100)
      : 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-6 text-5xl font-bold tracking-widest text-red-500">
        ПОРАЖЕНИЕ
      </h2>

      <div className="mb-8 space-y-2 text-lg">
        <p>
          Счёт:{' '}
          <span className="text-2xl font-bold text-yellow-400">
            {session?.score ?? 0}
          </span>
        </p>
        <p>
          Уничтожено врагов:{' '}
          <span className="font-bold">{session?.enemiesKilled ?? 0}</span>
        </p>
        {session && session.shotsFired > 0 && (
          <p>
            Точность: <span className="font-bold">{acc}%</span>
          </p>
        )}
        <p className="pt-2 text-sm text-gray-500">
          Всего убито: <span className="text-gray-300">{stats.totalKills}</span>
          {' · '}Сыграно: <span className="text-gray-300">{stats.totalGamesPlayed}</span>
          {' · '}Ачивок: <span className="text-gray-300">{StatsService.earnedCount()}</span>
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => restartLevel(session?.level ?? 0)}
          className="rounded-lg bg-green-600 px-10 py-3 text-xl font-bold transition-colors hover:bg-green-500"
        >
          ЗАНОВО
        </button>

        <button
          onClick={backToMenu}
          className="rounded-lg bg-gray-700 px-10 py-3 text-lg font-semibold transition-colors hover:bg-gray-600"
        >
          В МЕНЮ
        </button>
      </div>
    </div>
  );
}
