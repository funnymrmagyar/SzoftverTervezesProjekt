import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { reportUncaughtError } from '@/services/logger/globalErrorHandlers';

import { Button } from './Button';
import { colors, font, spacing, sizing } from './theme';

/** Egy renderelési hiba naplózása. Ugyanazt a hibát csak egyszer írja ki. */
export function reportRenderError(error: unknown): void {
  reportUncaughtError('Hiba a képernyő megjelenítésekor', error);
}

/**
 * Az Expo Router hibahatára (Error Boundary): ha egy képernyő renderelés közben hibát dob,
 * ezt mutatjuk a fehér képernyő vagy összeomlás helyett, és a hibát naplózzuk.
 * A gyökér-layout exportálja (src/app/_layout.tsx), így minden képernyőre érvényes.
 * Nem támaszkodik a navigációs témára, mert a hiba akár a layoutban is történhetett.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportRenderError(error);
  }, [error]);

  return (
    <View style={styles.root} accessibilityRole="alert" testID="app-error-boundary">
      <View style={styles.card}>
        <Text style={styles.title}>Valami elromlott</Text>
        <Text style={styles.text}>
          Ezt a képernyőt nem sikerült megjeleníteni. Próbáld újra; ha a hiba ismétlődik, indítsd
          újra az alkalmazást.
        </Text>
        {__DEV__ ? (
          <Text style={styles.detail} selectable>
            {error.name}: {error.message}
          </Text>
        ) : null}
        <Button title="Újrapróbálás" icon="refresh" onPress={() => void retry()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg,
  },
  card: { width: '100%', maxWidth: sizing.contentCompact, gap: spacing.md },
  title: { ...font.heading, color: colors.text },
  text: { ...font.body, color: colors.textMuted },
  detail: { ...font.small, color: colors.danger, fontFamily: 'monospace' },
});
