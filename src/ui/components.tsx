import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, sizing, spacing } from './theme';
import { GlassSurface } from './GlassSurface';

type IconName = ComponentProps<typeof Ionicons>['name'];
const cursorStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : undefined;

export function IconButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  testID,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        hovered && styles.hovered,
        focused && styles.focused,
        pressed && styles.pressed,
        disabled && styles.disabled,
        cursorStyle,
        style,
      ]}
    >
      <Ionicons name={icon} size={sizing.icon} color={active ? colors.accent : colors.textMuted} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      accessibilityHint={label}
      onPress={onPress}
      onFocus={() => setFocusedValue(label)}
      onBlur={() => setFocusedValue(null)}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        focusedValue === label && styles.focused,
        pressed && styles.pressed,
        cursorStyle,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={sizing.iconSmall}
          color={selected ? colors.accent : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  compactSelection = false,
  testID,
}: {
  options: readonly { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  compactSelection?: boolean;
  testID?: string;
}) {
  const [focusedOption, setFocusedOption] = useState<T | null>(null);
  return (
    <View
      style={styles.segmented}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityHint={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            onFocus={() => setFocusedOption(option.value)}
            onBlur={() => setFocusedOption(null)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              focusedOption === option.value && styles.focused,
              pressed && styles.pressed,
              cursorStyle,
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={sizing.iconSmall}
                color={selected ? colors.accent : colors.textMuted}
              />
            ) : null}
            {(!compactSelection || selected || !option.icon) && (
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({
  label,
  icon,
  tone = 'muted',
}: {
  label: string;
  icon?: IconName;
  tone?: 'muted' | 'gold' | 'locked';
}) {
  return (
    <View style={[styles.badge, tone === 'gold' && styles.badgeGold]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={sizing.iconSmall}
          color={tone === 'gold' ? colors.accent : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.badgeText, tone === 'gold' && styles.badgeTextGold]}>{label}</Text>
    </View>
  );
}

export function Avatar({
  initials,
  size = sizing.avatar,
  highlighted = false,
}: {
  initials: string;
  size?: number;
  highlighted?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Profilkép: ${initials}`}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        highlighted && styles.avatarHighlighted,
      ]}
    >
      <Text style={[styles.avatarText, size >= sizing.avatarLarge && styles.avatarTextLarge]}>
        {initials.slice(0, 2).toLocaleUpperCase()}
      </Text>
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  value,
  onPress,
  accessory,
  testID,
}: {
  icon: IconName;
  title: string;
  value: string;
  onPress?: () => void;
  accessory?: ReactNode;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const content = (
    <>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={sizing.icon} color={colors.accent} />
      </View>
      <Text style={styles.settingsTitle}>{title}</Text>
      {accessory ?? (
        <>
          <Text style={styles.settingsValue} numberOfLines={1}>
            {value}
          </Text>
          {onPress ? (
            <Ionicons name="chevron-forward" size={sizing.iconSmall} color={colors.textMuted} />
          ) : null}
        </>
      )}
    </>
  );

  if (!onPress) {
    return <View style={styles.settingsRow}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${value ? `: ${value}` : ''}`}
      accessibilityHint={title}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
      style={({ pressed }) => [
        styles.settingsRow,
        focused && styles.focused,
        pressed && styles.pressed,
        cursorStyle,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function TrophyBadge({
  icon,
  title,
  description,
  difficulty,
  difficultyColor,
  locked = true,
}: {
  icon: IconName;
  title: string;
  description: string;
  difficulty: string;
  difficultyColor: string;
  locked?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${locked ? ', zárolva' : ', megszerezve'}`}
        accessibilityHint="Megmutatja a trófea feltételeit és nehézségét"
        onPress={() => setDetailsOpen(true)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [
          styles.trophy,
          focused && styles.focused,
          pressed && styles.pressed,
          locked && styles.trophyLocked,
          { borderColor: difficultyColor },
          cursorStyle,
        ]}
      >
        <Ionicons name={icon} size={sizing.icon} color={locked ? difficultyColor : colors.accent} />
        {locked ? (
          <View style={styles.trophyLock}>
            <Ionicons name="lock-closed" size={sizing.iconSmall} color={colors.textMuted} />
          </View>
        ) : null}
        <Text numberOfLines={2} style={styles.trophyTitle}>
          {title}
        </Text>
      </Pressable>
      <Modal
        transparent
        visible={detailsOpen}
        animationType="fade"
        onRequestClose={() => setDetailsOpen(false)}
      >
        <View style={styles.trophyModal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trófea részleteinek bezárása"
            onPress={() => setDetailsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <GlassSurface style={styles.trophyDetails}>
            <View style={[styles.trophyDetailIcon, { borderColor: difficultyColor }]}>
              <Ionicons name={icon} size={sizing.icon + spacing.sm} color={difficultyColor} />
            </View>
            <Text style={styles.trophyDetailTitle}>{title}</Text>
            <Text style={styles.trophyDescription}>{description}</Text>
            <View style={[styles.trophyDifficulty, { borderColor: difficultyColor }]}>
              <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
              <Text style={[styles.difficultyText, { color: difficultyColor }]}>{difficulty}</Text>
            </View>
            <Text style={styles.trophyStatus}>
              {locked ? 'Még nem szerezted meg' : 'Megszerzett trófea'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bezárás"
              onPress={() => setDetailsOpen(false)}
              style={({ pressed }) => [styles.trophyClose, pressed && styles.pressed, cursorStyle]}
            >
              <Text style={styles.trophyCloseText}>Bezárás</Text>
            </Pressable>
          </GlassSurface>
        </View>
      </Modal>
    </>
  );
}

export function GlassCard({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <GlassSurface style={[styles.glassCard, style]} testID={testID}>
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    minWidth: sizing.touch,
    minHeight: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  iconButtonActive: { borderColor: colors.accent, backgroundColor: colors.cardHighlight },
  hovered: { backgroundColor: colors.surfaceRaised },
  chip: {
    minHeight: sizing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.cardHighlight },
  chipText: { ...font.small, color: colors.textMuted },
  chipTextSelected: { color: colors.accent, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  segment: {
    minHeight: sizing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  segmentSelected: { backgroundColor: colors.cardHighlight },
  segmentText: { ...font.small, color: colors.textMuted },
  segmentTextSelected: { color: colors.accent, fontWeight: '600' },
  badge: {
    minHeight: sizing.touch - spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  badgeGold: { borderColor: colors.accent, backgroundColor: colors.cardHighlight },
  badgeText: { ...font.caption, color: colors.textMuted, fontWeight: '600' },
  badgeTextGold: { color: colors.accent },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  avatarHighlighted: { borderColor: colors.accent, backgroundColor: colors.cardHighlight },
  avatarText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  avatarTextLarge: { fontSize: 20 },
  settingsRow: {
    minHeight: sizing.touch + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIcon: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  settingsTitle: { flex: 1, ...font.body, color: colors.text },
  settingsValue: { maxWidth: '42%', ...font.small, color: colors.textMuted },
  trophy: {
    width: sizing.gameIcon + spacing.xxxl,
    minHeight: sizing.touch * 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  trophyLocked: { opacity: 0.72 },
  trophyLock: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  trophyTitle: { ...font.caption, color: colors.text, textAlign: 'center' },
  trophyModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backdrop,
  },
  trophyDetails: {
    width: '100%',
    maxWidth: sizing.contentCompact,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  trophyDetailIcon: {
    width: sizing.avatarLarge,
    height: sizing.avatarLarge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  trophyDetailTitle: { ...font.heading, color: colors.text, textAlign: 'center' },
  trophyDescription: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  trophyDifficulty: {
    minHeight: sizing.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  difficultyDot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill },
  difficultyText: { ...font.small, fontWeight: '600' },
  trophyStatus: { ...font.caption, color: colors.textMuted },
  trophyClose: {
    minHeight: sizing.touch,
    minWidth: sizing.contentCompact / 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  trophyCloseText: { ...font.small, color: colors.text },
  glassCard: { padding: spacing.lg, borderRadius: radius.lg },
  focused: { borderColor: colors.accent, borderWidth: 2 },
  pressed: { transform: [{ scale: sizing.cardPressScale }] },
  disabled: { opacity: 0.6 },
});
