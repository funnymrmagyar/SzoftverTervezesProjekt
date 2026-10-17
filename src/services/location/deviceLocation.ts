import * as Location from 'expo-location';

import type { GeoLocation } from '@/core/models';

/**
 * A készülék helye (Android/iOS: GPS, web: böngésző Geolocation API).
 * Ha nincs engedély vagy nem sikerül, null-t ad — ilyenkor az app alapértelmezett helyet használ.
 */
export async function getDeviceLocation(): Promise<GeoLocation | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: 'Saját hely (GPS)',
    };
  } catch {
    return null;
  }
}
