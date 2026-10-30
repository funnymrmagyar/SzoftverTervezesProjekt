import {
  equatorialToHorizontal,
  equatorialToVector,
  horizontalToVector,
  localSiderealTime,
  RAD,
  skyRotationMatrix,
} from '@/core/astronomy';
import { getSkyCultures, type LineSegment } from '@/core/catalog';
import type { Mat3, Star } from '@/core/models';

import { distanceToSegment, hitTestConstellation, TAP_RADIUS } from '../hitTest';
import { constellationAnchors, projectToScreen } from '../labelLayout';

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const SCREEN = { width: 400, height: 800 };
const NORTH = { azimuth: 0, altitude: 20, fov: 60 };

/**
 * Az IDENTITY mátrixszal az „egyenlítői” irány maga a világirány, így a csillagot
 * közvetlenül horizontális koordinátával adhatjuk meg.
 */
function starAt(hip: number, azimuth: number, altitude: number): Star {
  const [x, y, z] = horizontalToVector({ azimuth, altitude });
  return {
    hip,
    ra: Math.atan2(y, x) * RAD,
    dec: Math.asin(z) * RAD,
    mag: 1,
    bv: 0,
  };
}

const screenOf = (star: Star) =>
  projectToScreen(equatorialToVector(star.ra, star.dec), NORTH, SCREEN)!;

describe('koppintás: távolság a szakasztól', () => {
  it('a szakasz belsejében merőlegesen, a végein túl a végponttól mér', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBeCloseTo(5);
    expect(distanceToSegment({ x: 2, y: 2 }, a, a)).toBeCloseTo(Math.SQRT2 * 2);
  });
});

describe('koppintás: melyik csillagkép?', () => {
  const a1 = starAt(1, -5, 20);
  const a2 = starAt(2, 5, 20);
  const b1 = starAt(3, -5, 30);
  const b2 = starAt(4, 5, 30);
  const low1 = starAt(5, -5, -10);
  const low2 = starAt(6, 5, -10);
  const segments: LineSegment[] = [
    { constellationId: 'A', from: a1, to: a2 },
    { constellationId: 'B', from: b1, to: b2 },
    { constellationId: 'LOW', from: low1, to: low2 },
  ];
  const hit = (x: number, y: number) =>
    hitTestConstellation({ x, y }, segments, [], IDENTITY, NORTH, SCREEN);

  it('a vonalra koppintva az adott csillagképet adja', () => {
    const p = screenOf(a1);
    const q = screenOf(a2);
    expect(hit((p.x + q.x) / 2, (p.y + q.y) / 2)).toBe('A');
    const r = screenOf(b1);
    expect(hit(r.x + 3, r.y + 2)).toBe('B');
  });

  it('két vonal között a közelebbit választja', () => {
    const a = screenOf(a1);
    const b = screenOf(b1);
    expect(hit(a.x, a.y - 5)).toBe('A');
    expect(hit(b.x, b.y + 5)).toBe('B');
  });

  it('üres égen és a horizont alatti vonalon nincs találat', () => {
    expect(hit(5, 5)).toBeNull();
    const l = screenOf(low1);
    expect(hit(l.x, l.y)).toBeNull();
  });

  it('a távolabbi koppintás nem számít, a közeli igen', () => {
    const a = screenOf(a1);
    expect(hit(a.x - TAP_RADIUS - 6, a.y)).toBeNull();
    expect(hit(a.x - TAP_RADIUS + 6, a.y)).toBe('A');
  });

  it('a feliratra koppintás elsőbbséget élvez a vonalakkal szemben', () => {
    const a = screenOf(a1);
    const label = { id: 'B', name: 'Bé', x: a.x, y: a.y };
    expect(
      hitTestConstellation({ x: a.x, y: a.y }, segments, [label], IDENTITY, NORTH, SCREEN),
    ).toBe('B');
  });

  it('az egycsillagos alakzat magára a csillagra koppintva választható', () => {
    const single = starAt(7, 0, 40);
    const s = screenOf(single);
    expect(
      hitTestConstellation(
        { x: s.x + 4, y: s.y - 3 },
        [{ constellationId: 'ONE', from: single, to: single }],
        [],
        IDENTITY,
        NORTH,
        SCREEN,
      ),
    ).toBe('ONE');
  });

  it('valódi égbolton a Göncölszekér közepére nézve és koppintva a Göncölszekeret adja', () => {
    const date = new Date(Date.UTC(2026, 9, 30, 19, 0));
    const location = { latitude: 47.5, longitude: 19.04 };
    const repo = getSkyCultures();
    const segments = repo.lineSegments('hungarian');
    const gonc = constellationAnchors(segments, repo.get('hungarian')!.constellations).find(
      (x) => x.id === 'gonc',
    )!;
    const [x, y, z] = gonc.direction;
    const { azimuth, altitude } = equatorialToHorizontal(
      { ra: Math.atan2(y, x) * RAD, dec: Math.asin(z) * RAD },
      localSiderealTime(date, location.longitude),
      location.latitude,
    );
    // a szekér közepe a négyszög belsejébe esik; a legközelebbi vonal is a Göncölé
    const view = { azimuth, altitude, fov: 40 };
    const matrix = skyRotationMatrix(date, location);
    const found = hitTestConstellation(
      { x: SCREEN.width / 2, y: SCREEN.height / 2 },
      segments,
      [],
      matrix,
      view,
      SCREEN,
      80,
    );
    expect(found).toBe('gonc');
  });
});
