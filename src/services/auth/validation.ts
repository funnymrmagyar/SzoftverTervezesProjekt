import { t } from '@/ui/i18n';

export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CredentialErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return t('validation.emailRequired');
  if (!EMAIL_PATTERN.test(email.trim())) return t('validation.emailInvalid');
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return t('validation.passwordRequired');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return t('validation.passwordShort', { min: MIN_PASSWORD_LENGTH });
  }
  return undefined;
}

/** Bejelentkezési űrlap ellenőrzése (csak kitöltöttség és formátum). */
export function validateLogin(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = t('validation.passwordRequired');
  return errors;
}

/** Regisztrációs űrlap ellenőrzése. */
export function validateRegistration(
  email: string,
  password: string,
  passwordConfirm: string,
): CredentialErrors {
  const errors: CredentialErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (password !== passwordConfirm) errors.passwordConfirm = t('validation.passwordMismatch');
  return errors;
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Object.values(errors).some(Boolean);
}
