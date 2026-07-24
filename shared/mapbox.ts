import { haversineDistanceKm } from './deliveryFare';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export async function getRouteDistanceKm(
  token: string,
  from: LatLng,
  to: LatLng
): Promise<number> {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=false&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters === 'number') return meters / 1000;
  } catch {}
  return haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
}
