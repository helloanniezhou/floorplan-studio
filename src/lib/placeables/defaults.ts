import type {
  FurnitureKind,
  LandscapeKind,
  PlaceableDimensions,
} from '../../types/floorPlan';

export const FURNITURE_DEFAULTS: Record<FurnitureKind, PlaceableDimensions> = {
  kitchenCounter: { width: 2.4, depth: 0.65, height: 0.9 },
  sink: { width: 0.6, depth: 0.5, height: 0.2 },
  toilet: { width: 0.4, depth: 0.7, height: 0.8 },
  sectionalSofa: { width: 2.8, depth: 1.6, height: 0.85 },
  table: { width: 1.6, depth: 0.9, height: 0.75 },
  chair: { width: 0.5, depth: 0.5, height: 0.9 },
  gasRange: { width: 0.76, depth: 0.7, height: 0.9 },
  fridge: { width: 0.9, depth: 0.75, height: 1.8 },
};

export const LANDSCAPE_DEFAULTS: Record<LandscapeKind, PlaceableDimensions> = {
  tree: { width: 3, depth: 3, height: 4 },
  shrub: { width: 1.2, depth: 1.2, height: 0.8 },
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
