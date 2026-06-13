// ─── Logger Interface ────────────────────────────────────────────────────────

export interface ILogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// ─── Dev Logger ──────────────────────────────────────────────────────────────

export class DevLogger implements ILogger {
  private readonly prefix: string;

  constructor(prefix: string = 'Game') {
    this.prefix = prefix;
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[${this.prefix}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.prefix}] ${message}`, ...args);
  }
}

// ─── Production Logger ───────────────────────────────────────────────────────

export class ProductionLogger implements ILogger {
  info(_message: string, ..._args: unknown[]): void {
    // silent in production
  }

  warn(_message: string, ..._args: unknown[]): void {
    // silent in production
  }

  error(message: string, ...args: unknown[]): void {
    // only errors in production
    console.error(message, ...args);
  }

  debug(_message: string, ..._args: unknown[]): void {
    // silent in production
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

const isDev = import.meta.env?.DEV ?? false;

export function createLogger(prefix: string): ILogger {
  return isDev ? new DevLogger(prefix) : new ProductionLogger();
}

export const logger = createLogger('Root');
