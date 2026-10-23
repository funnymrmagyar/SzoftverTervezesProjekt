import { useWindowDimensions } from 'react-native';

import { breakpoints, navigation, sizing, spacing } from './theme';

export type Breakpoint = 'compact' | 'medium' | 'expanded';

export function getBreakpoint(width: number): Breakpoint {
  if (width <= breakpoints.compactMax) return 'compact';
  if (width <= breakpoints.mediumMax) return 'medium';
  return 'expanded';
}

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  const landscape = width > height;

  return {
    width,
    height,
    breakpoint,
    compact: breakpoint === 'compact',
    medium: breakpoint === 'medium',
    expanded: breakpoint === 'expanded',
    landscape,
    pagePadding:
      breakpoint === 'compact' ? spacing.lg : breakpoint === 'medium' ? spacing.xl : spacing.xxl,
    contentMaxWidth: breakpoint === 'expanded' ? sizing.contentWide : sizing.contentCompact,
    bottomClearance:
      breakpoint === 'expanded' ? navigation.expandedClearance : navigation.bottomClearance,
  } as const;
}
