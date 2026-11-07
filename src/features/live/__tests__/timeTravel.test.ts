import {
  DAY_MINUTES,
  formatClock,
  formatTravelDate,
  minuteOfDay,
  sliderPositionForValue,
  sliderValueAtPosition,
  yearTicks,
} from '../timeTravel';

function localDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

describe('time travel controls', () => {
  it('formats astronomical years and local Hungarian date/time', () => {
    expect(formatTravelDate(localDate(2026, 5, 14, 22, 30))).toBe('2026 · jún. 14. · 22:30');
    expect(formatTravelDate(localDate(-44, 2, 15, 8, 5))).toBe('i. e. 45 · márc. 15. · 08:05');
  });

  it('represents 24:00 on the same calendar day', () => {
    const date = localDate(2026, 5, 14, 22, 30);
    date.setHours(23, 59, 59, 999);
    expect(minuteOfDay(date)).toBe(DAY_MINUTES);
    expect(formatClock(DAY_MINUTES)).toBe('24:00');
  });

  it('maps slider endpoints and rounds the time slider to five-minute increments', () => {
    expect(sliderValueAtPosition(0, 100, -1000, 3000, 1)).toBe(-1000);
    expect(sliderValueAtPosition(100, 100, -1000, 3000, 1)).toBe(3000);
    expect(sliderValueAtPosition(Number.NaN, 100, 0, 1440, 5)).toBe(0);
    expect(sliderValueAtPosition(33, 100, 0, 1440, 5) % 5).toBe(0);
    expect(sliderPositionForValue(1000, 400, -1000, 3000)).toBe(200);
  });

  it('places minor year ticks every 100 years', () => {
    const ticks = yearTicks(-1000, 3000);
    expect(ticks).toHaveLength(41);
    expect(ticks[0]).toBe(-1000);
    expect(ticks.at(-1)).toBe(3000);
    expect(ticks.every((year) => year % 100 === 0)).toBe(true);
  });
});
