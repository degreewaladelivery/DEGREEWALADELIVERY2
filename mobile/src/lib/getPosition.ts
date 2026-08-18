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

export interface Position {
  latitude: number;
  longitude: number;
  /** Metres. Useful for deciding whether a refinement is worth waiting for. */
  accuracy: number;
}

function once(options: Parameters<typeof Geolocation.getCurrentPosition>[2]): Promise<Position | null> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? 9999,
        }),
      () => resolve(null),
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
