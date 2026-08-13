/**
 * Alerting an agent that a new order landed in the pool.
 *
 * An agent is not staring at the screen — they're riding, or the phone is in a
 * pocket. A silent list that updates is not enough, so a new order makes a
 * sound and raises a browser notification.
 *
 * Both need a user gesture first: browsers suspend audio and refuse
 * notification permission unless the person asked for it. Hence `enableAlerts`,
 * which the page calls from a button click.
 */

/**
 * Which of the currently open orders are new since the last look.
 *
 * `previous` is null on the very first load — the agent is looking at the list
 * right then, so nothing counts as new and the dashboard stays quiet on sign-in.
 * Kept pure and separate from the sound so the decision can be tested.
 */
export function findNewOrders<T extends { id: string }>(
  open: T[],
  previous: Set<string> | null
): T[] {
  if (previous === null) return [];
  return open.filter((order) => !previous.has(order.id));
}

let audioContext: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function alertsSupported(): boolean {
  return getAudioContextCtor() !== null || typeof Notification !== 'undefined';
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Called from a click. Unlocks audio and asks for notification permission.
 * Returns the resulting permission so the caller can tell the agent what
 * happened — a denied permission is silent otherwise, which would leave them
 * believing they're covered when they aren't.
 */
export async function enableAlerts(): Promise<NotificationPermission | 'unsupported'> {
  const Ctor = getAudioContextCtor();
  if (Ctor && !audioContext) audioContext = new Ctor();
  if (audioContext?.state === 'suspended') await audioContext.resume().catch(() => undefined);

  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') {
    return Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
  }
  return Notification.permission;
}

/**
 * Two rising beeps, synthesised rather than shipped as an audio file so the
 * dashboard keeps working on a bad connection.
 */
export function playChime(): void {
  const Ctor = getAudioContextCtor();
  if (!audioContext && Ctor) audioContext = new Ctor();
  const ctx = audioContext;
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);

  const start = ctx.currentTime;
  [880, 1174.7].forEach((frequency, i) => {
    const at = start + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    // Fade in and out; a hard start or stop clicks audibly.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.18);
  });
}

export function showNewOrderNotification(count: number, total: number): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = count === 1 ? 'New delivery available' : `${count} new deliveries available`;
  const body =
    count === 1
      ? `₹${total} order waiting to be accepted.`
      : 'Open your dashboard to accept one.';
  try {
    // Same tag for every alert so a burst of orders replaces itself rather than
    // burying the phone in notifications.
    new Notification(title, { body, tag: 'dw-new-order', renotify: true } as NotificationOptions);
  } catch {
    // Some browsers only allow notifications via a service worker. The chime
    // still played, so the agent is not left with nothing.
  }
}
