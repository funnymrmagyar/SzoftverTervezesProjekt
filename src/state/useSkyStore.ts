import { create } from 'zustand';

import type { GeoLocation } from '@/core/models';
import { DEFAULT_LOCATION } from '@/core/locations';

export type LocationSource = 'default' | 'gps' | 'manual';

interface SkyState {
  /** A kiválasztott égi kultúra azonosítója. */
  cultureId: string;
  /** Látszanak-e a csillagképvonalak. */
  showLines: boolean;
  /** Látszanak-e a csillagképnevek. */
  showLabels: boolean;
  /** A koppintással kiválasztott csillagkép azonosítója (a kiválasztott kultúrán belül). */
  selectedConstellationId: string | null;
  /** Kézzel beállított időpont (ms); null = élő, aktuális idő. */
  manualTime: number | null;
  location: GeoLocation;
  locationSource: LocationSource;

  setCulture(id: string): void;
  toggleLines(): void;
  toggleLabels(): void;
  /** Csillagkép kiválasztása; null = a kiválasztás megszüntetése. */
  selectConstellation(id: string | null): void;
  /** Időugrás órákban a jelenleg mutatott időponthoz képest. */
  shiftHours(hours: number, now?: number): void;
  resetTimeToNow(): void;
  setLocation(location: GeoLocation, source: LocationSource): void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  cultureId: 'hungarian',
  showLines: true,
  showLabels: true,
  selectedConstellationId: null,
  manualTime: null,
  location: DEFAULT_LOCATION,
  locationSource: 'default',

  // Másik kultúrában ugyanaz az azonosító mást jelent, ezért a kiválasztás megszűnik.
  setCulture: (cultureId) => set({ cultureId, selectedConstellationId: null }),
  toggleLines: () => set({ showLines: !get().showLines }),
  toggleLabels: () => set({ showLabels: !get().showLabels }),
  selectConstellation: (selectedConstellationId) => set({ selectedConstellationId }),
  shiftHours: (hours, now = Date.now()) =>
    set({ manualTime: (get().manualTime ?? now) + hours * 3600 * 1000 }),
  resetTimeToNow: () => set({ manualTime: null }),
  setLocation: (location, locationSource) => set({ location, locationSource }),
}));
