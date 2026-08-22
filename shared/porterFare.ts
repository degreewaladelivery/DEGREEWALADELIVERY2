/**
 * Porter goods transport — fares and commission.
 *
 * Deliberately not sharing code with deliveryFare.ts, because the two are
 * different businesses that only look alike:
 *
 *   Delivery — DegreeWala sets the fare, pays the agent, keeps the spread. The
 *   base covers the first kilometre, so only distance *beyond* 1 km is billed.
 *
 *   Porter — the fare belongs to the driver, who is paid by the customer
 *   directly and in full. DegreeWala takes a commission off the driver's
 *   earnings afterwards. There is no free first kilometre: every kilometre is
 *   billed from zero. A 5 km auto job is 199 + 5 x 37 = 384, not 199 + 4 x 37.
 *
 * Collapsing them into one "fare" helper would make that second difference easy
 * to lose, and it changes what every customer is quoted.
 */

export interface PorterVehicle {
  /** Stable key stored on jobs; renaming one would rewrite history. */
  code: string;
  name: string;
  baseFare: number;
  perKm: number;
}

export interface PorterFare {
  baseFare: number;
  distanceFare: number;
  total: number;
}

export interface PorterCommission {
  /** What the driver owes DegreeWala for this job. */
  commission: number;
  /** What the driver is left with, having been paid the full fare in person. */
  driverKeeps: number;
  /** Snapshotted onto the job, so later rate changes can't rewrite old debts. */
  percent: number;
}

/**
 * Fallback tiers, used only if the database has none. The live rates live in
 * `porter_vehicle_types` and are edited by an admin — they have already changed
 * once since the pricing deck, so hardcoding them would guarantee a redeploy
 * the next time.
 */
export const DEFAULT_PORTER_VEHICLES: PorterVehicle[] = [
  { code: 'two_wheeler', name: 'Two-wheeler', baseFare: 99, perKm: 15 },
  { code: 'auto', name: 'Auto / 3-wheeler', baseFare: 199, perKm: 37 },
  { code: 'mini_tempo', name: 'Mini tempo', baseFare: 299, perKm: 45 },
];

export const DEFAULT_PORTER_COMMISSION_PERCENT = 10;

export const MAX_PORTER_RADIUS_KM = 15;

export function calculatePorterFare(vehicle: PorterVehicle, distanceKm: number): PorterFare {
  const billableKm = Math.max(0, distanceKm);
  const distanceFare = Math.round(billableKm * vehicle.perKm);
  return {
    baseFare: vehicle.baseFare,
    distanceFare,
    total: vehicle.baseFare + distanceFare,
  };
}

export function calculatePorterCommission(fare: number, percent: number): PorterCommission {
  const commission = Math.round((fare * percent) / 100);
  return {
    commission,
    driverKeeps: fare - commission,
    percent,
  };
}
