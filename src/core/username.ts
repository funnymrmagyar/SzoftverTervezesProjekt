import { t } from '@/ui/i18n';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export function normalizeUsernameKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsernameFormat(raw: string): boolean {
  const value = raw.trim();
  return (
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    USERNAME_PATTERN.test(value)
  );
}

export function sanitizeUsername(raw: string): string | null {
  const value = raw.trim();
  if (!isValidUsernameFormat(value)) return null;
  return value.slice(0, USERNAME_MAX);
}

export function usernameFormatError(raw: string): string | null {
  const value = raw.trim();
  if (value.length < USERNAME_MIN) {
    return t('username.error.min', { min: USERNAME_MIN });
  }
  if (value.length > USERNAME_MAX) {
    return t('username.error.max', { max: USERNAME_MAX });
  }
  if (!USERNAME_PATTERN.test(value)) {
    return t('username.error.chars');
  }
  return null;
}