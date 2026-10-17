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
          const viaMatrix = applyMat3(m, equatorialToVector(star.ra, star.dec));
          const viaFormula = horizontalToVector(equatorialToHorizontal(star, lst, loc.latitude));
          expect(angleBetween(viaMatrix, viaFormula)).toBeLessThan(1e-4);
        }
      }
    }
  });

  it('a precesszió miatti eltérés az astronomy-engine-hez képest 0,5° alatt marad', () => {
    // Az astronomy-engine a J2000 → horizontális forgatásban a precessziót is számolja.
    const date = DATES[1];
    const observer = new Astronomy.Observer(BUDAPEST.latitude, BUDAPEST.longitude, 0);
    const rot = Astronomy.Rotation_EQJ_HOR(date, observer);
    const m = skyRotationMatrix(date, BUDAPEST);
    for (const star of STARS) {
      const e = equatorialToVector(star.ra, star.dec);
      // Az astronomy-engine HOR rendszere: x = észak, y = nyugat, z = zenit.
      const h = Astronomy.RotateVector(
        rot,
        new Astronomy.Vector(e[0], e[1], e[2], Astronomy.MakeTime(date)),
      );
      const expected: Vec3 = [-h.y, h.z, -h.x];
      expect(angleBetween(applyMat3(m, e), expected)).toBeLessThan(0.5);
    }
  });
});
