// ─── App ───────────────────────────────────────────────────────────────────────
// Root component. Routes between MENU, PLAYING, PAUSED, and results screens.

import { useEffect } from 'react';
import { gameStateMachine } from '@/game/GameStateMachine';
import { useUIStore } from '@/store/uiStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { keyboardInput } from '@/input/KeyboardInput';
import { StatsService } from '@/services/StatsService';
import GameCanvas from '@/render/GameCanvas';
import MainMenu from '@/ui/MainMenu';
import HUD from '@/ui/HUD';
import PauseMenu from '@/ui/PauseMenu';
import GameOverScreen from '@/ui/GameOverScreen';
import LevelCompleteScreen from '@/ui/LevelCompleteScreen';
import VictoryScreen from '@/ui/VictoryScreen';
import AchievementNotifications from '@/ui/AchievementNotification';
import DebugOverlay from '@/ui/DebugOverlay';
import StartLevelOverlay from '@/ui/StartLevelOverlay';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

export default function App() {
  const gameState = useUIStore((s) => s.gameState);
  const debugEnabled = useUIStore((s) => s.debugEnabled);
  const setStats = useGamificationStore((s) => s.setStats);

  // Load persistent stats on mount
  useEffect(() => {
    const stats = StatsService.load();
    setStats(stats);
  }, [setStats]);

  // Attach input on mount, detach on unmount
  useEffect(() => {
    keyboardInput.attach();
    return () => keyboardInput.detach();
  }, []);

  // Boot → Menu transition (only runs once, guarded by state machine check)
  useEffect(() => {
    if (gameStateMachine.getState() === 'BOOT') {
      gameStateMachine.transition('MENU');
      useUIStore.getState().setGameState('MENU');
    }
  }, []);

  const show3DScene =
    gameState === 'PLAYING' ||
    gameState === 'PAUSED' ||
    gameState === 'LEVEL_COMPLETE' ||
    gameState === 'GAME_OVER' ||
    gameState === 'STARTING_LEVEL';

  return (
    <ErrorBoundary>
      <div className="h-screen w-full overflow-hidden bg-black">
        {(gameState === 'MENU' || gameState === 'BOOT') && <MainMenu />}

        {show3DScene && (
          <>
            <GameCanvas />
            <HUD />
            <AchievementNotifications />
            {debugEnabled && <DebugOverlay />}
            {gameState === 'PAUSED' && <PauseMenu />}
            {gameState === 'STARTING_LEVEL' && <StartLevelOverlay />}
            {gameState === 'LEVEL_COMPLETE' && <LevelCompleteScreen />}
            {gameState === 'GAME_OVER' && <GameOverScreen />}
          </>
        )}

        {gameState === 'VICTORY' && (
          <>
            <VictoryScreen />
            <AchievementNotifications />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
