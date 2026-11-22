import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { horizontalToVector } from '@/core/astronomy';
import { useViewStore } from '@/state/useViewStore';
import { t, useLocale, type TranslationKey } from '@/ui/i18n';

import { projectToScreen, type Viewport } from './labelLayout';

/** Az égtájbetűk a horizont fölött ennyi fokkal ülnek, hogy ne a vonalra lógjanak. */
const LABEL_ALTITUDE = 2.5;
const LABEL_SIZE = 22;

/** A négy fő égtáj: azimut és a fordítási kulcs (É, K, D, Ny / N, E, S, W). */
const CARDINALS: { azimuth: number; key: TranslationKey; north?: boolean }[] = [
  { azimuth: 0, key: 'compass.0', north: true },
  { azimuth: 90, key: 'compass.2' },
  { azimuth: 180, key: 'compass.4' },
  { azimuth: 270, key: 'compass.6' },
];

const shadow =
  Platform.OS === 'web'
    ? { textShadow: '0 0 4px rgba(0, 0, 0, 0.95)' }
    : {
        textShadowColor: 'rgba(0, 0, 0, 0.95)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4,
      };

/**
 * A négy égtáj betűje a horizonton (a korábbi pöckök helyett). Az égboltra vetítve követi a
 * nézetet, és nem fogja el az érintést, így a húzás és nagyítás átmegy alatta.
 */
export function CompassLabels() {
  useLocale();
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const azimuth = useViewStore((s) => s.azimuth);
  const altitude = useViewStore((s) => s.altitude);
  const fov = useViewStore((s) => s.fov);

  const directions = useMemo(
    () =>
      CARDINALS.map((cardinal) => ({
        ...cardinal,
        vector: horizontalToVector({ azimuth: cardinal.azimuth, altitude: LABEL_ALTITUDE }),
      })),
    [],
  );

  const placed =
    viewport.width > 0
      ? directions.flatMap((cardinal) => {
          const point = projectToScreen(cardinal.vector, { azimuth, altitude, fov }, viewport);
          const visible =
            point &&
            point.x > -LABEL_SIZE &&
            point.x < viewport.width + LABEL_SIZE &&
            point.y > -LABEL_SIZE &&
            point.y < viewport.height + LABEL_SIZE;
          return visible ? [{ ...cardinal, x: point.x, y: point.y }] : [];
        })
      : [];

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      onLayout={onLayout}
      testID="compass-labels"
    >
      {placed.map((label) => (
        <Text
          key={label.key}
          style={[
            styles.label,
            label.north && styles.north,
            { left: label.x - LABEL_SIZE * 1.5, top: label.y - LABEL_SIZE, width: LABEL_SIZE * 3 },
          ]}
        >
          {t(label.key)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    textAlign: 'center',
    color: '#b9d3c5',
    fontSize: LABEL_SIZE,
    lineHeight: LABEL_SIZE + 4,
    fontWeight: '700',
    ...shadow,
  },
  north: { color: '#ff6b6b', ...{ fontWeight: '800' as const } },
});
