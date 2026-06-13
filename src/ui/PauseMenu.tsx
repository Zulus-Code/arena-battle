import { gameStateMachine } from '@/game/GameStateMachine';
import { resumeGame, stopGameLoop } from '@/game/GameLoop';
import { useUIStore } from '@/store/uiStore';

export default function PauseMenu() {
  function handleResume(): void {
    resumeGame();
  }

  function handleQuit(): void {
    stopGameLoop();
    gameStateMachine.transition('MENU');
    useUIStore.getState().setGameState('MENU');
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-8 text-5xl font-bold tracking-widest text-yellow-400">
        ПАУЗА
      </h2>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleResume}
          className="rounded-lg bg-green-600 px-10 py-3 text-xl font-bold transition-colors hover:bg-green-500"
        >
          ПРОДОЛЖИТЬ
        </button>

        <button
          onClick={handleQuit}
          className="rounded-lg bg-gray-700 px-10 py-3 text-lg font-semibold transition-colors hover:bg-gray-600"
        >
          В МЕНЮ
        </button>
      </div>
    </div>
  );
}
