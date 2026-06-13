// ─── Upgrade Screen ───────────────────────────────────────────────────────────
// Between-level screen where the player spends total score on permanent upgrades.

import { useState } from 'react';
import { UPGRADES } from '@/config/UpgradeConfig';
import { StatsService } from '@/services/StatsService';
import type { PersistentStats } from '@/services/StatsService';

interface UpgradeScreenProps {
  readonly onContinue: () => void;
}

function UpgradeCard({
  def,
  currentLevel,
  stats,
  onBuy,
}: {
  def: (typeof UPGRADES)[number];
  currentLevel: number;
  stats: PersistentStats;
  onBuy: (id: string, cost: number) => void;
}) {
  const maxed = currentLevel >= def.maxLevel;
  const nextCost = !maxed ? def.costs[currentLevel] : null;
  const canAfford = nextCost !== null && stats.totalScore >= nextCost;

  return (
    <div
      className="flex items-center gap-4 rounded-lg border p-4 transition-all duration-300"
      style={{
        borderColor: maxed ? 'rgba(74, 222, 128, 0.3)' : 'rgba(75, 85, 99, 0.4)',
        background: maxed
          ? 'linear-gradient(135deg, rgba(20,35,20,0.9), rgba(15,25,15,0.9))'
          : 'linear-gradient(135deg, rgba(25,30,23,0.85), rgba(18,22,16,0.85))',
      }}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-2xl">
        {def.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-100">{def.title}</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {currentLevel}/{def.maxLevel}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">{def.description}</p>

        {/* Level dots */}
        <div className="mt-1.5 flex gap-1">
          {Array.from({ length: def.maxLevel }, (_, i) => (
            <div
              key={i}
              className="h-1.5 w-4 rounded-full transition-colors duration-300"
              style={{
                background: i < currentLevel ? '#d4a017' : 'rgba(75, 85, 99, 0.5)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Buy button */}
      <div className="flex flex-col items-end gap-1">
        {maxed ? (
          <span className="text-xs font-semibold text-green-400 uppercase">MAX</span>
        ) : (
          <>
            <span className="text-xs text-gray-500 tabular-nums">
              {nextCost} очк.
            </span>
            <button
              onClick={() => onBuy(def.id, nextCost!)}
              disabled={!canAfford}
              className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                canAfford
                  ? 'bg-amber-600 text-black hover:bg-amber-500'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              +{currentLevel + 1}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function UpgradeScreen({ onContinue }: UpgradeScreenProps) {
  const [stats, setStats] = useState(() => StatsService.load());

  const handleBuy = (id: string, cost: number) => {
    const success = StatsService.deductScore(cost);
    if (!success) return;

    const currentLevel = StatsService.getUpgradeLevel(id);
    StatsService.setUpgradeLevel(id, currentLevel + 1);
    setStats({ ...StatsService.load() });
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center bg-black/90 text-white">
      <div className="flex w-full max-w-lg flex-1 flex-col px-6 py-8">
        {/* Header */}
        <div className="mb-2 text-center">
          <h2 className="text-2xl font-bold tracking-wider text-amber-400 uppercase">
            Мастерская
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Улучшения применяются ко всем последующим миссиям
          </p>
        </div>

        {/* Score */}
        <div className="mb-6 rounded border border-amber-600/20 px-4 py-2 text-center">
          <span className="text-xs tracking-wider text-gray-500 uppercase">
            Доступно очков
          </span>
          <div className="text-2xl font-bold text-yellow-400">
            {stats.totalScore}
          </div>
        </div>

        {/* Upgrade list */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {UPGRADES.map((def) => (
            <UpgradeCard
              key={def.id}
              def={def}
              currentLevel={stats.upgrades[def.id] ?? 0}
              stats={stats}
              onBuy={handleBuy}
            />
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="mt-6 rounded-lg bg-green-600 px-10 py-3 text-lg font-bold tracking-wider uppercase transition-colors hover:bg-green-500"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
