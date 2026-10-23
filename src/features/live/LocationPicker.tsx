import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRESET_LOCATIONS } from '@/core/locations';
import { getDeviceLocation } from '@/services/location/deviceLocation';
import { useSkyStore } from '@/state/useSkyStore';
import { compassPoint } from '@/core/astronomy';
import { useViewStore } from '@/state/useViewStore';
import { Select } from '@/ui/Select';
import type { SelectOption } from '@/ui/Select';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const GPS_LOCATION = 'gps';
const locationOptions: SelectOption<string>[] = [
  {
    value: GPS_LOCATION,
    label: 'Saját hely',
    description: 'Helymeghatározás GPS-szel',
    icon: 'navigate-outline',
  },
  ...PRESET_LOCATIONS.map((location, index) => ({
    value: `city-${index}`,
    label: location.label ?? 'Ismeretlen hely',
    description: 'Kézi megfigyelési hely',
    icon: 'location-outline' as const,
  })),
];

export function LocationPicker() {
  const location = useSkyStore((state) => state.location);
  const source = useSkyStore((state) => state.locationSource);
  const setLocation = useSkyStore((state) => state.setLocation);
  const azimuth = useViewStore((state) => Math.round(state.azimuth));
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const layout = useBreakpoint();
  const presetIndex = PRESET_LOCATIONS.findIndex(
    (preset) => preset.latitude === location.latitude && preset.longitude === location.longitude,
  );
  const selectedLocation = source === 'gps' ? GPS_LOCATION : `city-${Math.max(presetIndex, 0)}`;

  async function chooseLocation(value: string) {
    setGpsMessage(null);
    if (value === GPS_LOCATION) {
      try {
        const result = await getDeviceLocation();
        if (result.status === 'permission-denied') {
          setGpsMessage('A helymeghatározási engedélyt nem adtad meg.');
          return;
        }
        setLocation(result.location, 'gps');
      } catch (error) {
        console.error('A GPS-hely meghatározása nem sikerült.', error);
        setGpsMessage('Nem sikerült meghatározni a helyed. Próbáld újra, vagy válassz várost.');
      }
      return;
    }

    const index = Number(value.replace('city-', ''));
    const selected = PRESET_LOCATIONS[index];
    if (selected) setLocation(selected, 'manual');
  }

  return (
    <View style={styles.wrapper}>
      <Select
        value={selectedLocation}
        options={locationOptions}
        onChange={chooseLocation}
        label="Megfigyelési hely"
        triggerIcon="location-outline"
        compactTrigger={!layout.expanded}
        testID="location-picker"
      />
      {layout.expanded ? (
        <View
          style={styles.direction}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${compassPoint(azimuth)}, ${azimuth} fok`}
        >
          <Ionicons name="compass-outline" size={sizing.iconSmall} color={colors.accent} />
          <Text style={styles.directionText}>
            {compassPoint(azimuth)} · {azimuth}°
          </Text>
        </View>
      ) : null}
      {gpsMessage ? (
        <Text style={styles.error} accessibilityRole="alert">
          {gpsMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'flex-end', gap: spacing.xs },
  direction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  directionText: { ...font.caption, color: colors.textMuted },
  error: {
    maxWidth: sizing.contentCompact,
    padding: spacing.sm,
    borderRadius: radius.sm,
    color: colors.text,
    backgroundColor: colors.glassStrong,
  },
});
