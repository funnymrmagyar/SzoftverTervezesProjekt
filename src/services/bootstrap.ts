import { setAuthService } from './auth';
import { FirebaseAuthService } from './auth/FirebaseAuthService';
import { getFirebaseAuth } from './firebase/auth';

let configured = false;

/**
 * Composition root: itt döntjük el, melyik interfész mögé melyik megvalósítás kerül.
 * A gyökér-layout hívja meg egyszer, az app indulásakor.
 */
export function configureServices(): void {
  if (configured) return;
  setAuthService(new FirebaseAuthService(getFirebaseAuth()));
  configured = true;
}
