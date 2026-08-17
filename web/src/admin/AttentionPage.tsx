import { useCallback, useEffect, useState } from 'react';
import {
  cancelOrder,
  listOrdersNeedingAttention,
  markOrderDelivered,
  returnOrderToPool,
  type AttentionOrder,
} from './api';

/**
 * Orders the system deliberately refused to close on its own.
 *
 * An order that was picked up and never delivered can't be auto-cancelled —
 * an agent is holding the goods and only a person knows whether it arrived,
 * got lost, or needs refunding. Without this screen that flag went nowhere,
 * which just turned one kind of permanent wait into another.
 */
export function AttentionPage() {
  const [orders, setOrders] = useState<AttentionOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    listOrdersNeedingAttention()
      .then((rows) => {
        setOrders(rows);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load orders'));
  }, []);

  useEffect(load, [load]);

  const act = async (orderId: string, run: () => Promise<void>) => {
    setBusyId(orderId);
    setError(null);
    try {
      await run();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order');
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = (order: AttentionOrder) => {
    const reason = prompt(
      'Why is this order being cancelled? The customer will see this.',
      'The delivery could not be completed'
    );
    if (!reason) return;
    act(order.id, () => cancelOrder(order.id, reason.trim()));
  };

  return (
    <div>
      <div className="admin-page__head">
        <h1>Needs Attention</h1>
        <button className="admin-btn" onClick={load}>Refresh</button>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      {orders && orders.length === 0 && (
        <p className="admin-empty">
          Nothing stuck. Orders nobody accepts are cancelled automatically; only ones already
          picked up land here.
        </p>
      )}

      {orders && orders.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Agent</th>
              <th>Problem</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td data-label="Order">
                  <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  <br />
                  <small>
                    {order.pickup_label} → {order.delivery_address}
                  </small>
                  <br />
                  <small>📞 {order.customer_phone}</small>
                </td>
                <td data-label="Agent">
                  {order.agent ? (
                    <>
                      {order.agent.name}
                      <br />
                      <small>📞 {order.agent.phone}</small>
                    </>
                  ) : (
                    <small>Unassigned</small>
                  )}
                </td>
                <td data-label="Problem">
                  {order.status === 'picked_up'
                    ? 'Picked up, never delivered'
                    : `Returned to the pool ${order.release_count} times`}
                  <br />
                  <small>Flagged {order.stalled_at ? timeAgo(order.stalled_at) : ''}</small>
                </td>
                <td className="admin-table__actions">
                  <button
                    className="admin-btn admin-btn--sm admin-btn--primary"
                    disabled={busyId === order.id}
                    onClick={() => act(order.id, () => markOrderDelivered(order.id))}
                  >
                    It arrived
                  </button>
                  <button
                    className="admin-btn admin-btn--sm"
                    disabled={busyId === order.id}
                    onClick={() => act(order.id, () => returnOrderToPool(order.id))}
                  >
                    Back to pool
                  </button>
                  <button
                    className="admin-btn admin-btn--sm admin-btn--ghost"
                    disabled={busyId === order.id}
                    onClick={() => onCancel(order)}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}
