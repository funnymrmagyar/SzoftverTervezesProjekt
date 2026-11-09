import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mergePlayerProfiles,
  parseLeaderboardPlayer,
  parsePlayerProfile,
  type LeaderboardPlayer,
  type PlayerProfile,
} from '@/core/models/PlayerProfile';
import { createLogger } from '@/services/logger';

/*
 * Helyi mód: a Firestore „users” és „leaderboard” gyűjteményének helyi megfelelője.
 * Az ezen az eszközön lévő fiókok profiljai itt maradnak meg (kijelentkezés után is),
 * ebből készül a helyi ranglista, és bejelentkezéskor innen kapja vissza a játékos a pontjait.
 * A szinkronizálás ugyanúgy működik, mint Firestore-ban: a jobb pontszám és a trófeák uniója marad.
 */

const STORAGE_KEY = 'csillagnezo.localProfiles.v1';

const log = createLogger('player');

type Listener = () => void;
const listeners = new Set<Listener>();

async function readAll(): Promise<Record<string, PlayerProfile>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const profiles: Record<string, PlayerProfile> = {};
    for (const [uid, value] of Object.entries(parsed)) {
      profiles[uid] = parsePlayerProfile(value, uid);
    }
    return profiles;
  } catch (error) {
    log.warn('A helyi játékosprofilok nem olvashatók; üres listával folytatjuk', { error });
    return {};
  }
}

async function writeAll(profiles: Record<string, PlayerProfile>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      log.error('Hiba a helyi ranglista frissítésekor', { error });
    }
  }
}

/** Ugyanaz, mint a syncPlayerProfile Firestore-ban: összefésüli, elmenti, és visszaadja. */
export async function syncLocalPlayerProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const profiles = await readAll();
  const merged = mergePlayerProfiles(profile, profiles[profile.uid] ?? null);
  await writeAll({ ...profiles, [profile.uid]: merged });
  return merged;
}

export async function deleteLocalPlayerProfile(uid: string): Promise<void> {
  const profiles = await readAll();
  if (!(uid in profiles)) return;
  const rest = { ...profiles };
  delete rest[uid];
  await writeAll(rest);
}

/** Az összes helyi játékos ranglista-bejegyzésként. */
export async function loadLocalLeaderboard(): Promise<LeaderboardPlayer[]> {
  const profiles = await readAll();
  return Object.values(profiles).map((profile) =>
    parseLeaderboardPlayer({ ...profile, trophyCount: profile.trophyIds.length }, profile.uid),
  );
}

/** Feliratkozás a helyi profilok változására (pl. új pontszám); a visszaadott függvény leiratkozik. */
export function onLocalPlayerProfilesChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
