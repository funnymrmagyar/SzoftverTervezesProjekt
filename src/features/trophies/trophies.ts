import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { PlayerScores } from '@/core/models/PlayerProfile';
import { GAME_IDS, type GameId } from '@/features/games/gameOptions';
import type { TranslationKey, TranslationParams } from '@/ui/i18n';

import { currentDayStreak, type PlayerStats } from './playerStats';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type TrophyTier = 'beginner' | 'advanced' | 'hard';

export const TROPHY_TIER_KEYS: Record<TrophyTier, TranslationKey> = {
  beginner: 'trophy.tier.beginner',
  advanced: 'trophy.tier.advanced',
  hard: 'trophy.tier.hard',
};

/** Egy lejátszott kör adatai, amelyekből a trófeafeltételek kiértékelhetők. */
export interface TrophyRun {
  game: GameId;
  score: number;
  difficulty?: 'easy' | 'hard';
  correctCount?: number;
  rounds?: number;
}

export interface TrophyContext {
  /** A statisztika, amely már tartalmazza az éppen befejezett kört is. */
  stats: PlayerStats;
  /** A legjobb pontszámok, amelyek már tartalmazzák az éppen befejezett kört is. */
  scores: PlayerScores;
  run: TrophyRun;
  /** Az aktuális nap kulcsa (ÉÉÉÉ-HH-NN), a sorozat számításához. */
  today: string;
}

export interface TrophyDefinition {
  id: string;
  icon: IconName;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** A leírás `{score}` helyőrzőjének értéke, ha van. */
  descriptionParams?: TranslationParams;
  tier: TrophyTier;
  isEarned(context: TrophyContext): boolean;
}

/** Ennyi pont kell egy nehéz fokozatú kör „Nehéz terep” trófeájához. */
export const HARD_RUN_SCORE = 500;
/** Ennyi pont kell egyetlen játékban a „Mestermegfigyelő” trófeához. */
export const MASTER_SCORE = 1000;
/** Ennyi pont kell mindhárom játékban a „Sokoldalú” trófeához. */
export const ALL_ROUNDER_SCORE = 500;
/** Ennyi összpont kell az „Csillagász” trófeához. */
export const ASTRONOMER_TOTAL = 5000;

function bestOf(scores: PlayerScores, game: GameId): number {
  return scores[game] ?? 0;
}

function triedGame(context: TrophyContext, game: GameId): boolean {
  return (context.stats.plays[game] ?? 0) > 0 || bestOf(context.scores, game) > 0;
}

export const TROPHIES: readonly TrophyDefinition[] = [
  {
    id: 'first-light',
    icon: 'star-outline',
    titleKey: 'trophy.first-light.title',
    descriptionKey: 'trophy.first-light.description',
    tier: 'beginner',
    isEarned: ({ stats }) => stats.gamesPlayed >= 1,
  },
  {
    id: 'explorer',
    icon: 'telescope-outline',
    titleKey: 'trophy.explorer.title',
    descriptionKey: 'trophy.explorer.description',
    tier: 'beginner',
    isEarned: (context) => GAME_IDS.every((game) => triedGame(context, game)),
  },
  {
    id: 'sharp-eye',
    icon: 'eye-outline',
    titleKey: 'trophy.sharp-eye.title',
    descriptionKey: 'trophy.sharp-eye.description',
    tier: 'beginner',
    isEarned: ({ run }) =>
      run.rounds !== undefined &&
      run.rounds > 0 &&
      run.correctCount !== undefined &&
      run.correctCount * 2 >= run.rounds,
  },
  {
    id: 'flawless',
    icon: 'checkmark-done-outline',
    titleKey: 'trophy.flawless.title',
    descriptionKey: 'trophy.flawless.description',
    tier: 'advanced',
    isEarned: ({ run }) =>
      run.rounds !== undefined &&
      run.rounds > 0 &&
      run.correctCount !== undefined &&
      run.correctCount >= run.rounds,
  },
  {
    id: 'hard-terrain',
    icon: 'flame-outline',
    titleKey: 'trophy.hard-terrain.title',
    descriptionKey: 'trophy.hard-terrain.description',
    descriptionParams: { score: HARD_RUN_SCORE },
    tier: 'advanced',
    isEarned: ({ run }) => run.difficulty === 'hard' && run.score >= HARD_RUN_SCORE,
  },
  {
    id: 'moon-walker',
    icon: 'moon-outline',
    titleKey: 'trophy.moon-walker.title',
    descriptionKey: 'trophy.moon-walker.description',
    tier: 'advanced',
    isEarned: ({ stats }) => stats.days.length >= 3,
  },
  {
    id: 'stargazer',
    icon: 'ribbon-outline',
    titleKey: 'trophy.stargazer.title',
    descriptionKey: 'trophy.stargazer.description',
    tier: 'advanced',
    isEarned: ({ stats }) => stats.gamesPlayed >= 10,
  },
  {
    id: 'master-observer',
    icon: 'trophy-outline',
    titleKey: 'trophy.master-observer.title',
    descriptionKey: 'trophy.master-observer.description',
    descriptionParams: { score: MASTER_SCORE },
    tier: 'advanced',
    isEarned: ({ scores }) => GAME_IDS.some((game) => bestOf(scores, game) >= MASTER_SCORE),
  },
  {
    id: 'streak',
    icon: 'calendar-outline',
    titleKey: 'trophy.streak.title',
    descriptionKey: 'trophy.streak.description',
    tier: 'hard',
    isEarned: ({ stats, today }) => currentDayStreak(stats.days, today) >= 7,
  },
  {
    id: 'regular',
    icon: 'planet-outline',
    titleKey: 'trophy.regular.title',
    descriptionKey: 'trophy.regular.description',
    tier: 'hard',
    isEarned: ({ stats }) => stats.gamesPlayed >= 30,
  },
  {
    id: 'all-rounder',
    icon: 'sparkles-outline',
    titleKey: 'trophy.all-rounder.title',
    descriptionKey: 'trophy.all-rounder.description',
    descriptionParams: { score: ALL_ROUNDER_SCORE },
    tier: 'hard',
    isEarned: ({ scores }) => GAME_IDS.every((game) => bestOf(scores, game) >= ALL_ROUNDER_SCORE),
  },
  {
    id: 'astronomer',
    icon: 'rocket-outline',
    titleKey: 'trophy.astronomer.title',
    descriptionKey: 'trophy.astronomer.description',
    descriptionParams: { score: ASTRONOMER_TOTAL },
    tier: 'hard',
    isEarned: ({ scores }) =>
      GAME_IDS.reduce((total, game) => total + bestOf(scores, game), 0) >= ASTRONOMER_TOTAL,
  },
];

export const TROPHY_IDS: readonly string[] = TROPHIES.map((trophy) => trophy.id);

/**
 * Azoknak a trófeáknak a listája, amelyeket a játékos ebben a körben szerzett meg először.
 * A már megszerzett trófea nem kerül újra a listába, és a megszerzett trófea sosem vész el.
 */
export function evaluateNewTrophies(
  context: TrophyContext,
  alreadyEarned: readonly string[],
): TrophyDefinition[] {
  const earned = new Set(alreadyEarned);
  return TROPHIES.filter((trophy) => !earned.has(trophy.id) && trophy.isEarned(context));
}
