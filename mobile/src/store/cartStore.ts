import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@shared/types';

export interface CartLine {
  product: Product;
  quantity: number;
}

export type AddResult = 'added' | 'needs-confirm';

interface CartState {
  shopId: string | null;
  items: Record<string, CartLine>;
  addItem: (product: Product) => AddResult;
  replaceCartWith: (product: Product) => void;
  decrement: (productId: string) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: {},

      addItem: (product) => {
        const { items } = get();
        const linesSoFar = Object.values(items);

        // Two products conflict only when they'd have to ship from two
        // physically different places. Every category-browsed product ships
        // from the same shared default pickup point today regardless of
        // which category it's in (see place-order's resolvePickup), so two
        // categories are never a real conflict — only a genuine shop-to-shop
        // (or shop-to-category) mismatch is. Comparing shopId directly
        // treated "Grocery" and "Stationery" as different shops just because
        // each category has its own id, which made it impossible to build one
        // order out of more than one category.
        const conflicts = linesSoFar.some((line) => {
          const other = line.product;
          if (other.isShopProduct || product.isShopProduct) {
            return other.shopId !== product.shopId;
          }
          return false;
        });

        if (conflicts) {
          return 'needs-confirm';
        }

        const existing = items[product.id];
        set({
          shopId: product.shopId,
          items: { ...items, [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 } },
        });
        return 'added';
      },

      replaceCartWith: (product) => {
        set({ shopId: product.shopId, items: { [product.id]: { product, quantity: 1 } } });
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
    }),
    {
      name: 'dw_cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ shopId: state.shopId, items: state.items }),
    }
  )
);

export function selectCount(items: Record<string, CartLine>): number {
  return Object.values(items).reduce((n, line) => n + line.quantity, 0);
}

export function selectSubtotal(items: Record<string, CartLine>): number {
  return Object.values(items).reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}
