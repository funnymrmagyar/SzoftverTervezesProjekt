import type { StarCatalog } from '@/core/catalog/StarCatalog';
import type { SkyCulture, Star } from '@/core/models';

import { angularSeparationDeg, meanDirection } from './skyProjection';

/** Egy játszható csillagkép: feloldott csillagokkal és egyedi vonalszakaszokkal. */
export interface GameConstellation {
  cultureId: string;
  id: string;
  name: string;
  nativeName?: string;
  stars: Star[];
  /** Egyedi, irányítatlan vonalszakaszok (HIP-párok). */
  segments: [number, number][];
}

export const MIN_STARS = 3;
export const MIN_SEGMENTS = 2;
/** A játékokban szereplő alakzat legfeljebb ennyi vonalból állhat (az óriási alakzatokat kihagyjuk). */
export const MAX_SEGMENTS = 30;
/** A „Csillagról csillagra” játékban egy kör legfeljebb ennyi vonalból áll, hogy ne húzódjon el. */
export const MAX_CONNECT_SEGMENTS = 12;
/** Ennél nagyobb égi kiterjedésű alakzat torzulna a síkra vetítésnél. */
export const MAX_RADIUS_DEG = 45;
/** Legalább ennyi játszható csillagkép kell, hogy egy kultúra választható legyen. */
export const MIN_POOL = 4;

/** Két csillag vonalának irányfüggetlen kulcsa. */
export function segmentKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** A kultúra játszható csillagképei. A nevek a kultúrán belül egyediek. */
export function buildPool(culture: SkyCulture, catalog: Pick<StarCatalog, 'get'>): GameConstellation[] {
  const usedNames = new Set<string>();
  const pool: GameConstellation[] = [];

  for (const constellation of culture.constellations) {
    const segments = new Map<string, [number, number]>();
    const stars = new Map<number, Star>();

    for (const line of constellation.lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const starA = catalog.get(a);
        const starB = catalog.get(b);
        if (a === b || !starA || !starB) continue;
        const key = segmentKey(a, b);
        if (segments.has(key)) continue;
        segments.set(key, [a, b]);
        stars.set(a, starA);
        stars.set(b, starB);
      }
    }

    const starList = [...stars.values()];
    if (starList.length < MIN_STARS) continue;
    if (segments.size < MIN_SEGMENTS || segments.size > MAX_SEGMENTS) continue;
    const center = meanDirection(starList);
    if (starList.some((s) => angularSeparationDeg(center, s) > MAX_RADIUS_DEG)) continue;
    if (usedNames.has(constellation.name)) continue;
    usedNames.add(constellation.name);

    pool.push({
      cultureId: culture.id,
      id: constellation.id,
      name: constellation.name,
      nativeName: constellation.nativeName,
      stars: starList,
      segments: [...segments.values()],
    });
  }
  return pool;
}
