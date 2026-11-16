import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useCallback, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  View,
  type ColorValue,
} from 'react-native';

import { AppTabBar } from '@/ui/AppTabBar';
import { t, useLocale } from '@/ui/i18n';
import { StarryBackdrop } from '@/ui/StarryBackdrop';
import { PagerScreens } from '@/ui/layout/PagerScreens';
import { TabPagerContext, useTabSwipe } from '@/ui/layout/useTabSwipe';
import { motion, colors, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { useAuthStore } from '@/state/useAuthStore';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Az oldalak sorrendje a sávban; a húzásos váltás is ebben a sorrendben lép. */
const TAB_ROUTES = ['/live', '/games', '/leaderboard', '/profile'] as const;
const TAB_NAMES = TAB_ROUTES.map((route) => route.slice(1));

/** Érintőképernyő: telefonon mindig, böngészőben csak érintéses eszközön engedjük a húzást. */
const touchCapable =
  Platform.OS !== 'web' || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

/** Ikon a sávba: az aktív oldalé kitöltött, a többié körvonalas. */
function tabIcon(name: IconName, activeName: IconName) {
  return function TabIcon({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    // Az SDK 58-tól a ColorValue lehet null vagy szám is; a mi színeink mindig szövegek.
    return (
      <Ionicons
        name={focused ? activeName : name}
        color={typeof color === 'string' ? color : colors.textMuted}
        size={size}
      />
    );
  };
}

export default function TabsLayout() {
  useLocale();
  const loading = useAuthStore((state) => state.status === 'loading');
  const reduceMotion = useReducedMotion();
  const { expanded, compact, width } = useBreakpoint();
  const pathname = usePathname();
  const navigateTo = useCallback(
    (route: (typeof TAB_ROUTES)[number]) => router.navigate(route),
    [],
  );
  // Telefonon az oldalak egy lapozóban állnak egymás mellett. Az Égbolton a vízszintes húzás
  // az eget forgatja, ott nincs húzásos váltás (onnan a sávval lehet továbblépni).
  const { panHandlers, position } = useTabSwipe({
    routes: TAB_ROUTES,
    current: pathname,
    enabled: compact && touchCapable && pathname !== '/live',
    width,
    reducedMotion: reduceMotion,
    onNavigate: navigateTo,
  });

  /** Telefonon: minden oldal a saját helyén áll a lapozóban, és a `position` szerint csúszik. */
  const pagerInterpolator = (routeName: string) => {
    const page = Math.max(0, TAB_NAMES.indexOf(routeName));
    return () => ({
      sceneStyle: {
        transform: [
          {
            translateX: position.interpolate({
              inputRange: [0, 1],
              outputRange: [page * width, (page - 1) * width],
              extrapolate: 'extend' as const,
            }),
          },
        ],
      },
    });
  };

  /** Nagyobb kijelzőn: finom áttűnés egy kis oldalirányú elmozdulással. */
  const fadeInterpolator = reduceMotion
    ? undefined
    : ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => ({
        sceneStyle: {
          opacity: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0, 1, 0],
          }),
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-spacing.sm, 0, spacing.sm],
              }),
            },
          ],
        },
      });

  return (
    <TabPagerContext.Provider value={compact ? position : null}>
      <View style={styles.swipeArea} {...panHandlers}>
        {/* Az oldalak mögött is csillagos ég: lapozás közben nem villan ki üres háttér. */}
        <StarryBackdrop />
        <PagerScreens enabled={compact}>
          <Tabs
            tabBar={(props) => <AppTabBar {...props} />}
            // Telefonon a szomszédos oldalaknak is látszaniuk kell lapozás közben.
            detachInactiveScreens={!compact}
            screenOptions={({ route }) => ({
              headerShown: false,
              // Telefonon minden oldal előre betöltődik, hogy lapozáskor már ott legyen.
              lazy: !compact,
              animation: compact ? 'shift' : reduceMotion ? 'none' : 'fade',
              transitionSpec: {
                animation: 'timing',
                config: { duration: motion.standard },
              },
              sceneStyleInterpolator: compact ? pagerInterpolator(route.name) : fadeInterpolator,
              tabBarPosition: expanded ? 'left' : 'bottom',
              tabBarStyle: expanded
                ? {
                    position: 'absolute',
                    width: sizing.navWidth,
                    backgroundColor: colors.transparent,
                  }
                : { position: 'absolute', backgroundColor: colors.transparent, borderTopWidth: 0 },
              tabBarHideOnKeyboard: true,
              tabBarShowLabel: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarVisibilityAnimationConfig: {
                show: { animation: 'timing', config: { duration: motion.standard } },
                hide: { animation: 'timing', config: { duration: motion.quick } },
              },
            })}
          >
            <Tabs.Screen
              name="live"
              options={{
                title: t('nav.sky'),
                tabBarButtonTestID: 'tab-live',
                tabBarIcon: tabIcon('sparkles-outline', 'sparkles'),
              }}
            />
            <Tabs.Screen
              name="games"
              options={{
                title: t('nav.games'),
                tabBarButtonTestID: 'tab-games',
                tabBarIcon: tabIcon('game-controller-outline', 'game-controller'),
              }}
            />
            <Tabs.Screen
              name="leaderboard"
              options={{
                title: t('nav.leaderboard'),
                tabBarButtonTestID: 'tab-leaderboard',
                tabBarIcon: tabIcon('trophy-outline', 'trophy'),
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: t('nav.profile'),
                tabBarButtonTestID: 'tab-profile',
                tabBarIcon: tabIcon('person-circle-outline', 'person-circle'),
              }}
            />
          </Tabs>
        </PagerScreens>
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}
    </TabPagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  swipeArea: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
