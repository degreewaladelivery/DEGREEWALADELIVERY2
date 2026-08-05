import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';
import {
  calculateDeliveryFare,
  haversineDistanceKm,
  MAX_DELIVERY_RADIUS_KM,
} from '../../../shared/deliveryFare.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') ?? '';

const TAX_RATE = 0.05;

interface PickupPoint {
  latitude: number;
  longitude: number;
  label: string;
}

async function resolvePickup(
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

async function routeDistanceKm(
  from: PickupPoint,
  toLatitude: number,
  toLongitude: number
): Promise<number> {
  if (MAPBOX_TOKEN) {
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${from.longitude},${from.latitude};${toLongitude},${toLatitude}` +
        `?overview=false&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters === 'number') return meters / 1000;
    } catch {}
  }
  return haversineDistanceKm(from.latitude, from.longitude, toLatitude, toLongitude);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, body.token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const { data: customer } = await admin
      .from('customers')
      .select('id, phone')
      .eq('id', customerId)
      .single();
    if (!customer) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const address = String(body.address ?? '').trim();
    if (address.length < 6) {
      return json({ ok: false, error: 'Please enter a delivery address' });
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return json({ ok: false, error: 'Please pick your delivery location on the map' });
    }

    const requested = Array.isArray(body.items) ? body.items : [];
    if (requested.length === 0) {
      return json({ ok: false, error: 'Your cart is empty' });
    }

    const quantities = new Map<string, number>();
    for (const entry of requested) {
      const id = String(entry?.id ?? '');
      const quantity = Math.floor(Number(entry?.quantity));
      if (!id || !Number.isFinite(quantity) || quantity < 1) {
        return json({ ok: false, error: 'Your cart has an invalid item' });
      }
      quantities.set(id, quantity);
    }

    const ids = [...quantities.keys()];
    const [fromCategories, fromShops] = await Promise.all([
      admin.from('products_catalog').select('id, name, unit, retail_price').in('id', ids),
      admin.from('shop_products_catalog').select('id, name, unit, retail_price').in('id', ids),
    ]);

    const available = [...(fromCategories.data ?? []), ...(fromShops.data ?? [])];
    if (available.length !== ids.length) {
      return json({ ok: false, error: 'Some items are no longer available' });
    }

    const items = available.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.retail_price),
      quantity: quantities.get(product.id) ?? 1,
      unit: product.unit ?? null,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const shopId = body.shopId ? String(body.shopId) : null;
    const pickup = await resolvePickup(admin, shopId);
    if (!pickup) {
      return json({ ok: false, error: 'Delivery is not set up for this shop yet' });
    }

    const distanceKm = await routeDistanceKm(pickup, latitude, longitude);
    if (distanceKm > MAX_DELIVERY_RADIUS_KM) {
      return json({
        ok: false,
        error: `That address is ${distanceKm.toFixed(1)} km away — we deliver within ${MAX_DELIVERY_RADIUS_KM} km.`,
      });
    }

    const fare = calculateDeliveryFare(distanceKm);
    const taxes = Math.round(subtotal * TAX_RATE);
    const total = subtotal + fare.customerFare + taxes;

    const { data: order, error } = await admin
      .from('orders')
      .insert({
        customer_id: customer.id,
        customer_phone: customer.phone,
        pickup_label: pickup.label,
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        delivery_address: address,
        delivery_latitude: latitude,
        delivery_longitude: longitude,
        distance_km: distanceKm,
        items,
        subtotal,
        delivery_fee: fare.customerFare,
        taxes,
        total,
        agent_payout: fare.agentPayout,
        payment_method: 'cod',
      })
      .select('id')
      .single();

    if (error || !order) {
      return json({ ok: false, error: 'Could not place your order' });
    }

    return json({ ok: true, orderId: order.id, total, deliveryFee: fare.customerFare, distanceKm });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
