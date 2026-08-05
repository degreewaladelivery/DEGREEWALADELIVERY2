import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from '../lib/tracking';
import { formatRupees } from '../lib/format';
import { TrackingMap } from '../components/ui/TrackingMap';
import { haversineDistanceKm } from '@shared/deliveryFare';
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

  const active = orders?.find((o) => o.status !== 'delivered' && o.status !== 'cancelled') ?? null;
  const past = (orders ?? []).filter((o) => o.id !== active?.id);

  const pickupLat = active?.pickup_latitude ?? null;
  const pickupLng = active?.pickup_longitude ?? null;
  const deliveryLat = active?.delivery_latitude ?? null;
  const deliveryLng = active?.delivery_longitude ?? null;
  const agentLat = active?.agent_latitude ?? null;
  const agentLng = active?.agent_longitude ?? null;

  const pickupPoint =
    pickupLat != null && pickupLng != null ? { latitude: pickupLat, longitude: pickupLng } : null;
  const deliveryPoint =
    deliveryLat != null && deliveryLng != null
      ? { latitude: deliveryLat, longitude: deliveryLng }
      : null;
  const agentPoint =
    agentLat != null && agentLng != null ? { latitude: agentLat, longitude: agentLng } : null;

  const agentDistanceKm =
    agentPoint && deliveryPoint
      ? haversineDistanceKm(
          agentPoint.latitude,
          agentPoint.longitude,
          deliveryPoint.latitude,
          deliveryPoint.longitude
        )
      : null;

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

      {active ? (
        <div className="otrack__card">
          <div className="otrack__row">
            <div>
              <strong className="otrack__pickup">📦 {active.pickup_label}</strong>
              <p className="otrack__muted">Order #{active.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <strong>{formatRupees(active.total)}</strong>
          </div>

          <ol className="otrack__steps">
            {STEPS.map((step, index) => {
              const reached = index <= (STEP_INDEX[active.status] ?? 0);
              return (
                <li
                  key={step.key}
                  className={'otrack__step' + (reached ? ' is-done' : '')}
                >
                  <span className="otrack__dot" />
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>

          <TrackingMap pickup={pickupPoint} delivery={deliveryPoint} agent={agentPoint} />

          {active.agent ? (
            <div className="otrack__agent">
              <div>
                <strong>{active.agent.name}</strong>
                <p className="otrack__muted">
                  {agentDistanceKm != null
                    ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(active.agent_location_at)}`
                    : 'Location not shared yet'}
                </p>
              </div>
              <a href={`tel:${active.agent.phone}`} className="btn btn-light">
                📞 Call
              </a>
            </div>
          ) : (
            <p className="otrack__muted">Waiting for a delivery agent to accept your order.</p>
          )}

          <p className="otrack__muted">📍 Delivering to {active.delivery_address}</p>
        </div>
      ) : (
        <p className="otrack__muted">No active orders right now.</p>
      )}

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
                    {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
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
