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
import { TrackingMap } from '../components/ui/TrackingMap';
import { Thumb } from '../components/ui/Thumb';
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
  // Location is a condition of working, not a preference — a customer watching
  // a stationary pin has no way to know the agent simply switched it off.
  // 'unknown' until the browser answers.
  // 'searching' matters as much as the other three: an agent who allowed
  // location but whose GPS hasn't locked on yet has not refused anything, and
  // must not be stopped from working.
  const [geoPermission, setGeoPermission] = useState<
    'unknown' | 'granted' | 'searching' | 'denied'
  >('unknown');

  const [alertsOn, setAlertsOn] = useState(false);
  const [alertsBlocked, setAlertsBlocked] = useState(false);
  const [myPosition, setMyPosition] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
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

  // Ask the moment they sign in, not when they accept a job. Asking at accept
  // time meant an agent could take a delivery and only then refuse location,
  // leaving the customer with a job in progress and no tracking.
  // A browser with no geolocation at all is treated the same as a refusal:
  // either way the customer gets no tracking.
  const locationState = canShare ? geoPermission : 'denied';

  useEffect(() => {
    if (!canShare) return;
    navigator.geolocation.getCurrentPosition(
      () => setGeoPermission('granted'),
      (err) => {
        // Only an actual refusal blocks work. A timeout or an unavailable fix
        // means they said yes and the phone hasn't got a position yet —
        // standing inside a shop is enough to cause it. The watch below keeps
        // trying and flips this to 'granted' the moment a fix arrives.
        setGeoPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'searching');
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  }, [canShare]);

  useEffect(() => {
    if (!canShare || activeCount === 0) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeoPermission('granted');
        setMyPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const now = Date.now();
        if (now - lastSentRef.current < 15000) return;
        lastSentRef.current = now;
        updateAgentLocation(
          activeIdsRef.current,
          position.coords.latitude,
          position.coords.longitude
        ).catch(() => {});
      },
      (err) =>
        setGeoPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'searching'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [canShare, activeCount]);

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

      {locationState === 'denied' && (
        <div className="agent-blocker">
          <strong>📍 Turn on location to take deliveries</strong>
          <p>
            Customers watch your position on a map while they wait, so location has to stay on for
            the whole delivery. Allow location for this site in your browser settings, then reload
            this page.
          </p>
          <p className="agent-blocker__hint">
            On a phone, keep this page open while delivering — the browser stops sending your
            position when you switch away. The DegreeWala app keeps sending in the background.
          </p>
        </div>
      )}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>My Deliveries{myOrders && myOrders.length > 0 ? ` (${myOrders.length})` : ''}</h2>
          {activeCount > 0 && locationState === 'granted' && (
            <span className="agent-sharing">📍 Sharing live location</span>
          )}
        </div>
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
              myPosition={myPosition}
              showRoute
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

        {locationState === 'denied' && (
          <p className="admin-empty">Accepting is disabled until location is on.</p>
        )}
        {locationState === 'searching' && (
          <p className="admin-empty">
            Finding your location… you can still accept orders. If you're indoors, step outside for
            a moment so customers can see you move.
          </p>
        )}

        {openOrders && openOrders.length === 0 && <p className="admin-empty">No unclaimed orders right now.</p>}
        <div className="agent-orders">
          {openOrders?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              action={{
                label: 'Accept',
                onClick: () => onClaim(order),
                // A delivery accepted without location is one the customer
                // cannot follow, so the button is genuinely unavailable.
                disabled: locationState === 'denied',
              }}
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
  myPosition,
  showRoute,
}: {
  order: OrderRow;
  action: { label: string; onClick: () => void; disabled?: boolean };
  /** Where the agent is, so the map can show them against the customer. */
  myPosition?: { latitude: number; longitude: number } | null;
  /** Only their own deliveries get a map and the call/navigate buttons — the
   *  open pool would render a map per order for jobs they haven't taken. */
  showRoute?: boolean;
  busy: boolean;
}) {
  const pickup =
    order.pickup_latitude != null && order.pickup_longitude != null
      ? { latitude: order.pickup_latitude, longitude: order.pickup_longitude }
      : null;
  const delivery =
    order.delivery_latitude != null && order.delivery_longitude != null
      ? { latitude: order.delivery_latitude, longitude: order.delivery_longitude }
      : null;

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
            {/* A picture is how an agent finds the right packet on a crowded
                shelf — the name alone is slower and easier to get wrong. */}
            <span className="agent-order__thumb">
              <Thumb src={item.image_url ?? undefined} emoji="🛒" tint="#F4F6F9" alt={item.name} />
            </span>
            <span>
              {item.quantity} × {item.name}
              {item.unit ? ` (${item.unit})` : ''}
            </span>
          </li>
        ))}
      </ul>
      {showRoute && delivery && (
        <>
          <TrackingMap pickup={pickup} delivery={delivery} agent={myPosition ?? null} />
          <ul className="agent-order__legend">
            <li><span className="agent-key agent-key--pickup" /> Shop</li>
            <li><span className="agent-key agent-key--delivery" /> Customer</li>
            {myPosition && <li><span className="agent-key agent-key--me" /> You</li>}
          </ul>
        </>
      )}

      <div className="agent-order__row">
        <span>💰 You earn {formatRupees(order.agent_payout)}</span>
      </div>

      {showRoute && (
        <div className="agent-order__tools">
          <a className="admin-btn admin-btn--sm" href={`tel:${order.customer_phone}`}>
            📞 Call customer
          </a>
          {delivery && (
            <a
              className="admin-btn admin-btn--sm"
              href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.latitude},${delivery.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              🧭 Navigate
            </a>
          )}
        </div>
      )}

      {showRoute && (
        // Opening Maps backgrounds this tab, and browsers suspend location for
        // a background tab — so the customer's map freezes the moment an agent
        // navigates. Nothing can fix that on the web; say so rather than let it
        // fail silently.
        <p className="agent-order__warn">
          ⚠️ Using Navigate here pauses live tracking — this browser stops sending your position
          once you switch away. Use the DegreeWala app to keep the customer updated while you
          drive.
        </p>
      )}
      <button
        className="admin-btn admin-btn--primary"
        onClick={action.onClick}
        disabled={busy || action.disabled}
      >
        {busy ? '…' : action.label}
      </button>
    </div>
  );
}
