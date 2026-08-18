import { supabase } from './supabase';

/**
 * Registering a customer's browser for order updates.
 *
 * Without this, a customer who closes the tab is told nothing at all — not when
 * an agent is assigned, not when it's on the way, not when it arrives. The
 * in-page alerts only fire while the page is actually open.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const SW_URL = '/customer-sw.js';

export function customerPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    typeof Notification !== 'undefined' &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

function keyToBase64(subscription: PushSubscription, name: 'p256dh' | 'auth'): string {
  const key = subscription.getKey(name);
  if (!key) throw new Error(`Subscription is missing its ${name} key`);
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

/**
 * Must be called from a click — browsers refuse the permission prompt
 * otherwise. Returns whether the customer will now receive updates.
 */
export async function enableOrderUpdates(token: string): Promise<boolean> {
  if (!customerPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      }));

    const { data, error } = await supabase.functions.invoke('save-push-subscription', {
      body: {
        token,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keyToBase64(subscription, 'p256dh'),
            auth: keyToBase64(subscription, 'auth'),
          },
        },
        userAgent: navigator.userAgent,
      },
    });

    return !error && Boolean(data?.ok);
  } catch {
    return false;
  }
}

/** True when this browser is already set up to receive updates. */
export async function orderUpdatesEnabled(): Promise<boolean> {
  if (!customerPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!registration) return false;
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}
