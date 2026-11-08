import type { SerializedError } from './sanitize';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A napló egy bejegyzése. Minden bejegyzés ugyanígy néz ki, bárhonnan jön:
 * strukturált objektum, nem kézzel összerakott szöveg.
 */
export interface LogEntry {
  /** ISO 8601 időbélyeg (UTC), pl. „2026-11-08T15:04:05.123Z”. */
  timestamp: string;
  level: LogLevel;
  message: string;
  /** Melyik modulból jön, pl. „auth”, „games”, „navigation”. */
  source?: string;
  /** Kiegészítő adatok, már tisztítva (ld. sanitize.ts). */
  data?: Record<string, unknown>;
  /** A hiba neve, üzenete, kódja és stack trace-e, ha volt hiba. */
  error?: SerializedError;
}

/**
 * Kiegészítő adatok egy bejegyzéshez. Az „error” kulcs különleges: az ide tett hibát
 * (Error vagy bármi, amit elkaptunk) a logger a bejegyzés „error” mezőjébe bontja ki.
 */
export type LogMeta = Record<string, unknown> & { error?: unknown };

/**
 * Ahová a bejegyzések kerülnek. Alapból a konzol; később ide köthető pl. egy távoli
 * hibagyűjtő szolgáltatás anélkül, hogy a loggert használó kódhoz hozzá kellene nyúlni.
 */
export type LogTransport = (entry: LogEntry) => void;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}
