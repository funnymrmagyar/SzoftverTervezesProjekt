/**
 * A saját csillagászati kódot az astronomy-engine könyvtárhoz mint „orákulumhoz”
 * hasonlítjuk: ugyanarra a bemenetre közel azonos eredményt kell adnunk.
 */
import * as Astronomy from 'astronomy-engine';

import type { GeoLocation, Vec3 } from '../../models';
import {
  angleBetween,
  applyMat3,
  compassPoint,
  determinantMat3,
  equatorialToHorizontal,
  equatorialToVector,
  greenwichMeanSiderealTime,
  horizontalToVector,
  julianDate,
  localSiderealTime,
  multiplyMat3,
  normalizeDegrees,
  precessionMatrix,
  skyRotationMatrix,
  transposeMat3,
  vectorToHorizontal,
} from '..';

const BUDAPEST: GeoLocation = { latitude: 47.4979, longitude: 19.0402 };
const SYDNEY: GeoLocation = { latitude: -33.8688, longitude: 151.2093 };

const DATES = [
  new Date('2000-01-01T12:00:00Z'),
  new Date('2026-10-07T20:00:00Z'),
  new Date('2027-03-21T03:30:00Z'),
  new Date('2031-07-15T22:15:00Z'),
];

/** Néhány fényes csillag J2000 koordinátái (fok). */
const STARS = [
  { name: 'Sirius', ra: 101.2872, dec: -16.7161 },
  { name: 'Vega', ra: 279.2346, dec: 38.7837 },
  { name: 'Polaris', ra: 37.9463, dec: 89.2641 },
  { name: 'Canopus', ra: 95.988, dec: -52.6957 },
  { name: 'Betelgeuse', ra: 88.7929, dec: 7.4071 },
];

describe('normalizeDegrees', () => {
  it('a [0, 360) tartományba képez', () => {
    expect(normalizeDegrees(370)).toBeCloseTo(10);
    expect(normalizeDegrees(-30)).toBeCloseTo(330);
    expect(normalizeDegrees(720)).toBeCloseTo(0);
  });
});

describe('csillagidő', () => {
  it('J2000 epochán a Julián-dátum 2451545.0', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2451545.0, 6);
  });

  it.each(DATES)('a GMST egyezik az astronomy-engine értékével (%s)', (date) => {
    // Az astronomy-engine valódi (apparent) csillagidőt ad órában; a különbség
    // a nutáció miatt legfeljebb kb. 1,2 másodperc (≈ 0,005°).
    const expected = Astronomy.SiderealTime(date) * 15;
    const diff = Math.abs(normalizeDegrees(greenwichMeanSiderealTime(date) - expected + 180) - 180);
    expect(diff).toBeLessThan(0.01);
  });

  it('a helyi csillagidő a hosszúsággal tolódik', () => {
    const d = DATES[1];
    const diff = normalizeDegrees(
      localSiderealTime(d, BUDAPEST.longitude) - greenwichMeanSiderealTime(d),
    );
    expect(diff).toBeCloseTo(BUDAPEST.longitude, 6);
  });
});

describe('egyenlítői → horizontális', () => {
  const cases = DATES.flatMap((date) =>
    [BUDAPEST, SYDNEY].flatMap((loc) => STARS.map((star) => ({ date, loc, star }))),
  );

  it.each(cases)(
    '$star.name egyezik az astronomy-engine Horizon() eredményével',
    ({ date, loc, star }) => {
      const observer = new Astronomy.Observer(loc.latitude, loc.longitude, 0);
      const expected = Astronomy.Horizon(date, observer, star.ra / 15, star.dec);
      const lst = localSiderealTime(date, loc.longitude);
      const actual = equatorialToHorizontal(star, lst, loc.latitude);

      const err = angleBetween(horizontalToVector(actual), horizontalToVector(expected));
      expect(err).toBeLessThan(0.02);
    },
  );

  it('a Sarkcsillag magassága ≈ a földrajzi szélesség', () => {
    for (const date of DATES) {
      const lst = localSiderealTime(date, BUDAPEST.longitude);
      const { altitude } = equatorialToHorizontal(STARS[2], lst, BUDAPEST.latitude);
      expect(Math.abs(altitude - BUDAPEST.latitude)).toBeLessThan(1);
    }
  });

  it('delelőtt (óraszög = 0) a csillag délen delel', () => {
    const lst = 120;
    const { azimuth, altitude } = equatorialToHorizontal({ ra: 120, dec: 10 }, lst, 47.5);
    expect(azimuth).toBeCloseTo(180, 6);
    expect(altitude).toBeCloseTo(90 - 47.5 + 10, 6);
  });
});

describe('horizontális vektorok', () => {
  it('az égtájak a megbeszélt tengelyekre esnek', () => {
    const expectVec = (v: Vec3, e: Vec3) => v.forEach((x, i) => expect(x).toBeCloseTo(e[i], 9));
    expectVec(horizontalToVector({ azimuth: 0, altitude: 0 }), [0, 0, -1]); // észak = −z
    expectVec(horizontalToVector({ azimuth: 90, altitude: 0 }), [1, 0, 0]); // kelet = +x
    expectVec(horizontalToVector({ azimuth: 0, altitude: 90 }), [0, 1, 0]); // zenit = +y
  });

  it('vectorToHorizontal a horizontalToVector inverze', () => {
    for (const az of [0, 45, 135, 200, 359]) {
      for (const alt of [-20, 0, 33, 80]) {
        const back = vectorToHorizontal(horizontalToVector({ azimuth: az, altitude: alt }));
        expect(back.altitude).toBeCloseTo(alt, 9);
        expect(normalizeDegrees(back.azimuth - az + 180) - 180).toBeCloseTo(0, 9);
      }
    }
  });

  it('compassPoint magyar égtájakat ad', () => {
    expect(compassPoint(0)).toBe('É');
    expect(compassPoint(44)).toBe('ÉK');
    expect(compassPoint(180)).toBe('D');
    expect(compassPoint(272)).toBe('Ny');
    expect(compassPoint(350)).toBe('É');
  });
});

describe('égbolt-forgatási mátrix', () => {
  it.each(DATES)('valódi forgatás: ortonormált, determinánsa 1 (%s)', (date) => {
    const m = skyRotationMatrix(date, BUDAPEST);
    const identity = multiplyMat3(m, transposeMat3(m));
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(identity[i]).toBeCloseTo(v, 12));
    expect(determinantMat3(m)).toBeCloseTo(1, 12);
  });

  it('ugyanazt adja, mint a csillagonkénti átszámítás', () => {
    for (const date of DATES) {
      for (const loc of [BUDAPEST, SYDNEY]) {
        const m = skyRotationMatrix(date, loc);
        const lst = localSiderealTime(date, loc.longitude);
        for (const star of STARS) {
          const precessed = applyMat3(
            precessionMatrix(date),
            equatorialToVector(star.ra, star.dec),
          );
          const ra = normalizeDegrees((Math.atan2(precessed[1], precessed[0]) * 180) / Math.PI);
          const dec = (Math.asin(precessed[2] / Math.hypot(...precessed)) * 180) / Math.PI;
          const viaMatrix = applyMat3(m, equatorialToVector(star.ra, star.dec));
          const viaFormula = horizontalToVector(
            equatorialToHorizontal({ ra, dec }, lst, loc.latitude),
          );
          expect(angleBetween(viaMatrix, viaFormula)).toBeLessThan(1e-4);
        }
      }
    }
  });

  it('J2000 epochán a precessziós mátrix azonosság', () => {
    expect(precessionMatrix(new Date('2000-01-01T12:00:00Z'))).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it.each([
    new Date('2026-10-07T20:00:00Z'),
    new Date('2100-01-01T00:00:00Z'),
    new Date('2800-01-01T00:00:00Z'),
  ])('a precessziós bázisvektorok 0,05°-on belül egyeznek az astronomy-engine-nel (%s)', (date) => {
    const actual = precessionMatrix(date);
    const expected = Astronomy.Rotation_EQJ_EQD(date);
    for (const axis of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as Vec3[]) {
      const actualVector = applyMat3(actual, axis);
      const expectedVector = Astronomy.RotateVector(
        expected,
        new Astronomy.Vector(axis[0], axis[1], axis[2], Astronomy.MakeTime(date)),
      );
      expect(
        angleBetween(actualVector, [expectedVector.x, expectedVector.y, expectedVector.z]),
      ).toBeLessThan(0.05);
    }
  });

  it('a 2026-os tavaszpont iránya a J2000 tengelytől körülbelül 0,36°-kal tér el', () => {
    const matrix = precessionMatrix(DATES[1]);
    expect(angleBetween(applyMat3(matrix, [1, 0, 0]), [1, 0, 0])).toBeCloseTo(0.376, 2);
  });

  it('a pólus közelsége Thubanról a Polarisra vált', () => {
    const thuban = equatorialToVector(211.097, 64.375);
    const polaris = equatorialToVector(37.9463, 89.2641);
    const declination = (vector: Vec3, date: Date) => {
      const position = applyMat3(precessionMatrix(date), vector);
      return (Math.asin(position[2]) * 180) / Math.PI;
    };

    const ancientEpoch = new Date(-2800, 0, 1);
    const modernEpoch = new Date(2100, 0, 1);
    expect(declination(thuban, ancientEpoch)).toBeGreaterThan(89.8);
    expect(declination(thuban, ancientEpoch)).toBeGreaterThan(declination(polaris, ancientEpoch));
    expect(declination(polaris, modernEpoch)).toBeGreaterThan(89.5);
    expect(declination(polaris, modernEpoch)).toBeGreaterThan(declination(thuban, modernEpoch));
  });
});
