import { haversineDistanceKm } from './deliveryFare';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Kept for callers that only need a rough on-screen figure. Delivery distance
 * is not one of them: that is measured by the route-distance edge function, so
 * the quote and the charge come from one place and the routing key stays off
 * the client.
 */
export async function getRouteDistanceKm(
  mapboxToken: string,
  from: LatLng,
  to: LatLng
): Promise<number> {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=false&access_token=${mapboxToken}`;
    const res = await fetch(url);
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters === 'number') return meters / 1000;
  } catch {}
  return haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
}
