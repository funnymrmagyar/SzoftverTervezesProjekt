import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLogger } from '@/services/logger';

const log = createLogger('player');

const TROPHY_STORAGE_KEY = 'csillagnezo.playerTrophies.v1';

function keyFor(uid: string): string {
  return `${TROPHY_STORAGE_KEY}.${encodeURIComponent(uid)}`;
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
