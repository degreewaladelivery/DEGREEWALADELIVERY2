export interface DeliveryFare {
  customerFare: number;
  agentPayout: number;
}

const BASE_CUSTOMER_FARE = 29;
const CUSTOMER_RATE_PER_KM = 7;
const BASE_AGENT_PAYOUT = 16;
const AGENT_RATE_PER_KM = 4;
const BASE_COVERS_KM = 1;
export const MAX_DELIVERY_RADIUS_KM = 15;

export function calculateDeliveryFare(distanceKm: number): DeliveryFare {
  const billableKm = Math.max(0, distanceKm - BASE_COVERS_KM);
  return {
    customerFare: Math.round(BASE_CUSTOMER_FARE + billableKm * CUSTOMER_RATE_PER_KM),
    agentPayout: Math.round(BASE_AGENT_PAYOUT + billableKm * AGENT_RATE_PER_KM),
  };
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
