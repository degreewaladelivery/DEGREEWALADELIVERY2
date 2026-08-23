import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * The pickup point this cart resolves to, or null when its items come from more
 * than one source.
 *
 * Today every item ships from the same shared point — no shop has its own
 * coordinates — so a mixed cart is a labelling question, not a routing one, and
 * null gets it labelled honestly ("DegreeWala pickup point") instead of naming
 * whichever item happened to go in last.
 *
 * This stops being cosmetic the moment a shop is given real coordinates: a cart
 * spanning two pickups cannot be one delivery, and place-order resolves exactly
 * one. At that point this needs to become a real split, not a null.
 */
function sharedPickupId(items: Record<string, CartLine>): string | null {
  const sources = new Set(Object.values(items).map((line) => line.product.shopId));
  return sources.size === 1 ? ([...sources][0] ?? null) : null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: {},

      // Anything can go in beside anything else. Browsing a category and then
      // stepping into a shop is one shopping trip, and interrupting it to ask
      // whether to throw the cart away made the app feel broken for something
      // the customer had every reason to expect to work.
      addItem: (product) => {
        const { items } = get();
        const existing = items[product.id];
        const next = {
          ...items,
          [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 },
        };
        set({ items: next, shopId: sharedPickupId(next) });
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
        // Recomputed rather than left alone: taking the odd item out of a mixed
        // cart makes it single-source again, and it should be labelled that way.
        set({ items, shopId: sharedPickupId(items) });
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
