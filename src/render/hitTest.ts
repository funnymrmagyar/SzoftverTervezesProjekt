import { applyMat3, equatorialToVector } from '@/core/astronomy';
import type { LineSegment } from '@/core/catalog';
import type { Mat3 } from '@/core/models';
import type { ViewState } from '@/state/useViewStore';

import {
  estimateLabelWidth,
  LABEL_LINE_HEIGHT,
  projectToScreen,
  type PlacedLabel,
  type ScreenPoint,
  type Viewport,
} from './labelLayout';

/*
 * Melyik csillagképre koppintott a felhasználó? — tiszta függvények, three.js és React nélkül.
 * Ugyanazt a vetítést használjuk, mint a feliratoknál, így a képernyőn látott vonalakat és
 * neveket vizsgáljuk, nem a 3D jelenetet.
 */

/** Ennyi képpontnál közelebbi vonalra koppintva számít találatnak (ujjal is eltalálható). */
export const TAP_RADIUS = 22;

/** Ennyivel nagyobb dobozban fogadjuk el a feliratra koppintást. */
const LABEL_PADDING = 6;

/** Pont távolsága egy szakasztól a képernyőn (képpontban). */
export function distanceToSegment(p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  const clamped = Math.min(1, Math.max(0, t));
  return Math.hypot(p.x - (a.x + clamped * dx), p.y - (a.y + clamped * dy));
}

/**
 * A koppintás helyén lévő csillagkép azonosítója, vagy null, ha üres égre koppintottak.
 *  1. Ha egy látható feliratra koppintottak, az nyer.
 *  2. Különben a legközelebbi csillagképvonal, ha legfeljebb `radius` képpontnyira van.
 *     Az egycsillagos „alakzatok” (nulla hosszú vonal) magára a csillagra koppintva választhatók.
 * A teljesen horizont alatti (a föld takarta) és a kamera mögé eső vonalakat kihagyjuk.
 */
export function hitTestConstellation(
  point: ScreenPoint,
  segments: readonly LineSegment[],
  labels: readonly PlacedLabel[],
  matrix: Mat3,
  view: ViewState,
  viewport: Viewport,
  radius: number = TAP_RADIUS,
): string | null {
  let bestLabel: { id: string; d: number } | null = null;
  for (const label of labels) {
    const halfWidth = estimateLabelWidth(label.name) / 2 + LABEL_PADDING;
    const halfHeight = LABEL_LINE_HEIGHT / 2 + LABEL_PADDING;
    if (Math.abs(point.x - label.x) <= halfWidth && Math.abs(point.y - label.y) <= halfHeight) {
      const d = Math.hypot(point.x - label.x, point.y - label.y);
      if (!bestLabel || d < bestLabel.d) bestLabel = { id: label.id, d };
    }
  }
  if (bestLabel) return bestLabel.id;

  let best: { id: string; d: number } | null = null;
  for (const { constellationId, from, to } of segments) {
    const a = applyMat3(matrix, equatorialToVector(from.ra, from.dec));
    const b = applyMat3(matrix, equatorialToVector(to.ra, to.dec));
    if (a[1] <= 0 && b[1] <= 0) continue;

    const pa = projectToScreen(a, view, viewport);
    const pb = projectToScreen(b, view, viewport);
    if (!pa || !pb) continue;

    const d = distanceToSegment(point, pa, pb);
    if (d <= radius && (!best || d < best.d)) best = { id: constellationId, d };
  }
  return best?.id ?? null;
}
