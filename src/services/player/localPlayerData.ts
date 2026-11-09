import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createEmptyStats,
  parsePlayerStats,
  type PlayerStats,
} from '@/features/trophies/playerStats';
import { createLogger } from '@/services/logger';

const log = createLogger('player');

const TROPHY_STORAGE_KEY = 'csillagnezo.playerTrophies.v1';
const STATS_STORAGE_KEY = 'csillagnezo.playerStats.v1';

function keyFor(uid: string): string {
  return `${TROPHY_STORAGE_KEY}.${encodeURIComponent(uid)}`;
}

function statsKeyFor(uid: string): string {
  return `${STATS_STORAGE_KEY}.${encodeURIComponent(uid)}`;
}

export async function loadTrophyIds(uid: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string'))]
      : [];
  } catch (error) {
    log.warn('A helyi trófeák nem olvashatók; üres listával folytatjuk', { error });
    return [];
  }
}

export async function saveTrophyIds(uid: string, trophyIds: string[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify([...new Set(trophyIds)]));
}

export async function removeTrophyIds(uid: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(uid));
}

/** A trófeák kiértékeléséhez használt játékstatisztika (csak ezen az eszközön tároljuk). */
export async function loadPlayerStats(uid: string): Promise<PlayerStats> {
  try {
    const raw = await AsyncStorage.getItem(statsKeyFor(uid));
    return raw ? parsePlayerStats(JSON.parse(raw)) : createEmptyStats();
  } catch (error) {
    log.warn('A helyi játékstatisztika nem olvasható; üresről indulunk', { error });
    return createEmptyStats();
  }
}

export async function savePlayerStats(uid: string, stats: PlayerStats): Promise<void> {
  await AsyncStorage.setItem(statsKeyFor(uid), JSON.stringify(stats));
}

export async function removePlayerStats(uid: string): Promise<void> {
  await AsyncStorage.removeItem(statsKeyFor(uid));
}
