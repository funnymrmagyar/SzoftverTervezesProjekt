import {
  equatorialToHorizontal,
  horizontalToVector,
  localSiderealTime,
  RAD,
  skyRotationMatrix,
} from '@/core/astronomy';
import { getSkyCultures, type LineSegment } from '@/core/catalog';
import type { Constellation, Mat3, Star, Vec3 } from '@/core/models';

import {
  constellationAnchors,
  layoutLabels,
  LABEL_LINE_HEIGHT,
  projectToScreen,
  type LabelAnchor,
} from '../labelLayout';

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const SCREEN = { width: 400, height: 800 };
const NORTH = { azimuth: 0, altitude: 0, fov: 60 };

const star = (hip: number, ra: number, dec: number): Star => ({ hip, ra, dec, mag: 1, bv: 0 });
const con = (id: string, name = id): Constellation => ({ id, name, lines: [] });

describe('csillagképnevek: a felirat helye', () => {
  it('a név a csillagok irányának átlagához kerül', () => {
    const segments: LineSegment[] = [
      { constellationId: 'a', from: star(1, 0, 0), to: star(2, 90, 0) },
    ];
    const [anchor] = constellationAnchors(segments, [con('a', 'Alfa')]);
    expect(anchor.name).toBe('Alfa');
    expect(anchor.direction[0]).toBeCloseTo(Math.SQRT1_2);
    expect(anchor.direction[1]).toBeCloseTo(Math.SQRT1_2);
    expect(anchor.direction[2]).toBeCloseTo(0);
  });

  it('a több vonalban szereplő csillag csak egyszer számít', () => {
    const a = star(1, 0, 0);
    const b = star(2, 10, 0);
    const c = star(3, 20, 0);
    const segments: LineSegment[] = [
      { constellationId: 'x', from: a, to: b },
      { constellationId: 'x', from: b, to: c },
    ];
    const [anchor] = constellationAnchors(segments, [con('x')]);
    expect(anchor.starCount).toBe(3);
    // a középső csillag irányába mutat (ra = 10°)
    expect(Math.atan2(anchor.direction[1], anchor.direction[0]) * RAD).toBeCloseTo(10);
  });

  it('a kultúra sorrendjét követi, a vonal nélküli csillagkép kimarad', () => {
    const segments: LineSegment[] = [
      { constellationId: 'b', from: star(1, 0, 0), to: star(2, 1, 0) },
      { constellationId: 'a', from: star(3, 5, 0), to: star(4, 6, 0) },
    ];
    const ids = constellationAnchors(segments, [con('a'), con('nincs'), con('b')]).map((x) => x.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('mindkét beépített kultúra minden csillagképének van felirata', () => {
    const repo = getSkyCultures();
    for (const culture of repo.list()) {
      const anchors = constellationAnchors(repo.lineSegments(culture.id), culture.constellations);
      expect(anchors).toHaveLength(culture.constellations.length);
    }
  });
});

describe('csillagképnevek: vetítés a képernyőre', () => {
  it('ami pont előttünk van, a képernyő közepére kerül', () => {
    const p = projectToScreen(horizontalToVector(NORTH), NORTH, SCREEN)!;
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(400);
  });

  it('északra nézve a kelet jobbra, a magasabb pont feljebb látszik', () => {
    const east = projectToScreen(horizontalToVector({ azimuth: 10, altitude: 0 }), NORTH, SCREEN)!;
    const up = projectToScreen(horizontalToVector({ azimuth: 0, altitude: 10 }), NORTH, SCREEN)!;
    expect(east.x).toBeGreaterThan(200);
    expect(up.y).toBeLessThan(400);
  });

  it('a kamera mögötti pont nem látszik', () => {
    expect(
      projectToScreen(horizontalToVector({ azimuth: 180, altitude: 0 }), NORTH, SCREEN),
    ).toBeNull();
  });

  it('a látómező (fov) függőleges: a széle pont a képernyő szélére esik', () => {
    // északra, a horizontra nézve, 60°-os látómezővel
    const top = projectToScreen(horizontalToVector({ azimuth: 0, altitude: 30 }), NORTH, SCREEN)!;
    expect(top.y).toBeCloseTo(0);

    // vízszintesen a látómező a képarány miatt keskenyebb: tan(fél) = tan(30°) · szélesség/magasság
    const halfH = Math.atan(Math.tan(30 / RAD) * (SCREEN.width / SCREEN.height)) * RAD;
    const edge = projectToScreen(
      horizontalToVector({ azimuth: halfH, altitude: 0 }),
      NORTH,
      SCREEN,
    )!;
    expect(edge.x).toBeCloseTo(SCREEN.width);
  });
});

describe('csillagképnevek: elrendezés', () => {
  const anchor = (id: string, direction: Vec3, starCount = 3): LabelAnchor => ({
    id,
    name: id,
    direction,
    starCount,
  });

  it('a horizont alatti és a képernyőn kívüli név nem látszik', () => {
    const labels = layoutLabels(
      [
        anchor('fent', horizontalToVector({ azimuth: 0, altitude: 5 })),
        anchor('lent', horizontalToVector({ azimuth: 0, altitude: -5 })),
        anchor('oldalt', horizontalToVector({ azimuth: 90, altitude: 5 })),
      ],
      IDENTITY,
      NORTH,
      SCREEN,
    );
    expect(labels.map((l) => l.id)).toEqual(['fent']);
  });

  it('az egymásra lógó nevek közül a kisebb csillagképé arrébb kerül', () => {
    const dir = horizontalToVector({ azimuth: 0, altitude: 10 });
    const labels = layoutLabels(
      [anchor('kicsi', dir, 3), anchor('nagy', dir, 4)],
      IDENTITY,
      NORTH,
      SCREEN,
    );
    const big = labels.find((l) => l.id === 'nagy')!;
    const small = labels.find((l) => l.id === 'kicsi')!;
    expect(small.x).toBeCloseTo(big.x);
    expect(Math.abs(small.y - big.y)).toBe(LABEL_LINE_HEIGHT);
  });

  it('valódi égbolton a csillagkép felé nézve a neve a képernyő közepére kerül', () => {
    // Független ellenőrzés: a horizontális koordinátákat a forgatási mátrix nélkül számoljuk.
    const date = new Date(Date.UTC(2026, 9, 19, 19, 0));
    const location = { latitude: 47.5, longitude: 19.04 };
    const repo = getSkyCultures();
    const culture = repo.get('hungarian')!;
    const anchors = constellationAnchors(repo.lineSegments('hungarian'), culture.constellations);
    const gonc = anchors.find((a) => a.id === 'gonc')!;

    const [x, y, z] = gonc.direction;
    const radec = { ra: Math.atan2(y, x) * RAD, dec: Math.asin(z) * RAD };
    const { azimuth, altitude } = equatorialToHorizontal(
      radec,
      localSiderealTime(date, location.longitude),
      location.latitude,
    );
    expect(altitude).toBeGreaterThan(0);

    const labels = layoutLabels(
      [gonc],
      skyRotationMatrix(date, location),
      { azimuth, altitude, fov: 60 },
      SCREEN,
    );
    expect(labels).toHaveLength(1);
    expect(labels[0].x).toBeCloseTo(200, 1);
    expect(labels[0].y).toBeCloseTo(400, 1);
  });
});
