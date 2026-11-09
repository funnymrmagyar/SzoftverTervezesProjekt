import { beliefClue, BELIEF_MAX_SENTENCES } from './beliefText';
import { finderPoints } from './finderLogic';
import type { Difficulty } from './gameOptions';
import type { GameConstellation } from './pool';
import { shuffle, type Rng } from './random';

export const BELIEF_ROUNDS = 8;
export const BELIEF_OPTIONS = 4;
/** A leírás elolvasása időbe telik, ezért a gyorsasági bónusz ablaka hosszabb, mint a felismerőjátéké. */
export const BELIEF_TIME_WINDOW_MS = 45_000;
/** Nehéz módban ennyi mondatot látni a leírásból. */
export const BELIEF_HARD_SENTENCES = 3;

/** Olyan csillagkép, amelyhez 3–5 mondatos, a nevet nem áruló támpont készíthető. */
export interface BeliefConstellation extends GameConstellation {
  clue: string[];
  /** A támpont nyelve (ISO 639-1). */
  clueLang: string;
}

export interface BeliefQuestion {
  target: BeliefConstellation;
  /** A négy csillagminta (a célpont és három téves), összekeverve. */
  options: GameConstellation[];
  correctId: string;
}

/** A készlet azon csillagképei, amelyekhez van játszható támpont. */
export function buildBeliefPool(pool: readonly GameConstellation[]): BeliefConstellation[] {
  const result: BeliefConstellation[] = [];
  for (const constellation of pool) {
    const clue = beliefClue(constellation);
    if (clue) {
      result.push({ ...constellation, clue, clueLang: constellation.descriptionLang ?? 'hu' });
    }
  }
  return result;
}

/**
 * A téves mintákat úgy választjuk, hogy a lehetőségek vonalszáma lehetőleg különbözzön:
 * két hasonló egyszerű alakzat (pl. két 2 vonalas egyenes) alapján nem lehetne dönteni.
 */
function pickDistractors(
  target: GameConstellation,
  pool: readonly GameConstellation[],
  count: number,
  rng: Rng,
): GameConstellation[] {
  const candidates = shuffle(
    pool.filter((c) => c.id !== target.id),
    rng,
  );
  const usedShapes = new Set([target.segments.length]);
  const picked: GameConstellation[] = [];
  for (const candidate of candidates) {
    if (picked.length === count) break;
    if (usedShapes.has(candidate.segments.length)) continue;
    usedShapes.add(candidate.segments.length);
    picked.push(candidate);
  }
  for (const candidate of candidates) {
    if (picked.length === count) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return picked;
}

/** `count` kérdés különböző célpontokkal; a téves minták az egész kultúrából jöhetnek. */
export function buildBeliefQuestions(
  beliefs: readonly BeliefConstellation[],
  pool: readonly GameConstellation[],
  count: number,
  optionCount: number,
  rng: Rng,
): BeliefQuestion[] {
  const targets = shuffle(beliefs, rng).slice(0, Math.min(count, beliefs.length));
  return targets.map((target) => {
    const distractors = pickDistractors(target, pool, Math.max(0, optionCount - 1), rng);
    return {
      target,
      options: shuffle([target, ...distractors], rng),
      correctId: target.id,
    };
  });
}

/** A kérdéshez megjelenített mondatok: könnyű módban legfeljebb 5, nehézben csak az első 3. */
export function visibleClue(clue: readonly string[], difficulty: Difficulty): string[] {
  return clue.slice(0, difficulty === 'hard' ? BELIEF_HARD_SENTENCES : BELIEF_MAX_SENTENCES);
}

/** Egy válasz pontja: ugyanaz a képlet, mint a felismerőjátéké, hosszabb időablakkal. */
export function beliefPoints(args: {
  correct: boolean;
  elapsedMs: number;
  streak: number;
  difficulty: Difficulty;
}): number {
  return finderPoints({ ...args, timeWindowMs: BELIEF_TIME_WINDOW_MS });
}
