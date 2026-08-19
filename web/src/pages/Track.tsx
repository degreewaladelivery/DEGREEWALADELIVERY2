import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from '../lib/tracking';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/ui/Thumb';
import { TrackingMap } from '../components/ui/TrackingMap';
import { haversineDistanceKm } from '@shared/deliveryFare';
import { isActiveOrder, isAgentLocationFresh, orderStatusLabel } from '@shared/agentOrders';
import { customerPushSupported, enableOrderUpdates, orderUpdatesEnabled } from '../lib/customerPush';
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
  const [updatesOn, setUpdatesOn] = useState(false);
  const [updatesFailed, setUpdatesFailed] = useState(false);

  useEffect(() => {
    if (!customer) navigate('/login?next=/track', { replace: true });
  }, [customer, navigate]);

  // Don't nag someone who already turned updates on.
  useEffect(() => {
    orderUpdatesEnabled().then((on) => {
      if (on) setUpdatesOn(true);
    });
  }, []);

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

      {customerPushSupported() && !updatesOn && active.length > 0 && (
        <div className="otrack__updates">
          <div>
            <strong>Get told when your order arrives</strong>
            <p>
              We'll notify you when an agent picks it up and when it reaches you — even with this
              page closed.
            </p>
            {updatesFailed && (
              <p className="otrack__updates-error">
                Notifications are blocked for this site. Allow them in your browser settings to
                turn this on.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const ok = await enableOrderUpdates(customer.token);
              setUpdatesOn(ok);
              setUpdatesFailed(!ok);
            }}
          >
            Turn on
          </button>
        </div>
      )}

      {active.length === 0 && <p className="otrack__muted">No active orders right now.</p>}
      {active.map((order) => (
        <ActiveOrderCard key={order.id} order={order} />
      ))}

      {past.length > 0 && (
        <>
          <h2 className="otrack__subheading">Past Orders</h2>
          <div className="otrack__list">
            {past.map((order) => (
              <PastOrderRow key={order.id} order={order} />
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

  // A stale position still gets drawn, but never dressed up as live — a waiting
  // customer is better served by "here 12 minutes ago" than by a blank map.
  const locationFresh = isAgentLocationFresh(order.agent_location_at);
  const agent =
    order.agent_latitude != null && order.agent_longitude != null
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

      {order.stalled_at && (
        <p className="otrack__stalled">
          This order hasn't moved in a while and we're looking into it. Please call us if you'd
          rather cancel or reorder — you won't be charged for a delivery that never arrives.
        </p>
      )}

      <TrackingMap pickup={pickup} delivery={delivery} agent={agent} />

      <ul className="otrack__legend">
        <li><span className="otrack__key otrack__key--pickup" /> Shop</li>
        <li><span className="otrack__key otrack__key--delivery" /> Your address</li>
        {agent && (
          <li>
            <span className="otrack__key otrack__key--agent" />{' '}
            {locationFresh ? 'Your agent' : 'Agent — last known'}
          </li>
        )}
      </ul>

      {order.agent ? (
        <div className="otrack__agent">
          <div>
            <strong>{order.agent.name}</strong>
            <p className="otrack__muted">
              {agentDistanceKm == null
                ? 'Location not shared yet'
                : locationFresh
                  ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(order.agent_location_at)}`
                  : `Last seen ${agentDistanceKm.toFixed(1)} km away, ${timeAgo(order.agent_location_at)}`}
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

/**
 * A past order opens to show what was actually in it.
 *
 * The summary row alone ("3 items") tells a customer nothing about what they
 * bought — the first thing anyone wants from order history.
 */
function PastOrderRow({ order }: { order: TrackedOrder }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={'otrack__past-wrap' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="otrack__past otrack__past--button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div>
          <strong>{order.pickup_label}</strong>
          <p className="otrack__muted">
            {new Date(order.created_at).toLocaleDateString('en-IN')} · {order.items.length} item
            {order.items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="otrack__pastright">
          <strong>{formatRupees(order.total)}</strong>
          <span className={'otrack__tag' + (order.status === 'cancelled' ? ' is-bad' : '')}>
            {orderStatusLabel(order.status)}
          </span>
          {order.cancel_reason && <span className="otrack__reason">{order.cancel_reason}</span>}
        </div>
        <span className="otrack__chev" aria-hidden="true">{open ? '\u2303' : '\u2304'}</span>
      </button>

      {open && (
        <div className="otrack__detail">
          {order.items.map((item) => (
            <div key={item.id} className="otrack__detail-item">
              <span className="otrack__detail-thumb">
                <Thumb src={item.image_url ?? undefined} emoji="🛒" tint="#F4F6F9" alt={item.name} width={120} />
              </span>
              <span className="otrack__detail-name">
                {item.name}
                {item.unit ? <small> ({item.unit})</small> : null}
              </span>
              <span className="otrack__detail-qty">x{item.quantity}</span>
              <span className="otrack__detail-price">{formatRupees(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className="otrack__detail-bill">
            <div><span>Items</span><span>{formatRupees(order.subtotal)}</span></div>
            <div><span>Delivery</span><span>{formatRupees(order.delivery_fee)}</span></div>
            <div><span>Taxes</span><span>{formatRupees(order.taxes)}</span></div>
            <div className="is-total"><span>Total</span><span>{formatRupees(order.total)}</span></div>
          </div>

          <p className="otrack__muted">📍 {order.delivery_address}</p>
        </div>
      )}
    </div>
  );
}
