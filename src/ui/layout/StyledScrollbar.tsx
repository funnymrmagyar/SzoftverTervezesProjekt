import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors, radius, sizing } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import { calculateScrollbarMetrics, scrollOffsetForTrackPosition } from './geometry';

export function StyledScrollbar({
  orientation = 'vertical',
  contentSize,
  viewportSize,
  offset,
  onScrollTo,
  accessibilityLabel,
}: {
  orientation?: 'vertical' | 'horizontal';
  contentSize: number;
  viewportSize: number;
  offset: number;
  onScrollTo: (offset: number) => void;
  accessibilityLabel: string;
}) {
  const [trackSize, setTrackSize] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const vertical = orientation === 'vertical';
  const metrics = calculateScrollbarMetrics(contentSize, viewportSize, trackSize, offset);

  const showTemporarily = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    opacity.stopAnimation();
    opacity.setValue(1);
    if (!hovered) {
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: reducedMotion ? 0 : 250,
          useNativeDriver: true,
        }).start();
      }, 700);
    }
  }, [hovered, opacity, reducedMotion]);

  useEffect(() => {
    showTemporarily();
  }, [offset, showTemporarily]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setTrackSize(vertical ? height : width);
  }

  function moveToPosition(position: number) {
    onScrollTo(scrollOffsetForTrackPosition(position, metrics));
    showTemporarily();
  }

  function onAccessibilityAction(actionName: string) {
    const step = Math.max(1, viewportSize / 10);
    onScrollTo(
      Math.max(
        0,
        Math.min(metrics.maxOffset, offset + (actionName === 'increment' ? step : -step)),
      ),
    );
    showTemporarily();
  }

  if (metrics.maxOffset <= 0) return null;

  const thumbStyle = vertical
    ? { height: metrics.thumbSize, top: metrics.thumbOffset }
    : { width: metrics.thumbSize, left: metrics.thumbOffset };

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(metrics.progress * 100) }}
      accessibilityActions={[
        { name: 'increment', label: 'Tovább görgetés' },
        { name: 'decrement', label: 'Visszagörgetés' },
      ]}
      onAccessibilityAction={(event) => onAccessibilityAction(event.nativeEvent.actionName)}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) =>
        moveToPosition(vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX)
      }
      onResponderMove={(event) =>
        moveToPosition(vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX)
      }
      onHoverIn={() => {
        setHovered(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.timing(opacity, {
          toValue: 1,
          duration: reducedMotion ? 0 : 120,
          useNativeDriver: true,
        }).start();
      }}
      onHoverOut={() => {
        setHovered(false);
        showTemporarily();
      }}
      style={[styles.trackHitArea, vertical ? styles.verticalTrack : styles.horizontalTrack]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.visualTrack,
          vertical ? styles.verticalVisual : styles.horizontalVisual,
          { opacity },
        ]}
      >
        <View style={[styles.rail, vertical ? styles.verticalRail : styles.horizontalRail]} />
        <View
          style={[
            styles.thumb,
            vertical ? styles.verticalThumb : styles.horizontalThumb,
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trackHitArea: { minWidth: sizing.touch, minHeight: sizing.touch, justifyContent: 'center' },
  verticalTrack: { width: sizing.touch, height: '100%' },
  horizontalTrack: { width: '100%', height: sizing.touch },
  visualTrack: { position: 'absolute' },
  verticalVisual: { top: 0, bottom: 0, left: 0, right: 0 },
  horizontalVisual: { top: 0, bottom: 0, left: 0, right: 0 },
  rail: { position: 'absolute', backgroundColor: colors.surfaceRaised, borderRadius: radius.pill },
  verticalRail: { width: 3, top: 0, bottom: 0, left: '50%', marginLeft: -1.5 },
  horizontalRail: { height: 3, left: 0, right: 0, top: '50%', marginTop: -1.5 },
  thumb: { position: 'absolute', backgroundColor: colors.accent, borderRadius: radius.pill },
  verticalThumb: { width: 10, left: '50%', marginLeft: -5 },
  horizontalThumb: { height: 10, top: '50%', marginTop: -5 },
});
