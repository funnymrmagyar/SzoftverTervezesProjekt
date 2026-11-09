import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import type { LeaderboardScope } from '@/features/leaderboard/ranking';

export type Unsubscribe = () => void;

/**
 * A ranglista adatforrása. Két megvalósítása van (a services/bootstrap.ts választ):
 *  - FirebaseLeaderboardService: a Firestore „leaderboard” gyűjteménye, élő frissítéssel;
 *  - LocalLeaderboardService: helyi módban az ezen az eszközön lévő fiókok.
 * A rangsorolás szabályai nem itt vannak, hanem a features/leaderboard/ranking.ts-ben.
 */
export interface LeaderboardService {
  /**
   * Az adott szűrő szerinti legjobb `limit` játékos. Minden változáskor (pl. valaki új
   * pontot szerez) újra meghívja az onChange-et. A visszaadott függvény leiratkozik.
   */
  watchTop(
    scope: LeaderboardScope,
    limit: number,
    onChange: (players: LeaderboardPlayer[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  /** Egy játékos bejegyzése (null, ha még nincs), élő frissítéssel. */
  watchPlayer(
    uid: string,
    onChange: (player: LeaderboardPlayer | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;

  /** Hány játékosnak van több pontja az adott szűrőben — a listán kívüli saját helyezéshez. */
  countPlayersAhead(scope: LeaderboardScope, score: number): Promise<number>;
}
