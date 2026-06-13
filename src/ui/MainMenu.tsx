import { useState, useEffect } from 'react';
import { gameStateMachine } from '@/game/GameStateMachine';
import { initLevel } from '@/game/initLevel';
import { LEVEL_CONFIGS } from '@/config/LevelConfig';
import { useUIStore } from '@/store/uiStore';
import { StatsService } from '@/services/StatsService';

// ─── Level info derived per badge ─────────────────────────────────────────────

const LEVEL_STYLE: Record<number, { accent: string; stripe: string; tag: string }> = {
  0: { accent: '#d4a017', stripe: '#6b7c3a', tag: 'TR-01' },
  1: { accent: '#d47817', stripe: '#5a6b3a', tag: 'SC-02' },
  2: { accent: '#d44017', stripe: '#4a3a2a', tag: 'BA-03' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startLevel(levelIndex: number): void {
  const config = LEVEL_CONFIGS[levelIndex];
  if (!config) return;
  if (!StatsService.isLevelUnlocked(levelIndex)) return;

  gameStateMachine.transition('STARTING_LEVEL');
  useUIStore.getState().setGameState('STARTING_LEVEL');

  // Brief delay so the overlay shows before heavy init
  setTimeout(() => initLevel(config), 400);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DecorativeCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute w-24 h-24 border-amber-600/25 pointer-events-none';
  const borders: Record<string, string> = {
    tl: 'top-0 left-0 border-l border-t rounded-tl',
    tr: 'top-0 right-0 border-r border-t rounded-tr',
    bl: 'bottom-0 left-0 border-l border-b rounded-bl',
    br: 'bottom-0 right-0 border-r border-b rounded-br',
  };
  return <div className={`${base} ${borders[position]}`} />;
}

function TitleBar() {
  return (
    <div className="flex flex-col items-center">
      {/* Top decorative line */}
      <div className="mb-2 flex items-center gap-4">
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="h-1.5 w-1.5 rotate-45 bg-amber-500/60" />
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>

      {/* Title */}
      <h1
        className="select-none font-black tracking-[0.35em] text-5xl sm:text-6xl lg:text-7xl uppercase"
        style={{
          color: '#c5c9c8',
          textShadow:
            '0 0 40px rgba(212,160,23,0.25), 0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(212,160,23,0.4)',
        }}
      >
        ТАНКОВАЯ АРЕНА
      </h1>

      {/* Bottom decorative line */}
      <div className="mt-2 flex items-center gap-4">
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="flex gap-1.5">
          <div className="h-1 w-1 bg-amber-500/40" />
          <div className="h-1 w-1 bg-amber-500/60" />
          <div className="h-1 w-1 bg-amber-500/40" />
        </div>
        <div className="h-px w-20 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      </div>

      {/* Subtitle */}
      <p
        className="mt-3 select-none text-xs sm:text-sm tracking-[0.4em] uppercase"
        style={{ color: '#7a8a6a' }}
      >
        СИМУЛЯТОР ТАНКОВЫХ СРАЖЕНИЙ
      </p>
    </div>
  );
}

function LevelBadge({
  level,
  isSelected,
  onClick,
  index,
  delay,
  locked,
  stars,
}: {
  level: (typeof LEVEL_CONFIGS)[number];
  isSelected: boolean;
  onClick: () => void;
  index: number;
  delay: number;
  locked: boolean;
  stars: number;
}) {
  const style = LEVEL_STYLE[index] ?? LEVEL_STYLE[0];

  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`
        group relative flex flex-col items-center justify-center
        w-44 sm:w-52 lg:w-60 px-4 py-5
        transition-all duration-500 ease-out select-none
        ${locked ? 'cursor-not-allowed grayscale-[0.6] opacity-50' : 'cursor-pointer'}
        ${isSelected && !locked ? 'scale-105 z-10' : 'hover:scale-[1.03]'}
      `}
      style={{
        opacity: 0,
        animation: `fadeSlideUp 600ms ease-out ${delay}ms forwards`,
        transform: isSelected && !locked ? 'scale(1.05)' : undefined,
      }}
    >
      {/* Background plate */}
      <div
        className={`
          absolute inset-0 border transition-all duration-500
          ${isSelected && !locked ? 'border-amber-500/50 shadow-[0_0_20px_rgba(212,160,23,0.15)]' : 'border-gray-600/40'}
        `}
        style={{
          background: isSelected && !locked
            ? 'linear-gradient(180deg, rgba(30,35,28,0.95) 0%, rgba(20,25,18,0.95) 100%)'
            : 'linear-gradient(180deg, rgba(25,30,23,0.85) 0%, rgba(18,22,16,0.85) 100%)',
        }}
      />

      {/* Diagonal stripe accent */}
      <div
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${style.stripe}30 50%)`,
          opacity: isSelected && !locked ? 0.9 : 0.4,
        }}
      />

      {/* Lock overlay for locked levels */}
      {locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <svg className="h-8 w-8 text-gray-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center gap-1 ${locked ? 'opacity-40' : ''}`}>
        {/* Tactical tag */}
        <span
          className="text-[10px] font-mono tracking-[0.3em] uppercase"
          style={{ color: isSelected && !locked ? style.accent : '#5a6050' }}
        >
          {locked ? '🔒' : style.tag}
        </span>

        {/* Level number */}
        <span
          className="text-xl sm:text-2xl font-black leading-none transition-colors duration-500"
          style={{ color: isSelected && !locked ? '#d4c5a0' : '#7a7860' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Level name */}
        <span
          className="text-xs sm:text-sm font-semibold tracking-wider text-center leading-tight transition-colors duration-500"
          style={{ color: isSelected && !locked ? '#c5c9c8' : '#7a7a6a' }}
        >
          {locked ? '???' : level.name}
        </span>

        {/* Stars row (only if earned) */}
        {!locked && stars > 0 && (
          <div className="mt-0.5 flex items-center gap-0.5 text-xs text-yellow-400">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? 'opacity-100' : 'opacity-20'}>
                {i <= stars ? '★' : '☆'}
              </span>
            ))}
          </div>
        )}

        {/* Selected indicator bar */}
        <div
          className={`
            mt-1.5 h-0.5 transition-all duration-500
            ${isSelected && !locked ? 'opacity-100 w-12' : 'opacity-0 w-0'}
          `}
          style={{ background: `linear-gradient(90deg, transparent, ${style.accent}, transparent)` }}
        />
      </div>

      {/* Selected bottom highlight */}
      {isSelected && !locked && (
        <div
          className="absolute bottom-0 left-2 right-2 h-[1px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${style.accent}80, transparent)` }}
        />
      )}
    </button>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

const WEAPON_DESC: Record<string, { name: string; desc: string }> = {
  StandardCannon: { name: 'Стандартная пушка', desc: 'Урон 25 · 2 выстр/с · 30 патр' },
  HeavyCannon:    { name: 'Тяжёлая пушка',    desc: 'Урон 60 · 0.8 выстр/с · 12 патр · осколки' },
  RapidFire:      { name: 'Скорострельная',   desc: 'Урон 6 · 3 выстр/с · 80 патр' },
};

const PICKUP_DESC: Record<string, { name: string; desc: string; color: string }> = {
  Health:    { name: 'Аптечка',      desc: '+40 к броне',        color: '#44ff44' },
  Shield:    { name: 'Щит',          desc: '5 с неуязвимости',   color: '#4488ff' },
  Ammo:      { name: 'Боезапас',     desc: 'Полная перезарядка', color: '#ffdd44' },
  SpeedBoost:{ name: 'Ускорение',    desc: '8 с ускорения',      color: '#ff44ff' },
  RapidFire: { name: 'Скорострельн.', desc: '10 с скоростр.',    color: '#44ffff' },
};

const CONTROLS_LIST = [
  { key: 'W / ↑',      action: 'Движение вперёд' },
  { key: 'S / ↓',      action: 'Движение назад' },
  { key: 'A',          action: 'Поворот направо' },
  { key: 'D',          action: 'Поворот налево' },
  { key: 'Space / ЛКМ', action: 'Стрельба' },
  { key: 'Shift',      action: 'Щит' },
  { key: 'Esc',        action: 'Пауза' },
];

function InfoPanel({ onClose }: { readonly onClose: () => void }) {
  const [tab, setTab] = useState<'controls' | 'weapons' | 'pickups'>('controls');
  const tabStyle = (t: typeof tab) =>
    `px-4 py-1.5 text-xs tracking-wider uppercase transition-colors duration-300 ${
      tab === t
        ? 'bg-amber-500/20 text-amber-300 border-b border-amber-500'
        : 'text-gray-500 hover:text-gray-300'
    }`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-[500px] max-h-[80vh] overflow-y-auto border border-amber-600/30"
        style={{
          background: 'linear-gradient(180deg, rgba(15,18,13,0.98) 0%, rgba(10,14,10,0.98) 100%)',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(212,160,23,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-600/20 px-5 py-3">
          <span className="text-sm tracking-[0.3em] uppercase text-amber-500/60">Справка</span>
          <button onClick={onClose} className="text-gray-500 hover:text-amber-400 transition-colors text-lg leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button className={tabStyle('controls')} onClick={() => setTab('controls')}>Управление</button>
          <button className={tabStyle('weapons')} onClick={() => setTab('weapons')}>Вооружение</button>
          <button className={tabStyle('pickups')} onClick={() => setTab('pickups')}>Бонусы</button>
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === 'controls' && (
            <div className="space-y-2">
              {CONTROLS_LIST.map((c) => (
                <div key={c.key} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
                  <span className="font-mono text-xs tracking-wider text-amber-400/80">{c.key}</span>
                  <span className="text-sm text-gray-300">{c.action}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'weapons' && (
            <div className="space-y-3">
              {Object.values(WEAPON_DESC).map((w) => (
                <div key={w.name} className="border border-gray-800/60 p-3">
                  <div className="text-sm font-semibold text-amber-300/90">{w.name}</div>
                  <div className="mt-1 text-xs text-gray-400">{w.desc}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'pickups' && (
            <div className="space-y-3">
              {Object.values(PICKUP_DESC).map((p) => (
                <div key={p.name} className="flex items-center gap-3 border border-gray-800/60 p-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: p.color }} />
                  <div>
                    <div className="text-sm font-semibold text-gray-200">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MainMenu() {
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      {/* ═══ Background layers ════════════════════════════════════════════════ */}

      {/* Dark overlay gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, rgba(10,13,10,0.94) 0%, rgba(15,20,14,0.90) 40%, rgba(8,12,8,0.94) 100%)
          `,
        }}
      />

      {/* Tactical grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.012) 4px, rgba(255,255,255,0.012) 5px),
            repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.012) 4px, rgba(255,255,255,0.012) 5px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Subtle scan lines (horizontal) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.025) 3px,
              rgba(0,0,0,0.025) 4px
            )
          `,
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* ═══ Decorative corners ═══════════════════════════════════════════════ */}

      <DecorativeCorner position="tl" />
      <DecorativeCorner position="tr" />
      <DecorativeCorner position="bl" />
      <DecorativeCorner position="br" />

      {/* ═══ Content ══════════════════════════════════════════════════════════ */}

      <div
        className={`
          relative z-10 flex flex-col items-center gap-10 px-4 sm:gap-12 lg:gap-14
          transition-all duration-1000 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        `}
      >
        {/* Title section */}
        <TitleBar />

        {/* Level selection */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6">
          {LEVEL_CONFIGS.map((level, i) => {
            const unlocked = StatsService.isLevelUnlocked(level.index);
            const stats = StatsService.load();
            const stars = stats.levelStars[level.index] ?? 0;
            return (
              <LevelBadge
                key={level.index}
                level={level}
                isSelected={selectedLevel === level.index}
                onClick={() => unlocked && setSelectedLevel(level.index)}
                index={level.index}
                delay={300 + i * 120}
                locked={!unlocked}
                stars={stars}
              />
            );
          })}
        </div>

        {/* Start Game CTA */}
        <button
          onClick={() => startLevel(selectedLevel)}
          className={`
            group relative select-none
            px-10 py-3.5 sm:px-14 sm:py-4
            text-base sm:text-lg font-black tracking-[0.2em] uppercase
            transition-all duration-500 ease-out
            active:scale-95
          `}
          style={{
            color: '#0d0f0a',
            background: 'linear-gradient(180deg, #d4a017 0%, #b8860b 100%)',
            border: '1px solid rgba(212,160,23,0.6)',
            boxShadow: '0 0 30px rgba(212,160,23,0.2), 0 4px 12px rgba(0,0,0,0.5)',
            opacity: mounted ? 1 : 0,
            animation: mounted ? `fadeSlideUp 600ms ease-out 660ms forwards` : 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(180deg, #e6b422 0%, #c8960c 100%)';
            e.currentTarget.style.boxShadow =
              '0 0 45px rgba(212,160,23,0.4), 0 6px 18px rgba(0,0,0,0.5)';
            e.currentTarget.style.transform = 'scale(1.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(180deg, #d4a017 0%, #b8860b 100%)';
            e.currentTarget.style.boxShadow =
              '0 0 30px rgba(212,160,23,0.2), 0 4px 12px rgba(0,0,0,0.5)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Button inner glow line */}
          <span
            className="absolute inset-x-4 top-0 h-px pointer-events-none opacity-60"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            }}
          />

          {/* Chevron decoration */}
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg sm:text-xl opacity-80 transition-transform duration-300 group-hover:-translate-x-1">
              {'\u25B6'}
            </span>
            <span>В БОЙ</span>
            <span className="text-lg sm:text-xl opacity-80 transition-transform duration-300 group-hover:translate-x-1">
              {'\u25C0'}
            </span>
          </span>
        </button>

        {/* Footer hint + stats + info button */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center gap-4 text-[10px] sm:text-xs tracking-[0.2em] uppercase select-none"
            style={{ color: '#4a5040', opacity: mounted ? 0.6 : 0 }}
          >
            <span>УБИТО: {StatsService.load().totalKills}</span>
            <span className="text-gray-600">|</span>
            <span>СЫГРАНО: {StatsService.load().totalGamesPlayed}</span>
            <span className="text-gray-600">|</span>
            <span>АЧИВОК: {StatsService.earnedCount()}</span>
          </div>
          <div className="flex items-center gap-4">
            <p
              className="text-[10px] sm:text-xs tracking-[0.25em] uppercase select-none"
              style={{ color: '#4a5040', opacity: mounted ? 0.6 : 0 }}
            >
              ВЫБЕРИТЕ МИССИЮ {'\u00B7'} В БОЙ
            </p>
            <button
              onClick={() => setShowInfo(true)}
              className="text-[10px] px-2.5 py-0.5 tracking-[0.15em] uppercase border border-amber-500/50 text-amber-400/90 hover:text-amber-300 hover:border-amber-400/80 hover:bg-amber-900/20 transition-all duration-300 select-none rounded-sm"
              style={{
                opacity: mounted ? 0.85 : 0,
                textShadow: '0 0 6px rgba(212,160,23,0.3)',
              }}
            >
              [?]
            </button>
          </div>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}

      {/* ═══ Keyframe animations (injected via style tag) ══════════════════════ */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
