import { v4 as uuidv4 } from 'uuid';
import type {
  FloorPlan,
  LightFixture,
  Opening,
  PlanLevel,
  PlanLevelKind,
  Wall,
} from '../../types/floorPlan';

export const MAX_FLOOR_LEVELS = 3;

export type LevelGeometry = {
  walls: Wall[];
  openings: Opening[];
  lights: LightFixture[];
};

/** Stable empty geometry — must not allocate new arrays per selector call (Zustand loop). */
const EMPTY_LEVEL_GEOMETRY: LevelGeometry = {
  walls: [],
  openings: [],
  lights: [],
};

export const EMPTY_WALLS = EMPTY_LEVEL_GEOMETRY.walls;
export const EMPTY_OPENINGS = EMPTY_LEVEL_GEOMETRY.openings;
export const EMPTY_LIGHTS = EMPTY_LEVEL_GEOMETRY.lights;

export function resolveActiveLevelId(
  levels: PlanLevel[],
  preferredId: string | undefined,
): string {
  if (preferredId && levels.some((l) => l.id === preferredId)) {
    return preferredId;
  }
  return levels[0]?.id ?? preferredId ?? '';
}

export function createEmptyLevel(kind: PlanLevelKind, name: string): PlanLevel {
  return {
    id: uuidv4(),
    name,
    kind,
    walls: [],
    openings: [],
    lights: [],
  };
}

export function defaultPlanLevels(): PlanLevel[] {
  return [createEmptyLevel('floor', 'Floor 1'), createEmptyLevel('roof', 'Roof')];
}

/** Floors first in order, then roof. */
export function sortLevels(levels: PlanLevel[]): PlanLevel[] {
  const floors = levels.filter((l) => l.kind === 'floor');
  const roofs = levels.filter((l) => l.kind === 'roof');
  return [...floors, ...roofs];
}

export function floorLevelCount(levels: PlanLevel[]): number {
  return levels.filter((l) => l.kind === 'floor').length;
}

export function canAddFloorLevel(levels: PlanLevel[]): boolean {
  return floorLevelCount(levels) < MAX_FLOOR_LEVELS;
}

export function canRemoveFloorLevel(levels: PlanLevel[], levelId: string): boolean {
  const level = getLevelById(levels, levelId);
  if (!level || level.kind !== 'floor') return false;
  return floorLevelCount(levels) > 1;
}

export function getLevelById(levels: PlanLevel[], id: string): PlanLevel | undefined {
  return levels.find((l) => l.id === id);
}

export function getLevelGeometry(levels: PlanLevel[], levelId: string): LevelGeometry {
  const level = getLevelById(levels, levelId);
  if (!level) {
    return EMPTY_LEVEL_GEOMETRY;
  }
  return {
    walls: level.walls,
    openings: level.openings,
    lights: level.lights,
  };
}

export function patchLevel(
  levels: PlanLevel[],
  levelId: string,
  patch: Partial<LevelGeometry>,
): PlanLevel[] {
  return levels.map((level) =>
    level.id === levelId ? { ...level, ...patch } : level,
  );
}

export function wallsForGhostUnderLevel(
  levels: PlanLevel[],
  activeLevelId: string,
): Wall[] {
  const sorted = sortLevels(levels);
  const idx = sorted.findIndex((l) => l.id === activeLevelId);
  if (idx <= 0) return EMPTY_WALLS;
  return sorted[idx - 1].walls;
}

export function isRoofLevel(level: PlanLevel | undefined): boolean {
  return level?.kind === 'roof';
}

export function isGroundFloorLevel(levels: PlanLevel[], levelId: string): boolean {
  const floors = levels.filter((l) => l.kind === 'floor');
  return floors.length > 0 && floors[0].id === levelId;
}

/** Migrate legacy flat walls / roof fields into levels. */
export function normalizePlanLevels(
  plan: Partial<
    FloorPlan & {
      walls?: Wall[];
      openings?: Opening[];
      lights?: LightFixture[];
      roofWalls?: Wall[];
      roofOpenings?: Opening[];
      roofLights?: LightFixture[];
    }
  >,
): PlanLevel[] {
  if (plan.levels && plan.levels.length > 0) {
    return sortLevels(
      plan.levels.map((l) => ({
        ...l,
        walls: l.walls ?? [],
        openings: l.openings ?? [],
        lights: l.lights ?? [],
      })),
    );
  }

  const floor1 = createEmptyLevel('floor', 'Floor 1');
  floor1.walls = plan.walls ?? [];
  floor1.openings = plan.openings ?? [];
  floor1.lights = plan.lights ?? [];

  const roof = createEmptyLevel('roof', 'Roof');
  roof.walls = plan.roofWalls ?? [];
  roof.openings = plan.roofOpenings ?? [];
  roof.lights = plan.roofLights ?? [];

  return [floor1, roof];
}

export function allLevelWalls(levels: PlanLevel[]): Wall[] {
  return levels.flatMap((l) => l.walls);
}

export function allLevelLights(levels: PlanLevel[]): LightFixture[] {
  return levels.flatMap((l) => l.lights);
}

export function floorLevels(levels: PlanLevel[]): PlanLevel[] {
  return levels.filter((l) => l.kind === 'floor');
}

export function roofLevel(levels: PlanLevel[]): PlanLevel | undefined {
  return levels.find((l) => l.kind === 'roof');
}
