import { useEffect, useState } from 'react';
import { getCustomer } from './auth';
import { fetchMyOrders } from './tracking';
import { findStatusChanges, type OrderStatusChange } from '@shared/orderAlerts';

const SEEN_KEY = 'dw_order_status_seen';

function readSeen(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    return;
  }
}

export function useOrderAlerts() {
  const [alerts, setAlerts] = useState<OrderStatusChange[]>([]);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      const customer = getCustomer();
      if (!customer) return;

      fetchMyOrders(customer.token)
        .then((orders) => {
          if (cancelled) return;
          const { changes, nextSeen } = findStatusChanges(orders, readSeen());
          writeSeen(nextSeen);
          if (changes.length > 0) setAlerts(changes);
        })
        .catch(() => undefined);
    };

    check();
    window.addEventListener('focus', check);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', check);
    };
  }, []);

  const dismiss = (orderId: string) =>
    setAlerts((current) => current.filter((alert) => alert.orderId !== orderId));

  return { alerts, dismiss };
}
