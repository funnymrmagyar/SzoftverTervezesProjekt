import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';

import type { LineSegment } from '@/core/catalog';

import { buildLineBuffer } from './skyBuffers';

interface Props {
  segments: readonly LineSegment[];
  color: string;
}

/** Egy kultúra összes csillagképvonala, egyetlen LineSegments objektumként. */
export function ConstellationLines({ segments, color }: Props) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(buildLineBuffer(segments), 3));
    return g;
  }, [segments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={1}>
      <lineBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
    </lineSegments>
  );
}
