import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { SceneContent, sceneCenter } from './Scene3D';

export function Viewport3D() {
  const walls = useFloorPlanStore((s) => s.walls);
  const openings = useFloorPlanStore((s) => s.openings);
  const wallHeight = useFloorPlanStore((s) => s.wallHeight);

  const center = useMemo(() => sceneCenter(walls), [walls]);
  const cameraPos = useMemo<[number, number, number]>(
    () => [center[0] + 6, center[1] + 4, center[2] + 6],
    [center],
  );

  return (
    <div className="viewport-3d">
      <h2 className="viewport-title">3D preview</h2>
      <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
        <Suspense fallback={null}>
          <SceneContent walls={walls} openings={openings} wallHeight={wallHeight} />
          <OrbitControls target={center} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  );
}
