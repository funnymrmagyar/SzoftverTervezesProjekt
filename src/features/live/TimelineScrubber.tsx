import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { IconButton } from '@/ui/components';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useTimelineScale } from './useTimelineScale';
import { timelineEdgeLabels, timelineTimeAtPosition } from './timelineScale';

interface DragState {
  anchorTime: number;
  width: number;
}

interface Props {
  date: Date;
}

export function TimelineScrubber({ date }: Props) {
  const setManualTime = useSkyStore((state) => state.setManualTime);
  const scale = useTimelineScale();
  const [width, setWidth] = useState(0);
  const [dragX, setDragX] = useState<number | null>(null);
  const drag = useRef<DragState | null>(null);
  const frame = useRef<number | null>(null);
  const pendingTime = useRef<number | null>(null);
  const pendingX = useRef<number | null>(null);
  const edgeLabels = timelineEdgeLabels(scale.span.durationMs);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function flush() {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (pendingTime.current !== null) {
      setManualTime(pendingTime.current);
      pendingTime.current = null;
    }
    if (pendingX.current !== null) {
      setDragX(pendingX.current);
      pendingX.current = null;
    }
  }

  function schedulePosition(positionX: number) {
    const currentDrag = drag.current;
    if (!currentDrag) return;
    const boundedX = Math.max(0, Math.min(currentDrag.width, positionX));
    pendingX.current = boundedX;
    pendingTime.current = timelineTimeAtPosition(
      currentDrag.anchorTime,
      boundedX,
      currentDrag.width,
      scale.span.durationMs,
    );
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        flush();
      });
    }
  }

  function onGrant(positionX: number) {
    if (width <= 0) return;
    drag.current = { anchorTime: date.getTime(), width };
    schedulePosition(positionX);
  }

  function onRelease() {
    flush();
    drag.current = null;
    pendingX.current = null;
    pendingTime.current = null;
    setDragX(null);
  }

  function adjustForAccessibility(direction: -1 | 1) {
    setManualTime(
      timelineTimeAtPosition(
        date.getTime(),
        width / 2 + direction * width * 0.05,
        width,
        scale.span.durationMs,
      ),
    );
  }

  return (
    <View style={styles.container}>
      <IconButton
        icon="remove"
        label="Nagyítás az idővonalon"
        disabled={!scale.canZoomIn}
        onPress={scale.zoomIn}
        testID="timeline-zoom-in"
        style={styles.zoomButton}
      />
      <View style={styles.timeline}>
        <Text style={styles.rangeLabel}>{scale.span.label}</Text>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Idővonal. Húzd az égbolt dátumának módosításához."
          accessibilityValue={{ text: `${date.toLocaleString('hu-HU')}, ${scale.span.label}` }}
          accessibilityActions={[
            { name: 'increment', label: 'Ugrás előre' },
            { name: 'decrement', label: 'Ugrás vissza' },
          ]}
          onAccessibilityAction={(event) =>
            adjustForAccessibility(event.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
          onLayout={onLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) => onGrant(event.nativeEvent.locationX)}
          onResponderMove={(event) => schedulePosition(event.nativeEvent.locationX)}
          onResponderRelease={onRelease}
          onResponderTerminate={onRelease}
          onResponderTerminationRequest={() => false}
          style={styles.trackHitArea}
          testID="timeline-track"
        >
          <View pointerEvents="none" style={styles.track}>
            <View style={styles.rail} />
            {[0, 0.25, 0.5, 0.75, 1].map((position) => (
              <View
                key={position}
                style={[
                  styles.tick,
                  position === 0.5 && styles.centerTick,
                  { left: `${position * 100}%` },
                ]}
              />
            ))}
            <View style={[styles.thumb, { left: dragX === null || width === 0 ? '50%' : dragX }]} />
          </View>
        </View>
        <View style={styles.edgeLabels} pointerEvents="none">
          <Text style={styles.edgeLabel}>{edgeLabels.start}</Text>
          <Text style={styles.edgeLabel}>{edgeLabels.end}</Text>
        </View>
      </View>
      <IconButton
        icon="add"
        label="Kicsinyítés az idővonalon"
        disabled={!scale.canZoomOut}
        onPress={scale.zoomOut}
        testID="timeline-zoom-out"
        style={styles.zoomButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  zoomButton: { width: sizing.touch - spacing.sm, height: sizing.touch - spacing.sm },
  timeline: { flex: 1, minWidth: 0, gap: spacing.xs },
  rangeLabel: { ...font.caption, color: colors.accent, textAlign: 'center' },
  trackHitArea: {
    height: sizing.touch - spacing.md,
    justifyContent: 'center',
  },
  track: { height: '100%', justifyContent: 'center' },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tick: {
    position: 'absolute',
    width: 1,
    height: spacing.sm,
    marginLeft: -0.5,
    backgroundColor: colors.textSubtle,
  },
  centerTick: { height: spacing.md, backgroundColor: colors.accent },
  thumb: {
    position: 'absolute',
    width: spacing.md,
    height: spacing.md,
    marginLeft: -spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.text,
  },
  edgeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  edgeLabel: { ...font.caption, color: colors.textMuted, fontSize: 10 },
});
