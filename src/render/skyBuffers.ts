import { equatorialToVector } from '@/core/astronomy';
import type { LineSegment } from '@/core/catalog';
import type { Star } from '@/core/models';

import { bvToColor, starBrightness, starPointSize } from './starAppearance';

/** Az égbolt-gömb sugara a 3D jelenetben. */
export const SKY_RADIUS = 100;

export interface StarBuffers {
  positions: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
}

/** A csillagokból GPU-ra tölthető tömbök (pozíció, méret, szín) — csillagonként egy pont. */
export function buildStarBuffers(stars: readonly Star[]): StarBuffers {
  const positions = new Float32Array(stars.length * 3);
  const sizes = new Float32Array(stars.length);
  const colors = new Float32Array(stars.length * 3);

  stars.forEach((star, i) => {
    const [x, y, z] = equatorialToVector(star.ra, star.dec);
    positions.set([x * SKY_RADIUS, y * SKY_RADIUS, z * SKY_RADIUS], i * 3);
    sizes[i] = starPointSize(star.mag);
    const brightness = starBrightness(star.mag);
    const [r, g, b] = bvToColor(star.bv);
    colors.set([r * brightness, g * brightness, b * brightness], i * 3);
  });

  return { positions, sizes, colors };
}

/** Vonalszakaszok → pozíciótömb (szakaszonként 2 pont), a THREE.LineSegments-hez. */
export function buildLineBuffer(segments: readonly LineSegment[]): Float32Array {
  const r = SKY_RADIUS * 0.999; // a csillagok picit „elöl” legyenek
  const out = new Float32Array(segments.length * 6);
  segments.forEach(({ from, to }, i) => {
    const a = equatorialToVector(from.ra, from.dec);
    const b = equatorialToVector(to.ra, to.dec);
    out.set([a[0] * r, a[1] * r, a[2] * r, b[0] * r, b[1] * r, b[2] * r], i * 6);
  });
  return out;
}
