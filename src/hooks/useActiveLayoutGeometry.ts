import { useMemo } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import {
  EMPTY_LIGHTS,
  EMPTY_OPENINGS,
  EMPTY_WALLS,
  getLevelById,
  wallsForGhostUnderLevel,
} from '../lib/plan/levels';

export function useActiveLevelId(): string {
  return useFloorPlanStore((s) => s.activeLevelId);
}

export function useActiveLevel() {
  const activeLevelId = useActiveLevelId();
  return useFloorPlanStore((s) => getLevelById(s.levels, activeLevelId));
}

/** Walls/openings/lights for the active level — each field uses a stable empty-array fallback. */
export function useActiveLayoutGeometry() {
  const activeLevelId = useFloorPlanStore((s) => s.activeLevelId);
  const walls = useFloorPlanStore((s) => {
    const level = getLevelById(s.levels, activeLevelId);
    return level?.walls ?? EMPTY_WALLS;
  });
  const openings = useFloorPlanStore((s) => {
    const level = getLevelById(s.levels, activeLevelId);
    return level?.openings ?? EMPTY_OPENINGS;
  });
  const lights = useFloorPlanStore((s) => {
    const level = getLevelById(s.levels, activeLevelId);
    return level?.lights ?? EMPTY_LIGHTS;
  });
  return useMemo(() => ({ walls, openings, lights }), [walls, openings, lights]);
}

/** Walls from the level directly below the active one (ghost overlay). */
export function useGhostWalls() {
  const activeLevelId = useFloorPlanStore((s) => s.activeLevelId);
  return useFloorPlanStore((s) => wallsForGhostUnderLevel(s.levels, activeLevelId));
}

/** @deprecated Use useActiveLevelId */
export const useActiveLayout = useActiveLevelId;
