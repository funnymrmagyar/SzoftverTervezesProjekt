import { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';

import { skyRotationMatrix } from '@/core/astronomy';
import { getSkyCultures } from '@/core/catalog';
import type { GeoLocation } from '@/core/models';
import { useViewStore } from '@/state/useViewStore';
import { colors } from '@/ui/theme';

import {
  constellationAnchors,
  LABEL_FONT_SIZE,
  LABEL_LINE_HEIGHT,
  layoutLabels,
  estimateLabelWidth,
  type Viewport,
} from './labelLayout';

type LabelTextStyle = TextStyle & { textShadow?: string };

const labelShadow: LabelTextStyle =
  Platform.OS === 'web'
    ? { textShadow: '0 0 3px rgba(0, 0, 0, 0.9)' }
    : {
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
      };

interface Props {
  date: Date;
  location: GeoLocation;
  cultureId: string;
}

/**
 * Csillagképnevek a 3D égbolt fölött, Stellarium-stílusban, a csillagkép közepén.
 * Minden kultúrában ugyanolyan színűek (a vonalszín kultúránként más lehet).
 * Nem fogja el az érintést, így a húzás és a nagyítás átmegy alatta.
 */
export function ConstellationLabels({ date, location, cultureId }: Props) {
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const azimuth = useViewStore((s) => s.azimuth);
  const altitude = useViewStore((s) => s.altitude);
  const fov = useViewStore((s) => s.fov);

  const repo = getSkyCultures();
  const culture = repo.get(cultureId);
  const anchors = useMemo(
    () =>
      culture ? constellationAnchors(repo.lineSegments(cultureId), culture.constellations) : [],
    [repo, culture, cultureId],
  );
  const matrix = useMemo(() => skyRotationMatrix(date, location), [date, location]);
  const labels = useMemo(
    () =>
      viewport.width > 0 ? layoutLabels(anchors, matrix, { azimuth, altitude, fov }, viewport) : [],
    [anchors, matrix, azimuth, altitude, fov, viewport],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      onLayout={onLayout}
      testID="constellation-labels"
    >
      {labels.map((label) => (
        <Text
          key={label.id}
          numberOfLines={1}
          style={[
            styles.label,
            {
              left: label.x - estimateLabelWidth(label.name) / 2,
              top: label.y - LABEL_LINE_HEIGHT / 2,
              width: estimateLabelWidth(label.name),
            },
          ]}
        >
          {label.name}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: LABEL_LINE_HEIGHT,
    fontWeight: '500',
    letterSpacing: 0.4,
    opacity: 0.9,
    ...labelShadow,
  },
});
