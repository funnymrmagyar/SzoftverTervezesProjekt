import { AuthError } from './AuthService';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Érvénytelen e-mail-cím.',
  'auth/missing-email': 'Add meg az e-mail-címed.',
  'auth/missing-password': 'Add meg a jelszavad.',
  'auth/invalid-credential': 'Hibás e-mail-cím vagy jelszó.',
  'auth/wrong-password': 'Hibás e-mail-cím vagy jelszó.',
  'auth/user-not-found': 'Hibás e-mail-cím vagy jelszó.',
  'auth/user-disabled': 'Ez a fiók le van tiltva.',
  'auth/email-already-in-use': 'Ezzel az e-mail-címmel már regisztráltak.',
  'auth/weak-password': 'A jelszó túl gyenge (legalább 6 karakter kell).',
  'auth/too-many-requests': 'Túl sok próbálkozás. Próbáld újra néhány perc múlva.',
  'auth/network-request-failed': 'Nincs kapcsolat a szerverrel. Ellenőrizd az internetet.',
};

export const UNKNOWN_ERROR_MESSAGE = 'Váratlan hiba történt. Próbáld újra.';

/** Firebase hibakód → magyar üzenet. */
export function authErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || UNKNOWN_ERROR_MESSAGE;
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
