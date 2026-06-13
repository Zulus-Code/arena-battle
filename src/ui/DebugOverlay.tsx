import { useDebugStore } from '@/store/debugStore';
import { useUIStore } from '@/store/uiStore';

export default function DebugOverlay() {
  const debugEnabled = useUIStore((s) => s.debugEnabled);
  const metrics = useDebugStore((s) => s.metrics);

  if (!debugEnabled) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 select-none rounded bg-black/60 px-2 py-1 font-mono text-xs leading-relaxed text-green-400">
      <div>FPS: {metrics.fps}</div>
      <div>Frame: {metrics.frameTime.toFixed(1)}ms</div>
      <div>Update: {metrics.updateTime.toFixed(1)}ms</div>
      <div>Enemies: {metrics.enemyCount}</div>
      <div>Projectiles: {metrics.projectileCount}</div>
      <div>Explosions: {metrics.explosionCount}</div>
    </div>
  );
}
