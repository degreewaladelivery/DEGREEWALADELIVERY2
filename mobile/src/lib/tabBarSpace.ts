import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveOrderCountStore } from '../store/activeOrderStore';

/**
 * How much room the floating tab bar takes at the bottom of every tab screen.
 *
 * The bar is absolutely positioned, so it sits *over* scrolling content rather
 * than pushing it up. Each screen was guessing its own bottom padding — 60
 * here, 90 there, 120 somewhere else — and most ignored the safe-area inset
 * entirely, which is why the Place Order button ended up underneath it on a
 * phone with a gesture bar.
 *
 * Exported as constants so the navigator and the screens cannot drift apart.
 */
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_INSET = 14;

/**
 * Height of the floating order-status bar, plus the gap it leaves above
 * whatever sits below it. It always rests directly above the tab bar (see
 * useTabBarOnlySpace) — everything else reserves room above it instead of
 * the bar trying to dodge every screen's own bottom button individually,
 * which is what broke the first time: a screen we hadn't special-cased
 * (Checkout) got covered the same way Category's View Cart pill originally
 * did, because the bar was the one guessing where it was safe to sit.
 */
export const ORDER_BAR_HEIGHT = 52;
export const ORDER_BAR_GAP = 10;

/**
 * Bottom padding that clears the tab bar, and the order-status bar too when
 * one is currently showing. Every screen with a bottom-fixed button already
 * uses this for its scroll padding, so making it order-aware here is what
 * makes all of them make room automatically — no per-screen edits, and no
 * screen can be missed the way Checkout was.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const hasActiveOrder = useActiveOrderCountStore((s) => s.count > 0);
  const base = TAB_BAR_HEIGHT + TAB_BAR_INSET + insets.bottom + 16;
  return hasActiveOrder ? base + ORDER_BAR_HEIGHT + ORDER_BAR_GAP : base;
}

/**
 * The tab bar alone, ignoring the order-status bar. This is what the
 * order-status bar itself rests on — it must not use the order-aware value
 * above, or it would try to sit above its own reserved space.
 */
export function useTabBarOnlySpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_INSET + insets.bottom + 16;
}

/**
 * Geometry of the floating "N items · View Cart" bar shown on Category and
 * Shop screens while an item is in the cart. Centralized for the same reason
 * as the tab bar constants above: two screens hardcoding the same number
 * independently is exactly how they'd quietly drift apart.
 */
export const VIEW_CART_BAR_BOTTOM_OFFSET = 84; // added to insets.bottom
