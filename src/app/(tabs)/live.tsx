import { memo, useCallback, useRef } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConstellationInfo } from '@/features/live/ConstellationInfo';
import { CulturePicker } from '@/features/live/CulturePicker';
import { LocationPicker } from '@/features/live/LocationPicker';
import { TimeControls } from '@/features/live/TimeControls';
import { useSkyTime } from '@/features/live/useSkyTime';
import { ViewControls } from '@/features/live/ViewControls';
import { ConstellationLabels } from '@/render/ConstellationLabels';
import { pickConstellation } from '@/render/pickConstellation';
import { SkyScene } from '@/render/SkyScene';
import { useSkyGestures, type SkyTapHandler } from '@/render/useSkyGestures';
import { useWheelZoom } from '@/render/useWheelZoom';
import { useSkyStore } from '@/state/useSkyStore';
import { colors, navigation, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const MemoSkyScene = memo(SkyScene);

export default function LiveScreen() {
  const date = useSkyTime();
  const location = useSkyStore((state) => state.location);
  const cultureId = useSkyStore((state) => state.cultureId);
  const showLines = useSkyStore((state) => state.showLines);
  const showLabels = useSkyStore((state) => state.showLabels);
  const selectedId = useSkyStore((state) => state.selectedConstellationId);
  const layout = useBreakpoint();

  // Koppintás az égen: a helyén lévő csillagkép kiválasztása (üres égen a kiválasztás megszűnik).
  const handleTap = useCallback<SkyTapHandler>(
    (x, y, viewport) => {
      const sky = useSkyStore.getState();
      sky.selectConstellation(
        pickConstellation({
          point: { x, y },
          viewport,
          date,
          location: sky.location,
          cultureId: sky.cultureId,
          includeLabels: sky.showLabels,
          selectedId: sky.selectedConstellationId,
        }),
      );
    },
    [date],
  );

  const skyRef = useRef<ViewInstance>(null);
  const { panHandlers, onLayout } = useSkyGestures(skyRef, handleTap);
  useWheelZoom(skyRef);

  return (
    <View style={styles.root}>
      <View
        ref={skyRef}
        style={StyleSheet.absoluteFill}
        onLayout={onLayout}
        {...panHandlers}
        testID="sky-view"
      >
        <MemoSkyScene
          date={date}
          location={location}
          cultureId={cultureId}
          showLines={showLines}
          selectedId={selectedId}
        />
      </View>

      {showLabels ? (
        <ConstellationLabels
          date={date}
          location={location}
          cultureId={cultureId}
          selectedId={selectedId}
        />
      ) : null}

      <SafeAreaView
        style={[
          styles.overlay,
          layout.expanded && styles.overlayExpanded,
          layout.landscape && styles.overlayLandscape,
        ]}
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View style={[styles.top, layout.expanded && styles.topExpanded]}>
          <CulturePicker />
          <LocationPicker />
        </View>
        <View
          style={[styles.infoArea, layout.compact ? styles.infoAreaCompact : styles.infoAreaWide]}
        >
          <ConstellationInfo />
        </View>
        <View style={styles.dockPosition}>
          <View
            style={[
              styles.dock,
              layout.expanded && styles.dockExpanded,
              layout.compact && styles.dockCompact,
            ]}
          >
            <TimeControls date={date} />
            {!layout.compact ? <View style={styles.separator} /> : null}
            <ViewControls />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  // A rétegek átengedik az érintést az égboltnak, csak a gyerekeik (gombok, panel) kapják el.
  // (A pointerEvents a stílusban: a régi pointerEvents prop weben elavult.)
  overlay: {
    pointerEvents: 'box-none',
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: navigation.bottomClearance,
  },
  overlayExpanded: {
    padding: spacing.xl,
    paddingLeft: sizing.navWidth + spacing.xl,
    paddingBottom: spacing.xl,
  },
  overlayLandscape: { paddingTop: spacing.sm, paddingBottom: sizing.navHeight + spacing.sm },
  top: {
    pointerEvents: 'box-none',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topExpanded: { paddingHorizontal: spacing.sm },
  infoArea: { pointerEvents: 'box-none', flex: 1, minHeight: 0, paddingVertical: spacing.sm },
  infoAreaCompact: { justifyContent: 'flex-end' },
  infoAreaWide: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  dockPosition: { pointerEvents: 'box-none', alignItems: 'center', width: '100%' },
  dock: {
    width: '100%',
    maxWidth: sizing.contentCompact,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderTopColor: colors.glassHighlight,
    backgroundColor: colors.glassStrong,
  },
  dockCompact: { flexDirection: 'column', maxWidth: sizing.contentCompact },
  dockExpanded: {
    maxWidth: sizing.contentWide,
    padding: spacing.md,
  },
  separator: {
    width: 1,
    height: spacing.xxl,
    backgroundColor: colors.border,
  },
});
