import type { LineSegment } from '@/core/catalog';
import type { Star } from '@/core/models';

import { buildLineBuffer, buildStarBuffers, SKY_RADIUS } from '../skyBuffers';
import { bvToColor, starBrightness, starPointSize } from '../starAppearance';

describe('csillagok megjelenése', () => {
  it('a fényesebb csillag nagyobb és fényesebb', () => {
    expect(starPointSize(-1.4)).toBeGreaterThan(starPointSize(2));
    expect(starPointSize(2)).toBeGreaterThan(starPointSize(5));
    expect(starBrightness(1)).toBeGreaterThanOrEqual(starBrightness(5));
  });

  it('a méret és a fényerő korlátok között marad', () => {
    for (let mag = -2; mag <= 8; mag += 0.5) {
      expect(starPointSize(mag)).toBeGreaterThanOrEqual(1.6);
      expect(starPointSize(mag)).toBeLessThanOrEqual(9);
      expect(starBrightness(mag)).toBeGreaterThan(0);
      expect(starBrightness(mag)).toBeLessThanOrEqual(1);
    }
  });

  it('a forró csillag kékes, a hideg vöröses', () => {
    const [rHot, , bHot] = bvToColor(-0.3);
    const [rCool, , bCool] = bvToColor(1.6);
    expect(bHot).toBeGreaterThan(rHot);
    expect(rCool).toBeGreaterThan(bCool);
  });

  it('a színkomponensek 0 és 1 közé esnek, a táblán kívül is', () => {
    for (const bv of [-1, -0.4, 0.15, 0.65, 1.2, 2, 3]) {
      bvToColor(bv).forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      });
    }
  });
});

describe('GPU-pufferek', () => {
  const stars: Star[] = [
    { hip: 1, ra: 0, dec: 0, mag: 0, bv: 0 },
    { hip: 2, ra: 90, dec: 0, mag: 3, bv: 1 },
    { hip: 3, ra: 0, dec: 90, mag: 5, bv: 0.6 },
  ];

  it('csillagonként 3 koordinátát, 1 méretet és 3 színt ad', () => {
    const { positions, sizes, colors } = buildStarBuffers(stars);
    expect(positions).toHaveLength(9);
    expect(sizes).toHaveLength(3);
    expect(colors).toHaveLength(9);
  });

  it('a csillagok az égbolt-gömb felszínére kerülnek', () => {
    const { positions } = buildStarBuffers(stars);
    expect(positions[0]).toBeCloseTo(SKY_RADIUS); // ra=0, dec=0 → +x
    expect(positions[4]).toBeCloseTo(SKY_RADIUS); // ra=90 → +y
    expect(positions[8]).toBeCloseTo(SKY_RADIUS); // pólus → +z
  });

  it('szakaszonként 2 végpontot ad', () => {
    const segments: LineSegment[] = [
      { constellationId: 'a', from: stars[0], to: stars[1] },
      { constellationId: 'a', from: stars[1], to: stars[2] },
    ];
    expect(buildLineBuffer(segments)).toHaveLength(12);
  });
});
