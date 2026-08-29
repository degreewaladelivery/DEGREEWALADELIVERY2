import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
  AppState,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useTabBarSpace } from '../lib/tabBarSpace';
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
  verifyDeliveryOtp,
  reportFailedDelivery,
  setAgentOnline,
  getEarnings,
  getTodayMinutes,
  listDeliveryHistory,
} from '../agent/api';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { signOutAgent } from '../agent/supabaseAgent';
import { registerDeviceForPush, unregisterDeviceForPush } from '../agent/devicePush';
import {
  requestLocationPermission,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../agent/backgroundTracking';
import type { AgentProfile, OrderRow, EarningsSummary } from '@shared/agentOrders';
import { formatDuration, orderStatusLabel } from '@shared/agentOrders';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/Thumb';
import { TrackingMap } from '../components/TrackingMap';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

/** Fallback when an agent has no personal support number recorded. */
const SUPPORT_PHONE = '+918431109368';

/** How often to re-check the pool while the app is open. */
const POLL_MS = 15000;
/** Don't write a location fix more often than this — it's a database write per
 *  active order, and a rider in traffic emits fixes constantly. */
const LOCATION_MIN_GAP_MS = 15000;

export function AgentOrdersScreen({ agentId, onSignedOut }: { agentId: string; onSignedOut: () => void }) {
  const tabBarSpace = useTabBarSpace();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [openOrders, setOpenOrders] = useState<OrderRow[] | null>(null);
  const [myOrders, setMyOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [online, setOnline] = useState(true);
  // The order being closed, its code, and whether the cash was taken.
  const [closing, setClosing] = useState<OrderRow | null>(null);
  const [code, setCode] = useState('');
  const [cashTaken, setCashTaken] = useState(true);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [minutesToday, setMinutesToday] = useState(0);
  const [history, setHistory] = useState<OrderRow[] | null>(null);
  const [showProfile, setShowProfile] = useState(false);
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
      const [open, mine, earned, minutes] = await Promise.all([
        listOpenOrders(),
        listMyDeliveries(agentId),
        getEarnings(agentId).catch(() => null),
        getTodayMinutes().catch(() => 0),
      ]);
      setOpenOrders(open);
      setMyOrders(mine);
      if (earned) setEarnings(earned);
      setMinutesToday(minutes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    }
  }, [agentId]);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setOnline(p.is_online);
      })
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
    // Picking up is still one tap. Delivering is not: it needs the customer's
    // code, and for a cash order, confirmation that the money changed hands.
    if (order.status !== 'claimed') {
      setClosing(order);
      setCode('');
      setCashTaken(order.payment_method === 'cod');
      setCloseError(null);
      return;
    }
    setBusyId(order.id);
    try {
      await markPickedUp(order.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order');
    } finally {
      setBusyId(null);
    }
  };

  const onConfirmDelivery = async () => {
    if (!closing) return;
    setBusyId(closing.id);
    setCloseError(null);
    try {
      const matched = await verifyDeliveryOtp(closing.id, code);
      if (!matched) {
        setCloseError('That code does not match. Ask the customer to read it again.');
        return;
      }
      await markDelivered(closing.id, closing.payment_method === 'cod' && cashTaken);
      setClosing(null);
      await load();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Could not close the delivery');
    } finally {
      setBusyId(null);
    }
  };

  const onReportFailure = () => {
    if (!closing) return;
    const order = closing;
    const reasons = ['Nobody at the address', 'Customer refused', 'Address is wrong', 'Cannot reach the customer'];
    Alert.alert('Why could it not be delivered?', undefined, [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: async () => {
          setBusyId(order.id);
          try {
            await reportFailedDelivery(order.id, reason);
            setClosing(null);
            await load();
          } catch (err) {
            setCloseError(err instanceof Error ? err.message : 'Could not report that');
          } finally {
            setBusyId(null);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const onToggleOnline = async (next: boolean) => {
    if (!profile) return;
    setOnline(next);
    try {
      await setAgentOnline(next);
    } catch {
      setOnline(!next);
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
              // Off duty first: signing out otherwise left the shift running
              // and the agent marked available for orders they cannot see.
              setAgentOnline(false)
                .catch(() => undefined)
                .then(() => stopBackgroundTracking())
                .then(() => unregisterDeviceForPush())
                .then(() => signOutAgent())
                .then(onSignedOut),
          },
        ]
      );
      return;
    }
    setAgentOnline(false)
      .catch(() => undefined)
      .then(() => stopBackgroundTracking())
      .then(() => unregisterDeviceForPush())
      .then(() => signOutAgent())
      .then(onSignedOut);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
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
          <TouchableOpacity
            onPress={() => {
              setShowProfile(true);
              if (!history) listDeliveryHistory(agentId).then(setHistory).catch(() => setHistory([]));
            }}
            hitSlop={10}
          >
            <Text style={styles.profileLink}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Off duty keeps the account but stops new orders being pushed, so an
            agent can finish for the day without uninstalling anything. */}
        <View style={styles.dutyRow}>
          <View style={styles.headCol}>
            <Text style={styles.dutyTitle}>{online ? 'On duty' : 'Off duty'}</Text>
            <Text style={styles.dutySub}>
              {online
                ? "You'll be alerted about new orders."
                : 'No new order alerts until you switch back on.'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={onToggleOnline}
            trackColor={{ true: colors.brand, false: colors.borderStrong }}
            thumbColor="#fff"
          />
        </View>

        {earnings && (
          <View style={styles.earnRow}>
            <Earn label="Today" value={formatRupees(earnings.today)} />
            <Earn label="7 days" value={formatRupees(earnings.week)} />
            <Earn label="Deliveries" value={String(earnings.deliveredToday)} />
            <Earn label="Cash held" value={formatRupees(earnings.cashInHand)} />
            <Earn label="On duty" value={formatDuration(minutesToday)} />
          </View>
        )}

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

      <Modal
        visible={showProfile}
        animationType="slide"
        onRequestClose={() => setShowProfile(false)}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.head}>
              <Text style={styles.hi}>My profile</Text>
              <TouchableOpacity onPress={() => setShowProfile(false)} hitSlop={10}>
                <Text style={styles.signOut}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                {profile?.photo_url ? (
                  <Image source={{ uri: profile.photo_url }} style={styles.profilePhoto} />
                ) : (
                  <Text style={styles.profileInitial}>
                    {profile?.name?.trim().charAt(0).toUpperCase() || '🛵'}
                  </Text>
                )}
              </View>
              <Text style={styles.profileName}>{profile?.name ?? ''}</Text>
              <Text style={styles.profileMeta}>{profile?.phone ?? ''}</Text>
              {profile?.vehicle_number ? (
                <Text style={styles.profileVehicle}>{profile.vehicle_number}</Text>
              ) : null}

              {/* Documents are checked by the office, so the app reports the
                  state rather than pretending the agent can change it. */}
              <View style={profile?.kyc_verified_at ? styles.kycOk : styles.kycPending}>
                <Text style={profile?.kyc_verified_at ? styles.kycOkText : styles.kycPendingText}>
                  {profile?.kyc_verified_at
                    ? '✓ Documents verified'
                    : 'Documents not verified yet — ask the office'}
                </Text>
              </View>

              <Text style={styles.profileMeta}>On duty today: {formatDuration(minutesToday)}</Text>
            </View>

            {/* One tap to a person, not a form. Something has gone wrong on the
                road when this is pressed. */}
            <TouchableOpacity
              style={styles.emergencyBtn}
              activeOpacity={0.9}
              onPress={() =>
                Linking.openURL(`tel:${profile?.emergency_contact || SUPPORT_PHONE}`).catch(
                  () => undefined
                )
              }
            >
              <Text style={styles.emergencyText}>📞 Call support</Text>
            </TouchableOpacity>

            <Text style={styles.section}>Past Deliveries</Text>
            {!history && <Text style={styles.empty}>Loading…</Text>}
            {history && history.length === 0 && (
              <Text style={styles.empty}>Nothing delivered yet.</Text>
            )}
            {history?.map((order) => (
              <View key={order.id} style={styles.histRow}>
                <View style={styles.histCol}>
                  <Text style={styles.histWhere} numberOfLines={1}>
                    {order.pickup_label} → {order.delivery_address}
                  </Text>
                  <Text style={styles.histMeta}>
                    {order.delivered_at
                      ? new Date(order.delivered_at).toLocaleDateString('en-IN')
                      : orderStatusLabel(order.status)}
                    {order.failure_reason ? ` · ${order.failure_reason}` : ''}
                  </Text>
                </View>
                <Text style={order.status === 'failed' ? styles.histFailed : styles.histPay}>
                  {order.status === 'failed' ? 'Failed' : formatRupees(order.agent_payout)}
                </Text>
              </View>
            ))}

            <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.9} onPress={onSignOut}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={closing !== null} transparent animationType="fade" onRequestClose={() => setClosing(null)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm delivery</Text>
            <Text style={styles.modalSub}>
              Ask the customer for the 4-digit code shown in their app.
            </Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              placeholder="0000"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />

            {closing?.payment_method === 'cod' && (
              <TouchableOpacity
                style={styles.cashRow}
                activeOpacity={0.8}
                onPress={() => setCashTaken((v) => !v)}
              >
                <View style={[styles.checkbox, cashTaken && styles.checkboxOn]}>
                  {cashTaken && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.cashText}>
                  I collected {formatRupees(closing.total)} in cash
                </Text>
              </TouchableOpacity>
            )}

            {closeError && <Text style={styles.error}>{closeError}</Text>}

            <TouchableOpacity
              style={[styles.modalBtn, (code.length !== 4 || busyId !== null) && styles.modalBtnOff]}
              activeOpacity={0.9}
              disabled={code.length !== 4 || busyId !== null}
              onPress={onConfirmDelivery}
            >
              <Text style={styles.modalBtnText}>
                {busyId !== null ? 'Confirming…' : 'Confirm delivered'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onReportFailure} activeOpacity={0.8}>
              <Text style={styles.failLink}>Could not deliver</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setClosing(null)} activeOpacity={0.8}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Earn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.earnCell}>
      <Text style={styles.earnValue}>{value}</Text>
      <Text style={styles.earnLabel}>{label}</Text>
    </View>
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
    const destination = `${order.delivery_latitude},${order.delivery_longitude}`;
    // Leaving origin out asks Maps to assume "current location", but that
    // silently falls back to a manual pin-drop if Maps itself doesn't have
    // its own location permission — a separate grant from ours. We already
    // have the agent's live position on screen for the map, so pass it
    // explicitly and route directly from where they actually are.
    const params = myPosition
      ? `origin=${myPosition.latitude},${myPosition.longitude}&destination=${destination}`
      : `destination=${destination}`;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&${params}&travelmode=driving`).catch(
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
            <Thumb src={item.image_url ?? undefined} emoji="🛒" style={styles.itemThumb} fontSize={16} width={120} />
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
  profileLink: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.brand },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  profilePhoto: { width: 72, height: 72 },
  profileInitial: { fontSize: 30, fontWeight: fontWeights.heading, color: colors.brand },
  profileName: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  profileMeta: { fontSize: fontSizes.sm, color: colors.textMuted },
  profileVehicle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },

  kycOk: {
    backgroundColor: colors.successTint,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  kycOkText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.success },
  kycPending: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  kycPendingText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.textMuted },

  emergencyBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emergencyText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  histCol: { flex: 1 },
  histWhere: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
  histMeta: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  histPay: { fontSize: fontSizes.sm, fontWeight: fontWeights.heading, color: colors.text },
  histFailed: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.danger },

  signOutBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signOutBtnText: { color: colors.danger, fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dutyTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text },
  dutySub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },

  earnRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  earnCell: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  earnValue: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text },
  earnLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  modalBack: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  modalSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  codeInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    fontSize: 30,
    fontWeight: fontWeights.heading,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.text,
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxTick: { color: '#fff', fontSize: 14, fontWeight: fontWeights.heading },
  cashText: { flex: 1, fontSize: fontSizes.sm, color: colors.text },

  modalBtn: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalBtnOff: { opacity: 0.45 },
  modalBtnText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
  failLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.danger,
    marginTop: spacing.lg,
  },
  cancelLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

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
