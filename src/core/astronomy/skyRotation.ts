import type { GeoLocation, Mat3 } from '../models';
import { DEG } from './math';
import { localSiderealTime } from './siderealTime';

/**
 * Az égbolt-gömb forgatási mátrixa: egyenlítői egységvektor → világvektor.
 *
 * A csillagokat egyszer, az egyenlítői koordinátáik alapján tesszük fel a gömbre,
 * utána az egész gömböt ezzel az egyetlen mátrixszal forgatjuk. A mátrix csak
 * a helyi csillagidőtől és a földrajzi szélességtől függ.
 *
 * Levezetés: M = W · Rz(−LST), ahol Rz(−LST) az óraszög-rendszerbe forgat,
 * W pedig a (meridián, kelet, pólus) bázist a (kelet, zenit, dél) bázisra képzi.
 *
 * Megjegyzés: a precessziót nem számoljuk (2026-ban ez kb. 0,37° eltérés a J2000
 * koordinátákhoz képest) — szabad szemmel nem látható, később pontosítható.
 */
export function skyRotationMatrix(date: Date, location: GeoLocation): Mat3 {
  const lst = localSiderealTime(date, location.longitude) * DEG;
  const phi = location.latitude * DEG;
  const cL = Math.cos(lst);
  const sL = Math.sin(lst);
  const cP = Math.cos(phi);
  const sP = Math.sin(phi);

  // prettier-ignore
  return [
    -sL, cL, 0, // x: kelet
    cP * cL, cP * sL, sP, // y: zenit
    sP * cL, sP * sL, -cP, // z: dél (= −észak)
  ];
}
