import { useEffect, useState } from 'react';
import { getCustomer } from './auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from './tracking';
import { isActiveOrder } from '@shared/agentOrders';

/**
 * The customer's in-flight orders, polled from anywhere in the app.
 *
 * Placing an order and then leaving the tracking screen used to be a dead
 * end: the only way back was retracing the exact navigation path you took to
 * place it, and once that stack got reset (see the Cart tab's own reset,
 * which deliberately avoids reopening a stale tracking page when you start a
 * new cart) there was no way back at all. This hook is what lets a small
 * persistent status bar exist on every screen — the thing Zomato and Swiggy
 * both do — so "where's my order" always has an answer within one tap.
 */
const POLL_MS = 20000;

export function useActiveOrders(): TrackedOrder[] {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const customer = await getCustomer();
      if (!customer) {
        if (!cancelled) setOrders([]);
        return;
      }
      try {
        const rows = await fetchMyOrders(customer.token);
        if (!cancelled) setOrders(rows.filter(isActiveOrder));
      } catch (err) {
        // A signed-out customer genuinely has no orders to show. Any other
        // failure is transient — keep showing whatever we last had rather
        // than flash the bar away on one bad request.
        if (!cancelled && err instanceof SignedOutError) setOrders([]);
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return orders;
}
