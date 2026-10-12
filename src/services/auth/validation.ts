export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CredentialErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Add meg az e-mail-címed.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Érvénytelen e-mail-cím.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Add meg a jelszavad.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A jelszó legalább ${MIN_PASSWORD_LENGTH} karakter legyen.`;
  }
  return undefined;
}

/** Bejelentkezési űrlap ellenőrzése (csak kitöltöttség és formátum). */
export function validateLogin(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Add meg a jelszavad.';
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
  if (password !== passwordConfirm) errors.passwordConfirm = 'A két jelszó nem egyezik.';
  return errors;
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Object.values(errors).some(Boolean);
}
