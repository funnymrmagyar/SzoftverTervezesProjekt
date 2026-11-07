import { memo, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConstellationInfo } from '@/features/live/ConstellationInfo';
import { CulturePicker } from '@/features/live/CulturePicker';
import { LocationPicker } from '@/features/live/LocationPicker';
import { TimeControls } from '@/features/live/TimeControls';
import { TimeTravelPanel } from '@/features/live/TimeTravelPanel';
import { useSkyTime } from '@/features/live/useSkyTime';
import { ViewControls } from '@/features/live/ViewControls';
import { ConstellationLabels } from '@/render/ConstellationLabels';
import { pickConstellation } from '@/render/pickConstellation';
import { SkyScene } from '@/render/SkyScene';
import { useSkyGestures, type SkyTapHandler } from '@/render/useSkyGestures';
import { useWheelZoom } from '@/render/useWheelZoom';
import { useSkyStore } from '@/state/useSkyStore';
import { GlassSurface } from '@/ui/GlassSurface';
import { ThreeZoneBar } from '@/ui/layout/ThreeZoneBar';
import { colors, navigation, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const MemoSkyScene = memo(SkyScene);

export default function LiveScreen() {
  const [timeTravelOpen, setTimeTravelOpen] = useState(false);
  const [moreControlsOpen, setMoreControlsOpen] = useState(false);
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
        <View style={styles.top}>
          <ThreeZoneBar
            sideSize={Math.min(240, Math.max(148, (layout.width - spacing.xxl) / 2))}
            style={styles.topZones}
            left={
              <View style={styles.topSlot}>
                <CulturePicker />
              </View>
            }
            center={<View />}
            right={
              <View style={styles.topSlot}>
                <LocationPicker compactTrigger={false} />
              </View>
            }
          />
        </View>
        <View style={styles.dockPosition}>
          <GlassSurface style={[styles.dock, layout.expanded && styles.dockExpanded]}>
            <ThreeZoneBar
              sideSize={
                layout.compact ? sizing.touch + spacing.xs : sizing.touch * 3 + spacing.xs * 2
              }
              style={styles.dockZones}
              left={
                <ViewControls
                  side="left"
                  compact={layout.compact}
                  moreOpen={moreControlsOpen}
                  onToggleMore={() => setMoreControlsOpen((open) => !open)}
                />
              }
              center={<TimeControls date={date} onOpenTimeTravel={() => setTimeTravelOpen(true)} />}
              right={
                <ViewControls side="right" compact={layout.compact} moreOpen={moreControlsOpen} />
              }
            />
          </GlassSurface>
        </View>
      </SafeAreaView>
      <TimeTravelPanel
        date={date}
        visible={timeTravelOpen}
        onClose={() => setTimeTravelOpen(false)}
      />
      <ConstellationInfo />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: navigation.bottomClearance,
  },
  overlayExpanded: {
    padding: spacing.xl,
    paddingLeft: sizing.navWidth + spacing.xl,
    paddingBottom: spacing.xl,
  },
  overlayLandscape: { paddingTop: spacing.sm, paddingBottom: sizing.navHeight + spacing.sm },
  top: { pointerEvents: 'box-none', width: '100%' },
  topZones: { width: '100%' },
  topSlot: { width: '100%', minWidth: 0 },
  dockPosition: { pointerEvents: 'box-none', alignItems: 'center', width: '100%' },
  dock: {
    width: '100%',
    maxWidth: sizing.contentWide,
    padding: spacing.sm,
  },
  dockExpanded: { padding: spacing.md },
  dockZones: { width: '100%' },
});
