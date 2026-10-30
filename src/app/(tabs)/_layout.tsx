import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type ColorValue } from 'react-native';

import { AppTabBar } from '@/ui/AppTabBar';
import { motion, colors, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { useAuthStore } from '@/state/useAuthStore';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { focused: boolean; color: ColorValue; size: number }) {
    // Az SDK 58-tól a ColorValue lehet null vagy szám is; a mi színeink mindig szövegek.
    return (
      <Ionicons
        name={name}
        color={typeof color === 'string' ? color : colors.textMuted}
        size={size}
      />
    );
  };
}

export default function TabsLayout() {
  const loading = useAuthStore((state) => state.status === 'loading');
  const reduceMotion = useReducedMotion();
  const { expanded } = useBreakpoint();

  return (
    <>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: reduceMotion ? 'none' : 'fade',
          transitionSpec: {
            animation: 'timing',
            config: { duration: motion.standard },
          },
          sceneStyleInterpolator: reduceMotion
            ? undefined
            : ({ current }) => ({
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
              }),
          tabBarPosition: expanded ? 'left' : 'bottom',
          tabBarStyle: expanded
            ? { position: 'absolute', width: sizing.navWidth, backgroundColor: colors.transparent }
            : { position: 'absolute', backgroundColor: colors.transparent, borderTopWidth: 0 },
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarVisibilityAnimationConfig: {
            show: { animation: 'timing', config: { duration: motion.standard } },
            hide: { animation: 'timing', config: { duration: motion.quick } },
          },
        }}
      >
        <Tabs.Screen
          name="live"
          options={{
            title: 'Égbolt',
            tabBarButtonTestID: 'tab-live',
            tabBarIcon: tabIcon('sparkles-outline'),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'Játékok',
            tabBarButtonTestID: 'tab-games',
            tabBarIcon: tabIcon('game-controller-outline'),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Ranglista',
            tabBarButtonTestID: 'tab-leaderboard',
            tabBarIcon: tabIcon('trophy-outline'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarButtonTestID: 'tab-profile',
            tabBarIcon: tabIcon('person-circle-outline'),
          }}
        />
      </Tabs>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
