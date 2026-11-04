import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

import {
  authEmulatorUrl as buildAuthEmulatorUrl,
  DEFAULT_EMULATOR_HOST,
  DEMO_API_KEY,
  DEMO_PROJECT_ID,
  env,
} from '@/config/env';

/*
 * A Firebase-beállítások. A nyers értékek a src/config/env.ts-ből jönnek (.env, .env.local).
 *
 * Három üzemmód van (authMode):
 *  - 'local'    : alapértelmezett. Nincs hálózat, nincs Firebase: a fiókok a készüléken
 *                 (AsyncStorage / localStorage) tárolódnak. Fejlesztéshez és bemutatáshoz.
 *  - 'emulator' : helyi Firebase Auth emulátor (EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true).
 *  - 'firebase' : valódi Firebase-projekt (EXPO_PUBLIC_FIREBASE_API_KEY megadva).
 */

export type AuthMode = 'local' | 'emulator' | 'firebase';

export const authMode: AuthMode = env.emulator.enabled
  ? 'emulator'
  : env.firebase.apiKey
    ? 'firebase'
    : 'local';

export const isUsingEmulator = authMode === 'emulator';

export const firebaseConfig: FirebaseOptions =
  authMode !== 'firebase'
    ? {
        apiKey: env.firebase.apiKey ?? DEMO_API_KEY,
        projectId: env.firebase.projectId ?? DEMO_PROJECT_ID,
      }
    : { ...env.firebase };

/**
 * Az emulátor gépe. Telefonon (Expo Go) a fejlesztői gép IP-címe kell, ezt az
 * Expo dev szerver címéből olvassuk ki, ha nincs külön megadva.
 */
export function emulatorHost(): string {
  if (env.emulator.host) return env.emulator.host;
  const hostUri = Constants.expoConfig?.hostUri; // pl. „192.168.1.20:8081”
  const host = hostUri?.split(':')[0];
  return host && host !== 'localhost' ? host : DEFAULT_EMULATOR_HOST;
}

/** Az Auth emulátor teljes címe (gép és port), a connectAuthEmulator-nak. */
export function authEmulatorUrl(): string {
  return buildAuthEmulatorUrl(emulatorHost());
}
