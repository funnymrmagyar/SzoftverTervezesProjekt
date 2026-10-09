import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authMode } from '@/services/firebase/config';
import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/Button';
import { colors, font, radius, spacing } from '@/ui/theme';

const AUTH_LABELS = {
  local: 'helyi mód (Firebase nélkül)',
  emulator: 'Firebase emulátor',
  firebase: 'Firebase',
} as const;

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Bejelentkezve mint</Text>
        <Text style={styles.value} testID="profile-email">
          {user?.email}
        </Text>
      </View>
      <Button
        title="Kijelentkezés"
        variant="secondary"
        onPress={signOut}
        testID="profile-signout"
      />
      <Text style={styles.meta}>
        Verzió {Constants.expoConfig?.version} · {AUTH_LABELS[authMode]}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.lg },
  title: { ...font.title, color: colors.text },
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  label: { color: colors.textMuted, fontSize: 13 },
  value: { color: colors.text, fontSize: 17 },
  meta: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 'auto' },
});
