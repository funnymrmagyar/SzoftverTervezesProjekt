/** Közös obszervatórium-téma és reszponzív elrendezési tokenek. */
export const colors = {
  bg: '#060a18',
  sky: '#050816',
  surface: '#0f1630',
  surfaceRaised: '#151e3a',
  glass: 'rgba(15, 22, 48, 0.72)',
  glassStrong: 'rgba(15, 22, 48, 0.94)',
  border: 'rgba(233, 237, 249, 0.1)',
  borderStrong: 'rgba(233, 237, 249, 0.16)',
  glassHighlight: 'rgba(233, 237, 249, 0.06)',
  text: '#e9edf9',
  textMuted: '#b4bfd6',
  textSubtle: '#929fba',
  accent: '#f2b84b',
  accentText: '#1d1405',
  info: '#86b8ff',
  danger: '#ff8585',
  success: '#63d6a1',
  backdrop: 'rgba(2, 5, 14, 0.78)',
  cardHighlight: 'rgba(242, 184, 75, 0.1)',
  constellationLine: '#86b8ff',
  silver: '#c9d1e6',
  bronze: '#cd8b5a',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const sizing = {
  touch: 44,
  icon: 20,
  iconSmall: 16,
  avatar: 56,
  avatarLarge: 72,
  navHeight: 64,
  navWidth: 72,
  contentCompact: 560,
  contentWide: 720,
  gameIcon: 56,
  selectMaxHeight: 440,
  cardPressScale: 0.98,
} as const;

export const breakpoints = {
  compactMax: 599,
  mediumMax: 1023,
} as const;

export const navigation = {
  bottomClearance: sizing.navHeight + spacing.xl,
  expandedClearance: spacing.xl,
} as const;

export const motion = {
  quick: 140,
  standard: 190,
  sheet: 220,
  pressScale: sizing.cardPressScale,
} as const;

export const font = {
  title: { fontSize: 28, fontWeight: '600' as const, letterSpacing: 0.2 },
  heading: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  mono: { fontVariant: ['tabular-nums' as const] },
};
