import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { formatTime } from '@/utils/time';

function playAgain(): void {
  const config = LEVEL_CONFIGS[0];
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

export default function VictoryScreen() {
  const session = useGameWorldStore((s) => s.session);

  const acc =
    session && session.shotsFired > 0
      ? Math.round((session.shotsHit / session.shotsFired) * 100)
      : 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-2 text-6xl font-bold tracking-wider text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
        ПОБЕДА!
      </h2>
      <p className="mb-8 text-lg text-gray-400">Все уровни пройдены</p>

      <div className="mb-8 space-y-2 text-lg">
        <p>
          Итоговый счёт:{' '}
          <span className="font-bold text-yellow-400">
            {session?.score ?? 0}
          </span>
        </p>
        <p>
          Время:{' '}
          <span className="font-mono tabular-nums">
            {session ? formatTime(session.timeElapsed) : '0:00'}
          </span>
        </p>
        <p>
          Уничтожено:{' '}
          <span className="font-bold">{session?.enemiesKilled ?? 0}</span>
        </p>
        <p>
          Точность:{' '}
          <span className="font-bold">{acc}%</span>
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={playAgain}
          className="rounded-lg bg-green-600 px-10 py-3 text-xl font-bold transition-colors hover:bg-green-500"
        >
          С НАЧАЛА
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
