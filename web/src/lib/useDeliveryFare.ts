import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { supabase } from './supabase';
import { hasMapbox } from './mapbox';
import {
  calculateDeliveryFare,
  MAX_DELIVERY_RADIUS_KM,
  type DeliveryFare,
} from '@shared/deliveryFare';

interface Measured {
  latitude: number;
  longitude: number;
  shopKey: string;
  km: number;
}

export interface DeliveryFareState {
  distanceKm: number | null;
  fare: DeliveryFare | null;
  loading: boolean;
  outOfRange: boolean;
  pickupError: boolean;
  hasLocation: boolean;
}

/**
 * The delivery distance and fare, measured by the same server code that
 * place-order charges on — so the quote in the cart and the amount actually
 * billed are the same number by construction, not by two copies of the maths
 * happening to agree.
 */
export function useDeliveryFare(shopId: string | null): DeliveryFareState {
  const location = useLocationStore((s) => s.location);
  const [pickupError, setPickupError] = useState(false);
  const [measured, setMeasured] = useState<Measured | null>(null);

  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;
  const shopKey = shopId ?? '';

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    let cancelled = false;

    supabase.functions
      .invoke('route-distance', { body: { shopId, latitude, longitude } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.ok || typeof data.distanceKm !== 'number') {
          setPickupError(true);
          return;
        }
        setPickupError(false);
        setMeasured({ latitude, longitude, shopKey, km: data.distanceKm });
      })
      .catch(() => {
        if (!cancelled) setPickupError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [shopId, shopKey, latitude, longitude]);

  const distanceKm =
    measured &&
    measured.latitude === latitude &&
    measured.longitude === longitude &&
    measured.shopKey === shopKey
      ? measured.km
      : null;

  const fare = hasMapbox()
    ? distanceKm != null
      ? calculateDeliveryFare(distanceKm)
      : null
    : calculateDeliveryFare(0);

  return {
    distanceKm,
    fare,
    loading: hasMapbox() && latitude != null && distanceKm == null && !pickupError,
    outOfRange: distanceKm != null && distanceKm > MAX_DELIVERY_RADIUS_KM,
    pickupError,
    hasLocation: latitude != null && longitude != null,
  };
}
