import { Stack } from 'expo-router';

import { colors } from '@/ui/theme';

/** A játékok teljes képernyős nézetei (a tab-sáv nélkül). */
export default function PlayLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
