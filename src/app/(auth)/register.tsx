import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateRegistration,
  type CredentialErrors,
} from '@/services/auth';
import { useAuthStore } from '@/state/useAuthStore';
import { AuthForm } from '@/ui/AuthForm';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/theme';

export default function RegisterScreen() {
  const { register, busy, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});

  useEffect(() => clearError, [clearError]);

  async function submit() {
    const errors = validateRegistration(email, password, passwordConfirm);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    await register(email, password);
  }

  return (
    <AuthForm title="Regisztráció" subtitle="Hozz létre fiókot e-mail-címmel." error={error}>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nev@pelda.hu"
        error={fieldErrors.email}
        testID="register-email"
      />
      <TextField
        label={`Jelszó (legalább ${MIN_PASSWORD_LENGTH} karakter)`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.password}
        testID="register-password"
      />
      <TextField
        label="Jelszó még egyszer"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.passwordConfirm}
        onSubmitEditing={submit}
        testID="register-password-confirm"
      />
      <Button title="Fiók létrehozása" onPress={submit} loading={busy} testID="register-submit" />
      <Text style={styles.footer}>
        Van már fiókod?{' '}
        <Link href="/login" replace style={styles.link}>
          Jelentkezz be
        </Link>
      </Text>
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  footer: { color: colors.textMuted, textAlign: 'center' },
  link: { color: colors.accent, fontWeight: '600' },
});
