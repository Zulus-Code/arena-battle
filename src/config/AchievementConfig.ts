// ─── Achievement Configuration ────────────────────────────────────────────────
// Declarative achievement definitions. Add new achievements here.
// Conditions are evaluated by AchievementSystem on level completion/game over.

export interface AchievementDef {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly secret?: boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ─── Combat ────────────────────────────────────────────────────────────────
  {
    id: 'first_kill',
    title: 'Первая кровь',
    description: 'Уничтожьте первого врага',
    icon: '💀',
  },
  {
    id: 'massacre',
    title: 'Бойня',
    description: 'Уничтожьте всех врагов на уровне',
    icon: '☠️',
  },
  {
    id: 'tank_hunter',
    title: 'Охотник на танки',
    description: 'Уничтожьте 10 Tank-ов за всё время',
    icon: '🎯',
  },
  {
    id: 'boss_slayer',
    title: 'Убийца боссов',
    description: 'Уничтожьте босса',
    icon: '👑',
  },
  {
    id: 'splash_double',
    title: 'Двойная угроза',
    description: 'Уничтожьте 2+ врагов одним взрывом',
    icon: '💥',
  },

  // ─── Accuracy ──────────────────────────────────────────────────────────────
  {
    id: 'sharp_shooter',
    title: 'Меткий стрелок',
    description: 'Достигните 80% точности за уровень',
    icon: '🎖️',
  },
  {
    id: 'dead_eye',
    title: 'Глаз-алмаз',
    description: 'Достигните 95% точности за уровень',
    icon: '🏅',
  },

  // ─── Survival ──────────────────────────────────────────────────────────────
  {
    id: 'clean_hands',
    title: 'Безупречный',
    description: 'Пройдите уровень без единого попадания по вам',
    icon: '🛡️',
  },
  {
    id: 'indestructible',
    title: 'Неуязвимый',
    description: 'Пройдите уровень, ни разу не потеряв HP',
    icon: '🧱',
  },

  // ─── Stars ─────────────────────────────────────────────────────────────────
  {
    id: 'gold_rush',
    title: 'Золотая лихорадка',
    description: 'Получите золото на любом уровне',
    icon: '⭐',
  },
  {
    id: 'perfectionist',
    title: 'Перфекционист',
    description: 'Получите золото на всех уровнях',
    icon: '🏆',
  },

  // ─── Collection ────────────────────────────────────────────────────────────
  {
    id: 'pack_rat',
    title: 'Жадина',
    description: 'Соберите все пикапы на уровне за одно прохождение',
    icon: '📦',
  },

  // ─── Playtime ──────────────────────────────────────────────────────────────
  {
    id: 'dedicated',
    title: 'Преданный делу',
    description: 'Сыграйте 5 уровней',
    icon: '🔥',
  },
  {
    id: 'veteran',
    title: 'Ветеран',
    description: 'Сыграйте 10 уровней',
    icon: '⚔️',
  },
  {
    id: 'tour_of_duty',
    title: 'Тур службы',
    description: 'Пройдите все уровни',
    icon: '🎖️',
  },
];
