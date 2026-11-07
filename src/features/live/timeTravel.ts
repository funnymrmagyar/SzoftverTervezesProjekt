import { formatYear } from '@/core/time';

export const DAY_MINUTES = 24 * 60;
export const TIME_STEP_MINUTES = 5;

export function minuteOfDay(date: Date): number {
  if (
    date.getHours() === 23 &&
    date.getMinutes() === 59 &&
    date.getSeconds() === 59 &&
    date.getMilliseconds() === 999
  ) {
    return DAY_MINUTES;
  }
  return date.getHours() * 60 + date.getMinutes();
}

export function formatClock(minute: number): string {
  if (minute >= DAY_MINUTES) return '24:00';
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTravelDate(date: Date): string {
  const month = date.toLocaleDateString('hu-HU', { month: 'short' });
  return `${formatYear(date.getFullYear())} · ${month} ${date.getDate()}. · ${formatClock(minuteOfDay(date))}`;
}

export function sliderValueAtPosition(
  position: number,
  width: number,
  minimum: number,
  maximum: number,
  step: number,
): number {
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0 || step <= 0) {
    return minimum;
  }
  const progress = Math.max(0, Math.min(1, position / width));
  const raw = minimum + progress * (maximum - minimum);
  return Math.max(minimum, Math.min(maximum, minimum + Math.round((raw - minimum) / step) * step));
}

export function sliderPositionForValue(
  value: number,
  width: number,
  minimum: number,
  maximum: number,
): number {
  if (width <= 0 || maximum <= minimum) return 0;
  return Math.max(0, Math.min(width, ((value - minimum) / (maximum - minimum)) * width));
}

export function yearTicks(minimum: number, maximum: number, minorStep = 100): number[] {
  const first = Math.ceil(minimum / minorStep) * minorStep;
  const ticks: number[] = [];
  for (let year = first; year <= maximum; year += minorStep) ticks.push(year);
  return ticks;
}
