import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { getFirebaseApp } from './app';
import { emulatorHost, isUsingEmulator } from './config';
import { env } from '@/config/env';

let firestore: Firestore | undefined;

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const app = getFirebaseApp();
    if (isUsingEmulator) {
      const port = env.emulator.firestorePort;
      if (port === undefined) {
        throw new Error(
          'Add meg az EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT értékét a .env.local fájlban.',
        );
      }
      firestore = getFirestore(app);
      connectFirestoreEmulator(firestore, emulatorHost(), port);
    } else {
      firestore = getFirestore(app);
    }
  }
  return firestore;
}
