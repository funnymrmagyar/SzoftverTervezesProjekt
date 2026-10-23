import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { configureServices } from '@/services/bootstrap';
import { useAuthStore } from '@/state/useAuthStore';
import { colors } from '@/ui/theme';

// Composition root: a szolgáltatások bekötése még az első render előtt.
configureServices();

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

  // Feliratkozás a bejelentkezési állapotra; leiratkozás a komponens megszűnésekor.
  useEffect(() => useAuthStore.getState().startListening(), []);

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
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
