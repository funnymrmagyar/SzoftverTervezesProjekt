import { DEFAULT_DISPLAY_NAME } from '@/core/models/PlayerProfile';
import { isValidUsernameFormat } from '@/core/username';

/**
 * A profil és a ranglista alja ugyanazt a nevet mutatja.
 * Sorrend: a most megadott felhasználónév, aztán a ranglistán lévő valódi név,
 * végül — ha a név már betöltődött — az e-mail @ előtti része.
 * Kijelentkezve üres, ilyenkor nem jelenítünk meg e-mailt.
 */
export function sharedAccountName(input: {
  signedIn: boolean;
  username?: string | null;
  leaderboardName?: string | null;
  email?: string | null;
  /** Ha false, a mentett név még töltődik: ne villanjon fel az e-mail. */
  nameResolved?: boolean;
}): string {
  if (!input.signedIn) return '';

  const username = input.username?.trim() ?? '';
  if (isValidUsernameFormat(username)) return username;

  const fromBoard = input.leaderboardName?.trim() ?? '';
  if (fromBoard && fromBoard !== DEFAULT_DISPLAY_NAME && isValidUsernameFormat(fromBoard)) {
    return fromBoard;
  }

  if (input.nameResolved === false) return '';

  const local = (input.email ?? '').trim().split('@')[0]?.trim() ?? '';
  return local;
}