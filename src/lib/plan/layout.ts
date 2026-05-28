import type { PlanLevel } from '../../types/floorPlan';
import {
  getLevelGeometry,
  patchLevel,
  type LevelGeometry,
} from './levels';

export type { LevelGeometry as LayoutGeometry };

export function getLayoutGeometry(
  plan: { levels: PlanLevel[] },
  activeLevelId: string,
): LevelGeometry {
  return getLevelGeometry(plan.levels, activeLevelId);
}

export function patchLayoutGeometry(
  levels: PlanLevel[],
  activeLevelId: string,
  patch: Partial<LevelGeometry>,
): { levels: PlanLevel[] } {
  return { levels: patchLevel(levels, activeLevelId, patch) };
}

export function layoutLabel(level: PlanLevel | undefined): string {
  if (!level) return 'Floor';
  return level.name;
}
