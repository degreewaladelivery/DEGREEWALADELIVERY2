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

  const active = orders?.find((o) => o.status !== 'delivered' && o.status !== 'cancelled') ?? null;
  const past = (orders ?? []).filter((o) => o.id !== active?.id);

  const pickupPoint =
    active?.pickup_latitude != null && active?.pickup_longitude != null
      ? { latitude: active.pickup_latitude, longitude: active.pickup_longitude }
      : null;
  const deliveryPoint =
    active?.delivery_latitude != null && active?.delivery_longitude != null
      ? { latitude: active.delivery_latitude, longitude: active.delivery_longitude }
      : null;
  const agentPoint =
    active?.agent_latitude != null && active?.agent_longitude != null
      ? { latitude: active.agent_latitude, longitude: active.agent_longitude }
      : null;

  const agentDistanceKm =
    agentPoint && deliveryPoint
      ? haversineDistanceKm(
          agentPoint.latitude,
          agentPoint.longitude,
          deliveryPoint.latitude,
          deliveryPoint.longitude
        )
      : null;

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

        {active && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.pickup}>📦 {active.pickup_label}</Text>
              <Text style={styles.total}>{formatRupees(active.total)}</Text>
            </View>
            <Text style={styles.muted}>#{active.id.slice(0, 8).toUpperCase()}</Text>

            <View style={styles.steps}>
              {STEPS.map((step, index) => {
                const done = index <= (STEP_INDEX[active.status] ?? 0);
                return (
                  <View key={step.key} style={styles.step}>
                    <View style={[styles.dot, done && styles.dotDone]} />
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TrackingMap pickup={pickupPoint} delivery={deliveryPoint} agent={agentPoint} />

            {active.agent ? (
              <View style={styles.agentRow}>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{active.agent.name}</Text>
                  <Text style={styles.muted}>
                    {agentDistanceKm != null
                      ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(active.agent_location_at)}`
                      : 'Location not shared yet'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  activeOpacity={0.9}
                  onPress={() => Linking.openURL(`tel:${active.agent?.phone}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.muted}>Waiting for a delivery agent to accept your order.</Text>
            )}

            <Text style={styles.muted}>📍 {active.delivery_address}</Text>
          </View>
        )}

        {orders && orders.length > 0 && !active && (
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
                    {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
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

const styles = StyleSheet.create({
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
