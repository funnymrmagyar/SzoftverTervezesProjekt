// Android/iOS: a bejelentkezést AsyncStorage-ban őrizzük meg az app újraindítása után is.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectAuthEmulator,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

import { getFirebaseApp } from './app';
import { AUTH_EMULATOR_PORT, emulatorHost, isUsingEmulator } from './config';

let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = initializeAuth(getFirebaseApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    if (isUsingEmulator) {
      connectAuthEmulator(auth, `http://${emulatorHost()}:${AUTH_EMULATOR_PORT}`, {
        disableWarnings: true,
      });
    }
  }
  return auth;
}
