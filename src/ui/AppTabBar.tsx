import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, sizing, spacing } from './theme';
import { t } from './i18n';
import { useBreakpoint } from './useBreakpoint';
import type { TranslationKey } from './i18n';

const barShadow: ViewStyle =
  Platform.OS === 'web'
    ? { boxShadow: `0 ${spacing.sm}px ${spacing.xl}px rgba(6, 10, 24, 0.34)` }
    : {
        shadowColor: colors.bg,
        shadowOffset: { width: 0, height: spacing.sm },
        shadowOpacity: 0.34,
        shadowRadius: spacing.xl,
        elevation: 10,
      };

const LABEL_KEYS: Record<string, TranslationKey> = {
  live: 'nav.sky',
  games: 'nav.games',
  leaderboard: 'nav.leaderboard',
  profile: 'nav.profile',
};

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [focusedRoute, setFocusedRoute] = useState<string | null>(null);
  const layout = useBreakpoint();
  const expanded = layout.expanded;

  return (
    <View
      style={[
        { pointerEvents: 'box-none' },
        styles.positioner,
        expanded
          ? {
              left: insets.left + spacing.md,
              top: insets.top + spacing.md,
              bottom: insets.bottom + spacing.md,
              width: sizing.navWidth,
              alignItems: 'center',
              justifyContent: 'center',
            }
          : {
              bottom: insets.bottom + spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            },
      ]}
    >
      <View style={[styles.bar, expanded ? styles.rail : styles.pill]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const labelKey = LABEL_KEYS[route.name];
          const label = labelKey ? t(labelKey) : (options.title ?? route.name);
          const color = focused ? colors.accent : colors.textMuted;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onFocus={() => setFocusedRoute(route.key)}
              onBlur={() => setFocusedRoute(null)}
              testID={options.tabBarButtonTestID}
              style={({ pressed }) => [
                styles.item,
                expanded && styles.railItem,
                focused && styles.itemActive,
                focusedRoute === route.key && styles.focused,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                {options.tabBarIcon ? (
                  options.tabBarIcon({ focused, color, size: sizing.icon + spacing.xs })
                ) : (
                  <Ionicons name="ellipse-outline" size={sizing.icon} color={color} />
                )}
              </View>
              {!expanded && layout.compact ? (
                <Text
                  style={[styles.activeLabel, focused && styles.itemActiveLabel]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    zIndex: 20,
    alignSelf: 'center',
    width: '100%',
  },
  bar: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.glassStrong,
    ...barShadow,
  },
  pill: {
    width: '92%',
    maxWidth: sizing.contentCompact,
    minHeight: sizing.navHeight + spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  rail: {
    width: sizing.navWidth,
    minHeight: sizing.navHeight * 4,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  item: {
    flex: 1,
    minWidth: sizing.touch,
    height: sizing.touch + spacing.md,
    minHeight: sizing.touch + spacing.md,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
  },
  railItem: { width: sizing.touch + spacing.md, height: sizing.touch + spacing.md },
  itemActive: { backgroundColor: colors.cardHighlight },
  iconContainer: {
    width: sizing.touch - spacing.md,
    height: sizing.touch - spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconContainerActive: { backgroundColor: colors.cardHighlight },
  activeLabel: {
    maxWidth: '100%',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  itemActiveLabel: {
    color: colors.accent,
    fontWeight: '600',
  },
  focused: { borderWidth: 2, borderColor: colors.accent },
  pressed: { opacity: 0.82 },
});
