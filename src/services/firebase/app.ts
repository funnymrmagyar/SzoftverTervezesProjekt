import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';

import { firebaseConfig } from './config';

/** Az alapértelmezett Firebase-app (egyszer inicializálva, gyors újratöltésnél is). */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
