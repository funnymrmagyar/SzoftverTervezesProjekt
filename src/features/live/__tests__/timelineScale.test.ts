import {
  clampTimelineTime,
  DAY_MS,
  HOUR_MS,
  timelineEdgeLabels,
  timelineTimeAtPosition,
  YEAR_MS,
} from '../timelineScale';

describe('idővonal skála', () => {
  const now = new Date(2026, 0, 1).getTime();

  it('a sáv közepe az aktuális időt jelenti, a szélei a kiválasztott tartományt', () => {
    const span = 2 * HOUR_MS;

    expect(timelineTimeAtPosition(now, 0, 100, span, now)).toBe(now - HOUR_MS);
    expect(timelineTimeAtPosition(now, 50, 100, span, now)).toBe(now);
    expect(timelineTimeAtPosition(now, 100, 100, span, now)).toBe(now + HOUR_MS);
  });

  it('a finom skálától a több évszázados tartományig skálázható', () => {
    const widestSpan = 1000 * YEAR_MS;

    expect(timelineTimeAtPosition(now, 0, 100, widestSpan, now)).toBe(now - 500 * YEAR_MS);
    expect(timelineTimeAtPosition(now, 100, 100, widestSpan, now)).toBe(now + 500 * YEAR_MS);
  });

  it('az időt a támogatott ötszáz éves tartományon belül tartja', () => {
    expect(clampTimelineTime(now + 600 * YEAR_MS, now)).toBe(now + 500 * YEAR_MS);
    expect(clampTimelineTime(now - 600 * YEAR_MS, now)).toBe(now - 500 * YEAR_MS);
  });

  it('a kiválasztott időtartamhoz illő végpontfeliratokat ad', () => {
    expect(timelineEdgeLabels(2 * HOUR_MS)).toEqual({ start: '−1 óra', end: '+1 óra' });
    expect(timelineEdgeLabels(30 * DAY_MS)).toEqual({ start: '−15 nap', end: '+15 nap' });
    expect(timelineEdgeLabels(100 * YEAR_MS)).toEqual({ start: '−50 év', end: '+50 év' });
  });
});
