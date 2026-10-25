import { getStarCatalog } from '@/core/catalog';
import type { Star } from '@/core/models';

import { buildChartModel } from '../chartModel';
import {
  connectProgress,
  connectRoundPoints,
  initConnect,
  nextUndrawnSegment,
  requestHint,
  tapStar,
} from '../connectLogic';
import { buildFinderQuestions, finderPoints } from '../finderLogic';
import { getPlayableCultures } from '../gamePools';
import {
  buildPool,
  MAX_CONNECT_SEGMENTS,
  MAX_SEGMENTS,
  MIN_POOL,
  MIN_SEGMENTS,
  segmentKey,
  type GameConstellation,
} from '../pool';
import { createRng } from '../random';
import { angularSeparationDeg, fitProjection, lineBox } from '../skyProjection';

const star = (hip: number, ra: number, dec: number, mag = 3): Star => ({ hip, ra, dec, mag, bv: 0.6 });

/** Kis kézi csillagkép: A–B–C vonal, plusz B–D ág. */
const A = star(1, 100, 20);
const B = star(2, 101, 21);
const C = star(3, 102, 20);
const D = star(4, 101, 22);
const TOY: GameConstellation = {
  cultureId: 'test',
  id: 'toy',
  name: 'Játék',
  stars: [A, B, C, D],
  segments: [
    [1, 2],
    [2, 3],
    [2, 4],
  ],
};

describe('égi vetítés', () => {
  it('a szögtávolság ismert értékekre pontos', () => {
    expect(angularSeparationDeg({ ra: 0, dec: 0 }, { ra: 90, dec: 0 })).toBeCloseTo(90);
    expect(angularSeparationDeg({ ra: 10, dec: 90 }, { ra: 200, dec: 90 })).toBeCloseTo(0);
  });

  it('kelet balra, észak felfelé van a térképen', () => {
    const proj = fitProjection([
      { ra: 100, dec: 20 },
      { ra: 104, dec: 24 },
    ]);
    const west = proj.project({ ra: 100, dec: 20 });
    const east = proj.project({ ra: 104, dec: 20 });
    const north = proj.project({ ra: 100, dec: 24 });
    expect(east!.x).toBeLessThan(west!.x);
    expect(north!.y).toBeLessThan(west!.y);
  });

  it('minden pont a dobozba esik, a 0°/360° határon átnyúló alakzat is', () => {
    const points = [
      { ra: 358, dec: 10 },
      { ra: 2, dec: 14 },
      { ra: 0, dec: 8 },
    ];
    const proj = fitProjection(points);
    for (const p of points) {
      const placed = proj.project(p)!;
      expect(placed.x).toBeGreaterThan(0);
      expect(placed.x).toBeLessThan(1);
      expect(placed.y).toBeGreaterThan(0);
      expect(placed.y).toBeLessThan(1);
    }
  });

  it('a középponttól 90°-ra lévő pontot nem vetíti', () => {
    const proj = fitProjection([{ ra: 0, dec: 0 }]);
    expect(proj.project({ ra: 90, dec: 0 })).toBeNull();
  });

  it('a vonal téglalapja a két pont közé esik, a megfelelő szöggel', () => {
    const box = lineBox(0, 0, 30, 40, 2);
    expect(box.width).toBeCloseTo(50);
    expect(box.left + box.width / 2).toBeCloseTo(15);
    expect(box.top + box.height / 2).toBeCloseTo(20);
    expect(box.angleRad).toBeCloseTo(Math.atan2(40, 30));
  });
});

describe('játszható csillagképek (valódi adatokkal)', () => {
  const cultures = getPlayableCultures();

  it('a magyar és a nyugati kultúra is választható', () => {
    const ids = cultures.map((c) => c.id);
    expect(ids).toContain('hungarian');
    expect(ids).toContain('western');
  });

  it('minden kultúrában elég és egyedi nevű csillagkép van, érvényes vonalakkal', () => {
    const catalog = getStarCatalog();
    for (const culture of cultures) {
      expect(culture.pool.length).toBeGreaterThanOrEqual(MIN_POOL);
      const names = culture.pool.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const con of culture.pool) {
        expect(con.segments.length).toBeGreaterThanOrEqual(MIN_SEGMENTS);
        expect(con.segments.length).toBeLessThanOrEqual(MAX_SEGMENTS);
        const keys = con.segments.map(([a, b]) => segmentKey(a, b));
        expect(new Set(keys).size).toBe(keys.length);
        for (const [a, b] of con.segments) {
          expect(catalog.has(a)).toBe(true);
          expect(catalog.has(b)).toBe(true);
        }
      }
    }
  });

  it('a felismerőjátékban a nagy, ismert csillagképek is szerepelnek', () => {
    const western = cultures.find((c) => c.id === 'western')!.pool.map((c) => c.id);
    for (const id of ['Ori', 'UMa', 'Her', 'CMa', 'Cas', 'Cyg', 'Sco']) {
      expect(western).toContain(id);
    }
  });

  it('a csillagról csillagra készlet rövid körökből áll, és a magyar, nyugati kultúra így is választható', () => {
    const connect = getPlayableCultures(MAX_CONNECT_SEGMENTS);
    expect(connect.map((c) => c.id)).toContain('hungarian');
    expect(connect.map((c) => c.id)).toContain('western');
    for (const culture of connect) {
      expect(culture.pool.length).toBeGreaterThanOrEqual(MIN_POOL);
      for (const con of culture.pool) expect(con.segments.length).toBeLessThanOrEqual(MAX_CONNECT_SEGMENTS);
    }
  });

  it('a Göncölszekér 7 csillagból és 7 vonalból áll', () => {
    const hungarian = cultures.find((c) => c.id === 'hungarian')!;
    const goncol = hungarian.pool.find((c) => c.id === 'gonc')!;
    expect(goncol.stars).toHaveLength(7);
    expect(goncol.segments).toHaveLength(7);
  });

  it('a katalógusból hiányzó csillagot tartalmazó vonalat kihagyja', () => {
    const pool = buildPool(
      {
        id: 'x',
        name: 'x',
        summary: '',
        source: '',
        license: '',
        lineColor: '#fff',
        constellations: [{ id: 'a', name: 'A', lines: [[1, 2, 3, 999999]] }],
      },
      { get: (hip) => [A, B, C].find((s) => s.hip === hip) },
    );
    expect(pool).toHaveLength(1);
    expect(pool[0].segments).toHaveLength(2);
  });

  it('a térképen minden alakzat-csillag látszik, és az alakzat van legfelül', () => {
    const catalog = getStarCatalog();
    for (const culture of cultures.slice(0, 4)) {
      for (const con of culture.pool.slice(0, 6)) {
        const model = buildChartModel(con, catalog);
        const figure = model.stars.filter((s) => s.figure);
        expect(figure).toHaveLength(con.stars.length);
        for (const s of figure) {
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.x).toBeLessThanOrEqual(1);
          expect(s.y).toBeGreaterThanOrEqual(0);
          expect(s.y).toBeLessThanOrEqual(1);
        }
        const firstFigure = model.stars.findIndex((s) => s.figure);
        expect(model.stars.slice(firstFigure).every((s) => s.figure)).toBe(true);
      }
    }
  });
});

describe('csillagkép-felismerő', () => {
  const pool = getPlayableCultures().find((c) => c.id === 'western')!.pool;

  it('a kérdések különböző csillagképek, a helyes válasz benne van a 4 egyedi opcióban', () => {
    const questions = buildFinderQuestions(pool, 10, 4, createRng(7));
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.target.id)).size).toBe(10);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
      expect(new Set(q.options.map((o) => o.name)).size).toBe(4);
      expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
    }
  });

  it('ugyanazzal a maggal ugyanazt a kérdéssort adja', () => {
    const a = buildFinderQuestions(pool, 5, 4, createRng(99)).map((q) => q.correctId);
    const b = buildFinderQuestions(pool, 5, 4, createRng(99)).map((q) => q.correctId);
    expect(a).toEqual(b);
  });

  it('kisebb készletből is felad kérdést, nem több kört, mint ahány csillagkép van', () => {
    const small = pool.slice(0, 4);
    const questions = buildFinderQuestions(small, 10, 4, createRng(1));
    expect(questions).toHaveLength(4);
    expect(questions[0].options).toHaveLength(4);
  });

  it('a pontozás: hibás 0, gyors helyes 150, lassú helyes 100', () => {
    const base = { elapsedMs: 0, streak: 1, difficulty: 'easy' as const };
    expect(finderPoints({ ...base, correct: false })).toBe(0);
    expect(finderPoints({ ...base, correct: true })).toBe(150);
    expect(finderPoints({ ...base, correct: true, elapsedMs: 60_000 })).toBe(100);
  });

  it('a sorozatbónusz az 5. ismétlés után már nem nő, nehéz módban dupla', () => {
    const args = { correct: true, elapsedMs: 60_000, difficulty: 'easy' as const };
    expect(finderPoints({ ...args, streak: 3 })).toBe(120);
    expect(finderPoints({ ...args, streak: 6 })).toBe(150);
    expect(finderPoints({ ...args, streak: 20 })).toBe(150);
    expect(finderPoints({ ...args, streak: 3, difficulty: 'hard' })).toBe(240);
  });
});

describe('csillagról csillagra', () => {
  it('két koppintás összeköti a csillagokat, a kijelölés megszűnik', () => {
    let s = initConnect(TOY, 'easy', 0);
    s = tapStar(s, 1, true, 100);
    expect(s.selected).toBe(1);
    expect(s.event).toBe('selected');
    s = tapStar(s, 2, true, 200);
    expect(s.drawn.has(segmentKey(1, 2))).toBe(true);
    expect(s.selected).toBeNull();
    expect(s.event).toBe('connected');
    expect(connectProgress(s)).toEqual({ drawn: 1, total: 3 });
  });

  it('ugyanarra kétszer koppintva megszűnik a kijelölés, hibapont nélkül', () => {
    let s = tapStar(initConnect(TOY, 'easy', 0), 1, true, 1);
    s = tapStar(s, 1, true, 2);
    expect(s.selected).toBeNull();
    expect(s.mistakes).toBe(0);
  });

  it('nem létező vonal és idegen csillag is hibapont', () => {
    let s = initConnect(TOY, 'easy', 0);
    s = tapStar(tapStar(s, 1, true, 1), 3, true, 2); // A–C nincs
    expect(s.mistakes).toBe(1);
    expect(s.event).toBe('wrong-line');
    expect(s.drawn.size).toBe(0);
    s = tapStar(s, 555, false, 3);
    expect(s.mistakes).toBe(2);
    expect(s.event).toBe('wrong-star');
  });

  it('a már behúzott vonal újbóli összekötése nem büntet és nem számít kétszer', () => {
    let s = initConnect(TOY, 'easy', 0);
    s = tapStar(tapStar(s, 1, true, 1), 2, true, 2);
    s = tapStar(tapStar(s, 2, true, 3), 1, true, 4); // ugyanaz fordítva
    expect(s.mistakes).toBe(0);
    expect(s.drawn.size).toBe(1);
    expect(s.event).toBe('duplicate');
  });

  it('az utolsó vonal után a kör kész, és utána a koppintás hatástalan', () => {
    let s = initConnect(TOY, 'easy', 0);
    for (const [a, b] of TOY.segments) s = tapStar(tapStar(s, a, true, 1), b, true, 9000);
    expect(s.finishedAt).toBe(9000);
    expect(s.event).toBe('complete');
    expect(tapStar(s, 1, true, 9500)).toBe(s);
  });

  it('a kör pontja: vonalak + befejezési és időbónusz, levonva a hibákat és segítségeket', () => {
    const finish = (mistakes: number, hints: number, difficulty: 'easy' | 'hard') => {
      let s = initConnect(TOY, difficulty, 0);
      for (let i = 0; i < mistakes; i++) s = tapStar(s, 999, false, 1);
      for (let i = 0; i < hints; i++) s = requestHint(s);
      for (const [a, b] of TOY.segments) s = tapStar(tapStar(s, a, true, 1), b, true, 9000);
      return connectRoundPoints(s);
    };
    // 3 vonal*20 + 50 + időbónusz (9 mp → 45) = 155
    expect(finish(0, 0, 'easy')).toBe(155);
    expect(finish(1, 0, 'easy')).toBe(140);
    expect(finish(0, 1, 'easy')).toBe(130);
    expect(finish(0, 0, 'hard')).toBe(310);
    expect(finish(50, 0, 'easy')).toBe(0);
  });

  it('befejezetlen körre 0 pont jár', () => {
    expect(connectRoundPoints(initConnect(TOY, 'easy', 0))).toBe(0);
  });

  it('a segítség a következő be nem húzott vonalat mutatja, pontba kerül, a következő koppintás törli', () => {
    let s = initConnect(TOY, 'hard', 0);
    s = requestHint(s);
    expect(s.hint).toEqual([1, 2]);
    expect(s.hints).toBe(1);
    s = tapStar(s, 1, true, 1);
    expect(s.hint).toBeNull();
    s = tapStar(s, 2, true, 2);
    expect(nextUndrawnSegment(s)).toEqual([2, 3]);
  });
});
