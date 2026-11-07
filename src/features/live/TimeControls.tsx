import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatYear } from '@/core/time';
import { useSkyStore } from '@/state/useSkyStore';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { formatClock, minuteOfDay } from './timeTravel';

export function TimeControls({
  date,
  onOpenTimeTravel,
}: {
  date: Date;
  onOpenTimeTravel: () => void;
}) {
  const live = useSkyStore((state) => state.manualTime === null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatYear(date.getFullYear())}, ${formatClock(minuteOfDay(date))}. Időutazás megnyitása.`}
      accessibilityHint="Év, nap és napszak beállítása"
      onPress={onOpenTimeTravel}
      testID="time-travel-open"
      style={styles.readout}
    >
      <Text style={styles.year} numberOfLines={1}>
        {formatYear(date.getFullYear())}
      </Text>
      <View style={styles.timeRow}>
        <Text style={styles.time} testID="time-display">
          {formatClock(minuteOfDay(date))}
        </Text>
        <View style={[styles.statusDot, !live && styles.manualDot]} />
      </View>
      <Text style={[styles.status, !live && styles.manualStatus]}>{live ? 'Élő' : 'Kézi'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readout: {
    minWidth: 0,
    minHeight: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: spacing.xs,
  },
  year: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { ...font.mono, color: colors.text, fontSize: 15, fontWeight: '700' },
  statusDot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.success,
  },
  manualDot: { backgroundColor: colors.accent },
  status: { color: colors.success, fontSize: 10, fontWeight: '600' },
  manualStatus: { color: colors.accent },
});
