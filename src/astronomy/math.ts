import type { Mat3, Vec3 } from '../models';

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Szög normalizálása a [0, 360) tartományba. */
export function normalizeDegrees(angle: number): number {
  const a = angle % 360;
  return a < 0 ? a + 360 : a;
}

/** Mátrix × vektor (row-major 3×3). */
export function applyMat3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Transzponált — forgatási mátrixnál ez egyben az inverz is. */
export function transposeMat3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r as Mat3;
}

export function determinantMat3(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/** Két vektor által bezárt szög fokban. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  const c = Math.min(1, Math.max(-1, dot / (la * lb)));
  return Math.acos(c) * RAD;
}
