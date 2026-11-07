import type { GeoLocation, Mat3 } from '../models';
import { multiplyMat3, DEG } from './math';
import { precessionMatrix } from './precession';
import { localSiderealTime } from './siderealTime';

/**
 * Az égbolt-gömb forgatási mátrixa: egyenlítői egységvektor → világvektor.
 *
 * A katalógus J2000-es egyenlítői koordinátáit előrecesszáljuk az időpontra,
 * majd a horizontális koordináta-rendszerbe forgatjuk, csillagonkénti munka nélkül.
 *
 * Levezetés: M = W · Rz(−LST) · P, ahol P az IAU 2006 J2000 → dátum
 * precesszió, az első két tag pedig a dátum-egyenlítőről a horizontba forgat.
 */
export function skyRotationMatrix(date: Date, location: GeoLocation): Mat3 {
  const lst = localSiderealTime(date, location.longitude) * DEG;
  const phi = location.latitude * DEG;
  const cL = Math.cos(lst);
  const sL = Math.sin(lst);
  const cP = Math.cos(phi);
  const sP = Math.sin(phi);

  // prettier-ignore
  const horizonRotation: Mat3 = [
    -sL, cL, 0, // x: kelet
    cP * cL, cP * sL, sP, // y: zenit
    sP * cL, sP * sL, -cP, // z: dél (= −észak)
  ];
  return multiplyMat3(horizonRotation, precessionMatrix(date));
}
