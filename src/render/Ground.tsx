import { useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  SphereGeometry,
} from 'three';

import { horizontalToVector } from '@/core/astronomy';

const GROUND_RADIUS = 90;
const GLOW_RADIUS = GROUND_RADIUS * 0.97;
/** A horizont fölötti derengés magassága fokban. */
const GLOW_HEIGHT = 16;

const HORIZON_GROUND = new Color('#162a21');
const NADIR_GROUND = new Color('#040907');
const GLOW_COLOR = new Color('#4d6f93');

function geometryFrom(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  return g;
}

/** Determinisztikus, apró „zaj” 0..1 között (a föld foltos megjelenéséhez). */
function noise(x: number, z: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * A föld alsó félgömbje: a horizontnál halvány zöldesszürke, lefelé egyre sötétebb,
 * enyhén foltos, hogy ne egyetlen fekete lap legyen.
 */
function groundGeometry(): BufferGeometry {
  const g = new SphereGeometry(GROUND_RADIUS, 96, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const pos = g.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const depth = Math.min(1, Math.abs(y) / GROUND_RADIUS); // 0 a horizonton, 1 a nadírnál
    c.copy(HORIZON_GROUND).lerp(NADIR_GROUND, Math.pow(depth, 0.6));
    c.multiplyScalar(0.8 + 0.4 * noise(x, z) * (1 - depth * 0.6));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

/** A horizont fölötti halvány derengés: lefelé erős, felfelé elhalványuló sáv (additív színekkel). */
function glowGeometry(): BufferGeometry {
  const segments = 72;
  const rows = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  for (let j = 0; j <= rows; j += 1) {
    const altitude = (GLOW_HEIGHT * j) / rows;
    const strength = Math.pow(1 - j / rows, 2.2) * 0.75;
    for (let i = 0; i <= segments; i += 1) {
      const [x, y, z] = horizontalToVector({ azimuth: (360 * i) / segments, altitude });
      positions.push(x * GLOW_RADIUS, y * GLOW_RADIUS, z * GLOW_RADIUS);
      colors.push(GLOW_COLOR.r * strength, GLOW_COLOR.g * strength, GLOW_COLOR.b * strength);
    }
  }
  const indices: number[] = [];
  const stride = segments + 1;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(indices);
  return g;
}

/** Az adott magasságú (negatív: horizont alatti) körvonal. */
function ring(altitude: number): number[] {
  const points: number[] = [];
  for (let az = 0; az < 360; az += 3) {
    const [x, y, z] = horizontalToVector({ azimuth: az, altitude });
    points.push(x * GROUND_RADIUS * 0.99, y * GROUND_RADIUS * 0.99, z * GROUND_RADIUS * 0.99);
  }
  return points;
}

const GRID_ALTITUDES = [-15, -30, -45, -60, -75];

/**
 * A föld (alsó félgömb) eltakarja a horizont alatti csillagokat, és földfelületként látszik.
 * A `showGround` ki- és bekapcsolja a földet és a horizont fölötti derengést; a horizontvonal marad.
 * Az égtájbetűk külön, képernyő-réteg (CompassLabels).
 */
export function Ground({ showGround = true }: { showGround?: boolean }) {
  const { horizon, grid, ground, glow } = useMemo(
    () => ({
      horizon: geometryFrom(ring(0)),
      grid: GRID_ALTITUDES.map((altitude) => geometryFrom(ring(altitude))),
      ground: groundGeometry(),
      glow: glowGeometry(),
    }),
    [],
  );

  return (
    <group>
      {showGround ? (
        <>
          <mesh renderOrder={0} geometry={ground}>
            <meshBasicMaterial vertexColors side={BackSide} />
          </mesh>
          {grid.map((geometry, index) => (
            <lineLoop key={GRID_ALTITUDES[index]} geometry={geometry}>
              <lineBasicMaterial color="#2a4237" transparent opacity={0.45} />
            </lineLoop>
          ))}
          <mesh renderOrder={1} geometry={glow}>
            <meshBasicMaterial
              vertexColors
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </>
      ) : null}
      <lineLoop geometry={horizon}>
        <lineBasicMaterial color="#6f9482" />
      </lineLoop>
    </group>
  );
}
