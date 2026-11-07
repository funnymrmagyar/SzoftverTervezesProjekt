import {
  calculateScrollbarMetrics,
  calculateThreeZoneWidths,
  getSheetSnapHeights,
  nearestSheetSnap,
  scrollOffsetForTrackPosition,
} from '../geometry';

describe('calculateThreeZoneWidths', () => {
  it('keeps the side zones equal and gives the remainder to the center', () => {
    expect(calculateThreeZoneWidths(400, 56)).toEqual({ sideWidth: 56, centerWidth: 288 });
  });

  it('limits the side zones when the viewport is narrow', () => {
    expect(calculateThreeZoneWidths(80, 56)).toEqual({ sideWidth: 40, centerWidth: 0 });
  });
});

describe('scrollbar geometry', () => {
  it('keeps a minimum-sized thumb and maps the scroll offset to the track', () => {
    expect(calculateScrollbarMetrics(1000, 200, 200, 400)).toEqual({
      thumbSize: 44,
      thumbRange: 156,
      maxOffset: 800,
      progress: 0.5,
      thumbOffset: 78,
    });
  });

  it('clamps track dragging and handles content that does not scroll', () => {
    const metrics = calculateScrollbarMetrics(100, 100, 200, 0);
    expect(metrics).toEqual({
      thumbSize: 200,
      thumbRange: 0,
      maxOffset: 0,
      progress: 0,
      thumbOffset: 0,
    });
    expect(scrollOffsetForTrackPosition(100, metrics)).toBe(0);
  });

  it('maps track positions to bounded content offsets', () => {
    const metrics = calculateScrollbarMetrics(1000, 200, 200, 0);
    expect(scrollOffsetForTrackPosition(-100, metrics)).toBe(0);
    expect(scrollOffsetForTrackPosition(200, metrics)).toBe(800);
  });
});

describe('sheet snap geometry', () => {
  it('provides closed, half, and full heights', () => {
    expect(getSheetSnapHeights(800)).toEqual({ closed: 48, half: 400, full: 800 });
  });

  it('selects the nearest snap point', () => {
    expect(nearestSheetSnap(40, 800)).toBe('closed');
    expect(nearestSheetSnap(300, 800)).toBe('half');
    expect(nearestSheetSnap(750, 800)).toBe('full');
    expect(nearestSheetSnap(750, 800, 'half')).toBe('half');
  });
});
