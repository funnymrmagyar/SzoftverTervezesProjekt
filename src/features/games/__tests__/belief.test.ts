import {
  BELIEF_MAX_CHARS,
  BELIEF_MAX_SENTENCES,
  BELIEF_MIN_SENTENCES,
  beliefClue,
  maskNames,
  nameVariants,
  splitSentences,
  stripMarkdown,
} from '../beliefText';
import {
  BELIEF_OPTIONS,
  beliefPoints,
  buildBeliefPool,
  buildBeliefQuestions,
  visibleClue,
} from '../beliefLogic';
import { getBeliefCultures } from '../gamePools';
import { MIN_POOL } from '../pool';
import { createRng } from '../random';

describe('mondatokra bontás', () => {
  it('mondatvégen és bekezdéshatáron vág', () => {
    expect(splitSentences('Első mondat. Második mondat? Harmadik!')).toEqual([
      'Első mondat.',
      'Második mondat?',
      'Harmadik!',
    ]);
    expect(splitSentences('Egy bekezdés pont nélkül\n\nMásik bekezdés.')).toEqual([
      'Egy bekezdés pont nélkül',
      'Másik bekezdés.',
    ]);
  });

  it('nem vág rövidítés, sorszám vagy kisbetűs folytatás előtt', () => {
    const abbreviation = 'A távolságot kb. ötször kell meghosszabbítani. Utána látod.';
    expect(splitSentences(abbreviation)).toHaveLength(2);
    expect(splitSentences('Szt. László szekere is volt. Másik név.')).toHaveLength(2);
    expect(splitSentences('II. Rákóczi Ferenc ide nézett. Másik mondat.')).toHaveLength(2);
  });

  it('a markdown-jelölést eltávolítja', () => {
    const markdown = 'A **Mizar** és [Alcor](http://x.hu) _együtt_.';
    expect(stripMarkdown(markdown)).toBe('A Mizar és Alcor együtt.');
  });
});

describe('névmaszkolás', () => {
  it('a név változatai: teljes név, zárójeles rész és megkülönböztető szavak', () => {
    const variants = nameVariants(['Göncölszekér', 'Nagy Medve (Ursa Major) része']);
    expect(variants).toContain('Göncölszekér');
    expect(variants).toContain('Nagy Medve');
    expect(variants).toContain('Ursa Major');
    expect(variants).toContain('Medve');
    expect(variants).not.toContain('része');
  });

  it('a toldalékos alakokat is kicseréli, kis- és nagybetűre nem érzékeny', () => {
    const masked = maskNames('A Göncölszekérrel és a göncölszekér.', ['Göncölszekér']);
    expect(masked).toBe('A […] és a […].');
  });

  it('szó közepén nem maszkol', () => {
    expect(maskNames('Superorion csillag.', ['Orion'])).toBe('Superorion csillag.');
  });
});

describe('támpont a leírásból', () => {
  const base = { name: 'Szentkút', nativeName: 'Kassziopeia (Cassiopeia)' };

  it('legalább 3 mondat kell, különben nincs támpont', () => {
    const oneSentence = 'Csak egy hosszabb mondat egy csillagképről.';
    expect(beliefClue({ ...base, description: oneSentence })).toBeNull();
    expect(beliefClue({ ...base })).toBeNull();
  });

  it('kiszűri a névfelsoroló mondatot, és kipontozza a nevet', () => {
    const clue = beliefClue({
      ...base,
      description:
        'A Szentkút jellegzetes W alakú csillagsor az égen. Népi nevei: Boszorkánykút, Kútgémcsillag. ' +
        'A Sarkcsillag túloldalán áll, szemben a Göncölszekérrel. Magyarországról sosem nyugszik le.',
    })!;
    expect(clue).toHaveLength(3);
    expect(clue[0]).toBe('A […] jellegzetes W alakú csillagsor az égen.');
    expect(clue.join(' ')).not.toContain('Boszorkánykút');
    expect(clue.join(' ')).not.toContain('Szentkút');
  });

  it('legfeljebb 5 mondatot ad', () => {
    const sentence = (i: number) => `Ez a ${i + 1}. hosszabb mondat a leírásban.`;
    const description = Array.from({ length: 9 }, (_, i) => sentence(i)).join(' ');
    expect(beliefClue({ ...base, description })!.length).toBe(BELIEF_MAX_SENTENCES);
  });
});

describe('hiedelem-találó a valódi adatokkal', () => {
  const cultures = getBeliefCultures();

  it('a magyar és a nyugati kultúra is választható, elég kérdéssel', () => {
    const ids = cultures.map((c) => c.id);
    expect(ids).toContain('hungarian');
    expect(ids).toContain('western');
    for (const culture of cultures) expect(culture.beliefs.length).toBeGreaterThanOrEqual(MIN_POOL);
  });

  it('minden támpont 3–5 mondat, és nem árulja el a saját alakzat nevét', () => {
    for (const culture of cultures) {
      for (const belief of culture.beliefs) {
        expect(belief.clue.length).toBeGreaterThanOrEqual(BELIEF_MIN_SENTENCES);
        expect(belief.clue.length).toBeLessThanOrEqual(BELIEF_MAX_SENTENCES);
        const text = belief.clue.join(' ').toLowerCase();
        expect(text).not.toContain(belief.name.toLowerCase());
      }
    }
  });

  it('a támpont 450 karakter alatt marad, kivéve ha már a minimális 3 mondat is hosszabb', () => {
    for (const culture of cultures) {
      for (const belief of culture.beliefs) {
        if (belief.clue.length > BELIEF_MIN_SENTENCES) {
          expect(belief.clue.join(' ').length).toBeLessThanOrEqual(BELIEF_MAX_CHARS);
        }
      }
    }
  });

  it('a hosszú mondatok nem tolják túl a keretet: a 4. mondat csak akkor kerül be, ha belefér', () => {
    const long = (n: number) => `Ez a ${n}. mondat ${'hosszú '.repeat(30)}szöveg.`;
    const description = [1, 2, 3, 4, 5].map(long).join(' ');
    const clue = beliefClue({ name: 'Teszt', description })!;
    expect(clue).toHaveLength(3);
  });

  it('a magyar támpontok magyarul, a nyugatiak angolul jelölve vannak', () => {
    const hungarian = cultures.find((c) => c.id === 'hungarian')!.beliefs;
    const western = cultures.find((c) => c.id === 'western')!.beliefs;
    expect(hungarian.every((b) => b.clueLang === 'hu')).toBe(true);
    expect(western.every((b) => b.clueLang === 'en')).toBe(true);
  });

  it('a kérdésben a 4 minta egyedi, tartalmazza a helyeset, és a vonalszámuk különbözik', () => {
    const hungarian = cultures.find((c) => c.id === 'hungarian')!;
    const { beliefs, pool } = hungarian;
    const questions = buildBeliefQuestions(beliefs, pool, 8, BELIEF_OPTIONS, createRng(5));
    expect(questions).toHaveLength(Math.min(8, hungarian.beliefs.length));
    expect(new Set(questions.map((q) => q.target.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.options).toHaveLength(BELIEF_OPTIONS);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(BELIEF_OPTIONS);
      expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
      expect(new Set(q.options.map((o) => o.segments.length)).size).toBe(BELIEF_OPTIONS);
    }
  });

  it('ugyanazzal a maggal ugyanazt a kérdéssort adja', () => {
    const western = cultures.find((c) => c.id === 'western')!;
    const { beliefs, pool } = western;
    const ids = (seed: number) =>
      buildBeliefQuestions(beliefs, pool, 5, 4, createRng(seed)).map((q) => q.correctId);
    expect(ids(11)).toEqual(ids(11));
  });

  it('a belief-készlet a pool-ból épül, hiányzó leírásnál kimarad', () => {
    const western = cultures.find((c) => c.id === 'western')!;
    expect(buildBeliefPool(western.pool).length).toBe(western.beliefs.length);
    expect(buildBeliefPool([{ ...western.pool[0], description: undefined }])).toHaveLength(0);
  });
});

describe('hiedelem-találó pontozás és nehézség', () => {
  const clue = ['Egy.', 'Kettő.', 'Három.', 'Négy.', 'Öt.'];

  it('könnyű módban legfeljebb 5, nehézben az első 3 mondat látszik', () => {
    expect(visibleClue(clue, 'easy')).toHaveLength(5);
    expect(visibleClue(clue, 'hard')).toEqual(['Egy.', 'Kettő.', 'Három.']);
    expect(visibleClue(clue.slice(0, 3), 'hard')).toHaveLength(3);
  });

  it('a gyorsasági bónusz 45 mp alatt fogy: azonnal 150, 22,5 mp-nél 125, utána 100', () => {
    const base = { correct: true, streak: 1, difficulty: 'easy' as const };
    expect(beliefPoints({ ...base, elapsedMs: 0 })).toBe(150);
    expect(beliefPoints({ ...base, elapsedMs: 22_500 })).toBe(125);
    expect(beliefPoints({ ...base, elapsedMs: 90_000 })).toBe(100);
  });

  it('hibás válasz 0 pont, nehéz módban dupla', () => {
    expect(beliefPoints({ correct: false, elapsedMs: 0, streak: 0, difficulty: 'easy' })).toBe(0);
    const slowHard = { correct: true, elapsedMs: 90_000, streak: 1, difficulty: 'hard' as const };
    expect(beliefPoints(slowHard)).toBe(200);
  });
});
