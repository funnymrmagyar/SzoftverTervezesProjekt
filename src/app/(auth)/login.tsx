import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { hasErrors, validateLogin, type CredentialErrors } from '@/services/auth';
import { useAuthStore } from '@/state/useAuthStore';
import { AuthForm } from '@/ui/AuthForm';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';

export default function LoginScreen() {
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
    <AuthForm title="Bejelentkezés" subtitle="Üdv újra az égbolt alatt!" error={error}>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nev@pelda.hu"
        error={fieldErrors.email}
        testID="login-email"
      />
      <TextField
        label="Jelszó"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        error={fieldErrors.password}
        onSubmitEditing={submit}
        testID="login-password"
      />
      <Button title="Bejelentkezés" onPress={submit} loading={busy} testID="login-submit" />
      <Text style={styles.footer}>
        Még nincs fiókod?{' '}
        <Link href="/register" replace style={styles.link}>
          Regisztrálj
        </Link>
      </Text>
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  footer: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.accent, fontWeight: '600' },
});
