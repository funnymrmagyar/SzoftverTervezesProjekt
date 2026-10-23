import type { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarryBackdrop } from './StarryBackdrop';
import { colors, font, radius, spacing } from './theme';

interface AuthFormProps {
  title: string;
  subtitle?: string;
  /** Szerveroldali (Firebase) hibaüzenet az űrlap tetején. */
  error?: string | null;
  children: ReactNode;
}

/** Közös keret a bejelentkezés és a regisztráció űrlapjához. */
export function AuthForm({ title, subtitle, error, children }: AuthFormProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <StarryBackdrop count={60} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Ionicons name="sparkles" size={19} color={colors.accent} />
              </View>
              <Text style={styles.brandName}>CSILLAGNÉZŐ</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.cardHighlight,
  },
  brandName: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { ...font.heading, fontSize: 26, color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: -spacing.sm },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 122, 122, 0.12)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { color: colors.danger },
});
