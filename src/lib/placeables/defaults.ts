import type {
  FurnitureKind,
  LandscapeKind,
  PlaceableDimensions,
} from '../../types/floorPlan';
import { feetToMeters } from '../geometry/vectors';

/** Typical California / US residential furniture sizes (feet). Plan: width × depth; height is vertical. */
const FURNITURE_DEFAULTS_FT: Record<FurnitureKind, PlaceableDimensions> = {
  /** 10' base run, 24" deep, 36" high */
  kitchenCounter: { width: 10, depth: 2, height: 3 },
  /** 33" sink base, standard 24" counter depth */
  sink: { width: 2.75, depth: 1.75, height: 3 },
  /** ~30" × 30" clear floor space, standard height */
  toilet: { width: 2, depth: 2.5, height: 2.5 },
  /** Large L-shaped sectional */
  sectionalSofa: { width: 10, depth: 8, height: 3 },
  /** 6-person dining table (72" × 36") */
  table: { width: 6, depth: 3, height: 2.5 },
  /** Side / dining chair (~21" seat footprint) */
  chair: { width: 1.75, depth: 1.75, height: 3 },
  /** 30" wide freestanding range */
  gasRange: { width: 2.5, depth: 2.25, height: 3 },
  /** 36" wide × 70" tall standard refrigerator */
  fridge: { width: 3, depth: 2.5, height: 6 },
};

function scaleDimensions(
  dims: PlaceableDimensions,
  factor: number,
): PlaceableDimensions {
  return {
    width: dims.width * factor,
    depth: dims.depth * factor,
    height: dims.height * factor,
  };
}

/** Default furniture size in the plan's current unit (ft or m). */
export function defaultFurnitureDimensions(
  kind: FurnitureKind,
  unit: 'm' | 'ft',
): PlaceableDimensions {
  const ft = FURNITURE_DEFAULTS_FT[kind];
  if (unit === 'ft') return { ...ft };
  return scaleDimensions(ft, feetToMeters(1));
}

/** @deprecated Use defaultFurnitureDimensions(kind, unit) */
export const FURNITURE_DEFAULTS: Record<FurnitureKind, PlaceableDimensions> =
  Object.fromEntries(
    (Object.keys(FURNITURE_DEFAULTS_FT) as FurnitureKind[]).map((kind) => [
      kind,
      defaultFurnitureDimensions(kind, 'ft'),
    ]),
  ) as Record<FurnitureKind, PlaceableDimensions>;

/** Landscape drawn as ovals in plan view (canopy / planting bed footprint). */
export const OVAL_LANDSCAPE_KINDS: LandscapeKind[] = ['tree', 'shrub'];

export function isOvalLandscapeKind(kind: LandscapeKind): boolean {
  return OVAL_LANDSCAPE_KINDS.includes(kind);
}

export const LANDSCAPE_DEFAULTS: Record<LandscapeKind, PlaceableDimensions> = {
  /** Oval canopy ~12' × 10' */
  tree: { width: 4, depth: 3, height: 4 },
  /** Oval shrub mass ~5' × 3' */
  shrub: { width: 1.5, depth: 1, height: 0.8 },
  flowerBed: { width: 2, depth: 1, height: 0.3 },
  patio: { width: 3, depth: 3, height: 0.1 },
  path: { width: 1.2, depth: 4, height: 0.05 },
  lawn: { width: 4, depth: 4, height: 0.02 },
  pool: { width: 5, depth: 3, height: 0.4 },
};

export const FURNITURE_LABELS: Record<FurnitureKind, string> = {
  kitchenCounter: 'Kitchen counter',
  sink: 'Sink',
  toilet: 'Toilet',
  sectionalSofa: 'Sectional sofa',
  table: 'Table',
  chair: 'Chair',
  gasRange: 'Gas range',
  fridge: 'Fridge',
};

export const LANDSCAPE_LABELS: Record<LandscapeKind, string> = {
  tree: 'Tree',
  shrub: 'Shrub',
  flowerBed: 'Flower bed',
  patio: 'Patio',
  path: 'Path',
  lawn: 'Lawn',
  pool: 'Pool',
};

export const FURNITURE_COLORS: Record<FurnitureKind, string> = {
  kitchenCounter: '#d4c4a8',
  sink: '#94a3b8',
  toilet: '#e2e8f0',
  sectionalSofa: '#78716c',
  table: '#a8a29e',
  chair: '#78716c',
  gasRange: '#44403c',
  fridge: '#cbd5e1',
};

export const LANDSCAPE_COLORS: Record<LandscapeKind, string> = {
  tree: '#166534',
  shrub: '#22c55e',
  flowerBed: '#f472b6',
  patio: '#a8a29e',
  path: '#d6d3d1',
  lawn: '#4ade80',
  pool: '#38bdf8',
};
