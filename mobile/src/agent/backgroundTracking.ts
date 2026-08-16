import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

/**
 * Keeping an agent's location flowing once the app is off screen.
 *
 * An agent taps Navigate and switches to Maps within seconds of accepting a
 * job. Both platforms suspend location for a backgrounded app, so without this
 * the customer's live tracking freezes for the whole delivery — precisely when
 * they are watching it.
 *
 * Android: a foreground service (visible notification) keeps the process alive.
 * iOS: the `location` background mode plus "Always" permission.
 *
 * Every failure here is non-fatal. Losing background tracking makes the map
 * staler; it must never stop an agent working.
 */

interface DeliveryTrackingNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
}

const native = (NativeModules as { DeliveryTracking?: DeliveryTrackingNative }).DeliveryTracking;

/**
 * iOS needs telling explicitly that updates should continue in the background,
 * and needs "Always" authorisation to actually do it.
 */
async function configureIos(): Promise<void> {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'always',
    // Without this, iOS silently drops updates as soon as the app is backgrounded.
    enableBackgroundLocationUpdates: true,
    locationProvider: 'auto',
  });
  await new Promise<void>((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(),
      () => resolve()
    );
  });
}

/**
 * Android 10+ needs notification permission for the service notification to be
 * visible. The service still runs without it; the agent just can't see it,
 * which is worse for trust, so we ask.
 */
async function ensureAndroidNotificationPermission(): Promise<void> {
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!permission) return;
  try {
    await PermissionsAndroid.request(permission);
  } catch {
    // Not fatal.
  }
}

/** Begin background-capable tracking. Call when an agent has an active delivery. */
export async function startBackgroundTracking(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await configureIos();
      return;
    }
    await ensureAndroidNotificationPermission();
    await native?.start();
  } catch {
    // Foreground tracking continues regardless.
  }
}

/** Stop it. Call when the agent has nothing left to deliver, or signs out. */
export async function stopBackgroundTracking(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        // Stop holding the background permission open once nothing is in flight
        // — a rider's phone shouldn't be tracked between shifts.
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto',
      });
      return;
    }
    await native?.stop();
  } catch {
    // Nothing useful to do; the service stops with the app in the worst case.
  }
}
