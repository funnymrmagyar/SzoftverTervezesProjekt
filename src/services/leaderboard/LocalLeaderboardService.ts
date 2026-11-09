import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import { scoreFor, type LeaderboardScope } from '@/features/leaderboard/ranking';
import {
  loadLocalLeaderboard,
  onLocalPlayerProfilesChange,
} from '@/services/player/localPlayerProfiles';

import type { LeaderboardService } from './LeaderboardService';

/**
 * Helyi mód (Firebase nélkül): a ranglista az ezen az eszközön lévő fiókokat rangsorolja.
 * Ugyanúgy élő: ha valaki új pontot szerez, minden feliratkozó megkapja a frissített listát.
 */
export class LocalLeaderboardService implements LeaderboardService {
  watchTop(
    scope: LeaderboardScope,
    limit: number,
    onChange: (players: LeaderboardPlayer[]) => void,
    onError: (error: unknown) => void,
  ) {
    return this.watch(async () => {
      const players = await loadLocalLeaderboard();
      onChange(
        players
          .filter((player) => scoreFor(player, scope) > 0)
          .sort((a, b) => scoreFor(b, scope) - scoreFor(a, scope))
          .slice(0, limit),
      );
    }, onError);
  }

  watchPlayer(
    uid: string,
    onChange: (player: LeaderboardPlayer | null) => void,
    onError: (error: unknown) => void,
  ) {
    return this.watch(async () => {
      const players = await loadLocalLeaderboard();
      onChange(players.find((player) => player.uid === uid) ?? null);
    }, onError);
  }

  async countPlayersAhead(scope: LeaderboardScope, score: number): Promise<number> {
    const players = await loadLocalLeaderboard();
    return players.filter((player) => scoreFor(player, scope) > score).length;
  }

  /** Azonnal betölt, majd minden változáskor újra; leiratkozás után már nem hív vissza. */
  private watch(load: () => Promise<void>, onError: (error: unknown) => void) {
    let active = true;
    const run = () => {
      load().catch((error: unknown) => {
        if (active) onError(error);
      });
    };
    const unsubscribe = onLocalPlayerProfilesChange(() => {
      if (active) run();
    });
    run();
    return () => {
      active = false;
      unsubscribe();
    };
  }
}
