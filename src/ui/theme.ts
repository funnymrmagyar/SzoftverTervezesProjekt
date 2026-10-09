/** Közös színek és méretek — éjszakai, sötét téma. */
export const colors = {
  bg: '#060a18',
  sky: '#050816',
  surface: '#0f1630',
  surfaceRaised: '#172043',
  border: '#26305a',
  text: '#e9edf9',
  textMuted: '#8d97bd',
  accent: '#f2b84b',
  accentText: '#1d1405',
  info: '#6aa9ff',
  danger: '#ff7a7a',
  overlay: 'rgba(6, 10, 24, 0.78)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const font = {
  title: { fontSize: 32, fontWeight: '700' as const, letterSpacing: 0.3 },
  heading: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16 },
  small: { fontSize: 13 },
  mono: { fontVariant: ['tabular-nums' as const] },
};
