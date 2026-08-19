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
import { useTabBarSpace } from '../lib/tabBarSpace';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { fetchMyOrders, SignedOutError, type TrackedOrder } from '../lib/tracking';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/Thumb';
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
  const tabBarSpace = useTabBarSpace();
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}>
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
              <PastOrderRow key={order.id} order={order} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A past order opens to show what was actually in it. "3 items" tells a
 * customer nothing about what they bought, which is the first thing anyone
 * wants from order history.
 */
function PastOrderRow({ order }: { order: TrackedOrder }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.past}>
      <TouchableOpacity
        style={styles.pastHead}
        activeOpacity={0.7}
        onPress={() => setOpen((o) => !o)}
      >
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
          {order.cancel_reason ? <Text style={styles.reason}>{order.cancel_reason}</Text> : null}
        </View>
        <Text style={styles.chev}>{open ? '\u2303' : '\u2304'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.detail}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.detailItem}>
              <Thumb src={item.image_url ?? undefined} emoji="🛒" style={styles.detailThumb} fontSize={18} width={120} />
              <Text style={styles.detailName} numberOfLines={2}>
                {item.name}{item.unit ? ` (${item.unit})` : ''}
              </Text>
              <Text style={styles.detailQty}>x{item.quantity}</Text>
              <Text style={styles.detailPrice}>{formatRupees(item.price * item.quantity)}</Text>
            </View>
          ))}

          <View style={styles.detailBill}>
            <BillRow label="Items" value={formatRupees(order.subtotal)} />
            <BillRow label="Delivery" value={formatRupees(order.delivery_fee)} />
            <BillRow label="Taxes" value={formatRupees(order.taxes)} />
            <BillRow label="Total" value={formatRupees(order.total)} bold />
          </View>

          <Text style={styles.muted}>📍 {order.delivery_address}</Text>
        </View>
      )}
    </View>
  );
}

function BillRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{value}</Text>
    </View>
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
  const fresh = isAgentLocationFresh(order.agent_location_at);
  const agent =
    order.agent_latitude != null && order.agent_longitude != null
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

      {order.stalled_at && (
        <Text style={styles.stalled}>
          This order hasn't moved in a while and we're looking into it. Please call us if you'd
          rather cancel or reorder — you won't be charged for a delivery that never arrives.
        </Text>
      )}

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
            <Text style={styles.legendText}>{fresh ? 'Your agent' : 'Agent — last known'}</Text>
          </View>
        )}
      </View>

      {order.agent ? (
        <View style={styles.agentRow}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{order.agent.name}</Text>
            <Text style={styles.muted}>
              {agentDistanceKm == null
                ? 'Location not shared yet'
                : fresh
                  ? `${agentDistanceKm.toFixed(1)} km away · updated ${timeAgo(order.agent_location_at)}`
                  : `Last seen ${agentDistanceKm.toFixed(1)} km away, ${timeAgo(order.agent_location_at)}`}
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
  pastHead: { flexDirection: 'row', alignItems: 'center' },
  chev: { marginLeft: spacing.sm, color: colors.textMuted, fontSize: 16 },
  detail: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  detailThumb: { width: 40, height: 40, borderRadius: radius.sm },
  detailName: { flex: 1, fontSize: fontSizes.sm, color: colors.text },
  detailQty: { fontSize: fontSizes.xs, color: colors.textMuted },
  detailPrice: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text, minWidth: 60, textAlign: 'right' },
  detailBill: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  billLabel: { fontSize: fontSizes.xs, color: colors.textMuted },
  billBold: { fontSize: fontSizes.sm, fontWeight: fontWeights.heading, color: colors.text },
  reason: { fontSize: 10, color: colors.textMuted, textAlign: 'right', maxWidth: 150 },
  stalled: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#F4D491',
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: colors.text,
  },
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

  // Wraps pastHead (the tappable summary row) and, when expanded, the detail
  // section below it. This has to stack them vertically — it used to carry the
  // old flat single-row layout from before orders became expandable, which
  // forced the detail section to sit beside the header as a second row item
  // instead of below it, pushing item photos and the bill breakdown off the
  // right edge of the screen the moment a past order was opened.
  past: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pastRight: { alignItems: 'flex-end', gap: 2 },
  tag: { fontSize: 10, fontWeight: fontWeights.bold, color: '#2e7d32' },
  tagBad: { fontSize: 10, fontWeight: fontWeights.bold, color: colors.danger },
});
