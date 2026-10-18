import { create } from 'zustand';

import { normalizeDegrees } from '@/core/astronomy';

/** A kamera nézési iránya és látómezeje (fokban). */
export interface ViewState {
  azimuth: number;
  altitude: number;
  fov: number;
}

export const MIN_FOV = 15;
export const MAX_FOV = 100;
export const MIN_ALTITUDE = -30;
export const MAX_ALTITUDE = 89;
/** Alapnézet: észak felé, ahol a Göncölszekér Magyarországról egész évben látszik. */
export const DEFAULT_VIEW: ViewState = { azimuth: 0, altitude: 35, fov: 75 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Húzás → új nézet. Az eget „megfogjuk”: jobbra húzva az ég jobbra mozdul,
 * vagyis a kamera balra (kisebb azimut felé) fordul. Egy pixel ≈ fov / képernyőmagasság fok.
 */
export function dragView(
  view: ViewState,
  dx: number,
  dy: number,
  viewportHeight: number,
): ViewState {
  const degPerPx = view.fov / Math.max(1, viewportHeight);
  return {
    ...view,
    azimuth: normalizeDegrees(view.azimuth - dx * degPerPx),
    altitude: clamp(view.altitude + dy * degPerPx, MIN_ALTITUDE, MAX_ALTITUDE),
  };
}

/** Nagyítás: factor < 1 közelít, factor > 1 távolít. */
export function zoomView(view: ViewState, factor: number): ViewState {
  return { ...view, fov: clamp(view.fov * factor, MIN_FOV, MAX_FOV) };
}

interface ViewStore extends ViewState {
  drag(dx: number, dy: number, viewportHeight: number): void;
  zoom(factor: number): void;
  setFov(fov: number): void;
  reset(): void;
}

export const useViewStore = create<ViewStore>((set, get) => ({
  ...DEFAULT_VIEW,
  drag: (dx, dy, h) => set(dragView(get(), dx, dy, h)),
  zoom: (factor) => set(zoomView(get(), factor)),
  setFov: (fov) => set({ fov: clamp(fov, MIN_FOV, MAX_FOV) }),
  reset: () => set(DEFAULT_VIEW),
}));
