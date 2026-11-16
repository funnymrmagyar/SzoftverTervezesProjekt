import type { Constellation, SkyCulture } from '../models';

/** A katalógus nyelvei; a beépített (alap) adatok magyarok. */
export type CatalogLocale = 'hu' | 'en';

export const BASE_CATALOG_LOCALE: CatalogLocale = 'hu';

export interface ConstellationOverlay {
  name?: string;
  nativeName?: string;
  description?: string;
}

/**
 * Egy kultúra fordítása az alapadat fölött (assets/data/cultures/<nyelv>/<kultúra>.json).
 * Ami hiányzik belőle, az az alapadatból (magyarul) marad, így a hiányos fordítás sem tör el semmit.
 */
export interface CultureOverlay {
  name?: string;
  summary?: string;
  constellations?: Record<string, ConstellationOverlay>;
}

function localizeConstellation(
  base: Constellation,
  overlay: ConstellationOverlay | undefined,
  locale: CatalogLocale,
): Constellation {
  if (!overlay) return base;
  const localized: Constellation = { ...base };
  if (overlay.name) localized.name = overlay.name;
  if (overlay.nativeName) localized.nativeName = overlay.nativeName;
  if (overlay.description) {
    localized.description = overlay.description;
    localized.descriptionLang = locale;
  }
  return localized;
}

/** A kultúra neveinek, bemutatójának és leírásainak lecserélése a megadott nyelvű fordításra. */
export function localizeCulture(
  base: SkyCulture,
  overlay: CultureOverlay | undefined,
  locale: CatalogLocale,
): SkyCulture {
  if (!overlay || locale === BASE_CATALOG_LOCALE) return base;
  return {
    ...base,
    name: overlay.name ?? base.name,
    summary: overlay.summary ?? base.summary,
    constellations: base.constellations.map((constellation) =>
      localizeConstellation(constellation, overlay.constellations?.[constellation.id], locale),
    ),
  };
}
