import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';

import { rankFromPlayersAhead, rankPlayers, scoreFor } from '../ranking';

function player(
  uid: string,
  scores: LeaderboardPlayer['scores'],
  displayName = uid,
): LeaderboardPlayer {
  const points = Object.values(scores).reduce((sum, score) => sum + (score ?? 0), 0);
  return { uid, displayName, scores, points, trophyCount: 0 };
}

const anna = player('anna', { 'constellation-finder': 300, 'star-connection': 100 }, 'Anna');
const bela = player('bela', { 'star-connection': 500 }, 'Béla');
const cili = player('cili', { 'constellation-finder': 200, 'belief-guess': 200 }, 'Cili');
const dani = player('dani', {}, 'Dani');

describe('ranglista: rangsorolás', () => {
  it('összesítve pontszám szerint csökkenő sorrendbe tesz, 1-től számozva', () => {
    const ranked = rankPlayers([cili, anna, bela], 'all');
    expect(ranked.map((p) => [p.uid, p.rank, p.score])).toEqual([
      ['bela', 1, 500],
      ['anna', 2, 400],
      ['cili', 2, 400], // Anna és Cili holtversenyben
    ]);
  });

  it('holtversenyben azonos a helyezés, és a következő kimarad (1., 2., 2., 4.)', () => {
    const eva = player('eva', { 'belief-guess': 50 }, 'Éva');
    const ranked = rankPlayers([eva, cili, anna, bela], 'all');
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 2, 4]);
    // holtversenyen belül név szerint: Anna előbb, mint Cili
    expect(ranked.slice(1, 3).map((p) => p.displayName)).toEqual(['Anna', 'Cili']);
  });

  it('játékonkénti szűrésnél az adott játék legjobb pontja számít', () => {
    const ranked = rankPlayers([anna, bela, cili], 'constellation-finder');
    expect(ranked.map((p) => [p.uid, p.rank, p.score])).toEqual([
      ['anna', 1, 300],
      ['cili', 2, 200],
    ]);
  });

  it('akinek nincs pontja az adott szűrőben, nem kerül a listára', () => {
    expect(rankPlayers([dani], 'all')).toEqual([]);
    expect(rankPlayers([bela], 'belief-guess')).toEqual([]);
  });

  it('a listán kívüli helyezés (előttünk lévők + 1) egyezik a rangsorral', () => {
    const everyone = [anna, bela, cili];
    for (const ranked of rankPlayers(everyone, 'all')) {
      const ahead = everyone.filter((p) => scoreFor(p, 'all') > ranked.score).length;
      expect(rankFromPlayersAhead(ahead)).toBe(ranked.rank);
    }
  });
});
