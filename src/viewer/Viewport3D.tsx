import { Suspense, useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { enhanceRenderImage } from '../lib/export/enhanceRenderImage';
import { SceneContent, sceneCenter } from './Scene3D';
import { ScenePhotoEffects } from './ScenePhotoEffects';
import { SceneCaptureTrigger } from './SceneCaptureTrigger';
import { PhotoCaptureModal } from './PhotoCaptureModal';

export function Viewport3D() {
  const levels = useFloorPlanStore((s) => s.levels);
  const furniture = useFloorPlanStore((s) => s.furniture) ?? [];
  const landscape = useFloorPlanStore((s) => s.landscape) ?? [];
  const wallHeight = useFloorPlanStore((s) => s.wallHeight);
  const northAngleDeg = useFloorPlanStore((s) => s.northAngleDeg);
  const sunTime = useFloorPlanStore((s) => s.sunTime);
  const lotSize = useFloorPlanStore((s) => s.lotSize);
  const projectName = useFloorPlanStore((s) => s.projectName);

  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [renderResult, setRenderResult] = useState<{
    raw: string;
    enhanced: string;
  } | null>(null);

  const groundWalls = levels.find((l) => l.kind === 'floor')?.walls ?? [];
  const center = useMemo(() => sceneCenter(groundWalls), [groundWalls]);
  const cameraPos = useMemo<[number, number, number]>(
    () => [center[0] + 6, center[1] + 4, center[2] + 6],
    [center],
  );

  const startPhotoCapture = () => {
    setCaptureError(null);
    setCapturing(true);
  };

  const handleCapture = useCallback(async (raw: string) => {
    try {
      const enhanced = await enhanceRenderImage(raw);
      setRenderResult({ raw, enhanced });
    } catch {
      setCaptureError('Could not process the render. Try again.');
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleCaptureError = useCallback(() => {
    setCaptureError('Screenshot failed. Try again.');
    setCapturing(false);
  }, []);

  return (
    <div className="viewport-3d">
      <div className="viewport-3d-toolbar">
        <p className="viewport-hint">Double-click surfaces to move the orbit pivot</p>
        <button
          type="button"
          className="action-bar-btn primary"
          disabled={capturing}
          onClick={startPhotoCapture}
        >
          {capturing ? 'Capturing…' : 'Photo render'}
        </button>
      </div>
      {captureError && <p className="viewport-error">{captureError}</p>}
      <Canvas
        shadows
        camera={{ position: cameraPos, fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ScenePhotoEffects center={center} enabled={capturing} />
          <SceneContent
            levels={levels}
            wallHeight={wallHeight}
            furniture={furniture}
            landscape={landscape}
            northAngleDeg={northAngleDeg}
            sunTime={sunTime}
            lotSize={lotSize}
            photoMode={capturing}
          />
          <OrbitControls target={center} makeDefault />
          <SceneCaptureTrigger
            active={capturing}
            onCapture={handleCapture}
            onError={handleCaptureError}
          />
        </Suspense>
      </Canvas>

      <PhotoCaptureModal
        open={renderResult != null}
        projectName={projectName}
        rawUrl={renderResult?.raw ?? ''}
        enhancedUrl={renderResult?.enhanced ?? ''}
        onClose={() => setRenderResult(null)}
      />
    </div>
  );
}
