import { env, type LogLevelSetting } from '@/config/env';

import { createConsoleTransport } from './consoleTransport';
import { maskEmails, sanitizeRecord, serializeError } from './sanitize';
import type { LogEntry, LogLevel, LogMeta, LogTransport, Logger } from './types';

/*
 * A központi logger. Szándékosan nincs külső könyvtár mögötte: a konzol mindhárom platformon
 * (web, Android, iOS) elérhető, és amire nekünk szükség van (szintek, egységes formátum,
 * adattisztítás, cserélhető kimenet), az néhány tucat sor.
 */

const SEVERITY: Record<LogLevelSetting, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export interface LoggerConfig {
  level: LogLevelSetting;
  transports: LogTransport[];
}

/** Az egyetlen, közös beállítás. Alapértéke a .env-ből jön (ld. config/env.ts). */
const config: LoggerConfig = {
  level: env.log.level,
  transports: [createConsoleTransport(env.log.format)],
};

/**
 * A beállítás módosítása (pl. tesztben, vagy egy új kimenet bekötésekor).
 * A korábbi beállítást adja vissza, hogy vissza lehessen állítani.
 */
export function configureLogger(changes: Partial<LoggerConfig>): LoggerConfig {
  const previous = { level: config.level, transports: [...config.transports] };
  if (changes.level) config.level = changes.level;
  if (changes.transports) config.transports = [...changes.transports];
  return previous;
}

export function getLogLevel(): LogLevelSetting {
  return config.level;
}

export function isLevelEnabled(level: LogLevel): boolean {
  return SEVERITY[level] >= SEVERITY[config.level];
}

/**
 * A már naplózott hibák. Így a globális hibakezelők és az ErrorBoundary nem írják ki újra
 * ugyanazt a hibát, ha az egyszer már bekerült a naplóba (pl. egy rétegben naplózták, majd
 * továbbdobták). WeakSet: nem tartja életben a hibaobjektumokat.
 */
const loggedErrors = new WeakSet<object>();

export function wasLogged(error: unknown): boolean {
  return typeof error === 'object' && error !== null && loggedErrors.has(error);
}

function buildEntry(level: LogLevel, message: string, source?: string, meta?: LogMeta): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: maskEmails(String(message)),
  };
  if (source) entry.source = source;
  if (meta && typeof meta === 'object') {
    const { error, ...rest } = meta;
    const data = sanitizeRecord(rest);
    if (Object.keys(data).length > 0) entry.data = data;
    if (error !== undefined) {
      entry.error = serializeError(error);
      if (typeof error === 'object' && error !== null) loggedErrors.add(error);
    }
  }
  return entry;
}

function write(level: LogLevel, message: string, source?: string, meta?: LogMeta): void {
  // A naplózás hibája soha nem állíthatja meg az appot: minden lépést elnyelünk.
  try {
    if (!isLevelEnabled(level)) return;
    const entry = buildEntry(level, message, source, meta);
    for (const transport of config.transports) {
      try {
        transport(entry);
      } catch {
        // Egy hibás kimenet ne akadályozza a többit.
      }
    }
  } catch {
    // Ide csak akkor jutunk, ha maga a bejegyzés összeállítása is elszállt.
  }
}

/**
 * Logger egy adott modulhoz: a forrás neve minden bejegyzésébe bekerül.
 *
 *   const log = createLogger('auth');
 *   log.info('Bejelentkezett felhasználó', { uid });
 *   log.error('A szinkronizálás nem sikerült', { error });
 */
export function createLogger(source?: string): Logger {
  return {
    debug: (message, meta) => write('debug', message, source, meta),
    info: (message, meta) => write('info', message, source, meta),
    warn: (message, meta) => write('warn', message, source, meta),
    error: (message, meta) => write('error', message, source, meta),
  };
}

/** Az általános, forrás nélküli logger. Modulokban inkább a createLogger('modul') ajánlott. */
export const logger: Logger = createLogger();
