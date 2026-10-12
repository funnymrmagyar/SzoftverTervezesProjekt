import type { ReactNode } from 'react';
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
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
