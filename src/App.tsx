// ─── App ───────────────────────────────────────────────────────────────────────
// Root component. Routes between MENU, PLAYING, PAUSED, and results screens.

import { useEffect } from 'react';
import { gameStateMachine } from '@/game/GameStateMachine';
import { useUIStore } from '@/store/uiStore';
import { keyboardInput } from '@/input/KeyboardInput';
import GameCanvas from '@/render/GameCanvas';
import MainMenu from '@/ui/MainMenu';
import HUD from '@/ui/HUD';
import PauseMenu from '@/ui/PauseMenu';
import GameOverScreen from '@/ui/GameOverScreen';
import LevelCompleteScreen from '@/ui/LevelCompleteScreen';
import VictoryScreen from '@/ui/VictoryScreen';
import DebugOverlay from '@/ui/DebugOverlay';
import StartLevelOverlay from '@/ui/StartLevelOverlay';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

export default function App() {
  const gameState = useUIStore((s) => s.gameState);
  const debugEnabled = useUIStore((s) => s.debugEnabled);

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
            {debugEnabled && <DebugOverlay />}
            {gameState === 'PAUSED' && <PauseMenu />}
            {gameState === 'STARTING_LEVEL' && <StartLevelOverlay />}
            {gameState === 'LEVEL_COMPLETE' && <LevelCompleteScreen />}
            {gameState === 'GAME_OVER' && <GameOverScreen />}
          </>
        )}

        {gameState === 'VICTORY' && <VictoryScreen />}
      </div>
    </ErrorBoundary>
  );
}
