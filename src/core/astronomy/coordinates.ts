import type { EquatorialCoords, HorizontalCoords, Vec3 } from '../models';
import { DEG, RAD, normalizeDegrees } from './math';

/*
 * Koordináta-rendszerek
 * ---------------------
 * Egyenlítői (J2000): x → tavaszpont, z → égi északi pólus.
 * Világ (three.js): x → kelet, y → zenit, −z → észak (a kamera alapból északra néz).
 */

/** Egyenlítői koordináták → egységvektor az egyenlítői rendszerben. */
export function equatorialToVector(ra: number, dec: number): Vec3 {
  const a = ra * DEG;
  const d = dec * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/**
 * Egyenlítői → horizontális koordináták.
 * @param lst helyi csillagidő fokban
 * @param latitude földrajzi szélesség fokban
 */
export function equatorialToHorizontal(
  { ra, dec }: EquatorialCoords,
  lst: number,
  latitude: number,
): HorizontalCoords {
  const h = (lst - ra) * DEG; // óraszög
  const d = dec * DEG;
  const phi = latitude * DEG;

  const sinAlt = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(h);
  const altitude = Math.asin(Math.min(1, Math.max(-1, sinAlt))) * RAD;

  const y = -Math.cos(d) * Math.sin(h);
  const x = Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(h);
  const azimuth = normalizeDegrees(Math.atan2(y, x) * RAD);

  return { azimuth, altitude };
}

/** Horizontális koordináták → egységvektor a világ (three.js) rendszerében. */
export function horizontalToVector({ azimuth, altitude }: HorizontalCoords): Vec3 {
  const a = azimuth * DEG;
  const h = altitude * DEG;
  return [Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h)];
}

/** Világvektor → horizontális koordináták (pl. a kamera nézési irányához). */
export function vectorToHorizontal(v: Vec3): HorizontalCoords {
  const len = Math.hypot(v[0], v[1], v[2]);
  const altitude = Math.asin(v[1] / len) * RAD;
  const azimuth = normalizeDegrees(Math.atan2(v[0], -v[2]) * RAD);
  return { azimuth, altitude };
}

const COMPASS_POINTS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'];

/** Azimut → magyar égtáj-rövidítés (8 irány). */
export function compassPoint(azimuth: number): string {
  const index = Math.round(normalizeDegrees(azimuth) / 45) % 8;
  return COMPASS_POINTS[index];
}
