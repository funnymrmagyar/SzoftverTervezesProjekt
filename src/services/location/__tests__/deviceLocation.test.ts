import * as Location from 'expo-location';

import { getDeviceLocation } from '../deviceLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted' },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getCurrentPosition = jest.mocked(Location.getCurrentPositionAsync);

describe('getDeviceLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a permission-denied result without requesting a position', async () => {
    requestPermission.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      expires: 'never',
      status: Location.PermissionStatus.DENIED,
    });

    await expect(getDeviceLocation()).resolves.toEqual({ status: 'permission-denied' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returns the current coordinates after permission is granted', async () => {
    requestPermission.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: Location.PermissionStatus.GRANTED,
    });
    getCurrentPosition.mockResolvedValue({
      coords: {
        latitude: 47.5,
        longitude: 19.04,
        altitude: 100,
        accuracy: 10,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: 0,
    });

    await expect(getDeviceLocation()).resolves.toEqual({
      status: 'success',
      location: {
        latitude: 47.5,
        longitude: 19.04,
        label: 'Saját hely (GPS)',
      },
    });
    expect(getCurrentPosition).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it('surfaces a location acquisition error to its caller', async () => {
    requestPermission.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: Location.PermissionStatus.GRANTED,
    });
    getCurrentPosition.mockRejectedValue(new Error('Position unavailable'));

    await expect(getDeviceLocation()).rejects.toThrow('Position unavailable');
  });
});
