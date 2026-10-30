import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';

import type { LineSegment } from '@/core/catalog';

import { buildLineBuffer } from './skyBuffers';

interface Props {
  segments: readonly LineSegment[];
  color: string;
  /** Átlátszatlanság (0–1); a kiemelt csillagkép erősebben látszik. */
  opacity?: number;
  /** Rajzolási sorrend: a kiemelés a többi vonal fölé kerül. */
  renderOrder?: number;
}

/** Csillagképvonalak egyetlen LineSegments objektumként (egy kultúra, vagy a kiemelt csillagkép). */
export function ConstellationLines({ segments, color, opacity = 0.6, renderOrder = 1 }: Props) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(buildLineBuffer(segments), 3));
    return g;
  }, [segments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}
