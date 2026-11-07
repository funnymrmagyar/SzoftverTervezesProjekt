import type { Mat3 } from '../models';
import { julianDate, J2000 } from './siderealTime';

const ARCSECONDS_TO_RADIANS = Math.PI / (180 * 3600);

function polynomial(coefficients: readonly number[], t: number): number {
  return coefficients.reduce((value, coefficient) => value * t + coefficient, 0) * t;
}

/** IAU 2006 P03 precession matrix from J2000 mean equator to mean equator of date. */
export function precessionMatrix(date: Date): Mat3 {
  const t = (julianDate(date) - J2000) / 36525;
  if (t === 0) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const epsilon = 84381.406 * ARCSECONDS_TO_RADIANS;
  const psi =
    polynomial([-0.0000000951, 0.000132851, -0.00114045, -1.0790069, 5038.481507], t) *
    ARCSECONDS_TO_RADIANS;
  const omega =
    (polynomial([0.0000003337, -0.000000467, -0.00772503, 0.0512623, -0.025754], t) + 84381.406) *
    ARCSECONDS_TO_RADIANS;
  const chi =
    polynomial([-0.000000056, 0.000170663, -0.00121197, -2.3814292, 10.556403], t) *
    ARCSECONDS_TO_RADIANS;

  const [sa, ca] = [Math.sin(epsilon), Math.cos(epsilon)];
  const [sb, cb] = [Math.sin(-psi), Math.cos(-psi)];
  const [sc, cc] = [Math.sin(-omega), Math.cos(-omega)];
  const [sd, cd] = [Math.sin(chi), Math.cos(chi)];

  const xx = cd * cb - sb * sd * cc;
  const yx = cd * sb * ca + sd * cc * cb * ca - sa * sd * sc;
  const zx = cd * sb * sa + sd * cc * cb * sa + ca * sd * sc;
  const xy = -sd * cb - sb * cd * cc;
  const yy = -sd * sb * ca + cd * cc * cb * ca - sa * cd * sc;
  const zy = -sd * sb * sa + cd * cc * cb * sa + ca * cd * sc;
  const xz = sb * sc;
  const yz = -sc * cb * ca - sa * cc;
  const zz = -sc * cb * sa + cc * ca;

  return [xx, yx, zx, xy, yy, zy, xz, yz, zz];
}
