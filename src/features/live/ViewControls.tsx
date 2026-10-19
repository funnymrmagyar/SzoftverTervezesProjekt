import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { compassPoint } from '@/core/astronomy';
import { useSkyStore } from '@/state/useSkyStore';
import { useViewStore } from '@/state/useViewStore';
import { colors, font, radius, spacing } from '@/ui/theme';

function RoundButton({
  icon,
  label,
  onPress,
  active,
  testID,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      testID={testID}
      style={[styles.round, active && styles.roundActive]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.accentText : colors.text} />
    </Pressable>
  );
}

/** Nézési irány kijelzése, nagyítás, nézet alaphelyzetbe, csillagképvonalak és -nevek ki/be. */
export function ViewControls() {
  const azimuth = useViewStore((s) => Math.round(s.azimuth));
  const altitude = useViewStore((s) => Math.round(s.altitude));
  const fov = useViewStore((s) => Math.round(s.fov));
  const { zoom, reset } = useViewStore.getState();
  const showLines = useSkyStore((s) => s.showLines);
  const toggleLines = useSkyStore((s) => s.toggleLines);
  const showLabels = useSkyStore((s) => s.showLabels);
  const toggleLabels = useSkyStore((s) => s.toggleLabels);

  return (
    <View style={styles.row}>
      <Text style={styles.heading} testID="view-heading">
        {compassPoint(azimuth)} {azimuth}° · {altitude}° magasan · {fov}° látómező
      </Text>
      <View style={styles.buttons}>
        <RoundButton
          icon="git-network-outline"
          label="Csillagképvonalak"
          active={showLines}
          onPress={toggleLines}
          testID="toggle-lines"
        />
        <RoundButton
          icon="text-outline"
          label="Csillagképnevek"
          active={showLabels}
          onPress={toggleLabels}
          testID="toggle-labels"
        />
        <RoundButton icon="remove" label="Távolítás" onPress={() => zoom(1.25)} testID="zoom-out" />
        <RoundButton icon="add" label="Nagyítás" onPress={() => zoom(0.8)} testID="zoom-in" />
        <RoundButton
          icon="compass-outline"
          label="Nézet alaphelyzetbe"
          onPress={reset}
          testID="view-reset"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  heading: { ...font.mono, color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  round: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roundActive: { backgroundColor: colors.accent, borderColor: colors.accent },
});
