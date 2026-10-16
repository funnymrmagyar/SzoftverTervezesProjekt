// Web: a böngésző saját tárolóját (IndexedDB) használja a bejelentkezés megőrzésére.
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

import { getFirebaseApp } from './app';
import { AUTH_EMULATOR_PORT, emulatorHost, isUsingEmulator } from './config';

let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (isUsingEmulator) {
      connectAuthEmulator(auth, `http://${emulatorHost()}:${AUTH_EMULATOR_PORT}`, {
        disableWarnings: true,
      });
    }
  }
  return auth;
}
