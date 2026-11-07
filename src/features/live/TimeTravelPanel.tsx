import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PointerEvent,
  type ViewInstance,
} from 'react-native';

import { formatYear, withTimeOfDay, withYear, YEAR_MAX, YEAR_MIN } from '@/core/time';
import { useSkyStore } from '@/state/useSkyStore';
import { Sheet } from '@/ui/layout/Sheet';
import { GlassSurface } from '@/ui/GlassSurface';
import { colors, font, sizing, spacing } from '@/ui/theme';
import {
  DAY_MINUTES,
  formatClock,
  minuteOfDay,
  sliderPositionForValue,
  sliderValueAtPosition,
  yearTicks,
} from './timeTravel';

type SliderAxis = 'year' | 'time';
interface PendingValue {
  axis: SliderAxis;
  value: number;
}

export function TimeTravelPanel({
  date,
  visible,
  onClose,
}: {
  date: Date;
  visible: boolean;
  onClose: () => void;
}) {
  const setYear = useSkyStore((state) => state.setYear);
  const setTimeOfDay = useSkyStore((state) => state.setTimeOfDay);
  const shiftDays = useSkyStore((state) => state.shiftDays);
  const shiftHours = useSkyStore((state) => state.shiftHours);
  const resetTimeToNow = useSkyStore((state) => state.resetTimeToNow);
  const [preview, setPreview] = useState<PendingValue | null>(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearText, setYearText] = useState(String(date.getFullYear()));
  const pending = useRef<PendingValue | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommit = useRef(0);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    lastCommit.current = Date.now();
    setPreview(next);
    if (next.axis === 'year') setYear(next.value);
    else setTimeOfDay(next.value);
  };

  function scheduleValue(axis: SliderAxis, value: number) {
    pending.current = { axis, value };
    const remaining = 34 - (Date.now() - lastCommit.current);
    if (remaining <= 0) {
      flushPending();
    } else if (!timer.current) {
      timer.current = setTimeout(flushPending, remaining);
    }
  }

  function finishSlider(axis: SliderAxis, value: number) {
    pending.current = { axis, value };
    flushPending();
    setPreview(null);
  }

  function applyYearInput() {
    const text = yearText.trim();
    const value = Number(text);
    if (text && Number.isFinite(value)) setYear(Math.trunc(value));
    setEditingYear(false);
  }

  function clearPendingPreview() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setPreview(null);
  }

  function resetToNow() {
    clearPendingPreview();
    resetTimeToNow();
  }

  function closePanel() {
    clearPendingPreview();
    onClose();
  }

  function stepYear(direction: -1 | 1) {
    const state = useSkyStore.getState();
    const current = new Date(state.manualTime ?? Date.now()).getFullYear();
    setYear(current + direction);
  }

  function startRepeat(action: () => void) {
    stopRepeat();
    action();
    repeatTimer.current = setInterval(action, 180);
  }

  function stopRepeat() {
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    repeatTimer.current = null;
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (repeatTimer.current) clearInterval(repeatTimer.current);
    },
    [],
  );

  const previewDate =
    preview?.axis === 'year'
      ? withYear(date, preview.value)
      : preview?.axis === 'time'
        ? withTimeOfDay(date, preview.value)
        : date;
  const shownYear = previewDate.getFullYear();
  const shownMinute = minuteOfDay(previewDate);

  return (
    <Sheet
      title="Időutazás"
      visible={visible}
      onClose={closePanel}
      scrim={false}
      maxMobileSnap="half"
      bodyPadding={0}
      sessionKey="time-travel"
    >
      <GlassSurface style={styles.card} testID="time-travel-card">
        <View style={styles.readout}>
          {editingYear ? (
            <TextInput
              autoFocus
              value={yearText}
              onChangeText={setYearText}
              onSubmitEditing={applyYearInput}
              onBlur={applyYearInput}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Év megadása"
              testID="time-year-input"
              style={styles.yearInput}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Év: ${formatYear(shownYear)}. Koppintással átírható.`}
              onPress={() => {
                setYearText(String(shownYear));
                setEditingYear(true);
              }}
              testID="time-year-edit"
            >
              <Text style={styles.dateText}>{formatYear(shownYear)}</Text>
            </Pressable>
          )}
          <Text style={styles.dateDetails} numberOfLines={1}>
            {previewDate.toLocaleDateString('hu-HU', { month: 'short' })} {previewDate.getDate()}. ·{' '}
            {formatClock(shownMinute)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Most"
            onPress={resetToNow}
            testID="time-now"
            style={styles.nowButton}
          >
            <Ionicons name="refresh" size={sizing.iconSmall} color={colors.accent} />
            <Text style={styles.nowText}>Most</Text>
          </Pressable>
        </View>

        <TimeSlider
          label="Év"
          value={shownYear}
          minimum={YEAR_MIN}
          maximum={YEAR_MAX}
          step={1}
          ticks={yearTicks(YEAR_MIN, YEAR_MAX)}
          valueLabel={(value) => String(value)}
          tickLabel={(value) => (value % 500 === 0 ? String(value) : null)}
          onValueChange={(value) => scheduleValue('year', value)}
          onSlidingComplete={(value) => finishSlider('year', value)}
          testID="time-year-track"
        />

        <View style={styles.timeHeading}>
          <Text style={styles.sliderLabel}>Idő · {formatClock(shownMinute)}</Text>
          <View style={styles.hourButtons}>
            <RepeatButton
              label="Előző óra"
              onStep={() => shiftHours(-1)}
              testID="time-back"
              icon="play-back"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <RepeatButton
              label="Következő óra"
              onStep={() => shiftHours(1)}
              testID="time-forward"
              icon="play-forward"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
          </View>
        </View>
        <TimeSlider
          label="Időpont"
          value={shownMinute}
          minimum={0}
          maximum={DAY_MINUTES}
          step={5}
          ticks={[0, 360, 720, 1080, 1440]}
          valueLabel={formatClock}
          tickLabel={(value) => formatClock(value).slice(0, 2)}
          onValueChange={(value) => scheduleValue('time', value)}
          onSlidingComplete={(value) => finishSlider('time', value)}
          testID="timeline-track"
        />

        <View style={styles.stepButtons}>
          <RepeatButton
            label="Egy évvel korábban"
            text="−1 év"
            onStep={() => stepYear(-1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label="Egy évvel később"
            text="+1 év"
            onStep={() => stepYear(1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label="Egy nappal korábban"
            text="−1 nap"
            onStep={() => shiftDays(-1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label="Egy nappal később"
            text="+1 nap"
            onStep={() => shiftDays(1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
        </View>
      </GlassSurface>
    </Sheet>
  );
}

function TimeSlider({
  label,
  value,
  minimum,
  maximum,
  step,
  ticks,
  valueLabel,
  tickLabel,
  onValueChange,
  onSlidingComplete,
  testID,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  ticks: number[];
  valueLabel: (value: number) => string;
  tickLabel: (value: number) => string | null;
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
  testID: string;
}) {
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const trackRef = useRef<ViewInstance>(null);
  const dragLeft = useRef<number | null>(null);
  const innerWidth = Math.max(0, width - sizing.touch);
  const currentPosition = sliderPositionForValue(value, innerWidth, minimum, maximum);
  const thumbCenter = sizing.touch / 2 + currentPosition;
  const labelText = valueLabel(value);
  const bubbleWidth = Math.max(sizing.touch, labelText.length * 7 + spacing.md);
  const bubbleLeft = Math.max(0, Math.min(width - bubbleWidth, thumbCenter - bubbleWidth / 2));

  function valueAt(x: number) {
    if (!Number.isFinite(x)) return value;
    return sliderValueAtPosition(x - sizing.touch / 2, innerWidth, minimum, maximum, step);
  }

  function handleKeyDown(event: { nativeEvent: { key: string }; preventDefault: () => void }) {
    const direction =
      event.nativeEvent.key === 'ArrowRight' || event.nativeEvent.key === 'ArrowUp'
        ? 1
        : event.nativeEvent.key === 'ArrowLeft' || event.nativeEvent.key === 'ArrowDown'
          ? -1
          : 0;
    if (direction === 0) return;
    event.preventDefault();
    const next = Math.max(minimum, Math.min(maximum, value + direction * step));
    onValueChange(next);
    onSlidingComplete(next);
  }

  function onTrackLayout(event: { nativeEvent: { layout: { width: number } } }) {
    setWidth(event.nativeEvent.layout.width);
  }

  function onPointerDown(event: PointerEvent) {
    trackRef.current?.measureInWindow((left) => {
      dragLeft.current = left;
      onValueChange(valueAt(event.nativeEvent.clientX - left));
    });
  }

  function onPointerMove(event: PointerEvent) {
    if (event.nativeEvent.buttons > 0 && dragLeft.current !== null) {
      onValueChange(valueAt(event.nativeEvent.clientX - dragLeft.current));
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (dragLeft.current === null) return;
    onSlidingComplete(valueAt(event.nativeEvent.clientX - dragLeft.current));
    dragLeft.current = null;
  }

  return (
    <View>
      <View
        ref={trackRef}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        focusable={Platform.OS === 'web'}
        tabIndex={Platform.OS === 'web' ? 0 : undefined}
        accessibilityValue={{ min: minimum, max: maximum, now: value }}
        accessibilityActions={[
          { name: 'increment', label: 'Növelés' },
          { name: 'decrement', label: 'Csökkentés' },
        ]}
        onAccessibilityAction={(event) => {
          const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
          const next = Math.max(minimum, Math.min(maximum, value + direction * step));
          onValueChange(next);
          onSlidingComplete(next);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onLayout={onTrackLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => onValueChange(valueAt(event.nativeEvent.locationX))}
        onResponderMove={(event) => onValueChange(valueAt(event.nativeEvent.locationX))}
        onResponderRelease={(event) => onSlidingComplete(valueAt(event.nativeEvent.locationX))}
        onResponderTerminate={(event) => onSlidingComplete(valueAt(event.nativeEvent.locationX))}
        onPointerDown={Platform.OS === 'web' ? onPointerDown : undefined}
        onPointerMove={Platform.OS === 'web' ? onPointerMove : undefined}
        onPointerUp={Platform.OS === 'web' ? onPointerUp : undefined}
        onPointerCancel={Platform.OS === 'web' ? onPointerUp : undefined}
        style={[styles.sliderHitArea, focused && styles.sliderFocused]}
        testID={testID}
      >
        <View pointerEvents="none" style={styles.sliderVisual}>
          <View style={styles.rail} />
          {ticks.map((tick) => {
            const x = sizing.touch / 2 + sliderPositionForValue(tick, innerWidth, minimum, maximum);
            const caption = tickLabel(tick);
            return (
              <View key={tick} style={[styles.tick, { left: x }]}>
                <View style={styles.tickMark} />
                {caption ? <Text style={styles.tickLabel}>{caption}</Text> : null}
              </View>
            );
          })}
          <View style={[styles.valueBubble, { left: bubbleLeft, width: bubbleWidth }]}>
            <Text style={styles.valueBubbleText}>{valueLabel(value)}</Text>
          </View>
          <View style={[styles.thumb, { left: thumbCenter - sizing.touch / 2 }]} />
        </View>
      </View>
    </View>
  );
}

function RepeatButton({
  label,
  onStep,
  startRepeat,
  stopRepeat,
  icon,
  text,
  testID,
}: {
  label: string;
  onStep: () => void;
  startRepeat: (action: () => void) => void;
  stopRepeat: () => void;
  icon?: 'play-back' | 'play-forward';
  text?: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => startRepeat(onStep)}
      onPressOut={stopRepeat}
      testID={testID}
      style={styles.stepButton}
    >
      {icon ? <Ionicons name={icon} size={sizing.iconSmall} color={colors.textMuted} /> : null}
      {text ? <Text style={styles.stepButtonText}>{text}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 0, padding: spacing.sm, gap: spacing.xs },
  readout: { minHeight: sizing.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dateDetails: { flex: 1, color: colors.textMuted, fontSize: 12 },
  yearInput: {
    flex: 1,
    minHeight: sizing.touch,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
  },
  nowButton: {
    minHeight: sizing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.cardHighlight,
  },
  nowText: { ...font.caption, color: colors.accent, fontWeight: '600' },
  sliderLabel: { ...font.caption, flex: 1, color: colors.textMuted },
  timeHeading: { minHeight: sizing.touch, flexDirection: 'row', alignItems: 'center' },
  hourButtons: { flexDirection: 'row' },
  stepButtons: { flexDirection: 'row', gap: spacing.xs },
  stepButton: {
    minWidth: sizing.touch,
    minHeight: sizing.touch,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  stepButtonText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  sliderHitArea: { height: sizing.touch, justifyContent: 'center' },
  sliderFocused: { borderWidth: 1, borderColor: colors.accent, borderRadius: 8 },
  sliderVisual: { ...StyleSheet.absoluteFill },
  rail: {
    position: 'absolute',
    left: sizing.touch / 2,
    right: sizing.touch / 2,
    top: 20,
    height: spacing.xs,
    borderRadius: 99,
    backgroundColor: colors.surfaceRaised,
  },
  tick: { position: 'absolute', top: 20, alignItems: 'center', width: 1 },
  tickMark: { width: 1, height: spacing.sm, backgroundColor: colors.textSubtle },
  tickLabel: {
    position: 'absolute',
    top: spacing.sm + spacing.xs,
    minWidth: 34,
    color: colors.textSubtle,
    fontSize: 9,
    textAlign: 'center',
    transform: [{ translateX: -17 }],
  },
  valueBubble: {
    position: 'absolute',
    top: -spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  valueBubbleText: { color: colors.accentText, fontSize: 10, fontWeight: '700' },
  thumb: {
    position: 'absolute',
    top: 0,
    width: sizing.touch,
    height: sizing.touch,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
});
