/** Megfigyelési hely a Földön. */
export interface GeoLocation {
  /** Földrajzi szélesség fokban, északon pozitív. */
  latitude: number;
  /** Földrajzi hosszúság fokban, keleten pozitív. */
  longitude: number;
  /** Megjelenítéshez: „GPS”, „Budapest” stb. */
  label?: string;
}

/** Horizontális (alt-azimutális) koordináták fokban. */
export interface HorizontalCoords {
  /** Azimut: északtól keletre mérve, 0–360. */
  azimuth: number;
  /** Magasság a horizont felett, −90–+90. */
  altitude: number;
}

/** Egyenlítői koordináták fokban. */
export interface EquatorialCoords {
  ra: number;
  dec: number;
}

/** 3D vektor (a renderelő réteg ebből készít THREE.Vector3-at). */
export type Vec3 = [number, number, number];

/** 3×3 mátrix sorfolytonosan (row-major), 9 elem. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];
