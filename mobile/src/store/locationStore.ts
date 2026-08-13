import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeliveryLocation } from '@shared/deliveryLocation';

interface LocationState {
  location: DeliveryLocation | null;
  prompted: boolean;
  /** False until AsyncStorage has been read — don't prompt before we know. */
  hydrated: boolean;
  setLocation: (location: DeliveryLocation) => void;
  markPrompted: () => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      prompted: false,
      hydrated: false,
      setLocation: (location) => set({ location, prompted: true }),
      markPrompted: () => set({ prompted: true }),
      clear: () => set({ location: null }),
    }),
    {
      name: 'dw_delivery_location',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ location: state.location, prompted: state.prompted }),
      onRehydrateStorage: () => () => {
        useLocationStore.setState({ hydrated: true });
      },
    }
  )
);
