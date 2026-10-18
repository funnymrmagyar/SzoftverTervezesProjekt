/*
 * Csillagok megjelenése: fényrend → pontméret és fényerő, B–V színindex → szín.
 * Tiszta függvények, three.js nélkül — így egységtesztelhetők.
 */

export type RGB = [number, number, number];

/** Pontméret (CSS pixel, alap nagyításnál) a fényrend alapján. */
export function starPointSize(mag: number): number {
  return Math.min(9, Math.max(1.6, 6.8 - 0.85 * mag));
}

/** Relatív fényerő 0–1 között: a halvány csillagok elhalványulnak. */
export function starBrightness(mag: number): number {
  return Math.min(1, Math.max(0.28, 1 - (mag - 3) * 0.2));
}

/** Közelítő B–V → RGB táblázat (kék óriásoktól a vörös törpékig). */
const BV_TABLE: [number, RGB][] = [
  [-0.4, [0.62, 0.71, 1.0]],
  [0.0, [0.8, 0.86, 1.0]],
  [0.3, [0.95, 0.96, 1.0]],
  [0.6, [1.0, 0.96, 0.87]],
  [1.0, [1.0, 0.86, 0.68]],
  [1.5, [1.0, 0.74, 0.5]],
  [2.0, [1.0, 0.62, 0.4]],
];

/** B–V színindex → RGB (0–1), lineáris interpolációval a táblázat pontjai között. */
export function bvToColor(bv: number): RGB {
  if (bv <= BV_TABLE[0][0]) return [...BV_TABLE[0][1]];
  for (let i = 1; i < BV_TABLE.length; i++) {
    const [b1, c1] = BV_TABLE[i];
    if (bv <= b1) {
      const [b0, c0] = BV_TABLE[i - 1];
      const t = (bv - b0) / (b1 - b0);
      return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * t) as RGB;
    }
  }
  return [...BV_TABLE[BV_TABLE.length - 1][1]];
}
