import { useMemo, useSyncExternalStore } from 'react';

import { useSkyStore } from '@/state/useSkyStore';

/**
 * Élő módban az égbolt ennyi időnként frissül (az ég 30 mp alatt kb. 0,1°-ot fordul).
 * Az óra „lépcsőzetes”: két lépés között ugyanazt az értéket adja, így nem renderel feleslegesen.
 */
const STEP_MS = 30_000;

function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, 5_000);
  return () => clearInterval(id);
}

function clockSnapshot() {
  return Math.floor(Date.now() / STEP_MS) * STEP_MS;
}

/** A megjelenítendő időpont: kézi beállítás, vagy élő módban a folyamatosan frissülő „most”. */
export function useSkyTime(): Date {
  const manualTime = useSkyStore((s) => s.manualTime);
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, clockSnapshot);
  return useMemo(() => new Date(manualTime ?? now), [manualTime, now]);
}
