import { t, type TranslationKey } from '@/ui/i18n';

import { AuthError } from './AuthService';

/** Firebase hibakód → fordítási kulcs; az üzenet a hiba keletkezésekor az aktuális nyelven készül. */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  'auth/invalid-email': 'validation.emailInvalid',
  'auth/missing-email': 'validation.emailRequired',
  'auth/missing-password': 'validation.passwordRequired',
  'auth/invalid-credential': 'authError.invalidCredential',
  'auth/wrong-password': 'authError.invalidCredential',
  'auth/user-not-found': 'authError.invalidCredential',
  'auth/user-disabled': 'authError.userDisabled',
  'auth/requires-recent-login': 'authError.requiresRecentLogin',
  'auth/email-already-in-use': 'authError.emailInUse',
  'auth/weak-password': 'authError.weakPassword',
  'auth/too-many-requests': 'authError.tooManyRequests',
  'auth/network-request-failed': 'authError.network',
};

/** Az ismeretlen hiba üzenete az aktuális nyelven. */
export function unknownErrorMessage(): string {
  return t('authError.unknown');
}

/** Ismert hibakód-e (pl. rossz jelszó, foglalt e-mail), szemben a váratlan hibákkal. */
export function isKnownAuthErrorCode(code: string): boolean {
  return Object.hasOwn(MESSAGE_KEYS, code);
}

/** Firebase hibakód → üzenet az aktuális nyelven. */
export function authErrorMessage(code: string | undefined): string {
  const key = code ? MESSAGE_KEYS[code] : undefined;
  return key ? t(key) : unknownErrorMessage();
}

/** Tetszőleges elkapott hibát AuthError-rá alakít. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'unknown';
  return new AuthError(authErrorMessage(code), code);
}
