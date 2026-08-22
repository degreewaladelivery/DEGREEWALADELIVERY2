import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { haversineDistanceKm } from '../../../shared/deliveryFare.ts';

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') ?? '';
const GOOGLE_ROUTES_KEY = Deno.env.get('GOOGLE_ROUTES_KEY') ?? '';

export interface PickupPoint {
  latitude: number;
  longitude: number;
  label: string;
}

/** Which provider actually answered. 'line' means neither did. */
export type DistanceSource = 'google' | 'mapbox' | 'line';

export interface RouteDistance {
  km: number;
  source: DistanceSource;
}

export async function resolvePickup(
  admin: SupabaseClient,
  shopId: string | null
): Promise<PickupPoint | null> {
  if (shopId) {
    const { data: shop } = await admin
      .from('shops')
      .select('name, latitude, longitude')
      .eq('id', shopId)
      .maybeSingle();
    if (shop?.latitude != null && shop?.longitude != null) {
      return { latitude: shop.latitude, longitude: shop.longitude, label: shop.name };
    }
  }

  const { data: settings } = await admin
    .from('app_settings')
    .select('pickup_latitude, pickup_longitude')
    .single();
  if (settings?.pickup_latitude == null || settings?.pickup_longitude == null) return null;

  let label = 'DegreeWala pickup point';
  if (shopId) {
    const { data: category } = await admin
      .from('categories')
      .select('name')
      .eq('id', shopId)
      .maybeSingle();
    if (category?.name) label = category.name;
  }

  return {
    latitude: settings.pickup_latitude,
    longitude: settings.pickup_longitude,
    label,
  };
}

/**
 * Road distance for the delivery fare.
 *
 * Google goes first because it picks the same roads its own Maps app shows, and
 * customers check the route there — a fare built on a road Google wouldn't
 * suggest reads as a wrong charge even when the maths is right.
 *
 * The straight line at the end is a floor, not an answer: it always undercounts
 * a real drive, so it's reported as 'line' rather than passed off as a route.
 * Callers that care can tell the difference; earlier this fallback was silent,
 * which made a failed lookup indistinguishable from a genuinely short trip.
 */
export async function routeDistanceKm(
  from: { latitude: number; longitude: number },
  toLatitude: number,
  toLongitude: number
): Promise<RouteDistance> {
  if (GOOGLE_ROUTES_KEY) {
    try {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_ROUTES_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.latitude, longitude: from.longitude } } },
          destination: { location: { latLng: { latitude: toLatitude, longitude: toLongitude } } },
          travelMode: 'DRIVE',
        }),
      });
      const data = await res.json();
      const meters = data?.routes?.[0]?.distanceMeters;
      if (typeof meters === 'number') return { km: meters / 1000, source: 'google' };
      console.error('routes.googleapis.com returned no distance', JSON.stringify(data));
    } catch (error) {
      console.error('routes.googleapis.com request failed', error);
    }
  }

  if (MAPBOX_TOKEN) {
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${from.longitude},${from.latitude};${toLongitude},${toLatitude}` +
        `?overview=false&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters === 'number') return { km: meters / 1000, source: 'mapbox' };
      console.error('api.mapbox.com returned no distance', JSON.stringify(data));
    } catch (error) {
      console.error('api.mapbox.com request failed', error);
    }
  }

  return {
    km: haversineDistanceKm(from.latitude, from.longitude, toLatitude, toLongitude),
    source: 'line',
  };
}
