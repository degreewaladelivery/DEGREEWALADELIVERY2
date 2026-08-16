import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentAuth } from './AgentAuthContext';
import {
  claimOrder,
  getMyProfile,
  listMyDeliveries,
  listOpenOrders,
  markDelivered,
  markPickedUp,
  subscribeToPool,
  announceClaim,
  updateAgentLocation,
} from './api';
import type { AgentProfile, OrderRow } from './types';
import {
  alertsSupported,
  enableAlerts,
  findNewOrders,
  playChime,
  showNewOrderNotification,
} from './newOrderAlert';
import { hasPushSubscription, pushSupported, subscribeToPush } from './pushSubscribe';
import { formatRupees } from '../lib/format';
import './agent.css';

/** How often to re-check the pool. Short enough that a waiting customer isn't
 *  left hanging, long enough not to hammer the database all shift. */
const POLL_MS = 15000;

/**
 * Sound the alert for orders that weren't in the pool last time we looked.
 *
 * Orders leaving the pool (claimed by someone else) are dropped from the seen
 * set, so if one is released back it counts as new again.
 */
function announceNewOrders(
  open: OrderRow[],
  seenRef: { current: Set<string> | null },
  alertsOnRef: { current: boolean }
): void {
  const previous = seenRef.current;
  seenRef.current = new Set(open.map((order) => order.id));

  if (!alertsOnRef.current) return;

  const fresh = findNewOrders(open, previous);
  if (fresh.length === 0) return;

  playChime();
  showNewOrderNotification(fresh.length, fresh[0].total);
}

export function AgentOrdersPage() {
  const { session } = useAgentAuth();
  const agentId = session?.user.id ?? null;

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [openOrders, setOpenOrders] = useState<OrderRow[] | null>(null);
  const [myOrders, setMyOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  const [alertsOn, setAlertsOn] = useState(false);
  const [alertsBlocked, setAlertsBlocked] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const activeIdsRef = useRef<string[]>([]);
  const lastSentRef = useRef(0);
  // null until the first load lands — otherwise every order already in the pool
  // would alert as "new" the moment the agent signs in.
  const seenOpenIdsRef = useRef<Set<string> | null>(null);
  const alertsOnRef = useRef(false);
  const activeCount = myOrders?.length ?? 0;

  const canShare = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    activeIdsRef.current = (myOrders ?? []).map((order) => order.id);
  }, [myOrders]);

  useEffect(() => {
    if (!sharing || !canShare || activeCount === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < 15000) return;
        lastSentRef.current = now;
        updateAgentLocation(
          activeIdsRef.current,
          position.coords.latitude,
          position.coords.longitude
        ).catch(() => {});
      },
      () => setLocationDenied(true),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, canShare, activeCount]);

  const load = useCallback(() => {
    if (!agentId) return;
    Promise.all([listOpenOrders(), listMyDeliveries(agentId)])
      .then(([open, mine]) => {
        announceNewOrders(open, seenOpenIdsRef, alertsOnRef);
        setOpenOrders(open);
        setMyOrders(mine);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'));
  }, [agentId]);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  // An agent who already turned alerts on shouldn't be told they're off every
  // time they reopen the dashboard.
  useEffect(() => {
    hasPushSubscription().then((subscribed) => {
      if (!subscribed) return;
      setPushOn(true);
      setAlertsOn(true);
      alertsOnRef.current = true;
    });
  }, []);

  useEffect(load, [load]);

  // Keep the pool current without the agent reloading the page. Also refresh
  // the moment they come back to the tab, so what they see on return is real
  // rather than however old the last poll was.
  useEffect(() => {
    if (!agentId) return;

    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [agentId, load]);

  const onEnableAlerts = async () => {
    const permission = await enableAlerts();
    setAlertsOn(true);
    alertsOnRef.current = true;
    setAlertsBlocked(permission === 'denied');
    playChime(); // confirms out loud that sound actually works on this device

    // Also register for background push, so orders still reach them once this
    // tab is closed or the phone is locked.
    if (agentId && pushSupported()) {
      const result = await subscribeToPush(agentId);
      setPushOn(result.ok);
      if (!result.ok) setPushError(result.reason);
    }
  };

  // Real-time pool updates, so a job taken by someone else disappears here
  // straight away rather than lingering until the next poll.
  useEffect(() => {
    if (!agentId) return;
    return subscribeToPool({
      onNewOrder: load,
      onOrderClaimed: (orderId) =>
        setOpenOrders((current) => current?.filter((o) => o.id !== orderId) ?? current),
    });
  }, [agentId, load]);

  const onClaim = async (order: OrderRow) => {
    if (!agentId) return;
    setBusyId(order.id);
    setError(null);
    try {
      const claimed = await claimOrder(order.id, agentId);
      if (claimed) {
        // Off this screen immediately, and tell the other agents so it vanishes
        // from theirs too rather than waiting for their next poll.
        setOpenOrders((current) => current?.filter((o) => o.id !== order.id) ?? current);
        announceClaim(order.id);
      } else {
        setError('Someone else already claimed that order.');
      }
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
          {activeCount > 0 && canShare && (
            <button className="admin-btn admin-btn--sm" onClick={() => setSharing((on) => !on)}>
              {sharing ? '📍 Sharing live location' : 'Location sharing off'}
            </button>
          )}
        </div>

        {activeCount > 0 && sharing && locationDenied && (
          <p className="admin-login__error">
            Location access is blocked, so customers can't see where you are. Allow location for
            this site in your browser settings.
          </p>
        )}
        {activeCount > 0 && !canShare && (
          <p className="admin-empty">
            This browser can't share location, so customers won't see live tracking.
          </p>
        )}
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
          {alertsSupported() && (
            <button
              className="admin-btn admin-btn--sm"
              onClick={onEnableAlerts}
              disabled={alertsOn}
            >
              {alertsOn ? (pushOn ? '🔔 Alerts on' : '🔔 Alerts on (this page only)') : '🔕 Turn on new order alerts'}
            </button>
          )}
        </div>

        {!alertsOn && (
          <p className="admin-empty">
            Turn on alerts to get a notification the moment an order comes in — even with this
            page closed and your phone in your pocket.
          </p>
        )}
        {alertsOn && alertsBlocked && (
          <p className="admin-login__error">
            Notifications are blocked for this site, so nothing will reach you unless this page
            is open. Allow notifications in your browser settings to fix that.
          </p>
        )}
        {alertsOn && !alertsBlocked && !pushOn && (
          <p className="admin-empty">
            {pushError === 'unsupported'
              ? "This browser can't deliver background alerts — keep this page open to hear the chime."
              : "Background alerts couldn't be set up, so keep this page open to hear the chime."}
          </p>
        )}
        {alertsOn && pushOn && (
          <p className="admin-empty">
            You'll be notified even with this page closed. Keep notifications allowed for this
            site.
          </p>
        )}

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
