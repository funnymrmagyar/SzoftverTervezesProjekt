import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSkyCultures } from '@/core/catalog';
import { Button } from '@/ui/Button';
import { StarryBackdrop } from '@/ui/StarryBackdrop';
import { colors, font, radius, spacing } from '@/ui/theme';

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const cultureCount = getSkyCultures().list().length;

  return (
    <SafeAreaView style={styles.safe}>
      <StarryBackdrop />
      <View style={[styles.content, wide && styles.contentWide]}>
        <View style={[styles.hero, wide && styles.heroWide]}>
          <View style={styles.orbit}>
            <View style={styles.orbitRing} />
            <View style={styles.orbitRingInner} />
            <View style={styles.orbitStar}>
              <Ionicons name="sparkles" size={34} color={colors.accent} />
            </View>
            <View style={styles.orbitDotOne} />
            <View style={styles.orbitDotTwo} />
          </View>
          <Text style={[styles.kicker, wide && styles.textWide]}>✦ ÉGI KULTÚRÁK ✦</Text>
          <Text style={[styles.title, wide && styles.textWide]}>Nézz fel.{'\n'}Lásd másként.</Text>
          <Text style={[styles.subtitle, wide && styles.textWide]}>
            Fedezd fel az éjszakai égboltot úgy, ahogy különböző népek látták — történetekkel,
            csillagképekkel és saját csillagtérképpel.
          </Text>
          <View style={[styles.stat, wide && styles.statWide]}>
            <Ionicons name="globe-outline" size={16} color={colors.info} />
            <Text style={styles.statText}>{cultureCount} égbolt kultúrái egy helyen</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Text style={styles.actionTitle}>Indulhat a felfedezés?</Text>
          <Text style={styles.actionSubtitle}>Jelentkezz be, vagy hozz létre egy fiókot.</Text>
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
          <Text style={styles.terms}>A csillagok alatt mindenki otthon van.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xxl,
  },
  contentWide: { flexDirection: 'row', alignItems: 'center', gap: 72 },
  hero: { gap: spacing.md, alignItems: 'center' },
  heroWide: { flex: 1, alignItems: 'flex-start' },
  orbit: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  orbitRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(134, 184, 255, 0.25)',
  },
  orbitRingInner: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 199, 107, 0.24)',
  },
  orbitStar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.cardHighlight,
  },
  orbitDotOne: {
    position: 'absolute',
    width: 8,
    height: 8,
    top: 20,
    right: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
  },
  orbitDotTwo: {
    position: 'absolute',
    width: 5,
    height: 5,
    bottom: 13,
    left: 21,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  kicker: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  title: {
    ...font.title,
    color: colors.text,
    fontSize: 42,
    lineHeight: 49,
    textAlign: 'center',
  },
  textWide: { textAlign: 'left' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 520,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statWide: { alignSelf: 'flex-start' },
  statText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  actions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  terms: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.xs },
});
