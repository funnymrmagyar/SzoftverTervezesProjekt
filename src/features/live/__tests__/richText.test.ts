import { getSkyCultures } from '@/core/catalog';

import { parseDescription, parseInline } from '../richText';

describe('csillagkép-leírás formázása', () => {
  it('bekezdésekre bont, a sortöréseket szóközzé alakítja', () => {
    const paragraphs = parseDescription('Első sor\nfolytatás.\n\nMásodik bekezdés.');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toEqual([{ text: 'Első sor folytatás.' }]);
  });

  it('felismeri a dőlt, a félkövér szöveget és a linket', () => {
    expect(parseInline('_Orion_ a **vadász**, ld. [Stellarium](https://stellarium.org).')).toEqual([
      { text: 'Orion', italic: true },
      { text: ' a ' },
      { text: 'vadász', bold: true },
      { text: ', ld. ' },
      { text: 'Stellarium' },
      { text: '.' },
    ]);
    expect(parseInline('a *Fiastyúk* csillagai')).toEqual([
      { text: 'a ' },
      { text: 'Fiastyúk', italic: true },
      { text: ' csillagai' },
    ]);
  });

  it('a HTML-címkéket elhagyja, a <br>-t sortörésnek veszi', () => {
    expect(parseDescription('egy<br/>kettő <b>három</b>')).toEqual([[{ text: 'egy kettő három' }]]);
  });

  it('üres leírásból nem lesz bekezdés', () => {
    expect(parseDescription('  \n\n ')).toEqual([]);
  });

  it('minden beépített leírás formázható, és nem marad benne jelölés', () => {
    for (const culture of getSkyCultures().list()) {
      for (const c of culture.constellations) {
        if (!c.description) continue;
        const text = parseDescription(c.description)
          .flat()
          .map((s) => s.text)
          .join('');
        expect(text).not.toMatch(/\]\(|\*\*|<\w/);
      }
    }
  });
});
