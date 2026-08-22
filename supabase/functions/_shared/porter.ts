import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { haversineDistanceKm } from '../../../shared/deliveryFare.ts';
import {
  calculatePorterFare,
  calculatePorterCommission,
  DEFAULT_PORTER_COMMISSION_PERCENT,
  MAX_PORTER_RADIUS_KM,
  type PorterVehicle,
} from '../../../shared/porterFare.ts';
import { routeDistanceKm, type LatLng } from './distance.ts';

export interface PorterQuote {
  vehicle: PorterVehicle;
  distanceKm: number;
  baseFare: number;
  distanceFare: number;
  fareTotal: number;
  commissionPercent: number;
  commissionAmount: number;
}

export async function loadVehicle(
  admin: SupabaseClient,
  code: unknown
): Promise<PorterVehicle | null> {
  if (typeof code !== 'string' || !code) return null;
  const { data } = await admin
    .from('porter_vehicle_types')
    .select('code, name, base_fare, per_km')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  return {
    code: data.code,
    name: data.name,
    baseFare: Number(data.base_fare),
    perKm: Number(data.per_km),
  };
}

export async function loadCommissionPercent(admin: SupabaseClient): Promise<number> {
  const { data } = await admin
    .from('app_settings')
    .select('porter_commission_percent')
    .single();
  const percent = Number(data?.porter_commission_percent);
  return Number.isFinite(percent) ? percent : DEFAULT_PORTER_COMMISSION_PERCENT;
}

export class PorterQuoteError extends Error {}

/**
 * Prices one porter job.
 *
 * The straight-line check runs before any routing call, for two reasons: it
 * rejects an out-of-area job with a truthful distance rather than a routed one,
 * and it means an arbitrary pair of coordinates can't be used to spend our
 * routing quota on a cross-country lookup. A straight line is always shorter
 * than the drive, so anything failing this check could only be further away.
 */
export async function quotePorterJob(
  admin: SupabaseClient,
  pickup: LatLng,
  drop: LatLng,
  vehicleCode: unknown
): Promise<PorterQuote> {
  const vehicle = await loadVehicle(admin, vehicleCode);
  if (!vehicle) throw new PorterQuoteError('Choose a vehicle type.');

  const straightLineKm = haversineDistanceKm(
    pickup.latitude,
    pickup.longitude,
    drop.latitude,
    drop.longitude
  );
  if (straightLineKm > MAX_PORTER_RADIUS_KM) {
    throw new PorterQuoteError(
      `That trip is over ${MAX_PORTER_RADIUS_KM} km — Porter covers up to ${MAX_PORTER_RADIUS_KM} km.`
    );
  }

  const { km } = await routeDistanceKm(pickup, drop.latitude, drop.longitude);
  if (km > MAX_PORTER_RADIUS_KM) {
    throw new PorterQuoteError(
      `That trip is ${km.toFixed(1)} km by road — Porter covers up to ${MAX_PORTER_RADIUS_KM} km.`
    );
  }

  const distanceKm = Math.round(km * 100) / 100;
  const fare = calculatePorterFare(vehicle, distanceKm);
  const percent = await loadCommissionPercent(admin);
  const { commission } = calculatePorterCommission(fare.total, percent);

  return {
    vehicle,
    distanceKm,
    baseFare: fare.baseFare,
    distanceFare: fare.distanceFare,
    fareTotal: fare.total,
    commissionPercent: percent,
    commissionAmount: commission,
  };
}

export function readLatLng(value: unknown): LatLng | null {
  const point = value as { latitude?: unknown; longitude?: unknown } | null;
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
