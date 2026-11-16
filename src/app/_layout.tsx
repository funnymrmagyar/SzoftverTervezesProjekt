import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { UsernamePrompt } from '@/features/games/UsernamePrompt';
import { configureServices } from '@/services/bootstrap';
import { createLogger } from '@/services/logger';
import { useAuthStore } from '@/state/useAuthStore';
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

  useEffect(() => useAuthStore.getState().startListening(), []);

  useEffect(() => {
    navigationLog.debug('Képernyőváltás', { path: pathname });
  }, [pathname]);

  const canSeeAuth = status !== 'signedIn';
  const canSeeApp = status !== 'signedOut';

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