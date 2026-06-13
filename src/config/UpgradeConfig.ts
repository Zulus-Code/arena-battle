// ─── Upgrade Configuration ─────────────────────────────────────────────────────
// Upgrade definitions for the between-levels shop.
// Each upgrade has a max level and scaling cost.

export interface UpgradeDef {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly maxLevel: number;
  readonly costs: readonly number[];       // cost for each level (index 0 = level 1 cost)
  readonly appliesTo: 'player' | 'weapon';
  readonly apply: (currentValue: number, level: number) => number;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'max_hp',
    title: 'Броня',
    description: '+50 к макс. здоровью',
    icon: '🛡️',
    maxLevel: 3,
    costs: [1000, 2500, 5000],
    appliesTo: 'player',
    apply: (_base, level) => 150 + level * 50,
  },
  {
    id: 'speed',
    title: 'Двигатель',
    description: '+1.5 к скорости',
    icon: '⚡',
    maxLevel: 2,
    costs: [2000, 4000],
    appliesTo: 'player',
    apply: (_base, level) => 10 + level * 1.5,
  },
  {
    id: 'damage',
    title: 'Калибр',
    description: '+15% к урону',
    icon: '💥',
    maxLevel: 3,
    costs: [1500, 3500, 6000],
    appliesTo: 'weapon',
    apply: (base, level) => Math.round(base * (1 + level * 0.15)),
  },
  {
    id: 'max_ammo',
    title: 'Боекомплект',
    description: '+10 к макс. патронам',
    icon: '📦',
    maxLevel: 2,
    costs: [1000, 3000],
    appliesTo: 'weapon',
    apply: (base, level) => base + level * 10,
  },
];
