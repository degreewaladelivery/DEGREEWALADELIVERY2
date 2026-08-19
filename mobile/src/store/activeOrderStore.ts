import { create } from 'zustand';

/**
 * How many orders are currently in flight, as a plain shared number.
 *
 * The actual polling lives in one place (useActiveOrders, called once by
 * ActiveOrderBar). Every screen that needs to leave room above the floating
 * order-status bar reads this instead of running its own poller — one
 * network subscription, any number of consumers.
 */
interface ActiveOrderCountState {
  count: number;
  setCount: (count: number) => void;
}

export const useActiveOrderCountStore = create<ActiveOrderCountState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));
