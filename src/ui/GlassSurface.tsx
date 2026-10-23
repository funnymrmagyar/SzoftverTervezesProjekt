import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from './theme';

const webBlurStyle =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as ViewStyle)
    : undefined;

export function GlassSurface({
  children,
  style,
  radius: cornerRadius = 'lg',
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: keyof typeof radius;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.surface, styles[cornerStyles[cornerRadius]], webBlurStyle, style]}
    >
      {children}
    </View>
  );
}

const cornerStyles = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
  pill: 'pill',
} as const;

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.glassHighlight,
  },
  small: { borderRadius: radius.sm },
  medium: { borderRadius: radius.md },
  large: { borderRadius: radius.lg },
  pill: { borderRadius: radius.pill },
});
