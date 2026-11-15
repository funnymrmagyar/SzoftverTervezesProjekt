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
import { suppressTextSelectionUntilRelease } from '@/ui/textSelection';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';
import {
  DAY_MINUTES,
  formatClock,
  minuteOfDay,
  sliderPositionForValue,
  sliderValueAtPosition,
  yearTicks,
} from './timeTravel';

type SliderAxis = 'year' | 'time';

/** A csúszkák fogantyújának (karikájának) átmérője; a megfogható terület ennél nagyobb. */
const THUMB_SIZE = 24;
/** A sín függőleges közepe a csúszka 44 pontos megfogható sávjában. */
const RAIL_CENTER = 22;
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
  const { compact } = useBreakpoint();
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

  const yearControl = editingYear ? (
    <TextInput
      autoFocus
      value={yearText}
      onChangeText={setYearText}
      onSubmitEditing={applyYearInput}
      onBlur={applyYearInput}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel="Év megadása"
      testID="time-year-input"
      style={[styles.yearInput, compact && styles.yearInputCompact]}
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
      style={compact ? styles.yearPressCompact : undefined}
    >
      <Text style={compact ? styles.yearCompact : styles.dateText}>{formatYear(shownYear)}</Text>
    </Pressable>
  );

  const nowButton = (
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
  );

  const yearSlider = (
    <TimeSlider
      label="Év"
      value={shownYear}
      minimum={YEAR_MIN}
      maximum={YEAR_MAX}
      step={1}
      ticks={
        compact
          ? yearTicks(YEAR_MIN, YEAR_MAX).filter((tick) => tick % 500 === 0)
          : yearTicks(YEAR_MIN, YEAR_MAX)
      }
      tickLabel={(value) => (!compact && value % 500 === 0 ? String(value) : null)}
      onValueChange={(value) => scheduleValue('year', value)}
      onSlidingComplete={(value) => finishSlider('year', value)}
      testID="time-year-track"
    />
  );

  const timeSlider = (
    <TimeSlider
      label="Időpont"
      value={shownMinute}
      minimum={0}
      maximum={DAY_MINUTES}
      step={5}
      ticks={[0, 360, 720, 1080, 1440]}
      tickLabel={(value) => (compact ? null : formatClock(value).slice(0, 2))}
      onValueChange={(value) => scheduleValue('time', value)}
      onSlidingComplete={(value) => finishSlider('time', value)}
      testID="timeline-track"
    />
  );

  if (compact) {
    /*
     * Telefonos, tömör elrendezés: egy sorban a dátum (az év átírható, a nap két nyíllal
     * léptethető), alatta a két csúszka; mindkettő két végén egy-egy nyíl lépteti egy évvel,
     * illetve egy órával (nyomva tartva folyamatosan). A lap csak akkora, amekkora a tartalma.
     */
    return (
      <Sheet
        title="Időutazás"
        visible={visible}
        onClose={closePanel}
        scrim={false}
        bodyPadding={0}
        sessionKey="time-travel"
        fitContent
      >
        <View style={styles.compactCard} testID="time-travel-card">
          <View style={styles.compactReadout}>
            {yearControl}
            <RepeatButton
              label="Egy nappal korábban"
              icon="chevron-back"
              variant="arrow"
              onStep={() => shiftDays(-1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <Text style={styles.compactDate} numberOfLines={1}>
              {previewDate.toLocaleDateString('hu-HU', { month: 'short' })} {previewDate.getDate()}.
            </Text>
            <RepeatButton
              label="Egy nappal később"
              icon="chevron-forward"
              variant="arrow"
              onStep={() => shiftDays(1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <Text style={styles.compactClock}>{formatClock(shownMinute)}</Text>
            <View style={styles.spacer} />
            {nowButton}
          </View>

          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>Év</Text>
            <RepeatButton
              label="Egy évvel korábban"
              icon="chevron-back"
              variant="arrow"
              onStep={() => stepYear(-1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <View style={styles.compactSlider}>{yearSlider}</View>
            <RepeatButton
              label="Egy évvel később"
              icon="chevron-forward"
              variant="arrow"
              onStep={() => stepYear(1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
          </View>

          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>Idő</Text>
            <RepeatButton
              label="Előző óra"
              icon="chevron-back"
              variant="arrow"
              onStep={() => shiftHours(-1)}
              testID="time-back"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <View style={styles.compactSlider}>{timeSlider}</View>
            <RepeatButton
              label="Következő óra"
              icon="chevron-forward"
              variant="arrow"
              onStep={() => shiftHours(1)}
              testID="time-forward"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
          </View>
        </View>
      </Sheet>
    );
  }

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
          {yearControl}
          <Text style={styles.dateDetails} numberOfLines={1}>
            {previewDate.toLocaleDateString('hu-HU', { month: 'short' })} {previewDate.getDate()}. ·{' '}
            {formatClock(shownMinute)}
          </Text>
          {nowButton}
        </View>

        {yearSlider}

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
        {timeSlider}

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
    // Húzás közben ne jelölődjön ki a szöveg az oldalon (és a kijelölés ne szakítsa meg a húzást).
    suppressTextSelectionUntilRelease();
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
        onResponderTerminationRequest={() => false}
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
          <View style={[styles.thumb, { left: thumbCenter - THUMB_SIZE / 2 }]} />
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
  variant = 'button',
}: {
  label: string;
  onStep: () => void;
  startRepeat: (action: () => void) => void;
  stopRepeat: () => void;
  icon?: 'play-back' | 'play-forward' | 'chevron-back' | 'chevron-forward';
  text?: string;
  testID?: string;
  /** „arrow”: kis, keret nélküli nyíl a csúszkák mellé (telefonos elrendezés). */
  variant?: 'button' | 'arrow';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => startRepeat(onStep)}
      onPressOut={stopRepeat}
      testID={testID}
      hitSlop={variant === 'arrow' ? { top: 4, bottom: 4 } : undefined}
      style={({ pressed }) => [
        variant === 'arrow' ? styles.arrowButton : styles.stepButton,
        pressed && variant === 'arrow' && styles.arrowPressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={variant === 'arrow' ? sizing.icon : sizing.iconSmall}
          color={colors.textMuted}
        />
      ) : null}
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
  arrowButton: {
    width: spacing.xxl,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  arrowPressed: { backgroundColor: colors.cardHighlight },
  compactCard: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, gap: 2 },
  compactReadout: { minHeight: sizing.touch, flexDirection: 'row', alignItems: 'center' },
  yearPressCompact: { minHeight: sizing.touch, justifyContent: 'center', paddingRight: spacing.xs },
  yearCompact: { ...font.body, color: colors.text, fontWeight: '700' },
  yearInputCompact: { flex: 0, width: 88 },
  compactDate: { ...font.small, minWidth: 56, color: colors.textMuted, textAlign: 'center' },
  compactClock: {
    ...font.body,
    ...font.mono,
    marginLeft: spacing.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  spacer: { flex: 1 },
  compactRow: { flexDirection: 'row', alignItems: 'center' },
  compactLabel: { ...font.caption, width: 28, color: colors.textMuted, fontWeight: '600' },
  compactSlider: { flex: 1, minWidth: 0 },
  sliderHitArea: { height: sizing.touch, justifyContent: 'center' },
  sliderFocused: { borderWidth: 1, borderColor: colors.accent, borderRadius: 8 },
  sliderVisual: { ...StyleSheet.absoluteFill },
  rail: {
    position: 'absolute',
    left: sizing.touch / 2,
    right: sizing.touch / 2,
    top: RAIL_CENTER - spacing.xs / 2,
    height: spacing.xs,
    borderRadius: 99,
    backgroundColor: colors.surfaceRaised,
  },
  tick: { position: 'absolute', top: RAIL_CENTER - spacing.xs / 2, alignItems: 'center', width: 1 },
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
  thumb: {
    position: 'absolute',
    top: RAIL_CENTER - THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
});
