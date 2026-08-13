import { supabase } from '../lib/supabase';

/**
 * Registering an agent's browser for background push.
 *
 * Unlike the in-page chime, this keeps working when the dashboard tab is closed
 * or the phone is locked, because the service worker receives the push, not the
 * page. That is the difference between "a rider who is watching the screen" and
 * "a rider".
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const SW_URL = '/agent-sw.js';

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

/** The VAPID key travels as base64url but the browser wants raw bytes. */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return buffer;
}

function keyToBase64(subscription: PushSubscription, name: 'p256dh' | 'auth'): string {
  const key = subscription.getKey(name);
  if (!key) throw new Error(`Push subscription is missing its ${name} key`);
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'failed'; detail?: string };

/**
 * Called from a click — browsers refuse notification permission otherwise.
 * Registers the worker, subscribes, and stores the subscription so the server
 * can reach this device.
 */
export async function subscribeToPush(userId: string): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    // Reuse an existing subscription when there is one; re-subscribing with a
    // different key throws rather than replacing it.
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      }));

    const { error } = await supabase.from('agent_push_subscriptions').upsert(
      {
        endpoint: subscription.endpoint,
        user_id: userId,
        p256dh: keyToBase64(subscription, 'p256dh'),
        auth: keyToBase64(subscription, 'auth'),
        user_agent: navigator.userAgent.slice(0, 300),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );
    if (error) return { ok: false, reason: 'failed', detail: error.message };

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err instanceof Error ? err.message : undefined };
  }
}

/** True when this browser already has a live subscription stored. */
export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!registration) return false;
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}
