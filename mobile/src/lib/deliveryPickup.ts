import { supabase } from './supabase';
import type { LatLng } from '@shared/mapbox';

export interface PickupPoint extends LatLng {
  label: string;
}

export async function getPickupPoint(shopId: string | null): Promise<PickupPoint | null> {
  if (shopId) {
    const { data: shop } = await supabase
      .from('shops')
      .select('name,latitude,longitude')
      .eq('id', shopId)
      .maybeSingle();
    if (shop?.latitude != null && shop?.longitude != null) {
      return { latitude: shop.latitude, longitude: shop.longitude, label: shop.name };
    }
  }

  const { data: settings } = await supabase.from('app_settings').select('pickup_latitude,pickup_longitude').single();
  if (settings?.pickup_latitude != null && settings?.pickup_longitude != null) {
    let label = 'DegreeWala pickup point';
    if (shopId) {
      const { data: category } = await supabase.from('categories').select('name').eq('id', shopId).maybeSingle();
      if (category?.name) label = category.name;
    }
    return { latitude: settings.pickup_latitude, longitude: settings.pickup_longitude, label };
  }

  return null;
}
