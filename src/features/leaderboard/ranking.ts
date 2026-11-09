import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import type { GameFilter } from '@/features/games/gameOptions';

/*
 * A ranglista rangsorolási szabályai — tiszta függvények, Firebase és React nélkül.
 *
 *  - Szűrő („scope”): „all” = az összesített pontszám (a játékonkénti legjobbak összege),
 *    vagy egy játék azonosítója = abban a játékban elért legjobb pontszám.
 *  - Sorrend: pontszám szerint csökkenő.
 *  - Holtverseny: azonos pontszám = azonos helyezés, és a következő helyezés kimarad
 *    (1., 2., 2., 4.). Holtversenyen belül a megjelenítési sorrend név szerinti, hogy stabil legyen.
 *  - Akinek az adott szűrőben nincs pontja (0), az nem kerül a ranglistára.
 */

export type LeaderboardScope = GameFilter;

export interface RankedPlayer extends LeaderboardPlayer {
  /** Helyezés (1-től), holtversenyben azonos. */
  rank: number;
  /** A pontszám az adott szűrőben (összesített vagy egy játéké). */
  score: number;
}

/** Egy játékos pontszáma az adott szűrőben. */
export function scoreFor(
  player: Pick<LeaderboardPlayer, 'points' | 'scores'>,
  scope: LeaderboardScope,
): number {
  return scope === 'all' ? player.points : (player.scores[scope] ?? 0);
}

/** A játékosok rangsora az adott szűrőben (ld. a fenti szabályokat). */
export function rankPlayers(
  players: readonly LeaderboardPlayer[],
  scope: LeaderboardScope,
): RankedPlayer[] {
  const scored = players
    .map((player) => ({ ...player, score: scoreFor(player, scope) }))
    .filter((player) => player.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.displayName.localeCompare(b.displayName, 'hu') ||
        a.uid.localeCompare(b.uid),
    );

  let rank = 0;
  return scored.map((player, index) => {
    if (index === 0 || player.score !== scored[index - 1].score) rank = index + 1;
    return { ...player, rank };
  });
}

/**
 * Helyezés abból, hány játékosnak van több pontja. Ugyanazt adja, mint a rankPlayers,
 * így a listán kívüli (pl. 50. hely utáni) saját helyezés is egyezik a szabályokkal.
 */
export function rankFromPlayersAhead(playersAhead: number): number {
  return playersAhead + 1;
}
