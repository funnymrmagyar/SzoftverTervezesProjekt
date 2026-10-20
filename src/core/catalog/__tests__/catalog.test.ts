import type { SkyCulture } from '../../models';
import { getSkyCultures, getStarCatalog, SkyCultureRepository, StarCatalog } from '..';

describe('StarCatalog (beépített adatok)', () => {
  const catalog = getStarCatalog();

  it('nagyjából a szabad szemmel látható csillagokat tartalmazza', () => {
    expect(catalog.size).toBeGreaterThan(8000);
    expect(catalog.size).toBeLessThan(10000);
  });

  it('a Szíriusz a legfényesebb csillag', () => {
    const sirius = catalog.get(32349);
    expect(sirius?.name).toBe('Sirius');
    expect(sirius?.mag).toBeCloseTo(-1.44, 1);
    expect(catalog.all()[0].hip).toBe(32349);
  });

  it('név szerint is keres', () => {
    expect(catalog.findByName('vega')?.hip).toBe(91262);
    expect(catalog.findByName('nincs ilyen')).toBeUndefined();
  });

  it('minden csillag koordinátája érvényes', () => {
    for (const s of catalog.all()) {
      expect(s.ra).toBeGreaterThanOrEqual(0);
      expect(s.ra).toBeLessThan(360);
      expect(Math.abs(s.dec)).toBeLessThanOrEqual(90);
      expect(Number.isFinite(s.bv)).toBe(true);
    }
  });

  it('brighterThan szűr fényrendre', () => {
    const bright = catalog.brighterThan(1.5);
    expect(bright.length).toBeGreaterThan(15);
    expect(bright.every((s) => s.mag <= 1.5)).toBe(true);
  });
});

describe('égi kultúrák (adatintegritás)', () => {
  const repo = getSkyCultures();

  const ALL_CULTURES = [
    'hungarian',
    'western',
    'romanian',
    'belarusian',
    'sami',
    'norse',
    'mongolian',
    'tibetan',
    'indian',
    'manchu',
    'hawaiian',
    'maori',
    'samoan',
    'tongan',
    'boorong',
    'seri',
    'tukano',
    'tikuna',
  ];

  it('mind a 18 kultúra elérhető, a választó sorrendjében', () => {
    expect(repo.list().map((c) => c.id)).toEqual(ALL_CULTURES);
  });

  it('a nyugati kultúrában 88 csillagkép van, magyar nevekkel', () => {
    const western = repo.get('western')!;
    expect(western.constellations).toHaveLength(88);
    expect(repo.getConstellation('western', 'UMa')?.name).toBe('Nagy Medve');
    expect(repo.getConstellation('western', 'Ori')?.nativeName).toBe('Orion');
  });

  it.each(ALL_CULTURES)('a(z) %s kultúra minden vonalcsillaga szerepel a katalógusban', (id) => {
    expect(repo.missingStars(id)).toEqual([]);
  });

  it('a Göncölszekér 7 csillagból, 7 szakaszból áll', () => {
    const segments = repo.lineSegments('hungarian').filter((s) => s.constellationId === 'gonc');
    expect(segments).toHaveLength(7);
    const hips = new Set(segments.flatMap((s) => [s.from.hip, s.to.hip]));
    expect(hips.size).toBe(7);
  });

  it('a csillagkép-azonosítók kultúrán belül egyediek', () => {
    for (const culture of repo.list()) {
      const ids = culture.constellations.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('SkyCultureRepository (egységteszt kis adatokkal)', () => {
  const catalog = new StarCatalog([
    { hip: 1, ra: 0, dec: 0, mag: 1, bv: 0 },
    { hip: 2, ra: 10, dec: 0, mag: 2, bv: 0 },
    { hip: 3, ra: 20, dec: 0, mag: 3, bv: 0 },
  ]);
  const culture: SkyCulture = {
    id: 'test',
    name: 'Teszt',
    summary: '',
    source: '',
    license: '',
    lineColor: '#fff',
    constellations: [
      {
        id: 'a',
        name: 'A',
        lines: [
          [1, 2, 3],
          [3, 99],
        ],
      },
    ],
  };
  const repo = new SkyCultureRepository([culture], catalog);

  it('a vonalláncot szakaszokra bontja, a hiányzó csillagot kihagyja', () => {
    expect(repo.lineSegments('test').map((s) => [s.from.hip, s.to.hip])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(repo.missingStars('test')).toEqual([99]);
  });

  it('ismeretlen kultúrára üres eredményt ad', () => {
    expect(repo.get('nincs')).toBeUndefined();
    expect(repo.lineSegments('nincs')).toEqual([]);
  });
});
