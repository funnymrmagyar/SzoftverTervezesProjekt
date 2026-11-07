import { StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { useViewStore } from '@/state/useViewStore';
import { IconButton } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

export function ViewControls({
  side = 'all',
  compact = false,
  moreOpen = false,
  onToggleMore,
}: {
  side?: 'left' | 'right' | 'all';
  compact?: boolean;
  moreOpen?: boolean;
  onToggleMore?: () => void;
}) {
  const showLines = useSkyStore((state) => state.showLines);
  const toggleLines = useSkyStore((state) => state.toggleLines);
  const showLabels = useSkyStore((state) => state.showLabels);
  const toggleLabels = useSkyStore((state) => state.toggleLabels);
  const zoom = useViewStore((state) => state.zoom);
  const reset = useViewStore((state) => state.reset);
  const fov = useViewStore((state) => Math.round(state.fov));

  return (
    <View style={styles.wrap}>
      {side !== 'right' ? (
        <View style={[styles.row, compact && styles.column]}>
          <IconButton
            icon="git-network-outline"
            label="Csillagképvonalak"
            active={showLines}
            onPress={toggleLines}
            testID="toggle-lines"
          />
          <IconButton
            icon="text-outline"
            label="Feliratok"
            active={showLabels}
            onPress={toggleLabels}
            testID="toggle-labels"
          />
          {onToggleMore ? (
            <IconButton
              icon="ellipsis-horizontal"
              label={moreOpen ? 'Kevesebb vezérlő' : 'További vezérlők'}
              active={moreOpen}
              onPress={onToggleMore}
              testID="more-view-controls"
            />
          ) : null}
        </View>
      ) : null}
      {side !== 'left' ? (
        <View style={styles.rightGroup}>
          {moreOpen ? <Text style={styles.fov}>Látómező · {fov}°</Text> : null}
          <View style={[styles.row, compact && styles.column]}>
            <IconButton
              icon="remove"
              label="Kicsinyítés"
              onPress={() => zoom(1.25)}
              testID="zoom-out"
            />
            <IconButton icon="add" label="Nagyítás" onPress={() => zoom(0.8)} testID="zoom-in" />
            <IconButton
              icon="compass-outline"
              label="Alaphelyzet"
              onPress={reset}
              testID="view-reset"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  column: { flexDirection: 'column' },
  rightGroup: { alignItems: 'center', gap: spacing.xs },
  fov: { color: colors.textMuted, fontSize: 10 },
});
