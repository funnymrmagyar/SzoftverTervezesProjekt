import { GAME_IDS, isGameId, type GameId } from '@/features/games/gameOptions';

/** A trófeák kiértékeléséhez szükséges, eszközön tárolt játékstatisztika. */
export interface PlayerStats {
  gamesPlayed: number;
  plays: Partial<Record<GameId, number>>;
  /** Azok a napok (ÉÉÉÉ-HH-NN), amikor a játékos játszott; növekvő sorrendben, egyedi elemekkel. */
  days: string[];
}

/** Ennyi legutóbbi napot tárolunk; a 7 napos sorozathoz ez bőven elég. */
export const MAX_STORED_DAYS = 60;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createEmptyStats(): PlayerStats {
  return { gamesPlayed: 0, plays: {}, days: [] };
}

/** A helyi naptári nap kulcsa (nem UTC, hogy éjfél körül se csússzon el a sorozat). */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Hány egymást követő napon játszott a játékos a megadott napig visszafelé számolva. */
export function currentDayStreak(days: readonly string[], today: string): number {
  const played = new Set(days);
  let streak = 0;
  let cursor = dayNumber(today);
  // Ha ma még nem játszott, a tegnapig tartó sorozat is él; ezt a kiértékelő nem használja,
  // mert a kör rögzítése mindig beleírja a mai napot.
  while (played.has(keyFromDayNumber(cursor))) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

function keyFromDayNumber(value: number): string {
  const date = new Date(value * DAY_MS);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function recordRunInStats(stats: PlayerStats, game: GameId, today: string): PlayerStats {
  const days = stats.days.includes(today) ? stats.days : [...stats.days, today].sort();
  return {
    gamesPlayed: stats.gamesPlayed + 1,
    plays: { ...stats.plays, [game]: (stats.plays[game] ?? 0) + 1 },
    days: days.slice(-MAX_STORED_DAYS),
  };
}

/** A tárolt JSON hibatűrő beolvasása: ismeretlen vagy hibás mezőket eldob. */
export function parsePlayerStats(value: unknown): PlayerStats {
  if (!value || typeof value !== 'object') return createEmptyStats();
  const data = value as Record<string, unknown>;

  const plays: PlayerStats['plays'] = {};
  if (data.plays && typeof data.plays === 'object') {
    for (const [key, count] of Object.entries(data.plays)) {
      if (isGameId(key) && typeof count === 'number' && Number.isSafeInteger(count) && count > 0) {
        plays[key] = count;
      }
    }
  }

  const days = Array.isArray(data.days)
    ? [...new Set(data.days.filter((day): day is string => typeof day === 'string'))]
        .filter((day) => DAY_PATTERN.test(day))
        .sort()
        .slice(-MAX_STORED_DAYS)
    : [];

  const stored =
    typeof data.gamesPlayed === 'number' && Number.isSafeInteger(data.gamesPlayed)
      ? Math.max(0, data.gamesPlayed)
      : 0;
  const gamesPlayed = Math.max(
    stored,
    GAME_IDS.reduce((total, game) => total + (plays[game] ?? 0), 0),
  );

  return { gamesPlayed, plays, days };
}
