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
  {
    latitude: 46.5386,
    longitude: 24.5514,
    label: 'Marosvásárhely',
    labelKey: 'city.marosvasarhely',
  },
  { latitude: 46.3563, longitude: 25.8018, label: 'Csíkszereda', labelKey: 'city.csikszereda' },
  { latitude: 45.7983, longitude: 24.1256, label: 'Nagyszeben', labelKey: 'city.nagyszeben' },
  { latitude: 44.4268, longitude: 26.1025, label: 'Bukarest', labelKey: 'city.bukarest' },
  { latitude: 48.2082, longitude: 16.3738, label: 'Bécs', labelKey: 'city.becs' },
  { latitude: 48.1486, longitude: 17.1077, label: 'Pozsony', labelKey: 'city.pozsony' },
  { latitude: 44.7866, longitude: 20.4489, label: 'Belgrád', labelKey: 'city.belgrad' },
  { latitude: 45.815, longitude: 15.9819, label: 'Zágráb', labelKey: 'city.zagrab' },
  { latitude: 50.0755, longitude: 14.4378, label: 'Prága', labelKey: 'city.praga' },
  { latitude: 52.2297, longitude: 21.0122, label: 'Varsó', labelKey: 'city.varso' },
  { latitude: 52.52, longitude: 13.405, label: 'Berlin', labelKey: 'city.berlin' },
  { latitude: 41.9028, longitude: 12.4964, label: 'Róma', labelKey: 'city.roma' },
  { latitude: 51.5074, longitude: -0.1278, label: 'London', labelKey: 'city.london' },
  { latitude: 48.8566, longitude: 2.3522, label: 'Párizs', labelKey: 'city.parizs' },
  { latitude: 38.9072, longitude: -77.0369, label: 'Washington', labelKey: 'city.washington' },
  { latitude: 35.6762, longitude: 139.6503, label: 'Tokió', labelKey: 'city.tokio' },
  { latitude: -35.2809, longitude: 149.13, label: 'Canberra', labelKey: 'city.canberra' },
];

/** Hely rövid szöveges leírása az aktuális nyelven: név, vagy koordináták. */
export function formatLocation(loc: GeoLocation): string {
  if (loc.labelKey) return t(loc.labelKey);
  if (loc.label) return loc.label;
  const ns = t(loc.latitude >= 0 ? 'coord.north' : 'coord.south');
  const ew = t(loc.longitude >= 0 ? 'coord.east' : 'coord.west');
  return `${Math.abs(loc.latitude).toFixed(2)}° ${ns}, ${Math.abs(loc.longitude).toFixed(2)}° ${ew}`;
}
