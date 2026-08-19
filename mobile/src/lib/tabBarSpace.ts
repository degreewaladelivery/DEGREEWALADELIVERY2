import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Bottom padding that clears the bar on this device, with room to breathe. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_INSET + insets.bottom + 16;
}

/**
 * Geometry of the floating "N items · View Cart" bar shown on Category and
 * Shop screens while an item is in the cart. Centralized for the same reason
 * as the tab bar constants above: the active-order status bar has to stack
 * above this one rather than guess its height and risk covering it, which is
 * exactly what happened when both bars floated at independent, uncoordinated
 * positions.
 */
export const VIEW_CART_BAR_BOTTOM_OFFSET = 84; // added to insets.bottom
export const VIEW_CART_BAR_HEIGHT = 56; // padding + one line at font size md
export const VIEW_CART_BAR_GAP = 10; // breathing room above it
