import { Platform, PermissionsAndroid } from 'react-native';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { supabase } from './supabase';

/**
 * Registers a customer's phone for push.
 *
 * Until now customer notifications were web push only, which reaches a browser
 * and nothing else — an app customer could learn a repeat delivery was due only
 * by opening the app that day. Since a missed reminder costs one of their
 * scheduled deliveries, that made the reminder decorative.
 *
 * Unlike the agent app this cannot write the token itself: a customer's identity
 * is our own session token, which RLS cannot read, so registration goes through
 * an edge function that decides the customer from the session.
 */

/**
 * Android 13+ needs an explicit runtime permission, and iOS always does. Asked
 * after sign-in rather than on first launch — a permission prompt before anyone
 * knows what the app is gets denied.
 */
export async function requestCustomerPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // POST_NOTIFICATIONS only exists on API 33+. Below that it is granted at
    // install time and the constant is undefined.
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await requestPermission(getMessaging());
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

async function store(sessionToken: string, deviceToken: string): Promise<void> {
  await supabase.functions.invoke('save-device-token', {
    body: {
      token: sessionToken,
      deviceToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
  });
}

/**
 * Asks permission, stores the current token, and follows refreshes.
 *
 * Returns an unsubscribe for the refresh listener. Tokens rotate — on
 * reinstall, on restore to a new phone, sometimes on their own — and a stale
 * token fails silently, so a customer would simply stop being reachable with
 * nothing to show for it.
 */
export async function registerCustomerForPush(sessionToken: string): Promise<() => void> {
  const granted = await requestCustomerPushPermission();
  if (!granted) return () => undefined;

  try {
    const deviceToken = await getToken(getMessaging());
    if (deviceToken) await store(sessionToken, deviceToken);
  } catch {
    // No Play Services, or a device that cannot reach FCM. The app still shows
    // the reminder when opened; it just cannot wake the phone.
  }

  return onTokenRefresh(getMessaging(), (next: string) => {
    store(sessionToken, next).catch(() => undefined);
  });
}

/** Drop this device on sign-out, so a shared or sold phone stops receiving
 *  reminders for an account that has left it. */
export async function unregisterCustomerFromPush(sessionToken: string): Promise<void> {
  try {
    const deviceToken = await getToken(getMessaging());
    if (!deviceToken) return;
    await supabase.functions.invoke('save-device-token', {
      body: { token: sessionToken, deviceToken, action: 'remove' },
    });
  } catch {
    // Best effort — signing out must not fail because a token could not be read.
  }
}
