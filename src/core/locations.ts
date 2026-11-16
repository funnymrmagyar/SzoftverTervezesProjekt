import { t } from '@/ui/i18n';

import type { GeoLocation } from './models';

/** Ha nincs GPS-engedély, innen nézzük az eget. */
export const DEFAULT_LOCATION: GeoLocation = {
  latitude: 47.4979,
  longitude: 19.0402,
  label: 'Budapest',
  labelKey: 'city.budapest',
};

/** Kézzel választható helyek. */
export const PRESET_LOCATIONS: GeoLocation[] = [
  DEFAULT_LOCATION,
  { latitude: 47.5316, longitude: 21.6273, label: 'Debrecen', labelKey: 'city.debrecen' },
  { latitude: 46.253, longitude: 20.1414, label: 'Szeged', labelKey: 'city.szeged' },
  { latitude: 46.0727, longitude: 18.2323, label: 'Pécs', labelKey: 'city.pecs' },
  { latitude: 46.7712, longitude: 23.6236, label: 'Kolozsvár', labelKey: 'city.kolozsvar' },
  { latitude: 46.5386, longitude: 24.5514, label: 'Marosvásárhely', labelKey: 'city.marosvasarhely' },
  { latitude: 46.3563, longitude: 25.8018, label: 'Csíkszereda', labelKey: 'city.csikszereda' },
  { latitude: 45.7983, longitude: 24.1256, label: 'Nagyszeben', labelKey: 'city.nagyszeben' },
];

/** Hely rövid szöveges leírása az aktuális nyelven: név, vagy koordináták. */
export function formatLocation(loc: GeoLocation): string {
  if (loc.labelKey) return t(loc.labelKey);
  if (loc.label) return loc.label;
  const ns = t(loc.latitude >= 0 ? 'coord.north' : 'coord.south');
  const ew = t(loc.longitude >= 0 ? 'coord.east' : 'coord.west');
  return `${Math.abs(loc.latitude).toFixed(2)}° ${ns}, ${Math.abs(loc.longitude).toFixed(2)}° ${ew}`;
}
