import type { Difficulty } from './gameOptions';
import type { GameConstellation } from './pool';
import { sample, shuffle, type Rng } from './random';

export const FINDER_ROUNDS = 10;
export const FINDER_OPTIONS = 4;
/** Eddig számít bónusz a gyors válaszért (ms). */
export const FINDER_TIME_WINDOW_MS = 15_000;

export interface FinderOption {
  id: string;
  name: string;
}

export interface FinderQuestion {
  target: GameConstellation;
  options: FinderOption[];
  correctId: string;
}

/** `count` kérdés: mindegyik más csillagkép, a hibás válaszok ugyanabból a kultúrából jönnek. */
export function buildFinderQuestions(
  pool: readonly GameConstellation[],
  count: number,
  optionCount: number,
  rng: Rng,
): FinderQuestion[] {
  const targets = sample(pool, Math.min(count, pool.length), rng);
  return targets.map((target) => {
    const others = pool.filter((c) => c.id !== target.id);
    const distractors = sample(others, Math.max(0, optionCount - 1), rng);
    const options = shuffle([target, ...distractors], rng).map((c) => ({ id: c.id, name: c.name }));
    return { target, options, correctId: target.id };
  });
}

export const difficultyMultiplier = (difficulty: Difficulty): number =>
  difficulty === 'hard' ? 2 : 1;

/**
 * Egy válasz pontja. Helyes válasz: 100 + legfeljebb 50 gyorsasági bónusz
 * + sorozatbónusz (a 2. egymás utáni találattól 10, legfeljebb 50). Nehéz módban kétszeres.
 * `streak` az egymás utáni helyes válaszok száma ezzel a válasszal együtt.
 */
export function finderPoints(args: {
  correct: boolean;
  elapsedMs: number;
  streak: number;
  difficulty: Difficulty;
}): number {
  if (!args.correct) return 0;
  const timeBonus = Math.round(50 * Math.max(0, 1 - args.elapsedMs / FINDER_TIME_WINDOW_MS));
  const streakBonus = 10 * Math.min(Math.max(args.streak - 1, 0), 5);
  return (100 + timeBonus + streakBonus) * difficultyMultiplier(args.difficulty);
}
