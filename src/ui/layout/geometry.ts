export interface ThreeZoneWidths {
  sideWidth: number;
  centerWidth: number;
}

export function calculateThreeZoneWidths(
  containerWidth: number,
  preferredSideWidth: number,
): ThreeZoneWidths {
  const width = Math.max(0, containerWidth);
  const sideWidth = Math.min(Math.max(0, preferredSideWidth), width / 2);
  return { sideWidth, centerWidth: width - sideWidth * 2 };
}

export interface ScrollbarMetrics {
  thumbSize: number;
  thumbRange: number;
  maxOffset: number;
  progress: number;
  thumbOffset: number;
}

export function calculateScrollbarMetrics(
  contentSize: number,
  viewportSize: number,
  trackSize: number,
  offset: number,
  minimumThumbSize = 44,
): ScrollbarMetrics {
  const content = Math.max(0, contentSize);
  const viewport = Math.max(0, viewportSize);
  const track = Math.max(0, trackSize);
  const maxOffset = Math.max(0, content - viewport);
  const thumbSize =
    content > 0 && viewport > 0 && track > 0
      ? Math.min(track, Math.max(Math.min(minimumThumbSize, track), (viewport / content) * track))
      : track;
  const thumbRange = Math.max(0, track - thumbSize);
  const progress = maxOffset > 0 ? Math.min(1, Math.max(0, offset) / maxOffset) : 0;
  return { thumbSize, thumbRange, maxOffset, progress, thumbOffset: progress * thumbRange };
}

export function scrollOffsetForTrackPosition(
  position: number,
  metrics: Pick<ScrollbarMetrics, 'thumbSize' | 'thumbRange' | 'maxOffset'>,
): number {
  if (metrics.thumbRange <= 0 || metrics.maxOffset <= 0) return 0;
  const boundedPosition = Math.min(
    metrics.thumbRange,
    Math.max(0, position - metrics.thumbSize / 2),
  );
  return (boundedPosition / metrics.thumbRange) * metrics.maxOffset;
}

export type SheetSnap = 'closed' | 'half' | 'full';

export function getSheetSnapHeights(height: number, peekHeight = 48): Record<SheetSnap, number> {
  const availableHeight = Math.max(0, height);
  return {
    closed: Math.min(availableHeight, Math.max(0, peekHeight)),
    half: Math.round(availableHeight * 0.5),
    full: availableHeight,
  };
}

export function nearestSheetSnap(
  height: number,
  viewportHeight: number,
  maxSnap: SheetSnap = 'full',
): SheetSnap {
  const snaps = getSheetSnapHeights(viewportHeight);
  const allowedSnaps = (['closed', 'half', 'full'] as const).slice(
    0,
    ['closed', 'half', 'full'].indexOf(maxSnap) + 1,
  );
  return allowedSnaps.reduce(
    (nearest, snap) =>
      Math.abs(snaps[snap] - height) < Math.abs(snaps[nearest] - height) ? snap : nearest,
    'closed',
  );
}
