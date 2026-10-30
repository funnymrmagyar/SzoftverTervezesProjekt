import { skyRotationMatrix } from '@/core/astronomy';
import { getSkyCultures } from '@/core/catalog';
import type { GeoLocation } from '@/core/models';
import { useViewStore } from '@/state/useViewStore';

import { hitTestConstellation } from './hitTest';
import { constellationAnchors, layoutLabels, type ScreenPoint, type Viewport } from './labelLayout';

interface PickOptions {
  point: ScreenPoint;
  viewport: Viewport;
  date: Date;
  location: GeoLocation;
  cultureId: string;
  /** Látszanak-e a feliratok (ha igen, a névre koppintás is kiválaszt). */
  includeLabels: boolean;
  selectedId: string | null;
}

/**
 * A koppintás helyén lévő csillagkép az égbolt jelenlegi nézetében (ld. hitTestConstellation).
 * A feliratokat ugyanúgy helyezi el, mint a ConstellationLabels, így a képernyőn látott
 * névre koppintás is működik.
 */
export function pickConstellation({
  point,
  viewport,
  date,
  location,
  cultureId,
  includeLabels,
  selectedId,
}: PickOptions): string | null {
  const repo = getSkyCultures();
  const culture = repo.get(cultureId);
  if (!culture || viewport.width <= 0 || viewport.height <= 0) return null;

  const segments = repo.lineSegments(cultureId);
  const matrix = skyRotationMatrix(date, location);
  const { azimuth, altitude, fov } = useViewStore.getState();
  const view = { azimuth, altitude, fov };
  const labels = includeLabels
    ? layoutLabels(
        constellationAnchors(segments, culture.constellations),
        matrix,
        view,
        viewport,
        selectedId,
      )
    : [];
  return hitTestConstellation(point, segments, labels, matrix, view, viewport);
}
