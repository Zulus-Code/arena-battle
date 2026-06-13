import { gameStateMachine } from '@/game/GameStateMachine';
import { stopGameLoop } from '@/game/GameLoop';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useUIStore } from '@/store/uiStore';
import { formatTime } from '@/utils/time';
import { StatsService } from '@/services/StatsService';
import { ACHIEVEMENTS } from '@/config/AchievementConfig';
import { useEffect, useState } from 'react';

const STARS_TOTAL = 3; // 3 levels × 3 stars = 9

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
  const [stats, setStats] = useState(() => StatsService.load());
  const [showAchievements, setShowAchievements] = useState(false);

  // Refresh stats on mount (in case they were updated)
  useEffect(() => {
    setStats(StatsService.load());
  }, []);

  const acc =
    session && session.shotsFired > 0
      ? Math.round((session.shotsHit / session.shotsFired) * 100)
      : 0;

  const totalStarsEarned = Object.values(stats.levelStars).reduce((a, b) => a + b, 0);

  const earnedAchievements = ACHIEVEMENTS.filter(
    (a) => stats.achievements[a.id] > 0,
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <h2 className="mb-2 text-6xl font-bold tracking-wider text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
        ПОБЕДА!
      </h2>
      <p className="mb-8 text-lg text-gray-400">Все уровни пройдены</p>

      {/* Session stats */}
      <div className="mb-6 space-y-2 text-lg">
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
          Точность: <span className="font-bold">{acc}%</span>
        </p>
      </div>

      {/* Career stats */}
      <div className="mb-6 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-400">
        <span>Всего убито: <strong className="text-gray-200">{stats.totalKills}</strong></span>
        <span>Сыграно: <strong className="text-gray-200">{stats.totalGamesPlayed}</strong></span>
        <span>Всего очков: <strong className="text-gray-200">{stats.totalScore}</strong></span>
        <span>Звёзд: <strong className="text-yellow-400">{totalStarsEarned}/{STARS_TOTAL}</strong></span>
      </div>

      {/* Achievements toggle */}
      {earnedAchievements.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="text-sm text-amber-400/70 hover:text-amber-300 transition-colors tracking-wider uppercase"
          >
            {showAchievements ? 'Скрыть ачивки' : `Ачивки (${earnedAchievements.length})`}
          </button>

          {showAchievements && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-md">
              {earnedAchievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded border border-yellow-600/30 px-3 py-1.5 text-sm"
                  style={{
                    background: 'rgba(20,25,15,0.8)',
                  }}
                >
                  <span className="text-base">{a.icon}</span>
                  <span className="text-gray-200">{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
