import { difficultyMultiplier } from './finderLogic';
import type { Difficulty } from './gameOptions';
import { segmentKey, type GameConstellation } from './pool';

export const CONNECT_ROUNDS = 5;
const SEGMENT_POINTS = 20;
const COMPLETE_BONUS = 50;
const MISTAKE_PENALTY = 15;
const HINT_PENALTY = 25;
/** Eddig számít időbónusz a kör befejezéséért (mp). */
const TIME_WINDOW_S = 90;

export type ConnectEvent =
  | 'none'
  | 'selected'
  | 'deselected'
  | 'connected'
  | 'duplicate'
  | 'wrong-line'
  | 'wrong-star'
  | 'complete';

export interface ConnectState {
  target: GameConstellation;
  difficulty: Difficulty;
  /** Az első, már kijelölt csillag (HIP). */
  selected: number | null;
  /** A behúzott vonalak kulcsai (segmentKey). */
  drawn: ReadonlySet<string>;
  mistakes: number;
  hints: number;
  /** A segítség által mutatott vonal két csillaga. */
  hint: [number, number] | null;
  startedAt: number;
  finishedAt: number | null;
  event: ConnectEvent;
}

export function initConnect(
  target: GameConstellation,
  difficulty: Difficulty,
  now: number,
): ConnectState {
  return {
    target,
    difficulty,
    selected: null,
    drawn: new Set(),
    mistakes: 0,
    hints: 0,
    hint: null,
    startedAt: now,
    finishedAt: null,
    event: 'none',
  };
}

/**
 * Egy csillagra koppintás. Két csillagot kell egymás után kiválasztani: ha a pár a
 * csillagkép egyik vonala, behúzódik. Hibás pár vagy idegen csillag hibapontot ér.
 * Sikeres összekötés után a kijelölés megszűnik, így ágazó alakzatnál sem kell „láncban” haladni.
 */
export function tapStar(
  state: ConnectState,
  hip: number,
  isFigureStar: boolean,
  now: number,
): ConnectState {
  if (state.finishedAt !== null) return state;
  const base = { ...state, hint: null };

  if (!isFigureStar) {
    return { ...base, selected: null, mistakes: state.mistakes + 1, event: 'wrong-star' };
  }
  if (state.selected === null) return { ...base, selected: hip, event: 'selected' };
  if (state.selected === hip) return { ...base, selected: null, event: 'deselected' };

  const key = segmentKey(state.selected, hip);
  const valid = state.target.segments.some(([a, b]) => segmentKey(a, b) === key);
  if (!valid) {
    return { ...base, selected: null, mistakes: state.mistakes + 1, event: 'wrong-line' };
  }
  if (state.drawn.has(key)) return { ...base, selected: null, event: 'duplicate' };

  const drawn = new Set(state.drawn).add(key);
  const complete = drawn.size === state.target.segments.length;
  return {
    ...base,
    selected: null,
    drawn,
    finishedAt: complete ? now : null,
    event: complete ? 'complete' : 'connected',
  };
}

/** A következő még be nem húzott vonal, a csillagkép saját sorrendjében. */
export function nextUndrawnSegment(state: ConnectState): [number, number] | null {
  return state.target.segments.find(([a, b]) => !state.drawn.has(segmentKey(a, b))) ?? null;
}

/** Segítség kérése: megmutatja a következő vonalat, de pontba kerül. */
export function requestHint(state: ConnectState): ConnectState {
  if (state.finishedAt !== null) return state;
  const hint = nextUndrawnSegment(state);
  if (!hint) return state;
  return { ...state, hint, hints: state.hints + 1, selected: null };
}

export function connectProgress(state: ConnectState): { drawn: number; total: number } {
  return { drawn: state.drawn.size, total: state.target.segments.length };
}

/** Egy kör pontja; amíg a kör nincs kész, 0. Nem mehet nulla alá. */
export function connectRoundPoints(state: ConnectState): number {
  if (state.finishedAt === null) return 0;
  const seconds = (state.finishedAt - state.startedAt) / 1000;
  const timeBonus = Math.round(50 * Math.max(0, 1 - seconds / TIME_WINDOW_S));
  const raw =
    state.target.segments.length * SEGMENT_POINTS +
    COMPLETE_BONUS +
    timeBonus -
    state.mistakes * MISTAKE_PENALTY -
    state.hints * HINT_PENALTY;
  return Math.max(0, raw) * difficultyMultiplier(state.difficulty);
}
