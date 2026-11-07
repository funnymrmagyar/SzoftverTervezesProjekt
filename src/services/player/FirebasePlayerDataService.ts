import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import {
  mergePlayerProfiles,
  parsePlayerProfile,
  totalPlayerPoints,
  type LeaderboardPlayer,
  type PlayerProfile,
} from '@/core/models/PlayerProfile';
import { getFirebaseFirestore } from '@/services/firebase/firestore';

const LEADERBOARD_SIZE = 50;

/** Egyéni adatok mentése és a nyilvános, összesített ranglistarekord frissítése. */
export async function syncPlayerProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', profile.uid);
  const leaderboardRef = doc(db, 'leaderboard', profile.uid);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(userRef);
    const remoteProfile = existing.exists()
      ? parsePlayerProfile(existing.data(), profile.uid)
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
  return snapshot.exists() ? parsePlayerProfile(snapshot.data(), uid) : null;
}

export async function deletePlayerProfile(uid: string): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', uid);
  const leaderboardRef = doc(db, 'leaderboard', uid);
  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(userRef);
    const leaderboard = await transaction.get(leaderboardRef);
    if (user.exists()) transaction.delete(userRef);
    if (leaderboard.exists()) transaction.delete(leaderboardRef);
  });
}

/** A későbbi online ranglista felület számára lekéri a legmagasabb összpontszámokat. */
export async function loadLeaderboard(): Promise<LeaderboardPlayer[]> {
  const db = getFirebaseFirestore();
  const rankingQuery = query(
    collection(db, 'leaderboard'),
    orderBy('points', 'desc'),
    limit(LEADERBOARD_SIZE),
  );
  const snapshot = await getDocs(rankingQuery);

  return snapshot.docs.map((entry) => {
    const profile = parsePlayerProfile(entry.data(), entry.id);
    return {
      uid: profile.uid,
      displayName: profile.displayName,
      scores: profile.scores,
      points: totalPlayerPoints(profile.scores),
      trophyCount: typeof entry.data().trophyCount === 'number' ? entry.data().trophyCount : 0,
    };
  });
}
