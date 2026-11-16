import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t, useLocale } from './i18n';
import { LOCALES, useLocaleStore, type Locale } from './locale';
import { colors, font, radius, sizing, spacing } from './theme';

const LABELS: Record<Locale, { short: string; name: string }> = {
  hu: { short: 'HU', name: 'Magyar' },
  en: { short: 'EN', name: 'English' },
};

/** Magyar / angol nyelvváltó; a váltás azonnal érvényes és megmarad a következő indításra is. */
export function LanguageSwitch({ testID }: { testID?: string }) {
  const locale = useLocale();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const [focused, setFocused] = useState<Locale | null>(null);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('profile.languageTitle')}
      style={styles.group}
      testID={testID}
    >
      {LOCALES.map((option) => {
        const selected = option === locale;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={LABELS[option].name}
            accessibilityState={{ checked: selected }}
            onPress={() => void setLocale(option)}
            onFocus={() => setFocused(option)}
            onBlur={() => setFocused(null)}
            style={[
              styles.option,
              selected && styles.selected,
              focused === option && styles.focused,
            ]}
            testID={testID ? `${testID}-${option}` : undefined}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>
              {LABELS[option].short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  option: {
    minWidth: sizing.touch,
    minHeight: sizing.touch - spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  selected: { backgroundColor: colors.accent },
  focused: { borderWidth: 2, borderColor: colors.text },
  text: { ...font.small, color: colors.textMuted, fontWeight: '700' },
  textSelected: { color: colors.bg },
});
