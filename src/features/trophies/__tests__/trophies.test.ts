import {
  ALL_ROUNDER_SCORE,
  ASTRONOMER_TOTAL,
  HARD_RUN_SCORE,
  MASTER_SCORE,
  TROPHIES,
  TROPHY_IDS,
  evaluateNewTrophies,
  type TrophyContext,
} from '../trophies';
import { createEmptyStats, recordRunInStats, type PlayerStats } from '../playerStats';

function context(overrides: Partial<TrophyContext> = {}): TrophyContext {
  return {
    stats: recordRunInStats(createEmptyStats(), 'constellation-finder', '2026-11-09'),
    scores: { 'constellation-finder': 100 },
    today: '2026-11-09',
    run: {
      game: 'constellation-finder',
      score: 100,
      difficulty: 'easy',
      correctCount: 3,
      rounds: 10,
    },
    ...overrides,
  };
}

function ids(ctx: TrophyContext, earned: string[] = []): string[] {
  return evaluateNewTrophies(ctx, earned).map((trophy) => trophy.id);
}

describe('trófeakatalógus', () => {
  it('egyedi azonosítókat és kitöltött leírásokat tartalmaz', () => {
    expect(new Set(TROPHY_IDS).size).toBe(TROPHIES.length);
    for (const trophy of TROPHIES) {
      expect(trophy.title.length).toBeGreaterThan(0);
      expect(trophy.description.length).toBeGreaterThan(0);
    }
  });
});

describe('trófeák megszerzése', () => {
  it('az első játék után csak az Első fény jár', () => {
    expect(ids(context())).toEqual(['first-light']);
  });

  it('az Éles szem a kérdések feléhez, a Hibátlan mindegyikhez kell', () => {
    const half = context({ run: { game: 'belief-guess', score: 0, correctCount: 5, rounds: 10 } });
    expect(ids(half)).toContain('sharp-eye');
    expect(ids(half)).not.toContain('flawless');

    const perfect = context({
      run: { game: 'belief-guess', score: 0, correctCount: 10, rounds: 10 },
    });
    expect(ids(perfect)).toEqual(expect.arrayContaining(['sharp-eye', 'flawless']));
  });

  it('a pontozásos játékokra (nincs correctCount) nem ad Hibátlan trófeát', () => {
    const ctx = context({ run: { game: 'star-connection', score: 400, rounds: 5 } });
    expect(ids(ctx)).not.toContain('flawless');
    expect(ids(ctx)).not.toContain('sharp-eye');
  });

  it('a Nehéz terep csak nehéz fokozaton, elég ponttal jár', () => {
    const run = { game: 'star-connection' as const, score: HARD_RUN_SCORE, rounds: 5 };
    expect(ids(context({ run: { ...run, difficulty: 'hard' } }))).toContain('hard-terrain');
    expect(ids(context({ run: { ...run, difficulty: 'easy' } }))).not.toContain('hard-terrain');
    expect(
      ids(context({ run: { ...run, difficulty: 'hard', score: HARD_RUN_SCORE - 1 } })),
    ).not.toContain('hard-terrain');
  });

  it('a Felfedezőhöz mindhárom játék kell, a korábbi legjobb pontszám is számít', () => {
    const stats: PlayerStats = {
      gamesPlayed: 2,
      plays: { 'constellation-finder': 1, 'star-connection': 1 },
      days: ['2026-11-09'],
    };
    expect(ids(context({ stats, scores: {} }))).not.toContain('explorer');
    expect(ids(context({ stats, scores: { 'belief-guess': 50 } }))).toContain('explorer');
  });

  it('a pontküszöbös trófeák a legjobb eredményekből számolnak', () => {
    expect(ids(context({ scores: { 'belief-guess': MASTER_SCORE } }))).toContain('master-observer');
    expect(ids(context({ scores: { 'belief-guess': MASTER_SCORE - 1 } }))).not.toContain(
      'master-observer',
    );

    const all = {
      'constellation-finder': ALL_ROUNDER_SCORE,
      'star-connection': ALL_ROUNDER_SCORE,
      'belief-guess': ALL_ROUNDER_SCORE,
    };
    expect(ids(context({ scores: all }))).toContain('all-rounder');
    expect(
      ids(context({ scores: { ...all, 'belief-guess': ALL_ROUNDER_SCORE - 1 } })),
    ).not.toContain('all-rounder');

    const total = {
      'constellation-finder': ASTRONOMER_TOTAL / 2,
      'belief-guess': ASTRONOMER_TOTAL / 2,
    };
    expect(ids(context({ scores: total }))).toContain('astronomer');
  });

  it('a játékszám-trófeák 10 és 30 játéknál járnak', () => {
    const stats = (gamesPlayed: number): PlayerStats => ({
      gamesPlayed,
      plays: { 'constellation-finder': gamesPlayed },
      days: ['2026-11-09'],
    });
    expect(ids(context({ stats: stats(9) }))).not.toContain('stargazer');
    expect(ids(context({ stats: stats(10) }))).toContain('stargazer');
    expect(ids(context({ stats: stats(29) }))).not.toContain('regular');
    expect(ids(context({ stats: stats(30) }))).toContain('regular');
  });

  it('a Holdjáró három különböző napot, a Sorozat hét egymást követőt kér', () => {
    const days = (list: string[]): PlayerStats => ({
      gamesPlayed: list.length,
      plays: { 'constellation-finder': list.length },
      days: list,
    });
    expect(ids(context({ stats: days(['2026-11-01', '2026-11-05', '2026-11-09']) }))).toContain(
      'moon-walker',
    );
    expect(ids(context({ stats: days(['2026-11-08', '2026-11-09']) }))).not.toContain(
      'moon-walker',
    );

    const week = ['03', '04', '05', '06', '07', '08', '09'].map((d) => `2026-11-${d}`);
    expect(ids(context({ stats: days(week) }))).toContain('streak');
    const gap = ['03', '04', '05', '07', '08', '09'].map((d) => `2026-11-${d}`);
    expect(ids(context({ stats: days(gap) }))).not.toContain('streak');
  });

  it('a már megszerzett trófeát nem jelzi újra', () => {
    expect(ids(context(), ['first-light'])).toEqual([]);
  });
});
