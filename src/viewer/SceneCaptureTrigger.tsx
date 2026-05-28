import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Props = {
  active: boolean;
  onCapture: (dataUrl: string) => void;
  onError?: () => void;
};

export function SceneCaptureTrigger({ active, onCapture, onError }: Props) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!active) return;

    const prevToneMapping = gl.toneMapping;
    const prevExposure = gl.toneMappingExposure;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;

    let frame = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      frame++;
      if (frame < 5) {
        requestAnimationFrame(tick);
        return;
      }
      try {
        gl.render(scene, camera);
        onCapture(gl.domElement.toDataURL('image/png'));
      } catch {
        onError?.();
      } finally {
        gl.toneMapping = prevToneMapping;
        gl.toneMappingExposure = prevExposure;
      }
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      gl.toneMapping = prevToneMapping;
      gl.toneMappingExposure = prevExposure;
    };
  }, [active, gl, scene, camera, onCapture, onError]);

  return null;
}
