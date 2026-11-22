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
  type StyleProp,
  type TextStyle,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';

import { withTimeOfDay, withYear, YEAR_MAX, YEAR_MIN } from '@/core/time';
import { useSkyStore } from '@/state/useSkyStore';
import { Sheet } from '@/ui/layout/Sheet';
import { GlassSurface } from '@/ui/GlassSurface';
import { t, useLocale } from '@/ui/i18n';
import { suppressTextSelectionUntilRelease } from '@/ui/textSelection';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';
import {
  DAY_MINUTES,
  formatClock,
  formatDayText,
  formatMonthName,
  formatYearText,
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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

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
  useLocale();
  const setYear = useSkyStore((state) => state.setYear);
  const setMonth = useSkyStore((state) => state.setMonth);
  const setDay = useSkyStore((state) => state.setDay);
  const setTimeOfDay = useSkyStore((state) => state.setTimeOfDay);
  const shiftDays = useSkyStore((state) => state.shiftDays);
  const shiftHours = useSkyStore((state) => state.shiftHours);
  const resetTimeToNow = useSkyStore((state) => state.resetTimeToNow);
  const { compact } = useBreakpoint();
  const [preview, setPreview] = useState<PendingValue | null>(null);
  const [editingYear, setEditingYear] = useState(false);
  const [editingMonth, setEditingMonth] = useState(false);
  const [editingDay, setEditingDay] = useState(false);
  const [editingHour, setEditingHour] = useState(false);
  const [editingMinute, setEditingMinute] = useState(false);
  const [yearText, setYearText] = useState(String(date.getFullYear()));
  const [monthText, setMonthText] = useState(String(date.getMonth() + 1));
  const [dayText, setDayText] = useState(String(date.getDate()));
  const [hourText, setHourText] = useState(pad2(date.getHours()));
  const [minuteText, setMinuteText] = useState(pad2(date.getMinutes()));
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

  function applyMonthInput() {
    const text = monthText.trim();
    const value = Number(text);
    if (text && Number.isFinite(value)) setMonth(Math.trunc(value));
    setEditingMonth(false);
  }

  function applyDayInput() {
    const text = dayText.trim();
    const value = Number(text);
    if (text && Number.isFinite(value)) setDay(Math.trunc(value));
    setEditingDay(false);
  }

  function applyHourInput() {
    const text = hourText.trim();
    const value = Number(text);
    if (text && Number.isFinite(value)) {
      const hour = Math.min(24, Math.max(0, Math.trunc(value)));
      if (hour === 24) setTimeOfDay(DAY_MINUTES);
      else setTimeOfDay(hour * 60 + shownClockMinute);
    }
    setEditingHour(false);
  }

  function applyMinuteInput() {
    const text = minuteText.trim();
    const value = Number(text);
    if (text && Number.isFinite(value)) {
      const minute = Math.min(59, Math.max(0, Math.trunc(value)));
      const hour = shownHour >= 24 ? 0 : shownHour;
      setTimeOfDay(hour * 60 + minute);
    }
    setEditingMinute(false);
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
  const shownMonth = previewDate.getMonth() + 1;
  const shownDay = previewDate.getDate();
  const shownMinute = minuteOfDay(previewDate);
  const shownHour = shownMinute >= DAY_MINUTES ? 24 : Math.floor(shownMinute / 60);
  const shownClockMinute = shownMinute >= DAY_MINUTES ? 0 : shownMinute % 60;

  function startYearEdit() {
    if (editingMonth) applyMonthInput();
    if (editingDay) applyDayInput();
    if (editingHour) applyHourInput();
    if (editingMinute) applyMinuteInput();
    setYearText(String(shownYear));
    setEditingYear(true);
  }

  function startMonthEdit() {
    if (editingYear) applyYearInput();
    if (editingDay) applyDayInput();
    if (editingHour) applyHourInput();
    if (editingMinute) applyMinuteInput();
    setMonthText(String(shownMonth));
    setEditingMonth(true);
  }

  function startDayEdit() {
    if (editingYear) applyYearInput();
    if (editingMonth) applyMonthInput();
    if (editingHour) applyHourInput();
    if (editingMinute) applyMinuteInput();
    setDayText(String(shownDay));
    setEditingDay(true);
  }

  function startHourEdit() {
    if (editingYear) applyYearInput();
    if (editingMonth) applyMonthInput();
    if (editingDay) applyDayInput();
    if (editingMinute) applyMinuteInput();
    setHourText(pad2(shownHour));
    setEditingHour(true);
  }

  function startMinuteEdit() {
    if (editingYear) applyYearInput();
    if (editingMonth) applyMonthInput();
    if (editingDay) applyDayInput();
    if (editingHour) applyHourInput();
    setMinuteText(pad2(shownClockMinute));
    setEditingMinute(true);
  }

  const datePartStyle = compact ? styles.yearCompact : styles.dateText;
  const dateInputStyle = [styles.yearInput, compact && styles.yearInputCompact];
  const datePressStyle = compact ? styles.yearPressCompact : undefined;

  const yearControl = (
    <EditableValue
      editing={editingYear}
      value={yearText}
      onChangeText={setYearText}
      onApply={applyYearInput}
      onEdit={startYearEdit}
      display={formatYearText(shownYear)}
      editLabel={t('live.year.edit', { year: formatYearText(shownYear) })}
      inputLabel={t('live.year.input')}
      testID={editingYear ? 'time-year-input' : 'time-year-edit'}
      displayStyle={datePartStyle}
      inputStyle={dateInputStyle}
      pressStyle={datePressStyle}
    />
  );

  const monthControl = (
    <EditableValue
      editing={editingMonth}
      value={monthText}
      onChangeText={setMonthText}
      onApply={applyMonthInput}
      onEdit={startMonthEdit}
      display={formatMonthName(previewDate)}
      editLabel={t('live.month.edit', { month: shownMonth })}
      inputLabel={t('live.month.input')}
      testID={editingMonth ? 'time-month-input' : 'time-month-edit'}
      displayStyle={datePartStyle}
      inputStyle={dateInputStyle}
      pressStyle={datePressStyle}
    />
  );

  const dayControl = (
    <EditableValue
      editing={editingDay}
      value={dayText}
      onChangeText={setDayText}
      onApply={applyDayInput}
      onEdit={startDayEdit}
      display={formatDayText(previewDate)}
      editLabel={t('live.day.edit', { day: shownDay })}
      inputLabel={t('live.day.input')}
      testID={editingDay ? 'time-day-input' : 'time-day-edit'}
      displayStyle={datePartStyle}
      inputStyle={dateInputStyle}
      pressStyle={datePressStyle}
    />
  );

  const timeControl = (
    <View style={styles.timeGroup}>
      <EditableValue
        editing={editingHour}
        value={hourText}
        onChangeText={setHourText}
        onApply={applyHourInput}
        onEdit={startHourEdit}
        display={pad2(shownHour)}
        editLabel={t('live.hour.edit', { hour: pad2(shownHour) })}
        inputLabel={t('live.hour.input')}
        testID={editingHour ? 'time-hour-input' : 'time-hour-edit'}
        displayStyle={datePartStyle}
        inputStyle={[dateInputStyle, styles.timePartInput]}
        pressStyle={datePressStyle}
      />
      <Text style={datePartStyle}>:</Text>
      <EditableValue
        editing={editingMinute}
        value={minuteText}
        onChangeText={setMinuteText}
        onApply={applyMinuteInput}
        onEdit={startMinuteEdit}
        display={pad2(shownClockMinute)}
        editLabel={t('live.minute.edit', { minute: pad2(shownClockMinute) })}
        inputLabel={t('live.minute.input')}
        testID={editingMinute ? 'time-minute-input' : 'time-minute-edit'}
        displayStyle={datePartStyle}
        inputStyle={[dateInputStyle, styles.timePartInput]}
        pressStyle={datePressStyle}
      />
    </View>
  );

  const nowButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('live.now')}
      onPress={resetToNow}
      testID="time-now"
      style={styles.nowButton}
    >
      <Ionicons name="refresh" size={sizing.iconSmall} color={colors.accent} />
      <Text style={styles.nowText}>{t('live.now')}</Text>
    </Pressable>
  );

  const yearSlider = (
    <TimeSlider
      label={t('live.slider.year')}
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
      label={t('live.slider.time')}
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
     * Telefonos, tömör elrendezés: egy sorban a dátum (az év, a hónap és a nap átírható,
     * a nap két nyíllal léptethető), alatta a két csúszka; mindkettő két végén egy-egy nyíl
     * lépteti egy évvel, illetve egy órával (nyomva tartva folyamatosan). A lap csak akkora,
     * amekkora a tartalma.
     */
    return (
      <Sheet
        title={t('live.timeTravel.title')}
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
              label={t('live.step.dayBack')}
              icon="chevron-back"
              variant="arrow"
              onStep={() => shiftDays(-1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <View style={styles.compactDateGroup}>
              {monthControl}
              {dayControl}
            </View>
            <RepeatButton
              label={t('live.step.dayForward')}
              icon="chevron-forward"
              variant="arrow"
              onStep={() => shiftDays(1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            {timeControl}
            <View style={styles.spacer} />
            {nowButton}
          </View>

          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>{t('live.slider.year')}</Text>
            <RepeatButton
              label={t('live.step.yearBack')}
              icon="chevron-back"
              variant="arrow"
              onStep={() => stepYear(-1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <View style={styles.compactSlider}>{yearSlider}</View>
            <RepeatButton
              label={t('live.step.yearForward')}
              icon="chevron-forward"
              variant="arrow"
              onStep={() => stepYear(1)}
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
          </View>

          <View style={styles.compactRow}>
            <Text style={styles.compactLabel}>{t('live.compact.time')}</Text>
            <RepeatButton
              label={t('live.hour.prev')}
              icon="chevron-back"
              variant="arrow"
              onStep={() => shiftHours(-1)}
              testID="time-back"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <View style={styles.compactSlider}>{timeSlider}</View>
            <RepeatButton
              label={t('live.hour.next')}
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
      title={t('live.timeTravel.title')}
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
          {monthControl}
          {dayControl}
          <Text style={datePartStyle}>·</Text>
          {timeControl}
          <View style={styles.spacer} />
          {nowButton}
        </View>

        {yearSlider}

        <View style={styles.timeHeading}>
          <Text style={styles.sliderLabel}>
            {t('live.slider.timeLabel', { time: formatClock(shownMinute) })}
          </Text>
          <View style={styles.hourButtons}>
            <RepeatButton
              label={t('live.hour.prev')}
              onStep={() => shiftHours(-1)}
              testID="time-back"
              icon="play-back"
              startRepeat={startRepeat}
              stopRepeat={stopRepeat}
            />
            <RepeatButton
              label={t('live.hour.next')}
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
            label={t('live.step.yearBack')}
            text={t('live.step.yearBackText')}
            onStep={() => stepYear(-1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label={t('live.step.yearForward')}
            text={t('live.step.yearForwardText')}
            onStep={() => stepYear(1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label={t('live.step.dayBack')}
            text={t('live.step.dayBackText')}
            onStep={() => shiftDays(-1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
          <RepeatButton
            label={t('live.step.dayForward')}
            text={t('live.step.dayForwardText')}
            onStep={() => shiftDays(1)}
            startRepeat={startRepeat}
            stopRepeat={stopRepeat}
          />
        </View>
      </GlassSurface>
    </Sheet>
  );
}

function EditableValue({
  editing,
  value,
  onChangeText,
  onApply,
  onEdit,
  display,
  editLabel,
  inputLabel,
  testID,
  displayStyle,
  inputStyle,
  pressStyle,
}: {
  editing: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onApply: () => void;
  onEdit: () => void;
  display: string;
  editLabel: string;
  inputLabel: string;
  testID: string;
  displayStyle: StyleProp<TextStyle>;
  inputStyle: StyleProp<TextStyle>;
  pressStyle?: StyleProp<ViewStyle>;
}) {
  if (editing) {
    return (
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onApply}
        onBlur={onApply}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel={inputLabel}
        testID={testID}
        style={inputStyle}
      />
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editLabel}
      onPress={onEdit}
      testID={testID}
      style={pressStyle}
    >
      <Text style={displayStyle} numberOfLines={1}>
        {display}
      </Text>
    </Pressable>
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
          { name: 'increment', label: t('live.slider.increase') },
          { name: 'decrement', label: t('live.slider.decrease') },
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
  timeGroup: { flexDirection: 'row', alignItems: 'center' },
  timePartInput: { flex: 0, width: 52 },
  compactDateGroup: {
    minWidth: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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