import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

import {
  mergePlayerProfiles,
  parsePlayerProfile,
  totalPlayerPoints,
  type PlayerProfile,
} from '@/core/models/PlayerProfile';
import { getFirebaseFirestore } from '@/services/firebase/firestore';
import { createLogger } from '@/services/logger';

// A ranglista olvasása: services/leaderboard/FirebaseLeaderboardService.ts.

const log = createLogger('player');

/*
 * A hívások hibáit itt nem naplózzuk, csak továbbdobjuk: azt a hívó (useAuthStore, resultQueue)
 * kezeli és naplózza, így egy hiba egyszer kerül a naplóba. Itt csak a váratlan válaszokat jelezzük.
 */

/** Egy Firestore-profil beolvasása; ha nem a várt alakú, figyelmeztet (a hibás mezők kimaradnak). */
function readRemoteProfile(data: unknown, uid: string): PlayerProfile {
  const scores = (data as { scores?: unknown } | null)?.scores;
  if (!data || typeof data !== 'object' || !scores || typeof scores !== 'object') {
    log.warn('Váratlan formátumú játékosprofil a Firestore-ban', { uid });
  }
  return parsePlayerProfile(data, uid);
}

/** Egyéni adatok mentése és a nyilvános, összesített ranglistarekord frissítése. */
export async function syncPlayerProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', profile.uid);
  const leaderboardRef = doc(db, 'leaderboard', profile.uid);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(userRef);
    const remoteProfile = existing.exists()
      ? readRemoteProfile(existing.data(), profile.uid)
      : null;
    const mergedProfile = mergePlayerProfiles(profile, remoteProfile);
    const updatedAt = serverTimestamp();

    transaction.set(userRef, { ...mergedProfile, updatedAt });
    transaction.set(leaderboardRef, {
      uid: profile.uid,
      displayName: mergedProfile.displayName,
      scores: mergedProfile.scores,
      points: totalPlayerPoints(mergedProfile.scores),
      trophyCount: mergedProfile.trophyIds.length,
      updatedAt,
    });
    return mergedProfile;
  });
}

export async function loadPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'users', uid));
  return snapshot.exists() ? readRemoteProfile(snapshot.data(), uid) : null;
}

export async function deletePlayerProfile(uid: string): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  const leaderboardRef = doc(db, 'leaderboard', uid);
  const friendsRef = doc(db, 'friends', uid);
  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(userRef);
    const leaderboard = await transaction.get(leaderboardRef);
    const friends = await transaction.get(friendsRef);
    if (user.exists()) transaction.delete(userRef);
    if (leaderboard.exists()) transaction.delete(leaderboardRef);
    if (friends.exists()) transaction.delete(friendsRef);
  });
}

/** A későbbi online ranglista felület számára lekéri a legmagasabb összpontszámokat. */
