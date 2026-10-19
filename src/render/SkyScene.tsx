import './polyfills'; // a three.js előtt kell betölteni, ld. polyfills.ts
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Group, PerspectiveCamera } from 'three';

import { horizontalToVector, skyRotationMatrix } from '@/core/astronomy';
import { getSkyCultures, getStarCatalog } from '@/core/catalog';
import type { GeoLocation, Mat3 } from '@/core/models';
import { useViewStore, type ViewState } from '@/state/useViewStore';
import { colors } from '@/ui/theme';

import { ConstellationLines } from './ConstellationLines';
import { Ground } from './Ground';
import { StarField } from './StarField';

interface SkySceneProps {
  date: Date;
  location: GeoLocation;
  cultureId: string;
  showLines: boolean;
}

/** A kamerát a nézet-store-hoz köti (irány, látómező). Csak változáskor rajzol újra. */
function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const apply = ({ azimuth, altitude, fov }: ViewState) => {
      const [x, y, z] = horizontalToVector({ azimuth, altitude });
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.up.set(0, 1, 0);
      camera.lookAt(x, y, z);
      invalidate();
    };
    apply(useViewStore.getState());
    return useViewStore.subscribe(apply);
  }, [camera, invalidate]);

  return null;
}

/** Az égbolt-gömb: a gyerekei egyenlítői koordinátákban vannak, ezt a csoportot forgatjuk. */
function SkyDome({ matrix, children }: { matrix: Mat3; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const m = matrix;
    // prettier-ignore
    ref.current?.matrix.set(
      m[0], m[1], m[2], 0,
      m[3], m[4], m[5], 0,
      m[6], m[7], m[8], 0,
      0, 0, 0, 1,
    );
    if (ref.current) ref.current.matrixWorldNeedsUpdate = true;
    invalidate();
  }, [matrix, invalidate]);

  return (
    <group ref={ref} matrixAutoUpdate={false}>
      {children}
    </group>
  );
}

export function SkyScene({ date, location, cultureId, showLines }: SkySceneProps) {
  const stars = getStarCatalog().all();
  const repo = getSkyCultures();
  const culture = repo.get(cultureId);
  const segments = useMemo(() => repo.lineSegments(cultureId), [repo, cultureId]);
  const matrix = useMemo(() => skyRotationMatrix(date, location), [date, location]);

  return (
    <Canvas
      style={{ flex: 1 }}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0] }}
    >
      <color attach="background" args={[colors.sky]} />
      <CameraRig />
      <SkyDome matrix={matrix}>
        {showLines && culture ? (
          <ConstellationLines segments={segments} color={colors.constellationLine} />
        ) : null}
        <StarField stars={stars} />
      </SkyDome>
      <Ground />
    </Canvas>
  );
}
