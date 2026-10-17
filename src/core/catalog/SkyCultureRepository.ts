import type { Constellation, SkyCulture, Star } from '../models';
import type { StarCatalog } from './StarCatalog';

/** Egy csillagkép egyetlen vonalszakasza, feloldott csillagokkal. */
export interface LineSegment {
  constellationId: string;
  from: Star;
  to: Star;
}

/** Égi kultúrák elérése; a vonalak HIP-azonosítóit a katalógus alapján oldja fel. */
export class SkyCultureRepository {
  private readonly cultures: ReadonlyMap<string, SkyCulture>;

  constructor(
    cultures: SkyCulture[],
    private readonly catalog: StarCatalog,
  ) {
    this.cultures = new Map(cultures.map((c) => [c.id, c]));
  }

  list(): SkyCulture[] {
    return [...this.cultures.values()];
  }

  get(id: string): SkyCulture | undefined {
    return this.cultures.get(id);
  }

  getConstellation(cultureId: string, constellationId: string): Constellation | undefined {
    return this.get(cultureId)?.constellations.find((c) => c.id === constellationId);
  }

  /**
   * A kultúra összes vonalszakasza. A katalógusban nem szereplő csillagokat
   * tartalmazó szakaszokat kihagyja (ezeket a missingStars() jelzi).
   */
  lineSegments(cultureId: string): LineSegment[] {
    const culture = this.get(cultureId);
    if (!culture) return [];
    const segments: LineSegment[] = [];
    for (const con of culture.constellations) {
      for (const line of con.lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const from = this.catalog.get(line[i]);
          const to = this.catalog.get(line[i + 1]);
          if (from && to) segments.push({ constellationId: con.id, from, to });
        }
      }
    }
    return segments;
  }

  /** A kultúra vonalaiban hivatkozott, de a katalógusból hiányzó HIP-azonosítók. */
  missingStars(cultureId: string): number[] {
    const culture = this.get(cultureId);
    if (!culture) return [];
    const missing = new Set<number>();
    for (const con of culture.constellations) {
      for (const hip of con.lines.flat()) {
        if (!this.catalog.has(hip)) missing.add(hip);
      }
    }
    return [...missing];
  }

  /** A kultúra csillagképeiben szereplő csillagok azonosítói. */
  constellationStarHips(cultureId: string): Set<number> {
    const hips = new Set<number>();
    for (const con of this.get(cultureId)?.constellations ?? []) {
      for (const hip of con.lines.flat()) hips.add(hip);
    }
    return hips;
  }
}
