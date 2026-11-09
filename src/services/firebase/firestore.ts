import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { getFirebaseApp } from './app';
import { emulatorHost, isUsingEmulator } from './config';
import { env } from '@/config/env';

let firestore: Firestore | undefined;

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
    if (isUsingEmulator) {
      // A port alapból 8080 (a Firestore emulátoré), a .env-ben felülírható.
      connectFirestoreEmulator(firestore, emulatorHost(), env.emulator.firestorePort);
    }
  }
  return firestore;
}
