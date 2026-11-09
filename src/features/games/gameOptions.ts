import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export const GAME_OPTIONS = [
  {
    id: 'constellation-finder',
    icon: 'scan-outline',
    route: '/play/constellation-finder',
    titleKey: 'games.identify.title',
    subtitleKey: 'games.identify.subtitle',
    leaderboardKey: 'leaderboard.identify',
  },
  {
    id: 'star-connection',
    icon: 'sparkles-outline',
    route: '/play/star-connection',
    titleKey: 'games.connect.title',
    subtitleKey: 'games.connect.subtitle',
    leaderboardKey: 'leaderboard.connect',
  },
  {
    id: 'belief-guess',
    icon: 'book-outline',
    route: '/play/belief-guess',
    titleKey: 'games.belief.title',
    subtitleKey: 'games.belief.subtitle',
    leaderboardKey: 'leaderboard.belief',
  },
] as const satisfies readonly {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: string;
  titleKey: 'games.identify.title' | 'games.connect.title' | 'games.belief.title';
  subtitleKey: 'games.identify.subtitle' | 'games.connect.subtitle' | 'games.belief.subtitle';
  leaderboardKey: 'leaderboard.identify' | 'leaderboard.connect' | 'leaderboard.belief';
}[];

export type GameId = (typeof GAME_OPTIONS)[number]['id'];
export type GameFilter = 'all' | GameId;

/** Minden játék azonosítója; a mentés, a sor és a ranglista ebből dolgozik, nem kézzel írt listából. */
export const GAME_IDS: readonly GameId[] = GAME_OPTIONS.map((game) => game.id);

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value);
}

/** Könnyű: segédvonalakkal; nehéz: segítség nélkül, dupla pontért. */
export type Difficulty = 'easy' | 'hard';
