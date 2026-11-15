import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { focusRing, hoverTransition, pointerCursor } from './interaction';

import { colors, font, motion, radius, sizing, spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost';
type IconName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  icon?: IconName;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
  icon,
}: ButtonProps) {
  const inactive = disabled || loading;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        hoverTransition,
        !inactive && pointerCursor,
        hovered && !inactive && hoverStyles[variant],
        focused && focusRing,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.text} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={sizing.iconSmall}
              color={variant === 'primary' ? colors.accentText : colors.text}
            />
          ) : null}
          <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Rámutatáskor (böngészőben) egy árnyalattal világosabb lesz a gomb. */
const hoverStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accentHover },
  secondary: { backgroundColor: colors.surfaceHover, borderColor: colors.borderStrong },
  ghost: { backgroundColor: colors.glassHighlight },
});

const styles = StyleSheet.create({
  base: {
    minHeight: sizing.touch + spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.82, transform: [{ scale: motion.pressScale }] },
  inactive: { opacity: 0.5 },
  label: { ...font.body, color: colors.text, fontWeight: '600' },
  primaryLabel: { color: colors.accentText },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
