import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { resolvePickup, routeDistanceKm } from './pickup.ts';
import { calculateDeliveryFare, MAX_DELIVERY_RADIUS_KM } from '../../../shared/deliveryFare.ts';

const TAX_RATE = 0.05;

export interface OrderRequest {
  customerId: string;
  customerPhone: string;
  customerName: string | null;
  items: { id: string; quantity: number }[];
  address: string;
  latitude: number;
  longitude: number;
  shopId: string | null;
}

export interface OrderFailure {
  ok: false;
  error: string;
  unavailableIds?: string[];
}

export interface OrderSuccess {
  ok: true;
  orderId: string;
  total: number;
  deliveryFee: number;
  distanceKm: number;
}

/**
 * Prices a basket and writes the order.
 *
 * Shared so that a repeat order and a fresh one are priced by the same code.
 * They must agree: a customer who set up a monthly delivery is quoted on the
 * day it runs, and a second implementation drifting from this one would show
 * one number and charge another.
 *
 * Prices are read from the catalogue at call time, never from the caller. For a
 * schedule that is the whole point — the basket was chosen months ago and the
 * shop has repriced since — and for a live cart it stops the client naming its
 * own total.
 */
export async function createOrder(
  admin: SupabaseClient,
  request: OrderRequest
): Promise<OrderSuccess | OrderFailure> {
  const address = request.address.trim();
  if (address.length < 6) {
    return { ok: false, error: 'Please enter a delivery address' };
  }
  if (!Number.isFinite(request.latitude) || !Number.isFinite(request.longitude)) {
    return { ok: false, error: 'Please pick your delivery location on the map' };
  }
  if (request.items.length === 0) {
    return { ok: false, error: 'Your cart is empty' };
  }

  const quantities = new Map<string, number>();
  for (const entry of request.items) {
    const id = String(entry?.id ?? '');
    const quantity = Math.floor(Number(entry?.quantity));
    if (!id || !Number.isFinite(quantity) || quantity < 1) {
      return { ok: false, error: 'Your cart has an invalid item' };
    }
    quantities.set(id, quantity);
  }

  const ids = [...quantities.keys()];
  const [fromCategories, fromShops] = await Promise.all([
    admin.from('products_catalog').select('id, name, unit, retail_price, image_url').in('id', ids),
    admin
      .from('shop_products_catalog')
      .select('id, name, unit, retail_price, image_url')
      .in('id', ids),
  ]);

  const available = [...(fromCategories.data ?? []), ...(fromShops.data ?? [])];
  if (available.length !== ids.length) {
    // Name them. The catalogue views hide anything inactive, so a missing row is
    // exactly an item that has been withdrawn — and "some items are no longer
    // available" leaves someone deleting things one at a time to find out which.
    // The base tables still hold the names.
    const found = new Set(available.map((product) => product.id));
    const missingIds = ids.filter((id) => !found.has(id));
    const [namedProducts, namedShopProducts] = await Promise.all([
      admin.from('products').select('name').in('id', missingIds),
      admin.from('shop_products').select('name').in('id', missingIds),
    ]);
    const names = [...(namedProducts.data ?? []), ...(namedShopProducts.data ?? [])]
      .map((row) => row.name)
      .filter(Boolean);

    return {
      ok: false,
      error: names.length
        ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer available. Please remove ${names.length === 1 ? 'it' : 'them'} from your cart.`
        : 'Some items are no longer available',
      unavailableIds: missingIds,
    };
  }

  const items = available.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.retail_price),
    quantity: quantities.get(product.id) ?? 1,
    unit: product.unit ?? null,
    // Snapshot the picture alongside the name and price. An order is a record of
    // what was bought; if the catalogue photo changes later, the receipt should
    // still show what the customer actually chose.
    image_url: product.image_url ?? null,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const pickup = await resolvePickup(admin, request.shopId);
  if (!pickup) {
    return { ok: false, error: 'Delivery is not set up for this shop yet' };
  }

  const { km: distanceKm } = await routeDistanceKm(pickup, request.latitude, request.longitude);
  if (distanceKm > MAX_DELIVERY_RADIUS_KM) {
    return {
      ok: false,
      error: `That address is ${distanceKm.toFixed(1)} km away — we deliver within ${MAX_DELIVERY_RADIUS_KM} km.`,
    };
  }

  const fare = calculateDeliveryFare(distanceKm);
  const taxes = Math.round(subtotal * TAX_RATE);
  const total = subtotal + fare.customerFare + taxes;

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      customer_id: request.customerId,
      customer_phone: request.customerPhone,
      customer_name: request.customerName,
      pickup_label: pickup.label,
      pickup_latitude: pickup.latitude,
      pickup_longitude: pickup.longitude,
      delivery_address: address,
      delivery_latitude: request.latitude,
      delivery_longitude: request.longitude,
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
    console.error('createOrder insert failed', error);
    return { ok: false, error: 'Could not place your order' };
  }

  return {
    ok: true,
    orderId: order.id,
    total,
    deliveryFee: fare.customerFare,
    distanceKm,
  };
}
