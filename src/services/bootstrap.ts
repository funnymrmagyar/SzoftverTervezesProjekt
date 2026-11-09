import { Platform } from 'react-native';

import { configWarnings } from '@/config/env';

import { setAuthService } from './auth';
import { FirebaseAuthService } from './auth/FirebaseAuthService';
import { LocalAuthService } from './auth/LocalAuthService';
import { getFirebaseAuth } from './firebase/auth';
import { authMode } from './firebase/config';
import { getFirebaseFirestore } from './firebase/firestore';
import { setLeaderboardService } from './leaderboard';
import { FirebaseLeaderboardService } from './leaderboard/FirebaseLeaderboardService';
import { LocalLeaderboardService } from './leaderboard/LocalLeaderboardService';
import { createLogger, getLogLevel } from './logger';
import { installGlobalErrorHandlers } from './logger/globalErrorHandlers';

const log = createLogger('app');

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
  // Elsőként: innentől minden el nem kapott hiba is a naplóba kerül.
  installGlobalErrorHandlers();
  for (const warning of configWarnings) log.warn(warning.message, warning.meta);

  setAuthService(
    authMode === 'local' ? new LocalAuthService() : new FirebaseAuthService(getFirebaseAuth()),
  );
  setLeaderboardService(
    authMode === 'local'
      ? new LocalLeaderboardService()
      : new FirebaseLeaderboardService(getFirebaseFirestore()),
  );
  configured = true;
  log.info('Az alkalmazás elindult', { platform: Platform.OS, authMode, logLevel: getLogLevel() });
}
