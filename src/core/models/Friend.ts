import { parsePlayerProfile, totalPlayerPoints, type PlayerScores } from './PlayerProfile';

/** Ennyi barátot lehet felvenni (a Firestore-szabály ugyanezt a határt ellenőrzi). */
export const MAX_FRIENDS = 50;

/** Egy barát nyilvános adatai: csak az, ami a ranglistarekordban amúgy is látszik. */
export interface FriendSummary {
  uid: string;
  displayName: string;
  points: number;
  scores: PlayerScores;
  trophyCount: number;
}

export type AddFriendFailure = 'empty' | 'self' | 'duplicate' | 'full';

export type AddFriendResult =
  { ok: true; friendIds: string[] } | { ok: false; reason: AddFriendFailure };

export function parseFriendIds(value: unknown): string[] {
  const raw = (value as { friendIds?: unknown } | null)?.friendIds;
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)].slice(0, MAX_FRIENDS);
}

/** A beírt barátkód ellenőrzése és hozzáadása a listához (új listát ad, a bemenetet nem módosítja). */
export function addFriendId(
  friendIds: readonly string[],
  code: string,
  ownUid: string,
): AddFriendResult {
  const id = code.trim();
  if (!id) return { ok: false, reason: 'empty' };
  if (id === ownUid) return { ok: false, reason: 'self' };
  if (friendIds.includes(id)) return { ok: false, reason: 'duplicate' };
  if (friendIds.length >= MAX_FRIENDS) return { ok: false, reason: 'full' };
  return { ok: true, friendIds: [...friendIds, id] };
}

export function removeFriendId(friendIds: readonly string[], uid: string): string[] {
  return friendIds.filter((id) => id !== uid);
}

/** A ranglistarekordból barát-összegzést készít; az összpont mindig a pontszámokból számolódik. */
export function summarizeFriend(data: unknown, uid: string): FriendSummary {
  const profile = parsePlayerProfile(data, uid);
  const trophyCount = (data as { trophyCount?: unknown } | null)?.trophyCount;
  return {
    uid,
    displayName: profile.displayName || 'Csillagnéző',
    points: totalPlayerPoints(profile.scores),
    scores: profile.scores,
    trophyCount:
      typeof trophyCount === 'number' && Number.isSafeInteger(trophyCount) && trophyCount >= 0
        ? trophyCount
        : 0,
  };
}

/** Pontszám szerint csökkenő, azonos pontnál név szerinti sorrend. */
export function compareFriends(a: FriendSummary, b: FriendSummary): number {
  return b.points - a.points || a.displayName.localeCompare(b.displayName, 'hu');
}
