import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export const GAME_OPTIONS = [
  {
    id: 'constellation-finder',
    icon: 'scan-outline',
    route: '/play/constellation-finder',
    titleKey: 'games.identify.title',
    subtitleKey: 'games.identify.subtitle',
  },
  {
    id: 'star-connection',
    icon: 'sparkles-outline',
    route: '/play/star-connection',
    titleKey: 'games.connect.title',
    subtitleKey: 'games.connect.subtitle',
  },
] as const satisfies readonly {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: string;
  titleKey: 'games.identify.title' | 'games.connect.title';
  subtitleKey: 'games.identify.subtitle' | 'games.connect.subtitle';
}[];

export type GameId = (typeof GAME_OPTIONS)[number]['id'];
export type GameFilter = 'all' | GameId;

/** Könnyű: segédvonalakkal; nehéz: segítség nélkül, dupla pontért. */
export type Difficulty = 'easy' | 'hard';
