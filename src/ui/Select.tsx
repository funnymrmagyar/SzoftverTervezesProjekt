import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius, sizing, spacing } from './theme';
import { useReducedMotion } from './useReducedMotion';
import { GlassSurface } from './GlassSurface';

type IconName = ComponentProps<typeof Ionicons>['name'];
const webPointer = (Platform.OS === 'web' ? { cursor: 'pointer' } : {}) as ViewStyle;

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  color?: string;
  icon?: IconName;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  triggerIcon,
  compactTrigger = false,
  searchable = false,
  testID,
}: {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  triggerIcon: React.ComponentProps<typeof Ionicons>['name'];
  compactTrigger?: boolean;
  searchable?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<{ x: number; y: number }>({
    x: spacing.lg,
    y: spacing.xl,
  });
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const triggerRef = useRef<View>(null);
  const [panelAnimation] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const selected = options.find((option) => option.value === value);
  const isMobile = Platform.OS !== 'web';
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const panelWidth = isMobile
    ? width
    : Math.max(
        sizing.touch,
        Math.min(sizing.contentCompact, width - insets.left - insets.right - spacing.xl),
      );
  const panelHeight = Math.min(
    sizing.selectMaxHeight,
    height - insets.top - insets.bottom - spacing.xxxl,
  );
  const popoverPosition = {
    left: Math.max(
      insets.left + spacing.md,
      Math.min(anchor.x, width - panelWidth - insets.right - spacing.md),
    ),
    top: Math.max(
      insets.top + spacing.md,
      Math.min(anchor.y, height - panelHeight - insets.bottom - spacing.md),
    ),
  };

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function show() {
    triggerRef.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setAnchor({
        x: Math.min(x, width - triggerWidth - insets.right),
        y: y + triggerHeight,
      });
      setOpen(true);
    });
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function selectOption(option: SelectOption<T>) {
    if (option.disabled) return;
    onChange(option.value);
    close();
  }

  function animatePanel() {
    panelAnimation.setValue(0);
    Animated.timing(panelAnimation, {
      toValue: 1,
      duration: reducedMotion ? motion.quick : motion.standard,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  const panel = (
    <Animated.View
      style={[
        styles.panel,
        { width: panelWidth, height: isMobile ? panelHeight : undefined, maxHeight: panelHeight },
        isMobile ? [styles.sheet, { paddingBottom: spacing.xl + insets.bottom }] : styles.popover,
        !isMobile && popoverPosition,
        {
          opacity: panelAnimation,
          transform: [
            {
              scale:
                reducedMotion || isMobile
                  ? 1
                  : panelAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
            },
          ],
        },
      ]}
    >
      <GlassSurface style={styles.glassPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{label}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bezárás"
            onPress={close}
            onFocus={() => setFocusedItem('close')}
            onBlur={() => setFocusedItem(null)}
            style={[styles.closeButton, focusedItem === 'close' && styles.focused, styles.pointer]}
            hitSlop={spacing.sm}
          >
            <Ionicons name="close" size={sizing.icon} color={colors.textMuted} />
          </Pressable>
        </View>
        {searchable ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Keresés"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={`${label} keresése`}
            style={styles.search}
            testID={testID ? `${testID}-search` : undefined}
          />
        ) : null}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {filtered.length ? (
            filtered.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label}${option.description ? `, ${option.description}` : ''}`}
                  accessibilityHint={`Kiválasztás: ${option.label}`}
                  accessibilityState={{ selected: active, disabled: option.disabled }}
                  disabled={option.disabled}
                  onPress={() => selectOption(option)}
                  onFocus={() => setFocusedItem(option.value)}
                  onBlur={() => setFocusedItem(null)}
                  testID={testID ? `${testID}-option-${option.value}` : undefined}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.pressed,
                    focusedItem === option.value && styles.focused,
                    option.disabled && styles.disabled,
                    styles.pointer,
                  ]}
                >
                  {option.color ? (
                    <View style={[styles.dot, { backgroundColor: option.color }]} />
                  ) : option.icon ? (
                    <Ionicons
                      name={option.icon}
                      size={sizing.icon}
                      color={active ? colors.accent : colors.textMuted}
                    />
                  ) : null}
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text style={styles.optionDescription} numberOfLines={1}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  {active ? (
                    <Ionicons name="checkmark" size={sizing.icon} color={colors.accent} />
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.empty}>Nincs találat.</Text>
          )}
        </ScrollView>
      </GlassSurface>
    </Animated.View>
  );

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selected?.label ?? 'választás'}`}
          accessibilityHint="Megnyitja a választási lehetőségeket"
          accessibilityState={{ expanded: open }}
          onPress={show}
          onFocus={() => setFocusedItem('trigger')}
          onBlur={() => setFocusedItem(null)}
          testID={testID}
          style={({ pressed }) => [
            styles.trigger,
            compactTrigger && styles.triggerCompact,
            focusedItem === 'trigger' && styles.focused,
            pressed && styles.pressed,
            styles.pointer,
          ]}
        >
          {selected?.color ? (
            <View style={[styles.dot, styles.triggerDot, { backgroundColor: selected.color }]} />
          ) : (
            <Ionicons name={triggerIcon} size={sizing.icon} color={colors.accent} />
          )}
          {!compactTrigger || isMobile ? (
            <Text style={styles.triggerLabel} numberOfLines={1}>
              {selected?.label ?? label}
            </Text>
          ) : null}
          <Ionicons name="chevron-down" size={sizing.iconSmall} color={colors.textMuted} />
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType={reducedMotion ? 'fade' : isMobile ? 'slide' : 'none'}
        onRequestClose={close}
        onShow={animatePanel}
        statusBarTranslucent
      >
        <View style={[styles.backdrop, isMobile && styles.backdropMobile]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Bezárás"
          />
          {panel}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: sizing.touch,
    maxWidth: sizing.contentCompact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  triggerCompact: { width: sizing.touch, justifyContent: 'center', paddingHorizontal: spacing.sm },
  triggerLabel: { flexShrink: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  triggerDot: { width: sizing.iconSmall, height: sizing.iconSmall },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  backdropMobile: { justifyContent: 'flex-end' },
  panel: { position: 'absolute' },
  popover: {},
  sheet: {
    alignSelf: 'center',
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassPanel: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  panelHeader: {
    minHeight: sizing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  panelTitle: { color: colors.text, fontSize: 20, fontWeight: '600' },
  closeButton: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  search: {
    minHeight: sizing.touch,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  list: { flex: 1, minHeight: 0, marginTop: spacing.md },
  listContent: { gap: spacing.xs },
  option: {
    minHeight: sizing.touch + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  optionActive: { backgroundColor: colors.cardHighlight },
  dot: { width: sizing.iconSmall, height: sizing.iconSmall, borderRadius: radius.pill },
  optionCopy: { flex: 1, gap: spacing.xs },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '400' },
  optionTitleActive: { color: colors.accent, fontWeight: '600' },
  optionDescription: { color: colors.textMuted, fontSize: 14 },
  empty: { padding: spacing.xl, color: colors.textMuted, textAlign: 'center' },
  pressed: { opacity: 0.82 },
  focused: { borderWidth: 2, borderColor: colors.accent },
  pointer: webPointer,
  disabled: { opacity: 0.56 },
});
