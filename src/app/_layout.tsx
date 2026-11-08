import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { configureServices } from '@/services/bootstrap';
import { createLogger } from '@/services/logger';
import { useAuthStore } from '@/state/useAuthStore';
import { colors } from '@/ui/theme';

// Ha bármelyik képernyő renderelés közben hibát dob, ez jelenik meg (és a hiba a naplóba kerül).
export { AppErrorBoundary as ErrorBoundary } from '@/ui/AppErrorBoundary';

// Composition root: a szolgáltatások bekötése még az első render előtt.
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

  // Feliratkozás a bejelentkezési állapotra; leiratkozás a komponens megszűnésekor.
  useEffect(() => useAuthStore.getState().startListening(), []);

  // Képernyőváltások (csak fejlesztői szinten; az útvonalakban nincs személyes adat).
  useEffect(() => {
    navigationLog.debug('Képernyőváltás', { path: pathname });
  }, [pathname]);

  // Betöltés közben (amíg a Firebase visszaállítja a munkamenetet) mindkét csoport elérhető,
  // így a mélylinkek (pl. /profile, /register) nem vesznek el; utána a guard átirányít.
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
        {/* Az index mindig elérhető: töltőképernyő, majd a megfelelő helyre irányít. */}
        <Stack.Screen name="index" />
        <Stack.Protected guard={canSeeAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={canSeeApp}>
          <Stack.Screen name="(tabs)" />
          {/* Teljes képernyős játékok (tab-sáv nélkül). */}
          <Stack.Screen name="play" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
