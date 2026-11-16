import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { t, useLocale } from '@/ui/i18n';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { formatClock, formatYearText, minuteOfDay } from './timeTravel';

export function TimeControls({
  date,
  onOpenTimeTravel,
}: {
  date: Date;
  onOpenTimeTravel: () => void;
}) {
  useLocale();
  const live = useSkyStore((state) => state.manualTime === null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('live.timeTravel.open', {
        year: formatYearText(date.getFullYear()),
        time: formatClock(minuteOfDay(date)),
      })}
      accessibilityHint={t('live.timeTravel.hint')}
      onPress={onOpenTimeTravel}
      testID="time-travel-open"
      style={styles.readout}
    >
      <Text style={styles.year} numberOfLines={1}>
        {formatYearText(date.getFullYear())}
      </Text>
      <View style={styles.timeRow}>
        <Text style={styles.time} testID="time-display">
          {formatClock(minuteOfDay(date))}
        </Text>
        <View style={[styles.statusDot, !live && styles.manualDot]} />
      </View>
      <Text style={[styles.status, !live && styles.manualStatus]}>{t(live ? 'live.status.live' : 'live.status.manual')}</Text>
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
