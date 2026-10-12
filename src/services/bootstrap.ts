import { setAuthService } from './auth';
import { FirebaseAuthService } from './auth/FirebaseAuthService';
import { LocalAuthService } from './auth/LocalAuthService';
import { getFirebaseAuth } from './firebase/auth';
import { authMode } from './firebase/config';

let configured = false;

/**
 * Composition root: itt döntjük el, melyik interfész mögé melyik megvalósítás kerül.
 * A gyökér-layout hívja meg egyszer, az app indulásakor.
 *
 * Az üzemmódot a services/firebase/config.ts határozza meg:
 *  - local    → LocalAuthService (alapértelmezett, Firebase és hálózat nélkül)
 *  - emulator → FirebaseAuthService a helyi emulátor ellen
 *  - firebase → FirebaseAuthService a valódi projekt ellen (.env.local kulcsokkal)
 */
export function configureServices(): void {
  if (configured) return;
  setAuthService(
    authMode === 'local' ? new LocalAuthService() : new FirebaseAuthService(getFirebaseAuth()),
  );
  configured = true;
}
