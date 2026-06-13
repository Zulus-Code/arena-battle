import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { formatTime } from '@/utils/time';

function nextLevel(levelIndex: number): void {
  const next = LEVEL_CONFIGS[levelIndex + 1];
  if (!next) {
    gameStateMachine.transition('VICTORY');
    useUIStore.getState().setGameState('VICTORY');
    return;
  }
  stopGameLoop();
  gameStateMachine.transition('STARTING_LEVEL');
  useUIStore.getState().setGameState('STARTING_LEVEL');
  setTimeout(() => initLevel(next), 400);
}

function backToMenu(): void {
  stopGameLoop();
  gameStateMachine.transition('MENU');
  useUIStore.getState().setGameState('MENU');
}

export default function LevelCompleteScreen() {
  const session = useGameWorldStore((s) => s.session);
  const currentLevel = session?.level ?? 1;
  const hasNextLevel = currentLevel < LEVEL_CONFIGS.length;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-6 text-5xl font-bold tracking-wider text-green-400">
        УРОВЕНЬ ПРОЙДЕН!
      </h2>

      <div className="mb-8 space-y-2 text-lg">
        <p>
          Счёт:{' '}
          <span className="font-bold text-yellow-400">{session?.score ?? 0}</span>
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
      </div>

      <div className="flex flex-col gap-4">
        {hasNextLevel && (
          <button
            onClick={() => nextLevel(currentLevel - 1)}
            className="rounded-lg bg-green-600 px-10 py-3 text-xl font-bold transition-colors hover:bg-green-500"
          >
            СЛЕДУЮЩИЙ
          </button>
        )}

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
