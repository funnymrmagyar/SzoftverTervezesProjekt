import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

/*
 * A Firebase-beállítások környezeti változókból jönnek (.env, .env.local).
 * Az EXPO_PUBLIC_ változókat a Metro fordításkor beégeti, ezért mindig
 * „process.env.EXPO_PUBLIC_…” alakban kell hivatkozni rájuk.
 *
 * Ha nincs megadva API-kulcs, az app a helyi Firebase emulátorhoz csatlakozik
 * egy „demo-” projekttel — így valódi Firebase-projekt nélkül is fejleszthető.
 */

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

export const DEMO_PROJECT_ID = 'demo-csillagnezo';

export const isUsingEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || !apiKey;

export const firebaseConfig: FirebaseOptions = isUsingEmulator
  ? {
      apiKey: apiKey || 'demo-api-key',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || DEMO_PROJECT_ID,
    }
  : {
      apiKey,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

export const AUTH_EMULATOR_PORT = 9099;

/**
 * Az emulátor gépe. Telefonon (Expo Go) a fejlesztői gép IP-címe kell, ezt az
 * Expo dev szerver címéből olvassuk ki, ha nincs külön megadva.
 */
export function emulatorHost(): string {
  const fromEnv = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (fromEnv) return fromEnv;
  const hostUri = Constants.expoConfig?.hostUri; // pl. „192.168.1.20:8081”
  const host = hostUri?.split(':')[0];
  return host && host !== 'localhost' ? host : '127.0.0.1';
}
