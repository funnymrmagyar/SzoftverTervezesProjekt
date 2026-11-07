import { clampToRange, formatYear, shiftDays, withTimeOfDay, withYear } from '..';

function localDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function fields(date: Date) {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

describe('astronomical time helpers', () => {
  it('keeps month, day, and time when changing year, clamping leap day if needed', () => {
    const result = withYear(localDate(2024, 1, 29, 17, 42), 2025);
    expect(fields(result)).toEqual([2025, 2, 28, 17, 42]);
  });

  it('supports year zero, negative years, and years from 0 to 99', () => {
    expect(withYear(localDate(2000, 0, 1), 0).getFullYear()).toBe(0);
    expect(withYear(localDate(2000, 0, 1), -44).getFullYear()).toBe(-44);
    expect(withYear(localDate(2000, 0, 1), 99).getFullYear()).toBe(99);
    expect(formatYear(-44)).toBe('i. e. 45');
    expect(formatYear(0)).toBe('i. e. 1');
  });

  it('sets minute-of-day without changing the local calendar day', () => {
    expect(fields(withTimeOfDay(localDate(99, 6, 12, 21, 30), 135))).toEqual([99, 7, 12, 2, 15]);
  });

  it('represents 24:00 at the end of the selected day', () => {
    const result = withTimeOfDay(localDate(2026, 5, 14, 22, 30), 1440);
    expect(fields(result)).toEqual([2026, 6, 14, 23, 59]);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it('shifts calendar days across leap days and year zero', () => {
    expect(fields(shiftDays(localDate(0, 1, 28, 12), 2))).toEqual([0, 3, 1, 12, 0]);
    expect(shiftDays(localDate(-1, 11, 31), 1).getFullYear()).toBe(0);
  });

  it('clamps dates and target years to the supported range', () => {
    expect(withYear(localDate(0, 0, 1), -5000).getFullYear()).toBe(-1000);
    expect(withYear(localDate(0, 0, 1), 5000).getFullYear()).toBe(3000);
    expect(fields(clampToRange(localDate(-1001, 4, 2)))).toEqual([-1000, 1, 1, 0, 0]);
    expect(fields(clampToRange(localDate(3001, 4, 2))).slice(0, 5)).toEqual([3000, 12, 31, 23, 59]);
  });
});
