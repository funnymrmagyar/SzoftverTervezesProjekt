import starsJson from '@/assets/data/stars.json';
import westernJson from '@/assets/data/cultures/western.json';
import hungarianJson from '@/assets/data/cultures/hungarian.json';

import type { SkyCulture } from '../models';
import { StarCatalog, type RawStarCatalog } from './StarCatalog';
import { SkyCultureRepository } from './SkyCultureRepository';

export { StarCatalog, DEFAULT_BV, type RawStarCatalog } from './StarCatalog';
export { SkyCultureRepository, type LineSegment } from './SkyCultureRepository';

/*
 * A beépített adatok. A Metro csak statikus importot tud csomagolni, ezért
 * új kultúránál ide kell felvenni a JSON-t (a sorrend a választóban is ez lesz).
 */
const BUNDLED_CULTURES = [hungarianJson, westernJson] as SkyCulture[];

let catalog: StarCatalog | undefined;
let repository: SkyCultureRepository | undefined;

/** A beépített csillagkatalógus (lustán, első használatkor töltődik be). */
export function getStarCatalog(): StarCatalog {
  catalog ??= StarCatalog.fromRaw(starsJson as unknown as RawStarCatalog);
  return catalog;
}

export function getSkyCultures(): SkyCultureRepository {
  repository ??= new SkyCultureRepository(BUNDLED_CULTURES, getStarCatalog());
  return repository;
}
