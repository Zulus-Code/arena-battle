// ─── Scheduler ────────────────────────────────────────────────────────────────
// Centralized timer system. Replaces scattered setTimeout/setInterval calls.
// Must be ticked every frame via scheduler.tick(dt).

export interface ScheduledTask {
  readonly id: string;
  readonly callback: () => void;
  remaining: number;
  readonly repeat: boolean;
  readonly interval: number;
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private nextId = 0;

  /** Schedule a one-shot callback after `delay` seconds */
  delay(callback: () => void, delay: number): string {
    const id = `task_${this.nextId++}`;
    this.tasks.set(id, {
      id,
      callback,
      remaining: delay,
      repeat: false,
      interval: delay,
    });
    return id;
  }

  /** Schedule a repeating callback every `interval` seconds */
  repeat(callback: () => void, interval: number): string {
    const id = `task_${this.nextId++}`;
    this.tasks.set(id, {
      id,
      callback,
      remaining: interval,
      repeat: true,
      interval,
    });
    return id;
  }

  /** Cancel a scheduled task by id */
  cancel(id: string): void {
    this.tasks.delete(id);
  }

  /** Must be called every fixed update with delta time in seconds */
  tick(dt: number): void {
    // Iterate over snapshot to avoid issues if callbacks add/remove tasks
    const toRemove: string[] = [];
    for (const task of this.tasks.values()) {
      task.remaining -= dt;
      if (task.remaining <= 0) {
        task.callback();
        if (task.repeat) {
          task.remaining = task.interval + task.remaining;
        } else {
          toRemove.push(task.id);
        }
      }
    }
    for (const id of toRemove) {
      this.tasks.delete(id);
    }
  }

  clear(): void {
    this.tasks.clear();
  }
}

export const scheduler = new Scheduler();
