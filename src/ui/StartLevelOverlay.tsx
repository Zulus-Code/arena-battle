import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';

export default function StartLevelOverlay() {
  const gameState = useUIStore((s) => s.gameState);
  const session = useGameWorldStore((s) => s.session);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (gameState === 'STARTING_LEVEL') {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [gameState]);

  if (!visible) return null;

  const levelIndex = session?.level ?? 0;
  const levelName = LEVEL_CONFIGS[levelIndex]?.name ?? `УРОВЕНЬ ${levelIndex + 1}`;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
      <div className="animate-pulse text-center">
        <p className="text-3xl font-bold tracking-wider text-white drop-shadow-lg">
          УРОВЕНЬ {levelIndex + 1}: {levelName}
        </p>
        <p className="mt-2 text-sm text-gray-400">Приготовиться...</p>
      </div>
    </div>
  );
}
