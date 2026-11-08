/**
 * Központi naplózás. Az app minden része ezen keresztül naplóz, közvetlen console.* hívás
 * helyett (ezt az ESLint „no-console” szabálya is ellenőrzi).
 *
 *   import { createLogger } from '@/services/logger';
 *   const log = createLogger('games');
 *   log.warn('Az eredmény küldése nem sikerült', { game, error });
 *
 * Részletek és szabályok: README, „Naplózás” rész.
 *
 * A globális hibakezelők (globalErrorHandlers.ts) szándékosan nincsenek innen exportálva:
 * azok React Native-függők, a logger maga viszont platformfüggetlen (Node-ban is fut).
 */
export {
  configureLogger,
  createLogger,
  getLogLevel,
  isLevelEnabled,
  logger,
  wasLogged,
  type LoggerConfig,
} from './logger';
export { createConsoleTransport } from './consoleTransport';
export type { LogEntry, LogLevel, LogMeta, LogTransport, Logger } from './types';
