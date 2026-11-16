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
import belarusianEnJson from '@/assets/data/cultures/en/belarusian.json';
import boorongEnJson from '@/assets/data/cultures/en/boorong.json';
import hawaiianEnJson from '@/assets/data/cultures/en/hawaiian.json';
import hungarianEnJson from '@/assets/data/cultures/en/hungarian.json';
import indianEnJson from '@/assets/data/cultures/en/indian.json';
import manchuEnJson from '@/assets/data/cultures/en/manchu.json';
import maoriEnJson from '@/assets/data/cultures/en/maori.json';
import mongolianEnJson from '@/assets/data/cultures/en/mongolian.json';
import norseEnJson from '@/assets/data/cultures/en/norse.json';
import romanianEnJson from '@/assets/data/cultures/en/romanian.json';
import samiEnJson from '@/assets/data/cultures/en/sami.json';
import samoanEnJson from '@/assets/data/cultures/en/samoan.json';
import seriEnJson from '@/assets/data/cultures/en/seri.json';
import tibetanEnJson from '@/assets/data/cultures/en/tibetan.json';
import tikunaEnJson from '@/assets/data/cultures/en/tikuna.json';
import tonganEnJson from '@/assets/data/cultures/en/tongan.json';
import tukanoEnJson from '@/assets/data/cultures/en/tukano.json';
import westernEnJson from '@/assets/data/cultures/en/western.json';

import type { SkyCulture } from '../models';
import { localizeCulture, type CatalogLocale, type CultureOverlay } from './localize';
import { StarCatalog, type RawStarCatalog } from './StarCatalog';
import { SkyCultureRepository } from './SkyCultureRepository';

export { StarCatalog, DEFAULT_BV, type RawStarCatalog } from './StarCatalog';
export { localizeCulture, type CatalogLocale, type CultureOverlay } from './localize';
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
const repositories = new Map<CatalogLocale, SkyCultureRepository>();

/*
 * Az angol fordítások az alapadat (magyar) fölé kerülnek; új kultúránál ide is fel kell venni
 * a hozzá tartozó assets/data/cultures/en/<id>.json fájlt.
 */
const OVERLAYS: Record<CatalogLocale, Record<string, CultureOverlay>> = {
  hu: {},
  en: {
    belarusian: belarusianEnJson as CultureOverlay,
    boorong: boorongEnJson as CultureOverlay,
    hawaiian: hawaiianEnJson as CultureOverlay,
    hungarian: hungarianEnJson as CultureOverlay,
    indian: indianEnJson as CultureOverlay,
    manchu: manchuEnJson as CultureOverlay,
    maori: maoriEnJson as CultureOverlay,
    mongolian: mongolianEnJson as CultureOverlay,
    norse: norseEnJson as CultureOverlay,
    romanian: romanianEnJson as CultureOverlay,
    sami: samiEnJson as CultureOverlay,
    samoan: samoanEnJson as CultureOverlay,
    seri: seriEnJson as CultureOverlay,
    tibetan: tibetanEnJson as CultureOverlay,
    tikuna: tikunaEnJson as CultureOverlay,
    tongan: tonganEnJson as CultureOverlay,
    tukano: tukanoEnJson as CultureOverlay,
    western: westernEnJson as CultureOverlay,
  },
};

/** A beépített csillagkatalógus (lustán, első használatkor töltődik be). */
export function getStarCatalog(): StarCatalog {
  catalog ??= StarCatalog.fromRaw(starsJson as unknown as RawStarCatalog);
  return catalog;
}

/** Az égi kultúrák az adott nyelven (nyelvenként egyszer épül fel). */
export function getSkyCultures(locale: CatalogLocale = 'hu'): SkyCultureRepository {
  let repository = repositories.get(locale);
  if (!repository) {
    const cultures = BUNDLED_CULTURES.map((culture) =>
      localizeCulture(culture, OVERLAYS[locale][culture.id], locale),
    );
    repository = new SkyCultureRepository(cultures, getStarCatalog());
    repositories.set(locale, repository);
  }
  return repository;
}
