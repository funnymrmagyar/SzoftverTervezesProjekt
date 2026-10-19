import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { colors, radius, spacing } from '@/ui/theme';

/** Égi kultúra választó „chipek”, alatta a kiválasztott kultúra rövid leírása. */
export function CulturePicker() {
  const cultures = getSkyCultures().list();
  const cultureId = useSkyStore((s) => s.cultureId);
  const setCulture = useSkyStore((s) => s.setCulture);
  const selected = cultures.find((c) => c.id === cultureId);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {cultures.map((c) => {
          const active = c.id === cultureId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCulture(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`culture-${c.id}`}
              style={[styles.chip, active && styles.chipActive]}
            >
              <View style={styles.dot} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected ? (
        <Text style={styles.summary} numberOfLines={2}>
          {selected.constellations.length} alakzat · {selected.summary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
  chipActive: { borderColor: colors.constellationLine, backgroundColor: colors.surfaceRaised },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.constellationLine },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: colors.text },
  summary: { color: colors.textMuted, fontSize: 12, maxWidth: 520 },
});
