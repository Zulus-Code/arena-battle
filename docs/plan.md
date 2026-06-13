# Senior Architecture Requirements

Проект должен разрабатываться по принципам профессиональной разработки игровых систем.

Приоритет:

1. Читаемость.
2. Расширяемость.
3. Производительность.
4. Простота поддержки.
5. Красивый код.

Не пытаться минимизировать количество файлов.

Предпочитать маленькие модули.

---

# Разделение ответственности

Строго разделять:

* игровую логику;
* физику;
* рендеринг;
* UI;
* звук;
* эффекты;
* хранение состояния.

Изменения визуальной части не должны требовать изменения игровой логики.

---

# Rendering должен быть независим

Three.js и React Three Fiber являются исключительно слоем отображения.

Рендеринг не должен содержать:

* игровую логику;
* расчеты урона;
* AI;
* генерацию уровней;
* обработку победы и поражения.

---

# Zustand не является игровой логикой

Zustand используется только для:

* состояния UI;
* состояния игры;
* настроек;
* отладочных данных.

Не хранить внутри Zustand:

* физические объекты;
* Rapier rigid bodies;
* ссылки на meshes;
* игровую логику.

---

# Domain Layer

Создать отдельный слой domain.

domain/

entities/

systems/

events/

types/

rules/

Игровая логика должна жить именно здесь.

---

# DDD подход

Использовать Domain Driven Design.

Основные доменные сущности:

Player

Enemy

Weapon

Projectile

Pickup

Arena

Level

GameSession

Boss

Shield

Health

Damage

Explosion

Все правила игры должны описываться доменной моделью.

---

# Event Bus

Создать централизованную систему событий.

events/

EventBus.ts

GameEvents.ts

События:

EnemyKilled

PlayerDamaged

PlayerKilled

WeaponChanged

ProjectileHit

PickupCollected

ShieldActivated

LevelCompleted

GameOver

BossSpawned

ExplosionCreated

Системы должны взаимодействовать через события.

Избегать прямой связанности.

---

# State Machine

Создать конечный автомат состояний.

game/

GameStateMachine.ts

Возможные состояния:

BOOT

MENU

STARTING_LEVEL

PLAYING

PAUSED

LEVEL_COMPLETE

GAME_OVER

VICTORY

Переходы должны быть явными.

Не использовать множество boolean-флагов.

---

# AI State Machine

Каждый бот должен иметь состояние.

IDLE

SEARCH

CHASE

ATTACK

RETREAT

RAM

PICKUP

DEAD

Поведение бота определяется состоянием.

Избегать больших if-else.

---

# Composition вместо наследования

Предпочитать композицию.

Избегать глубоких цепочек наследования.

Наследование использовать только там, где оно действительно оправдано.

---

# Config Driven Design

Максимум логики должен задаваться конфигурациями.

Изменение баланса игры не должно требовать изменения кода.

Все параметры должны храниться в config.

---

# Dependency Injection

Системы не должны создавать зависимости самостоятельно.

Передавать зависимости извне.

Избегать singleton, кроме EventBus и AudioManager.

---

# Command Pattern

Создать систему команд.

commands/

ShootCommand

MoveCommand

RotateCommand

RamCommand

PickupCommand

Commands должны быть независимыми от устройств ввода.

---

# Input Layer

Создать отдельный слой ввода.

input/

KeyboardInput

MouseInput

InputMapper

В будущем должна быть возможность легко добавить:

* геймпад;
* AI;
* мультиплеер;
* запись реплеев.

Игровая логика не должна знать об устройствах ввода.

---

# Replay Ready

Архитектура должна позволять в будущем реализовать:

* запись матча;
* воспроизведение;
* spectator mode.

Не требуется реализовывать сейчас.

Только подготовить архитектуру.

---

# Deterministic Friendly

Избегать использования Math.random() напрямую.

Создать:

RandomService.ts

Использовать seed.

Это позволит:

* воспроизводить уровни;
* реализовать реплеи;
* проводить отладку.

---

# Services

services/

RandomService

DamageService

CollisionService

SpawnService

TargetService

LevelService

WeaponService

PickupService

ExplosionService

Services должны содержать бизнес-логику.

---

# Game Systems

systems/

MovementSystem

CombatSystem

DamageSystem

ProjectileSystem

PickupSystem

ShieldSystem

ExplosionSystem

EnemySystem

LevelSystem

VictorySystem

Systems должны быть независимыми.

Связь между ними осуществляется через EventBus.

---

# Scheduler

Создать Scheduler.

Позволяет выполнять:

* delayed actions;
* cooldown;
* timers;
* spawn events.

Не использовать множество setTimeout.

---

# Fixed Update

Игровая логика должна обновляться через fixed timestep.

60 Hz.

Рендеринг работает независимо.

Не привязывать игровую логику к FPS.

---

# Physics Layer

physics/

PhysicsWorld

CollisionGroups

PhysicsHelpers

Rapier должен быть изолирован.

Остальной код не должен зависеть от конкретного физического движка.

В будущем должна существовать возможность заменить Rapier.

---

# Object References

Минимизировать хранение прямых ссылок между объектами.

Предпочитать:

id

uuid

event-driven взаимодействие.

---

# Error Handling

Создать:

Logger.ts

DevLogger.ts

ProductionLogger.ts

Избегать console.log по всему проекту.

---

# Debug Mode

Создать DebugOverlay.

Показывать:

FPS

draw calls

enemy count

active projectiles

memory usage

physics bodies

DebugOverlay должен быть отключен в production.

---

# Performance Targets

Цель:

60 FPS при:

20 врагах;

100 активных снарядах;

30 колоннах;

частицах;

взрывах;

следах шин.

Ориентироваться на средний ПК.

Не использовать тяжелые шейдеры.

---

# Code Quality

TypeScript strict mode обязателен.

ESLint обязателен.

Prettier обязателен.

Избегать any.

Предпочитать readonly.

Использовать discriminated unions.

Использовать Result pattern для обработки ошибок.

---

# File Size

Желательный размер:

до 300 строк.

Если файл превышает 400 строк, рассмотреть декомпозицию.

---

# Главный принцип

Никогда не жертвовать архитектурой ради скорости написания.

Никогда не переписывать большие части проекта без необходимости.

Не создавать монолитных компонентов.

После добавления:

* 20 видов оружия;
* 10 типов врагов;
* 5 боссов;
* 15 бонусов;

проект должен оставаться понятным, масштабируемым и легко поддерживаемым.

