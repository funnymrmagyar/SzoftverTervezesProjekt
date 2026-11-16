import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { usernameFormatError } from '@/core/username';
import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/Button';
import { GlassSurface } from '@/ui/GlassSurface';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';

import { useUsernamePromptStore } from './usernamePromptStore';

export function UsernamePrompt() {
  const open = useUsernamePromptStore((state) => state.open);
  const close = useUsernamePromptStore((state) => state.close);
  const resolve = useUsernamePromptStore((state) => state.resolve);
  const claimUsername = useAuthStore((state) => state.claimUsername);
  const busy = useAuthStore((state) => state.busy);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const formatError = usernameFormatError(value);
    if (formatError) {
      setError(formatError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const name = await claimUsername(value);
      if (!name) return;
      resolve?.(name);
      setValue('');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nem sikerült menteni a nevet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} accessibilityElementsHidden />
        <GlassSurface style={styles.dialog} testID="username-prompt">
          <Text style={styles.title}>Válassz felhasználónevet</Text>
          <Text style={styles.body}>
            A ranglistán ezzel a névvel fogsz megjelenni. Később nem lehet megváltoztatni, és
            egyedi kell legyen.
          </Text>
          <TextInput
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            placeholder="pl. Csillagnezo42"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Felhasználónév"
            onSubmitEditing={() => void submit()}
            style={styles.input}
            testID="username-input"
          />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : (
            <Text style={styles.hint}>3–24 karakter · betű, szám, _ és - · szóköz nélkül</Text>
          )}
          <Button
            title="Mentés és folytatás"
            onPress={() => void submit()}
            loading={submitting || busy}
            disabled={!value.trim() || submitting || busy}
            testID="username-submit"
          />
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backdrop,
  },
  backdropFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    ...font.heading,
    color: colors.text,
  },
  body: {
    ...font.small,
    color: colors.textMuted,
    lineHeight: spacing.xl,
  },
  input: {
    minHeight: sizing.touch + spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  hint: {
    ...font.caption,
    color: colors.textMuted,
  },
  error: {
    ...font.small,
    color: colors.danger,
  },
});