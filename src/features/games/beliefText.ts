/**
 * A „Hiedelem-találó” játék szövegfeldolgozása: a csillagkép leírásából 3–5 mondatos,
 * a választ nem eláruló támpontot készít.
 */

export const BELIEF_MIN_SENTENCES = 3;
export const BELIEF_MAX_SENTENCES = 5;
/**
 * A támpont ennél hosszabb már nem fér el egy kis telefon képernyőjén görgetés nélkül, ezért a 3. mondat után
 * nem vesszük hozzá a következőt, ha túllépnénk ezt a hosszt.
 */
export const BELIEF_MAX_CHARS = 450;

/** Ennyi értelmes betű kell egy mondatban a maszkolás után, hogy támpontnak számítson. */
const MIN_MEANINGFUL_LETTERS = 15;
const MASK = '[…]';

/** Az alakzat neveit felsoroló mondatok: ezek elárulnák a választ. */
const NAME_LISTING =
  /(népi nev|\bnevei|\bneve\b|\bnevez|néven|\bnévvel|\bhívt|\bhívj|\bhívn|also known|known as|other names|\bcalled\b)/i;

/** A névből kihagyott, túl általános szavak (ezeket nem maszkoljuk külön). */
const GENERIC_WORDS = new Set([
  'része',
  'csillagkép',
  'csillagképe',
  'csillagok',
  'alakzat',
  'égbolt',
  'the',
  'part',
]);

/** Rövidítések, amelyek után a pont nem mondatvég. */
const ABBREVIATIONS = new Set([
  'szt',
  'dr',
  'kb',
  'pl',
  'stb',
  'ill',
  'vö',
  'st',
  'mr',
  'mrs',
  'vs',
  'ún',
  'ca',
]);

const isLetter = (ch: string): boolean => ch !== '' && ch.toLowerCase() !== ch.toUpperCase();
const isUpperOrDigit = (ch: string): boolean =>
  /\d/.test(ch) || /["„“‘(]/.test(ch) || (isLetter(ch) && ch === ch.toUpperCase());

/** A markdown-jelölések (kiemelés, link, címsor, idézet) eltávolítása. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#+\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2');
}

/**
 * Mondatokra bontás. Bekezdéshatáron mindig vág; mondatvég után csak akkor, ha a következő
 * szó nagybetűvel, számmal vagy idézőjellel kezdődik, és a pont nem rövidítésé vagy sorszámé.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    const flat = paragraph.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!flat) continue;
    let start = 0;
    const boundary = /[.!?…]+["”’)\]]*\s+/g;
    for (let m = boundary.exec(flat); m; m = boundary.exec(flat)) {
      const end = m.index + m[0].length;
      const next = flat.charAt(end);
      const before = flat.slice(start, m.index);
      const lastWord = (before.split(/\s+/).pop() ?? '').replace(/[^\p{L}\d]/gu, '');
      const isAbbreviation =
        ABBREVIATIONS.has(lastWord.toLowerCase()) ||
        /^\d+$/.test(lastWord) ||
        /^[IVXLCDM]+$/.test(lastWord) ||
        (lastWord.length === 1 && lastWord === lastWord.toUpperCase());
      if (
        !isUpperOrDigit(next) ||
        (m[0].startsWith('.') && m[0].trim() === '.' && isAbbreviation)
      ) {
        continue;
      }
      sentences.push(flat.slice(start, end).trim());
      start = end;
    }
    const rest = flat.slice(start).trim();
    if (rest) sentences.push(rest);
  }
  return sentences;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Az alakzat nevének változatai: a teljes név, a zárójeles részek és a megkülönböztető szavak. */
export function nameVariants(names: readonly (string | undefined)[]): string[] {
  const variants = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    const parts = [name.replace(/[()]/g, ' ')];
    const parenthetical = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
    parts.push(...parenthetical, name.replace(/\([^)]*\)/g, ' '));
    for (const part of parts) {
      const cleaned = part
        .split(/\s+/)
        .filter((word) => word && !GENERIC_WORDS.has(word.toLowerCase()))
        .join(' ');
      if (cleaned.length >= 4) variants.add(cleaned);
      for (const word of cleaned.split(/[\s:,]+/)) {
        if (word.length >= 5 && !GENERIC_WORDS.has(word.toLowerCase())) variants.add(word);
      }
    }
  }
  return [...variants].sort((a, b) => b.length - a.length);
}

/**
 * Kicseréli a megadott neveket (toldalékos alakjaikkal együtt) „[…]”-re,
 * csak szóhatáron kezdődő találatokat.
 */
export function maskNames(text: string, variants: readonly string[]): string {
  let result = text;
  for (const variant of variants) {
    const pattern = new RegExp(`${escapeRegExp(variant)}[^\\s.,;:!?()"„”“‘’–—-]*`, 'gi');
    result = result.replace(pattern, (match, offset: number, whole: string) =>
      isLetter(whole.charAt(offset - 1)) ? match : MASK,
    );
  }
  return result.replace(/(\[…\]\s*){2,}/g, `${MASK} `).replace(/\s+([.,;:!?])/g, '$1').trim();
}

const meaningfulLetters = (sentence: string): number =>
  [...sentence.replaceAll(MASK, '')].filter(isLetter).length;

/**
 * A leírásból támpont: legfeljebb 5 mondat, a név és a névfelsoroló mondatok nélkül.
 * null, ha nem marad legalább 3 értelmes mondat.
 */
export function beliefClue(constellation: {
  name: string;
  nativeName?: string;
  description?: string;
}): string[] | null {
  if (!constellation.description) return null;
  const variants = nameVariants([constellation.name, constellation.nativeName]);
  const sentences = splitSentences(stripMarkdown(constellation.description))
    .filter((sentence) => !NAME_LISTING.test(sentence))
    .map((sentence) => maskNames(sentence, variants))
    .filter((sentence) => meaningfulLetters(sentence) >= MIN_MEANINGFUL_LETTERS);
  if (sentences.length < BELIEF_MIN_SENTENCES) return null;

  const clue: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (clue.length >= BELIEF_MAX_SENTENCES) break;
    if (clue.length >= BELIEF_MIN_SENTENCES && length + sentence.length > BELIEF_MAX_CHARS) break;
    clue.push(sentence);
    length += sentence.length + 1;
  }
  return clue;
}
