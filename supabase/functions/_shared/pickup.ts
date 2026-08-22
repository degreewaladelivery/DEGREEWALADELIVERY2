import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Routing is generic and now lives in distance.ts; re-exported so existing
// callers keep one import.
export { routeDistanceKm } from './distance.ts';
export type { DistanceSource, RouteDistance } from './distance.ts';

export interface PickupPoint {
  latitude: number;
  longitude: number;
  label: string;
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
