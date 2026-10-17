import type { Star } from '../models';

/** A stars.json nyers formátuma (a scripts/build_star_catalog.py állítja elő). */
export interface RawStarCatalog {
  version: number;
  magLimit: number;
  /** [hip, ra, dec, mag, bv] — a bv lehet null, ha a HYG-ben nincs adat. */
  stars: [number, number, number, number, number | null][];
  names: Record<string, string>;
}

/** Ha nincs színindex, napszerű (sárgásfehér) színt feltételezünk. */
export const DEFAULT_BV = 0.65;

/** Csak olvasható csillagkatalógus, HIP-azonosító szerinti gyors kereséssel. */
export class StarCatalog {
  private readonly stars: readonly Star[];
  private readonly byHip: ReadonlyMap<number, Star>;

  constructor(stars: Star[]) {
    this.stars = stars;
    this.byHip = new Map(stars.map((s) => [s.hip, s]));
  }

  static fromRaw(raw: RawStarCatalog): StarCatalog {
    const stars = raw.stars.map(([hip, ra, dec, mag, bv]) => {
      const star: Star = { hip, ra, dec, mag, bv: bv ?? DEFAULT_BV };
      const name = raw.names[String(hip)];
      if (name) star.name = name;
      return star;
    });
    return new StarCatalog(stars);
  }

  get size(): number {
    return this.stars.length;
  }

  all(): readonly Star[] {
    return this.stars;
  }

  get(hip: number): Star | undefined {
    return this.byHip.get(hip);
  }

  has(hip: number): boolean {
    return this.byHip.has(hip);
  }

  /** Az adott fényrendnél fényesebb (vagy egyenlő) csillagok. */
  brighterThan(magLimit: number): Star[] {
    return this.stars.filter((s) => s.mag <= magLimit);
  }

  findByName(name: string): Star | undefined {
    const needle = name.trim().toLowerCase();
    return this.stars.find((s) => s.name?.toLowerCase() === needle);
  }
}
