export type AlertableStatus = 'placed' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';

export interface OrderStatusChange {
  orderId: string;
  status: AlertableStatus;
  title: string;
  body: string;
}

const MESSAGES: Record<AlertableStatus, { title: string; body: string } | null> = {
  placed: null,
  claimed: {
    title: 'A delivery agent accepted your order',
    body: 'They are on their way to collect it.',
  },
  picked_up: {
    title: 'Your order is on the way',
    body: 'The agent has picked it up and is heading to you.',
  },
  delivered: {
    title: 'Your order has been delivered',
    body: 'Thanks for ordering with DegreeWala.',
  },
  cancelled: {
    title: 'Your order was cancelled',
    body: 'Please call us if you did not expect this.',
  },
};

export function describeStatusChange(
  orderId: string,
  status: AlertableStatus
): OrderStatusChange | null {
  const message = MESSAGES[status];
  if (!message) return null;
  return { orderId, status, ...message };
}

export function findStatusChanges(
  orders: { id: string; status: string }[],
  seen: Record<string, string>
): { changes: OrderStatusChange[]; nextSeen: Record<string, string> } {
  const nextSeen: Record<string, string> = { ...seen };
  const changes: OrderStatusChange[] = [];

  for (const order of orders) {
    const previous = seen[order.id];
    nextSeen[order.id] = order.status;

    if (previous === undefined || previous === order.status) continue;

    const change = describeStatusChange(order.id, order.status as AlertableStatus);
    if (change) changes.push(change);
  }

  return { changes, nextSeen };
}
