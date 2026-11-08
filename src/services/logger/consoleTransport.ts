/* eslint-disable no-console -- ez az egyetlen hely, ahol a konzolra írunk: minden más a loggeren megy át. */
import type { LogEntry, LogTransport } from './types';

/**
 * A bejegyzéseket a konzolra írja (böngésző fejlesztői eszközei, Metro terminál, Android logcat).
 *  - pretty: „12:00:01.123 INFO [auth] Bejelentkezett felhasználó” + az adatok objektumként,
 *    így a fejlesztői eszközökben kibonthatók;
 *  - json: a teljes bejegyzés egyetlen JSON-sorként (éles build, gépi feldolgozáshoz).
 * A konzol metódusát minden íráskor olvassuk ki, így a tesztek le tudják cserélni.
 */
export function createConsoleTransport(format: 'pretty' | 'json'): LogTransport {
  return (entry: LogEntry) => {
    const method = console[entry.level] ?? console.log;
    if (format === 'json') {
      method.call(console, JSON.stringify(entry));
      return;
    }
    const time = entry.timestamp.slice(11, 23);
    const source = entry.source ? ` [${entry.source}]` : '';
    const details: unknown[] = [];
    if (entry.data) details.push(entry.data);
    if (entry.error) details.push(entry.error);
    method.call(
      console,
      `${time} ${entry.level.toUpperCase()}${source} ${entry.message}`,
      ...details,
    );
  };
}
