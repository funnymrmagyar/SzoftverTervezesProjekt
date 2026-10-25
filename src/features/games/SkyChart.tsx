import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { bvToColor, starBrightness, starPointSize } from '@/render/starAppearance';
import { colors, radius, sizing } from '@/ui/theme';

import type { ChartModel, PlacedStar } from './chartModel';
import { CHART_ASPECT, lineBox } from './skyProjection';

/** Egy rajzolandó vonal két csillag (HIP) között. */
export interface ChartLine {
  key: string;
  a: number;
  b: number;
  color: string;
  opacity?: number;
  thickness?: number;
}

const cursorStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : undefined;
const RING_PADDING = 14;
/** Sűrű csillaghalmazban sem lehet ennél kisebb a koppintási zóna. */
const MIN_HIT = 24;

function starColor(bv: number): string {
  const [r, g, b] = bvToColor(bv);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function dotSize(star: PlacedStar): number {
  const size = starPointSize(star.mag) * 1.3;
  return Math.max(star.figure ? 5 : 2, size);
}

/**
 * Egyszerű csillagtérkép View-kból (külön grafikus függőség nélkül): csillagpontok és
 * elforgatott vékony téglalapok a vonalakhoz. A koordináták 0–1 közöttiek, a doboz méretéhez igazodnak.
 */
export function SkyChart({
  model,
  lines,
  selected = null,
  hinted = [],
  isTappable,
  onStarPress,
  accessibilityLabel,
  testID,
}: {
  model: ChartModel;
  lines: readonly ChartLine[];
  selected?: number | null;
  hinted?: readonly number[];
  /** Mely csillagokra lehet koppintani; ha nincs megadva, a térkép nem interaktív. */
  isTappable?: (star: PlacedStar) => boolean;
  onStarPress?: (star: PlacedStar) => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const tappableStars = onStarPress ? model.stars.filter((s) => isTappable?.(s) ?? true) : [];

  /** A koppintási zóna átmérője: legfeljebb a szokásos érintési méret, de nem nyúlik a szomszédba. */
  function hitSize(star: PlacedStar): number {
    let nearest = Infinity;
    for (const other of tappableStars) {
      if (other.hip === star.hip) continue;
      nearest = Math.min(nearest, Math.hypot((other.x - star.x) * width, (other.y - star.y) * height));
    }
    return Math.min(sizing.touch, Math.max(MIN_HIT, nearest));
  }

  return (
    <View
      testID={testID}
      accessible={!onStarPress}
      accessibilityRole={onStarPress ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      style={styles.chart}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }}
    >
      {width > 0
        ? lines.map((line) => {
            const from = model.position.get(line.a);
            const to = model.position.get(line.b);
            if (!from || !to) return null;
            const box = lineBox(from.x * width, from.y * height, to.x * width, to.y * height, line.thickness ?? 2);
            return (
              <View
                key={line.key}
                style={{
                  position: 'absolute',
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  borderRadius: box.height / 2,
                  backgroundColor: line.color,
                  opacity: line.opacity ?? 1,
                  transform: [{ rotate: `${box.angleRad}rad` }],
                  pointerEvents: 'none',
                }}
              />
            );
          })
        : null}

      {width > 0
        ? model.stars.map((star) => {
            const dot = dotSize(star);
            const cx = star.x * width;
            const cy = star.y * height;
            const isSelected = selected === star.hip;
            const isHinted = hinted.includes(star.hip);
            const tappable = Boolean(onStarPress) && (isTappable?.(star) ?? true);
            const ring = dot + RING_PADDING;

            const visual = (
              <>
                {isSelected || isHinted ? (
                  <View
                    style={[
                      styles.ring,
                      {
                        width: ring,
                        height: ring,
                        borderColor: isSelected ? colors.accent : colors.info,
                        pointerEvents: 'none',
                      },
                    ]}
                  />
                ) : null}
                <View
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    backgroundColor: starColor(star.bv),
                    opacity: star.figure ? 1 : starBrightness(star.mag) * 0.75,
                    pointerEvents: 'none',
                  }}
                />
              </>
            );

            if (!tappable) {
              return (
                <View
                  key={star.hip}
                  style={[
                    styles.cell,
                    { left: cx - sizing.touch / 2, top: cy - sizing.touch / 2, pointerEvents: 'none' },
                  ]}
                >
                  {visual}
                </View>
              );
            }
            const hit = hitSize(star);
            return (
              <Pressable
                key={star.hip}
                accessibilityRole="button"
                accessibilityLabel={star.name ? `Csillag: ${star.name}` : 'Csillag'}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onStarPress?.(star)}
                testID={`chart-star-${star.hip}`}
                style={[
                  styles.cell,
                  { left: cx - hit / 2, top: cy - hit / 2, width: hit, height: hit },
                  cursorStyle,
                ]}
              >
                {visual}
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    width: '100%',
    aspectRatio: CHART_ASPECT,
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.sky,
  },
  cell: {
    position: 'absolute',
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: radius.pill,
  },
});
