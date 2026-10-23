import * as Location from 'expo-location';

import type { GeoLocation } from '@/core/models';

export type DeviceLocationResult =
  { status: 'success'; location: GeoLocation } | { status: 'permission-denied' };

/**
 * A készülék helye (Android/iOS: GPS, web: böngésző Geolocation API).
 * Az engedély megtagadását eredményként jelzi, a mérési hibákat a hívónak továbbadja.
 */
export async function getDeviceLocation(): Promise<DeviceLocationResult> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return { status: 'permission-denied' };

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    status: 'success',
    location: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: 'Saját hely (GPS)',
    },
  };
}
