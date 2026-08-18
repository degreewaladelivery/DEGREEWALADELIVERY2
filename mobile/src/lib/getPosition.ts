import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

/**
 * Find the phone, indoors as well as out.
 *
 * Asking for high accuracy demands a satellite fix, and inside a shop or a
 * house that simply never arrives — the request sits there and times out,
 * which the customer reads as "the app can't find me". Phones solve this with
 * wifi and cell towers, which is accurate to a few dozen metres: more than
 * enough to drop a pin the customer then drags to their door.
 *
 * So: take the quick approximate fix first, then quietly try to improve it.
 * Something on the map beats nothing while GPS is still thinking.
 */

/**
 * Use Google's fused location provider on Android.
 *
 * The library defaults to the legacy LocationManager, whose NETWORK_PROVIDER
 * modern phones no longer ship — Google replaced it with the fused provider.
 * That left both paths dead indoors: no network provider to ask, and GPS
 * unable to see satellites through a roof. The fused provider blends wifi,
 * cell and GPS and answers in a second from inside a building.
 *
 * Configured once, at module load, before anything asks for a position.
 */
if (Platform.OS === 'android') {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: true, // we ask explicitly, with our own wording
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'playServices',
  });
}

export interface Position {
  latitude: number;
  longitude: number;
  /** Metres. Useful for deciding whether a refinement is worth waiting for. */
  accuracy: number;
}

/** The last failure seen, so the UI can say something specific rather than
 *  "could not find you" — which tells a customer nothing they can act on. */
let lastError: { code: number; message: string } | null = null;

export function lastLocationError(): { code: number; message: string } | null {
  return lastError;
}

function once(options: Parameters<typeof Geolocation.getCurrentPosition>[2]): Promise<Position | null> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (p) => {
        lastError = null;
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? 9999,
        });
      },
      (err) => {
        lastError = { code: err?.code ?? 0, message: err?.message ?? 'unknown' };
        resolve(null);
      },
      options
    );
  });
}

/**
 * Returns the best position available within a few seconds, or null if the
 * phone genuinely cannot locate itself.
 *
 * `onImprove` fires if a more precise fix turns up afterwards, so the pin can
 * settle without the customer waiting on it.
 */
export async function getBestPosition(
  onImprove?: (position: Position) => void
): Promise<Position | null> {
  // Wifi and towers: fast, works indoors, and a recent cached fix is fine.
  const coarse = await once({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 120000,
  });

  if (coarse) {
    // Good enough already — don't spend battery chasing satellites.
    if (coarse.accuracy <= 100) return coarse;

    once({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }).then((precise) => {
      if (precise && precise.accuracy < coarse.accuracy) onImprove?.(precise);
    });
    return coarse;
  }

  // Nothing from the network — the satellites are the only hope left.
  return once({ enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}
