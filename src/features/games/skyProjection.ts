import { normalizeDegrees } from '@/core/astronomy/math';
import type { EquatorialCoords } from '@/core/models';

const DEG = Math.PI / 180;

/** A játékok csillagtérképének képaránya (szélesség / magasság). */
export const CHART_ASPECT = 4 / 3;

/** Két égi pont szögtávolsága fokban. */
export function angularSeparationDeg(a: EquatorialCoords, b: EquatorialCoords): number {
  const d1 = a.dec * DEG;
  const d2 = b.dec * DEG;
  const cos =
    Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos((a.ra - b.ra) * DEG);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / DEG;
}

/**
 * A pontok átlagos iránya. Egységvektorokat átlagol, így a 0°/360° rektaszcenziónál
 * átnyúló csillagképeknél sem romlik el az eredmény.
 */
export function meanDirection(points: readonly EquatorialCoords[]): EquatorialCoords {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += Math.cos(p.dec * DEG) * Math.cos(p.ra * DEG);
    y += Math.cos(p.dec * DEG) * Math.sin(p.ra * DEG);
    z += Math.sin(p.dec * DEG);
  }
  const length = Math.hypot(x, y, z);
  if (length < 1e-9) return points[0] ?? { ra: 0, dec: 0 };
  return {
    ra: normalizeDegrees(Math.atan2(y, x) / DEG),
    dec: Math.asin(z / length) / DEG,
  };
}

/** Egy pont helye a térképen: 0–1 közötti, a doboz bal felső sarkától mérve. */
export interface ChartPoint {
  x: number;
  y: number;
}

export interface Projection {
  center: EquatorialCoords;
  /** null, ha a pont a vetítősík „mögött” van (a középponttól ~87°-nál messzebb). */
  project(p: EquatorialCoords): ChartPoint | null;
}

interface FitOptions {
  aspect?: number;
  /** A doboz mekkora részét hagyjuk szabadon minden oldalon (0–0,5). */
  padding?: number;
  /** Ennél kisebb alakzatot nem nagyítunk tovább (fok), hogy ne legyen üres a háttér. */
  minSpanDeg?: number;
}

/**
 * Gnomonikus (érintősíkra vetítő) leképezés a pontok közepe körül.
 * Az égboltot kívülről nézve ábrázoljuk: észak fent, kelet balra, mint a csillagtérképeken.
 * A pontokat úgy méretezi, hogy pontosan beférjenek a dobozba.
 */
export function fitProjection(
  points: readonly EquatorialCoords[],
  { aspect = CHART_ASPECT, padding = 0.12, minSpanDeg = 3 }: FitOptions = {},
): Projection {
  const center = meanDirection(points);
  const d0 = center.dec * DEG;

  const tangent = (p: EquatorialCoords): { u: number; v: number } | null => {
    const dra = (p.ra - center.ra) * DEG;
    const d = p.dec * DEG;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dra);
    if (cosc < 0.05) return null;
    const xi = (Math.cos(d) * Math.sin(dra)) / cosc;
    const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dra)) / cosc;
    return { u: -xi, v: -eta };
  };

  const projected = points.map(tangent).filter((p): p is { u: number; v: number } => p !== null);
  const us = projected.map((p) => p.u);
  const vs = projected.map((p) => p.v);
  const minU = Math.min(...us, 0);
  const maxU = Math.max(...us, 0);
  const minV = Math.min(...vs, 0);
  const maxV = Math.max(...vs, 0);
  const minSpan = minSpanDeg * DEG;
  const spanU = Math.max(maxU - minU, minSpan);
  const spanV = Math.max(maxV - minV, minSpan);
  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;
  const usable = 1 - 2 * padding;
  const scale = Math.min((aspect * usable) / spanU, usable / spanV);

  return {
    center,
    project(p) {
      const t = tangent(p);
      if (!t) return null;
      return {
        x: (aspect / 2 + (t.u - centerU) * scale) / aspect,
        y: 0.5 + (t.v - centerV) * scale,
      };
    },
  };
}

/** Egy két pont közötti vonal téglalapja és elforgatása (View-alapú rajzoláshoz). */
export function lineBox(x1: number, y1: number, x2: number, y2: number, thickness: number) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  return {
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2 - thickness / 2,
    width: length,
    height: thickness,
    angleRad: Math.atan2(y2 - y1, x2 - x1),
  };
}
