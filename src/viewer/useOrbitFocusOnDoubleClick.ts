import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/** Double-click a surface to move the orbit pivot to that point. */
export function useOrbitFocusOnDoubleClick() {
  const controls = useThree((s) => s.controls);

  return useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const orbit = controls as OrbitControlsImpl | undefined;
      if (!orbit?.target) return;
      orbit.target.copy(e.point);
      orbit.update();
    },
    [controls],
  );
}
