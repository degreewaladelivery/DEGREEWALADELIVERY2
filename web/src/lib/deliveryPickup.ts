import { supabase } from './supabase';
import type { LatLng } from '@shared/mapbox';

export async function getPickupPoint(shopId: string | null): Promise<LatLng | null> {
  if (shopId) {
    const { data } = await supabase.from('shops').select('latitude,longitude').eq('id', shopId).maybeSingle();
    if (data?.latitude != null && data?.longitude != null) {
      return { latitude: data.latitude, longitude: data.longitude };
    }
  }

  const { data: settings } = await supabase.from('app_settings').select('pickup_latitude,pickup_longitude').single();
  if (settings?.pickup_latitude != null && settings?.pickup_longitude != null) {
    return { latitude: settings.pickup_latitude, longitude: settings.pickup_longitude };
  }

  return null;
}
