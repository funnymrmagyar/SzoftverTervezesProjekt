import { getSkyCultures } from '..';

describe('angol katalógus', () => {
  const hu = getSkyCultures('hu').list();
  const en = getSkyCultures('en').list();

  it('ugyanazokat a kultúrákat és alakzatokat adja, mint a magyar', () => {
    expect(en.map((c) => c.id)).toEqual(hu.map((c) => c.id));
    for (const culture of hu) {
      const other = en.find((c) => c.id === culture.id)!;
      expect(other.constellations.map((c) => c.id)).toEqual(
        culture.constellations.map((c) => c.id),
      );
    }
  });

  it('minden kultúrának van angol neve és bemutatója', () => {
    for (const culture of en) {
      const base = hu.find((c) => c.id === culture.id)!;
      expect(culture.name).not.toBe(base.name);
      expect(culture.summary).not.toBe(base.summary);
    }
  });

  it('minden alakzat neve és leírása angol', () => {
    for (const culture of en) {
      const base = hu.find((c) => c.id === culture.id)!;
      for (const constellation of culture.constellations) {
        const original = base.constellations.find((c) => c.id === constellation.id)!;
        expect(constellation.descriptionLang).toBe('en');
        expect(constellation.description).not.toBe(original.description);
        expect(constellation.name.trim()).not.toBe('');
      }
    }
  });

  it('a magyar katalógusban minden leírás magyar (a nyugati kultúrában is)', () => {
    for (const culture of hu) {
      for (const constellation of culture.constellations) {
        expect(constellation.descriptionLang ?? 'hu').toBe('hu');
      }
    }
  });
});
