import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameId } from './gameOptions';

const STORAGE_KEY = 'csillagnezo.gameBest.v1';

export type BestScores = Partial<Record<GameId, number>>;

/** A játékonkénti helyi rekordok. Ha a tár nem olvasható, üres eredményt ad. */
export async function loadBestScores(): Promise<BestScores> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as BestScores) : {};
  } catch {
    return {};
  }
}

/** Elmenti az eredményt, ha jobb a rekordnál. A mentési hiba nem akasztja meg a játékot. */
export async function recordBestScore(
  game: GameId,
  score: number,
): Promise<{ best: number; isNewBest: boolean }> {
  const scores = await loadBestScores();
  const previous = scores[game] ?? 0;
  if (score <= previous) return { best: previous, isNewBest: false };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...scores, [game]: score }));
  } catch {
    // a rekord csak a mostani képernyőn látszik, de a játék folytatható
  }
  return { best: score, isNewBest: true };
}
