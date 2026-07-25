import { useCallback, useEffect, useState } from 'react';
import { useAgentAuth } from './AgentAuthContext';
import { claimOrder, getMyProfile, listMyDeliveries, listOpenOrders, markDelivered, markPickedUp } from './api';
import type { AgentProfile, OrderRow } from './types';
import { formatRupees } from '../lib/format';
import './agent.css';

export function AgentOrdersPage() {
  const { session } = useAgentAuth();
  const agentId = session?.user.id ?? null;

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [openOrders, setOpenOrders] = useState<OrderRow[] | null>(null);
  const [myOrders, setMyOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!agentId) return;
    Promise.all([listOpenOrders(), listMyDeliveries(agentId)])
      .then(([open, mine]) => {
        setOpenOrders(open);
        setMyOrders(mine);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'));
  }, [agentId]);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const onClaim = async (order: OrderRow) => {
    if (!agentId) return;
    setBusyId(order.id);
    setError(null);
    try {
      const claimed = await claimOrder(order.id, agentId);
      if (!claimed) setError('Someone else already claimed that order.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim order');
    } finally {
      setBusyId(null);
    }
  };

  const onPickedUp = async (order: OrderRow) => {
    setBusyId(order.id);
    setError(null);
    try {
      await markPickedUp(order.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order');
    } finally {
      setBusyId(null);
    }
  };

  const onDelivered = async (order: OrderRow) => {
    setBusyId(order.id);
    setError(null);
    try {
      await markDelivered(order.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <h1>{profile ? `Hi, ${profile.name}` : 'Deliveries'}</h1>
      </div>

      {error && <p className="admin-login__error">{error}</p>}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>My Deliveries{myOrders && myOrders.length > 0 ? ` (${myOrders.length})` : ''}</h2>
        </div>
        {myOrders && myOrders.length === 0 && (
          <p className="admin-empty">No active deliveries — claim one below.</p>
        )}
        <div className="agent-orders">
          {myOrders?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              action={
                order.status === 'claimed'
                  ? { label: 'Mark picked up', onClick: () => onPickedUp(order) }
                  : { label: 'Mark delivered', onClick: () => onDelivered(order) }
              }
            />
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Available Orders{openOrders && openOrders.length > 0 ? ` (${openOrders.length})` : ''}</h2>
        </div>
        {openOrders && openOrders.length === 0 && <p className="admin-empty">No unclaimed orders right now.</p>}
        <div className="agent-orders">
          {openOrders?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              action={{ label: 'Accept', onClick: () => onClaim(order) }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function OrderCard({
  order,
  action,
  busy,
}: {
  order: OrderRow;
  action: { label: string; onClick: () => void };
  busy: boolean;
}) {
  return (
    <div className="agent-order">
      <div className="agent-order__row">
        <strong>📦 {order.pickup_label}</strong>
        <span className="admin-tag admin-tag--muted">{order.status.replace('_', ' ')}</span>
      </div>
      <p className="agent-order__address">📍 {order.delivery_address}</p>
      {order.distance_km != null && (
        <p className="agent-order__meta">
          {order.distance_km.toFixed(1)} km · {order.items.length} item{order.items.length === 1 ? '' : 's'}
        </p>
      )}
      <ul className="agent-order__items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.name}
            {item.unit ? ` (${item.unit})` : ''}
          </li>
        ))}
      </ul>
      <div className="agent-order__row">
        <span>📞 {order.customer_phone}</span>
        <strong>You earn {formatRupees(order.agent_payout)}</strong>
      </div>
      <button className="admin-btn admin-btn--primary" onClick={action.onClick} disabled={busy}>
        {busy ? '…' : action.label}
      </button>
    </div>
  );
}
