import type { OpeningType } from '../../types/floorPlan';
import { feetToMeters } from '../geometry/vectors';

/** Snap and visible grid spacing in real-world units */
export const GRID_STEP_FT = 0.5;

/** California / US residential defaults (imperial). */

/** 2×4 interior wall: 4.5" finished thickness */
export const WALL_THICKNESS_INTERIOR_FT = 4.5 / 12;

/** Standard 8'-0" ceiling */
export const WALL_HEIGHT_FT = 8;

/** 3'-0" × 6'-8" pre-hung interior door */
export const DOOR_WIDTH_FT = 3;
export const DOOR_HEIGHT_FT = 6 + 8 / 12;

/** Typical double-hung window */
export const WINDOW_WIDTH_FT = 3;
export const WINDOW_HEIGHT_FT = 4;
export const WINDOW_SILL_FT = 3;

/** Metric fallbacks */
export const WALL_THICKNESS_INTERIOR_M = 0.114;
export const WALL_HEIGHT_M = 2.44;
export const DOOR_WIDTH_M = 0.914;
export const DOOR_HEIGHT_M = 2.03;
export const WINDOW_WIDTH_M = 0.914;
export const WINDOW_HEIGHT_M = 1.22;
export const WINDOW_SILL_M = 0.914;

export function defaultWallThickness(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? WALL_THICKNESS_INTERIOR_FT : WALL_THICKNESS_INTERIOR_M;
}

export function defaultWallHeight(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? WALL_HEIGHT_FT : WALL_HEIGHT_M;
}

export function defaultDoorWidth(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? DOOR_WIDTH_FT : DOOR_WIDTH_M;
}

export function defaultDoorHeight(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? DOOR_HEIGHT_FT : DOOR_HEIGHT_M;
}

export function defaultWindowWidth(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? WINDOW_WIDTH_FT : WINDOW_WIDTH_M;
}

export function defaultWindowHeight(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? WINDOW_HEIGHT_FT : WINDOW_HEIGHT_M;
}

export function defaultWindowSill(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? WINDOW_SILL_FT : WINDOW_SILL_M;
}

export function defaultOpeningWidth(type: OpeningType, unit: 'm' | 'ft'): number {
  return type === 'door' ? defaultDoorWidth(unit) : defaultWindowWidth(unit);
}

export function defaultOpeningHeight(type: OpeningType, unit: 'm' | 'ft'): number {
  return type === 'door' ? defaultDoorHeight(unit) : defaultWindowHeight(unit);
}

export function gridStepForUnit(unit: 'm' | 'ft', pixelsPerUnit: number | null): number {
  const stepWorld = unit === 'ft' ? GRID_STEP_FT : feetToMeters(GRID_STEP_FT);
  if (!pixelsPerUnit) return unit === 'ft' ? 6 : 8;
  return pixelsPerUnit * stepWorld;
}
