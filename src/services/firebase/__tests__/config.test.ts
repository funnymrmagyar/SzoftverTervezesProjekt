import { parseOptionalPort } from '@/config/env';
import type * as EnvModule from '@/config/env';
import type * as ConfigModule from '../config';

const ORIGINAL_ENV = process.env;

/** A config (és az env.ts) betöltéskor olvassa a process.env-et: minden esethez újratöltjük. */
function loadConfig(
  vars: Record<string, string> = {},
): typeof ConfigModule & Pick<typeof EnvModule, 'configWarnings'> {
  process.env = { ...ORIGINAL_ENV, ...vars };
  let mod!: typeof ConfigModule & Pick<typeof EnvModule, 'configWarnings'>;
  jest.isolateModules(() => {
    const config = jest.requireActual<typeof ConfigModule>('../config');
    const { configWarnings } = jest.requireActual<typeof EnvModule>('@/config/env');
    mod = { ...config, configWarnings };
  });
  return mod;
}

beforeEach(() => {
  // A fejlesztő saját shell-változói ne befolyásolják a teszteket.
  for (const key of Object.keys(ORIGINAL_ENV)) {
    if (key.startsWith('EXPO_PUBLIC_')) delete ORIGINAL_ENV[key];
  }
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

describe('Firebase-config a .env alapján', () => {
  it('.env nélkül helyi módban fut, a demo projekttel', () => {
    const { authMode, firebaseConfig } = loadConfig();
    expect(authMode).toBe('local');
    expect(firebaseConfig).toEqual({ apiKey: 'demo-api-key', projectId: 'demo-csillagnezo' });
  });

  it('a .env.example üresen hagyott sorai nem kapcsolnak be semmit', () => {
    const { authMode } = loadConfig({
      EXPO_PUBLIC_FIREBASE_API_KEY: '',
      EXPO_PUBLIC_USE_FIREBASE_EMULATOR: '',
      EXPO_PUBLIC_FIREBASE_EMULATOR_PORT: '',
    });
    expect(authMode).toBe('local');
  });

  it('emulátor módban a megadott gépet és portot használja', () => {
    const { authMode, authEmulatorUrl } = loadConfig({
      EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
      EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '192.168.0.134',
      EXPO_PUBLIC_FIREBASE_EMULATOR_PORT: '9199',
    });
    expect(authMode).toBe('emulator');
    expect(authEmulatorUrl()).toBe('http://192.168.0.134:9199');
  });

  it('Firestore-emulátor portjának környezeti változós formátumát ellenőrzi', () => {
    expect(parseOptionalPort('8181')).toBe(8181);
    expect(parseOptionalPort(undefined)).toBeUndefined();
  });

  it('emulátor módban gép és port nélkül az alapértékeket használja', () => {
    const { authEmulatorUrl } = loadConfig({ EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true' });
    expect(authEmulatorUrl()).toBe('http://127.0.0.1:9099');
  });

  it('hibás portnál figyelmeztet, és az alapértéket használja', () => {
    const { authEmulatorUrl, configWarnings } = loadConfig({
      EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
      EXPO_PUBLIC_FIREBASE_EMULATOR_PORT: 'abc',
    });
    expect(authEmulatorUrl()).toBe('http://127.0.0.1:9099');
    // A figyelmeztetést induláskor a logger írja ki (services/bootstrap.ts).
    expect(configWarnings).toContainEqual({
      message: 'Érvénytelen port a .env-ben',
      meta: { value: 'abc', fallback: 9099 },
    });
  });

  it('API-kulccsal a valódi Firebase-projektet használja, a .env értékeivel', () => {
    const { authMode, firebaseConfig } = loadConfig({
      EXPO_PUBLIC_FIREBASE_API_KEY: 'kulcs',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'sajat',
    });
    expect(authMode).toBe('firebase');
    expect(firebaseConfig).toMatchObject({ apiKey: 'kulcs', projectId: 'sajat' });
  });

  it('az emulátor kapcsoló erősebb az API-kulcsnál', () => {
    const { authMode } = loadConfig({
      EXPO_PUBLIC_FIREBASE_API_KEY: 'kulcs',
      EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
    });
    expect(authMode).toBe('emulator');
  });
});
