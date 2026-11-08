import { Platform } from 'react-native';

import { createLogger, wasLogged } from './logger';

/*
 * Az app egészére kiterjedő hibafigyelés: amit sehol nem kapott el a kód, az is a naplóba kerül.
 *  - web: a böngésző „error” (≈ window.onerror) és „unhandledrejection” eseményei;
 *  - Android/iOS: a React Native globális hibakezelője (ErrorUtils) és a Hermes motor
 *    kezeletlen Promise-elutasítás figyelője.
 * A már naplózott hibákat nem írjuk ki újra (ld. wasLogged), és a meglévő viselkedést
 * (pl. a fejlesztői piros képernyőt) nem vesszük el: az eredeti kezelőt is meghívjuk.
 */

const log = createLogger('global');

/** Egy kezeletlen hiba naplózása; soha nem dob, és egy hibát csak egyszer ír ki. */
export function reportUncaughtError(
  message: string,
  error: unknown,
  meta: Record<string, unknown> = {},
): void {
  try {
    if (wasLogged(error)) return;
    log.error(message, { ...meta, error });
  } catch {
    // A hibakezelő maga nem okozhat újabb hibát.
  }
}

interface WebErrorTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

/** Böngésző: kezeletlen hibák és Promise-elutasítások. Visszaadja a leiratkozó függvényt. */
export function installWebHandlers(target: WebErrorTarget): () => void {
  const onError = (event: Event) => {
    const e = event as ErrorEvent;
    reportUncaughtError('Kezeletlen hiba', e.error ?? e.message, {
      file: e.filename,
      line: e.lineno,
      column: e.colno,
    });
  };
  const onRejection = (event: Event) => {
    reportUncaughtError('Kezeletlen Promise-elutasítás', (event as PromiseRejectionEvent).reason);
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

export interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler | undefined;
  setGlobalHandler(handler: GlobalHandler): void;
}

export interface HermesLike {
  enablePromiseRejectionTracker?(options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }): void;
}

/** Android/iOS: a React Native globális hibakezelője és a Hermes Promise-figyelője. */
export function installNativeHandlers(
  errorUtils?: ErrorUtilsLike,
  hermes?: HermesLike,
): () => void {
  const previous = errorUtils?.getGlobalHandler();
  errorUtils?.setGlobalHandler((error, isFatal) => {
    reportUncaughtError(isFatal ? 'Végzetes kezeletlen hiba' : 'Kezeletlen hiba', error, {
      fatal: Boolean(isFatal),
    });
    previous?.(error, isFatal);
  });
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) =>
      reportUncaughtError('Kezeletlen Promise-elutasítás', rejection),
    onHandled: () => {},
  });
  return () => {
    if (previous) errorUtils?.setGlobalHandler(previous);
  };
}

let uninstall: (() => void) | null = null;

/** Egyszer, az app indulásakor hívjuk (services/bootstrap.ts). Többszöri hívás nem árt. */
export function installGlobalErrorHandlers(): void {
  if (uninstall) return;
  const scope = globalThis as unknown as {
    window?: WebErrorTarget;
    ErrorUtils?: ErrorUtilsLike;
    HermesInternal?: HermesLike;
  };
  if (Platform.OS === 'web') {
    if (scope.window) uninstall = installWebHandlers(scope.window);
  } else {
    uninstall = installNativeHandlers(scope.ErrorUtils, scope.HermesInternal);
  }
}
