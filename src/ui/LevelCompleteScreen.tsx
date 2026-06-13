import { useState } from 'react';
import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGamificationStore } from '@/store/gamificationStore';
import { useUIStore } from '@/store/uiStore';
import { formatTime } from '@/utils/time';
import UpgradeScreen from './UpgradeScreen';

function StarDisplay({ stars, size = 'md' }: { stars: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-2xl';
  return (
    <div className={`flex items-center justify-center gap-1 ${sizeClass}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`transition-all duration-500 ${i <= stars ? 'opacity-100' : 'opacity-20'}`}
          style={{
            filter: i <= stars ? 'drop-shadow(0 0 6px rgba(250,204,21,0.5))' : 'none',
          }}
        >
          {i <= stars ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

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

function retryLevel(levelIndex: number): void {
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

export default function LevelCompleteScreen() {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const levelResult = useGamificationStore((s) => s.lastLevelResult);

  if (!levelResult) return null;

  const { levelIndex, score, timeElapsed, accuracy, stars, enemiesKilled } = levelResult;
  const hasNextLevel = levelIndex + 1 < LEVEL_CONFIGS.length;
  const accPct = Math.round(accuracy * 100);

  // Show upgrade screen overlay
  if (showUpgrades) {
    return (
      <UpgradeScreen
        onContinue={() => {
          setShowUpgrades(false);
          if (hasNextLevel) {
            nextLevel(levelIndex);
          }
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-6 text-5xl font-bold tracking-wider text-green-400">
        УРОВЕНЬ ПРОЙДЕН!
      </h2>

      {/* Star rating */}
      <div className="mb-6">
        <StarDisplay stars={stars} size="lg" />
      </div>

      {/* Stats */}
      <div className="mb-8 space-y-2 text-lg">
        <p>
          Счёт:{' '}
          <span className="font-bold text-yellow-400">{score}</span>
        </p>
        <p>
          Время:{' '}
          <span className="font-mono tabular-nums">
            {formatTime(timeElapsed)}
          </span>
        </p>
        <p>
          Уничтожено:{' '}
          <span className="font-bold">{enemiesKilled}</span>
        </p>
        <p>
          Точность:{' '}
          <span className={`font-bold ${accPct >= 80 ? 'text-green-400' : accPct >= 50 ? 'text-yellow-400' : 'text-gray-300'}`}>
            {accPct}%
          </span>
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-4">
        {hasNextLevel && (
          <button
            onClick={() => nextLevel(levelIndex)}
            className="rounded-lg bg-green-600 px-10 py-3 text-xl font-bold transition-colors hover:bg-green-500"
          >
            СЛЕДУЮЩИЙ УРОВЕНЬ
          </button>
        )}

        <button
          onClick={() => setShowUpgrades(true)}
          className="rounded-lg bg-amber-700/60 px-10 py-2 text-base font-semibold transition-colors hover:bg-amber-600/60"
        >
          МАСТЕРСКАЯ
        </button>

        <button
          onClick={() => retryLevel(levelIndex)}
          className="rounded-lg bg-blue-700/50 px-10 py-2 text-base font-semibold transition-colors hover:bg-blue-600/50"
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
