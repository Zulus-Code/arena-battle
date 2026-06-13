import { useGameWorldStore } from '@/store/gameWorldStore';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { formatTime } from '@/utils/time';

function healthColor(pct: number): string {
  if (pct > 0.6) return 'bg-green-500';
  if (pct > 0.3) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function HUD() {
  const player = useGameWorldStore((s) => s.player);
  const session = useGameWorldStore((s) => s.session);

  if (!player || !session) return null;

  const healthPct = player.health.current / player.health.max;
  const shieldPct =
    player.shield.active && player.shield.duration > 0
      ? player.shield.remaining / player.shield.duration
      : 0;
  const levelName =
    LEVEL_CONFIGS[session.level - 1]?.name ?? `УРОВЕНЬ ${session.level}`;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex select-none items-start justify-between p-4 text-white">
      {/* Left: Health, Shield, Ammo */}
      <div className="flex flex-col gap-2">
        {/* Health bar */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-sm font-semibold">ЖИЗНИ</span>
          <div className="h-3 w-40 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${healthColor(healthPct)}`}
              style={{ width: `${healthPct * 100}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">
            {player.health.current}/{player.health.max}
          </span>
        </div>

        {/* Shield bar */}
        {player.shield.active && (
          <div className="flex items-center gap-2">
            <span className="w-20 text-sm font-semibold">ЩИТ</span>
            <div className="h-3 w-40 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${shieldPct * 100}%` }}
              />
            </div>
            <span className="w-16 text-right text-xs tabular-nums">
              {Math.ceil(player.shield.remaining)}s
            </span>
          </div>
        )}

        {/* Ammo */}
        <div className="flex items-center gap-2">
          <span className="w-20 text-sm font-semibold">ПАТРОНЫ</span>
          <div className="h-3 w-40 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-orange-400 transition-all"
              style={{
                width: `${(player.weapon.ammo / player.weapon.maxAmmo) * 100}%`,
              }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">
            {player.weapon.ammo}/{player.weapon.maxAmmo}
          </span>
        </div>
      </div>

      {/* Right: Score, Level, Time */}
      <div className="flex flex-col items-end gap-1">
        <div className="text-lg font-bold text-yellow-400">
          СЧЁТ: {session.score}
        </div>
        <div className="text-sm text-gray-300">{levelName}</div>
        <div className="font-mono text-sm tabular-nums text-gray-400">
          {formatTime(session.timeElapsed)}
        </div>
      </div>
    </div>
  );
}
