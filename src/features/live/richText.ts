/*
 * A csillagkép-leírások egyszerű markdown szövegek (a Stellarium-forrásokból dőlt betűk,
 * félkövér és linkek jöhetnek). Ezt bontjuk bekezdésekre és formázott darabokra,
 * hogy sima React Native <Text>-tel megjeleníthessük, külső könyvtár nélkül.
 */

export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Félkövér (**x**), dőlt (_x_ vagy *x*) és link ([szöveg](url) → csak a szöveg). */
const INLINE = /\*\*([^*]+)\*\*|_([^_]+)_|\*([^*\s][^*]*)\*|\[([^\]]+)\]\([^)]*\)/g;

/** Egy bekezdés formázott darabokra bontása. */
export function parseInline(paragraph: string): TextSpan[] {
  const spans: TextSpan[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ text: paragraph.slice(last, index) });
    const [, bold, underscoreItalic, starItalic, linkText] = match;
    if (bold !== undefined) spans.push({ text: bold, bold: true });
    else if (underscoreItalic !== undefined) spans.push({ text: underscoreItalic, italic: true });
    else if (starItalic !== undefined) spans.push({ text: starItalic, italic: true });
    else spans.push({ text: linkText });
    last = index + match[0].length;
  }
  if (last < paragraph.length) spans.push({ text: paragraph.slice(last) });
  return spans;
}

/** Leírás → bekezdések (üres sorral elválasztva), bekezdésenként formázott darabokkal. */
export function parseDescription(text: string): TextSpan[][] {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0)
    .map(parseInline);
}
