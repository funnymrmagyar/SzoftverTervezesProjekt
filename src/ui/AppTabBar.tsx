import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { focusRing } from './interaction';
import { colors, radius, sizing, spacing } from './theme';
import { t } from './i18n';
import { useBreakpoint } from './useBreakpoint';
import { useReducedMotion } from './useReducedMotion';
import { ThreeZoneBar } from './layout/ThreeZoneBar';
import { TabPagerContext } from './layout/useTabSwipe';
import type { TranslationKey } from './i18n';

/** A telefonos sáv magassága (az alsó biztonsági sáv fölött). */
const PHONE_BAR_HEIGHT = sizing.navHeight - spacing.sm;
/** Az aktív oldalt jelző kis arany vonal szélessége. */
const INDICATOR_WIDTH = spacing.xl;

const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as ViewStyle)
    : undefined;

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

function tabLabel(routeName: string, title: string | undefined): string {
  const labelKey = LABEL_KEYS[routeName];
  return labelKey ? t(labelKey) : (title ?? routeName);
}

/**
 * Telefonon: az egész szélességet kitöltő, alulra simuló sáv, csak ikonokkal. Az aktív
 * oldalt egy kis arany vonal jelzi a sáv tetején, ami oldalváltáskor átcsúszik az új ikonhoz.
 * (Oldalak között húzással is lehet váltani, az a (tabs)/_layout.tsx-ben van.)
 */
function PhoneTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [width, setWidth] = useState(0);
  const [ownIndicator] = useState(() => new Animated.Value(state.index));
  // Ha van lapozó, a vonal pontosan vele együtt halad (húzás közben is az ujjal mozog).
  const pager = useContext(TabPagerContext);
  // A sáv valódi magasságát jelentjük a navigátornak: ebből tudják az oldalak (pl. a
  // csillagkép-leírás lapja), meddig érhetnek le, hogy a sáv ne takarja el őket.
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const indicator = pager ?? ownIndicator;
  const reducedMotion = useReducedMotion();
  const count = state.routes.length;
  const itemWidth = count > 0 ? width / count : 0;

  useEffect(() => {
    if (pager) return;
    if (reducedMotion) {
      ownIndicator.setValue(state.index);
      return;
    }
    Animated.spring(ownIndicator, {
      toValue: state.index,
      damping: 22,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [ownIndicator, pager, reducedMotion, state.index]);

  return (
    <View
      style={[styles.phoneBar, webBlur, { paddingBottom: insets.bottom }]}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        reportHeight?.(event.nativeEvent.layout.height);
      }}
    >
      {width > 0 && count > 1 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              transform: [
                {
                  translateX: indicator.interpolate({
                    inputRange: [0, count - 1],
                    extrapolate: 'clamp',
                    outputRange: [
                      itemWidth / 2 - INDICATOR_WIDTH / 2,
                      (count - 1) * itemWidth + itemWidth / 2 - INDICATOR_WIDTH / 2,
                    ],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
      <View style={styles.phoneItems}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label = tabLabel(route.name, options.title);
          const color = focused ? colors.accent : colors.textMuted;
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              testID={options.tabBarButtonTestID}
              style={({ pressed }) => [styles.phoneItem, pressed && styles.phonePressed]}
            >
              {options.tabBarIcon ? (
                options.tabBarIcon({ focused, color, size: sizing.icon + spacing.xs })
              ) : (
                <Ionicons name="ellipse-outline" size={sizing.icon} color={color} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AppTabBar(props: BottomTabBarProps) {
  const layout = useBreakpoint();
  if (layout.compact) return <PhoneTabBar {...props} />;
  return <FloatingTabBar {...props} />;
}

/** Tableten lebegő „pirula”, széles kijelzőn bal oldali menüsáv. */
function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
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
      <ThreeZoneBar
        orientation={expanded ? 'vertical' : 'horizontal'}
        sideSize={expanded ? sizing.touch + spacing.md : sizing.touch}
        style={expanded ? styles.expandedZones : styles.bottomZones}
        center={
          <View style={[styles.bar, expanded ? styles.rail : styles.pill]}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const options = descriptors[route.key].options;
              const label = tabLabel(route.name, options.title);
              const color = focused ? colors.accent : colors.textMuted;
              const onPress = () => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigateToTab(route.key);
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
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
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
                </Pressable>
              );
            })}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  phoneBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.glassStrong,
  },
  phoneItems: { height: PHONE_BAR_HEIGHT, flexDirection: 'row' },
  phoneItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phonePressed: { opacity: 0.6 },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: 3,
    borderBottomLeftRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  positioner: {
    position: 'absolute',
    zIndex: 20,
    alignSelf: 'center',
    width: '100%',
  },
  bottomZones: { width: '92%', maxWidth: sizing.contentCompact },
  expandedZones: { width: '100%', height: '100%' },
  bar: {
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.glassStrong,
    ...barShadow,
  },
  pill: {
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
  focused: focusRing,
  pressed: { opacity: 0.82 },
});
