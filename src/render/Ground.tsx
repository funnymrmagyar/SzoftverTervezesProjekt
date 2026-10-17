import { useMemo } from 'react';
import { BackSide, BufferAttribute, BufferGeometry } from 'three';

import { horizontalToVector } from '@/core/astronomy';

const GROUND_RADIUS = 90;

function geometryFrom(points: number[]) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  return g;
}

/** Függőleges jelölő a horizonton az adott azimutnál. */
function tick(azimuth: number, height: number): number[] {
  const r = GROUND_RADIUS * 0.99;
  const [x0, y0, z0] = horizontalToVector({ azimuth, altitude: 0 });
  const [x1, y1, z1] = horizontalToVector({ azimuth, altitude: height });
  return [x0 * r, y0 * r, z0 * r, x1 * r, y1 * r, z1 * r];
}

/**
 * A föld (alsó félgömb) eltakarja a horizont alatti csillagokat.
 * Horizontvonal és égtájjelölők; észak piros.
 */
export function Ground() {
  const { horizon, ticks, north } = useMemo(() => {
    const ring: number[] = [];
    for (let az = 0; az < 360; az += 2) {
      const [x, y, z] = horizontalToVector({ azimuth: az, altitude: 0 });
      ring.push(x * GROUND_RADIUS * 0.99, y, z * GROUND_RADIUS * 0.99);
    }
    const t: number[] = [];
    for (let az = 45; az < 360; az += 45) t.push(...tick(az, az % 90 === 0 ? 3 : 1.5));
    return {
      horizon: geometryFrom(ring),
      ticks: geometryFrom(t),
      north: geometryFrom(tick(0, 5)),
    };
  }, []);

  return (
    <group>
      <mesh renderOrder={0}>
        <sphereGeometry args={[GROUND_RADIUS, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color="#08120f" side={BackSide} />
      </mesh>
      <lineLoop geometry={horizon}>
        <lineBasicMaterial color="#4b6b5c" />
      </lineLoop>
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color="#8fb3a2" />
      </lineSegments>
      <lineSegments geometry={north}>
        <lineBasicMaterial color="#ff5a5a" />
      </lineSegments>
    </group>
  );
}
