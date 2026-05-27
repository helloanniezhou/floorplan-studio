export type Point = { x: number; y: number };

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
};

export type OpeningType = 'door' | 'window';

export type Opening = {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
};

export type ScaleInfo = {
  pixelsPerUnit: number;
};

export type LineSuggestion = {
  id: string;
  start: Point;
  end: Point;
  dismissed?: boolean;
};

export type TraceParams = {
  cannyLow: number;
  cannyHigh: number;
  houghThreshold: number;
  minLineLength: number;
  maxLineGap: number;
  orthogonalize: boolean;
};

export type Tool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'scale'
  | 'pan'
  | 'place';

export type PlaceableDimensions = {
  width: number;
  depth: number;
  height: number;
};

export type FurnitureKind =
  | 'kitchenCounter'
  | 'sink'
  | 'toilet'
  | 'sectionalSofa'
  | 'table'
  | 'chair'
  | 'gasRange'
  | 'fridge';

export type LandscapeKind =
  | 'tree'
  | 'shrub'
  | 'flowerBed'
  | 'patio'
  | 'path'
  | 'lawn'
  | 'pool';

export type PlaceableCategory = 'furniture' | 'landscape';

export type ActivePlaceable =
  | { category: 'furniture'; kind: FurnitureKind }
  | { category: 'landscape'; kind: LandscapeKind };

export type PlacedItemBase = {
  id: string;
  position: Point;
  width: number;
  depth: number;
  height: number;
  rotation: number;
};

export type Furniture = PlacedItemBase & {
  category: 'furniture';
  kind: FurnitureKind;
};

export type LandscapeElement = PlacedItemBase & {
  category: 'landscape';
  kind: LandscapeKind;
};

export type FloorPlan = {
  walls: Wall[];
  openings: Opening[];
  furniture: Furniture[];
  landscape: LandscapeElement[];
  unit: 'm' | 'ft';
  wallHeight: number;
  backgroundImage?: string;
  imageSize?: { width: number; height: number };
  scale: ScaleInfo | null;
  suggestions: LineSuggestion[];
  traceParams: TraceParams;
};

export type Selection =
  | { type: 'wall'; id: string }
  | { type: 'opening'; id: string }
  | { type: 'furniture'; id: string }
  | { type: 'landscape'; id: string }
  | null;

export const DEFAULT_TRACE_PARAMS: TraceParams = {
  cannyLow: 50,
  cannyHigh: 150,
  houghThreshold: 80,
  minLineLength: 40,
  maxLineGap: 10,
  orthogonalize: true,
};

export const DEFAULT_WALL_THICKNESS_M = 0.15;
export const DEFAULT_WALL_HEIGHT_M = 2.4;
export const DEFAULT_DOOR_WIDTH_M = 0.9;
export const DEFAULT_DOOR_HEIGHT_M = 2.1;
export const DEFAULT_WINDOW_WIDTH_M = 1.2;
export const DEFAULT_WINDOW_HEIGHT_M = 1.2;
export const DEFAULT_WINDOW_SILL_M = 0.9;
