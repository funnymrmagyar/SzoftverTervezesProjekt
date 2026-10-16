/**
 * Egy csillagkép (vagy népi alakzat) egy adott égi kultúrán belül.
 */
export interface Constellation {
  /** Kultúrán belül egyedi azonosító, pl. „UMa” vagy „gonc”. */
  id: string;
  /** Megjelenített (magyar) név. */
  name: string;
  /** Eredeti / anyanyelvi név, pl. latin „Ursa Major”. */
  nativeName?: string;
  /**
   * Vonallánc-lista Hipparcos-azonosítókkal.
   * Minden belső tömb egy töretlen vonal: [a, b, c] = a–b és b–c szakasz.
   */
  lines: number[][];
  /** Rövid leírás, legenda, hiedelem (markdown). */
  description?: string;
  /** A leírás nyelve (ISO 639-1), ha eltér a magyartól. */
  descriptionLang?: string;
}

/**
 * Egy égi kultúra: csillagképek és a hozzájuk tartozó tartalom.
 */
export interface SkyCulture {
  id: string;
  name: string;
  /** Rövid bemutatás a kultúraválasztóhoz. */
  summary: string;
  /** Honnan származnak az adatok. */
  source: string;
  license: string;
  /** A vonalak színe a nézetben (hex). */
  lineColor: string;
  constellations: Constellation[];
}
