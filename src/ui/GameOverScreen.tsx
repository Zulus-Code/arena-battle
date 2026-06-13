import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';

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

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-6 text-5xl font-bold tracking-widest text-red-500">
        ПОРАЖЕНИЕ
      </h2>

      <p className="mb-8 text-lg">
        Итоговый счёт:{' '}
        <span className="text-2xl font-bold text-yellow-400">
          {session?.score ?? 0}
        </span>
      </p>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => restartLevel((session?.level ?? 1) - 1)}
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
