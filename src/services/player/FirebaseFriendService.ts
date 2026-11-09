import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { parseFriendIds, summarizeFriend, type FriendSummary } from '@/core/models/Friend';
import { getFirebaseFirestore } from '@/services/firebase/firestore';

/*
 * A barátlista a `friends/{uid}` dokumentumban van (csak a tulajdonos olvashatja), a barátok
 * adatai pedig a nyilvános `leaderboard/{uid}` rekordból jönnek, így e-mail-cím nem szivárog.
 * A hibákat a hívó (useFriendsStore) kezeli és naplózza.
 */

export async function loadFriendIds(uid: string): Promise<string[]> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'friends', uid));
  return snapshot.exists() ? parseFriendIds(snapshot.data()) : [];
}

export async function saveFriendIds(uid: string, friendIds: string[]): Promise<void> {
  await setDoc(doc(getFirebaseFirestore(), 'friends', uid), {
    friendIds,
    updatedAt: serverTimestamp(),
  });
}

/** Egy játékos nyilvános adatai; `null`, ha nincs ilyen (vagy már törölte a fiókját). */
export async function loadFriendSummary(uid: string): Promise<FriendSummary | null> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'leaderboard', uid));
  return snapshot.exists() ? summarizeFriend(snapshot.data(), uid) : null;
}
