import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
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
} from '../agent/api';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { signOutAgent } from '../agent/supabaseAgent';
import { registerDeviceForPush, unregisterDeviceForPush } from '../agent/devicePush';
import {
  requestLocationPermission,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../agent/backgroundTracking';
import type { AgentProfile, OrderRow } from '@shared/agentOrders';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/Thumb';
import { TrackingMap } from '../components/TrackingMap';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

/** How often to re-check the pool while the app is open. */
const POLL_MS = 15000;
/** Don't write a location fix more often than this — it's a database write per
 *  active order, and a rider in traffic emits fixes constantly. */
const LOCATION_MIN_GAP_MS = 15000;

export function AgentOrdersScreen({ agentId, onSignedOut }: { agentId: string; onSignedOut: () => void }) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [openOrders, setOpenOrders] = useState<OrderRow[] | null>(null);
  const [myOrders, setMyOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Location is a condition of working, not a preference — a customer watching a
  // stationary pin can't tell the agent simply switched it off.
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [myPosition, setMyPosition] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const activeIdsRef = useRef<string[]>([]);
  const lastSentRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([listOpenOrders(), listMyDeliveries(agentId)]);
      setOpenOrders(open);
      setMyOrders(mine);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    }
  }, [agentId]);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => undefined);
  }, []);

  // Ask the moment they're signed in, not when they accept a job.
  useEffect(() => {
    requestLocationPermission().then(setLocationGranted);
  }, []);

  // Register this phone for push once they're signed in — asking for
  // notification permission here, rather than at first launch, means the agent
  // knows what they're being asked for.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    registerDeviceForPush(agentId).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else stop = unsubscribe;
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [agentId]);

  // Real-time pool updates, so a job taken by another agent disappears here
  // straight away rather than lingering until the next poll.
  useEffect(() => {
    return subscribeToPool({
      onNewOrder: load,
      onOrderClaimed: (orderId) =>
        setOpenOrders((current) => current?.filter((o) => o.id !== orderId) ?? current),
    });
  }, [load]);

  // A push arriving while the app is open shouldn't be a dead notification —
  // refresh so the new order is already on screen when they look.
  useEffect(() => {
    return onMessage(getMessaging(), () => {
      load();
    });
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the pool current, and refresh the moment the app comes back to the
  // foreground so a rider who pockets their phone doesn't return to stale jobs.
  useEffect(() => {
    const timer = setInterval(load, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [load]);

  useEffect(() => {
    activeIdsRef.current = (myOrders ?? []).map((order) => order.id);
  }, [myOrders]);

  const activeCount = myOrders?.length ?? 0;

  // Share location only while actually carrying something — watching GPS with
  // no active delivery would drain a rider's battery for nothing.
  //
  // Background tracking is switched on alongside it: an agent taps Navigate and
  // is in Maps seconds later, and without it the customer's map freezes there.
  useEffect(() => {
    if (activeCount === 0) {
      stopBackgroundTracking();
      return;
    }

    startBackgroundTracking();

    const watchId = Geolocation.watchPosition(
      (position) => {
        setMyPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const now = Date.now();
        if (now - lastSentRef.current < LOCATION_MIN_GAP_MS) return;
        lastSentRef.current = now;
        updateAgentLocation(
          activeIdsRef.current,
          position.coords.latitude,
          position.coords.longitude
        ).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: true, distanceFilter: 25 }
    );

    return () => {
      Geolocation.clearWatch(watchId);
      // Leaving the service running with nothing to deliver would keep a
      // notification on the agent's phone and keep their GPS awake.
      stopBackgroundTracking();
    };
  }, [activeCount]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onClaim = async (order: OrderRow) => {
    if (!locationGranted) {
      // Re-ask rather than only scolding — they may have tapped Deny by reflex.
      const granted = await requestLocationPermission();
      setLocationGranted(granted);
      if (!granted) {
        setError('Turn on location to accept deliveries — customers track you on a map.');
        return;
      }
    }
    setBusyId(order.id);
    try {
      const won = await claimOrder(order.id, agentId);
      if (won) {
        // Off this screen immediately, and tell the other agents so it vanishes
        // from theirs too rather than waiting for their next poll.
        setOpenOrders((current) => current?.filter((o) => o.id !== order.id) ?? current);
        announceClaim(order.id);
      } else {
        setError('Another agent accepted that order first.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the order');
    } finally {
      setBusyId(null);
    }
  };

  const onAdvance = async (order: OrderRow) => {
    setBusyId(order.id);
    try {
      if (order.status === 'claimed') await markPickedUp(order.id);
      else await markDelivered(order.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order');
    } finally {
      setBusyId(null);
    }
  };

  const onSignOut = () => {
    if (activeCount > 0) {
      Alert.alert(
        'You still have a delivery',
        'Signing out stops sharing your location with the customer. Sign out anyway?',
        [
          { text: 'Stay signed in', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: () =>
              stopBackgroundTracking()
                .then(() => unregisterDeviceForPush())
                .then(() => signOutAgent())
                .then(onSignedOut),
          },
        ]
      );
      return;
    }
    stopBackgroundTracking()
      .then(() => unregisterDeviceForPush())
      .then(() => signOutAgent())
      .then(onSignedOut);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.head}>
          <View style={styles.headCol}>
            <Text style={styles.hi}>{profile ? `Hi, ${profile.name}` : 'Deliveries'}</Text>
            {activeCount > 0 && (
              <Text style={styles.sharing}>📍 Sharing your location with the customer</Text>
            )}
          </View>
          <TouchableOpacity onPress={onSignOut} hitSlop={10}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {locationGranted === false && (
          <View style={styles.blocker}>
            <Text style={styles.blockerTitle}>📍 Turn on location to take deliveries</Text>
            <Text style={styles.blockerText}>
              Customers watch your position on a map while they wait, so location has to stay on
              for the whole delivery.
            </Text>
            <TouchableOpacity
              style={styles.blockerBtn}
              activeOpacity={0.9}
              onPress={() => requestLocationPermission().then(setLocationGranted)}
            >
              <Text style={styles.blockerBtnText}>Turn on location</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.section}>
          My Deliveries{activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
        {myOrders && myOrders.length === 0 && (
          <Text style={styles.empty}>No active deliveries — accept one below.</Text>
        )}
        {myOrders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            busy={busyId === order.id}
            actionLabel={order.status === 'claimed' ? 'Mark picked up' : 'Mark delivered'}
            onAction={() => onAdvance(order)}
            myPosition={myPosition}
            showContact
          />
        ))}

        <Text style={styles.section}>
          Available Orders{openOrders && openOrders.length > 0 ? ` (${openOrders.length})` : ''}
        </Text>
        {openOrders && openOrders.length === 0 && (
          <Text style={styles.empty}>No unclaimed orders right now. Pull down to refresh.</Text>
        )}
        {openOrders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            busy={busyId === order.id}
            actionLabel="Accept"
            onAction={() => onClaim(order)}
            disabled={locationGranted === false}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  actionLabel,
  onAction,
  busy,
  showContact,
  disabled,
  myPosition,
}: {
  order: OrderRow;
  actionLabel: string;
  onAction: () => void;
  busy: boolean;
  showContact?: boolean;
  disabled?: boolean;
  /** Where the agent is, so the map shows them against the customer. */
  myPosition?: { latitude: number; longitude: number } | null;
}) {
  const openMaps = () => {
    if (order.delivery_latitude == null || order.delivery_longitude == null) return;
    const query = `${order.delivery_latitude},${order.delivery_longitude}`;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`).catch(
      () => undefined
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.payout}>You earn {formatRupees(order.agent_payout)}</Text>
      </View>

      <Text style={styles.route}>
        {order.pickup_label} → {order.delivery_address}
      </Text>
      {order.distance_km != null && (
        <Text style={styles.meta}>
          {order.distance_km.toFixed(1)} km · {order.items.length} item
          {order.items.length === 1 ? '' : 's'} · {formatRupees(order.total)}{' '}
          {order.payment_method === 'cod' ? 'to collect' : 'paid'}
        </Text>
      )}

      {showContact && order.delivery_latitude != null && order.delivery_longitude != null && (
        <View style={styles.mapWrap}>
          <TrackingMap
            pickup={
              order.pickup_latitude != null && order.pickup_longitude != null
                ? { latitude: order.pickup_latitude, longitude: order.pickup_longitude }
                : null
            }
            delivery={{
              latitude: order.delivery_latitude,
              longitude: order.delivery_longitude,
            }}
            agent={myPosition ?? null}
          />
        </View>
      )}

      {/* A picture is how an agent finds the right packet on a crowded shelf. */}
      <View style={styles.items}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Thumb src={item.image_url ?? undefined} emoji="🛒" style={styles.itemThumb} fontSize={16} />
            <Text style={styles.itemText} numberOfLines={1}>
              {item.quantity} × {item.name}
              {item.unit ? ` (${item.unit})` : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {showContact && (
          <>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => Linking.openURL(`tel:${order.customer_phone}`).catch(() => undefined)}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={openMaps} activeOpacity={0.85}>
              <Text style={styles.ghostText}>Navigate</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, (busy || disabled) && styles.btnDisabled]}
          onPress={onAction}
          disabled={busy || disabled}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryText}>{busy ? 'Working…' : actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  content: { padding: spacing.lg, paddingBottom: 60 },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headCol: { flex: 1 },
  hi: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text },
  sharing: { fontSize: fontSizes.xs, color: colors.success, marginTop: 2 },
  signOut: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.textMuted },

  section: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heading,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { fontSize: fontSizes.sm, color: colors.textMuted },

  blocker: {
    backgroundColor: colors.dangerTint,
    borderWidth: 1,
    borderColor: '#F5C6C2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  blockerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.danger },
  blockerText: {
    fontSize: fontSizes.xs,
    color: colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  blockerBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  blockerBtnText: { color: '#fff', fontWeight: fontWeights.bold, fontSize: fontSizes.sm },

  error: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.md,
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.textMuted },
  payout: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.success },
  route: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  meta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 4 },

  mapWrap: { marginTop: spacing.sm },
  items: { marginTop: spacing.sm, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemThumb: { width: 32, height: 32, borderRadius: radius.sm },
  itemText: { flex: 1, fontSize: fontSizes.xs, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  ghostText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.sm },
});
