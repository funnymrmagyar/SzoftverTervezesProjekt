import { normalizeDegrees } from './math';

/** A J2000.0 epocha Julián-dátuma. */
export const J2000 = 2451545.0;

/** Julián-dátum egy időpillanatból (UTC; a UT1−UTC eltérést elhanyagoljuk). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Greenwichi középcsillagidő (GMST) fokban.
 * IAU 1982-es képlet, ld. Meeus: Astronomical Algorithms, 12.4.
 */
export function greenwichMeanSiderealTime(date: Date): number {
  const jd = julianDate(date);
  const d = jd - J2000;
  const t = d / 36525;
  const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
  return normalizeDegrees(gmst);
}

/** Helyi csillagidő fokban. A hosszúság keleten pozitív. */
export function localSiderealTime(date: Date, longitude: number): number {
  return normalizeDegrees(greenwichMeanSiderealTime(date) + longitude);
}
