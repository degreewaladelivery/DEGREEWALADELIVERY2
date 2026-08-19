import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useActiveOrders } from '../lib/useActiveOrders';
import { useTabBarOnlySpace } from '../lib/tabBarSpace';
import { orderStatusLabel } from '@shared/agentOrders';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

/**
 * A persistent strip above the tab bar for an order in progress — visible on
 * every screen, not just the tracking page itself. Without this, the only
 * way back to tracking was retracing the exact path used to place the order;
 * leaving the app for even a minute and coming back left a customer with no
 * way to check on it short of reordering from memory.
 *
 * Always rests right above the tab bar (useTabBarOnlySpace) rather than
 * trying to detect and dodge each screen's own bottom button. That was tried
 * first and it covered whichever screen hadn't been special-cased — Checkout
 * had the same problem Category originally did. Now it's the screens with
 * bottom buttons that reserve room via useTabBarSpace, which every one of
 * them already calls, so none can be missed.
 */
export function ActiveOrderBar() {
  const orders = useActiveOrders();
  const navigation = useNavigation<any>();
  const bottom = useTabBarOnlySpace();

  if (orders.length === 0) return null;

  // Newest first, matching how track-order already sorts them — the most
  // recent order is the one someone checking the bar actually wants.
  const latest = orders[0];
  const label =
    orders.length === 1
      ? orderStatusLabel(latest.status)
      : `${orders.length} orders in progress`;

  return (
    <TouchableOpacity
      style={[styles.bar, { bottom }]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Cart', { screen: 'Track' })}
    >
      <Text style={styles.icon}>🛵</Text>
      <Text style={styles.label} numberOfLines={1}>
        {latest.pickup_label} · {label}
      </Text>
      <Text style={styles.action}>Track ›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  icon: { fontSize: 18 },
  label: { flex: 1, color: '#fff', fontSize: fontSizes.sm, fontWeight: fontWeights.bold },
  action: { color: colors.brand, fontSize: fontSizes.sm, fontWeight: fontWeights.heading },
});
