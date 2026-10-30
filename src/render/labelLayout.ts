import { applyMat3, DEG, equatorialToVector, horizontalToVector } from '@/core/astronomy';
import type { LineSegment } from '@/core/catalog';
import type { Constellation, Mat3, Vec3 } from '@/core/models';
import type { ViewState } from '@/state/useViewStore';

/*
 * Csillagképnevek (feliratok) elhelyezése — tiszta függvények, three.js és React nélkül.
 *
 * A feliratokat nem a 3D jelenetbe rajzoljuk, hanem a képernyő fölé, sima szövegként:
 * így weben és telefonon ugyanúgy működik, és nem kell betűtípust tölteni a GPU-ra.
 * Ehhez ugyanazt a vetítést számoljuk ki, amit a three.js kamera is csinál.
 */

/** Egy csillagkép feliratának helye az égbolt-gömbön. */
export interface LabelAnchor {
  id: string;
  name: string;
  /** Egységvektor az egyenlítői rendszerben (ugyanott, ahol a csillagok vannak). */
  direction: Vec3;
  /** Hány csillagból áll az alakzat — a nagyobbak felirata élvez elsőbbséget. */
  starCount: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** A képernyőre került felirat; x, y a szöveg közepe képpontban. */
export interface PlacedLabel extends ScreenPoint {
  id: string;
  name: string;
}

export const LABEL_FONT_SIZE = 12;
export const LABEL_LINE_HEIGHT = 16;

const UP: Vec3 = [0, 1, 0];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Csillagképenként a vonalakban szereplő csillagok irányának átlaga: ide kerül a név.
 * A sorrend a kultúra sorrendje; a vonal nélküli csillagképek kimaradnak.
 */
export function constellationAnchors(
  segments: readonly LineSegment[],
  constellations: readonly Constellation[],
): LabelAnchor[] {
  // csillagkép → (HIP → irány); egy csillag többször is szerepelhet a vonalakban, de csak egyszer számít
  const starsById = new Map<string, Map<number, Vec3>>();
  for (const { constellationId, from, to } of segments) {
    let stars = starsById.get(constellationId);
    if (!stars) {
      stars = new Map();
      starsById.set(constellationId, stars);
    }
    for (const star of [from, to]) {
      if (!stars.has(star.hip)) stars.set(star.hip, equatorialToVector(star.ra, star.dec));
    }
  }

  const anchors: LabelAnchor[] = [];
  for (const { id, name } of constellations) {
    const stars = starsById.get(id);
    if (!stars) continue;
    const sum: Vec3 = [0, 0, 0];
    for (const v of stars.values()) {
      sum[0] += v[0];
      sum[1] += v[1];
      sum[2] += v[2];
    }
    if (Math.hypot(sum[0], sum[1], sum[2]) < 1e-9) continue;
    anchors.push({ id, name, direction: normalize(sum), starCount: stars.size });
  }
  return anchors;
}

/**
 * Világbeli irány → képernyőpont, pontosan úgy, ahogy a three.js PerspectiveCamera vetít
 * (a kamera az origóban áll, felfelé a zenit, a `fov` a függőleges látómező).
 * A kamera mögötti pontokra null-t ad.
 */
export function projectToScreen(
  world: Vec3,
  view: ViewState,
  { width, height }: Viewport,
): ScreenPoint | null {
  const forward = horizontalToVector(view);
  const right = normalize(cross(forward, UP));
  const up = cross(right, forward);

  const depth = dot(world, forward);
  if (depth <= 1e-6) return null;

  const tanHalf = Math.tan((view.fov * DEG) / 2);
  const ndcX = dot(world, right) / (depth * tanHalf * (width / height));
  const ndcY = dot(world, up) / (depth * tanHalf);
  return { x: ((ndcX + 1) / 2) * width, y: ((1 - ndcY) / 2) * height };
}

/** A felirat becsült szélessége képpontban (betűnként kb. 0,6 betűméret, plusz egy kis hely). */
export function estimateLabelWidth(name: string): number {
  return Math.ceil(name.length * LABEL_FONT_SIZE * 0.6) + 8;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Ha a helyén már van felirat, ennyivel toljuk el (előbb lefelé, aztán felfelé). */
const NUDGES = [0, LABEL_LINE_HEIGHT, -LABEL_LINE_HEIGHT];

/**
 * A látható feliratok képernyő-pozíciói.
 *  - a horizont alatti csillagképek neve nem látszik (a föld a csillagokat is eltakarja);
 *  - a képernyőn kívüli feliratok kimaradnak;
 *  - az egymásra lógó feliratok közül a nagyobb csillagkép marad a helyén, a kisebbet
 *    egy sorral eltoljuk, és ha úgy sem fér el, elhagyjuk;
 *  - a kiválasztott csillagkép (priorityId) neve mindenkit megelőz.
 */
export function layoutLabels(
  anchors: readonly LabelAnchor[],
  matrix: Mat3,
  view: ViewState,
  viewport: Viewport,
  /** A kiválasztott csillagkép neve mindig elsőként kerül a helyére. */
  priorityId: string | null = null,
): PlacedLabel[] {
  const byPriority = [...anchors].sort(
    (a, b) =>
      Number(b.id === priorityId) - Number(a.id === priorityId) || b.starCount - a.starCount,
  );
  const taken: Box[] = [];
  const placed: PlacedLabel[] = [];

  for (const { id, name, direction } of byPriority) {
    const world = applyMat3(matrix, direction);
    if (world[1] <= 0) continue;

    const p = projectToScreen(world, view, viewport);
    if (!p || p.x < 0 || p.x > viewport.width || p.y < 0 || p.y > viewport.height) continue;

    const halfWidth = estimateLabelWidth(name) / 2;
    for (const dy of NUDGES) {
      const y = p.y + dy;
      const box = {
        left: p.x - halfWidth,
        right: p.x + halfWidth,
        top: y - LABEL_LINE_HEIGHT / 2,
        bottom: y + LABEL_LINE_HEIGHT / 2,
      };
      if (!taken.some((t) => overlaps(t, box))) {
        taken.push(box);
        placed.push({ id, name, x: p.x, y });
        break;
      }
    }
  }
  return placed;
}
