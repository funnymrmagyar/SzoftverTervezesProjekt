/**
 * Egy csillag a beépített katalógusból (HYG adatbázis alapján).
 * A koordináták J2000.0 egyenlítői koordináták, fokban.
 */
export interface Star {
  /** Hipparcos-azonosító — a csillagképvonalak erre hivatkoznak. */
  hip: number;
  /** Rektaszcenzió fokban (0–360). */
  ra: number;
  /** Deklináció fokban (−90–+90). */
  dec: number;
  /** Látszó fényrend (kisebb = fényesebb). */
  mag: number;
  /** B–V színindex; ebből jön a csillag színe. */
  bv: number;
  /** Tulajdonnév, ha van (pl. „Sirius”). */
  name?: string;
}
