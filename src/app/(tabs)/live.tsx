import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CulturePicker } from '@/features/live/CulturePicker';
import { LocationPicker } from '@/features/live/LocationPicker';
import { TimeControls } from '@/features/live/TimeControls';
import { useSkyTime } from '@/features/live/useSkyTime';
import { ViewControls } from '@/features/live/ViewControls';
import { SkyScene } from '@/render/SkyScene';
import { useSkyGestures } from '@/render/useSkyGestures';
import { useWheelZoom } from '@/render/useWheelZoom';
import { getDeviceLocation } from '@/services/location/deviceLocation';
import { useSkyStore } from '@/state/useSkyStore';
import { colors, radius, spacing } from '@/ui/theme';

export default function LiveScreen() {
  const date = useSkyTime();
  const location = useSkyStore((s) => s.location);
  const cultureId = useSkyStore((s) => s.cultureId);
  const showLines = useSkyStore((s) => s.showLines);

  const skyRef = useRef<View>(null);
  const { panHandlers, onLayout } = useSkyGestures();
  useWheelZoom(skyRef);

  // Első megnyitáskor megpróbáljuk a GPS-t; ha nem megy, marad az alapértelmezett hely.
  useEffect(() => {
    if (useSkyStore.getState().locationSource !== 'default') return;
    getDeviceLocation().then((loc) => {
      if (loc && useSkyStore.getState().locationSource === 'default') {
        useSkyStore.getState().setLocation(loc, 'gps');
      }
    });
  }, []);

  return (
    <View style={styles.root}>
      <View
        ref={skyRef}
        style={StyleSheet.absoluteFill}
        onLayout={onLayout}
        {...panHandlers}
        testID="sky-view"
      >
        <SkyScene date={date} location={location} cultureId={cultureId} showLines={showLines} />
      </View>

      <SafeAreaView
        style={styles.overlay}
        pointerEvents="box-none"
        edges={['top', 'left', 'right']}
      >
        <View style={styles.top} pointerEvents="box-none">
          <CulturePicker />
          <LocationPicker />
        </View>
        <View style={styles.bottom}>
          <TimeControls date={date} />
          <ViewControls />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  overlay: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  top: { gap: spacing.sm },
  bottom: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
