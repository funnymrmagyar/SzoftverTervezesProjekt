import { useCallback, useState } from 'react';

import { TIMELINE_SPANS } from './timelineScale';

export function useTimelineScale() {
  const [index, setIndex] = useState(0);
  const zoomIn = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);
  const zoomOut = useCallback(
    () => setIndex((current) => Math.min(TIMELINE_SPANS.length - 1, current + 1)),
    [],
  );
  const span = TIMELINE_SPANS[index];

  return {
    index,
    span,
    canZoomIn: index > 0,
    canZoomOut: index < TIMELINE_SPANS.length - 1,
    zoomIn,
    zoomOut,
  };
}
