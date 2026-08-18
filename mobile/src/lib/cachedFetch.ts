import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Show what we had last time, immediately, then refresh in the background.
 *
 * A cold start used to be a blank screen until Supabase answered — and with no
 * signal, a blank screen forever. The catalogue barely changes between
 * launches, so waiting on the network to draw it is a choice, not a necessity.
 * This is why Zomato feels instant on open: it renders yesterday's data first
 * and quietly corrects it.
 *
 * Stale data is safe here because none of it is a promise to the customer —
 * prices and availability are re-checked server-side when the order is placed.
 */

const PREFIX = 'dw_cache_';

interface Entry<T> {
  at: number;
  value: T;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return (JSON.parse(raw) as Entry<T>).value;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // A full disk must not break browsing.
  }
}

/**
 * Calls `onValue` with the cached copy first (when there is one), then again
 * with fresh data once it arrives.
 *
 * A failed refresh is swallowed on purpose: the cached copy is already on
 * screen, and an error banner over perfectly good content helps nobody.
 */
export async function loadCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  onValue: (value: T, source: 'cache' | 'network') => void
): Promise<void> {
  const cached = await readCache<T>(key);
  if (cached !== null) onValue(cached, 'cache');

  try {
    const fresh = await fetcher();
    onValue(fresh, 'network');
    await writeCache(key, fresh);
  } catch {
    // Keep whatever is showing.
  }
}
