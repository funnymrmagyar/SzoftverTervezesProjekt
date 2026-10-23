import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export const GAME_OPTIONS = [
  {
    id: 'constellation-finder',
    icon: 'scan-outline',
    titleKey: 'games.identify.title',
    subtitleKey: 'games.identify.subtitle',
  },
  {
    id: 'star-connection',
    icon: 'sparkles-outline',
    titleKey: 'games.connect.title',
    subtitleKey: 'games.connect.subtitle',
  },
] as const satisfies readonly {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  titleKey: 'games.identify.title' | 'games.connect.title';
  subtitleKey: 'games.identify.subtitle' | 'games.connect.subtitle';
}[];

export type GameFilter = 'all' | (typeof GAME_OPTIONS)[number]['id'];
