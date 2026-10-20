import starsJson from '@/assets/data/stars.json';
import westernJson from '@/assets/data/cultures/western.json';
import hungarianJson from '@/assets/data/cultures/hungarian.json';
import romanianJson from '@/assets/data/cultures/romanian.json';
import belarusianJson from '@/assets/data/cultures/belarusian.json';
import samiJson from '@/assets/data/cultures/sami.json';
import norseJson from '@/assets/data/cultures/norse.json';
import mongolianJson from '@/assets/data/cultures/mongolian.json';
import tibetanJson from '@/assets/data/cultures/tibetan.json';
import indianJson from '@/assets/data/cultures/indian.json';
import manchuJson from '@/assets/data/cultures/manchu.json';
import hawaiianJson from '@/assets/data/cultures/hawaiian.json';
import maoriJson from '@/assets/data/cultures/maori.json';
import samoanJson from '@/assets/data/cultures/samoan.json';
import tonganJson from '@/assets/data/cultures/tongan.json';
import boorongJson from '@/assets/data/cultures/boorong.json';
import seriJson from '@/assets/data/cultures/seri.json';
import tukanoJson from '@/assets/data/cultures/tukano.json';
import tikunaJson from '@/assets/data/cultures/tikuna.json';

import type { SkyCulture } from '../models';
import { StarCatalog, type RawStarCatalog } from './StarCatalog';
import { SkyCultureRepository } from './SkyCultureRepository';

export { StarCatalog, DEFAULT_BV, type RawStarCatalog } from './StarCatalog';
export { SkyCultureRepository, type LineSegment } from './SkyCultureRepository';

/*
 * A beépített adatok. A Metro csak statikus importot tud csomagolni, ezért
 * új kultúránál ide kell felvenni a JSON-t (a sorrend a választóban is ez lesz).
 */
const BUNDLED_CULTURES = [
  hungarianJson,
  westernJson,
  romanianJson,
  belarusianJson,
  samiJson,
  norseJson,
  mongolianJson,
  tibetanJson,
  indianJson,
  manchuJson,
  hawaiianJson,
  maoriJson,
  samoanJson,
  tonganJson,
  boorongJson,
  seriJson,
  tukanoJson,
  tikunaJson,
] as SkyCulture[];

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
