import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { calculateThreeZoneWidths } from './geometry';

export function ThreeZoneBar({
  left,
  center,
  right,
  orientation = 'horizontal',
  sideSize = 56,
  style,
}: {
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  sideSize?: number;
  style?: ViewStyle;
}) {
  const [availableSize, setAvailableSize] = useState(0);
  const horizontal = orientation === 'horizontal';
  const widths = calculateThreeZoneWidths(availableSize || sideSize * 2 + 1, sideSize);

  function onLayout(event: LayoutChangeEvent) {
    const nextSize = horizontal ? event.nativeEvent.layout.width : event.nativeEvent.layout.height;
    setAvailableSize((current) => (current === nextSize ? current : nextSize));
  }

  const sideStyle = horizontal ? { width: widths.sideWidth } : { height: widths.sideWidth };
  const centerStyle = horizontal
    ? { width: widths.centerWidth }
    : { height: widths.centerWidth, width: '100%' as const };

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, horizontal ? styles.horizontal : styles.vertical, style]}
    >
      <View style={[styles.side, sideStyle]}>{left}</View>
      <View style={[styles.center, centerStyle]}>{center}</View>
      <View style={[styles.side, sideStyle]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  horizontal: { width: '100%', flexDirection: 'row' },
  vertical: { height: '100%', flexDirection: 'column' },
  side: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  center: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
