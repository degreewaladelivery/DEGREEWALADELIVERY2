/**
 * store/cartStore.ts
 * --------------------------------------------------------------------------
 * The cart lives here, in a tiny Zustand store. ANY component can read the
 * items/total or call addItem() without passing props around.
 *
 * Design choice: a cart belongs to ONE shop at a time (like Swiggy/Zomato).
 * Adding an item from a different shop replaces the cart.
 */

import { create } from 'zustand';
import type { Product } from '@shared/types';

/** One line in the cart: a product + how many of it. */
export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  /** Which shop the current cart belongs to (null when empty). */
  shopId: string | null;
  /** Lines keyed by product id, for O(1) add/remove. */
  items: Record<string, CartLine>;

  addItem: (product: Product) => void;
  decrement: (productId: string) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  shopId: null,
  items: {},

  addItem: (product) => {
    const { shopId, items } = get();

    // Switching shops? Start a fresh cart for the new shop.
    if (shopId && shopId !== product.shopId) {
      set({ shopId: product.shopId, items: { [product.id]: { product, quantity: 1 } } });
      return;
    }

    const existing = items[product.id];
    set({
      shopId: product.shopId,
      items: {
        ...items,
        [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 },
      },
    });
  },

  decrement: (productId) => {
    const { items } = get();
    const existing = items[productId];
    if (!existing) return;

    if (existing.quantity <= 1) {
      // Quantity would hit 0 → remove the line entirely.
      get().removeLine(productId);
      return;
    }
    set({
      items: {
        ...items,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      },
    });
  },

  removeLine: (productId) => {
    const items = { ...get().items };
    delete items[productId];
    const empty = Object.keys(items).length === 0;
    set({ items, shopId: empty ? null : get().shopId });
  },

  clear: () => set({ items: {}, shopId: null }),
}));

/* ---- Selectors: small helpers to derive numbers from the cart ----------- */

/** Total number of individual items (sum of quantities). */
export function selectCount(items: Record<string, CartLine>): number {
  return Object.values(items).reduce((n, line) => n + line.quantity, 0);
}

/** Total rupee amount of the cart. */
export function selectSubtotal(items: Record<string, CartLine>): number {
  return Object.values(items).reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
}
