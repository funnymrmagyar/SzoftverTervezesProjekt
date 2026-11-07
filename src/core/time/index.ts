export const YEAR_MIN = -1000;
export const YEAR_MAX = 3000;

const MIN_TIME = createLocalDate(YEAR_MIN, 0, 1).getTime();
const MAX_TIME = createLocalDate(YEAR_MAX, 11, 31, 23, 59, 59, 999).getTime();

function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(hour, minute, second, millisecond);
  return date;
}

function daysInMonth(year: number, month: number): number {
  return createLocalDate(year, month + 1, 0).getDate();
}

export function clampToRange(date: Date): Date {
  const timestamp = date.getTime();
  if (timestamp <= MIN_TIME) return new Date(MIN_TIME);
  if (timestamp >= MAX_TIME) return new Date(MAX_TIME);
  return new Date(timestamp);
}

export function withYear(date: Date, year: number): Date {
  const boundedYear = Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.trunc(year)));
  const month = date.getMonth();
  const day = Math.min(date.getDate(), daysInMonth(boundedYear, month));
  return clampToRange(
    createLocalDate(
      boundedYear,
      month,
      day,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  );
}

export function withTimeOfDay(date: Date, minuteOfDay: number): Date {
  const boundedMinute = Math.min(1440, Math.max(0, Math.trunc(minuteOfDay)));
  return clampToRange(
    createLocalDate(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      boundedMinute === 1440 ? 23 : Math.floor(boundedMinute / 60),
      boundedMinute === 1440 ? 59 : boundedMinute % 60,
      boundedMinute === 1440 ? 59 : 0,
      boundedMinute === 1440 ? 999 : 0,
    ),
  );
}

export function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date.getTime());
  shifted.setDate(shifted.getDate() + Math.trunc(days));
  return clampToRange(shifted);
}

export function formatYear(year: number): string {
  return year <= 0 ? `i. e. ${1 - year}` : String(year);
}
