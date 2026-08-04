import { supabase } from './supabase';

export interface TrackedOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string | null;
}

export interface TrackedOrder {
  id: string;
  status: 'placed' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';
  pickup_label: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  agent_latitude: number | null;
  agent_longitude: number | null;
  agent_location_at: string | null;
  distance_km: number | null;
  items: TrackedOrderItem[];
  subtotal: number;
  delivery_fee: number;
  taxes: number;
  total: number;
  payment_method: string;
  created_at: string;
  claimed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  agent: { name: string; phone: string } | null;
}

export async function fetchMyOrders(customerId: string, phone: string): Promise<TrackedOrder[]> {
  const { data, error } = await supabase.functions.invoke('track-order', {
    body: { customerId, phone },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Could not load your orders');
  }
  return data.orders as TrackedOrder[];
}
