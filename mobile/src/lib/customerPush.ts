import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Set once we have shown the permission prompt, so it is never shown twice.
 *
 * Android re-prompts a decline on every request until it decides to suppress
 * them itself, which would mean asking at every launch. Storage is wiped by a
 * reinstall, which is the one case where asking again is right — a fresh
 * install is a fresh decision.
 */
const ASKED_KEY = 'dw_push_asked';

async function alreadyAsked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
  } catch {
    // Unreadable storage should not cause repeated prompting.
    return true;
  }
}

/** Whether notifications are permitted, without prompting for them. */
async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // POST_NOTIFICATIONS only exists on API 33+. Below that it is granted at
    // install time and the constant is undefined.
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) return true;
    try {
      return await PermissionsAndroid.check(permission);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Shows the system prompt, once ever.
 *
 * Called after sign-in, which is the moment it makes sense to a customer —
 * asking on first launch, before they know what the app is, is how you get
 * denied.
 */
async function askOnce(): Promise<boolean> {
  if (await alreadyAsked()) return hasPermission();

  try {
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch {
    // If the flag cannot be stored, still ask this once rather than never.
  }

  if (Platform.OS === 'android') {
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
 * Stores the current token and follows refreshes.
 *
 * `ask` is true only at sign-in. Every other call — each app launch — checks
 * the permission silently and does nothing if it was refused, so declining is
 * respected instead of being asked again tomorrow.
 *
 * Launch still re-registers when permission is held, because tokens rotate on
 * reinstall and on restore to a new phone, and a stale one fails silently: the
 * customer would simply stop being reachable with nothing to show for it. That
 * refresh needs no prompt.
 *
 * Returns an unsubscribe for the refresh listener.
 */
export async function registerCustomerForPush(
  sessionToken: string,
  { ask = false }: { ask?: boolean } = {}
): Promise<() => void> {
  const granted = ask ? await askOnce() : await hasPermission();
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
