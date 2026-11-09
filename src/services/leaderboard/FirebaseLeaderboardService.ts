import {
  collection,
  doc,
  getCountFromServer,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

import { parseLeaderboardPlayer, type LeaderboardPlayer } from '@/core/models/PlayerProfile';
import type { LeaderboardScope } from '@/features/leaderboard/ranking';

import type { LeaderboardService } from './LeaderboardService';

const COLLECTION = 'leaderboard';

/**
 * Melyik mező szerint rendezünk: az összesítettnél a „points”, egy játéknál a „scores.<játék>”.
 * A Firestore minden mezőt (a map-ek almezőit is) magától indexel, így külön index nem kell.
 */
function rankingField(scope: LeaderboardScope): string {
  return scope === 'all' ? 'points' : `scores.${scope}`;
}

/**
 * A ranglista a Firestore-ból. A „leaderboard/{uid}” dokumentumokat a játékosprofil
 * szinkronizálása írja (FirebasePlayerDataService.syncPlayerProfile), ez csak olvas.
 * A firestore.rules szerint a ranglista nyilvánosan olvasható, így ehhez nem kell módosítás.
 */
export class FirebaseLeaderboardService implements LeaderboardService {
  constructor(private readonly db: Firestore) {}

  watchTop(
    scope: LeaderboardScope,
    limit: number,
    onChange: (players: LeaderboardPlayer[]) => void,
    onError: (error: unknown) => void,
  ) {
    const ranking = query(
      collection(this.db, COLLECTION),
      orderBy(rankingField(scope), 'desc'),
      limitTo(limit),
    );
    return onSnapshot(
      ranking,
      (snapshot) =>
        onChange(snapshot.docs.map((entry) => parseLeaderboardPlayer(entry.data(), entry.id))),
      onError,
    );
  }

  watchPlayer(
    uid: string,
    onChange: (player: LeaderboardPlayer | null) => void,
    onError: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(this.db, COLLECTION, uid),
      (snapshot) =>
        onChange(snapshot.exists() ? parseLeaderboardPlayer(snapshot.data(), snapshot.id) : null),
      onError,
    );
  }

  async countPlayersAhead(scope: LeaderboardScope, score: number): Promise<number> {
    const ahead = query(collection(this.db, COLLECTION), where(rankingField(scope), '>', score));
    const snapshot = await getCountFromServer(ahead);
    return snapshot.data().count;
  }
}
