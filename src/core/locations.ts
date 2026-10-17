import type { GeoLocation } from './models';

/** Ha nincs GPS-engedély, innen nézzük az eget. */
export const DEFAULT_LOCATION: GeoLocation = {
  latitude: 47.4979,
  longitude: 19.0402,
  label: 'Budapest',
};

/** Kézzel választható helyek. */
export const PRESET_LOCATIONS: GeoLocation[] = [
  DEFAULT_LOCATION,
  { latitude: 47.5316, longitude: 21.6273, label: 'Debrecen' },
  { latitude: 46.253, longitude: 20.1414, label: 'Szeged' },
  { latitude: 46.0727, longitude: 18.2323, label: 'Pécs' },
  { latitude: 46.7712, longitude: 23.6236, label: 'Kolozsvár' },
  { latitude: 46.5386, longitude: 24.5514, label: 'Marosvásárhely' },
  { latitude: 46.3563, longitude: 25.8018, label: 'Csíkszereda' },
  { latitude: 45.7983, longitude: 24.1256, label: 'Nagyszeben' },
];

/** Hely rövid szöveges leírása: név, vagy koordináták. */
export function formatLocation(loc: GeoLocation): string {
  if (loc.label) return loc.label;
  const ns = loc.latitude >= 0 ? 'É' : 'D';
  const ew = loc.longitude >= 0 ? 'K' : 'Ny';
  return `${Math.abs(loc.latitude).toFixed(2)}° ${ns}, ${Math.abs(loc.longitude).toFixed(2)}° ${ew}`;
}
