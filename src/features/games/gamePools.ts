import { getSkyCultures, getStarCatalog } from '@/core/catalog';

import { buildBeliefPool, type BeliefConstellation } from './beliefLogic';
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

export interface BeliefCulture extends PlayableCulture {
  /** A támponttal rendelkező csillagképek (a kérdések célpontjai). */
  beliefs: BeliefConstellation[];
}

/**
 * A „Hiedelem-találó” játékra alkalmas kultúrák: legalább MIN_POOL csillagképhez van 3–5 mondatos
 * leírás. A téves mintákat a kultúra teljes `pool`-jából választjuk.
 */
export function getBeliefCultures(): BeliefCulture[] {
  return allCultures()
    .map((culture) => ({ ...culture, beliefs: buildBeliefPool(culture.pool) }))
    .filter((culture) => culture.beliefs.length >= MIN_POOL);
}
