import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { getPickupPoint, type PickupPoint } from './deliveryPickup';
import { MAPBOX_TOKEN, hasMapbox } from './mapbox';
import {
  calculateDeliveryFare,
  haversineDistanceKm,
  MAX_DELIVERY_RADIUS_KM,
  type DeliveryFare,
} from '@shared/deliveryFare';
import { getRouteDistanceKm } from '@shared/mapbox';

interface Measured {
  latitude: number;
  longitude: number;
  pickupKey: string;
  km: number;
}

export interface DeliveryFareState {
  pickup: PickupPoint | null;
  pickupError: boolean;
  distanceKm: number | null;
  fare: DeliveryFare | null;
  loading: boolean;
  outOfRange: boolean;
  hasLocation: boolean;
}

export function useDeliveryFare(shopId: string | null): DeliveryFareState {
  const location = useLocationStore((s) => s.location);
  const [pickup, setPickup] = useState<PickupPoint | null>(null);
  const [pickupError, setPickupError] = useState(false);
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    if (!hasMapbox()) return;
    let cancelled = false;

    getPickupPoint(shopId)
      .then((point) => {
        if (cancelled) return;
        if (point) setPickup(point);
        else setPickupError(true);
      })
      .catch(() => {
        if (!cancelled) setPickupError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;
  const pickupKey = pickup ? `${pickup.latitude},${pickup.longitude}` : null;

  useEffect(() => {
    if (!hasMapbox() || !pickup || latitude == null || longitude == null) return;
    let cancelled = false;

    const target = { latitude, longitude };
    const run = MAPBOX_TOKEN
      ? getRouteDistanceKm(MAPBOX_TOKEN, pickup, target)
      : Promise.resolve(
          haversineDistanceKm(pickup.latitude, pickup.longitude, latitude, longitude)
        );

    run.then((km) => {
      if (!cancelled) {
        setMeasured({
          latitude,
          longitude,
          pickupKey: `${pickup.latitude},${pickup.longitude}`,
          km,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pickup, latitude, longitude]);

  const distanceKm =
    measured &&
    measured.latitude === latitude &&
    measured.longitude === longitude &&
    measured.pickupKey === pickupKey
      ? measured.km
      : null;

  const fare = hasMapbox()
    ? distanceKm != null
      ? calculateDeliveryFare(distanceKm)
      : null
    : calculateDeliveryFare(0);

  return {
    pickup,
    pickupError,
    distanceKm,
    fare,
    loading:
      hasMapbox() && pickup != null && latitude != null && distanceKm == null && !pickupError,
    outOfRange: distanceKm != null && distanceKm > MAX_DELIVERY_RADIUS_KM,
    hasLocation: latitude != null && longitude != null,
  };
}
