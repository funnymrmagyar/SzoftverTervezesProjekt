import { sharedAccountName } from '../accountName';

describe('megjelenített fióknév', () => {
  const base = {
    signedIn: true,
    username: null as string | null,
    leaderboardName: null as string | null,
    email: 'anna.kovacs@pelda.hu',
    nameResolved: true,
  };

  it('kijelentkezve nem ad vissza e-mailt', () => {
    expect(sharedAccountName({ ...base, signedIn: false, username: 'Anna' })).toBe('');
  });

  it('a megadott felhasználónév felülírja az e-mailt és a ranglista régi nevét', () => {
    expect(
      sharedAccountName({
        ...base,
        username: 'Csillag_1',
        leaderboardName: 'regi_nev',
      }),
    ).toBe('Csillag_1');
  });

  it('érvénytelen tárolt név helyett a ranglista valódi nevét használja', () => {
    expect(
      sharedAccountName({
        ...base,
        username: 'rossz név',
        leaderboardName: 'anna_k',
      }),
    ).toBe('anna_k');
  });

  it('a helyettesítő „Csillagnéző” nevet nem tekinti felhasználónévnek', () => {
    expect(
      sharedAccountName({
        ...base,
        leaderboardName: 'Csillagnéző',
      }),
    ).toBe('anna.kovacs');
  });

  it('név nélkül, betöltés után az e-mail elejét adja, hogy a két hely egyezzen', () => {
    expect(sharedAccountName(base)).toBe('anna.kovacs');
  });

  it('betöltés közben nem villantja fel az e-mailt', () => {
    expect(sharedAccountName({ ...base, nameResolved: false })).toBe('');
  });

  it('üres vagy hibás e-mailnél üres marad', () => {
    expect(sharedAccountName({ ...base, email: '   ' })).toBe('');
    expect(sharedAccountName({ ...base, email: null })).toBe('');
  });
});