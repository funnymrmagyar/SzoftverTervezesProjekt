/*
 * Az app környezetfüggő beállításai, egy helyen. Az értékek a .env / .env.local fájlból
 * jönnek (minta: .env.example); ha nincs megadva semmi, az alapértékekkel helyi módban fut az app.
 *
 * Fontos:
 *  - Az EXPO_PUBLIC_ változókat a Metro fordításkor beírja a kódba, ezért mindig teljes
 *    névvel, „process.env.EXPO_PUBLIC_…” alakban hivatkozzunk rájuk. Destrukturálva
 *    (const { X } = process.env) vagy process.env[név] alakban az appban undefined lesz.
 *  - Ezek az értékek bekerülnek az appba, bárki kiolvashatja őket: titok nem kerülhet ide.
 *  - A .env módosítása után újra kell indítani a Metrót: npx expo start --clear
 *  - Ez a fájl csak a process.env-et olvassa (nincs Expo- vagy React Native-függése),
 *    így a Node-ban futó integrációs tesztek is használhatják.
 */

/** A demo (hálózat nélküli) Firebase-projekt. A .firebaserc-ben is ez szerepel. */
export const DEMO_PROJECT_ID = 'demo-csillagnezo';

/** Az emulátor bármilyen kulcsot elfogad; valódi projekthez a .env.local-ban kell megadni. */
export const DEMO_API_KEY = 'demo-api-key';

/** Az Auth emulátor alapértelmezett portja. Egyezzen a firebase.json „emulators.auth.port” értékével. */
export const DEFAULT_AUTH_EMULATOR_PORT = 9099;

/** Ezen a gépen keressük az emulátort, ha másképp nem derül ki a fejlesztői gép címe. */
export const DEFAULT_EMULATOR_HOST = '127.0.0.1';

/** A naplózás szintjei, a legrészletesebbtől; „silent” = semmit nem naplóz. */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
export type LogLevelSetting = (typeof LOG_LEVELS)[number];

export interface LogConfig {
  /** Az ennél alacsonyabb szintű bejegyzések nem jelennek meg. */
  level: LogLevelSetting;
  /** pretty = olvasható sor fejlesztéshez, json = egy JSON-objektum soronként (éles). */
  format: 'pretty' | 'json';
}

/** Hibás beállítás a .env-ben. Az app indulásakor a logger írja ki (ld. services/bootstrap.ts). */
export interface ConfigWarning {
  message: string;
  meta: Record<string, unknown>;
}

const warnings: ConfigWarning[] = [];

/**
 * A beolvasás közben talált hibás értékek. Itt még nem naplózhatunk, mert a logger is ebből
 * a fájlból olvassa a beállításait; ezért gyűjtjük őket, és induláskor írjuk ki.
 */
export const configWarnings: readonly ConfigWarning[] = warnings;

export interface AppEnv {
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  emulator: {
    /** EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true */
    enabled: boolean;
    /** A gép címe, amin az emulátor fut; ha nincs megadva, a Firebase-config kitalálja. */
    host?: string;
    authPort: number;
    firestorePort?: number;
  };
  log: LogConfig;
}

/** Üres vagy csak szóközből álló érték → undefined (a .env.example üres sorai így nem számítanak). */
export function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Port beolvasása; hiányzó vagy érvénytelen értéknél az alapérték. */
export function parsePort(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const port = Number(trimmed);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    warnings.push({ message: 'Érvénytelen port a .env-ben', meta: { value, fallback } });
    return fallback;
  }
  return port;
}

export function parseOptionalPort(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const port = Number(trimmed);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    warnings.push({ message: 'Érvénytelen Firestore-emulátor port a .env-ben', meta: { value } });
    return undefined;
  }
  return port;
}

/**
 * A naplózás beállítása a környezetből:
 *  - fejlesztés (npx expo start): minden szint, olvasható formában;
 *  - éles build (NODE_ENV=production): csak warn és error, JSON-ban;
 *  - tesztek (NODE_ENV=test): csend, hogy ne szemetelje a teszt kimenetét.
 * Az EXPO_PUBLIC_LOG_LEVEL bármelyik környezetben felülírja a szintet.
 */
export function resolveLogConfig(
  nodeEnv: string | undefined,
  levelSetting: string | undefined,
): LogConfig {
  const production = nodeEnv === 'production';
  const defaultLevel: LogLevelSetting = production
    ? 'warn'
    : nodeEnv === 'test'
      ? 'silent'
      : 'debug';
  const requested = optionalText(levelSetting)?.toLowerCase();
  let level: LogLevelSetting = defaultLevel;
  if (requested) {
    if ((LOG_LEVELS as readonly string[]).includes(requested)) {
      level = requested as LogLevelSetting;
    } else {
      warnings.push({
        message: 'Érvénytelen naplózási szint a .env-ben',
        meta: { value: levelSetting, allowed: LOG_LEVELS.join(', '), fallback: defaultLevel },
      });
    }
  }
  return { level, format: production ? 'json' : 'pretty' };
}

export const env: AppEnv = {
  firebase: {
    apiKey: optionalText(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: optionalText(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: optionalText(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: optionalText(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: optionalText(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: optionalText(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  },
  emulator: {
    enabled: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR?.trim() === 'true',
    host: optionalText(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST),
    authPort: parsePort(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT, DEFAULT_AUTH_EMULATOR_PORT),
    firestorePort: parseOptionalPort(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT),
  },
  log: resolveLogConfig(process.env.NODE_ENV, process.env.EXPO_PUBLIC_LOG_LEVEL),
};

/** Az Auth emulátor címe, pl. „http://192.168.1.20:9099”. */
export function authEmulatorUrl(
  host: string = DEFAULT_EMULATOR_HOST,
  port: number = env.emulator.authPort,
): string {
  return `http://${host}:${port}`;
}
