import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { t, useLocale } from '@/ui/i18n';
import { Select } from '@/ui/Select';
import type { SelectOption } from '@/ui/Select';
import { spacing } from '@/ui/theme';

function buildOptions(locale: 'hu' | 'en'): SelectOption<string>[] {
  return getSkyCultures(locale)
    .list()
    .map((culture) => ({
      value: culture.id,
      label: culture.name,
      description: culture.summary,
      color: culture.lineColor,
    }));
}

export function CulturePicker() {
  const locale = useLocale();
  const cultureOptions = useMemo(() => buildOptions(locale), [locale]);
  const cultureId = useSkyStore((state) => state.cultureId);
  const setCulture = useSkyStore((state) => state.setCulture);

  return (
    <View style={styles.wrapper}>
      <Select
        value={cultureId}
        options={cultureOptions}
        onChange={setCulture}
        label={t('games.culture')}
        triggerIcon="globe-outline"
        searchable
        testID="culture-picker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
});