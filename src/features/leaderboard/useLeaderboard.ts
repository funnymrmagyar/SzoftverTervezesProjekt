import { useEffect, useMemo, useState } from 'react';

import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import { getLeaderboardService } from '@/services/leaderboard';
import { createLogger } from '@/services/logger';

import {
  rankFromPlayersAhead,
  rankPlayers,
  scoreFor,
  type LeaderboardScope,
  type RankedPlayer,
} from './ranking';

/** Ennyi játékost mutat a ranglista; a saját helyezés ezen kívül is látszik. */
export const LEADERBOARD_LIMIT = 50;

const log = createLogger('leaderboard');

export interface MyStanding {
  player: LeaderboardPlayer | null;
  /** A pontszám az aktuális szűrőben (0, ha még nincs). */
  score: number;
  /** Helyezés; null, ha nincs pontja, vagy még számoljuk. */
  rank: number | null;
}

export interface LeaderboardView {
  status: 'loading' | 'ready' | 'error';
  players: RankedPlayer[];
  /** A bejelentkezett játékos helyzete (null, ha nincs bejelentkezve). */
  me: MyStanding | null;
}

/**
 * A ranglista élő adatai egy szűrőhöz. Feliratkozik a toplistára és a saját bejegyzésre,
 * így ha bárki (akár mi magunk) új pontot szerez, a lista és a saját helyezés is frissül.
 * Ha valaki nincs benne a toplistában, a helyezését külön számoljuk (hányan vannak előtte).
 */
export function useLeaderboard(scope: LeaderboardScope, uid: string | undefined): LeaderboardView {
  // Az állapotot a szűrőhöz kötjük, így szűrőváltáskor nem villan fel a régi lista.
  const [top, setTop] = useState<{
    scope: LeaderboardScope;
    players: LeaderboardPlayer[];
    revision: number;
  } | null>(null);
  const [failedScope, setFailedScope] = useState<LeaderboardScope | null>(null);
  const [mine, setMine] = useState<{ uid: string; player: LeaderboardPlayer | null } | null>(null);
  const [ahead, setAhead] = useState<{ key: string; count: number } | null>(null);

  useEffect(
    () =>
      getLeaderboardService().watchTop(
        scope,
        LEADERBOARD_LIMIT,
        (players) => {
          setTop((previous) => ({ scope, players, revision: (previous?.revision ?? 0) + 1 }));
          setFailedScope(null);
        },
        (error) => {
          log.error('A ranglista nem tölthető be', { scope, error });
          setFailedScope(scope);
        },
      ),
    [scope],
  );

  useEffect(() => {
    if (!uid) return undefined;
    return getLeaderboardService().watchPlayer(
      uid,
      (player) => setMine({ uid, player }),
      (error) => log.warn('A saját ranglista-bejegyzés nem tölthető be', { error }),
    );
  }, [uid]);

  const ready = top?.scope === scope;
  const players = useMemo(
    () => (top && top.scope === scope ? rankPlayers(top.players, scope) : []),
    [top, scope],
  );
  const myPlayer = uid && mine?.uid === uid ? mine.player : null;
  const myScore = myPlayer ? scoreFor(myPlayer, scope) : 0;
  const inList = uid ? players.find((player) => player.uid === uid) : undefined;

  // Ha nem vagyunk a toplistában, megszámoljuk, hányan vannak előttünk. Újraszámoljuk,
  // ha változik a saját pontunk vagy a toplista (valaki más szerzett pontot).
  const needsCount = ready && myScore > 0 && !inList;
  const countKey = `${scope}|${myScore}|${top?.revision ?? 0}`;
  useEffect(() => {
    if (!needsCount) return undefined;
    let cancelled = false;
    getLeaderboardService()
      .countPlayersAhead(scope, myScore)
      .then((count) => {
        if (!cancelled) setAhead({ key: countKey, count });
      })
      .catch((error: unknown) => log.warn('A saját helyezés nem számolható ki', { error }));
    return () => {
      cancelled = true;
    };
  }, [needsCount, countKey, scope, myScore]);

  const countedRank =
    needsCount && ahead?.key === countKey ? rankFromPlayersAhead(ahead.count) : null;

  return {
    status: failedScope === scope ? 'error' : ready ? 'ready' : 'loading',
    players,
    me: uid
      ? {
          player: myPlayer,
          score: myScore,
          rank: myScore > 0 ? (inList?.rank ?? countedRank) : null,
        }
      : null,
  };
}
