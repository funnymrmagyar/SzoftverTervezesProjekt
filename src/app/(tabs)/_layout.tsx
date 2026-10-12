import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/state/useAuthStore';
import { colors } from '@/ui/theme';

type IconProps = ComponentProps<typeof Ionicons>;

function tabIcon(name: IconProps['name']) {
  return function TabIcon({ color, size }: { color: IconProps['color']; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const loading = useAuthStore((s) => s.status === 'loading');

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="live" options={{ title: 'Égbolt', tabBarIcon: tabIcon('sparkles') }} />
        <Tabs.Screen
          name="games"
          options={{ title: 'Játékok', tabBarIcon: tabIcon('game-controller') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profil', tabBarIcon: tabIcon('person-circle') }}
        />
      </Tabs>
      {/* Amíg nem tudjuk, be van-e jelentkezve a felhasználó, eltakarjuk a tartalmat. */}
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
