import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Android runtime location permission.
 *
 * Declaring ACCESS_FINE_LOCATION in the manifest is not enough on Android 6+ —
 * it has to be granted at runtime too. The map picker runs in a WebView, and a
 * WebView's geolocation request is refused outright when the host app has no
 * permission, which surfaces to the customer as "could not get your location"
 * with no prompt ever appearing.
 *
 * iOS asks by itself, driven by the usage strings in Info.plist.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (already) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Use your location?',
        message: 'So we can set your delivery address and work out the delivery fee.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
