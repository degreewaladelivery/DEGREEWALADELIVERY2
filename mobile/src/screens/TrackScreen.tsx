import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from '../lib/tracking';
import { formatRupees } from '../lib/format';
import { TrackingMap } from '../components/TrackingMap';
import { haversineDistanceKm } from '@shared/deliveryFare';
import { isActiveOrder, isAgentLocationFresh, orderStatusLabel } from '@shared/agentOrders';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'claimed', label: 'Assigned' },
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
  return `${Math.round(minutes / 60)} hr ago`;
}

export function TrackScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const customer = await getCustomer();
      if (!customer) {
        if (!cancelled) navigation.replace('Login');
        return;
      }
      try {
        const rows = await fetchMyOrders(customer.token);
        if (!cancelled) {
          setOrders(rows);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SignedOutError) {
          await logoutCustomer();
          navigation.replace('Login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load orders');
      }
    };

    load();
    timer = setInterval(load, 10000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [navigation]);

  // Every in-flight order gets its own card. Showing only the first hid the
  // others, and they then appeared under "Past Orders" — a live delivery
  // labelled as finished.
  const active = (orders ?? []).filter(isActiveOrder);
  const past = (orders ?? []).filter((o) => !isActiveOrder(o));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Track Your Order</Text>

        {!orders && !error && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {orders && orders.length === 0 && (
          <Text style={styles.muted}>You haven't placed any orders yet.</Text>
        )}

        {active.map((order) => (
          <ActiveOrderCard key={order.id} order={order} />
        ))}

        {orders && orders.length > 0 && active.length === 0 && (
          <Text style={styles.muted}>No active orders right now.</Text>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.subheading}>Past Orders</Text>
            {past.map((order) => (
              <View key={order.id} style={styles.past}>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{order.pickup_label}</Text>
                  <Text style={styles.muted}>
                    {new Date(order.created_at).toLocaleDateString('en-IN')} · {order.items.length}{' '}
                    item{order.items.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.pastRight}>
                  <Text style={styles.total}>{formatRupees(order.total)}</Text>
                  <Text style={order.status === 'cancelled' ? styles.tagBad : styles.tag}>
                    {orderStatusLabel(order.status)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  const fresh = isAgentLocationFresh(order.agent_location_at);
  const agent =
    fresh && order.agent_latitude != null && order.agent_longitude != null
      ? { latitude: order.agent_latitude, longitude: order.agent_longitude }
      : null;

  const agentDistanceKm =
    agent && delivery
      ? haversineDistanceKm(agent.latitude, agent.longitude, delivery.latitude, delivery.longitude)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.pickup}>📦 {order.pickup_label}</Text>
        <Text style={styles.total}>{formatRupees(order.total)}</Text>
      </View>
      <Text style={styles.muted}>#{order.id.slice(0, 8).toUpperCase()}</Text>

      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const done = index <= (STEP_INDEX[order.status] ?? 0);
          return (
            <View key={step.key} style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone]} />
              <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
            </View>
          );
        })}
      </View>

      <TrackingMap pickup={pickup} delivery={delivery} agent={agent} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendKey, styles.keyShop]} />
          <Text style={styles.legendText}>Shop</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendKey, styles.keyHome]} />
          <Text style={styles.legendText}>Your address</Text>
        </View>
        {agent && (
          <View style={styles.legendItem}>
            <View style={[styles.legendKey, styles.keyAgent]} />
            <Text style={styles.legendText}>Your agent</Text>
          </View>
        )}
      </View>

      {order.agent ? (
        <View style={styles.agentRow}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{order.agent.name}</Text>
            <Text style={styles.muted}>
              {agentDistanceKm != null
                ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(order.agent_location_at)}`
                : 'Live location unavailable right now'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.9}
            onPress={() => Linking.openURL(`tel:${order.agent?.phone}`)}
          >
            <Text style={styles.callBtnText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.muted}>Waiting for a delivery agent to accept your order.</Text>
      )}

      <Text style={styles.muted}>📍 {order.delivery_address}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendKey: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textMuted },
  keyShop: { backgroundColor: '#6b7280' },
  keyHome: { backgroundColor: '#ff6b00' },
  keyAgent: { backgroundColor: '#00897b' },

  safe: { flex: 1, backgroundColor: colors.bgSoft },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 90 },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },

  back: { color: colors.textMuted, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm },
  heading: {
    fontSize: fontSizes.xl + 2,
    fontWeight: fontWeights.heading,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  subheading: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.heading,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickup: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text, flex: 1 },
  total: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text },
  muted: { fontSize: fontSizes.xs, color: colors.textMuted },
  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: '#fdecea',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },

  steps: { flexDirection: 'row', justifyContent: 'space-between' },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderStrong },
  dotDone: { backgroundColor: colors.brand },
  stepLabel: { fontSize: 10, color: colors.textFaint, textAlign: 'center' },
  stepLabelDone: { color: colors.text, fontWeight: fontWeights.semibold },

  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  agentInfo: { flex: 1 },
  agentName: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },
  callBtn: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  callBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },

  past: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  pastRight: { alignItems: 'flex-end', gap: 2 },
  tag: { fontSize: 10, fontWeight: fontWeights.bold, color: '#2e7d32' },
  tagBad: { fontSize: 10, fontWeight: fontWeights.bold, color: colors.danger },
});
