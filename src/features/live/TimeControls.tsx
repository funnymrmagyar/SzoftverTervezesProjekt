import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { colors, font, radius, spacing } from '@/ui/theme';

import { formatDateTime } from './formatTime';

/**
 * Egyszerű időléptető (±1 óra, „Most”). Az igazi időcsúszka a 2. hét feladata;
 * ez a store-on keresztül már ugyanígy állítja az időt.
 */
export function TimeControls({ date }: { date: Date }) {
  const live = useSkyStore((s) => s.manualTime === null);
  const shiftHours = useSkyStore((s) => s.shiftHours);
  const resetTimeToNow = useSkyStore((s) => s.resetTimeToNow);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.step}
        onPress={() => shiftHours(-1)}
        testID="time-back"
        accessibilityLabel="Egy órával vissza"
      >
        <Text style={styles.stepText}>−1 ó</Text>
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.time} testID="time-display">
          {formatDateTime(date)}
        </Text>
        {live ? (
          <Text style={styles.live}>● élő</Text>
        ) : (
          <Pressable onPress={resetTimeToNow} testID="time-now">
            <Text style={styles.nowLink}>Vissza a jelenbe</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        style={styles.step}
        onPress={() => shiftHours(1)}
        testID="time-forward"
        accessibilityLabel="Egy órával előre"
      >
        <Text style={styles.stepText}>+1 ó</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: { color: colors.text, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center' },
  time: { ...font.mono, color: colors.text, fontSize: 16, fontWeight: '600' },
  live: { color: '#6ee7a8', fontSize: 12 },
  nowLink: { color: colors.accent, fontSize: 12, fontWeight: '600' },
});
