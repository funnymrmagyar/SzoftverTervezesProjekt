import { mergePlayerProfiles, parsePlayerProfile, totalPlayerPoints } from '../PlayerProfile';

describe('játékosprofil modell', () => {
  it('csak a támogatott, érvényes rekordokat fogadja el', () => {
    expect(
      parsePlayerProfile(
        {
          displayName: 'Csillagnéző',
          scores: {
            'constellation-finder': 120,
            'star-connection': -4,
            unrelated: 99,
          },
          trophyIds: ['first-light', 2],
        },
        'user-1',
      ),
    ).toEqual({
      uid: 'user-1',
      displayName: 'Csillagnéző',
      scores: { 'constellation-finder': 120 },
      trophyIds: ['first-light'],
    });
  });

  it('összefésüli a legjobb rekordokat és a trófeákat', () => {
    const merged = mergePlayerProfiles(
      {
        uid: 'user-1',
        displayName: 'Local',
        scores: { 'constellation-finder': 150 },
        trophyIds: ['first-light'],
      },
      {
        uid: 'user-1',
        displayName: 'Remote',
        scores: { 'constellation-finder': 100, 'star-connection': 200 },
        trophyIds: ['first-light', 'explorer'],
      },
    );

    expect(merged).toEqual({
      uid: 'user-1',
      displayName: 'Remote',
      scores: { 'constellation-finder': 150, 'star-connection': 200 },
      trophyIds: ['first-light', 'explorer'],
    });
    expect(totalPlayerPoints(merged.scores)).toBe(350);
  });
});
