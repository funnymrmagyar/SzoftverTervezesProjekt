import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRESET_LOCATIONS } from '@/core/locations';
import { getDeviceLocation } from '@/services/location/deviceLocation';
import { createLogger } from '@/services/logger';
import { useSkyStore } from '@/state/useSkyStore';
import { compassIndex } from '@/core/astronomy';
import { useViewStore } from '@/state/useViewStore';
import { t, useLocale, type TranslationKey } from '@/ui/i18n';
import { Select } from '@/ui/Select';
import type { SelectOption } from '@/ui/Select';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const log = createLogger('location');

const GPS_LOCATION = 'gps';
function buildLocationOptions(): SelectOption<string>[] {
  return [
    {
      value: GPS_LOCATION,
      label: t('location.gps'),
      description: t('location.gpsDescription'),
      icon: 'navigate-outline',
    },
    ...PRESET_LOCATIONS.map((location, index) => ({
      value: `city-${index}`,
      label: location.labelKey ? t(location.labelKey) : (location.label ?? t('location.unknown')),
      description: t('location.manualDescription'),
      icon: 'location-outline' as const,
    })),
  ];
}

/** Az égtáj neve az aktuális nyelven (pl. „ÉK” / „NE”). */
function compassLabel(azimuth: number): string {
  return t(`compass.${compassIndex(azimuth)}` as TranslationKey);
}

export function LocationPicker({ compactTrigger = false }: { compactTrigger?: boolean }) {
  const locale = useLocale();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a nyelv változásakor újraépül
  const locationOptions = useMemo(buildLocationOptions, [locale]);
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
          log.info('A helymeghatározási engedélyt a felhasználó nem adta meg');
          setGpsMessage(t('location.denied'));
          return;
        }
        // A koordinátákat szándékosan nem naplózzuk: az személyes adat.
        log.info('Hely beállítva GPS alapján');
        setLocation(result.location, 'gps');
      } catch (error) {
        log.warn('A GPS-hely meghatározása nem sikerült', { error });
        setGpsMessage(t('location.failed'));
      }
      return;
    }

    const index = Number(value.replace('city-', ''));
    const selected = PRESET_LOCATIONS[index];
    if (selected) setLocation(selected, 'manual');
  }

  return (
    <View style={[styles.wrapper, !compactTrigger && styles.wrapperWide]}>
      <Select
        value={selectedLocation}
        options={locationOptions}
        onChange={chooseLocation}
        label={t('location.label')}
        triggerIcon="location-outline"
        compactTrigger={compactTrigger}
        testID="location-picker"
      />
      {layout.expanded ? (
        <View
          style={styles.direction}
          accessible
          accessibilityRole="text"
          accessibilityLabel={t('location.bearing', { point: compassLabel(azimuth), degrees: azimuth })}
        >
          <Ionicons name="compass-outline" size={sizing.iconSmall} color={colors.accent} />
          <Text style={styles.directionText}>
            {compassLabel(azimuth)} · {azimuth}°
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
  wrapperWide: { width: '100%', alignItems: 'stretch' },
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
