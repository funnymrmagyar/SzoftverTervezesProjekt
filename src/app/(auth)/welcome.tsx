import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/ui/Button';
import { StarryBackdrop } from '@/ui/StarryBackdrop';
import { colors, font, spacing } from '@/ui/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StarryBackdrop />
      <View style={styles.hero}>
        <Text style={styles.kicker}>✦ ÉGI KULTÚRÁK ✦</Text>
        <Text style={styles.title}>Csillagnéző</Text>
        <Text style={styles.subtitle}>
          Fedezd fel az éjszakai égboltot úgy, ahogy a nagyszüleink és más népek látták:
          Göncölszekér, Fiastyúk, Kaszáscsillag és a nyugati csillagképek.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          title="Bejelentkezés"
          onPress={() => router.push('/login')}
          testID="welcome-login"
        />
        <Button
          title="Új fiók létrehozása"
          variant="secondary"
          onPress={() => router.push('/register')}
          testID="welcome-register"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.lg, maxWidth: 520, alignSelf: 'center' },
  kicker: { color: colors.accent, letterSpacing: 3, fontSize: 12, fontWeight: '600' },
  title: { ...font.title, fontSize: 44, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 25 },
  actions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingBottom: spacing.lg,
  },
});
