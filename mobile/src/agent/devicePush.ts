import { Platform, PermissionsAndroid } from 'react-native';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { supabaseAgent } from './supabaseAgent';

/**
 * Registers an agent's phone for push, so a new order reaches them with the app
 * closed and the screen off — the thing the web dashboard can never do.
 *
 * Tokens are stored per device rather than per agent: a rider with a work phone
 * and a spare should have both ring, and a token is only valid for the install
 * it came from.
 */

/**
 * Android 13+ needs an explicit runtime permission, and iOS always does. Called
 * right after sign-in, which is the moment the request makes sense to the agent
 * — asking on first launch, before they know what the app is, is how you get
 * denied.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // POST_NOTIFICATIONS only exists on API 33+. On older versions the
    // permission is granted at install time and this constant is undefined.
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await requestPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
  );
}

async function storeToken(userId: string, token: string): Promise<void> {
  await supabaseAgent.from('agent_device_tokens').upsert(
    {
      token,
      user_id: userId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
}

/**
 * Asks permission, stores the current token, and keeps it current.
 *
 * Returns an unsubscribe for the refresh listener. Tokens rotate — on reinstall,
 * on restore to a new phone, occasionally on their own — and a stale token fails
 * silently, so not following refreshes means an agent quietly stops being
 * reachable with no sign anything is wrong.
 */
export async function registerDeviceForPush(userId: string): Promise<() => void> {
  const granted = await requestPushPermission();
  if (!granted) return () => undefined;

  try {
    const token = await getToken(getMessaging());
    if (token) await storeToken(userId, token);
  } catch {
    // No Play Services, or a device that can't reach FCM. The in-app polling
    // still works; they just won't be woken while the app is closed.
  }

  return onTokenRefresh(getMessaging(), (next: string) => {
    storeToken(userId, next).catch(() => undefined);
  });
}

/** Drop this device's token on sign-out, so a returned phone stops ringing for
 *  orders that are no longer this agent's business. */
export async function unregisterDeviceForPush(): Promise<void> {
  try {
    const token = await getToken(getMessaging());
    if (!token) return;
    await supabaseAgent.from('agent_device_tokens').delete().eq('token', token);
  } catch {
    // Best effort — signing out must not fail because a token couldn't be read.
  }
}
