import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DeliveryLocation } from '@shared/deliveryLocation';

interface LocationState {
  location: DeliveryLocation | null;
  /** Set once the customer has seen and dismissed the first-visit prompt. */
  prompted: boolean;
  setLocation: (location: DeliveryLocation) => void;
  markPrompted: () => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      prompted: false,
      setLocation: (location) => set({ location, prompted: true }),
      markPrompted: () => set({ prompted: true }),
      clear: () => set({ location: null }),
    }),
    {
      name: 'dw_delivery_location',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
