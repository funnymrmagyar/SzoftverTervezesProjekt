import {
  MAX_STORED_DAYS,
  createEmptyStats,
  currentDayStreak,
  dayKey,
  parsePlayerStats,
  recordRunInStats,
} from '../playerStats';

describe('játékstatisztika', () => {
  it('a kör rögzítése növeli a számlálókat, a napot csak egyszer jegyzi fel', () => {
    let stats = recordRunInStats(createEmptyStats(), 'belief-guess', '2026-11-09');
    stats = recordRunInStats(stats, 'belief-guess', '2026-11-09');
    stats = recordRunInStats(stats, 'star-connection', '2026-11-10');

    expect(stats).toEqual({
      gamesPlayed: 3,
      plays: { 'belief-guess': 2, 'star-connection': 1 },
      days: ['2026-11-09', '2026-11-10'],
    });
  });

  it('csak az utolsó napokat tárolja', () => {
    let stats = createEmptyStats();
    for (let day = 0; day < MAX_STORED_DAYS + 5; day += 1) {
      const date = new Date(2026, 0, 1 + day);
      stats = recordRunInStats(stats, 'belief-guess', dayKey(date));
    }
    expect(stats.days).toHaveLength(MAX_STORED_DAYS);
    expect(stats.days[stats.days.length - 1]).toBe(dayKey(new Date(2026, 0, MAX_STORED_DAYS + 5)));
  });

  it('a sorozat hónap- és évhatáron is folytonos', () => {
    expect(currentDayStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01')).toBe(3);
    expect(currentDayStreak(['2026-12-30', '2027-01-01'], '2027-01-01')).toBe(1);
    expect(currentDayStreak([], '2027-01-01')).toBe(0);
  });

  it('a dayKey helyi naptári napot ad', () => {
    expect(dayKey(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(dayKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('a hibás tárolt adatot eldobja', () => {
    expect(parsePlayerStats(null)).toEqual(createEmptyStats());
    expect(
      parsePlayerStats({
        gamesPlayed: 'sok',
        plays: { 'belief-guess': 2, ismeretlen: 5, 'star-connection': -1 },
        days: ['2026-11-09', 'holnap', 7, '2026-11-09'],
      }),
    ).toEqual({ gamesPlayed: 2, plays: { 'belief-guess': 2 }, days: ['2026-11-09'] });
  });
});
