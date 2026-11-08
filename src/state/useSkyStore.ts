import { create } from 'zustand';

import type { GeoLocation } from '@/core/models';
import { DEFAULT_LOCATION } from '@/core/locations';
import { clampToRange, shiftDays as shiftDateByDays, withTimeOfDay, withYear } from '@/core/time';
import { createLogger } from '@/services/logger';

const log = createLogger('sky');

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
  /** Év beállítása a jelenleg mutatott időpont hónapjának, napjának és órájának megtartásával. */
  setYear(year: number, now?: number): void;
  /** UTC nap kezdetétől számított perc beállítása. */
  setTimeOfDay(minuteOfDay: number, now?: number): void;
  /** Naptári napokkal léptetés a jelenleg mutatott időponthoz képest. */
  shiftDays(days: number, now?: number): void;
  /** A megjelenítendő időpont közvetlen beállítása (pl. idővonal-húzásból). */
  setManualTime(timestamp: number): void;
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
  setCulture: (cultureId) => {
    log.debug('Égi kultúra váltás', { from: get().cultureId, to: cultureId });
    set({ cultureId, selectedConstellationId: null });
  },
  toggleLines: () => set({ showLines: !get().showLines }),
  toggleLabels: () => set({ showLabels: !get().showLabels }),
  selectConstellation: (selectedConstellationId) => set({ selectedConstellationId }),
  shiftHours: (hours, now = Date.now()) =>
    set({
      manualTime: clampToRange(new Date((get().manualTime ?? now) + hours * 3600 * 1000)).getTime(),
    }),
  setYear: (year, now = Date.now()) =>
    set({ manualTime: withYear(new Date(get().manualTime ?? now), year).getTime() }),
  setTimeOfDay: (minuteOfDay, now = Date.now()) =>
    set({
      manualTime: withTimeOfDay(new Date(get().manualTime ?? now), minuteOfDay).getTime(),
    }),
  shiftDays: (days, now = Date.now()) =>
    set({ manualTime: shiftDateByDays(new Date(get().manualTime ?? now), days).getTime() }),
  setManualTime: (manualTime) => set({ manualTime: clampToRange(new Date(manualTime)).getTime() }),
  resetTimeToNow: () => set({ manualTime: null }),
  setLocation: (location, locationSource) => set({ location, locationSource }),
}));
