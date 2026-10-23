import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { useViewStore } from '@/state/useViewStore';
import { IconButton } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

export function ViewControls() {
  const [moreOpen, setMoreOpen] = useState(false);
  const layout = useBreakpoint();
  const showLines = useSkyStore((state) => state.showLines);
  const toggleLines = useSkyStore((state) => state.toggleLines);
  const showLabels = useSkyStore((state) => state.showLabels);
  const toggleLabels = useSkyStore((state) => state.toggleLabels);
  const zoom = useViewStore((state) => state.zoom);
  const reset = useViewStore((state) => state.reset);
  const showAdvanced = Platform.OS === 'web' || layout.expanded;

  return (
    <View style={[styles.wrap, layout.compact && styles.wrapCompact]}>
      <View style={styles.row}>
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
        {showAdvanced ? (
          <IconButton
            icon="ellipsis-horizontal"
            label={moreOpen ? 'Kevesebb vezérlő' : 'További vezérlők'}
            active={moreOpen}
            onPress={() => setMoreOpen((open) => !open)}
            testID="more-view-controls"
          />
        ) : null}
      </View>
      {showAdvanced && moreOpen ? (
        <View style={styles.row}>
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  wrapCompact: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
