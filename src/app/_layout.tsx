import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { UsernamePrompt } from '@/features/games/UsernamePrompt';
import { configureServices } from '@/services/bootstrap';
import { createLogger } from '@/services/logger';
import { useAuthStore } from '@/state/useAuthStore';
import { t, useLocale } from '@/ui/i18n';
import { useLocaleStore } from '@/ui/locale';
import { colors } from '@/ui/theme';

export { AppErrorBoundary as ErrorBoundary } from '@/ui/AppErrorBoundary';

configureServices();

const navigationLog = createLogger('navigation');

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const pathname = usePathname();
  const locale = useLocale();
  const localeReady = useLocaleStore((state) => state.ready);

  // A mentett nyelv betöltése induláskor (addig az eszköz nyelve érvényes).
  useEffect(() => {
    void useLocaleStore.getState().hydrate();
  }, []);

  // Weben a dokumentum nyelve és címe követi az aktív nyelvet.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    document.title = t('app.title');
  }, [locale]);

  useEffect(() => useAuthStore.getState().startListening(), []);

  useEffect(() => {
    navigationLog.debug('Képernyőváltás', { path: pathname });
  }, [pathname]);

  const canSeeAuth = status !== 'signedIn';
  const canSeeApp = status !== 'signedOut';

  // A mentett nyelv betöltéséig nem rajzolunk, hogy ne villanjon fel rossz nyelvű felület.
  if (!localeReady) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={canSeeAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={canSeeApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="play" />
        </Stack.Protected>
      </Stack>
      <UsernamePrompt />
    </ThemeProvider>
  );
}