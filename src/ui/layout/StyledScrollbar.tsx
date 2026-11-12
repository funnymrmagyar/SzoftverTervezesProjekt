import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

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
  const [opacity] = useState(() => new Animated.Value(Platform.OS === 'web' ? 0.55 : 0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<any>(null);
  const trackOrigin = useRef(0);
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
          toValue: Platform.OS === 'web' ? 0.45 : 0,
          duration: reducedMotion ? 0 : 250,
          useNativeDriver: true,
        }).start();
      }, 900);
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
    const { width, height, x, y } = event.nativeEvent.layout;
    setTrackSize(vertical ? height : width);
    trackRef.current?.measureInWindow((mx: number, my: number) => {
      trackOrigin.current = vertical ? my : mx;
    });
    if (Platform.OS !== 'web') {
      trackOrigin.current = vertical ? y : x;
    }
  }

  function moveToPosition(position: number) {
    onScrollTo(scrollOffsetForTrackPosition(position, metrics));
    showTemporarily();
  }

  function positionFromEvent(event: GestureResponderEvent): number {
    return vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX;
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

  function onWebMouseDown(event: {
    clientX: number;
    clientY: number;
    preventDefault?: () => void;
    button?: number;
  }) {
    if (Platform.OS !== 'web') return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault?.();

    const startClient = vertical ? event.clientY : event.clientX;

    trackRef.current?.measureInWindow((mx: number, my: number, width: number, height: number) => {
      const origin = vertical ? my : mx;
      const size = vertical ? height : width;
      trackOrigin.current = origin;
      setTrackSize(size);
      const local = startClient - origin;
      moveToPosition(local);
    });

    const onMove = (e: MouseEvent) => {
      const client = vertical ? e.clientY : e.clientX;
      moveToPosition(client - trackOrigin.current);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  if (metrics.maxOffset <= 0) return null;

  const thumbStyle = vertical
    ? { height: metrics.thumbSize, top: metrics.thumbOffset }
    : { width: metrics.thumbSize, left: metrics.thumbOffset };

  return (
    <Pressable
      ref={trackRef}
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
      onResponderGrant={(event) => moveToPosition(positionFromEvent(event))}
      onResponderMove={(event) => moveToPosition(positionFromEvent(event))}
      // @ts-expect-error RN Web mouse
      onMouseDown={onWebMouseDown}
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
      style={[
        styles.trackHitArea,
        vertical ? styles.verticalTrack : styles.horizontalTrack,
        Platform.OS === 'web' ? { cursor: 'pointer' } : null,
      ]}
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
  trackHitArea: {
    minWidth: sizing.touch,
    minHeight: sizing.touch,
    justifyContent: 'center',
  },
  verticalTrack: { width: sizing.touch, height: '100%' },
  horizontalTrack: { width: '100%', height: sizing.touch },
  visualTrack: { position: 'absolute' },
  verticalVisual: { top: 0, bottom: 0, left: 0, right: 0 },
  horizontalVisual: { top: 0, bottom: 0, left: 0, right: 0 },
  rail: {
    position: 'absolute',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
  },
  verticalRail: { width: 3, top: 0, bottom: 0, left: '50%', marginLeft: -1.5 },
  horizontalRail: { height: 3, left: 0, right: 0, top: '50%', marginTop: -1.5 },
  thumb: {
    position: 'absolute',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  verticalThumb: { width: 10, left: '50%', marginLeft: -5 },
  horizontalThumb: { height: 10, top: '50%', marginTop: -5 },
});