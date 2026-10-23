import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { IconButton } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

export function TimeControls({ date }: { date: Date }) {
  const live = useSkyStore((state) => state.manualTime === null);
  const shiftHours = useSkyStore((state) => state.shiftHours);
  const resetTimeToNow = useSkyStore((state) => state.resetTimeToNow);
  const [focused, setFocused] = useState(false);
  const time = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('hu-HU', { day: 'numeric', month: 'short' });

  return (
    <View style={styles.row}>
      <IconButton
        icon="play-back"
        label="Előző óra"
        onPress={() => shiftHours(-1)}
        testID="time-back"
      />
      <View style={styles.center}>
        <Text style={styles.time} testID="time-display">
          {time}
        </Text>
        {live ? (
          <View style={styles.status}>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>Élő · {day}</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Élő"
            onPress={resetTimeToNow}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            testID="time-now"
            style={({ pressed }) => [
              styles.status,
              styles.liveButton,
              pressed && styles.pressed,
              focused && styles.focused,
            ]}
          >
            <Ionicons name="play-circle-outline" size={spacing.lg} color={colors.accent} />
            <Text style={styles.liveText}>Élő</Text>
          </Pressable>
        )}
      </View>
      <IconButton
        icon="play-forward"
        label="Következő óra"
        onPress={() => shiftHours(1)}
        testID="time-forward"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', gap: spacing.xs },
  time: { ...font.mono, color: colors.text, fontSize: 16, fontWeight: '600' },
  status: { minHeight: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.success,
  },
  statusText: { ...font.caption, color: colors.textMuted },
  liveButton: {
    minHeight: spacing.xxl,
    minWidth: spacing.xxxl,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.xl,
  },
  liveText: { ...font.caption, color: colors.accent, fontWeight: '600' },
  pressed: { opacity: 0.82 },
  focused: { borderWidth: 1, borderColor: colors.accent },
});
