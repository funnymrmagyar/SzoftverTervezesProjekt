import type { StarCatalog } from '@/core/catalog/StarCatalog';

import type { GameConstellation } from './pool';
import { fitProjection, type ChartPoint } from './skyProjection';

/** Egy csillag a térképen. */
export interface PlacedStar extends ChartPoint {
  hip: number;
  mag: number;
  bv: number;
  name?: string;
  /** A játszott csillagkép csillaga (nem háttér). */
  figure: boolean;
}

export interface ChartModel {
  /** Rajzolási sorrendben: a halvány csillagok elöl, a fényesek és az alakzat a végén (felül). */
  stars: PlacedStar[];
  position: ReadonlyMap<number, ChartPoint>;
}

interface ChartOptions {
  /** Ennél halványabb háttércsillagot nem rajzolunk. */
  fieldMagLimit?: number;
  maxFieldStars?: number;
}

/** A csillagkép és a körülötte lévő háttércsillagok elhelyezése a térképen. */
export function buildChartModel(
  target: GameConstellation,
  catalog: Pick<StarCatalog, 'all'>,
  { fieldMagLimit = 5.8, maxFieldStars = 90 }: ChartOptions = {},
): ChartModel {
  const projection = fitProjection(target.stars);
  const figureHips = new Set(target.stars.map((s) => s.hip));
  const position = new Map<number, ChartPoint>();

  const figure: PlacedStar[] = [];
  for (const star of target.stars) {
    const p = projection.project(star);
    if (!p) continue;
    position.set(star.hip, p);
    figure.push({ ...p, hip: star.hip, mag: star.mag, bv: star.bv, name: star.name, figure: true });
  }

  const margin = 0.02;
  const field: PlacedStar[] = [];
  for (const star of catalog.all()) {
    if (star.mag > fieldMagLimit || figureHips.has(star.hip)) continue;
    const p = projection.project(star);
    if (!p || p.x < -margin || p.x > 1 + margin || p.y < -margin || p.y > 1 + margin) continue;
    field.push({ ...p, hip: star.hip, mag: star.mag, bv: star.bv, name: star.name, figure: false });
  }
  field.sort((a, b) => a.mag - b.mag);

  const byFaintFirst = (a: PlacedStar, b: PlacedStar) => b.mag - a.mag;
  return {
    stars: [...field.slice(0, maxFieldStars).sort(byFaintFirst), ...figure.sort(byFaintFirst)],
    position,
  };
}
