/**
 * store/cartStore.ts
 * --------------------------------------------------------------------------
 * The cart, in a tiny Zustand store (mirror of the web app's cartStore).
 * A cart belongs to ONE shop at a time — adding an item from a different
 * shop replaces the cart.
 */
import { create } from 'zustand';
import type { Product } from '@shared/types';

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartState {
  shopId: string | null;
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
    if (shopId && shopId !== product.shopId) {
      set({ shopId: product.shopId, items: { [product.id]: { product, quantity: 1 } } });
      return;
    }
    const existing = items[product.id];
    set({
      shopId: product.shopId,
      items: { ...items, [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 } },
    });
  },

  decrement: (productId) => {
    const { items } = get();
    const existing = items[productId];
    if (!existing) return;
    if (existing.quantity <= 1) {
      get().removeLine(productId);
      return;
    }
    set({ items: { ...items, [productId]: { ...existing, quantity: existing.quantity - 1 } } });
  },

  removeLine: (productId) => {
    const items = { ...get().items };
    delete items[productId];
    const empty = Object.keys(items).length === 0;
    set({ items, shopId: empty ? null : get().shopId });
  },

  clear: () => set({ items: {}, shopId: null }),
}));

export function selectCount(items: Record<string, CartLine>): number {
  return Object.values(items).reduce((n, line) => n + line.quantity, 0);
}

export function selectSubtotal(items: Record<string, CartLine>): number {
  return Object.values(items).reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}
