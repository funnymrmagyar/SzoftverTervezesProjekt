import { StyleSheet, View } from 'react-native';

import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { Select } from '@/ui/Select';
import type { SelectOption } from '@/ui/Select';
import { spacing } from '@/ui/theme';

const cultureOptions: SelectOption<string>[] = getSkyCultures()
  .list()
  .map((culture) => ({
    value: culture.id,
    label: culture.name,
    description: culture.summary,
    color: culture.lineColor,
  }));

export function CulturePicker() {
  const cultureId = useSkyStore((state) => state.cultureId);
  const setCulture = useSkyStore((state) => state.setCulture);

  return (
    <View style={styles.wrapper}>
      <Select
        value={cultureId}
        options={cultureOptions}
        onChange={setCulture}
        label="Égi kultúra"
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