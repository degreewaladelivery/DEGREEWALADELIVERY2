import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveOrders } from '../lib/useActiveOrders';
import {
  useTabBarSpace,
  VIEW_CART_BAR_BOTTOM_OFFSET,
  VIEW_CART_BAR_HEIGHT,
  VIEW_CART_BAR_GAP,
} from '../lib/tabBarSpace';
import { useCartStore, selectCount } from '../store/cartStore';
import { orderStatusLabel } from '@shared/agentOrders';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

/**
 * A persistent strip above the tab bar for an order in progress — visible on
 * every screen, not just the tracking page itself. Without this, the only
 * way back to tracking was retracing the exact path used to place the order;
 * leaving the app for even a minute and coming back left a customer with no
 * way to check on it short of reordering from memory.
 */

export function ActiveOrderBar({ currentRouteName }: { currentRouteName?: string }) {
  const orders = useActiveOrders();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const cartCount = useCartStore((s) => selectCount(s.items));
  // The focused route name has to come in as a prop rather than from
  // useNavigationState: that hook throws outside a navigator's own screen
  // tree, and this bar is deliberately mounted as a sibling of the tab
  // navigator so it can float over every tab. Getting this wrong crashed the
  // app on every launch, release build included, with no on-screen error.
  const routeName = currentRouteName;

  // Category and Shop float their own "View Cart" bar just above the tab bar
  // while something is in the cart. Sitting at the same fixed offset as that
  // bar covered it outright; stack above it instead of guessing whether it's
  // there.
  const showsCartBar = cartCount > 0 && (routeName === 'Category' || routeName === 'Shop');
  const bottom = showsCartBar
    ? insets.bottom + VIEW_CART_BAR_BOTTOM_OFFSET + VIEW_CART_BAR_HEIGHT + VIEW_CART_BAR_GAP
    : tabBarSpace;

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
