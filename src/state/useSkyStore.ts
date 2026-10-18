import { create } from 'zustand';

import type { GeoLocation } from '@/core/models';
import { DEFAULT_LOCATION } from '@/core/locations';

export type LocationSource = 'default' | 'gps' | 'manual';

interface SkyState {
  /** A kiválasztott égi kultúra azonosítója. */
  cultureId: string;
  /** Látszanak-e a csillagképvonalak. */
  showLines: boolean;
  /** Kézzel beállított időpont (ms); null = élő, aktuális idő. */
  manualTime: number | null;
  location: GeoLocation;
  locationSource: LocationSource;

  setCulture(id: string): void;
  toggleLines(): void;
  /** Időugrás órákban a jelenleg mutatott időponthoz képest. */
  shiftHours(hours: number, now?: number): void;
  resetTimeToNow(): void;
  setLocation(location: GeoLocation, source: LocationSource): void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  cultureId: 'hungarian',
  showLines: true,
  manualTime: null,
  location: DEFAULT_LOCATION,
  locationSource: 'default',

  setCulture: (cultureId) => set({ cultureId }),
  toggleLines: () => set({ showLines: !get().showLines }),
  shiftHours: (hours, now = Date.now()) =>
    set({ manualTime: (get().manualTime ?? now) + hours * 3600 * 1000 }),
  resetTimeToNow: () => set({ manualTime: null }),
  setLocation: (location, locationSource) => set({ location, locationSource }),
}));
