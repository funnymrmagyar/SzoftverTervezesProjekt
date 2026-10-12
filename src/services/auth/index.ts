import type { AuthService } from './AuthService';

export { AuthError, type AuthService, type AuthUser } from './AuthService';
export { authErrorMessage, toAuthError } from './authErrors';
export * from './validation';

/*
 * Az app nem közvetlenül a Firebase-t hívja, hanem ezt az interfészt.
 * A konkrét megvalósítást az app indulásakor a services/bootstrap.ts adja meg
 * (composition root), a tesztek pedig InMemoryAuthService-t állítanak be.
 */
let service: AuthService | undefined;

export function setAuthService(next: AuthService): void {
  service = next;
}

export function getAuthService(): AuthService {
  if (!service) {
    throw new Error(
      'Nincs beállítva AuthService — hívd meg a configureServices()-t az app indulásakor.',
    );
  }
  return service;
}
