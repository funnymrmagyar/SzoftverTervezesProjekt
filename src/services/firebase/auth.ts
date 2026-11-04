// Web: a böngésző saját tárolóját (IndexedDB) használja a bejelentkezés megőrzésére.
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

import { getFirebaseApp } from './app';
import { authEmulatorUrl, isUsingEmulator } from './config';

let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (isUsingEmulator) {
      connectAuthEmulator(auth, authEmulatorUrl(), { disableWarnings: true });
    }
  }
  return auth;
}
