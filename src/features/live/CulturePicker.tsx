import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { Select } from '@/ui/Select';
import type { SelectOption } from '@/ui/Select';

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
    <Select
      value={cultureId}
      options={cultureOptions}
      onChange={setCulture}
      label="Égi kultúra"
      triggerIcon="globe-outline"
      searchable
      testID="culture-picker"
    />
  );
}
