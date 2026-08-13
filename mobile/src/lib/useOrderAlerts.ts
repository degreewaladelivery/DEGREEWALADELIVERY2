import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomer } from './auth';
import { fetchMyOrders } from './tracking';
import { findStatusChanges, type OrderStatusChange } from '@shared/orderAlerts';

const SEEN_KEY = 'dw_order_status_seen';

async function readSeen(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeSeen(seen: Record<string, string>) {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    return;
  }
}

export function useOrderAlerts() {
  const [alerts, setAlerts] = useState<OrderStatusChange[]>([]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const customer = await getCustomer();
      if (!customer || cancelled) return;

      try {
        const orders = await fetchMyOrders(customer.token);
        if (cancelled) return;
        const { changes, nextSeen } = findStatusChanges(orders, await readSeen());
        await writeSeen(nextSeen);
        if (!cancelled && changes.length > 0) setAlerts(changes);
      } catch {
        return;
      }
    };

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const dismiss = (orderId: string) =>
    setAlerts((current) => current.filter((alert) => alert.orderId !== orderId));

  return { alerts, dismiss };
}
