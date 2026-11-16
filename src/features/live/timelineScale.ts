import { t, type TranslationKey } from '@/ui/i18n';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const YEAR_MS = 365.2425 * DAY_MS;
const MAX_YEARS_FROM_NOW = 500;

export const TIMELINE_SPANS: readonly { durationMs: number; labelKey: TranslationKey }[] = [
  { durationMs: 2 * HOUR_MS, labelKey: 'timeline.span.hours' },
  { durationMs: 2 * DAY_MS, labelKey: 'timeline.span.days' },
  { durationMs: 30 * DAY_MS, labelKey: 'timeline.span.month' },
  { durationMs: YEAR_MS, labelKey: 'timeline.span.halfYear' },
  { durationMs: 10 * YEAR_MS, labelKey: 'timeline.span.years5' },
  { durationMs: 100 * YEAR_MS, labelKey: 'timeline.span.years50' },
  { durationMs: 1000 * YEAR_MS, labelKey: 'timeline.span.years500' },
];

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
    const label = t('timeline.edge.years', { count: Math.round(years) });
    return { start: `−${label}`, end: `+${label}` };
  }
  const days = spanMs / 2 / DAY_MS;
  if (days >= 1) {
    const label = t('timeline.edge.days', { count: Math.round(days) });
    return { start: `−${label}`, end: `+${label}` };
  }
  const hours = spanMs / 2 / HOUR_MS;
  const label = t('timeline.edge.hours', { count: Math.round(hours) });
  return { start: `−${label}`, end: `+${label}` };
}
