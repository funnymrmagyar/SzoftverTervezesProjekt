import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { hasErrors, validateLogin, type CredentialErrors } from '@/services/auth';
import { useAuthStore } from '@/state/useAuthStore';
import { AuthForm } from '@/ui/AuthForm';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { t, useLocale } from '@/ui/i18n';
import { colors } from '@/ui/theme';

export default function LoginScreen() {
  useLocale();
  const { signIn, busy, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  useEffect(() => clearError, [clearError]);

  async function submit() {
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    // Sikeres bejelentkezés után a gyökér-layout védett útvonalai automatikusan átirányítanak.
    await signIn(email, password);
  }

  return (
    <AuthForm title={t('auth.signIn.title')} subtitle={t('auth.signIn.subtitle')} error={error}>
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={t('auth.emailPlaceholder')}
        error={fieldErrors.email}
        testID="login-email"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        error={fieldErrors.password}
        onSubmitEditing={submit}
        testID="login-password"
      />
      <Button title={t('auth.signIn.title')} onPress={submit} loading={busy} testID="login-submit" />
      <Text style={styles.footer}>
        {t('auth.signIn.noAccount')}{' '}
        <Link href="/register" replace style={styles.link}>
          {t('auth.signIn.registerLink')}
        </Link>
      </Text>
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  footer: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.accent, fontWeight: '600' },
});
