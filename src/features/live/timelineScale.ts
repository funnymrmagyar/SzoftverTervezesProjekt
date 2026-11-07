export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const YEAR_MS = 365.2425 * DAY_MS;
const MAX_YEARS_FROM_NOW = 500;

export const TIMELINE_SPANS = [
  { durationMs: 2 * HOUR_MS, label: '±1 óra' },
  { durationMs: 2 * DAY_MS, label: '±1 nap' },
  { durationMs: 30 * DAY_MS, label: '±15 nap' },
  { durationMs: YEAR_MS, label: '±6 hónap' },
  { durationMs: 10 * YEAR_MS, label: '±5 év' },
  { durationMs: 100 * YEAR_MS, label: '±50 év' },
  { durationMs: 1000 * YEAR_MS, label: '±500 év' },
] as const;

export function clampTimelineTime(timestamp: number, now = Date.now()): number {
  const maximumOffset = MAX_YEARS_FROM_NOW * YEAR_MS;
  return Math.max(now - maximumOffset, Math.min(now + maximumOffset, timestamp));
}

export function timelineTimeAtPosition(
  anchorTime: number,
  positionX: number,
  width: number,
  spanMs: number,
  now?: number,
): number {
  if (width <= 0) return clampTimelineTime(anchorTime, now);
  const offset = (positionX / width - 0.5) * spanMs;
  return clampTimelineTime(anchorTime + offset, now);
}

export function timelineEdgeLabels(spanMs: number): { start: string; end: string } {
  const years = spanMs / 2 / YEAR_MS;
  if (years >= 1) {
    const label = `${Math.round(years)} év`;
    return { start: `−${label}`, end: `+${label}` };
  }
  const days = spanMs / 2 / DAY_MS;
  if (days >= 1) {
    const label = `${Math.round(days)} nap`;
    return { start: `−${label}`, end: `+${label}` };
  }
  const hours = spanMs / 2 / HOUR_MS;
  return { start: `−${Math.round(hours)} óra`, end: `+${Math.round(hours)} óra` };
}
