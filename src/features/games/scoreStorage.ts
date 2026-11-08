import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlayerScores } from '@/core/models/PlayerProfile';
import { createLogger } from '@/services/logger';
import type { GameId } from './gameOptions';

const log = createLogger('games');

const STORAGE_KEY = 'csillagnezo.gameBest.v1';
const GUEST_MIGRATION_KEY = 'csillagnezo.gameBest.migrated.v1';

export type BestScores = PlayerScores;

function keyFor(uid?: string): string {
  return uid ? `${STORAGE_KEY}.user.${encodeURIComponent(uid)}` : STORAGE_KEY;
}

/** A játékonkénti helyi rekordok. Ha a tár nem olvasható, üres eredményt ad. */
export async function loadBestScores(uid?: string): Promise<BestScores> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const scores: BestScores = {};
    for (const [game, score] of Object.entries(parsed)) {
      if (
        (game === 'constellation-finder' || game === 'star-connection') &&
        typeof score === 'number' &&
        Number.isSafeInteger(score) &&
        score >= 0
      ) {
        scores[game] = score;
      }
    }
    return scores;
  } catch (error) {
    log.warn('A helyi rekordok nem olvashatók; üres listával folytatjuk', { error });
    return {};
  }
}

export async function saveBestScores(scores: BestScores, uid?: string): Promise<void> {
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(scores));
}

export async function removeBestScores(uid: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(uid));
}

/** Az app korábbi, készülékszintű rekordjait egyszer átveszi az első fiók. */
export async function migrateLegacyBestScores(uid: string): Promise<BestScores> {
  const scopedScores = await loadBestScores(uid);
  if (await AsyncStorage.getItem(GUEST_MIGRATION_KEY)) return scopedScores;

  const guestScores = await loadBestScores();
  if (!Object.keys(guestScores).length) {
    await AsyncStorage.setItem(GUEST_MIGRATION_KEY, uid);
    return scopedScores;
  }

  const migrated: BestScores = { ...guestScores, ...scopedScores };
  for (const game of ['constellation-finder', 'star-connection'] as const) {
    const best = Math.max(guestScores[game] ?? 0, scopedScores[game] ?? 0);
    if (best > 0) migrated[game] = best;
    else delete migrated[game];
  }
  await saveBestScores(migrated, uid);
  await AsyncStorage.setItem(GUEST_MIGRATION_KEY, uid);
  await AsyncStorage.removeItem(STORAGE_KEY);
  return migrated;
}

/** Elmenti az eredményt, ha jobb a rekordnál. A mentési hiba nem akasztja meg a játékot. */
export async function recordBestScore(
  game: GameId,
  score: number,
  uid?: string,
): Promise<{ best: number; isNewBest: boolean }> {
  const scores = await loadBestScores(uid);
  const previous = scores[game] ?? 0;
  if (score <= previous) return { best: previous, isNewBest: false };
  try {
    await saveBestScores({ ...scores, [game]: score }, uid);
  } catch {
    // a rekord csak a mostani képernyőn látszik, de a játék folytatható
  }
  return { best: score, isNewBest: true };
}
