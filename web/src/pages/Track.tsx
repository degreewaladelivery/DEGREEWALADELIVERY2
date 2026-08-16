import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from '../lib/tracking';
import { formatRupees } from '../lib/format';
import { TrackingMap } from '../components/ui/TrackingMap';
import { haversineDistanceKm } from '@shared/deliveryFare';
import { isActiveOrder, isAgentLocationFresh, orderStatusLabel } from '@shared/agentOrders';
import './Track.css';

const STEPS = [
  { key: 'placed', label: 'Order placed' },
  { key: 'claimed', label: 'Agent assigned' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'delivered', label: 'Delivered' },
];

const STEP_INDEX: Record<string, number> = {
  placed: 0,
  claimed: 1,
  picked_up: 2,
  delivered: 3,
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

export function Track() {
  const navigate = useNavigate();
  const [customer] = useState(() => getCustomer());
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) navigate('/login?next=/track', { replace: true });
  }, [customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;

    const load = () => {
      fetchMyOrders(customer.token)
        .then((rows) => {
          if (!cancelled) {
            setOrders(rows);
            setError(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof SignedOutError) {
            logoutCustomer().finally(() => navigate('/login?next=/track', { replace: true }));
            return;
          }
          setError(err instanceof Error ? err.message : 'Could not load orders');
        });
    };

    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [customer, navigate]);

  // Every in-flight order gets its own card. Showing only the first one hid the
  // others, and they then appeared under "Past Orders" — a live delivery
  // labelled as finished.
  const active = (orders ?? []).filter(isActiveOrder);
  const past = (orders ?? []).filter((o) => !isActiveOrder(o));

  if (!customer) return null;

  if (error && !orders) {
    return (
      <div className="container otrack">
        <h1 className="otrack__heading">Track Your Order</h1>
        <p className="otrack__error">{error}</p>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="container otrack">
        <h1 className="otrack__heading">Track Your Order</h1>
        <p className="otrack__muted">Loading your orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container otrack">
        <h1 className="otrack__heading">Track Your Order</h1>
        <p className="otrack__muted">You haven't placed any orders yet.</p>
        <Link to="/" className="btn btn-primary btn-lg">Browse shops</Link>
      </div>
    );
  }

  return (
    <div className="container otrack">
      <h1 className="otrack__heading">Track Your Order</h1>

      {active.length === 0 && <p className="otrack__muted">No active orders right now.</p>}
      {active.map((order) => (
        <ActiveOrderCard key={order.id} order={order} />
      ))}

      {past.length > 0 && (
        <>
          <h2 className="otrack__subheading">Past Orders</h2>
          <div className="otrack__list">
            {past.map((order) => (
              <div key={order.id} className="otrack__past">
                <div>
                  <strong>{order.pickup_label}</strong>
                  <p className="otrack__muted">
                    {new Date(order.created_at).toLocaleDateString('en-IN')} ·{' '}
                    {order.items.length} item{order.items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="otrack__pastright">
                  <strong>{formatRupees(order.total)}</strong>
                  <span className={'otrack__tag' + (order.status === 'cancelled' ? ' is-bad' : '')}>
                    {orderStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveOrderCard({ order }: { order: TrackedOrder }) {
  const pickup =
    order.pickup_latitude != null && order.pickup_longitude != null
      ? { latitude: order.pickup_latitude, longitude: order.pickup_longitude }
      : null;
  const delivery =
    order.delivery_latitude != null && order.delivery_longitude != null
      ? { latitude: order.delivery_latitude, longitude: order.delivery_longitude }
      : null;

  // An old position is worse than none: it shows the agent parked somewhere
  // they left long ago, and the customer believes it.
  const locationFresh = isAgentLocationFresh(order.agent_location_at);
  const agent =
    locationFresh && order.agent_latitude != null && order.agent_longitude != null
      ? { latitude: order.agent_latitude, longitude: order.agent_longitude }
      : null;

  const agentDistanceKm =
    agent && delivery
      ? haversineDistanceKm(agent.latitude, agent.longitude, delivery.latitude, delivery.longitude)
      : null;

  return (
    <div className="otrack__card">
      <div className="otrack__row">
        <div>
          <strong className="otrack__pickup">📦 {order.pickup_label}</strong>
          <p className="otrack__muted">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <strong>{formatRupees(order.total)}</strong>
      </div>

      <ol className="otrack__steps">
        {STEPS.map((step, index) => {
          const reached = index <= (STEP_INDEX[order.status] ?? 0);
          return (
            <li key={step.key} className={'otrack__step' + (reached ? ' is-done' : '')}>
              <span className="otrack__dot" />
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>

      <TrackingMap pickup={pickup} delivery={delivery} agent={agent} />

      <ul className="otrack__legend">
        <li><span className="otrack__key otrack__key--pickup" /> Shop</li>
        <li><span className="otrack__key otrack__key--delivery" /> Your address</li>
        {agent && <li><span className="otrack__key otrack__key--agent" /> Your agent</li>}
      </ul>

      {order.agent ? (
        <div className="otrack__agent">
          <div>
            <strong>{order.agent.name}</strong>
            <p className="otrack__muted">
              {agentDistanceKm != null
                ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(order.agent_location_at)}`
                : 'Live location unavailable right now'}
            </p>
          </div>
          <a href={`tel:${order.agent.phone}`} className="btn btn-light">
            📞 Call
          </a>
        </div>
      ) : (
        <p className="otrack__muted">Waiting for a delivery agent to accept your order.</p>
      )}

      <p className="otrack__muted">📍 Delivering to {order.delivery_address}</p>
    </div>
  );
}
