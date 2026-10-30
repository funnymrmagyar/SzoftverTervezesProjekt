import { formatLocation } from '@/core/locations';
import { formatDateTime } from '@/features/live/formatTime';

import { useSkyStore } from '../useSkyStore';
import { DEFAULT_VIEW, dragView, MAX_ALTITUDE, MAX_FOV, MIN_FOV, zoomView } from '../useViewStore';

describe('nézet (kamera) logika', () => {
  it('jobbra húzva a kamera nyugat felé (kisebb azimut) fordul', () => {
    const v = dragView({ azimuth: 180, altitude: 30, fov: 60 }, 100, 0, 600);
    expect(v.azimuth).toBeCloseTo(170);
  });

  it('az azimut körbefordul 0/360-nál', () => {
    expect(dragView({ azimuth: 5, altitude: 0, fov: 60 }, 100, 0, 600).azimuth).toBeCloseTo(355);
  });

  it('a magasság nem megy a zenit fölé', () => {
    expect(dragView({ azimuth: 0, altitude: 80, fov: 60 }, 0, 10000, 600).altitude).toBe(
      MAX_ALTITUDE,
    );
  });

  it('a nagyítás a látómező határain belül marad', () => {
    expect(zoomView(DEFAULT_VIEW, 100).fov).toBe(MAX_FOV);
    expect(zoomView(DEFAULT_VIEW, 0.01).fov).toBe(MIN_FOV);
    expect(zoomView({ ...DEFAULT_VIEW, fov: 60 }, 0.5).fov).toBe(30);
  });
});

describe('useSkyStore', () => {
  beforeEach(() =>
    useSkyStore.setState({
      manualTime: null,
      showLines: true,
      showLabels: true,
      cultureId: 'hungarian',
      selectedConstellationId: null,
    }),
  );

  it('csillagkép kiválasztható, és kultúraváltáskor a kiválasztás megszűnik', () => {
    useSkyStore.getState().selectConstellation('gonc');
    expect(useSkyStore.getState().selectedConstellationId).toBe('gonc');
    useSkyStore.getState().selectConstellation(null);
    expect(useSkyStore.getState().selectedConstellationId).toBeNull();
    useSkyStore.getState().selectConstellation('gonc');
    useSkyStore.getState().setCulture('western');
    expect(useSkyStore.getState().selectedConstellationId).toBeNull();
  });

  it('az időléptetés élő módból a megadott „most”-hoz képest lép', () => {
    const now = Date.UTC(2026, 9, 7, 20, 0);
    useSkyStore.getState().shiftHours(2, now);
    expect(useSkyStore.getState().manualTime).toBe(now + 2 * 3600 * 1000);
    useSkyStore.getState().shiftHours(-1, now + 999999);
    expect(useSkyStore.getState().manualTime).toBe(now + 3600 * 1000);
    useSkyStore.getState().resetTimeToNow();
    expect(useSkyStore.getState().manualTime).toBeNull();
  });

  it('a vonalak ki-be kapcsolhatók', () => {
    useSkyStore.getState().toggleLines();
    expect(useSkyStore.getState().showLines).toBe(false);
  });

  it('a csillagképnevek alapból látszanak, és ki-be kapcsolhatók', () => {
    expect(useSkyStore.getState().showLabels).toBe(true);
    useSkyStore.getState().toggleLabels();
    expect(useSkyStore.getState().showLabels).toBe(false);
    useSkyStore.getState().toggleLabels();
    expect(useSkyStore.getState().showLabels).toBe(true);
  });
});

describe('formázás', () => {
  it('magyar dátumformátum', () => {
    expect(formatDateTime(new Date(2026, 9, 7, 9, 5))).toBe('2026. 10. 07. 09:05');
  });

  it('név nélküli helynél koordinátákat ír', () => {
    expect(formatLocation({ latitude: 47.5, longitude: -3.25 })).toBe('47.50° É, 3.25° Ny');
    expect(formatLocation({ latitude: 1, longitude: 1, label: 'Szeged' })).toBe('Szeged');
  });
});
