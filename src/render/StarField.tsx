import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';

import type { Star } from '@/core/models';
import { DEFAULT_VIEW, useViewStore } from '@/state/useViewStore';

import { buildStarBuffers } from './skyBuffers';

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    // Kerek, lágy szélű pont: középen fényes, kifelé halványul.
    float d = length(gl_PointCoord - vec2(0.5));
    // A smoothstep fordított élértékei GLSL-ben nem definiáltak, és egyes GPU-kon
    // emiatt teljesen eltűnhetnek a csillagok.
    float alpha = 1.0 - smoothstep(0.05, 0.5, d);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/** A csillagok egyetlen pontfelhőként (egy draw call) — az égbolt-gömb egyenlítői rendszerében. */
export function StarField({ stars }: { stars: readonly Star[] }) {
  const geometry = useMemo(() => {
    const { positions, sizes, colors } = buildStarBuffers(stars);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('aSize', new BufferAttribute(sizes, 1));
    g.setAttribute('aColor', new BufferAttribute(colors, 3));
    return g;
  }, [stars]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uScale: { value: 1 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Nagyításkor a csillagok kicsit nőnek, hogy a halványak is előbukkanjanak.
  useFrame(({ viewport }) => {
    const { fov } = useViewStore.getState();
    material.uniforms.uScale.value = viewport.dpr * Math.sqrt(DEFAULT_VIEW.fov / fov);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
