import { getSkyCultures, getStarCatalog } from '@/core/catalog';

import { buildPool, MAX_SEGMENTS, MIN_POOL, type GameConstellation } from './pool';

export interface PlayableCulture {
  id: string;
  name: string;
  lineColor: string;
  pool: GameConstellation[];
}

let cached: PlayableCulture[] | undefined;

function allCultures(): PlayableCulture[] {
  cached ??= getSkyCultures()
    .list()
    .map((culture) => ({
      id: culture.id,
      name: culture.name,
      lineColor: culture.lineColor,
      pool: buildPool(culture, getStarCatalog()),
    }));
  return cached;
}

/**
 * A játékra alkalmas égi kultúrák: azok, amelyekben legalább MIN_POOL, legfeljebb
 * `maxSegments` vonalból álló csillagkép van. Az alapkészlet egyszer számolódik ki.
 */
export function getPlayableCultures(maxSegments: number = MAX_SEGMENTS): PlayableCulture[] {
  return allCultures()
    .map((culture) => ({
      ...culture,
      pool: culture.pool.filter((c) => c.segments.length <= maxSegments),
    }))
    .filter((culture) => culture.pool.length >= MIN_POOL);
}
